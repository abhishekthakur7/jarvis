/**
 * Teleprompter Testing and Validation Utility
 * Provides tools for testing reading naturalness, information retention,
 * and keyboard navigation efficiency.
 */

export class TeleprompterTester {
    constructor() {
        this.testResults = [];
        this.metricsCollected = {
            readingSpeed: [],
            keyboardEfficiency: [],
            completionAccuracy: [],
            naturalness: []
        };
        this.startTime = null;
        this.testSession = null;
    }

    /**
     * Start a reading naturalness test session
     */
    startReadingNaturalnessTest(testContent) {
        this.testSession = {
            type: 'reading_naturalness',
            content: testContent,
            startTime: Date.now(),
            eyeMovements: 0,
            pauseCount: 0,
            readingSpeed: 0,
            naturalnesScore: 0
        };

        console.log('🧪 Starting Reading Naturalness Test');
        console.log('Content length:', testContent.length, 'characters');
        
        // Monitor eye movement patterns (simulated)
        this._simulateEyeMovementTracking();
        
        return this.testSession;
    }

    /**
     * Test information retention and comprehension
     */
    startInformationRetentionTest(keyPoints) {
        this.testSession = {
            type: 'information_retention',
            keyPoints: keyPoints,
            startTime: Date.now(),
            retainedPoints: 0,
            comprehensionScore: 0,
            readingTime: 0
        };

        console.log('🧠 Starting Information Retention Test');
        console.log('Key points to remember:', keyPoints.length);
        
        return this.testSession;
    }

    /**
     * Test keyboard navigation efficiency
     */
    startKeyboardNavigationTest() {
        this.testSession = {
            type: 'keyboard_navigation',
            startTime: Date.now(),
            shortcuts: [
                'shift+alt+p', // Pause/Resume
                'shift+alt+r', // Restart section
                'shift+alt+s', // Skip to key block
                'shift+alt+c', // Cycle code blocks
                'shift+alt+h', // Highlight concept
                'shift+alt+f'  // Focus mode
            ],
            shortcutTimes: {},
            errors: 0,
            efficiency: 0
        };

        console.log('⌨️ Starting Keyboard Navigation Test');
        console.log('Testing shortcuts:', this.testSession.shortcuts.join(', '));
        
        // Set up keyboard event monitoring
        this._setupKeyboardMonitoring();
        
        return this.testSession;
    }

    /**
     * Simulate technical interview scenario
     */
    startTechnicalInterviewSimulation(scenario) {
        this.testSession = {
            type: 'technical_interview',
            scenario: scenario,
            startTime: Date.now(),
            questionsAsked: 0,
            correctAnswers: 0,
            averageResponseTime: 0,
            discretenessScore: 0,
            overallPerformance: 0
        };

        console.log('🎯 Starting Technical Interview Simulation');
        console.log('Scenario:', scenario);
        
        return this.testSession;
    }

    /**
     * Record reading speed metric
     */
    recordReadingSpeed(wordsPerMinute) {
        this.metricsCollected.readingSpeed.push({
            timestamp: Date.now(),
            wpm: wordsPerMinute,
            mode: this._getCurrentTeleprompterMode()
        });
        
        console.log(`📊 Reading speed recorded: ${wordsPerMinute} WPM`);
    }

    /**
     * Record keyboard shortcut usage
     */
    recordShortcutUsage(shortcut, responseTime) {
        if (this.testSession && this.testSession.type === 'keyboard_navigation') {
            this.testSession.shortcutTimes[shortcut] = responseTime;
            
            // Calculate efficiency (lower is better)
            const efficiency = responseTime < 1000 ? 'excellent' : 
                              responseTime < 2000 ? 'good' : 'needs_improvement';
            
            console.log(`⌨️ Shortcut ${shortcut}: ${responseTime}ms (${efficiency})`);
        }
    }

    /**
     * Record completion accuracy
     */
    recordCompletionAccuracy(expectedBoundaries, detectedBoundaries) {
        const accuracy = this._calculateAccuracy(expectedBoundaries, detectedBoundaries);
        
        this.metricsCollected.completionAccuracy.push({
            timestamp: Date.now(),
            accuracy: accuracy,
            expected: expectedBoundaries.length,
            detected: detectedBoundaries.length
        });
        
        console.log(`✅ Completion accuracy: ${accuracy.toFixed(2)}%`);
    }

