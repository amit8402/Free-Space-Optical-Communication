/**
 * FSOC Real-World Challenges & Optical Link Budget Panel
 * Combines satellite communication geometry, optical link budget (1550nm, 10Gbps),
 * real-world disturbances (micro-vibration, pointing jitter, solar glare, turbulence),
 * and interactive test triggers (e.g. simulate beacon loss, inject jitter shock).
 */

import React, { useState } from 'react';
import { 
  LinkBudget, 
  TargetGeometry, 
  Disturbances, 
  PATState, 
  BeaconDetectionResult,
  TrajectoryType,
  TargetMotionParams 
} from '../types';
import { 
  Wifi, 
  Radio, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  Sliders, 
  Sun, 
  Wind, 
  Gauge, 
  Navigation,
  RefreshCw
} from 'lucide-react';

interface LinkBudgetChallengesProps {
  linkBudget: LinkBudget;
  geometry: TargetGeometry;
  disturbances: Disturbances;
  onDisturbanceChange: (updated: Partial<Disturbances>) => void;
  motionParams: TargetMotionParams;
  onMotionChange: (updated: Partial<TargetMotionParams>) => void;
  detection: BeaconDetectionResult;
  patState: PATState;
  onTriggerBeaconLoss: () => void;
  onResetSimulation: () => void;
}

