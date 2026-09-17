/**
 * Type definitions for AI-Assisted Satellite-to-Satellite FSOC & PAT Simulation
 */

export type TrajectoryType = 'circular' | 'sinusoidal' | 'linear' | 'orbital' | 'random' | 'custom';

export type PATState = 
  | 'IDLE'
  | 'COARSE_POINTING'
  | 'SEARCHING'
  | 'ACQUISITION'
  | 'FINE_ALIGNMENT'
  | 'TRACKING'
  | 'LOCKED'
  | 'BEACON_LOST'
  | 'REACQUIRING'
  | 'LINK_LOST';

export type TrackingArchitecture = 'TRADITIONAL' | 'AI_ASSISTED';

export type ControlMode = 'MANUAL' | 'AUTO';

export type DetectionMode = 'THRESHOLD' | 'BLOB_CENTROID' | 'AI_CNN';

export interface CameraSpecs {
  width: number; // 640
  height: number; // 480
  fov: number; // degrees (e.g. 10.0°)
  zoom: number; // 1.0 - 5.0x
  focus: number; // 0.0 - 1.0 (1.0 = sharp)
  yaw: number; // degrees (-90 to +90)
  pitch: number; // degrees (-45 to +45)
  yawRate: number; // deg/s
  pitchRate: number; // deg/s
  sensitivity: number; // 0.1 - 2.0
  maxSpeed: number; // deg/s (e.g. 15.0 deg/s)
  maxAccel: number; // deg/s^2 (e.g. 45.0 deg/s^2)
}

export interface PIDParams {
  kp: number; // Proportional gain
  ki: number; // Integral gain
  kd: number; // Derivative gain
  kff: number; // Feedforward velocity gain (AI mode)
}

export interface Disturbances {
  // 1. Environment Disturbances
  backgroundStarNoise: number; // 0 - 100%
  backgroundLight: number; // 0 - 100% (or stray light / sunlight glare)
  strayLightSunlight: number; // 0 - 100%
  otherBrightObjects: number; // 0 - 100% (distractors / debris / stars)
  spaceDebrisDensity: number; // 0 - 100%
  starFieldDensity: number; // 0 - 100%
  cosmicRayEvents: number; // 0 - 100% (hot pixel flashes / radiation strikes)

  // 2. Target / Beacon Disturbances
  beaconBrightness: number; // 0 - 100%
  beaconIntensityFluctuation: number; // 0 - 100%
  beaconFlicker: number; // 0 - 100%
  beaconApparentSize: number; // 0 - 100%
  beaconBeamDivergence: number; // 0 - 100% (relative to nominal 15 µrad)
  targetMotionSpeed: number; // 0 - 100%
  targetAngularVelocity: number; // 0 - 100%
  targetRandomMotionJitter: number; // 0 - 100%
  targetAcceleration: number; // 0 - 100%

  // 3. Sensor / Camera Disturbances
  imageNoise: number; // 0 - 100%
  gaussianNoise: number; // 0 - 100%
  motionBlur: number; // 0 - 100%
  focusBlur: number; // 0 - 100%
  exposureVariation: number; // 0 - 100%
  gainVariation: number; // 0 - 100%
  pixelDropout: number; // 0 - 100%
  hotPixels: number; // 0 - 100%
  sensorSaturation: number; // 0 - 100%
  detectionNoise: number; // 0 - 100%
  cameraFrameDelay: number; // 0 - 100%

  // 4. Platform / Pointing Disturbances
  satelliteVibration: number; // 0 - 100%
  angularJitter: number; // 0 - 100%
  attitudeFluctuation: number; // 0 - 100%
  pointingBias: number; // 0 - 100%
  pointingError: number; // 0 - 100%
  controlDelay: number; // 0 - 100%
  actuatorNoise: number; // 0 - 100%
  cameraMechanicalNoise: number; // 0 - 100%

  // 5. Atmospheric / Propagation Effects (primarily for satellite-to-ground)
  atmosphericTurbulence: number; // 0 - 100%
  scintillation: number; // 0 - 100%
  beamWander: number; // 0 - 100%
  atmosphericAttenuation: number; // 0 - 100%
  cloudFogAttenuation: number; // 0 - 100%

  // Backwards compatibility legacy aliases (optional)
  vibration?: number;
  targetMotion?: number;
  sensorNoise?: number;
  backgroundNoise?: number;
}

export type DisturbanceCategory = 'environment' | 'target' | 'sensor' | 'platform' | 'atmospheric';

export type TrackingDifficultyLevel = 'IDEAL' | 'EASY' | 'MODERATE' | 'DIFFICULT' | 'HIGH_RISK' | 'CRITICAL';

export interface DisturbanceEducationalDetail {
  id: string;
  name: string;
  category: DisturbanceCategory;
  effect: string;
  impact: string;
  aiResponse: string;
  risk: string;
}

