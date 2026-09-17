/**
 * Physics and Optical Communication Geometry Engine for FSOC Simulation
 */

import { 
  TrajectoryType, 
  TargetMotionParams, 
  Disturbances, 
  CameraSpecs, 
  TargetGeometry, 
  LinkBudget 
} from '../types';

export class PhysicsEngine {
  /**
   * Calculates the 3D position of the target relative to the primary satellite
   * @param t Simulation time in seconds
   * @param params Target motion configuration
   * @param disturbances Active disturbance multipliers
   */
  public static calculateTargetPosition(
    t: number,
    params: TargetMotionParams,
    disturbances: Disturbances
  ): TargetGeometry {
    const { trajectory, baseDistanceKm, velocityKmS, angularVelocityDegS, motionAmplitudeDeg } = params;
    
    // Target motion multipliers from disturbances
    const speedMult = 0.2 + ((disturbances.targetMotionSpeed ?? disturbances.targetMotion ?? 30) / 100) * 1.8;
    const angVelMult = 0.3 + ((disturbances.targetAngularVelocity ?? 25) / 100) * 1.7;
    const accelMult = 0.5 + ((disturbances.targetAcceleration ?? 15) / 100) * 1.5;

    // Angular frequency in rad/s modulated by disturbances
    const w = ((angularVelocityDegS * angVelMult) * Math.PI) / 180;
    const ampRad = (motionAmplitudeDeg * Math.PI) / 180;

    // Effective time scaled by motion speed
    const teff = t * speedMult;

    let az = 0; // azimuth angle in radians (yaw)
    let el = 0; // elevation angle in radians (pitch)
    let dist = baseDistanceKm;
    let rangeRate = 0; // km/s

    switch (trajectory) {
      case 'circular':
        az = ampRad * Math.cos(w * teff);
        el = ampRad * Math.sin(w * teff);
        rangeRate = 0.05 * Math.sin(0.2 * teff);
        dist += 2.0 * Math.sin(0.2 * teff);
        break;

      case 'sinusoidal':
        az = ampRad * Math.sin(w * teff);
        el = ampRad * 0.7 * Math.sin(w * 1.618 * teff + 0.5);
        rangeRate = 0.12 * Math.cos(0.3 * teff);
        dist += 5.0 * Math.sin(0.3 * teff);
        break;

      case 'linear': {
        // Sweeping drift across field with periodic return
        const cyclePeriod = 20 / Math.max(0.2, speedMult); // seconds
        const phase = (teff % cyclePeriod) / cyclePeriod;
        const normalized = (phase - 0.5) * 2; // -1 to +1
        az = ampRad * 1.5 * normalized;
        el = ampRad * 0.4 * Math.sin(teff * 0.5);
        rangeRate = velocityKmS * (normalized > 0 ? 1 : -1) * speedMult;
        dist += rangeRate * 2.0;
        break;
      }

      case 'orbital': {
        // Relative orbital motion (Hill-Clohessy-Wiltshire ellipse)
        const meanMotion = w * 0.5; // orbital angular rate
        az = ampRad * (1.2 * Math.sin(meanMotion * teff));
        el = ampRad * (0.6 * Math.cos(meanMotion * teff));
        rangeRate = 0.42 * Math.cos(meanMotion * teff);
        dist = baseDistanceKm + 15 * Math.sin(meanMotion * teff);
        break;
      }

      case 'random': {
        // Multi-harmonic pseudo-random walk
        az = ampRad * (0.6 * Math.sin(w * teff) + 0.3 * Math.sin(2.7 * w * teff * accelMult) + 0.15 * Math.cos(4.3 * w * teff));
        el = ampRad * (0.5 * Math.cos(0.9 * w * teff) + 0.35 * Math.sin(2.1 * w * teff * accelMult) + 0.2 * Math.sin(3.5 * w * teff));
        rangeRate = 0.25 * Math.sin(0.5 * teff);
        dist += 4.0 * Math.sin(0.5 * teff);
        break;
      }

      case 'custom':
      default:
        // Combined spiral Lissajous
        az = ampRad * Math.sin(w * teff) * (0.8 + 0.2 * Math.sin(0.1 * teff));
        el = ampRad * Math.cos(w * 1.3 * teff * accelMult) * (0.8 + 0.2 * Math.cos(0.1 * teff));
        rangeRate = 0.18;
        dist += 3.0 * Math.sin(0.1 * teff);
        break;
    }

    // Apply target random motion & thruster jitter disturbances
    const targetJitterLevel = (disturbances.targetRandomMotionJitter ?? 12) / 100;
    if (targetJitterLevel > 0) {
      const targetJitterFactor = targetJitterLevel * 0.005;
      az += targetJitterFactor * (Math.sin(17 * t) + Math.cos(29 * t) + 0.5 * Math.sin(47 * t));
      el += targetJitterFactor * (Math.cos(19 * t) + Math.sin(31 * t) + 0.5 * Math.cos(53 * t));
    }

    // Convert spherical angles to 3D Cartesian coordinates (Z is forward along optical boresight)
    const relX = dist * Math.sin(az) * Math.cos(el);
    const relY = dist * Math.sin(el);
    const relZ = dist * Math.cos(az) * Math.cos(el);

    const azDeg = (az * 180) / Math.PI;
    const elDeg = (el * 180) / Math.PI;

    // Velocity vector (km/s)
    const vx = w * dist * Math.cos(az) * Math.cos(el) * 0.05 * speedMult;
    const vy = w * dist * Math.cos(el) * 0.05 * speedMult;
    const vz = rangeRate;

    return {
      distanceKm: dist,
      rangeRateKmS: rangeRate,
      azimuthDeg: azDeg,
      elevationDeg: elDeg,
      relX,
      relY,
      relZ,
      velocityVec: [vx, vy, vz],
      losVector: [relX / dist, relY / dist, relZ / dist],
    };
  }

