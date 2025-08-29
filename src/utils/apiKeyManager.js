const crypto = require('crypto');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Secure API key management with multiple keys and fallback
class ApiKeyManager {
    constructor() {
        this.encryptionKey = this.getOrCreateEncryptionKey();
        this.apiKeys = {
            gemini: [],
            openai: []
        };
        this.currentKeyIndex = {
            gemini: 0,
            openai: 0
        };
        this.failedKeys = {
            gemini: new Set(),
            openai: new Set()
        };
        this.keyUsageStats = {
            gemini: new Map(),
            openai: new Map()
        };
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Get or create encryption key for secure storage
    getOrCreateEncryptionKey() {
        const keyPath = path.join(app.getPath('userData'), '.jarvis_key');
        
        try {
            if (fs.existsSync(keyPath)) {
                return fs.readFileSync(keyPath);
            }
        } catch (error) {
            console.warn('Could not read existing encryption key:', error.message);
        }
        
        // Create new encryption key
        const key = crypto.randomBytes(32);
        try {
            fs.writeFileSync(keyPath, key, { mode: 0o600 }); // Restrict file permissions
        } catch (error) {
            console.error('Could not save encryption key:', error.message);
        }
        
        return key;
    }

    // Encrypt API key for secure storage
    encryptApiKey(apiKey) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    // Decrypt API key from secure storage
    decryptApiKey(encryptedKey) {
        try {
            const [ivHex, encrypted] = encryptedKey.split(':');
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Failed to decrypt API key:', error.message);
            return null;
        }
    }

    // Set multiple API keys (comma-separated) for a specific service
    setApiKeys(apiKeysString, service = 'gemini') {
        if (!apiKeysString || typeof apiKeysString !== 'string') {
            throw new Error('API keys must be a non-empty string');
        }

        if (!this.apiKeys[service]) {
            throw new Error(`Unsupported service: ${service}`);
        }

        // Parse comma-separated keys and trim whitespace
        const keys = apiKeysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
        
        if (keys.length === 0) {
            throw new Error('No valid API keys provided');
        }

        // Validate API key format (basic validation)
        for (const key of keys) {
            if (!this.isValidApiKeyFormat(key, service)) {
                throw new Error(`Invalid ${service} API key format: ${key.substring(0, 10)}...`);
            }
        }

        this.apiKeys[service] = keys;
        this.currentKeyIndex[service] = 0;
        this.failedKeys[service].clear();
        this.keyUsageStats[service].clear();
        
        // Initialize usage stats
        keys.forEach((key, index) => {
            this.keyUsageStats[service].set(index, {
                requests: 0,
                failures: 0,
                lastUsed: null,
                lastFailure: null
            });
        });

        console.log(`✅ Configured ${keys.length} ${service} API keys for fallback`);
    }

    // Basic API key format validation
    isValidApiKeyFormat(apiKey, service = 'gemini') {
        if (typeof apiKey !== 'string' || apiKey.length < 20) {
            return false;
        }
        
        if (service === 'gemini') {
            // Gemini API keys typically start with 'AIza' and contain alphanumeric characters
            return apiKey.length >= 20 && apiKey.length <= 50 && /^[A-Za-z0-9_-]+$/.test(apiKey);
        } else if (service === 'openai') {
            // OpenAI API keys typically start with 'sk-' and contain alphanumeric characters
            return apiKey.startsWith('sk-') && apiKey.length >= 40 && /^sk-[A-Za-z0-9]+$/.test(apiKey);
        }
        
        return false;
    }

    // Get current API key for use
    getCurrentApiKey(service = 'gemini') {
        if (!this.apiKeys[service] || this.apiKeys[service].length === 0) {
            throw new Error(`No ${service} API keys configured`);
        }

        // Find next available key (not in failed set)
        for (let i = 0; i < this.apiKeys[service].length; i++) {
            const keyIndex = (this.currentKeyIndex[service] + i) % this.apiKeys[service].length;
            if (!this.failedKeys[service].has(keyIndex)) {
                this.currentKeyIndex[service] = keyIndex;
                return this.apiKeys[service][keyIndex];
            }
        }

        // All keys have failed, reset failed set and try again
        console.warn(`⚠️ All ${service} API keys have failed, resetting failure state`);
        this.failedKeys[service].clear();
        return this.apiKeys[service][this.currentKeyIndex[service]];
    }

    // Mark current key as failed and move to next
    markCurrentKeyAsFailed(error, service = 'gemini') {
        if (!this.apiKeys[service] || this.apiKeys[service].length === 0) return;

        const currentKey = this.apiKeys[service][this.currentKeyIndex[service]];
        const stats = this.keyUsageStats[service].get(this.currentKeyIndex[service]);
        
        if (stats) {
            stats.failures++;
            stats.lastFailure = new Date();
        }

        this.failedKeys[service].add(this.currentKeyIndex[service]);
        
        console.warn(`❌ ${service} API key ${this.currentKeyIndex[service] + 1} failed:`, error?.message || 'Unknown error');
        console.log(`📊 ${service} Key ${this.currentKeyIndex[service] + 1} stats:`, stats);

        // Move to next key
        this.currentKeyIndex[service] = (this.currentKeyIndex[service] + 1) % this.apiKeys[service].length;
        
        // If we've tried all keys, wait before retrying
        if (this.failedKeys[service].size >= this.apiKeys[service].length) {
            console.warn(`⏳ All ${service} keys failed, waiting before retry...`);
            setTimeout(() => {
                this.failedKeys[service].clear();
                console.log(`🔄 Reset failed ${service} keys, retrying...`);
            }, this.retryDelay * this.apiKeys[service].length);
        }
    }

    // Mark current key as successful
    markCurrentKeyAsSuccessful(service = 'gemini') {
        if (!this.apiKeys[service] || this.apiKeys[service].length === 0) return;

        const stats = this.keyUsageStats[service].get(this.currentKeyIndex[service]);
        if (stats) {
            stats.requests++;
            stats.lastUsed = new Date();
        }

        // Remove from failed set if it was there
        this.failedKeys[service].delete(this.currentKeyIndex[service]);
    }

    // Set OpenAI API key
    setOpenAiApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('OpenAI API key must be a non-empty string');
        }
        