export interface TargetMotionParams {
  trajectory: TrajectoryType;
  baseDistanceKm: number;
  velocityKmS: number;
  angularVelocityDegS: number;
  motionAmplitudeDeg: number;
  intensity: number; // 0.1 - 2.0
  beaconPowerMw: number; // mW (e.g. 10 mW beacon)
  beamDivergenceUrad: number; // 10 µrad
}

export interface AIPredictionResult {
  predictedX: number; // Predicted pixel X in future (Cx=320)
  predictedY: number; // Predicted pixel Y in future (Cy=240)
  velocityX: number; // px/s
  velocityY: number; // px/s
  accelerationX: number; // px/s^2
  accelerationY: number; // px/s^2
  lookaheadSeconds: number; // e.g. 0.25s
  predictionConfidence: number; // 0 - 100%
  predictionErrorPx: number; // difference between previous prediction and actual
  stateEstimate: [number, number, number, number]; // [x, y, vx, vy]
  isPredicting: boolean;
  compensationActive: boolean;
  reacquisitionSector?: {
    centerYaw: number;
    centerPitch: number;
    radiusDeg: number;
  };
}

export interface BeaconDetectionResult {
  detected: boolean;
  confidence: number; // 0 - 100%
  x: number; // pixel in camera sensor [0, 640]
  y: number; // pixel in camera sensor [0, 480]
  rawX: number; // Raw measurement before Kalman filtering (Requirement 9)
  rawY: number;
  filteredX: number; // Filtered measurement from Kalman filter (Requirement 9)
  filteredY: number;
  size: number; // pixel diameter (Airy disk)
  errorX: number; // px: x - 320
  errorY: number; // px: y - 240
  angularErrorX: number; // µrad
  angularErrorY: number; // µrad
  totalAngularError: number; // µrad
  rawIntensity: number; // 0 - 255
  snrEstimate: number; // dB
  isInFov: boolean;
  detectionQuality: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'MARGINAL' | 'UNRELIABLE';
  distractorCount: number;
  activeDisturbances: string[];
  distractorPositions?: { x: number; y: number; brightness: number; isTrueBeacon: boolean }[];
  aiPrediction: AIPredictionResult;
}

export interface TargetGeometry {
  distanceKm: number;
  rangeRateKmS: number;
  azimuthDeg: number;
  elevationDeg: number;
  relX: number; // km
  relY: number; // km
  relZ: number; // km
  velocityVec: [number, number, number];
  losVector: [number, number, number];
}

export interface LinkBudget {
  status: 'CONNECTED' | 'ACQUIRING' | 'LOCKED' | 'LOST';
  wavelengthNm: number; // default 1550 nm
  dataRateGbps: number; // 10 Gbps
  beamDivergenceUrad: number; // 10 - 100 µrad
  transmitPowerW: number; // 2.0 W (33 dBm)
  receivedPowerDbm: number; // e.g. -24 dBm
  receivedPowerUw: number; // microwatts
  snrDb: number; // e.g. 18.5 dB
  linkMarginDb: number; // e.g. 6.2 dB
  pointingLossDb: number; // e.g. 2.1 dB
  pathLossDb: number; // e.g. 256.4 dB
  ber: number; // e.g. 1e-9
  channelAvailability: number; // 99.8%
}

export interface PerformanceMetrics {
  avgTrackingErrorPx: number;
  rmsTrackingErrorPx: number;
  maxTrackingErrorPx: number;
  avgAngularErrorUrad: number;
  acquisitionTimeS: number;
  reacquisitionTimeS: number;
  beaconDetectionRate: number; // %
  predictionErrorPx: number; // px
  trackingSuccessRate: number; // %
  linkAvailability: number; // %
  totalSamples: number;
  lockedSamples: number;
}

export interface ComparisonBenchmark {
  traditional: PerformanceMetrics;
  aiAssisted: PerformanceMetrics;
}

export interface TelemetryPoint {
  time: number;
  beaconX: number;
  beaconY: number;
  predictedX: number;
  predictedY: number;
  errorPx: number;
  predictionErrorPx: number;
  angularErrorUrad: number;
  yaw: number;
  pitch: number;
  snr: number;
  rxPower: number;
}

export interface ExperimentPreset {
  id: string;
  name: string;
  description: string;
  disturbances: Partial<Disturbances>;
  motionParams: Partial<TargetMotionParams>;
  cameraSpecs?: Partial<CameraSpecs>;
}

export interface SearchTelemetry {
  isSearching: boolean;
  searchMethod: 'AI_EPHEMERIS_SWEEP' | 'TRADITIONAL_SPIRAL' | 'COARSE_SLEW';
  targetLOS: { azimuthDeg: number; elevationDeg: number };
  distToLOSDeg: number;
  uncertaintyConeDeg: number;
  timeSearchingS: number;
  slewSpeedDegS: number;
  progressPct: number;
  explanation: string;
}

export interface DemoScenarioStep {
  stepNumber: number;
  title: string;
  description: string;
  patStateExpected: PATState;
  actionPrompt: string;
}