  /**
   * Calculates satellite micro-vibrations, platform jitter, pointing bias, and attitude drift
   */
  public static calculateDisturbances(
    t: number,
    disturbances: Disturbances
  ): { vibYaw: number; vibPitch: number; jitterX: number; jitterY: number } {
    const vibLevel = (disturbances.satelliteVibration ?? disturbances.vibration ?? 12) / 100;
    const jitterLevel = (disturbances.angularJitter ?? 10) / 100;
    const attitudeLevel = (disturbances.attitudeFluctuation ?? 8) / 100;
    const biasLevel = (disturbances.pointingBias ?? 5) / 100;
    const mechNoiseLevel = (disturbances.cameraMechanicalNoise ?? 8) / 100;

    // High frequency reaction wheel harmonics (18Hz, 45Hz, 95Hz)
    const vibYaw = vibLevel * 0.045 * (
      0.5 * Math.sin(18 * t * 2 * Math.PI) +
      0.3 * Math.sin(45 * t * 2 * Math.PI) +
      0.2 * Math.sin(95 * t * 2 * Math.PI)
    );
    const vibPitch = vibLevel * 0.045 * (
      0.5 * Math.cos(22 * t * 2 * Math.PI) +
      0.3 * Math.cos(48 * t * 2 * Math.PI) +
      0.2 * Math.cos(90 * t * 2 * Math.PI)
    );

    // Low frequency structural solar array boom sway + attitude drift (~0.2 - 1.5 Hz)
    const jitterX = (
      jitterLevel * 0.06 * (0.7 * Math.sin(1.2 * t * 2 * Math.PI) + 0.3 * Math.sin(3.4 * t * 2 * Math.PI)) +
      attitudeLevel * 0.04 * Math.sin(0.25 * t * 2 * Math.PI) +
      biasLevel * 0.035 +
      mechNoiseLevel * 0.015 * (Math.sin(55 * t) + Math.cos(82 * t))
    );
    const jitterY = (
      jitterLevel * 0.06 * (0.7 * Math.cos(1.1 * t * 2 * Math.PI) + 0.3 * Math.sin(3.1 * t * 2 * Math.PI)) +
      attitudeLevel * 0.04 * Math.cos(0.2 * t * 2 * Math.PI) +
      biasLevel * 0.025 +
      mechNoiseLevel * 0.015 * (Math.cos(63 * t) + Math.sin(78 * t))
    );

    return { vibYaw, vibPitch, jitterX, jitterY };
  }

