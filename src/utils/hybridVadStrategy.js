/**
 * Hybrid VAD Strategy Implementation
 * Combines Enhanced Chunking (Primary) with AI Semantic Continuity (Fallback)
 * Prioritizes reliability and uses timestamp-based context management
 */

// Configuration constants
const HYBRID_CONFIG = {
    // Context management
    CONTEXT_WINDOW_MS: 2 * 60 * 1000, // 2 minutes
    MAX_CONTEXT_CHARS: 2000,
    MIN_CHUNK_CHARS: 10,
    
    // Enhanced chunking thresholds
    NATURAL_PAUSE_MS: 800,
    SENTENCE_END_PAUSE_MS: 1200,
    TOPIC_CHANGE_PAUSE_MS: 2000,
    
    // Reliability scoring
    HIGH_CONFIDENCE_THRESHOLD: 0.85,
    MEDIUM_CONFIDENCE_THRESHOLD: 0.65,
    LOW_CONFIDENCE_THRESHOLD: 0.4,
    
    // AI fallback triggers
    USE_AI_FALLBACK_BELOW_CONFIDENCE: 0.65,
    MAX_AI_FALLBACK_CALLS_PER_MINUTE: 3,
    
    // Interview-specific patterns
    QUESTION_INDICATORS: ['what', 'how', 'why', 'when', 'where', 'can you', 'tell me', 'explain'],
    CONTINUATION_WORDS: ['and', 'also', 'furthermore', 'additionally', 'moreover', 'besides'],
    SENTENCE_ENDERS: ['.', '?', '!'],
    INCOMPLETE_INDICATORS: ['um', 'uh', 'so', 'well', 'like']
};

class HybridVadStrategy {
    constructor() {
        this.contextBuffer = [];
        this.lastProcessTime = Date.now();
        this.aiFallbackCallCount = 0;
        this.aiFallbackResetTime = Date.now();
        this.reliabilityMetrics = {
            totalDecisions: 0,
            highConfidenceDecisions: 0,
            aiFallbackUsed: 0,
            falsePositives: 0
        };
    }

    /**
     * Main processing function - implements hybrid strategy
     */
    async processTranscriptionChunk(chunk, timestamp) {
        try {
            // Clean and validate input
            const cleanChunk = this.cleanTranscriptionText(chunk);
            if (!this.isValidChunk(cleanChunk)) {
                return { shouldProcess: false, confidence: 0, reason: 'invalid_chunk' };
            }

            // Add to context buffer with timestamp
            this.addToContextBuffer(cleanChunk, timestamp);
            
            // Clean old context (keep only last 2 minutes)
            this.cleanOldContext(timestamp);
            
            // Primary: Enhanced chunking analysis
            const chunkingResult = this.analyzeWithEnhancedChunking(timestamp);
            
            // If high confidence, use chunking result
            if (chunkingResult.confidence >= HYBRID_CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
                this.updateReliabilityMetrics('high_confidence', chunkingResult);
                return chunkingResult;
            }
            
            // If medium confidence and AI fallback available, use AI
            if (chunkingResult.confidence >= HYBRID_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD && 
                this.canUseAiFallback()) {
                const aiResult = await this.analyzeWithAiSemanticContinuity();
                this.updateReliabilityMetrics('ai_fallback', aiResult);
                return aiResult;
            }
            
            // Low confidence - be conservative, don't process
            if (chunkingResult.confidence < HYBRID_CONFIG.LOW_CONFIDENCE_THRESHOLD) {
                this.updateReliabilityMetrics('low_confidence', chunkingResult);
                return { shouldProcess: false, confidence: chunkingResult.confidence, reason: 'low_confidence' };
            }
            
            // Medium confidence without AI - use chunking with caution
            this.updateReliabilityMetrics('medium_confidence', chunkingResult);
            return chunkingResult;
            
        } catch (error) {
            console.error('[HYBRID_VAD] Processing error:', error);
            return { shouldProcess: false, confidence: 0, reason: 'processing_error', error };
        }
    }

