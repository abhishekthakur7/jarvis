/**
 * VAD Integration Module
 * Integrates Hybrid VAD Strategy with existing gemini.js processing pipeline
 */

const { HybridVadStrategy } = require('./hybridVadStrategy');

class VadIntegration {
    constructor(geminiContext) {
        // Store references to gemini.js functions and variables
        this.contextAccumulator = geminiContext.contextAccumulator;
        this.questionQueue = geminiContext.questionQueue;
        this.processQuestionQueue = geminiContext.processQuestionQueue;
        this.pendingInput = geminiContext.pendingInput;
        this.isAiResponding = geminiContext.isAiResponding;
        
        this.hybridStrategy = new HybridVadStrategy();
        this.isProcessing = false;
        this.processingQueue = [];
        this.lastProcessedContext = '';
        
        // Performance monitoring
        this.performanceMetrics = {
            totalProcessingTime: 0,
            totalChunks: 0,
            averageProcessingTime: 0,
            successfulProcessing: 0,
            failedProcessing: 0
        };
    }

    /**
     * Main integration point - replaces existing VAD processing in gemini.js
     */
    async processVadTranscription(transcriptionText, timestamp = Date.now()) {
        const startTime = Date.now();
        
        try {
            // Use hybrid strategy to determine if we should process
            const decision = await this.hybridStrategy.processTranscriptionChunk(
                transcriptionText, 
                timestamp
            );
            
            if (process.env.DEBUG_APP === 'true') {
                console.log(`[VAD_INTEGRATION] Decision:`, {
                    text: transcriptionText.substring(0, 50) + '...',
                    shouldProcess: decision.shouldProcess,
                    confidence: decision.confidence.toFixed(2),
                    method: decision.method,
                    reasons: decision.reasons
                });
            }
            
            if (decision.shouldProcess) {
                await this.executeProcessing(decision);
                this.performanceMetrics.successfulProcessing++;
            } else {
                if (process.env.DEBUG_APP === 'true') {
                    console.log(`[VAD_INTEGRATION] Skipping processing:`, decision.reason);
                }
            }
            
            // Update performance metrics
            const processingTime = Date.now() - startTime;
            this.updatePerformanceMetrics(processingTime);
            
            return decision;
            
        } catch (error) {
            console.error('[VAD_INTEGRATION] Processing error:', error);
            this.performanceMetrics.failedProcessing++;
            
            // Fallback to conservative processing
            return await this.fallbackProcessing(transcriptionText, timestamp);
        }
    }

