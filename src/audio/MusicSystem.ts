import { ResourceLoader } from '../config/ResourceLoader';
import { MusicConfig, TrackConfig } from '../config/MusicPatternConfig';
import { Logger } from '../utils/Logger';

const MS_PER_SEC = 1000;

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

/**
 * System for managing music operations
 */
export class MusicSystem {
    private audioContext: AudioContext | null;
    private masterGain: GainNode | null;
    private _isInitialized: boolean;
    private listeners: Map<string, Array<(data: unknown) => void>>;

    private currentBGM: BGMType;

    private isPaused: boolean;
    private pausedBGM: BGMType;

    private activeNodes: ActiveNode[];

    private bgmVolume: number;
    private sfxVolume: number;
    private isMuted: boolean;
    
    private currentMusicConfig: MusicConfig | null;
    private patternLoopTimeout: NodeJS.Timeout | null;
    
    
    constructor() {

        this.audioContext = null;
        this.masterGain = null;
        this._isInitialized = false;
        this.listeners = new Map();

        this.currentBGM = null;

        this.isPaused = false;
        this.pausedBGM = null;

        this.activeNodes = [];

        this.bgmVolume = 0.3;
        this.sfxVolume = 0.5;
        this.isMuted = false;
        
        this.currentMusicConfig = null;
        this.patternLoopTimeout = null;
    }
    
    get isInitialized(): boolean {
        return this._isInitialized;
    }

