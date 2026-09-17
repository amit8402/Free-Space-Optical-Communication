/**
 * Panel 5: Processing Pipeline
 * Real-time animated pipeline depicting the closed-loop sequence:
 * Terminal B moves -> Emits beacon -> Camera observes -> AI Detects & Glare Rejection ->
 * AI Estimates & Predicts -> Predictive Correction -> Smooth Pan/Tilt -> Kept Centered.
 */

import React from 'react';
import { PATState, BeaconDetectionResult, ControlMode, TrackingArchitecture } from '../types';
import { ArrowRight, Activity, Globe, Camera, Cpu, Compass, RotateCw, Zap, CheckCircle2 } from 'lucide-react';

interface ProcessingPipelineProps {
  patState: PATState;
  detection: BeaconDetectionResult;
  controlMode: ControlMode;
  architecture: TrackingArchitecture;
}

export const ProcessingPipeline: React.FC<ProcessingPipelineProps> = ({
  patState,
  detection,
  controlMode,
  architecture,
}) => {
  const isLocked = patState === 'LOCKED';
  const isTracking = patState === 'TRACKING' || isLocked;
  const isAi = architecture === 'AI_ASSISTED';

  return (
    <div className="w-full rounded-xl overflow-hidden hud-panel p-3 flex flex-col gap-2 font-mono text-xs">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-tech text-xs tracking-wider text-cyan-300 font-semibold uppercase">
            5. Closed-Loop Processing Pipeline
          </span>
          <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${isAi ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60' : 'bg-amber-950 text-amber-300 border border-amber-700/60'}`}>
            {isAi ? 'AI-Assisted Architecture' : 'Traditional Reactive Architecture'}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Continuous Real-Time Loop (60 Hz)
        </span>
      </div>

      {/* Interactive Horizontal Flow Diagram */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
        {/* Stage 1: Terminal B Moves & Emits */}
        <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/40 flex flex-col items-center text-center relative overflow-hidden">
          <Globe className="w-4 h-4 text-blue-400 mb-1" />
          <span className="font-semibold text-blue-200 text-[10.5px]">1. Terminal B</span>
          <span className="text-white font-bold text-[11px]">Moves & Emits</span>
          <span className="text-[9.5px] text-blue-300/80 mt-0.5">1550nm beacon</span>
        </div>

        {/* Stage 2: Camera Observes */}
        <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex flex-col items-center text-center relative overflow-hidden">
          <Camera className="w-4 h-4 text-indigo-400 mb-1" />
          <span className="font-semibold text-indigo-200 text-[10.5px]">2. Sensor</span>
          <span className="text-white font-bold text-[11px]">Observes FOV</span>
          <span className="text-[9.5px] text-indigo-300/80 mt-0.5">640×480 sensor</span>
        </div>

        {/* Stage 3: AI Detects / Threshold */}
        <div className={`p-2 rounded-lg border flex flex-col items-center text-center relative overflow-hidden ${
          detection.detected ? 'bg-amber-600/20 border-amber-500/50' : 'bg-red-950/30 border-red-500/40'
        }`}>
          <Cpu className="w-4 h-4 text-amber-400 mb-1" />
          <span className="font-semibold text-amber-200 text-[10.5px]">3. {isAi ? 'AI Feature' : 'Blob'}</span>
          <span className="text-white font-bold text-[11px]">Detects Beacon</span>
          <span className="text-[9.5px] text-amber-300/80 mt-0.5">
            {detection.detected ? `Conf: ${detection.confidence}%` : 'Searching...'}
          </span>
        </div>

        {/* Stage 4: Estimation / Prediction */}
        <div className={`p-2 rounded-lg border flex flex-col items-center text-center relative overflow-hidden ${
          isAi ? 'bg-cyan-600/25 border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.15)]' : 'bg-purple-600/20 border-purple-500/40'
        }`}>
          {isAi ? <Zap className="w-4 h-4 text-cyan-300 mb-1 animate-pulse" /> : <Compass className="w-4 h-4 text-purple-400 mb-1" />}
          <span className="font-semibold text-cyan-200 text-[10.5px]">{isAi ? '4. Kalman Model' : '4. Error Calc'}</span>
          <span className="text-white font-bold text-[11px]">{isAi ? 'Predicts Future' : 'Instant Error'}</span>
          <span className="text-[9.5px] text-cyan-300/80 mt-0.5">
            {isAi ? `X_pred (${Math.round(detection.aiPrediction.predictedX)})` : `ΔX=${detection.errorX}px`}
          </span>
        </div>

        {/* Stage 5: Motor Correction */}
        <div className="p-2 rounded-lg bg-rose-600/20 border border-rose-500/40 flex flex-col items-center text-center relative overflow-hidden">
          <RotateCw className={`w-4 h-4 text-rose-400 mb-1 ${isTracking ? 'animate-spin' : ''}`} />
          <span className="font-semibold text-rose-200 text-[10.5px]">5. Gimbal</span>
          <span className="text-white font-bold text-[11px]">{isAi ? 'Feedforward' : 'PID Slew'}</span>
          <span className="text-[9.5px] text-rose-300/80 mt-0.5">Rate & accel limit</span>
        </div>

        {/* Stage 6: Centered & Locked */}
        <div className={`p-2 rounded-lg border flex flex-col items-center text-center relative overflow-hidden ${
          isLocked ? 'bg-emerald-600/25 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-slate-800/30 border-slate-700'
        }`}>
          <CheckCircle2 className={`w-4 h-4 mb-1 ${isLocked ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
          <span className="font-semibold text-emerald-200 text-[10.5px]">6. Alignment</span>
          <span className="text-white font-bold text-[11px]">{isLocked ? 'Centered & Locked' : 'Acquiring...'}</span>
          <span className="text-[9.5px] text-emerald-300/80 mt-0.5">
            {isLocked ? '10 Gbps FSOC Active' : `${detection.totalAngularError.toFixed(0)} µrad`}
          </span>
        </div>
      </div>
    </div>
  );
};
