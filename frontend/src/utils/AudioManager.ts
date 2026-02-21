import { useChatStore } from '../store/useChatStore';

class AudioManager {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    private source: AudioBufferSourceNode | null = null;
    private micSource: MediaStreamAudioSourceNode | null = null;
    private micStream: MediaStream | null = null;

    private isPlaying: boolean = false;
    private isListening: boolean = false;
    private onEnded: (() => void) | null = null;

    constructor() {
        // Initialize on user interaction usually
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }
    }

    async startMic() {
        this.init();
        if (!this.audioContext || !this.analyser) return;

        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
            this.micSource.connect(this.analyser);
            this.isListening = true;
        } catch (err) {
            console.error('Error accessing microphone for visualizer:', err);
        }
    }

    stopMic() {
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource = null;
        }
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }
        this.isListening = false;
    }

    async playAudio(audioData: string | ArrayBuffer): Promise<number> {
        this.init();
        if (!this.audioContext || !this.analyser) return 0;

        // Ensure we stop mic before playing to avoid feedback loop or mixed analysis
        this.stopMic();

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        let buffer: AudioBuffer;
        if (typeof audioData === 'string') {
            if (audioData.startsWith('http')) {
                const response = await fetch(audioData);
                const arrayBuffer = await response.arrayBuffer();
                buffer = await this.audioContext.decodeAudioData(arrayBuffer);
            } else {
                const binaryString = window.atob(audioData);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                buffer = await this.audioContext.decodeAudioData(bytes.buffer as ArrayBuffer);
            }
        } else {
            buffer = await this.audioContext.decodeAudioData(audioData);
        }

        if (this.source) {
            this.source.stop();
        }

        this.source = this.audioContext.createBufferSource();
        this.source.buffer = buffer;
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.source.onended = () => {
            this.isPlaying = false;
            useChatStore.getState().setStatus('idle');
            // Auto restart mic if needed? 
            // For now UI handles logic
            if (this.onEnded) this.onEnded();
        };

        this.source.start(0);
        this.isPlaying = true;
        useChatStore.getState().setStatus('speaking');
        return buffer.duration; // ← real audio duration in seconds
    }

    // Poll for visualization data
    getAudioLevel(): number {
        if ((!this.isPlaying && !this.isListening) || !this.analyser || !this.dataArray) return 0;

        this.analyser.getByteFrequencyData(this.dataArray as any);

        let sum = 0;
        // Focus on vocal range (lower-mid frequencies)
        // With fftSize 256, bins are ~172Hz wide. 
        // Index 0-10 covers 0 - 1720Hz which is good for voice.
        const lowFreqIndex = 12;
        for (let i = 0; i < lowFreqIndex; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / lowFreqIndex;

        // Normalize 0-255 to 0-1 with a bit of boost
        return Math.min(1, (average / 128));
    }

    stop() {
        if (this.source) {
            this.source.stop();
            this.isPlaying = false;
            useChatStore.getState().setStatus('idle');
        }
    }
}

export const audioManager = new AudioManager();
