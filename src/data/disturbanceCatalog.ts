import { Disturbances, DisturbanceEducationalDetail, TrackingDifficultyLevel } from '../types';

export const DEFAULT_DISTURBANCES: Disturbances = {
  // 1. Environment Disturbances
  backgroundStarNoise: 15,
  backgroundLight: 12,
  strayLightSunlight: 10,
  otherBrightObjects: 15,
  spaceDebrisDensity: 20,
  starFieldDensity: 40,
  cosmicRayEvents: 8,

  // 2. Target / Beacon Disturbances
  beaconBrightness: 85,
  beaconIntensityFluctuation: 15,
  beaconFlicker: 10,
  beaconApparentSize: 50,
  beaconBeamDivergence: 25, // corresponds to 15 µrad
  targetMotionSpeed: 30,
  targetAngularVelocity: 25,
  targetRandomMotionJitter: 12,
  targetAcceleration: 15,

  // 3. Sensor / Camera Disturbances
  imageNoise: 15,
  gaussianNoise: 12,
  motionBlur: 10,
  focusBlur: 5,
  exposureVariation: 10,
  gainVariation: 8,
  pixelDropout: 5,
  hotPixels: 8,
  sensorSaturation: 10,
  detectionNoise: 10,
  cameraFrameDelay: 5,

  // 4. Platform / Pointing Disturbances
  satelliteVibration: 12,
  angularJitter: 10,
  attitudeFluctuation: 8,
  pointingBias: 5,
  pointingError: 10,
  controlDelay: 8,
  actuatorNoise: 10,
  cameraMechanicalNoise: 8,

  // 5. Atmospheric / Propagation Effects (defaults to 0 for space-to-space links)
  atmosphericTurbulence: 0,
  scintillation: 0,
  beamWander: 0,
  atmosphericAttenuation: 0,
  cloudFogAttenuation: 0,
};

export interface DisturbancePresetDefinition {
  id: string;
  name: string;
  badge: string;
  description: string;
  values: Partial<Disturbances>;
}

