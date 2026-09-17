/**
 * Panel 3: Tracking (Real-time Closed-Loop PAT)
 * Real-time camera view after closed-loop PAT control.
 * Features precision crosshair HUD, tracking reticle, lock tolerance circles,
 * dynamic alignment status, and AI feedforward compensation trajectory.
 */

import React, { useEffect, useRef } from 'react';
import { CameraSpecs, BeaconDetectionResult, PATState, ControlMode, TrackingArchitecture } from '../types';
import { Target, Lock, ShieldAlert, CheckCircle2, Zap, Compass } from 'lucide-react';

interface TrackingViewPanelProps {
  cameraSpecs: CameraSpecs;
  detection: BeaconDetectionResult;
  patState: PATState;
  controlMode: ControlMode;
  architecture: TrackingArchitecture;
  beamDivergenceUrad: number;
}

export const TrackingViewPanel: React.FC<TrackingViewPanelProps> = ({
  cameraSpecs,
  detection,
  patState,
  controlMode,
  architecture,
  beamDivergenceUrad,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isLocked = patState === 'LOCKED';
  const isTracking = patState === 'TRACKING' || patState === 'LOCKED';
  const isLost = patState === 'BEACON_LOST' || patState === 'REACQUIRING' || patState === 'LINK_LOST';
  const isAi = architecture === 'AI_ASSISTED';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 480;
    const cx = width / 2; // 320
    const cy = height / 2; // 240

    // 1. Dark space background
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // 2. Tolerance Rings around boresight center
    ctx.lineWidth = 1;
    
    // Outer dashed boundary
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Intermediate acquisition ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Fine Lock Ring (Beam Divergence tolerance gate)
    const lockRadiusPx = Math.max(12, Math.min(30, (beamDivergenceUrad / 25) * 16));
    ctx.strokeStyle = isLocked ? 'rgba(34, 197, 94, 0.7)' : 'rgba(56, 189, 248, 0.35)';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cx, cy, lockRadiusPx, 0, Math.PI * 2);
    ctx.stroke();

    // 3. High-Contrast Dashed Center Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Draw Optical Beacon in Tracking View
    if (detection.isInFov) {
      const bx = detection.x;
      const by = detection.y;
      const radius = detection.size;

      // Glow halo
      const grad = ctx.createRadialGradient(bx, by, 1, bx, by, radius * 3.2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, isLocked ? '#4ade80' : (isAi ? '#06b6d4' : '#38bdf8'));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, radius * 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Core centroid red dot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();

      // Tracking Reticle Square (Centered on detected beacon)
      const boxSize = 28;
      ctx.strokeStyle = isLocked ? '#22c55e' : (isTracking ? (isAi ? '#06b6d4' : '#38bdf8') : '#f59e0b');
      ctx.lineWidth = 1.6;
      ctx.strokeRect(bx - boxSize / 2, by - boxSize / 2, boxSize, boxSize);

      // AI Predictive Feedforward Vector (from current to predicted)
      if (isAi && detection.aiPrediction.isPredicting) {
        const px = detection.aiPrediction.predictedX;
        const py = detection.aiPrediction.predictedY;

        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small predictive target diamond
        const dia = 4;
        ctx.strokeStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(px, py - dia);
        ctx.lineTo(px + dia, py);
        ctx.lineTo(px, py + dia);
        ctx.lineTo(px - dia, py);
        ctx.closePath();
        ctx.stroke();
      }

      // Tracking error line vector from center to beacon
      if (Math.abs(detection.errorX) > 3 || Math.abs(detection.errorY) > 3) {
        ctx.strokeStyle = isAi ? 'rgba(6, 182, 212, 0.7)' : 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 5. Intelligent Reacquisition Sector Overlay (if beacon lost)
    if (isLost && isAi && detection.aiPrediction.reacquisitionSector) {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx + 40, cy - 20, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#06b6d4';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('AI PREDICTED REACQUISITION SECTOR', cx - 70, cy - 40);
    }

    // 6. Outer Frame & Corner Brackets
    const cornerSize = 16;
    ctx.strokeStyle = isLocked ? '#22c55e' : (isAi ? '#06b6d4' : '#00e5ff');
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

  }, [cameraSpecs, detection, patState, isLocked, isTracking, isLost, beamDivergenceUrad, isAi]);

  return (
    <div className="relative w-full h-full flex flex-col rounded-xl overflow-hidden hud-panel">
      {/* Panel Header */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
          <span className="font-tech text-xs tracking-wider text-cyan-300 font-semibold uppercase">
            3. Tracking (Closed-Loop PAT)
          </span>
        </div>

        {/* Lock status pill */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-slate-400">PAT:</span>
          <span
            className={`px-2 py-0.5 rounded font-semibold ${
              isLocked
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : isTracking
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : isLost
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {patState.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Canvas View */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full object-contain"
        />

        {/* Dynamic Status Text */}
        <div className="absolute top-3 left-4 pointer-events-none flex flex-col gap-0.5 font-mono">
          {isLocked ? (
            <>
              <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Locked & Tracking
              </span>
              <span className="text-emerald-300 font-medium text-xs">
                Beacon centered! (Offset: ΔX={detection.errorX}px, ΔY={detection.errorY}px)
              </span>
            </>
          ) : isTracking ? (
            <>
              <span className="text-cyan-400 font-bold text-sm flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400 animate-spin" />
                {isAi ? 'AI Predictive Tracking Active...' : 'Traditional PID Slewing...'}
              </span>
              <span className="text-cyan-200/90 text-xs">
                {isAi ? 'Kalman lead feedforward canceling motor delay' : 'Reactive feedback trailing moving target'}
              </span>
            </>
          ) : isLost ? (
            <>
              <span className="text-red-400 font-bold text-sm flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                BEACON LOST
              </span>
              <span className="text-red-300 text-xs">
                {isAi ? 'Scanning predicted trajectory sector...' : 'Blind Archimedean spiral search...'}
              </span>
            </>
          ) : (
            <>
              <span className="text-amber-400 font-bold text-sm">
                Searching / Acquiring...
              </span>
              <span className="text-amber-200/80 text-xs">
                Scanning FOV uncertainty cone
              </span>
            </>
          )}
        </div>

        {/* Angular Error Callout (Top-Right) */}
        <div className="absolute top-3 right-4 pointer-events-none bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/60 font-mono text-[11px] text-right">
          <div className="text-slate-400 text-[10px]">POINTING ERROR</div>
          <div className={`font-bold text-sm ${detection.totalAngularError <= beamDivergenceUrad ? 'text-emerald-300' : 'text-amber-300'}`}>
            {detection.totalAngularError < 9000 ? `${detection.totalAngularError.toFixed(2)} µrad` : '---'}
          </div>
          <div className="text-[10px] text-slate-400">
            Beam Div: {beamDivergenceUrad} µrad
          </div>
        </div>

        {/* Architecture Badge (Bottom-Left) */}
        <div className="absolute bottom-2.5 left-4 pointer-events-none text-[10px] font-mono bg-slate-950/80 px-2 py-1 rounded border border-slate-800 flex items-center gap-2">
          <span className={isAi ? 'text-cyan-400 font-bold' : 'text-amber-400 font-bold'}>
            {isAi ? '⚡ AI-Assisted (Kalman + Feedforward)' : '⚙️ Traditional PID'}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">Target Center: (320, 240)</span>
        </div>
      </div>

      {/* Footer Sub-label */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span>Camera view (after control closed loop)</span>
        <span className={isLocked ? 'text-emerald-400' : 'text-slate-400'}>
          {isLocked ? 'OPTICAL LINK ALIGNED' : 'GIMBAL SLEWING'}
        </span>
      </div>
    </div>
  );
};
