// renderer.js
const { ipcRenderer } = require('electron');

let mediaStream = null;
let screenshotInterval = null;
let audioContext = null;
let audioProcessor = null;
let micAudioProcessor = null;
let audioBuffer = [];
const SAMPLE_RATE = 24000;
const AUDIO_CHUNK_DURATION = 0.1; // seconds
const BUFFER_SIZE = 4096; // Increased buffer size for smoother audio

let hiddenVideo = null;
let offscreenCanvas = null;
let offscreenContext = null;
let currentImageQuality = 'medium'; // Store current image quality for manual screenshots

const isLinux = process.platform === 'linux';
const isMacOS = process.platform === 'darwin';

// Session state tracking for system prompt execution
let sessionState = {
    isInitialized: false,
    systemPromptExecuted: false,
    sessionId: null
};

// Token tracking system for rate limiting
let tokenTracker = {
    tokens: [], // Array of {timestamp, count, type} objects
    audioStartTime: null,

    // Add tokens to the tracker
    addTokens(count, type = 'image') {
        const now = Date.now();
        this.tokens.push({
            timestamp: now,
            count: count,
            type: type,
        });

        // Clean old tokens (older than 1 minute)
        this.cleanOldTokens();
    },

    // Calculate image tokens based on Gemini 2.0 rules
    calculateImageTokens(width, height) {
        // Images ≤384px in both dimensions = 258 tokens
        if (width <= 384 && height <= 384) {
            return 258;
        }

        // Larger images are tiled into 768x768 chunks, each = 258 tokens
        const tilesX = Math.ceil(width / 768);
        const tilesY = Math.ceil(height / 768);
        const totalTiles = tilesX * tilesY;

        return totalTiles * 258;
    },

    // Track audio tokens continuously
    trackAudioTokens() {
        if (!this.audioStartTime) {
            this.audioStartTime = Date.now();
            return;
        }

        const now = Date.now();
        const elapsedSeconds = (now - this.audioStartTime) / 1000;

        // Audio = 32 tokens per second
        const audioTokens = Math.floor(elapsedSeconds * 32);

        if (audioTokens > 0) {
            this.addTokens(audioTokens, 'audio');
            this.audioStartTime = now;
        }
    },

    // Clean tokens older than 1 minute
    cleanOldTokens() {
        const oneMinuteAgo = Date.now() - 60 * 1000;
        this.tokens = this.tokens.filter(token => token.timestamp > oneMinuteAgo);
    },

    // Get total tokens in the last minute
    getTokensInLastMinute() {
        this.cleanOldTokens();
        return this.tokens.reduce((total, token) => total + token.count, 0);
    },

    // Check if we should throttle based on settings
    shouldThrottle() {
        // Get rate limiting settings from localStorage
        const throttleEnabled = localStorage.getItem('throttleTokens') === 'true';
        if (!throttleEnabled) {
            return false;
        }

        const maxTokensPerMin = parseInt(localStorage.getItem('maxTokensPerMin') || '1000000', 10);
        const throttleAtPercent = parseInt(localStorage.getItem('throttleAtPercent') || '75', 10);

        const currentTokens = this.getTokensInLastMinute();
        const throttleThreshold = Math.floor((maxTokensPerMin * throttleAtPercent) / 100);

        console.log(`Token check: ${currentTokens}/${maxTokensPerMin} (throttle at ${throttleThreshold})`);

        return currentTokens >= throttleThreshold;
    },

    // Reset the tracker
    reset() {
        this.tokens = [];
        this.audioStartTime = null;
    },
};

// Track audio tokens every few seconds
setInterval(() => {
    tokenTracker.trackAudioTokens();
}, 2000);



function convertFloat32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        // Improved scaling to prevent clipping
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function initializeGemini(profile = 'interview', language = 'en-IN') {
    const apiKey = localStorage.getItem('apiKey')?.trim();
    if (apiKey) {
        const customPrompt = localStorage.getItem('customPrompt') || '';
        const success = await ipcRenderer.invoke('initialize-gemini', apiKey, customPrompt, profile, language);
        if (success) {
            cheddar.setStatus('Live');
            
            // Reset session state for new session
            sessionState = {
                isInitialized: true,
                systemPromptExecuted: false,
                sessionId: Date.now() // Simple session ID
            };
            
            console.log('Session initialized, system prompt will execute on first Ask Next Step usage');
            
            // REMOVED: Auto-execution of custom prompt
            // The system prompt will now execute when shift+alt+4 is used for the first time
        } else {
            cheddar.setStatus('error');
        }
    }
}