export const LinkBudgetChallenges: React.FC<LinkBudgetChallengesProps> = ({
  linkBudget,
  geometry,
  disturbances,
  onDisturbanceChange,
  motionParams,
  onMotionChange,
  detection,
  patState,
  onTriggerBeaconLoss,
  onResetSimulation,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'geometry' | 'challenges' | 'disturbances'>('link');

  const isConnected = linkBudget.status === 'CONNECTED';
  const isAcquiring = linkBudget.status === 'ACQUIRING';

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden hud-panel font-mono text-xs">
      {/* Header bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : isAcquiring ? 'text-cyan-400' : 'text-red-400'}`} />
          <span className="font-tech text-xs tracking-wider text-cyan-300 font-semibold uppercase">
            Optical Link & Space Challenges
          </span>
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab('link')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'link' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Link Budget
          </button>
          <button
            onClick={() => setActiveTab('geometry')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'geometry' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Geometry
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'challenges' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Real Challenges
          </button>
          <button
            onClick={() => setActiveTab('disturbances')}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === 'disturbances' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Disturbances
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="p-3.5 flex-1 overflow-y-auto">
        {/* TAB 1: OPTICAL LINK BUDGET */}
        {activeTab === 'link' && (
          <div className="flex flex-col gap-3">
            {/* Link Status Banner */}
            <div
              className={`p-2.5 rounded-lg border flex items-center justify-between ${
                isConnected
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : isAcquiring
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                  : 'bg-red-950/40 border-red-500/50 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : isAcquiring ? 'bg-cyan-400 animate-ping' : 'bg-red-500'}`} />
                <div>
                  <div className="font-bold text-xs">LINK STATUS: {linkBudget.status}</div>
                  <div className="text-[10px] text-slate-400">FSOC Free-Space Optical Inter-Satellite Channel</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm">{linkBudget.dataRateGbps} Gbps</div>
                <div className="text-[10px] text-slate-400">λ = {linkBudget.wavelengthNm} nm</div>
              </div>
            </div>

            {/* Link Budget Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[10px]">Received Power (Prx):</span>
                <span className="text-emerald-300 font-bold text-xs">{linkBudget.receivedPowerDbm} dBm</span>
                <span className="text-slate-400 text-[10px]">({linkBudget.receivedPowerUw} µW)</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[10px]">Optical SNR:</span>
                <span className={`font-bold text-xs ${linkBudget.snrDb >= 12 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {linkBudget.snrDb} dB
                </span>
                <span className="text-slate-400 text-[10px]">Req: 12.0 dB (BER 1e-9)</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[10px]">Link Margin:</span>
                <span className={`font-bold text-xs ${linkBudget.linkMarginDb >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {linkBudget.linkMarginDb >= 0 ? `+${linkBudget.linkMarginDb}` : linkBudget.linkMarginDb} dB
                </span>
                <span className="text-slate-400 text-[10px]">Excess headroom</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[10px]">Pointing Loss (Lp):</span>
                <span className="text-amber-300 font-bold text-xs">-{linkBudget.pointingLossDb} dB</span>
                <span className="text-slate-400 text-[10px]">Gaussian roll-off</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[10px]">Tx Optical Power:</span>
                <span className="text-white font-bold text-xs">{linkBudget.transmitPowerW} W (+33 dBm)</span>
                <span className="text-slate-400 text-[10px]">EDFA Booster Amp</span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[10px]">Path Loss (FSPL):</span>
                <span className="text-slate-300 font-bold text-xs">{linkBudget.pathLossDb} dB</span>
                <span className="text-slate-400 text-[10px]">At {geometry.distanceKm.toFixed(0)} km</span>
              </div>
            </div>

            {/* Beam Divergence Tradeoff Slider (Requirement 10 & 11) */}
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Beam Divergence (θ_div):</span>
                <span className="text-cyan-300 font-bold">{linkBudget.beamDivergenceUrad} µrad</span>
              </div>
              <input
                type="range"
                min="8"
                max="60"
                step="2"
                value={linkBudget.beamDivergenceUrad}
                onChange={(e) => onMotionChange({ beamDivergenceUrad: parseFloat(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <div className="text-[10px] text-slate-400 leading-tight">
                *Narrow beam (10 µrad) maximizes received power density but requires sub-µrad pointing precision. Wide beam eases initial acquisition but reduces optical SNR.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISTANCE & 3D GEOMETRY (Requirement 9) */}
        {activeTab === 'geometry' && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
              <div className="text-cyan-300 font-semibold border-b border-slate-800 pb-1 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                Line-of-Sight (LOS) Orbital Geometry
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Target Distance:</span>
                <span className="text-white font-bold">{geometry.distanceKm.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">LOS Azimuth (Yaw):</span>
                <span className="text-cyan-300 font-bold">
                  {geometry.azimuthDeg >= 0 ? '+' : ''}{geometry.azimuthDeg.toFixed(2)}°
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">LOS Elevation (Pitch):</span>
                <span className="text-cyan-300 font-bold">
                  {geometry.elevationDeg >= 0 ? '+' : ''}{geometry.elevationDeg.toFixed(2)}°
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Range Rate (dr/dt):</span>
                <span className="text-amber-300 font-bold">
                  {geometry.rangeRateKmS >= 0 ? '+' : ''}{geometry.rangeRateKmS.toFixed(2)} km/s
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Relative (X, Y, Z):</span>
                <span className="text-slate-200 font-semibold text-[10px]">
                  ({geometry.relX.toFixed(1)}, {geometry.relY.toFixed(1)}, {geometry.relZ.toFixed(1)}) km
                </span>
              </div>
            </div>

            {/* Trajectory Selector (Requirement 8) */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
              <div className="text-slate-300 font-semibold text-[11px]">Target Trajectory Model:</div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {(['circular', 'sinusoidal', 'linear', 'orbital', 'random', 'custom'] as TrajectoryType[]).map((traj) => (
                  <button
                    key={traj}
                    onClick={() => onMotionChange({ trajectory: traj })}
                    className={`py-1 rounded capitalize text-center transition-all ${
                      motionParams.trajectory === traj
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-semibold'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {traj}
                  </button>
                ))}
              </div>

              <div className="mt-1 flex flex-col gap-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Motion Amplitude:</span>
                  <span className="text-white">{motionParams.motionAmplitudeDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={motionParams.motionAmplitudeDeg}
                  onChange={(e) => onMotionChange({ motionAmplitudeDeg: parseFloat(e.target.value) })}
                  className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REAL SATELLITE COMMUNICATION CHALLENGES (Requirement 11) */}
        {activeTab === 'challenges' && (
          <div className="flex flex-col gap-2.5 text-[11px]">
            {/* Challenge 1: Pointing Error & Walk-off */}
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Pointing Error & Beam Walk-off
                </span>
                <span className={detection.totalAngularError <= 15 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {detection.totalAngularError < 9000 ? `${detection.totalAngularError.toFixed(1)} µrad` : 'LOST'}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Narrow laser beams (10–30 µrad) have a tiny footprint across 850 km. An angular error of just 15 µrad causes dramatic power drop due to Gaussian beam attenuation.
              </p>
            </div>

            {/* Challenge 2: Micro-vibration */}
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Spacecraft Micro-vibrations
                </span>
                <span className="text-cyan-300 font-bold">
                  {disturbances.vibration < 20 ? 'LOW' : disturbances.vibration < 60 ? 'MEDIUM' : 'HIGH'}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Reaction wheels spinning at 30–120 Hz and solar panel flexure generate micro-arcsecond angular vibrations that must be rejected by fine steering mirrors (FSM).
              </p>
            </div>

            {/* Challenge 3: Atmospheric Turbulence */}
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-purple-400" />
                  Atmospheric Scintillation
                </span>
                <span className="text-purple-300 font-bold">
                  {disturbances.atmosphericTurbulence > 0 ? `${disturbances.atmosphericTurbulence}% (Ground)` : '0% (Deep Space)'}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Negligible for purely space-to-space links (vacuum of space), but causes severe beam wander and intensity fading for satellite-to-ground downlinks.
              </p>
            </div>

            {/* Challenge 4: Solar Background Stray Light */}
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Stray Sunlight & Earth Albedo
                </span>
                <span className="text-amber-300 font-bold">{disturbances.backgroundNoise}%</span>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Sun in or near telescope FOV saturates detector pixels, lowering centroid SNR and raising probability of false lock.
              </p>
            </div>

            {/* Simulated Reacquisition Trigger (Requirement 11 & 13) */}
            <div className="pt-1 flex gap-2">
              <button
                onClick={onTriggerBeaconLoss}
                className="flex-1 py-1.5 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded text-red-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Simulate Beacon Loss & Spiral Reacquisition
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: DISTURBANCE SIMULATOR (Requirement 14) */}
        {activeTab === 'disturbances' && (
          <div className="flex flex-col gap-2 text-[11px]">
            <div className="text-slate-300 font-semibold pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>Disturbance Injection Simulator:</span>
              <button
                onClick={() => onDisturbanceChange({
                  vibration: 10,
                  angularJitter: 8,
                  targetMotion: 30,
                  sensorNoise: 15,
                  detectionNoise: 10,
                  controlDelay: 5,
                  atmosphericTurbulence: 0,
                  backgroundNoise: 10,
                })}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Reset Defaults
              </button>
            </div>

            {/* Sliders for each disturbance (0 - 100%) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Satellite Micro-Vibration:</span>
                <span className="text-cyan-300 font-semibold">{disturbances.vibration}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={disturbances.vibration}
                onChange={(e) => onDisturbanceChange({ vibration: parseInt(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Angular Jitter (Reaction Wheels):</span>
                <span className="text-cyan-300 font-semibold">{disturbances.angularJitter}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={disturbances.angularJitter}
                onChange={(e) => onDisturbanceChange({ angularJitter: parseInt(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Sensor Readout Noise:</span>
                <span className="text-cyan-300 font-semibold">{disturbances.sensorNoise}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={disturbances.sensorNoise}
                onChange={(e) => onDisturbanceChange({ sensorNoise: parseInt(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Centroid Detection Jitter:</span>
                <span className="text-cyan-300 font-semibold">{disturbances.detectionNoise}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={disturbances.detectionNoise}
                onChange={(e) => onDisturbanceChange({ detectionNoise: parseInt(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Background Sunlight / Glare:</span>
                <span className="text-cyan-300 font-semibold">{disturbances.backgroundNoise}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={disturbances.backgroundNoise}
                onChange={(e) => onDisturbanceChange({ backgroundNoise: parseInt(e.target.value) })}
                className="accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Atmospheric Turbulence (Ground link):</span>
                <span className="text-purple-300 font-semibold">{disturbances.atmosphericTurbulence}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={disturbances.atmosphericTurbulence}
                onChange={(e) => onDisturbanceChange({ atmosphericTurbulence: parseInt(e.target.value) })}
                className="accent-purple-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
