const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenAI } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const { getMultipleNotionContents } = require('./notion');
const apiKeyManagerInstance = require('./apiKeyManager');
const enhancedDebounceManager = require('./enhancedDebounceManager');
const smartRequestManager = require('./smartRequestManager');
const contextBoundaryOptimizer = require('./contextBoundaryOptimizer');
const audioQualityAssurance = require('./audioQualityAssurance');
const performanceMonitor = require('./performanceMonitor');
const enhancedFollowUpClassifier = require('./enhancedFollowUpClassifier');
const { sendMessageToOpenRouter } = require('./openrouter');

// Conversation tracking variables
let currentSessionId = null;
let speakerCurrentTranscription = '';
let conversationHistory = [];
let isInitializingSession = false;
let isInitializingMicrophoneSession = false;
let isMicrophoneActive = false;
let isSpeakerDetectionEnabled = true; // Default to enabled

// API key management
let apiKeyManager = null;

// Audio capture variables
let systemAudioProc = null;
let messageBuffer = '';

// Microphone session variables
let microphoneSessionRef = { current: null };
let microphoneTranscription = '';
let microphoneConversationHistory = [];
let speakerTranscription = '';
let speakerConversationHistory = [];
let microphoneWordCount = 0;
let isProcessingTextMessage = false;
const MAX_MICROPHONE_WORDS = 200;

// Input debouncing variables to prevent interrupted responses
let inputDebounceTimer = null;
let pendingInput = '';
const INPUT_DEBOUNCE_DELAY = 5000; // 5 seconds delay to wait for complete input (FALLBACK)

// Enhanced debounce system for technical interview optimization
let vadAdaptiveData = null; // VAD data from AudioWorklet
let enhancedDebounceEnabled = true; // Feature flag for easy rollback

// Context and question queue management variables
let contextAccumulator = '';
let lastQuestionTime = null;
let isAiResponding = false;
let questionQueue = [];
const CONTEXT_RESET_TIMEOUT = 60000; // 1 minute context window
const QUESTION_WORDS = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did', 'will', 'have', 'has', 'define'];
const REFERENCE_WORDS = ['it', 'this', 'that', 'they', 'them', 'these', 'those', 'also', 'and', 'but', 'however', 'moreover', 'furthermore'];

// Response reconstruction variables
let responseSegments = [];
let lastValidSegment = '';
let corruptionDetected = false;
const SEGMENT_SIZE = 50; // Reduced size for more frequent backups to prevent corruption

// Response timing tracking
let requestStartTime = null;
let lastResponseTime = null;

// Reconnection tracking variables
let reconnectionAttempts = 0;
let maxReconnectionAttempts = 3;
let reconnectionDelay = 2000; // 2 seconds between attempts
let lastSessionParams = null;

// Flag to suppress rendering during reconnection
let isSuppressingRender = false;
// Abort management for in-flight Gemini requests
let currentAbortController = null;
let currentConversationId = null;

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    const sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                         .replace(/[\uFFFD\uFEFF]/g, '')
                         .replace(/[\u200B-\u200D\uFEFF]/g, '')
                         .trim();
    
    return sanitized;
}

// --- Prompt size & history management ---
const MAX_TURNS_IN_HISTORY = 25;
const MAX_SUMMARY_CHAR = 800;
function summariseHistoryIfNeeded() {
    if (conversationHistory.length <= MAX_TURNS_IN_HISTORY) return;
    // Keep most recent 10 turns intact, summarise older ones
    const preserveCount = 10;
    const toSummarise = conversationHistory.splice(0, conversationHistory.length - preserveCount);
    const aggregated = toSummarise.map(t=>t.transcription).join(' ').slice(0, MAX_SUMMARY_CHAR);
    conversationHistory.unshift({
        timestamp: Date.now(),
        transcription: `Summary: ${aggregated}`,
        type: 'summary',
        processed: true
    });
}

// --- Metrics collection ---
const metricsLog = [];
let lastAiRequestStart = null;
function recordMetric(event, data = {}) {
    metricsLog.push({ event, ...data, timestamp: Date.now() });
    console.log('📈 [Metrics collection]', event, data);
}
function computeQualityScore(responseText) {
    const len = responseText.trim().split(/\s+/).length;
    return Math.min(1, len / 150);
}

// Generic Gemini input sender with exponential backoff retry
async function sendInputWithRetry(session, payload, maxRetries = 3, baseDelayMs = 500) {
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            return await session.sendRealtimeInput(payload);
        } catch (err) {
            attempt++;
            if (attempt > maxRetries) throw err;
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            console.warn(`🔁 [RETRY] Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms`, err.message || err);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

function performTextRequest(text, session) {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    currentConversationId = uuidv4();
    lastAiRequestStart = Date.now();
    recordMetric('ai_request_start', { conversationId: currentConversationId, textLength: text.length });
    return sendInputWithRetry(session, { text, conversationId: currentConversationId, signal: currentAbortController.signal });
}

// Question detection and context management functions
function isCompleteQuestion(text) {
    if (!text || text.trim().length < 3) return false;
    
    const trimmedText = text.trim().toLowerCase();
    
    // Check for question marks or rising intonation indicators
    if (trimmedText.includes('?')) return true;
    
    // Check for question words at the beginning
    const words = trimmedText.split(/\s+/);
    const firstWord = words[0];
    
    if (QUESTION_WORDS.includes(firstWord)) {
        // Simple heuristic: question word + at least 3 more words
        return words.length >= 4;
    }
    
    return false;
}

// Enhanced completeness heuristic combining classic question detection with buffer thresholds
const MAX_BUFFER_WORDS = 40; // Force send if buffer hits this word count
const MAX_BUFFER_CHARS = 200; // Fallback char limit
function isSemanticallyComplete(text) {
    if (!text || text.trim().length === 0) return false;
    const trimmed = text.trim();
    // If classic rules say it's a complete question, respect that
    if (isCompleteQuestion(trimmed)) return true;
    // Force-trigger if buffer grows too large (prevents endless accumulation)
    const words = trimmed.split(/\s+/);
    if (words.length >= MAX_BUFFER_WORDS) return true;
    if (trimmed.length >= MAX_BUFFER_CHARS) return true;
    // Trigger on explicit punctuation end even without leading question word
    if (/[\?\.!]$/.test(trimmed)) return true;
    return false;
}

function isFollowUpQuestion(text) {
    if (!text || text.trim().length < 3) return false;
    
    const trimmedText = text.trim().toLowerCase();
    const words = trimmedText.split(/\s+/);
    
    // Check for reference words that indicate follow-up
    const hasReference = REFERENCE_WORDS.some(ref => words.includes(ref));
    
    // Check if it's also a complete question
    const isQuestion = isCompleteQuestion(text);
    
    return hasReference && isQuestion;
}

function shouldResetContext() {
    if (!lastQuestionTime) return false;
    
    const timeSinceLastQuestion = Date.now() - lastQuestionTime;
    return timeSinceLastQuestion > CONTEXT_RESET_TIMEOUT;
}

function shouldInterrupt(newInput) {
    // Only interrupt if AI is currently responding and new input is a complete question
    return isAiResponding && isCompleteQuestion(newInput);
}

async function processQuestionQueue(geminiSession) {
    if (questionQueue.length === 0 || isAiResponding) return;
    
    console.log('🔍 [QUEUE_VALIDATION] Validating question queue before processing');
    
    // Enforce complete context boundary before processing new questions
    enforceContextBoundary();
    
    // Validate and clean question queue
    const validQuestions = questionQueue.filter(q => q && q.trim().length > 0);
    if (validQuestions.length === 0) {
        console.log('⚠️ [QUEUE_VALIDATION] No valid questions found in queue');
        questionQueue = [];
        return;
    }
    
    // Combine all queued questions with proper separation
    const combinedQuestions = validQuestions.join(' ').trim();
    
    // Check for duplicate questions against recent conversation history
    const isDuplicateQuestion = conversationHistory.some(entry => {
        const similarity = entry.transcription.trim() === combinedQuestions.trim() ||
                          entry.transcription.includes(combinedQuestions.trim()) ||
                          combinedQuestions.includes(entry.transcription.trim());
        const isRecent = (Date.now() - entry.timestamp) < 20000; // Within 20 seconds
        return similarity && isRecent;
    });
    
    if (isDuplicateQuestion) {
        console.log('🚫 [DUPLICATE_QUESTION] Skipping duplicate question processing:', combinedQuestions.substring(0, 100) + '...');
        questionQueue = []; // Clear the queue
        return;
    }
    
    questionQueue = []; // Clear the queue
    
    console.log('✅ [QUEUE_VALIDATION] Processing validated combined questions:', combinedQuestions.substring(0, 100) + '...');
    
    // Send combined questions to AI
    await sendCombinedQuestionsToAI(combinedQuestions, geminiSession);
}

async function sendCombinedQuestionsToAI(combinedText, geminiSession) {
    if (!geminiSession || !combinedText.trim()) {
        console.log('⚠️ [AI_REQUEST] Invalid session or empty text, aborting request');
        return;
    }
    
    console.log('🚀 [AI_REQUEST] Preparing to send new AI request with Smart Request Management');
    
    // ENHANCED: Use Enhanced Follow-Up Classifier for intelligent context detection
    const followUpAnalysis = enhancedFollowUpClassifier.classifyFollowUp(
        combinedText,
        conversationHistory,
        global.latestInterviewContext
    );
    
    console.log(`🔗 [FOLLOW_UP_ANALYSIS] Is Follow-Up: ${followUpAnalysis.isFollowUp}, Confidence: ${followUpAnalysis.confidence.toFixed(2)}, Type: ${followUpAnalysis.followUpType}`);
    if (followUpAnalysis.isFollowUp) {
        console.log(`🔗 [FOLLOW_UP_PATTERNS] Matched: ${followUpAnalysis.patterns.join(', ')}`);
        console.log(`🔗 [FOLLOW_UP_TOPICS] Technical Topics: ${followUpAnalysis.technicalTopics.map(t => t.category).join(', ')}`);
    }
    
    // ENHANCED: Use Smart Request Manager for intelligent processing
    try {
        // Gather context for smart analysis
        const requestContext = {
            interviewContext: global.latestInterviewContext || null,
            vadData: vadAdaptiveData || null,
            isAiCurrentlyResponding: isAiResponding,
            sessionPhase: getSessionPhase(),
            conversationHistory: conversationHistory.slice(-3), // Recent context
            followUpAnalysis: followUpAnalysis // Enhanced follow-up detection
        };
                
        // ENHANCED: Use Context Boundary Optimizer for improved context management
        const contextOptimization = contextBoundaryOptimizer.processInput(
            combinedText,
            requestContext.interviewContext,
            conversationHistory
        );
                
        console.log(`🧠 [CONTEXT_OPTIMIZATION] Phase: ${contextOptimization.currentPhase}, Boundary: ${contextOptimization.boundaryDecision.createBoundary}, Topics: ${contextOptimization.activeTopics.length}`);
                
        // Include optimized context in request context
        requestContext.contextOptimization = contextOptimization;
        requestContext.optimizedContext = contextOptimization.optimizedContext;
        
        // Create the request function that Smart Request Manager will execute
        const executeGeminiRequest = async (abortSignal) => {
            // Preserve existing request setup logic
            currentAbortController = new AbortController();
            currentConversationId = `${Date.now()}-${Math.random().toString(36).substring(2,8)}`;
            
            // Clear any pending debounce timer
            if (inputDebounceTimer) {
                clearTimeout(inputDebounceTimer);
                inputDebounceTimer = null;
                pendingInput = '';
            }
            
            // Ensure complete buffer cleanup and context isolation
            cleanupResponseBuffer();
            messageBuffer = '';
            
            // Force new response counter
            if (!isSuppressingRender) {
                sendToRenderer('new-response-starting');
            }
            
            isAiResponding = true;
            isProcessingTextMessage = true;
            lastQuestionTime = Date.now();
            
            // Record request details
            requestStartTime = Date.now();
            const timestamp = new Date(requestStartTime).toISOString();
            console.log('🔄 [SMART_REQUEST] Starting AI request with intelligent management');
            console.log('⏰ [TRANSCRIPT_SENT] Timestamp:', timestamp);
            console.log('📝 [TRANSCRIPT_SENT] Full transcript sent to Gemini:');
            console.log('📄 [TRANSCRIPT_CONTENT]', combinedText.trim());
            
            // Save to conversation history immediately
            conversationHistory.push({
                timestamp: requestStartTime,
                transcription: combinedText.trim(),
                type: 'user_request',
                processed: true
            });
            
            // Execute the actual Gemini request with metrics
            lastAiRequestStart = Date.now();
            
            // ENHANCED: Prepare request with optimized context and follow-up intelligence
            let requestText = combinedText.trim();
            let contextSources = [];
            
            recordMetric('ai_request_start', { 
                conversationId: currentConversationId, 
                textLength: combinedText.length,
                smartManaged: true,
                contextOptimized: true,
                interviewPhase: requestContext.contextOptimization?.currentPhase,
                activeTopics: requestContext.contextOptimization?.activeTopics?.length || 0,
                followUpDetected: followUpAnalysis.isFollowUp,
                followUpType: followUpAnalysis.followUpType,
                followUpConfidence: followUpAnalysis.confidence,
                contextSources: contextSources.length
            });
            
            // Include optimized context if available and beneficial
            if (requestContext.optimizedContext && 
                requestContext.contextOptimization?.inputAnalysis?.requiresContext) {
                requestText = `${requestContext.optimizedContext}\n\nCurrent question: ${combinedText.trim()}`;
                contextSources.push('boundary_optimizer');
                console.log(`🧠 [CONTEXT_ENHANCED] Added optimized context (${requestContext.optimizedContext.length} chars)`);
            }
            
            // ENHANCED: Include follow-up specific context when detected
            if (followUpAnalysis.isFollowUp && followUpAnalysis.contextRecommendation) {
                const followUpContext = followUpAnalysis.contextRecommendation;
                
                if (followUpContext.shouldIncludeContext && followUpContext.suggestedContext) {
                    const contextPrefix = contextSources.length > 0 ? '\n\nAdditional context for follow-up:\n' : '';
                    const followUpContextText = `${contextPrefix}${followUpContext.suggestedContext.content}`;
                    
                    // Avoid duplicate context - only add if not already included
                    if (!requestText.includes(followUpContext.suggestedContext.content.substring(0, 50))) {
                        requestText = contextSources.length > 0 
                            ? `${requestText}${followUpContextText}\n\nFollow-up question: ${combinedText.trim()}`
                            : `${followUpContextText}\n\nCurrent question: ${combinedText.trim()}`;
                        
                        contextSources.push('follow_up_classifier');
                        console.log(`🔗 [FOLLOW_UP_CONTEXT] Added ${followUpContext.contextType} context (${followUpContext.suggestedContext.content.length} chars, priority: ${followUpContext.priority})`);
                        console.log(`🔗 [FOLLOW_UP_REASONING] ${followUpContext.reasoning.join(', ')}`);
                    } else {
                        console.log(`🔗 [FOLLOW_UP_CONTEXT] Skipped - similar context already included`);
                    }
                }
            }
            
            console.log(`📝 [CONTEXT_SUMMARY] Total context sources: ${contextSources.join(', ') || 'none'}, Final request length: ${requestText.length} chars`);
            
            // Check if Enhanced Responses is enabled and current AI provider is Gemini
            const enhancedResponsesEnabled = await getStoredSetting('enhancedResponsesEnabled', false);
            const selectedAiModel = await getStoredSetting('selectedAiModel', 'gemini');
            
            console.log(`🔍 [ENHANCED_RESPONSES_DEBUG] enhancedResponsesEnabled: ${enhancedResponsesEnabled}, selectedAiModel: ${selectedAiModel}`);
            
            if (enhancedResponsesEnabled && selectedAiModel === 'gemini') {
                console.log('🚀 [ENHANCED_RESPONSES] Routing to OpenRouter instead of Gemini');
                
                // Get OpenRouter settings
                const openRouterModel = await getStoredSetting('openRouterModel', 'google/gemini-2.5-flash');
                const openRouterTemperature = await getStoredSetting('openRouterTemperature', 0.7);
                const openRouterMaxTokens = await getStoredSetting('openRouterMaxTokens', 4000);
                
                // Route to OpenRouter with the prepared text
                return await sendMessageToOpenRouter(
                    requestText,
                    openRouterModel,
                    openRouterTemperature,
                    openRouterMaxTokens
                );
            }
            
            // Default: send to Gemini
            return await sendInputWithRetry(geminiSession, { 
                text: requestText, 
                conversationId: currentConversationId, 
                signal: abortSignal || currentAbortController.signal 
            });
        };
        
        // Use Smart Request Manager for intelligent processing
        await smartRequestManager.processWithPriority(
            combinedText,
            requestContext,
            executeGeminiRequest
        );
        
        console.log('✅ [SMART_REQUEST] Successfully processed request with intelligent management');
        
    } catch (error) {
        console.error('❌ [SMART_REQUEST_ERROR] Error in smart request processing:', error);
        
        // Fallback to original logic if Smart Request Manager fails
        console.log('🔄 [FALLBACK] Falling back to original request processing');
        
        // Original fallback logic (preserving existing behavior)
        if (currentAbortController) {
            console.log('🛑 [ABORT] Cancelling previous Gemini request');
            currentAbortController.abort();
        }
        
        currentAbortController = new AbortController();
        currentConversationId = `${Date.now()}-${Math.random().toString(36).substring(2,8)}`;
        
        if (inputDebounceTimer) {
            clearTimeout(inputDebounceTimer);
            inputDebounceTimer = null;
            pendingInput = '';
        }
        
        cleanupResponseBuffer();
        messageBuffer = '';
        
        if (!isSuppressingRender) {
            sendToRenderer('new-response-starting');
        }
        
        isAiResponding = true;
        isProcessingTextMessage = true;
        lastQuestionTime = Date.now();
        requestStartTime = Date.now();
        
        conversationHistory.push({
            timestamp: requestStartTime,
            transcription: combinedText.trim(),
            type: 'user_request',
            processed: true
        });
        
        try {
            lastAiRequestStart = Date.now();
            recordMetric('ai_request_start', { 
                conversationId: currentConversationId, 
                textLength: combinedText.length,
                fallbackMode: true
            });
            
            await sendInputWithRetry(geminiSession, { 
                text: combinedText.trim(), 
                conversationId: currentConversationId, 
                signal: currentAbortController.signal 
            });
            
            console.log('✅ [FALLBACK] Successfully sent request using fallback logic');
        } catch (fallbackError) {
            console.error('❌ [FALLBACK_ERROR] Fallback request also failed:', fallbackError);
            isAiResponding = false;
            requestStartTime = null;
            enforceContextBoundary();
            throw fallbackError;
        }
    }
}

// Response buffer cleanup function
function cleanupResponseBuffer() {
    //console.log('🧹 [BUFFER_CLEANUP] Starting comprehensive buffer isolation');
    
    if (messageBuffer && messageBuffer.trim()) {
        //console.log('🧹 [BUFFER_CLEANUP] Clearing interrupted response buffer:', messageBuffer.substring(0, 100) + '...');
        messageBuffer = '';
    }
    
    // Reset any partial response state
    if (global.pendingContextTranscription) {
        //console.log('🧹 [BUFFER_CLEANUP] Clearing pending context transcription');
        global.pendingContextTranscription = null;
    }
    
    // Complete context isolation to prevent bleeding
    resetReconstructionState();
    
    // Clear speaker transcription to prevent context contamination
    if (speakerTranscription && speakerTranscription.trim()) {
        //console.log('🧹 [BUFFER_CLEANUP] Clearing speaker transcription to prevent context bleeding');
        speakerTranscription = '';
    }
    
    // Reset AI responding state
    isAiResponding = false;
    corruptionDetected = false;
    
    //console.log('✅ [BUFFER_CLEANUP] Complete buffer isolation achieved');
}

// Response integrity check function
function validateResponseIntegrity(responseText) {
    if (!responseText || typeof responseText !== 'string') {
        console.warn('⚠️ [INTEGRITY_CHECK] Invalid response type:', typeof responseText);
        return { isValid: false, issues: ['Invalid response type'] };
    }
    
    const issues = [];
    
    // Check for unclosed HTML spans
    const openSpans = (responseText.match(/<span[^>]*>/g) || []).length;
    const closeSpans = (responseText.match(/<\/span>/g) || []).length;
    if (openSpans !== closeSpans) {
        issues.push(`Mismatched span tags: ${openSpans} open, ${closeSpans} close`);
    }
    
    // Check for malformed span attributes
    const malformedSpans = responseText.match(/<span[^>]*class='[^']*<span/g);
    if (malformedSpans) {
        issues.push(`Malformed span attributes: ${malformedSpans.length} instances`);
    }
    
    // Check for character encoding issues
    const encodingIssues = responseText.match(/[ΓÖªαñ]/g);
    if (encodingIssues) {
        issues.push(`Character encoding issues: ${encodingIssues.length} corrupted characters`);
    }
    
    // Check for abrupt content switches (incomplete sentences)
    const abruptSwitches = responseText.match(/[a-z]<span class='chunk-[ab]'>[A-Z]/g);
    if (abruptSwitches) {
        issues.push(`Abrupt content switches: ${abruptSwitches.length} instances`);
    }
    
    const isValid = issues.length === 0;
    
    if (!isValid) {
        console.warn('⚠️ [INTEGRITY_CHECK] Response integrity issues detected:', issues);
    } else {
        //console.log('✅ [INTEGRITY_CHECK] Response integrity validated successfully');
    }
    
    return { isValid, issues };
}