export const DISTURBANCE_PRESETS: DisturbancePresetDefinition[] = [
  {
    id: 'ideal',
    name: 'Ideal (No Disturbance)',
    badge: 'IDEAL',
    description: 'Near-zero vibrations, pristine dark background, stable beacon, nominal target motion.',
    values: {
      backgroundStarNoise: 2,
      backgroundLight: 0,
      strayLightSunlight: 0,
      otherBrightObjects: 0,
      spaceDebrisDensity: 0,
      starFieldDensity: 20,
      cosmicRayEvents: 0,
      beaconBrightness: 100,
      beaconIntensityFluctuation: 0,
      beaconFlicker: 0,
      beaconApparentSize: 50,
      beaconBeamDivergence: 20,
      targetMotionSpeed: 15,
      targetAngularVelocity: 10,
      targetRandomMotionJitter: 0,
      targetAcceleration: 5,
      imageNoise: 2,
      gaussianNoise: 2,
      motionBlur: 0,
      focusBlur: 0,
      exposureVariation: 0,
      gainVariation: 0,
      pixelDropout: 0,
      hotPixels: 0,
      sensorSaturation: 0,
      detectionNoise: 2,
      cameraFrameDelay: 0,
      satelliteVibration: 2,
      angularJitter: 2,
      attitudeFluctuation: 2,
      pointingBias: 0,
      pointingError: 2,
      controlDelay: 2,
      actuatorNoise: 2,
      cameraMechanicalNoise: 2,
      atmosphericTurbulence: 0,
      scintillation: 0,
      beamWander: 0,
      atmosphericAttenuation: 0,
      cloudFogAttenuation: 0,
    },
  },
  {
    id: 'low',
    name: 'Low Noise',
    badge: 'LOW',
    description: 'Realistic quiescent orbit, small sensor readout noise, mild attitude jitter.',
    values: {
      backgroundStarNoise: 15,
      backgroundLight: 10,
      strayLightSunlight: 8,
      otherBrightObjects: 10,
      spaceDebrisDensity: 15,
      starFieldDensity: 35,
      cosmicRayEvents: 5,
      beaconBrightness: 90,
      beaconIntensityFluctuation: 10,
      beaconFlicker: 5,
      beaconApparentSize: 50,
      targetMotionSpeed: 25,
      targetAngularVelocity: 20,
      targetRandomMotionJitter: 10,
      targetAcceleration: 10,
      imageNoise: 12,
      gaussianNoise: 10,
      motionBlur: 10,
      focusBlur: 5,
      exposureVariation: 8,
      gainVariation: 5,
      pixelDropout: 5,
      hotPixels: 5,
      satelliteVibration: 12,
      angularJitter: 10,
      attitudeFluctuation: 8,
      pointingBias: 5,
      pointingError: 8,
      controlDelay: 5,
      actuatorNoise: 8,
      cameraMechanicalNoise: 6,
    },
  },
  {
    id: 'high_noise',
    name: 'High Noise',
    badge: 'NOISY',
    description: 'Heavy background star noise, intense stray solar glare, elevated sensor readout noise.',
    values: {
      backgroundStarNoise: 75,
      backgroundLight: 70,
      strayLightSunlight: 65,
      otherBrightObjects: 50,
      spaceDebrisDensity: 40,
      starFieldDensity: 70,
      cosmicRayEvents: 35,
      beaconBrightness: 65,
      beaconIntensityFluctuation: 30,
      beaconFlicker: 25,
      imageNoise: 60,
      gaussianNoise: 55,
      hotPixels: 40,
      sensorSaturation: 45,
      detectionNoise: 45,
      exposureVariation: 35,
    },
  },
  {
    id: 'strong_disturbance',
    name: 'Strong Disturbance',
    badge: 'STRONG',
    description: 'High reaction wheel micro-vibrations, platform attitude jitter, and fast target maneuvering.',
    values: {
      satelliteVibration: 65,
      angularJitter: 60,
      attitudeFluctuation: 45,
      pointingBias: 25,
      pointingError: 35,
      controlDelay: 30,
      actuatorNoise: 40,
      cameraMechanicalNoise: 35,
      targetMotionSpeed: 60,
      targetAngularVelocity: 55,
      targetRandomMotionJitter: 45,
      motionBlur: 45,
      imageNoise: 35,
    },
  },
  {
    id: 'dense_debris',
    name: 'Dense Debris Field',
    badge: 'DEBRIS',
    description: 'Abundant bright space debris and background stars causing potential false-beacon distractors.',
    values: {
      spaceDebrisDensity: 85,
      otherBrightObjects: 80,
      starFieldDensity: 75,
      backgroundStarNoise: 45,
      cosmicRayEvents: 30,
      beaconBrightness: 75,
      imageNoise: 30,
      detectionNoise: 40,
    },
  },
  {
    id: 'weak_beacon',
    name: 'Weak Beacon',
    badge: 'WEAK',
    description: 'Low beacon optical emission, high intensity fluctuation, challenging signal-to-noise ratio.',
    values: {
      beaconBrightness: 22,
      beaconIntensityFluctuation: 65,
      beaconFlicker: 50,
      beaconApparentSize: 30,
      backgroundStarNoise: 40,
      imageNoise: 35,
      sensorSaturation: 5,
      gaussianNoise: 30,
    },
  },
  {
    id: 'fast_target',
    name: 'Fast Target',
    badge: 'FAST',
    description: 'High relative orbital velocity and angular acceleration requiring proactive Kalman feedforward.',
    values: {
      targetMotionSpeed: 85,
      targetAngularVelocity: 80,
      targetAcceleration: 70,
      targetRandomMotionJitter: 40,
      motionBlur: 60,
      controlDelay: 25,
    },
  },
  {
    id: 'extreme',
    name: 'Extreme (Link at Risk)',
    badge: 'CRITICAL',
    description: 'Simultaneous severe platform vibration, low beacon contrast, solar glare, and sensor noise.',
    values: {
      backgroundStarNoise: 80,
      backgroundLight: 75,
      strayLightSunlight: 70,
      otherBrightObjects: 75,
      spaceDebrisDensity: 70,
      starFieldDensity: 80,
      cosmicRayEvents: 50,
      beaconBrightness: 30,
      beaconIntensityFluctuation: 65,
      beaconFlicker: 60,
      targetMotionSpeed: 75,
      targetAngularVelocity: 70,
      targetRandomMotionJitter: 55,
      imageNoise: 75,
      gaussianNoise: 70,
      motionBlur: 65,
      focusBlur: 45,
      pixelDropout: 35,
      hotPixels: 45,
      sensorSaturation: 60,
      detectionNoise: 65,
      cameraFrameDelay: 40,
      satelliteVibration: 80,
      angularJitter: 75,
      attitudeFluctuation: 60,
      pointingBias: 40,
      pointingError: 55,
      controlDelay: 50,
      actuatorNoise: 55,
      cameraMechanicalNoise: 50,
    },
  },
];

