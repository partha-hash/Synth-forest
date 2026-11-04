/**
 * Transparent Everywhere Virtual Joystick
 * Provides an unobtrusive, dynamic on-screen thumbstick that appears
 * wherever the user touches, feeding silky-smooth analog 2D movement.
 */

import React, { useEffect, useRef, useState } from 'react';

interface TransparentJoystickProps {
  accentColor: string;
  onMove: (x: number, y: number) => void;
  onPulse: () => void;
}

export const TransparentJoystick: React.FC<TransparentJoystickProps> = ({
  accentColor,
  onMove,
  onPulse,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [basePos, setBasePos] = useState<{ x: number; y: number } | null>(null);
  const [stickPos, setStickPos] = useState<{ x: number; y: number } | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const basePosRef = useRef<{ x: number; y: number } | null>(null);

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only capture if touch is in the left 60% of the screen and not inside dock buttons
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (touch.clientX > window.innerWidth * 0.65) return;

    touchIdRef.current = touch.identifier;
    const pos = { x: touch.clientX, y: touch.clientY };
    basePosRef.current = pos;
    setBasePos(pos);
    setStickPos(pos);
    setIsActive(true);
    onMove(0, 0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchIdRef.current === null || !basePosRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const dx = touch.clientX - basePosRef.current.x;
        const dy = touch.clientY - basePosRef.current.y;
        const dist = Math.hypot(dx, dy);

        let clampedX = dx;
        let clampedY = dy;
        if (dist > maxRadius) {
          clampedX = (dx / dist) * maxRadius;
          clampedY = (dy / dist) * maxRadius;
        }

        setStickPos({
          x: basePosRef.current.x + clampedX,
          y: basePosRef.current.y + clampedY,
        });

        // Normalize output -1 to 1 (x: strafe, y: forward/back)
        const normX = clampedX / maxRadius;
        const normY = clampedY / maxRadius;
        onMove(normX, normY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        basePosRef.current = null;
        setIsActive(false);
        setBasePos(null);
        setStickPos(null);
        onMove(0, 0);
        break;
      }
    }
  };

  return (
    <>
      {/* Invisible Left-Half Touch Zone */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="fixed inset-y-0 left-0 w-[55vw] z-20 pointer-events-auto touch-none no-scene-drag"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      />

      {/* Floating Dynamic Translucent Joystick Visuals */}
      {isActive && basePos && stickPos && (
        <div className="fixed inset-0 pointer-events-none z-30">
          {/* Base Ring */}
          <div
            className="absolute rounded-full border border-white/30 backdrop-blur-[2px] transition-opacity duration-150"
            style={{
              left: `${basePos.x - maxRadius}px`,
              top: `${basePos.y - maxRadius}px`,
              width: `${maxRadius * 2}px`,
              height: `${maxRadius * 2}px`,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              boxShadow: `0 0 20px ${accentColor}33`,
            }}
          >
            {/* Center Crosshair Dot */}
            <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white/20" />
          </div>

          {/* Inner Floating Thumb Knob */}
          <div
            className="absolute rounded-full border border-white/50 shadow-md transition-transform"
            style={{
              left: `${stickPos.x - 20}px`,
              top: `${stickPos.y - 20}px`,
              width: '40px',
              height: '40px',
              backgroundColor: `${accentColor}88`,
              boxShadow: `0 0 16px ${accentColor}`,
            }}
          />
        </div>
      )}

      {/* Subtle Mobile Floating Pulse Orb (Right Bottom) */}
      <div className="fixed bottom-24 right-4 z-30 sm:hidden pointer-events-auto">
        <button
          onClick={onPulse}
          className="w-14 h-14 rounded-full border border-emerald-500/30 flex flex-col items-center justify-center text-emerald-200 backdrop-blur-xl shadow-2xl active:scale-95 transition-transform cursor-pointer"
          style={{
            backgroundColor: '#03150ecc',
            boxShadow: `0 0 20px ${accentColor}55`,
          }}
          aria-label="Resonant Harmonic Pulse"
        >
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase">PULSE</span>
        </button>
      </div>
    </>
  );
};
