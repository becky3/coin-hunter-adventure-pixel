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
    // For melodic patterns
    notes?: string[];
    // For chord patterns
    chords?: string[][];
    // For frequency-based patterns
    frequencies?: FrequencyRamp[];
    // For drum patterns
    beats?: DrumBeat[];
    // Durations for each note/chord/frequency
    durations?: number[];
    // Specific times for each event (overrides durations)
    times?: number[];
    // Loop the pattern
    loop?: boolean;
    // Pattern duration (for drums)
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