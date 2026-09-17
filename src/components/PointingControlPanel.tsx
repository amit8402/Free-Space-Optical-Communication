/**
 * Panel 4: Pointing Control (Camera Rotation & PID Gimbal Controller)
 * Displays gimbal angles, rates, offsets, and provides interactive sliders/buttons
 * for Pan, Tilt, Zoom, Focus, FOV, and PID parameters (Kp, Ki, Kd).
 * Includes Fast Ephemeris Acquisition command and intelligent search explanation.
 */

import React, { useState } from 'react';
import { CameraSpecs, PIDParams, ControlMode, BeaconDetectionResult, PATState, SearchTelemetry, TargetGeometry } from '../types';
import { Sliders, RotateCw, ZoomIn, Aperture, Settings2, Plus, Minus, Power, Crosshair, Target, ChevronDown, ChevronUp } from 'lucide-react';

interface PointingControlPanelProps {
  cameraSpecs: CameraSpecs;
  onCameraChange: (updated: Partial<CameraSpecs>) => void;
  pidParams: PIDParams;
  onPidChange: (updated: Partial<PIDParams>) => void;
  controlMode: ControlMode;
  onControlModeChange: (mode: ControlMode) => void;
  detection: BeaconDetectionResult;
  patState: PATState;
  yawCorrection: number;
  pitchCorrection: number;
  onFastAcquire?: () => void;
  searchTelemetry?: SearchTelemetry;
  targetGeometry?: TargetGeometry;
}

