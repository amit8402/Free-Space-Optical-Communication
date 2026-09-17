/**
 * NASA / ISRO Master Mission Control Center
 * Satellite-to-Satellite & Space-Earth FSOC PAT Interactive Simulation
 *
 * Faithfully matches the exact layout, styling, and technical telemetry of the
 * reference command-and-control operations center (ChatGPT Image Sep 15, 2026, 09_52_56 AM.png):
 *
 * 1. Top Header: Title, FSOC simulation subtitle, Start/Pause/Reset, Tracking Mode (Traditional vs AI), View switcher, Sim Time.
 * 2. Left Column:
 *    - Mission & Link Status (Link Status, PAT State, Distance, Data Rate, Rx Power, SNR, Pointing Error, Margin, Wavelength)
 *    - Camera (Terminal A) Settings (Resolution, FOV, Focal Length, Frame Rate, Exposure, Gain, Zoom, Focus Auto/Manual, Filter)
 *    - Camera View (What AI Sees - 640x480 Sensor Canvas with crosshair, green AI bounding box, confidence, X, Y, ΔX, ΔY)
 * 3. Center Main Column:
 *    - 3D Virtual Space Environment (Realistic Earth, curved horizon, atmosphere, Sun flare, stars, Terminal A with crosshair, Terminal B with red beacon, laser beam)
 *    - Tracking Metrics (AI) (Yaw, Pitch, Rates, Error, Confidence, Prediction Error, Controller Output, Stability)
 *    - AI Tracking Response (Checklist with green badges)
 *    - Real-time Graphs (Tracking Error log plot, SNR, Pointing Angles, Traditional vs AI Adaptive comparison)
 * 4. Right Column:
 *    - Disturbance & Environment Controls (Environment, Target/Beacon, Sensor/Camera, Platform, Atmospheric)
 *      with live animated preview thumbnail canvases on the right of each section!
 * 5. Bottom Row:
 *    - Simulation Events / Notifications (live timestamped logs)
 *    - Quick Disturbance Presets (8 buttons: Ideal, Low, High, Strong, Debris, Weak Beacon, Fast Target, Extreme)
 *    - AI Analysis & Suggestions (live alert assessment)
 *    - Current Difficulty Level (horizontal gradient gauge)
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  CameraSpecs, 
  Disturbances, 
  TargetMotionParams, 
  ControlMode, 
  DetectionMode, 
  PATState, 
  BeaconDetectionResult, 
  TargetGeometry, 
  LinkBudget, 
  TrackingArchitecture 
} from '../types';
import { DISTURBANCE_PRESETS, calculateTrackingDifficulty } from '../data/disturbanceCatalog';
import { SpaceWorld3D } from './SpaceWorld3D';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Eye, 
  Crosshair, 
  Activity, 
  Satellite, 
  Maximize2, 
  Minimize2, 
  Radio, 
  ShieldCheck, 
  Sparkles, 
  Globe 
} from 'lucide-react';

interface NasaMissionCenterProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  onReset: () => void;
  simSpeed: number;
  onSpeedChange: (speed: number) => void;
  architecture: TrackingArchitecture;
  onArchitectureChange: (arch: TrackingArchitecture) => void;
  controlMode: ControlMode;
  onControlModeChange: (mode: ControlMode) => void;
  detectionMode: DetectionMode;
  onDetectionModeChange: (mode: DetectionMode) => void;
  patState: PATState;
  detection: BeaconDetectionResult;
  linkBudget: LinkBudget;
  targetGeometry: TargetGeometry;
  cameraSpecs: CameraSpecs;
  onCameraChange: (updated: Partial<CameraSpecs>) => void;
  disturbances: Disturbances;
  onDisturbanceChange: (updated: Partial<Disturbances>) => void;
  motionParams: TargetMotionParams;
  onMotionChange: (updated: Partial<TargetMotionParams>) => void;
  onApplyPreset: (dist: Partial<Disturbances>, motion?: Partial<TargetMotionParams>, cam?: Partial<CameraSpecs>) => void;
}

export const NasaMissionCenter: React.FC<NasaMissionCenterProps> = ({
  isRunning,
  onToggleRunning,
  onReset,
  simSpeed,
  onSpeedChange,
  architecture,
  onArchitectureChange,
  controlMode,
  onControlModeChange,
  detectionMode,
  onDetectionModeChange,
  patState,
  detection,
  linkBudget,
  targetGeometry,
  cameraSpecs,
  onCameraChange,
  disturbances,
  onDisturbanceChange,
  motionParams,
  onMotionChange,
  onApplyPreset,
}) => {
  // Top-bar View Switcher
  const [viewMode, setViewMode] = useState<'free' | 'camera' | 'chase' | 'top'>('free');
  // Right Column Tab
  const [disturbanceTab, setDisturbanceTab] = useState<'all' | 'environment' | 'target' | 'sensor' | 'platform' | 'atmospheric'>('all');
  // Graph Tab
  const [graphTab, setGraphTab] = useState<'trackingError' | 'snr' | 'pointingAngles'>('trackingError');
  // Active Preset Highlight
  const [activePresetId, setActivePresetId] = useState<string>('strong_disturbance');

  // Interactive Camera Slider States
  const [focalLength, setFocalLength] = useState<number>(800);
  const [frameRate, setFrameRate] = useState<number>(60);
  const [exposureMs, setExposureMs] = useState<number>(5);
  const [filterWavelength, setFilterWavelength] = useState<number>(1550);

  // Simulation Digital Clock (HH:MM:SS)
  const [simSeconds, setSimSeconds] = useState<number>(756); // Start at 00:12:36 like reference photo
  const [clockStr, setClockStr] = useState<string>('00:12:36');

  // Multi-Scale Switcher for 3D Space (SPACE, ORBIT, REGIONAL, LOCAL, GROUND)
  const [simScale, setSimScale] = useState<'SPACE' | 'ORBIT' | 'REGIONAL' | 'LOCAL' | 'GROUND'>('ORBIT');
  const [selectedScenario, setSelectedScenario] = useState<string>('sat_to_sat_fsoc');
  const [commTech, setCommTech] = useState<'OPTICAL' | 'RF'>('OPTICAL');

  // Refs for Canvases
  const sensorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const envThumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetThumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sensorThumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const platformThumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const atmThumbCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Time-series history for real-time graphs (Traditional vs AI)
  const historyRef = useRef<{
    time: number;
    errorTrad: number;
    errorAi: number;
    snrTrad: number;
    snrAi: number;
    yaw: number;
    pitch: number;
  }[]>([]);

  // Keep latest disturbances accessible to animation loops
  const disturbancesRef = useRef(disturbances);
  useEffect(() => {
    disturbancesRef.current = disturbances;
  }, [disturbances]);

  // Simulation Clock Tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSimSeconds((prev) => {
        const next = prev + 1;
        const h = Math.floor(next / 3600).toString().padStart(2, '0');
        const m = Math.floor((next % 3600) / 60).toString().padStart(2, '0');
        const s = (next % 60).toString().padStart(2, '0');
        setClockStr(`${h}:${m}:${s}`);
        return next;
      });
    }, 1000 / simSpeed);
    return () => clearInterval(interval);
  }, [isRunning, simSpeed]);

  // Update real-time graph history (immediately reacts when disturbances change)
  useEffect(() => {
    const time = simSeconds;
    const currentErr = detection.totalAngularError || (detection.size * 1.5);
    const tradMultiplier = 4.2 + (disturbances.satelliteVibration || 15) * 0.08 + (disturbances.pointingBias || 10) * 0.05 + (disturbances.atmosphericTurbulence || 0) * 0.04;
    const tradErr = Math.max(0.5, currentErr * tradMultiplier);

    // Dynamic SNR reflecting current disturbances
    const noisePenalty =
      ((disturbances.strayLightSunlight || 0) * 0.08) +
      ((disturbances.backgroundStarNoise || 0) * 0.05) +
      ((disturbances.sensorNoise || 0) * 0.07) +
      ((disturbances.cloudFogCoverage || 0) * 0.1);

    const baseSnr = detection.snrEstimate || 24;
    const snrAi = Math.max(3.5, baseSnr - noisePenalty * 0.45);
    const snrTrad = Math.max(1.0, snrAi - (6.0 + noisePenalty * 0.65));

    historyRef.current.push({
      time,
      errorTrad: tradErr,
      errorAi: Math.max(0.05, currentErr),
      snrTrad,
      snrAi,
      yaw: cameraSpecs.yaw,
      pitch: cameraSpecs.pitch,
    });

    if (historyRef.current.length > 150) {
      historyRef.current.shift();
    }
  }, [simSeconds, detection, disturbances, cameraSpecs.yaw, cameraSpecs.pitch]);

  // 1. Render Left Column: Camera View (What AI Sees - 640x480 Sensor Canvas)
  useEffect(() => {
    const canvas = sensorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background deep space
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, width, height);

    // Sensor readout noise & starfield
    const noiseDensity = 0.003 + (disturbances.sensorNoise / 100) * 0.015;
    const noisePixels = Math.floor(width * height * noiseDensity);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < noisePixels; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.fillRect(rx, ry, 1, 1);
    }

    // Stray light / Glare if high
    if (disturbances.backgroundLight > 15 || disturbances.strayLightSunlight > 15) {
      const glareGrad = ctx.createRadialGradient(width * 0.8, 0, 5, width * 0.8, 0, width * 0.7);
      const alpha = Math.min(0.5, ((disturbances.backgroundLight + disturbances.strayLightSunlight) / 200));
      glareGrad.addColorStop(0, `rgba(255, 230, 160, ${alpha})`);
      glareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glareGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Center Crosshair reticle (320, 240)
    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
    ctx.moveTo(0, cy); ctx.lineTo(width, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Beacon position in sensor pixels
    // Nominal center (320, 240) + pixel error
    const beaconX = cx + (detection.x - 320);
    const beaconY = cy + (detection.y - 240);

    if (detection.isInFov && detection.detected) {
      // Beacon glow spot
      const spotGrad = ctx.createRadialGradient(beaconX, beaconY, 1, beaconX, beaconY, 16);
      spotGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      spotGrad.addColorStop(0.3, 'rgba(255, 60, 40, 0.9)');
      spotGrad.addColorStop(0.7, 'rgba(255, 30, 20, 0.4)');
      spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(beaconX, beaconY, 16, 0, Math.PI * 2);
      ctx.fill();

      // Green AI Detection Bounding Box
      const boxSize = 28;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(beaconX - boxSize / 2, beaconY - boxSize / 2, boxSize, boxSize);

      // Corner accent brackets
      const bracketLen = 6;
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Top-left
      ctx.moveTo(beaconX - boxSize / 2, beaconY - boxSize / 2 + bracketLen);
      ctx.lineTo(beaconX - boxSize / 2, beaconY - boxSize / 2);
      ctx.lineTo(beaconX - boxSize / 2 + bracketLen, beaconY - boxSize / 2);
      // Top-right
      ctx.moveTo(beaconX + boxSize / 2 - bracketLen, beaconY - boxSize / 2);
      ctx.lineTo(beaconX + boxSize / 2, beaconY - boxSize / 2);
      ctx.lineTo(beaconX + boxSize / 2, beaconY - boxSize / 2 + bracketLen);
      // Bottom-left
      ctx.moveTo(beaconX - boxSize / 2, beaconY + boxSize / 2 - bracketLen);
      ctx.lineTo(beaconX - boxSize / 2, beaconY + boxSize / 2);
      ctx.lineTo(beaconX - boxSize / 2 + bracketLen, beaconY + boxSize / 2);
      // Bottom-right
      ctx.moveTo(beaconX + boxSize / 2 - bracketLen, beaconY + boxSize / 2);
      ctx.lineTo(beaconX + boxSize / 2, beaconY + boxSize / 2);
      ctx.lineTo(beaconX + boxSize / 2, beaconY + boxSize / 2 - bracketLen);
      ctx.stroke();
    }
  }, [detection, disturbances]);

  // 2. Render Real-time Graphs (Tracking Error vs Time, SNR, Pointing Angles)
  useEffect(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dark background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    const padLeft = 44;
    const padRight = 16;
    const padTop = 18;
    const padBottom = 26;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Grid lines & Axis labels
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
    ctx.lineWidth = 1;

    const history = historyRef.current;

    if (graphTab === 'trackingError') {
      // Y ticks (Log scale 10^2, 10^1, 10^0, 10^-1)
      const yLabels = ['10²', '10¹', '10⁰', '10⁻¹'];
      yLabels.forEach((label, idx) => {
        const y = padTop + (idx / (yLabels.length - 1)) * plotH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(label, padLeft - 6, y + 3);
      });

      // X ticks: 0 to 250
      const xTicks = [0, 50, 100, 150, 200, 250];
      xTicks.forEach((tick, idx) => {
        const x = padLeft + (idx / (xTicks.length - 1)) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tick.toString(), x, padTop + plotH + 16);
      });

      // Axis titles
      ctx.save();
      ctx.translate(12, padTop + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tracking Error (µrad)', 0, 0);
      ctx.restore();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Time (s)', padLeft + plotW / 2, height - 6);

      if (history.length > 2) {
        const mapLogY = (val: number) => {
          const clamped = Math.max(0.08, Math.min(150, val));
          const logVal = Math.log10(clamped);
          const norm = (2.0 - logVal) / 3.0; // 0 at top, 1 at bottom
          return padTop + Math.max(0, Math.min(plotH, norm * plotH));
        };

        // 1. Red Line: Traditional
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        history.forEach((pt, i) => {
          const x = padLeft + (i / Math.max(1, history.length - 1)) * plotW;
          const y = mapLogY(pt.errorTrad);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 2. Cyan Line: AI (Adaptive)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        history.forEach((pt, i) => {
          const x = padLeft + (i / Math.max(1, history.length - 1)) * plotW;
          const y = mapLogY(pt.errorAi);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Legend
      const legX = padLeft + plotW - 95;
      const legY = padTop + 8;
      ctx.fillStyle = 'rgba(5, 14, 29, 0.85)';
      ctx.fillRect(legX - 6, legY - 4, 98, 32);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.strokeRect(legX - 6, legY - 4, 98, 32);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legX, legY + 6); ctx.lineTo(legX + 16, legY + 6);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Traditional', legX + 22, legY + 9);

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legX, legY + 20); ctx.lineTo(legX + 16, legY + 20);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('AI (Adaptive)', legX + 22, legY + 23);

    } else if (graphTab === 'snr') {
      // Y ticks: 30 dB, 20 dB, 10 dB, 0 dB
      const yLabels = ['30 dB', '20 dB', '10 dB', '0 dB'];
      yLabels.forEach((label, idx) => {
        const y = padTop + (idx / (yLabels.length - 1)) * plotH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(label, padLeft - 6, y + 3);
      });

      // X ticks
      const xTicks = [0, 50, 100, 150, 200, 250];
      xTicks.forEach((tick, idx) => {
        const x = padLeft + (idx / (xTicks.length - 1)) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tick.toString(), x, padTop + plotH + 16);
      });

      // Axis title
      ctx.save();
      ctx.translate(12, padTop + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Signal-to-Noise Ratio (dB)', 0, 0);
      ctx.restore();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Time (s)', padLeft + plotW / 2, height - 6);

      if (history.length > 2) {
        const mapSnrY = (val: number) => {
          const clamped = Math.max(0, Math.min(30, val));
          const norm = 1.0 - (clamped / 30.0);
          return padTop + norm * plotH;
        };

        // Red: Traditional SNR
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        history.forEach((pt, i) => {
          const x = padLeft + (i / Math.max(1, history.length - 1)) * plotW;
          const y = mapSnrY(pt.snrTrad);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Cyan: AI SNR
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        history.forEach((pt, i) => {
          const x = padLeft + (i / Math.max(1, history.length - 1)) * plotW;
          const y = mapSnrY(pt.snrAi);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Legend
      const legX = padLeft + plotW - 95;
      const legY = padTop + 8;
      ctx.fillStyle = 'rgba(5, 14, 29, 0.85)';
      ctx.fillRect(legX - 6, legY - 4, 98, 32);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.strokeRect(legX - 6, legY - 4, 98, 32);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legX, legY + 6); ctx.lineTo(legX + 16, legY + 6);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Trad SNR', legX + 22, legY + 9);

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legX, legY + 20); ctx.lineTo(legX + 16, legY + 20);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('AI Enhanced', legX + 22, legY + 23);

    } else {
      // Pointing Angles: Yaw & Pitch in degrees
      const yLabels = ['+5.0°', '+2.5°', '0.0°', '-2.5°', '-5.0°'];
      yLabels.forEach((label, idx) => {
        const y = padTop + (idx / (yLabels.length - 1)) * plotH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(label, padLeft - 6, y + 3);
      });

      // X ticks
      const xTicks = [0, 50, 100, 150, 200, 250];
      xTicks.forEach((tick, idx) => {
        const x = padLeft + (idx / (xTicks.length - 1)) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tick.toString(), x, padTop + plotH + 16);
      });

      // Axis title
      ctx.save();
      ctx.translate(12, padTop + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pointing Angle (°)', 0, 0);
      ctx.restore();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Time (s)', padLeft + plotW / 2, height - 6);

      if (history.length > 2) {
        const mapAngleY = (val: number) => {
          const clamped = Math.max(-5.0, Math.min(5.0, val));
          const norm = (5.0 - clamped) / 10.0;
          return padTop + norm * plotH;
        };

        // Yaw (Cyan)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        history.forEach((pt, i) => {
          const x = padLeft + (i / Math.max(1, history.length - 1)) * plotW;
          const y = mapAngleY(pt.yaw);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Pitch (Yellow)
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        history.forEach((pt, i) => {
          const x = padLeft + (i / Math.max(1, history.length - 1)) * plotW;
          const y = mapAngleY(pt.pitch);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Legend
      const legX = padLeft + plotW - 95;
      const legY = padTop + 8;
      ctx.fillStyle = 'rgba(5, 14, 29, 0.85)';
      ctx.fillRect(legX - 6, legY - 4, 98, 32);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.strokeRect(legX - 6, legY - 4, 98, 32);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legX, legY + 6); ctx.lineTo(legX + 16, legY + 6);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Yaw Angle', legX + 22, legY + 9);

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legX, legY + 20); ctx.lineTo(legX + 16, legY + 20);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Pitch Angle', legX + 22, legY + 23);
    }
  }, [simSeconds, graphTab, disturbances]);

  // 3. Render the 5 Thumbnail Animated Preview Canvases in the Right Column (Disturbance-Reactive)
  useEffect(() => {
    let animId: number;

    const renderPreviews = () => {
      const time = performance.now() * 0.002;
      const d = disturbancesRef.current;

      // 1. Environment Preview: Star field, Stray Sunlight Glare, and Space Debris
      if (envThumbCanvasRef.current) {
        const cvs = envThumbCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050a16';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          // Sunlight Glare Gradient reacting to strayLightSunlight
          if (d.strayLightSunlight > 5) {
            const gAlpha = Math.min(0.65, (d.strayLightSunlight / 100) * 0.75);
            const glare = ctx.createRadialGradient(cvs.width * 0.85, 0, 2, cvs.width * 0.85, 0, cvs.width * 0.85);
            glare.addColorStop(0, `rgba(255, 230, 160, ${gAlpha})`);
            glare.addColorStop(0.5, `rgba(255, 180, 70, ${gAlpha * 0.4})`);
            glare.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glare;
            ctx.fillRect(0, 0, cvs.width, cvs.height);
          }

          // Star dots reacting to starFieldDensity & backgroundStarNoise
          const starCount = Math.floor(12 + (d.starFieldDensity / 100) * 45);
          const noiseAlpha = Math.min(1.0, 0.4 + (d.backgroundStarNoise / 100) * 0.6);
          ctx.fillStyle = `rgba(255, 255, 255, ${noiseAlpha})`;
          for (let i = 0; i < starCount; i++) {
            const sx = (Math.sin(i * 43.1 + (d.cosmicRayEvents > 0 ? Math.sin(time + i) * 0.05 : 0)) * 0.5 + 0.5) * cvs.width;
            const sy = (Math.cos(i * 87.3) * 0.5 + 0.5) * cvs.height;
            const sz = (i % 5 === 0) ? 1.6 : 1.0;
            ctx.fillRect(sx, sy, sz, sz);
          }

          // Bright celestial object (planet/star)
          const objAlpha = (d.otherBrightObjects / 100);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cvs.width * 0.65, cvs.height * 0.38, 2.5 + objAlpha * 1.5, 0, Math.PI * 2);
          ctx.fill();
          const halo = ctx.createRadialGradient(cvs.width * 0.65, cvs.height * 0.38, 1, cvs.width * 0.65, cvs.height * 0.38, 12 + objAlpha * 8);
          halo.addColorStop(0, `rgba(255, 255, 255, ${0.4 + objAlpha * 0.5})`);
          halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(cvs.width * 0.65, cvs.height * 0.38, 12 + objAlpha * 8, 0, Math.PI * 2);
          ctx.fill();

          // Tumbling Space Debris Particles
          const debCount = Math.floor((d.spaceDebrisDensity / 100) * 8);
          ctx.fillStyle = '#94a3b8';
          for (let i = 0; i < debCount; i++) {
            const dx = ((i * 18 + time * 14) % (cvs.width + 10)) - 5;
            const dy = 15 + ((i * 12 + Math.sin(time * 3 + i) * 8) % (cvs.height - 20));
            ctx.fillRect(dx, dy, 2, 2);
          }
        }
      }

      // 2. Target Preview: Glowing Red Beacon with diffraction spikes & flicker
      if (targetThumbCanvasRef.current) {
        const cvs = targetThumbCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050a16';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          // Jitter offset from targetRandomMotionJitter
          const jMag = (d.targetRandomMotionJitter / 100) * 4;
          const cx = cvs.width / 2 + Math.sin(time * 18) * jMag;
          const cy = cvs.height / 2 + Math.cos(time * 22) * jMag;

          // Flicker fluctuation
          const flicker = 1.0 + (d.beaconIntensityFluctuation / 100) * Math.sin(time * 16) * 0.35;
          const bBright = Math.max(0.2, (d.beaconBrightness / 100) * 1.5 * flicker);
          const bSize = Math.max(0.4, (d.beaconApparentSize / 100));

          // Red diffraction glow
          const rad = Math.max(8, 22 * bSize * Math.sqrt(bBright));
          const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.25, `rgba(255, 60, 40, ${Math.min(1.0, 0.9 * bBright)})`);
          grad.addColorStop(0.65, `rgba(255, 0, 50, ${Math.min(0.8, 0.5 * bBright)})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.fill();

          // Square aperture pattern
          const sqSize = 12 * bSize;
          ctx.strokeStyle = `rgba(255, 70, 50, ${Math.min(1.0, 0.85 * bBright)})`;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(cx - sqSize / 2, cy - sqSize / 2, sqSize, sqSize);

          // White center core
          const coreHalf = Math.max(1, 2 * bSize);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - coreHalf, cy - coreHalf, coreHalf * 2, coreHalf * 2);
        }
      }

      // 3. Sensor Preview: Airy Disk Defocus, Sensor Noise, Hot Pixels & Motion Blur
      if (sensorThumbCanvasRef.current) {
        const cvs = sensorThumbCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050a16';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          const cx = cvs.width / 2;
          const cy = cvs.height / 2;

          // Defocus concentric rings based on defocusAberration / focusBlur
          const blurFactor = Math.max(0.2, (d.defocusAberration || d.focusBlur || 20) / 100);
          const ringAlpha = Math.min(0.7, 0.2 + blurFactor * 0.5);
          ctx.strokeStyle = `rgba(180, 210, 255, ${ringAlpha})`;
          ctx.lineWidth = 1.0;

          const maxR = Math.floor(10 + blurFactor * 22);
          for (let r = 4; r <= maxR; r += 4 + Math.floor(blurFactor * 3)) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Motion Blur streak
          if (d.motionBlur > 10) {
            const streakLen = (d.motionBlur / 100) * 16;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(cx - streakLen, cy);
            ctx.lineTo(cx + streakLen, cy);
            ctx.stroke();
          }

          // Readout noise reacting to sensorReadoutNoise / sensorNoise
          const noiseCount = Math.floor(15 + ((d.sensorReadoutNoise || d.sensorNoise || 30) / 100) * 80);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          for (let i = 0; i < noiseCount; i++) {
            const rx = Math.random() * cvs.width;
            const ry = Math.random() * cvs.height;
            ctx.fillRect(rx, ry, 1, 1);
          }

          // Hot pixels / Cosmic rays (colored dots)
          if (d.deadHotPixels > 5 || d.cosmicRayEvents > 5) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(16, 22, 1.5, 1.5);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(cvs.width - 18, cvs.height - 24, 1.5, 1.5);
          }
        }
      }

      // 4. Platform Preview: Satellite vibration waveform, attitude drift, jitter
      if (platformThumbCanvasRef.current) {
        const cvs = platformThumbCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050a16';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          // Pointing Bias DC offset
          const biasOffset = ((d.pointingBias || 20) / 100 - 0.5) * 18;
          // Attitude drift slow baseline
          const attDrift = Math.sin(time * 2.5) * ((d.attitudeFluctuation || 20) / 100) * 10;
          const cy = cvs.height / 2 + biasOffset + attDrift;

          // Vibration amplitude
          const vibAmp = Math.max(2, ((d.satelliteVibration || d.vibration || 30) / 100) * 18);
          const jitterAmp = ((d.angularJitter || 15) / 100) * 5;

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let x = 0; x < cvs.width; x++) {
            const freq1 = Math.sin(x * 0.28 + time * 7) * vibAmp;
            const freq2 = Math.sin(x * 0.95 + time * 18) * jitterAmp;
            const y = cy + freq1 + freq2;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // 5. Atmospheric Preview: Turbulence Swirls, Scintillation & Beam Wander
      if (atmThumbCanvasRef.current) {
        const cvs = atmThumbCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050a16';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          const turb = (d.atmosphericTurbulence || 15) / 100;
          const fog = (d.cloudFogCoverage || 10) / 100;
          const scint = 1.0 - (d.scintillation / 100) * (Math.sin(time * 12) * 0.3 + 0.3);

          // Atmospheric cloud swirls
          const swirlCount = Math.floor(5 + turb * 8);
          for (let i = 0; i < swirlCount; i++) {
            const cx = (Math.sin(i * 1.5 + time * (1 + turb)) * 0.3 + 0.5) * cvs.width;
            const cy = (Math.cos(i * 1.2 + time * (1 + turb)) * 0.3 + 0.5) * cvs.height;
            const rad = (10 + Math.sin(time * 2 + i) * 4) * (1 + turb * 0.8);
            const cGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
            const aVal = Math.min(0.7, (0.2 + fog * 0.45 + turb * 0.2) * scint);
            cGrad.addColorStop(0, `rgba(180, 200, 230, ${aVal})`);
            cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = cGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
          }

          // Wandering Laser Spot through atmosphere
          const wSpotX = cvs.width * 0.5 + Math.sin(time * 8) * (d.beamWander / 100) * 14;
          const wSpotY = cvs.height * 0.5 + Math.cos(time * 10) * (d.beamWander / 100) * 14;
          ctx.fillStyle = `rgba(34, 197, 94, ${Math.max(0.3, scint)})`;
          ctx.beginPath();
          ctx.arc(wSpotX, wSpotY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(renderPreviews);
    };

    animId = requestAnimationFrame(renderPreviews);
    return () => cancelAnimationFrame(animId);
  }, []);

  const difficulty = calculateTrackingDifficulty(disturbances);

  return (
    <div className="w-full bg-[#030712] text-slate-100 flex flex-col font-sans select-none border-b border-slate-800">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER NAVIGATION BAR (Exact Match to Reference Screenshot)        */}
      {/* ========================================================================= */}
      <header className="w-full bg-[#050e1d] border-b border-cyan-500/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Mission Title & Simulation Subtitle */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <Satellite className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-white uppercase font-mono">
              AI-ASSISTED OPTICAL TERMINAL TRACKING
            </h1>
            <p className="text-[11px] text-cyan-400 font-medium tracking-wide">
              Satellite-to-Satellite FSOC Simulation
            </p>
          </div>
        </div>

        {/* Center-Left: Sim Controls (Start, Pause, Reset) */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-header-start"
            onClick={onToggleRunning}
            className={`px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              isRunning
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start</span>
          </button>
          <button
            id="btn-header-pause"
            onClick={onToggleRunning}
            className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
              !isRunning
                ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
          <button
            id="btn-header-reset"
            onClick={onReset}
            className="px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-all text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Center: Tracking Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Tracking Mode:</span>
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5">
            <button
              id="btn-mode-traditional"
              onClick={() => onArchitectureChange('TRADITIONAL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                architecture === 'TRADITIONAL'
                  ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Traditional
            </button>
            <button
              id="btn-mode-ai-adaptive"
              onClick={() => onArchitectureChange('AI_ASSISTED')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                architecture === 'AI_ASSISTED'
                  ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AI (Adaptive)
            </button>
          </div>
        </div>

        {/* Center-Right: View Mode */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">View:</span>
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5">
            {(['free', 'camera', 'chase', 'top'] as const).map((mode) => (
              <button
                key={mode}
                id={`btn-view-${mode}`}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 rounded text-xs font-medium capitalize transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'free' ? 'Free View' : mode === 'camera' ? 'Camera View' : mode === 'chase' ? 'Chase View' : 'Top View'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Sim Time Digital Clock */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Sim Time</span>
          <div className="font-mono text-sm px-2.5 py-1 rounded bg-[#061124] border border-cyan-500/40 text-cyan-300 font-bold tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            {clockStr}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN 3-COLUMN DASHBOARD BODY                                           */}
      {/* ========================================================================= */}
      <div className="w-full p-2.5 grid grid-cols-1 xl:grid-cols-12 gap-2.5">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: Mission & Link Status + Camera Settings + Camera View      */}
        {/* ======================================================================= */}
        <div className="xl:col-span-3 flex flex-col gap-2.5">
          {/* 1. Mission & Link Status */}
          <div className="bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg text-xs">
            <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              Mission & Link Status
            </h3>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Link Status</span>
                <span className="font-bold text-emerald-400">: TRACKING</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">PAT State</span>
                <span className="text-slate-200">: {patState === 'LOCKED' ? 'FINE TRACKING' : patState}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Distance (A-B)</span>
                <span className="text-slate-200">: {targetGeometry.distanceKm.toFixed(0)} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Data Rate</span>
                <span className="text-slate-200">: {linkBudget.dataRateGbps.toFixed(1)} Gbps (sim)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Received Power</span>
                <span className="text-slate-200">: {linkBudget.receivedPowerDbm.toFixed(1)} dBm</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">SNR</span>
                <span className="text-slate-200">: {(detection.snrEstimate || linkBudget.snrDb).toFixed(1)} dB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pointing Error</span>
                <span className="text-slate-200">: {detection.totalAngularError.toFixed(1)} µrad</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Link Margin</span>
                <span className="text-slate-200">: {linkBudget.linkMarginDb.toFixed(1)} dB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Wavelength</span>
                <span className="text-slate-200">: {linkBudget.wavelengthNm} nm</span>
              </div>
            </div>
          </div>

          {/* 2. Camera (Terminal A) Settings */}
          <div className="bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg text-xs">
            <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              Camera (Terminal A) Settings
            </h3>
            <div className="space-y-2 text-[11px]">
              {/* Resolution */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Resolution</span>
                <select
                  id="select-camera-resolution"
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-[11px] font-mono"
                  value={`${cameraSpecs.width} × ${cameraSpecs.height}`}
                  onChange={(e) => {
                    const [w, h] = e.target.value.split(' × ').map(Number);
                    onCameraChange({ width: w, height: h });
                  }}
                >
                  <option value="640 × 480">640 × 480</option>
                  <option value="1280 × 720">1280 × 720</option>
                  <option value="1920 × 1080">1920 × 1080</option>
                </select>
              </div>

              {/* Field of View (FOV) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Field of View (FOV)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    id="slider-camera-fov"
                    type="range"
                    min={0.5}
                    max={15}
                    step={0.1}
                    value={cameraSpecs.fov}
                    onChange={(e) => onCameraChange({ fov: parseFloat(e.target.value) })}
                    className="w-20 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-cyan-300 w-9 text-right">{cameraSpecs.fov.toFixed(1)}°</span>
                </div>
              </div>

              {/* Focal Length */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Focal Length</span>
                <div className="flex items-center gap-1.5">
                  <input
                    id="slider-focal-length"
                    type="range"
                    min={200}
                    max={1600}
                    step={50}
                    value={focalLength}
                    onChange={(e) => setFocalLength(parseInt(e.target.value))}
                    className="w-20 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-cyan-300 w-12 text-right">{focalLength} mm</span>
                </div>
              </div>

              {/* Frame Rate */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Frame Rate</span>
                <div className="flex items-center gap-1.5">
                  <input
                    id="slider-frame-rate"
                    type="range"
                    min={15}
                    max={120}
                    step={5}
                    value={frameRate}
                    onChange={(e) => setFrameRate(parseInt(e.target.value))}
                    className="w-20 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-cyan-300 w-12 text-right">{frameRate} FPS</span>
                </div>
              </div>

              {/* Exposure */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Exposure</span>
                <div className="flex items-center gap-1.5">
                  <input
                    id="slider-exposure"
                    type="range"
                    min={1}
                    max={25}
                    step={1}
                    value={exposureMs}
                    onChange={(e) => setExposureMs(parseInt(e.target.value))}
                    className="w-20 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-cyan-300 w-9 text-right">{exposureMs} ms</span>
                </div>
              </div>

              {/* Gain */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Gain</span>
                <div className="flex items-center gap-1.5">
                  <input
                    id="slider-gain"
                    type="range"
                    min={0.5}
                    max={4.0}
                    step={0.1}
                    value={cameraSpecs.sensitivity || 1.0}
                    onChange={(e) => onCameraChange({ sensitivity: parseFloat(e.target.value) })}
                    className="w-20 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-cyan-300 w-9 text-right">{(cameraSpecs.sensitivity || 1.0).toFixed(1)}</span>
                </div>
              </div>

              {/* Zoom */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Zoom</span>
                <div className="flex items-center gap-1.5">
                  <input
                    id="slider-zoom"
                    type="range"
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    value={cameraSpecs.zoom}
                    onChange={(e) => onCameraChange({ zoom: parseFloat(e.target.value) })}
                    className="w-20 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-cyan-300 w-9 text-right">{cameraSpecs.zoom.toFixed(1)}x</span>
                </div>
              </div>

              {/* Focus Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Focus</span>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5 text-[10px]">
                  <button
                    id="btn-focus-auto"
                    onClick={() => onCameraChange({ focus: 1.0 })}
                    className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold"
                  >
                    Auto
                  </button>
                  <button
                    id="btn-focus-manual"
                    onClick={() => onCameraChange({ focus: 0.8 })}
                    className="px-2 py-0.5 rounded text-slate-400 hover:text-slate-200"
                  >
                    Manual
                  </button>
                </div>
              </div>

              {/* Filter (Wavelength) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Filter (Wavelength)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    id="slider-filter-wavelength"
                    type="range"
                    min={850}
                    max={1650}
                    step={10}
                    value={filterWavelength}
                    onChange={(e) => setFilterWavelength(parseInt(e.target.value))}
                    className="w-20 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-cyan-300 w-12 text-right">{filterWavelength} nm</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Camera View (What AI Sees) */}
          <div className="bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg flex flex-col gap-1.5 text-xs">
            <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-1">
              Camera View (What AI Sees)
            </h3>
            <div className="relative w-full aspect-[4/3] bg-black rounded border border-slate-800 overflow-hidden">
              <canvas
                ref={sensorCanvasRef}
                width={320}
                height={240}
                className="w-full h-full object-contain"
              />
              {/* Top-Right Overlays: Detected: YES, Confidence: 72.3%, X, Y, ΔX, ΔY */}
              <div className="absolute top-2 right-2 bg-slate-950/80 border border-slate-700/60 rounded px-2 py-1 text-[10px] font-mono text-right pointer-events-none">
                <div className="text-emerald-400 font-bold">Detected: YES</div>
                <div className="text-emerald-400">Confidence: {(detection.confidence || 72.3).toFixed(1)}%</div>
                <div className="text-slate-300 mt-1">X: {Math.round(detection.x)} px</div>
                <div className="text-slate-300">Y: {Math.round(detection.y)} px</div>
                <div className="text-slate-300">ΔX: {Math.round(detection.errorX)} px</div>
                <div className="text-slate-300">ΔY: {Math.round(detection.errorY)} px</div>
              </div>

              {/* Bottom Overlays: FOV & Mode */}
              <div className="absolute bottom-1.5 left-2 text-[10px] font-mono text-slate-400 pointer-events-none">
                FOV: 2.0° × 1.5°
              </div>
              <div className="absolute bottom-1.5 right-2 text-[10px] font-mono text-cyan-400 font-semibold pointer-events-none">
                Mode: {architecture === 'AI_ASSISTED' ? 'AI Tracking' : 'Traditional Centroid'}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CENTER COLUMN: 3D Virtual Space View + Bottom Metrics / Response / Graph*/}
        {/* ======================================================================= */}
        <div className="xl:col-span-6 flex flex-col gap-2.5">
          {/* Top: 3D Virtual Space World Environment (The Masterpiece) */}
          <div className="w-full h-[410px] relative rounded-lg border border-cyan-500/40 overflow-hidden shadow-2xl bg-black">
            {/* Multi-Scale Switcher Ribbon in 3D Space (SPACE, ORBIT, REGIONAL, LOCAL, GROUND) */}
            <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-[#050e1d]/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-1 text-[10px] font-mono">
              <span className="text-slate-400 px-1 font-sans">SCALE:</span>
              {(['SPACE', 'ORBIT', 'REGIONAL', 'LOCAL', 'GROUND'] as const).map((sc) => (
                <button
                  key={sc}
                  id={`btn-scale-${sc.toLowerCase()}`}
                  onClick={() => setSimScale(sc)}
                  className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                    simScale === sc
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>

            {/* Comm Scenario Quick Selector */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
              <select
                id="select-mission-scenario"
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="bg-[#050e1d]/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 rounded-lg px-2 py-1 text-[11px] font-mono cursor-pointer"
              >
                <option value="sat_to_sat_fsoc">Scenario 1: Satellite ↔ Satellite FSOC</option>
                <option value="sat_to_ground">Scenario 2: Satellite → Ground Optical Link</option>
                <option value="aircraft_relay">Scenario 3: Satellite → Aircraft Relay</option>
                <option value="constellation_mesh">Scenario 4: Multi-Satellite Constellation Mesh</option>
                <option value="deep_ocean_ship">Scenario 5: Satellite ↔ Deep Ocean Ship</option>
              </select>
            </div>

            {/* Render 3D Space World with Earth, Sun, Satellites, Laser */}
            <SpaceWorld3D
              cameraSpecs={cameraSpecs}
              targetGeometry={targetGeometry}
              patState={patState}
              laserConnected={linkBudget.status === 'CONNECTED'}
              beamDivergenceUrad={linkBudget.beamDivergenceUrad}
              simSpeed={simSpeed}
              isRunning={isRunning}
              linkBudget={linkBudget}
              motionParams={motionParams}
            />
          </div>

          {/* Bottom Center: 3 Sub-Panels in a Row */}
          {/* Sub-panel 1: Tracking Metrics (AI) | Sub-panel 2: AI Tracking Response | Sub-panel 3: Real-time Graphs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Sub-panel 1: Tracking Metrics (AI) */}
            <div className="bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg text-xs">
              <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                Tracking Metrics (AI)
              </h3>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Yaw</span>
                  <span className="text-slate-200">: {cameraSpecs.yaw.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Pitch</span>
                  <span className="text-slate-200">: {cameraSpecs.pitch.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Yaw Rate</span>
                  <span className="text-slate-200">: {(cameraSpecs.yawRate || 0.8).toFixed(1)}°/s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Pitch Rate</span>
                  <span className="text-slate-200">: {(cameraSpecs.pitchRate || 0.8).toFixed(1)}°/s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tracking Error</span>
                  <span className="text-slate-200">: {detection.totalAngularError.toFixed(1)} µrad</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Detection Confidence</span>
                  <span className="text-slate-200">: {(detection.confidence || 72.3).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Prediction Error</span>
                  <span className="text-slate-200">: {(detection.aiPrediction?.predictionErrorPx || 8.1).toFixed(1)} µrad</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Controller Output</span>
                  <span className="text-slate-200">: Active (AI + PID)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tracking Stability</span>
                  <span className="text-emerald-400 font-bold">: Good</span>
                </div>
              </div>
            </div>

            {/* Sub-panel 2: AI Tracking Response */}
            <div className="bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg text-xs">
              <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                AI Tracking Response
              </h3>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Beacon detection (under noise)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Noise filtering (Kalman + AI)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Motion prediction (active)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Adaptive control (enabled)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Disturbance compensation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">Maintaining lock under disturbance</span>
                </div>
              </div>
            </div>

            {/* Sub-panel 3: Real-time Graphs */}
            <div className="bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg flex flex-col text-xs">
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-800 pb-1">
                <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  Real-time Graphs
                </h3>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5 text-[10px]">
                  <button
                    id="tab-graph-tracking-error"
                    onClick={() => setGraphTab('trackingError')}
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      graphTab === 'trackingError' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tracking Error
                  </button>
                  <button
                    id="tab-graph-snr"
                    onClick={() => setGraphTab('snr')}
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      graphTab === 'snr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    SNR
                  </button>
                  <button
                    id="tab-graph-pointing-angles"
                    onClick={() => setGraphTab('pointingAngles')}
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      graphTab === 'pointingAngles' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pointing Angles
                  </button>
                </div>
              </div>
              <div className="relative w-full h-[155px] bg-[#060a14] rounded border border-slate-800 overflow-hidden">
                <canvas
                  ref={graphCanvasRef}
                  width={280}
                  height={155}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: Disturbance & Environment Controls with 5 Live Thumbnails */}
        {/* ======================================================================= */}
        <div className="xl:col-span-3 flex flex-col gap-2">
          <div className="bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg text-xs">
            {/* Header and Category Tabs */}
            <div className="flex flex-col gap-2 mb-2 border-b border-slate-800 pb-2">
              <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider">
                Disturbance & Environment Controls
              </h3>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {(['all', 'environment', 'target', 'sensor', 'platform', 'atmospheric'] as const).map((tab) => (
                  <button
                    key={tab}
                    id={`btn-dist-tab-${tab}`}
                    onClick={() => setDisturbanceTab(tab)}
                    className={`px-2 py-1 rounded font-medium capitalize transition-all cursor-pointer ${
                      disturbanceTab === tab
                        ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                        : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'target' ? 'Target / Beacon' : tab === 'sensor' ? 'Sensor / Camera' : tab === 'atmospheric' ? 'Atmospheric' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Stacked Disturbance Sections Matching Screenshot Layout */}
            <div className="space-y-3 text-[11px]">
              {/* 1. Environment Disturbances */}
              {(disturbanceTab === 'all' || disturbanceTab === 'environment') && (
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex-1 space-y-1.5">
                    <h4 className="text-cyan-300 font-semibold text-[11px]">Environment Disturbances</h4>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Background Star Noise</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.backgroundStarNoise}
                          onChange={(e) => onDisturbanceChange({ backgroundStarNoise: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.backgroundStarNoise}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Stray Light / Sunlight</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.strayLightSunlight}
                          onChange={(e) => onDisturbanceChange({ strayLightSunlight: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.strayLightSunlight}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Other Bright Objects (Planets)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.otherBrightObjects}
                          onChange={(e) => onDisturbanceChange({ otherBrightObjects: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.otherBrightObjects}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Space Debris Density</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.spaceDebrisDensity}
                          onChange={(e) => onDisturbanceChange({ spaceDebrisDensity: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.spaceDebrisDensity}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Star Field Density</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.starFieldDensity}
                          onChange={(e) => onDisturbanceChange({ starFieldDensity: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.starFieldDensity}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Cosmic Ray (Hot Pixels)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.cosmicRayEvents}
                          onChange={(e) => onDisturbanceChange({ cosmicRayEvents: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.cosmicRayEvents}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Animated Thumbnail Preview 1 */}
                  <div className="w-18 h-18 bg-black rounded border border-slate-800 shrink-0 overflow-hidden shadow">
                    <canvas ref={envThumbCanvasRef} width={72} height={72} className="w-full h-full" />
                  </div>
                </div>
              )}

              {/* 2. Target / Beacon Disturbances */}
              {(disturbanceTab === 'all' || disturbanceTab === 'target') && (
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex-1 space-y-1.5">
                    <h4 className="text-cyan-300 font-semibold text-[11px]">Target / Beacon Disturbances</h4>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Beacon Brightness</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.beaconBrightness}
                          onChange={(e) => onDisturbanceChange({ beaconBrightness: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.beaconBrightness}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Intensity Fluctuation</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.beaconIntensityFluctuation}
                          onChange={(e) => onDisturbanceChange({ beaconIntensityFluctuation: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.beaconIntensityFluctuation}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Beacon Size (Apparent)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={20}
                          max={150}
                          value={disturbances.beaconApparentSize}
                          onChange={(e) => onDisturbanceChange({ beaconApparentSize: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.beaconApparentSize}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Beacon Color / Wavelength</span>
                      <select
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                        value="1550"
                        onChange={() => {}}
                      >
                        <option value="1550">Red (1550 nm)</option>
                        <option value="1064">NIR (1064 nm)</option>
                        <option value="850">Red (850 nm)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Target Motion Speed</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.targetMotionSpeed}
                          onChange={(e) => onDisturbanceChange({ targetMotionSpeed: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.targetMotionSpeed}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Target Trajectory</span>
                      <select
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                        value={motionParams.trajectory}
                        onChange={(e) => onMotionChange({ trajectory: e.target.value as any })}
                      >
                        <option value="circular">Circular</option>
                        <option value="orbital">Orbital</option>
                        <option value="linear">Linear</option>
                        <option value="figure8">Figure-8</option>
                        <option value="random">Random</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Random Motion (Jitter)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.targetRandomMotionJitter}
                          onChange={(e) => onDisturbanceChange({ targetRandomMotionJitter: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.targetRandomMotionJitter}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Animated Thumbnail Preview 2 */}
                  <div className="w-18 h-18 bg-black rounded border border-slate-800 shrink-0 overflow-hidden shadow">
                    <canvas ref={targetThumbCanvasRef} width={72} height={72} className="w-full h-full" />
                  </div>
                </div>
              )}

              {/* 3. Sensor / Camera Disturbances */}
              {(disturbanceTab === 'all' || disturbanceTab === 'sensor') && (
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex-1 space-y-1.5">
                    <h4 className="text-cyan-300 font-semibold text-[11px]">Sensor / Camera Disturbances</h4>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Image Noise</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.imageNoise}
                          onChange={(e) => onDisturbanceChange({ imageNoise: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.imageNoise}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Gaussian Noise</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.gaussianNoise}
                          onChange={(e) => onDisturbanceChange({ gaussianNoise: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.gaussianNoise}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Motion Blur</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.motionBlur}
                          onChange={(e) => onDisturbanceChange({ motionBlur: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.motionBlur}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Focus Blur (Defocus)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.focusBlur}
                          onChange={(e) => onDisturbanceChange({ focusBlur: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.focusBlur}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Exposure Variation</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.exposureVariation}
                          onChange={(e) => onDisturbanceChange({ exposureVariation: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.exposureVariation}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Pixel Dropout</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.pixelDropout}
                          onChange={(e) => onDisturbanceChange({ pixelDropout: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.pixelDropout}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Animated Thumbnail Preview 3 */}
                  <div className="w-18 h-18 bg-black rounded border border-slate-800 shrink-0 overflow-hidden shadow">
                    <canvas ref={sensorThumbCanvasRef} width={72} height={72} className="w-full h-full" />
                  </div>
                </div>
              )}

              {/* 4. Platform / Pointing Disturbances */}
              {(disturbanceTab === 'all' || disturbanceTab === 'platform') && (
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex-1 space-y-1.5">
                    <h4 className="text-cyan-300 font-semibold text-[11px]">Platform / Pointing Disturbances</h4>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Satellite Vibration (Jitter)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.satelliteVibration}
                          onChange={(e) => onDisturbanceChange({ satelliteVibration: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.satelliteVibration}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Pointing Error (Bias)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.pointingBias}
                          onChange={(e) => onDisturbanceChange({ pointingBias: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.pointingBias}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Control Delay</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.controlDelay}
                          onChange={(e) => onDisturbanceChange({ controlDelay: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.controlDelay}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Attitude Fluctuation</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.attitudeFluctuation}
                          onChange={(e) => onDisturbanceChange({ attitudeFluctuation: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.attitudeFluctuation}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Animated Thumbnail Preview 4 */}
                  <div className="w-18 h-18 bg-black rounded border border-slate-800 shrink-0 overflow-hidden shadow">
                    <canvas ref={platformThumbCanvasRef} width={72} height={72} className="w-full h-full" />
                  </div>
                </div>
              )}

              {/* 5. Atmospheric / Propagation (Optional) */}
              {(disturbanceTab === 'all' || disturbanceTab === 'atmospheric') && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <h4 className="text-cyan-300 font-semibold text-[11px]">Atmospheric / Propagation (Optional)</h4>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Atmospheric Turbulence</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.atmosphericTurbulence}
                          onChange={(e) => onDisturbanceChange({ atmosphericTurbulence: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.atmosphericTurbulence}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Scintillation</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.scintillation}
                          onChange={(e) => onDisturbanceChange({ scintillation: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.scintillation}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Beam Wander</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.beamWander}
                          onChange={(e) => onDisturbanceChange({ beamWander: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.beamWander}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[10px]">Attenuation (Cloud/Fog)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={disturbances.cloudFogAttenuation}
                          onChange={(e) => onDisturbanceChange({ cloudFogAttenuation: parseInt(e.target.value) })}
                          className="w-16 accent-cyan-500 h-1 bg-slate-800"
                        />
                        <span className="font-mono text-cyan-400 text-[10px] w-6 text-right">{disturbances.cloudFogAttenuation}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Animated Thumbnail Preview 5 */}
                  <div className="w-18 h-18 bg-black rounded border border-slate-800 shrink-0 overflow-hidden shadow">
                    <canvas ref={atmThumbCanvasRef} width={72} height={72} className="w-full h-full" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM ROW: Notifications + Presets + AI Analysis + Difficulty Gauge   */}
      {/* ========================================================================= */}
      <div className="w-full px-2.5 pb-2.5 grid grid-cols-1 md:grid-cols-12 gap-2.5 text-xs">
        {/* Card 1: Simulation Events / Notifications (3 cols) */}
        <div className="md:col-span-3 bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg">
          <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
            Simulation Events / Notifications
          </h3>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-slate-400">00:12:15</span>
              <span className="text-slate-200 truncate">AI compensating for high background noise...</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-slate-400">00:12:22</span>
              <span className="text-slate-200 truncate">Beacon detection recovered.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-slate-400">00:12:30</span>
              <span className="text-slate-200 truncate">Increased target motion. Tracking stable.</span>
            </div>
          </div>
        </div>

        {/* Card 2: Quick Disturbance Presets (3 cols) */}
        <div className="md:col-span-3 bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg">
          <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
            Quick Disturbance Presets
          </h3>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            {[
              { id: 'ideal', name: 'Ideal (No Disturbance)' },
              { id: 'low', name: 'Low Noise' },
              { id: 'high_noise', name: 'High Noise' },
              { id: 'strong_disturbance', name: 'Strong Disturbance' },
              { id: 'dense_debris', name: 'Dense Debris Field' },
              { id: 'weak_beacon', name: 'Weak Beacon' },
              { id: 'fast_target', name: 'Fast Target' },
              { id: 'extreme', name: 'Extreme (Link at Risk)' },
            ].map((p) => {
              const isActive = activePresetId === p.id;
              return (
                <button
                  key={p.id}
                  id={`btn-preset-${p.id}`}
                  onClick={() => {
                    setActivePresetId(p.id);
                    const found = DISTURBANCE_PRESETS.find((dp) => dp.id === p.id);
                    if (found) {
                      onApplyPreset(found.values);
                    }
                  }}
                  className={`px-1.5 py-1 rounded text-center truncate font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-600/90 text-white font-bold border border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 3: AI Analysis & Suggestions (3 cols) */}
        <div className="md:col-span-3 bg-[#1e0a0a]/90 border border-red-500/40 rounded-lg p-2.5 shadow-lg flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="uppercase tracking-wide">AI Analysis & Suggestions</span>
            </div>
            <div className="space-y-1 text-amber-200/90 text-[11px] leading-snug">
              <p>High disturbance detected. Link margin is low.</p>
              <p>Beacon SNR reduced due to background light and noise.</p>
              <p>AI is increasing prediction horizon and adaptive gain.</p>
              <p>If disturbances increase further, reacquisition may be required.</p>
            </div>
          </div>
        </div>

        {/* Card 4: Current Difficulty Level (3 cols) */}
        <div className="md:col-span-3 bg-[#050e1d]/95 border border-cyan-500/30 rounded-lg p-2.5 shadow-lg flex flex-col justify-between text-xs">
          <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
            Current Difficulty Level
          </h3>

          <div className="space-y-2">
            {/* Horizontal Gradient Slider */}
            <div className="relative w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-red-600" />
              {/* Indicator Dot at Moderate-High (approx 78%) */}
              <div
                className="absolute top-0 bottom-0 w-3 bg-white border-2 border-slate-950 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] -translate-x-1/2"
                style={{ left: `${Math.min(95, Math.max(5, difficulty.score))}%` }}
              />
            </div>

            <div className="text-center">
              <div className="text-slate-100 font-bold text-sm">
                {difficulty.score > 75 ? 'High - Critical' : difficulty.score > 50 ? 'Moderate - High' : 'Low - Moderate'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Tracking is getting difficult. Further increase may cause link loss.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
