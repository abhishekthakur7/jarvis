/**
 * Integration Test for Enhanced Follow-Up Question Handling
 * 
 * Tests the complete flow of follow-up question detection, classification,
 * and context injection in technical interview scenarios.
 */

const enhancedFollowUpClassifier = require('../src/utils/enhancedFollowUpClassifier');

// Mock conversation history for testing
const mockConversationHistory = [
    {
        timestamp: Date.now() - 120000, // 2 minutes ago
        transcription: "Can you explain binary search algorithm?",
        ai_response: "Binary search is a divide-and-conquer algorithm that works on sorted arrays...",
        type: 'user_request'
    },
    {
        timestamp: Date.now() - 60000, // 1 minute ago
        transcription: "What's the time complexity of binary search?",
        ai_response: "The time complexity of binary search is O(log n)...",
        type: 'user_request'
    },
    {
        timestamp: Date.now() - 30000, // 30 seconds ago
        transcription: "How would you implement it in Java?",
        ai_response: "Here's a Java implementation of binary search...",
        type: 'user_request'
    }
];

// Test scenarios
const testScenarios = [
    {
        name: "Direct Follow-Up Question",
        input: "Also, what about the space complexity?",
        expectedFollowUp: true,
        expectedType: "direct_follow_up",
        expectedConfidenceMin: 0.6
    },
    {
        name: "Clarification Request",
        input: "Can you clarify what you mean by divide-and-conquer?",
        expectedFollowUp: true,
        expectedType: "clarification",
        expectedConfidenceMin: 0.8
    },
    {
        name: "Technical Deep Dive",
        input: "How would you optimize it for repeated searches?",
        expectedFollowUp: true,
        expectedType: "technical_deep_dive",
        expectedConfidenceMin: 0.7
    },
    {
        name: "Comparison Question",
        input: "What's the difference between that and linear search?",
        expectedFollowUp: true,
        expectedType: "comparison",
        expectedConfidenceMin: 0.6
    },
    {
        name: "Contextual Reference",
        input: "How does this algorithm handle edge cases?",
        expectedFollowUp: true,
        expectedType: "technical_deep_dive", // Edge cases is a technical deep dive topic
        expectedConfidenceMin: 0.5
    },
    {
        name: "Independent Question",
        input: "Can you explain merge sort algorithm?",
        expectedFollowUp: false,
        expectedType: "independent",
        expectedConfidenceMax: 0.4
    }
];

/**
 * Run all integration tests
 */
function runIntegrationTests() {
    console.log('🧪 [INTEGRATION_TEST] Starting Enhanced Follow-Up Question Handling Tests');
    console.log('================================================================================');
    
    let passedTests = 0;
    let totalTests = testScenarios.length;
    const results = [];
    
    // Reset classifier for clean testing
    enhancedFollowUpClassifier.resetSession();
    
    for (const scenario of testScenarios) {
        console.log(`\\n🔍 [TEST] ${scenario.name}`);
        console.log(`📝 [INPUT] "${scenario.input}"`);
        
        try {
            // Run classification
            const result = enhancedFollowUpClassifier.classifyFollowUp(
                scenario.input,
                mockConversationHistory,
                { phase: 'technical', topics: ['algorithms', 'binary_search'] }
            );
            
            // Validate results
            const testResult = validateTestResult(scenario, result);
            results.push({ scenario: scenario.name, ...testResult });
            
            if (testResult.passed) {
                passedTests++;
                console.log(`✅ [PASS] ${scenario.name}`);
            } else {
                console.log(`❌ [FAIL] ${scenario.name}: ${testResult.reason}`);
            }
            
            // Log detailed results
            console.log(`   📊 Follow-Up: ${result.isFollowUp}, Type: ${result.followUpType}, Confidence: ${result.confidence.toFixed(3)}`);
            if (result.contextRecommendation) {
                console.log(`   🧠 Context Type: ${result.contextRecommendation.contextType}, Priority: ${result.contextRecommendation.priority}`);
            }
            console.log(`   🏷️ Patterns: ${result.patterns.join(', ') || 'none'}`);
            console.log(`   🔬 Topics: ${result.technicalTopics.map(t => t.category).join(', ') || 'none'}`);
            
        } catch (error) {
            console.log(`💥 [ERROR] ${scenario.name}: ${error.message}`);
            results.push({ scenario: scenario.name, passed: false, reason: `Error: ${error.message}` });
        }
    }
    
    // Print summary
    console.log('\\n================================================================================');
    console.log(`📈 [SUMMARY] ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    
    // Print detailed results
    console.log('\\n📋 [DETAILED_RESULTS]');
    results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.scenario}: ${result.reason || 'All validations passed'}`);
    });
    
    // Get metrics
    const metrics = enhancedFollowUpClassifier.getMetrics();
    console.log('\\n📊 [CLASSIFIER_METRICS]');
    console.log(`   Total Classifications: ${metrics.totalClassifications}`);
    console.log(`   Follow-Up Detections: ${metrics.followUpDetections}`);
    console.log(`   Detection Rate: ${(metrics.followUpDetectionRate * 100).toFixed(1)}%`);
    console.log(`   Context Injections: ${metrics.contextInjections}`);
    console.log(`   Active Topics: ${metrics.activeTopics.join(', ') || 'none'}`);
    
    return {
        passed: passedTests,
        total: totalTests,
        successRate: passedTests / totalTests,
        results,
        metrics
    };
}