    async init(): Promise<boolean> {
        const startTime = performance.now();
        Logger.log('[Performance] MusicSystem.init() entered at:', startTime.toFixed(2) + 'ms');
        Logger.log('MusicSystem: init() called');
        if (this._isInitialized) {
            Logger.log('[Performance] MusicSystem already initialized');
            Logger.log('MusicSystem: Already initialized');
            return true;
        }
        
        Logger.log('[Performance] MusicSystem starting initialization...');
        try {
            Logger.log('[Performance] Checking AudioContext availability...');
            const AudioContextClass = (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext || (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextClass) {
                Logger.log('[Performance] Web Audio API not supported');
                Logger.warn('Web Audio API is not supported in this browser');
                return false;
            }
            Logger.log('[Performance] AudioContext class found');

            try {
                Logger.log('[Performance] Creating new AudioContext...');
                this.audioContext = new AudioContextClass() as AudioContext;
                Logger.log('[Performance] AudioContext created successfully, state:', this.audioContext.state);
                Logger.log('MusicSystem: AudioContext created');
            } catch (e) {
                Logger.log('[Performance] AudioContext creation failed:', e);
                Logger.log('AudioContext creation deferred - will retry on user interaction');
                return false;
            }

            if (this.audioContext.state === 'suspended') {
                Logger.log('[Performance] AudioContext is suspended, will resume on first playback at:', performance.now().toFixed(2) + 'ms');
                Logger.log('MusicSystem: AudioContext is suspended, will resume on first playback');
            }
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.bgmVolume;
            
            this._isInitialized = true;
            const endTime = performance.now();
            Logger.log('[Performance] MusicSystem.init() completed:', endTime.toFixed(2) + 'ms', '(took', (endTime - startTime).toFixed(2) + 'ms)');
            Logger.log('Music system initialized successfully');
            return true;
        } catch (error) {
            const endTime = performance.now();
            Logger.log('[Performance] MusicSystem.init() failed:', endTime.toFixed(2) + 'ms', '(took', (endTime - startTime).toFixed(2) + 'ms)');
            Logger.log('[Performance] Error details:', error);
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
        } catch (error) {
            Logger.warn('Failed to load jump sound config:', error);
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
            }, time * MS_PER_SEC);
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
        } catch (error) {
            Logger.warn('Failed to load damage sound config:', error);
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
            }, time * MS_PER_SEC);
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
            }, time * MS_PER_SEC);
        });
    }

    private stopAllActiveNodes(): void {
        if (!this.audioContext) return;
        
        this.activeNodes.forEach(({ oscillator, gainNode }) => {
            try {

                if (gainNode && gainNode.gain) {
                    if (this.audioContext) {
                        gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
                        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    }
                }

                if (oscillator && oscillator.stop && this.audioContext) {
                    oscillator.stop(this.audioContext.currentTime);
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

        if (bgmToResume) {
            this.playBGMFromPattern(bgmToResume);
        }
        
        this.pausedBGM = null;
    }

    stopBGM(): void {
        if (!this.currentBGM && !this.patternLoopTimeout) {
            return;
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
            if (error instanceof Error && error.stack) {
                Logger.error('Stack trace:', error.stack);
            }
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
    
    playBGM(name: BGMName): void {
        if (!this.isInitialized) {
            Logger.warn(`[MusicSystem] Cannot play BGM '${name}' - system not initialized`);
            return;
        }
        
        this.playBGMFromPattern(name);
    }
    
    playSE(name: SEName): void {
        if (!this.isInitialized) {
            Logger.warn(`[MusicSystem] Cannot play SE '${name}' - system not initialized`);
            return;
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            Logger.log('[Performance] Attempting to resume AudioContext on SE playback');
            this.audioContext.resume().catch(e => {
                Logger.log('[Performance] AudioContext resume failed on SE playback:', e);
            });
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
            this.playGoalSound();
            break;
        case 'gameStart':
            this.playGameStartSound();
            break;
        default:
            Logger.warn(`[MusicSystem] Unknown SE: ${name}`);
        }
    }
    
    private playMusicPattern(config: MusicConfig): void {
        if (!this.isInitialized || !this.audioContext) return;
        
        const beatLength = config.tempo ? 60 / config.tempo : 0.5;
        this.currentMusicConfig = config;
        
        let maxDuration = 0;
        config.tracks.forEach(track => {
            const duration = track.pattern.repeatEvery || track.pattern.duration || 
                            (track.pattern.durations ? track.pattern.durations.reduce((a, b) => a + b, 0) : 4);
            maxDuration = Math.max(maxDuration, duration);
        });
        
        this.scheduleAllPatterns(config, beatLength, maxDuration);
        
        if (config.loop) {
            this.scheduleNextLoop(config, beatLength, maxDuration);
        }
    }
    
    private scheduleAllPatterns(config: MusicConfig, beatLength: number, loopDuration: number): void {
        if (!this.audioContext) return;
        
        const startTime = this.audioContext.currentTime;
        
        config.tracks.forEach(track => {
            this.scheduleTrackPattern(track, startTime, beatLength, loopDuration);
        });
    }
    
    private scheduleNextLoop(config: MusicConfig, beatLength: number, loopDuration: number): void {
        if (!this.audioContext) return;
        
        const loopDurationMs = loopDuration * beatLength * MS_PER_SEC;
        
        this.patternLoopTimeout = setTimeout(() => {
            if (!this.currentBGM || !this.currentMusicConfig) {
                return;
            }
            
            this.scheduleAllPatterns(config, beatLength, loopDuration);
            
            this.scheduleNextLoop(config, beatLength, loopDuration);
        }, loopDurationMs);
    }
    
    private scheduleTrackPattern(track: TrackConfig, baseStartTime: number, beatLength: number, loopDuration: number): void {
        if (!this.audioContext) return;
        
        const pattern = track.pattern;
        let startTime = baseStartTime;
        
        if (pattern.startAt) {
            startTime += pattern.startAt * beatLength;
        }
        
        const repeatEvery = pattern.repeatEvery || loopDuration;
        const numRepeats = Math.floor(loopDuration / repeatEvery);
        
        for (let repeat = 0; repeat < numRepeats; repeat++) {
            const repeatStartTime = startTime + (repeat * repeatEvery * beatLength);
            
            if (pattern.beats && track.instrument.type === 'drums') {
                pattern.beats.forEach(beat => {
                    this.playDrum(beat.type, repeatStartTime + beat.time * beatLength);
                });
            } else if (pattern.notes) {
                let currentTime = repeatStartTime;
                
                pattern.notes.forEach((note, index) => {
                    const duration = pattern.durations ? pattern.durations[index] * beatLength : beatLength;
                    const time = pattern.times ? repeatStartTime + pattern.times[index] * beatLength : currentTime;
                    
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
                let currentTime = repeatStartTime;
                
                pattern.chords.forEach((chord, index) => {
                    const duration = pattern.durations ? pattern.durations[index] * beatLength : beatLength;
                    const time = pattern.times ? repeatStartTime + pattern.times[index] * beatLength : currentTime;
                    
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
            }
        }
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
    
    private stopPatternPlayback(): void {
        if (this.patternLoopTimeout) {
            clearTimeout(this.patternLoopTimeout);
            this.patternLoopTimeout = null;
        }
        
        this.currentMusicConfig = null;
    }
    
    playBGMFromPattern(name: BGMName): void {
        if (this.currentBGM === name) {
            return;
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            Logger.log('[Performance] Attempting to resume AudioContext on playback at:', performance.now().toFixed(2) + 'ms');
            this.audioContext.resume().then(() => {
                Logger.log('[Performance] AudioContext resumed successfully on playback');
            }).catch(e => {
                Logger.log('[Performance] AudioContext resume failed on playback:', e);
            });
        }
        
        try {
            const resourceLoader = ResourceLoader.getInstance();
            const musicConfig = resourceLoader.getMusicPattern('bgm', name);
            
            if (musicConfig) {
                this.stopBGM();
                this.stopPatternPlayback();
                this.currentBGM = name as BGMType;
                
                
                this.playMusicPattern(musicConfig);
            } else {
                Logger.error(`[MusicSystem] No pattern config found for BGM: ${name}`);
            }
        } catch (error) {
            Logger.error(`[MusicSystem] Error loading BGM pattern for ${name}:`, error);
            if (error instanceof Error && error.stack) {
                Logger.error('Stack trace:', error.stack);
            }
        }
    }
    
    playSEFromPattern(name: string): void {
        try {
            const resourceLoader = ResourceLoader.getInstance();
            const seConfig = resourceLoader.getMusicPattern('se', name);
            
            if (seConfig) {
                this.playMusicPattern(seConfig);
            } else {
                this.playSE(name as SEName);
            }
        } catch {
            if (['coin', 'jump', 'damage', 'button', 'powerup', 'gameStart'].includes(name)) {
                this.playSE(name as SEName);
            }
        }
    }
}