/**
 * Performance Monitor and Error Handling System
 * Comprehensive monitoring for hybrid VAD strategy performance
 * Tracks reliability, latency, error rates, and system health
 */

class PerformanceMonitor {
    constructor(config = {}) {
        this.config = {
            maxHistorySize: 1000,
            alertThresholds: {
                errorRate: 0.1, // 10% error rate threshold
                avgLatency: 500, // 500ms average latency threshold
                confidenceScore: 0.6, // Minimum confidence threshold
                memoryUsage: 100 * 1024 * 1024 // 100MB memory threshold
            },
            reportingInterval: 60000, // 1 minute reporting interval
            ...config
        };
        
        this.metrics = {
            // Processing metrics
            totalProcessed: 0,
            successfulProcessed: 0,
            failedProcessed: 0,
            
            // Method usage tracking
            enhancedChunkingUsed: 0,
            aiFallbackUsed: 0,
            heuristicFallbackUsed: 0,
            
            // Timing metrics
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            maxProcessingTime: 0,
            minProcessingTime: Infinity,
            
            // Confidence tracking
            totalConfidence: 0,
            averageConfidence: 0,
            confidenceDistribution: {
                high: 0,    // > 0.8
                medium: 0,  // 0.5 - 0.8
                low: 0      // < 0.5
            },
            
            // Context management
            contextWindowHits: 0,
            contextTruncations: 0,
            averageContextLength: 0,
            
            // Error tracking
            errors: [],
            errorsByType: {},
            
            // Memory and resource usage
            memoryUsage: 0,
            peakMemoryUsage: 0
        };
        
        this.history = [];
        this.alerts = [];
        this.startTime = Date.now();
        this.lastReportTime = Date.now();
        
        // Start periodic reporting
        this.reportingTimer = setInterval(() => {
            this.generatePeriodicReport();
        }, this.config.reportingInterval);
        
        // Memory monitoring
        this.memoryTimer = setInterval(() => {
            this.updateMemoryUsage();
        }, 10000); // Check every 10 seconds
    }

    /**
     * Record a processing event
     */
    recordProcessing(event) {
        const timestamp = Date.now();
        const processingTime = event.processingTime || 0;
        
        // Update basic metrics
        this.metrics.totalProcessed++;
        
        if (event.success) {
            this.metrics.successfulProcessed++;
        } else {
            this.metrics.failedProcessed++;
            this.recordError(event.error || new Error('Processing failed'), event);
        }
        
        // Update method usage
        switch (event.method) {
            case 'enhanced_chunking':
                this.metrics.enhancedChunkingUsed++;
                break;
            case 'ai_semantic_continuity':
                this.metrics.aiFallbackUsed++;
                break;
            case 'heuristic_fallback':
                this.metrics.heuristicFallbackUsed++;
                break;
        }
        
        // Update timing metrics
        this.metrics.totalProcessingTime += processingTime;
        this.metrics.averageProcessingTime = 
            this.metrics.totalProcessingTime / this.metrics.totalProcessed;
        this.metrics.maxProcessingTime = Math.max(this.metrics.maxProcessingTime, processingTime);
        this.metrics.minProcessingTime = Math.min(this.metrics.minProcessingTime, processingTime);
        
        // Update confidence metrics
        if (event.confidence !== undefined) {
            this.metrics.totalConfidence += event.confidence;
            this.metrics.averageConfidence = 
                this.metrics.totalConfidence / this.metrics.totalProcessed;
            
            // Update confidence distribution
            if (event.confidence > 0.8) {
                this.metrics.confidenceDistribution.high++;
            } else if (event.confidence >= 0.5) {
                this.metrics.confidenceDistribution.medium++;
            } else {
                this.metrics.confidenceDistribution.low++;
            }
        }
        
        // Update context metrics
        if (event.contextLength !== undefined) {
            this.metrics.averageContextLength = 
                ((this.metrics.averageContextLength * (this.metrics.totalProcessed - 1)) + 
                 event.contextLength) / this.metrics.totalProcessed;
        }
        
        if (event.contextTruncated) {
            this.metrics.contextTruncations++;
        }
        
        if (event.contextWindowHit) {
            this.metrics.contextWindowHits++;
        }
        
        // Store in history
        const historyEntry = {
            timestamp,
            ...event,
            processingTime
        };
        
        this.history.push(historyEntry);
        
        // Maintain history size
        if (this.history.length > this.config.maxHistorySize) {
            this.history.shift();
        }
        
        // Check for alerts
        this.checkAlerts();
    }