// Listen for status updates
ipcRenderer.on('update-status', (event, status) => {
    console.log('Status update:', status);
                    cheddar.setStatus(status);
});

// Listen for responses - REMOVED: This is handled in AssistantApp.js to avoid duplicates
// ipcRenderer.on('update-response', (event, response) => {
//     console.log('Gemini response:', response);
//     cheddar.e().setResponse(response);
//     // You can add UI elements to display the response if needed
// });

async function startCapture(screenshotIntervalSeconds = 5, imageQuality = 'medium') {
    // Store the image quality for manual screenshots
    currentImageQuality = imageQuality;

    // Reset token tracker when starting new capture session
    tokenTracker.reset();
    console.log('🎯 Token tracker reset for new capture session');

    try {
        if (isMacOS) {
            // On macOS, use SystemAudioDump for audio and getDisplayMedia for screen
            console.log('Starting macOS capture with SystemAudioDump...');

            // Start macOS audio capture
            const audioResult = await ipcRenderer.invoke('start-macos-audio');
            if (!audioResult.success) {
                throw new Error('Failed to start macOS audio capture: ' + audioResult.error);
            }

            // Get screen capture for screenshots
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 1,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false, // Don't use browser audio on macOS
            });

            console.log('macOS screen capture started - audio handled by SystemAudioDump');
        } else if (isLinux) {
            // Linux - use display media for screen capture and getUserMedia for microphone
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 1,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false, // Don't use system audio loopback on Linux
            });

            // Get microphone input for Linux
            let micStream = null;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: SAMPLE_RATE,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false,
                });

                console.log('Linux microphone capture started');

                // Setup audio processing for microphone on Linux
                setupLinuxMicProcessing(micStream);
            } catch (micError) {
                console.warn('Failed to get microphone access on Linux:', micError);
                // Continue without microphone if permission denied
            }

            console.log('Linux screen capture started');
        } else {
            // Windows - use display media with loopback for system audio
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 1,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: {
                    sampleRate: SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            console.log('Windows capture started with loopback audio');

            // Setup audio processing for Windows loopback audio with VAD support
            await setupWindowsLoopbackProcessing();
        }

        console.log('MediaStream obtained:', {
            hasVideo: mediaStream.getVideoTracks().length > 0,
            hasAudio: mediaStream.getAudioTracks().length > 0,
            videoTrack: mediaStream.getVideoTracks()[0]?.getSettings(),
        });

        // Start capturing screenshots - check if manual mode
        if (screenshotIntervalSeconds === 'manual' || screenshotIntervalSeconds === 'Manual') {
            console.log('Manual mode enabled - screenshots will be captured on demand only');
            // Don't start automatic capture in manual mode
        } else {
            const intervalMilliseconds = parseInt(screenshotIntervalSeconds) * 1000;
            screenshotInterval = setInterval(() => captureScreenshot(imageQuality), intervalMilliseconds);

            // Capture first screenshot immediately
            setTimeout(() => captureScreenshot(imageQuality), 100);
        }
    } catch (err) {
        console.error('Error starting capture:', err);
                            cheddar.setStatus('error');
    }
}

function setupLinuxMicProcessing(micStream) {
    // Setup microphone audio processing for Linux
    const micAudioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const micSource = micAudioContext.createMediaStreamSource(micStream);
    const micProcessor = micAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;

    micProcessor.onaudioprocess = async e => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        // Process audio in chunks
        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);
            const pcmData16 = convertFloat32ToInt16(chunk);
            const base64Data = arrayBufferToBase64(pcmData16.buffer);

            await ipcRenderer.invoke('send-audio-content', {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            });
        }
    };

    micSource.connect(micProcessor);
    micProcessor.connect(micAudioContext.destination);

    // Store processor reference for cleanup
    audioProcessor = micProcessor;
}

