import {
  DEFAULT_SYNTH_SETTINGS,
  FOREST_THEMES,
  ForestThemeKey,
  MUSICAL_MODES,
  SynthSettings,
} from '../types/synth';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private settings: SynthSettings = { ...DEFAULT_SYNTH_SETTINGS };

  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;

  private isMuted: boolean = false;
  private dataArray: Uint8Array = new Uint8Array(0);

  public async initAudio(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume / 100, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(this.settings.filterCutoff, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(this.settings.filterResonance, this.ctx.currentTime);

      this.delayNode = this.ctx.createDelay(2.0);
      this.delayNode.delayTime.setValueAtTime(this.settings.delayTime, this.ctx.currentTime);
      this.delayFeedbackGain = this.ctx.createGain();
      this.delayFeedbackGain.gain.setValueAtTime(this.settings.delayFeedback / 100, this.ctx.currentTime);

      this.delayNode.connect(this.delayFeedbackGain);
      this.delayFeedbackGain.connect(this.delayNode);

      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createImpulseResponse(2.4, 2.0);
      this.reverbWetGain = this.ctx.createGain();
      this.reverbWetGain.gain.setValueAtTime(this.settings.reverbWet / 100, this.ctx.currentTime);

      this.filterNode.connect(this.delayNode);
      this.delayNode.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbWetGain);

      this.filterNode.connect(this.masterCompressor);
      this.delayFeedbackGain.connect(this.masterCompressor);
      this.reverbWetGain.connect(this.masterCompressor);

      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      return true;
    } catch (e) {
      console.error('AudioEngine failed to initialize:', e);
      return false;
    }
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    const length = sampleRate * duration;
    const impulse = this.ctx ? this.ctx.createBuffer(2, length, sampleRate) : new AudioBuffer({ length: 1, sampleRate });
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }
    return impulse;
  }

  public triggerAnimalChord(baseFreq: number, kind: string): void {
    if (!this.ctx || !this.filterNode || this.isMuted) return;

    const mode = MUSICAL_MODES[this.settings.selectedMode] || MUSICAL_MODES.dorian;
    const modeNotes = mode.notes;

    let closestIdx = 0;
    let minDiff = Infinity;
    modeNotes.forEach((n, idx) => {
      const diff = Math.abs(n - baseFreq);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    const chordIndices = [
      closestIdx,
      (closestIdx + 2) % modeNotes.length,
      (closestIdx + 4) % modeNotes.length,
    ];

    const now = this.ctx.currentTime;
    const chordGain = this.ctx.createGain();

    const isBird = kind === 'owl' || kind === 'nightAngel' || kind === 'asianCuckoo';
    const isSmall = kind === 'cricket' || kind === 'frog' || kind === 'bunny';
    const attack = isBird ? 0.08 : isSmall ? 0.04 : 0.22;
    const release = isBird ? 0.65 : isSmall ? 0.45 : 1.35;

    chordGain.gain.setValueAtTime(0.0001, now);
    chordGain.gain.exponentialRampToValueAtTime(0.18, now + attack);
    chordGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);

    chordIndices.forEach((idx, noteOffset) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const noteFreq = modeNotes[idx];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, now);

      if (isBird) {
        osc.frequency.exponentialRampToValueAtTime(noteFreq * 1.04, now + attack);
        osc.frequency.exponentialRampToValueAtTime(noteFreq, now + attack + release);
      }

      const noteGain = this.ctx.createGain();
      const gainVal = noteOffset === 0 ? 0.5 : noteOffset === 1 ? 0.35 : 0.25;
      noteGain.gain.setValueAtTime(gainVal, now);

      osc.connect(noteGain);
      noteGain.connect(chordGain);

      osc.start(now);
      osc.stop(now + attack + release + 0.05);
    });

    chordGain.connect(this.filterNode);
  }

  public triggerTreeTap(freq: number): void {
    if (!this.ctx || !this.filterNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.35);

    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(g);
    g.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public triggerMushroomSound(freq: number, subtype: number): void {
    if (!this.ctx || !this.filterNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = subtype === 0 ? 'sine' : subtype === 1 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(g);
    g.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public triggerWoodDrum(freq: number): void {
    if (!this.ctx || !this.filterNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.2, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.18);

    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(g);
    g.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public triggerStoneChime(freq: number): void {
    if (!this.ctx || !this.filterNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(g);
    g.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.82);
  }

  public triggerChime(freq: number, duration = 0.6): void {
    if (!this.ctx || !this.filterNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(g);
    g.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  public triggerBushNoiseImpact(intensity = 0.85): void {
    if (!this.ctx || !this.filterNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.5, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25 * intensity, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    whiteNoise.connect(filter);
    filter.connect(g);
    g.connect(this.filterNode);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.16);
  }

  public triggerGroundSplash(freq = 55): void {
    this.triggerWoodDrum(freq);
  }

  public triggerNaturePad(freq: number, character = 0): void {
    this.triggerAnimalChord(freq, character === 2 ? 'owl' : character === 3 ? 'frog' : 'deer');
  }

  public masterStop(): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      setTimeout(() => {
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.setValueAtTime(this.settings.masterVolume / 100, this.ctx.currentTime);
        }
      }, 300);
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.settings.masterVolume / 100, this.ctx.currentTime);
    }
  }

  public updateSettings(newSettings: Partial<SynthSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (newSettings.masterVolume !== undefined && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.settings.masterVolume / 100, now);
    }
    if (newSettings.filterCutoff !== undefined && this.filterNode) {
      this.filterNode.frequency.exponentialRampToValueAtTime(Math.max(100, this.settings.filterCutoff), now + 0.1);
    }
    if (newSettings.filterResonance !== undefined && this.filterNode) {
      this.filterNode.Q.setValueAtTime(this.settings.filterResonance, now + 0.1);
    }
    if (newSettings.delayTime !== undefined && this.delayNode) {
      this.delayNode.delayTime.setValueAtTime(this.settings.delayTime, now + 0.1);
    }
    if (newSettings.delayFeedback !== undefined && this.delayFeedbackGain) {
      this.delayFeedbackGain.gain.setValueAtTime(this.settings.delayFeedback / 100, now + 0.1);
    }
    if (newSettings.reverbWet !== undefined && this.reverbWetGain) {
      this.reverbWetGain.gain.setValueAtTime(this.settings.reverbWet / 100, now + 0.1);
    }
  }

  public applyBiomeDsp(themeKey: ForestThemeKey): void {
    const theme = FOREST_THEMES[themeKey];
    if (theme && theme.dsp) {
      this.updateSettings({
        filterCutoff: theme.dsp.filterCutoff,
        filterResonance: theme.dsp.filterResonance,
        delayTime: theme.dsp.delayTime,
        delayFeedback: theme.dsp.delayFeedback,
        reverbWet: theme.dsp.reverbWet,
      });
    }
  }

  public randomizeBiomeMelody(_themeKey: ForestThemeKey): void {}

  public getSettings(): SynthSettings {
    return { ...this.settings };
  }

  public getAverageEnergy(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / (this.dataArray.length * 255);
  }
}

export const audioEngine = new AudioEngine();
