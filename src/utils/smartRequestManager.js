/**
 * Smart Request Management System for Technical Interview Optimization
 * 
 * Provides priority-based processing and intelligent interruption while preserving
 * existing single-session architecture and maintaining safety mechanisms.
 * 
 * Key Features:
 * - Priority-based request processing (urgent, high, normal, low)
 * - Intelligent interruption based on confidence and context
 * - Performance monitoring and adaptive optimization
 * - Safe fallback to existing mechanisms
 */

class SmartRequestManager {
    constructor() {
        // Preserve existing abort controller pattern
        this.currentAbortController = null;
        this.isProcessingRequest = false;
        
        // ENHANCED: Priority-based request queue
        this.requestQueue = {
            urgent: [],      // Clarifications, immediate questions
            high: [],        // Technical questions, follow-ups
            normal: [],      // General interview questions
            low: []          // Background context, less critical
        };
        
        // ENHANCED: Performance tracking and optimization
        this.performanceMetrics = {
            avgResponseTime: 0,
            recentLatencies: [],
            optimalResponseLength: 150,
            successfulInterruptions: 0,
            failedInterruptions: 0,
            totalRequests: 0,
            priorityDistribution: {
                urgent: 0,
                high: 0,
                normal: 0,
                low: 0
            }
        };
        
        // ENHANCED: Intelligent interruption system
        this.interruptionConfig = {
            enabled: true,
            conservativeMode: true, // Start conservative, adapt based on success
            confidenceThresholds: {
                urgent: 0.9,     // Very high confidence needed
                high: 0.8,       // High confidence
                normal: 0.6,     // Medium confidence
                low: 0.4         // Lower confidence
            },
            contextualFactors: {
                interviewPhase: 'warmup', // warmup, technical, closing
                responseProgress: 0,       // How far into current response (0-1)
                responseRelevance: 0.5     // How relevant current response is
            }
        };
        
        // ENHANCED: Request analysis and categorization
        this.requestAnalyzer = {
            technicalKeywords: [
                'algorithm', 'complexity', 'optimization', 'scale', 'design',
                'architecture', 'database', 'system', 'performance', 'implement',
                'code', 'function', 'class', 'method', 'api', 'big o',
                'sorting', 'searching', 'tree', 'graph', 'array', 'linked list'
            ],
            urgencyIndicators: [
                'wait', 'hold on', 'stop', 'clarify', 'explain',
                'what do you mean', 'i don\'t understand', 'sorry',
                'can you repeat', 'slow down'
            ],
            questionPatterns: [
                'what', 'how', 'why', 'when', 'where', 'who', 'which',
                'can', 'could', 'would', 'should', 'is', 'are',
                'do', 'does', 'did', 'will', 'have', 'has'
            ]
        };
        
        // Session state
        this.sessionStartTime = Date.now();
        this.isInitialized = false;
        
        console.log('🚀 Smart Request Manager initialized for technical interview optimization');
    }
    
    /**
     * Initialize the Smart Request Manager
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.sessionStartTime = Date.now();
        this.updateInterviewPhase('warmup');
        this.isInitialized = true;
        
        console.log('🎯 Smart Request Manager: Initialized for new interview session');
    }
    
    /**
     * Process request with intelligent priority assignment and management
     * @param {string} input - User input text
     * @param {Object} context - Additional context (interviewContext, vadData, etc.)
     * @param {Function} requestFunction - Function to execute the actual request
     * @returns {Promise} Request promise
     */
    async processWithPriority(input, context = {}, requestFunction) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        const startTime = Date.now();
        
        // Analyze request and assign priority
        const requestAnalysis = this.analyzeRequest(input, context);
        const priority = requestAnalysis.priority;
        
        console.log(`📋 [SMART_REQUEST] Analyzed request - Priority: ${priority}, Type: ${requestAnalysis.type}`);
        
        // Update metrics
        this.performanceMetrics.totalRequests++;
        this.performanceMetrics.priorityDistribution[priority]++;
        
        // Check if we should interrupt current request
        const shouldInterrupt = this.shouldInterruptCurrent(requestAnalysis);
        
        if (shouldInterrupt && this.currentAbortController) {
            console.log('🛑 [SMART_INTERRUPT] Interrupting current request for higher priority');
            await this.performIntelligentInterruption(requestAnalysis);
        }
        
        // Create new abort controller for this request
        const abortController = new AbortController();
        this.currentAbortController = abortController;
        this.isProcessingRequest = true;
        