    /**
     * Record an error with context
     */
    recordError(error, context = {}) {
        const errorEntry = {
            timestamp: Date.now(),
            message: error.message || 'Unknown error',
            stack: error.stack,
            type: error.constructor.name,
            context: {
                method: context.method,
                chunkLength: context.chunkLength,
                contextLength: context.contextLength,
                confidence: context.confidence
            }
        };
        
        this.metrics.errors.push(errorEntry);
        
        // Update error type tracking
        const errorType = errorEntry.type;
        this.metrics.errorsByType[errorType] = 
            (this.metrics.errorsByType[errorType] || 0) + 1;
        
        // Keep only recent errors
        if (this.metrics.errors.length > 100) {
            this.metrics.errors.shift();
        }
        
        console.error('[PERFORMANCE_MONITOR] Error recorded:', errorEntry);
    }

    /**
     * Check for performance alerts
     */
    checkAlerts() {
        const now = Date.now();
        const recentWindow = 5 * 60 * 1000; // 5 minutes
        const recentEvents = this.history.filter(event => 
            now - event.timestamp < recentWindow
        );
        
        if (recentEvents.length === 0) return;
        
        // Check error rate
        const recentErrors = recentEvents.filter(event => !event.success).length;
        const errorRate = recentErrors / recentEvents.length;
        
        if (errorRate > this.config.alertThresholds.errorRate) {
            this.createAlert('HIGH_ERROR_RATE', {
                errorRate: (errorRate * 100).toFixed(1) + '%',
                threshold: (this.config.alertThresholds.errorRate * 100).toFixed(1) + '%',
                recentErrors,
                totalEvents: recentEvents.length
            });
        }
        
        // Check average latency
        const recentLatencies = recentEvents
            .filter(event => event.processingTime)
            .map(event => event.processingTime);
        
        if (recentLatencies.length > 0) {
            const avgLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
            
            if (avgLatency > this.config.alertThresholds.avgLatency) {
                this.createAlert('HIGH_LATENCY', {
                    averageLatency: avgLatency.toFixed(2) + 'ms',
                    threshold: this.config.alertThresholds.avgLatency + 'ms',
                    maxLatency: Math.max(...recentLatencies).toFixed(2) + 'ms'
                });
            }
        }
        
        // Check confidence scores
        const recentConfidences = recentEvents
            .filter(event => event.confidence !== undefined)
            .map(event => event.confidence);
        
        if (recentConfidences.length > 0) {
            const avgConfidence = recentConfidences.reduce((a, b) => a + b, 0) / recentConfidences.length;
            
            if (avgConfidence < this.config.alertThresholds.confidenceScore) {
                this.createAlert('LOW_CONFIDENCE', {
                    averageConfidence: avgConfidence.toFixed(3),
                    threshold: this.config.alertThresholds.confidenceScore,
                    lowConfidenceCount: recentConfidences.filter(c => c < 0.5).length
                });
            }
        }
        
        // Check memory usage
        if (this.metrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
            this.createAlert('HIGH_MEMORY_USAGE', {
                currentUsage: this.formatBytes(this.metrics.memoryUsage),
                threshold: this.formatBytes(this.config.alertThresholds.memoryUsage),
                peakUsage: this.formatBytes(this.metrics.peakMemoryUsage)
            });
        }
    }

    /**
     * Create an alert
     */
    createAlert(type, data) {
        const alert = {
            type,
            timestamp: Date.now(),
            data,
            id: `${type}_${Date.now()}`
        };
        
        // Avoid duplicate alerts within 5 minutes
        const recentAlerts = this.alerts.filter(a => 
            a.type === type && Date.now() - a.timestamp < 5 * 60 * 1000
        );
        
        if (recentAlerts.length === 0) {
            this.alerts.push(alert);
            console.warn(`[PERFORMANCE_ALERT] ${type}:`, data);
            
            // Keep only recent alerts
            if (this.alerts.length > 50) {
                this.alerts.shift();
            }
        }
    }

