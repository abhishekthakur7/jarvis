/**
 * Reliability Metrics and Confidence Scoring System
 * Provides comprehensive monitoring and validation for VAD processing decisions
 */

class ReliabilityMetrics {
    constructor() {
        this.metrics = {
            // Decision tracking
            totalDecisions: 0,
            correctDecisions: 0,
            falsePositives: 0,
            falseNegatives: 0,
            
            // Confidence distribution
            highConfidenceDecisions: 0,
            mediumConfidenceDecisions: 0,
            lowConfidenceDecisions: 0,
            
            // Method usage
            enhancedChunkingUsed: 0,
            aiFallbackUsed: 0,
            fallbackProcessingUsed: 0,
            
            // Performance metrics
            averageConfidence: 0,
            confidenceSum: 0,
            processingTimes: [],
            
            // Context quality
            contextLengthDistribution: {
                short: 0,    // < 100 chars
                medium: 0,   // 100-500 chars
                long: 0,     // 500-1500 chars
                veryLong: 0  // > 1500 chars
            },
            
            // Temporal patterns
            pauseDistribution: {
                short: 0,    // < 500ms
                natural: 0,  // 500-1000ms
                sentence: 0, // 1000-2000ms
                topic: 0     // > 2000ms
            },
            
            // Error tracking
            processingErrors: 0,
            aiFallbackErrors: 0,
            integrationErrors: 0
        };
        
        this.decisionHistory = [];
        this.maxHistorySize = 1000;
        this.startTime = Date.now();
    }

    /**
     * Record a processing decision with all relevant context
     */
    recordDecision(decision, context = {}) {
        const timestamp = Date.now();
        
        // Update basic metrics
        this.metrics.totalDecisions++;
        this.metrics.confidenceSum += decision.confidence;
        this.metrics.averageConfidence = this.metrics.confidenceSum / this.metrics.totalDecisions;
        
        // Track confidence distribution
        if (decision.confidence >= 0.8) {
            this.metrics.highConfidenceDecisions++;
        } else if (decision.confidence >= 0.5) {
            this.metrics.mediumConfidenceDecisions++;
        } else {
            this.metrics.lowConfidenceDecisions++;
        }
        
        // Track method usage
        switch (decision.method) {
            case 'enhanced_chunking':
                this.metrics.enhancedChunkingUsed++;
                break;
            case 'ai_semantic_continuity':
                this.metrics.aiFallbackUsed++;
                break;
            case 'fallback':
                this.metrics.fallbackProcessingUsed++;
                break;
        }
        
        // Track context quality
        if (context.contextLength) {
            this.updateContextDistribution(context.contextLength);
        }
        
        // Track pause patterns
        if (context.timeSinceLastChunk) {
            this.updatePauseDistribution(context.timeSinceLastChunk);
        }
        
        // Store decision in history
        const decisionRecord = {
            timestamp,
            decision: { ...decision },
            context: { ...context },
            sessionTime: timestamp - this.startTime
        };
        
        this.decisionHistory.push(decisionRecord);
        
        // Maintain history size limit
        if (this.decisionHistory.length > this.maxHistorySize) {
            this.decisionHistory.shift();
        }
    }

    /**
     * Record processing performance
     */
    recordProcessingTime(timeMs) {
        this.metrics.processingTimes.push(timeMs);
        
        // Keep only last 100 measurements for rolling average
        if (this.metrics.processingTimes.length > 100) {
            this.metrics.processingTimes.shift();
        }
    }

    /**
     * Record validation results (when ground truth is available)
     */
    recordValidation(wasCorrect, wasProcessed, shouldHaveBeenProcessed) {
        if (wasCorrect) {
            this.metrics.correctDecisions++;
        } else {
            if (wasProcessed && !shouldHaveBeenProcessed) {
                this.metrics.falsePositives++;
            } else if (!wasProcessed && shouldHaveBeenProcessed) {
                this.metrics.falseNegatives++;
            }
        }
    }

    /**
     * Record errors by type
     */
    recordError(errorType, error = null) {
        switch (errorType) {
            case 'processing':
                this.metrics.processingErrors++;
                break;
            case 'ai_fallback':
                this.metrics.aiFallbackErrors++;
                break;
            case 'integration':
                this.metrics.integrationErrors++;
                break;
        }
        
        if (error) {
            console.error(`[RELIABILITY_METRICS] ${errorType} error:`, error);
        }
    }

