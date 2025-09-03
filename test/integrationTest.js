/**
 * Integration Test for Hybrid VAD Strategy with Gemini.js
 * Tests the complete pipeline from transcription to AI processing
 */

const path = require('path');
const fs = require('fs');

// Load required modules
let HybridVadStrategy, VadIntegration, PerformanceMonitor;

try {
    const hybridVadPath = path.join(__dirname, '..', 'src', 'utils', 'hybridVadStrategy.js');
    const vadIntegrationPath = path.join(__dirname, '..', 'src', 'utils', 'vadIntegration.js');
    const performanceMonitorPath = path.join(__dirname, '..', 'src', 'utils', 'performanceMonitor.js');
    
    HybridVadStrategy = require(hybridVadPath).HybridVadStrategy;
    VadIntegration = require(vadIntegrationPath).VadIntegration;
    PerformanceMonitor = require(performanceMonitorPath).PerformanceMonitor;
    
    if (process.env.DEBUG_APP === 'true') {
        console.log('✅ All modules loaded successfully');
    }
} catch (error) {
    if (process.env.DEBUG_APP === 'true') {
        console.error('❌ Error loading modules:', error.message);
    }
    process.exit(1);
}

// Mock Gemini session for testing
const mockGeminiSession = {
    sendMessage: async (prompt) => {
        // Simulate realistic AI processing delay
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        if (prompt.includes('system design')) {
            return {
                response: {
                    text: () => 'Great question about system design! Let me explain the key concepts of microservices architecture...'
                }
            };
        } else if (prompt.includes('algorithm')) {
            return {
                response: {
                    text: () => 'For this algorithm problem, I would recommend using a hash map approach...'
                }
            };
        } else if (prompt.includes('behavioral')) {
            return {
                response: {
                    text: () => 'That\'s an excellent behavioral question. Here\'s how I would approach that situation...'
                }
            };
        }
        
        return {
            response: {
                text: () => 'Thank you for your question. Let me provide a comprehensive answer...'
            }
        };
    }
};

// Mock onmessage function that would normally be in gemini.js
function createMockOnMessage(vadIntegration) {
    return async function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcription') {
            if (process.env.DEBUG_APP === 'true') {
                console.log(`📝 Received transcription: "${data.text}"`);
            }
            
            // Process through VAD integration
            const result = await vadIntegration.processTranscriptionChunk({
                text: data.text,
                timestamp: data.timestamp || Date.now(),
                confidence: data.confidence || 0.9,
                isFinal: data.isFinal !== false
            });
            
            if (process.env.DEBUG_APP === 'true') {
                if (result.processed) {
                    console.log(`🚀 Processed and sent to Gemini: confidence=${result.confidence.toFixed(3)}, method=${result.method}`);
                    console.log(`💬 AI Response: ${result.aiResponse.substring(0, 100)}...`);
                } else {
                    console.log(`⏳ Not processed: ${result.reason}`);
                }
            }
            
            return result;
        }
    };
}

// Simulate realistic interview transcription chunks
const interviewSimulation = [
    {
        text: 'Hello, thank you for joining us today.',
        timestamp: Date.now(),
        isFinal: true,
        expectedProcessed: true,
        description: 'Opening greeting'
    },
    {
        text: 'Can you tell me about your experience with',
        timestamp: Date.now() + 1000,
        isFinal: false,
        expectedProcessed: false,
        description: 'Incomplete question start'
    },
    {
        text: 'Can you tell me about your experience with system design?',
        timestamp: Date.now() + 2000,
        isFinal: true,
        expectedProcessed: true,
        description: 'Complete system design question'
    },
    {
        text: 'Um, so I was wondering...',
        timestamp: Date.now() + 3000,
        isFinal: true,
        expectedProcessed: false,
        description: 'Hesitation with incomplete thought'
    },
    {
        text: 'What is the difference between SQL and NoSQL databases?',
        timestamp: Date.now() + 5000,
        isFinal: true,
        expectedProcessed: true,
        description: 'Direct technical question'
    },
    {
        text: 'And also, how would you handle',
        timestamp: Date.now() + 6000,
        isFinal: false,
        expectedProcessed: false,
        description: 'Continuation phrase, incomplete'
    },
    {
        text: 'And also, how would you handle database scaling in a microservices architecture?',
        timestamp: Date.now() + 7000,
        isFinal: true,
        expectedProcessed: true,
        description: 'Multi-part technical question'
    },
    {
        text: 'Tell me about a time when you had to work with a difficult team member.',
        timestamp: Date.now() + 10000,
        isFinal: true,
        expectedProcessed: true,
        description: 'Behavioral interview question'
    },
    {
        text: 'What... um... what is your approach to',
        timestamp: Date.now() + 12000,
        isFinal: false,
        expectedProcessed: false,
        description: 'Question with hesitation, incomplete'
    },
    {
        text: 'What is your approach to debugging complex issues in production?',
        timestamp: Date.now() + 13000,
        isFinal: true,
        expectedProcessed: true,
        description: 'Complete debugging question'
    }
];

