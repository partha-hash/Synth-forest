/**
 * redowan's synth forest - Web Audio Synthesis Engine
 * Provides:
 * - 5 Nature Prop Voices (Pine Chimes, Wood Tongue Drums, Marimba Logs, Mineral Stones, Foliage Rustles)
 * - Bioluminescent FM Mushroom Bells
 * - Fix for Pad Voice: Proper ADSR Decay & Dedicated ON/OFF Stop Control
 * - 4/4 Algorithmic Melody Generator mapped to fixed Diatonic Greek Modes
 * - Dynamic Biome-driven DSP effects (Reverb, Delay, Resonance, Cutoff, Drive)
 */

import {
  DEFAULT_SYNTH_SETTINGS,
  FOREST_THEMES,
  ForestThemeKey,
  ModeKey,
  MusicalMode,
  MUSICAL_MODES,
  SynthSettings,
} from '../types/synth';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private settings: SynthSettings = { ...DEFAULT_SYNTH_SETTINGS };

  // Master Audio Nodes
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  public analyser: AnalyserNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;

  // Effects Bus
  private effectsBus: GainNode | null = null;
  private delayNodeL: DelayNode | null = null;
  private delayNodeR: DelayNode | null = null;
  private delayFeedbackGainL: GainNode | null = null;
  private delayFeedbackGainR: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private delayReturnHighpass: BiquadFilterNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbReturnHighpass: BiquadFilterNode | null = null;

  // Continuous Sub-Bass / Drone Pad
  private subBassOsc1: OscillatorNode | null = null;
  private subBassOsc2: OscillatorNode | null = null;
  private subBassFilter: BiquadFilterNode | null = null;
  private subBassGain: GainNode | null = null;
  private padMasterGain: GainNode | null = null;
  private isSubBassRunning: boolean = false;

  // Ambient Wind
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private isWindRunning: boolean = false;

  // 4/4 Melody & Modal Bassline Generator (32 Steps, 2 Measures / 8 Beats)
  private melodyTimerId: number | null = null;
  public currentMelodyStep: number = 0; // 0 to 31
  private melodyPattern: (number | null)[] = []; // 32 steps of mode notes
  private bassPattern: (number | null)[] = [0, null, 4, null]; // Four sustained notes/rests across a 4-bar phrase
  private bassBarIndex: number = 0;

  // Callbacks
  public onNoteTriggered?: (type: string, noteName: string, freq: number) => void;
  public onMelodyStep?: (
    step: number,
    beat: number,
    noteName: string,
    freq: number,
    bassNoteName: string,
    bassFreq: number,
    measure: number
  ) => void;

  constructor() {
    this.generateNew44Pattern();
  }

  public async initAudio(): Promise<boolean> {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return true;
    }

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.buildAudioGraph();
      this.startAmbientWind();
      this.updateSettings(this.settings);
      return true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
      return false;
    }
  }

  public get isInitialized(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  private buildAudioGraph() {
    if (!this.ctx) return;

    // Master Compressor
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(20, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.masterVolume / 100, this.ctx.currentTime);

    // Analyser Node
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;

    // Master Lowpass Filter
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.setValueAtTime(this.settings.filterCutoff, this.ctx.currentTime);
    this.masterFilter.Q.setValueAtTime(this.settings.filterResonance, this.ctx.currentTime);

    this.masterFilter.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Effects Bus
    this.effectsBus = this.ctx.createGain();
    this.effectsBus.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.effectsBus.connect(this.masterFilter);

    // Stereo Ping-Pong Delay
    this.delayNodeL = this.ctx.createDelay(2.0);
    this.delayNodeR = this.ctx.createDelay(2.0);
    this.delayNodeL.delayTime.setValueAtTime(this.settings.delayTime, this.ctx.currentTime);
    this.delayNodeR.delayTime.setValueAtTime(this.settings.delayTime * 1.333, this.ctx.currentTime);

    this.delayFeedbackGainL = this.ctx.createGain();
    this.delayFeedbackGainR = this.ctx.createGain();
    const fb = this.settings.delayFeedback / 100;
    this.delayFeedbackGainL.gain.setValueAtTime(fb, this.ctx.currentTime);
    this.delayFeedbackGainR.gain.setValueAtTime(fb, this.ctx.currentTime);

    const delayFilterL = this.ctx.createBiquadFilter();
    delayFilterL.type = 'lowpass';
    delayFilterL.frequency.setValueAtTime(2600, this.ctx.currentTime);

    const delayFilterR = this.ctx.createBiquadFilter();
    delayFilterR.type = 'lowpass';
    delayFilterR.frequency.setValueAtTime(2600, this.ctx.currentTime);

    this.delayWetGain = this.ctx.createGain();
    this.delayWetGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.effectsBus.connect(this.delayNodeL);
    this.effectsBus.connect(this.delayNodeR);

    this.delayNodeL.connect(delayFilterL);
    delayFilterL.connect(this.delayFeedbackGainL);
    this.delayFeedbackGainL.connect(this.delayNodeR);
    delayFilterL.connect(this.delayWetGain);

    this.delayNodeR.connect(delayFilterR);
    delayFilterR.connect(this.delayFeedbackGainR);
    this.delayFeedbackGainR.connect(this.delayNodeL);
    delayFilterR.connect(this.delayWetGain);

    // Keep the delay spacious without letting low-frequency energy build up.
    this.delayReturnHighpass = this.ctx.createBiquadFilter();
    this.delayReturnHighpass.type = 'highpass';
    this.delayReturnHighpass.frequency.setValueAtTime(170, this.ctx.currentTime);
    this.delayReturnHighpass.Q.setValueAtTime(0.707, this.ctx.currentTime);
    this.delayWetGain.connect(this.delayReturnHighpass);
    this.delayReturnHighpass.connect(this.masterFilter);

    // Algorithmic Reverb
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.generateForestImpulseResponse(2.8, 1.8);

    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.setValueAtTime((this.settings.reverbWet / 100) * 0.55, this.ctx.currentTime);

    this.effectsBus.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);
    // High-pass the reverb return so kick/bass fundamentals stay dry and defined.
    this.reverbReturnHighpass = this.ctx.createBiquadFilter();
    this.reverbReturnHighpass.type = 'highpass';
    this.reverbReturnHighpass.frequency.setValueAtTime(220, this.ctx.currentTime);
    this.reverbReturnHighpass.Q.setValueAtTime(0.707, this.ctx.currentTime);
    this.reverbWetGain.connect(this.reverbReturnHighpass);
    this.reverbReturnHighpass.connect(this.masterFilter);

    // Dedicated Drone/Pad Master Gain Node - strictly 0.0 (silent) when not activated
    this.padMasterGain = this.ctx.createGain();
    this.padMasterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    // Bass/drone is routed directly to the master path: no reverb or delay send.
    this.padMasterGain.connect(this.masterFilter);
  }

  private generateForestImpulseResponse(durationSec: number, decayRate: number): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * decayRate);
      const earlyRefl = i < 4000 ? Math.sin(t * 880) * 0.3 : 0;
      left[i] = (Math.random() * 2 - 1) * env + earlyRefl;
      right[i] = (Math.random() * 2 - 1) * env - earlyRefl;
    }
    return impulse;
  }

  // --- Voice 1: Blissful Celestial Crystal Chime ---
  public triggerChime(freq: number, velocity: number = 1.0) {
    if (!this.ctx || !this.effectsBus) return;
    const now = this.ctx.currentTime;
    const vel = Math.max(0.1, Math.min(1.5, velocity));

    // Pure fundamental + micro-chorus detune + crystalline overtone + starry shimmer
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const osc4 = this.ctx.createOscillator();

    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();
    const gain3 = this.ctx.createGain();
    const gain4 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    // Lush detuned micro-chorus (+4.5 cents for mystical blissful shimmer)
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.0026, now);

    // Crystalline bell harmonic (2.76x)
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 2.76, now);

    // High celestial glass sparkle (4.0x)
    osc4.type = 'sine';
    osc4.frequency.setValueAtTime(freq * 4.0, now);

    // Blissful soft velvet attack (0.012s) and long resonant decay (up to 2.6s)
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.26 * vel, now + 0.012);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.13 * vel, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

    gain3.gain.setValueAtTime(0.001, now);
    gain3.gain.linearRampToValueAtTime(0.08 * vel, now + 0.006);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    gain4.gain.setValueAtTime(0.001, now);
    gain4.gain.linearRampToValueAtTime(0.035 * vel, now + 0.004);
    gain4.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    osc4.connect(gain4);

    gain1.connect(this.effectsBus);
    gain2.connect(this.effectsBus);
    gain3.connect(this.effectsBus);
    gain4.connect(this.effectsBus);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc4.start(now);

    osc1.stop(now + 2.6);
    osc2.stop(now + 2.2);
    osc3.stop(now + 1.6);
    osc4.stop(now + 1.0);
    // Note: Chimes do NOT trigger sub-bass to ensure absolute drone silence when pad is disabled
  }

  // --- Voice: Soft wildlife / pond nature pads (independent of the sustained sub-bass pad) ---
  // Character 0-4 changes the harmonic colour while keeping the sound soft and melodic.
  public triggerNaturePad(freq: number, character: number = 0) {
    if (!this.ctx || !this.effectsBus) return;
    const now = this.ctx.currentTime;
    const safeFreq = Math.max(110, Math.min(1100, freq));
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const oscC = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const amp = this.ctx.createGain();
    const shimmer = this.ctx.createGain();
    const colour = Math.max(0, Math.min(4, Math.floor(character)));
    oscA.type = colour === 4 ? 'sine' : 'triangle';
    oscB.type = 'sine';
    oscC.type = colour === 3 ? 'sine' : 'triangle';
    const ratios = [1.005, 1.25, 1.5, 2.0, 2.01];
    oscA.frequency.setValueAtTime(safeFreq, now);
    oscB.frequency.setValueAtTime(safeFreq * ratios[colour], now);
    oscC.frequency.setValueAtTime(safeFreq * (colour === 3 ? 2.98 : 2.0), now);
    oscB.detune.setValueAtTime(colour === 1 ? -7 : 5, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(colour === 4 ? 1800 : 2600, now);
    filter.Q.setValueAtTime(0.65, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(0.105, now + 0.42);
    amp.gain.setTargetAtTime(0.0001, now + 1.0, 1.35);
    shimmer.gain.setValueAtTime(0.0001, now);
    shimmer.gain.linearRampToValueAtTime(0.035, now + 0.65);
    shimmer.gain.setTargetAtTime(0.0001, now + 1.2, 1.1);
    oscA.connect(filter); oscB.connect(filter); oscC.connect(shimmer);
    filter.connect(amp); amp.connect(this.effectsBus); shimmer.connect(this.effectsBus);
    oscA.start(now); oscB.start(now); oscC.start(now);
    oscA.stop(now + 5.0); oscB.stop(now + 5.0); oscC.stop(now + 4.5);
    oscA.onended = () => { oscA.disconnect(); oscB.disconnect(); oscC.disconnect(); filter.disconnect(); amp.disconnect(); shimmer.disconnect(); };
  }

  // --- Wildlife: soft sustained ambient chord voice ---
  // Kept separate from the continuous sub-bass and existing nature-pad voices.
  public triggerAnimalChord(rootFreq: number, character: number = 0) {
    if (!this.ctx || !this.effectsBus || this.isMuted) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const root = Math.max(110, Math.min(700, Number.isFinite(rootFreq) ? rootFreq : 220));

    // Semitone voicings: maj7, add9, min7, sus/add9, min9,
    // airy maj7, suspended 4/add9, and gentle maj9.
    const voicings: number[][] = [
      [0, 4, 7, 11, 14],
      [0, 4, 7, 14, 16],
      [0, 3, 7, 10, 14],
      [0, 2, 7, 14, 17],
      [0, 3, 7, 10, 14],
      [0, 4, 7, 11, 19],
      [0, 5, 7, 14, 17],
      [0, 4, 7, 11, 14],
    ];
    const index = Math.max(0, Math.min(voicings.length - 1, Math.floor(character)));
    const notes = voicings[index];

    const filter = ctx.createBiquadFilter();
    const master = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(index === 5 ? 2100 : 1550, now);
    filter.Q.setValueAtTime(0.55, now);

    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.052, now + 0.9);
    master.gain.setValueAtTime(0.046, now + 3.8);
    master.gain.setTargetAtTime(0.0001, now + 4.8, 0.55);

    filter.connect(master);
    master.connect(this.effectsBus);

    let ended = 0;
    notes.forEach((semitone, voiceIndex) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      const frequency = root * Math.pow(2, semitone / 12);

      osc.type = voiceIndex === 0 || voiceIndex === 2 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(frequency, now);
      osc.detune.setValueAtTime(voiceIndex % 2 === 0 ? -2.5 : 2.5, now);

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(0.13, now + 0.75 + voiceIndex * 0.035);
      voiceGain.gain.setValueAtTime(0.13, now + 4.5);
      voiceGain.gain.setTargetAtTime(0.0001, now + 4.8, 0.5);

      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.onended = () => {
        osc.disconnect();
        voiceGain.disconnect();
        ended += 1;
        if (ended === notes.length) {
          filter.disconnect();
          master.disconnect();
        }
      };
      osc.start(now);
      osc.stop(now + 6.8);
    });
  }

  // --- Voice 2: Wood Tongue Drum ---
  public triggerWoodDrum(freq: number) {
    if (!this.ctx || !this.effectsBus) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, now);
    filter.Q.setValueAtTime(4.0, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.effectsBus);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.9);
    subOsc.stop(now + 0.9);
  }

  // --- Voice 3: Lithophone Mineral Stone ---
  public triggerStoneChime(freq: number) {
    if (!this.ctx || !this.effectsBus) return;
    const now = this.ctx.currentTime;

    const f0 = this.ctx.createOscillator();
    const ring1 = this.ctx.createOscillator();
    const ring2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    f0.type = 'sine';
    f0.frequency.setValueAtTime(freq, now);

    ring1.type = 'sine';
    ring1.frequency.setValueAtTime(freq * 2.32, now);

    ring2.type = 'sine';
    ring2.frequency.setValueAtTime(freq * 4.18, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    f0.connect(gain);
    ring1.connect(gain);
    ring2.connect(gain);
    gain.connect(this.effectsBus);

    f0.start(now);
    ring1.start(now);
    ring2.start(now);
    f0.stop(now + 1.45);
    ring1.stop(now + 1.45);
    ring2.stop(now + 1.45);
  }

  // --- Voice 4: Foliage Bush Rustle ---
  public triggerBushNoiseImpact(intensity: number = 0.7) {
    if (!this.ctx || !this.effectsBus) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1800, now);
    bandpass.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28 * intensity, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    whiteNoise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.effectsBus);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.4);
  }

  // --- Voice 5: Bioluminescent Mushroom Voices (4 Distinct Sound Varieties) ---
  public triggerMushroomSound(freq: number, subtype: number = 0) {
    if (!this.ctx || !this.effectsBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const mode = ((Math.floor(subtype) % 6) + 6) % 6;
    const safeFreq = Math.max(70, Math.min(2400, freq));
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    const shimmer = ctx.createGain();

    // Six quiet, non-percussive fungal voices designed for an ambient soundscape.
    const wave: OscillatorType[] = ['sine', 'triangle', 'sine', 'sine', 'triangle', 'sine'];
    osc.type = wave[mode];
    osc2.type = mode === 1 || mode === 3 ? 'sine' : 'triangle';
    const ratios = [1.0, 1.5, 0.5, 2.01, 1.25, 2.76];
    osc.frequency.setValueAtTime(safeFreq, now);
    osc2.frequency.setValueAtTime(safeFreq * ratios[mode], now);
    filter.type = mode === 2 ? 'lowpass' : mode === 4 ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(mode === 2 ? 420 : mode === 4 ? safeFreq * 2.8 : 2400, now);
    filter.Q.setValueAtTime(mode === 4 ? 1.8 : 0.7, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(mode === 2 ? 0.12 : 0.085, now + (mode === 5 ? 0.35 : 0.08));
    amp.gain.setTargetAtTime(0.0001, now + (mode === 2 ? 0.7 : 1.1), mode === 5 ? 1.0 : 0.48);
    shimmer.gain.setValueAtTime(0.0001, now);
    shimmer.gain.linearRampToValueAtTime(mode === 3 ? 0.045 : 0.018, now + 0.3);
    shimmer.gain.setTargetAtTime(0.0001, now + 0.9, 0.8);
    osc.connect(filter);
    osc2.connect(shimmer);
    filter.connect(amp);
    amp.connect(this.effectsBus);
    shimmer.connect(this.effectsBus);
    osc.start(now); osc2.start(now);
    osc.stop(now + 4.2); osc2.stop(now + 3.8);
    osc.onended = () => { osc.disconnect(); osc2.disconnect(); filter.disconnect(); amp.disconnect(); shimmer.disconnect(); };
  }

  // Alias for backward compatibility
  public triggerMushroomChime(freq: number) {
    this.triggerMushroomSound(freq, Math.floor(Math.random() * 4));
  }

  // --- Voice 6: Tactile Tree Tapping (Hollow Wood Knock + Crystal Pine Ring) ---
  public triggerTreeTap(freq: number, subtype: number = 0) {
    if (!this.ctx || !this.effectsBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const kind = ((Math.floor(subtype) % 4) + 4) % 4;
    const safeFreq = Math.max(90, Math.min(1200, freq));
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const tail = ctx.createGain();

    // Pine = crystalline pluck; broadleaf = warm wooden mallet;
    // bare branches = airy glass; elder canopy = soft low harmonic bloom.
    osc.type = kind === 1 ? 'triangle' : 'sine';
    overtone.type = kind === 2 ? 'sine' : 'triangle';
    const fundamental = kind === 3 ? safeFreq * 0.5 : safeFreq;
    osc.frequency.setValueAtTime(fundamental, now);
    overtone.frequency.setValueAtTime(fundamental * (kind === 0 ? 2.76 : kind === 1 ? 1.5 : kind === 2 ? 3.01 : 2.0), now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(kind === 2 ? 3600 : kind === 3 ? 950 : 2200, now);
    filter.Q.setValueAtTime(0.65, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(kind === 3 ? 0.075 : 0.14, now + (kind === 3 ? 0.28 : 0.012));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 3 ? 4.8 : kind === 2 ? 2.6 : 1.7));
    tail.gain.setValueAtTime(0.0001, now);
    tail.gain.linearRampToValueAtTime(kind === 2 ? 0.035 : 0.018, now + 0.18);
    tail.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 3 ? 3.6 : 1.8));
    osc.connect(filter); filter.connect(gain); gain.connect(this.effectsBus);
    overtone.connect(tail); tail.connect(this.effectsBus);
    osc.start(now); overtone.start(now);
    const duration = kind === 3 ? 5.0 : kind === 2 ? 2.8 : 1.9;
    osc.stop(now + duration); overtone.stop(now + duration);
    osc.onended = () => { osc.disconnect(); overtone.disconnect(); filter.disconnect(); gain.disconnect(); tail.disconnect(); };
  }

  // --- Ground Splash Impact Audio ---
  public triggerGroundSplash(freq: number) {
    if (!this.ctx || !this.effectsBus) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.min(180, freq * 1.6), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(35, freq * 0.4), now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.effectsBus);
    osc.start(now);
    osc.stop(now + 0.38);
    // Note: No sub-bass saw added here to preserve complete drone silence when pad is disabled
  }

  // --- Voice 6: Reese Sub-Bass & Drone Pad (STRICTLY SILENT WHEN NOT ACTIVATED) ---
  public triggerSubBass(freq: number, isPadVoice = true) {
    if (!this.ctx || !this.padMasterGain) return;

    // Strict requirement: When pad is not activated, it MUST be completely silent
    if (!this.settings.isPadEnabled) {
      this.stopSubBass();
      return;
    }

    const now = this.ctx.currentTime;
    const safeFreq = Math.max(30, Math.min(220, freq));
    // Calculate targeted pad gain combining padVolume and reeseSubDrive
    const targetGain = (this.settings.padVolume / 100) * (this.settings.reeseSubDrive / 100) * 0.35;

    if (!this.isSubBassRunning || !this.subBassOsc1 || !this.subBassOsc2) {
      // Clean up any dangling nodes
      this.stopSubBass();

      this.subBassOsc1 = this.ctx.createOscillator();
      this.subBassOsc2 = this.ctx.createOscillator();
      this.subBassFilter = this.ctx.createBiquadFilter();
      this.subBassGain = this.ctx.createGain();

      this.subBassOsc1.type = 'sawtooth';
      this.subBassOsc2.type = 'sawtooth';

      this.subBassOsc1.frequency.setValueAtTime(safeFreq, now);
      this.subBassOsc2.frequency.setValueAtTime(safeFreq * 1.008, now);

      this.subBassFilter.type = 'lowpass';
      this.subBassFilter.frequency.setValueAtTime(240, now);
      this.subBassFilter.Q.setValueAtTime(4.2, now);

      this.subBassGain.gain.setValueAtTime(1.0, now);

      this.subBassOsc1.connect(this.subBassFilter);
      this.subBassOsc2.connect(this.subBassFilter);
      this.subBassFilter.connect(this.subBassGain);
      this.subBassGain.connect(this.padMasterGain);

      this.padMasterGain.gain.cancelScheduledValues(now);
      this.padMasterGain.gain.setValueAtTime(0.001, now);
      this.padMasterGain.gain.linearRampToValueAtTime(targetGain, now + 0.15);

      this.subBassOsc1.start(now);
      this.subBassOsc2.start(now);
      this.isSubBassRunning = true;
    } else {
      // Smooth frequency glide while drone continues
      const glideDuration = this.settings.subGlide / 1000;
      this.subBassOsc1.frequency.cancelScheduledValues(now);
      this.subBassOsc2.frequency.cancelScheduledValues(now);
      this.subBassOsc1.frequency.exponentialRampToValueAtTime(safeFreq, now + glideDuration);
      this.subBassOsc2.frequency.exponentialRampToValueAtTime(safeFreq * 1.008, now + glideDuration);

      this.padMasterGain.gain.cancelScheduledValues(now);
      this.padMasterGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }
  }

  /**
   * Completely and immediately silences the sustained pad / Reese drone
   */
  public stopSubBass() {
    if (this.padMasterGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.padMasterGain.gain.cancelScheduledValues(now);
        this.padMasterGain.gain.setValueAtTime(0.0, now);
      } catch {}
    }
    if (this.subBassGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.subBassGain.gain.cancelScheduledValues(now);
        this.subBassGain.gain.setValueAtTime(0.0, now);
      } catch {}
    }

    if (this.subBassOsc1) {
      try {
        this.subBassOsc1.stop();
        this.subBassOsc1.disconnect();
      } catch {}
      this.subBassOsc1 = null;
    }
    if (this.subBassOsc2) {
      try {
        this.subBassOsc2.stop();
        this.subBassOsc2.disconnect();
      } catch {}
      this.subBassOsc2 = null;
    }
    if (this.subBassFilter) {
      try {
        this.subBassFilter.disconnect();
      } catch {}
      this.subBassFilter = null;
    }
    this.isSubBassRunning = false;
  }

  public setPadEnabled(enabled: boolean) {
    this.settings.isPadEnabled = enabled;
    if (!enabled) {
      this.stopSubBass();
    } else {
      const mode = MUSICAL_MODES[this.settings.selectedMode] || MUSICAL_MODES.dorian;
      this.triggerSubBass(mode.notes[0], true);
    }
  }

  public setPadVolume(volume: number) {
    this.settings.padVolume = Math.max(0, Math.min(100, volume));
    if (this.padMasterGain && this.ctx) {
      const now = this.ctx.currentTime;
      if (this.settings.isPadEnabled && this.isSubBassRunning) {
        const targetGain = (this.settings.padVolume / 100) * (this.settings.reeseSubDrive / 100) * 0.35;
        this.padMasterGain.gain.cancelScheduledValues(now);
        this.padMasterGain.gain.setTargetAtTime(targetGain, now, 0.03);
      } else {
        this.padMasterGain.gain.cancelScheduledValues(now);
        this.padMasterGain.gain.setValueAtTime(0.0, now);
      }
    }
  }

  // --- Voice 7: Ambient Wind (Strictly 0 Gain When Disabled to Eliminate White Noise Hiss) ---
  public startAmbientWind() {
    if (!this.ctx || this.isWindRunning || !this.effectsBus) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.0;
      }

      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = noiseBuffer;
      this.windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      const windVol = (this.settings.ambientWindVolume / 100) * 0.15;
      this.windGain.gain.setValueAtTime(windVol, this.ctx.currentTime);

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.effectsBus);

      this.windSource.start();
      this.isWindRunning = true;
    } catch (e) {
      console.warn('Could not start ambient wind:', e);
    }
  }

  // --- Atmospheric sustained modal bass voice ---
  // durationSeconds is normally one full bar, so the bass supports the harmony
  // instead of retriggering on every beat.
  public triggerBassVoice(freq: number, durationSeconds: number = 1.8) {
    if (!this.ctx || !this.masterFilter || !Number.isFinite(freq) || freq <= 0) return;
    const now = this.ctx.currentTime;
    const duration = Math.max(0.5, Math.min(8, durationSeconds));

    let bassFreq = freq;
    while (bassFreq > 110) bassFreq *= 0.5;
    while (bassFreq < 38) bassFreq *= 2;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Rounded, warm sub with a quiet upper harmonic for translation on small speakers.
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(bassFreq, now);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(bassFreq * 1.002, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(260, bassFreq * 2.8), now);
    filter.Q.setValueAtTime(0.65, now);

    const peak = 0.19;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.12);
    gain.gain.setValueAtTime(peak * 0.82, now + Math.max(0.14, duration - 0.18));
    gain.gain.linearRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    // Keep the sequenced bass completely dry; ambience is created by the other voices.
    gain.connect(this.masterFilter);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.03);
    osc2.stop(now + duration + 0.03);
    osc1.onended = () => { try { osc1.disconnect(); } catch {} };
    osc2.onended = () => { try { osc2.disconnect(); } catch {} };
    setTimeout(() => { try { filter.disconnect(); gain.disconnect(); } catch {} }, (duration + 0.1) * 1000);
  }

  // --- 16-STEP MELODY & 4-NOTE MODAL BASSLINE GENERATOR ---
  /**
   * Generates a structured 16-step 4/4 melody motif and a 4-note modal bassline.
   * Steps 0, 4, 8, 12 correspond to Beats 1, 2, 3, 4 where the 4 bass notes play.
   */
  public generateNew44Pattern(activeBiome?: ForestThemeKey) {
    const mode = MUSICAL_MODES[this.settings.selectedMode] || MUSICAL_MODES.dorian;
    const maxDegree = Math.min(mode.notes.length - 1, 7);

    // Four-bar atmospheric bass phrase: only 2-3 sustained notes per cycle.
    // Empty bars are intentional rests that leave room for the pads and ambience.
    const colorDegree = Math.random() > 0.5 ? 2 : Math.min(3, maxDegree);
    const fifthDegree = Math.min(4, maxDegree);
    this.bassPattern = [0, Math.random() > 0.55 ? colorDegree : null, fifthDegree, Math.random() > 0.5 ? 1 : null];
    this.bassBarIndex = 0;

    // 2. Generate 16 16th-note melody steps in 4/4 time
    const pattern: (number | null)[] = new Array(16).fill(null);

    // Beat 1 downbeat (step 0): Root or octave
    pattern[0] = Math.random() > 0.3 ? 0 : 7;

    // Beat 2 downbeat (step 4): Mode color note
    pattern[4] = Math.random() > 0.4 ? 2 : 4;

    // Beat 3 downbeat (step 8): Fifth or octave
    pattern[8] = Math.random() > 0.35 ? 4 : 7;

    // Beat 4 downbeat (step 12): Resolution degree
    pattern[12] = Math.random() > 0.4 ? 6 : 1;

    // Syncopated passing steps
    const syncopatedSteps = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
    const fillProb = activeBiome === 'cyberpunk' ? 0.65 : activeBiome === 'glacial' ? 0.32 : 0.45;
    for (const step of syncopatedSteps) {
      if (Math.random() < fillProb) {
        pattern[step] = Math.floor(Math.random() * (maxDegree + 1));
      }
    }

    this.melodyPattern = pattern;
  }

  public getMelodyPattern(): (number | null)[] {
    return [...this.melodyPattern];
  }

  public setMelodyStep(step: number, noteIdx: number | null) {
    if (step >= 0 && step < 16) {
      this.melodyPattern[step] = noteIdx;
    }
  }

  public getBassPattern(): (number | null)[] {
    return [...this.bassPattern];
  }

  public setBassNote(barIdx: number, degree: number | null) {
    if (barIdx >= 0 && barIdx < 4) {
      this.bassPattern[barIdx] = degree === null ? null : Math.max(0, degree);
    }
  }

  public toggle44Melody(enabled?: boolean) {
    const shouldEnable = enabled !== undefined ? enabled : !this.settings.isMelodyPlaying;
    this.settings.isMelodyPlaying = shouldEnable;

    if (shouldEnable) {
      if (this.melodyTimerId) window.clearInterval(this.melodyTimerId);
      // In 4/4 time: 1 beat = (60 / bpm) seconds.
      // 16th note step = (60 / bpm) / 4 * 1000 ms.
      const stepMs = ((60 / this.settings.melodyBpm) / 4) * 1000;
      this.currentMelodyStep = 0;
      this.bassBarIndex = 0;
      this.melodyTimerId = window.setInterval(() => {
        this.step44Melody();
      }, stepMs);
    } else {
      if (this.melodyTimerId) {
        window.clearInterval(this.melodyTimerId);
        this.melodyTimerId = null;
      }
    }
  }

  private step44Melody() {
    if (!this.ctx || !this.settings.isMelodyPlaying) return;
    const mode: MusicalMode = MUSICAL_MODES[this.settings.selectedMode] || MUSICAL_MODES.dorian;
    const step = this.currentMelodyStep;
    const beat = Math.floor(step / 4) + 1; // 1, 2, 3, or 4
    const isDownbeat = step % 4 === 0;
    const beatIndex = Math.floor(step / 4); // 0, 1, 2, 3

    // Bass changes only at the start of each bar and cycles over four bars.
    // Each note sustains for almost the full bar; null entries are deliberate rests.
    let currentBassNoteName = '—';
    let currentBassFreq = 0;
    if (step === 0) {
      const bassDegree = this.bassPattern[this.bassBarIndex];
      if (bassDegree !== null && bassDegree !== undefined) {
        const safeBassIdx = Math.min(mode.notes.length - 1, bassDegree);
        currentBassFreq = mode.notes[safeBassIdx] * 0.5;
        currentBassNoteName = mode.noteNames[safeBassIdx] || 'C2';
        const barDuration = (60 / this.settings.melodyBpm) * 4 * 0.94;
        this.triggerBassVoice(currentBassFreq, barDuration);
      }
      this.bassBarIndex = (this.bassBarIndex + 1) % 4;
    }

    // 2. Play 16-Step Melody Note
    const noteIdx = this.melodyPattern[step];
    if (noteIdx !== null && noteIdx !== undefined) {
      const safeIdx = Math.min(mode.notes.length - 1, noteIdx);
      const freq = mode.notes[safeIdx];
      const noteName = mode.noteNames[safeIdx];

      if (isDownbeat) {
        this.triggerChime(freq);
      } else {
        this.triggerMushroomSound(freq, step % 4);
      }

      this.onMelodyStep?.(step, beat, noteName, freq, currentBassNoteName, currentBassFreq);
      this.onNoteTriggered?.('melody44', noteName, freq);
    } else {
      this.onMelodyStep?.(step, beat, '—', 0, currentBassNoteName, currentBassFreq);
    }

    this.currentMelodyStep = (this.currentMelodyStep + 1) % 16;
  }

  /**
   * Randomizes music melody and 4-note bassline according to the chosen biome
   */
  public randomizeBiomeMelody(themeKey: ForestThemeKey) {
    this.applyBiomeDsp(themeKey);

    let targetMode: ModeKey = 'dorian';
    let targetBpm = 108;

    switch (themeKey) {
      case 'astral':
        targetMode = Math.random() > 0.5 ? 'lydian' : 'pentatonicMinor';
        targetBpm = 94;
        break;
      case 'abyssal':
        targetMode = Math.random() > 0.5 ? 'phrygian' : 'locrian';
        targetBpm = 82;
        break;
      case 'solar':
        targetMode = Math.random() > 0.5 ? 'mixolydian' : 'ionian';
        targetBpm = 112;
        break;
      case 'cyberpunk':
        targetMode = 'dorian';
        targetBpm = 126;
        break;
      case 'glacial':
        targetMode = Math.random() > 0.5 ? 'aeolian' : 'lydian';
        targetBpm = 88;
        break;
      case 'fungal':
        targetMode = Math.random() > 0.5 ? 'akebono' : 'phrygian';
        targetBpm = 102;
        break;
    }

    this.settings.selectedMode = targetMode;
    this.settings.melodyBpm = targetBpm;
    this.generateNew44Pattern(themeKey);

    // Auto-restart sequencer with new tempo and notes
    if (!this.settings.isMelodyPlaying) {
      this.toggle44Melody(true);
    } else {
      this.toggle44Melody(true);
    }
  }

  /**
   * MASTER STOP: When master stop is applied, ALL sound must stop immediately!
   * Stops melody sequencer, kills continuous pad/sub-bass drone, silences wind noise,
   * dampens delay feedback, and flushes reverb wetness so there is zero residual noise or hiss.
   */
  public masterStop() {
    this.toggle44Melody(false);
    this.stopSubBass();
    this.settings.isPadEnabled = false;
    this.settings.isMelodyPlaying = false;

    if (this.ctx) {
      const now = this.ctx.currentTime;
      // Silence ambient wind completely
      if (this.windGain) {
        this.windGain.gain.cancelScheduledValues(now);
        this.windGain.gain.setValueAtTime(0, now);
      }
      // Instantly kill delay feedback to flush echoes
      if (this.delayFeedbackGainL && this.delayFeedbackGainR) {
        this.delayFeedbackGainL.gain.cancelScheduledValues(now);
        this.delayFeedbackGainR.gain.cancelScheduledValues(now);
        this.delayFeedbackGainL.gain.setValueAtTime(0, now);
        this.delayFeedbackGainR.gain.setValueAtTime(0, now);

        setTimeout(() => {
          if (this.delayFeedbackGainL && this.delayFeedbackGainR && this.ctx) {
            const fb = this.settings.delayFeedback / 100;
            this.delayFeedbackGainL.gain.setValueAtTime(fb, this.ctx.currentTime);
            this.delayFeedbackGainR.gain.setValueAtTime(fb, this.ctx.currentTime);
          }
        }, 150);
      }
      // Momentarily flush effects bus to kill reverb ring
      if (this.effectsBus) {
        this.effectsBus.gain.cancelScheduledValues(now);
        this.effectsBus.gain.setValueAtTime(0, now);
        this.effectsBus.gain.setValueAtTime(1.0, now + 0.06);
      }
    }
  }

  // --- Real-time Visualizer Data Helpers ---
  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array as unknown as Uint8Array<ArrayBuffer>);
    }
  }

  public getAverageEnergy(): number {
    if (!this.analyser) return 0;
    const buffer = new Uint8Array(64);
    this.analyser.getByteFrequencyData(buffer as unknown as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return sum / (buffer.length * 255);
  }

  // --- Settings Controller ---
  public updateSettings(newSettings: Partial<SynthSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.masterGain) {
      const vol = this.isMuted ? 0 : this.settings.masterVolume / 100;
      this.masterGain.gain.setValueAtTime(vol, now);
    }

    if (this.masterFilter) {
      this.masterFilter.frequency.setTargetAtTime(this.settings.filterCutoff, now, 0.05);
      this.masterFilter.Q.setTargetAtTime(this.settings.filterResonance, now, 0.05);
    }

    if (this.delayNodeL && this.delayNodeR) {
      this.delayNodeL.delayTime.setTargetAtTime(this.settings.delayTime, now, 0.05);
      this.delayNodeR.delayTime.setTargetAtTime(this.settings.delayTime * 1.333, now, 0.05);
    }

    if (this.delayFeedbackGainL && this.delayFeedbackGainR) {
      const fb = this.settings.delayFeedback / 100;
      this.delayFeedbackGainL.gain.setTargetAtTime(fb, now, 0.05);
      this.delayFeedbackGainR.gain.setTargetAtTime(fb, now, 0.05);
    }

    if (this.reverbWetGain) {
      this.reverbWetGain.gain.setTargetAtTime((this.settings.reverbWet / 100) * 0.55, now, 0.05);
    }

    if (this.windGain) {
      const windVol = (this.settings.ambientWindVolume / 100) * 0.15;
      this.windGain.gain.cancelScheduledValues(now);
      this.windGain.gain.setValueAtTime(windVol, now);
    }

    if (newSettings.padVolume !== undefined) {
      this.setPadVolume(newSettings.padVolume);
    } else if (newSettings.reeseSubDrive !== undefined && this.settings.isPadEnabled && this.isSubBassRunning) {
      this.setPadVolume(this.settings.padVolume);
    }

    if (newSettings.melodyBpm && this.settings.isMelodyPlaying) {
      this.toggle44Melody(true);
    }

    if (newSettings.isPadEnabled !== undefined) {
      this.setPadEnabled(newSettings.isPadEnabled);
    }
  }

  /**
   * Smoothly transitions the DSP audio nodes to the biome's specific acoustic sonic signature
   */
  public applyBiomeDsp(themeKey: ForestThemeKey) {
    const theme = FOREST_THEMES[themeKey];
    if (theme && theme.dsp) {
      this.updateSettings({
        filterCutoff: theme.dsp.filterCutoff,
        filterResonance: theme.dsp.filterResonance,
        delayTime: theme.dsp.delayTime,
        delayFeedback: theme.dsp.delayFeedback,
        reverbWet: theme.dsp.reverbWet,
        reeseSubDrive: theme.dsp.reeseSubDrive,
        subGlide: theme.dsp.subGlide,
        ambientWindVolume: theme.dsp.ambientWindVolume,
      });
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const vol = muted ? 0 : this.settings.masterVolume / 100;
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
    if (muted && this.windGain && this.ctx) {
      this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else if (!muted && this.windGain && this.ctx) {
      const windVol = (this.settings.ambientWindVolume / 100) * 0.15;
      this.windGain.gain.setValueAtTime(windVol, this.ctx.currentTime);
    }
  }

  public getSettings(): SynthSettings {
    return { ...this.settings };
  }
}

export const audioEngine = new AudioEngine();