  /**
   * Computes optical link budget parameters including free-space path loss,
   * pointing loss from mispointing angle, beacon flicker, atmospheric losses, and received optical SNR.
   */
  public static calculateLinkBudget(
    totalAngularErrorUrad: number,
    distanceKm: number,
    beamDivergenceUrad: number,
    disturbances: Disturbances,
    isDetected: boolean
  ): LinkBudget {
    const wavelengthNm = 1550;
    const wavelengthM = wavelengthNm * 1e-9;
    const distanceM = distanceKm * 1000;

    // Beacon & transmitter power: nominal 2.0 W (33 dBm) scaled by beaconBrightness
    const brightnessFactor = Math.max(0.05, (disturbances.beaconBrightness ?? 85) / 100);
    const transmitPowerW = 2.0 * brightnessFactor;
    const transmitPowerDbm = 10 * Math.log10(Math.max(0.001, transmitPowerW * 1000));

    // Free Space Path Loss (FSPL) = (4*pi*R / lambda)^2
    const fsplLinear = Math.pow((4 * Math.PI * distanceM) / wavelengthM, 2);
    const pathLossDb = 10 * Math.log10(fsplLinear);

    // Optical transmitter & receiver telescope gains
    const dTx = 0.15; // 15cm
    const dRx = 0.25; // 25cm
    const gainTxDb = 10 * Math.log10(Math.pow((Math.PI * dTx) / wavelengthM, 2)); // ~109.6 dB
    const gainRxDb = 10 * Math.log10(Math.pow((Math.PI * dRx) / wavelengthM, 2)); // ~114.1 dB

    // Telescope optical efficiency losses
    const opticsLossDb = 4.5;

    // Pointing Loss Lp(theta) = 24.08 * (theta / theta_div)^2
    const normError = totalAngularErrorUrad / Math.max(1, beamDivergenceUrad);
    const pointingLossDb = Math.min(45.0, 24.0 * Math.pow(normError, 2));

    // Atmospheric / propagation losses (for space-to-ground or turbulence injection)
    const turbulenceLossDb = ((disturbances.atmosphericTurbulence ?? 0) / 100) * 8.0;
    const scintillationDb = ((disturbances.scintillation ?? 0) / 100) * 6.0;
    const attenuationDb = (((disturbances.atmosphericAttenuation ?? 0) + (disturbances.cloudFogAttenuation ?? 0)) / 200) * 12.0;
    const totalAtmosphericLossDb = turbulenceLossDb + scintillationDb + attenuationDb;

    // Total received power in dBm
    let rxPowerDbm = transmitPowerDbm + gainTxDb + gainRxDb - pathLossDb - opticsLossDb - pointingLossDb - totalAtmosphericLossDb;

    // Sensitivity floor: -60 dBm
    if (rxPowerDbm < -60 || !isDetected) {
      rxPowerDbm = -60;
    }

    // Convert dBm to microwatts
    const rxPowerUw = Math.max(0, Math.pow(10, rxPowerDbm / 10) * 1000);

    // Receiver noise floor (thermal + shot + ASE noise + background stray light + image noise)
    const envNoise = ((disturbances.backgroundStarNoise ?? disturbances.backgroundNoise ?? 15) * 0.4 +
                      (disturbances.backgroundLight ?? 12) * 0.3 +
                      (disturbances.strayLightSunlight ?? 10) * 0.3) / 100;
    const sensorNoise = ((disturbances.imageNoise ?? disturbances.sensorNoise ?? 15) * 0.6 +
                        (disturbances.gaussianNoise ?? 12) * 0.4) / 100;
    
    const noiseFloorDbm = -42.0 + (envNoise * 5.0) + (sensorNoise * 3.0);
    const snrDb = Math.max(0, rxPowerDbm - noiseFloorDbm);

    // Link margin above required SNR threshold (12 dB required for 10 Gbps 1e-9 BER)
    const snrThresholdDb = 12.0;
    const linkMarginDb = snrDb - snrThresholdDb;

    // Bit Error Rate approximation
    let ber = 1.0;
    if (snrDb > 4) {
      const snrLin = Math.pow(10, snrDb / 10);
      ber = Math.max(1e-12, 0.5 * Math.exp(-snrLin / 4));
    }

    // Link state with realistic beam divergence envelope and hysteresis
    let status: 'CONNECTED' | 'ACQUIRING' | 'LOST' = 'LOST';
    if (isDetected && linkMarginDb >= 0.5 && normError <= 1.85) {
      status = 'CONNECTED';
    } else if (isDetected && (snrDb >= 4.0 || normError <= 3.2)) {
      status = 'ACQUIRING';
    } else {
      status = 'LOST';
    }

    const channelAvailability = status === 'CONNECTED' ? 99.95 : (status === 'ACQUIRING' ? 84.5 : 0.0);

    return {
      status,
      wavelengthNm,
      dataRateGbps: 10,
      beamDivergenceUrad,
      transmitPowerW,
      receivedPowerDbm: parseFloat(rxPowerDbm.toFixed(2)),
      receivedPowerUw: parseFloat(rxPowerUw.toFixed(4)),
      snrDb: parseFloat(snrDb.toFixed(2)),
      linkMarginDb: parseFloat(linkMarginDb.toFixed(2)),
      pointingLossDb: parseFloat(pointingLossDb.toFixed(2)),
      pathLossDb: parseFloat(pathLossDb.toFixed(2)),
      ber,
      channelAvailability,
    };
  }
}
