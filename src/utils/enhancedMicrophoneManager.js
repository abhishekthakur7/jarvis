// Enhanced microphone manager with AudioWorklet processing and real-time visualization
import { microphonePermissionHelper } from './microphonePermissionHelper.js';

// Addresses CRIT-001 (main thread), UX improvements (visualization, progressive transcripts)

class EnhancedMicrophoneManager {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.sourceNode = null;
        this.workletNode = null;
        this.isRecording = false;
        this.isInitialized = false;
        
        // Callbacks
        this.onAudioChunk = null;
        this.onVADEvent = null;
        this.onVisualization = null;
        this.onStats = null;
        this.onError = null;
        
        // Configuration
        this.config = {
            sampleRate: 24000,
            frameSize: 480,
            energyThreshold: 0.0005, // Lowered from 0.002 for better sensitivity
            silenceFrames: 8,
            speechFrames: 1,
            chunkDuration: 0.5
        };
        
        // Progressive transcript state
        this.currentTranscript = '';
        this.transcriptSegments = [];
        this.isTranscribing = false;
        
        // Audio visualization state
        this.visualizationData = {
            energy: 0,
            isSpeaking: false,
            buffer: new Array(128).fill(0),
            timestamp: 0
        };
        
        // Performance monitoring
        this.stats = {
            processedFrames: 0,
            avgProcessingTime: 0,
            bufferSize: 0,
            dropouts: 0,
            lastUpdate: Date.now()
        };
    }
    
    async checkMicrophonePermissions() {
        try {
            const permissionState = await microphonePermissionHelper.checkPermissionStatus();
            
            if (permissionState === 'denied') {
                microphonePermissionHelper.showPermissionInstructions();
                throw new Error('Microphone access is permanently denied. Please enable microphone access in your browser settings.');
            }
            
            return permissionState;
        } catch (error) {
            console.error('❌ Error checking microphone permissions:', error);
            throw error;
        }
    }

    async initialize() {
        try {
            // Check permissions first
            await this.checkMicrophonePermissions();
            
            // Check if AudioWorklet is supported
            if (!window.AudioContext && !window.webkitAudioContext) {
                throw new Error('Web Audio API is not supported in this browser');
            }
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.config.sampleRate,
                latencyHint: 'interactive'
            });
            
            // Resume audio context if suspended (required for user gesture in some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Check if AudioWorklet is supported
            if (!this.audioContext.audioWorklet) {
                throw new Error('AudioWorklet is not supported in this browser. Please use a modern browser.');
            }
            
            // Load AudioWorklet processor with multiple fallback paths for Electron
            const possiblePaths = [
                '/src/utils/audioWorkletProcessor.js',
                './src/utils/audioWorkletProcessor.js',
                '../utils/audioWorkletProcessor.js',
                'src/utils/audioWorkletProcessor.js',
                window.location.origin + '/src/utils/audioWorkletProcessor.js'
            ];
            
            let workletLoaded = false;
            let lastError = null;
            
            for (const workletPath of possiblePaths) {
                try {
                    await this.audioContext.audioWorklet.addModule(workletPath);
                    workletLoaded = true;
                    break;
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }
            
            if (!workletLoaded) {
                throw new Error(`Failed to load AudioWorklet processor from any path. Last error: ${lastError?.message || 'Unknown error'}`);
            }
            
            // Create worklet node
            this.workletNode = new AudioWorkletNode(this.audioContext, 'jarvis-audio-processor', {
                processorOptions: this.config
            });
            
            // Setup message handling
            this.workletNode.port.onmessage = this.handleWorkletMessage.bind(this);
            
            // Handle worklet errors
            this.workletNode.onprocessorerror = (error) => {
                console.error('❌ AudioWorklet processor error:', error);
                this.handleError(new Error(`AudioWorklet processor error: ${error.message || 'Unknown error'}`));
            };
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize enhanced microphone manager:', error);
            this.handleError(error);
            throw error;
        }
    }
    
    handleWorkletMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'audioChunk':
                this.handleAudioChunk(data);
                break;
                
            case 'vadEvent':
                this.handleVADEvent(data);
                break;
                
            case 'visualization':
                this.handleVisualization(data);
                break;
                
            case 'stats':
                this.handleStats(data);
                break;
                
            case 'paramsUpdated':
                console.log('📊 AudioWorklet parameters updated:', data);
                break;
                
            case 'reset':
                console.log('🔄 AudioWorklet reset completed');
                break;
        }
    }
    
    handleAudioChunk(data) {
        if (this.onAudioChunk) {
            this.onAudioChunk({
                audio: data.audio,
                timestamp: data.timestamp,
                isSpeaking: data.isSpeaking,
                energy: data.energy
            });
        }
    }
    
    handleVADEvent(data) {
        if (data.speechStart) {
            this.startTranscriptSegment();
        } else if (data.speechEnd) {
            this.endTranscriptSegment();
        }
        
        if (this.onVADEvent) {
            this.onVADEvent(data);
        }
    }
    
    handleVisualization(data) {
        this.visualizationData = {
            energy: data.energy,
            isSpeaking: data.isSpeaking,
            buffer: data.buffer,
            timestamp: data.timestamp
        };
        

        
        if (this.onVisualization) {
            this.onVisualization(this.visualizationData);
        }
    }
    
    handleStats(data) {
        this.stats = {
            ...data,
            lastUpdate: Date.now()
        };
        
        if (this.onStats) {
            this.onStats(this.stats);
        }
    }
    
    handleError(error) {
        console.error('🚨 Enhanced microphone manager error:', error);
        if (this.onError) {
            this.onError(error);
        }
    }
    
    async startRecording() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            if (this.isRecording) {
                return;
            }
            
            // Check permissions before attempting to access microphone
            const permissionState = await this.checkMicrophonePermissions();
            
            if (permissionState === 'denied') {
                throw new Error('Microphone access is denied. Please allow microphone access and try again.');
            }
            
            // Request microphone access using the permission helper
            const accessResult = await microphonePermissionHelper.requestMicrophoneAccess();
            
            if (!accessResult.success) {
                microphonePermissionHelper.showPermissionInstructions();
                throw new Error(accessResult.error);
            }
            
            this.mediaStream = accessResult.stream;
            
            // Create source node
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Connect to worklet
            this.sourceNode.connect(this.workletNode);
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isRecording = true;
            
        } catch (error) {
            console.error('❌ Failed to start enhanced recording:', error);
            this.handleError(error);
            throw error;
        }
    }
    
    async stopRecording() {
        try {
            if (!this.isRecording) {
                return;
            }
            
            // Disconnect nodes
            if (this.sourceNode) {
                this.sourceNode.disconnect();
                this.sourceNode = null;
            }
            
            // Stop media stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            
            // Reset worklet
            if (this.workletNode) {
                this.workletNode.port.postMessage({ type: 'reset' });
            }
            
            this.isRecording = false;
            this.endTranscriptSegment();
            
        } catch (error) {
            console.error('❌ Failed to stop enhanced recording:', error);
            this.handleError(error);
        }
    }
    
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.workletNode) {
            this.workletNode.port.postMessage({
                type: 'updateParams',
                data: newConfig
            });
        }
    }
    
    // Progressive transcript management
    startTranscriptSegment() {
        if (!this.isTranscribing) {
            this.isTranscribing = true;
            this.currentTranscript = '';
        }
    }
    
    updateTranscript(partialText, isFinal = false) {
        if (isFinal) {
            // Add to segments and reset current
            if (this.currentTranscript.trim()) {
                this.transcriptSegments.push({
                    text: this.currentTranscript.trim(),
                    timestamp: Date.now(),
                    isFinal: true
                });
            }
            this.currentTranscript = '';
            this.isTranscribing = false;
        } else {
            // Update current transcript
            this.currentTranscript = partialText;
        }
        
        // Notify listeners
        this.notifyTranscriptUpdate();
    }
    
    endTranscriptSegment() {
        if (this.isTranscribing && this.currentTranscript.trim()) {
            this.transcriptSegments.push({
                text: this.currentTranscript.trim(),
                timestamp: Date.now(),
                isFinal: true
            });
            this.currentTranscript = '';
        }
        this.isTranscribing = false;
        this.notifyTranscriptUpdate();
    }
    
    notifyTranscriptUpdate() {
        const transcriptData = {
            segments: this.transcriptSegments,
            current: this.currentTranscript,
            isTranscribing: this.isTranscribing
        };
        
        // Emit custom event for transcript updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('transcript-update', {
                detail: transcriptData
            }));
        }
    }
    
    getFullTranscript() {
        const allText = this.transcriptSegments.map(s => s.text).join(' ');
        if (this.currentTranscript.trim()) {
            return allText + ' ' + this.currentTranscript;
        }
        return allText;
    }
    
    clearTranscript() {
        this.transcriptSegments = [];
        this.currentTranscript = '';
        this.isTranscribing = false;
        this.notifyTranscriptUpdate();
    }
    
    // Audio visualization helpers
    getVisualizationData() {
        return this.visualizationData;
    }
    
    getEnergyLevel() {
        return this.visualizationData.energy;
    }
    
    isSpeaking() {
        return this.visualizationData.isSpeaking;
    }
    
    // Performance monitoring
    getStats() {
        return this.stats;
    }
    
    // Cleanup
    async cleanup() {
        try {
            await this.stopRecording();
            
            if (this.audioContext && this.audioContext.state !== 'closed') {
                await this.audioContext.close();
            }
            
            this.audioContext = null;
            this.workletNode = null;
            this.isInitialized = false;
            
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
    
    // Event listener management
    setCallbacks(callbacks) {
        this.onAudioChunk = callbacks.onAudioChunk || null;
        this.onVADEvent = callbacks.onVADEvent || null;
        this.onVisualization = callbacks.onVisualization || null;
        this.onStats = callbacks.onStats || null;
        this.onError = callbacks.onError || null;
    }
}

// Export for use in renderer process
if (typeof window !== 'undefined') {
    window.EnhancedMicrophoneManager = EnhancedMicrophoneManager;
}

export { EnhancedMicrophoneManager };