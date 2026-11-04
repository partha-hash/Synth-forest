/**
 * Dynamic virtual joystick for the left side of the forest scene.
 * Uses window-level touch listeners instead of an invisible overlay, so taps
 * remain available to Three.js scene raycasting.
 */
import React, { useEffect, useRef, useState } from 'react';

interface TransparentJoystickProps {
  accentColor: string;
  onMove: (x: number, y: number) => void;
  onPulse: () => void;
}

type Point = { x: number; y: number };

export const TransparentJoystick: React.FC<TransparentJoystickProps> = ({
  accentColor,
  onMove,
  onPulse,
}) => {
  const [basePos, setBasePos] = useState<Point | null>(null);
  const [stickPos, setStickPos] = useState<Point | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const basePosRef = useRef<Point | null>(null);
  const onMoveRef = useRef(onMove);
  const maxRadius = 45;

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    const isControlTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest(
        'button, input, select, textarea, [role="button"], .no-joystick'
      ));
    };

    const reset = () => {
      touchIdRef.current = null;
      basePosRef.current = null;
      setBasePos(null);
      setStickPos(null);
      onMoveRef.current(0, 0);
    };

    const handleTouchStart = (event: TouchEvent) => {
      // Leave multi-finger gestures to ForestScene's biome gesture handler.
      if (event.touches.length >= 2) {
        if (touchIdRef.current !== null) reset();
        return;
      }
      if (touchIdRef.current !== null || isControlTarget(event.target)) return;

      const touch = event.changedTouches[0];
      if (!touch || touch.clientX > window.innerWidth * 0.65) return;

      const point = { x: touch.clientX, y: touch.clientY };
      touchIdRef.current = touch.identifier;
      basePosRef.current = point;
      setBasePos(point);
      setStickPos(point);
      onMoveRef.current(0, 0);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        if (touchIdRef.current !== null) reset();
        return;
      }
      const id = touchIdRef.current;
      const base = basePosRef.current;
      if (id === null || !base) return;

      const touch = Array.from(event.changedTouches).find(item => item.identifier === id);
      if (!touch) return;

      const dx = touch.clientX - base.x;
      const dy = touch.clientY - base.y;
      const distance = Math.hypot(dx, dy);
      const scale = distance > maxRadius ? maxRadius / distance : 1;
      const clampedX = dx * scale;
      const clampedY = dy * scale;

      setStickPos({ x: base.x + clampedX, y: base.y + clampedY });
      onMoveRef.current(clampedX / maxRadius, clampedY / maxRadius);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const id = touchIdRef.current;
      if (id === null) return;
      if (Array.from(event.changedTouches).some(item => item.identifier === id)) reset();
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      onMoveRef.current(0, 0);
    };
  }, []);

  return (
    <>
      {/* Visual-only joystick: it never intercepts scene touches. */}
      {basePos && stickPos && (
        <div className="fixed inset-0 pointer-events-none z-30" aria-hidden="true">
          <div
            className="absolute rounded-full border border-white/30 backdrop-blur-[2px]"
            style={{
              left: `${basePos.x - maxRadius}px`,
              top: `${basePos.y - maxRadius}px`,
              width: `${maxRadius * 2}px`,
              height: `${maxRadius * 2}px`,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              boxShadow: `0 0 20px ${accentColor}33`,
            }}
          >
            <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white/20" />
          </div>
          <div
            className="absolute rounded-full border border-white/50 shadow-md"
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

      <div className="fixed bottom-24 right-4 z-30 sm:hidden pointer-events-auto no-scene-drag">
        <button
          onClick={onPulse}
          className="w-14 h-14 rounded-full border border-emerald-500/30 flex flex-col items-center justify-center text-emerald-200 backdrop-blur-xl shadow-2xl active:scale-95 transition-transform cursor-pointer no-scene-drag"
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
