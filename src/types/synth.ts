export type ForestThemeKey =
  | 'astral'
  | 'abyssal'
  | 'solar'
  | 'cyberpunk'
  | 'glacial'
  | 'fungal';

export interface BiomeDspPreset {
  filterCutoff: number; // Hz
  filterResonance: number; // Q
  delayTime: number; // s
  delayFeedback: number; // %
  reverbWet: number; // %
  reeseSubDrive: number; // %
  subGlide: number; // ms
  ambientWindVolume: number; // %
  dspLabel: string;
}

export interface ForestTheme {
  id: ForestThemeKey;
  name: string;
  tagline: string;
  fogColor: number;
  ambientLightColor: number;
  keyLightColor: number;
  groundSolidColor: number;
  groundWireColor: number;
  foliageHue: number; // 0 to 1
  foliageLightness: number; // 0 to 1
  fireflyColor: number;
  sporeColor: number;
  accentColor: string;
  badgeBg: string;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  dsp: BiomeDspPreset;
}

export const FOREST_THEMES: Record<ForestThemeKey, ForestTheme> = {
  astral: {
    id: 'astral',
    name: 'Astral Dreamwood',
    tagline: 'Lucid ethereal twilight bathed in soft lavender & shimmering celestial mist',
    fogColor: 0x160d26,
    ambientLightColor: 0x3b1d54,
    keyLightColor: 0xc084fc,
    groundSolidColor: 0x1e1035,
    groundWireColor: 0xa855f7,
    foliageHue: 0.78,
    foliageLightness: 0.58,
    fireflyColor: 0xe879f9,
    sporeColor: 0xc084fc,
    accentColor: '#c084fc',
    badgeBg: 'rgba(192, 132, 252, 0.18)',
    bloomStrength: 1.45,
    bloomRadius: 0.65,
    bloomThreshold: 0.32,
    dsp: {
      filterCutoff: 5200,
      filterResonance: 3.2,
      delayTime: 0.44,
      delayFeedback: 55,
      reverbWet: 75,
      reeseSubDrive: 35,
      subGlide: 650,
      ambientWindVolume: 0,
      dspLabel: 'Lush Cathedral Reverb • 440ms Shimmer Delay • Lucid Open Air',
    },
  },
  abyssal: {
    id: 'abyssal',
    name: 'Abyssal Bio-Trench',
    tagline: 'Deep oceanic subterranean forest with glowing cyan corals & deep subs',
    fogColor: 0x02111c,
    ambientLightColor: 0x06283d,
    keyLightColor: 0x38bdf8,
    groundSolidColor: 0x031826,
    groundWireColor: 0x06b6d4,
    foliageHue: 0.52,
    foliageLightness: 0.42,
    fireflyColor: 0x22d3ee,
    sporeColor: 0x67e8f9,
    accentColor: '#06b6d4',
    badgeBg: 'rgba(6, 182, 212, 0.18)',
    bloomStrength: 1.6,
    bloomRadius: 0.75,
    bloomThreshold: 0.28,
    dsp: {
      filterCutoff: 1450,
      filterResonance: 6.8,
      delayTime: 0.32,
      delayFeedback: 68,
      reverbWet: 60,
      reeseSubDrive: 72,
      subGlide: 480,
      ambientWindVolume: 0,
      dspLabel: 'Deep Underwater Resonance • 68% Dub Delay • Heavy Sub Wobble',
    },
  },
  solar: {
    id: 'solar',
    name: 'Solar Amber Grove',
    tagline: 'Warm golden-hour autumn glade with acoustic marimba tones and tape saturation',
    fogColor: 0x281203,
    ambientLightColor: 0x542605,
    keyLightColor: 0xfbbf24,
    groundSolidColor: 0x331704,
    groundWireColor: 0xf59e0b,
    foliageHue: 0.09,
    foliageLightness: 0.52,
    fireflyColor: 0xfef08a,
    sporeColor: 0xfde047,
    accentColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.18)',
    bloomStrength: 1.25,
    bloomRadius: 0.55,
    bloomThreshold: 0.4,
    dsp: {
      filterCutoff: 3400,
      filterResonance: 2.2,
      delayTime: 0.22,
      delayFeedback: 32,
      reverbWet: 38,
      reeseSubDrive: 28,
      subGlide: 320,
      ambientWindVolume: 0,
      dspLabel: 'Warm Tape Saturation • 220ms Triplet Slap • Acoustic Wood Resonance',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyber Neon Matrix',
    tagline: 'High-energy electric synthwave grid with magenta laser peaks and tight punch',
    fogColor: 0x12031a,
    ambientLightColor: 0x360945,
    keyLightColor: 0xf43f5e,
    groundSolidColor: 0x1d0529,
    groundWireColor: 0xec4899,
    foliageHue: 0.9,
    foliageLightness: 0.55,
    fireflyColor: 0x38bdf8,
    sporeColor: 0xf43f5e,
    accentColor: '#f43f5e',
    badgeBg: 'rgba(244, 63, 94, 0.18)',
    bloomStrength: 1.8,
    bloomRadius: 0.8,
    bloomThreshold: 0.24,
    dsp: {
      filterCutoff: 6400,
      filterResonance: 7.5,
      delayTime: 0.16,
      delayFeedback: 52,
      reverbWet: 45,
      reeseSubDrive: 50,
      subGlide: 140,
      ambientWindVolume: 0,
      dspLabel: 'Biting Resonant Low-Pass • Fast Ping-Pong Delay • Punchy Reese Sub',
    },
  },
  glacial: {
    id: 'glacial',
    name: 'Glacial Aurora Cavern',
    tagline: 'Pristine frozen ice crystal sanctuary with endless shimmering cavern trails',
    fogColor: 0x061421,
    ambientLightColor: 0x0e304f,
    keyLightColor: 0xa5f3fc,
    groundSolidColor: 0x0b243b,
    groundWireColor: 0x67e8f9,
    foliageHue: 0.55,
    foliageLightness: 0.65,
    fireflyColor: 0xe0f2fe,
    sporeColor: 0xbae6fd,
    accentColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.18)',
    bloomStrength: 1.7,
    bloomRadius: 0.7,
    bloomThreshold: 0.3,
    dsp: {
      filterCutoff: 8800,
      filterResonance: 4.5,
      delayTime: 0.56,
      delayFeedback: 65,
      reverbWet: 85,
      reeseSubDrive: 25,
      subGlide: 700,
      ambientWindVolume: 0,
      dspLabel: 'Endless Cavern Reverb (85%) • 560ms Crystal Echo • High Harmonic Shimmer',
    },
  },
  fungal: {
    id: 'fungal',
    name: 'Fungal Spore Sanctuary',
    tagline: 'Psychedelic lucid grove of glowing giant mushrooms, tape flutter and deep wobble',
    fogColor: 0x061c0d,
    ambientLightColor: 0x0c401e,
    keyLightColor: 0x4ade80,
    groundSolidColor: 0x0a2b15,
    groundWireColor: 0x22c55e,
    foliageHue: 0.34,
    foliageLightness: 0.48,
    fireflyColor: 0xfacc15,
    sporeColor: 0x86efac,
    accentColor: '#22c55e',
    badgeBg: 'rgba(34, 197, 94, 0.18)',
    bloomStrength: 1.55,
    bloomRadius: 0.68,
    bloomThreshold: 0.3,
    dsp: {
      filterCutoff: 2800,
      filterResonance: 5.0,
      delayTime: 0.38,
      delayFeedback: 62,
      reverbWet: 62,
      reeseSubDrive: 60,
      subGlide: 750,
      ambientWindVolume: 0,
      dspLabel: 'Analog Tape Flutter • 62% Hallucinatory Wet • Deep 750ms Sub Glide',
    },
  },
};