    /**
     * Calculate confidence score based on multiple factors
     */
    calculateConfidenceScore(factors) {
        let confidence = 0.5; // Base confidence
        const weights = {
            pauseLength: 0.3,
            contentQuality: 0.25,
            contextLength: 0.15,
            sentenceStructure: 0.2,
            historicalAccuracy: 0.1
        };
        
        // Pause length factor
        if (factors.pauseLength) {
            if (factors.pauseLength > 2000) confidence += weights.pauseLength * 0.8;
            else if (factors.pauseLength > 1200) confidence += weights.pauseLength * 0.6;
            else if (factors.pauseLength > 800) confidence += weights.pauseLength * 0.3;
            else confidence -= weights.pauseLength * 0.2;
        }
        
        // Content quality factor
        if (factors.hasQuestionPattern) confidence += weights.contentQuality * 0.8;
        if (factors.hasSentenceEnding) confidence += weights.contentQuality * 0.6;
        if (factors.hasIncompleteIndicators) confidence -= weights.contentQuality * 0.7;
        
        // Context length factor
        if (factors.contextLength) {
            if (factors.contextLength > 100) confidence += weights.contextLength * 0.5;
            if (factors.contextLength > 500) confidence += weights.contextLength * 0.3;
            if (factors.contextLength > 1500) confidence -= weights.contextLength * 0.2; // Too long
        }
        
        // Sentence structure factor
        if (factors.wordCount) {
            if (factors.wordCount > 5) confidence += weights.sentenceStructure * 0.4;
            if (factors.wordCount > 10) confidence += weights.sentenceStructure * 0.3;
        }
        
        // Historical accuracy factor
        const recentAccuracy = this.getRecentAccuracy();
        if (recentAccuracy > 0.8) {
            confidence += weights.historicalAccuracy * 0.5;
        } else if (recentAccuracy < 0.6) {
            confidence -= weights.historicalAccuracy * 0.3;
        }
        
        // Ensure confidence is within bounds
        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Get recent accuracy based on validation history
     */
    getRecentAccuracy(lookbackCount = 20) {
        if (this.metrics.totalDecisions === 0) return 0.5;
        
        const totalValidated = this.metrics.correctDecisions + this.metrics.falsePositives + this.metrics.falseNegatives;
        if (totalValidated === 0) return 0.5;
        
        return this.metrics.correctDecisions / totalValidated;
    }

    /**
     * Update context length distribution
     */
    updateContextDistribution(length) {
        if (length < 100) {
            this.metrics.contextLengthDistribution.short++;
        } else if (length < 500) {
            this.metrics.contextLengthDistribution.medium++;
        } else if (length < 1500) {
            this.metrics.contextLengthDistribution.long++;
        } else {
            this.metrics.contextLengthDistribution.veryLong++;
        }
    }

    /**
     * Update pause distribution
     */
    updatePauseDistribution(pauseMs) {
        if (pauseMs < 500) {
            this.metrics.pauseDistribution.short++;
        } else if (pauseMs < 1000) {
            this.metrics.pauseDistribution.natural++;
        } else if (pauseMs < 2000) {
            this.metrics.pauseDistribution.sentence++;
        } else {
            this.metrics.pauseDistribution.topic++;
        }
    }

    /**
     * Generate comprehensive reliability report
     */
    generateReport() {
        const totalDecisions = this.metrics.totalDecisions;
        const totalValidated = this.metrics.correctDecisions + this.metrics.falsePositives + this.metrics.falseNegatives;
        const avgProcessingTime = this.metrics.processingTimes.length > 0 ?
            this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length : 0;
        
        return {
            summary: {
                totalDecisions,
                averageConfidence: this.metrics.averageConfidence.toFixed(3),
                accuracy: totalValidated > 0 ? (this.metrics.correctDecisions / totalValidated).toFixed(3) : 'N/A',
                averageProcessingTime: avgProcessingTime.toFixed(2) + 'ms',
                uptime: ((Date.now() - this.startTime) / 1000 / 60).toFixed(1) + ' minutes'
            },
            
            confidence: {
                high: totalDecisions > 0 ? (this.metrics.highConfidenceDecisions / totalDecisions * 100).toFixed(1) + '%' : '0%',
                medium: totalDecisions > 0 ? (this.metrics.mediumConfidenceDecisions / totalDecisions * 100).toFixed(1) + '%' : '0%',
                low: totalDecisions > 0 ? (this.metrics.lowConfidenceDecisions / totalDecisions * 100).toFixed(1) + '%' : '0%'
            },
            
            methods: {
                enhancedChunking: totalDecisions > 0 ? (this.metrics.enhancedChunkingUsed / totalDecisions * 100).toFixed(1) + '%' : '0%',
                aiFallback: totalDecisions > 0 ? (this.metrics.aiFallbackUsed / totalDecisions * 100).toFixed(1) + '%' : '0%',
                fallback: totalDecisions > 0 ? (this.metrics.fallbackProcessingUsed / totalDecisions * 100).toFixed(1) + '%' : '0%'
            },
            
            accuracy: {
                correct: this.metrics.correctDecisions,
                falsePositives: this.metrics.falsePositives,
                falseNegatives: this.metrics.falseNegatives,
                precision: (this.metrics.correctDecisions + this.metrics.falsePositives) > 0 ?
                    (this.metrics.correctDecisions / (this.metrics.correctDecisions + this.metrics.falsePositives)).toFixed(3) : 'N/A',
                recall: (this.metrics.correctDecisions + this.metrics.falseNegatives) > 0 ?
                    (this.metrics.correctDecisions / (this.metrics.correctDecisions + this.metrics.falseNegatives)).toFixed(3) : 'N/A'
            },
            
            errors: {
                processing: this.metrics.processingErrors,
                aiFallback: this.metrics.aiFallbackErrors,
                integration: this.metrics.integrationErrors,
                errorRate: totalDecisions > 0 ?
                    ((this.metrics.processingErrors + this.metrics.aiFallbackErrors + this.metrics.integrationErrors) / totalDecisions * 100).toFixed(2) + '%' : '0%'
            },
            
            patterns: {
                contextLength: this.metrics.contextLengthDistribution,
                pauseDistribution: this.metrics.pauseDistribution
            }
        };
    }

    /**
     * Get recent decision trends
     */
    getRecentTrends(minutes = 5) {
        const cutoffTime = Date.now() - (minutes * 60 * 1000);
        const recentDecisions = this.decisionHistory.filter(d => d.timestamp > cutoffTime);
        
        if (recentDecisions.length === 0) {
            return { noData: true };
        }
        
        const avgConfidence = recentDecisions.reduce((sum, d) => sum + d.decision.confidence, 0) / recentDecisions.length;
        const processedCount = recentDecisions.filter(d => d.decision.shouldProcess).length;
        
        return {
            totalDecisions: recentDecisions.length,
            averageConfidence: avgConfidence.toFixed(3),
            processingRate: (processedCount / recentDecisions.length * 100).toFixed(1) + '%',
            methodDistribution: this.getMethodDistribution(recentDecisions)
        };
    }

    /**
     * Get method distribution for a set of decisions
     */
    getMethodDistribution(decisions) {
        const methods = {};
        decisions.forEach(d => {
            methods[d.decision.method] = (methods[d.decision.method] || 0) + 1;
        });
        
        const total = decisions.length;
        Object.keys(methods).forEach(method => {
            methods[method] = (methods[method] / total * 100).toFixed(1) + '%';
        });
        
        return methods;
    }

    /**
     * Export metrics for analysis
     */
    exportMetrics() {
        return {
            metrics: { ...this.metrics },
            decisionHistory: [...this.decisionHistory],
            report: this.generateReport(),
            exportTime: Date.now()
        };
    }

    /**
     * Reset all metrics (useful for testing)
     */
    reset() {
        this.metrics = {
            totalDecisions: 0,
            correctDecisions: 0,
            falsePositives: 0,
            falseNegatives: 0,
            highConfidenceDecisions: 0,
            mediumConfidenceDecisions: 0,
            lowConfidenceDecisions: 0,
            enhancedChunkingUsed: 0,
            aiFallbackUsed: 0,
            fallbackProcessingUsed: 0,
            averageConfidence: 0,
            confidenceSum: 0,
            processingTimes: [],
            contextLengthDistribution: { short: 0, medium: 0, long: 0, veryLong: 0 },
            pauseDistribution: { short: 0, natural: 0, sentence: 0, topic: 0 },
            processingErrors: 0,
            aiFallbackErrors: 0,
            integrationErrors: 0
        };
        
        this.decisionHistory = [];
        this.startTime = Date.now();
    }
}

/**
 * Confidence scoring utility functions
 */
class ConfidenceScorer {
    static calculatePauseConfidence(pauseMs) {
        if (pauseMs > 2000) return 0.9;
        if (pauseMs > 1200) return 0.7;
        if (pauseMs > 800) return 0.5;
        if (pauseMs > 400) return 0.3;
        return 0.1;
    }
    