// Response reconstruction functions
function saveResponseSegment(text) {
    // Save clean segments for reconstruction
    if (text && text.length >= SEGMENT_SIZE) {
        const integrity = validateResponseIntegrity(text);
        if (integrity.isValid) {
            lastValidSegment = text;
            responseSegments.push({
                content: text,
                timestamp: Date.now(),
                length: text.length
            });
            console.log('💾 [SEGMENT_BACKUP] Saved clean segment:', text.length, 'characters');
        }
    }
}

// DISABLED: Corruption detection temporarily commented out
// function detectStreamingCorruption(currentBuffer, newText) {
//     // Enhanced corruption detection for streaming responses
//     const combinedText = currentBuffer + newText;
//     
//     // Enhanced corruption patterns based on observed issues
//     const corruptionPatterns = [
//         // HTML structure corruption
//         /<span\s+class='chunk<span/,           // Nested span corruption
//         /<span\s+class="[^"]*<span/,          // Nested spans with quotes
//         /\w<span\s+class=/,                   // Missing space before span
//         /<spanclass=/,                        // Missing space in span tag
//         /<span[^>]*<span/,                    // Overlapping span tags
//         
//         // Missing spaces and word concatenation
//         /[a-z][A-Z]/,                         // camelCase without spaces
//         /[a-z]\d/,                            // letter followed by number
//         /\d[a-z]/,                            // number followed by letter
//         /[a-z]{2,}[A-Z][a-z]/,               // word concatenation patterns
//         /ends[A-Z]/,                          // specific pattern from logs
//         /cuta[A-Z]/,                          // specific pattern from logs
//         
//         // Malformed HTML attributes
//         /class="[^"]*[^"\s]</,               // incomplete class attributes
//         /span class="[^"]*$/,                 // incomplete span opening
//         /<span[^>]*$/,                        // incomplete span tags
//         
//         // Character encoding issues
//         /[ΓÖªαñ]/,                            // encoding corruption
//         /[\u0000-\u001F\u007F-\u009F]/,        // control characters
//         
//         // Context bleeding detection
//         /measure 45.*container/,              // mixing wire and container puzzles
//         /45.*minutes.*liter/,                 // mixing time and volume contexts
//         /wire.*burn.*pour/                    // mixing different problem contexts
//     ];
//     
//     for (const pattern of corruptionPatterns) {
//         if (pattern.test(combinedText)) {
//             console.warn('🚨 [CORRUPTION_DETECTED] Enhanced pattern found:', pattern.source);
//             console.warn('🚨 [CORRUPTION_CONTEXT] Buffer:', currentBuffer.substring(-50));
//             console.warn('🚨 [CORRUPTION_CONTEXT] New text:', newText);
//             return true;
//         }
//     }
//     
//     return false;
// }

// Temporary replacement function that always returns false (no corruption detected)
function detectStreamingCorruption(currentBuffer, newText) {
    return false; // Corruption detection disabled
}

// DISABLED: Response reconstruction function
// function reconstructResponse() {
//     console.log('🔧 [RECONSTRUCTION] Starting response reconstruction');
//     
//     if (responseSegments.length === 0) {
//         console.warn('⚠️ [RECONSTRUCTION] No clean segments available for reconstruction');
//         return null;
//     }
//     
//     // Use the most recent valid segment as base
//     const latestSegment = responseSegments[responseSegments.length - 1];
//     console.log('🔧 [RECONSTRUCTION] Using latest clean segment:', latestSegment.length, 'characters');
//     
//     // Clear corruption flag
//     corruptionDetected = false;
//     
//     return latestSegment.content;
// }

// Temporary replacement function that returns null (no reconstruction)
function reconstructResponse() {
    return null; // Reconstruction disabled
}

// DISABLED: Reset reconstruction state function
// function resetReconstructionState() {
//     responseSegments = [];
//     lastValidSegment = '';
//     corruptionDetected = false;
//     console.log('🧹 [RECONSTRUCTION] Reset reconstruction state');
// }

// Temporary replacement function that does nothing
function resetReconstructionState() {
    // Reconstruction state reset disabled
}

// Complete context isolation function to prevent context bleeding
function enforceContextBoundary() {
    summariseHistoryIfNeeded();
    console.log('🚧 [CONTEXT_BOUNDARY] Enforcing complete context isolation');
    
    // Clear all response-related buffers
    messageBuffer = '';
    
    // Clear context accumulator to prevent question mixing
    if (contextAccumulator && contextAccumulator.trim()) {
        console.log('🚧 [CONTEXT_BOUNDARY] Clearing context accumulator to prevent question mixing');
        contextAccumulator = '';
    }
    
    // Reset reconstruction state
    resetReconstructionState();
    
    // Clear any pending transcriptions
    if (global.pendingContextTranscription) {
        global.pendingContextTranscription = null;
    }
    
    // Reset AI state
    isAiResponding = false;
    
    console.log('✅ [CONTEXT_BOUNDARY] Context boundary enforced - clean slate achieved');
}

// Conversation management functions
function initializeNewSession() {
    currentSessionId = Date.now().toString();
    currentTranscription = '';
    conversationHistory = [];
    console.log('New conversation session started:', currentSessionId);
}

function saveConversationTurn(transcription, aiResponse, isSuppressed = false) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const conversationTurn = {
        timestamp: Date.now(),
        transcription: transcription.trim(),
        ai_response: aiResponse.trim(),
        is_suppressed: isSuppressed,
    };

    conversationHistory.push(conversationTurn);
    console.log('Saved conversation turn:', conversationTurn);

    // Send to renderer to save in IndexedDB
    sendToRenderer('save-conversation-turn', {
        sessionId: currentSessionId,
        turn: conversationTurn,
        fullHistory: conversationHistory,
        isSuppressed: isSuppressed,
    });
}

function getCurrentSessionData() {
    return {
        sessionId: currentSessionId,
        history: conversationHistory,
    };
}

