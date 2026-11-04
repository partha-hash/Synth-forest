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
    <div className="lowpoly-ui absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#111a12]/90 backdrop-blur-md select-none">
      {/* Subtle Ambient Background Flare */}
      <div
        className="absolute w-[360px] h-[360px] rounded-full blur-[100px] opacity-10 pointer-events-none"
        style={{ backgroundColor: theme.accentColor }}
      />

      {/* Futuristic Minimalist Chassis */}
      <div className="lowpoly-panel relative max-w-md w-full border border-[#89956b]/30 bg-[#18251b]/95 p-8 sm:p-10 shadow-xl text-center text-[#f0ead8]">
        {/* Architectural Tech Corner Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#b4c28a]" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#b4c28a]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#b4c28a]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#b4c28a]" />

        {/* Minimalist Top Indicator */}
        <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-[#b8c39a]/70 uppercase mb-8 pb-3 border-b border-[#b4c28a]/20">
          <span>SYS.AUDIO // v2.4</span>
          <span className="flex items-center gap-1.5 text-[#cbd7a5]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            ONLINE
          </span>
        </div>

        {/* Central Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.16em] text-white uppercase mb-2">
          REDOWAN&apos;S SYNTH FOREST
        </h1>

        <div className="text-xs font-mono tracking-[0.25em] text-[#c5d19a] uppercase mb-8">
          PROCEDURAL 3D BIOSPHERE
        </div>

        {/* Minimalist Zen Centerpiece Quote */}
        <div className="my-8 py-5 border-y border-[#b4c28a]/20">
          <p className="text-xl sm:text-2xl font-light italic tracking-wider text-[#e4e9cf]">
            &ldquo;you don&apos;t play you listen.&rdquo;
          </p>
        </div>

        {/* Futuristic Enter Button */}
        <button
          onClick={onEnter}
          className="lowpoly-button group relative w-full py-3.5 px-6 border border-[#b4c28a]/70 bg-[#81945a]/20 hover:bg-[#a8b77a] hover:text-[#18251b] text-[#e1e9c5] font-bold tracking-[0.2em] text-sm uppercase transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98]"
        >
          <Volume2 className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>ENTER BIOSPHERE</span>
        </button>
      </div>
    </div>
  );
};