        if (!this.isValidApiKeyFormat(apiKey, 'openai')) {
            throw new Error('Invalid OpenAI API key format');
        }
        
        this.setApiKeys(apiKey, 'openai');
    }
    
    // Get OpenAI API key
    getOpenAiApiKey() {
        try {
            return this.getCurrentApiKey('openai');
        } catch (error) {
            return null;
        }
    }
    
    // Set Gemini API key (for backward compatibility)
    setGeminiApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('Gemini API key must be a non-empty string');
        }
        
        if (!this.isValidApiKeyFormat(apiKey, 'gemini')) {
            throw new Error('Invalid Gemini API key format');
        }
        
        this.setApiKeys(apiKey, 'gemini');
    }
    
    // Get Gemini API key
    getGeminiApiKey() {
        try {
            return this.getCurrentApiKey('gemini');
        } catch (error) {
            return null;
        }
    }

    // Get API key usage statistics
    getUsageStats(service = null) {
        if (service) {
            const stats = [];
            if (this.apiKeys[service]) {
                for (let i = 0; i < this.apiKeys[service].length; i++) {
                    const keyStats = this.keyUsageStats[service].get(i);
                    stats.push({
                        keyIndex: i + 1,
                        service: service,
                        isCurrent: i === this.currentKeyIndex[service],
                        isFailed: this.failedKeys[service].has(i),
                        ...keyStats
                    });
                }
            }
            return stats;
        } else {
            // Return stats for all services
            const allStats = {};
            for (const svc of ['gemini', 'openai']) {
                allStats[svc] = this.getUsageStats(svc);
            }
            return allStats;
        }
    }

    // Execute API call with automatic fallback
    async executeWithFallback(apiCallFunction, service = 'gemini', maxAttempts = null) {
        const attempts = maxAttempts || (this.apiKeys[service] ? this.apiKeys[service].length : 1);
        let lastError = null;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                const apiKey = this.getCurrentApiKey(service);
                console.log(`🔑 Attempting ${service} API call with key ${this.currentKeyIndex[service] + 1}/${this.apiKeys[service].length}`);
                
                const result = await apiCallFunction(apiKey);
                this.markCurrentKeyAsSuccessful(service);
                return result;
                
            } catch (error) {
                lastError = error;
                console.error(`❌ ${service} API call failed with key ${this.currentKeyIndex[service] + 1}:`, error.message);
                
                // Check if this is a key-specific error (authentication, quota, etc.)
                if (this.isKeySpecificError(error)) {
                    this.markCurrentKeyAsFailed(error, service);
                    
                    // If we have more keys to try, continue
                    if (attempt < attempts - 1 && this.failedKeys.size < this.apiKeys.length) {
                        console.log(`🔄 Trying next API key...`);
                        await this.delay(this.retryDelay);
                        continue;
                    }
                } else {
                    // Non-key-specific error, don't mark key as failed
                    console.log('⚠️ Non-key-specific error, not marking key as failed');
                    throw error;
                }
            }
        }

        throw new Error(`All API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    // Check if error is key-specific (should trigger fallback)
    isKeySpecificError(error) {
        const message = error?.message?.toLowerCase() || '';
        const code = error?.code || '';
        
        // Common key-specific error patterns
        const keyErrorPatterns = [
            'api key',
            'authentication',
            'unauthorized',
            'forbidden',
            'quota',
            'rate limit',
            'billing',
            'invalid key',
            'key not found'
        ];
        
        return keyErrorPatterns.some(pattern => 
            message.includes(pattern) || 
            code.toString().includes(pattern)
        );
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get current configuration summary
    getConfigSummary() {
        return {
            totalKeys: this.apiKeys.length,
            currentKeyIndex: this.currentKeyIndex + 1,
            failedKeys: Array.from(this.failedKeys).map(i => i + 1),
            availableKeys: this.apiKeys.length - this.failedKeys.size,
            usageStats: this.getUsageStats()
        };
    }
}

// Export singleton instance
const apiKeyManager = new ApiKeyManager();
module.exports = apiKeyManager;