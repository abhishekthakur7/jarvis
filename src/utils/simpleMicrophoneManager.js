/**
 * Simple Microphone Manager - Fallback without AudioWorklet
 * This is a simplified version for debugging when AudioWorklet loading fails
 */

export class SimpleMicrophoneManager {
    constructor() {
        this.mediaStream = null;
        this.audioContext = null;
        this.sourceNode = null;
        this.analyserNode = null;
        this.isRecording = false;
        this.isInitialized = false;
        
        // Callbacks
        this.onAudioChunk = null;
        this.onVADEvent = null;
        this.onError = null;
        
        // VAD state
        this.isSpeaking = false;
        this.silenceFrames = 0;
        this.speechFrames = 0;
        this.energyThreshold = 0.002;
        this.maxSilenceFrames = 8;
        this.minSpeechFrames = 1;
        
        // Audio processing
        this.audioBuffer = [];
        this.sampleRate = 24000;
        this.chunkDuration = 0.5; // seconds
        this.samplesPerChunk = Math.floor(this.sampleRate * this.chunkDuration);
    }

    async initialize() {
        try {
            console.log('🎤 Initializing simple microphone manager (fallback)...');
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate,
                latencyHint: 'interactive'
            });

            // Resume if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.isInitialized = true;
            console.log('✅ Simple microphone manager initialized');

        } catch (error) {
            console.error('❌ Failed to initialize simple microphone manager:', error);
            this.handleError(error);
            throw error;
        }
    }

    async startRecording() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (this.isRecording) {
                console.warn('⚠️ Already recording');
                return;
            }

            console.log('🎤 Starting simple audio recording...');

            // Get microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create source and analyser nodes
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 1024;
            this.analyserNode.smoothingTimeConstant = 0.3;

            // Connect nodes
            this.sourceNode.connect(this.analyserNode);

            // Start processing
            this.startAudioProcessing();

            this.isRecording = true;
            console.log('✅ Simple audio recording started');

        } catch (error) {
            console.error('❌ Failed to start simple recording:', error);
            this.handleError(error);
            throw error;
        }
    }

    startAudioProcessing() {
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const floatArray = new Float32Array(bufferLength);
        
        const processFrame = () => {
            if (!this.isRecording) return;

            // Get frequency and time domain data
            this.analyserNode.getByteFrequencyData(dataArray);
            this.analyserNode.getFloatTimeDomainData(floatArray);

            // Calculate energy
            const energy = this.calculateEnergy(floatArray);
            
            // Process VAD
            const vadResult = this.processVAD(energy);
            
            // Send VAD events
            if (vadResult.speechStart || vadResult.speechEnd) {
                if (this.onVADEvent) {
                    this.onVADEvent(vadResult);
                }
            }

            // Collect audio data (simplified - using analyser data)
            this.audioBuffer.push(...floatArray);

            // Send audio chunks
            if (this.audioBuffer.length >= this.samplesPerChunk) {
                this.sendAudioChunk();
            }

            // Continue processing
            requestAnimationFrame(processFrame);
        };

        processFrame();
    }

    calculateEnergy(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }

    processVAD(energy) {
        const isSpeechFrame = energy > this.energyThreshold;
        
        let vadResult = {
            isSpeaking: this.isSpeaking,
            energy: energy,
            speechStart: false,
            speechEnd: false
        };

        if (isSpeechFrame) {
            this.speechFrames++;
            this.silenceFrames = 0;
            
            if (!this.isSpeaking && this.speechFrames >= this.minSpeechFrames) {
                this.isSpeaking = true;
                vadResult.isSpeaking = true;
                vadResult.speechStart = true;
            }
        } else {
            this.silenceFrames++;
            this.speechFrames = 0;
            
            if (this.isSpeaking && this.silenceFrames >= this.maxSilenceFrames) {
                this.isSpeaking = false;
                vadResult.isSpeaking = false;
                vadResult.speechEnd = true;
            }
        }

        return vadResult;
    }

    sendAudioChunk() {
        const chunk = this.audioBuffer.splice(0, this.samplesPerChunk);
        
        // Convert to Int16Array
        const int16Array = new Int16Array(chunk.length);
        for (let i = 0; i < chunk.length; i++) {
            const clamped = Math.max(-1, Math.min(1, chunk[i]));
            int16Array[i] = Math.round(clamped * 32767);
        }

        // Convert to base64
        const uint8Array = new Uint8Array(int16Array.buffer);
        const base64 = this.arrayBufferToBase64(uint8Array.buffer);

        if (this.onAudioChunk) {
            this.onAudioChunk({
                audio: base64,
                timestamp: Date.now(),
                isSpeaking: this.isSpeaking,
                energy: this.calculateEnergy(chunk)
            });
        }
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async stopRecording() {
        try {
            if (!this.isRecording) {
                console.warn('⚠️ Not currently recording');
                return;
            }

            console.log('🛑 Stopping simple audio recording...');

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

            this.isRecording = false;
            console.log('✅ Simple audio recording stopped');

        } catch (error) {
            console.error('❌ Failed to stop simple recording:', error);
        }
    }

    setCallbacks(callbacks) {
        this.onAudioChunk = callbacks.onAudioChunk;
        this.onVADEvent = callbacks.onVADEvent;
        this.onError = callbacks.onError;
    }

    handleError(error) {
        console.error('🚨 Simple microphone manager error:', error);
        if (this.onError) {
            this.onError(error);
        }
    }
}