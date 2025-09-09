/**
 * Comprehensive Test Suite for Hybrid VAD Strategy
 * Tests enhanced chunking with artificial pauses and various question types
 */

const { HybridVadStrategy, HYBRID_CONFIG } = require('../src/utils/hybridVadStrategy');

describe('Hybrid VAD Strategy Tests', () => {
    let strategy;
    let mockTimestamp;

    beforeEach(() => {
        strategy = new HybridVadStrategy();
        mockTimestamp = Date.now();
    });

    describe('Enhanced Chunking - Question Types', () => {
        const questionTypes = [
            {
                name: 'Direct Technical Question',
                chunks: [
                    { text: 'What is the difference between', delay: 0 },
                    { text: 'REST and GraphQL APIs?', delay: 800 }
                ],
                expectedProcessing: [false, true],
                expectedConfidence: [0.4, 0.8]
            },
            {
                name: 'Behavioral Interview Question',
                chunks: [
                    { text: 'Tell me about a time when', delay: 0 },
                    { text: 'you had to work with a difficult', delay: 600 },
                    { text: 'team member and how you handled it.', delay: 1200 }
                ],
                expectedProcessing: [false, false, true],
                expectedConfidence: [0.3, 0.4, 0.85]
            },
            {
                name: 'Multi-part Question with Pauses',
                chunks: [
                    { text: 'Can you explain', delay: 0 },
                    { text: 'the concept of microservices', delay: 500 },
                    { text: 'and also tell me', delay: 800 },
                    { text: 'about their advantages?', delay: 1000 }
                ],
                expectedProcessing: [false, false, false, true],
                expectedConfidence: [0.3, 0.4, 0.5, 0.8]
            },
            {
                name: 'Incomplete Question with Hesitation',
                chunks: [
                    { text: 'So um, what I wanted to ask is', delay: 0 },
                    { text: 'well, how do you', delay: 700 },
                    { text: 'handle database migrations?', delay: 900 }
                ],
                expectedProcessing: [false, false, true],
                expectedConfidence: [0.2, 0.3, 0.7]
            },
            {
                name: 'Rapid Fire Questions',
                chunks: [
                    { text: 'What is Docker?', delay: 0 },
                    { text: 'How about Kubernetes?', delay: 300 },
                    { text: 'And what about containers?', delay: 400 }
                ],
                expectedProcessing: [true, true, true],
                expectedConfidence: [0.8, 0.7, 0.7]
            }
        ];

        questionTypes.forEach(({ name, chunks, expectedProcessing, expectedConfidence }) => {
            test(`should handle ${name}`, async () => {
                const results = [];
                let currentTime = mockTimestamp;

                for (let i = 0; i < chunks.length; i++) {
                    currentTime += chunks[i].delay;
                    const result = await strategy.processTranscriptionChunk(
                        chunks[i].text, 
                        currentTime
                    );
                    results.push(result);
                }

                // Verify processing decisions
                results.forEach((result, index) => {
                    expect(result.shouldProcess).toBe(expectedProcessing[index]);
                    expect(result.confidence).toBeGreaterThanOrEqual(expectedConfidence[index] - 0.1);
                    expect(result.confidence).toBeLessThanOrEqual(expectedConfidence[index] + 0.1);
                });
            });
        });
    });

    describe('Artificial Pause Testing', () => {
        const pauseScenarios = [
            {
                name: 'Natural Pause (800ms)',
                text: 'How do you implement',
                pauseMs: 800,
                expectedShouldProcess: false,
                expectedConfidenceMin: 0.4
            },
            {
                name: 'Sentence End Pause (1200ms)',
                text: 'authentication in your application',
                pauseMs: 1200,
                expectedShouldProcess: true,
                expectedConfidenceMin: 0.6
            },
            {
                name: 'Topic Change Pause (2000ms)',
                text: 'using JWT tokens?',
                pauseMs: 2000,
                expectedShouldProcess: true,
                expectedConfidenceMin: 0.7
            },
            {
                name: 'Very Long Pause (3000ms)',
                text: 'Now let me ask about databases.',
                pauseMs: 3000,
                expectedShouldProcess: true,
                expectedConfidenceMin: 0.8
            },
            {
                name: 'Short Pause (400ms)',
                text: 'What about',
                pauseMs: 400,
                expectedShouldProcess: false,
                expectedConfidenceMin: 0.3
            }
        ];

        pauseScenarios.forEach(({ name, text, pauseMs, expectedShouldProcess, expectedConfidenceMin }) => {
            test(`should handle ${name}`, async () => {
                // Add initial context
                await strategy.processTranscriptionChunk('Initial context', mockTimestamp);
                
                // Add chunk after specified pause
                const result = await strategy.processTranscriptionChunk(
                    text, 
                    mockTimestamp + pauseMs
                );

                expect(result.shouldProcess).toBe(expectedShouldProcess);
                expect(result.confidence).toBeGreaterThanOrEqual(expectedConfidenceMin);
                expect(result.timeSinceLastChunk).toBe(pauseMs);
            });
        });
    });

    describe('Context Management', () => {
        test('should maintain 2-minute context window', async () => {
            const baseTime = mockTimestamp;
            
            // Add chunks over 3 minutes
            await strategy.processTranscriptionChunk('Chunk 1', baseTime);
            await strategy.processTranscriptionChunk('Chunk 2', baseTime + 30000); // 30s
            await strategy.processTranscriptionChunk('Chunk 3', baseTime + 90000); // 1.5min
            await strategy.processTranscriptionChunk('Chunk 4', baseTime + 150000); // 2.5min
            await strategy.processTranscriptionChunk('Chunk 5', baseTime + 180000); // 3min
            
            const context = strategy.getRecentContext();
            
            // Should only contain chunks from last 2 minutes
            expect(context).not.toContain('Chunk 1');
            expect(context).not.toContain('Chunk 2');
            expect(context).toContain('Chunk 3');
            expect(context).toContain('Chunk 4');
            expect(context).toContain('Chunk 5');
        });

        test('should enforce character limit', async () => {
            const longText = 'A'.repeat(1000);
            
            // Add chunks that exceed character limit
            for (let i = 0; i < 5; i++) {
                await strategy.processTranscriptionChunk(
                    longText, 
                    mockTimestamp + (i * 1000)
                );
            }
            
            const context = strategy.getRecentContext();
            expect(context.length).toBeLessThanOrEqual(HYBRID_CONFIG.MAX_CONTEXT_CHARS);
        });
    });

    describe('Interview-Specific Patterns', () => {
        const interviewPatterns = [
            {
                name: 'Question with indicators',
                text: 'Can you explain how you would approach this problem?',
                expectedHighConfidence: true
            },
            {
                name: 'Follow-up question',
                text: 'And what about error handling?',
                expectedHighConfidence: true
            },
            {
                name: 'Incomplete thought with fillers',
                text: 'So um, like, what I mean is',
                expectedHighConfidence: false
            },
            {
                name: 'Technical explanation request',
                text: 'Tell me about your experience with React hooks.',
                expectedHighConfidence: true
            },
            {
                name: 'Clarification request',
                text: 'When you say scalable, what exactly do you mean?',
                expectedHighConfidence: true
            }
        ];

        interviewPatterns.forEach(({ name, text, expectedHighConfidence }) => {
            test(`should recognize ${name}`, async () => {
                const result = await strategy.processTranscriptionChunk(text, mockTimestamp + 1000);
                
                if (expectedHighConfidence) {
                    expect(result.confidence).toBeGreaterThan(HYBRID_CONFIG.HIGH_CONFIDENCE_THRESHOLD);
                } else {
                    expect(result.confidence).toBeLessThan(HYBRID_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD);
                }
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle empty chunks', async () => {
            const result = await strategy.processTranscriptionChunk('', mockTimestamp);
            expect(result.shouldProcess).toBe(false);
            expect(result.reason).toBe('invalid_chunk');
        });

        test('should handle very short chunks', async () => {
            const result = await strategy.processTranscriptionChunk('hi', mockTimestamp);
            expect(result.shouldProcess).toBe(false);
            expect(result.reason).toBe('invalid_chunk');
        });

        test('should handle very long chunks', async () => {
            const longText = 'A'.repeat(HYBRID_CONFIG.MAX_CONTEXT_CHARS + 100);
            const result = await strategy.processTranscriptionChunk(longText, mockTimestamp);
            expect(result.shouldProcess).toBe(false);
            expect(result.reason).toBe('invalid_chunk');
        });

        test('should handle whitespace-only chunks', async () => {
            const result = await strategy.processTranscriptionChunk('   \n\t   ', mockTimestamp);
            expect(result.shouldProcess).toBe(false);
            expect(result.reason).toBe('invalid_chunk');
        });
    });

    describe('AI Fallback Rate Limiting', () => {
        test('should limit AI fallback calls per minute', async () => {
            // Simulate medium confidence scenarios that would trigger AI fallback
            const mediumConfidenceText = 'What do you think about';
            
            let aiFallbackCount = 0;
            
            // Make more calls than the limit
            for (let i = 0; i < HYBRID_CONFIG.MAX_AI_FALLBACK_CALLS_PER_MINUTE + 2; i++) {
                const result = await strategy.processTranscriptionChunk(
                    mediumConfidenceText + i, 
                    mockTimestamp + (i * 1000)
                );
                
                if (result.method === 'ai_semantic_continuity') {
                    aiFallbackCount++;
                }
            }
            
            expect(aiFallbackCount).toBeLessThanOrEqual(HYBRID_CONFIG.MAX_AI_FALLBACK_CALLS_PER_MINUTE);
        });
    });

    describe('Reliability Metrics', () => {
        test('should track decision metrics', async () => {
            // Make various types of decisions
            await strategy.processTranscriptionChunk('What is your experience?', mockTimestamp + 1000);
            await strategy.processTranscriptionChunk('Tell me about', mockTimestamp + 2000);
            await strategy.processTranscriptionChunk('How do you handle', mockTimestamp + 3000);
            
            const report = strategy.getReliabilityReport();
            
            expect(report.totalDecisions).toBeGreaterThan(0);
            expect(report.highConfidenceRate).toBeGreaterThanOrEqual(0);
            expect(report.highConfidenceRate).toBeLessThanOrEqual(1);
        });
    });

    describe('Real Interview Simulation', () => {
        test('should handle complete interview question flow', async () => {
            const interviewFlow = [
                { text: 'Hi there,', delay: 0, expectProcess: false },
                { text: 'I wanted to ask you', delay: 600, expectProcess: false },
                { text: 'about your experience with', delay: 500, expectProcess: false },
                { text: 'React and state management.', delay: 800, expectProcess: true },
                { text: 'Specifically,', delay: 1500, expectProcess: false },
                { text: 'how do you handle', delay: 400, expectProcess: false },
                { text: 'complex state in large applications?', delay: 900, expectProcess: true },
                { text: 'And also,', delay: 1200, expectProcess: false },
                { text: 'what are your thoughts on Redux', delay: 600, expectProcess: false },
                { text: 'versus Context API?', delay: 800, expectProcess: true }
            ];

            let currentTime = mockTimestamp;
            const results = [];

            for (const step of interviewFlow) {
                currentTime += step.delay;
                const result = await strategy.processTranscriptionChunk(step.text, currentTime);
                results.push({ ...result, expected: step.expectProcess });
            }

            // Verify that processing decisions align with expectations
            let correctDecisions = 0;
            results.forEach((result, index) => {
                if (result.shouldProcess === result.expected) {
                    correctDecisions++;
                }
            });

            const accuracy = correctDecisions / results.length;
            expect(accuracy).toBeGreaterThan(0.7); // At least 70% accuracy
        });
    });

    describe('Performance and Memory', () => {
        test('should not leak memory with continuous processing', async () => {
            const initialBufferSize = strategy.contextBuffer.length;
            
            // Process many chunks
            for (let i = 0; i < 100; i++) {
                await strategy.processTranscriptionChunk(
                    `Chunk ${i} with some content`, 
                    mockTimestamp + (i * 1000)
                );
            }
            
            // Buffer should not grow indefinitely
            expect(strategy.contextBuffer.length).toBeLessThan(50);
        });

        test('should maintain reasonable processing time', async () => {
            const startTime = Date.now();
            
            await strategy.processTranscriptionChunk(
                'What is your experience with JavaScript frameworks?', 
                mockTimestamp
            );
            
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(100); // Should process in under 100ms
        });
    });
});

// Helper function to run specific test scenarios
function runPauseTestScenario(strategy, scenario) {
    return new Promise(async (resolve) => {
        const results = [];
        let currentTime = Date.now();
        
        for (const step of scenario.steps) {
            currentTime += step.delay;
            const result = await strategy.processTranscriptionChunk(step.text, currentTime);
            results.push(result);
        }
        
        resolve(results);
    });
}

module.exports = { runPauseTestScenario };