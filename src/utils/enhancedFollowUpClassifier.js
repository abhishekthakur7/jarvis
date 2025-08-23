/**
 * Enhanced Follow-Up Question Classifier for Technical Interview Optimization
 * 
 * Intelligently detects follow-up questions and provides contextual information
 * to help Gemini understand the relationship between current and previous questions.
 * 
 * Key improvements over basic REFERENCE_WORDS approach:
 * - Technical interview context awareness
 * - Question thread tracking across conversation turns  
 * - Intelligent context selection and formatting
 * - Integration with existing Context Boundary Optimizer
 */

class EnhancedFollowUpClassifier {
    constructor() {
        // Enhanced follow-up patterns beyond basic reference words
        this.followUpPatterns = {
            // Direct follow-up indicators
            directFollowUp: [
                'also', 'additionally', 'furthermore', 'moreover', 'and another',
                'follow up', 'next question', 'building on that', 'related to',
                'what about', 'how about', 'speaking of', 'regarding'
            ],
            
            // Clarification requests
            clarificationRequest: [
                'what do you mean', 'can you clarify', 'could you explain',
                'i don\'t understand', 'sorry, what', 'can you repeat',
                'what exactly', 'clarify that', 'elaborate on', 'expand on',
                'could you elaborate', 'can you be more specific'
            ],
            
            // Technical deep-dive indicators
            technicalDeepDive: [
                'how would you implement', 'what if we need to', 'how do you handle',
                'what about edge cases', 'how do you optimize', 'what\'s the complexity',
                'how does this scale', 'what are the trade-offs', 'alternative approach',
                'different way to', 'better solution', 'more efficient', 'how would you',
                'what if', 'how to optimize', 'edge cases', 'optimization'
            ],
            
            // Comparison and contrast
            comparison: [
                'difference between', 'compare', 'versus', 'vs', 'better than',
                'worse than', 'pros and cons', 'advantages', 'disadvantages',
                'when would you use', 'which is better', 'why not use'
            ],
            
            // Reference to previous content
            contextualReference: [
                'that', 'this', 'it', 'they', 'them', 'these', 'those',
                'the approach', 'the algorithm', 'the solution', 'the method',
                'the code', 'the implementation', 'the example', 'the answer',
                'what you said', 'what you mentioned', 'your solution'
            ]
        };
        
        // Technical topics for tracking conversation threads
        this.technicalTopics = {
            algorithms: ['algorithm', 'sorting', 'searching', 'tree', 'graph', 'dynamic programming', 'recursion', 'greedy'],
            dataStructures: ['array', 'linked list', 'stack', 'queue', 'hash table', 'heap', 'trie', 'set', 'map'],
            systemDesign: ['scalability', 'load balancer', 'database', 'microservices', 'api', 'cache', 'cdn', 'sharding'],
            programming: ['function', 'class', 'method', 'variable', 'loop', 'condition', 'inheritance', 'polymorphism'],
            complexity: ['big o', 'time complexity', 'space complexity', 'optimization', 'performance', 'efficiency'],
            architecture: ['design pattern', 'mvc', 'solid', 'dependency injection', 'singleton', 'factory'],
            searchAlgorithms: ['binary search', 'linear search', 'interpolation search', 'search', 'searching']
        };
        
        // Question classification weights
        this.classificationWeights = {
            directFollowUp: 0.8,
            clarificationRequest: 0.9,
            technicalDeepDive: 0.6,  // Reduced to avoid overriding contextual references
            comparison: 0.7,
            contextualReference: 0.4  // Lower weight for generic references
        };
        
        // Conversation thread tracking
        this.questionThreads = [];
        this.activeTopics = new Set();
        this.lastQuestionContext = null;
        
        // Performance metrics
        this.metrics = {
            totalClassifications: 0,
            followUpDetections: 0,
            contextInjections: 0,
            accuracyFeedback: []
        };
    }
    
