/**
 * Panel 6: Real-time Graphs and Beacon Position in Image Plot
 * Matches Panel 6 of reference diagram (2D Image Position Plot: X [0..640], Y [0..480])
 * plus tabs for Tracking Error vs Time, Angular Error, Gimbal Yaw/Pitch, and Optical SNR.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TelemetryPoint, BeaconDetectionResult } from '../types';
import { LineChart, Crosshair, TrendingDown, Radio, Activity } from 'lucide-react';

interface RealTimePlotsProps {
  detection: BeaconDetectionResult;
  telemetryHistory: TelemetryPoint[];
  beamDivergenceUrad: number;
}

export const RealTimePlots: React.FC<RealTimePlotsProps> = ({
  detection,
  telemetryHistory,
  beamDivergenceUrad,
}) => {
  const [activeTab, setActiveTab] = useState<'position2d' | 'pixelError' | 'angularError' | 'gimbal' | 'snr'>('position2d');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid background
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;

    if (activeTab === 'position2d') {
      // -------------------------------------------------------------
      // PANEL 6: BEACON POSITION IN IMAGE (REAL-TIME PLOT)
      // Matches reference image layout:
      // X: 0 .. 640 (horizontal)
      // Y: 0 .. 480 (vertical, top to bottom or standard sensor coordinates)
      // -------------------------------------------------------------
      const padLeft = 45;
      const padRight = 20;
      const padTop = 25;
      const padBottom = 30;

      const plotW = width - padLeft - padRight;
      const plotH = height - padTop - padBottom;

      // Plot border
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.strokeRect(padLeft, padTop, plotW, plotH);

      // Grid lines & Axis values
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';

      // X ticks: 0, 120, 240, 360, 480, 640
      const xTicks = [0, 120, 240, 360, 480, 640];
      xTicks.forEach((tickVal) => {
        const xPos = padLeft + (tickVal / 640) * plotW;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.beginPath();
        ctx.moveTo(xPos, padTop);
        ctx.lineTo(xPos, padTop + plotH);
        ctx.stroke();

        ctx.fillText(tickVal.toString(), xPos, padTop + plotH + 16);
      });

      // Y ticks: 0, 120, 240, 360, 480
      const yTicks = [0, 120, 240, 360, 480];
      ctx.textAlign = 'right';
      yTicks.forEach((tickVal) => {
        const yPos = padTop + (tickVal / 480) * plotH;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.beginPath();
        ctx.moveTo(padLeft, yPos);
        ctx.lineTo(padLeft + plotW, yPos);
        ctx.stroke();

        ctx.fillText(tickVal.toString(), padLeft - 8, yPos + 4);
      });

      // Axis labels
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Y (pixels)', padLeft - 8, padTop - 10);
      ctx.textAlign = 'center';
      ctx.fillText('X (pixels)', padLeft + plotW / 2, padTop + plotH + 28);

      // Center crosshair (Cx = 320, Cy = 240)
      const cxPos = padLeft + (320 / 640) * plotW;
      const cyPos = padTop + (240 / 480) * plotH;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, cyPos);
      ctx.lineTo(padLeft + plotW, cyPos);
      ctx.moveTo(cxPos, padTop);
      ctx.lineTo(cxPos, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Red 'X' marker (Matches reference: "x Image center")
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      const arm = 5;
      ctx.beginPath();
      ctx.moveTo(cxPos - arm, cyPos - arm);
      ctx.lineTo(cxPos + arm, cyPos + arm);
      ctx.moveTo(cxPos - arm, cyPos + arm);
      ctx.lineTo(cxPos + arm, cyPos - arm);
      ctx.stroke();

      // Recent beacon trajectory trail
      if (telemetryHistory.length > 1) {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        telemetryHistory.forEach((pt, idx) => {
          const px = padLeft + (Math.max(0, Math.min(640, pt.beaconX)) / 640) * plotW;
          const py = padTop + (Math.max(0, Math.min(480, pt.beaconY)) / 480) * plotH;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // Current Beacon Position: Green Dot with Glow Halo
      if (detection.detected) {
        const curPx = padLeft + (Math.max(0, Math.min(640, detection.x)) / 640) * plotW;
        const curPy = padTop + (Math.max(0, Math.min(480, detection.y)) / 480) * plotH;

        // Glow ring
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(curPx, curPy, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Inner solid green dot
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(curPx, curPy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Predicted position marker (Cyan ring & dot)
        if (detection.aiPrediction && detection.aiPrediction.isPredicting) {
          const predPx = padLeft + (Math.max(0, Math.min(640, detection.aiPrediction.predictedX)) / 640) * plotW;
          const predPy = padTop + (Math.max(0, Math.min(480, detection.aiPrediction.predictedY)) / 480) * plotH;

          // Lead line from actual to predicted
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(curPx, curPy);
          ctx.lineTo(predPx, predPy);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(predPx, predPy, 6, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#00e5ff';
          ctx.beginPath();
          ctx.arc(predPx, predPy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Legend in Top-Right (Matches reference photo)
      const legX = padLeft + plotW - 145;
      const legY = padTop + 14;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(legX - 10, legY - 10, 150, 56);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.strokeRect(legX - 10, legY - 10, 150, 56);

      // Green dot legend
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(legX, legY + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'left';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('Beacon position', legX + 10, legY + 5);

      // Red X legend
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(legX - 3, legY + 18 - 3);
      ctx.lineTo(legX + 3, legY + 18 + 3);
      ctx.moveTo(legX - 3, legY + 18 + 3);
      ctx.lineTo(legX + 3, legY + 18 - 3);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Image center', legX + 10, legY + 21);

      // Cyan predicted legend
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(legX, legY + 34, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#00e5ff';
      ctx.fillText('AI Predicted lead', legX + 10, legY + 37);

    } else {
      // -------------------------------------------------------------
      // TIME SERIES GRAPHS (Tracking Error, Angular Error, Gimbal, SNR)
      // -------------------------------------------------------------
      const padLeft = 55;
      const padRight = 20;
      const padTop = 25;
      const padBottom = 30;
      const plotW = width - padLeft - padRight;
      const plotH = height - padTop - padBottom;

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.strokeRect(padLeft, padTop, plotW, plotH);

      // Horizontal grid lines
      for (let i = 0; i <= 4; i++) {
        const y = padTop + (i / 4) * plotH;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();
      }

      if (telemetryHistory.length > 2) {
        let maxVal = 50;
        let unit = 'px';
        let title = 'Tracking Error vs Time';

        if (activeTab === 'pixelError') {
          maxVal = 40;
          unit = 'px';
          title = 'Pixel Tracking Error |ΔX|, |ΔY| (px)';
        } else if (activeTab === 'angularError') {
          maxVal = Math.max(50, beamDivergenceUrad * 2.5);
          unit = 'µrad';
          title = 'Total Angular Pointing Error (µrad)';
        } else if (activeTab === 'gimbal') {
          maxVal = 30;
          unit = 'deg';
          title = 'Gimbal Gimbal Yaw / Pitch Angles (deg)';
        } else if (activeTab === 'snr') {
          maxVal = 30;
          unit = 'dB';
          title = 'Optical SNR (dB) & Threshold (12 dB)';
        }

        // Draw Title & Y Axis label
        ctx.fillStyle = '#38bdf8';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(title, padLeft, padTop - 8);

        // Y-axis tick values
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94a3b8';
        for (let i = 0; i <= 4; i++) {
          const val = (maxVal * (4 - i)) / 4;
          const y = padTop + (i / 4) * plotH;
          ctx.fillText(`${val.toFixed(0)} ${unit}`, padLeft - 8, y + 4);
        }

        // Reference Threshold Line (e.g. Beam divergence for angular error, or 12dB for SNR)
        if (activeTab === 'angularError') {
          const threshY = padTop + plotH - (beamDivergenceUrad / maxVal) * plotH;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(padLeft, threshY);
          ctx.lineTo(padLeft + plotW, threshY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#f59e0b';
          ctx.textAlign = 'right';
          ctx.fillText(`Beam Div (${beamDivergenceUrad} µrad)`, padLeft + plotW - 6, threshY - 4);
        } else if (activeTab === 'snr') {
          const threshY = padTop + plotH - (12 / maxVal) * plotH;
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(padLeft, threshY);
          ctx.lineTo(padLeft + plotW, threshY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'right';
          ctx.fillText('1e-9 BER Threshold (12 dB)', padLeft + plotW - 6, threshY - 4);
        }

        // Plot line data
        const len = telemetryHistory.length;
        ctx.lineWidth = 2;

        if (activeTab === 'pixelError') {
          ctx.strokeStyle = '#38bdf8';
          ctx.beginPath();
          telemetryHistory.forEach((pt, i) => {
            const x = padLeft + (i / (len - 1)) * plotW;
            const y = padTop + plotH - Math.min(plotH, (pt.errorPx / maxVal) * plotH);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        } else if (activeTab === 'angularError') {
          ctx.strokeStyle = '#4ade80';
          ctx.beginPath();
          telemetryHistory.forEach((pt, i) => {
            const x = padLeft + (i / (len - 1)) * plotW;
            const y = padTop + plotH - Math.min(plotH, (pt.angularErrorUrad / maxVal) * plotH);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        } else if (activeTab === 'gimbal') {
          // Yaw in cyan
          ctx.strokeStyle = '#06b6d4';
          ctx.beginPath();
          telemetryHistory.forEach((pt, i) => {
            const x = padLeft + (i / (len - 1)) * plotW;
            const y = padTop + plotH / 2 - (pt.yaw / maxVal) * (plotH / 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Pitch in amber
          ctx.strokeStyle = '#f59e0b';
          ctx.beginPath();
          telemetryHistory.forEach((pt, i) => {
            const x = padLeft + (i / (len - 1)) * plotW;
            const y = padTop + plotH / 2 - (pt.pitch / maxVal) * (plotH / 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        } else if (activeTab === 'snr') {
          ctx.strokeStyle = '#22c55e';
          ctx.beginPath();
          telemetryHistory.forEach((pt, i) => {
            const x = padLeft + (i / (len - 1)) * plotW;
            const y = padTop + plotH - Math.min(plotH, (pt.snr / maxVal) * plotH);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }

        // X-axis label
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('Time Elapsed (Rolling 15s history)', padLeft + plotW / 2, padTop + plotH + 20);
      }
    }
  }, [detection, telemetryHistory, activeTab, beamDivergenceUrad]);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden hud-panel font-mono text-xs">
      {/* Header bar with graph tabs */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-tech text-xs tracking-wider text-cyan-300 font-semibold uppercase">
            6. Beacon Position in Image (Real-Time Plot)
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab('position2d')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'position2d' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D Image Position
          </button>
          <button
            onClick={() => setActiveTab('pixelError')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'pixelError' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tracking Error
          </button>
          <button
            onClick={() => setActiveTab('angularError')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'angularError' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Angular Error (µrad)
          </button>
          <button
            onClick={() => setActiveTab('gimbal')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'gimbal' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gimbal Angles
          </button>
          <button
            onClick={() => setActiveTab('snr')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'snr' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Optical SNR
          </button>
        </div>
      </div>

      {/* Canvas Display */}
      <div className="p-2 flex-1 flex items-center justify-center bg-slate-950/90 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={580}
          height={240}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};