    /**
     * Assess reading naturalness
     */
    assessReadingNaturalness(observedBehaviors) {
        let naturalnessScore = 100;
        
        // Deduct points for unnatural behaviors
        if (observedBehaviors.obviousScreenReading) naturalnessScore -= 30;
        if (observedBehaviors.excessiveEyeMovement) naturalnessScore -= 20;
        if (observedBehaviors.unnaturalPauses) naturalnessScore -= 15;
        if (observedBehaviors.inconsistentPacing) naturalnessScore -= 10;
        
        this.metricsCollected.naturalness.push({
            timestamp: Date.now(),
            score: Math.max(0, naturalnessScore),
            behaviors: observedBehaviors
        });
        
        console.log(`🎭 Naturalness score: ${naturalnessScore}/100`);
        return naturalnessScore;
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const report = {
            timestamp: Date.now(),
            testSessions: this.testResults,
            metrics: {
                averageReadingSpeed: this._calculateAverage(this.metricsCollected.readingSpeed, 'wpm'),
                keyboardEfficiency: this._calculateKeyboardEfficiency(),
                completionAccuracy: this._calculateAverage(this.metricsCollected.completionAccuracy, 'accuracy'),
                naturalnessScore: this._calculateAverage(this.metricsCollected.naturalness, 'score')
            },
            recommendations: this._generateRecommendations()
        };

        console.log('📋 Test Report Generated:');
        console.log('Average Reading Speed:', report.metrics.averageReadingSpeed, 'WPM');
        console.log('Keyboard Efficiency:', report.metrics.keyboardEfficiency);
        console.log('Completion Accuracy:', report.metrics.completionAccuracy.toFixed(2) + '%');
        console.log('Naturalness Score:', report.metrics.naturalnessScore.toFixed(2) + '/100');
        
        return report;
    }

    /**
     * End current test session
     */
    endTestSession() {
        if (this.testSession) {
            this.testSession.endTime = Date.now();
            this.testSession.duration = this.testSession.endTime - this.testSession.startTime;
            
            this.testResults.push({ ...this.testSession });
            console.log(`✅ Test session completed: ${this.testSession.type} (${this.testSession.duration}ms)`);
            
            const result = { ...this.testSession };
            this.testSession = null;
            return result;
        }
    }

    // Private helper methods
    
    _simulateEyeMovementTracking() {
        // Simulate eye movement tracking for testing purposes
        const interval = setInterval(() => {
            if (this.testSession && this.testSession.type === 'reading_naturalness') {
                this.testSession.eyeMovements += Math.floor(Math.random() * 3) + 1;
            } else {
                clearInterval(interval);
            }
        }, 1000);
    }

    _setupKeyboardMonitoring() {
        const keyboardHandler = (event) => {
            if (this.testSession && this.testSession.type === 'keyboard_navigation') {
                const shortcut = this._getShortcutString(event);
                const responseTime = Date.now() - this._shortcutStartTime;
                
                if (this.testSession.shortcuts.includes(shortcut)) {
                    this.recordShortcutUsage(shortcut, responseTime);
                }
            }
        };
        
        document.addEventListener('keydown', keyboardHandler);
        
        // Store start time for response measurement
        this._shortcutStartTime = Date.now();
    }

    _getShortcutString(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        if (event.metaKey) parts.push('meta');
        parts.push(event.key.toLowerCase());
        return parts.join('+');
    }

    _getCurrentTeleprompterMode() {
        return localStorage.getItem('teleprompterMode') || 'balanced';
    }

    _calculateAccuracy(expected, detected) {
        const intersection = expected.filter(item => detected.includes(item));
        return (intersection.length / expected.length) * 100;
    }

    _calculateAverage(array, property) {
        if (array.length === 0) return 0;
        const sum = array.reduce((acc, item) => acc + item[property], 0);
        return sum / array.length;
    }

    _calculateKeyboardEfficiency() {
        const shortcuts = this.testSession?.shortcutTimes || {};
        const times = Object.values(shortcuts);
        
        if (times.length === 0) return 'No data';
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        
        if (avgTime < 1000) return 'Excellent';
        if (avgTime < 2000) return 'Good';
        return 'Needs Improvement';
    }

    _generateRecommendations() {
        const recommendations = [];
        
        // Reading speed recommendations
        const avgSpeed = this._calculateAverage(this.metricsCollected.readingSpeed, 'wpm');
        if (avgSpeed < 150) {
            recommendations.push('Consider increasing font size or improving content hierarchy for faster reading');
        }
        
        // Naturalness recommendations
        const avgNaturalness = this._calculateAverage(this.metricsCollected.naturalness, 'score');
        if (avgNaturalness < 70) {
            recommendations.push('Focus on reducing obvious screen-reading behaviors and improving natural flow');
        }
        
        // Accuracy recommendations
        const avgAccuracy = this._calculateAverage(this.metricsCollected.completionAccuracy, 'accuracy');
        if (avgAccuracy < 85) {
            recommendations.push('Improve response boundary detection and completion signaling');
        }
        
        return recommendations;
    }
}

// Export singleton instance
export const teleprompterTester = new TeleprompterTester();

// Usage examples and test scenarios
export const testScenarios = {
    technicalInterview: {
        coding: 'Live coding interview with algorithm questions',
        systemDesign: 'System design discussion with architecture diagrams',
        behavioral: 'Behavioral questions with STAR method responses'
    },
    
    readingContent: {
        simple: 'Basic technical explanation with code examples',
        complex: 'Advanced system architecture with multiple diagrams',
        mixed: 'Interview response mixing code, explanations, and examples'
    },
    
    keyboardShortcuts: [
        { shortcut: 'shift+alt+p', description: 'Pause/Resume reading' },
        { shortcut: 'shift+alt+r', description: 'Restart current section' },
        { shortcut: 'shift+alt+s', description: 'Skip to next key block' },
        { shortcut: 'shift+alt+c', description: 'Cycle through code blocks' },
        { shortcut: 'shift+alt+h', description: 'Highlight next key concept' },
        { shortcut: 'shift+alt+f', description: 'Toggle focus mode' }
    ]
};