    /**
     * Update memory usage metrics
     */
    updateMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            this.metrics.memoryUsage = usage.heapUsed;
            this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, usage.heapUsed);
        }
    }

    /**
     * Generate periodic performance report
     */
    generatePeriodicReport() {
        const now = Date.now();
        const timeSinceLastReport = now - this.lastReportTime;
        const uptime = now - this.startTime;
        
        const report = {
            timestamp: now,
            uptime: this.formatDuration(uptime),
            period: this.formatDuration(timeSinceLastReport),
            
            // Processing stats
            totalProcessed: this.metrics.totalProcessed,
            successRate: this.getSuccessRate(),
            errorRate: this.getErrorRate(),
            
            // Performance stats
            averageLatency: this.metrics.averageProcessingTime.toFixed(2) + 'ms',
            maxLatency: this.metrics.maxProcessingTime.toFixed(2) + 'ms',
            averageConfidence: this.metrics.averageConfidence.toFixed(3),
            
            // Method distribution
            methodUsage: {
                enhancedChunking: this.metrics.enhancedChunkingUsed,
                aiFallback: this.metrics.aiFallbackUsed,
                heuristicFallback: this.metrics.heuristicFallbackUsed
            },
            
            // Resource usage
            memoryUsage: this.formatBytes(this.metrics.memoryUsage),
            peakMemoryUsage: this.formatBytes(this.metrics.peakMemoryUsage),
            
            // Recent alerts
            recentAlerts: this.alerts.filter(a => now - a.timestamp < timeSinceLastReport).length
        };
        
        console.log('[PERFORMANCE_REPORT]', report);
        this.lastReportTime = now;
        
        return report;
    }

    /**
     * Get comprehensive performance summary
     */
    getPerformanceSummary() {
        const uptime = Date.now() - this.startTime;
        
        return {
            // System info
            uptime: this.formatDuration(uptime),
            startTime: new Date(this.startTime).toISOString(),
            
            // Processing metrics
            totalProcessed: this.metrics.totalProcessed,
            successfulProcessed: this.metrics.successfulProcessed,
            failedProcessed: this.metrics.failedProcessed,
            successRate: this.getSuccessRate(),
            errorRate: this.getErrorRate(),
            
            // Performance metrics
            averageProcessingTime: this.metrics.averageProcessingTime.toFixed(2) + 'ms',
            maxProcessingTime: this.metrics.maxProcessingTime.toFixed(2) + 'ms',
            minProcessingTime: this.metrics.minProcessingTime === Infinity ? '0ms' : 
                              this.metrics.minProcessingTime.toFixed(2) + 'ms',
            
            // Confidence metrics
            averageConfidence: this.metrics.averageConfidence.toFixed(3),
            confidenceDistribution: {
                high: `${this.metrics.confidenceDistribution.high} (${this.getPercentage(this.metrics.confidenceDistribution.high)}%)`,
                medium: `${this.metrics.confidenceDistribution.medium} (${this.getPercentage(this.metrics.confidenceDistribution.medium)}%)`,
                low: `${this.metrics.confidenceDistribution.low} (${this.getPercentage(this.metrics.confidenceDistribution.low)}%)`
            },
            
            // Method usage
            methodUsage: {
                enhancedChunking: `${this.metrics.enhancedChunkingUsed} (${this.getPercentage(this.metrics.enhancedChunkingUsed)}%)`,
                aiFallback: `${this.metrics.aiFallbackUsed} (${this.getPercentage(this.metrics.aiFallbackUsed)}%)`,
                heuristicFallback: `${this.metrics.heuristicFallbackUsed} (${this.getPercentage(this.metrics.heuristicFallbackUsed)}%)`
            },
            
            // Context metrics
            averageContextLength: this.metrics.averageContextLength.toFixed(0) + ' chars',
            contextTruncations: this.metrics.contextTruncations,
            contextWindowHits: this.metrics.contextWindowHits,
            
            // Resource usage
            currentMemoryUsage: this.formatBytes(this.metrics.memoryUsage),
            peakMemoryUsage: this.formatBytes(this.metrics.peakMemoryUsage),
            
            // Error summary
            totalErrors: this.metrics.errors.length,
            errorsByType: this.metrics.errorsByType,
            recentErrors: this.metrics.errors.filter(e => 
                Date.now() - e.timestamp < 60000
            ).length,
            
            // Alert summary
            totalAlerts: this.alerts.length,
            recentAlerts: this.alerts.filter(a => 
                Date.now() - a.timestamp < 60000
            ).length
        };
    }

    /**
     * Helper methods
     */
    getSuccessRate() {
        if (this.metrics.totalProcessed === 0) return '0%';
        return (this.metrics.successfulProcessed / this.metrics.totalProcessed * 100).toFixed(1) + '%';
    }

    getErrorRate() {
        if (this.metrics.totalProcessed === 0) return '0%';
        return (this.metrics.failedProcessed / this.metrics.totalProcessed * 100).toFixed(1) + '%';
    }

    getPercentage(value) {
        if (this.metrics.totalProcessed === 0) return '0';
        return (value / this.metrics.totalProcessed * 100).toFixed(1);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Reset all metrics and history
     */
    reset() {
        this.metrics = {
            totalProcessed: 0,
            successfulProcessed: 0,
            failedProcessed: 0,
            enhancedChunkingUsed: 0,
            aiFallbackUsed: 0,
            heuristicFallbackUsed: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            maxProcessingTime: 0,
            minProcessingTime: Infinity,
            totalConfidence: 0,
            averageConfidence: 0,
            confidenceDistribution: { high: 0, medium: 0, low: 0 },
            contextWindowHits: 0,
            contextTruncations: 0,
            averageContextLength: 0,
            errors: [],
            errorsByType: {},
            memoryUsage: 0,
            peakMemoryUsage: 0
        };
        
        this.history = [];
        this.alerts = [];
        this.startTime = Date.now();
        this.lastReportTime = Date.now();
    }

    /**
     * Cleanup and stop monitoring
     */
    destroy() {
        if (this.reportingTimer) {
            clearInterval(this.reportingTimer);
        }
        if (this.memoryTimer) {
            clearInterval(this.memoryTimer);
        }
    }
}