// Microphone session management functions
async function initializeMicrophoneSession(apiKey, profile = 'interview', language = 'en-IN') {
    
    if (isInitializingMicrophoneSession) {
        return false;
    }
    
    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
    });

    isInitializingMicrophoneSession = true;

    const systemPrompt = `You are a transcription jarvis. Your only job is to transcribe audio input accurately. Do not provide responses or commentary, only transcribe what you hear.`;

    try {
        const session = await client.live.connect({
            model: 'gemini-live-2.5-flash-preview',
            callbacks: {
                onopen: function () {
                    console.log('Microphone transcription session connected');
                },
                onmessage: function (message) {
                    console.log('🎤 Microphone session message received:', message);
                    // Handle transcription input for microphone
                    if (message.serverContent?.inputTranscription?.text) {
                        const transcriptionText = message.serverContent.inputTranscription.text;
                        console.log('🗣️ Transcription text found:', JSON.stringify(transcriptionText));
                        
                        // Sanitize the transcription text to remove corrupted characters
                        //const transcriptionText = sanitizeText(rawTranscriptionText);
                        
                        // Skip if sanitization resulted in empty text
                        if (!transcriptionText || transcriptionText.trim().length === 0) {
                            console.log('⚠️ Empty transcription text, skipping');
                            return;
                        }

                        // Prevent duplicate transcriptions by checking recent history
                        const isDuplicate = microphoneConversationHistory.some(entry => 
                            entry.transcription === transcriptionText && 
                            (Date.now() - entry.timestamp) < 2000 // Within 2 seconds
                        );

                        if (!isDuplicate) {
                            microphoneTranscription += transcriptionText + ' ';
                            console.log('✅ Added to microphoneTranscription:', JSON.stringify(transcriptionText));
                            console.log('📝 Current microphoneTranscription length:', microphoneTranscription.length);
                            
                            // Count words and manage cleanup
                            const words = microphoneTranscription.trim().split(/\s+/);
                            microphoneWordCount = words.length;
                            
                            // Clean up if exceeding word limit
                            if (microphoneWordCount > MAX_MICROPHONE_WORDS) {
                                const excessWords = microphoneWordCount - MAX_MICROPHONE_WORDS;
                                const remainingWords = words.slice(excessWords);
                                microphoneTranscription = remainingWords.join(' ') + ' ';
                                microphoneWordCount = remainingWords.length;
                            }
                            
                            // Save to microphone conversation history
                            microphoneConversationHistory.push({
                                timestamp: Date.now(),
                                transcription: transcriptionText,
                                type: 'microphone'
                            });

                            // Send transcription update to renderer for progressive transcript display
                            console.log('Sending transcription update to renderer:', transcriptionText);
                            sendToRenderer('microphone-transcription-update', {
                                text: transcriptionText,
                                isFinal: false // Gemini sends partial transcriptions
                            });

                            //console.log(microphoneConversationHistory);
                        }
                    } else {
                        console.log('No transcription text found in message');
                    }
                },
                onerror: function (e) {
                    console.error('Microphone session error:', e.message);
                },
                onclose: function (e) {
                    console.log('Microphone session closed:', e.reason);
                },
            },
            config: {
                responseModalities: ['TEXT'], // Need TEXT modality to receive transcription
                inputAudioTranscription: {},
                speechConfig: { languageCode: language },
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                },
            },
        });

        isInitializingMicrophoneSession = false; // Reset flag on success
        return session;
    } catch (error) {
        console.error('Failed to initialize microphone session:', error);
        isInitializingMicrophoneSession = false; // Reset flag on error
        return null;
    }
}

function getMicrophoneTranscription() {
    return microphoneTranscription.trim();
}

function clearMicrophoneTranscription() {
    microphoneTranscription = '';
    microphoneWordCount = 0;
}

// Speaker transcription functions
function getSpeakerTranscription() {
    return currentTranscription.trim();
}

function clearSpeakerTranscription() {
    currentTranscription = '';
}

// Microphone state management
function setMicrophoneActive(active) {
    isMicrophoneActive = active;
}

function isMicrophoneCurrentlyActive() {
    return isMicrophoneActive;
}

// Speaker detection state management
async function setSpeakerDetectionEnabled(enabled) {
    console.log('Speaker detection toggle shortcut triggered');
    
    // If speaker detection is being disabled, process any pending input immediately
    if (!enabled) {
        // Wait for any ongoing AI processing to complete before toggling
        if (isAiResponding) {
            console.log('⏳ [SPEAKER_TOGGLE] Waiting for ongoing AI response to complete before toggling off...');
            // Wait up to 10 seconds for AI response to complete
            let waitCount = 0;
            while (isAiResponding && waitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
            if (isAiResponding) {
                console.log('⚠️ [SPEAKER_TOGGLE] AI response still ongoing after 10 seconds, proceeding with toggle');
            } else {
                console.log('✅ [SPEAKER_TOGGLE] AI response completed, proceeding with toggle');
            }
        }
        
        await processPendingSpeakerInput();
        
        // Wait a brief moment to ensure processing completes
        await new Promise(resolve => setTimeout(resolve, 500));
    } else {
        // If speaker detection is being enabled, clear any stale state to prevent duplication
        // This prevents processing the same audio content that was already handled when toggled off
        if (inputDebounceTimer) {
            clearTimeout(inputDebounceTimer);
            inputDebounceTimer = null;
        }
        pendingInput = '';
        contextAccumulator = '';
        speakerCurrentTranscription = ''; // Clear accumulated speaker transcription
        speakerTranscription = ''; // Clear speaker transcription buffer
        questionQueue = []; // Clear any queued questions
        
        // Clear recent speaker conversation history to prevent duplicate processing
        const cutoffTime = Date.now() - 10000; // Keep only entries older than 10 seconds
        speakerConversationHistory = speakerConversationHistory.filter(entry => entry.timestamp < cutoffTime);
        
        console.log('🔄 [SPEAKER_DETECTION_ON] Cleared stale audio state, transcription, and recent history to prevent duplication');
    }
    
    // Set the speaker detection state after processing is complete
    isSpeakerDetectionEnabled = enabled;
    console.log(`🎯 [SPEAKER_DETECTION] Speaker detection ${enabled ? 'enabled' : 'disabled'} successfully`);
}

async function processPendingSpeakerInput() {
    if (pendingInput.trim()) {
        console.log('🔄 [PENDING_INPUT_PROCESSING] Processing pending input on speaker detection toggle:', pendingInput.trim());
        
        // Clear existing debounce timer
        if (inputDebounceTimer) {
            clearTimeout(inputDebounceTimer);
            inputDebounceTimer = null;
        }
        
        // Enhanced duplicate check - prevent processing same content that was recently processed
        const isDuplicateContent = speakerConversationHistory.some(entry => {
            const similarity = entry.transcription.trim() === pendingInput.trim() ||
                              entry.transcription.includes(pendingInput.trim()) ||
                              pendingInput.includes(entry.transcription.trim());
            const isRecent = (Date.now() - entry.timestamp) < 10000; // Within 10 seconds
            return similarity && isRecent;
        });
        
        if (isDuplicateContent) {
            console.log('🚫 [DUPLICATE_PREVENTION] Skipping duplicate pending input processing');
            pendingInput = '';
            return;
        }
        
        // Check if context should be reset
        if (shouldResetContext()) {
            contextAccumulator = '';
            questionQueue = [];
        }
        
        // Add to context accumulator
        contextAccumulator += pendingInput + ' ';
        
        // When speaker detection is toggled off, always send accumulated input to Gemini
        // regardless of whether it's a complete question
        if (contextAccumulator.trim()) {
            // Add to question queue
            questionQueue.push(contextAccumulator.trim());
            
            // Process the queue if AI is not responding and session is available
            if (!isAiResponding && global.geminiSessionRef?.current) {
                await processQuestionQueue(global.geminiSessionRef.current);
                
                // Wait for AI response to complete before returning
                if (isAiResponding) {
                    console.log('⏳ [PENDING_INPUT] Waiting for AI response to complete...');
                    let waitCount = 0;
                    while (isAiResponding && waitCount < 150) { // Wait up to 15 seconds
                        await new Promise(resolve => setTimeout(resolve, 100));
                        waitCount++;
                    }
                    if (isAiResponding) {
                        console.log('⚠️ [PENDING_INPUT] AI response still ongoing after 15 seconds');
                    } else {
                        console.log('✅ [PENDING_INPUT] AI response completed successfully');
                    }
                }
            }
            
            // Reset context for next question
            contextAccumulator = '';
        }
        
        // Save to speaker transcription and conversation history
        speakerTranscription += pendingInput;
        
        // Count words and manage cleanup to retain most recent words
        const words = speakerTranscription.trim().split(/\s+/);
        speakerWordCount = words.length;
        
        // Clean up if exceeding word limit, keep only the most recent words
        if (speakerWordCount > MAX_MICROPHONE_WORDS) {
            const remainingWords = words.slice(-MAX_MICROPHONE_WORDS); // Keep last N words
            speakerTranscription = remainingWords.join(' ') + ' ';
        }
        
        // Save the complete accumulated input to conversation history
        speakerConversationHistory.push({
            timestamp: Date.now(),
            transcription: pendingInput.trim(),
            type: 'speaker'
        });
        
        console.log('✅ [PENDING_INPUT_PROCESSED] Successfully processed and saved pending input');
        
        // Reset pending input
        pendingInput = '';
    }
}

function isSpeakerDetectionCurrentlyEnabled() {
    return isSpeakerDetectionEnabled;
}

async function sendMicrophoneAudioToGemini(base64Data) {
    if (!microphoneSessionRef.current) return;

    try {
        await microphoneSessionRef.current.sendRealtimeInput({
            audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            },
        });
    } catch (error) {
        console.error('Error sending microphone audio to Gemini:', error);
    }
}

async function sendReconnectionContext() {
    if (!global.geminiSessionRef?.current || conversationHistory.length === 0) {
        console.log('No session or conversation history available for reconnection context');
        return;
    }

    try {
        // Gather all transcriptions from the conversation history
        const transcriptions = conversationHistory
            .map(turn => turn.transcription)
            .filter(transcription => transcription && transcription.trim().length > 0);

        if (transcriptions.length === 0) {
            console.log('No valid transcriptions found for reconnection context');
            return;
        }

        // Validate session is ready for text input
        if (typeof global.geminiSessionRef.current.sendRealtimeInput !== 'function') {
            console.error('Session sendRealtimeInput method not available');
            return;
        }

        // Create the context message
        const contextMessage = `Till now all these questions were asked in the interview, provide answer for the last question in this list:\n\n${transcriptions.join('\n')}`;
        console.log('sendReconnectionContext contextMessage: ' + contextMessage);
        
        // Set the pending context transcription for proper conversation saving
        global.pendingContextTranscription = contextMessage;
        
        // Set processing flag to ensure response is handled
        isProcessingTextMessage = true;
        
        // Set flag to suppress rendering during reconnection

        isSuppressingRender = true;

        // Send dummy text for master prompt execution
        await global.geminiSessionRef.current.sendRealtimeInput({
            text: 'dummy text, do not respond.',
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send the context message to the new session
        // await global.geminiSessionRef.current.sendRealtimeInput({
        //     text: contextMessage,
        // });
        
        console.log('Reconnection context sent successfully');
        
        // Reset processing flag after a delay
        setTimeout(() => {
            isProcessingTextMessage = false;

            isSuppressingRender = false;
        }, 5000);
        
    } catch (error) {
        console.error('Error sending reconnection context:', error);
        isProcessingTextMessage = false;
        
        isSuppressingRender = false;
    }
}

async function getEnabledTools() {
    const tools = [];

    // Check if Google Search is enabled (default: true)
    const googleSearchEnabled = await getStoredSetting('googleSearchEnabled', 'true');

    if (googleSearchEnabled === 'true') {
        tools.push({ googleSearch: {} });
    }

    return tools;
}

async function getStoredSetting(key, defaultValue) {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            // Wait a bit for the renderer to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to get setting from renderer process localStorage
            const value = await windows[0].webContents.executeJavaScript(`
                (function() {
                    try {
                        if (typeof localStorage === 'undefined') {
                            return '${defaultValue}';
                        }
                        const stored = localStorage.getItem('${key}');
                        return stored || '${defaultValue}';
                    } catch (e) {
                        return '${defaultValue}';
                    }
                })()
            `);
            return value;
        }
    } catch (error) {
        console.error('Error getting stored setting for', key, ':', error.message);
    }
    return defaultValue;
}

async function attemptReconnection() {
    if (!lastSessionParams || reconnectionAttempts >= maxReconnectionAttempts) {
        sendToRenderer('update-status', 'Session closed');
        return false;
    }

    reconnectionAttempts++;

    // Wait before attempting reconnection
    await new Promise(resolve => setTimeout(resolve, reconnectionDelay));

    // If a session is currently being initialized, wait for it to complete
    let waitAttempts = 0;
    while (isInitializingSession && waitAttempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitAttempts++;
    }

    try {
        console.log('Trying to reconnect: lastSessionParams.customPrompt == ' + lastSessionParams.customPrompt);
        const session = await initializeGeminiSession(
            lastSessionParams.apiKey,
            lastSessionParams.customPrompt,
            lastSessionParams.profile,
            lastSessionParams.language,
            true // isReconnection flag
        );

        if (session && global.geminiSessionRef) {
            global.geminiSessionRef.current = session;
            reconnectionAttempts = 0; // Reset counter on successful reconnection

            await sendReconnectionContext();

            return true;
        }
    } catch (error) {
        console.error(`Reconnection attempt ${reconnectionAttempts} failed:`, error);
    }

    // If this attempt failed, try again
    if (reconnectionAttempts < maxReconnectionAttempts) {
        return attemptReconnection();
    } else {
        sendToRenderer('update-status', 'Session closed');
        return false;
    }
}

