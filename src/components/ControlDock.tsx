import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Music,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Play,
  Square,
  SunMedium,
  Dices,
  Radio,
  Compass,
  Activity,
  Globe,
  Gauge,
  Zap,
} from 'lucide-react';
import {
  FOREST_THEMES,
  ForestThemeKey,
  ModeKey,
  MusicalMode,
  MUSICAL_MODES,
  SynthSettings,
} from '../types/synth';
import { AudioVisualizer } from './AudioVisualizer';
import { audioEngine } from '../audio/AudioEngine';

interface ControlDockProps {
  currentTheme: ForestThemeKey;
  onThemeChange: (theme: ForestThemeKey) => void;
  synthSettings: SynthSettings;
  onSettingsChange: (newSettings: Partial<SynthSettings>) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onMasterStop: () => void;
  isAutoExploring: boolean;
  onToggleAutoExplore: () => void;
  lastPlayed?: { type: string; label: string; freq: number; noteName: string } | null;
}

type TabType = 'melody' | 'modes' | 'biomes' | 'synth' | 'guide';

export const ControlDock: React.FC<ControlDockProps> = ({
  currentTheme,
  onThemeChange,
  synthSettings,
  onSettingsChange,
  isMuted,
  onToggleMute,
  onMasterStop,
  isAutoExploring,
  onToggleAutoExplore,
  lastPlayed,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('melody');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [activeBeat, setActiveBeat] = useState<number>(1);
  const [lastStepNote, setLastStepNote] = useState<string>('—');
  const [activeBassNote, setActiveBassNote] = useState<string>('—');
  const [melodyPattern, setMelodyPattern] = useState<(number | null)[]>(audioEngine.getMelodyPattern());
  const [bassPattern, setBassPattern] = useState<number[]>(audioEngine.getBassPattern());

  const theme = FOREST_THEMES[currentTheme] || FOREST_THEMES.astral;
  const currentMode: MusicalMode = MUSICAL_MODES[synthSettings.selectedMode] || MUSICAL_MODES.dorian;

  // Listen for melody step and bass events
  useEffect(() => {
    audioEngine.onMelodyStep = (step, beat, noteName, _freq, bassNoteName) => {
      setActiveStep(step);
      setActiveBeat(beat);
      if (noteName !== '—') setLastStepNote(noteName);
      if (bassNoteName !== '—') setActiveBassNote(bassNoteName);
    };
    return () => {
      audioEngine.onMelodyStep = undefined;
    };
  }, []);

  const handleToggleMelody = () => {
    const nextState = !synthSettings.isMelodyPlaying;
    onSettingsChange({ isMelodyPlaying: nextState });
    audioEngine.toggle44Melody(nextState);
  };

  const handleRegenerateMelody = () => {
    audioEngine.generateNew44Pattern(currentTheme);
    setMelodyPattern(audioEngine.getMelodyPattern());
    setBassPattern(audioEngine.getBassPattern());
  };

  const handleTogglePad = () => {
    const nextState = !synthSettings.isPadEnabled;
    onSettingsChange({ isPadEnabled: nextState });
    audioEngine.setPadEnabled(nextState);
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[96vw] max-w-4xl no-scene-drag select-none transition-all duration-300">
      <div className="relative rounded-2xl border border-emerald-500/25 bg-[#03150e]/92 shadow-[0_0_35px_rgba(2,28,18,0.7)] backdrop-blur-xl overflow-hidden text-emerald-50">
        {/* Subtle Ambient Bioluminescent Gradient Line */}
        <div
          className="absolute top-0 inset-x-0 h-[1.5px] opacity-75"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.accentColor}, #34d399, transparent)`,
          }}
        />

        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-emerald-500/15 bg-emerald-950/40">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-xs uppercase">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: theme.accentColor, boxShadow: `0 0 8px ${theme.accentColor}` }}
              />
              <span className="font-mono text-emerald-100 tracking-wider">REDOWAN&apos;S SYNTH FOREST</span>
            </div>

            {/* Last Hit or Melody Status */}
            {lastPlayed ? (
              <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-950/60 text-emerald-200 border border-emerald-500/25">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="text-white font-medium">{lastPlayed.label}</span>
                <span className="text-emerald-400/80">{Math.round(lastPlayed.freq)} Hz</span>
              </div>
            ) : (
              <div className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-emerald-400/70 font-mono">
                <span className="text-emerald-300 font-medium">{theme.name}</span>
                <span className="text-emerald-600">•</span>
                <span className="text-emerald-400">{currentMode.name}</span>
              </div>
            )}
          </div>

          {/* Center: Tabs with futuristic eco-icons */}
          {!isCollapsed && (
            <div className="flex items-center gap-1 bg-[#020e09]/70 p-0.5 rounded-xl border border-emerald-500/20 text-xs">
              <button
                onClick={() => setActiveTab('melody')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'melody'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                    : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-emerald-500/10'
                }`}
                title="Algorithmic Melody Matrix"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Melody</span>
              </button>
              <button
                onClick={() => setActiveTab('modes')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'modes'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                    : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-emerald-500/10'
                }`}
                title="Musical Modes"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Modes</span>
              </button>
              <button
                onClick={() => setActiveTab('biomes')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'biomes'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                    : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-emerald-500/10'
                }`}
                title="Biomes & Acoustic Spaces"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Biomes</span>
              </button>
              <button
                onClick={() => setActiveTab('synth')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'synth'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                    : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-emerald-500/10'
                }`}
                title="Acoustic DSP Effects"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>DSP</span>
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                    : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-emerald-500/10'
                }`}
                title="Ecosystem Guide"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guide</span>
              </button>
            </div>
          )}

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Visualizer */}
            <div className="hidden md:block w-24">
              <AudioVisualizer accentColor={theme.accentColor} />
            </div>

            {/* Auto Roam Button */}
            <button
              onClick={onToggleAutoExplore}
              className={`px-2.5 py-1 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isAutoExploring
                  ? 'bg-emerald-400 text-emerald-950 font-bold border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.6)]'
                  : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15'
              }`}
              title={isAutoExploring ? 'Stop Auto Roam' : 'Auto Explore: Autonomous forest roaming & biome melody randomization'}
            >
              <Compass className={`w-3.5 h-3.5 ${isAutoExploring ? 'animate-spin' : 'text-emerald-400'}`} />
              <span className="text-[11px] font-bold">ROAM</span>
            </button>

            {/* Master Stop Button */}
            <button
              onClick={onMasterStop}
              className="px-2 py-1 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-mono transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
              title="Master Stop: Instantly kill all sounds, drones, and wind"
            >
              <Square className="w-3 h-3 text-rose-400 fill-rose-400" />
              <span className="hidden sm:inline text-[11px] font-bold">STOP</span>
            </button>

            {/* Tap Tree Quick Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('synth-tap-tree'))}
              className="px-2.5 py-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-mono transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
              title="Tap Nearest Tree (or press T)"
            >
              <span>🌲</span>
              <span className="hidden sm:inline text-[11px]">Tree</span>
            </button>

            {/* Pad Drone Toggle (Dedicated Stop/Start) */}
            <button
              onClick={handleTogglePad}
              className={`px-2.5 py-1 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                synthSettings.isPadEnabled
                  ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400/50 hover:text-emerald-300'
              }`}
              title={synthSettings.isPadEnabled ? 'Stop Continuous Drone' : 'Start Continuous Drone'}
            >
              <Radio className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-bold">PAD</span>
            </button>

            {/* Melody Play/Halt Toggle */}
            <button
              onClick={handleToggleMelody}
              className={`p-1.5 px-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
                synthSettings.isMelodyPlaying
                  ? 'bg-emerald-500/30 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400/50 hover:text-emerald-300'
              }`}
              title="Toggle Melodic Pattern"
            >
              {synthSettings.isMelodyPlaying ? <Square className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              <span className="hidden xl:inline text-[11px]">MELODY</span>
            </button>

            {/* Bloom Toggle */}
            <button
              onClick={() => onSettingsChange({ bloomEnabled: !synthSettings.bloomEnabled })}
              className={`p-1.5 rounded-xl border text-xs font-mono transition-all flex items-center cursor-pointer ${
                synthSettings.bloomEnabled
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
                  : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400/40 hover:text-emerald-300'
              }`}
              title="Atmospheric Bloom Glow"
            >
              <SunMedium className="w-3.5 h-3.5" />
            </button>

            {/* Mute */}
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400/60 hover:text-emerald-200'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Collapse */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl border border-emerald-500/20 bg-emerald-950/40 text-emerald-300 hover:text-white transition-all flex items-center cursor-pointer"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tab Body */}
        {!isCollapsed && (
          <div className="p-3 sm:p-4 max-h-[38vh] overflow-y-auto">
            {/* TAB 1: MELODY SEQUENCER */}
            {activeTab === 'melody' && (
              <div className="space-y-3.5 text-xs">
                {/* 16-Step Melody Matrix */}
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-emerald-200 uppercase tracking-wider">
                        16-Step Melody Sequencer
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        Beat {activeBeat} • Step {activeStep + 1} ({lastStepNote})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRegenerateMelody}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px] font-mono active:scale-95"
                        title="Randomize 16-Step Melody & 4-Note Bassline"
                      >
                        <Dices className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Randomize</span>
                      </button>

                      <button
                        onClick={handleToggleMelody}
                        className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                          synthSettings.isMelodyPlaying
                            ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                            : 'bg-emerald-900/40 text-emerald-200 hover:bg-emerald-800/40 border border-emerald-500/30'
                        }`}
                      >
                        {synthSettings.isMelodyPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{synthSettings.isMelodyPlaying ? 'Halt' : 'Sequence'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 16 Step LED Grid (4 Beats x 4 16th-Notes) */}
                  <div className="grid grid-cols-4 gap-2 pt-0.5">
                    {[1, 2, 3, 4].map((beatNum) => {
                      const romanLabels = ['BEAT I', 'BEAT II', 'BEAT III', 'BEAT IV'];
                      const isCurrentPhase = activeBeat === beatNum && synthSettings.isMelodyPlaying;
                      return (
                        <div
                          key={beatNum}
                          className={`p-2 rounded-xl border transition-all ${
                            isCurrentPhase
                              ? 'bg-emerald-500/15 border-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                              : 'bg-[#020d08]/60 border-emerald-500/10'
                          }`}
                        >
                          <div className="text-[10px] font-mono font-semibold text-emerald-400/80 mb-1.5 flex justify-between items-center">
                            <span>{romanLabels[beatNum - 1]}</span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCurrentPhase ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-emerald-950'
                              }`}
                            />
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {[0, 1, 2, 3].map((subStep) => {
                              const stepIdx = (beatNum - 1) * 4 + subStep;
                              const isCurrent = activeStep === stepIdx && synthSettings.isMelodyPlaying;
                              const noteDegree = melodyPattern[stepIdx];
                              const hasNote = noteDegree !== null && noteDegree !== undefined;
                              const noteName = hasNote
                                ? currentMode.noteNames[Math.min(currentMode.noteNames.length - 1, noteDegree)]
                                : '—';

                              return (
                                <button
                                  key={stepIdx}
                                  onClick={() => {
                                    // Toggle/mutate note on click
                                    const nextDegree = hasNote
                                      ? (noteDegree + 2) % currentMode.notes.length
                                      : subStep === 0
                                      ? 0
                                      : 4;
                                    audioEngine.setMelodyStep(stepIdx, nextDegree);
                                    setMelodyPattern(audioEngine.getMelodyPattern());
                                    audioEngine.triggerChime(currentMode.notes[nextDegree]);
                                  }}
                                  className={`h-7 rounded-md flex flex-col items-center justify-center font-mono text-[9px] transition-all duration-75 cursor-pointer ${
                                    isCurrent
                                      ? 'bg-emerald-300 text-emerald-950 font-bold scale-105 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                                      : hasNote
                                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30'
                                      : 'bg-emerald-950/40 text-emerald-700/60 hover:text-emerald-500'
                                  }`}
                                  title={`Step ${stepIdx + 1}: ${noteName}`}
                                >
                                  <span className="text-[8px] opacity-60 leading-none">{stepIdx + 1}</span>
                                  <span className="font-bold leading-tight">{noteName}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4-Note Modal Bassline Card */}
                <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-emerald-200 uppercase tracking-wider">
                        4-Note Modal Bassline (Greek Mode Scale Degrees)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        Beat {activeBeat} • {activeBassNote}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/60 hidden sm:inline">
                      Deep Sub/Triangle Voice (Beats 1-4)
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {bassPattern.map((degree, bIdx) => {
                      const isCurrentBeat = activeBeat === bIdx + 1 && synthSettings.isMelodyPlaying;
                      const safeDeg = Math.min(currentMode.notes.length - 1, degree);
                      const noteName = currentMode.noteNames[safeDeg] || 'C2';
                      const freq = Math.round(currentMode.notes[safeDeg] * 0.5);
                      const degreeRoman = ['Root (I)', 'Degree (II/III)', 'Fifth (V)', 'Cadence (VII/II)'][bIdx];

                      return (
                        <button
                          key={bIdx}
                          onClick={() => {
                            const nextDeg = (degree + 1) % Math.min(currentMode.notes.length, 7);
                            audioEngine.setBassNote(bIdx, nextDeg);
                            setBassPattern(audioEngine.getBassPattern());
                            audioEngine.triggerBassVoice(currentMode.notes[nextDeg] * 0.5);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isCurrentBeat
                              ? 'bg-emerald-400 text-emerald-950 font-bold border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.6)] scale-[1.02]'
                              : 'bg-[#020e09]/80 border-emerald-500/20 text-emerald-200 hover:border-emerald-400/40'
                          }`}
                          title={`Click to cycle bass degree for Beat ${bIdx + 1}`}
                        >
                          <div className="text-[9px] font-mono opacity-60">BEAT {bIdx + 1}</div>
                          <div className="text-sm font-mono font-bold tracking-tight">{noteName}</div>
                          <div className="text-[9px] font-mono opacity-70">{freq} Hz</div>
                          <div className="text-[8px] font-mono opacity-50 mt-0.5">{degreeRoman}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tempo & Drone Controls with dedicated Drone Volume */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between gap-3 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-medium text-emerald-100">BPM Pulse</div>
                        <div className="text-[10px] text-emerald-400/60 font-mono">Harmonic Rate</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="60"
                        max="160"
                        value={synthSettings.melodyBpm}
                        onChange={(e) => onSettingsChange({ melodyBpm: Number(e.target.value) })}
                        className="w-20 accent-emerald-400 cursor-pointer"
                      />
                      <span className="font-mono text-emerald-300 w-8 text-right font-bold text-xs">
                        {synthSettings.melodyBpm}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-medium text-emerald-100">Sub Drone</div>
                        <div className="text-[10px] text-emerald-400/60 font-mono">
                          {synthSettings.isPadEnabled ? 'Active' : 'Silent (Standby)'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleTogglePad}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                        synthSettings.isPadEnabled
                          ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                          : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/40 border border-emerald-500/25'
                      }`}
                    >
                      {synthSettings.isPadEnabled ? 'ACTIVE' : 'STANDBY'}
                    </button>
                  </div>

                  <div className={`flex items-center justify-between gap-3 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15 transition-opacity ${synthSettings.isPadEnabled ? 'opacity-100' : 'opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-medium text-emerald-100">Drone Volume</div>
                        <div className="text-[10px] text-emerald-400/60 font-mono">
                          {synthSettings.isPadEnabled ? 'Pad Output' : 'Muted'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={synthSettings.padVolume}
                        onChange={(e) => onSettingsChange({ padVolume: Number(e.target.value) })}
                        className="w-20 accent-emerald-400 cursor-pointer"
                      />
                      <span className="font-mono text-emerald-300 w-8 text-right font-bold text-xs">
                        {synthSettings.padVolume}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MUSICAL MODES */}
            {activeTab === 'modes' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(MUSICAL_MODES) as ModeKey[]).map((modeKey) => {
                    const m = MUSICAL_MODES[modeKey];
                    const isSelected = synthSettings.selectedMode === modeKey;
                    return (
                      <button
                        key={modeKey}
                        onClick={() => {
                          onSettingsChange({ selectedMode: modeKey });
                          audioEngine.generateNew44Pattern();
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                            : 'bg-emerald-950/20 border-emerald-500/15 hover:bg-emerald-950/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-emerald-100">{m.name}</span>
                          {isSelected && (
                            <span
                              className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_#34d399]"
                              style={{ backgroundColor: theme.accentColor }}
                            />
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-300/80 mb-1">{m.formula}</div>
                        <p className="text-[11px] text-emerald-200/70 leading-snug mb-2">{m.mood}</p>
                        <div className="flex flex-wrap gap-1">
                          {m.noteNames.slice(0, 6).map((n) => (
                            <span
                              key={n}
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#020d08]/80 text-emerald-300 border border-emerald-500/15"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: BIOMES & DYNAMIC DSP EFFECTS */}
            {activeTab === 'biomes' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(Object.keys(FOREST_THEMES) as ForestThemeKey[]).map((thKey) => {
                    const th = FOREST_THEMES[thKey];
                    const isSelected = currentTheme === thKey;
                    return (
                      <button
                        key={thKey}
                        onClick={() => onThemeChange(thKey)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.25)]'
                            : 'bg-emerald-950/20 border-emerald-500/15 hover:bg-emerald-950/40'
                        }`}
                        style={{
                          backgroundColor: isSelected ? `${th.badgeBg}` : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: th.accentColor, boxShadow: `0 0 8px ${th.accentColor}` }}
                            />
                            <span className="font-bold text-xs text-white">{th.name}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-medium border border-emerald-400/40">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-emerald-200/80 leading-snug mb-2 font-normal">
                          {th.tagline}
                        </p>

                        <div className="p-1.5 rounded-lg bg-[#020d08]/80 border border-emerald-500/15 text-[10px] font-mono flex items-center justify-between">
                          <span className="text-emerald-400/60 font-semibold">DSP</span>
                          <span style={{ color: th.accentColor }}>{th.dsp.dspLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: DSP CONTROLS */}
            {activeTab === 'synth' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Filter Cutoff</span>
                    <span className="font-mono text-emerald-400">{Math.round(synthSettings.filterCutoff)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="10000"
                    step="50"
                    value={synthSettings.filterCutoff}
                    onChange={(e) => onSettingsChange({ filterCutoff: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Resonance (Q)</span>
                    <span className="font-mono text-emerald-400">{synthSettings.filterResonance.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="12"
                    step="0.2"
                    value={synthSettings.filterResonance}
                    onChange={(e) => onSettingsChange({ filterResonance: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Stereo Delay</span>
                    <span className="font-mono text-emerald-400">{Math.round(synthSettings.delayTime * 1000)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.9"
                    step="0.02"
                    value={synthSettings.delayTime}
                    onChange={(e) => onSettingsChange({ delayTime: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Delay Feedback</span>
                    <span className="font-mono text-emerald-400">{Math.round(synthSettings.delayFeedback)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="1"
                    value={synthSettings.delayFeedback}
                    onChange={(e) => onSettingsChange({ delayFeedback: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Cathedral Reverb</span>
                    <span className="font-mono text-emerald-400">{Math.round(synthSettings.reverbWet)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={synthSettings.reverbWet}
                    onChange={(e) => onSettingsChange({ reverbWet: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Reese Sub Drive</span>
                    <span className="font-mono text-emerald-400">{Math.round(synthSettings.reeseSubDrive)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="2"
                    value={synthSettings.reeseSubDrive}
                    onChange={(e) => onSettingsChange({ reeseSubDrive: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Sub Glide</span>
                    <span className="font-mono text-emerald-400">{Math.round(synthSettings.subGlide)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="1000"
                    step="20"
                    value={synthSettings.subGlide}
                    onChange={(e) => onSettingsChange({ subGlide: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Drone Volume</span>
                    <span className="font-mono text-emerald-400">
                      {synthSettings.isPadEnabled ? `${Math.round(synthSettings.padVolume)}%` : 'Muted'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={synthSettings.padVolume}
                    onChange={(e) => onSettingsChange({ padVolume: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">Master Volume</span>
                    <span className="font-mono text-emerald-400">{Math.round(synthSettings.masterVolume)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={synthSettings.masterVolume}
                    onChange={(e) => onSettingsChange({ masterVolume: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: MINIMALIST ZEN GUIDE */}
            {activeTab === 'guide' && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <p className="text-xl sm:text-2xl font-light italic tracking-wider text-emerald-100">
                  &ldquo;you don&apos;t play you listen.&rdquo;
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs font-mono text-emerald-300/80">
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/20">
                    🌲 Tap Trees
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/20">
                    🍄 Mushrooms
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/20">
                    ✨ Space: Pulse
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/20">
                    ↕ 2-Finger Vertical Swipe: Biomes
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