async function setupWindowsLoopbackProcessing() {
    try {
        // Setup audio processing for Windows loopback audio with VAD support
        audioContext = new AudioContext({ 
            sampleRate: SAMPLE_RATE,
            latencyHint: 'interactive'
        });
        
        // Load AudioWorklet processor for VAD support
        console.log('🔄 Loading AudioWorklet module for speaker audio...');
        await audioContext.audioWorklet.addModule('/src/utils/audioWorkletProcessor.js');
        console.log('✅ AudioWorklet module loaded successfully for speaker audio');
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        
        // Create worklet node with VAD configuration optimized for clue mode
        const workletNode = new AudioWorkletNode(audioContext, 'jarvis-audio-processor', {
            processorOptions: {
                sampleRate: SAMPLE_RATE,
                frameSize: 480,
                energyThreshold: 0.0005, // Very low threshold for sensitive speech detection in clue mode
                silenceFrames: 3, // Reduced to 60ms for faster speechEnd detection in clue mode
                speechFrames: 1, // Single frame to start speech detection - more responsive
                chunkDuration: AUDIO_CHUNK_DURATION
            }
        });
        
        // Handle messages from the worklet
        workletNode.port.onmessage = async (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'audioChunk':
                    // Send audio chunk to backend
                    await ipcRenderer.invoke('send-audio-content', {
                        data: data.base64Data,
                        mimeType: 'audio/pcm;rate=24000',
                    });
                    break;
                    
                case 'vadEvent':
                    // Forward VAD events for speaker audio to backend
                    if (window.cheddar && window.cheddar.handleSpeakerVADEvent) {
                        await window.cheddar.handleSpeakerVADEvent(data);
                    }
                    break;
                    
                case 'error':
                    console.error('Speaker audio worklet error:', data);
                    break;
            }
        };
        
        source.connect(workletNode);
        workletNode.connect(audioContext.destination);
        
        // Store processor reference for cleanup
        audioProcessor = workletNode;
        
        console.log('✅ Windows loopback processing with VAD initialized');
        
    } catch (error) {
        console.error('❌ Failed to setup Windows loopback processing with VAD:', error);
        // Fallback to original ScriptProcessor approach
        setupWindowsLoopbackProcessingFallback();
    }
}

function setupWindowsLoopbackProcessingFallback() {
    // Fallback: Setup audio processing for Windows loopback audio without VAD
    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = audioContext.createMediaStreamSource(mediaStream);
    audioProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;
    let frameCount = 0;

    audioProcessor.onaudioprocess = async e => {
        const inputData = e.inputBuffer.getChannelData(0);
        frameCount++;
        
        audioBuffer.push(...inputData);

        // Process audio in chunks
        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);
            const pcmData16 = convertFloat32ToInt16(chunk);
            const base64Data = arrayBufferToBase64(pcmData16.buffer);
            
            //console.log(`Speaker Audio: Sending chunk to backend, size=${pcmData16.length}`);

            // Always send audio to IPC handler - it will decide whether to send to Gemini or not
            await ipcRenderer.invoke('send-audio-content', {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            });
        }
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);
    
    console.log('⚠️ Using fallback ScriptProcessor for speaker audio (no VAD)');
}

