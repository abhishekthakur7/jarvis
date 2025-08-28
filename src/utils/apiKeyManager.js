const crypto = require('crypto');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Secure API key management with multiple keys and fallback
class ApiKeyManager {
    constructor() {
        this.encryptionKey = this.getOrCreateEncryptionKey();
        this.apiKeys = [];
        this.currentKeyIndex = 0;
        this.failedKeys = new Set();
        this.keyUsageStats = new Map();
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

    // Set multiple API keys (comma-separated)
    setApiKeys(apiKeysString) {
        if (!apiKeysString || typeof apiKeysString !== 'string') {
            throw new Error('API keys must be a non-empty string');
        }

        // Parse comma-separated keys and trim whitespace
        const keys = apiKeysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
        
        if (keys.length === 0) {
            throw new Error('No valid API keys provided');
        }

        this.apiKeys = keys;
        this.currentKeyIndex = 0;
        this.failedKeys.clear();
        this.keyUsageStats.clear();
        
        // Initialize usage stats
        keys.forEach((key, index) => {
            this.keyUsageStats.set(index, {
                requests: 0,
                failures: 0,
                lastUsed: null,
                lastFailure: null
            });
        });

        console.log(`✅ Configured ${keys.length} API keys for fallback`);
    }

    // Basic API key format validation
    isValidApiKeyFormat(apiKey) {
        // Google AI API keys typically start with 'AIza' and are 39 characters long
        return typeof apiKey === 'string' && 
               apiKey.length >= 20 && 
               apiKey.length <= 50 && 
               /^[A-Za-z0-9_-]+$/.test(apiKey);
    }

    // Get current API key for use
    getCurrentApiKey() {
        if (this.apiKeys.length === 0) {
            throw new Error('No API keys configured');
        }

        // Find next available key (not in failed set)
        for (let i = 0; i < this.apiKeys.length; i++) {
            const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
            if (!this.failedKeys.has(keyIndex)) {
                this.currentKeyIndex = keyIndex;
                return this.apiKeys[keyIndex];
            }
        }

        // All keys have failed, reset failed set and try again
        console.warn('⚠️ All API keys have failed, resetting failure state');
        this.failedKeys.clear();
        return this.apiKeys[this.currentKeyIndex];
    }

    // Mark current key as failed and move to next
    markCurrentKeyAsFailed(error) {
        if (this.apiKeys.length === 0) return;

        const currentKey = this.apiKeys[this.currentKeyIndex];
        const stats = this.keyUsageStats.get(this.currentKeyIndex);
        
        if (stats) {
            stats.failures++;
            stats.lastFailure = new Date();
        }

        this.failedKeys.add(this.currentKeyIndex);
        
        console.warn(`❌ API key ${this.currentKeyIndex + 1} failed:`, error?.message || 'Unknown error');
        console.log(`📊 Key ${this.currentKeyIndex + 1} stats:`, stats);

        // Move to next key
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        
        // If we've tried all keys, wait before retrying
        if (this.failedKeys.size >= this.apiKeys.length) {
            console.warn('⏳ All keys failed, waiting before retry...');
            setTimeout(() => {
                this.failedKeys.clear();
                console.log('🔄 Reset failed keys, retrying...');
            }, this.retryDelay * this.apiKeys.length);
        }
    }

    // Mark current key as successful
    markCurrentKeyAsSuccessful() {
        if (this.apiKeys.length === 0) return;

        const stats = this.keyUsageStats.get(this.currentKeyIndex);
        if (stats) {
            stats.requests++;
            stats.lastUsed = new Date();
        }

        // Remove from failed set if it was there
        this.failedKeys.delete(this.currentKeyIndex);
    }

    // Get API key usage statistics
    getUsageStats() {
        const stats = [];
        for (let i = 0; i < this.apiKeys.length; i++) {
            const keyStats = this.keyUsageStats.get(i);
            stats.push({
                keyIndex: i + 1,
                isCurrent: i === this.currentKeyIndex,
                isFailed: this.failedKeys.has(i),
                ...keyStats
            });
        }
        return stats;
    }

    // Execute API call with automatic fallback
    async executeWithFallback(apiCallFunction, maxAttempts = null) {
        const attempts = maxAttempts || this.apiKeys.length;
        let lastError = null;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                const apiKey = this.getCurrentApiKey();
                console.log(`🔑 Attempting API call with key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
                
                const result = await apiCallFunction(apiKey);
                this.markCurrentKeyAsSuccessful();
                return result;
                
            } catch (error) {
                lastError = error;
                console.error(`❌ API call failed with key ${this.currentKeyIndex + 1}:`, error.message);
                
                // Check if this is a key-specific error (authentication, quota, etc.)
                if (this.isKeySpecificError(error)) {
                    this.markCurrentKeyAsFailed(error);
                    
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