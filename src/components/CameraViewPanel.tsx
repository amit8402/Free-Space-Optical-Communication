/**
 * Panel 2: Camera View (What AI / Optical Sensor Sees)
 * Displays the 640x480 sensor canvas with optical beacon point spread function,
 * center crosshair (320, 240), AI detection box/centroid,
 * AND AI Motion Prediction Vector leading to Predicted Future Position (X_pred, Y_pred).
 */

import React, { useEffect, useRef, useState } from 'react';
import { CameraSpecs, BeaconDetectionResult, DetectionMode, PATState, TrackingArchitecture, Disturbances } from '../types';
import { Camera, Scan, Sliders, Eye, AlertTriangle, Crosshair, Navigation, Zap, ShieldCheck } from 'lucide-react';

interface CameraViewPanelProps {
  cameraSpecs: CameraSpecs;
  detection: BeaconDetectionResult;
  patState: PATState;
  detectionMode: DetectionMode;
  onDetectionModeChange: (mode: DetectionMode) => void;
  architecture: TrackingArchitecture;
  onArchitectureChange: (arch: TrackingArchitecture) => void;
  backgroundNoise: number;
  disturbances?: Disturbances;
}

export const CameraViewPanel: React.FC<CameraViewPanelProps> = ({
  cameraSpecs,
  detection,
  patState,
  detectionMode,
  onDetectionModeChange,
  architecture,
  onArchitectureChange,
  backgroundNoise,
  disturbances,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [colorMode, setColorMode] = useState<'greyscale' | 'thermal' | 'binary'>('greyscale');
  const [thresholdLevel, setThresholdLevel] = useState<number>(65);

  const isAi = architecture === 'AI_ASSISTED';

  // Render simulated sensor frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 480;

    // 1. Clear background (deep space sensor dark current)
    if (colorMode === 'binary') {
      ctx.fillStyle = '#000000';
    } else if (colorMode === 'thermal') {
      ctx.fillStyle = '#070a1a';
    } else {
      ctx.fillStyle = '#0a0e17';
    }
    ctx.fillRect(0, 0, width, height);

    // 2. Draw sensor background noise & dark pixels
    const noiseLevel = ((disturbances?.imageNoise ?? disturbances?.sensorNoise ?? backgroundNoise) * 0.5 + (disturbances?.gaussianNoise ?? 10) * 0.5);
    const noiseDensity = 0.003 + (noiseLevel / 100) * 0.025;
    const numNoisePixels = Math.floor(width * height * noiseDensity);
    for (let i = 0; i < numNoisePixels; i++) {
      const nx = Math.random() * width;
      const ny = Math.random() * height;
      const val = Math.floor(Math.random() * (colorMode === 'binary' ? 120 : 80));
      if (colorMode === 'binary' && val > thresholdLevel) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(nx, ny, 1, 1);
      } else if (colorMode === 'thermal') {
        ctx.fillStyle = `rgb(${val * 2}, ${Math.floor(val * 0.5)}, ${val * 3})`;
        ctx.fillRect(nx, ny, 1, 1);
      } else {
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(nx, ny, 1, 1);
      }
    }

    // 2b. Cosmic rays / hot pixels
    const hotPixelCount = Math.floor(((disturbances?.hotPixels ?? 5) + (disturbances?.cosmicRayEvents ?? 5)) / 15);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < hotPixelCount; i++) {
      const hx = (Math.sin(i * 99 + performance.now() * 0.001) * 0.5 + 0.5) * width;
      const hy = (Math.cos(i * 77 + performance.now() * 0.001) * 0.5 + 0.5) * height;
      ctx.fillRect(hx, hy, 2, 2);
    }

    // 3. Solar stray light / background flare if high noise
    const solarGlare = disturbances?.strayLightSunlight ?? backgroundNoise;
    if (solarGlare > 15) {
      const flareGrad = ctx.createRadialGradient(width * 0.85, 0, 10, width * 0.85, 0, 320);
      const alpha = ((solarGlare - 15) / 85) * 0.4;
      flareGrad.addColorStop(0, `rgba(255, 230, 150, ${alpha})`);
      flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 3b. Draw Distractors (Celestial bodies / debris / reflections)
    if (detection.distractorPositions && detection.distractorPositions.length > 0) {
      detection.distractorPositions.forEach((dp, idx) => {
        // Distractor spot
        const dGrad = ctx.createRadialGradient(dp.x, dp.y, 1, dp.x, dp.y, 12);
        dGrad.addColorStop(0, 'rgba(253, 224, 71, 0.9)');
        dGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.4)');
        dGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(dp.x - 10, dp.y - 10, 20, 20);
        ctx.setLineDash([]);

        ctx.font = '8px "JetBrains Mono", monospace';
        if (isAi) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`DISTRACTOR #${idx + 1} [AI REJECTED]`, dp.x - 22, dp.y - 12);
        } else {
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`CANDIDATE #${idx + 1}`, dp.x - 16, dp.y - 12);
        }
      });
    }

    // 4. Draw Optical Beacon Spot (Point Spread Function / Airy Disk)
    if (detection.isInFov) {
      const bx = detection.x;
      const by = detection.y;
      const radius = detection.size;

      if (colorMode === 'binary') {
        // Binary threshold mask
        if (detection.rawIntensity >= thresholdLevel) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bx, by, Math.max(3, radius * 0.65), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Gaussian blur & Airy rings
        const grad = ctx.createRadialGradient(bx, by, 1, bx, by, radius * 2.8);
        if (colorMode === 'thermal') {
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.2, '#ffea00');
          grad.addColorStop(0.5, '#ff3d00');
          grad.addColorStop(0.8, '#7b1fa2');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.25, '#e0f2fe');
          grad.addColorStop(0.6, 'rgba(186, 230, 253, 0.45)');
          grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, radius * 3.0, 0, Math.PI * 2);
        ctx.fill();

        // Bright optical core (Airy disc peak)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(2, radius * 0.35), 0, Math.PI * 2);
        ctx.fill();

        // Subtle diffraction starburst spikes (anamorphic lens flare)
        ctx.strokeStyle = colorMode === 'thermal' ? 'rgba(255, 234, 0, 0.3)' : 'rgba(224, 242, 254, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx - radius * 4.5, by);
        ctx.lineTo(bx + radius * 4.5, by);
        ctx.moveTo(bx, by - radius * 4.5);
        ctx.lineTo(bx, by + radius * 4.5);
        ctx.stroke();
      }

      // Draw Raw Jittered measurement vs Filtered position
      if (detection.rawX !== undefined && detection.rawY !== undefined && isAi) {
        // Raw position (jitter ring in yellow)
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(detection.rawX, detection.rawY, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 5. Computer Vision Overlays (Bounding Box & Centroid)
      if (detection.detected) {
        const boxSize = Math.max(26, radius * 3.5);
        const halfBox = boxSize / 2;

        // Bounding Box (Green for detected beacon)
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - halfBox, by - halfBox, boxSize, boxSize);

        // Corner tick accents
        const tick = 6;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx - halfBox, by - halfBox + tick);
        ctx.lineTo(bx - halfBox, by - halfBox);
        ctx.lineTo(bx - halfBox + tick, by - halfBox);
        ctx.moveTo(bx + halfBox - tick, by - halfBox);
        ctx.lineTo(bx + halfBox, by - halfBox);
        ctx.lineTo(bx + halfBox, by - halfBox + tick);
        ctx.moveTo(bx - halfBox, by + halfBox - tick);
        ctx.lineTo(bx - halfBox, by + halfBox);
        ctx.lineTo(bx - halfBox + tick, by + halfBox);
        ctx.moveTo(bx + halfBox - tick, by + halfBox);
        ctx.lineTo(bx + halfBox, by + halfBox);
        ctx.lineTo(bx + halfBox, by + halfBox - tick);
        ctx.stroke();

        // Sub-pixel Centroid marker (Red dot with circle)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.stroke();

        // Label: Actual Beacon Position
        ctx.fillStyle = '#22c55e';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`BEACON (${Math.round(bx)}, ${Math.round(by)})`, bx - halfBox, by - halfBox - 5);

        // ==========================================
        // 6. AI MOTION PREDICTION VECTOR & MARKER
        // ==========================================
        if (isAi && detection.aiPrediction.isPredicting) {
          const px = detection.aiPrediction.predictedX;
          const py = detection.aiPrediction.predictedY;

          // Dotted trajectory forward prediction line
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(px, py);
          ctx.stroke();
          ctx.setLineDash([]);

          // Predicted Position Marker (Cyan Target Ring)
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#00e5ff';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Predicted Position Tag
          ctx.fillStyle = '#00e5ff';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(`PREDICTED (${Math.round(px)}, ${Math.round(py)})`, px + 9, py + 3);
        }
      }
    }

    // 7. Sensor Frame Grid & Center Crosshair (Cx = 320, Cy = 240)
    const cx = width / 2;
    const cy = height / 2;

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Center Crosshair Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('Center (320, 240)', cx + 8, cy - 8);

  }, [cameraSpecs, detection, patState, colorMode, thresholdLevel, backgroundNoise, detectionMode, isAi, disturbances]);

  return (
    <div className="relative w-full h-full flex flex-col rounded-xl overflow-hidden hud-panel">
      {/* Panel Header */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 z-10 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-tech text-xs tracking-wider text-emerald-300 font-semibold uppercase">
            2. Camera View (What AI Sees)
          </span>
          {detection.detectionQuality && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
              detection.detectionQuality === 'EXCELLENT' ? 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-300' :
              detection.detectionQuality === 'GOOD' ? 'bg-cyan-950/70 border border-cyan-500/60 text-cyan-300' :
              detection.detectionQuality === 'DEGRADED' ? 'bg-amber-950/70 border border-amber-500/60 text-amber-300' :
              'bg-red-950/70 border border-red-500/60 text-red-300'
            }`}>
              {detection.detectionQuality}
            </span>
          )}
        </div>

        {/* Traditional vs AI Mode Switcher */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onArchitectureChange('TRADITIONAL')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              !isAi
                ? 'bg-amber-500/30 text-amber-200 border border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            TRADITIONAL PAT
          </button>
          <button
            onClick={() => onArchitectureChange('AI_ASSISTED')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
              isAi
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-cyan-300" />
            AI-ASSISTED PAT
          </button>
        </div>
      </div>

      {/* Sensor Canvas Area */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full object-contain"
        />

        {/* Overlay Telemetry */}
        <div className="absolute top-2.5 left-3 pointer-events-none flex flex-col gap-1 text-[11px] font-mono">
          {detection.detected ? (
            <div className="bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-lg border border-emerald-500/40 text-emerald-300 flex flex-col gap-0.5 shadow-lg max-w-[280px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Beacon Detected (Confidence: {detection.confidence}%)
              </span>
              <div className="flex items-center justify-between gap-3 text-slate-200">
                <span>Beacon Pos:</span>
                <span className="font-bold text-white">X={Math.round(detection.x)}, Y={Math.round(detection.y)}</span>
              </div>
              {detection.rawX !== undefined && isAi && (
                <div className="flex items-center justify-between gap-3 text-amber-300 text-[10px]">
                  <span>Raw Sensor:</span>
                  <span>X={Math.round(detection.rawX)}, Y={Math.round(detection.rawY)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 text-cyan-300">
                <span>Pixel Error:</span>
                <span className="font-bold">
                  ΔX={detection.errorX >= 0 ? `+${detection.errorX}` : detection.errorX}, ΔY={detection.errorY >= 0 ? `+${detection.errorY}` : detection.errorY} px
                </span>
              </div>

              {/* AI Prediction Readout */}
              {isAi && (
                <div className="mt-1 pt-1 border-t border-cyan-500/30 flex flex-col gap-0.5 text-[10px]">
                  <div className="flex justify-between text-cyan-200">
                    <span>Predicted (t + {detection.aiPrediction.lookaheadSeconds}s):</span>
                    <span className="font-bold text-cyan-300">
                      X={Math.round(detection.aiPrediction.predictedX)}, Y={Math.round(detection.aiPrediction.predictedY)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Est. Velocity:</span>
                    <span className="text-white">
                      Vx={detection.aiPrediction.velocityX > 0 ? `+` : ''}{detection.aiPrediction.velocityX} px/s, Vy={detection.aiPrediction.velocityY > 0 ? `+` : ''}{detection.aiPrediction.velocityY} px/s
                    </span>
                  </div>
                </div>
              )}

              {/* Active Disturbance badges */}
              {detection.activeDisturbances && detection.activeDisturbances.length > 0 && (
                <div className="mt-1 pt-1 border-t border-slate-800 flex flex-wrap gap-1">
                  {detection.activeDisturbances.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-800/90 text-amber-300 text-[8px] font-mono border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-lg border border-red-500/50 text-red-400 flex items-center gap-2 shadow-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              <div>
                <div className="font-bold">BEACON LOST (OUT OF FOV)</div>
                <div className="text-[10px] text-slate-400">
                  {isAi ? 'AI Predictive Sector Reacquisition Active' : 'Traditional Blind Spiral Scan Active'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optical Telemetry Badge (Bottom-Right) */}
        <div className="absolute bottom-2.5 right-3 pointer-events-none bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/60 text-[10px] font-mono text-slate-300 flex flex-col gap-0.5">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Resolution:</span>
            <span className="text-white">640 × 480</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Mode:</span>
            <span className={isAi ? 'text-cyan-300 font-bold' : 'text-amber-300 font-bold'}>
              {isAi ? 'AI-ASSISTED' : 'TRADITIONAL'}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Confidence:</span>
            <span className={detection.confidence > 80 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {detection.confidence}%
            </span>
          </div>
          {detection.distractorCount !== undefined && detection.distractorCount > 0 && (
            <div className="flex justify-between gap-3 text-amber-400">
              <span>Distractors:</span>
              <span className="font-bold">{detection.distractorCount} in FOV</span>
            </div>
          )}
        </div>

        {/* Filter Palette Switcher (Bottom-Left) */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1 bg-slate-950/85 p-1 rounded-md border border-slate-700/60 text-[10px] font-mono">
          <button
            onClick={() => setColorMode('greyscale')}
            className={`px-1.5 py-0.5 rounded ${colorMode === 'greyscale' ? 'bg-slate-700 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Grey
          </button>
          <button
            onClick={() => setColorMode('thermal')}
            className={`px-1.5 py-0.5 rounded ${colorMode === 'thermal' ? 'bg-slate-700 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Thermal
          </button>
          <button
            onClick={() => setColorMode('binary')}
            className={`px-1.5 py-0.5 rounded ${colorMode === 'binary' ? 'bg-slate-700 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Binary
          </button>
        </div>
      </div>

      {/* Footer Sub-label */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span>Frame from simulated 640×480 optical camera sensor</span>
        <span className={isAi ? 'text-cyan-400 font-semibold' : 'text-amber-400 font-semibold'}>
          {isAi ? 'AI Motion Prediction + Kalman Filter: ACTIVE' : 'Reactive PID (No Prediction)'}
        </span>
      </div>
    </div>
  );
};
