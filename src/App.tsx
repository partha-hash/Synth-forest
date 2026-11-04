/**
 * redowan's synth forest - Interactive 3D Audio-Visual Nature Experience
 */

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
import { Compass, MoveHorizontal } from 'lucide-react';

export default function App() {
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<ForestThemeKey>('astral');
  const [synthSettings, setSynthSettings] = useState<SynthSettings>({ ...DEFAULT_SYNTH_SETTINGS });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAutoExploring, setIsAutoExploring] = useState<boolean>(false);
  const [lastPlayed, setLastPlayed] = useState<ObjectPlayedEvent | null>(null);
  const [joystickVector, setJoystickVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showBiomeToast, setShowBiomeToast] = useState<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  // Initialize Web Audio on user entrance
  const handleEnter = async () => {
    const success = await audioEngine.initAudio();
    if (success) {
      setHasEntered(true);
      // Apply initial biome DSP settings
      audioEngine.applyBiomeDsp(currentTheme);

      // Welcome opening chord
      setTimeout(() => {
        audioEngine.triggerChime(220);
        setTimeout(() => audioEngine.triggerChime(329.63), 160);
        setTimeout(() => audioEngine.triggerMushroomChime(440), 320);
      }, 200);
    }
  };

  // Update audio engine when settings change
  const handleSettingsChange = useCallback((newSettings: Partial<SynthSettings>) => {
    setSynthSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      audioEngine.updateSettings(newSettings);
      return updated;
    });
  }, []);

  // Mute toggle
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngine.setMute(next);
      return next;
    });
  }, []);

  // MASTER STOP: When master stop is applied, ALL sound must stop immediately
  const handleMasterStop = useCallback(() => {
    audioEngine.masterStop();
    setIsAutoExploring(false);
    setSynthSettings((prev) => ({
      ...prev,
      isMelodyPlaying: false,
      isPadEnabled: false,
    }));
  }, []);

  // Toggle Auto Explore (Autonomous camera flight + biome-randomized melody)
  const handleToggleAutoExplore = useCallback(() => {
    setIsAutoExploring((prev) => {
      const next = !prev;
      if (next) {
        // Randomize melody to fit active biome and turn on sequencer
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

  // Theme change: also automatically updates DSP audio effects and shows the gesture toast
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

    // Show temporary toast on sweep/switch
    setShowBiomeToast(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setShowBiomeToast(false);
    }, 2400);
  }, []);

  // Callback when a 3D nature prop is clicked/struck
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

  // Keyboard shortcut listener for Mute (M)
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

  // Handle virtual joystick analog 2D movement
  const handleJoystickMove = useCallback((x: number, y: number) => {
    setJoystickVector({ x, y });
  }, []);

  // Pulse action
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
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none">
      {/* 3D WebGL Circular Little-Planet Canvas */}
      <ForestScene
        currentTheme={currentTheme}
        selectedMode={synthSettings.selectedMode}
        bloomEnabled={synthSettings.bloomEnabled}
        isAutoExploring={isAutoExploring}
        joystickVector={joystickVector}
        onThemeCycle={handleThemeChange}
        onObjectPlayed={handleObjectPlayed}
      />

      {/* Everywhere Transparent Touch Joystick for Mobile/Tablet */}
      {hasEntered && !isAutoExploring && (
        <TransparentJoystick
          accentColor={activeThemeObj.accentColor}
          onMove={handleJoystickMove}
          onPulse={handlePulse}
        />
      )}

      {/* Floating Biome Gesture Notification Toast */}
      <BiomeGestureToast theme={activeThemeObj} show={showBiomeToast} />

      {/* Top Floating Minimal Info Bar - Futuristic Green Society Style */}
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

      {/* Top Right Zen Quote */}
      <div className="fixed top-3 right-3 z-30 hidden sm:flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#03150e]/85 border border-emerald-500/25 backdrop-blur-xl shadow-[0_0_20px_rgba(4,40,25,0.4)] text-[11px] font-mono pointer-events-auto">
          <span className="italic text-emerald-200/90 font-light tracking-wide">&ldquo;you don&apos;t play you listen.&rdquo;</span>
        </div>
      </div>

      {/* Collapsible Unified Bottom Control Dock */}
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

      {/* Splash / Audio Unlock Modal */}
      {!hasEntered && (
        <EnterScreen onEnter={handleEnter} currentTheme={currentTheme} />
      )}
    </div>
  );
}
