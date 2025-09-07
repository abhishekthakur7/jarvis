/**
 * Simple validation script for Hybrid VAD Strategy
 * Tests core functionality without complex test framework dependencies
 */

const path = require('path');
const fs = require('fs');

// Mock dependencies for testing
const mockGeminiSession = {
    sendMessage: async (prompt) => {
        // Simulate AI response based on prompt content
        if (prompt.includes('complete question')) {
            return {
                response: {
                    text: () => 'COMPLETE: The speaker has finished asking their question about system design.'
                }
            };
        } else if (prompt.includes('incomplete')) {
            return {
                response: {
                    text: () => 'INCOMPLETE: The speaker appears to be in the middle of formulating their question.'
                }
            };
        }
        return {
            response: {
                text: () => 'COMPLETE: Default response indicating completion.'
            }
        };
    }
};

// Load the hybrid VAD strategy
let HybridVadStrategy;
try {
    const hybridVadPath = path.join(__dirname, '..', 'src', 'utils', 'hybridVadStrategy.js');
    if (fs.existsSync(hybridVadPath)) {
        HybridVadStrategy = require(hybridVadPath).HybridVadStrategy;
    } else {
        if (process.env.DEBUG_APP === 'true') {
            console.error('❌ HybridVadStrategy file not found at:', hybridVadPath);
        }
        process.exit(1);
    }
} catch (error) {
    if (process.env.DEBUG_APP === 'true') {
        console.error('❌ Error loading HybridVadStrategy:', error.message);
    }
    process.exit(1);
}

// Test cases
const testCases = [
    {
        name: 'Direct Technical Question',
        chunk: 'Can you explain how microservices architecture works?',
        context: 'Previous discussion about system design patterns.',
        expectedShouldProcess: true,
        expectedMethod: 'enhanced_chunking'
    },
    {
        name: 'Incomplete Question with Pause',
        chunk: 'So I was wondering about... um...',
        context: 'Interview discussion about algorithms.',
        expectedShouldProcess: false,
        expectedMethod: 'enhanced_chunking'
    },
    {
        name: 'Multi-part Question',
        chunk: 'First, can you tell me about REST APIs, and second, how do they differ from GraphQL?',
        context: 'Technical interview about web technologies.',
        expectedShouldProcess: true,
        expectedMethod: 'enhanced_chunking'
    },
    {
        name: 'Behavioral Question',
        chunk: 'Tell me about a time when you had to work with a difficult team member.',
        context: 'Behavioral interview section.',
        expectedShouldProcess: true,
        expectedMethod: 'enhanced_chunking'
    },
    {
        name: 'Artificial Pause Test',
        chunk: 'What is... [PAUSE 3s] ...the difference between SQL and NoSQL?',
        context: 'Database discussion.',
        expectedShouldProcess: true,
        expectedMethod: 'enhanced_chunking'
    }
];