async function captureScreenshot(imageQuality = 'medium', isManual = false) {
    console.log(`Capturing ${isManual ? 'manual' : 'automated'} screenshot...`);
    if (!mediaStream) return;

    // Check rate limiting for automated screenshots only
    if (!isManual && tokenTracker.shouldThrottle()) {
        console.log('⚠️ Automated screenshot skipped due to rate limiting');
        return;
    }

    // Lazy init of video element
    if (!hiddenVideo) {
        hiddenVideo = document.createElement('video');
        hiddenVideo.srcObject = mediaStream;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        await hiddenVideo.play();

        await new Promise(resolve => {
            if (hiddenVideo.readyState >= 2) return resolve();
            hiddenVideo.onloadedmetadata = () => resolve();
        });

        // Lazy init of canvas based on video dimensions
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = hiddenVideo.videoWidth;
        offscreenCanvas.height = hiddenVideo.videoHeight;
        offscreenContext = offscreenCanvas.getContext('2d');
    }

    // Check if video is ready
    if (hiddenVideo.readyState < 2) {
        console.warn('Video not ready yet, skipping screenshot');
        return;
    }

    offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // Check if image was drawn properly by sampling a pixel
    const imageData = offscreenContext.getImageData(0, 0, 1, 1);
    const isBlank = imageData.data.every((value, index) => {
        // Check if all pixels are black (0,0,0) or transparent
        return index === 3 ? true : value === 0;
    });

    if (isBlank) {
        console.warn('Screenshot appears to be blank/black');
    }

    let qualityValue;
    switch (imageQuality) {
        case 'high':
            qualityValue = 0.9;
            break;
        case 'medium':
            qualityValue = 0.7;
            break;
        case 'low':
            qualityValue = 0.5;
            break;
        default:
            qualityValue = 0.7; // Default to medium
    }

    offscreenCanvas.toBlob(
        async blob => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];

                // Validate base64 data
                if (!base64data || base64data.length < 100) {
                    console.error('Invalid base64 data generated');
                    return;
                }

                const result = await ipcRenderer.invoke('send-image-content', {
                    data: base64data,
                });

                if (result.success) {
                    // Track image tokens after successful send
                    const imageTokens = tokenTracker.calculateImageTokens(offscreenCanvas.width, offscreenCanvas.height);
                    tokenTracker.addTokens(imageTokens, 'image');
                    console.log(`📊 Image sent successfully - ${imageTokens} tokens used (${offscreenCanvas.width}x${offscreenCanvas.height})`);
                } else {
                    console.error('Failed to send image:', result.error);
                }
            };
            reader.readAsDataURL(blob);
        },
        'image/jpeg',
        qualityValue
    );
}

async function captureManualScreenshot(imageQuality = null) {
    console.log('Manual screenshot triggered');
    const quality = imageQuality || currentImageQuality;
    await captureScreenshot(quality, true); // Pass true for isManual
    await new Promise(resolve => setTimeout(resolve, 2000)); // TODO shitty hack
    
    // Notify the app component that we're about to send an automatic response
    const app = cheddar.element();
    if (app && app._awaitingNewResponse !== undefined) {
        app._awaitingNewResponse = true;
        //console.log('[captureManualScreenshot] Set _awaitingNewResponse = true for automatic response');
    }
    
    await sendTextMessage(`Help me on this page, give me the answer no bs, complete answer.
        So if its a code question, give me the approach in few bullet points, then the entire code. Also if theres anything else i need to know, tell me.
        If its a question about the website, give me the answer no bs, complete answer.
        If its a mcq question, give me the answer no bs, complete answer.
        `);
}

async function captureScreenshotAndSendContext(imageQuality = null) {
    console.log('Sending screenshot and context');
    
    // Check if this is the first time using Ask Next Step after session creation
    if (sessionState.isInitialized && !sessionState.systemPromptExecuted) {
        console.log('First time using Ask Next Step - executing system prompt only');
        
        const customPrompt = localStorage.getItem('customPrompt') || '';
        if (customPrompt && customPrompt.trim().length > 0) {
            try {
                // Execute system prompt only on first use
                await sendTextMessage(customPrompt.trim());
                console.log('System prompt executed successfully on first Ask Next Step usage');
                
                // Mark as executed
                sessionState.systemPromptExecuted = true;
                
                // Return early - don't proceed with screenshot context on first use
                return { success: true, message: 'System prompt executed on first use' };
            } catch (error) {
                console.error('Failed to execute system prompt on first usage:', error);
                // Mark as executed even if failed to avoid infinite retry
                sessionState.systemPromptExecuted = true;
                return { success: false, error: 'Failed to execute system prompt: ' + error.message };
            }
        } else {
            // No system prompt to execute, just mark as executed and continue normally
            sessionState.systemPromptExecuted = true;
            console.log('No system prompt configured, proceeding with normal screenshot context');
        }
    }
    
    const quality = imageQuality || currentImageQuality;
    await captureScreenshot(quality, true); // capture screenshot and send to gemini
    await new Promise(resolve => setTimeout(resolve, 2000)); // shitty hack, so that screenshot is uploaded to gemini

    // Notify the app component that we're about to send an automatic response
    const app = cheddar.element();
    if (app && app._awaitingNewResponse !== undefined) {
        app._awaitingNewResponse = true;
        //console.log('[captureScreenshotAndSendContext] Set _awaitingNewResponse = true for automatic response');
    }

    //Gather the speaker and microphone transcriptions and prepare final response
    try {
        const result = await ipcRenderer.invoke('process-context-with-screenshot');
        if (result.success) {
            console.log('Contexual message sent successfully');
        } else {
            console.error('Failed to send Contexual message:', result.error);
        }
        return result;
    } catch (error) {
        console.error('Error sending Contexual message:', error);
        return { success: false, error: error.message };
    }
}

