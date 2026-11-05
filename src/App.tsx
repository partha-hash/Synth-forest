import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ForestScene } from './components/ForestScene';
import { ControlDock } from './components/ControlDock';
import { EnterScreen } from './components/EnterScreen';
import { TransparentJoystick } from './components/TransparentJoystick';
import { BiomeGestureToast } from './components/BiomeGestureToast';
import { audioEngine } from './audio/AudioEngine';
import {
  DEFAULT_SYNTH_SETTINGS,
  FOREST_THEMES,
  ForestThemeKey,
  ObjectPlayedEvent,
  SynthSettings,
  MUSICAL_MODES,
} from './types/synth';
import { Compass, Sparkles } from 'lucide-react';

export default function App() {
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<ForestThemeKey>('astral');
  const [synthSettings, setSynthSettings] = useState<SynthSettings>({ ...DEFAULT_SYNTH_SETTINGS });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAutoExploring, setIsAutoExploring] = useState<boolean>(false);
  const [lastPlayed, setLastPlayed] = useState<ObjectPlayedEvent | null>(null);
  const [joystickVector, setJoystickVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showBiomeToast, setShowBiomeToast] = useState<boolean>(false);
  const [isEcosystemMode, setIsEcosystemMode] = useState<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);
  const handleEnter = async () => {
    const success = await audioEngine.initAudio();
    if (success) {
      setHasEntered(true);
      audioEngine.applyBiomeDsp(currentTheme);

      setTimeout(() => {
        audioEngine.triggerChime(220);
        setTimeout(() => audioEngine.triggerChime(329.63), 160);
        setTimeout(() => audioEngine.triggerMushroomSound(440, 0), 320);
      }, 200);
    }
  };

  const handleSettingsChange = useCallback((newSettings: Partial<SynthSettings>) => {
    setSynthSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      audioEngine.updateSettings(newSettings);
      return updated;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngine.setMute(next);
      return next;
    });
  }, []);

  const handleMasterStop = useCallback(() => {
    audioEngine.masterStop();
    setIsAutoExploring(false);
    setSynthSettings((prev) => ({
      ...prev,
      isMelodyPlaying: false,
      isPadEnabled: false,
    }));
  }, []);

  const handleToggleAutoExplore = useCallback(() => {
    setIsAutoExploring((prev) => {
      const next = !prev;
      if (next) {
        audioEngine.randomizeBiomeMelody(currentTheme);
        setSynthSettings((s) => ({
          ...s,
          isMelodyPlaying: true,
          selectedMode: audioEngine.getSettings().selectedMode,
          melodyBpm: audioEngine.getSettings().melodyBpm,
        }));
      }
      return next;
    });
  }, [currentTheme]);

  const handleThemeChange = useCallback((newTheme: ForestThemeKey) => {
    setCurrentTheme(newTheme);
    audioEngine.applyBiomeDsp(newTheme);
    const theme = FOREST_THEMES[newTheme];
    if (theme && theme.dsp) {
      setSynthSettings((prev) => ({
        ...prev,
        filterCutoff: theme.dsp.filterCutoff,
        filterResonance: theme.dsp.filterResonance,
        delayTime: theme.dsp.delayTime,
        delayFeedback: theme.dsp.delayFeedback,
        reverbWet: theme.dsp.reverbWet,
        reeseSubDrive: theme.dsp.reeseSubDrive,
        subGlide: theme.dsp.subGlide,
        ambientWindVolume: theme.dsp.ambientWindVolume,
      }));
    }

    setShowBiomeToast(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setShowBiomeToast(false);
    }, 2400);
  }, []);

  const handleObjectPlayed = useCallback(
    (type: ObjectPlayedEvent['type'], label: string, freq: number, noteName: string) => {
      setLastPlayed({
        type,
        label,
        freq,
        frequency: freq,
        noteName,
        timestamp: Date.now(),
      });
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;
      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleMute]);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    setJoystickVector({ x, y });
  }, []);

  const handlePulse = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Space',
        bubbles: true,
      })
    );
  }, []);

  const activeThemeObj = FOREST_THEMES[currentTheme] || FOREST_THEMES.astral;
  const activeModeObj = MUSICAL_MODES[synthSettings.selectedMode] || MUSICAL_MODES.dorian;

  return (
    <div className="lowpoly-ui relative w-screen h-screen overflow-hidden bg-black font-sans select-none">
      <ForestScene
        currentTheme={currentTheme}
        selectedMode={synthSettings.selectedMode}
        bloomEnabled={synthSettings.bloomEnabled}
        isAutoExploring={isAutoExploring}
        joystickVector={joystickVector}
        isEcosystemMode={isEcosystemMode}
        onThemeCycle={handleThemeChange}
        onObjectPlayed={handleObjectPlayed}
      />

      {hasEntered && !isAutoExploring && (
        <TransparentJoystick
          accentColor={activeThemeObj.accentColor}
          onMove={handleJoystickMove}
          onPulse={handlePulse}
        />
      )}

      <BiomeGestureToast theme={activeThemeObj} show={showBiomeToast} />

      <div className="fixed top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#03150e]/85 border border-emerald-500/25 backdrop-blur-xl shadow-[0_0_20px_rgba(4,40,25,0.4)] pointer-events-auto">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
            style={{ backgroundColor: activeThemeObj.accentColor, boxShadow: `0 0 10px ${activeThemeObj.accentColor}` }}
          />
          <span className="text-xs font-mono font-bold tracking-wider text-emerald-100">
            REDOWAN&apos;S SYNTH FOREST
          </span>
          <span className="text-[11px] font-mono text-emerald-300/80 border-l border-emerald-500/20 pl-2.5">
            {activeThemeObj.name}
          </span>
          <span className="hidden sm:inline text-[11px] font-mono text-emerald-400 border-l border-emerald-500/20 pl-2.5">
            {activeModeObj.name}
          </span>
          {isAutoExploring && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse">
              <Compass className="w-3 h-3 animate-spin" />
              AUTO ROAMING
            </span>
          )}
        </div>
      </div>

      {hasEntered && (
        <button
          type="button"
          onClick={() => setIsEcosystemMode((active) => !active)}
          aria-pressed={isEcosystemMode}
          title="Blissful Grove: harmonised melodies and tree-cluster jazz chords"
          className={`fixed right-3 top-16 z-50 flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-mono font-bold tracking-wide shadow-lg backdrop-blur-xl transition-all ${isEcosystemMode ? 'border-fuchsia-300/60 bg-fuchsia-500/25 text-fuchsia-100 shadow-fuchsia-500/20' : 'border-emerald-300/25 bg-[#03150e]/90 text-emerald-100'}`}
        >
          <Sparkles className={`h-4 w-4 ${isEcosystemMode ? 'animate-pulse' : ''}`} />
          {isEcosystemMode ? 'BLISSFUL GROVE ON' : 'BLISSFUL GROVE'}
        </button>
      )}

      <div className="fixed top-3 right-3 z-30 hidden sm:flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#03150e]/85 border border-emerald-500/25 backdrop-blur-xl shadow-[0_0_20px_rgba(4,40,25,0.4)] text-[11px] font-mono pointer-events-auto">
          <span className="italic text-emerald-200/90 font-light tracking-wide">&ldquo;you don&apos;t play you listen.&rdquo;</span>
        </div>
      </div>

      {hasEntered && (
        <ControlDock
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
          synthSettings={synthSettings}
          onSettingsChange={handleSettingsChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onMasterStop={handleMasterStop}
          isAutoExploring={isAutoExploring}
          onToggleAutoExplore={handleToggleAutoExplore}
          lastPlayed={lastPlayed}
        />
      )}

      {!hasEntered && (
        <EnterScreen onEnter={handleEnter} currentTheme={currentTheme} />
      )}
    </div>
  );
}