export const EDUCATIONAL_CATALOG: Record<string, DisturbanceEducationalDetail> = {
  backgroundStarNoise: {
    id: 'backgroundStarNoise',
    name: 'Background Star Noise',
    category: 'environment',
    effect: 'Introduces shot noise and photon spatial variance across the optical focal plane array.',
    impact: 'Lowers signal-to-noise ratio (SNR) and degrades beacon contrast against the deep-space background.',
    aiResponse: 'Employs spatial gradient discrimination and dynamic thresholding to isolate steep Airy disk peaks.',
    risk: 'At high levels, low-contrast beacons become indistinguishable from background noise, triggering loss.',
  },
  strayLightSunlight: {
    id: 'strayLightSunlight',
    name: 'Stray Light / Sunlight Glare',
    category: 'environment',
    effect: 'Causes diffuse illumination gradients and optical lens flare across the sensor from off-axis solar rays.',
    impact: 'Elevates sensor black levels and washes out the beacon point spread function (PSF).',
    aiResponse: 'Applies convolutional feature matching and background pedestal subtraction to reject diffuse glare.',
    risk: 'Severe solar blindness when pointing near the solar exclusion angle (<20°), leading to link outage.',
  },
  otherBrightObjects: {
    id: 'otherBrightObjects',
    name: 'Other Bright Objects (Distractors)',
    category: 'environment',
    effect: 'Populates the camera field with non-target optical emitters (bright stars, planets, reflective satellites).',
    impact: 'Confuses traditional centroiding algorithms which latch onto whichever candidate is brightest.',
    aiResponse: 'Validates target kinematics and velocity vectors against historical Kalman trajectory predictions.',
    risk: 'Traditional PAT suffers false lock on distractors; AI tracks the true beacon through motion consistency.',
  },
  spaceDebrisDensity: {
    id: 'spaceDebrisDensity',
    name: 'Space Debris Density',
    category: 'environment',
    effect: 'Simulates micro-debris particles drifting and glinting sunlight across the Line-of-Sight (LOS).',
    impact: 'Produces transient specular flash artifacts that corrupt sub-pixel centroid calculation.',
    aiResponse: 'Uses temporal consistency filtering across multiple consecutive frames to discard momentary glints.',
    risk: 'Sustained debris scatter can interrupt optical beam continuity and cause tracking instability.',
  },
  starFieldDensity: {
    id: 'starFieldDensity',
    name: 'Star Field Density',
    category: 'environment',
    effect: 'Controls the baseline stellar population in the background celestial sphere.',
    impact: 'Higher density increases the probability of close-proximity stellar confounders.',
    aiResponse: 'Performs multi-candidate score ranking and ephemeris trajectory verification.',
    risk: 'Can degrade acquisition time when sweeping through dense galactic planes (Milky Way core).',
  },
  cosmicRayEvents: {
    id: 'cosmicRayEvents',
    name: 'Cosmic-Ray / Hot-Pixel Events',
    category: 'environment',
    effect: 'Simulates high-energy ionizing particles striking sensor CMOS pixels, creating saturated spikes.',
    impact: 'Causes single-frame delta-function intensity spikes that mimic an ultra-bright optical beacon.',
    aiResponse: 'Rejects single-pixel events that lack an optical Airy diffraction profile and multi-frame continuity.',
    risk: 'Unfiltered cosmic strikes pull the camera boresight abruptly off-target, spiking pointing error.',
  },
  beaconBrightness: {
    id: 'beaconBrightness',
    name: 'Beacon Brightness',
    category: 'target',
    effect: 'Controls the optical emission power of Terminal B\'s 1550 nm acquisition and tracking beacon.',
    impact: 'Higher brightness yields higher detection confidence and robust lock; lower brightness diminishes SNR.',
    aiResponse: 'Dynamically shifts from raw feature detection to Kalman motion extrapolation as intensity drops.',
    risk: 'Below receiver detection sensitivity floor (-55 dBm), the beacon is lost entirely.',
  },
  beaconIntensityFluctuation: {
    id: 'beaconIntensityFluctuation',
    name: 'Beacon Intensity Fluctuation & Flicker',
    category: 'target',
    effect: 'Modulates optical output power with harmonic and stochastic temporal variations.',
    impact: 'Causes detection confidence to oscillate, challenging simple static threshold detectors.',
    aiResponse: 'Maintains Kalman kinematic state estimates through brief intensity dips without dropping lock.',
    risk: 'Deep negative troughs can cause state machine to false-trigger REACQUISITION.',
  },
  beaconApparentSize: {
    id: 'beaconApparentSize',
    name: 'Beacon Apparent Size',
    category: 'target',
    effect: 'Adjusts the optical spot diameter and Point Spread Function (PSF) width on the sensor array.',
    impact: 'A spread beam reduces peak pixel intensity while increasing sub-pixel centroid integration area.',
    aiResponse: 'Adapts bounding box scale and Gaussian template fitting to match the observed spot diameter.',
    risk: 'Excessive spreading disperses photon energy below the detection threshold.',
  },
  targetMotionSpeed: {
    id: 'targetMotionSpeed',
    name: 'Target Motion Speed & Angular Rate',
    category: 'target',
    effect: 'Increases the relative orbital and cross-track velocity of Terminal B across Terminal A\'s sky.',
    impact: 'Produces larger pixel displacement between frames, increasing tracking lag and motor demand.',
    aiResponse: 'Activates proactive lookahead feedforward prediction, rotating the gimbal ahead of time.',
    risk: 'Exceeding gimbal slew acceleration limits causes the beacon to slide out of the camera FOV.',
  },
  targetRandomMotionJitter: {
    id: 'targetRandomMotionJitter',
    name: 'Target Random Motion / Jitter',
    category: 'target',
    effect: 'Introduces unpredictable thruster firing vibrations and station-keeping wobble onto Terminal B.',
    impact: 'Degrades velocity estimation and increases motion prediction error.',
    aiResponse: 'Increases process noise covariance Q in the Kalman filter, relying more on instant measurements.',
    risk: 'Extreme jitter causes pointing loss to breach the optical link budget margin.',
  },
  imageNoise: {
    id: 'imageNoise',
    name: 'Sensor Image & Gaussian Noise',
    category: 'sensor',
    effect: 'Injects thermal Johnson-Nyquist and readout noise into the CMOS active pixel sensor.',
    impact: 'Degrades pixel fidelity and adds stochastic displacement to the detected centroid position.',
    aiResponse: 'Combines 2D spatial smoothing with Kalman state filtering to produce a stabilized track.',
    risk: 'High noise lowers detection confidence and can cause the system to drop from LOCKED to TRACKING.',
  },
  motionBlur: {
    id: 'motionBlur',
    name: 'Motion Blur',
    category: 'sensor',
    effect: 'Elongates the beacon spot along its relative velocity vector during camera exposure integration.',
    impact: 'Spreads optical energy into a streak, shifting the apparent center and reducing peak intensity.',
    aiResponse: 'Computes the velocity vector to perform directional deconvolution and streak centroiding.',
    risk: 'Severe blur reduces peak signal below threshold, causing detection dropout during high-rate maneuvers.',
  },
  focusBlur: {
    id: 'focusBlur',
    name: 'Focus Blur / Defocus',
    category: 'sensor',
    effect: 'Simulates thermal defocus or optical misalignment in Terminal A\'s receiving telescope.',
    impact: 'Transforms the tight Airy disk into a broad defocused circle with reduced center peak.',
    aiResponse: 'Expands the candidate search radius and weights edge gradients rather than central peak.',
    risk: 'Severe defocus prevents fine tracking lock and degrades pointing accuracy beyond beam divergence.',
  },
  pixelDropout: {
    id: 'pixelDropout',
    name: 'Pixel Dropout & Dead Pixels',
    category: 'sensor',
    effect: 'Simulates dead pixels that report zero signal due to space radiation damage.',
    impact: 'Can clip part of the beacon PSF if the spot transits across a damaged pixel cluster.',
    aiResponse: 'Interpolates missing pixel values using surrounding neighborhood Gaussian priors.',
    risk: 'Centroid skew when the beacon crosses a dead cluster, introducing brief pointing perturbations.',
  },
  satelliteVibration: {
    id: 'satelliteVibration',
    name: 'Satellite Vibration (Micro-Jitter)',
    category: 'platform',
    effect: 'Simulates structural micro-vibrations induced by reaction wheels, cryocoolers, and solar array flex.',
    impact: 'Jitters Terminal A\'s optical boresight at 10-100 Hz, displacing the beacon on the detector.',
    aiResponse: 'Employs Fast Steering Mirror (FSM) compensation models and high-rate adaptive disturbance rejection.',
    risk: 'High vibration spikes instantaneous pointing error beyond the 15 µrad beam divergence, breaking the link.',
  },
  controlDelay: {
    id: 'controlDelay',
    name: 'Control Delay & Actuator Lag',
    category: 'platform',
    effect: 'Simulates computation, command bus latency, and mechanical motor response delays.',
    impact: 'Creates phase lag between beacon displacement and gimbal corrective motion, causing overshoot.',
    aiResponse: 'Extends lookahead prediction horizon ($t + \\tau_{\\text{delay}}$) to compensate for motor inertia.',
    risk: 'Uncompensated delay leads to destructive phase margin erosion and control loop oscillation.',
  },
  atmosphericTurbulence: {
    id: 'atmosphericTurbulence',
    name: 'Atmospheric Turbulence & Scintillation',
    category: 'atmospheric',
    effect: 'Simulates refractive index fluctuations ($C_n^2$) along optical paths passing through atmosphere.',
    impact: 'Causes rapid intensity fading (scintillation) and optical beam wander.',
    aiResponse: 'Integrates adaptive optics (AO) phase correction models and deep temporal fading margin buffer.',
    risk: 'Note: Primarily relevant to space-to-ground links; set to 0% for pure inter-satellite crosslinks.',
  },
};

