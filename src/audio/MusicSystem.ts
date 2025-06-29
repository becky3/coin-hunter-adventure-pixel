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
    time: number;
    duration: number;
}

type BGMType = 'title' | 'game' | null;
type DrumType = 'kick' | 'snare' | 'hihat';
type OscillatorType = OscillatorNode['type'];

export class MusicSystem {
    private audioContext: AudioContext | null;
    private masterGain: GainNode | null;
    public isInitialized: boolean;
    
    // 現在再生中のBGM
    private currentBGM: BGMType;
    private bgmLoopInterval: NodeJS.Timeout | null;
    
    // 一時停止状態
    private isPaused: boolean;
    private pausedBGM: BGMType;
    
    // アクティブなオーディオノードを追跡
    private activeNodes: ActiveNode[];
    
    // 音量設定
    private bgmVolume: number;
    private sfxVolume: number;
    private isMuted: boolean;
    
    constructor() {
        // AudioContextの初期化
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        
        // 現在再生中のBGM
        this.currentBGM = null;
        this.bgmLoopInterval = null;
        
        // 一時停止状態
        this.isPaused = false;
        this.pausedBGM = null;
        
        // アクティブなオーディオノードを追跡
        this.activeNodes = [];
        
        // 音量設定
        this.bgmVolume = 0.3;
        this.sfxVolume = 0.5;
        this.isMuted = false;
    }
    
    /**
     * オーディオコンテキストの初期化（ユーザー操作後に呼ぶ必要がある）
     * @returns 初期化成功の可否
     */
    async init(): Promise<boolean> {
        if (this.isInitialized) return true;
        
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('Web Audio API is not supported in this browser');
                return false;
            }
            
            // AudioContextの作成時にエラーが発生する可能性があるので、try-catchで囲む
            try {
                this.audioContext = new AudioContextClass() as AudioContext;
            } catch {
                console.info('AudioContext creation deferred - will retry on user interaction');
                return false;
            }
            
