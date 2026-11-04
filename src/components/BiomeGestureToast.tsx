import React from 'react';
import { Sparkles, MoveVertical } from 'lucide-react';
import { ForestTheme } from '../types/synth';

interface BiomeGestureToastProps {
  theme: ForestTheme;
  show: boolean;
}

export const BiomeGestureToast: React.FC<BiomeGestureToastProps> = ({ theme, show }) => {
  if (!show) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 transform scale-100 animate-in fade-in slide-in-from-top-4">
      <div
        className="px-4 py-2.5 rounded-2xl border border-emerald-500/30 bg-[#03150e]/92 backdrop-blur-xl shadow-[0_0_30px_rgba(2,28,18,0.7)] flex items-center gap-3 text-emerald-50"
        style={{
          boxShadow: `0 0 25px ${theme.accentColor}44`,
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${theme.accentColor}25`, color: theme.accentColor }}
        >
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs tracking-tight text-white">{theme.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              DSP APPLIED
            </span>
          </div>
          <span className="text-[11px] font-mono" style={{ color: theme.accentColor }}>
            {theme.dsp.dspLabel}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-400/70 font-mono border-l border-emerald-500/20 pl-2.5">
          <MoveVertical className="w-3.5 h-3.5 text-emerald-400" />
          <span>2-Finger Vertical Swipe</span>
        </div>
      </div>
    </div>
  );
};
