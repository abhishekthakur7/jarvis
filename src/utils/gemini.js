const { GoogleGenAI } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const { getMultipleNotionContents } = require('./notion');
const apiKeyManagerInstance = require('./apiKeyManager');

// Conversation tracking variables
let currentSessionId = null;
let speakerCurrentTranscription = '';
let conversationHistory = [];
let isInitializingSession = false;
let isInitializingMicrophoneSession = false;
let isMicrophoneActive = false;
let isSpeakerDetectionEnabled = true; // Default to enabled
let isClueMode = false; // Clue mode state

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

// Microphone clue mode processing
let microphoneInputDebounceTimer = null;
let pendingMicrophoneInput = '';
const MICROPHONE_INPUT_DEBOUNCE_DELAY = 5000; // 5 seconds delay for microphone input

// Input debouncing variables to prevent interrupted responses
let inputDebounceTimer = null;
let pendingInput = '';
const INPUT_DEBOUNCE_DELAY = 8000; // 8 seconds delay to wait for complete input

// Context and question queue management variables
let contextAccumulator = '';
let lastQuestionTime = null;
let isAiResponding = false;
let questionQueue = [];
const CONTEXT_RESET_TIMEOUT = 60000; // 1 minute context window
const QUESTION_WORDS = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did', 'will', 'have', 'has'];
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
    
    console.log('🚀 [AI_REQUEST] Preparing to send new AI request with complete isolation');
    
    // CRITICAL FIX: Clear any pending debounce timer when starting new AI request
    if (inputDebounceTimer) {
        clearTimeout(inputDebounceTimer);
        inputDebounceTimer = null;
        pendingInput = '';
        console.log('🧹 [DEBOUNCE_CLEARED] Cleared pending debounce timer before new AI request');
    }
    
    // Ensure complete buffer cleanup and context isolation
    cleanupResponseBuffer();
    
    // Force messageBuffer to be completely empty to ensure new response counter
    messageBuffer = '';
    
    // Force new response counter by sending new-response-starting event
    if (!isSuppressingRender) {
        sendToRenderer('new-response-starting');
    }
    
    isAiResponding = true;
    isProcessingTextMessage = true; // CRITICAL FIX: Enable response processing for speaker audio requests
    lastQuestionTime = Date.now();
    
    // Record request start time and log full transcript
    requestStartTime = Date.now();
    const timestamp = new Date(requestStartTime).toISOString();
    console.log('🔄 [INTERRUPTION] Starting new AI request with complete context isolation');
    console.log('⏰ [TRANSCRIPT_SENT] Timestamp:', timestamp);
    console.log('📝 [TRANSCRIPT_SENT] Full transcript sent to Gemini:');
    console.log('📄 [TRANSCRIPT_CONTENT]', combinedText.trim());
    console.log('🔧 [RESPONSE_PROCESSING] Enabled response processing for this request');
    
    // CRITICAL FIX: Save to conversation history immediately to prevent duplicate processing
    conversationHistory.push({
        timestamp: requestStartTime,
        transcription: combinedText.trim(),
        type: 'user_request',
        processed: true
    });
    console.log('💾 [CONVERSATION_SAVED] Saved request to conversation history to prevent duplication');
    
    try {
        // Send the combined text to Gemini using the correct method
        await geminiSession.sendRealtimeInput({ text: combinedText.trim() });
        console.log('✅ [AI_REQUEST] Successfully sent validated questions to AI');
    } catch (error) {
        console.error('❌ [AI_REQUEST_ERROR] Error sending combined questions to AI:', error);
        isAiResponding = false;
        requestStartTime = null; // Reset timing on error
        // Reset state on error
        enforceContextBoundary();
    }
}

