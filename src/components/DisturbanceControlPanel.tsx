import React, { useState, useEffect, useRef } from 'react';
import { 
  Disturbances, 
  DisturbanceCategory, 
  DisturbanceEducationalDetail 
} from '../types';
import { 
  DISTURBANCE_PRESETS, 
  DEFAULT_DISTURBANCES, 
  EDUCATIONAL_CATALOG,
  calculateTrackingDifficulty 
} from '../data/disturbanceCatalog';
import { 
  Sliders, 
  RotateCcw, 
  Info, 
  Sun, 
  Zap, 
  Camera, 
  Activity, 
  Wind, 
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface DisturbanceControlPanelProps {
  disturbances: Disturbances;
  onChange: (updated: Partial<Disturbances>) => void;
  onReset: () => void;
  onApplyPreset: (presetValues: Partial<Disturbances>) => void;
}

export const DisturbanceControlPanel: React.FC<DisturbanceControlPanelProps> = ({
  disturbances,
  onChange,
  onReset,
  onApplyPreset,
}) => {
  const [activeTab, setActiveTab] = useState<DisturbanceCategory>('environment');
  const [selectedDisturbanceKey, setSelectedDisturbanceKey] = useState<string>('satelliteVibration');

  // Preview canvas refs for live animated visual feedback
  const envCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sensorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const platformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const atmCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active educational info
  const selectedInfo: DisturbanceEducationalDetail = 
    EDUCATIONAL_CATALOG[selectedDisturbanceKey] || EDUCATIONAL_CATALOG['satelliteVibration'];

  // Calculate difficulty score
  const difficulty = calculateTrackingDifficulty(disturbances);

  // 1. Animated Visual Previews
  useEffect(() => {
    let animId: number;

    const renderPreviews = () => {
      const time = performance.now() * 0.002;

      // Environment Canvas
      if (activeTab === 'environment' && envCanvasRef.current) {
        const cvs = envCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#060913';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          // Background noise
          const noiseCount = Math.floor(cvs.width * cvs.height * (0.002 + (disturbances.backgroundStarNoise / 100) * 0.015));
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          for (let i = 0; i < noiseCount; i++) {
            const rx = Math.random() * cvs.width;
            const ry = Math.random() * cvs.height;
            ctx.fillRect(rx, ry, 1, 1);
          }

          // Stars
          const starCount = Math.floor(8 + (disturbances.starFieldDensity / 100) * 35);
          for (let i = 0; i < starCount; i++) {
            const sx = (Math.sin(i * 123.4) * 0.5 + 0.5) * cvs.width;
            const sy = (Math.cos(i * 321.7) * 0.5 + 0.5) * cvs.height;
            const br = Math.sin(time * 2 + i) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(224, 242, 254, ${br})`;
            ctx.fillRect(sx, sy, 1.5, 1.5);
          }

          // Stray sunlight flare
          if (disturbances.strayLightSunlight > 5 || disturbances.backgroundLight > 5) {
            const flareGrad = ctx.createRadialGradient(cvs.width, 0, 5, cvs.width, 0, cvs.width * 0.9);
            const alpha = ((disturbances.strayLightSunlight * 0.6 + disturbances.backgroundLight * 0.4) / 100) * 0.65;
            flareGrad.addColorStop(0, `rgba(255, 230, 160, ${alpha})`);
            flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = flareGrad;
            ctx.fillRect(0, 0, cvs.width, cvs.height);
          }

          // Distractor objects / space debris
          const debrisCount = Math.floor((disturbances.spaceDebrisDensity / 100) * 6 + (disturbances.otherBrightObjects / 100) * 4);
          for (let i = 0; i < debrisCount; i++) {
            const dx = (time * (15 + i * 5) + i * 40) % cvs.width;
            const dy = (Math.sin(time + i) * 15) + 15 + i * 8;
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Target Beacon Canvas
      if (activeTab === 'target' && targetCanvasRef.current) {
        const cvs = targetCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#05070d';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          const cx = cvs.width / 2 + Math.sin(time * 2) * ((disturbances.targetRandomMotionJitter / 100) * 12);
          const cy = cvs.height / 2 + Math.cos(time * 2.3) * ((disturbances.targetRandomMotionJitter / 100) * 8);

          const flicker = 1 - ((disturbances.beaconFlicker / 100) * 0.5 * Math.abs(Math.sin(time * 5)));
          const brightness = ((disturbances.beaconBrightness / 100) * flicker);
          const baseSize = 4 + (disturbances.beaconApparentSize / 100) * 10;

          // Outer halo
          const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, baseSize * 2.8);
          grad.addColorStop(0, `rgba(239, 68, 68, ${Math.min(1, brightness * 0.9)})`);
          grad.addColorStop(0.4, `rgba(220, 38, 38, ${Math.min(0.8, brightness * 0.5)})`);
          grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, baseSize * 3, 0, Math.PI * 2);
          ctx.fill();

          // Bright Core
          ctx.fillStyle = `rgba(255, 230, 230, ${Math.min(1, brightness)})`;
          ctx.beginPath();
          ctx.arc(cx, cy, baseSize * 0.6, 0, Math.PI * 2);
          ctx.fill();

          // Starburst spikes
          ctx.strokeStyle = `rgba(252, 165, 165, ${brightness * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - baseSize * 3.5, cy);
          ctx.lineTo(cx + baseSize * 3.5, cy);
          ctx.moveTo(cx, cy - baseSize * 3.5);
          ctx.lineTo(cx, cy + baseSize * 3.5);
          ctx.stroke();
        }
      }

      // Sensor / Camera Canvas
      if (activeTab === 'sensor' && sensorCanvasRef.current) {
        const cvs = sensorCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a0d16';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          // Sensor grid lines
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
          ctx.lineWidth = 0.5;
          for (let x = 0; x < cvs.width; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, cvs.height);
            ctx.stroke();
          }
          for (let y = 0; y < cvs.height; y += 12) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(cvs.width, y);
            ctx.stroke();
          }

          // Gaussian / shot noise
          const noisePx = Math.floor(cvs.width * cvs.height * (0.005 + (disturbances.imageNoise / 100) * 0.03));
          ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
          for (let i = 0; i < noisePx; i++) {
            ctx.fillRect(Math.random() * cvs.width, Math.random() * cvs.height, 1, 1);
          }

          // Hot pixels / cosmic ray spikes
          const hotCount = Math.floor((disturbances.hotPixels / 100) * 4);
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < hotCount; i++) {
            const hx = ((i * 37) + 15) % cvs.width;
            const hy = ((i * 29) + 20) % cvs.height;
            ctx.fillRect(hx, hy, 2, 2);
          }
        }
      }

      // Platform / Pointing Canvas (Oscilloscope Waveform)
      if (activeTab === 'platform' && platformCanvasRef.current) {
        const cvs = platformCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#050a12';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          // Zero centerline
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, cvs.height / 2);
          ctx.lineTo(cvs.width, cvs.height / 2);
          ctx.stroke();

          // Micro-vibration waveform
          const vibAmp = ((disturbances.satelliteVibration / 100) * 0.6 + (disturbances.angularJitter / 100) * 0.4) * (cvs.height * 0.35);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let x = 0; x < cvs.width; x++) {
            const normX = x / cvs.width;
            const yOffset = (
              Math.sin(normX * 18 + time * 8) * 0.5 +
              Math.sin(normX * 45 + time * 18) * 0.3 +
              Math.sin(normX * 90 + time * 32) * 0.2
            ) * vibAmp;
            const y = cvs.height / 2 + yOffset;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // Atmospheric Canvas
      if (activeTab === 'atmospheric' && atmCanvasRef.current) {
        const cvs = atmCanvasRef.current;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#05070d';
          ctx.fillRect(0, 0, cvs.width, cvs.height);

          const turb = (disturbances.atmosphericTurbulence / 100);
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.2 + turb * 0.6})`;
          ctx.lineWidth = 1.2;

          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            for (let x = 0; x < cvs.width; x += 3) {
              const y = 10 + i * 14 + Math.sin(x * 0.08 + time * 3 + i) * (turb * 8);
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(renderPreviews);
    };

    animId = requestAnimationFrame(renderPreviews);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, disturbances]);

  // Handle slider update helper
  const handleSlider = (key: keyof Disturbances, val: number) => {
    setSelectedDisturbanceKey(key);
    onChange({ [key]: val });
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden hud-panel font-mono text-xs select-none">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-tech text-xs tracking-wider text-cyan-300 font-semibold uppercase">
            Disturbance & Environment Controls
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded text-[10px] transition-colors"
            title="Reset all disturbance controls to nominal baseline"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="px-3 py-1.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none">
        <span className="text-slate-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Presets:
        </span>
        {DISTURBANCE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onApplyPreset(p.values)}
            className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-cyan-950/80 hover:border-cyan-500/50 border border-slate-700/60 text-slate-300 hover:text-cyan-200 transition-all shrink-0"
            title={p.description}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Category Tab Pills */}
      <div className="grid grid-cols-5 bg-slate-950 border-b border-slate-800/80 text-[10px] text-center">
        <button
          onClick={() => setActiveTab('environment')}
          className={`py-1.5 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'environment'
              ? 'bg-slate-900 border-b-2 border-cyan-400 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sun className="w-3 h-3" />
          <span className="hidden sm:inline">Environment</span>
        </button>
        <button
          onClick={() => setActiveTab('target')}
          className={`py-1.5 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'target'
              ? 'bg-slate-900 border-b-2 border-cyan-400 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3 h-3 text-red-400" />
          <span className="hidden sm:inline">Target/Beacon</span>
        </button>
        <button
          onClick={() => setActiveTab('sensor')}
          className={`py-1.5 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'sensor'
              ? 'bg-slate-900 border-b-2 border-cyan-400 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-3 h-3" />
          <span className="hidden sm:inline">Sensor</span>
        </button>
        <button
          onClick={() => setActiveTab('platform')}
          className={`py-1.5 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'platform'
              ? 'bg-slate-900 border-b-2 border-cyan-400 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Platform</span>
        </button>
        <button
          onClick={() => setActiveTab('atmospheric')}
          className={`py-1.5 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'atmospheric'
              ? 'bg-slate-900 border-b-2 border-cyan-400 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wind className="w-3 h-3 text-purple-400" />
          <span className="hidden sm:inline">Atmospheric</span>
        </button>
      </div>

      {/* Main Content: Sliders & Live Preview */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Category Live Preview Box */}
        <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 flex items-center gap-3">
          <div className="relative w-28 h-16 rounded overflow-hidden border border-slate-700/70 shrink-0 bg-black">
            {activeTab === 'environment' && (
              <canvas ref={envCanvasRef} width={112} height={64} className="w-full h-full object-cover" />
            )}
            {activeTab === 'target' && (
              <canvas ref={targetCanvasRef} width={112} height={64} className="w-full h-full object-cover" />
            )}
            {activeTab === 'sensor' && (
              <canvas ref={sensorCanvasRef} width={112} height={64} className="w-full h-full object-cover" />
            )}
            {activeTab === 'platform' && (
              <canvas ref={platformCanvasRef} width={112} height={64} className="w-full h-full object-cover" />
            )}
            {activeTab === 'atmospheric' && (
              <canvas ref={atmCanvasRef} width={112} height={64} className="w-full h-full object-cover" />
            )}
            <span className="absolute bottom-0.5 right-1 text-[8px] text-slate-400/80 font-mono">Live Preview</span>
          </div>

          <div className="flex-1 min-w-0 text-[11px]">
            <div className="text-cyan-300 font-semibold capitalize flex items-center gap-1">
              <span>{activeTab} Simulation Effects</span>
            </div>
            <div className="text-slate-400 text-[10px] mt-0.5 line-clamp-2">
              {activeTab === 'environment' && 'Simulates deep space star field density, debris glitter, and solar stray light flare.'}
              {activeTab === 'target' && '1550nm optical beacon power, temporal intensity fluctuation, and relative motion kinematics.'}
              {activeTab === 'sensor' && 'CMOS optical sensor readout noise, Gaussian blur, defocusing, and radiation hot pixels.'}
              {activeTab === 'platform' && 'Reaction wheel micro-vibrations, platform attitude drift, and actuator servo delay.'}
              {activeTab === 'atmospheric' && 'Propagation turbulence and scintillation (relevant to space-to-ground links).'}
            </div>
          </div>
        </div>

        {/* Sliders for Active Tab */}
        <div className="space-y-2.5 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
          {activeTab === 'environment' && (
            <>
              <SliderRow
                label="Background Star Noise"
                value={disturbances.backgroundStarNoise}
                onChange={(v) => handleSlider('backgroundStarNoise', v)}
                onSelect={() => setSelectedDisturbanceKey('backgroundStarNoise')}
                isSelected={selectedDisturbanceKey === 'backgroundStarNoise'}
              />
              <SliderRow
                label="Stray Light / Sunlight"
                value={disturbances.strayLightSunlight}
                onChange={(v) => handleSlider('strayLightSunlight', v)}
                onSelect={() => setSelectedDisturbanceKey('strayLightSunlight')}
                isSelected={selectedDisturbanceKey === 'strayLightSunlight'}
              />
              <SliderRow
                label="Other Bright Objects (Distractors)"
                value={disturbances.otherBrightObjects}
                onChange={(v) => handleSlider('otherBrightObjects', v)}
                onSelect={() => setSelectedDisturbanceKey('otherBrightObjects')}
                isSelected={selectedDisturbanceKey === 'otherBrightObjects'}
              />
              <SliderRow
                label="Space Debris Density"
                value={disturbances.spaceDebrisDensity}
                onChange={(v) => handleSlider('spaceDebrisDensity', v)}
                onSelect={() => setSelectedDisturbanceKey('spaceDebrisDensity')}
                isSelected={selectedDisturbanceKey === 'spaceDebrisDensity'}
              />
              <SliderRow
                label="Star Field Density"
                value={disturbances.starFieldDensity}
                onChange={(v) => handleSlider('starFieldDensity', v)}
                onSelect={() => setSelectedDisturbanceKey('starFieldDensity')}
                isSelected={selectedDisturbanceKey === 'starFieldDensity'}
              />
              <SliderRow
                label="Cosmic Ray (Hot Pixels)"
                value={disturbances.cosmicRayEvents}
                onChange={(v) => handleSlider('cosmicRayEvents', v)}
                onSelect={() => setSelectedDisturbanceKey('cosmicRayEvents')}
                isSelected={selectedDisturbanceKey === 'cosmicRayEvents'}
              />
            </>
          )}

          {activeTab === 'target' && (
            <>
              <SliderRow
                label="Beacon Brightness"
                value={disturbances.beaconBrightness}
                onChange={(v) => handleSlider('beaconBrightness', v)}
                onSelect={() => setSelectedDisturbanceKey('beaconBrightness')}
                isSelected={selectedDisturbanceKey === 'beaconBrightness'}
              />
              <SliderRow
                label="Intensity Fluctuation"
                value={disturbances.beaconIntensityFluctuation}
                onChange={(v) => handleSlider('beaconIntensityFluctuation', v)}
                onSelect={() => setSelectedDisturbanceKey('beaconIntensityFluctuation')}
                isSelected={selectedDisturbanceKey === 'beaconIntensityFluctuation'}
              />
              <SliderRow
                label="Beacon Flicker"
                value={disturbances.beaconFlicker}
                onChange={(v) => handleSlider('beaconFlicker', v)}
                onSelect={() => setSelectedDisturbanceKey('beaconIntensityFluctuation')}
                isSelected={selectedDisturbanceKey === 'beaconIntensityFluctuation'}
              />
              <SliderRow
                label="Beacon Size (Apparent)"
                value={disturbances.beaconApparentSize}
                onChange={(v) => handleSlider('beaconApparentSize', v)}
                onSelect={() => setSelectedDisturbanceKey('beaconApparentSize')}
                isSelected={selectedDisturbanceKey === 'beaconApparentSize'}
              />
              <SliderRow
                label="Target Motion Speed"
                value={disturbances.targetMotionSpeed}
                onChange={(v) => handleSlider('targetMotionSpeed', v)}
                onSelect={() => setSelectedDisturbanceKey('targetMotionSpeed')}
                isSelected={selectedDisturbanceKey === 'targetMotionSpeed'}
              />
              <SliderRow
                label="Target Angular Velocity"
                value={disturbances.targetAngularVelocity}
                onChange={(v) => handleSlider('targetAngularVelocity', v)}
                onSelect={() => setSelectedDisturbanceKey('targetMotionSpeed')}
                isSelected={selectedDisturbanceKey === 'targetMotionSpeed'}
              />
              <SliderRow
                label="Random Motion (Jitter)"
                value={disturbances.targetRandomMotionJitter}
                onChange={(v) => handleSlider('targetRandomMotionJitter', v)}
                onSelect={() => setSelectedDisturbanceKey('targetRandomMotionJitter')}
                isSelected={selectedDisturbanceKey === 'targetRandomMotionJitter'}
              />
              <SliderRow
                label="Target Acceleration"
                value={disturbances.targetAcceleration}
                onChange={(v) => handleSlider('targetAcceleration', v)}
                onSelect={() => setSelectedDisturbanceKey('targetMotionSpeed')}
                isSelected={selectedDisturbanceKey === 'targetMotionSpeed'}
              />
            </>
          )}

          {activeTab === 'sensor' && (
            <>
              <SliderRow
                label="Image Noise"
                value={disturbances.imageNoise}
                onChange={(v) => handleSlider('imageNoise', v)}
                onSelect={() => setSelectedDisturbanceKey('imageNoise')}
                isSelected={selectedDisturbanceKey === 'imageNoise'}
              />
              <SliderRow
                label="Gaussian Noise"
                value={disturbances.gaussianNoise}
                onChange={(v) => handleSlider('gaussianNoise', v)}
                onSelect={() => setSelectedDisturbanceKey('imageNoise')}
                isSelected={selectedDisturbanceKey === 'imageNoise'}
              />
              <SliderRow
                label="Motion Blur"
                value={disturbances.motionBlur}
                onChange={(v) => handleSlider('motionBlur', v)}
                onSelect={() => setSelectedDisturbanceKey('motionBlur')}
                isSelected={selectedDisturbanceKey === 'motionBlur'}
              />
              <SliderRow
                label="Focus Blur (Defocus)"
                value={disturbances.focusBlur}
                onChange={(v) => handleSlider('focusBlur', v)}
                onSelect={() => setSelectedDisturbanceKey('focusBlur')}
                isSelected={selectedDisturbanceKey === 'focusBlur'}
              />
              <SliderRow
                label="Exposure Variation"
                value={disturbances.exposureVariation}
                onChange={(v) => handleSlider('exposureVariation', v)}
                onSelect={() => setSelectedDisturbanceKey('imageNoise')}
                isSelected={selectedDisturbanceKey === 'imageNoise'}
              />
              <SliderRow
                label="Pixel Dropout (Dead Pixels)"
                value={disturbances.pixelDropout}
                onChange={(v) => handleSlider('pixelDropout', v)}
                onSelect={() => setSelectedDisturbanceKey('pixelDropout')}
                isSelected={selectedDisturbanceKey === 'pixelDropout'}
              />
              <SliderRow
                label="Hot Pixels"
                value={disturbances.hotPixels}
                onChange={(v) => handleSlider('hotPixels', v)}
                onSelect={() => setSelectedDisturbanceKey('cosmicRayEvents')}
                isSelected={selectedDisturbanceKey === 'cosmicRayEvents'}
              />
              <SliderRow
                label="Sensor Saturation"
                value={disturbances.sensorSaturation}
                onChange={(v) => handleSlider('sensorSaturation', v)}
                onSelect={() => setSelectedDisturbanceKey('imageNoise')}
                isSelected={selectedDisturbanceKey === 'imageNoise'}
              />
              <SliderRow
                label="Camera Frame Delay"
                value={disturbances.cameraFrameDelay}
                onChange={(v) => handleSlider('cameraFrameDelay', v)}
                onSelect={() => setSelectedDisturbanceKey('controlDelay')}
                isSelected={selectedDisturbanceKey === 'controlDelay'}
              />
            </>
          )}

          {activeTab === 'platform' && (
            <>
              <SliderRow
                label="Satellite Vibration (Jitter)"
                value={disturbances.satelliteVibration}
                onChange={(v) => handleSlider('satelliteVibration', v)}
                onSelect={() => setSelectedDisturbanceKey('satelliteVibration')}
                isSelected={selectedDisturbanceKey === 'satelliteVibration'}
              />
              <SliderRow
                label="Reaction Wheel Jitter"
                value={disturbances.angularJitter}
                onChange={(v) => handleSlider('angularJitter', v)}
                onSelect={() => setSelectedDisturbanceKey('satelliteVibration')}
                isSelected={selectedDisturbanceKey === 'satelliteVibration'}
              />
              <SliderRow
                label="Attitude Fluctuation"
                value={disturbances.attitudeFluctuation}
                onChange={(v) => handleSlider('attitudeFluctuation', v)}
                onSelect={() => setSelectedDisturbanceKey('satelliteVibration')}
                isSelected={selectedDisturbanceKey === 'satelliteVibration'}
              />
              <SliderRow
                label="Pointing Error (Bias)"
                value={disturbances.pointingBias}
                onChange={(v) => handleSlider('pointingBias', v)}
                onSelect={() => setSelectedDisturbanceKey('satelliteVibration')}
                isSelected={selectedDisturbanceKey === 'satelliteVibration'}
              />
              <SliderRow
                label="Control Delay / Actuator Lag"
                value={disturbances.controlDelay}
                onChange={(v) => handleSlider('controlDelay', v)}
                onSelect={() => setSelectedDisturbanceKey('controlDelay')}
                isSelected={selectedDisturbanceKey === 'controlDelay'}
              />
              <SliderRow
                label="Camera Mechanical Noise"
                value={disturbances.cameraMechanicalNoise}
                onChange={(v) => handleSlider('cameraMechanicalNoise', v)}
                onSelect={() => setSelectedDisturbanceKey('satelliteVibration')}
                isSelected={selectedDisturbanceKey === 'satelliteVibration'}
              />
            </>
          )}

          {activeTab === 'atmospheric' && (
            <>
              <div className="p-2 rounded bg-purple-950/30 border border-purple-800/40 text-[10px] text-purple-200">
                <strong>Note:</strong> Atmospheric turbulence is primarily relevant to optical links passing through planetary atmosphere (satellite-to-ground). For pure satellite-to-satellite space crosslinks, this is nominally 0%.
              </div>
              <SliderRow
                label="Atmospheric Turbulence"
                value={disturbances.atmosphericTurbulence}
                onChange={(v) => handleSlider('atmosphericTurbulence', v)}
                onSelect={() => setSelectedDisturbanceKey('atmosphericTurbulence')}
                isSelected={selectedDisturbanceKey === 'atmosphericTurbulence'}
              />
              <SliderRow
                label="Scintillation"
                value={disturbances.scintillation}
                onChange={(v) => handleSlider('scintillation', v)}
                onSelect={() => setSelectedDisturbanceKey('atmosphericTurbulence')}
                isSelected={selectedDisturbanceKey === 'atmosphericTurbulence'}
              />
              <SliderRow
                label="Beam Wander"
                value={disturbances.beamWander}
                onChange={(v) => handleSlider('beamWander', v)}
                onSelect={() => setSelectedDisturbanceKey('atmosphericTurbulence')}
                isSelected={selectedDisturbanceKey === 'atmosphericTurbulence'}
              />
              <SliderRow
                label="Cloud / Fog Attenuation"
                value={disturbances.cloudFogAttenuation}
                onChange={(v) => handleSlider('cloudFogAttenuation', v)}
                onSelect={() => setSelectedDisturbanceKey('atmosphericTurbulence')}
                isSelected={selectedDisturbanceKey === 'atmosphericTurbulence'}
              />
            </>
          )}
        </div>

        {/* Educational Detail Card (Requirement 28) */}
        {selectedInfo && (
          <div className="bg-slate-950/90 rounded-lg p-2.5 border border-cyan-500/30 space-y-1.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-semibold text-[11px]">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>{selectedInfo.name}</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
                {selectedInfo.category}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1 text-[10px]">
              <div className="flex flex-col">
                <span className="text-slate-400 font-semibold text-[9px] uppercase">Effect:</span>
                <span className="text-slate-200">{selectedInfo.effect}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 font-semibold text-[9px] uppercase">Impact:</span>
                <span className="text-amber-200">{selectedInfo.impact}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-cyan-400 font-semibold text-[9px] uppercase">AI Response:</span>
                <span className="text-cyan-100">{selectedInfo.aiResponse}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-red-400 font-semibold text-[9px] uppercase">Risk:</span>
                <span className="text-red-200">{selectedInfo.risk}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  onSelect: () => void;
  isSelected: boolean;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  onChange,
  onSelect,
  isSelected,
}) => {
  return (
    <div 
      onClick={onSelect}
      className={`p-1.5 rounded transition-all cursor-pointer ${
        isSelected 
          ? 'bg-slate-800/80 border border-cyan-500/40 shadow-sm' 
          : 'hover:bg-slate-800/40 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className={`${isSelected ? 'text-cyan-200 font-semibold' : 'text-slate-300'}`}>
          {label}
        </span>
        <span className="font-mono text-cyan-400 font-bold text-[10px]">
          {Math.round(value)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
      />
    </div>
  );
};
