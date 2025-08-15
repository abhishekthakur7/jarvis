// AudioWorklet processor for real-time audio processing off the main thread
// This addresses CRIT-001: Moving audio processing off main thread

class JarvisAudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        
        // Initialize parameters from options
        const params = options.processorOptions || {};
        this.sampleRate = params.sampleRate || 24000;
        this.frameSize = params.frameSize || 480; // 20ms at 24kHz
        this.energyThreshold = params.energyThreshold || 0.002;
        this.silenceFrames = params.silenceFrames || 8;
        this.speechFrames = params.speechFrames || 1;
        this.chunkDuration = params.chunkDuration || 0.5; // seconds
        
        // VAD state
        this.currentSilenceFrames = 0;
        this.currentSpeechFrames = 0;
        this.isSpeaking = false;
        
        // Audio buffering
        this.audioBuffer = [];
        this.chunkBuffer = [];
        this.samplesPerChunk = Math.floor(this.sampleRate * this.chunkDuration);
        
        // Performance monitoring
        this.processedFrames = 0;
        this.lastStatsTime = 0;
        this.processingTimes = [];
        
        // Audio visualization data
        this.visualizationBuffer = new Float32Array(128); // For real-time visualization
        this.visualizationIndex = 0;
        
        // Setup message handling
        this.port.onmessage = this.handleMessage.bind(this);
        
        console.log('🎵 JarvisAudioProcessor initialized with params:', {
            sampleRate: this.sampleRate,
            frameSize: this.frameSize,
            energyThreshold: this.energyThreshold,
            chunkDuration: this.chunkDuration
        });
    }
    
    handleMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'updateParams':
                this.updateParameters(data);
                break;
            case 'reset':
                this.reset();
                break;
            case 'getStats':
                this.sendStats();
                break;
        }
    }
    
    updateParameters(params) {
        if (params.energyThreshold !== undefined) {
            this.energyThreshold = params.energyThreshold;
        }
        if (params.silenceFrames !== undefined) {
            this.silenceFrames = params.silenceFrames;
        }
        if (params.speechFrames !== undefined) {
            this.speechFrames = params.speechFrames;
        }
        
        this.port.postMessage({
            type: 'paramsUpdated',
            data: {
                energyThreshold: this.energyThreshold,
                silenceFrames: this.silenceFrames,
                speechFrames: this.speechFrames
            }
        });
    }
    
    reset() {
        this.currentSilenceFrames = 0;
        this.currentSpeechFrames = 0;
        this.isSpeaking = false;
        this.audioBuffer = [];
        this.chunkBuffer = [];
        this.visualizationBuffer.fill(0);
        this.visualizationIndex = 0;
        
        this.port.postMessage({
            type: 'reset',
            data: { success: true }
        });
    }
    
    // Calculate RMS energy of audio frame
    calculateEnergy(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }
    
    // Process VAD for a frame
    processVAD(audioData) {
        const energy = this.calculateEnergy(audioData);
        const isSpeechFrame = energy > this.energyThreshold;
        
        let vadResult = {
            isSpeaking: this.isSpeaking,
            energy: energy,
            speechStart: false,
            speechEnd: false
        };
        
        if (isSpeechFrame) {
            this.currentSpeechFrames++;
            this.currentSilenceFrames = 0;
            
            if (!this.isSpeaking && this.currentSpeechFrames >= this.speechFrames) {
                this.isSpeaking = true;
                vadResult.isSpeaking = true;
                vadResult.speechStart = true;
            }
        } else {
            this.currentSilenceFrames++;
            this.currentSpeechFrames = 0;
            
            if (this.isSpeaking && this.currentSilenceFrames >= this.silenceFrames) {
                this.isSpeaking = false;
                vadResult.isSpeaking = false;
                vadResult.speechEnd = true;
            }
        }
        
        return vadResult;
    }
    
    // Convert Float32 to Int16 for transmission
    convertFloat32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            // Clamp to [-1, 1] and convert to 16-bit
            const clamped = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = Math.round(clamped * 32767);
        }
        return int16Array;
    }
    
    // Update visualization buffer for real-time display
    updateVisualization(audioData) {
        const energy = this.calculateEnergy(audioData);
        
        // Store energy value in circular buffer
        this.visualizationBuffer[this.visualizationIndex] = energy;
        this.visualizationIndex = (this.visualizationIndex + 1) % this.visualizationBuffer.length;
        
        // Send visualization data every 16 frames (~60fps at 24kHz)
        if (this.processedFrames % 16 === 0) {
            this.port.postMessage({
                type: 'visualization',
                data: {
                    energy: energy,
                    isSpeaking: this.isSpeaking,
                    buffer: Array.from(this.visualizationBuffer),
                    timestamp: currentTime
                }
            });
        }
    }
    
    // Send performance statistics
    sendStats() {
        const now = currentTime;
        if (now - this.lastStatsTime > 1.0) { // Send stats every second
            const avgProcessingTime = this.processingTimes.length > 0 
                ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length 
                : 0;
            
            this.port.postMessage({
                type: 'stats',
                data: {
                    processedFrames: this.processedFrames,
                    avgProcessingTime: avgProcessingTime,
                    bufferSize: this.audioBuffer.length,
                    isSpeaking: this.isSpeaking,
                    energyThreshold: this.energyThreshold
                }
            });
            
            this.lastStatsTime = now;
            this.processingTimes = []; // Reset for next measurement
        }
    }
    
    process(inputs, outputs, parameters) {
        const startTime = performance.now();
        
        const input = inputs[0];
        if (!input || input.length === 0) {
            return true;
        }
        
        // Get the first channel (mono)
        const inputChannel = input[0];
        if (!inputChannel || inputChannel.length === 0) {
            return true;
        }
        
        // Add to audio buffer
        this.audioBuffer.push(...inputChannel);
        this.chunkBuffer.push(...inputChannel);
        
        // Process VAD in frames
        while (this.audioBuffer.length >= this.frameSize) {
            const frame = this.audioBuffer.splice(0, this.frameSize);
            const vadResult = this.processVAD(frame);
            
            // Update visualization
            this.updateVisualization(frame);
            
            // Send VAD events
            if (vadResult.speechStart || vadResult.speechEnd) {
                this.port.postMessage({
                    type: 'vadEvent',
                    data: vadResult
                });
            }
            
            this.processedFrames++;
        }
        
        // Send audio chunks when buffer is full
        if (this.chunkBuffer.length >= this.samplesPerChunk) {
            const chunk = this.chunkBuffer.splice(0, this.samplesPerChunk);
            const int16Chunk = this.convertFloat32ToInt16(chunk);
            
            // Convert to base64 for transmission
            const uint8Array = new Uint8Array(int16Chunk.buffer);
            const base64 = this.arrayBufferToBase64(uint8Array.buffer);
            
            this.port.postMessage({
                type: 'audioChunk',
                data: {
                    audio: base64,
                    timestamp: currentTime,
                    isSpeaking: this.isSpeaking,
                    energy: this.calculateEnergy(chunk)
                }
            });
        }
        
        // Track processing time
        const processingTime = performance.now() - startTime;
        this.processingTimes.push(processingTime);
        
        // Send stats periodically
        this.sendStats();
        
        return true;
    }
    
    // Convert ArrayBuffer to base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

// Register the processor
registerProcessor('jarvis-audio-processor', JarvisAudioProcessor);