    /**
     * Execute the actual processing when decision is made
     */
    async executeProcessing(decision) {
        if (this.isProcessing) {
            if (process.env.DEBUG_APP === 'true') {
                console.log('[VAD_INTEGRATION] Already processing, queuing request');
            }
            this.processingQueue.push(decision);
            return;
        }
        
        this.isProcessing = true;
        
        try {
            // Get the current context from hybrid strategy
            const currentContext = this.hybridStrategy.getRecentContext();
            
            // Avoid duplicate processing
            if (this.isDuplicateContext(currentContext)) {
                if (process.env.DEBUG_APP === 'true') {
                    console.log('[VAD_INTEGRATION] Duplicate context detected, skipping');
                }
                return;
            }
            
            // Update last processed context
            this.lastProcessedContext = currentContext;
            
            // Integrate with existing gemini.js processing
            await this.sendToGeminiProcessing(currentContext, decision);
            
            // Process any queued requests
            await this.processQueue();
            
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Send processed context to existing Gemini processing pipeline
     */
    async sendToGeminiProcessing(context, decision) {
        try {
            if (process.env.DEBUG_APP === 'true') {
                console.log(`[VAD_INTEGRATION] Sending to Gemini:`, {
                    contextLength: context.length,
                    confidence: decision.confidence,
                    method: decision.method
                });
            }
            
            // Add context to the existing contextAccumulator
            if (this.contextAccumulator !== undefined) {
                this.contextAccumulator.value += ' ' + context;
            }
            
            // Add to question queue for processing
            if (this.questionQueue && Array.isArray(this.questionQueue.value)) {
                this.questionQueue.value.push({
                    text: context,
                    timestamp: Date.now(),
                    confidence: decision.confidence,
                    method: decision.method
                });
            }
            
            // Trigger existing question queue processing if available
            if (typeof this.processQuestionQueue === 'function') {
                await this.processQuestionQueue();
            }
            
        } catch (error) {
            console.error('[VAD_INTEGRATION] Error sending to Gemini:', error);
            throw error;
        }
    }

    /**
     * Process queued requests
     */
    async processQueue() {
        while (this.processingQueue.length > 0) {
            const queuedDecision = this.processingQueue.shift();
            
            try {
                const context = this.hybridStrategy.getRecentContext();
                await this.sendToGeminiProcessing(context, queuedDecision);
            } catch (error) {
                console.error('[VAD_INTEGRATION] Error processing queued item:', error);
            }
        }
    }

    /**
     * Check for duplicate context to avoid reprocessing
     */
    isDuplicateContext(currentContext) {
        if (!this.lastProcessedContext) return false;
        
        // Simple similarity check - can be enhanced
        const similarity = this.calculateSimilarity(currentContext, this.lastProcessedContext);
        return similarity > 0.9; // 90% similarity threshold
    }

    /**
     * Calculate text similarity (simple implementation)
     */
    calculateSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        const words1 = new Set(text1.toLowerCase().split(' '));
        const words2 = new Set(text2.toLowerCase().split(' '));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * Fallback processing for error cases
     */
    async fallbackProcessing(transcriptionText, timestamp) {
        if (process.env.DEBUG_APP === 'true') {
            console.log('[VAD_INTEGRATION] Using fallback processing');
        }
        
        // Conservative approach: process if text seems complete
        const shouldProcess = transcriptionText.length > 20 && 
                            (transcriptionText.includes('?') || 
                             transcriptionText.includes('.') ||
                             transcriptionText.length > 100);
        
        if (shouldProcess) {
            await this.sendToGeminiProcessing(transcriptionText, {
                shouldProcess: true,
                confidence: 0.5,
                method: 'fallback',
                reasons: ['error_fallback']
            });
        }
        
        return {
            shouldProcess,
            confidence: 0.5,
            method: 'fallback',
            reasons: ['error_fallback']
        };
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(processingTime) {
        this.performanceMetrics.totalProcessingTime += processingTime;
        this.performanceMetrics.totalChunks++;
        this.performanceMetrics.averageProcessingTime = 
            this.performanceMetrics.totalProcessingTime / this.performanceMetrics.totalChunks;
    }

    /**
     * Get performance and reliability reports
     */
    getPerformanceReport() {
        const hybridReport = this.hybridStrategy.getReliabilityReport();
        
        return {
            performance: this.performanceMetrics,
            reliability: hybridReport,
            queueLength: this.processingQueue.length,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Reset metrics (useful for testing)
     */
    resetMetrics() {
        this.performanceMetrics = {
            totalProcessingTime: 0,
            totalChunks: 0,
            averageProcessingTime: 0,
            successfulProcessing: 0,
            failedProcessing: 0
        };
        
        this.hybridStrategy.reliabilityMetrics = {
            totalDecisions: 0,
            highConfidenceDecisions: 0,
            aiFallbackUsed: 0,
            falsePositives: 0
        };
    }

    /**
     * Configure hybrid strategy parameters
     */
    configureStrategy(config) {
        Object.assign(this.hybridStrategy.constructor.HYBRID_CONFIG, config);
    }

    /**
     * Get current context for debugging
     */
    getCurrentContext() {
        return this.hybridStrategy.getRecentContext();
    }

    /**
     * Manual processing trigger (for testing)
     */
    async forceProcess() {
        const context = this.hybridStrategy.getRecentContext();
        if (context) {
            await this.sendToGeminiProcessing(context, {
                shouldProcess: true,
                confidence: 1.0,
                method: 'manual',
                reasons: ['manual_trigger']
            });
        }
    }
}

/**
 * Factory function to create VAD integration with gemini context
 */
function createVadIntegration(geminiContext) {
    return new VadIntegration(geminiContext);
}

/**
 * Patch existing gemini.js onmessage function to use hybrid strategy
 */
function patchGeminiVadProcessing(session, vadIntegration) {
    // Store original processing function if it exists
    const originalOnMessage = session.onmessage;
    
    // Replace with hybrid processing
    session.onmessage = async function(event) {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'transcription' && data.text) {
                // Use hybrid VAD strategy instead of original processing
                const decision = await vadIntegration.processVadTranscription(
                    data.text, 
                    Date.now()
                );
                
                if (process.env.DEBUG_APP === 'true') {
                    console.log(`[PATCHED_VAD] Processed transcription:`, {
                        text: data.text.substring(0, 30) + '...',
                        decision: decision.shouldProcess,
                        confidence: decision.confidence
                    });
                }
                
                return decision;
            }
            
            // For non-transcription messages, use original handler if available
            if (originalOnMessage) {
                return originalOnMessage.call(this, event);
            }
            
        } catch (error) {
            console.error('[PATCHED_VAD] Error in patched processing:', error);
            
            // Fallback to original handler
            if (originalOnMessage) {
                return originalOnMessage.call(this, event);
            }
        }
    };
    
    if (process.env.DEBUG_APP === 'true') {
        console.log('[VAD_INTEGRATION] Successfully patched Gemini VAD processing');
    }
}

module.exports = {
    VadIntegration,
    createVadIntegration,
    patchGeminiVadProcessing
};