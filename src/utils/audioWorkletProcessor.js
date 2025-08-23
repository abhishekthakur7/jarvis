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

        // Adaptive silence tracking
        this.MIN_SILENCE_FRAMES = 4; // lower bound ~80 ms at 24 kHz
        this.MAX_SILENCE_FRAMES = 30; // upper bound ~600 ms
        this.pauseDurations = []; // recent pause lengths (in frames)
        this.maxPauseSamplesToTrack = 20;
        this.lastSpeechEndTime = null;
        this.lastPauseFrames = null;
        
        // Audio buffering
        this.audioBuffer = [];
        this.chunkBuffer = [];
        this.samplesPerChunk = Math.floor(this.sampleRate * this.chunkDuration);
        
        // Performance monitoring
        this.processedFrames = 0;
        this.frameCount = 0; // Track total frames for timing
        this.lastStatsTime = 0;
        this.processingTimes = [];
        
        // Audio visualization data
        this.visualizationBuffer = new Float32Array(128); // For real-time visualization
        this.visualizationIndex = 0;
        
        // Setup message handling
        this.port.onmessage = this.handleMessage.bind(this);
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
        this.frameCount = 0;
        
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
    processVAD(audioData, currentTime = 0) {
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

                // Update adaptive silence threshold using previous pause duration
                if (this.lastPauseFrames) {
                    this.pauseDurations.push(this.lastPauseFrames);
                    if (this.pauseDurations.length > this.maxPauseSamplesToTrack) {
                        this.pauseDurations.shift();
                    }
                    const avg = this.pauseDurations.reduce((a, b) => a + b, 0) / this.pauseDurations.length;
                    const adaptive = Math.max(this.MIN_SILENCE_FRAMES, Math.min(this.MAX_SILENCE_FRAMES, Math.round(avg)));
                    if (adaptive !== this.silenceFrames) {
                        this.silenceFrames = adaptive;
                        // Inform main thread of the update
                        this.port.postMessage({ type: 'silenceFramesUpdated', data: { silenceFrames: adaptive } });
                    }
                }
            }
        } else {
            this.currentSilenceFrames++;
            this.currentSpeechFrames = 0;
            
            if (this.isSpeaking && this.currentSilenceFrames >= this.silenceFrames) {
                this.isSpeaking = false;
                vadResult.isSpeaking = false;
                vadResult.speechEnd = true;

                // Record pause duration for adaptive VAD
                this.lastPauseFrames = this.currentSilenceFrames;
                this.lastSpeechEndTime = currentTime;
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
    updateVisualization(audioData, currentTime = 0) {
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
    sendStats(currentTime = 0) {
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
        // Calculate current time based on frame count and sample rate
        const currentTime = this.frameCount * 128 / this.sampleRate;
        
        const input = inputs[0];
        if (!input || input.length === 0) {
            this.frameCount++; // Increment even if no input
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
            const vadResult = this.processVAD(frame, currentTime);
            
            // Update visualization
            this.updateVisualization(frame, currentTime);
            
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
        
        // Track that processing occurred (simplified without performance timing)
        const processingTime = 1.0; // Simplified timing - just track that we processed
        this.processingTimes.push(processingTime);
        
        // Increment frame count
        this.frameCount++;
        
        // Send stats periodically
        this.sendStats(currentTime);
        
        return true;
    }
    
    // Convert ArrayBuffer to base64 (custom implementation for AudioWorklet)
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        
        // Process bytes in groups of 3
        while (i < bytes.length) {
            const a = bytes[i];
            const b = bytes[i + 1] || 0;
            const c = bytes[i + 2] || 0;
            
            const bitmap = (a << 16) | (b << 8) | c;
            
            result += chars.charAt((bitmap >> 18) & 63);
            result += chars.charAt((bitmap >> 12) & 63);
            result += chars.charAt((bitmap >> 6) & 63);
            result += chars.charAt(bitmap & 63);
            
            i += 3;
        }
        
        // Add padding
        const padding = bytes.length % 3;
        if (padding === 1) {
            result = result.slice(0, -2) + '==';
        } else if (padding === 2) {
            result = result.slice(0, -1) + '=';
        }
        
        return result;
    }
}

// Register the processor
registerProcessor('jarvis-audio-processor', JarvisAudioProcessor);