export function calculateTrackingDifficulty(disturbances: Disturbances): {
  level: TrackingDifficultyLevel;
  score: number; // 0 - 100
  label: string;
  description: string;
  color: string;
} {
  // Weighted contribution across categories
  const envScore = (
    (disturbances.backgroundStarNoise * 0.25) +
    (disturbances.backgroundLight * 0.25) +
    (disturbances.strayLightSunlight * 0.25) +
    (disturbances.otherBrightObjects * 0.25)
  );

  const targetDifficulty = (
    ((100 - disturbances.beaconBrightness) * 0.35) +
    (disturbances.beaconIntensityFluctuation * 0.20) +
    (disturbances.targetMotionSpeed * 0.25) +
    (disturbances.targetRandomMotionJitter * 0.20)
  );

  const sensorScore = (
    (disturbances.imageNoise * 0.25) +
    (disturbances.gaussianNoise * 0.20) +
    (disturbances.motionBlur * 0.25) +
    (disturbances.focusBlur * 0.15) +
    (disturbances.hotPixels * 0.15)
  );

  const platformScore = (
    (disturbances.satelliteVibration * 0.35) +
    (disturbances.angularJitter * 0.25) +
    (disturbances.pointingError * 0.20) +
    (disturbances.controlDelay * 0.20)
  );

  const atmScore = (
    (disturbances.atmosphericTurbulence * 0.5) +
    (disturbances.scintillation * 0.5)
  );

  // Overall aggregate score 0 - 100
  const score = Math.min(100, Math.max(0, Math.round(
    envScore * 0.25 +
    targetDifficulty * 0.25 +
    sensorScore * 0.20 +
    platformScore * 0.25 +
    atmScore * 0.05
  )));

  if (score < 15) {
    return {
      level: 'IDEAL',
      score,
      label: 'Ideal / Pristine Orbit',
      description: 'Quiescent space conditions. Beacon is bright, contrast is high, pointing is rock solid.',
      color: '#22c55e', // Green
    };
  } else if (score < 35) {
    return {
      level: 'EASY',
      score,
      label: 'Low Disturbance — Stable',
      description: 'Minor sensor readout noise and nominal orbital motion. AI tracking operates smoothly.',
      color: '#10b981', // Emerald
    };
  } else if (score < 60) {
    return {
      level: 'MODERATE',
      score,
      label: 'Moderate — High Difficulty',
      description: 'Elevated noise, noticeable platform jitter. AI filtering and feedforward active.',
      color: '#f59e0b', // Amber
    };
  } else if (score < 78) {
    return {
      level: 'DIFFICULT',
      score,
      label: 'Difficult — Degraded Link',
      description: 'High background distractors and platform vibration. Tracking error elevated near divergence.',
      color: '#f97316', // Orange
    };
  } else if (score < 90) {
    return {
      level: 'HIGH_RISK',
      score,
      label: 'High Risk — Link at Risk',
      description: 'Beacon contrast low, vibration severe. Link margin precarious; reacquisition may be needed.',
      color: '#ef4444', // Red
    };
  } else {
    return {
      level: 'CRITICAL',
      score,
      label: 'Critical — Extreme Link Loss',
      description: 'Combined severe disturbances exceed physical sensor and gimbal limits. Link intermittent/lost.',
      color: '#dc2626', // Deep Red
    };
  }
}