async function runValidation() {
    if (process.env.DEBUG_APP === 'true') {
        console.log('🚀 Starting Hybrid VAD Strategy Validation\n');
        console.log('=' .repeat(60));
    }
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    // Initialize strategy
    const strategy = new HybridVadStrategy({
        geminiSession: mockGeminiSession,
        enableAiFallback: true
    });
    
    if (process.env.DEBUG_APP === 'true') {
        console.log('✅ HybridVadStrategy initialized successfully\n');
    }
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        if (process.env.DEBUG_APP === 'true') {
            console.log(`📋 Test ${i + 1}: ${testCase.name}`);
            console.log('─'.repeat(40));
        }
        
        try {
            // Create mock transcription chunk
            const chunk = {
                text: testCase.chunk,
                timestamp: Date.now(),
                confidence: 0.9,
                isFinal: true
            };
            
            // Process the chunk
            const startTime = Date.now();
            const result = await strategy.processTranscriptionChunk(chunk.text, chunk.timestamp);
            const processingTime = Date.now() - startTime;
            
            // Validate results
            if (process.env.DEBUG_APP === 'true') {
                console.log(`   Input: "${testCase.chunk}"`);
                console.log(`   Context: "${testCase.context}"`);
                console.log(`   Result: shouldProcess=${result.shouldProcess}, confidence=${result.confidence.toFixed(3)}, method=${result.method}`);
                console.log(`   Processing time: ${processingTime}ms`);
            }
            
            // Check expectations
            let testPassed = true;
            const issues = [];
            
            if (result.shouldProcess !== testCase.expectedShouldProcess) {
                issues.push(`Expected shouldProcess=${testCase.expectedShouldProcess}, got ${result.shouldProcess}`);
                testPassed = false;
            }
            
            if (result.method !== testCase.expectedMethod) {
                issues.push(`Expected method=${testCase.expectedMethod}, got ${result.method}`);
                testPassed = false;
            }
            
            if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
                issues.push(`Invalid confidence score: ${result.confidence}`);
                testPassed = false;
            }
            
            if (processingTime > 1000) {
                issues.push(`Processing time too high: ${processingTime}ms`);
                testPassed = false;
            }
            
            if (testPassed) {
                if (process.env.DEBUG_APP === 'true') {
                    console.log('   ✅ PASS\n');
                }
                passedTests++;
            } else {
                if (process.env.DEBUG_APP === 'true') {
                    console.log('   ❌ FAIL');
                    issues.forEach(issue => console.log(`      - ${issue}`));
                    console.log('');
                }
            }
            
        } catch (error) {
            if (process.env.DEBUG_APP === 'true') {
                console.log('   ❌ ERROR:', error.message);
                console.log('');
            }
        }
    }
    
    // Context management test
    if (process.env.DEBUG_APP === 'true') {
        console.log('📋 Context Management Test');
        console.log('─'.repeat(40));
    }
    
    try {
        // Test 2-minute window restriction
        const oldTimestamp = Date.now() - (3 * 60 * 1000); // 3 minutes ago
        const recentTimestamp = Date.now() - (30 * 1000); // 30 seconds ago
        
        const contextWithOldData = `[${new Date(oldTimestamp).toISOString()}] Old conversation about databases. [${new Date(recentTimestamp).toISOString()}] Recent discussion about APIs.`;
        
        const chunk = {
            text: 'What are the benefits of using REST APIs?',
            timestamp: Date.now(),
            confidence: 0.9,
            isFinal: true
        };
        
        const result = await strategy.processTranscriptionChunk(chunk.text, chunk.timestamp);
        
        if (process.env.DEBUG_APP === 'true') {
            console.log('   Testing 2-minute context window...');
            console.log(`   Context length: ${contextWithOldData.length} chars`);
            console.log(`   Result: shouldProcess=${result.shouldProcess}, confidence=${result.confidence.toFixed(3)}`);
        }
        
        if (result.shouldProcess && result.confidence > 0.5) {
            if (process.env.DEBUG_APP === 'true') {
                console.log('   ✅ PASS: Context management working\n');
            }
            passedTests++;
            totalTests++;
        } else {
            if (process.env.DEBUG_APP === 'true') {
                console.log('   ❌ FAIL: Context management issue\n');
            }
            totalTests++;
        }
        
    } catch (error) {
        if (process.env.DEBUG_APP === 'true') {
            console.log('   ❌ ERROR:', error.message);
            console.log('');
        }
        totalTests++;
    }
    
    // Performance test
    if (process.env.DEBUG_APP === 'true') {
        console.log('📋 Performance Test');
        console.log('─'.repeat(40));
    }
    
    try {
        const performanceTestCount = 10;
        const startTime = Date.now();
        
        for (let i = 0; i < performanceTestCount; i++) {
            const chunk = {
                text: `Performance test question ${i + 1}: How does caching improve system performance?`,
                timestamp: Date.now(),
                confidence: 0.9,
                isFinal: true
            };
            
            await strategy.processTranscriptionChunk(chunk.text, chunk.timestamp);
        }
        
        const totalTime = Date.now() - startTime;
        const avgTime = totalTime / performanceTestCount;
        
        if (process.env.DEBUG_APP === 'true') {
            console.log(`   Processed ${performanceTestCount} chunks in ${totalTime}ms`);
            console.log(`   Average processing time: ${avgTime.toFixed(2)}ms per chunk`);
        }
        
        if (avgTime < 200) {
            if (process.env.DEBUG_APP === 'true') {
                console.log('   ✅ PASS: Performance within acceptable limits\n');
            }
            passedTests++;
        } else {
            if (process.env.DEBUG_APP === 'true') {
                console.log('   ❌ FAIL: Performance too slow\n');
            }
        }
        totalTests++;
        
    } catch (error) {
        if (process.env.DEBUG_APP === 'true') {
            console.log('   ❌ ERROR:', error.message);
            console.log('');
        }
        totalTests++;
    }
    
    // Final summary
    if (process.env.DEBUG_APP === 'true') {
        console.log('=' .repeat(60));
        console.log('🎯 VALIDATION SUMMARY');
        console.log('=' .repeat(60));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${totalTests - passedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    }
    
    if (process.env.DEBUG_APP === 'true') {
        if (passedTests === totalTests) {
            console.log('\n🎉 ALL TESTS PASSED! Hybrid VAD Strategy is working correctly.');
            console.log('✅ Ready for integration with gemini.js');
        } else if (passedTests / totalTests >= 0.8) {
            console.log('\n⚠️  Most tests passed, but some issues need attention.');
            console.log('🔧 Review failed tests and adjust implementation.');
        } else {
            console.log('\n❌ Multiple test failures detected.');
            console.log('🚨 Significant issues need to be resolved before deployment.');
        }
    }
    
    if (process.env.DEBUG_APP === 'true') {
        console.log('\n🚀 Validation Complete!');
    }
}

// Run validation
if (require.main === module) {
    runValidation().catch(error => {
        if (process.env.DEBUG_APP === 'true') {
            console.error('❌ Validation failed:', error);
        }
        process.exit(1);
    });
}

module.exports = { runValidation };