/**
 * Error Handler for VAD Processing
 */
class VadErrorHandler {
    constructor(performanceMonitor) {
        this.monitor = performanceMonitor;
        this.errorStrategies = new Map();
        
        // Register default error handling strategies
        this.registerErrorStrategy('TimeoutError', this.handleTimeoutError.bind(this));
        this.registerErrorStrategy('ApiError', this.handleApiError.bind(this));
        this.registerErrorStrategy('ValidationError', this.handleValidationError.bind(this));
        this.registerErrorStrategy('MemoryError', this.handleMemoryError.bind(this));
    }

    /**
     * Register custom error handling strategy
     */
    registerErrorStrategy(errorType, handler) {
        this.errorStrategies.set(errorType, handler);
    }

    /**
     * Handle error with appropriate strategy
     */
    async handleError(error, context = {}) {
        const errorType = error.constructor.name;
        const strategy = this.errorStrategies.get(errorType) || this.handleGenericError.bind(this);
        
        try {
            const result = await strategy(error, context);
            
            // Record error in performance monitor
            if (this.monitor) {
                this.monitor.recordError(error, context);
            }
            
            return result;
        } catch (handlingError) {
            console.error('[VAD_ERROR_HANDLER] Error handling failed:', handlingError);
            return this.getFallbackResult(context);
        }
    }

    /**
     * Handle timeout errors
     */
    async handleTimeoutError(error, context) {
        console.warn('[VAD_ERROR_HANDLER] Timeout detected, using fast fallback');
        
        return {
            shouldProcess: true, // Conservative: process on timeout
            confidence: 0.4,
            method: 'timeout_fallback',
            reasons: ['timeout_error'],
            error: error.message
        };
    }

    /**
     * Handle API errors
     */
    async handleApiError(error, context) {
        console.warn('[VAD_ERROR_HANDLER] API error, using heuristic fallback');
        
        // Use simple heuristics when API fails
        const text = context.currentChunk || '';
        const shouldProcess = text.includes('?') || text.length > 100;
        
        return {
            shouldProcess,
            confidence: 0.5,
            method: 'api_error_fallback',
            reasons: ['api_error', shouldProcess ? 'question_detected' : 'insufficient_content'],
            error: error.message
        };
    }

    /**
     * Handle validation errors
     */
    async handleValidationError(error, context) {
        console.warn('[VAD_ERROR_HANDLER] Validation error, using safe defaults');
        
        return {
            shouldProcess: false, // Conservative: don't process invalid input
            confidence: 0.3,
            method: 'validation_error_fallback',
            reasons: ['validation_error'],
            error: error.message
        };
    }

    /**
     * Handle memory errors
     */
    async handleMemoryError(error, context) {
        console.error('[VAD_ERROR_HANDLER] Memory error detected, clearing caches');
        
        // Trigger garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        return {
            shouldProcess: true,
            confidence: 0.6,
            method: 'memory_error_fallback',
            reasons: ['memory_error', 'cache_cleared'],
            error: error.message
        };
    }

    /**
     * Handle generic errors
     */
    async handleGenericError(error, context) {
        console.error('[VAD_ERROR_HANDLER] Generic error:', error);
        
        return this.getFallbackResult(context);
    }

    /**
     * Get safe fallback result
     */
    getFallbackResult(context) {
        return {
            shouldProcess: true, // When in doubt, process
            confidence: 0.5,
            method: 'generic_fallback',
            reasons: ['error_fallback'],
            error: 'Fallback due to error'
        };
    }
}

module.exports = {
    PerformanceMonitor,
    VadErrorHandler
};