    /**
     * Enhanced chunking analysis with interview-specific optimizations
     */
    analyzeWithEnhancedChunking(currentTimestamp) {
        const context = this.getRecentContext();
        const timeSinceLastChunk = this.getTimeSinceLastChunk(currentTimestamp);
        
        let confidence = 0.5; // Base confidence
        let shouldProcess = false;
        const reasons = [];
        
        // Time-based analysis
        if (timeSinceLastChunk > HYBRID_CONFIG.TOPIC_CHANGE_PAUSE_MS) {
            confidence += 0.3;
            shouldProcess = true;
            reasons.push('long_pause_detected');
        } else if (timeSinceLastChunk > HYBRID_CONFIG.SENTENCE_END_PAUSE_MS) {
            confidence += 0.2;
            shouldProcess = true;
            reasons.push('sentence_end_pause');
        } else if (timeSinceLastChunk > HYBRID_CONFIG.NATURAL_PAUSE_MS) {
            confidence += 0.1;
            reasons.push('natural_pause');
        }
        
        // Content-based analysis
        const contentAnalysis = this.analyzeContextContent(context);
        confidence += contentAnalysis.confidenceBoost;
        
        if (contentAnalysis.hasQuestionPattern) {
            shouldProcess = true;
            reasons.push('question_pattern_detected');
        }
        
        if (contentAnalysis.hasSentenceEnding) {
            confidence += 0.15;
            shouldProcess = true;
            reasons.push('sentence_ending_detected');
        }
        
        if (contentAnalysis.hasIncompleteIndicators) {
            confidence -= 0.2;
            reasons.push('incomplete_speech_detected');
        }
        
        // Context length analysis
        if (context.length > HYBRID_CONFIG.MAX_CONTEXT_CHARS * 0.8) {
            confidence += 0.1;
            shouldProcess = true;
            reasons.push('context_length_threshold');
        }
        
        // Ensure confidence is within bounds
        confidence = Math.max(0, Math.min(1, confidence));
        
        return {
            shouldProcess,
            confidence,
            reasons,
            method: 'enhanced_chunking',
            contextLength: context.length,
            timeSinceLastChunk
        };
    }

    /**
     * AI-powered semantic continuity detection (fallback)
     */
    async analyzeWithAiSemanticContinuity() {
        try {
            this.aiFallbackCallCount++;
            
            const context = this.getRecentContext();
            const lastChunk = this.getLastChunk();
            
            // Lightweight semantic analysis prompt
            const prompt = `Analyze if this speech fragment seems complete or if the speaker is likely to continue:

"${lastChunk}"

Context: "${context.slice(-200)}" // Last 200 chars for context

Respond with only: COMPLETE or CONTINUE`;
            
            // This would integrate with your existing Gemini API
            // For now, return a mock analysis based on heuristics
            const aiDecision = await this.mockAiAnalysis(context, lastChunk);
            
            return {
                shouldProcess: aiDecision === 'COMPLETE',
                confidence: 0.8, // AI typically has high confidence when used
                reasons: ['ai_semantic_analysis'],
                method: 'ai_semantic_continuity',
                aiDecision
            };
            
        } catch (error) {
            console.error('[HYBRID_VAD] AI fallback error:', error);
            // Fallback to conservative chunking
            return this.analyzeWithEnhancedChunking(Date.now());
        }
    }

    /**
     * Context management functions
     */
    addToContextBuffer(text, timestamp) {
        this.contextBuffer.push({
            text,
            timestamp,
            length: text.length
        });
    }
    
    cleanOldContext(currentTimestamp) {
        const cutoffTime = currentTimestamp - HYBRID_CONFIG.CONTEXT_WINDOW_MS;
        this.contextBuffer = this.contextBuffer.filter(item => item.timestamp > cutoffTime);
        
        // Also enforce character limit
        let totalChars = this.contextBuffer.reduce((sum, item) => sum + item.length, 0);
        while (totalChars > HYBRID_CONFIG.MAX_CONTEXT_CHARS && this.contextBuffer.length > 1) {
            const removed = this.contextBuffer.shift();
            totalChars -= removed.length;
        }
    }
    
    getRecentContext() {
        return this.contextBuffer.map(item => item.text).join(' ');
    }
    