/**
 * Validate test result against expected scenario
 */
function validateTestResult(scenario, result) {
    const validations = [];
    
    // Check follow-up detection
    if (result.isFollowUp !== scenario.expectedFollowUp) {
        return {
            passed: false,
            reason: `Expected isFollowUp: ${scenario.expectedFollowUp}, got: ${result.isFollowUp}`
        };
    }
    validations.push('Follow-up detection correct');
    
    // Check follow-up type
    if (result.followUpType !== scenario.expectedType) {
        return {
            passed: false,
            reason: `Expected type: ${scenario.expectedType}, got: ${result.followUpType}`
        };
    }
    validations.push('Follow-up type correct');
    
    // Check confidence thresholds
    if (scenario.expectedConfidenceMin && result.confidence < scenario.expectedConfidenceMin) {
        return {
            passed: false,
            reason: `Expected confidence >= ${scenario.expectedConfidenceMin}, got: ${result.confidence.toFixed(3)}`
        };
    }
    
    if (scenario.expectedConfidenceMax && result.confidence > scenario.expectedConfidenceMax) {
        return {
            passed: false,
            reason: `Expected confidence <= ${scenario.expectedConfidenceMax}, got: ${result.confidence.toFixed(3)}`
        };
    }
    validations.push('Confidence threshold correct');
    
    // Check context recommendation for follow-ups
    if (result.isFollowUp) {
        if (!result.contextRecommendation) {
            return {
                passed: false,
                reason: 'Expected context recommendation for follow-up question'
            };
        }
        
        if (!result.contextRecommendation.shouldIncludeContext) {
            return {
                passed: false,
                reason: 'Expected context recommendation to suggest including context'
            };
        }
        validations.push('Context recommendation generated');
    }
    
    // Check technical topics detection
    if (scenario.input.toLowerCase().includes('algorithm') || 
        scenario.input.toLowerCase().includes('search') ||
        scenario.input.toLowerCase().includes('complexity')) {
        if (result.technicalTopics.length === 0) {
            return {
                passed: false,
                reason: 'Expected technical topics to be detected'
            };
        }
        validations.push('Technical topics detected');
    }
    
    return {
        passed: true,
        validations
    };
}

/**
 * Test context generation functionality
 */
