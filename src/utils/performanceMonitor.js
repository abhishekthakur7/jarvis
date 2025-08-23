/**
 * Performance Monitoring and Metrics Dashboard for Technical Interview Optimization
 * 
 * Provides real-time insights and optimization suggestions through:
 * - Unified metrics collection from all optimization systems
 * - Real-time performance dashboards and alerts
 * - Interview analytics and recommendation engine
 * - Historical performance tracking and trend analysis
 */

class PerformanceMonitor {
    constructor() {
        // Metrics collection configuration
        this.metricsConfig = {
            collectionInterval: 1000,      // 1 second collection interval
            retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
            alertThresholds: {
                latency: 5000,              // 5 seconds latency alert
                qualityScore: 0.6,          // Quality score below 60%
                recoveryRate: 0.7,          // Recovery rate below 70%
                interruptionSuccess: 0.8    // Interruption success below 80%
            }
        };
        
        // Unified metrics storage
        this.metrics = {
            timestamp: Date.now(),
            sessionStartTime: Date.now(),
            
            // Latency metrics (from Enhanced Debounce Manager)
            latency: {
                currentDelay: 8000,
                averageDelay: 8000,
                minDelay: 2000,
                maxDelay: 8000,
                totalDecisions: 0,
                recentLatencies: []
            },
            
            // Audio quality metrics (from Audio Quality Assurance)
            audioQuality: {
                totalChunks: 0,
                highQualityChunks: 0,
                lowQualityChunks: 0,
                recoveredChunks: 0,
                droppedChunks: 0,
                avgQualityScore: 0,
                recoverySuccessRate: 0
            },
            
            // Request management metrics (from Smart Request Manager)
            requestManagement: {
                totalRequests: 0,
                urgentRequests: 0,
                highPriorityRequests: 0,
                normalRequests: 0,
                lowPriorityRequests: 0,
                avgResponseTime: 0,
                interruptionSuccessRate: 0,
                failedInterruptions: 0
            },
            
            // Context optimization metrics (from Context Boundary Optimizer)
            contextOptimization: {
                contextBoundariesCreated: 0,
                topicsTracked: 0,
                threadsPreserved: 0,
                relevanceScore: 0,
                avgContextLength: 0,
                currentPhase: 'warmup',
                activeTopicsCount: 0
            },
            
            // Interview-specific metrics
            interview: {
                phase: 'warmup',
                duration: 0,
                questionsAnswered: 0,
                clarificationsRequested: 0,
                technicalTopicsDiscussed: 0,
                overallPerformanceScore: 0
            }
        };
        
        // Performance trends and analysis
        this.trends = {
            latencyTrend: 'stable',         // improving, stable, degrading
            qualityTrend: 'stable',
            requestEfficiencyTrend: 'stable',
            contextRelevanceTrend: 'stable',
            overallTrend: 'stable'
        };
        
        // Real-time alerts
        this.alerts = {
            active: [],
            history: [],
            maxActiveAlerts: 5,
            maxHistoryAlerts: 50
        };
        
        // Performance recommendations
        this.recommendations = {
            current: [],
            applied: [],
            dismissed: []
        };
        
        // Historical tracking
        this.history = {
            snapshots: [],
            maxSnapshots: 1440, // 24 hours of minute snapshots
            trends: new Map()   // Metric name -> trend data
        };
        
        // Collection timer
        this.collectionTimer = null;
        this.isCollecting = false;
        
        console.log('📊 Performance Monitor initialized for technical interview optimization');
    }
    
    /**
     * Start performance monitoring and metrics collection
     */
    startMonitoring() {
        if (this.isCollecting) return;
        
        this.isCollecting = true;
        this.metrics.sessionStartTime = Date.now();
        
        // Start periodic metrics collection
        this.collectionTimer = setInterval(() => {
            this.collectMetrics();
        }, this.metricsConfig.collectionInterval);
        
        console.log('📊 [MONITOR_START] Performance monitoring started');
    }
    
    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        if (!this.isCollecting) return;
        
        this.isCollecting = false;
        
        if (this.collectionTimer) {
            clearInterval(this.collectionTimer);
            this.collectionTimer = null;
        }
        
        // Create final snapshot
        this.createSnapshot();
        
