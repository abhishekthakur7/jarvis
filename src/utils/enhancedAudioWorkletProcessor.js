// Enhanced AudioWorklet processor for technical interview optimization
// Builds on existing JarvisAudioProcessor with interview-specific features

class EnhancedJarvisAudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        
        // Initialize parameters from options (preserve existing)
        const params = options.processorOptions || {};
        this.sampleRate = params.sampleRate || 24000;
        this.frameSize = params.frameSize || 480;
        this.energyThreshold = params.energyThreshold || 0.0005;
        this.silenceFrames = params.silenceFrames || 8;
        this.speechFrames = params.speechFrames || 1;
        this.chunkDuration = params.chunkDuration || 0.5;
        
        // ENHANCED: Interview mode optimizations
        this.interviewMode = params.interviewMode || true;
        this.interviewPhase = 'warmup';
        
        // VAD state (preserve existing)
        this.currentSilenceFrames = 0;
        this.currentSpeechFrames = 0;
        this.isSpeaking = false;

        // ENHANCED: Interview-aware adaptive silence tracking
        this.MIN_SILENCE_FRAMES = 3;
        this.MAX_SILENCE_FRAMES = 25;
        this.pauseDurations = [];
        this.maxPauseSamplesToTrack = 25;
        this.lastSpeechEndTime = null;
        this.lastPauseFrames = null;
        
        // ENHANCED: Quality gating system
        this.qualityThreshold = 0.7;
        this.redundantChunks = [];
        this.MAX_REDUNDANT_CHUNKS = 5;
        this.qualityHistory = [];
        
        // Audio buffering (preserve existing)
        this.audioBuffer = [];
        this.chunkBuffer = [];
        this.samplesPerChunk = Math.floor(this.sampleRate * this.chunkDuration);
        
        // Performance monitoring (preserve existing)
        this.processedFrames = 0;
        this.frameCount = 0;
        this.lastStatsTime = 0;
        this.processingTimes = [];
        
        // ENHANCED: Interview metrics
        this.interviewMetrics = {
            questionsDetected: 0,
            clarificationsDetected: 0,
            technicalSegmentsDetected: 0,
            qualityDropouts: 0,
            recoveredChunks: 0
        };
        
        // Audio visualization (preserve existing)
        this.visualizationBuffer = new Float32Array(128);
        this.visualizationIndex = 0;
        
        // ENHANCED: Speech pattern analysis
        this.speechPatterns = {
            currentSegmentEnergy: [],
            segmentDuration: 0,
            consistentEnergyFrames: 0,
            energyVariance: 0
        };
        
        this.port.onmessage = this.handleMessage.bind(this);
        console.log('🎯 Enhanced AudioWorklet processor initialized');
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
            case 'setInterviewMode':
                this.setInterviewMode(data.enabled);
                break;
            case 'setInterviewPhase':
                this.setInterviewPhase(data.phase);
                break;
        }
    }
    
    setInterviewMode(enabled) {
        this.interviewMode = enabled;
        if (enabled) {
            this.energyThreshold = Math.max(0.0003, this.energyThreshold * 0.8);
            this.MIN_SILENCE_FRAMES = 3;
        } else {
            this.energyThreshold = 0.002;
            this.MIN_SILENCE_FRAMES = 4;
        }
        
        this.port.postMessage({
            type: 'interviewModeUpdated',
            data: { interviewMode: this.interviewMode }
        });
    }
    
    setInterviewPhase(phase) {
        this.interviewPhase = phase;
        
        switch (phase) {
            case 'warmup':
                this.silenceFrames = Math.min(this.MAX_SILENCE_FRAMES, this.silenceFrames + 2);
                break;
            case 'technical':
                this.silenceFrames = Math.max(this.MIN_SILENCE_FRAMES, this.silenceFrames - 1);
                this.qualityThreshold = 0.8;
                break;
            case 'closing':
                this.silenceFrames = Math.min(this.MAX_SILENCE_FRAMES, this.silenceFrames + 3);
                break;
        }
    }
    
    // Preserve existing calculateEnergy
    calculateEnergy(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }
    
    // ENHANCED: Calculate audio quality score
    calculateQualityScore(audioData) {
        const energy = this.calculateEnergy(audioData);
        const variance = this.calculateEnergyVariance(audioData);
        const snr = this.estimateSignalToNoiseRatio(audioData);
        
        let qualityScore = 0;
        qualityScore += Math.min(1, energy / this.energyThreshold) * 0.3;
        qualityScore += Math.max(0, 1 - (variance / energy)) * 0.3;
        qualityScore += Math.min(1, snr / 10) * 0.4;
        
        return Math.min(1, qualityScore);
    }
    
    calculateEnergyVariance(audioData) {
        const energy = this.calculateEnergy(audioData);
        let varianceSum = 0;
        
        for (let i = 0; i < audioData.length; i++) {
            const sampleEnergy = audioData[i] * audioData[i];
            varianceSum += Math.pow(sampleEnergy - energy, 2);
        }
        
        return Math.sqrt(varianceSum / audioData.length);
    }
    
    estimateSignalToNoiseRatio(audioData) {
        const sortedSamples = [...audioData].map(Math.abs).sort((a, b) => b - a);
        const signalLevel = sortedSamples.slice(0, Math.floor(sortedSamples.length * 0.1))
            .reduce((a, b) => a + b, 0) / (sortedSamples.length * 0.1);
        const noiseLevel = sortedSamples.slice(-Math.floor(sortedSamples.length * 0.1))
            .reduce((a, b) => a + b, 0) / (sortedSamples.length * 0.1);
        
        return noiseLevel > 0 ? 20 * Math.log10(signalLevel / noiseLevel) : 20;
    }
    
    // ENHANCED: Process VAD with interview context
    processVAD(audioData, currentTime = 0) {
        const energy = this.calculateEnergy(audioData);
        const qualityScore = this.calculateQualityScore(audioData);
        const isSpeechFrame = energy > this.energyThreshold && qualityScore > 0.5;
        
        this.updateSpeechPatterns(audioData, energy);
        
        let vadResult = {
            isSpeaking: this.isSpeaking,
            energy: energy,
            qualityScore: qualityScore,
            speechStart: false,
            speechEnd: false,
            interviewContext: null
        };
        
        if (isSpeechFrame) {
            this.currentSpeechFrames++;
            this.currentSilenceFrames = 0;
            
            if (!this.isSpeaking && this.currentSpeechFrames >= this.speechFrames) {
                this.isSpeaking = true;
                vadResult.isSpeaking = true;
                vadResult.speechStart = true;
                vadResult.interviewContext = this.analyzeInterviewContext();

                if (this.lastPauseFrames) {
                    this.updateAdaptiveSilenceThreshold();
                }
            }
        } else {
            this.currentSilenceFrames++;
            this.currentSpeechFrames = 0;
            
            if (this.isSpeaking && this.currentSilenceFrames >= this.silenceFrames) {
                this.isSpeaking = false;
                vadResult.isSpeaking = false;
                vadResult.speechEnd = true;
                vadResult.interviewContext = this.finalizeSpeechAnalysis();

                this.lastPauseFrames = this.currentSilenceFrames;
                this.lastSpeechEndTime = currentTime;
            }
        }
        
        return vadResult;
    }
    
    updateSpeechPatterns(audioData, energy) {
        this.speechPatterns.currentSegmentEnergy.push(energy);
        this.speechPatterns.segmentDuration++;
        
        if (energy > this.energyThreshold * 0.7) {
            this.speechPatterns.consistentEnergyFrames++;
        }
    }
    
    analyzeInterviewContext() {
        const segmentDurationMs = (this.speechPatterns.segmentDuration / this.sampleRate) * 1000;
        const avgEnergy = this.speechPatterns.currentSegmentEnergy.length > 0 
            ? this.speechPatterns.currentSegmentEnergy.reduce((a, b) => a + b, 0) / this.speechPatterns.currentSegmentEnergy.length
            : 0;
        
        let context = {
            type: 'unknown',
            confidence: 0.5,
            priority: 'normal'
        };
        
        if (segmentDurationMs < 3000) {
            context.type = 'question';
            context.priority = 'high';
            this.interviewMetrics.questionsDetected++;
        } else if (segmentDurationMs < 5000) {
            context.type = 'clarification';
            context.priority = 'urgent';
            this.interviewMetrics.clarificationsDetected++;
        } else if (this.speechPatterns.consistentEnergyFrames > this.speechPatterns.segmentDuration * 0.7) {
            context.type = 'technical_explanation';
            this.interviewMetrics.technicalSegmentsDetected++;
        }
        
        return context;
    }
    
    finalizeSpeechAnalysis() {
        const context = this.analyzeInterviewContext();
        
        this.speechPatterns = {
            currentSegmentEnergy: [],
            segmentDuration: 0,
            consistentEnergyFrames: 0,
            energyVariance: 0
        };
        
        return context;
    }
    
    updateAdaptiveSilenceThreshold() {
        this.pauseDurations.push(this.lastPauseFrames);
        if (this.pauseDurations.length > this.maxPauseSamplesToTrack) {
            this.pauseDurations.shift();
        }
        
        const avg = this.pauseDurations.reduce((a, b) => a + b, 0) / this.pauseDurations.length;
        const adaptive = Math.max(this.MIN_SILENCE_FRAMES, Math.min(this.MAX_SILENCE_FRAMES, Math.round(avg)));
        
        if (adaptive !== this.silenceFrames) {
            this.silenceFrames = adaptive;
            this.port.postMessage({ 
                type: 'silenceFramesUpdated', 
                data: { silenceFrames: adaptive } 
            });
        }
    }
    
    // Preserve existing methods and add quality gating
    convertFloat32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const clamped = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = Math.round(clamped * 32767);
        }
        return int16Array;
    }
    
    // ENHANCED: Quality-gated audio chunk processing with comprehensive quality assurance
    processAudioChunk(chunk, currentTime) {
        // Send chunk to quality assurance layer for comprehensive assessment
        this.port.postMessage({
            type: 'qualityAssessment',
            data: {
                audioData: Array.from(chunk), // Convert to array for message passing
                timestamp: currentTime,
                chunkSize: chunk.length
            }
        });
        
        // Basic quality check (enhanced version will be handled by main thread)
        const qualityScore = this.calculateQualityScore(chunk);
        
        if (qualityScore >= this.qualityThreshold) {
            const int16Chunk = this.convertFloat32ToInt16(chunk);
            const uint8Array = new Uint8Array(int16Chunk.buffer);
            const base64 = this.arrayBufferToBase64(uint8Array.buffer);
            
            return {
                audio: base64,
                timestamp: currentTime,
                isSpeaking: this.isSpeaking,
                energy: this.calculateEnergy(chunk),
                qualityScore: qualityScore,
                isHighQuality: true,
                needsQualityAssurance: true // Flag for main thread processing
            };
        } else {
            this.interviewMetrics.qualityDropouts++;
            
            // Let main thread handle recovery through Quality Assurance layer
            return {
                audio: null,
                timestamp: currentTime,
                isSpeaking: this.isSpeaking,
                energy: this.calculateEnergy(chunk),
                qualityScore: qualityScore,
                isLowQuality: true,
                needsQualityAssurance: true,
                rawAudioData: Array.from(chunk) // Include raw data for recovery
            };
        }
    }
    
    // Enhanced main process method
    process(inputs, outputs, parameters) {
        const currentTime = this.frameCount * 128 / this.sampleRate;
        
        const input = inputs[0];
        if (!input || input.length === 0) {
            this.frameCount++;
            return true;
        }
        
        const inputChannel = input[0];
        if (!inputChannel || inputChannel.length === 0) {
            return true;
        }
        
        this.audioBuffer.push(...inputChannel);
        this.chunkBuffer.push(...inputChannel);
        
        // Process VAD
        while (this.audioBuffer.length >= this.frameSize) {
            const frame = this.audioBuffer.splice(0, this.frameSize);
            const vadResult = this.processVAD(frame, currentTime);
            
            if (vadResult.speechStart || vadResult.speechEnd) {
                this.port.postMessage({
                    type: 'vadEvent',
                    data: vadResult
                });
                
                // Send VAD data for enhanced debounce
                if (vadResult.speechEnd) {
                    this.port.postMessage({
                        type: 'vadDataUpdate',
                        data: {
                            avgPauseFrames: this.pauseDurations.length > 0 
                                ? this.pauseDurations.reduce((a, b) => a + b, 0) / this.pauseDurations.length 
                                : this.silenceFrames,
                            interviewContext: vadResult.interviewContext
                        }
                    });
                }
            }
            
            this.processedFrames++;
        }
        
        // Quality-gated chunk processing
        if (this.chunkBuffer.length >= this.samplesPerChunk) {
            const chunk = this.chunkBuffer.splice(0, this.samplesPerChunk);
            const processedChunk = this.processAudioChunk(chunk, currentTime);
            
            if (processedChunk) {
                this.port.postMessage({
                    type: 'audioChunk',
                    data: processedChunk
                });
            }
        }
        
        this.frameCount++;
        return true;
    }
    
    // Preserve existing base64 encoding
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        
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
        
        const padding = bytes.length % 3;
        if (padding === 1) {
            result = result.slice(0, -2) + '==';
        } else if (padding === 2) {
            result = result.slice(0, -1) + '=';
        }
        
        return result;
    }
}

// Register the enhanced processor
registerProcessor('enhanced-jarvis-audio-processor', EnhancedJarvisAudioProcessor);