function testContextGeneration() {
    console.log('\\n🧠 [CONTEXT_TEST] Testing Context Generation Functionality');
    
    const followUpQuestions = [
        {
            input: "Can you clarify what you mean by O(log n)?",
            expectedContextType: "clarification"
        },
        {
            input: "Also, how would you handle the case when the element is not found?",
            expectedContextType: "direct_follow_up"
        },
        {
            input: "What's the difference between this and interpolation search?",
            expectedContextType: "comparison"
        }
    ];
    
    followUpQuestions.forEach((test, index) => {
        console.log(`\\n📝 [CONTEXT_TEST_${index + 1}] "${test.input}"`);
        
        const result = enhancedFollowUpClassifier.classifyFollowUp(
            test.input,
            mockConversationHistory
        );
        
        if (result.isFollowUp && result.contextRecommendation) {
            const context = result.contextRecommendation;
            console.log(`   ✅ Context Type: ${context.contextType}`);
            console.log(`   📋 Priority: ${context.priority}`);
            console.log(`   🎯 Reasoning: ${context.reasoning.join(', ')}`);
            
            if (context.suggestedContext) {
                console.log(`   💬 Context Preview: ${context.suggestedContext.content?.substring(0, 100)}...`);
            }
        } else {
            console.log(`   ❌ No context recommendation generated`);
        }
    });
}

/**
 * Test performance under load
 */
function testPerformance() {
    console.log('\\n⚡ [PERFORMANCE_TEST] Testing Classification Performance');
    
    const testInputs = [
        "What about edge cases?",
        "Can you explain that again?",
        "How does this compare to bubble sort?",
        "Additionally, what's the space complexity?",
        "What do you mean by divide-and-conquer?"
    ];
    
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        const randomInput = testInputs[i % testInputs.length];
        enhancedFollowUpClassifier.classifyFollowUp(
            randomInput,
            mockConversationHistory.slice(-2) // Use recent context
        );
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`   📊 Total time: ${totalTime}ms`);
    console.log(`   📊 Average time per classification: ${avgTime.toFixed(2)}ms`);
    console.log(`   📊 Classifications per second: ${(1000 / avgTime).toFixed(0)}`);
    
    // Performance should be under 10ms per classification
    if (avgTime < 10) {
        console.log(`   ✅ Performance test passed (${avgTime.toFixed(2)}ms < 10ms threshold)`);
        return true;
    } else {
        console.log(`   ❌ Performance test failed (${avgTime.toFixed(2)}ms >= 10ms threshold)`);
        return false;
    }
}

/**
 * Main test runner
 */
function main() {
    console.log('🚀 [MAIN] Starting Enhanced Follow-Up Question Handling Integration Tests\\n');
    
    try {
        // Run core functionality tests
        const mainResults = runIntegrationTests();
        
        // Run context generation tests
        testContextGeneration();
        
        // Run performance tests
        const performancePassed = testPerformance();
        
        // Final summary
        console.log('\\n================================================================================');
        console.log('🏁 [FINAL_SUMMARY]');
        console.log(`   Core Tests: ${mainResults.passed}/${mainResults.total} passed (${(mainResults.successRate * 100).toFixed(1)}%)`);
        console.log(`   Performance Test: ${performancePassed ? 'PASSED' : 'FAILED'}`);
        
        const overallSuccess = mainResults.successRate >= 0.8 && performancePassed;
        console.log(`   Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
        
        if (overallSuccess) {
            console.log('\\n🎉 [SUCCESS] Enhanced Follow-Up Question Handling is working correctly!');
            console.log('   - Follow-up detection is accurate');
            console.log('   - Context recommendations are generated appropriately');
            console.log('   - Performance meets requirements');
            console.log('   - Technical topic tracking is functional');
        } else {
            console.log('\\n⚠️ [WARNING] Some tests failed. Review the results above.');
        }
        
        return overallSuccess;
        
    } catch (error) {
        console.error('💥 [FATAL_ERROR] Test execution failed:', error);
        return false;
    }
}

// Export for use in other test files
module.exports = {
    runIntegrationTests,
    testContextGeneration,
    testPerformance,
    mockConversationHistory,
    testScenarios
};

// Run tests if this file is executed directly
if (require.main === module) {
    main();
}