export const THEME_KEYS_ORDER: ForestThemeKey[] = [
  'astral',
  'abyssal',
  'solar',
  'cyberpunk',
  'glacial',
  'fungal',
];

// Fixed selectable musical modes (Diatonic Greek Modes + Pentatonic + Japanese Akebono)
export type ModeKey =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'akebono'
  | 'pentatonicMinor';

export interface MusicalMode {
  id: ModeKey;
  name: string;
  greekName: string;
  mood: string;
  formula: string; // intervals
  notes: number[];
  noteNames: string[];
}

export const MUSICAL_MODES: Record<ModeKey, MusicalMode> = {
  ionian: {
    id: 'ionian',
    name: 'Ionian (Major)',
    greekName: 'Mode I - Ionian',
    mood: 'Triumphant, uplifting & joyful',
    formula: '1 - 2 - 3 - 4 - 5 - 6 - 7',
    notes: [130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0],
    noteNames: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
  },
  dorian: {
    id: 'dorian',
    name: 'Dorian',
    greekName: 'Mode II - Dorian',
    mood: 'Soulful, synthwave & melancholic optimism',
    formula: '1 - 2 - b3 - 4 - 5 - 6 - b7',
    notes: [146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0],
    noteNames: ['D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'],
  },
  phrygian: {
    id: 'phrygian',
    name: 'Phrygian',
    greekName: 'Mode III - Phrygian',
    mood: 'Dark, tense, mysterious Spanish tension',
    formula: '1 - b2 - b3 - 4 - 5 - b6 - b7',
    notes: [164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88],
    noteNames: ['E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'],
  },
  lydian: {
    id: 'lydian',
    name: 'Lydian',
    greekName: 'Mode IV - Lydian',
    mood: 'Ethereal, bright, dreamy celestial #4',
    formula: '1 - 2 - 3 - #4 - 5 - 6 - 7',
    notes: [174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25],
    noteNames: ['F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
  },
  mixolydian: {
    id: 'mixolydian',
    name: 'Mixolydian',
    greekName: 'Mode V - Mixolydian',
    mood: 'Bluesy, hypnotic, psychedelic groove b7',
    formula: '1 - 2 - 3 - 4 - 5 - 6 - b7',
    notes: [196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33],
    noteNames: ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'],
  },
  aeolian: {
    id: 'aeolian',
    name: 'Aeolian (Natural Minor)',
    greekName: 'Mode VI - Aeolian',
    mood: 'Emotional, sombre, reflective sorrow',
    formula: '1 - 2 - b3 - 4 - 5 - b6 - b7',
    notes: [110.0, 123.47, 130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63],
    noteNames: ['A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'],
  },
  locrian: {
    id: 'locrian',
    name: 'Locrian',
    greekName: 'Mode VII - Locrian',
    mood: 'Diminished, surreal, alien unstable b5',
    formula: '1 - b2 - b3 - 4 - b5 - b6 - b7',
    notes: [123.47, 130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23],
    noteNames: ['B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4'],
  },
  akebono: {
    id: 'akebono',
    name: 'Akebono',
    greekName: 'Japanese Traditional',
    mood: 'Meditative zen garden & bamboo wind',
    formula: '1 - 2 - b3 - 5 - b6',
    notes: [130.81, 146.83, 155.56, 196.0, 207.65, 261.63, 293.66, 311.13, 392.0, 415.3, 523.25],
    noteNames: ['C3', 'D3', 'Eb3', 'G3', 'Ab3', 'C4', 'D4', 'Eb4', 'G4', 'Ab4', 'C5'],
  },
  pentatonicMinor: {
    id: 'pentatonicMinor',
    name: 'Pentatonic Minor',
    greekName: 'Ancient Blues Pentatonic',
    mood: 'Universal, soulful, deeply resonant',
    formula: '1 - b3 - 4 - 5 - b7',
    notes: [110, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0],
    noteNames: ['A2', 'C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4'],
  },
};

// Aliased ScaleKey for backwards compatibility
export type ScaleKey = ModeKey;
export const MUSICAL_SCALES = MUSICAL_MODES;

export interface SynthSettings {
  masterVolume: number; // 0 to 100
  padVolume: number; // 0 to 100% volume for sustained drone/pad
  filterCutoff: number; // 100 to 12000 Hz
  filterResonance: number; // 0.1 to 15
  delayTime: number; // 0.05 to 1.2s
  delayFeedback: number; // 0 to 85%
  reverbWet: number; // 0 to 100%
  reeseSubDrive: number; // 0 to 100%
  subGlide: number; // 20 to 1200ms
  ambientWindVolume: number; // 0 to 100%
  isPadEnabled: boolean; // Continuous drone pad ON/OFF control
  // 4/4 Melody Generator
  isMelodyPlaying: boolean;
  melodyBpm: number; // 60 to 180 (4/4 time signature)
  selectedMode: ModeKey;
  bloomEnabled: boolean;
  isAutoExploring: boolean; // Autonomous camera roaming across forest planet
}

export const DEFAULT_SYNTH_SETTINGS: SynthSettings = {
  masterVolume: 80,
  padVolume: 60, // Dedicated Drone/Pad volume
  filterCutoff: 5200,
  filterResonance: 3.2,
  delayTime: 0.44,
  delayFeedback: 55,
  reverbWet: 75,
  reeseSubDrive: 35,
  subGlide: 650,
  ambientWindVolume: 0, // Strict zero hiss by default
  isPadEnabled: false, // Default pad to false - completely silent until activated!
  isMelodyPlaying: false,
  melodyBpm: 108,
  selectedMode: 'dorian',
  bloomEnabled: true,
  isAutoExploring: false,
};

export interface ObjectPlayedEvent {
  type: 'tree' | 'stump' | 'log' | 'stone' | 'bush' | 'mushroom' | 'sapling' | 'mossStick' | 'flower' | 'ground';
  label: string;
  noteName: string;
  frequency: number;
  freq: number;
  timestamp: number;
}
