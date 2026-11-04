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
import { Compass, Search, Music2, Clock3, CheckCircle2, Settings2, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { parseMidi, MidiNote } from './midi/parser';

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
  const [rewardLibrary, setRewardLibrary] = useState<Array<{id:string;name:string;file:string}>>([]);
  const [rewardLibraryStatus, setRewardLibraryStatus] = useState('Loading melodies…');
  const [selectedReward, setSelectedReward] = useState('');
  const [rewardNotes, setRewardNotes] = useState<MidiNote[]>([]);
  const [rewardName, setRewardName] = useState('');
  const [showRewardSettings, setShowRewardSettings] = useState(false);
  const [showRewardMenu, setShowRewardMenu] = useState(true);
  const [rewardSettings, setRewardSettings] = useState({ tempo:100, transpose:0, volume:75, voice:'chime' as 'chime'|'pad' });
  const rewardTimers = useRef<number[]>([]);
  const rewardPlaying = useRef(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('synthForestMidiSettings');
      if (saved) setRewardSettings(s => ({ ...s, ...JSON.parse(saved) }));
    } catch { /* keep defaults if saved settings are malformed */ }
  }, []);
  useEffect(() => {
    localStorage.setItem('synthForestMidiSettings', JSON.stringify(rewardSettings));
  }, [rewardSettings]);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60 * 1000);
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const base = (import.meta as any).env?.BASE_URL || '/';
    const manifestUrl = `${base.endsWith('/') ? base : `${base}/`}rewards/manifest.json`;
    const fallbackRewards = [
      { id: 'bach-prelude-c', name: 'Bach — Prelude in C Major (excerpt)', file: 'rewards/melodies/bach-prelude-c-major.mid' },
      { id: 'beethoven-ode-joy', name: 'Beethoven — Ode to Joy (excerpt)', file: 'rewards/melodies/beethoven-ode-to-joy.mid' },
      { id: 'mozart-eine-kleine', name: 'Mozart — Eine kleine Nachtmusik (excerpt)', file: 'rewards/melodies/mozart-eine-kleine-nachtmusik.mid' },
    ];
    fetch(manifestUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Reward manifest returned ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (cancelled) return;
        const items = Array.isArray(data.rewards) ? data.rewards : [];
        setRewardLibrary(items.length ? items : fallbackRewards);
        setRewardLibraryStatus(items.length ? `${items.length} melodies available` : 'Using built-in melody list');
      })
      .catch(error => {
        console.warn('Could not load reward manifest; using built-in melody list.', error);
        if (!cancelled) {
          setRewardLibrary(fallbackRewards);
          setRewardLibraryStatus('Built-in list — check MIDI files are in /public/rewards/melodies/');
        }
      });
    return () => { cancelled = true; };
  }, []);

  const stopReward = useCallback(() => {
    rewardPlaying.current = false;
    rewardTimers.current.forEach(id => window.clearTimeout(id));
    rewardTimers.current = [];
  }, []);

  const playReward = useCallback((notes: MidiNote[]) => {
    if (!notes.length) return;
    stopReward();
    rewardPlaying.current = true;
    const rate = Math.max(50, Math.min(150, rewardSettings.tempo)) / 100;
    const transpose = Math.max(-24, Math.min(24, rewardSettings.transpose));
    const volume = Math.max(0, Math.min(100, rewardSettings.volume)) / 100;
    notes.forEach(note => {
      const id = window.setTimeout(() => {
        if (!rewardPlaying.current) return;
        const freq = 440 * Math.pow(2, (note.pitch + transpose - 69) / 12);
        const velocity = note.velocity * volume;
        if (rewardSettings.voice === 'pad') audioEngine.triggerNaturePad(freq, 1);
        else audioEngine.triggerChime(freq, velocity);
      }, note.start * 1000 / rate);
      rewardTimers.current.push(id);
    });
    const end = Math.max(...notes.map(n => n.start + n.duration)) * 1000 / rate + 3000;
    rewardTimers.current.push(window.setTimeout(() => { rewardPlaying.current = false; }, end));
  }, [rewardSettings, stopReward]);

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
      if (rewardNotes.length) playReward(rewardNotes);
      else audioEngine.triggerAnimalChord(392, 5);
    }
  }, [dailyTask.completed, rewardNotes, playReward]);

  const loadReward = async (reward: {id:string;name:string;file:string}) => {
    try {
      const base = (import.meta as any).env?.BASE_URL || '/';
      const filePath = reward.file.replace(/^\/+/, '');
      const fileUrl = `${base.endsWith('/') ? base : `${base}/`}${filePath.startsWith('rewards/') ? filePath : `rewards/${filePath}`}`;
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`MIDI file could not be loaded (${response.status}): ${fileUrl}`);
      const notes = parseMidi(await response.arrayBuffer());
      setRewardNotes(notes);
      setRewardName(reward.name);
      setSelectedReward(reward.id);
    } catch (error) {
      console.error(error);
      setRewardNotes([]);
      setRewardName('Could not load MIDI');
    }
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
    stopReward();
    setIsAutoExploring(false);
    setSynthSettings((prev) => ({
      ...prev,
      isMelodyPlaying: false,
      isPadEnabled: false,
    }));
  }, [stopReward]);

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

      {hasEntered && (showRewardMenu ? (
        <div className="fixed right-3 top-16 z-[100] w-60 sm:w-72 rounded-2xl pointer-events-auto border border-amber-300/25 bg-[#10170f]/90 p-3 text-amber-50 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide"><Search className="h-4 w-4 text-amber-300"/> DAILY FOREST FIND</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] font-mono text-amber-200/80"><Clock3 className="h-3 w-3"/>{Math.floor(timeLeft/3600000)}h {Math.floor((timeLeft%3600000)/60000)}m</div>
              <button type="button" title="Minimise reward menu" aria-label="Minimise reward menu" onClick={() => setShowRewardMenu(false)} className="rounded-md border border-amber-200/30 bg-white/5 p-1.5 hover:bg-white/15 active:scale-95"><ChevronUp className="h-4 w-4"/></button>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-white/70">Find today's hidden glowing object. Follow its growing light and sound.</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300 transition-all" style={{width:`${dailyTask.completed ? 100 : discoveryProgress*100}%`}}/></div>
          <div className="mt-2 flex items-center justify-between text-[10px]">{dailyTask.completed ? <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3 w-3"/> Found — reward unlocked</span> : <span className="text-amber-100/70">{Math.round(discoveryProgress*100)}% proximity</span>}</div>
          <div className="mt-2 flex gap-2">
            <select aria-label="MIDI reward" value={selectedReward} onChange={e => { const item = rewardLibrary.find(r => r.id === e.target.value); if (item) void loadReward(item); }} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#172015] px-2 py-1.5 text-[10px] text-white">
              <option value="">Choose reward MIDI</option>
              {rewardLibrary.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button title="Reward playback settings" onClick={() => setShowRewardSettings(v => !v)} className="rounded-lg border border-white/15 p-2"><Settings2 className="h-3.5 w-3.5"/></button>
          </div>
          <div className="mt-1 truncate text-[9px] text-white/50">{rewardName || rewardLibraryStatus || 'Select a MIDI reward from your library'}</div>
          {showRewardSettings && <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-black/20 p-2 text-[10px]">
            <label className="flex items-center justify-between">Playback tempo <b>{rewardSettings.tempo}%</b></label>
            <input aria-label="MIDI tempo" type="range" min="50" max="150" value={rewardSettings.tempo} onChange={e => setRewardSettings(s => ({...s,tempo:+e.target.value}))} className="w-full"/>
            <label className="flex items-center justify-between">Transpose <b>{rewardSettings.transpose > 0 ? '+' : ''}{rewardSettings.transpose} semitones</b></label>
            <input aria-label="MIDI transpose" type="range" min="-12" max="12" value={rewardSettings.transpose} onChange={e => setRewardSettings(s => ({...s,transpose:+e.target.value}))} className="w-full"/>
            <label className="flex items-center justify-between">Reward level <b>{rewardSettings.volume}%</b></label>
            <input aria-label="MIDI reward volume" type="range" min="0" max="100" value={rewardSettings.volume} onChange={e => setRewardSettings(s => ({...s,volume:+e.target.value}))} className="w-full"/>
            <label className="flex items-center justify-between">Synth voice
              <select value={rewardSettings.voice} onChange={e => setRewardSettings(s => ({...s,voice:e.target.value as 'chime'|'pad'}))} className="rounded bg-[#172015] p-1"><option value="chime">Crystal chime</option><option value="pad">Nature pad</option></select>
            </label>
          </div>}
          {dailyTask.completed && rewardNotes.length > 0 && <div className="mt-2 flex gap-2">
            <button onClick={() => playReward(rewardNotes)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-300/20 py-1.5 text-[10px] text-amber-100"><Play className="h-3 w-3"/> Play reward</button>
            <button onClick={stopReward} className="rounded-lg border border-white/15 px-3 py-1.5"><Square className="h-3 w-3"/></button>
          </div>}
        </div>
      ) : (
        <button type="button" onClick={() => setShowRewardMenu(true)} title="Open daily forest find and MIDI rewards" aria-label="Open reward menu" className="fixed right-3 top-16 z-[100] pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/30 bg-[#10170f]/90 px-3 py-2 text-[10px] font-bold tracking-wide text-amber-100 shadow-xl backdrop-blur-xl hover:bg-[#1b291b]">
          <Search className="h-3.5 w-3.5 text-amber-300"/> DAILY FIND <ChevronDown className="h-3 w-3"/>
        </button>
      ))}

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