// Response buffer cleanup function
function cleanupResponseBuffer() {
    console.log('🧹 [BUFFER_CLEANUP] Starting comprehensive buffer isolation');
    
    if (messageBuffer && messageBuffer.trim()) {
        console.log('🧹 [BUFFER_CLEANUP] Clearing interrupted response buffer:', messageBuffer.substring(0, 100) + '...');
        messageBuffer = '';
    }
    
    // Reset any partial response state
    if (global.pendingContextTranscription) {
        console.log('🧹 [BUFFER_CLEANUP] Clearing pending context transcription');
        global.pendingContextTranscription = null;
    }
    
    // Complete context isolation to prevent bleeding
    resetReconstructionState();
    
    // Clear speaker transcription to prevent context contamination
    if (speakerTranscription && speakerTranscription.trim()) {
        console.log('🧹 [BUFFER_CLEANUP] Clearing speaker transcription to prevent context bleeding');
        speakerTranscription = '';
    }
    
    // Reset AI responding state
    isAiResponding = false;
    corruptionDetected = false;
    
    console.log('✅ [BUFFER_CLEANUP] Complete buffer isolation achieved');
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
        console.log('✅ [INTEGRITY_CHECK] Response integrity validated successfully');
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
                onmessage: async function (message) {
                    console.log('Microphone session message received:', message);
                    // Handle transcription input for microphone
                    if (message.serverContent?.inputTranscription?.text) {
                        const transcriptionText = message.serverContent.inputTranscription.text;
                        
                        // Sanitize the transcription text to remove corrupted characters
                        //const transcriptionText = sanitizeText(rawTranscriptionText);
                        
                        // Skip if sanitization resulted in empty text
                        if (!transcriptionText || transcriptionText.trim().length === 0) {
                            return;
                        }

                        // Prevent duplicate transcriptions by checking recent history
                        const isDuplicate = microphoneConversationHistory.some(entry => 
                            entry.transcription === transcriptionText && 
                            (Date.now() - entry.timestamp) < 2000 // Within 2 seconds
                        );

                        if (!isDuplicate) {
                            microphoneTranscription += transcriptionText + ' ';
                            
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
                            
                            // Handle clue mode processing for microphone input
                            if (isClueMode) {
                                // Accumulate microphone input for clue processing
                                pendingMicrophoneInput += transcriptionText + ' ';
                                
                                // Clear existing timer
                                if (microphoneInputDebounceTimer) {
                                    clearTimeout(microphoneInputDebounceTimer);
                                }
                                
                                // Set new timer to process after delay
                                microphoneInputDebounceTimer = setTimeout(async () => {
                                    if (pendingMicrophoneInput.trim()) {
                                        console.log('🔍 [MICROPHONE_CLUE_MODE] Processing microphone input for clue suggestions:', pendingMicrophoneInput.trim());
                                        
                                        // Send to clue engine for suggestion generation
                                        try {
                                            sendToRenderer('clue-suggestions-loading', true);
                                            const suggestions = await generateClueSuggestions(pendingMicrophoneInput.trim());
                                            sendToRenderer('clue-suggestions-update', suggestions);
                                            sendToRenderer('clue-suggestions-loading', false);
                                        } catch (error) {
                                            console.error('🔍 [MICROPHONE_CLUE_MODE_ERROR] Error generating suggestions:', error);
                                            sendToRenderer('clue-suggestions-loading', false);
                                        }
                                        
                                        // Reset pending input
                                        pendingMicrophoneInput = '';
                                    }
                                }, MICROPHONE_INPUT_DEBOUNCE_DELAY);
                            }

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
        
        // When speaker detection is toggled off, check if clue mode is enabled
        if (contextAccumulator.trim()) {
            // Check if clue mode is enabled - if so, send to clue engine instead
            if (isClueMode) {
                console.log('🔍 [CLUE_MODE_PENDING] Clue mode enabled during pending input processing, sending to clue engine:', contextAccumulator.trim());
                
                // Save transcription to history
                speakerConversationHistory.push({
                    timestamp: Date.now(),
                    transcription: contextAccumulator.trim(),
                    type: 'speaker'
                });
                
                // Send to clue engine for suggestion generation
                try {
                    sendToRenderer('clue-suggestions-loading', true);
                    const suggestions = await generateClueSuggestions(contextAccumulator.trim());
                    sendToRenderer('clue-suggestions-update', suggestions);
                    sendToRenderer('clue-suggestions-loading', false);
                } catch (error) {
                    console.error('🔍 [CLUE_MODE_PENDING_ERROR] Error generating suggestions:', error);
                    sendToRenderer('clue-suggestions-loading', false);
                }
                
                // Reset context and return (don't process through main AI)
                contextAccumulator = '';
                return;
            }
            
            // Normal processing when clue mode is disabled
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

// Clue mode state management
function setClueMode(enabled) {
    isClueMode = enabled;
    console.log(`🔍 [CLUE_MODE] Clue mode ${enabled ? 'enabled' : 'disabled'}`);
}

function isClueModeCurrent() {
    return isClueMode;
}

// Clue engine function to generate suggestions from transcription
async function generateClueSuggestions(transcriptionText) {
    if (!apiKeyManager) {
        console.error('No API key manager available for clue generation');
        return [];
    }

    try {
        console.log('🔍 [CLUE_ENGINE] Generating suggestions for:', transcriptionText);
        
        // Get current API key
        const currentApiKey = apiKeyManager.getCurrentApiKey();
        if (!currentApiKey) {
            console.error('No valid API keys available for clue generation');
            return [];
        }

        // Create a separate client for clue generation (non-streaming)
        const ai = new GoogleGenAI({
            vertexai: false,
            apiKey: currentApiKey,
        });
        
        // Create a focused prompt for suggestion generation
        const cluePrompt = `Based on this transcribed speech: "${transcriptionText}"

Generate 3-5 concise, actionable question suggestions that would help the speaker elaborate or clarify their thoughts. Each suggestion should:
- Be a complete, well-formed question
- Help explore the topic deeper
- Be relevant to the context
- Be under 15 words

Format as a simple JSON array of strings, nothing else:
["Question 1?", "Question 2?", "Question 3?"]`;

        // Send to Gemini for suggestion generation using the correct API
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: cluePrompt,
        });
        
        console.log('🔍 [CLUE_ENGINE] Response object:', typeof response, Object.keys(response));
        
        // Handle response text extraction
        let responseText;
        if (typeof response.text === 'function') {
            responseText = response.text();
        } else if (response.text) {
            responseText = response.text;
        } else if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
            responseText = response.candidates[0].content.parts.map(part => part.text).join('');
        } else {
            console.error('🔍 [CLUE_ENGINE] Unexpected response structure:', response);
            return [];
        }
        
        console.log('🔍 [CLUE_ENGINE] Raw response:', responseText);
        
        // Clean response text by removing markdown code blocks
        let cleanedResponse = responseText.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log('🔍 [CLUE_ENGINE] Cleaned response:', cleanedResponse);
        
        // Try to parse JSON response
        try {
            const suggestions = JSON.parse(cleanedResponse);
            if (Array.isArray(suggestions)) {
                console.log('🔍 [CLUE_ENGINE] Generated suggestions:', suggestions);
                return suggestions;
            }
        } catch (parseError) {
            console.error('🔍 [CLUE_ENGINE] Failed to parse suggestions JSON:', parseError);
            // Fallback: extract questions from text
            const fallbackSuggestions = extractQuestionsFromText(cleanedResponse);
            return fallbackSuggestions;
        }
        
        return [];
    } catch (error) {
        console.error('🔍 [CLUE_ENGINE] Error generating suggestions:', error);
        return [];
    }
}

// Fallback function to extract questions from unstructured text
function extractQuestionsFromText(text) {
    const questionRegex = /[^.!?]*\?/g;
    const matches = text.match(questionRegex);
    if (matches) {
        return matches.map(q => q.trim()).filter(q => q.length > 5 && q.length < 100).slice(0, 5);
    }
    return [];
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
                onmessage: async function (message) {
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
                                
                                // Check if clue mode is enabled - if so, send to clue engine instead of processing immediately
                                if (isClueMode) {
                                    console.log('🔍 [CLUE_MODE_INTERRUPTION] Clue mode enabled during interruption, sending to clue engine:', transcriptionText.trim());
                                    
                                    // Clean up interrupted response
                                    cleanupResponseBuffer();
                                    
                                    // Save transcription to history
                                    speakerConversationHistory.push({
                                        timestamp: Date.now(),
                                        transcription: transcriptionText.trim(),
                                        type: 'speaker'
                                    });
                                    
                                    // Send to clue engine for suggestion generation
                                    try {
                                        sendToRenderer('clue-suggestions-loading', true);
                                        const suggestions = await generateClueSuggestions(transcriptionText.trim());
                                        sendToRenderer('clue-suggestions-update', suggestions);
                                        sendToRenderer('clue-suggestions-loading', false);
                                    } catch (error) {
                                        console.error('🔍 [CLUE_MODE_INTERRUPTION_ERROR] Error generating suggestions:', error);
                                        sendToRenderer('clue-suggestions-loading', false);
                                    }
                                    
                                    // Reset state and return (don't process through main AI)
                                    contextAccumulator = '';
                                    pendingInput = '';
                                    isAiResponding = false;
                                    return;
                                }
                                
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
                                
                                console.log('🔄 [QUEUE_PROCESSING] Processing combined questions immediately');
                                // Process the combined questions immediately
                                processQuestionQueue(session);
                                return;
                            }
                            
                            // Set new timer to process after delay (wait for complete input)
                            inputDebounceTimer = setTimeout(async () => {
                                if (pendingInput.trim()) {
                                    console.log('⏰ [DEBOUNCE_PROCESSING] Processing complete input after delay:', pendingInput.trim());
                                    
                                    // Double-check speaker detection is still enabled before processing
                                    if (!isSpeakerDetectionEnabled) {
                                        console.log('🚫 [DEBOUNCE_SKIP] Speaker detection disabled during debounce, skipping processing');
                                        pendingInput = '';
                                        return;
                                    }
                                    
                                    // Check if clue mode is enabled - if so, send to clue engine instead
                                    if (isClueMode) {
                                        console.log('🔍 [CLUE_MODE_PROCESSING] Clue mode enabled, sending to clue engine:', pendingInput.trim());
                                        
                                        // Save transcription to history
                                        speakerConversationHistory.push({
                                            timestamp: Date.now(),
                                            transcription: pendingInput.trim(),
                                            type: 'speaker'
                                        });
                                        
                                        // Send to clue engine for suggestion generation
                                        try {
                                            sendToRenderer('clue-suggestions-loading', true);
                                            const suggestions = await generateClueSuggestions(pendingInput.trim());
                                            sendToRenderer('clue-suggestions-update', suggestions);
                                            sendToRenderer('clue-suggestions-loading', false);
                                        } catch (error) {
                                            console.error('🔍 [CLUE_MODE_ERROR] Error generating suggestions:', error);
                                            sendToRenderer('clue-suggestions-loading', false);
                                        }
                                        
                                        // Reset pending input and return (don't process through main AI)
                                        pendingInput = '';
                                        return;
                                    }
                                    
                                    // CRITICAL FIX: Check if AI is currently responding to prevent duplicate processing
                                    if (isAiResponding) {
                                        console.log('🚫 [DEBOUNCE_SKIP] AI is currently responding, skipping debounce processing to prevent duplication');
                                        pendingInput = '';
                                        return;
                                    }
                                    
                                    // Enhanced duplicate check before processing
                                    const isDuplicateInDebounce = speakerConversationHistory.some(entry => {
                                        const similarity = entry.transcription.trim() === pendingInput.trim() ||
                                                          entry.transcription.includes(pendingInput.trim()) ||
                                                          pendingInput.includes(entry.transcription.trim());
                                        const isRecent = (Date.now() - entry.timestamp) < 8000; // Within 8 seconds
                                        return similarity && isRecent;
                                    });
                                    
                                    if (isDuplicateInDebounce) {
                                        console.log('🚫 [DEBOUNCE_DUPLICATE] Skipping duplicate content in debounce processing');
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
                                        console.log('🚫 [DEBOUNCE_ALREADY_PROCESSED] Skipping content that was already processed recently:', pendingInput.trim());
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
                                    if (isCompleteQuestion(pendingInput.trim())) {
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
                            }, INPUT_DEBOUNCE_DELAY);

                            // Don't process immediately - wait for debounce timer
                            return;
                        }
                    }

                    // Handle AI model response when microphone is not active AND clue mode is not active OR when processing a text message
                    if ((!isMicrophoneActive && !isClueMode || isProcessingTextMessage) && message.serverContent?.modelTurn?.parts) {
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

                    if ((!isMicrophoneActive && !isClueMode || isProcessingTextMessage) && message.serverContent?.generationComplete) {
                        console.log('🏁 [AI_RESPONSE_COMPLETE] AI response generation completed');
                        
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
                            console.log('🧹 [DEBOUNCE_CLEARED] Cleared debounce timer after AI response completion');
                        }
                        
                        // CRITICAL FIX: Clear context accumulator to prevent reprocessing same content
                        contextAccumulator = '';
                        console.log('🧹 [CONTEXT_CLEARED] Cleared context accumulator to prevent duplicate processing');
                        
                        console.log('🔄 [STATE_RESET] AI response state reset, checking for queued questions');
                        
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
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };

        try {
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
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        try {
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return { success: false, error: 'Invalid text message' };
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
            
            isProcessingTextMessage = true; // Set flag to allow AI response even when microphone is active
            await geminiSessionRef.current.sendRealtimeInput({ text: text.trim() });
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
            
            await geminiSessionRef.current.sendRealtimeInput({ text: completeTranscription.trim() });
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

    // Clue mode IPC handlers
    ipcMain.handle('set-clue-mode', async (event, enabled) => {
        try {
            setClueMode(enabled);
            return { success: true };
        } catch (error) {
            console.error('Error setting clue mode:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('is-clue-mode-enabled', async (event) => {
        try {
            return { success: true, enabled: isClueModeCurrent() };
        } catch (error) {
            console.error('Error getting clue mode state:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('generate-clue-suggestions', async (event, transcriptionText) => {
        try {
            const suggestions = await generateClueSuggestions(transcriptionText);
            return { success: true, suggestions };
        } catch (error) {
            console.error('Error generating clue suggestions:', error);
            return { success: false, error: error.message };
        }
    });
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
    setClueMode,
    isClueModeCurrent,
    generateClueSuggestions,
};

