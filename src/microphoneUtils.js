// Note: fs and path are not available in browser context
// These will be handled by the main process via IPC

// Microphone-specific VAD implementation
class MicrophoneVAD {
    constructor(options = {}) {
        this.sampleRate = options.sampleRate || 24000;
        this.frameSize = options.frameSize || 480; // 20ms at 24kHz
        this.energyThreshold = options.energyThreshold || 0.01;
        this.silenceFrames = options.silenceFrames || 10; // frames of silence before stopping
        this.speechFrames = options.speechFrames || 3; // frames of speech before starting
        
        this.currentSilenceFrames = 0;
        this.currentSpeechFrames = 0;
        this.isSpeaking = false;
        this.audioBuffer = [];
    }

    // Calculate RMS energy of audio frame
    calculateEnergy(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }

    // Process audio frame and return VAD decision
    processFrame(audioData) {
        const energy = this.calculateEnergy(audioData);
        const isSpeechFrame = energy > this.energyThreshold;

        if (isSpeechFrame) {
            this.currentSpeechFrames++;
            this.currentSilenceFrames = 0;
            
            if (!this.isSpeaking && this.currentSpeechFrames >= this.speechFrames) {
                this.isSpeaking = true;
                return { isSpeaking: true, speechStart: true, energy };
            }
        } else {
            this.currentSilenceFrames++;
            this.currentSpeechFrames = 0;
            
            if (this.isSpeaking && this.currentSilenceFrames >= this.silenceFrames) {
                this.isSpeaking = false;
                return { isSpeaking: false, speechEnd: true, energy };
            }
        }

        return { isSpeaking: this.isSpeaking, energy };
    }

    // Reset VAD state
    reset() {
        this.currentSilenceFrames = 0;
        this.currentSpeechFrames = 0;
        this.isSpeaking = false;
        this.audioBuffer = [];
    }
}

// Microphone audio processor
class MicrophoneProcessor {
    constructor(options = {}) {
        this.sampleRate = options.sampleRate || 24000;
        this.bufferSize = options.bufferSize || 4096;
        this.chunkDuration = options.chunkDuration || 0.5; // seconds - reduced for more responsive logging
        
        // Adaptive silence detection parameters
        this.MIN_SILENCE_FRAMES = 6;
        this.MAX_SILENCE_FRAMES = 20;
        this.pauseDurations = []; // store last N pause durations (frames)
        this.maxPauseSamplesToTrack = 20;
        this.lastSpeechEndTimestamp = null;

        this.vad = new MicrophoneVAD({
            sampleRate: this.sampleRate,
            energyThreshold: 0.002, // Much lower threshold for better sensitivity
            silenceFrames: 8, // default, will adapt
            speechFrames: 1 // Only 1 frame needed to start speech detection
        });
        
        this.audioBuffer = [];
        this.isRecording = false;
        this.onAudioChunk = null;
        this.onSpeechStateChange = null;
    }