async function initializeGeminiSession(apiKeys, customPrompt = '', profile = 'interview', language = 'en-IN', isReconnection = false) {
    if (isInitializingSession) {
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);

    // Initialize API key manager if not already done
    if (!apiKeyManager) {
        apiKeyManager = apiKeyManagerInstance;
        
        // Set API keys (can be comma-separated string or array)
        const keyString = Array.isArray(apiKeys) ? apiKeys.join(',') : apiKeys;
        apiKeyManager.setApiKeys(keyString);
    }

    if (!isReconnection) {
        lastSessionParams = {
            apiKeys,
            customPrompt,
            profile,
            language,
        };
        reconnectionAttempts = 0;
    }

    // Get current API key to use
    const currentApiKey = apiKeyManager.getCurrentApiKey();
    if (!currentApiKey) {
        throw new Error('No valid API keys available');
    }

    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: currentApiKey,
    });

    console.log(`🔑 Using API key: ${currentApiKey.substring(0, 8)}...`);

    const enabledTools = await getEnabledTools();
    const googleSearchEnabled = enabledTools.some(tool => tool.googleSearch);

    //const systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled);

    // Get Notion context if available
    const getNotionContext = async () => {
        try {
            // Get Notion settings from renderer process via IPC
            const windows = BrowserWindow.getAllWindows();
            if (windows.length === 0) {
                return '';
            }
            
            const notionSettings = await windows[0].webContents.executeJavaScript(`
                (function() {
                    try {
                        const notionApiKey = localStorage.getItem('notionApiKey');
                        const notionPagesJson = localStorage.getItem('notionPages');
                        return { notionApiKey, notionPagesJson };
                    } catch (e) {
                        return { notionApiKey: null, notionPagesJson: null };
                    }
                })()
            `);
            
            if (!notionSettings.notionApiKey || !notionSettings.notionPagesJson) {
                return '';
            }
            
            const notionPages = JSON.parse(notionSettings.notionPagesJson);
            if (!notionPages || notionPages.length === 0) {
                return '';
            }
            
            // Use the existing getMultipleNotionContents function
            const result = await getMultipleNotionContents(notionSettings.notionApiKey, notionPages);
            
            if (result && result.success) {
                return result.content || '';
            } else {
                console.error('Error getting Notion content:', result?.error);
                return '';
            }
        } catch (error) {
            console.error('Error getting Notion context:', error);
            return '';
        }
    };

    const notionContext = await getNotionContext();

    const systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled, notionContext);

    if (!isReconnection) {
        initializeNewSession();
    }

    try {
        const session = await client.live.connect({
            model: 'gemini-live-2.5-flash-preview',
            callbacks: {
                onopen: function () {
                    sendToRenderer('update-status', 'Live session connected');
                },
                onmessage: function (message) {
                    //console.log('captured by speaker session');
                    
                    // CRITICAL FIX: Populate speakerCurrentTranscription FIRST before any processing
                    if (message.serverContent?.inputTranscription?.text) {
                        speakerCurrentTranscription += message.serverContent.inputTranscription.text;
                    }
                    
                    // Handle transcription input with debouncing to prevent interrupted responses
                    // Process transcription for both microphone and speaker audio when speaker detection is enabled
                    if(isMicrophoneActive || isSpeakerDetectionEnabled) {
                        if (message.serverContent?.inputTranscription?.text) {
                            let transcriptionText = message.serverContent?.inputTranscription?.text;
                            // Sanitize the transcription text to remove corrupted characters
                            //transcriptionText = sanitizeText(transcriptionText);
                            if (!transcriptionText || transcriptionText.trim().length === 0) {
                                return;
                            }

                            // Check for recent duplicate transcriptions to prevent processing same content
                            const isDuplicateTranscription = speakerConversationHistory.some(entry => 
                                entry.transcription.includes(transcriptionText.trim()) && 
                                (Date.now() - entry.timestamp) < 5000 // Within 5 seconds
                            );
                            
                            if (isDuplicateTranscription) {
                                console.log('🚫 [DUPLICATE_PREVENTION] Skipping duplicate transcription:', transcriptionText.trim());
                                return;
                            }

                            // Clear existing debounce timer
                            if (inputDebounceTimer) {
                                clearTimeout(inputDebounceTimer);
                            }

                            // Accumulate input instead of processing immediately
                            pendingInput += transcriptionText + ' ';

                            // Check if this should interrupt current AI response
                            if (shouldInterrupt(transcriptionText)) {
                                console.log('🚨 [INTERRUPTION_DETECTED] Follow-up question during AI response:', transcriptionText);
                                
                                // Validate and log current response buffer before interruption
                                if (messageBuffer) {
                                    const integrity = validateResponseIntegrity(messageBuffer);
                                    console.log('📊 [INTERRUPTION_ANALYSIS] Current response buffer length:', messageBuffer.length);
                                    console.log('📊 [INTERRUPTION_ANALYSIS] Buffer integrity:', integrity.isValid ? 'VALID' : 'CORRUPTED');
                                    if (!integrity.isValid) {
                                        console.warn('⚠️ [INTERRUPTION_ANALYSIS] Buffer issues:', integrity.issues);
                                    }
                                }
                                
                                // Clean up interrupted response
                                cleanupResponseBuffer();
                                
                                // Add current context and new input to queue
                                if (contextAccumulator.trim()) {
                                    console.log('📝 [QUEUE_MANAGEMENT] Adding context to queue:', contextAccumulator.trim());
                                    questionQueue.push(contextAccumulator.trim());
                                }
                                console.log('📝 [QUEUE_MANAGEMENT] Adding follow-up question to queue:', transcriptionText.trim());
                                questionQueue.push(transcriptionText.trim());
                                
                                // Reset context and process immediately
                                contextAccumulator = '';
                                pendingInput = '';
                                isAiResponding = false;
                                
                               // console.log('🔄 [QUEUE_PROCESSING] Processing combined questions immediately');
                                // Process the combined questions immediately
                                processQuestionQueue(session);
                                return;
                            }
                            
                            // Set new timer to process after delay (wait for complete input)
                            // ENHANCED: Calculate adaptive debounce delay based on context and VAD data
                            let adaptiveDelay = INPUT_DEBOUNCE_DELAY; // Fallback to original 8 seconds
                            
                            if (enhancedDebounceEnabled) {
                                try {
                                    // Use enhanced debounce manager for interview optimization
                                    adaptiveDelay = enhancedDebounceManager.calculateDynamicDebounce(
                                        pendingInput,
                                        vadAdaptiveData,
                                        {
                                            isComplete: isSemanticallyComplete(pendingInput.trim()),
                                            hasQuestionWords: isCompleteQuestion(pendingInput.trim())
                                        }
                                    );
                                    
                                    console.log(`⚡ [ENHANCED_DEBOUNCE] Adaptive delay: ${adaptiveDelay}ms (vs fixed ${INPUT_DEBOUNCE_DELAY}ms)`);
                                } catch (error) {
                                    //console.warn('⚠️ [ENHANCED_DEBOUNCE] Error calculating adaptive delay, using fallback:', error.message);
                                    adaptiveDelay = INPUT_DEBOUNCE_DELAY;
                                }
                            }
                            
                            inputDebounceTimer = setTimeout(() => {
                                if (pendingInput.trim()) {
                                   // console.log('⏰ [DEBOUNCE_PROCESSING] Processing complete input after delay:', pendingInput.trim());
                                    
                                    // Double-check speaker detection is still enabled before processing
                                    if (!isSpeakerDetectionEnabled) {
                                        //console.log('🚫 [DEBOUNCE_SKIP] Speaker detection disabled during debounce, skipping processing');
                                        pendingInput = '';
                                        return;
                                    }
                                    
                                    // CRITICAL FIX: Check if AI is currently responding to prevent duplicate processing
                                    if (isAiResponding) {
                                        //console.log('🚫 [DEBOUNCE_SKIP] AI is currently responding, skipping debounce processing to prevent duplication');
                                        pendingInput = '';
                                        return;
                                    }
                                    
                                    // Enhanced duplicate check before processing
                                    const isDuplicateInDebounce = speakerConversationHistory.some(entry => {
                                        const similarity = entry.transcription.trim() === pendingInput.trim() ||
                                                          entry.transcription.includes(pendingInput.trim()) ||
                                                          pendingInput.includes(entry.transcription.trim());
                                        const isRecent = (Date.now() - entry.timestamp) < 6000; // Within 6 seconds
                                        return similarity && isRecent;
                                    });
                                    
                                    if (isDuplicateInDebounce) {
                                       // console.log('🚫 [DEBOUNCE_DUPLICATE] Skipping duplicate content in debounce processing');
                                        pendingInput = '';
                                        return;
                                    }
                                    
                                    // CRITICAL FIX: Check against conversation history to prevent reprocessing recently processed content
                                    const isRecentlyProcessed = conversationHistory.some(entry => {
                                        const similarity = entry.transcription.trim() === pendingInput.trim() ||
                                                          entry.transcription.includes(pendingInput.trim()) ||
                                                          pendingInput.includes(entry.transcription.trim());
                                        const isRecent = (Date.now() - entry.timestamp) < 15000; // Within 15 seconds
                                        return similarity && isRecent;
                                    });
                                    
                                    if (isRecentlyProcessed) {
                                        //console.log('🚫 [DEBOUNCE_ALREADY_PROCESSED] Skipping content that was already processed recently:', pendingInput.trim());
                                        pendingInput = '';
                                        return;
                                    }
                                    
                                    // Check if context should be reset
                                    if (shouldResetContext()) {
                                        console.log('🔄 [CONTEXT_RESET] Resetting context due to timeout');
                                        contextAccumulator = '';
                                        questionQueue = [];
                                    }
                                    
                                    // Add to context accumulator
                                    contextAccumulator += pendingInput + ' ';
                                    
                                    // Check if this is a complete question
                                    if (isSemanticallyComplete(pendingInput.trim())) {
                                        console.log('❓ [COMPLETE_QUESTION] Complete question detected:', pendingInput.trim());
                                        
                                        // Add to question queue
                                        questionQueue.push(contextAccumulator.trim());
                                        
                                        // Process the queue if AI is not responding
                                        if (!isAiResponding) {
                                            processQuestionQueue(session);
                                        }
                                        
                                        // Reset context for next question
                                        contextAccumulator = '';
                                    } else {
                                        console.log('📝 [INCOMPLETE_INPUT] Incomplete input, accumulating in context:', pendingInput.trim());
                                    }
                                    
                                    // Save to speaker transcription and conversation history
                                    speakerTranscription += pendingInput;
                                    
                                    // Send speaker transcription update to renderer
                                    sendToRenderer('speaker-transcription-update', {
                                        text: pendingInput.trim(),
                                        isFinal: false,
                                        timestamp: Date.now()
                                    });
                                    
                                    // Count words and manage cleanup to retain most recent words
                                    const words = speakerTranscription.trim().split(/\s+/);
                                    speakerWordCount = words.length;
                                    
                                    // Clean up if exceeding word limit, keep only the most recent words
                                    if (speakerWordCount > MAX_MICROPHONE_WORDS) {
                                        const remainingWords = words.slice(-MAX_MICROPHONE_WORDS); // Keep last N words
                                        speakerTranscription = remainingWords.join(' ') + ' ';
                                    }
                                    
                                    // Save the complete accumulated input to conversation history
                                    speakerConversationHistory.push({
                                        timestamp: Date.now(),
                                        transcription: pendingInput.trim(),
                                        type: 'speaker'
                                    });

                                    console.log('✅ [DEBOUNCE_SAVED] Saved complete transcription:', pendingInput.trim());
                                    
                                    // Reset pending input
                                    pendingInput = '';
                                }
                            }, adaptiveDelay); // Use adaptive delay instead of fixed INPUT_DEBOUNCE_DELAY

                            // Don't process immediately - wait for debounce timer
                            return;
                        }
                    }

                    // Handle AI model response when microphone is not active OR when processing a text message
                    if ((!isMicrophoneActive || isProcessingTextMessage) && message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            if (part.text) {
                                // If this is the first part of a new response, ensure new-response-starting is sent
                                if (messageBuffer === '') {
                                    isAiResponding = true; // Track that AI is now responding
                                    resetReconstructionState(); // Reset reconstruction state for new response
                                    console.log('🤖 [AI_RESPONSE_START] First chunk of AI response received');
                                    
                                    // CRITICAL FIX: Always send new-response-starting for new AI responses
                                    // This ensures proper response counter regardless of input path
                                    if (!isSuppressingRender) {
                                        sendToRenderer('new-response-starting');
                                    }
                                }
                                
                                // Sanitize the AI response text to remove corrupted characters
                                const sanitizedText = sanitizeText(part.text);
                                
                                // Detect corruption before adding to buffer
                                const isCorrupted = detectStreamingCorruption(messageBuffer, sanitizedText);
                                
                                // DISABLED: Corruption detection and reconstruction logic
                                // if (isCorrupted && !corruptionDetected) {
                                //     console.error('🚨 [CORRUPTION_ALERT] Corruption detected during streaming!');
                                //     corruptionDetected = true;
                                //     
                                //     // Attempt reconstruction
                                //     const reconstructed = reconstructResponse();
                                //     if (reconstructed) {
                                //         console.log('✅ [RECONSTRUCTION_SUCCESS] Response reconstructed from clean segment');
                                //         messageBuffer = reconstructed;
                                //         if (!isSuppressingRender) {
                                //             sendToRenderer('update-response', messageBuffer);
                                //         }
                                //         return; // Skip adding corrupted text
                                //     } else {
                                //         console.warn('⚠️ [RECONSTRUCTION_FAILED] No clean segments available, continuing with corrupted stream');
                                //     }
                                // }
                                
                                // Add sanitized text to buffer (corruption detection disabled)
                                messageBuffer += sanitizedText;
                                
                                // Save clean segments periodically
                                if (messageBuffer.length % SEGMENT_SIZE === 0) {
                                    saveResponseSegment(messageBuffer);
                                }
                                
                                // DISABLED: Corruption-based conditional logic
                                // if (!isCorrupted) {
                                //     messageBuffer += sanitizedText;
                                //     
                                //     // Save clean segments periodically
                                //     if (messageBuffer.length % SEGMENT_SIZE === 0) {
                                //         saveResponseSegment(messageBuffer);
                                //     }
                                // } else {
                                //     // If corrupted but no reconstruction available, add anyway but log warning
                                //     messageBuffer += sanitizedText;
                                //     console.warn('⚠️ [FORCED_APPEND] Adding potentially corrupted text due to no reconstruction option');
                                // }
                                
                                // DISABLED: Streaming integrity validation
                                // if (messageBuffer.length % 500 === 0) { // Check every 500 characters
                                //     const integrity = validateResponseIntegrity(messageBuffer);
                                //     if (!integrity.isValid) {
                                //         console.warn('⚠️ [STREAMING_INTEGRITY] Issues detected during streaming:', integrity.issues);
                                //     }
                                // }
                                
                                if (!isSuppressingRender) {
                                    sendToRenderer('update-response', messageBuffer);
                                }
                            }
                        }
                    }

                    if ((!isMicrophoneActive || isProcessingTextMessage) && message.serverContent?.generationComplete) {
                        console.log('🏁 [AI_RESPONSE_COMPLETE] AI response generation completed');
                        const latencyMs = lastAiRequestStart ? (Date.now() - lastAiRequestStart) : null;
                        const quality = computeQualityScore(messageBuffer);
                        recordMetric('ai_response_complete', { latencyMs, responseLength: messageBuffer.length, quality });
                        
                        // DISABLED: Final integrity check and reconstruction logic
                        // const finalIntegrity = validateResponseIntegrity(messageBuffer);
                        // console.log('📊 [FINAL_INTEGRITY] Response length:', messageBuffer.length, 'characters');
                        // console.log('📊 [FINAL_INTEGRITY] Final integrity status:', finalIntegrity.isValid ? 'VALID' : 'CORRUPTED');
                        // 
                        // if (!finalIntegrity.isValid) {
                        //     console.error('❌ [FINAL_INTEGRITY] Corrupted response detected before saving:', finalIntegrity.issues);
                        //     
                        //     // Attempt final reconstruction
                        //     const reconstructed = reconstructResponse();
                        //     if (reconstructed) {
                        //         console.log('✅ [FINAL_RECONSTRUCTION] Response reconstructed successfully');
                        //         messageBuffer = reconstructed;
                        //         
                        //         // Re-validate reconstructed response
                        //         const reconstructedIntegrity = validateResponseIntegrity(messageBuffer);
                        //         console.log('📊 [RECONSTRUCTED_INTEGRITY] Final status:', reconstructedIntegrity.isValid ? 'VALID' : 'STILL_CORRUPTED');
                        //     } else {
                        //         console.error('❌ [FINAL_RECONSTRUCTION] Failed to reconstruct response - saving corrupted version');
                        //     }
                        // }
                        
                        console.log('📊 [RESPONSE_COMPLETE] Response length:', messageBuffer.length, 'characters');
                        
                        // Create response object with timing data for final response
                        const responseWithTiming = {
                            content: messageBuffer,
                            responseTime: lastResponseTime,
                            timestamp: Date.now()
                        };
                        
                        if (!isSuppressingRender) {
                            sendToRenderer('update-response', responseWithTiming);
                        }

                        // Save conversation turn when we have both transcription and AI response
                        if (isProcessingTextMessage && global.pendingContextTranscription && messageBuffer) {
                            // Check if this is a reconnection context message (should not be saved)
                            const isReconnectionContext = global.pendingContextTranscription.includes('Till now all these questions were asked in the interview');
                            
                            if (isReconnectionContext) {
                                // DO NOT save context messages to conversation history to prevent recursive loops
                                // Context messages are internal reconnection messages and should not be persisted
                                console.log('⏭️ [SAVE_SKIP] Skipping save of context message to prevent recursive loop');
                            } else {
                                // Save screenshot context messages and other text messages
                                // Pass suppression flag to indicate if this response was suppressed from UI
                                console.log('💾 [SAVE_CONVERSATION] Saving context message conversation turn');
                                saveConversationTurn(global.pendingContextTranscription, messageBuffer, isSuppressingRender);
                            }
                            global.pendingContextTranscription = null; // Reset after processing
                        } else if (speakerCurrentTranscription && messageBuffer) {
                            // Check for duplicate responses before saving
                            const isDuplicateResponse = conversationHistory.some(entry => {
                                const transcriptionSimilarity = entry.transcription.trim() === speakerCurrentTranscription.trim() ||
                                                               entry.transcription.includes(speakerCurrentTranscription.trim()) ||
                                                               speakerCurrentTranscription.includes(entry.transcription.trim());
                                const responseSimilarity = entry.ai_response && messageBuffer &&
                                                          (entry.ai_response.includes(messageBuffer.substring(0, 100)) ||
                                                           messageBuffer.includes(entry.ai_response.substring(0, 100)));
                                const isRecent = (Date.now() - entry.timestamp) < 15000; // Within 15 seconds
                                return (transcriptionSimilarity || responseSimilarity) && isRecent;
                            });
                            
                            if (isDuplicateResponse) {
                                console.log('🚫 [DUPLICATE_RESPONSE] Skipping save of duplicate response to conversation history');
                            } else {
                                // Save regular speaker-only transcription
                                // Pass suppression flag to indicate if this response was suppressed from UI
                                console.log('💾 [SAVE_CONVERSATION] Saving speaker conversation turn');
                                saveConversationTurn(speakerCurrentTranscription, messageBuffer, isSuppressingRender);
                            }
                            speakerCurrentTranscription = ''; // Reset for next turn
                        }

                        // Calculate and log response timing
                        if (requestStartTime) {
                            const responseEndTime = Date.now();
                            const responseTimeMs = responseEndTime - requestStartTime;
                            lastResponseTime = responseTimeMs;
                            const endTimestamp = new Date(responseEndTime).toISOString();
                            
                            console.log('⏰ [RESPONSE_COMPLETE] Timestamp:', endTimestamp);
                            console.log('⚡ [RESPONSE_TIME] Total time for complete response:', responseTimeMs, 'ms');
                            

                            
                            requestStartTime = null; // Reset for next request
                        }
                        
                        messageBuffer = '';
                        isProcessingTextMessage = false; // Reset flag after processing
                        isAiResponding = false; // Mark AI as no longer responding
                        
                        // CRITICAL FIX: Clear debounce timer when AI response completes to prevent duplicate processing
                        if (inputDebounceTimer) {
                            clearTimeout(inputDebounceTimer);
                            inputDebounceTimer = null;
                            pendingInput = '';
                            //console.log('🧹 [DEBOUNCE_CLEARED] Cleared debounce timer after AI response completion');
                        }
                        
                        // CRITICAL FIX: Clear context accumulator to prevent reprocessing same content
                        contextAccumulator = '';
                        //console.log('🧹 [CONTEXT_CLEARED] Cleared context accumulator to prevent duplicate processing');
                        
                        //console.log('🔄 [STATE_RESET] AI response state reset, checking for queued questions');
                        
                        // Process any queued questions after response completion
                        if (questionQueue.length > 0) {
                            console.log('📋 [QUEUE_PROCESSING] Processing', questionQueue.length, 'queued questions after response completion');
                            setTimeout(() => processQuestionQueue(session), 100); // Small delay to ensure clean state
                        } else {
                            console.log('✅ [QUEUE_EMPTY] No queued questions, ready for new input');
                        }
                    }

                    if (message.serverContent?.turnComplete) {
                        sendToRenderer('update-status', 'Listen...');
                    }
                },
                onerror: function (e) {
                    // Clear debounce timer on error
                    if (inputDebounceTimer) {
                        clearTimeout(inputDebounceTimer);
                        inputDebounceTimer = null;
                        pendingInput = '';
                    }

                    // Reset suppression flag on error
                    isSuppressingRender = false;
                    isProcessingTextMessage = false;
                    isAiResponding = false; // Reset AI responding state on error
                    
                    console.log('❌ [ERROR_RECOVERY] Starting error recovery process');
                    
                    // Validate and log current response buffer before cleanup
                    if (messageBuffer) {
                        const integrity = validateResponseIntegrity(messageBuffer);
                        console.log('📊 [ERROR_ANALYSIS] Response buffer at error - Length:', messageBuffer.length, 'Integrity:', integrity.isValid ? 'VALID' : 'CORRUPTED');
                        if (!integrity.isValid) {
                            console.warn('⚠️ [ERROR_ANALYSIS] Buffer corruption detected during error:', integrity.issues);
                        }
                    }
                    
                    // Clear context and queue on error
                    if (contextAccumulator.trim()) {
                        console.log('🧹 [ERROR_CLEANUP] Clearing context accumulator:', contextAccumulator.substring(0, 50) + '...');
                    }
                    if (questionQueue.length > 0) {
                        console.log('🧹 [ERROR_CLEANUP] Clearing question queue with', questionQueue.length, 'items');
                    }
                    
                    contextAccumulator = '';
                    questionQueue = [];
                    resetReconstructionState(); // Reset reconstruction state on error
                    console.log('✅ [ERROR_RECOVERY] Context, queue, and reconstruction state cleared due to error');

                    // Save partial response if available before handling error
                    if (messageBuffer) {
                        if (global.pendingContextTranscription) {
                            console.log('Skipping save of partial context response due to error to prevent recursive loop');
                            global.pendingContextTranscription = null;
                        } else if (speakerCurrentTranscription) {
                            console.log('Saving partial response due to error:', messageBuffer);
                            saveConversationTurn(speakerCurrentTranscription, messageBuffer + ' [INTERRUPTED]', isSuppressingRender);
                            speakerCurrentTranscription = '';
                        }
                        messageBuffer = '';
                    }

                    const isApiKeyError =
                        e.message &&
                        (e.message.includes('API key not valid') ||
                            e.message.includes('invalid API key') ||
                            e.message.includes('authentication failed') ||
                            e.message.includes('unauthorized'));

                    if (isApiKeyError) {
                        lastSessionParams = null;
                        reconnectionAttempts = maxReconnectionAttempts;
                        sendToRenderer('update-status', 'Error: Invalid API key');
                        return;
                    }

                    sendToRenderer('update-status', 'Error: ' + e.message);
                },
                onclose: function (e) {
                    // Clear debounce timer on session close
                    if (inputDebounceTimer) {
                        clearTimeout(inputDebounceTimer);
                        inputDebounceTimer = null;
                        pendingInput = '';
                    }

                    // Reset suppression flag on session close
                    isSuppressingRender = false;
                    isProcessingTextMessage = false;
                    isAiResponding = false; // Reset AI responding state on session close
                    
                    console.log('🔌 [SESSION_CLOSE] Starting session close cleanup process');
                    
                    // Validate and log current response buffer before cleanup
                    if (messageBuffer) {
                        const integrity = validateResponseIntegrity(messageBuffer);
                        console.log('📊 [CLOSE_ANALYSIS] Response buffer at close - Length:', messageBuffer.length, 'Integrity:', integrity.isValid ? 'VALID' : 'CORRUPTED');
                        if (!integrity.isValid) {
                            console.warn('⚠️ [CLOSE_ANALYSIS] Buffer corruption detected during close:', integrity.issues);
                        }
                    }
                    
                    // Clear context and queue on session close
                    if (contextAccumulator.trim()) {
                        console.log('🧹 [CLOSE_CLEANUP] Clearing context accumulator:', contextAccumulator.substring(0, 50) + '...');
                    }
                    if (questionQueue.length > 0) {
                        console.log('🧹 [CLOSE_CLEANUP] Clearing question queue with', questionQueue.length, 'items');
                    }
                    
                    contextAccumulator = '';
                    questionQueue = [];
                    resetReconstructionState(); // Reset reconstruction state on session close
                    console.log('✅ [SESSION_CLOSE] Context, queue, and reconstruction state cleared due to session close');

                    // Save partial response if available before handling close
                    if (messageBuffer) {
                        if (global.pendingContextTranscription) {
                            console.log('Skipping save of partial context response due to session close to prevent recursive loop');
                            global.pendingContextTranscription = null;
                        } else if (speakerCurrentTranscription) {
                            console.log('Saving partial response due to session close:', messageBuffer);
                            saveConversationTurn(speakerCurrentTranscription, messageBuffer + ' [SESSION_CLOSED]', isSuppressingRender);
                            speakerCurrentTranscription = '';
                        }
                        messageBuffer = '';
                    }

                    const isApiKeyError =
                        e.reason &&
                        (e.reason.includes('API key not valid') ||
                            e.reason.includes('invalid API key') ||
                            e.reason.includes('authentication failed') ||
                            e.reason.includes('unauthorized'));

                    if (isApiKeyError) {
                        lastSessionParams = null;
                        reconnectionAttempts = maxReconnectionAttempts;
                        sendToRenderer('update-status', 'Session closed: Invalid API key');
                        return;
                    }
                    
                    if (lastSessionParams && reconnectionAttempts < maxReconnectionAttempts) {
                        console.log('Session closed.. Reconnecting...');
                        attemptReconnection();
                    } else {
                        sendToRenderer('update-status', 'Session closed');
                    }
                },
            },
            config: {
                responseModalities: ['TEXT'],
                tools: enabledTools,
                inputAudioTranscription: {},
                contextWindowCompression: { slidingWindow: {} },
                speechConfig: { languageCode: language },
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                },
            },
        });

        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        return session;
    } catch (error) {
        console.error('Failed to initialize Gemini session:', error);
        
        // Try fallback API key if available
        if (apiKeyManager) {
            try {
                const fallbackKey = await apiKeyManager.getNextApiKey();
                if (fallbackKey) {
                    console.log('🔄 Trying fallback API key...');
                    isInitializingSession = false;
                    return await initializeGeminiSession(apiKeys, customPrompt, profile, language, isReconnection);
                }
            } catch (fallbackError) {
                console.error('Fallback API key also failed:', fallbackError);
            }
        }
        
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Failed to connect: All API keys exhausted');
        return null;
    }
}

