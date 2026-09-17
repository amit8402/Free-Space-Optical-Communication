/**
 * Mission Control Aerospace Header & Status Telemetry Bar
 * Matches the reference design title:
 * "Virtual Optical Beacon Tracking System"
 * "Simulate → Detect → Locate → Rotate → Keep Centered"
 * With live telemetry badges: BEACON DETECTED, TRACKING: ACTIVE, POINTING ERROR, DISTANCE, LINK LOCKED.
 * Includes Fast Ephemeris Acquire button and educational "How to Explain" modal.
 */

import React, { useState } from 'react';
import { 
  PATState, 
  BeaconDetectionResult, 
  LinkBudget, 
  TargetGeometry, 
  ControlMode, 
  TrackingArchitecture,
  SearchTelemetry 
} from '../types';
import { 
  Satellite, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Crosshair,
  Sliders, 
  Zap,
  Info,
  X,
  Target
} from 'lucide-react';

interface HeaderTelemetryProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  onReset: () => void;
  simSpeed: number;
  onSpeedChange: (speed: number) => void;
  patState: PATState;
  detection: BeaconDetectionResult;
  linkBudget: LinkBudget;
  geometry: TargetGeometry;
  controlMode: ControlMode;
  architecture: TrackingArchitecture;
  onArchitectureChange: (arch: TrackingArchitecture) => void;
  onLoadScenario: (scenario: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onFastAcquire?: () => void;
  searchTelemetry?: SearchTelemetry;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  isRunning,
  onToggleRunning,
  onReset,
  simSpeed,
  onSpeedChange,
  patState,
  detection,
  linkBudget,
  geometry,
  controlMode,
  architecture,
  onArchitectureChange,
  onLoadScenario,
  isMuted,
  onToggleMute,
  onFastAcquire,
  searchTelemetry,
}) => {
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  const isLocked = patState === 'LOCKED';
  const isTracking = patState === 'TRACKING' || isLocked;
  const isSearching = patState === 'SEARCHING' || patState === 'REACQUIRING' || patState === 'COARSE_POINTING';
  const isAi = architecture === 'AI_ASSISTED';

  return (
    <header className="w-full flex flex-col bg-[#070e1c] border-b border-cyan-500/25 px-4 py-2.5 font-mono select-none">
      {/* Top Row: Main Title and Simulation Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title and Tagline matching photo */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/60 border border-cyan-500/40 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center justify-center">
            <Satellite className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h1 className="font-tech text-lg md:text-xl font-bold tracking-wider text-white flex items-center gap-2">
              Virtual Optical Beacon Tracking System
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-normal">
                FSOC / PAT v2.4
              </span>
            </h1>
            <p className="text-[11px] text-cyan-400 font-medium tracking-wide">
              Simulate → Detect → Locate → Rotate → Keep Centered
            </p>
          </div>
        </div>

        {/* Global Controls & Scenarios */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Fast Ephemeris Acquire Button */}
          {onFastAcquire && (
            <button
              onClick={onFastAcquire}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-300 font-bold text-xs shadow-[0_0_10px_rgba(6,182,212,0.25)] transition-all active:scale-95"
              title="Align gimbal to Target B's orbital ephemeris and lock immediately"
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
              <span>LOCK TERMINAL B NOW</span>
            </button>
          )}

          {/* "How to Explain" Button */}
          <button
            onClick={() => setShowExplanationModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs transition-colors"
            title="How Terminal A finds Terminal B (Scientific explanation guide)"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Search Guide</span>
          </button>

          {/* Architecture Switcher Pill */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onArchitectureChange('TRADITIONAL')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 font-semibold ${
                !isAi
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Traditional Reactive PID & Ephemeris Spiral"
            >
              <Sliders className="w-3 h-3" />
              Traditional
            </button>
            <button
              onClick={() => onArchitectureChange('AI_ASSISTED')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 font-semibold ${
                isAi
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="AI-Assisted Kalman Motion Prediction & Feedforward"
            >
              <Zap className="w-3 h-3 text-cyan-300" />
              AI-Assisted
            </button>
          </div>

          {/* Preset Scenarios */}
          <select
            onChange={(e) => {
              if (e.target.value) onLoadScenario(e.target.value);
            }}
            defaultValue=""
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400"
          >
            <option value="" disabled>Load Mission Preset...</option>
            <option value="standard">Standard LEO Inter-Satellite Link (850 km)</option>
            <option value="orbital_sweep">Orbital Elliptical Relative Drift</option>
            <option value="high_vibration">Severe Satellite Micro-Vibration</option>
            <option value="reacquisition_test">Beacon Loss & Autonomous Reacquisition</option>
            <option value="solar_glare">Solar Glare & Optical Noise Challenge</option>
          </select>

          {/* Simulation Speed */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onSpeedChange(0.5)}
              className={`px-2 py-1 rounded transition-colors ${simSpeed === 0.5 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              0.5x
            </button>
            <button
              onClick={() => onSpeedChange(1.0)}
              className={`px-2 py-1 rounded transition-colors ${simSpeed === 1.0 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              1.0x
            </button>
            <button
              onClick={() => onSpeedChange(2.0)}
              className={`px-2 py-1 rounded transition-colors ${simSpeed === 2.0 ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              2.0x
            </button>
          </div>

          {/* Run / Pause */}
          <button
            onClick={onToggleRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'PAUSE' : 'RUN'}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 transition-colors"
            title="Reset simulation states"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Audio toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 transition-colors"
            title={isMuted ? 'Unmute telemetry sound' : 'Mute telemetry sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Live Search Alert Banner when searching */}
      {isSearching && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">
              ACQUISITION ACTIVE ({patState}):
            </span>
            <span>
              Target Ephemeris Az {geometry.azimuthDeg.toFixed(1)}°, El {geometry.elevationDeg.toFixed(1)}° • Slew Rate: {searchTelemetry?.slewSpeedDegS || 12.0}°/s • Basket: ±{searchTelemetry?.uncertaintyConeDeg || 2.5}°
            </span>
          </div>
          {onFastAcquire && (
            <button
              onClick={onFastAcquire}
              className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-[11px]"
            >
              Instant Lock
            </button>
          )}
        </div>
      )}

      {/* Bottom Row: Mission Control Telemetry Ribbon */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
        {/* Metric 1: BEACON DETECTION */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${detection.detected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-tight">BEACON SENSOR</span>
            <span className={`font-bold ${detection.detected ? 'text-emerald-400' : 'text-red-400'}`}>
              {detection.detected ? `DETECTED (${detection.confidence}%)` : 'SEARCHING...'}
            </span>
          </div>
        </div>

        {/* Metric 2: TRACKING STATUS */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-tight">CONTROL LOOP</span>
            <span className={`font-bold ${isLocked ? 'text-emerald-300' : isTracking ? 'text-cyan-300' : 'text-amber-300'}`}>
              {controlMode === 'AUTO' ? `TRACKING: ${patState}` : 'MANUAL CONTROL'}
            </span>
          </div>
        </div>

        {/* Metric 3: POINTING ERROR */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800">
          <div className="flex flex-col w-full">
            <span className="text-[10px] text-slate-400 uppercase tracking-tight">POINTING ERROR</span>
            <span className={`font-bold ${detection.totalAngularError <= 15 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {detection.totalAngularError < 9000 ? `${detection.totalAngularError.toFixed(2)} µrad` : '---'}
            </span>
          </div>
        </div>

        {/* Metric 4: DISTANCE */}
        <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800">
          <div className="flex flex-col w-full">
            <span className="text-[10px] text-slate-400 uppercase tracking-tight">TARGET DISTANCE</span>
            <span className="font-bold text-white">
              {geometry.distanceKm.toFixed(1)} km
            </span>
          </div>
        </div>

        {/* Metric 5: OPTICAL LINK STATUS */}
        <div className="col-span-2 sm:col-span-1 flex items-center gap-2 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${isLocked ? 'bg-emerald-400 animate-pulse' : isTracking ? 'bg-cyan-400' : 'bg-red-500'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-tight">FSOC OPTICAL LINK</span>
            <span className={`font-bold ${isLocked ? 'text-emerald-400' : isTracking ? 'text-cyan-300' : 'text-red-400'}`}>
              {isLocked ? 'LINK: LOCKED' : isTracking ? 'LINK: ACQUIRING' : 'LINK: SEARCHING'}
            </span>
          </div>
        </div>
      </div>

      {/* Explanation Modal: How Terminal A Finds Terminal B */}
      {showExplanationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl flex flex-col gap-4 font-sans text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    How Terminal A Finds Terminal B (How to Explain)
                  </h3>
                  <p className="text-xs text-cyan-400">
                    Satellite Free-Space Optical Communication (FSOC) Pointing, Acquisition & Tracking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExplanationModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-300">1. Orbital Ephemeris Cueing (Coarse Pointing)</span>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Terminal A doesn't blindly search empty deep space. It receives GNSS / Keplerian Two-Line Element (TLE) orbit predictions to calculate Terminal B's nominal Line-of-Sight (LOS) Azimuth and Elevation vector.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-300">2. High-Speed Gimbal Slew (15°/s)</span>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Terminal A's optical telescope gimbal slews at up to 15°/second directly toward the target's flight path corridor, minimizing initial angle error in seconds.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-300">3. AI-Assisted Uncertainty Basket Sweep (±2.5°)</span>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Because orbital ephemeris has a small attitude error basket (±1° to ±3°), Terminal A sweeps an agile uncertainty cone along Terminal B's velocity vector. The wide 10° camera FOV captures the bright optical beacon in <strong>&lt; 1.4 seconds</strong>!
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-300">4. Sub-Pixel Centroiding & Fine Closed-Loop Lock</span>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  As soon as the beacon appears in the camera frame, the AI perception engine isolates it from background stars and solar glare, transferring immediately to fine PID tracking to center the beacon and establish the 10 Gbps laser link.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowExplanationModal(false)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