    // Process incoming audio data
    processAudio(inputData) {
        if (!this.isRecording) {
            console.log('MicrophoneProcessor: Not recording, ignoring audio');
            return;
        }

        //console.log('MicrophoneProcessor: Processing audio, input length:', inputData.length);
        
        // Add to buffer
        this.audioBuffer.push(...inputData);
        //console.log('MicrophoneProcessor: Audio buffer size:', this.audioBuffer.length);

        // Process VAD in frames (use a copy to avoid consuming the main buffer)
        const frameSize = this.vad.frameSize;
        let framesProcessed = 0;
        let vadBufferIndex = 0;
        while (vadBufferIndex + frameSize <= this.audioBuffer.length) {
            const frame = this.audioBuffer.slice(vadBufferIndex, vadBufferIndex + frameSize);
            const vadResult = this.vad.processFrame(frame);
            framesProcessed++;
            vadBufferIndex += frameSize;
            
            // Notify speech state changes
            if (this.onSpeechStateChange) {
                if (vadResult.speechStart) {
                    this.onSpeechStateChange({ type: 'speechStart', energy: vadResult.energy });

                    // Calculate pause duration since last speechEnd
                    if (this.lastSpeechEndTimestamp) {
                        const pauseMs = Date.now() - this.lastSpeechEndTimestamp;
                        const frames = Math.round(pauseMs / 20); // each frame ~20ms at 24kHz
                        if (frames > 0) {
                            this.pauseDurations.push(frames);
                            if (this.pauseDurations.length > this.maxPauseSamplesToTrack) {
                                this.pauseDurations.shift();
                            }
                            // Compute mean pause frames
                            const meanFrames = this.pauseDurations.reduce((a,b)=>a+b,0) / this.pauseDurations.length;
                            const adaptiveFrames = Math.min(this.MAX_SILENCE_FRAMES, Math.max(this.MIN_SILENCE_FRAMES, Math.round(meanFrames)));
                            if (adaptiveFrames !== this.vad.silenceFrames) {
                                console.log(`Adaptive VAD: updating silenceFrames from ${this.vad.silenceFrames} -> ${adaptiveFrames}`);
                                this.vad.silenceFrames = adaptiveFrames;
                            }
                        }
                    }
                } else if (vadResult.speechEnd) {
                    this.onSpeechStateChange({ type: 'speechEnd', energy: vadResult.energy });
                    this.lastSpeechEndTimestamp = Date.now();
                } else if (vadResult.isSpeaking) {
                    this.onSpeechStateChange({ type: 'speaking', energy: vadResult.energy });
                }
            }
        }
        
        //if (framesProcessed > 0) {
           //console.log('MicrophoneProcessor: Processed', framesProcessed, 'VAD frames');
        //}

        // Send audio chunks for transcription
        const samplesPerChunk = this.sampleRate * this.chunkDuration;
        //console.log('MicrophoneProcessor: Buffer size:', this.audioBuffer.length, 'Threshold:', samplesPerChunk);
        if (this.audioBuffer.length >= samplesPerChunk) {
            const chunk = this.audioBuffer.splice(0, samplesPerChunk);
            const pcmData16 = this.convertFloat32ToInt16(chunk);
            //console.log('MicrophoneProcessor: Sending audio chunk, size:', pcmData16.length);
            
            if (this.onAudioChunk) {
                this.onAudioChunk(pcmData16);
            } else {
                console.warn('MicrophoneProcessor: No audio chunk callback set');
            }
        }
    }

    // Convert Float32 to Int16 PCM
    convertFloat32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        return int16Array;
    }

    // Start recording
    startRecording() {
        this.isRecording = true;
        this.vad.reset();
        this.audioBuffer = [];
        console.log('MicrophoneProcessor: Recording started');
        //console.log('MicrophoneProcessor: Sample rate:', this.sampleRate);
        //console.log('MicrophoneProcessor: Chunk duration:', this.chunkDuration);
        //console.log('MicrophoneProcessor: Samples per chunk:', this.sampleRate * this.chunkDuration);
    }

    // Stop recording
    stopRecording() {
        this.isRecording = false;
        this.audioBuffer = [];
        console.log('Microphone recording stopped');
    }

    // Set callback for audio chunks
    setAudioChunkCallback(callback) {
        this.onAudioChunk = callback;
    }

    // Set callback for speech state changes
    setSpeechStateCallback(callback) {
        this.onSpeechStateChange = callback;
    }
}

// Convert array buffer to base64
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Save debug audio for microphone (handled by main process)
function saveMicrophoneDebugAudio(buffer, timestamp = Date.now()) {
    // This function is handled by the main process via IPC
    // Frontend components should use IPC to save debug audio
    console.log('Debug audio save requested for microphone');
    return { timestamp };
}

export {
    MicrophoneVAD,
    MicrophoneProcessor,
    arrayBufferToBase64,
    saveMicrophoneDebugAudio,
};