export const PointingControlPanel: React.FC<PointingControlPanelProps> = ({
  cameraSpecs,
  onCameraChange,
  pidParams,
  onPidChange,
  controlMode,
  onControlModeChange,
  detection,
  patState,
  yawCorrection,
  pitchCorrection,
  onFastAcquire,
  searchTelemetry,
  targetGeometry,
}) => {
  const [showAdvancedPid, setShowAdvancedPid] = useState(false);
  const [showSearchExplainer, setShowSearchExplainer] = useState(false);

  const isAuto = controlMode === 'AUTO';
  const isSearching = patState === 'SEARCHING' || patState === 'REACQUIRING' || patState === 'COARSE_POINTING';

  const handleStepYaw = (delta: number) => {
    onCameraChange({ yaw: Math.max(-85, Math.min(85, cameraSpecs.yaw + delta)) });
  };

  const handleStepPitch = (delta: number) => {
    onCameraChange({ pitch: Math.max(-40, Math.min(40, cameraSpecs.pitch + delta)) });
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden hud-panel font-mono text-xs">
      {/* Panel Header */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="font-tech text-xs tracking-wider text-cyan-300 font-semibold uppercase">
            4. Pointing Control (Camera Rotation)
          </span>
        </div>

        {/* Mode Toggle Button */}
        <div className="flex items-center gap-1.5">
          {onFastAcquire && (
            <button
              onClick={onFastAcquire}
              className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 hover:bg-cyan-500/30 flex items-center gap-1 font-semibold text-[10px]"
              title="Immediately lock onto Terminal B"
            >
              <Crosshair className="w-2.5 h-2.5" />
              Lock B
            </button>
          )}

          <button
            onClick={() => onControlModeChange(isAuto ? 'MANUAL' : 'AUTO')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold text-[11px] transition-all ${
              isAuto
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
            }`}
          >
            <Power className="w-3 h-3" />
            {isAuto ? 'AUTO TRACKING' : 'MANUAL MODE'}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3.5 flex flex-col gap-3 flex-1 overflow-y-auto">
        {/* Telemetry Readout Grid (Matches Reference Design in uploaded photo) */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-1.5 text-slate-300">
          <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
            <span className="text-slate-400">Yaw (left/right)</span>
            <span className="text-white font-semibold">{cameraSpecs.yaw >= 0 ? '+' : ''}{cameraSpecs.yaw.toFixed(1)} deg</span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
            <span className="text-slate-400">Pitch (up/down)</span>
            <span className="text-white font-semibold">{cameraSpecs.pitch >= 0 ? '+' : ''}{cameraSpecs.pitch.toFixed(1)} deg</span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
            <span className="text-slate-400">Yaw Rate</span>
            <span className="text-cyan-300 font-semibold">{cameraSpecs.yawRate >= 0 ? '+' : ''}{cameraSpecs.yawRate.toFixed(1)} deg/s</span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
            <span className="text-slate-400">Pitch Rate</span>
            <span className="text-cyan-300 font-semibold">{cameraSpecs.pitchRate >= 0 ? '+' : ''}{cameraSpecs.pitchRate.toFixed(1)} deg/s</span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
            <span className="text-slate-400">Control</span>
            <span className={isAuto ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {isAuto ? 'ON (PID Loop)' : 'MANUAL (User)'}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
            <span className="text-slate-400">Beacon Offset</span>
            <span className="text-slate-200 font-semibold">
              ({detection.detected ? (detection.errorX >= 0 ? `+${detection.errorX}` : detection.errorX) : '---'},{' '}
              {detection.detected ? (detection.errorY >= 0 ? `+${detection.errorY}` : detection.errorY) : '---'}) px
            </span>
          </div>
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-slate-400">Status</span>
            <span
              className={`font-semibold ${
                patState === 'LOCKED'
                  ? 'text-emerald-400'
                  : patState === 'TRACKING'
                  ? 'text-cyan-400'
                  : patState === 'BEACON_LOST'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            >
              {patState === 'LOCKED' ? 'Locked (Centered)' : patState}
            </span>
          </div>
        </div>

        {/* Search & Reacquisition Status Card */}
        {isSearching && (
          <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between text-amber-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                Ephemeris Search Active
              </span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/40">
                Cone: ±2.5°
              </span>
            </div>
            <p className="text-slate-300 text-[10px] leading-tight">
              Slewing gimbal towards Terminal B's predicted LOS Az {targetGeometry?.azimuthDeg.toFixed(1)}°, El {targetGeometry?.elevationDeg.toFixed(1)}°
            </p>
            {onFastAcquire && (
              <button
                onClick={onFastAcquire}
                className="w-full mt-1 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[10px] hover:bg-amber-400 flex items-center justify-center gap-1"
              >
                <Crosshair className="w-3 h-3" />
                Snap Lock Immediately
              </button>
            )}
          </div>
        )}

        {/* Expandable "How Terminal A Finds Terminal B" Explanation Box */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
          <button
            onClick={() => setShowSearchExplainer(!showSearchExplainer)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] text-cyan-300 hover:text-cyan-200"
          >
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              How Terminal A Finds Terminal B
            </span>
            {showSearchExplainer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showSearchExplainer && (
            <div className="p-2.5 border-t border-slate-800 text-[10px] text-slate-300 flex flex-col gap-1.5 leading-relaxed bg-slate-900/50">
              <p>
                <strong className="text-cyan-300">1. Coarse Ephemeris Cueing:</strong> Instead of blind space searching, Terminal A uses orbital coordinates (Az {targetGeometry?.azimuthDeg.toFixed(1)}°, El {targetGeometry?.elevationDeg.toFixed(1)}°).
              </p>
              <p>
                <strong className="text-cyan-300">2. Agile Gimbal Slew:</strong> Motor rotates at 15°/s to target corridor.
              </p>
              <p>
                <strong className="text-cyan-300">3. AI Uncertainty Basket Sweep:</strong> Scans a ±2.5° cone. With 10° FOV, Terminal B enters the camera frame in <strong>&lt; 1.4s</strong>.
              </p>
              <p>
                <strong className="text-cyan-300">4. Closed-Loop Lock:</strong> Transfers to sub-pixel PID to center the beacon.
              </p>
            </div>
          )}
        </div>

        {/* Gimbal Interactive Controls */}
        <div className="flex flex-col gap-2.5">
          {/* Yaw / Pan Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Pan / Yaw:</span>
              <span className="text-cyan-300 font-semibold">{cameraSpecs.yaw.toFixed(1)}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={isAuto}
                onClick={() => handleStepYaw(-1.0)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-300"
                title="Pan Left 1°"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="-60"
                max="60"
                step="0.5"
                disabled={isAuto}
                value={cameraSpecs.yaw}
                onChange={(e) => onCameraChange({ yaw: parseFloat(e.target.value) })}
                className="flex-1 accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer disabled:opacity-50"
              />
              <button
                disabled={isAuto}
                onClick={() => handleStepYaw(1.0)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-300"
                title="Pan Right 1°"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Pitch / Tilt Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Tilt / Pitch:</span>
              <span className="text-cyan-300 font-semibold">{cameraSpecs.pitch.toFixed(1)}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={isAuto}
                onClick={() => handleStepPitch(-1.0)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-300"
                title="Tilt Down 1°"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="-30"
                max="30"
                step="0.5"
                disabled={isAuto}
                value={cameraSpecs.pitch}
                onChange={(e) => onCameraChange({ pitch: parseFloat(e.target.value) })}
                className="flex-1 accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer disabled:opacity-50"
              />
              <button
                disabled={isAuto}
                onClick={() => handleStepPitch(1.0)}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-300"
                title="Tilt Up 1°"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Optical Zoom, Focus, FOV Controls */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Zoom:</span>
                <span className="text-white">{cameraSpecs.zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.2"
                value={cameraSpecs.zoom}
                onChange={(e) => onCameraChange({ zoom: parseFloat(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">FOV:</span>
                <span className="text-white">{cameraSpecs.fov.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="4.0"
                max="20.0"
                step="1.0"
                value={cameraSpecs.fov}
                onChange={(e) => onCameraChange({ fov: parseFloat(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Focus:</span>
                <span className="text-white">{Math.round(cameraSpecs.focus * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={cameraSpecs.focus}
                onChange={(e) => onCameraChange({ focus: parseFloat(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Max Slew:</span>
                <span className="text-white">{cameraSpecs.maxSpeed.toFixed(0)}°/s</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={cameraSpecs.maxSpeed}
                onChange={(e) => onCameraChange({ maxSpeed: parseFloat(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* PID Controller Tuning Section */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => setShowAdvancedPid(!showAdvancedPid)}
            className="w-full flex items-center justify-between text-[11px] text-cyan-300 hover:text-cyan-200 py-1"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              PID Controller Gains (Kp, Ki, Kd)
            </span>
            <span className="text-slate-400">{showAdvancedPid ? '▼' : '▶'}</span>
          </button>

          {showAdvancedPid && (
            <div className="mt-2 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Kp (Proportional):</span>
                <span className="text-white font-semibold">{pidParams.kp.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                value={pidParams.kp}
                onChange={(e) => onPidChange({ kp: parseFloat(e.target.value) })}
                className="accent-emerald-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ki (Integral):</span>
                <span className="text-white font-semibold">{pidParams.ki.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.01"
                value={pidParams.ki}
                onChange={(e) => onPidChange({ ki: parseFloat(e.target.value) })}
                className="accent-emerald-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Kd (Derivative):</span>
                <span className="text-white font-semibold">{pidParams.kd.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.8"
                step="0.02"
                value={pidParams.kd}
                onChange={(e) => onPidChange({ kd: parseFloat(e.target.value) })}
                className="accent-emerald-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />

              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                Active Corrections: Yaw {yawCorrection >= 0 ? `+${yawCorrection}` : yawCorrection}°, Pitch {pitchCorrection >= 0 ? `+${pitchCorrection}` : pitchCorrection}°
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