        try {
            // Execute request with timeout based on priority
            const timeoutMs = this.getTimeoutForPriority(priority);
            const requestPromise = this.executeWithTimeout(requestFunction, timeoutMs, abortController.signal);
            
            // Track performance
            const result = await requestPromise;
            const responseTime = Date.now() - startTime;
            
            this.updatePerformanceMetrics(responseTime, requestAnalysis, true);
            
            console.log(`✅ [SMART_REQUEST] Completed ${priority} priority request in ${responseTime}ms`);
            
            return result;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.updatePerformanceMetrics(responseTime, requestAnalysis, false);
            
            if (error.name === 'AbortError') {
                console.log('🚫 [SMART_REQUEST] Request was interrupted');
            } else {
                console.error('❌ [SMART_REQUEST] Request failed:', error.message);
            }
            
            throw error;
            
        } finally {
            this.isProcessingRequest = false;
            if (this.currentAbortController === abortController) {
                this.currentAbortController = null;
            }
        }
    }
    
    /**
     * Analyze request to determine priority and characteristics
     * @param {string} input - User input
     * @param {Object} context - Additional context
     * @returns {Object} Analysis result with priority, type, confidence
     */
    analyzeRequest(input, context = {}) {
        const text = input.toLowerCase().trim();
        
        let analysis = {
            priority: 'normal',
            type: 'general',
            confidence: 0.5,
            urgencyScore: 0,
            technicalScore: 0,
            contextRelevance: 0.5,
            interruptionWorthiness: 0.3
        };
        
        // Check for urgency indicators
        analysis.urgencyScore = this.calculateUrgencyScore(text);
        
        // Check for technical content
        analysis.technicalScore = this.calculateTechnicalScore(text);
        
        // Analyze based on interview context from AudioWorklet
        if (context.interviewContext) {
            analysis = this.enhanceWithInterviewContext(analysis, context.interviewContext);
        }
        
        // Determine priority based on scores
        analysis.priority = this.determinePriority(analysis);
        
        // Calculate interruption worthiness
        analysis.interruptionWorthiness = this.calculateInterruptionWorthiness(analysis);
        
        return analysis;
    }
    
    /**
     * Calculate urgency score based on urgency indicators
     */
    calculateUrgencyScore(text) {
        let urgencyScore = 0;
        
        // Check for direct urgency indicators
        this.requestAnalyzer.urgencyIndicators.forEach(indicator => {
            if (text.includes(indicator)) {
                urgencyScore += 0.3;
            }
        });
        
        // Check for question patterns with urgency
        if (text.includes('?') || this.requestAnalyzer.questionPatterns.some(q => text.startsWith(q))) {
            urgencyScore += 0.2;
        }
        
        // Check for interruption words
        if (text.includes('wait') || text.includes('stop') || text.includes('hold')) {
            urgencyScore += 0.5;
        }
        
        return Math.min(1.0, urgencyScore);
    }
    
    /**
     * Calculate technical complexity score
     */
    calculateTechnicalScore(text) {
        let technicalScore = 0;
        
        // Count technical keywords
        this.requestAnalyzer.technicalKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                technicalScore += 0.15;
            }
        });
        
        // Bonus for multiple technical terms
        const technicalTerms = this.requestAnalyzer.technicalKeywords.filter(k => text.includes(k));
        if (technicalTerms.length > 2) {
            technicalScore += 0.2;
        }
        
        // Length factor for complex explanations
        const wordCount = text.split(/\\s+/).length;
        if (wordCount > 15) {
            technicalScore += 0.1;
        }
        
        return Math.min(1.0, technicalScore);
    }
    
    /**
     * Enhance analysis with interview context from AudioWorklet
     */
    enhanceWithInterviewContext(analysis, interviewContext) {
        switch (interviewContext.type) {
            case 'question':
                analysis.priority = 'high';
                analysis.type = 'question';
                analysis.confidence = interviewContext.confidence || 0.8;
                analysis.interruptionWorthiness += 0.3;
                break;
                
            case 'clarification':
                analysis.priority = 'urgent';
                analysis.type = 'clarification';
                analysis.confidence = interviewContext.confidence || 0.9;
                analysis.urgencyScore = Math.max(analysis.urgencyScore, 0.8);
                analysis.interruptionWorthiness += 0.5;
                break;
                
            case 'technical_explanation':
                if (interviewContext.likelyIncomplete) {
                    analysis.priority = 'low'; // Don't interrupt incomplete explanations
                    analysis.interruptionWorthiness -= 0.3;
                } else {
                    analysis.priority = 'normal';
                    analysis.technicalScore = Math.max(analysis.technicalScore, 0.7);
                }
                analysis.type = 'technical';
                break;
        }
        
        return analysis;
    }
    
    /**
     * Determine final priority based on analysis scores
     */
    determinePriority(analysis) {
        if (analysis.urgencyScore > 0.7) {
            return 'urgent';
        } else if (analysis.urgencyScore > 0.4 || analysis.technicalScore > 0.6) {
            return 'high';
        } else if (analysis.technicalScore > 0.3) {
            return 'normal';
        } else {
            return 'low';
        }
    }
    
    /**
     * Calculate how worthy this request is of interrupting current processing
     */
    calculateInterruptionWorthiness(analysis) {
        let worthiness = 0;
        
        // Base worthiness from priority
        const priorityWeights = { urgent: 0.8, high: 0.6, normal: 0.3, low: 0.1 };
        worthiness += priorityWeights[analysis.priority] || 0.3;
        
        // Urgency factor
        worthiness += analysis.urgencyScore * 0.4;
        
        // Confidence factor
        worthiness += analysis.confidence * 0.3;
        
        // Interview phase adjustment
        if (this.interruptionConfig.contextualFactors.interviewPhase === 'technical') {
            worthiness *= 1.2; // More aggressive during technical phase
        } else if (this.interruptionConfig.contextualFactors.interviewPhase === 'warmup') {
            worthiness *= 0.8; // More conservative during warmup
        }
        
        return Math.min(1.0, worthiness);
    }
    
    /**
     * Determine if current request should be interrupted
     */
    shouldInterruptCurrent(requestAnalysis) {
        if (!this.interruptionConfig.enabled || !this.currentAbortController) {
            return false;
        }
        
        // Conservative mode requires higher confidence
        const confidenceThreshold = this.interruptionConfig.conservativeMode
            ? this.interruptionConfig.confidenceThresholds[requestAnalysis.priority] + 0.1
            : this.interruptionConfig.confidenceThresholds[requestAnalysis.priority];
        
        // Check if interruption is worthy and confident enough
        const isWorthy = requestAnalysis.interruptionWorthiness > 0.7;
        const isConfident = requestAnalysis.confidence > confidenceThreshold;
        const isPriorityHigh = ['urgent', 'high'].includes(requestAnalysis.priority);
        
        return isWorthy && isConfident && isPriorityHigh;
    }
    
    /**
     * Perform intelligent interruption with safety checks
     */
    async performIntelligentInterruption(requestAnalysis) {
        if (!this.currentAbortController) return;
        
        try {
            // Log interruption for analysis
            console.log(`🛑 [INTELLIGENT_INTERRUPT] Interrupting for ${requestAnalysis.priority} priority ${requestAnalysis.type}`);
            
            // Abort current request
            this.currentAbortController.abort();
            this.performanceMetrics.successfulInterruptions++;
            
            // Brief pause to allow cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Adapt interruption strategy based on success
            this.adaptInterruptionStrategy(true);
            
        } catch (error) {
            console.error('❌ [INTELLIGENT_INTERRUPT] Failed to interrupt safely:', error);
            this.performanceMetrics.failedInterruptions++;
            this.adaptInterruptionStrategy(false);
        }
    }
    
    /**
     * Get timeout duration based on request priority
     */
    getTimeoutForPriority(priority) {
        const timeouts = {
            urgent: 15000,    // 15 seconds for urgent
            high: 25000,      // 25 seconds for high priority
            normal: 40000,    // 40 seconds for normal
            low: 60000        // 60 seconds for low priority
        };
        
        return timeouts[priority] || timeouts.normal;
    }
    
    /**
     * Execute request function with timeout
     */
    async executeWithTimeout(requestFunction, timeoutMs, signal) {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Request timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            
            try {
                const result = await requestFunction(signal);
                clearTimeout(timeout);
                resolve(result);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }
    
    /**
     * Update performance metrics and adapt system
     */
    updatePerformanceMetrics(responseTime, requestAnalysis, success) {
        // Update response time tracking
        this.performanceMetrics.recentLatencies.push(responseTime);
        if (this.performanceMetrics.recentLatencies.length > 20) {
            this.performanceMetrics.recentLatencies.shift();
        }
        
        // Calculate average response time
        this.performanceMetrics.avgResponseTime = 
            this.performanceMetrics.recentLatencies.reduce((a, b) => a + b, 0) / 
            this.performanceMetrics.recentLatencies.length;
        
        // Adapt system based on performance
        this.adaptSystemPerformance(responseTime, requestAnalysis, success);
    }
    
    /**
     * Adapt interruption strategy based on success/failure
     */
    adaptInterruptionStrategy(wasSuccessful) {
        const successRate = this.performanceMetrics.successfulInterruptions / 
                          (this.performanceMetrics.successfulInterruptions + this.performanceMetrics.failedInterruptions);
        
        if (successRate > 0.8) {
            // High success rate - can be more aggressive
            this.interruptionConfig.conservativeMode = false;
            Object.keys(this.interruptionConfig.confidenceThresholds).forEach(key => {
                this.interruptionConfig.confidenceThresholds[key] *= 0.95;
            });
        } else if (successRate < 0.6) {
            // Low success rate - be more conservative
            this.interruptionConfig.conservativeMode = true;
            Object.keys(this.interruptionConfig.confidenceThresholds).forEach(key => {
                this.interruptionConfig.confidenceThresholds[key] = Math.min(0.9, 
                    this.interruptionConfig.confidenceThresholds[key] * 1.05);
            });
        }
        
        console.log(`📊 [ADAPTATION] Interruption success rate: ${(successRate * 100).toFixed(1)}%, Conservative mode: ${this.interruptionConfig.conservativeMode}`);
    }
    
    /**
     * Adapt system performance based on metrics
     */
    adaptSystemPerformance(responseTime, requestAnalysis, success) {
        // If response times are consistently high, adjust timeouts
        if (this.performanceMetrics.avgResponseTime > 30000) { // 30 seconds
            console.log('📈 [ADAPTATION] High response times detected, adjusting timeouts');
            // Implementation would adjust timeout strategies
        }
        
        // If certain priority types are consistently slow, adjust classification
        if (requestAnalysis.priority === 'urgent' && responseTime > 20000) {
            console.log('⚠️ [ADAPTATION] Urgent requests taking too long, may need priority adjustment');
        }
    }
    
    /**
     * Update interview phase for contextual adaptation
     */
    updateInterviewPhase(phase) {
        this.interruptionConfig.contextualFactors.interviewPhase = phase;
        
        // Adjust strategy based on phase
        switch (phase) {
            case 'warmup':
                this.interruptionConfig.conservativeMode = true;
                break;
            case 'technical':
                this.interruptionConfig.conservativeMode = false;
                break;
            case 'closing':
                this.interruptionConfig.conservativeMode = true;
                break;
        }
        
        console.log(`🎯 [PHASE_UPDATE] Interview phase: ${phase}, Conservative mode: ${this.interruptionConfig.conservativeMode}`);
    }
    
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        const totalInterruptions = this.performanceMetrics.successfulInterruptions + this.performanceMetrics.failedInterruptions;
        
        return {
            ...this.performanceMetrics,
            interruptionSuccessRate: totalInterruptions > 0 
                ? this.performanceMetrics.successfulInterruptions / totalInterruptions 
                : 0,
            interruptionConfig: this.interruptionConfig,
            sessionDuration: Date.now() - this.sessionStartTime
        };
    }
    
    /**
     * Reset for new interview session
     */
    resetSession() {
        this.sessionStartTime = Date.now();
        this.performanceMetrics = {
            avgResponseTime: 0,
            recentLatencies: [],
            optimalResponseLength: 150,
            successfulInterruptions: 0,
            failedInterruptions: 0,
            totalRequests: 0,
            priorityDistribution: {
                urgent: 0,
                high: 0,
                normal: 0,
                low: 0
            }
        };
        
        // Reset to conservative defaults
        this.interruptionConfig.conservativeMode = true;
        this.updateInterviewPhase('warmup');
        
        console.log('🔄 [SESSION_RESET] Smart Request Manager reset for new interview');
    }
    
    /**
     * Enable/disable intelligent interruption
     */
    setInterruptionEnabled(enabled) {
        this.interruptionConfig.enabled = enabled;
        console.log(`🎯 [INTERRUPTION] ${enabled ? 'Enabled' : 'Disabled'} intelligent interruption system`);
    }
}

// Export singleton instance
const smartRequestManager = new SmartRequestManager();
module.exports = smartRequestManager;