    static calculateContentConfidence(text) {
        const lowerText = text.toLowerCase();
        let confidence = 0.3; // Base confidence
        
        // Question indicators
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'can', 'tell me', 'explain'];
        if (questionWords.some(word => lowerText.includes(word))) {
            confidence += 0.3;
        }
        
        // Sentence endings
        if (text.trim().match(/[.!?]$/)) {
            confidence += 0.2;
        }
        
        // Incomplete indicators (reduce confidence)
        const incompleteWords = ['um', 'uh', 'so', 'well', 'like'];
        if (incompleteWords.some(word => lowerText.includes(word))) {
            confidence -= 0.2;
        }
        
        // Length factor
        if (text.length > 50) confidence += 0.1;
        if (text.length > 100) confidence += 0.1;
        
        return Math.max(0, Math.min(1, confidence));
    }
    
    static combineConfidenceFactors(factors, weights = {}) {
        const defaultWeights = {
            pause: 0.4,
            content: 0.3,
            context: 0.2,
            historical: 0.1
        };
        
        const finalWeights = { ...defaultWeights, ...weights };
        
        let totalConfidence = 0;
        let totalWeight = 0;
        
        Object.keys(factors).forEach(factor => {
            if (finalWeights[factor] && factors[factor] !== undefined) {
                totalConfidence += factors[factor] * finalWeights[factor];
                totalWeight += finalWeights[factor];
            }
        });
        
        return totalWeight > 0 ? totalConfidence / totalWeight : 0.5;
    }
}

module.exports = {
    ReliabilityMetrics,
    ConfidenceScorer
};