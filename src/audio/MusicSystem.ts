import { ResourceLoader } from '../config/ResourceLoader';
import { MusicConfig, TrackConfig, FrequencyRamp } from '../config/MusicPatternConfig';
import { Logger } from '../utils/Logger';

interface ActiveNode {
    oscillator: OscillatorNode | AudioBufferSourceNode;
    gainNode: GainNode;
}

interface EnvelopeSettings {
    attack: number;
    decayTime: number;
    decay: number;
    sustain: number;
    release: number;
}

interface NoteInfo {
    note?: string;
    freq?: number;
    time?: number;
    duration: number;
}

type BGMType = 'title' | 'game' | null;
type DrumType = 'kick' | 'snare' | 'hihat';
type OscillatorType = OscillatorNode['type'];

export type BGMName = 'title' | 'game' | 'victory' | 'gameover';
export type SEName = 'coin' | 'jump' | 'damage' | 'button' | 'powerup' | 'gameStart';

export class MusicSystem {
    private audioContext: AudioContext | null;
    private masterGain: GainNode | null;
    private _isInitialized: boolean;
    private listeners: Map<string, Array<(data: any) => void>>;

    private currentBGM: BGMType;
    private bgmLoopInterval: NodeJS.Timeout | null;

    private isPaused: boolean;
    private pausedBGM: BGMType;

    private activeNodes: ActiveNode[];

    private bgmVolume: number;
    private sfxVolume: number;
    private isMuted: boolean;
    
    // For pattern-based playback
    private currentMusicConfig: MusicConfig | null;
    private trackIntervals: Map<string, NodeJS.Timeout>;
    
    constructor() {

        this.audioContext = null;
        this.masterGain = null;
        this._isInitialized = false;
        this.listeners = new Map();

        this.currentBGM = null;
        this.bgmLoopInterval = null;

        this.isPaused = false;
        this.pausedBGM = null;

        this.activeNodes = [];

        this.bgmVolume = 0.3;
        this.sfxVolume = 0.5;
        this.isMuted = false;
        
        this.currentMusicConfig = null;
        this.trackIntervals = new Map();
    }
    
    get isInitialized(): boolean {
        return this._isInitialized;
    }

    async init(): Promise<boolean> {
        Logger.log('MusicSystem: init() called');
        if (this._isInitialized) {
            Logger.log('MusicSystem: Already initialized');
            return true;
        }
        
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) {
                Logger.warn('Web Audio API is not supported in this browser');
                return false;
            }

            try {
                this.audioContext = new AudioContextClass() as AudioContext;
                Logger.log('MusicSystem: AudioContext created');
            } catch {
                Logger.log('AudioContext creation deferred - will retry on user interaction');
                return false;
            }

            if (this.audioContext.state === 'suspended') {
                Logger.log('MusicSystem: AudioContext is suspended, attempting to resume...');
                try {
                    await this.audioContext.resume();
                } catch {
                    Logger.log('AudioContext resume deferred - will retry on user interaction');
                    return false;
                }
            }
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.bgmVolume;
            