            // suspended状態の場合はresume
            if (this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                } catch {
                    console.info('AudioContext resume deferred - will retry on user interaction');
                    return false;
                }
            }
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.bgmVolume;
            
            this.isInitialized = true;
            console.log('Music system initialized successfully');
            return true;
        } catch (error: any) {
            // 自動再生ポリシーによるエラーは警告レベルに留める
            if (error.name === 'NotAllowedError') {
                console.info('音楽システムはユーザー操作後に開始されます');
            } else {
                console.warn('音楽システムの初期化エラー:', error);
            }
            this.isInitialized = false;
            return false;
        }
    }
    
    /**
     * ノートの周波数を取得
     * @param note - ノート名（例: 'C4'）
     * @returns 周波数
     */
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
    
    /**
     * 単音を再生
     * @param frequency - 周波数
     * @param duration - 持続時間（秒）
     * @param startTime - 開始時刻
     * @param type - 波形タイプ
     * @param volume - 音量
     */
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
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // アタック
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, now + duration * 0.1); // ディケイ
        gainNode.gain.setValueAtTime(volume * 0.7, now + duration * 0.9); // サステイン
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // リリース
        
        oscillator.start(now);
        oscillator.stop(now + duration);
        
        oscillator.addEventListener('ended', () => {
            const index = this.activeNodes.findIndex(node => node.oscillator === oscillator);
            if (index !== -1) {
                this.activeNodes.splice(index, 1);
            }
        });
    }
    
    /**
     * コードを再生
     * @param notes - ノートの配列
     * @param duration - 持続時間
     * @param startTime - 開始時刻
     * @param type - 波形タイプ
     * @param volume - 音量
     */
    private playChord(notes: string[], duration: number, startTime: number, type: OscillatorType = 'sine', volume: number = 0.2): void {
        notes.forEach(note => {
            const freq = this.getNoteFrequency(note);
            this.playNote(freq, duration, startTime, type, volume);
        });
    }
    
    /**
     * ドラムサウンドを再生
     * @param type - ドラムタイプ
     * @param startTime - 開始時刻
     */
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
            // ノイズソースもアクティブノードリストに追加
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
    
    /**
     * タイトル画面のBGM
     */
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
            
            // ベースライン（8ビート）
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
            
            // コード進行（4拍子）
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
            
            // メロディー
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
    
    /**
     * ゲームプレイ中のBGM
     */
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
            
            // ドラムパターン
            for (let i = 0; i < 4; i++) {
                // キック
                this.playDrum('kick', now + i * beatLength);
                // スネア
                if (i === 1 || i === 3) {
                    this.playDrum('snare', now + i * beatLength);
                }
                // ハイハット
                for (let j = 0; j < 2; j++) {
                    this.playDrum('hihat', now + i * beatLength + j * beatLength * 0.5);
                }
            }
            
            // ベースライン（アルペジオパターン）
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
            
            // リードメロディー（2小節目から）
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
    
    /**
     * ゲームクリアのジングル
     */
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
        
        // 和音
        this.playChord(['C4', 'E4', 'G4', 'C5'], 1.2, now, 'triangle', 0.3);
    }
    
    /**
     * ゲームオーバーのジングル
     */
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
    
    /**
     * 効果音を再生する基本メソッド
     * @param frequency - 周波数
     * @param duration - 持続時間
     * @param type - 波形タイプ
     * @param volume - 音量
     * @param envelope - エンベロープ設定
     */
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
        
        // エンベロープの設定
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
    
    /**
     * ジャンプ効果音
     */
    playJumpSound(): void {
        if (!this.isInitialized || this.isMuted) return;
        
        this.playSoundEffect(
            440, // A4
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
    
    /**
     * コイン収集効果音
     */
    playCoinSound(): void {
        if (!this.isInitialized || this.isMuted) return;
        
        // 高音のキラキラ音
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
    
    /**
     * ダメージ効果音
     */
    playDamageSound(): void {
        if (!this.isInitialized || this.isMuted || !this.audioContext || !this.masterGain) return;
        
        const now = this.audioContext.currentTime;
        
        // 下降音階 + ノイズ
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }
    
    /**
     * ボタンクリック効果音
     */
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
    
    /**
     * ゲーム開始効果音
     */
    playGameStartSound(): void {
        if (!this.isInitialized || this.isMuted) return;
        
        // 上昇音階
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
    
    /**
     * ゴール到達効果音
     */
    playGoalSound(): void {
        if (!this.isInitialized || this.isMuted) return;
        
        // 勝利のファンファーレ
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
    
    /**
     * 全てのアクティブノードを強制停止
     */
    private stopAllActiveNodes(): void {
        if (!this.audioContext) return;
        
        this.activeNodes.forEach(({ oscillator, gainNode }) => {
            try {
                // ゲインを即座に0に設定
                if (gainNode && gainNode.gain) {
                    gainNode.gain.cancelScheduledValues(this.audioContext!.currentTime);
                    gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
                }
                // オシレーターを即座に停止
                if (oscillator && oscillator.stop) {
                    oscillator.stop(this.audioContext!.currentTime);
                }
            } catch {
                // 既に停止済みの場合は無視
            }
        });
        
        // アクティブノードリストをクリア
        this.activeNodes = [];
    }
    
    /**
     * BGMを一時停止
     */
    pauseBGM(): void {
        // 一時停止中の場合はスキップ
        if (this.isPaused) {
            return;
        }
        
        // 現在のBGMタイプを保存
        this.pausedBGM = this.currentBGM;
        
        if (this.bgmLoopInterval) {
            clearInterval(this.bgmLoopInterval);
            this.bgmLoopInterval = null;
        }
        
        this.stopAllActiveNodes();
        
        this.isPaused = true;
    }
    
    /**
     * BGMを再開
     */
    resumeBGM(): void {
        // 一時停止中でない場合はスキップ
        if (!this.isPaused) {
            return;
        }
        
        this.isPaused = false;
        
        // 保存されたBGMタイプを復元
        const bgmToResume = this.pausedBGM;
        this.currentBGM = null; // 再生メソッドが正しく動作するように一旦null
        
        // BGMを再開
        if (bgmToResume === 'title') {
            this.playTitleBGM();
        } else if (bgmToResume === 'game') {
            this.playGameBGM();
        }
        
        this.pausedBGM = null;
    }
    
    /**
     * BGMを停止
     */
    stopBGM(): void {
        // 既に停止済みの場合はスキップ
        if (!this.currentBGM && !this.bgmLoopInterval) {
            return;
        }
        
        if (this.bgmLoopInterval) {
            clearInterval(this.bgmLoopInterval);
            this.bgmLoopInterval = null;
        }
        
        this.stopAllActiveNodes();
        
        // 現在のBGMを無効化
        this.currentBGM = null;
        this.isPaused = false;
        this.pausedBGM = null;
    }
    
    /**
     * 音量を設定
     * @param volume - 音量（0.0 - 1.0）
     */
    setVolume(volume: number): void {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain && !this.isMuted) {
            this.masterGain.gain.value = this.bgmVolume;
        }
    }
    
    /**
     * ミュート切り替え
     * @returns ミュート状態
     */
    toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.bgmVolume;
        }
        return this.isMuted;
    }
    
    /**
     * ミュート状態を取得
     * @returns ミュート状態
     */
    getMuteState(): boolean {
        return this.isMuted;
    }
    
    /**
     * 効果音の音量を設定
     * @param volume - 音量（0.0 - 1.0）
     */
    setSfxVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * 効果音の音量を取得
     * @returns 音量
     */
    getSfxVolume(): number {
        return this.sfxVolume;
    }
    
    /**
     * クリーンアップ
     */
    destroy(): void {
        try {
            this.stopAllActiveNodes();
            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.close().catch(error => {
                    console.error('AudioContext closing error:', error);
                });
            }
            this.isInitialized = false;
        } catch (error) {
            console.error('音楽システムのクリーンアップエラー:', error);
        }
    }
}