        console.log('📊 [MONITOR_STOP] Performance monitoring stopped');
    }
    
    /**
     * Collect metrics from all optimization systems
     */
    async collectMetrics() {
        try {
            const timestamp = Date.now();
            
            // Collect from Enhanced Debounce Manager
            await this.collectLatencyMetrics();
            
            // Collect from Audio Quality Assurance
            await this.collectAudioQualityMetrics();
            
            // Collect from Smart Request Manager  
            await this.collectRequestManagementMetrics();
            
            // Collect from Context Boundary Optimizer
            await this.collectContextOptimizationMetrics();
            
            // Update interview metrics
            this.updateInterviewMetrics();
            
            // Analyze trends
            this.analyzeTrends();
            
            // Check for alerts
            this.checkAlerts();
            
            // Generate recommendations
            this.generateRecommendations();
            
            // Update timestamp
            this.metrics.timestamp = timestamp;
            
            // Create periodic snapshot
            if (timestamp % (60 * 1000) < this.metricsConfig.collectionInterval) {
                this.createSnapshot();
            }
            
        } catch (error) {
            console.error('📊 [METRICS_ERROR] Error collecting metrics:', error);
        }
    }
    
    /**
     * Collect latency metrics from Enhanced Debounce Manager
     */
    async collectLatencyMetrics() {
        try {
            if (typeof window !== 'undefined' && window.ipcRenderer) {
                const result = await window.ipcRenderer.invoke('get-debounce-performance-metrics');
                if (result.success) {
                    this.metrics.latency = {
                        ...this.metrics.latency,
                        ...result.metrics
                    };
                }
            }
        } catch (error) {
            console.warn('📊 [LATENCY_METRICS] Could not collect latency metrics:', error.message);
        }
    }
    
    /**
     * Collect audio quality metrics
     */
    async collectAudioQualityMetrics() {
        try {
            if (typeof window !== 'undefined' && window.ipcRenderer) {
                const result = await window.ipcRenderer.invoke('get-audio-quality-metrics');
                if (result.success) {
                    this.metrics.audioQuality = {
                        ...this.metrics.audioQuality,
                        ...result.metrics
                    };
                }
            }
        } catch (error) {
            console.warn('📊 [AUDIO_METRICS] Could not collect audio quality metrics:', error.message);
        }
    }
    
    /**
     * Collect request management metrics
     */
    async collectRequestManagementMetrics() {
        try {
            if (typeof window !== 'undefined' && window.ipcRenderer) {
                const result = await window.ipcRenderer.invoke('get-smart-request-metrics');
                if (result.success) {
                    this.metrics.requestManagement = {
                        ...this.metrics.requestManagement,
                        ...result.metrics
                    };
                }
            }
        } catch (error) {
            console.warn('📊 [REQUEST_METRICS] Could not collect request management metrics:', error.message);
        }
    }
    
    /**
     * Collect context optimization metrics
     */
    async collectContextOptimizationMetrics() {
        try {
            if (typeof window !== 'undefined' && window.ipcRenderer) {
                const result = await window.ipcRenderer.invoke('get-context-boundary-metrics');
                if (result.success) {
                    this.metrics.contextOptimization = {
                        ...this.metrics.contextOptimization,
                        ...result.metrics
                    };
                }
            }
        } catch (error) {
            console.warn('📊 [CONTEXT_METRICS] Could not collect context optimization metrics:', error.message);
        }
    }
    
    /**
     * Update interview-specific metrics
     */
    updateInterviewMetrics() {
        const sessionDuration = Date.now() - this.metrics.sessionStartTime;
        
        this.metrics.interview = {
            ...this.metrics.interview,
            duration: sessionDuration,
            phase: this.metrics.contextOptimization.currentPhase || 'warmup',
            questionsAnswered: this.metrics.requestManagement.totalRequests || 0,
            clarificationsRequested: this.metrics.requestManagement.urgentRequests || 0,
            technicalTopicsDiscussed: this.metrics.contextOptimization.topicsTracked || 0
        };
        
        // Calculate overall performance score
        this.metrics.interview.overallPerformanceScore = this.calculateOverallPerformanceScore();
    }
    
    /**
     * Calculate overall performance score (0-1)
     */
    calculateOverallPerformanceScore() {
        let score = 0;
        let components = 0;
        
        // Latency component (30% weight)
        if (this.metrics.latency.averageDelay > 0) {
            const latencyScore = Math.max(0, 1 - (this.metrics.latency.averageDelay - 2000) / 6000);
            score += latencyScore * 0.3;
            components += 0.3;
        }
        
        // Audio quality component (25% weight)
        if (this.metrics.audioQuality.avgQualityScore > 0) {
            score += this.metrics.audioQuality.avgQualityScore * 0.25;
            components += 0.25;
        }
        
        // Request efficiency component (25% weight)
        if (this.metrics.requestManagement.interruptionSuccessRate >= 0) {
            score += this.metrics.requestManagement.interruptionSuccessRate * 0.25;
            components += 0.25;
        }
        
        // Context relevance component (20% weight)
        if (this.metrics.contextOptimization.relevanceScore > 0) {
            score += this.metrics.contextOptimization.relevanceScore * 0.2;
            components += 0.2;
        }
        
        return components > 0 ? score / components : 0.5;
    }
    
    /**
     * Analyze performance trends
     */
    analyzeTrends() {
        // Analyze latency trend
        if (this.metrics.latency.recentLatencies.length >= 5) {
            this.trends.latencyTrend = this.calculateTrend(this.metrics.latency.recentLatencies);
        }
        
        // Analyze quality trend
        const qualityHistory = this.getMetricHistory('audioQuality.avgQualityScore');
        if (qualityHistory.length >= 5) {
            this.trends.qualityTrend = this.calculateTrend(qualityHistory);
        }
        
        // Analyze request efficiency trend
        const efficiencyHistory = this.getMetricHistory('requestManagement.interruptionSuccessRate');
        if (efficiencyHistory.length >= 5) {
            this.trends.requestEfficiencyTrend = this.calculateTrend(efficiencyHistory);
        }
        
        // Analyze context relevance trend
        const relevanceHistory = this.getMetricHistory('contextOptimization.relevanceScore');
        if (relevanceHistory.length >= 5) {
            this.trends.contextRelevanceTrend = this.calculateTrend(relevanceHistory);
        }
        
        // Calculate overall trend
        this.trends.overallTrend = this.calculateOverallTrend();
    }
    
    /**
     * Calculate trend for a series of values
     */
    calculateTrend(values) {
        if (values.length < 3) return 'stable';
        
        const recent = values.slice(-3);
        const older = values.slice(-6, -3);
        
        if (older.length === 0) return 'stable';
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        const change = (recentAvg - olderAvg) / olderAvg;
        
        if (change > 0.05) return 'improving';
        else if (change < -0.05) return 'degrading';
        else return 'stable';
    }
    
    /**
     * Calculate overall trend from component trends
     */
    calculateOverallTrend() {
        const trends = [
            this.trends.latencyTrend,
            this.trends.qualityTrend,
            this.trends.requestEfficiencyTrend,
            this.trends.contextRelevanceTrend
        ];
        
        const improvingCount = trends.filter(t => t === 'improving').length;
        const degradingCount = trends.filter(t => t === 'degrading').length;
        
        if (improvingCount > degradingCount) return 'improving';
        else if (degradingCount > improvingCount) return 'degrading';
        else return 'stable';
    }
    
    /**
     * Get metric history for trend analysis
     */
    getMetricHistory(metricPath) {
        return this.history.snapshots
            .slice(-10) // Last 10 snapshots
            .map(snapshot => this.getNestedValue(snapshot, metricPath))
            .filter(value => value !== undefined && value !== null);
    }
    
    /**
     * Get nested object value by path
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    /**
     * Check for performance alerts
     */
    checkAlerts() {
        const newAlerts = [];
        
        // Latency alerts
        if (this.metrics.latency.averageDelay > this.metricsConfig.alertThresholds.latency) {
            newAlerts.push({
                id: 'high_latency',
                type: 'warning',
                title: 'High Response Latency',
                message: `Average response latency is ${(this.metrics.latency.averageDelay / 1000).toFixed(1)}s`,
                value: this.metrics.latency.averageDelay,
                threshold: this.metricsConfig.alertThresholds.latency,
                timestamp: Date.now()
            });
        }
        
        // Quality alerts
        if (this.metrics.audioQuality.avgQualityScore < this.metricsConfig.alertThresholds.qualityScore) {
            newAlerts.push({
                id: 'low_audio_quality',
                type: 'warning',
                title: 'Low Audio Quality',
                message: `Average audio quality is ${(this.metrics.audioQuality.avgQualityScore * 100).toFixed(1)}%`,
                value: this.metrics.audioQuality.avgQualityScore,
                threshold: this.metricsConfig.alertThresholds.qualityScore,
                timestamp: Date.now()
            });
        }
        
        // Recovery rate alerts
        if (this.metrics.audioQuality.recoverySuccessRate < this.metricsConfig.alertThresholds.recoveryRate) {
            newAlerts.push({
                id: 'low_recovery_rate',
                type: 'info',
                title: 'Low Recovery Success Rate',
                message: `Audio recovery rate is ${(this.metrics.audioQuality.recoverySuccessRate * 100).toFixed(1)}%`,
                value: this.metrics.audioQuality.recoverySuccessRate,
                threshold: this.metricsConfig.alertThresholds.recoveryRate,
                timestamp: Date.now()
            });
        }
        
        // Interruption success alerts
        if (this.metrics.requestManagement.interruptionSuccessRate < this.metricsConfig.alertThresholds.interruptionSuccess) {
            newAlerts.push({
                id: 'low_interruption_success',
                type: 'info',
                title: 'Low Interruption Success Rate',
                message: `Smart interruption rate is ${(this.metrics.requestManagement.interruptionSuccessRate * 100).toFixed(1)}%`,
                value: this.metrics.requestManagement.interruptionSuccessRate,
                threshold: this.metricsConfig.alertThresholds.interruptionSuccess,
                timestamp: Date.now()
            });
        }
        
        // Update alerts
        this.updateAlerts(newAlerts);
    }
    
    /**
     * Update alerts list
     */
    updateAlerts(newAlerts) {
        // Remove resolved alerts
        this.alerts.active = this.alerts.active.filter(alert => {
            const stillActive = newAlerts.some(newAlert => newAlert.id === alert.id);
            if (!stillActive) {
                // Move to history
                this.alerts.history.unshift({
                    ...alert,
                    resolvedAt: Date.now(),
                    status: 'resolved'
                });
            }
            return stillActive;
        });
        
        // Add new alerts
        newAlerts.forEach(newAlert => {
            const existing = this.alerts.active.find(alert => alert.id === newAlert.id);
            if (!existing) {
                this.alerts.active.push(newAlert);
            } else {
                // Update existing alert
                Object.assign(existing, newAlert);
            }
        });
        
        // Maintain limits
        if (this.alerts.active.length > this.metricsConfig.maxActiveAlerts) {
            this.alerts.active = this.alerts.active.slice(0, this.metricsConfig.maxActiveAlerts);
        }
        
        if (this.alerts.history.length > this.metricsConfig.maxHistoryAlerts) {
            this.alerts.history = this.alerts.history.slice(0, this.metricsConfig.maxHistoryAlerts);
        }
    }
    
    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        const newRecommendations = [];
        
        // Latency recommendations
        if (this.metrics.latency.averageDelay > 6000) {
            newRecommendations.push({
                id: 'reduce_latency',
                type: 'optimization',
                priority: 'high',
                title: 'Optimize Response Latency',
                description: 'Consider enabling strict debounce mode for faster responses',
                action: 'enable_strict_debounce',
                impact: 'high',
                effort: 'low'
            });
        }
        
        // Audio quality recommendations
        if (this.metrics.audioQuality.avgQualityScore < 0.7) {
            newRecommendations.push({
                id: 'improve_audio_quality',
                type: 'environment',
                priority: 'medium',
                title: 'Improve Audio Environment',
                description: 'Check microphone placement and reduce background noise',
                action: 'optimize_audio_environment',
                impact: 'medium',
                effort: 'medium'
            });
        }
        
        // Context optimization recommendations
        if (this.metrics.contextOptimization.relevanceScore < 0.6) {
            newRecommendations.push({
                id: 'optimize_context',
                type: 'configuration',
                priority: 'medium',
                title: 'Optimize Context Relevance',
                description: 'Adjust context boundary settings for better relevance',
                action: 'tune_context_boundaries',
                impact: 'medium',
                effort: 'low'
            });
        }
        
        // Update recommendations
        this.updateRecommendations(newRecommendations);
    }
    
    /**
     * Update recommendations list
     */
    updateRecommendations(newRecommendations) {
        // Remove recommendations that are no longer relevant
        this.recommendations.current = this.recommendations.current.filter(rec => {
            return newRecommendations.some(newRec => newRec.id === rec.id);
        });
        
        // Add new recommendations
        newRecommendations.forEach(newRec => {
            const existing = this.recommendations.current.find(rec => rec.id === newRec.id);
            if (!existing) {
                this.recommendations.current.push({
                    ...newRec,
                    createdAt: Date.now(),
                    status: 'active'
                });
            }
        });
    }
    
    /**
     * Create performance snapshot
     */
    createSnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            metrics: JSON.parse(JSON.stringify(this.metrics)),
            trends: { ...this.trends },
            activeAlerts: this.alerts.active.length,
            overallScore: this.metrics.interview.overallPerformanceScore
        };
        
        this.history.snapshots.push(snapshot);
        
        // Maintain snapshot limit
        if (this.history.snapshots.length > this.history.maxSnapshots) {
            this.history.snapshots.shift();
        }
    }
    
    /**
     * Get real-time dashboard data
     */
    getDashboardData() {
        return {
            metrics: this.metrics,
            trends: this.trends,
            alerts: {
                active: this.alerts.active,
                count: this.alerts.active.length
            },
            recommendations: {
                current: this.recommendations.current,
                count: this.recommendations.current.length
            },
            session: {
                duration: Date.now() - this.metrics.sessionStartTime,
                phase: this.metrics.interview.phase,
                overallScore: this.metrics.interview.overallPerformanceScore
            },
            isMonitoring: this.isCollecting
        };
    }
    
    /**
     * Get historical performance data
     */
    getHistoricalData(timeRange = '1h') {
        const now = Date.now();
        let cutoffTime;
        
        switch (timeRange) {
            case '5m':
                cutoffTime = now - (5 * 60 * 1000);
                break;
            case '15m':
                cutoffTime = now - (15 * 60 * 1000);
                break;
            case '1h':
                cutoffTime = now - (60 * 60 * 1000);
                break;
            case '6h':
                cutoffTime = now - (6 * 60 * 60 * 1000);
                break;
            default:
                cutoffTime = now - (60 * 60 * 1000);
        }
        
        const filteredSnapshots = this.history.snapshots.filter(
            snapshot => snapshot.timestamp > cutoffTime
        );
        
        return {
            snapshots: filteredSnapshots,
            timeRange,
            count: filteredSnapshots.length
        };
    }
    
    /**
     * Reset session for new interview
     */
    resetSession() {
        // Stop current monitoring
        this.stopMonitoring();
        
        // Reset metrics
        this.metrics = {
            timestamp: Date.now(),
            sessionStartTime: Date.now(),
            latency: {
                currentDelay: 8000,
                averageDelay: 8000,
                minDelay: 2000,
                maxDelay: 8000,
                totalDecisions: 0,
                recentLatencies: []
            },
            audioQuality: {
                totalChunks: 0,
                highQualityChunks: 0,
                lowQualityChunks: 0,
                recoveredChunks: 0,
                droppedChunks: 0,
                avgQualityScore: 0,
                recoverySuccessRate: 0
            },
            requestManagement: {
                totalRequests: 0,
                urgentRequests: 0,
                highPriorityRequests: 0,
                normalRequests: 0,
                lowPriorityRequests: 0,
                avgResponseTime: 0,
                interruptionSuccessRate: 0,
                failedInterruptions: 0
            },
            contextOptimization: {
                contextBoundariesCreated: 0,
                topicsTracked: 0,
                threadsPreserved: 0,
                relevanceScore: 0,
                avgContextLength: 0,
                currentPhase: 'warmup',
                activeTopicsCount: 0
            },
            interview: {
                phase: 'warmup',
                duration: 0,
                questionsAnswered: 0,
                clarificationsRequested: 0,
                technicalTopicsDiscussed: 0,
                overallPerformanceScore: 0
            }
        };
        
        // Reset trends
        this.trends = {
            latencyTrend: 'stable',
            qualityTrend: 'stable',
            requestEfficiencyTrend: 'stable',
            contextRelevanceTrend: 'stable',
            overallTrend: 'stable'
        };
        
        // Clear active alerts and recommendations
        this.alerts.active = [];
        this.recommendations.current = [];
        
        // Archive current session history
        if (this.history.snapshots.length > 0) {
            const sessionSummary = {
                sessionEnd: Date.now(),
                snapshotCount: this.history.snapshots.length,
                finalScore: this.history.snapshots[this.history.snapshots.length - 1]?.overallScore || 0
            };
            console.log('📊 [SESSION_ARCHIVE] Archived session:', sessionSummary);
        }
        
        // Keep some history but start fresh
        this.history.snapshots = [];
        
        console.log('📊 [MONITOR_RESET] Performance monitor reset for new interview session');
        
        // Restart monitoring
        this.startMonitoring();
    }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();
module.exports = performanceMonitor;