// Expose functions to global scope for external access
window.captureManualScreenshot = captureManualScreenshot;

function stopCapture() {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
    }

    if (audioProcessor) {
        audioProcessor.disconnect();
        audioProcessor = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    // Stop macOS audio capture if running
    if (isMacOS) {
        ipcRenderer.invoke('stop-macos-audio').catch(err => {
            console.error('Error stopping macOS audio:', err);
        });
    }

    // Clean up hidden elements
    if (hiddenVideo) {
        hiddenVideo.pause();
        hiddenVideo.srcObject = null;
        hiddenVideo = null;
    }
    offscreenCanvas = null;
    offscreenContext = null;
}

// Send text message to Gemini
async function sendTextMessage(text) {
    if (!text || text.trim().length === 0) {
        console.warn('Cannot send empty text message');
        return { success: false, error: 'Empty message' };
    }

    try {
        const result = await ipcRenderer.invoke('send-text-message', text);
        if (result.success) {
            console.log('Text message sent successfully');
        } else {
            console.error('Failed to send text message:', result.error);
        }
        return result;
    } catch (error) {
        console.error('Error sending text message:', error);
        return { success: false, error: error.message };
    }
}

// Conversation storage functions using IndexedDB
let conversationDB = null;

async function initConversationStorage() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ConversationHistory', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            conversationDB = request.result;
            resolve(conversationDB);
        };

        request.onupgradeneeded = event => {
            const db = event.target.result;

            // Create sessions store
            if (!db.objectStoreNames.contains('sessions')) {
                const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
                sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

async function saveConversationSession(sessionId, conversationHistory) {
    if (!conversationDB) {
        await initConversationStorage();
    }

    const transaction = conversationDB.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');

    const sessionData = {
        sessionId: sessionId,
        timestamp: parseInt(sessionId),
        conversationHistory: conversationHistory,
        lastUpdated: Date.now(),
    };

    return new Promise((resolve, reject) => {
        const request = store.put(sessionData);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getConversationSession(sessionId) {
    if (!conversationDB) {
        await initConversationStorage();
    }

    const transaction = conversationDB.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');

    return new Promise((resolve, reject) => {
        const request = store.get(sessionId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getAllConversationSessions() {
    if (!conversationDB) {
        await initConversationStorage();
    }

    const transaction = conversationDB.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            // Sort by timestamp descending (newest first)
            const sessions = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sessions);
        };
    });
}

// Listen for conversation data from main process
ipcRenderer.on('save-conversation-turn', async (event, data) => {
    try {
        await saveConversationSession(data.sessionId, data.fullHistory);
        console.log('Conversation session saved:', data.sessionId);
        

    } catch (error) {
        console.error('Error saving conversation session:', error);
    }
});

// Initialize conversation storage when renderer loads
initConversationStorage().catch(console.error);

// Handle shortcuts based on current view
function handleShortcut(shortcutKey) {
    console.log('🎯 [SHORTCUT_HANDLER] Received shortcut:', shortcutKey);
    const currentView = cheddar.getCurrentView();
    console.log('🎯 [SHORTCUT_HANDLER] Current view:', currentView);

    if (shortcutKey === 'shift+alt+4' || shortcutKey === 'shift+Alt+4') {
        if (currentView === 'main') {
            cheddar.element().handleStart();
        } else {
            captureScreenshotAndSendContext();
        }
    } else if (shortcutKey === 'shift+alt+8' || shortcutKey === 'shift+Alt+8') {
        if (currentView === 'jarvis') {
            // Trigger microphone toggle in jarvis view
            const jarvisView = cheddar.element().shadowRoot.querySelector('jarvis-view');
            if (jarvisView && jarvisView.toggleMicrophone) {
                jarvisView.toggleMicrophone();
            }
        }
    } else if (shortcutKey === 'shift+alt+0' || shortcutKey === 'shift+Alt+0') {
        console.log('🎯 [SHORTCUT_HANDLER] Processing speaker detection toggle');
        if (currentView === 'jarvis') {
            // Trigger speaker detection toggle in jarvis view
            const jarvisView = cheddar.element().shadowRoot.querySelector('jarvis-view');
            console.log('🎯 [SHORTCUT_HANDLER] Found jarvis view:', !!jarvisView);
            if (jarvisView && jarvisView.toggleSpeakerDetection) {
                console.log('🎯 [SHORTCUT_HANDLER] Calling toggleSpeakerDetection');
                jarvisView.toggleSpeakerDetection();
            } else {
                console.log('🎯 [SHORTCUT_HANDLER] toggleSpeakerDetection method not found');
            }
        } else {
            console.log('🎯 [SHORTCUT_HANDLER] Not in jarvis view, ignoring speaker detection toggle');
        }
    } else if (shortcutKey === 'ctrl+g' || shortcutKey === 'cmd+g') {
        if (currentView === 'jarvis') {
            // Trigger session reinitialization in jarvis view
            cheddar.element().reinitializeSession();
        }
    }
}

// Create reference to the main app element
const AssistantApp = document.querySelector('jarvis-app');

// Consolidated cheddar object - all functions in one place
const cheddar = {
    // Element access
    element: () => AssistantApp,
    e: () => AssistantApp,
    
    // App state functions - access properties directly from the app element
    getCurrentView: () => AssistantApp.currentView,
    getLayoutMode: () => AssistantApp.layoutMode,
    setLayoutMode: (layoutMode) => AssistantApp.handleLayoutModeChange(layoutMode),
    handleLayoutModeCycle: () => AssistantApp.handleLayoutModeCycle(),
    
    // Status and response functions
    setStatus: (text) => AssistantApp.setStatus(text),
    setResponse: (response) => AssistantApp.setResponse(response),
    
    // Core functionality
    initializeGemini,
    startCapture,
    stopCapture,
    sendTextMessage,
    handleShortcut,
    
    // Conversation history functions
    getAllConversationSessions,
    getConversationSession,
    initConversationStorage,
    
    // Content protection function
    getContentProtection: () => {
        const contentProtection = localStorage.getItem('contentProtection');
        return contentProtection !== null ? contentProtection === 'true' : true;
    },
    
    // Platform detection
    isLinux: isLinux,
    isMacOS: isMacOS,
};

// Microphone session functions
async function initializeMicrophoneSession() {
    const apiKey = localStorage.getItem('apiKey')?.trim();
    if (!apiKey) {
        console.error('No API key found for microphone session');
        return { success: false, error: 'No API key' };
    }

    // Get language setting from localStorage, default to 'en-IN'
    const language = localStorage.getItem('selectedLanguage') || 'en-IN';
    console.log('Initializing microphone session with language:', language);

    try {
        const result = await ipcRenderer.invoke('initialize-microphone-session', apiKey, 'interview', language);
        if (result.success) {
            console.log('Microphone session initialized successfully with language:', language);
        } else {
            console.error('Failed to initialize microphone session:', result.error);
        }
        return result;
    } catch (error) {
        console.error('Error initializing microphone session:', error);
        return { success: false, error: error.message };
    }
}

async function attemptReconnection() {
    try {
        const result = await ipcRenderer.invoke('attempt-reconnection');
        return result;
    } catch (error) {
        console.error('Error attempting reconnection:', error);
        return { success: false, error: error.message };
    }
}

async function sendMicrophoneAudio(audioData) {
    try {
        const result = await ipcRenderer.invoke('send-microphone-audio', audioData);
        return result;
    } catch (error) {
        console.error('Error sending microphone audio:', error);
        return { success: false, error: error.message };
    }
}

async function getMicrophoneTranscription() {
    console.log('renderer.js: getMicrophoneTranscription called - invoking IPC');
    try {
        const result = await ipcRenderer.invoke('get-microphone-transcription');
        console.log('renderer.js: IPC get-microphone-transcription result:', result);
        return result;
    } catch (error) {
        console.error('renderer.js: Error getting microphone transcription:', error);
        return { success: false, transcription: '' };
    }
}

async function clearMicrophoneTranscription() {
    try {
        const result = await ipcRenderer.invoke('clear-microphone-transcription');
        return result;
    } catch (error) {
        console.error('Error clearing microphone transcription:', error);
        return { success: false };
    }
}

async function closeMicrophoneSession() {
    try {
        const result = await ipcRenderer.invoke('close-microphone-session');
        if (result.success) {
            console.log('Microphone session closed successfully');
        } else {
            console.error('Failed to close microphone session:', result.error);
        }
        return result;
    } catch (error) {
        console.error('Error closing microphone session:', error);
        return { success: false, error: error.message };
    }
}

// Speaker transcription functions
async function getSpeakerTranscription() {
    try {
        const result = await ipcRenderer.invoke('get-speaker-transcription');
        return result;
    } catch (error) {
        console.error('Error getting speaker transcription:', error);
        return { success: false, transcription: '' };
    }
}

async function clearSpeakerTranscription() {
    try {
        const result = await ipcRenderer.invoke('clear-speaker-transcription');
        return result;
    } catch (error) {
        console.error('Error clearing speaker transcription:', error);
        return { success: false };
    }
}

// Microphone state management functions
async function setMicrophoneActive(active) {
    try {
        const result = await ipcRenderer.invoke('set-microphone-active', active);
        return result;
    } catch (error) {
        console.error('Error setting microphone active state:', error);
        return { success: false, error: error.message };
    }
}

async function isMicrophoneActive() {
    try {
        const result = await ipcRenderer.invoke('is-microphone-active');
        return result;
    } catch (error) {
        console.error('Error getting microphone active state:', error);
        return { success: false, active: false };
    }
}

// Speaker detection state management functions
async function setSpeakerDetectionEnabled(enabled) {
    try {
        const result = await ipcRenderer.invoke('set-speaker-detection-enabled', enabled);
        return result;
    } catch (error) {
        console.error('Error setting speaker detection state:', error);
        return { success: false, error: error.message };
    }
}

async function isSpeakerDetectionEnabled() {
    try {
        const result = await ipcRenderer.invoke('is-speaker-detection-enabled');
        return result;
    } catch (error) {
        console.error('Error getting speaker detection state:', error);
        return { success: false, enabled: true };
    }
}

// Add microphone functions to cheddar object
cheddar.initializeMicrophoneSession = initializeMicrophoneSession;
cheddar.sendMicrophoneAudio = sendMicrophoneAudio;
cheddar.getMicrophoneTranscription = getMicrophoneTranscription;
cheddar.clearMicrophoneTranscription = clearMicrophoneTranscription;
cheddar.closeMicrophoneSession = closeMicrophoneSession;

// Add speaker transcription functions to cheddar object
cheddar.getSpeakerTranscription = getSpeakerTranscription;
cheddar.clearSpeakerTranscription = clearSpeakerTranscription;

// Add microphone state management functions to cheddar object
cheddar.setMicrophoneActive = setMicrophoneActive;
cheddar.isMicrophoneActive = isMicrophoneActive;

// Add speaker detection state management functions to cheddar object
cheddar.setSpeakerDetectionEnabled = setSpeakerDetectionEnabled;
cheddar.isSpeakerDetectionEnabled = isSpeakerDetectionEnabled;

// Add clue mode state management functions to cheddar object
cheddar.setClueModeEnabled = async (enabled) => {
    if (window.require) {
        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke('set-clue-mode', enabled);
    }
    return { success: false, error: 'IPC not available' };
};
cheddar.isClueModeEnabled = async () => {
    if (window.require) {
        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke('is-clue-mode-enabled');
    }
    return { success: false, error: 'IPC not available' };
};

// Add VAD event handler functions to cheddar object
cheddar.handleMicrophoneVADEvent = async (vadEvent) => {
    if (window.require) {
        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke('handle-microphone-vad-event', vadEvent);
    }
    return { success: false, error: 'IPC not available' };
};
cheddar.handleSpeakerVADEvent = async (vadEvent) => {
    if (window.require) {
        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke('handle-speaker-vad-event', vadEvent);
    }
    return { success: false, error: 'IPC not available' };
};

// Add reconnection function to cheddar object
cheddar.attemptReconnection = attemptReconnection;

// Make it globally available
window.cheddar = cheddar;