function killExistingSystemAudioDump() {
    return new Promise(resolve => {
        const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
            stdio: 'ignore',
        });

        killProc.on('close', code => {
            resolve();
        });

        killProc.on('error', err => {
            resolve();
        });

        // Timeout after 2 seconds
        setTimeout(() => {
            killProc.kill();
            resolve();
        }, 2000);
    });
}

async function startMacOSAudioCapture(geminiSessionRef) {
    if (process.platform !== 'darwin') return false;

    // Kill any existing SystemAudioDump processes first
    await killExistingSystemAudioDump();

    const { app } = require('electron');
    const path = require('path');

    let systemAudioPath;
    if (app.isPackaged) {
        systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump');
    } else {
        systemAudioPath = path.join(__dirname, '../assets', 'SystemAudioDump');
    }

    systemAudioProc = spawn(systemAudioPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!systemAudioProc.pid) {
        console.error('Failed to start SystemAudioDump');
        return false;
    }

    const CHUNK_DURATION = 0.1;
    const SAMPLE_RATE = 24000;
    const BYTES_PER_SAMPLE = 2;
    const CHANNELS = 2;
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

    let audioBuffer = Buffer.alloc(0);

    let chunkCount = 0;
    
    systemAudioProc.stdout.on('data', data => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.slice(0, CHUNK_SIZE);
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);
            chunkCount++;

            const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk;
            const base64Data = monoChunk.toString('base64');
            
            sendAudioToGemini(base64Data, geminiSessionRef);

            if (process.env.DEBUG_AUDIO) {
                saveDebugAudio(monoChunk, 'system_audio');
            }
        }

        const maxBufferSize = SAMPLE_RATE * BYTES_PER_SAMPLE * 1;
        if (audioBuffer.length > maxBufferSize) {
            audioBuffer = audioBuffer.slice(-maxBufferSize);
        }
    });

    systemAudioProc.stderr.on('data', data => {
        console.error('SystemAudioDump stderr:', data.toString());
    });

    systemAudioProc.on('close', code => {
        systemAudioProc = null;
    });

    systemAudioProc.on('error', err => {
        console.error('SystemAudioDump process error:', err);
        systemAudioProc = null;
    });

    return true;
}

