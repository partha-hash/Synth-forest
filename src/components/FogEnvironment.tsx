/**
 * redowan's synth forest - Fog Environment
 *
 * A drifting layer of mist that sits on top of the forest scene.
 * It never blocks clicks (pointer-events: none) and can pulse with the music.
 *
 * HOW TO UPDATE IT: change the numbers in FOG_CONFIG below, or edit the
 * FOG_LAYERS list to add, remove, or reshape the mist banks.
 */

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

// ---------------------------------------------------------------
// SETTINGS YOU CAN EDIT
// ---------------------------------------------------------------
export const FOG_CONFIG = {
  enabled: true, // false = no fog at all
  intensity: 0.55, // 0 (invisible) to 1 (very thick)
  speed: 1, // 1 = normal drift, 2 = twice as fast, 0.5 = half speed
  layers: 3, // how many mist banks to show (1 to 3)
  audioReactive: true, // fog gets thicker when the music is loud
  audioBoost: 0.35, // how strongly the music thickens the fog (0 to 1)
  defaultColor: '#a7f3d0', // mist color when no color prop is given
};

// ---------------------------------------------------------------
// THE MIST BANKS (each one is a big soft cloud that drifts)
// ---------------------------------------------------------------
interface FogLayer {
  left: string;
  top?: string;
  bottom?: string;
  width: string;
  height: string;
  opacity: number; // strength of this bank (0 to 1)
  seconds: number; // time for one drift across, before the speed setting
  delay: number; // negative number = start part-way through the drift
  motion: 'fogDriftA' | 'fogDriftB';
}

const FOG_LAYERS: FogLayer[] = [
  // Low ground mist
  { left: '-25%', bottom: '-15%', width: '150%', height: '55%', opacity: 0.55, seconds: 46, delay: 0, motion: 'fogDriftA' },
  // Mid-height drifting bank
  { left: '-10%', bottom: '8%', width: '120%', height: '45%', opacity: 0.36, seconds: 62, delay: -20, motion: 'fogDriftB' },
  // High haze
  { left: '-20%', top: '-10%', width: '140%', height: '50%', opacity: 0.22, seconds: 80, delay: -35, motion: 'fogDriftA' },
];

const FOG_CSS = `
@keyframes fogDriftA {
  from { transform: translate3d(-6%, 0, 0) scale(1); }
  to   { transform: translate3d(6%, -2%, 0) scale(1.08); }
}
@keyframes fogDriftB {
  from { transform: translate3d(5%, 0, 0) scale(1.05); }
  to   { transform: translate3d(-7%, 2%, 0) scale(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .synth-fog-layer { animation: none !important; }
}
`;

interface FogEnvironmentProps {
  /** Mist color. Pass the biome's accent color so the fog changes with the biome. */
  color?: string;
  /** Overrides FOG_CONFIG.intensity */
  intensity?: number;
  /** Overrides FOG_CONFIG.enabled */
  enabled?: boolean;
}

export const FogEnvironment: React.FC<FogEnvironmentProps> = ({
  color,
  intensity,
  enabled,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const isEnabled = enabled ?? FOG_CONFIG.enabled;
  const baseIntensity = Math.max(0, Math.min(1, intensity ?? FOG_CONFIG.intensity));
  const mistColor = color || FOG_CONFIG.defaultColor;

  // Update the overall fog thickness (and pulse with the music if turned on)
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !isEnabled) return;

    if (!FOG_CONFIG.audioReactive) {
      root.style.opacity = String(baseIntensity);
      return;
    }

    let frameId = 0;
    let smoothed = 0;
    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const energy = audioEngine.getAverageEnergy();
      smoothed += (energy - smoothed) * 0.08; // ease, so the fog breathes instead of flickering
      const value = Math.min(1, baseIntensity + smoothed * FOG_CONFIG.audioBoost);
      root.style.opacity = String(value);
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, [isEnabled, baseIntensity]);

  if (!isEnabled) return null;

  const layers = FOG_LAYERS.slice(0, Math.max(1, Math.min(FOG_LAYERS.length, FOG_CONFIG.layers)));
  const speed = Math.max(0.1, FOG_CONFIG.speed);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-10"
      style={{ opacity: baseIntensity }}
    >
      <style>{FOG_CSS}</style>
      {layers.map((layer, i) => (
        <div
          key={i}
          className="synth-fog-layer absolute"
          style={{
            left: layer.left,
            top: layer.top,
            bottom: layer.bottom,
            width: layer.width,
            height: layer.height,
            opacity: layer.opacity,
            background: `radial-gradient(ellipse at center, ${mistColor} 0%, transparent 68%)`,
            animation: `${layer.motion} ${layer.seconds / speed}s ease-in-out ${layer.delay}s infinite alternate`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
};