async function runIntegrationTest() {
    if (process.env.DEBUG_APP === 'true') {
        console.log('🚀 Starting Hybrid VAD Integration Test\n');
        console.log('=' .repeat(80));
    }
    
    // Initialize components
    const performanceMonitor = new PerformanceMonitor();
    const vadIntegration = new VadIntegration({
        geminiSession: mockGeminiSession,
        performanceMonitor: performanceMonitor,
        enableAiFallback: true
    });
    
    const mockOnMessage = createMockOnMessage(vadIntegration);
    
    if (process.env.DEBUG_APP === 'true') {
        console.log('✅ Integration components initialized\n');
    }
    
    let correctPredictions = 0;
    let totalTests = interviewSimulation.length;
    let processedCount = 0;
    let notProcessedCount = 0;
    
    if (process.env.DEBUG_APP === 'true') {
        console.log('📋 Running Interview Simulation');
        console.log('─'.repeat(80));
    }
    
    for (let i = 0; i < interviewSimulation.length; i++) {
        const chunk = interviewSimulation[i];
        if (process.env.DEBUG_APP === 'true') {
            console.log(`\n${i + 1}. ${chunk.description}`);
            console.log(`   Input: "${chunk.text}"`);
            console.log(`   Expected: ${chunk.expectedProcessed ? 'PROCESS' : 'SKIP'}`);
        }
        
        try {
            // Simulate the message event
            const mockEvent = {
                data: JSON.stringify({
                    type: 'transcription',
                    text: chunk.text,
                    timestamp: chunk.timestamp,
                    isFinal: chunk.isFinal,
                    confidence: 0.9
                })
            };
            
            const startTime = Date.now();
            const result = await mockOnMessage(mockEvent);
            const processingTime = Date.now() - startTime;
            
            const actualProcessed = result && result.processed;
            const isCorrect = actualProcessed === chunk.expectedProcessed;
            
            if (actualProcessed) {
                processedCount++;
            } else {
                notProcessedCount++;
            }
            
            if (isCorrect) {
                correctPredictions++;
                if (process.env.DEBUG_APP === 'true') {
                    console.log(`   ✅ CORRECT (${processingTime}ms)`);
                }
            } else {
                if (process.env.DEBUG_APP === 'true') {
                    console.log(`   ❌ INCORRECT - Expected: ${chunk.expectedProcessed}, Got: ${actualProcessed} (${processingTime}ms)`);
                }
            }
            
            // Add small delay to simulate real-time processing
            await new Promise(resolve => setTimeout(resolve, 50));
            
        } catch (error) {
            if (process.env.DEBUG_APP === 'true') {
                console.log(`   ❌ ERROR: ${error.message}`);
            }
        }
    }
    
    // Performance analysis
    if (process.env.DEBUG_APP === 'true') {
        console.log('\n' + '=' .repeat(80));
        console.log('📊 PERFORMANCE ANALYSIS');
        console.log('=' .repeat(80));
    }
    
    const performanceReport = performanceMonitor.getPerformanceSummary();
    if (process.env.DEBUG_APP === 'true') {
        console.log(`Total Processing Calls: ${performanceReport.totalProcessed}`);
        console.log(`Successful Processes: ${performanceReport.successfulProcesses}`);
        console.log(`Failed Processes: ${performanceReport.failedProcesses}`);
        console.log(`Success Rate: ${performanceReport.successRate}%`);
        console.log(`Average Processing Time: ${performanceReport.averageProcessingTime}ms`);
        console.log(`Enhanced Chunking Usage: ${performanceReport.enhancedChunkingUsage}%`);
        console.log(`AI Fallback Usage: ${performanceReport.aiFallbackUsage}%`);
    }
    
    // Context management analysis
    if (process.env.DEBUG_APP === 'true') {
        console.log('\n📋 Context Management:');
        console.log(`Context Window Hits: ${performanceReport.contextWindowHits}`);
        console.log(`Context Truncations: ${performanceReport.contextTruncations}`);
        console.log(`Average Context Length: ${performanceReport.averageContextLength} chars`);
    }
    
    // Final summary
    if (process.env.DEBUG_APP === 'true') {
        console.log('\n' + '=' .repeat(80));
        console.log('🎯 INTEGRATION TEST SUMMARY');
        console.log('=' .repeat(80));
        console.log(`Total Test Cases: ${totalTests}`);
        console.log(`Correct Predictions: ${correctPredictions}`);
        console.log(`Accuracy: ${((correctPredictions / totalTests) * 100).toFixed(1)}%`);
        console.log(`Processed Chunks: ${processedCount}`);
        console.log(`Skipped Chunks: ${notProcessedCount}`);
    }
    
    const accuracy = (correctPredictions / totalTests) * 100;
    
    if (process.env.DEBUG_APP === 'true') {
        if (accuracy >= 90) {
            console.log('\n🎉 EXCELLENT! Integration test passed with high accuracy.');
            console.log('✅ Hybrid VAD Strategy is ready for production deployment.');
        } else if (accuracy >= 80) {
            console.log('\n✅ GOOD! Integration test passed with acceptable accuracy.');
            console.log('🔧 Consider minor adjustments for optimal performance.');
        } else if (accuracy >= 70) {
            console.log('\n⚠️  MODERATE! Integration test shows room for improvement.');
            console.log('🔧 Review decision thresholds and chunking logic.');
        } else {
            console.log('\n❌ POOR! Integration test indicates significant issues.');
            console.log('🚨 Major adjustments needed before deployment.');
        }
    }
    
    if (process.env.DEBUG_APP === 'true') {
        console.log('\n🚀 Integration Test Complete!');
    }
    
    return {
        accuracy,
        totalTests,
        correctPredictions,
        processedCount,
        notProcessedCount,
        performanceReport
    };
}

// Run integration test
if (require.main === module) {
    runIntegrationTest().catch(error => {
        if (process.env.DEBUG_APP === 'true') {
            console.error('❌ Integration test failed:', error);
        }
        process.exit(1);
    });
}

module.exports = { runIntegrationTest };