    getLastChunk() {
        return this.contextBuffer.length > 0 ? this.contextBuffer[this.contextBuffer.length - 1].text : '';
    }
    
    getTimeSinceLastChunk(currentTimestamp) {
        if (this.contextBuffer.length < 2) return 0;
        const lastTimestamp = this.contextBuffer[this.contextBuffer.length - 2].timestamp;
        return currentTimestamp - lastTimestamp;
    }

    /**
     * Content analysis helpers
     */
    analyzeContextContent(context) {
        const lowerContext = context.toLowerCase();
        
        return {
            hasQuestionPattern: HYBRID_CONFIG.QUESTION_INDICATORS.some(indicator => 
                lowerContext.includes(indicator)
            ),
            hasSentenceEnding: HYBRID_CONFIG.SENTENCE_ENDERS.some(ender => 
                context.trim().endsWith(ender)
            ),
            hasIncompleteIndicators: HYBRID_CONFIG.INCOMPLETE_INDICATORS.some(indicator => 
                lowerContext.includes(indicator)
            ),
            hasContinuationWords: HYBRID_CONFIG.CONTINUATION_WORDS.some(word => 
                lowerContext.includes(word)
            ),
            confidenceBoost: this.calculateContentConfidenceBoost(lowerContext)
        };
    }
    
    calculateContentConfidenceBoost(lowerContext) {
        let boost = 0;
        
        // Question patterns boost confidence
        const questionCount = HYBRID_CONFIG.QUESTION_INDICATORS.filter(indicator => 
            lowerContext.includes(indicator)
        ).length;
        boost += Math.min(questionCount * 0.1, 0.3);
        
        // Sentence structure analysis
        const words = lowerContext.split(' ').filter(w => w.length > 0);
        if (words.length > 5) boost += 0.1; // Complete thoughts tend to be longer
        if (words.length > 10) boost += 0.1;
        
        return boost;
    }

    /**
     * Utility functions
     */
    cleanTranscriptionText(text) {
        return text.trim().replace(/\s+/g, ' ');
    }
    
    isValidChunk(text) {
        return text.length >= HYBRID_CONFIG.MIN_CHUNK_CHARS && 
               text.length <= HYBRID_CONFIG.MAX_CONTEXT_CHARS;
    }
    
    canUseAiFallback() {
        const now = Date.now();
        
        // Reset counter every minute
        if (now - this.aiFallbackResetTime > 60000) {
            this.aiFallbackCallCount = 0;
            this.aiFallbackResetTime = now;
        }
        
        return this.aiFallbackCallCount < HYBRID_CONFIG.MAX_AI_FALLBACK_CALLS_PER_MINUTE;
    }
    
    async mockAiAnalysis(context, lastChunk) {
        // Mock AI analysis for testing - replace with actual Gemini integration
        const hasQuestionMark = lastChunk.includes('?');
        const endsWithPeriod = lastChunk.trim().endsWith('.');
        const hasIncomplete = HYBRID_CONFIG.INCOMPLETE_INDICATORS.some(indicator => 
            lastChunk.toLowerCase().includes(indicator)
        );
        
        if (hasQuestionMark || endsWithPeriod) return 'COMPLETE';
        if (hasIncomplete) return 'CONTINUE';
        
        return lastChunk.length > 50 ? 'COMPLETE' : 'CONTINUE';
    }
    
    updateReliabilityMetrics(decisionType, result) {
        this.reliabilityMetrics.totalDecisions++;
        
        switch (decisionType) {
            case 'high_confidence':
                this.reliabilityMetrics.highConfidenceDecisions++;
                break;
            case 'ai_fallback':
                this.reliabilityMetrics.aiFallbackUsed++;
                break;
        }
    }
    
    getReliabilityReport() {
        const total = this.reliabilityMetrics.totalDecisions;
        return {
            ...this.reliabilityMetrics,
            highConfidenceRate: total > 0 ? this.reliabilityMetrics.highConfidenceDecisions / total : 0,
            aiFallbackRate: total > 0 ? this.reliabilityMetrics.aiFallbackUsed / total : 0
        };
    }
}

module.exports = { HybridVadStrategy, HYBRID_CONFIG };