    /**
     * Main classification method - determines if input is a follow-up and provides context
     * @param {string} currentInput - The current question/input
     * @param {Array} conversationHistory - Recent conversation history
     * @param {Object} interviewContext - Current interview context
     * @returns {Object} Classification result with context recommendations
     */
    classifyFollowUp(currentInput, conversationHistory = [], interviewContext = null) {
        if (!currentInput || currentInput.trim().length === 0) {
            return this.createEmptyResult();
        }
        
        this.metrics.totalClassifications++;
        
        // Analyze the input for follow-up patterns
        const analysis = this.analyzeInput(currentInput);
        
        // Check conversation history for context relationships
        const contextAnalysis = this.analyzeConversationContext(currentInput, conversationHistory);
        
        // Determine follow-up classification
        const classification = this.determineClassification(analysis, contextAnalysis);
        
        // Generate context if this is a follow-up
        const contextRecommendation = this.generateContextRecommendation(
            classification,
            currentInput,
            conversationHistory,
            interviewContext
        );
        
        // Update conversation threads
        this.updateConversationThreads(currentInput, classification, contextAnalysis);
        
        // Track metrics
        if (classification.isFollowUp) {
            this.metrics.followUpDetections++;
        }
        
        return {
            isFollowUp: classification.isFollowUp,
            confidence: classification.confidence,
            followUpType: classification.type,
            patterns: classification.matchedPatterns,
            contextRecommendation: contextRecommendation,
            technicalTopics: this.extractTechnicalTopics(currentInput),
            threadRelationship: contextAnalysis.threadRelationship,
            metrics: {
                totalClassifications: this.metrics.totalClassifications,
                followUpDetections: this.metrics.followUpDetections
            }
        };
    }
    
    /**
     * Analyze input text for follow-up patterns
     */
    analyzeInput(input) {
        const text = input.toLowerCase().trim();
        const words = text.split(/\s+/);
        
        const patternMatches = {};
        let totalScore = 0;
        
        // Check each pattern category
        for (const [category, patterns] of Object.entries(this.followUpPatterns)) {
            patternMatches[category] = [];
            
            for (const pattern of patterns) {
                if (text.includes(pattern)) {
                    patternMatches[category].push(pattern);
                    totalScore += this.classificationWeights[category] || 0.5;
                }
            }
        }
        
        // Additional scoring based on question structure
        if (words.length < 8 && patternMatches.contextualReference.length > 0) {
            totalScore += 0.3; // Short questions with references are likely follow-ups
        }
        
        if (text.includes('?') && patternMatches.directFollowUp.length > 0) {
            totalScore += 0.2; // Direct questions with follow-up words
        }
        
        return {
            totalScore: Math.min(1.0, totalScore),
            patternMatches,
            wordCount: words.length,
            hasQuestionMark: text.includes('?'),
            fullText: input // Store original text for new topic detection
        };
    }
    