            this._isInitialized = true;
            Logger.log('Music system initialized successfully');
            return true;
        } catch (error: any) {

            if (error.name === 'NotAllowedError') {
                Logger.log('音楽システムはユーザー操作後に開始されます');
            } else {
                Logger.warn('音楽システムの初期化エラー:', error);
            }
            this._isInitialized = false;
            return false;
        }
    }

    private getNoteFrequency(note: string): number {
        const notes: { [key: string]: number } = {
            'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
            'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
            'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
            'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
            'C6': 1046.50, 'A6': 1760.00
        };
        return notes[note] || 440;
    }

    private playNote(frequency: number, duration: number, startTime: number, type: OscillatorType = 'square', volume: number = 0.3): void {
        if (!this.isInitialized || this.isMuted || !this.audioContext || !this.masterGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        this.activeNodes.push({ oscillator, gainNode });
        
        const now = startTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, now + duration * 0.1);
        gainNode.gain.setValueAtTime(volume * 0.7, now + duration * 0.9);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
        
        oscillator.addEventListener('ended', () => {
            const index = this.activeNodes.findIndex(node => node.oscillator === oscillator);
            if (index !== -1) {
                this.activeNodes.splice(index, 1);
            }
        });
    }

    private playChord(notes: string[], duration: number, startTime: number, type: OscillatorType = 'sine', volume: number = 0.2): void {
        notes.forEach(note => {
            const freq = this.getNoteFrequency(note);
            this.playNote(freq, duration, startTime, type, volume);
        });
    }

    private playDrum(type: DrumType, startTime: number): void {
        if (!this.isInitialized || this.isMuted || !this.audioContext || !this.masterGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const now = startTime;
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        this.activeNodes.push({ oscillator, gainNode });
        
        switch(type) {
        case 'kick':
            oscillator.frequency.setValueAtTime(150, now);
            oscillator.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
            gainNode.gain.setValueAtTime(1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;
                
        case 'snare': {
            const noise = this.audioContext.createBufferSource();
            const noiseBuffer = this.audioContext.createBuffer(1, 4410, this.audioContext.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                noiseData[i] = Math.random() * 2 - 1;
            }
            noise.buffer = noiseBuffer;
            noise.connect(gainNode);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            noise.start(now);

            this.activeNodes.push({ oscillator: noise, gainNode });
            break;
        }
                
        case 'hihat':
            oscillator.type = 'square';
            oscillator.frequency.value = 400;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            oscillator.start(now);
            oscillator.stop(now + 0.05);
            break;
        }
        
        oscillator.addEventListener('ended', () => {
            const index = this.activeNodes.findIndex(node => node.oscillator === oscillator);
            if (index !== -1) {
                this.activeNodes.splice(index, 1);
            }
        });
    }

    playTitleBGM(): void {
        if (this.currentBGM === 'title') {
            return;
        }
        
        this.stopBGM();
        
        if (!this.isInitialized || !this.audioContext) {
            return;
        }
        
        const bpm = 120;
        const beatLength = 60 / bpm;
        
        const playBar = () => {
            if (!this.isInitialized || this.isMuted || this.currentBGM !== 'title' || !this.audioContext) return;
            
            const now = this.audioContext.currentTime;

            const bassPattern = ['C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'F3', 'F3'];
            for (let i = 0; i < 8; i++) {
                this.playNote(
                    this.getNoteFrequency(bassPattern[i]),
                    beatLength * 0.9,
                    now + i * beatLength * 0.5,
                    'sine',
                    0.4
                );
            }

            const chords = [
                ['C4', 'E4', 'G4'],
                ['G4', 'B4', 'D5'],
                ['A4', 'C5', 'E5'],
                ['F4', 'A4', 'C5']
            ];
            
            for (let i = 0; i < 4; i++) {
                this.playChord(
                    chords[i],
                    beatLength * 0.9,
                    now + i * beatLength,
                    'triangle',
                    0.2
                );
            }

            const melody: NoteInfo[] = [
                { note: 'E5', duration: 0.5 },
                { note: 'D5', duration: 0.5 },
                { note: 'C5', duration: 1 },
                { note: 'G4', duration: 1 },
                { note: 'A4', duration: 0.5 },
                { note: 'B4', duration: 0.5 },
                { note: 'C5', duration: 1 }
            ];
            
            let melodyTime = now;
            melody.forEach(({ note, duration }) => {
                if (note) {
                    this.playNote(
                        this.getNoteFrequency(note),
                        duration * beatLength * 0.9,
                        melodyTime,
                        'square',
                        0.3
                    );
                }
                melodyTime += duration * beatLength;
            });
        };
        
        playBar();
        
        this.bgmLoopInterval = setInterval(() => {
            playBar();
        }, beatLength * 4 * 1000);
        
        this.currentBGM = 'title';
    }

    playGameBGM(): void {
        if (this.currentBGM === 'game') {
            return;
        }
        
        this.stopBGM();
        
        if (!this.isInitialized || !this.audioContext) {
            return;
        }
        
        const bpm = 140;
        const beatLength = 60 / bpm;
        let currentBeat = 0;
        
        const playBar = () => {
            if (!this.isInitialized || this.isMuted || this.currentBGM !== 'game' || !this.audioContext) return;
            
            const now = this.audioContext.currentTime;

            for (let i = 0; i < 4; i++) {

                this.playDrum('kick', now + i * beatLength);

                if (i === 1 || i === 3) {
                    this.playDrum('snare', now + i * beatLength);
                }

                for (let j = 0; j < 2; j++) {
                    this.playDrum('hihat', now + i * beatLength + j * beatLength * 0.5);
                }
            }

            const bassPattern = [
                'C3', 'E3', 'G3', 'E3',
                'F3', 'A3', 'C4', 'A3',
                'G3', 'B3', 'D4', 'B3',
                'C3', 'E3', 'G3', 'E3'
            ];
            
            for (let i = 0; i < 16; i++) {
                this.playNote(
                    this.getNoteFrequency(bassPattern[i]),
                    beatLength * 0.23,
                    now + i * beatLength * 0.25,
                    'sawtooth',
                    0.3
                );
            }

            if (currentBeat % 8 >= 4) {
                const leadNotes: NoteInfo[] = [
                    { note: 'G5', duration: 0.5 },
                    { note: 'E5', duration: 0.5 },
                    { note: 'C5', duration: 0.5 },
                    { note: 'E5', duration: 0.5 },
                    { note: 'G5', duration: 1 },
                    { note: 'A5', duration: 0.5 },
                    { note: 'G5', duration: 0.5 }
                ];
                
                let leadTime = now;
                leadNotes.forEach(({ note, duration }) => {
                    if (note) {
                        this.playNote(
                            this.getNoteFrequency(note),
                            duration * beatLength * 0.8,
                            leadTime,
                            'square',
                            0.25
                        );
                    }
                    leadTime += duration * beatLength;
                });
            }
            
            currentBeat += 4;
        };
        
        playBar();
        
        this.bgmLoopInterval = setInterval(() => {
            playBar();
        }, beatLength * 4 * 1000);
        
        this.currentBGM = 'game';
    }

    playVictoryJingle(): void {
        this.stopBGM();
        if (!this.isInitialized || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const notes: NoteInfo[] = [
            { note: 'C5', time: 0, duration: 0.2 },
            { note: 'E5', time: 0.2, duration: 0.2 },
            { note: 'G5', time: 0.4, duration: 0.2 },
            { note: 'C6', time: 0.6, duration: 0.6 }
        ];
        
        notes.forEach(({ note, time, duration }) => {
            if (note) {
                this.playNote(
                    this.getNoteFrequency(note),
                    duration,
                    now + time,
                    'sine',
                    0.4
                );
            }
        });

        this.playChord(['C4', 'E4', 'G4', 'C5'], 1.2, now, 'triangle', 0.3);
    }

    playGameOverJingle(): void {
        this.stopBGM();
        if (!this.isInitialized || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const notes: NoteInfo[] = [
            { note: 'C4', time: 0, duration: 0.3 },
            { note: 'B3', time: 0.3, duration: 0.3 },
            { note: 'A3', time: 0.6, duration: 0.3 },
            { note: 'G3', time: 0.9, duration: 0.6 }
        ];
        
        notes.forEach(({ note, time, duration }) => {
            if (note) {
                this.playNote(
                    this.getNoteFrequency(note),
                    duration,
                    now + time,
                    'sine',
                    0.3
                );
            }
        });
    }

    private playSoundEffect(frequency: number, duration: number, type: OscillatorType = 'square', volume: number | null = null, envelope: EnvelopeSettings | null = null): void {
        if (!this.isInitialized || this.isMuted || !this.audioContext || !this.masterGain) return;
        
        const effectVolume = volume !== null ? volume : this.sfxVolume;
        const now = this.audioContext.currentTime;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        if (envelope) {
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(effectVolume, now + envelope.attack);
            gainNode.gain.exponentialRampToValueAtTime(effectVolume * envelope.decay, now + envelope.attack + envelope.decayTime);
            gainNode.gain.setValueAtTime(effectVolume * envelope.sustain, now + duration - envelope.release);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        } else {
            gainNode.gain.setValueAtTime(effectVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        }
        
        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    playJumpSound(): void {
        if (!this.isInitialized || this.isMuted) return;
        
        let jumpConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            jumpConfig = resourceLoader.getAudioConfig('sfx', 'jump');
        } catch {
            // ResourceLoader not initialized yet
        }
        
        if (jumpConfig && jumpConfig.waveform && jumpConfig.frequency) {
            this.playSoundEffect(
                jumpConfig.frequency.start,
                jumpConfig.duration || 0.1,
                jumpConfig.waveform as OscillatorType,
                jumpConfig.volume,
                { attack: 0.01, decayTime: 0.03, decay: 0.7, sustain: 0.5, release: 0.06 }
            );
            
            if (jumpConfig.frequency.end) {
                setTimeout(() => {
                    if (!this.isInitialized || this.isMuted) return;
                    this.playSoundEffect(jumpConfig.frequency.end || 880, 0.08, 'sine', 0.15);
                }, 20);
            }
        } else {
            // Fallback to hardcoded values
            this.playSoundEffect(
                440,
                0.1,
                'square',
                0.3,
                { attack: 0.01, decayTime: 0.03, decay: 0.7, sustain: 0.5, release: 0.06 }
            );
            
            setTimeout(() => {
                if (!this.isInitialized || this.isMuted) return;
                this.playSoundEffect(880, 0.08, 'sine', 0.15);
            }, 20);
        }
    }

    playCoinSound(): void {
        if (!this.isInitialized || this.isMuted) return;

        const notes: NoteInfo[] = [
            { freq: this.getNoteFrequency('A5'), time: 0, duration: 0.08 },
            { freq: this.getNoteFrequency('C6'), time: 0.04, duration: 0.08 },
            { freq: this.getNoteFrequency('E6'), time: 0.08, duration: 0.12 }
        ];
        
        notes.forEach(({ freq, time, duration }) => {
            setTimeout(() => {
                if (!this.isInitialized || this.isMuted || freq === undefined) return;
                this.playSoundEffect(freq, duration, 'sine', 0.5);
            }, time * 1000);
        });
        
        setTimeout(() => {
            if (!this.isInitialized || this.isMuted) return;
            this.playSoundEffect(this.getNoteFrequency('A6'), 0.1, 'triangle', 0.3);
        }, 60);
    }

    playDamageSound(): void {
        if (!this.isInitialized || this.isMuted || !this.audioContext || !this.masterGain) return;
        
        let damageConfig = null;
        try {
            const resourceLoader = ResourceLoader.getInstance();
            damageConfig = resourceLoader.getAudioConfig('sfx', 'damage');
        } catch {
            // ResourceLoader not initialized yet
        }
        
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        if (damageConfig && damageConfig.waveform && damageConfig.frequency) {
            oscillator.type = damageConfig.waveform as OscillatorType;
            oscillator.frequency.setValueAtTime(damageConfig.frequency.start, now);
            oscillator.frequency.exponentialRampToValueAtTime(damageConfig.frequency.end || 80, now + (damageConfig.duration || 0.5));
            gainNode.gain.setValueAtTime(damageConfig.volume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + (damageConfig.duration || 0.5));
        } else {
            // Fallback to hardcoded values
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.5);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        }
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.start(now);
        oscillator.stop(now + (damageConfig?.duration || 0.5));
    }

    playButtonClickSound(): void {
        if (!this.isInitialized || this.isMuted) return;
        
        this.playSoundEffect(
            800,
            0.05,
            'square',
            0.2,
            { attack: 0.01, decayTime: 0.02, decay: 0.5, sustain: 0.3, release: 0.02 }
        );
    }

    playGameStartSound(): void {
        if (!this.isInitialized || this.isMuted) return;

        const notes: NoteInfo[] = [
            { freq: this.getNoteFrequency('C4'), time: 0, duration: 0.1 },
            { freq: this.getNoteFrequency('E4'), time: 0.1, duration: 0.1 },
            { freq: this.getNoteFrequency('G4'), time: 0.2, duration: 0.1 },
            { freq: this.getNoteFrequency('C5'), time: 0.3, duration: 0.3 }
        ];
        
        notes.forEach(({ freq, time, duration }) => {
            setTimeout(() => {
                if (!this.isInitialized || this.isMuted || freq === undefined) return;
                this.playSoundEffect(freq, duration, 'sine', 0.6);
            }, time * 1000);
        });
    }

    playGoalSound(): void {
        if (!this.isInitialized || this.isMuted) return;

        const notes: NoteInfo[] = [
            { freq: this.getNoteFrequency('G4'), time: 0, duration: 0.15 },
            { freq: this.getNoteFrequency('G4'), time: 0.15, duration: 0.15 },
            { freq: this.getNoteFrequency('G4'), time: 0.3, duration: 0.15 },
            { freq: this.getNoteFrequency('D5'), time: 0.45, duration: 0.4 },
            { freq: this.getNoteFrequency('E5'), time: 0.85, duration: 0.15 },
            { freq: this.getNoteFrequency('D5'), time: 1.0, duration: 0.15 },
            { freq: this.getNoteFrequency('C5'), time: 1.15, duration: 0.15 },
            { freq: this.getNoteFrequency('G5'), time: 1.3, duration: 0.6 }
        ];
        
        notes.forEach(({ freq, time, duration }) => {
            setTimeout(() => {
                if (!this.isInitialized || this.isMuted || freq === undefined) return;
                this.playSoundEffect(freq, duration, 'square', 0.4, {
                    attack: 0.01,
                    decayTime: 0.1,
                    decay: 0.7,
                    sustain: 0.5,
                    release: 0.2
                });
            }, time * 1000);
        });
    }

    private stopAllActiveNodes(): void {
        if (!this.audioContext) return;
        
        this.activeNodes.forEach(({ oscillator, gainNode }) => {
            try {

                if (gainNode && gainNode.gain) {
                    gainNode.gain.cancelScheduledValues(this.audioContext!.currentTime);
                    gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
                }

                if (oscillator && oscillator.stop) {
                    oscillator.stop(this.audioContext!.currentTime);
                }
            } catch {
                // TODO: Handle oscillator stop error
            }
        });

        this.activeNodes = [];
    }

    pauseBGM(): void {

        if (this.isPaused) {
            return;
        }

        this.pausedBGM = this.currentBGM;
        
        if (this.bgmLoopInterval) {
            clearInterval(this.bgmLoopInterval);
            this.bgmLoopInterval = null;
        }
        
        this.stopAllActiveNodes();
        
        this.isPaused = true;
    }

    resumeBGM(): void {

        if (!this.isPaused) {
            return;
        }
        
        this.isPaused = false;

        const bgmToResume = this.pausedBGM;
        this.currentBGM = null;

        if (bgmToResume === 'title') {
            this.playTitleBGM();
        } else if (bgmToResume === 'game') {
            this.playGameBGM();
        }
        
        this.pausedBGM = null;
    }

    stopBGM(): void {

        if (!this.currentBGM && !this.bgmLoopInterval && this.trackIntervals.size === 0) {
            return;
        }
        
        if (this.bgmLoopInterval) {
            clearInterval(this.bgmLoopInterval);
            this.bgmLoopInterval = null;
        }
        
        this.stopPatternPlayback();
        this.stopAllActiveNodes();

        this.currentBGM = null;
        this.isPaused = false;
        this.pausedBGM = null;
    }

    setVolume(volume: number): void {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain && !this.isMuted) {
            this.masterGain.gain.value = this.bgmVolume;
        }
    }

    toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.bgmVolume;
        }
        return this.isMuted;
    }

    getMuteState(): boolean {
        return this.isMuted;
    }

    setSfxVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    getSfxVolume(): number {
        return this.sfxVolume;
    }

    destroy(): void {
        try {
            this.stopAllActiveNodes();
            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.close().catch(error => {
                    Logger.error('AudioContext closing error:', error);
                });
            }
            this._isInitialized = false;
        } catch (error) {
            Logger.error('音楽システムのクリーンアップエラー:', error);
        }
    }
    
    playEnemyDefeatSound(): void {
        if (!this._isInitialized || this.isMuted || !this.audioContext || !this.masterGain) return;
        
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        
        this.activeNodes.push({ oscillator, gainNode });
        
        oscillator.onended = () => {
            const index = this.activeNodes.findIndex(node => node.oscillator === oscillator);
            if (index !== -1) {
                this.activeNodes.splice(index, 1);
            }
            oscillator.disconnect();
            gainNode.disconnect();
        };
    }
    
    // 統一的なインターフェース
    playBGM(name: BGMName): void {
        if (!this.isInitialized) {
            Logger.warn(`[MusicSystem] Cannot play BGM '${name}' - system not initialized`);
            return;
        }
        
        switch (name) {
        case 'title':
            this.playTitleBGM();
            break;
        case 'game':
            this.playGameBGM();
            break;
        case 'victory':
            this.playVictoryJingle();
            break;
        case 'gameover':
            this.playGameOverJingle();
            break;
        default:
            Logger.warn(`[MusicSystem] Unknown BGM: ${name}`);
        }
    }
    
    playSE(name: SEName): void {
        if (!this.isInitialized) {
            Logger.warn(`[MusicSystem] Cannot play SE '${name}' - system not initialized`);
            return;
        }
        
        switch (name) {
        case 'coin':
            this.playCoinSound();
            break;
        case 'jump':
            this.playJumpSound();
            break;
        case 'damage':
            this.playDamageSound();
            break;
        case 'button':
            this.playButtonClickSound();
            break;
        case 'powerup':
            this.playGoalSound(); // 仮にpowerupとして使用
            break;
        case 'gameStart':
            this.playGameStartSound();
            break;
        default:
            Logger.warn(`[MusicSystem] Unknown SE: ${name}`);
        }
    }
    
    // Pattern-based music playback methods
    private playMusicPattern(config: MusicConfig): void {
        if (!this.isInitialized || !this.audioContext) return;
        
        const beatLength = config.tempo ? 60 / config.tempo : 0.5;
        this.currentMusicConfig = config;
        
        // Play each track
        config.tracks.forEach(track => {
            this.playTrack(track, beatLength, config.loop || false, config);
        });
    }
    
    private playTrack(track: TrackConfig, beatLength: number, loop: boolean, config: MusicConfig): void {
        if (!this.audioContext) return;
        
        let nextScheduleTime = 0;
        const loopDuration = (track.pattern.duration || 4) * beatLength; // Default 4 beats
        
        const schedulePattern = (startTime: number) => {
            if (!this.isInitialized || this.isMuted || !this.audioContext) return;
            
            const pattern = track.pattern;
            
            // Handle different pattern types
            if (pattern.beats && track.instrument.type === 'drums') {
                // Drum pattern
                pattern.beats.forEach(beat => {
                    this.playDrum(beat.type, startTime + beat.time * beatLength);
                });
            } else if (pattern.notes) {
                // Melodic pattern
                let currentTime = startTime + (pattern.startAt || 0) * beatLength;
                
                pattern.notes.forEach((note, index) => {
                    const duration = pattern.durations ? pattern.durations[index] * beatLength : beatLength;
                    const time = pattern.times ? startTime + pattern.times[index] : currentTime;
                    
                    this.playNoteWithEnvelope(
                        this.getNoteFrequency(note),
                        duration,
                        time,
                        track.instrument.type as OscillatorType,
                        track.instrument.volume,
                        track.instrument.envelope
                    );
                    
                    if (!pattern.times) {
                        currentTime += duration;
                    }
                });
            } else if (pattern.chords) {
                // Chord pattern
                let currentTime = startTime;
                
                pattern.chords.forEach((chord, index) => {
                    const duration = pattern.durations ? pattern.durations[index] * beatLength : beatLength;
                    const time = pattern.times ? startTime + pattern.times[index] : currentTime;
                    
                    this.playChord(
                        chord,
                        duration,
                        time,
                        track.instrument.type as OscillatorType,
                        track.instrument.volume
                    );
                    
                    if (!pattern.times) {
                        currentTime += duration;
                    }
                });
            } else if (pattern.frequencies) {
                // Frequency-based pattern (for sound effects)
                pattern.frequencies.forEach((freq, index) => {
                    const duration = pattern.durations ? pattern.durations[index] : 0.1;
                    const time = pattern.times ? startTime + pattern.times[index] : startTime;
                    
                    this.playFrequencyRamp(
                        freq,
                        duration,
                        time,
                        track.instrument.type as OscillatorType,
                        track.instrument.volume,
                        track.instrument.envelope
                    );
                });
            }
        };
        
        // Schedule the pattern using Web Audio API timing
        const scheduleNext = () => {
            if (!this.audioContext || !this.currentMusicConfig || this.currentMusicConfig !== config) {
                this.trackIntervals.delete(track.name);
                return;
            }
            
            const now = this.audioContext.currentTime;
            
            // Schedule ahead by 100ms to ensure smooth playback
            while (nextScheduleTime < now + 0.1) {
                schedulePattern(nextScheduleTime);
                nextScheduleTime += loopDuration;
                
                // If not looping, schedule only once
                if (!loop || track.pattern.loop === false) {
                    this.trackIntervals.delete(track.name);
                    return;
                }
            }
            
            // Use setTimeout with a shorter interval for checking
            const timeoutId = setTimeout(scheduleNext, 50);
            this.trackIntervals.set(track.name, timeoutId as unknown as NodeJS.Timeout);
        };
        
        // Start scheduling
        nextScheduleTime = this.audioContext.currentTime;
        scheduleNext();
    }
    
    private playNoteWithEnvelope(
        frequency: number, 
        duration: number, 
        startTime: number, 
        type: OscillatorType, 
        volume: number,
        envelope?: EnvelopeSettings
    ): void {
        if (envelope) {
            this.playSoundEffect(frequency, duration, type, volume, envelope);
        } else {
            this.playNote(frequency, duration, startTime, type, volume);
        }
    }
    
    private playFrequencyRamp(
        freq: FrequencyRamp,
        duration: number,
        startTime: number,
        type: OscillatorType,
        volume: number,
        envelope?: EnvelopeSettings
    ): void {
        if (!this.audioContext || !this.masterGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq.start, startTime);
        if (freq.end !== freq.start) {
            oscillator.frequency.exponentialRampToValueAtTime(freq.end, startTime + duration);
        }
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        if (envelope) {
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + envelope.attack);
            gainNode.gain.exponentialRampToValueAtTime(volume * envelope.decay, startTime + envelope.attack + envelope.decayTime);
            gainNode.gain.setValueAtTime(volume * envelope.sustain, startTime + duration - envelope.release);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        } else {
            gainNode.gain.setValueAtTime(volume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        }
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
        
        this.activeNodes.push({ oscillator, gainNode });
        
        oscillator.addEventListener('ended', () => {
            const index = this.activeNodes.findIndex(node => node.oscillator === oscillator);
            if (index !== -1) {
                this.activeNodes.splice(index, 1);
            }
        });
    }
    
    private stopPatternPlayback(): void {
        // Stop all track intervals
        this.trackIntervals.forEach(interval => clearInterval(interval));
        this.trackIntervals.clear();
        this.currentMusicConfig = null;
    }
    
    // New unified methods using patterns
    playBGMFromPattern(name: BGMName): void {
        try {
            const resourceLoader = ResourceLoader.getInstance();
            const musicConfig = resourceLoader.getMusicPattern('bgm', name);
            
            if (musicConfig) {
                this.stopBGM();
                this.stopPatternPlayback();
                this.currentBGM = name as BGMType;
                this.playMusicPattern(musicConfig);
            } else {
                // Fallback to existing implementation
                this.playBGM(name);
            }
        } catch {
            // ResourceLoader not initialized, use existing implementation
            this.playBGM(name);
        }
    }
    
    playSEFromPattern(name: string): void {
        try {
            const resourceLoader = ResourceLoader.getInstance();
            const seConfig = resourceLoader.getMusicPattern('se', name);
            
            if (seConfig) {
                this.playMusicPattern(seConfig);
            } else {
                // Fallback to existing implementation
                this.playSE(name as SEName);
            }
        } catch {
            // ResourceLoader not initialized, use existing implementation
            if (['coin', 'jump', 'damage', 'button', 'powerup', 'gameStart'].includes(name)) {
                this.playSE(name as SEName);
            }
        }
    }
}