function convertStereoToMono(stereoBuffer) {
    const samples = stereoBuffer.length / 4;
    const monoBuffer = Buffer.alloc(samples * 2);

    for (let i = 0; i < samples; i++) {
        const leftSample = stereoBuffer.readInt16LE(i * 4);
        monoBuffer.writeInt16LE(leftSample, i * 2);
    }

    return monoBuffer;
}

function stopMacOSAudioCapture() {
    if (systemAudioProc) {
        console.log('Stopping SystemAudioDump...');
        systemAudioProc.kill('SIGTERM');
        systemAudioProc = null;
    }
}

async function sendAudioToGemini(base64Data, geminiSessionRef) {
    if (!geminiSessionRef.current) {
        return;
    }
    
    if (!isSpeakerDetectionEnabled) {
        return;
    }

    try {
        // Always send audio for transcription, but mark differently based on microphone state
        if (isMicrophoneActive) {
            // Send audio for transcription only (no AI response expected)
            process.stdout.write('s'); // lowercase to indicate transcription only
        } else {
            process.stdout.write('.S');
        }
        
        await geminiSessionRef.current.sendRealtimeInput({
            audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            },
        });
    } catch (error) {
        console.error('Error sending audio to Gemini:', error);
    }
}

function setupGeminiIpcHandlers(geminiSessionRef) {
    // Store the geminiSessionRef globally for reconnection access
    global.geminiSessionRef = geminiSessionRef;
    // Reference holder for Gemini 2.5 Pro session
    const geminiProSessionRef = { current: null };
    // Cached Gemini Pro client instance (initialized on first use)
    let geminiProClient = null; 
    global.geminiProSessionRef = geminiProSessionRef;

    // Remove any existing handlers to prevent duplicates
    ipcMain.removeHandler('initialize-gemini');
    ipcMain.removeHandler('send-audio-content');
    ipcMain.removeHandler('send-image-content');
    ipcMain.removeHandler('send-text-message');
    ipcMain.removeHandler('start-macos-audio');
    ipcMain.removeHandler('start-microphone-audio');
    ipcMain.removeHandler('stop-microphone-audio');
    ipcMain.removeHandler('stop-macos-audio');
    ipcMain.removeHandler('switch-to-dual-mode');
    ipcMain.removeHandler('switch-to-speaker-only-mode');
    ipcMain.removeHandler('close-session');
    ipcMain.removeHandler('get-current-session');
    ipcMain.removeHandler('start-new-session');
    ipcMain.removeHandler('update-google-search-setting');
    ipcMain.removeHandler('process-all-context');
    ipcMain.removeHandler('process-context-with-screenshot');
    ipcMain.removeHandler('reset-context-and-reinitialize');
    ipcMain.removeHandler('get-recent-transcriptions');
    ipcMain.removeHandler('attempt-reconnection');

    ipcMain.handle('attempt-reconnection', async (event) => {
        try {
            const success = await attemptReconnection();
            return { success };
        } catch (error) {
            console.error('Error during manual reconnection:', error);
            return { success: false, error: error.message };
        }
    });

    // ====================== PRO VERSION HANDLER ============================
    ipcMain.handle('process-context-with-screenshot-pro', async (event) => {
        try {
            // Lazily create Gemini Pro client when first needed
            if (!geminiProClient) {
                const proApiKey = apiKeyManager ? apiKeyManager.getCurrentApiKey() : null;
                if (!proApiKey) {
                    throw new Error('No valid API key for Gemini Pro');
                }
                geminiProClient = new GoogleGenerativeAI(proApiKey);
            }

            const systemInstruction = `
                ----- START: SYSTEM PROMPT -----
                    INPUT: Screenshot and User-Context transcription (optional, if not present only refer to screenshot and provide assistance accordingly)
                    INSTRUCTIONS:
                        1. The tone of the response should be simple words, clear and concise, conversational and the setting is technical interview. You're a candidate who's providing solution/answer to a given question. So, each word should be such that a candidate is speaking in a technical interview.
                        2. For DSA or Coding problem solving, the approach should follow three structured steps. 
                            Step 2.1: Brute-force Approach – start by choosing sample inputs for a dry run, then explain the brute-force solution step by step along with edge cases like overflows or negative scenarios. Provide complete executable Java code with a main method and inline  comments for clarity, and conclude with time and space complexity analysis, justified in one sentence. 
                            Step 2.2: Optimized Approach – explain how the solution is improved and what trade-offs are made, perform a dry run on the same inputs, provide complete executable Java code with comments that justify specific choices (for example, using a HashMap for O(1) lookups),  and again analyze time and space complexity with justification. 
                            Step 2.3: Key Takeaway – summarize the core trade-off or lesson in 1-2 clear sentences.
                    ----- END: SYSTEM PROMPT -----
            `;

            // Get the generative model
            const model = geminiProClient.getGenerativeModel({ model: "gemini-2.5-pro", systemInstruction 
                // ,config: {
                //     thinkingConfig: {
                //         thinkingBudget: 0,
                //     },
                // }
            });

            // Reuse logic from standard handler to build transcription
            let completeTranscription = `\n----- START: USER-CONTEXT -----\n`;
            const recentMicrophoneHistory = getRecentTranscriptions(60 * 1000, microphoneConversationHistory);
            const recentSpeakerHistory = getRecentTranscriptions(60 * 1000, speakerConversationHistory);
            const allConversations = [];
            if (recentMicrophoneHistory?.length) allConversations.push(...recentMicrophoneHistory.filter(item => item.transcription?.trim().length));
            if (recentSpeakerHistory?.length) allConversations.push(...recentSpeakerHistory.filter(item => item.transcription?.trim().length));
            if (allConversations.length) {
                allConversations.sort((a,b)=>a.timestamp-b.timestamp);
                let currentGroup={type:null,transcriptions:[],speaker:''};
                const grouped=[];
                for (const conv of allConversations){
                    const speaker = conv.type==='microphone'? 'Interviewee/User':'Interviewer';
                    if(currentGroup.type!==conv.type){
                        if(currentGroup.transcriptions.length){grouped.push({speaker:currentGroup.speaker,text:currentGroup.transcriptions.join(' ').trim()});}
                        currentGroup={type:conv.type,transcriptions:[conv.transcription],speaker};
                    } else {
                        currentGroup.transcriptions.push(conv.transcription);
                    }
                }
                if(currentGroup.transcriptions.length){grouped.push({speaker:currentGroup.speaker,text:currentGroup.transcriptions.join(' ').trim()});}
                for(const g of grouped){completeTranscription+=`${g.speaker} says: ${g.text}\n`;}
                completeTranscription+='\n';
            }

            completeTranscription += '----- END: USER-CONTEXT -----';

            // Send new-response-starting event
            sendToRenderer('new-response-starting');
            requestStartTime = Date.now();
            isProcessingTextMessage = true;
            global.pendingContextTranscription = completeTranscription.trim();

            // Build parts array for multimodal request
            const contentParts = [{ text: completeTranscription.trim() }];
            if (global.latestScreenshotBase64) {
                contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: global.latestScreenshotBase64 } });
            }
            const result = await model.generateContentStream(contentParts);

            let aiResponse = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                //console.log('Received chunk:', chunkText);
                aiResponse += chunkText;
                sendToRenderer('update-response', aiResponse);
            }

            // Send the final accumulated response to mark the end with timing data
            const responseWithTiming = {
                content: aiResponse,
                timestamp: Date.now()
            };
            sendToRenderer('update-response', responseWithTiming);

            // Save the full conversation turn
            saveConversationTurn(global.pendingContextTranscription, aiResponse, false);

            // Cleanup
            isAiResponding = false;
            isProcessingTextMessage = false;
            cleanupResponseBuffer();
            contextAccumulator = '';
            sendToRenderer('response-end');

            return { success: true };
        } catch (error) {
            console.error('Error in process-context-with-screenshot-pro:', error);
            isAiResponding = false;
            isProcessingTextMessage = false;
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-IN') => {
        const session = await initializeGeminiSession(apiKey, customPrompt, profile, language);
        if (session) {
            geminiSessionRef.current = session;
            return true;
        }
        return false;
    });

    ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        
        // Check if speaker detection is disabled - if so, don't send audio at all
        if (!isSpeakerDetectionEnabled) {
            return { success: true, sent: false, reason: 'Speaker detection disabled' };
        }
        
        try {
            // Always send audio for transcription, but mark differently based on microphone state
            if (isMicrophoneActive) {
                // Send audio for transcription only (no AI response expected)
                process.stdout.write('s'); // lowercase to indicate transcription only
                await geminiSessionRef.current.sendRealtimeInput({
                    audio: { data: data, mimeType: mimeType },
                });
                return { success: true, transcriptionOnly: true, sent: true };
            } else {
                // Normal behavior: send audio and get response
                process.stdout.write('.');
                await geminiSessionRef.current.sendRealtimeInput({
                    audio: { data: data, mimeType: mimeType },
                });
                return { success: true, sent: true };
            }
        } catch (error) {
            console.error('Error sending audio:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-image-content', async (event, { data, debug }) => {
        try {
            // Check which AI provider is selected
            const windows = BrowserWindow.getAllWindows();
            if (windows.length === 0) {
                return { success: false, error: 'No active window' };
            }
            
            const selectedAiModel = await windows[0].webContents.executeJavaScript(`
                localStorage.getItem('selectedAiModel') || 'gemini'
            `);
            
            if (selectedAiModel === 'openrouter') {
                // Route to OpenRouter
                const { sendImageToOpenRouter } = require('./openrouter');
                return await sendImageToOpenRouter(data);
            }
            
            // Default to Gemini for image handling
            if (!geminiSessionRef.current) {
                return { success: false, error: 'No active Gemini session' };
            }

            if (!data || typeof data !== 'string') {
                console.error('Invalid image data received');
                return { success: false, error: 'Invalid image data' };
            }

            const buffer = Buffer.from(data, 'base64');

            if (buffer.length < 1000) {
                console.error(`Image buffer too small: ${buffer.length} bytes`);
                return { success: false, error: 'Image buffer too small' };
            }

            process.stdout.write('!');
            // Cache latest screenshot for use by Gemini Pro handler
            global.latestScreenshotBase64 = data;
            await geminiSessionRef.current.sendRealtimeInput({
                media: { data: data, mimeType: 'image/jpeg' },
            });

            return { success: true };
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        try {
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return { success: false, error: 'Invalid text message' };
            }

            // Check which AI provider is selected
            const windows = BrowserWindow.getAllWindows();
            if (windows.length === 0) {
                return { success: false, error: 'No active window' };
            }
            
            const selectedAiModel = await windows[0].webContents.executeJavaScript(`
                localStorage.getItem('selectedAiModel') || 'gemini'
            `);
            
            if (selectedAiModel === 'openrouter') {
                // Route to OpenRouter
                const { sendTextToOpenRouter } = require('./openrouter');
                return await sendTextToOpenRouter(text);
            }
            
            // Default to Gemini for text handling
            if (!geminiSessionRef.current) {
                return { success: false, error: 'No active Gemini session' };
            }

            // Send new-response-starting event to ensure proper response counter
            // User-initiated text messages should ALWAYS trigger a new response counter
            sendToRenderer('new-response-starting');

            // Record request start time and log full transcript
            requestStartTime = Date.now();
            const timestamp = new Date(requestStartTime).toISOString();
            console.log('⏰ [TRANSCRIPT_SENT] Timestamp:', timestamp);
            console.log('📝 [TRANSCRIPT_SENT] Full transcript sent to Gemini via IPC:');
            console.log('📄 [TRANSCRIPT_CONTENT]', text.trim());

            // Save to conversation history immediately to prevent duplicate processing
            conversationHistory.push({
                timestamp: requestStartTime,
                transcription: text.trim(),
                type: 'user_request',
                processed: true
            });
            console.log('💾 [CONVERSATION_SAVED] Saved request to conversation history to prevent duplication');
            
            isProcessingTextMessage = true; // Set flag to allow AI response even when microphone is active
            await performTextRequest(text.trim(), geminiSessionRef.current);
            return { success: true };
        } catch (error) {
            console.error('Error sending text:', error);
            isProcessingTextMessage = false; // Reset flag on error
            requestStartTime = null; // Reset timing on error
            return { success: false, error: error.message };
        }
    });

    function getRecentTranscriptions(windowMs = TRANSCRIPTION_WINDOW_MS, transcriptionArray) {
        const cutoffTime = Date.now() - windowMs;
        return transcriptionArray
            .filter(entry => entry.timestamp > cutoffTime)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    ipcMain.handle('process-context-with-screenshot', async (event) => {
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        try {
            let completeTranscription = '\n';

            // Get recent transcriptions (last 1 minute only)
            const recentMicrophoneHistory = getRecentTranscriptions(60 * 1000, microphoneConversationHistory);
            const recentSpeakerHistory = getRecentTranscriptions(60 * 1000, speakerConversationHistory);

            // Merge and sort conversation history by timestamp for chronological order
            const allConversations = [];
            
            if (recentMicrophoneHistory && recentMicrophoneHistory.length > 0) {
                allConversations.push(...recentMicrophoneHistory.filter(item => 
                    item.transcription && item.transcription.trim().length > 0
                ));
            }
            
            if (recentSpeakerHistory && recentSpeakerHistory.length > 0) {
                allConversations.push(...recentSpeakerHistory.filter(item => 
                    item.transcription && item.transcription.trim().length > 0
                ));
            }
            
            // Sort by timestamp to create chronological conversation flow
            if (allConversations.length > 0) {
                allConversations.sort((a, b) => a.timestamp - b.timestamp);
                
                // Group consecutive transcriptions of the same type
                const groupedTranscriptions = [];
                let currentGroup = {
                    type: null,
                    transcriptions: [],
                    speaker: ''
                };
                
                for (const conversation of allConversations) {
                    const speaker = conversation.type === 'microphone' ? 'Interviewee/User' : 'Interviewer';
                    
                    // If this is a new speaker type or first conversation, start a new group
                    if (currentGroup.type !== conversation.type) {
                        // Save the previous group if it has content
                        if (currentGroup.transcriptions.length > 0) {
                            groupedTranscriptions.push({
                                speaker: currentGroup.speaker,
                                text: currentGroup.transcriptions.join(' ').trim()
                            });
                        }
                        
                        // Start new group
                        currentGroup = {
                            type: conversation.type,
                            transcriptions: [conversation.transcription],
                            speaker: speaker
                        };
                    } else {
                        // Same speaker type, add to current group
                        currentGroup.transcriptions.push(conversation.transcription);
                    }
                }
                
                // Don't forget to add the last group
                if (currentGroup.transcriptions.length > 0) {
                    groupedTranscriptions.push({
                        speaker: currentGroup.speaker,
                        text: currentGroup.transcriptions.join(' ').trim()
                    });
                }
                
                // Build the final transcription string
                for (const group of groupedTranscriptions) {
                    completeTranscription += `${group.speaker} says: ${group.text}\n`;
                }
                completeTranscription += '\n';
            }

            //Only ask for screenshot response
            if (completeTranscription.trim().length === 0) {
                completeTranscription = 
                `
                    No recent conversation context available. Please analyze the current screen content and provide assistance based on what you can see.
                   # CONTEXT: You are Ab, a Java Developer in a job interview.
                   # PERSONA: Act as an expert. Answer confidently, showcasing your full thought process from brute-force to optimized. **Prioritize simple, readable solutions using standard libraries over unnecessary custom implementations.**
                   # TASK: The interviewer has asked a coding question based on the text on screen. Follow below all instructions precisely. But if it's a MCQ question - just select the right answer A/B/C/D and explain why other options are incorrect in 1-2 sentences - DO NOT follow below instructions for MCQ.

                   # INSTRUCTIONS:
                   # Focus on answering the most recent question from the interviewer (if asked, otherwise refer to screen content for the question).
                `
            }

            // Send new-response-starting event to ensure proper response counter
            // User-initiated context-with-screenshot should ALWAYS trigger a new response counter
            sendToRenderer('new-response-starting');

            // Record request start time and log full transcript
            requestStartTime = Date.now();
            const timestamp = new Date(requestStartTime).toISOString();
            console.log('⏰ [TRANSCRIPT_SENT] Timestamp:', timestamp);
            console.log('📝 [TRANSCRIPT_SENT] Full transcript sent to Gemini via context-with-screenshot:');
            console.log('📄 [TRANSCRIPT_CONTENT]', completeTranscription.trim());
            
            isProcessingTextMessage = true; // Set flag to allow AI response even when microphone is active
            
            // Store the complete transcription for saving after AI response
            global.pendingContextTranscription = completeTranscription.trim();
            
            await performTextRequest(completeTranscription.trim(), geminiSessionRef.current);
            return { success: true };
        } catch (error) {
            console.error('\nError sending context-with-screenshot:', error);
            isProcessingTextMessage = false; // Reset flag on error
            requestStartTime = null; // Reset timing on error
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-macos-audio', async event => {
        if (process.platform !== 'darwin') {
            return {
                success: false,
                error: 'macOS audio capture only available on macOS',
            };
        }

        try {
            const success = await startMacOSAudioCapture(geminiSessionRef);
            return { success };
        } catch (error) {
            console.error('Error starting macOS audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('stop-macos-audio', async event => {
        try {
            stopMacOSAudioCapture();
            return { success: true };
        } catch (error) {
            console.error('Error stopping macOS audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-session', async event => {
        try {
            stopMacOSAudioCapture();

            // Clear session params to prevent reconnection when user closes session
            lastSessionParams = null;

            // Cleanup any pending resources and stop audio/video capture
            if (geminiSessionRef.current) {
                await geminiSessionRef.current.close();
                geminiSessionRef.current = null;
            }

            return { success: true };
        } catch (error) {
            console.error('Error closing session:', error);
            return { success: false, error: error.message };
        }
    });

    // Close Gemini Pro client (2.5) session to free resources
    ipcMain.handle('close-gemini-pro-session', async event => {
        try {
            if (geminiProClient) {
                geminiProClient = null;
            }
            geminiProSessionRef.current = null;
            global.latestScreenshotBase64 = null;
            return { success: true };
        } catch (error) {
            console.error('Error closing Gemini Pro session:', error);
            return { success: false, error: error.message };
        }
    });

    // Conversation history IPC handlers
    ipcMain.handle('get-current-session', async event => {
        try {
            return { success: true, data: getCurrentSessionData() };
        } catch (error) {
            console.error('Error getting current session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-new-session', async event => {
        try {
            initializeNewSession();
            return { success: true, sessionId: currentSessionId };
        } catch (error) {
            console.error('Error starting new session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-google-search-setting', async (event, enabled) => {
        try {
            console.log('Google Search setting updated to:', enabled);
            // The setting is already saved in localStorage by the renderer
            // This is just for logging/confirmation
            return { success: true };
        } catch (error) {
            console.error('Error updating Google Search setting:', error);
            return { success: false, error: error.message };
        }
    });

    // Microphone session IPC handlers
    ipcMain.handle('initialize-microphone-session', async (event, apiKey, profile = 'interview', language = 'en-IN') => {
        try {
            console.log('IPC: Initializing microphone session with API key length:', apiKey ? apiKey.length : 'undefined');
            const session = await initializeMicrophoneSession(apiKey, profile, language);
            if (session) {
                microphoneSessionRef.current = session;
                console.log('IPC: Microphone session initialized successfully and stored in ref');
                return { success: true };
            }
            console.error('IPC: Failed to initialize microphone session - session is null');
            return { success: false, error: 'Failed to initialize microphone session' };
        } catch (error) {
            console.error('IPC: Error initializing microphone session:', error);
             return { success: false, error: error.message };
         }
     });

    ipcMain.handle('send-microphone-audio', async (event, audioData) => {
        try {
            // Extract base64 data from the audioData object
            const base64Data = audioData.data;
            //console.log('IPC: Received microphone audio data, length:', base64Data ? base64Data.length : 'undefined');
            //console.log('IPC: Microphone session ref exists:', !!microphoneSessionRef.current);
            await sendMicrophoneAudioToGemini(base64Data);
            return { success: true };
        } catch (error) {
            console.error('IPC: Error sending microphone audio:', error);
             return { success: false, error: error.message };
         }
     });

    ipcMain.handle('get-microphone-transcription', async (event) => {
        console.log('IPC handler: get-microphone-transcription called');
        try {
            const transcription = getMicrophoneTranscription();
            console.log('IPC handler: getMicrophoneTranscription returned:', JSON.stringify(transcription));
            const result = { success: true, transcription: transcription };
            console.log('IPC handler: returning result:', result);
            return result;
        } catch (error) {
            console.error('IPC handler: Error getting microphone transcription:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('clear-microphone-transcription', async (event) => {
        try {
            clearMicrophoneTranscription();
            return { success: true };
        } catch (error) {
            console.error('Error clearing microphone transcription:', error);
            return { success: false, error: error.message };
        }
    });

    // Speaker transcription IPC handlers
    ipcMain.handle('get-speaker-transcription', async (event) => {
        try {
            return { success: true, transcription: getSpeakerTranscription() };
        } catch (error) {
            console.error('Error getting speaker transcription:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('clear-speaker-transcription', async (event) => {
        try {
            clearSpeakerTranscription();
            return { success: true };
        } catch (error) {
            console.error('Error clearing speaker transcription:', error);
            return { success: false, error: error.message };
        }
    });

    // Microphone state IPC handlers
    ipcMain.handle('set-microphone-active', async (event, active) => {
        try {
            setMicrophoneActive(active);
            return { success: true };
        } catch (error) {
            console.error('Error setting microphone active state:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('is-microphone-active', async (event) => {
        try {
            return { success: true, active: isMicrophoneCurrentlyActive() };
        } catch (error) {
            console.error('Error getting microphone active state:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-microphone-session', async (event) => {
        try {
            if (microphoneSessionRef.current) {
                await microphoneSessionRef.current.close();
                microphoneSessionRef.current = null;
            }
            clearMicrophoneTranscription();
            return { success: true };
        } catch (error) {
            console.error('Error closing microphone session:', error);
            return { success: false, error: error.message };
        }
    });

    // Speaker detection state IPC handlers
    ipcMain.handle('set-speaker-detection-enabled', async (event, enabled) => {
        try {
            await setSpeakerDetectionEnabled(enabled);
            return { success: true };
        } catch (error) {
            console.error('Error setting speaker detection state:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('is-speaker-detection-enabled', async (event) => {
        try {
            return { success: true, enabled: isSpeakerDetectionCurrentlyEnabled() };
        } catch (error) {
            console.error('Error getting speaker detection state:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Enhanced debounce management IPC handlers
    ipcMain.handle('update-vad-data', async (event, vadData) => {
        try {
            updateVADAdaptiveData(vadData);
            return { success: true };
        } catch (error) {
            console.error('Error updating VAD data:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('set-enhanced-debounce-enabled', async (event, enabled) => {
        try {
            setEnhancedDebounceEnabled(enabled);
            return { success: true };
        } catch (error) {
            console.error('Error setting enhanced debounce state:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('get-debounce-performance-metrics', async (event) => {
        try {
            const metrics = getDebouncePerformanceMetrics();
            return { success: true, metrics };
        } catch (error) {
            console.error('Error getting debounce performance metrics:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Smart Request Manager IPC handlers
    ipcMain.handle('get-smart-request-metrics', async (event) => {
        try {
            const metrics = getSmartRequestMetrics();
            return { success: true, metrics };
        } catch (error) {
            console.error('Error getting smart request metrics:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('set-smart-interruption-enabled', async (event, enabled) => {
        try {
            setSmartInterruptionEnabled(enabled);
            return { success: true };
        } catch (error) {
            console.error('Error setting smart interruption state:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('update-interview-phase', async (event, phase) => {
        try {
            updateSmartRequestManagerPhase();
            return { success: true, phase };
        } catch (error) {
            console.error('Error updating interview phase:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('reset-smart-request-session', async (event) => {
        try {
            resetSmartRequestSession();
            resetDebounceSession();
            return { success: true };
        } catch (error) {
            console.error('Error resetting smart request session:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Context Boundary Optimizer IPC handlers
    ipcMain.handle('get-context-boundary-metrics', async (event) => {
        try {
            const metrics = getContextBoundaryMetrics();
            return { success: true, metrics };
        } catch (error) {
            console.error('Error getting context boundary metrics:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('set-interview-phase', async (event, phase) => {
        try {
            setInterviewPhase(phase);
            return { success: true, phase };
        } catch (error) {
            console.error('Error setting interview phase:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('get-current-interview-phase', async (event) => {
        try {
            const phase = getCurrentInterviewPhase();
            return { success: true, phase };
        } catch (error) {
            console.error('Error getting current interview phase:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('get-active-technical-topics', async (event) => {
        try {
            const topics = getActiveTechnicalTopics();
            return { success: true, topics };
        } catch (error) {
            console.error('Error getting active technical topics:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('reset-context-boundary-session', async (event) => {
        try {
            resetContextBoundarySession();
            resetSmartRequestSession();
            resetDebounceSession();
            return { success: true };
        } catch (error) {
            console.error('Error resetting context boundary session:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Audio Quality Assurance IPC handlers
    ipcMain.handle('process-audio-quality', async (event, audioData) => {
        try {
            const qualityResult = processAudioQuality(audioData);
            return { 
                success: true, 
                qualityScore: qualityResult.qualityScore,
                action: qualityResult.processingDecision?.action || 'process',
                reason: qualityResult.processingDecision?.reason || 'processed',
                ...qualityResult
            };
        } catch (error) {
            console.error('Error processing audio quality:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('get-audio-quality-metrics', async (event) => {
        try {
            const metrics = getAudioQualityMetrics();
            return { success: true, metrics };
        } catch (error) {
            console.error('Error getting audio quality metrics:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('set-audio-quality-interview-context', async (event, context) => {
        try {
            setAudioQualityInterviewContext(context);
            return { success: true, context };
        } catch (error) {
            console.error('Error setting audio quality interview context:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('set-audio-quality-strict-mode', async (event, enabled) => {
        try {
            setAudioQualityStrictMode(enabled);
            return { success: true, enabled };
        } catch (error) {
            console.error('Error setting audio quality strict mode:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('reset-audio-quality-session', async (event) => {
        try {
            resetAudioQualitySession();
            resetContextBoundarySession();
            resetSmartRequestSession();
            resetDebounceSession();
            return { success: true };
        } catch (error) {
            console.error('Error resetting audio quality session:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Performance Monitor IPC handlers
    ipcMain.handle('start-performance-monitoring', async (event) => {
        try {
            startPerformanceMonitoring();
            return { success: true };
        } catch (error) {
            console.error('Error starting performance monitoring:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('stop-performance-monitoring', async (event) => {
        try {
            stopPerformanceMonitoring();
            return { success: true };
        } catch (error) {
            console.error('Error stopping performance monitoring:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('get-performance-dashboard-data', async (event) => {
        try {
            const dashboardData = getPerformanceDashboardData();
            return { success: true, data: dashboardData };
        } catch (error) {
            console.error('Error getting performance dashboard data:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('get-performance-historical-data', async (event, timeRange) => {
        try {
            const historicalData = getPerformanceHistoricalData(timeRange);
            return { success: true, data: historicalData };
        } catch (error) {
            console.error('Error getting performance historical data:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('reset-all-optimization-systems', async (event) => {
        try {
            resetAllOptimizationSystems();
            return { success: true };
        } catch (error) {
            console.error('Error resetting all optimization systems:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Unified session management for all optimization systems
    ipcMain.handle('initialize-interview-session', async (event, config = {}) => {
        try {
            // Reset all systems
            resetAllOptimizationSystems();
            
            // Configure based on interview type
            if (config.interviewPhase) {
                setInterviewPhase(config.interviewPhase);
            }
            
            if (config.strictAudioMode) {
                setAudioQualityStrictMode(true);
            }
            
            if (config.enableSmartInterruption !== undefined) {
                setSmartInterruptionEnabled(config.enableSmartInterruption);
            }
            
            if (config.enableEnhancedDebounce !== undefined) {
                setEnhancedDebounceEnabled(config.enableEnhancedDebounce);
            }
            
            // Start performance monitoring
            startPerformanceMonitoring();
            
            console.log('🎯 [INTERVIEW_SESSION] Initialized with config:', config);
            
            return { success: true, config };
        } catch (error) {
            console.error('Error initializing interview session:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Enhanced Follow-Up Classifier IPC handlers
    ipcMain.handle('get-follow-up-metrics', async (event) => {
        try {
            const metrics = getFollowUpClassifierMetrics();
            return { success: true, metrics };
        } catch (error) {
            console.error('Error getting follow-up metrics:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('classify-follow-up', async (event, input) => {
        try {
            const classification = classifyFollowUpQuestion(
                input,
                global.latestInterviewContext
            );
            
            return {
                success: true,
                classification
            };
        } catch (error) {
            console.error('Error classifying follow-up:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('provide-follow-up-feedback', async (event, feedback) => {
        try {
            provideFollowUpFeedback(feedback.wasAccurate, feedback.actualType);
            return { success: true };
        } catch (error) {
            console.error('Error providing follow-up feedback:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('reset-follow-up-session', async (event) => {
        try {
            resetFollowUpClassifierSession();
            return { success: true };
        } catch (error) {
            console.error('Error resetting follow-up session:', error);
            return { success: false, error: error.message };
        }
    });
}

// Enhanced debounce management functions
function updateVADAdaptiveData(vadData) {
    vadAdaptiveData = vadData;
    if (enhancedDebounceManager) {
        enhancedDebounceManager.updateVADData(vadData);
    }
    console.log('📊 [VAD_DATA_UPDATE] Updated VAD adaptive data for enhanced debounce');
}

function setEnhancedDebounceEnabled(enabled) {
    enhancedDebounceEnabled = enabled;
    if (enhancedDebounceManager) {
        enhancedDebounceManager.setInterviewMode(enabled);
    }
    console.log(`⚡ [ENHANCED_DEBOUNCE] ${enabled ? 'Enabled' : 'Disabled'} adaptive debounce system`);
}

function getDebouncePerformanceMetrics() {
    if (enhancedDebounceManager) {
        return enhancedDebounceManager.getPerformanceMetrics();
    }
    return {
        currentDelay: INPUT_DEBOUNCE_DELAY,
        averageDelay: INPUT_DEBOUNCE_DELAY,
        minDelay: INPUT_DEBOUNCE_DELAY,
        maxDelay: INPUT_DEBOUNCE_DELAY,
        totalDecisions: 0,
        sessionPhase: 'unknown',
        enhancedDebounceEnabled: false
    };
}

function resetDebounceSession() {
    if (enhancedDebounceManager) {
        enhancedDebounceManager.resetSession();
    }
    console.log('🔄 [DEBOUNCE_RESET] Reset debounce session for new interview');
}

// ENHANCED: Smart Request Manager integration functions
function getSessionPhase() {
    if (!currentSessionId) return 'unknown';
    
    const sessionDuration = Date.now() - (requestStartTime || Date.now());
    const minutesElapsed = sessionDuration / (1000 * 60);
    
    if (minutesElapsed < 5) {
        return 'warmup';
    } else if (minutesElapsed < 25) {
        return 'technical';
    } else {
        return 'closing';
    }
}

function updateSmartRequestManagerPhase() {
    const currentPhase = getSessionPhase();
    if (smartRequestManager) {
        smartRequestManager.updateInterviewPhase(currentPhase);
    }
}

function getSmartRequestMetrics() {
    if (smartRequestManager) {
        return smartRequestManager.getPerformanceMetrics();
    }
    return {
        avgResponseTime: 0,
        totalRequests: 0,
        interruptionSuccessRate: 0,
        sessionDuration: 0
    };
}

function resetSmartRequestSession() {
    if (smartRequestManager) {
        smartRequestManager.resetSession();
    }
    console.log('🚀 [SMART_REQUEST_RESET] Reset Smart Request Manager for new interview');
}

function setSmartInterruptionEnabled(enabled) {
    if (smartRequestManager) {
        smartRequestManager.setInterruptionEnabled(enabled);
    }
    console.log(`🎯 [SMART_INTERRUPTION] ${enabled ? 'Enabled' : 'Disabled'} intelligent interruption`);
}

// ENHANCED: Context Boundary Optimizer integration functions
function getContextBoundaryMetrics() {
    if (contextBoundaryOptimizer) {
        return contextBoundaryOptimizer.getMetrics();
    }
    return {
        contextBoundariesCreated: 0,
        topicsTracked: 0,
        threadsPreserved: 0,
        relevanceScore: 0,
        avgContextLength: 0,
        currentPhase: 'unknown'
    };
}

function setInterviewPhase(phase) {
    if (contextBoundaryOptimizer) {
        contextBoundaryOptimizer.setPhase(phase);
    }
    
    // Also update Smart Request Manager
    if (smartRequestManager) {
        smartRequestManager.updateInterviewPhase(phase);
    }
    
    console.log(`🎯 [INTERVIEW_PHASE] Set to ${phase} across all optimization systems`);
}

function resetContextBoundarySession() {
    if (contextBoundaryOptimizer) {
        contextBoundaryOptimizer.resetSession();
    }
    console.log('🧠 [CONTEXT_RESET] Reset Context Boundary Optimizer for new interview');
}

function getCurrentInterviewPhase() {
    if (contextBoundaryOptimizer) {
        return contextBoundaryOptimizer.currentPhase;
    }
    return getSessionPhase(); // Fallback to time-based detection
}

function getActiveTechnicalTopics() {
    if (contextBoundaryOptimizer) {
        return contextBoundaryOptimizer.getActiveTopics();
    }
    return [];
}

// ENHANCED: Audio Quality Assurance integration functions
function processAudioQuality(audioData) {
    if (audioQualityAssurance) {
        return audioQualityAssurance.processAudioChunk(
            new Float32Array(audioData.audioData),
            {
                timestamp: audioData.timestamp,
                chunkSize: audioData.chunkSize
            }
        );
    }
    return {
        qualityScore: 0.5,
        action: 'process',
        reason: 'quality_assurance_unavailable'
    };
}

function getAudioQualityMetrics() {
    if (audioQualityAssurance) {
        return audioQualityAssurance.getMetrics();
    }
    return {
        totalChunks: 0,
        highQualityChunks: 0,
        lowQualityChunks: 0,
        recoveredChunks: 0,
        droppedChunks: 0,
        recoverySuccessRate: 0,
        avgQualityScore: 0
    };
}

function setAudioQualityInterviewContext(context) {
    if (audioQualityAssurance) {
        audioQualityAssurance.setInterviewContext(context);
    }
    console.log(`🔊 [AUDIO_QUALITY] Updated interview context: ${JSON.stringify(context)}`);
}

function resetAudioQualitySession() {
    if (audioQualityAssurance) {
        audioQualityAssurance.resetSession();
    }
    console.log('🔊 [AUDIO_QUALITY_RESET] Reset Audio Quality Assurance for new interview');
}

function setAudioQualityStrictMode(enabled) {
    if (audioQualityAssurance) {
        audioQualityAssurance.setStrictMode(enabled);
    }
    console.log(`🔊 [STRICT_MODE] ${enabled ? 'Enabled' : 'Disabled'} strict audio quality mode`);
}

// ENHANCED: Performance Monitor integration functions
function startPerformanceMonitoring() {
    if (performanceMonitor) {
        performanceMonitor.startMonitoring();
    }
    console.log('📈 [PERFORMANCE_MONITOR] Started performance monitoring for interview session');
}

function stopPerformanceMonitoring() {
    if (performanceMonitor) {
        performanceMonitor.stopMonitoring();
    }
    console.log('📈 [PERFORMANCE_MONITOR] Stopped performance monitoring');
}

function getPerformanceDashboardData() {
    if (performanceMonitor) {
        return performanceMonitor.getDashboardData();
    }
    return {
        metrics: {},
        trends: {},
        alerts: { active: [], count: 0 },
        recommendations: { current: [], count: 0 },
        session: { duration: 0, phase: 'unknown', overallScore: 0 },
        isMonitoring: false
    };
}

function getPerformanceHistoricalData(timeRange = '1h') {
    if (performanceMonitor) {
        return performanceMonitor.getHistoricalData(timeRange);
    }
    return {
        snapshots: [],
        timeRange,
        count: 0
    };
}

function resetPerformanceMonitorSession() {
    if (performanceMonitor) {
        performanceMonitor.resetSession();
    }
    console.log('📈 [PERFORMANCE_RESET] Reset Performance Monitor for new interview session');
}

// Enhanced session reset that coordinates all optimization systems
function resetAllOptimizationSystems() {
    resetDebounceSession();
    resetSmartRequestSession();
    resetContextBoundarySession();
    resetAudioQualitySession();
    resetPerformanceMonitorSession();
    resetFollowUpClassifierSession();
    
    console.log('🚀 [FULL_RESET] All optimization systems reset for new interview session');
}

// ENHANCED: Enhanced Follow-Up Classifier integration functions
function getFollowUpClassifierMetrics() {
    if (enhancedFollowUpClassifier) {
        return enhancedFollowUpClassifier.getMetrics();
    }
    return {
        totalClassifications: 0,
        followUpDetections: 0,
        followUpDetectionRate: 0,
        contextInjections: 0,
        contextInjectionRate: 0,
        activeTopics: [],
        lastQuestionContext: null
    };
}

function classifyFollowUpQuestion(input, context) {
    if (enhancedFollowUpClassifier) {
        return enhancedFollowUpClassifier.classifyFollowUp(
            input,
            conversationHistory.slice(-5), // Last 5 entries for context
            context || global.latestInterviewContext
        );
    }
    return {
        isFollowUp: false,
        confidence: 0,
        followUpType: 'independent',
        patterns: [],
        contextRecommendation: null,
        technicalTopics: [],
        threadRelationship: null
    };
}

function provideFollowUpFeedback(wasAccurate, actualType = null) {
    if (enhancedFollowUpClassifier) {
        enhancedFollowUpClassifier.provideFeedback(wasAccurate, actualType);
    }
    console.log(`🔗 [FOLLOW_UP_FEEDBACK] Provided feedback: accurate=${wasAccurate}, type=${actualType}`);
}

function resetFollowUpClassifierSession() {
    if (enhancedFollowUpClassifier) {
        enhancedFollowUpClassifier.resetSession();
    }
    console.log('🔗 [FOLLOW_UP_RESET] Reset Enhanced Follow-Up Classifier for new interview session');
}

module.exports = {
    initializeGeminiSession,
    getEnabledTools,
    getStoredSetting,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    getCurrentSessionData,
    sendReconnectionContext,
    killExistingSystemAudioDump,
    startMacOSAudioCapture,
    convertStereoToMono,
    stopMacOSAudioCapture,
    sendAudioToGemini,
    setupGeminiIpcHandlers,
    attemptReconnection,
    initializeMicrophoneSession,
    getMicrophoneTranscription,
    clearMicrophoneTranscription,
    sendMicrophoneAudioToGemini,
    setSpeakerDetectionEnabled,
    isSpeakerDetectionCurrentlyEnabled,
    updateVADAdaptiveData,
    setEnhancedDebounceEnabled,
    getDebouncePerformanceMetrics,
    resetDebounceSession,
    getSmartRequestMetrics,
    updateSmartRequestManagerPhase,
    resetSmartRequestSession,
    setSmartInterruptionEnabled,
    getContextBoundaryMetrics,
    setInterviewPhase,
    resetContextBoundarySession,
    getCurrentInterviewPhase,
    getActiveTechnicalTopics,
    processAudioQuality,
    getAudioQualityMetrics,
    setAudioQualityInterviewContext,
    resetAudioQualitySession,
    setAudioQualityStrictMode,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    getPerformanceDashboardData,
    getPerformanceHistoricalData,
    resetPerformanceMonitorSession,
    resetAllOptimizationSystems,
    getFollowUpClassifierMetrics,
    classifyFollowUpQuestion,
    provideFollowUpFeedback,
    resetFollowUpClassifierSession,
};