    /**
     * Analyze conversation history for contextual relationships
     */
    analyzeConversationContext(currentInput, conversationHistory) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return { threadRelationship: null, topicContinuity: false };
        }
        
        const currentTopics = this.extractTechnicalTopics(currentInput);
        const recentEntries = conversationHistory.slice(-3); // Last 3 entries
        
        let topicContinuity = false;
        let threadRelationship = null;
        let relatedEntry = null;
        
        // Check for topic continuity
        for (const entry of recentEntries) {
            const entryTopics = this.extractTechnicalTopics(entry.transcription || '');
            const hasTopicOverlap = currentTopics.some(topic => 
                entryTopics.some(eTopic => eTopic.category === topic.category)
            );
            
            if (hasTopicOverlap) {
                topicContinuity = true;
                relatedEntry = entry;
                
                // Determine relationship type
                const timeDiff = Date.now() - entry.timestamp;
                if (timeDiff < 30000) { // Within 30 seconds
                    threadRelationship = 'immediate_follow_up';
                } else if (timeDiff < 120000) { // Within 2 minutes
                    threadRelationship = 'related_topic';
                } else {
                    threadRelationship = 'topic_continuation';
                }
                break;
            }
        }
        
        return {
            threadRelationship,
            topicContinuity,
            relatedEntry,
            recentTopics: this.getRecentTopics(recentEntries)
        };
    }
    
    /**
     * Determine final classification based on analysis
     */
    determineClassification(analysis, contextAnalysis) {
        let confidence = analysis.totalScore;
        let isFollowUp = false;
        let type = 'independent';
        const matchedPatterns = [];
        
        // Collect all matched patterns
        for (const [category, patterns] of Object.entries(analysis.patternMatches)) {
            if (patterns.length > 0) {
                matchedPatterns.push(...patterns);
            }
        }
        
        // Adjust confidence based on context analysis
        if (contextAnalysis.topicContinuity) {
            confidence += 0.2;
        }
        
        if (contextAnalysis.threadRelationship === 'immediate_follow_up') {
            confidence += 0.3;
        }
        
        // ENHANCED: Reduce false positives for independent questions
        // If only contextual references exist (like 'it'), check for other indicators
        const onlyContextualReferences = analysis.patternMatches.contextualReference.length > 0 &&
                                       analysis.patternMatches.directFollowUp.length === 0 &&
                                       analysis.patternMatches.clarificationRequest.length === 0 &&
                                       analysis.patternMatches.technicalDeepDive.length === 0 &&
                                       analysis.patternMatches.comparison.length === 0;
        
        // Check if the question introduces a completely new topic
        const introducesNewTopic = this.detectsNewTopicIntroduction(analysis.fullText);
        
        if (onlyContextualReferences && introducesNewTopic) {
            confidence -= 0.7; // Stronger reduction for new topic introductions
        }
        
        // Adjust type priority: technical patterns should override contextual references
        let primaryType = null;
        if (analysis.patternMatches.clarificationRequest.length > 0) {
            primaryType = 'clarification';
        } else if (analysis.patternMatches.comparison.length > 0) {
            primaryType = 'comparison';
        } else if (analysis.patternMatches.directFollowUp.length > 0) {
            primaryType = 'direct_follow_up';
        } else if (analysis.patternMatches.technicalDeepDive.length > 0) {
            primaryType = 'technical_deep_dive';
        } else if (analysis.patternMatches.contextualReference.length > 0) {
            primaryType = 'contextual_reference';
        }
        
        // Determine if this is a follow-up based on confidence threshold
        if (confidence >= 0.6) {
            isFollowUp = true;
            type = primaryType || 'contextual_reference';
        }
        
        return {
            isFollowUp,
            confidence: Math.min(1.0, confidence),
            type,
            matchedPatterns
        };
    }
    
    /**
     * Generate context recommendation for Gemini
     */
    generateContextRecommendation(classification, currentInput, conversationHistory, interviewContext) {
        if (!classification.isFollowUp) {
            return null;
        }
        
        const recommendation = {
            shouldIncludeContext: true,
            contextType: classification.type,
            priority: this.calculateContextPriority(classification),
            suggestedContext: null,
            reasoning: []
        };
        
        // Generate appropriate context based on follow-up type
        switch (classification.type) {
            case 'clarification':
                recommendation.suggestedContext = this.generateClarificationContext(conversationHistory);
                recommendation.reasoning.push('User is asking for clarification of previous response');
                break;
                
            case 'technical_deep_dive':
                recommendation.suggestedContext = this.generateTechnicalContext(currentInput, conversationHistory);
                recommendation.reasoning.push('User wants to explore technical details further');
                break;
                
            case 'comparison':
                recommendation.suggestedContext = this.generateComparisonContext(currentInput, conversationHistory);
                recommendation.reasoning.push('User is comparing current topic with previous discussion');
                break;
                
            case 'direct_follow_up':
                recommendation.suggestedContext = this.generateDirectFollowUpContext(conversationHistory);
                recommendation.reasoning.push('Direct follow-up question to previous topic');
                break;
                
            case 'contextual_reference':
                recommendation.suggestedContext = this.generateReferenceContext(currentInput, conversationHistory);
                recommendation.reasoning.push('Question references previous content');
                break;
        }
        
        this.metrics.contextInjections++;
        
        return recommendation;
    }
    
    /**
     * Generate clarification context
     */
    generateClarificationContext(conversationHistory) {
        const lastAIResponse = conversationHistory
            .filter(entry => entry.ai_response)
            .slice(-1)[0];
        
        if (lastAIResponse) {
            // Return last AI response for clarification
            return {
                type: 'previous_response',
                content: `Previous answer: ${lastAIResponse.ai_response.substring(0, 300)}...`,
                timestamp: lastAIResponse.timestamp
            };
        }
        
        return null;
    }
    
    /**
     * Generate technical deep-dive context
     */
    generateTechnicalContext(currentInput, conversationHistory) {
        const currentTopics = this.extractTechnicalTopics(currentInput);
        const relatedEntries = conversationHistory
            .filter(entry => {
                const entryTopics = this.extractTechnicalTopics(entry.transcription || '');
                return currentTopics.some(topic => 
                    entryTopics.some(eTopic => eTopic.category === topic.category)
                );
            })
            .slice(-2); // Last 2 related entries
        
        if (relatedEntries.length > 0) {
            const contextContent = relatedEntries
                .map(entry => `Q: ${entry.transcription}`)
                .join('\n');
            
            return {
                type: 'technical_thread',
                content: `Related technical discussion:\n${contextContent}`,
                topics: currentTopics,
                entries: relatedEntries.length
            };
        }
        
        return null;
    }
    
    /**
     * Generate comparison context
     */
    generateComparisonContext(currentInput, conversationHistory) {
        // Find entries that might be compared
        const recentEntries = conversationHistory.slice(-3);
        const contextContent = recentEntries
            .map(entry => `Previous: ${entry.transcription}`)
            .join('\n');
        
        return {
            type: 'comparison_context',
            content: `Context for comparison:\n${contextContent}`,
            entries: recentEntries.length
        };
    }
    
    /**
     * Generate direct follow-up context
     */
    generateDirectFollowUpContext(conversationHistory) {
        const lastEntry = conversationHistory.slice(-1)[0];
        
        if (lastEntry) {
            return {
                type: 'immediate_context',
                content: `Previous question: ${lastEntry.transcription}`,
                timestamp: lastEntry.timestamp
            };
        }
        
        return null;
    }
    
    /**
     * Generate reference context
     */
    generateReferenceContext(currentInput, conversationHistory) {
        // Find most likely referenced content
        const recentEntries = conversationHistory.slice(-2);
        const contextContent = recentEntries
            .map((entry, index) => `[${index + 1}] ${entry.transcription}`)
            .join('\n');
        
        return {
            type: 'reference_context',
            content: `Recent context being referenced:\n${contextContent}`,
            entries: recentEntries.length
        };
    }
    
    /**
     * Detect if input introduces a completely new topic
     */
    detectsNewTopicIntroduction(text) {
        const lowerText = text.toLowerCase();
        
        // Strong indicators of new topic introduction
        const newTopicIndicators = [
            'can you explain',
            'what is',
            'tell me about',
            'how does',
            'explain the concept',
            'define',
            'describe'
        ];
        
        // Check if text starts with new topic indicators
        const startsWithNewTopic = newTopicIndicators.some(indicator => 
            lowerText.startsWith(indicator)
        );
        
        // Check if introduces a new algorithm/concept name
        const algorithmNames = [
            'merge sort', 'quick sort', 'heap sort', 'bubble sort',
            'insertion sort', 'selection sort', 'counting sort',
            'breadth first search', 'depth first search',
            'dijkstra', 'floyd', 'kruskal', 'prim'
        ];
        
        const mentionsNewAlgorithm = algorithmNames.some(algo => 
            lowerText.includes(algo)
        );
        
        return startsWithNewTopic || mentionsNewAlgorithm;
    }
    extractTechnicalTopics(text) {
        const topics = [];
        const lowerText = text.toLowerCase();
        
        for (const [category, keywords] of Object.entries(this.technicalTopics)) {
            const matches = keywords.filter(keyword => lowerText.includes(keyword));
            if (matches.length > 0) {
                topics.push({
                    category,
                    keywords: matches,
                    relevance: matches.length / keywords.length
                });
            }
        }
        
        return topics;
    }
    
    /**
     * Calculate context priority
     */
    calculateContextPriority(classification) {
        const priorityMap = {
            'clarification': 'high',
            'technical_deep_dive': 'medium',
            'comparison': 'medium',
            'direct_follow_up': 'high',
            'contextual_reference': 'low'
        };
        
        return priorityMap[classification.type] || 'low';
    }
    
    /**
     * Update conversation threads
     */
    updateConversationThreads(currentInput, classification, contextAnalysis) {
        const currentTopics = this.extractTechnicalTopics(currentInput);
        
        // Update active topics
        currentTopics.forEach(topic => {
            this.activeTopics.add(topic.category);
        });
        
        // Store last question context
        this.lastQuestionContext = {
            input: currentInput,
            classification,
            topics: currentTopics,
            timestamp: Date.now()
        };
        
        // Clean up old active topics (older than 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (this.lastQuestionContext.timestamp < fiveMinutesAgo) {
            this.activeTopics.clear();
        }
    }
    
    /**
     * Get recent topics from conversation history
     */
    getRecentTopics(recentEntries) {
        const topics = new Set();
        
        recentEntries.forEach(entry => {
            const entryTopics = this.extractTechnicalTopics(entry.transcription || '');
            entryTopics.forEach(topic => topics.add(topic.category));
        });
        
        return Array.from(topics);
    }
    
    /**
     * Create empty result for non-follow-up questions
     */
    createEmptyResult() {
        return {
            isFollowUp: false,
            confidence: 0,
            followUpType: 'independent',
            patterns: [],
            contextRecommendation: null,
            technicalTopics: [],
            threadRelationship: null,
            metrics: {
                totalClassifications: this.metrics.totalClassifications,
                followUpDetections: this.metrics.followUpDetections
            }
        };
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            followUpDetectionRate: this.metrics.totalClassifications > 0 
                ? (this.metrics.followUpDetections / this.metrics.totalClassifications) 
                : 0,
            contextInjectionRate: this.metrics.followUpDetections > 0
                ? (this.metrics.contextInjections / this.metrics.followUpDetections)
                : 0,
            activeTopics: Array.from(this.activeTopics),
            lastQuestionContext: this.lastQuestionContext
        };
    }
    
    /**
     * Reset session for new interview
     */
    resetSession() {
        this.questionThreads = [];
        this.activeTopics.clear();
        this.lastQuestionContext = null;
        this.metrics = {
            totalClassifications: 0,
            followUpDetections: 0,
            contextInjections: 0,
            accuracyFeedback: []
        };
        
        console.log('🔄 Enhanced Follow-Up Classifier: Session reset for new interview');
    }
    
    /**
     * Provide feedback on classification accuracy (for future improvements)
     */
    provideFeedback(wasAccurate, actualType = null) {
        this.metrics.accuracyFeedback.push({
            wasAccurate,
            actualType,
            timestamp: Date.now()
        });
        
        // Keep only recent feedback (last 50 entries)
        if (this.metrics.accuracyFeedback.length > 50) {
            this.metrics.accuracyFeedback.shift();
        }
    }
}

// Export singleton instance
const enhancedFollowUpClassifier = new EnhancedFollowUpClassifier();
module.exports = enhancedFollowUpClassifier;