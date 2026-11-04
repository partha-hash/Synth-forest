import React from 'react';
import { Volume2, Disc3 } from 'lucide-react';
import { FOREST_THEMES, ForestThemeKey } from '../types/synth';

interface EnterScreenProps {
  onEnter: () => void;
  currentTheme: ForestThemeKey;
}

export const EnterScreen: React.FC<EnterScreenProps> = ({ onEnter, currentTheme }) => {
  const theme = FOREST_THEMES[currentTheme] || FOREST_THEMES.astral;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#010805]/92 backdrop-blur-2xl select-none">
      {/* Subtle Ambient Background Flare */}
      <div
        className="absolute w-[480px] h-[480px] rounded-full blur-[140px] opacity-20 pointer-events-none"
        style={{ backgroundColor: theme.accentColor }}
      />

      {/* Futuristic Minimalist Chassis */}
      <div className="relative max-w-md w-full border border-emerald-500/25 bg-[#020e09]/90 p-8 sm:p-10 shadow-[0_0_50px_rgba(2,25,16,0.8)] text-center text-emerald-50">
        {/* Architectural Tech Corner Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

        {/* Minimalist Top Indicator */}
        <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-emerald-400/60 uppercase mb-8 pb-3 border-b border-emerald-500/15">
          <span>SYS.AUDIO // v2.4</span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            ONLINE
          </span>
        </div>

        {/* Central Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.16em] text-white uppercase mb-2">
          REDOWAN&apos;S SYNTH FOREST
        </h1>

        <div className="text-xs font-mono tracking-[0.25em] text-emerald-400/80 uppercase mb-8">
          PROCEDURAL 3D BIOSPHERE
        </div>

        {/* Minimalist Zen Centerpiece Quote */}
        <div className="my-8 py-5 border-y border-emerald-500/15">
          <p className="text-xl sm:text-2xl font-light italic tracking-wider text-emerald-100">
            &ldquo;you don&apos;t play you listen.&rdquo;
          </p>
        </div>

        {/* Futuristic Enter Button */}
        <button
          onClick={onEnter}
          className="group relative w-full py-3.5 px-6 border border-emerald-400/70 bg-emerald-500/15 hover:bg-emerald-400 hover:text-emerald-950 text-emerald-200 font-bold tracking-[0.2em] text-sm uppercase transition-all duration-300 shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:shadow-[0_0_35px_rgba(52,211,153,0.6)] cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98]"
        >
          <Volume2 className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>ENTER BIOSPHERE</span>
        </button>
      </div>
    </div>
  );
};
