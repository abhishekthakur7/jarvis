import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { AppHeader } from './AppHeader.js';
import { MainView } from '../views/MainView.js';
import { CustomizeView } from '../views/CustomizeView.js';
import { HistoryView } from '../views/HistoryView.js';
import { AssistantView } from '../views/AssistantView.js';
import { OnboardingView } from '../views/OnboardingView.js';
import { AdvancedView } from '../views/AdvancedView.js';
import { LayoutSettingsManager } from '../../utils/layoutSettingsManager.js';

export class AssistantApp extends LitElement {
    static styles = css`
        * {
            box-sizing: border-box;
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            margin: 0px;
            padding: 0px;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100vh;
            background-color: var(--background-transparent);
            color: var(--text-color);
        }

        .window-container {
            height: 100vh;
            border-radius: 7px;
            overflow: hidden;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .main-content {
            flex: 1;
            padding: 2px;
            overflow-y: auto;
            margin-top: var(--main-content-margin-top);
            border-radius: var(--content-border-radius);
            transition: all 0.15s ease-out;
            background: var(--main-content-background);
        }

        .main-content.with-border {
            border: 1px solid var(--border-color);
        }

        .main-content.jarvis-view {
            border: none;
        }

        .main-content.onboarding-view {
            padding: 0;
            border: none;
            background: transparent;
        }

        .view-container {
            padding-top: 7px;
            opacity: 1;
            transform: translateY(0);
            transition:
                opacity 0.15s ease-out,
                transform 0.15s ease-out;
            height: 100%;
            font-size: var(--response-font-size, 16px);
        }

        .view-container.entering {
            opacity: 0;
            transform: translateY(10px);
        }

        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        ::-webkit-scrollbar-track {
            background: var(--scrollbar-background);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }
    `;

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        isRecording: { type: Boolean },
        sessionActive: { type: Boolean },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        teleprompterMode: { type: String },
        focusMode: { type: Boolean },
        advancedMode: { type: Boolean },
        interviewMode: { type: Boolean },
        _viewInstances: { type: Object, state: true },
        _isClickThrough: { state: true },
        _awaitingNewResponse: { state: true },
        _awaitingProResponse: { state: true },
        _proResponseReceived: { state: true },
        shouldAnimateResponse: { type: Boolean },
        autoScrollEnabled: { type: Boolean },
        scrollSpeed: { type: Number },
        microphoneEnabled: { type: Boolean },
        microphoneState: { type: String },
        speakerDetectionEnabled: { type: Boolean },
        readingStats: { type: Object },
    };

    constructor() {
        super();
        this.currentView = localStorage.getItem('onboardingCompleted') ? 'main' : 'onboarding';
        this.statusText = '';
        this.startTime = null;
        this.isRecording = false;
        this.sessionActive = false;
        this.selectedProfile = localStorage.getItem('selectedProfile') || 'interview';
        this.selectedLanguage = localStorage.getItem('selectedLanguage') || 'en-US';
        this.selectedScreenshotInterval = localStorage.getItem('selectedScreenshotInterval') || '5';
        this.selectedImageQuality = localStorage.getItem('selectedImageQuality') || 'medium';
        this.layoutMode = localStorage.getItem('layoutMode') || 'normal';
        this.teleprompterMode = localStorage.getItem('teleprompterMode') || 'balanced';
        this.focusMode = localStorage.getItem('focusMode') === 'true';
        this.advancedMode = localStorage.getItem('advancedMode') === 'true';
        this.interviewMode = false;
        this.responses = [];
        this.currentResponseIndex = -1;
        this._viewInstances = new Map();
        this._isClickThrough = false;
        this._awaitingNewResponse = false;
        this._awaitingProResponse = false;
        this._proResponseReceived = false;
        this._proResponseReceived = false;
        this.shouldAnimateResponse = false;
        this.microphoneEnabled = false;
        this.microphoneState = 'off'; // 'off', 'recording', 'speaking'
        this.microphoneProcessor = null;
        this.microphoneTranscription = '';
        this.speakerDetectionEnabled = localStorage.getItem('speakerDetectionEnabled') !== 'false'; // Default to true
        this.previousSpeakerDetectionState = this.speakerDetectionEnabled; // Track previous state for microphone toggle
        this.readingStats = null;
        


        // Auto-scroll settings
        this.autoScrollEnabled = localStorage.getItem('autoScrollEnabled') !== 'false';
        this.scrollSpeed = Number(localStorage.getItem('scrollSpeed')) || 2;

        // Apply layout mode to document root
        this.updateLayoutMode();
        
        // Apply layout-specific settings
        this.applyLayoutSpecificSettings(this.layoutMode);
    }

    connectedCallback() {
        super.connectedCallback();

        // Set up IPC listeners if needed
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('update-response', (_, response) => {
            this.setResponse(response);
        });
        
        ipcRenderer.on('new-response-starting', () => {
            this._awaitingNewResponse = true;
        });
            ipcRenderer.on('update-status', (_, status) => {
                this.setStatus(status);
            });
            ipcRenderer.on('click-through-toggled', (_, isEnabled) => {
                this._isClickThrough = isEnabled;
            });
            ipcRenderer.on('toggle-auto-scroll', () => {
                this.toggleAutoScroll();
            });
            ipcRenderer.on('microphone-transcription-update', (_, data) => {
                this.handleMicrophoneTranscriptionUpdate(data);
            });

        }
        
        // Add keyboard event listener for microphone shortcut
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        document.addEventListener('keydown', this.boundKeydownHandler);
        
        // Add event listeners to disable auto-scroll on user interaction
        this.boundDisableAutoScroll = this.disableAutoScroll.bind(this);
        window.addEventListener('keydown', this.boundDisableAutoScroll);
        window.addEventListener('mousedown', this.boundDisableAutoScroll);
        
        // Initialize speaker detection state from backend
        this.initializeSpeakerDetectionState();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('update-response');
            ipcRenderer.removeAllListeners('new-response-starting');
            ipcRenderer.removeAllListeners('update-status');
            ipcRenderer.removeAllListeners('click-through-toggled');
            ipcRenderer.removeAllListeners('toggle-auto-scroll');
        }
        
        // Remove keyboard event listener
        if (this.boundKeydownHandler) {
            document.removeEventListener('keydown', this.boundKeydownHandler);
        }
        
        // Remove auto-scroll event listeners
        if (this.boundDisableAutoScroll) {
            window.removeEventListener('keydown', this.boundDisableAutoScroll);
            window.removeEventListener('mousedown', this.boundDisableAutoScroll);
        }
        
        // Clean up microphone resources
        if (this.microphoneEnabled) {
            this.stopMicrophoneCapture();
        }
    }



    setStatus(text) {
        this.statusText = text;
    }

    setResponse(response) {
        // Handle both string responses (streaming) and object responses (final with timing)
        const responseContent = typeof response === 'string' ? response : response.content;
        const responseTime = typeof response === 'object' ? response.responseTime : null;
        const timestamp = typeof response === 'object' ? response.timestamp : Date.now();
        
        // Create response object with timing data
        const responseObj = {
            content: responseContent,
            responseTime: responseTime,
            timestamp: timestamp
        };

        if (this._awaitingNewResponse || this.responses.length === 0) {
            // Add new response - this is the start of a new AI response
            this.responses = [...this.responses, responseObj];
            this.currentResponseIndex = this.responses.length - 1;
            this._awaitingNewResponse = false;
            if (this._awaitingProResponse) {
                this._proResponseReceived = true;
                setTimeout(() => {
                    this._proResponseReceived = false;
                    this.requestUpdate();
                }, 3000);
            }
            this._awaitingProResponse = false;
            // Enable auto-scroll for every new answer
            this.autoScrollEnabled = true;
            localStorage.setItem('autoScrollEnabled', 'true');
        } else {
            // Update current response - this is a streaming update of the existing response
            // Only update if we have responses and a valid current index
            if (this.responses.length > 0 && this.currentResponseIndex >= 0 && this.currentResponseIndex < this.responses.length) {
                // Preserve existing timing data during streaming updates
                const existingResponse = this.responses[this.currentResponseIndex];
                const updatedResponse = {
                    content: responseContent,
                    responseTime: responseTime || existingResponse.responseTime,
                    timestamp: timestamp
                };
                
                this.responses = [
                    ...this.responses.slice(0, this.currentResponseIndex),
                    updatedResponse,
                    ...this.responses.slice(this.currentResponseIndex + 1)
                ];
            } else {
                // Fallback: treat as new response if indices are invalid
                this.responses = [...this.responses, responseObj];
                this.currentResponseIndex = this.responses.length - 1;
            }
        }
        
        // Check current layout mode's animation preference instead of hardcoding to true
        const currentLayoutMode = localStorage.getItem('layoutMode') || 'normal';
        let animationEnabled = false;
        
        if (currentLayoutMode === 'normal') {
            const normalAnimateResponse = localStorage.getItem('normalAnimateResponse');
            animationEnabled = normalAnimateResponse !== null ? normalAnimateResponse === 'true' : false;
        } else if (currentLayoutMode === 'compact') {
            const compactAnimateResponse = localStorage.getItem('compactAnimateResponse');
            animationEnabled = compactAnimateResponse !== null ? compactAnimateResponse === 'true' : false;
        } else if (currentLayoutMode === 'system-design') {
            const systemDesignAnimateResponse = localStorage.getItem('systemDesignAnimateResponse');
            animationEnabled = systemDesignAnimateResponse !== null ? systemDesignAnimateResponse === 'true' : false;
        }
        
        this.shouldAnimateResponse = animationEnabled;
        console.log(`[AssistantApp] Setting shouldAnimateResponse to ${animationEnabled} for ${currentLayoutMode} mode`);
        this.requestUpdate();
    }



    disableAutoScroll() {
        if (this.autoScrollEnabled) {
            this.autoScrollEnabled = false;
            localStorage.setItem('autoScrollEnabled', 'false');
        }
    }

    handleScrollSpeedChange(event) {
        const newSpeed = Math.max(1, Math.min(10, event.detail.speed));
        this.scrollSpeed = newSpeed;
        localStorage.setItem('scrollSpeed', this.scrollSpeed.toString());
        this.requestUpdate();
    }

    handleAutoScrollToggle(event) {
        this.autoScrollEnabled = event.detail.enabled;
        localStorage.setItem('autoScrollEnabled', this.autoScrollEnabled.toString());
        this.requestUpdate();
    }

    handleReadingStatsUpdate(event) {
        this.readingStats = event.detail.stats;
        
        // Update the header with the new reading stats
        const header = this.shadowRoot.querySelector('app-header');
        if (header && header.updateReadingStats) {
            header.updateReadingStats(this.readingStats);
        }
        
        this.requestUpdate();
    }

    // Header event handlers
    handleCustomizeClick() {
        this.currentView = 'customize';
        this.requestUpdate();
    }

    handleHelpClick() {
        this.currentView = 'help';
        this.requestUpdate();
    }

    handleHistoryClick() {
        this.currentView = 'history';
        this.requestUpdate();
    }

    handleAdvancedClick() {
        this.currentView = 'advanced';
        this.requestUpdate();
    }

    async handleClose() {
        if (this.currentView === 'customize' || this.currentView === 'help' || this.currentView === 'history') {
            this.currentView = 'main';
        } else if (this.currentView === 'jarvis') {
            cheddar.stopCapture();

            // Turn off microphone if it's currently enabled
            if (this.microphoneEnabled) {
                await this.stopMicrophoneCapture();
                // Set microphone as inactive to resume automatic speaker transcription sending
                await window.cheddar.setMicrophoneActive(false);
                // Clear any remaining microphone transcription when mic is turned off
                await window.cheddar.clearMicrophoneTranscription();
                console.log('Microphone turned off during session close');
            }

            // Close the session
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('close-session');
            }
            this.sessionActive = false;
            this.currentView = 'main';
            console.log('Session closed');
        } else {
            // Quit the entire application
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('quit-application');
            }
        }
    }

    async handleHideToggle() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('toggle-window-visibility');
        }
    }

    // Main view event handlers
    async handleStart() {
        // check if api key is empty do nothing
        const apiKey = localStorage.getItem('apiKey')?.trim();
        if (!apiKey || apiKey === '') {
            // Trigger the red blink animation on the API key input
            const mainView = this.shadowRoot.querySelector('main-view');
            if (mainView && mainView.triggerApiKeyError) {
                mainView.triggerApiKeyError();
            }
            return;
        }

        await cheddar.initializeGemini(this.selectedProfile, this.selectedLanguage);
        // Pass the screenshot interval as string (including 'manual' option)
        cheddar.startCapture(this.selectedScreenshotInterval, this.selectedImageQuality);
        this.responses = [];
        this.currentResponseIndex = -1;
        this.startTime = Date.now();
        this.currentView = 'jarvis';
    }

    async reinitializeSession() {
        console.log('Reinitializing session...');
        this.setStatus('Reinitializing session...');
        
        // Stop microphone capture if active
        if (this.microphoneEnabled) {
            await this.stopMicrophoneCapture();
        }
        
        // Reset microphone state
        this.microphoneEnabled = false;
        this.microphoneState = 'off';
        this.updateAssistantViewMicrophoneState();
        
        // Clear responses and reset session state
        this.responses = [];
        this.currentResponseIndex = -1;
        this._awaitingNewResponse = false;
        this.shouldAnimateResponse = false;
        
        // Reinitialize Gemini session
        await cheddar.initializeGemini(this.selectedProfile, this.selectedLanguage);
        
        // Restart capture
        cheddar.startCapture(this.selectedScreenshotInterval, this.selectedImageQuality);
        
        // Update start time
        this.startTime = Date.now();
        
        // Update status
        this.setStatus('Session reinitialized');
        
        console.log('Session reinitialization complete');
    }

    async handleAPIKeyHelp() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', 'https://Assistant.com/help/api-key');
        }
    }

    // Customize view event handlers
    handleProfileChange(profile) {
        this.selectedProfile = profile;
    }

    handleLanguageChange(language) {
        this.selectedLanguage = language;
    }

    handleScreenshotIntervalChange(interval) {
        this.selectedScreenshotInterval = interval;
    }

    handleImageQualityChange(quality) {
        this.selectedImageQuality = quality;
        localStorage.setItem('selectedImageQuality', quality);
    }

    handleAdvancedModeChange(advancedMode) {
        this.advancedMode = advancedMode;
        localStorage.setItem('advancedMode', advancedMode.toString());
    }

    handleBackClick() {
        this.currentView = 'main';
        this.requestUpdate();
    }

    // Help view event handlers
    async handleExternalLinkClick(url) {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', url);
        }
    }

    // Assistant view event handlers
    async handleSendText(message) {
        const result = await window.cheddar.sendTextMessage(message);

        if (!result.success) {
            console.error('Failed to send message:', result.error);
            this.setStatus('Error sending message: ' + result.error);
        } else {
            this.setStatus('Message sent...');
            // Note: _awaitingNewResponse is set by the 'new-response-starting' IPC event from gemini.js
        }
    }

    // Microphone event handlers
    async handleMicrophoneToggle(e) {
        const enabled = e.detail.enabled;
        
        // Update the parent component's microphoneEnabled property immediately
        this.microphoneEnabled = enabled;
        
        // Update the visual state immediately
        this.microphoneState = enabled ? 'recording' : 'off';
        this.updateAssistantViewMicrophoneState();
        
        if (enabled) {
            // Store current speaker detection state before enabling microphone
            this.previousSpeakerDetectionState = this.speakerDetectionEnabled;
            
            // Enable speaker detection if not already enabled
            if (!this.speakerDetectionEnabled) {
                this.speakerDetectionEnabled = true;
                localStorage.setItem('speakerDetectionEnabled', 'true');
                if (window.cheddar && window.cheddar.setSpeakerDetectionEnabled) {
                    await window.cheddar.setSpeakerDetectionEnabled(true);
                }
                this.updateAssistantViewSpeakerDetectionState();
            }
            
            await this.startMicrophoneCapture();
            // Set microphone as active to prevent automatic speaker transcription sending
            await window.cheddar.setMicrophoneActive(true);
        } else {
            await this.stopMicrophoneCapture();
            // Set microphone as inactive to resume automatic speaker transcription sending
            await window.cheddar.setMicrophoneActive(false);
            // Clear any remaining microphone transcription when mic is turned off
            await window.cheddar.clearMicrophoneTranscription();
            
            // Restore previous speaker detection state
            if (this.speakerDetectionEnabled !== this.previousSpeakerDetectionState) {
                this.speakerDetectionEnabled = this.previousSpeakerDetectionState;
                localStorage.setItem('speakerDetectionEnabled', this.previousSpeakerDetectionState.toString());
                if (window.cheddar && window.cheddar.setSpeakerDetectionEnabled) {
                    await window.cheddar.setSpeakerDetectionEnabled(this.previousSpeakerDetectionState);
                }
                this.updateAssistantViewSpeakerDetectionState();
            }
            
            //console.log('Microphone transcription cleared when mic turned off');
        }
    }

    // Speaker detection event handlers
    async handleSpeakerDetectionToggle(e) {
        const enabled = e.detail.enabled;
        
        // Update the parent component's speakerDetectionEnabled property
        this.speakerDetectionEnabled = enabled;
        
        // Update previous state if microphone is not currently active
        // This ensures the correct state is restored when microphone is turned off
        if (!this.microphoneEnabled) {
            this.previousSpeakerDetectionState = enabled;
        }
        
        // Save to localStorage
        localStorage.setItem('speakerDetectionEnabled', enabled.toString());
        
        // Update the backend
        if (window.cheddar && window.cheddar.setSpeakerDetectionEnabled) {
            await window.cheddar.setSpeakerDetectionEnabled(enabled);
        }
        
        // Update the AssistantView component
        this.updateAssistantViewSpeakerDetectionState();
        
        console.log('Speaker detection toggled:', enabled);
    }

    async startMicrophoneCapture() {
        try {
            // Initialize microphone session first
            const sessionResult = await window.cheddar.initializeMicrophoneSession();
            if (!sessionResult.success) {
                throw new Error('Failed to initialize microphone session: ' + sessionResult.error);
            }

            // Import enhanced microphone manager
            const { EnhancedMicrophoneManager } = await import('../../utils/enhancedMicrophoneManager.js');
            
            // Initialize enhanced microphone manager
            this.microphoneManager = new EnhancedMicrophoneManager();
            
            // Set up callbacks for the manager
            this.microphoneManager.setCallbacks({
                onAudioChunk: async (audioData) => {
                    try {                    
                        // audioData is already Int16Array from EnhancedMicrophoneManager
                        // Convert directly to base64 without double conversion
                        const uint8Array = new Uint8Array(audioData.buffer);
                        const base64Data = btoa(String.fromCharCode.apply(null, uint8Array));
                        
                        // Send audio to Gemini microphone session
                        await window.cheddar.sendMicrophoneAudio({
                            data: base64Data,
                            mimeType: 'audio/pcm;rate=24000'
                        });
                    } catch (error) {
                        console.error('Failed to send audio to Gemini:', error);
                    }
                },
                onVADEvent: (vadEvent) => {
                    // Update microphone state based on VAD
                    let newState = 'recording';
                    if (vadEvent.type === 'speechStart' || vadEvent.isSpeaking) {
                        newState = 'speaking';
                    }
                    
                    if (this.microphoneState !== newState) {
                        this.microphoneState = newState;
                        this.updateAssistantViewMicrophoneState();
                        console.log('Microphone state updated to:', newState);
                    }
                },
                onError: (error) => {
                    console.error('Enhanced microphone manager error:', error);
                    this.setStatus('Microphone error: ' + error.message);
                }
            });
            
            // Initialize and start recording
            await this.microphoneManager.initialize();
            await this.microphoneManager.startRecording();
            
            this.microphoneEnabled = true;
            this.microphoneState = 'recording';
            this.updateAssistantViewMicrophoneState();
            
            console.log('Enhanced microphone capture started successfully');
            
        } catch (error) {
            console.error('Failed to start microphone capture:', error);
            this.setStatus('Microphone access denied - continuing with speaker audio');
            this.microphoneEnabled = false;
            this.microphoneState = 'off';
            this.updateAssistantViewMicrophoneState();
        }
    }

    async stopMicrophoneCapture() {
        try {
            // Close microphone session
            await window.cheddar.closeMicrophoneSession();
            
            if (this.microphoneManager) {
                await this.microphoneManager.stopRecording();
                this.microphoneManager = null;
            }
            
            this.microphoneEnabled = false;
            this.microphoneState = 'off';
            this.updateAssistantViewMicrophoneState();
            this.setStatus('Microphone recording stopped');
            
        } catch (error) {
            console.error('Error stopping microphone capture:', error);
        }
    }

    updateAssistantViewMicrophoneState() {
        const jarvisView = this.shadowRoot.querySelector('jarvis-view');
        if (jarvisView && jarvisView.updateMicrophoneState) {
            jarvisView.microphoneEnabled = this.microphoneEnabled;
            jarvisView.microphoneState = this.microphoneState;
            jarvisView.requestUpdate();
        }
    }

    updateAssistantViewSpeakerDetectionState() {
        const jarvisView = this.shadowRoot.querySelector('jarvis-view');
        if (jarvisView) {
            jarvisView.speakerDetectionEnabled = this.speakerDetectionEnabled;
            jarvisView.requestUpdate();
        }
    }

    handleMicrophoneTranscriptionUpdate(data) {
        console.log('Received microphone transcription update:', data);
        // Pass transcription updates to the enhanced microphone manager
        if (this.microphoneManager && this.microphoneManager.updateTranscript) {
            console.log('Passing transcription to microphone manager:', data.text);
            this.microphoneManager.updateTranscript(data.text, data.isFinal);
        } else {
            console.warn('Microphone manager not available or updateTranscript method missing');
        }
    }


    
    async initializeSpeakerDetectionState() {
        // Wait for cheddar to be available
        if (!window.cheddar || !window.cheddar.isSpeakerDetectionEnabled) {
            setTimeout(() => this.initializeSpeakerDetectionState(), 100);
            return;
        }
        
        try {
            // Get the current backend state
            const backendResult = await window.cheddar.isSpeakerDetectionEnabled();
            if (backendResult.success) {
                const backendState = backendResult.enabled;
                
                // If frontend and backend states differ, sync them
                if (this.speakerDetectionEnabled !== backendState) {
                    console.log(`Syncing speaker detection state: frontend=${this.speakerDetectionEnabled}, backend=${backendState}`);
                    
                    // Update backend to match frontend (localStorage takes precedence)
                    await window.cheddar.setSpeakerDetectionEnabled(this.speakerDetectionEnabled);
                    console.log(`Backend speaker detection state updated to: ${this.speakerDetectionEnabled}`);
                }
                
                // Update the UI to ensure it reflects the current state
                this.updateAssistantViewSpeakerDetectionState();
                console.log(`Speaker detection initialized: ${this.speakerDetectionEnabled}`);
            }
        } catch (error) {
            console.error('Failed to initialize speaker detection state:', error);
        }
    }

    toggleAutoScroll() {
        const jarvisView = this.shadowRoot.querySelector('jarvis-view');
        if (jarvisView && jarvisView.toggleAutoScroll) {
            jarvisView.toggleAutoScroll();
        }
    }

    handleResponseIndexChanged(e) {
        this.currentResponseIndex = e.detail.index;
        this.shouldAnimateResponse = false;
        this.requestUpdate();
    }

    // Keyboard event handler
    async handleKeydown(e) {
        
        // Shift+Alt+8 for microphone toggle (only in jarvis view)
        if (e.shiftKey && e.altKey && e.key === '8' && this.currentView === 'jarvis') {
            e.preventDefault();
            const jarvisView = this.shadowRoot.querySelector('jarvis-view');
            if (jarvisView && jarvisView.toggleMicrophone) {
                jarvisView.toggleMicrophone();
            }
        }
        
        // Shift+Alt+0 for speaker detection toggle is handled by global shortcut in window.js
        // Removed duplicate handler to prevent double execution
        
        // Shift+Alt+F for focus mode toggle
        if (e.shiftKey && e.altKey && e.key === 'F') {
            e.preventDefault();
            this.handleFocusModeToggle();
        }
        
        // Shift+Alt+L for layout mode cycling
        if (e.shiftKey && e.altKey && e.key === 'L') {
            e.preventDefault();
            this.handleLayoutModeCycle();
        }
        
        // Ctrl+Enter or Cmd+Enter to send message (only in jarvis view)
        if (e.shiftKey && e.altKey && e.key === '4') {
            if (this.currentView === 'jarvis') {                
                // Get current text message
                const jarvisView = this.shadowRoot.querySelector('jarvis-view');
                const textMessage = jarvisView ? jarvisView.getCurrentMessage() : '';
                console.log('Text message:', textMessage);

                // Get speaker transcription
                let speakerText = '';
                console.log('Getting speaker transcription...');
                const speakerResult = await window.cheddar.getSpeakerTranscription();
                console.log('Speaker transcription result:', speakerResult);
                if (speakerResult.success && speakerResult.transcription.trim()) {
                    speakerText = `Interviewer says: "${speakerResult.transcription.trim()}"`;
                    console.log('Speaker text to send:', speakerText);
                } else {
                    console.log('No speaker transcription available or empty');
                }

                // Get microphone transcription (always check, regardless of mic state)
                let microphoneText = '';
                console.log('Getting microphone transcription...');
                const transcriptionResult = await window.cheddar.getMicrophoneTranscription();
                console.log('Microphone transcription result:', transcriptionResult);
                console.log('Microphone transcription success:', transcriptionResult.success);
                console.log('Microphone transcription content:', JSON.stringify(transcriptionResult.transcription));
                console.log('Microphone transcription trimmed length:', transcriptionResult.transcription ? transcriptionResult.transcription.trim().length : 0);
                if (transcriptionResult.success && transcriptionResult.transcription && transcriptionResult.transcription.trim()) {
                    microphoneText = `Interviewee/User says: "${transcriptionResult.transcription.trim()}"`;
                    console.log('Microphone text to send:', microphoneText);
                } else {
                    console.log('No microphone transcription available or empty - success:', transcriptionResult.success, 'transcription:', transcriptionResult.transcription);
                }

                // Capture current screenshot
                await window.captureManualScreenshot();
                
                // Wait a moment for screenshot to be processed
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Combine all messages
                let combinedMessage = '';
                const messageParts = [];
                
                console.log('=== Combining messages ===');
                if (textMessage.trim()) {
                    messageParts.push(`Text input: "${textMessage.trim()}"`);
                    console.log('Added text input to message parts');
                }
                if (speakerText) {
                    messageParts.push(speakerText);
                    console.log('Added speaker text to message parts');
                }
                if (microphoneText) {
                    messageParts.push(microphoneText);
                    console.log('Added microphone text to message parts');
                }
                
                console.log('Total message parts:', messageParts.length);
                console.log('Message parts:', messageParts);
                
                if (messageParts.length > 0) {
                    combinedMessage = messageParts.join('. ') + '. Please analyze this information along with the current screenshot and provide a comprehensive response.';
                } else {
                    combinedMessage = 'Please analyze the current screenshot and provide insights.';
                }

                console.log('Final combined message:', combinedMessage);
                console.log('Combined message length:', combinedMessage.length);

                if (combinedMessage.trim()) {
                    // Send the combined message directly to Gemini
                    console.log('Sending message to Gemini...');
                    const result = await window.cheddar.sendTextMessage(combinedMessage);
                    console.log('Send result:', result);
                    if (result.success) {
                        console.log('Combined transcription sent to Gemini successfully');
                        // Clear both transcriptions after successful send
                        console.log('Clearing transcriptions...');
                        await window.cheddar.clearSpeakerTranscription();
                        await window.cheddar.clearMicrophoneTranscription();
                        this.setStatus('Message sent...');
                        this._awaitingNewResponse = true;
                    } else {
                        console.error('Failed to send combined transcription to Gemini:', result.error);
                        this.setStatus('Error sending message: ' + result.error);
                    }
                    
                    // Clear the text input
                    if (jarvisView) {
                        jarvisView.clearMessage();
                    }
                }
            }
            e.preventDefault();
        }
    }

    // Onboarding event handlers
    handleOnboardingComplete() {
        this.currentView = 'main';
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        // Handle auto-scroll when responses change
        if (changedProperties.has('responses')) {
            if (this.autoScrollEnabled) {
                // Delay scroll to ensure DOM is updated
                setTimeout(() => {
                    const jarvisView = this.shadowRoot.querySelector('jarvis-view');
                    if (jarvisView && jarvisView.scrollToBottom) {
                        jarvisView.scrollToBottom();
                    }
                }, 100);
            }
        }

        // Only notify main process of view change if the view actually changed
        if (changedProperties.has('currentView') && window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('view-changed', this.currentView);

            // Add a small delay to smooth out the transition
            const viewContainer = this.shadowRoot?.querySelector('.view-container');
            if (viewContainer) {
                viewContainer.classList.add('entering');
                requestAnimationFrame(() => {
                    viewContainer.classList.remove('entering');
                });
            }
        }

        // Only update localStorage when these specific properties change
        if (changedProperties.has('selectedProfile')) {
            localStorage.setItem('selectedProfile', this.selectedProfile);
        }
        if (changedProperties.has('selectedLanguage')) {
            localStorage.setItem('selectedLanguage', this.selectedLanguage);
        }
        if (changedProperties.has('selectedScreenshotInterval')) {
            localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        }
        if (changedProperties.has('selectedImageQuality')) {
            localStorage.setItem('selectedImageQuality', this.selectedImageQuality);
        }
        if (changedProperties.has('layoutMode')) {
            this.updateLayoutMode();
        }
        if (changedProperties.has('focusMode')) {
            localStorage.setItem('focusMode', this.focusMode.toString());
            this.updateLayoutMode();
        }
        if (changedProperties.has('advancedMode')) {
            localStorage.setItem('advancedMode', this.advancedMode.toString());
        }
        if (changedProperties.has('autoScrollEnabled')) {
            localStorage.setItem('autoScrollEnabled', this.autoScrollEnabled.toString());
        }
        if (changedProperties.has('scrollSpeed')) {
            localStorage.setItem('scrollSpeed', this.scrollSpeed.toString());
        }
    }

    renderCurrentView() {
        // Only re-render the view if it hasn't been cached or if critical properties changed
        const viewKey = `${this.currentView}-${this.selectedProfile}-${this.selectedLanguage}`;

        switch (this.currentView) {
            case 'onboarding':
                return html`
                    <onboarding-view .onComplete=${() => this.handleOnboardingComplete()} .onClose=${() => this.handleClose()}></onboarding-view>
                `;

            case 'main':
                return html`
                    <main-view
                        .onStart=${() => this.handleStart()}
                        .onAPIKeyHelp=${() => this.handleAPIKeyHelp()}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                    ></main-view>
                `;

            case 'customize':
                return html`
                    <customize-view
                        .selectedProfile=${this.selectedProfile}
                        .selectedLanguage=${this.selectedLanguage}
                        .selectedScreenshotInterval=${this.selectedScreenshotInterval}
                        .selectedImageQuality=${this.selectedImageQuality}
                        .layoutMode=${this.layoutMode}
                        .teleprompterMode=${this.teleprompterMode}
                        .focusMode=${this.focusMode}
                        .advancedMode=${this.advancedMode}
                        .onProfileChange=${profile => this.handleProfileChange(profile)}
                        .onLanguageChange=${language => this.handleLanguageChange(language)}
                        .onScreenshotIntervalChange=${interval => this.handleScreenshotIntervalChange(interval)}
                        .onImageQualityChange=${quality => this.handleImageQualityChange(quality)}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                        .onTeleprompterModeChange=${teleprompterMode => this.handleTeleprompterModeChange(teleprompterMode)}
                        .onFocusModeChange=${focusMode => this.handleFocusModeChange(focusMode)}
                        .onAdvancedModeChange=${advancedMode => this.handleAdvancedModeChange(advancedMode)}
                    ></customize-view>
                `;

            case 'help':
                return html` <help-view .onExternalLinkClick=${url => this.handleExternalLinkClick(url)}></help-view> `;

            case 'history':
                return html` <history-view></history-view> `;

            case 'advanced':
                return html` <advanced-view></advanced-view> `;

            case 'jarvis':
                return html`
                    <jarvis-view
                        .responses=${this.responses}
                        .currentResponseIndex=${this.currentResponseIndex}
                        .selectedProfile=${this.selectedProfile}
                        .onSendText=${message => this.handleSendText(message)}
                        .shouldAnimateResponse=${this.shouldAnimateResponse}
                        .microphoneEnabled=${this.microphoneEnabled}
                        .microphoneState=${this.microphoneState}
                        .speakerDetectionEnabled=${this.speakerDetectionEnabled}
                        .autoScrollEnabled=${this.autoScrollEnabled}
                        .scrollSpeed=${this.scrollSpeed}
                        @response-index-changed=${this.handleResponseIndexChanged}
                        @response-animation-complete=${() => { this.shouldAnimateResponse = false; this.requestUpdate(); }}
                        @microphone-toggle=${this.handleMicrophoneToggle}
                        @speaker-detection-toggle=${this.handleSpeakerDetectionToggle}
                        @scroll-speed-change=${this.handleScrollSpeedChange}
                        @auto-scroll-toggle=${this.handleAutoScrollToggle}
                        @reading-stats-update=${this.handleReadingStatsUpdate}
                    ></jarvis-view>
                `;

            default:
                return html`<div>Unknown view: ${this.currentView}</div>`;
        }
    }

    render() {
        const mainContentClass = `main-content ${
            this.currentView === 'jarvis' ? 'jarvis-view' : this.currentView === 'onboarding' ? 'onboarding-view' : 'with-border'
        }`;

        return html`
            <div class="window-container">
                <div class="container">
                    <div class="${mainContentClass}">
                        <div class="view-container">${this.renderCurrentView()}</div>
                    </div>
                    <app-header
                        .currentView=${this.currentView}
                        .statusText=${this.statusText}
                        .startTime=${this.startTime}
                        .advancedMode=${this.advancedMode}
                        .interviewMode=${this.interviewMode}
                        .awaitingProResponse=${this._awaitingProResponse}
                        .proResponseReceived=${this._proResponseReceived}
                        .readingStats=${this.readingStats}
                        .onCustomizeClick=${() => this.handleCustomizeClick()}
                        .onHelpClick=${() => this.handleHelpClick()}
                        .onHistoryClick=${() => this.handleHistoryClick()}
                        .onAdvancedClick=${() => this.handleAdvancedClick()}
                        .onCloseClick=${() => this.handleClose()}
                        .onBackClick=${() => this.handleBackClick()}
                        .onHideToggleClick=${() => this.handleHideToggle()}
                        .onInterviewModeToggle=${() => this.handleInterviewModeToggle()}
                        ?isClickThrough=${this._isClickThrough}
                    ></app-header>
                </div>
            </div>
        `;
    }

    updateLayoutMode() {
        // Remove all layout classes first
        document.documentElement.classList.remove('compact-layout', 'system-design-layout', 'focus-mode');
        
        // Apply the selected layout mode
        if (this.layoutMode === 'compact') {
            document.documentElement.classList.add('compact-layout');
        } else if (this.layoutMode === 'system-design') {
            document.documentElement.classList.add('system-design-layout');
        }
        
        // Apply focus mode if enabled
        if (this.focusMode) {
            document.documentElement.classList.add('focus-mode');
        }
    }

    applyLayoutSpecificSettings(layoutMode) {
        const root = document.documentElement;
        
        if (layoutMode === 'normal') {
            // Apply normal layout settings
            const normalTransparency = localStorage.getItem('normalTransparency');
            const normalFontSize = localStorage.getItem('normalFontSize');
            const normalAutoScroll = localStorage.getItem('normalAutoScroll');
            const normalScrollSpeed = localStorage.getItem('normalScrollSpeed');
            
            // Apply transparency using the correct CSS variables
            // Use default value of 0.45 if not set
            const transparency = normalTransparency !== null ? parseFloat(normalTransparency) : 0.45;
            LayoutSettingsManager.updateTransparency(transparency);
            
            // Apply layout-specific font size
            const fontSize = normalFontSize !== null ? parseInt(normalFontSize, 10) : 12;
            root.style.setProperty('--response-font-size', `${fontSize}px`);
            
            // Update auto-scroll setting
            this.autoScrollEnabled = normalAutoScroll === 'true';
            localStorage.setItem('autoScrollEnabled', this.autoScrollEnabled.toString());
            
            // Update scroll speed
            this.scrollSpeed = parseInt(normalScrollSpeed, 10) || 2;
            localStorage.setItem('scrollSpeed', this.scrollSpeed.toString());
            
        } else if (layoutMode === 'compact') {
            // Apply compact layout settings
            const compactTransparency = localStorage.getItem('compactTransparency');
            const compactFontSize = localStorage.getItem('compactFontSize');
            const compactAutoScroll = localStorage.getItem('compactAutoScroll');
            const compactScrollSpeed = localStorage.getItem('compactScrollSpeed');
            
            // Apply transparency using the correct CSS variables
            // Use default value of 0.60 if not set
            const transparency = compactTransparency !== null ? parseFloat(compactTransparency) : 0.60;
            LayoutSettingsManager.updateTransparency(transparency);
            
            // Apply layout-specific font size
            const fontSize = compactFontSize !== null ? parseInt(compactFontSize, 10) : 11;
            root.style.setProperty('--response-font-size', `${fontSize}px`);
            
            // Update auto-scroll setting
            this.autoScrollEnabled = compactAutoScroll === 'true';
            localStorage.setItem('autoScrollEnabled', this.autoScrollEnabled.toString());
            
            // Update scroll speed
            this.scrollSpeed = parseInt(compactScrollSpeed, 10) || 2;
            localStorage.setItem('scrollSpeed', this.scrollSpeed.toString());
            
        } else if (layoutMode === 'system-design') {
            // Apply system design layout settings
            const systemDesignTransparency = localStorage.getItem('systemDesignTransparency');
            const systemDesignFontSize = localStorage.getItem('systemDesignFontSize');
            const systemDesignAutoScroll = localStorage.getItem('systemDesignAutoScroll');
            const systemDesignScrollSpeed = localStorage.getItem('systemDesignScrollSpeed');
            
            // Apply transparency using the correct CSS variables
            // Use default value of 0.40 if not set
            const transparency = systemDesignTransparency !== null ? parseFloat(systemDesignTransparency) : 0.40;
            LayoutSettingsManager.updateTransparency(transparency);
            
            // Apply layout-specific font size
            const fontSize = systemDesignFontSize !== null ? parseInt(systemDesignFontSize, 10) : 14;
            root.style.setProperty('--response-font-size', `${fontSize}px`);
            
            // Update auto-scroll setting
            this.autoScrollEnabled = systemDesignAutoScroll === 'true';
            localStorage.setItem('autoScrollEnabled', this.autoScrollEnabled.toString());
            
            // Update scroll speed
            this.scrollSpeed = parseInt(systemDesignScrollSpeed, 10) || 2;
            localStorage.setItem('scrollSpeed', this.scrollSpeed.toString());
        }
    }

    async handleLayoutModeChange(layoutMode) {
        this.layoutMode = layoutMode;
        localStorage.setItem('layoutMode', layoutMode);
        this.updateLayoutMode();
        
        // Apply layout-specific settings
        this.applyLayoutSpecificSettings(layoutMode);
        
        // Notify AssistantView about layout mode change
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('layout-mode-changed', layoutMode);
        }

        // Notify main process about layout change for window resizing
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('layout-mode-update-sizes');
            } catch (error) {
                console.error('Failed to update sizes in main process:', error);
            }
        }

        this.requestUpdate();
    }
    
    async handleTeleprompterModeChange(teleprompterMode) {
        this.teleprompterMode = teleprompterMode;
        localStorage.setItem('teleprompterMode', teleprompterMode);
        
        // Apply teleprompter mode to document
        document.documentElement.classList.remove('ultra-discrete-mode', 'balanced-mode', 'presentation-mode');
        document.documentElement.classList.add(`${teleprompterMode}-mode`);
        
        // Notify AssistantView about teleprompter mode change
        const jarvisView = this.shadowRoot.querySelector('jarvis-view');
        if (jarvisView) {
            jarvisView.teleprompterMode = teleprompterMode;
        }
        
        // Notify main process about teleprompter mode change for window resizing
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-sizes');
            } catch (error) {
                console.error('Failed to update sizes for teleprompter mode:', error);
            }
        }
        
        console.log(`Teleprompter mode changed to: ${teleprompterMode}`);
        this.requestUpdate();
    }

    handleFocusModeToggle() {
        this.focusMode = !this.focusMode;
        this.requestUpdate();
    }

    handleLayoutModeCycle() {
        const modes = ['normal', 'compact', 'system-design'];
        const currentIndex = modes.indexOf(this.layoutMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.handleLayoutModeChange(modes[nextIndex]);
    }

    handleFocusModeChange(focusMode) {
        this.focusMode = focusMode;
        this.requestUpdate();
    }

    async handleInterviewModeToggle() {
        this.interviewMode = !this.interviewMode;
        
        // If enabling interview mode, automatically enable stealth mode (content protection) if not already enabled
        if (this.interviewMode) {
            const currentContentProtection = localStorage.getItem('contentProtection');
            const isContentProtectionEnabled = currentContentProtection !== null ? currentContentProtection === 'true' : true;
            
            if (!isContentProtectionEnabled) {
                // Enable content protection (stealth mode)
                localStorage.setItem('contentProtection', 'true');
                
                // Update the window's content protection in real-time
                if (window.require) {
                    const { ipcRenderer } = window.require('electron');
                    try {
                        await ipcRenderer.invoke('update-content-protection', true);
                    } catch (error) {
                        console.error('Failed to update content protection:', error);
                    }
                }
            }
        }
        
        // Communicate with main process to toggle interview mode
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('toggle-interview-mode', this.interviewMode);
        }
        
        this.requestUpdate();
    }
}

customElements.define('jarvis-app', AssistantApp);