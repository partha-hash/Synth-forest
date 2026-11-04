import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

interface AudioVisualizerProps {
  accentColor: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ accentColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastDraw = 0;
    const frameInterval = 1000 / 30;
    const freqData = new Uint8Array(64);
    const timeData = new Uint8Array(64);

    const render = (timestamp: number) => {
      animId = requestAnimationFrame(render);
      if (timestamp - lastDraw < frameInterval) return;
      lastDraw = timestamp;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      audioEngine.getFrequencyData(freqData);
      audioEngine.getTimeDomainData(timeData);

      // Draw subtle background grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw Frequency Bars
      const barCount = 32;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i] / 255;
        const barHeight = val * (height * 0.85);

        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.35 + val * 0.65;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1.5, barHeight);
      }

      // Draw Oscilloscope Waveform overlay
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const sliceWidth = width / timeData.length;
      let x = 0;

      for (let i = 0; i < timeData.length; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
      ctx.globalAlpha = 1.0;
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [accentColor]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-emerald-500/25 bg-[#020e09]/80">
      <canvas
        ref={canvasRef}
        width={180}
        height={38}
        className="block w-full h-[38px]"
      />
    </div>
  );
};
