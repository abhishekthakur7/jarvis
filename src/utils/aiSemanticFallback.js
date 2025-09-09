/**
 * AI Semantic Fallback Implementation
 * Provides intelligent semantic continuity detection using Gemini API
 * Used as fallback when enhanced chunking confidence is medium/low
 */

class AiSemanticFallback {
    constructor(geminiApiConfig = {}) {
        this.apiConfig = {
            maxTokens: 10,
            temperature: 0.1,
            timeout: 3000, // 3 second timeout for fallback calls
            ...geminiApiConfig
        };
        
        this.callHistory = [];
        this.rateLimiter = {
            callsPerMinute: 0,
            lastResetTime: Date.now(),
            maxCallsPerMinute: 3
        };
        
        this.performanceMetrics = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            timeouts: 0
        };
    }

    /**
     * Main semantic continuity analysis function
     */
    async analyzeSemanticContinuity(currentChunk, context, metadata = {}) {
        const startTime = Date.now();
        
        try {
            // Check rate limiting
            if (!this.canMakeCall()) {
                console.log('[AI_FALLBACK] Rate limit exceeded, using heuristic fallback');
                return this.heuristicFallback(currentChunk, context);
            }
            
            // Prepare the analysis prompt
            const prompt = this.buildAnalysisPrompt(currentChunk, context, metadata);
            
            // Make API call with timeout
            const response = await this.makeGeminiCall(prompt);
            
            // Parse and validate response
            const decision = this.parseApiResponse(response);
            
            // Update metrics
            this.updateMetrics(startTime, true);
            this.recordCall(currentChunk, context, decision, response);
            
            return {
                shouldProcess: decision === 'COMPLETE',
                confidence: 0.8, // AI decisions have high confidence when successful
                method: 'ai_semantic_continuity',
                reasons: ['ai_analysis'],
                aiDecision: decision,
                responseTime: Date.now() - startTime
            };
            
        } catch (error) {
            console.error('[AI_FALLBACK] Analysis failed:', error);
            this.updateMetrics(startTime, false);
            
            // Fallback to heuristic analysis
            return this.heuristicFallback(currentChunk, context, error);
        }
    }

    /**
     * Build optimized prompt for semantic analysis
     */
    buildAnalysisPrompt(currentChunk, context, metadata) {
        // Keep context short for faster processing
        const contextWindow = context.slice(-200); // Last 200 characters
        const pauseInfo = metadata.timeSinceLastChunk ? 
            ` (${metadata.timeSinceLastChunk}ms pause)` : '';
        
        return `Analyze speech completion:

Current: "${currentChunk}"${pauseInfo}
Context: "${contextWindow}"

Is the speaker likely finished or continuing? Reply only: COMPLETE or CONTINUE`;
    }

    /**
     * Make actual Gemini API call with timeout and error handling
     */
    async makeGeminiCall(prompt) {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                this.performanceMetrics.timeouts++;
                reject(new Error('AI fallback timeout'));
            }, this.apiConfig.timeout);
            
            try {
                // This should integrate with your existing Gemini API setup
                // Replace with actual implementation based on your API structure
                const response = await this.callGeminiApi({
                    prompt: prompt,
                    maxTokens: this.apiConfig.maxTokens,
                    temperature: this.apiConfig.temperature
                });
                
                clearTimeout(timeout);
                resolve(response);
                
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Placeholder for actual Gemini API integration
     * Replace this with your existing API call implementation
     */
    async callGeminiApi(config) {
        // IMPORTANT: Replace this with your actual Gemini API implementation
        // This is a mock implementation for testing
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        // Mock analysis based on simple heuristics
        const text = config.prompt.toLowerCase();
        
        if (text.includes('?') || text.includes('complete')) {
            return 'COMPLETE';
        }
        
        if (text.includes('and') || text.includes('also') || text.includes('continue')) {
            return 'CONTINUE';
        }
        
        // Default based on length and pause
        const hasLongPause = text.includes('ms pause') && 
                           parseInt(text.match(/(\d+)ms pause/)?.[1] || '0') > 1000;
        
        return hasLongPause ? 'COMPLETE' : 'CONTINUE';
    }

    /**
     * Parse and validate API response
     */
    parseApiResponse(response) {
        if (!response || typeof response !== 'string') {
            throw new Error('Invalid API response format');
        }
        
        const cleanResponse = response.trim().toUpperCase();
        
        if (cleanResponse.includes('COMPLETE')) {
            return 'COMPLETE';
        } else if (cleanResponse.includes('CONTINUE')) {
            return 'CONTINUE';
        } else {
            // If response is unclear, be conservative
            console.warn('[AI_FALLBACK] Unclear response:', response);
            return 'CONTINUE';
        }
    }

    /**
     * Heuristic fallback when AI is unavailable
     */
    heuristicFallback(currentChunk, context, error = null) {
        console.log('[AI_FALLBACK] Using heuristic analysis');
        
        let confidence = 0.6; // Medium confidence for heuristics
        let shouldProcess = false;
        const reasons = ['heuristic_fallback'];
        
        if (error) {
            reasons.push('ai_error');
            confidence = 0.5; // Lower confidence due to error
        }
        
        // Simple heuristic rules
        const text = currentChunk.toLowerCase();
        
        // Strong indicators of completion
        if (text.includes('?') || text.endsWith('.') || text.endsWith('!')) {
            shouldProcess = true;
            confidence += 0.2;
            reasons.push('punctuation_ending');
        }
        
        // Question patterns
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'can you', 'tell me'];
        if (questionWords.some(word => text.includes(word))) {
            shouldProcess = true;
            confidence += 0.15;
            reasons.push('question_pattern');
        }
        
        // Continuation indicators (reduce processing likelihood)
        const continuationWords = ['and', 'also', 'furthermore', 'moreover', 'besides'];
        if (continuationWords.some(word => text.includes(word))) {
            confidence -= 0.1;
            reasons.push('continuation_detected');
        }
        
        // Incomplete speech indicators
        const incompleteWords = ['um', 'uh', 'so', 'well', 'like'];
        if (incompleteWords.some(word => text.includes(word))) {
            confidence -= 0.15;
            reasons.push('incomplete_speech');
        }
        
        // Length-based decision
        if (currentChunk.length > 100) {
            shouldProcess = true;
            confidence += 0.1;
            reasons.push('sufficient_length');
        }
        
        // Context-based decision
        if (context.length > 500) {
            shouldProcess = true;
            confidence += 0.05;
            reasons.push('context_accumulation');
        }
        
        return {
            shouldProcess,
            confidence: Math.max(0.3, Math.min(0.8, confidence)),
            method: 'heuristic_fallback',
            reasons,
            aiDecision: shouldProcess ? 'COMPLETE' : 'CONTINUE'
        };
    }

    /**
     * Rate limiting management
     */
    canMakeCall() {
        const now = Date.now();
        
        // Reset counter every minute
        if (now - this.rateLimiter.lastResetTime > 60000) {
            this.rateLimiter.callsPerMinute = 0;
            this.rateLimiter.lastResetTime = now;
        }
        
        if (this.rateLimiter.callsPerMinute >= this.rateLimiter.maxCallsPerMinute) {
            return false;
        }
        
        this.rateLimiter.callsPerMinute++;
        return true;
    }

    /**
     * Update performance metrics
     */
    updateMetrics(startTime, success) {
        const responseTime = Date.now() - startTime;
        
        this.performanceMetrics.totalCalls++;
        this.performanceMetrics.totalResponseTime += responseTime;
        this.performanceMetrics.averageResponseTime = 
            this.performanceMetrics.totalResponseTime / this.performanceMetrics.totalCalls;
        
        if (success) {
            this.performanceMetrics.successfulCalls++;
        } else {
            this.performanceMetrics.failedCalls++;
        }
    }

    /**
     * Record call for analysis and debugging
     */
    recordCall(chunk, context, decision, response) {
        this.callHistory.push({
            timestamp: Date.now(),
            chunk: chunk.substring(0, 100), // Truncate for storage
            contextLength: context.length,
            decision,
            response: response.substring(0, 50), // Truncate response
            success: true
        });
        
        // Keep only last 50 calls
        if (this.callHistory.length > 50) {
            this.callHistory.shift();
        }
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        const total = this.performanceMetrics.totalCalls;
        
        return {
            totalCalls: total,
            successRate: total > 0 ? (this.performanceMetrics.successfulCalls / total * 100).toFixed(1) + '%' : '0%',
            averageResponseTime: this.performanceMetrics.averageResponseTime.toFixed(2) + 'ms',
            timeoutRate: total > 0 ? (this.performanceMetrics.timeouts / total * 100).toFixed(1) + '%' : '0%',
            callsPerMinute: this.rateLimiter.callsPerMinute,
            rateLimitStatus: this.canMakeCall() ? 'Available' : 'Limited'
        };
    }

    /**
     * Configure rate limiting
     */
    configureRateLimit(maxCallsPerMinute) {
        this.rateLimiter.maxCallsPerMinute = maxCallsPerMinute;
    }

    /**
     * Configure API settings
     */
    configureApi(config) {
        this.apiConfig = { ...this.apiConfig, ...config };
    }

    /**
     * Reset metrics and history
     */
    reset() {
        this.callHistory = [];
        this.rateLimiter = {
            callsPerMinute: 0,
            lastResetTime: Date.now(),
            maxCallsPerMinute: this.rateLimiter.maxCallsPerMinute
        };
        this.performanceMetrics = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            timeouts: 0
        };
    }

    /**
     * Get recent call history for debugging
     */
    getCallHistory(limit = 10) {
        return this.callHistory.slice(-limit);
    }
}

/**
 * Factory function to create AI fallback with Gemini integration
 */
function createAiSemanticFallback(geminiSession) {
    const fallback = new AiSemanticFallback();
    
    // Override the API call method to use existing Gemini session
    if (geminiSession && typeof geminiSession.sendMessage === 'function') {
        fallback.callGeminiApi = async function(config) {
            try {
                const response = await geminiSession.sendMessage(config.prompt);
                return response.text || response.content || response;
            } catch (error) {
                throw new Error(`Gemini API call failed: ${error.message}`);
            }
        };
    }
    
    return fallback;
}

module.exports = {
    AiSemanticFallback,
    createAiSemanticFallback
};