const { GoogleGenAI } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const { getMultipleNotionContents } = require('./notion');

// Conversation tracking variables
let currentSessionId = null;
let speakerCurrentTranscription = '';
let conversationHistory = [];
let isInitializingSession = false;
let isInitializingMicrophoneSession = false;
let isMicrophoneActive = false;

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
const INPUT_DEBOUNCE_DELAY = 3000; // 2 seconds delay to wait for complete input

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

                            //console.log(microphoneConversationHistory);
                        }
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

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-IN', isReconnection = false) {
    if (isInitializingSession) {
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);

    if (!isReconnection) {
        lastSessionParams = {
            apiKey,
            customPrompt,
            profile,
            language,
        };
        reconnectionAttempts = 0;
    }

    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
    });

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
                    // Handle transcription input with debouncing to prevent interrupted responses
                    if(isMicrophoneActive) {
                        if (message.serverContent?.inputTranscription?.text) {
                            let transcriptionText = message.serverContent?.inputTranscription?.text;
                            // Sanitize the transcription text to remove corrupted characters
                            //transcriptionText = sanitizeText(transcriptionText);
                            if (!transcriptionText || transcriptionText.trim().length === 0) {
                                return;
                            }

                            // Clear existing debounce timer
                            if (inputDebounceTimer) {
                                clearTimeout(inputDebounceTimer);
                            }

                            // Accumulate input instead of processing immediately
                            pendingInput += transcriptionText + ' ';
                            console.log('Accumulating input:', transcriptionText);

                            // Set new timer to process after delay (wait for complete input)
                            inputDebounceTimer = setTimeout(() => {
                                if (pendingInput.trim()) {
                                    console.log('Processing complete input after delay:', pendingInput.trim());
                                    
                                    // Prevent duplicate transcriptions by checking recent history
                                    const isDuplicate = speakerConversationHistory.some(entry => 
                                        entry.transcription === pendingInput.trim() && 
                                        (Date.now() - entry.timestamp) < 2000 // Within 2 seconds
                                    );

                                    if (!isDuplicate) {
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

                                        console.log('Saved complete transcription:', pendingInput.trim());
                                    }
                                    
                                    // Reset pending input
                                    pendingInput = '';
                                }
                            }, INPUT_DEBOUNCE_DELAY);

                            // Don't process immediately - wait for debounce timer
                            return;
                        }
                    }

                    // Handle AI model response when microphone is not active OR when processing a text message
                    if ((!isMicrophoneActive || isProcessingTextMessage) && message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            if (part.text) {
                                // If this is the first part of a new response, signal that a new response is starting
                                if (messageBuffer === '') {
                                    if (!isSuppressingRender) {
                                        sendToRenderer('new-response-starting');
                                    }
                                }
                                // Sanitize the AI response text to remove corrupted characters
                                //const sanitizedText = sanitizeText(part.text);
                                messageBuffer += part.text;
                                if (!isSuppressingRender) {
                                    sendToRenderer('update-response', messageBuffer);
                                }
                            }
                        }
                    }

                    if ((!isMicrophoneActive || isProcessingTextMessage) && message.serverContent?.generationComplete) {
                        if (!isSuppressingRender) {
                            sendToRenderer('update-response', messageBuffer);
                        }

                        // Save conversation turn when we have both transcription and AI response
                        if (isProcessingTextMessage && global.pendingContextTranscription && messageBuffer) {
                            // Check if this is a reconnection context message (should not be saved)
                            const isReconnectionContext = global.pendingContextTranscription.includes('Till now all these questions were asked in the interview');
                            
                            if (isReconnectionContext) {
                                // DO NOT save context messages to conversation history to prevent recursive loops
                                // Context messages are internal reconnection messages and should not be persisted
                                console.log('Skipping save of context message to prevent recursive loop');
                            } else {
                                // Save screenshot context messages and other text messages
                                // Pass suppression flag to indicate if this response was suppressed from UI
                                saveConversationTurn(global.pendingContextTranscription, messageBuffer, isSuppressingRender);
                            }
                            global.pendingContextTranscription = null; // Reset after processing
                        } else if (speakerCurrentTranscription && messageBuffer) {
                            // Save regular speaker-only transcription
                            // Pass suppression flag to indicate if this response was suppressed from UI
                            saveConversationTurn(speakerCurrentTranscription, messageBuffer, isSuppressingRender);
                            speakerCurrentTranscription = ''; // Reset for next turn
                        }

                        messageBuffer = '';
                        isProcessingTextMessage = false; // Reset flag after processing
                    }

                    if (message.serverContent?.inputTranscription?.text) {
                        speakerCurrentTranscription += message.serverContent.inputTranscription.text;
                    }

                    if (message.serverContent?.turnComplete) {
                        sendToRenderer('update-status', 'Listening...');
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
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
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

    systemAudioProc.stdout.on('data', data => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.slice(0, CHUNK_SIZE);
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);

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
    if (!geminiSessionRef.current) return;

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
        console.log('Sending text before:', text);
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        console.log('Sending text after:', text);
        try {
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return { success: false, error: 'Invalid text message' };
            }

            console.log('Sending text message:', text);
            isProcessingTextMessage = true; // Set flag to allow AI response even when microphone is active
            await geminiSessionRef.current.sendRealtimeInput({ text: text.trim() });
            return { success: true };
        } catch (error) {
            console.error('Error sending text:', error);
            isProcessingTextMessage = false; // Reset flag on error
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

            console.log('\nSending context-with-screenshot:', completeTranscription);
            isProcessingTextMessage = true; // Set flag to allow AI response even when microphone is active
            
            // Store the complete transcription for saving after AI response
            global.pendingContextTranscription = completeTranscription.trim();
            
            await geminiSessionRef.current.sendRealtimeInput({ text: completeTranscription.trim() });
            return { success: true };
        } catch (error) {
            console.error('\nError sending context-with-screenshot:', error);
            isProcessingTextMessage = false; // Reset flag on error
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
};
