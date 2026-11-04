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
import { Compass, Search, Music2, Clock3, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<ForestThemeKey>('astral');
  const [synthSettings, setSynthSettings] = useState<SynthSettings>({ ...DEFAULT_SYNTH_SETTINGS });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAutoExploring, setIsAutoExploring] = useState<boolean>(false);
  const [lastPlayed, setLastPlayed] = useState<ObjectPlayedEvent | null>(null);
  const [joystickVector, setJoystickVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showBiomeToast, setShowBiomeToast] = useState<boolean>(false);
  const [dailyTask, setDailyTask] = useState(() => {
    const saved = localStorage.getItem('synthForestDailyDiscovery');
    const parsed = saved ? JSON.parse(saved) : null;
    if (parsed && Date.now() - parsed.startedAt < 24 * 60 * 60 * 1000) return parsed;
    return { startedAt: Date.now(), seed: Math.floor(Math.random() * 1000000000), completed: false };
  });
  const [discoveryProgress, setDiscoveryProgress] = useState(0);
  const [rewardMelody, setRewardMelody] = useState<ArrayBuffer | null>(null);
  const [rewardName, setRewardName] = useState('');
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60 * 1000);
  const toastTimerRef = useRef<number | null>(null);
  const rewardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('synthForestDailyDiscovery', JSON.stringify(dailyTask));
    const timer = window.setInterval(() => {
      const remaining = 24 * 60 * 60 * 1000 - (Date.now() - dailyTask.startedAt);
      if (remaining <= 0) {
        setDailyTask({ startedAt: Date.now(), seed: Math.floor(Math.random() * 1000000000), completed: false });
        setDiscoveryProgress(0);
      } else setTimeLeft(remaining);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [dailyTask]);

  const handleDiscoveryProgress = useCallback((progress: number) => {
    setDiscoveryProgress((old) => Math.abs(old - progress) > 0.035 ? progress : old);
    if (progress >= 1 && !dailyTask.completed) {
      setDailyTask((task) => ({ ...task, completed: true }));
      if (rewardMelody) void audioEngine.playDiscoveryReward(rewardMelody);
      else audioEngine.triggerAnimalChord(392, 5);
    }
  }, [dailyTask.completed, rewardMelody]);

  const handleRewardUpload = async (file?: File) => {
    if (!file) return;
    if (!/audio\/(mpeg|wav|x-wav|mp4|ogg)/.test(file.type) && !/\.(mp3|wav|m4a|ogg)$/i.test(file.name)) return;
    setRewardName(file.name);
    setRewardMelody(await file.arrayBuffer());
  };

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
        discoverySeed={dailyTask.seed}
        discoveryCompleted={dailyTask.completed}
        onDiscoveryProgress={handleDiscoveryProgress}
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

      <div className="fixed top-3 right-3 z-30 hidden sm:flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#03150e]/85 border border-emerald-500/25 backdrop-blur-xl shadow-[0_0_20px_rgba(4,40,25,0.4)] text-[11px] font-mono pointer-events-auto">
          <span className="italic text-emerald-200/90 font-light tracking-wide">&ldquo;you don&apos;t play you listen.&rdquo;</span>
        </div>
      </div>

      {hasEntered && (
        <div className="fixed right-3 top-16 z-40 w-60 sm:w-72 rounded-2xl border border-amber-300/25 bg-[#10170f]/90 p-3 text-amber-50 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide"><Search className="h-4 w-4 text-amber-300"/> DAILY FOREST FIND</div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-amber-200/80"><Clock3 className="h-3 w-3"/>{Math.floor(timeLeft/3600000)}h {Math.floor((timeLeft%3600000)/60000)}m</div>
          </div>
          <p className="mt-1 text-[11px] text-white/70">Find today's hidden glowing object. Follow its growing light and sound.</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300 transition-all" style={{width:`${dailyTask.completed ? 100 : discoveryProgress*100}%`}}/></div>
          <div className="mt-2 flex items-center justify-between text-[10px]">{dailyTask.completed ? <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3 w-3"/> Found — reward unlocked</span> : <span className="text-amber-100/70">{Math.round(discoveryProgress*100)}% proximity</span>}</div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => rewardInputRef.current?.click()} className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-[10px] hover:bg-white/10"><Music2 className="h-3 w-3"/> Add melody reward</button>
            <span className="min-w-0 truncate text-[9px] text-white/50">{rewardName || 'No melody loaded'}</span>
            <input ref={rewardInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" className="hidden" onChange={(e) => handleRewardUpload(e.target.files?.[0])}/>
          </div>
          {dailyTask.completed && rewardMelody && <button onClick={() => void audioEngine.playDiscoveryReward(rewardMelody)} className="mt-2 w-full rounded-lg bg-amber-300/20 py-1.5 text-[10px] text-amber-100">Play unlocked melody</button>}
        </div>
      )}

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
