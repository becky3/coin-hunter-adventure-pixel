export interface EnvelopeConfig {
    attack: number;
    decayTime: number;
    decay: number;
    sustain: number;
    release: number;
}

export interface InstrumentConfig {
    type: string;
    volume: number;
    envelope?: EnvelopeConfig;
}

export interface FrequencyRamp {
    start: number;
    end: number;
}

export interface DrumBeat {
    type: 'kick' | 'snare' | 'hihat';
    time: number;
}

export interface PatternConfig {
    notes?: string[];
    chords?: string[][];
    frequencies?: FrequencyRamp[];
    beats?: DrumBeat[];
    durations?: number[];
    times?: number[];
    loop?: boolean;
    duration?: number;
}

export interface TrackConfig {
    name: string;
    instrument: InstrumentConfig;
    pattern: PatternConfig;
}

export interface MusicConfig {
    name: string;
    tempo?: number;
    loop?: boolean;
    tracks: TrackConfig[];
}

export interface MusicPatternConfig {
    bgm: { [key: string]: MusicConfig };
    se: { [key: string]: MusicConfig };
}