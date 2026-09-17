/**
 * Main Application Component: Virtual Optical Beacon Tracking System
 * Satellite-to-Satellite FSOC & PAT Closed-Loop Simulation
 * Fully integrated with AI Perception Engine, 6-state Kalman Prediction,
 * Physical Gimbal Dynamics, 7 Research Experiments, and Comparison Benchmark Table.
 * Supports Rapid Ephemeris Acquisition and Intelligent Search Optimization.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CameraSpecs, 
  PIDParams, 
  Disturbances, 
  TargetMotionParams, 
  ControlMode, 
  DetectionMode, 
  PATState, 
  BeaconDetectionResult, 
  TargetGeometry, 
  LinkBudget, 
  PerformanceMetrics, 
  TelemetryPoint,
  TrackingArchitecture,
  SearchTelemetry 
} from './types';
import { PhysicsEngine } from './simulation/physicsEngine';
import { BeaconDetector } from './simulation/cvDetector';
import { PATController } from './simulation/patController';

import { HeaderTelemetry } from './components/HeaderTelemetry';
import { SpaceWorld3D } from './components/SpaceWorld3D';
import { CameraViewPanel } from './components/CameraViewPanel';
import { TrackingViewPanel } from './components/TrackingViewPanel';
import { PointingControlPanel } from './components/PointingControlPanel';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { RealTimePlots } from './components/RealTimePlots';
import { ResultMetricsPanel } from './components/ResultMetricsPanel';
import { LinkBudgetChallenges } from './components/LinkBudgetChallenges';
import { ExperimentBenchmarkPanel } from './components/ExperimentBenchmarkPanel';
import { NasaMissionCenter } from './components/NasaMissionCenter';
import { DEFAULT_DISTURBANCES } from './data/disturbanceCatalog';

export default function App() {
  // App View Mode (NASA/ISRO Operations Console as default, Planetary Explorer, Research Lab)
  const [appMode, setAppMode] = useState<'OPERATIONS_CENTER' | 'PLANETARY_EXPLORER' | 'RESEARCH_BENCHMARKS'>('OPERATIONS_CENTER');

  // Simulation Run State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Architecture and Modes
  const [architecture, setArchitecture] = useState<TrackingArchitecture>('AI_ASSISTED');
  const [controlMode, setControlMode] = useState<ControlMode>('AUTO');
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('AI_CNN');

  // Camera Gimbal Specs
  const [cameraSpecs, setCameraSpecs] = useState<CameraSpecs>({
    width: 640,
    height: 480,
    fov: 10.0,
    zoom: 1.0,
    focus: 1.0,
    yaw: 2.3,
    pitch: -1.2,
    yawRate: 0.0,
    pitchRate: 0.0,
    sensitivity: 1.0,
    maxSpeed: 15.0,
    maxAccel: 45.0,
  });

  // PID Parameters
  const [pidParams, setPidParams] = useState<PIDParams>({
    kp: 2.2,
    ki: 0.08,
    kd: 0.28,
    kff: 0.55,
  });

  // Target Motion Configuration
  const [motionParams, setMotionParams] = useState<TargetMotionParams>({
    trajectory: 'orbital',
    baseDistanceKm: 850,
    velocityKmS: 7.42,
    angularVelocityDegS: 1.8,
    motionAmplitudeDeg: 4.0,
    intensity: 1.0,
    beaconPowerMw: 15.0,
    beamDivergenceUrad: 15.0,
  });

  // Disturbance Multipliers (Matching Reference Operations Center)
  const [disturbances, setDisturbances] = useState<Disturbances>({
    ...DEFAULT_DISTURBANCES,
    backgroundStarNoise: 30,
    strayLightSunlight: 20,
    otherBrightObjects: 40,
    spaceDebrisDensity: 35,
    starFieldDensity: 60,
    cosmicRayEvents: 15,
    beaconBrightness: 70,
    beaconIntensityFluctuation: 50,
    beaconApparentSize: 100,
    targetMotionSpeed: 60,
    targetRandomMotionJitter: 30,
    imageNoise: 40,
    gaussianNoise: 35,
    motionBlur: 50,
    focusBlur: 20,
    exposureVariation: 30,
    pixelDropout: 10,
    satelliteVibration: 40,
    pointingBias: 25,
    controlDelay: 35,
    attitudeFluctuation: 20,
    vibration: 40,
    targetMotion: 60,
    sensorNoise: 40,
    detectionNoise: 30,
    backgroundNoise: 30,
  });

  // Dynamic Telemetry States
  const [patState, setPatState] = useState<PATState>('TRACKING');
  const [targetGeometry, setTargetGeometry] = useState<TargetGeometry>({
    distanceKm: 850,
    rangeRateKmS: 0.42,
    azimuthDeg: 2.31,
    elevationDeg: -1.17,
    relX: 34.2,
    relY: -17.3,
    relZ: 849.1,
    velocityVec: [0.35, -0.15, 0.42],
    losVector: [0.04, -0.02, 0.999],
  });

  const [detection, setDetection] = useState<BeaconDetectionResult>({
    detected: true,
    confidence: 98.6,
    x: 320,
    y: 240,
    size: 8,
    errorX: 0,
    errorY: 0,
    angularErrorX: 0.0,
    angularErrorY: 0.0,
    totalAngularError: 2.3,
    rawIntensity: 225,
    snrEstimate: 19.5,
    isInFov: true,
    aiPrediction: {
      predictedX: 320,
      predictedY: 240,
      velocityX: -1.4,
      velocityY: 1.2,
      accelerationX: -0.2,
      accelerationY: 0.1,
      lookaheadSeconds: 0.25,
      predictionConfidence: 97.5,
      predictionErrorPx: 1.1,
      stateEstimate: [320, 240, -1.4, 1.2],
      isPredicting: true,
      compensationActive: true,
    },
  });

  const [linkBudget, setLinkBudget] = useState<LinkBudget>({
    status: 'CONNECTED',
    frequencyThz: 193.4,
    wavelengthNm: 1550,
    dataRateGbps: 10.0,
    beamDivergenceUrad: 15.0,
    transmitPowerW: 2.0,
    receivedPowerDbm: -21.4,
    receivedPowerUw: 7.24,
    snrDb: 22.8,
    linkMarginDb: 8.4,
    pointingLossDb: 1.2,
    pathLossDb: 256.4,
    ber: 1e-9,
    channelAvailability: 99.8,
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgTrackingErrorPx: 2.1,
    rmsTrackingErrorPx: 2.7,
    maxTrackingErrorPx: 6.4,
    avgAngularErrorUrad: 7.2,
    acquisitionTimeS: 1.15,
    reacquisitionTimeS: 1.2,
    beaconDetectionRate: 99.4,
    predictionErrorPx: 1.8,
    trackingSuccessRate: 98.7,
    linkAvailability: 99.8,
    totalSamples: 100,
    lockedSamples: 98,
  });

  const [benchmark, setBenchmark] = useState<{
    traditional: PerformanceMetrics;
    aiAssisted: PerformanceMetrics;
  }>({
    traditional: {
      avgTrackingErrorPx: 12.4,
      rmsTrackingErrorPx: 15.8,
      maxTrackingErrorPx: 32.1,
      avgAngularErrorUrad: 42.6,
      acquisitionTimeS: 3.45,
      reacquisitionTimeS: 3.2,
      beaconDetectionRate: 88.4,
      predictionErrorPx: 0,
      trackingSuccessRate: 84.2,
      linkAvailability: 91.5,
      totalSamples: 100,
      lockedSamples: 84,
    },
    aiAssisted: {
      avgTrackingErrorPx: 2.1,
      rmsTrackingErrorPx: 2.7,
      maxTrackingErrorPx: 6.4,
      avgAngularErrorUrad: 7.2,
      acquisitionTimeS: 1.15,
      reacquisitionTimeS: 1.2,
      beaconDetectionRate: 99.4,
      predictionErrorPx: 1.8,
      trackingSuccessRate: 98.7,
      linkAvailability: 99.8,
      totalSamples: 100,
      lockedSamples: 98,
    },
  });

  const [searchTelemetry, setSearchTelemetry] = useState<SearchTelemetry>({
    isSearching: false,
    searchMethod: 'AI_EPHEMERIS_SWEEP',
    targetLOS: { azimuthDeg: 2.31, elevationDeg: -1.17 },
    distToLOSDeg: 0.1,
    uncertaintyConeDeg: 2.5,
    timeSearchingS: 0,
    slewSpeedDegS: 0,
    progressPct: 100,
    explanation: 'Terminal A uses GNSS ephemeris cueing and sweeps a ±2.5° uncertainty cone along Target B flight corridor.',
  });

  const [corrections, setCorrections] = useState<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);

  // Controller reference
  const patControllerRef = useRef<PATController>(new PATController());
  const simTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const historyTimerRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synchronized state references for uninterrupted 60 FPS animation loop
  const cameraSpecsRef = useRef(cameraSpecs);
  cameraSpecsRef.current = cameraSpecs;
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const simSpeedRef = useRef(simSpeed);
  simSpeedRef.current = simSpeed;
  const architectureRef = useRef(architecture);
  architectureRef.current = architecture;
  const controlModeRef = useRef(controlMode);
  controlModeRef.current = controlMode;
  const detectionModeRef = useRef(detectionMode);
  detectionModeRef.current = detectionMode;
  const motionParamsRef = useRef(motionParams);
  motionParamsRef.current = motionParams;
  const disturbancesRef = useRef(disturbances);
  disturbancesRef.current = disturbances;
  const pidParamsRef = useRef(pidParams);
  pidParamsRef.current = pidParams;
  const linkBudgetRef = useRef(linkBudget);
  linkBudgetRef.current = linkBudget;
  const patStateRef = useRef(patState);
  patStateRef.current = patState;

  // Audio tone feedback for Lock state transitions
  const playLockTone = useCallback(() => {
    if (isMuted) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio not supported or blocked by browser policy
    }
  }, [isMuted]);

  // Fast Ephemeris Acquire Command
  const handleFastAcquire = useCallback(() => {
    const curGeo = targetGeometry;
    const curCam = cameraSpecsRef.current;
    const snapped = patControllerRef.current.forceAcquireTarget(curGeo, curCam);
    setCameraSpecs(snapped);
    cameraSpecsRef.current = snapped;
    setPatState('TRACKING');
    patStateRef.current = 'TRACKING';
  }, [targetGeometry]);

  // Main Simulation Animation Loop
  useEffect(() => {
    let animId: number;

    const loop = (currentTime: number) => {
      animId = requestAnimationFrame(loop);

      const deltaMs = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      const activeRunning = isRunningRef.current;
      const activeSpeed = simSpeedRef.current;
      const dt = Math.min(0.1, (deltaMs / 1000)) * (activeRunning ? activeSpeed : 0);
      if (dt <= 0) return;

      simTimeRef.current += dt;
      const t = simTimeRef.current;

      const curMotion = motionParamsRef.current;
      const curDisturb = disturbancesRef.current;
      const curCamera = cameraSpecsRef.current;
      const curArchitecture = architectureRef.current;
      const curControlMode = controlModeRef.current;
      const curDetectionMode = detectionModeRef.current;
      const curPid = pidParamsRef.current;
      const curLink = linkBudgetRef.current;

      // 1. Calculate Target 3D Position and Kinematics
      const newTargetGeo = PhysicsEngine.calculateTargetPosition(t, curMotion, curDisturb);
      setTargetGeometry(newTargetGeo);

      // 2. Project onto Camera Sensor and Run Detection
      const newDetection = BeaconDetector.detectBeacon(
        dt,
        newTargetGeo,
        curCamera,
        curDisturb,
        curDetectionMode,
        curArchitecture,
        curMotion.intensity
      );
      setDetection(newDetection);

      // 3. Run PAT Closed-Loop Controller & State Machine
      const controlResult = patControllerRef.current.update(
        dt,
        curControlMode,
        curArchitecture,
        curCamera,
        curPid,
        newDetection,
        curLink.beamDivergenceUrad,
        newTargetGeo
      );

      // Check lock audio trigger
      if (controlResult.state === 'LOCKED' && patStateRef.current !== 'LOCKED') {
        playLockTone();
      }

      setCameraSpecs(controlResult.updatedCamera);
      cameraSpecsRef.current = controlResult.updatedCamera;

      setPatState(controlResult.state);
      patStateRef.current = controlResult.state;

      setMetrics(controlResult.metrics);
      setBenchmark(controlResult.benchmark);
      setSearchTelemetry(controlResult.searchTelemetry);
      setCorrections({
        yaw: controlResult.yawCorrection,
        pitch: controlResult.pitchCorrection,
      });

      // 4. Calculate Optical Link Budget
      const calculatedLink = PhysicsEngine.calculateLinkBudget(
        newDetection.totalAngularError,
        newTargetGeo.distanceKm,
        curLink.beamDivergenceUrad,
        curDisturb,
        newDetection.detected
      );
      setLinkBudget(calculatedLink);
      linkBudgetRef.current = calculatedLink;

      // 5. Append telemetry data points (~12 Hz sampling for plots)
      historyTimerRef.current += dt;
      if (historyTimerRef.current >= 0.08) {
        historyTimerRef.current = 0;
        setTelemetryHistory((prev) => {
          const pt: TelemetryPoint = {
            time: parseFloat(t.toFixed(2)),
            beaconX: newDetection.x,
            beaconY: newDetection.y,
            predictedX: newDetection.aiPrediction.predictedX,
            predictedY: newDetection.aiPrediction.predictedY,
            errorPx: Math.round(Math.sqrt(newDetection.errorX ** 2 + newDetection.errorY ** 2)),
            predictionErrorPx: newDetection.aiPrediction.predictionErrorPx,
            angularErrorUrad: newDetection.totalAngularError < 9000 ? newDetection.totalAngularError : 60,
            yaw: controlResult.updatedCamera.yaw,
            pitch: controlResult.updatedCamera.pitch,
            snr: calculatedLink.snrDb,
            rxPower: calculatedLink.receivedPowerDbm,
          };
          const next = [...prev, pt];
          return next.length > 160 ? next.slice(next.length - 160) : next;
        });
      }
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [playLockTone]);

  // Scenario Presets
  const handleLoadScenario = (scenarioKey: string) => {
    switch (scenarioKey) {
      case 'standard':
        setMotionParams({
          trajectory: 'circular',
          baseDistanceKm: 850,
          velocityKmS: 7.42,
          angularVelocityDegS: 1.5,
          motionAmplitudeDeg: 3.0,
          intensity: 1.0,
          beaconPowerMw: 15.0,
          beamDivergenceUrad: 15.0,
        });
        setDisturbances({
          vibration: 10,
          angularJitter: 8,
          targetMotion: 20,
          sensorNoise: 12,
          detectionNoise: 8,
          controlDelay: 5,
          atmosphericTurbulence: 0,
          backgroundNoise: 10,
        });
        break;

      case 'orbital_sweep':
        setMotionParams({
          trajectory: 'orbital',
          baseDistanceKm: 1200,
          velocityKmS: 7.7,
          angularVelocityDegS: 2.8,
          motionAmplitudeDeg: 6.5,
          intensity: 1.0,
          beaconPowerMw: 15.0,
          beamDivergenceUrad: 12.0,
        });
        break;

      case 'high_vibration':
        setDisturbances((prev) => ({
          ...prev,
          vibration: 75,
          angularJitter: 65,
          detectionNoise: 40,
        }));
        setMotionParams((prev) => ({ ...prev, trajectory: 'random' }));
        break;

      case 'reacquisition_test':
        patControllerRef.current.triggerBeaconLoss();
        // Perturb camera by 4.5° so autonomous search engages and locks in ~1.2s
        setCameraSpecs((prev) => {
          const updated = { ...prev, yaw: prev.yaw + 4.5, pitch: prev.pitch - 3.2 };
          cameraSpecsRef.current = updated;
          return updated;
        });
        break;

      case 'solar_glare':
        setDisturbances((prev) => ({
          ...prev,
          backgroundNoise: 65,
          sensorNoise: 40,
        }));
        setDetectionMode('AI_CNN');
        break;
    }
  };

  const handleResetSimulation = () => {
    simTimeRef.current = 0;
    patControllerRef.current.resetState();
    BeaconDetector.reset();
    const initCam: CameraSpecs = {
      ...cameraSpecsRef.current,
      yaw: 2.3,
      pitch: -1.2,
      yawRate: 0,
      pitchRate: 0,
      zoom: 1.0,
      focus: 1.0,
    };
    setCameraSpecs(initCam);
    cameraSpecsRef.current = initCam;
    setTelemetryHistory([]);
  };

  const handleTriggerBeaconLoss = () => {
    patControllerRef.current.triggerBeaconLoss();
    // Perturb camera attitude slightly to trigger autonomous search
    setCameraSpecs((prev) => {
      const updated = {
        ...prev,
        yaw: prev.yaw + 4.2,
        pitch: prev.pitch - 3.0,
      };
      cameraSpecsRef.current = updated;
      return updated;
    });
  };

  const handleApplyPreset = (
    dist: Partial<Disturbances>,
    motion: Partial<TargetMotionParams>,
    cam?: Partial<CameraSpecs>
  ) => {
    if (dist) setDisturbances((prev) => ({ ...prev, ...dist }));
    if (motion) setMotionParams((prev) => ({ ...prev, ...motion }));
    if (cam) {
      setCameraSpecs((prev) => {
        const updated = { ...prev, ...cam };
        cameraSpecsRef.current = updated;
        return updated;
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col selection:bg-cyan-500/30">
      {/* Top Operations Console Switcher Banner */}
      <div className="w-full bg-[#02050e] border-b border-cyan-900/60 px-3 py-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-cyan-400 font-mono text-[11px] font-semibold tracking-wider uppercase">
            free space optical communication
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px]">
          <button
            id="btn-app-mode-operations"
            onClick={() => setAppMode('OPERATIONS_CENTER')}
            className={`px-2.5 py-0.5 rounded font-semibold transition-all cursor-pointer ${
              appMode === 'OPERATIONS_CENTER'
                ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ★ Master Operations Center (Photo Layout)
          </button>
          <button
            id="btn-app-mode-planetary"
            onClick={() => setAppMode('PLANETARY_EXPLORER')}
            className={`px-2.5 py-0.5 rounded font-semibold transition-all cursor-pointer ${
              appMode === 'PLANETARY_EXPLORER'
                ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3D Planetary Explorer
          </button>
          <button
            id="btn-app-mode-research"
            onClick={() => setAppMode('RESEARCH_BENCHMARKS')}
            className={`px-2.5 py-0.5 rounded font-semibold transition-all cursor-pointer ${
              appMode === 'RESEARCH_BENCHMARKS'
                ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Research Experiments & Pipeline
          </button>
        </div>
      </div>

      {/* MODE 1: MASTER OPERATIONS CENTER (EXACT 1:1 REPLICA OF USER PHOTO) */}
      {appMode === 'OPERATIONS_CENTER' && (
        <NasaMissionCenter
          isRunning={isRunning}
          onToggleRunning={() => setIsRunning(!isRunning)}
          onReset={handleResetSimulation}
          simSpeed={simSpeed}
          onSpeedChange={setSimSpeed}
          architecture={architecture}
          onArchitectureChange={setArchitecture}
          controlMode={controlMode}
          onControlModeChange={setControlMode}
          detectionMode={detectionMode}
          onDetectionModeChange={setDetectionMode}
          patState={patState}
          detection={detection}
          linkBudget={linkBudget}
          targetGeometry={targetGeometry}
          cameraSpecs={cameraSpecs}
          onCameraChange={(updated) => {
            setCameraSpecs((prev) => {
              const n = { ...prev, ...updated };
              cameraSpecsRef.current = n;
              return n;
            });
          }}
          disturbances={disturbances}
          onDisturbanceChange={(updated) => setDisturbances((prev) => ({ ...prev, ...updated }))}
          motionParams={motionParams}
          onMotionChange={(updated) => setMotionParams((prev) => ({ ...prev, ...updated }))}
          onApplyPreset={handleApplyPreset}
        />
      )}

      {/* MODE 2: FULL 3D PLANETARY & CONSTELLATION EXPLORER */}
      {appMode === 'PLANETARY_EXPLORER' && (
        <div className="w-full h-[calc(100vh-40px)] relative bg-black">
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
          {/* Overlay HUD with telemetry */}
          <div className="absolute top-3 left-3 bg-[#050e1d]/90 backdrop-blur-md border border-cyan-500/40 rounded-lg p-3 text-xs font-mono text-cyan-300 space-y-1 pointer-events-none shadow-2xl">
            <div className="text-white font-bold text-sm">3D SPACE-EARTH FSOC VIRTUAL SIMULATOR</div>
            <div>DISTANCE: {targetGeometry.distanceKm.toFixed(1)} km</div>
            <div>PAT STATE: {patState}</div>
            <div>RECEIVED POWER: {linkBudget.receivedPowerDbm.toFixed(1)} dBm</div>
            <div>SNR: {linkBudget.snrDb.toFixed(1)} dB</div>
            <div>BEAM DIVERGENCE: {linkBudget.beamDivergenceUrad.toFixed(1)} µrad</div>
            <div className="text-slate-400 text-[10px] mt-1">
              [Left Mouse Drag] Orbit Camera • [Right Mouse Drag] Pan • [Scroll] Zoom In/Out
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: RESEARCH EXPERIMENTS & DATA PIPELINE */}
      {appMode === 'RESEARCH_BENCHMARKS' && (
        <div className="flex flex-col flex-1">
          {/* 1. Mission Control Header & Status Telemetry Ribbon */}
          <HeaderTelemetry
            isRunning={isRunning}
            onToggleRunning={() => setIsRunning(!isRunning)}
            onReset={handleResetSimulation}
            simSpeed={simSpeed}
            onSpeedChange={setSimSpeed}
            patState={patState}
            detection={detection}
            linkBudget={linkBudget}
            geometry={targetGeometry}
            controlMode={controlMode}
            architecture={architecture}
            onArchitectureChange={setArchitecture}
            onLoadScenario={handleLoadScenario}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onFastAcquire={handleFastAcquire}
            searchTelemetry={searchTelemetry}
          />

          <main className="flex-1 w-full p-3 sm:p-4 max-w-[1720px] mx-auto flex flex-col gap-3.5">
            {/* ROW 1: The Three Primary Vision Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 min-h-[380px]">
              <div className="h-[360px] lg:h-[400px]">
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

              <div className="h-[360px] lg:h-[400px]">
                <CameraViewPanel
                  cameraSpecs={cameraSpecs}
                  detection={detection}
                  patState={patState}
                  detectionMode={detectionMode}
                  onDetectionModeChange={setDetectionMode}
                  architecture={architecture}
                  onArchitectureChange={setArchitecture}
                  backgroundNoise={disturbances.backgroundNoise}
                />
              </div>

              <div className="h-[360px] lg:h-[400px]">
                <TrackingViewPanel
                  cameraSpecs={cameraSpecs}
                  detection={detection}
                  patState={patState}
                  controlMode={controlMode}
                  architecture={architecture}
                  beamDivergenceUrad={linkBudget.beamDivergenceUrad}
                />
              </div>
            </div>

            {/* ROW 2: Animated Closed-Loop Processing Pipeline */}
            <ProcessingPipeline
              patState={patState}
              detection={detection}
              controlMode={controlMode}
              architecture={architecture}
            />

            {/* ROW 3: Control & Telemetry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-4 min-h-[380px]">
                <PointingControlPanel
                  cameraSpecs={cameraSpecs}
                  onCameraChange={(updated) => {
                    setCameraSpecs((prev) => {
                      const n = { ...prev, ...updated };
                      cameraSpecsRef.current = n;
                      return n;
                    });
                  }}
                  pidParams={pidParams}
                  onPidChange={(updated) => setPidParams((prev) => ({ ...prev, ...updated }))}
                  controlMode={controlMode}
                  onControlModeChange={setControlMode}
                  detection={detection}
                  patState={patState}
                  yawCorrection={corrections.yaw}
                  pitchCorrection={corrections.pitch}
                  onFastAcquire={handleFastAcquire}
                  searchTelemetry={searchTelemetry}
                  targetGeometry={targetGeometry}
                />
              </div>

              <div className="md:col-span-5 min-h-[380px]">
                <RealTimePlots
                  detection={detection}
                  telemetryHistory={telemetryHistory}
                  beamDivergenceUrad={linkBudget.beamDivergenceUrad}
                />
              </div>

              <div className="md:col-span-3 min-h-[380px]">
                <ResultMetricsPanel
                  metrics={metrics}
                  benchmark={benchmark}
                  patState={patState}
                  controlMode={controlMode}
                  architecture={architecture}
                  beaconDetected={detection.detected}
                />
              </div>
            </div>

            {/* ROW 4: FSOC Space Challenges + 7 Research Experiments */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 min-h-[320px]">
              <div className="xl:col-span-7">
                <LinkBudgetChallenges
                  linkBudget={linkBudget}
                  geometry={targetGeometry}
                  disturbances={disturbances}
                  onDisturbanceChange={(updated) => setDisturbances((prev) => ({ ...prev, ...updated }))}
                  motionParams={motionParams}
                  onMotionChange={(updated) => setMotionParams((prev) => ({ ...prev, ...updated }))}
                  detection={detection}
                  patState={patState}
                  onTriggerBeaconLoss={handleTriggerBeaconLoss}
                  onResetSimulation={handleResetSimulation}
                />
              </div>

              <div className="xl:col-span-5">
                <ExperimentBenchmarkPanel
                  architecture={architecture}
                  onArchitectureChange={setArchitecture}
                  onApplyPreset={handleApplyPreset}
                  onTriggerBeaconLoss={handleTriggerBeaconLoss}
                  patState={patState}
                  detection={detection}
                />
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Aerospace Footer Tagline matching photo */}
      <footer className="text-center py-2 text-[11px] font-mono text-slate-500 border-t border-slate-900 bg-[#02050e]">
        A simple demonstration of AI-based optical beacon tracking for satellite communication (FSOC/PAT).
      </footer>
    </div>
  );
}
