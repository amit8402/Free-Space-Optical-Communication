/**
 * AI Perception, Motion Estimation, and Predictive Kalman Tracking Module
 * Implements:
 * 1. AI Feature-based Beacon Detection & Classification
 * 2. 6-State Kinematic Kalman Filter (Position, Velocity, Acceleration)
 * 3. Proactive Motion & Trajectory Prediction
 * 4. Adaptive Disturbance & Jitter Compensation
 * 5. Intelligent Reacquisition Search Sector Projection
 */

import { 
  AIPredictionResult, 
  Disturbances, 
  CameraSpecs, 
  TargetGeometry 
} from '../types';

export class AIPerceptionEngine {
  // Kalman Filter State: [x, y, vx, vy, ax, ay]
  private state: number[] = [320, 240, 0, 0, 0, 0];
  
  // State Covariance Matrix (6x6 diagonal approximation for stability and low latency)
  private P: number[] = [10, 10, 25, 25, 50, 50];
  
  // Process Noise Covariance Q
  private processNoise: number = 4.0;
  
  // Previous prediction for prediction error calculation
  private prevPredictedX: number = 320;
  private prevPredictedY: number = 240;
  private lastPredictionErrorPx: number = 0;
  
  // Detection persistence & confidence history
  private detectionHistory: boolean[] = [];
  private confidenceSmoothed: number = 98.0;
  
  // Lookahead time (seconds) for proactive feedforward pointing
  private lookaheadSeconds: number = 0.22;

  // History of detected points for motion trending
  private historyPoints: { x: number; y: number; time: number }[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.state = [320, 240, 0, 0, 0, 0];
    this.P = [10, 10, 25, 25, 50, 50];
    this.prevPredictedX = 320;
    this.prevPredictedY = 240;
    this.lastPredictionErrorPx = 0;
    this.detectionHistory = [];
    this.confidenceSmoothed = 98.0;
    this.historyPoints = [];
  }

  /**
   * AI Beacon Detection & Perception
   * Evaluates simulated sensor image frame characteristics:
   * Intensity profile, point spread Gaussian fit, background glare contrast,
   * and discriminates real beacon from stray sunlight.
   */
  public detectAndClassify(
    rawPixelX: number,
    rawPixelY: number,
    camera: CameraSpecs,
    disturbances: Disturbances,
    opticalIntensity: number,
    isInFov: boolean
  ): {
    detected: boolean;
    confidence: number;
    filteredX: number;
    filteredY: number;
    classification: 'BEACON_CONFIRMED' | 'SOLAR_GLARE_REJECTED' | 'BACKGROUND_NOISE' | 'NO_SIGNAL';
    detectionQuality: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'MARGINAL' | 'UNRELIABLE';
  } {
    if (!isInFov) {
      this.detectionHistory.push(false);
      if (this.detectionHistory.length > 30) this.detectionHistory.shift();
      this.confidenceSmoothed = Math.max(0, this.confidenceSmoothed * 0.9);
      return {
        detected: false,
        confidence: 0,
        filteredX: 320,
        filteredY: 240,
        classification: 'NO_SIGNAL',
        detectionQuality: 'UNRELIABLE',
      };
    }

    const sensorNoise = ((disturbances.imageNoise ?? disturbances.sensorNoise ?? 15) * 0.6 + (disturbances.gaussianNoise ?? 12) * 0.4) / 100;
    const bgNoise = ((disturbances.backgroundStarNoise ?? disturbances.backgroundNoise ?? 15) * 0.5 + (disturbances.backgroundLight ?? 12) * 0.3 + (disturbances.strayLightSunlight ?? 10) * 0.2) / 100;
    const defocusFactor = Math.abs(1.0 - camera.focus) + ((disturbances.focusBlur ?? 5) / 100) * 0.8;
    const motionBlurFactor = ((disturbances.motionBlur ?? 10) / 100);
    const brightnessScale = Math.max(0.05, (disturbances.beaconBrightness ?? 85) / 100);
    const flickerFactor = ((disturbances.beaconFlicker ?? 10) / 100) * (Math.sin(performance.now() * 0.01) * 0.5 + 0.5);

    // AI Feature Discrimination:
    // Optical beacon has a steep Gaussian slope (Airy disk).
    // Solar stray light has a broad, flat illumination profile.
    // The AI classifier computes spatial gradient sharpness, peak contrast, and PSF shape.
    const effectiveOpticalIntensity = opticalIntensity * brightnessScale * (1.0 - flickerFactor * 0.4);
    const peakSignal = 240 * effectiveOpticalIntensity * (1 - defocusFactor * 0.35) * (1 - motionBlurFactor * 0.25);
    const ambientFloor = 25 + bgNoise * 110 + (sensorNoise * 30);
    const contrastRatio = peakSignal / Math.max(1, ambientFloor);

    // AI learned classifier score [0 - 100%]
    let aiScore = Math.min(99.9, (contrastRatio / 4.5) * 85 + 12);
    aiScore -= sensorNoise * 22;
    aiScore -= defocusFactor * 18;
    aiScore -= motionBlurFactor * 14;
    aiScore = Math.max(0, Math.min(99.9, aiScore));

    // Glare and background rejection logic
    let classification: 'BEACON_CONFIRMED' | 'SOLAR_GLARE_REJECTED' | 'BACKGROUND_NOISE' | 'NO_SIGNAL' = 'BEACON_CONFIRMED';
    let isBeacon = true;

    if (contrastRatio < 1.15 || aiScore < 20) {
      classification = 'BACKGROUND_NOISE';
      isBeacon = false;
      aiScore = Math.max(0, aiScore * 0.3);
    } else if (bgNoise > 0.65 && effectiveOpticalIntensity < 0.5) {
      classification = 'SOLAR_GLARE_REJECTED';
      isBeacon = aiScore > 50;
    }

    this.confidenceSmoothed = this.confidenceSmoothed * 0.82 + aiScore * 0.18;
    this.detectionHistory.push(isBeacon);
    if (this.detectionHistory.length > 30) this.detectionHistory.shift();

    // Measurement noise covariance R dynamically scales with vibration & sensor noise
    const vibNoise = ((disturbances.satelliteVibration ?? disturbances.vibration ?? 12) + (disturbances.angularJitter ?? 10)) / 100;
    const R_noise = 1.0 + sensorNoise * 9.0 + bgNoise * 5.0 + vibNoise * 4.0;
    
    // Kalman measurement update step
    const kalmanGainX = this.P[0] / (this.P[0] + R_noise);
    const kalmanGainY = this.P[1] / (this.P[1] + R_noise);

    const measResidX = rawPixelX - this.state[0];
    const measResidY = rawPixelY - this.state[1];

    if (isBeacon) {
      this.state[0] += kalmanGainX * measResidX;
      this.state[1] += kalmanGainY * measResidY;
      this.P[0] *= (1 - kalmanGainX);
      this.P[1] *= (1 - kalmanGainY);
    }

    // Determine detection quality tier
    let detectionQuality: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'MARGINAL' | 'UNRELIABLE' = 'EXCELLENT';
    if (this.confidenceSmoothed >= 82) {
      detectionQuality = 'EXCELLENT';
    } else if (this.confidenceSmoothed >= 68) {
      detectionQuality = 'GOOD';
    } else if (this.confidenceSmoothed >= 50) {
      detectionQuality = 'DEGRADED';
    } else if (this.confidenceSmoothed >= 30) {
      detectionQuality = 'MARGINAL';
    } else {
      detectionQuality = 'UNRELIABLE';
    }

    return {
      detected: isBeacon && this.confidenceSmoothed > 28,
      confidence: parseFloat(this.confidenceSmoothed.toFixed(1)),
      filteredX: this.state[0],
      filteredY: this.state[1],
      classification,
      detectionQuality,
    };
  }

  /**
   * Kinematic Kalman Filter & Proactive Motion Prediction
   * Updates state transition F(dt) and projects future position.
   */
  public updateMotionPrediction(
    dt: number,
    currentDetectedX: number,
    currentDetectedY: number,
    isDetected: boolean,
    camera: CameraSpecs,
    disturbances: Disturbances,
    targetGeo: TargetGeometry
  ): AIPredictionResult {
    const clampedDt = Math.max(0.001, Math.min(0.1, dt));

    // Measure prediction accuracy against actual current measurement
    if (isDetected) {
      const predErr = Math.sqrt(
        (currentDetectedX - this.prevPredictedX) ** 2 + 
        (currentDetectedY - this.prevPredictedY) ** 2
      );
      this.lastPredictionErrorPx = this.lastPredictionErrorPx * 0.8 + predErr * 0.2;

      // Update velocity & acceleration estimates in state vector
      const measuredVx = (currentDetectedX - this.state[0]) / clampedDt;
      const measuredVy = (currentDetectedY - this.state[1]) / clampedDt;

      // Velocity Kalman gain
      const Kv = 0.35;
      const prevVx = this.state[2];
      const prevVy = this.state[3];

      this.state[2] += Kv * (measuredVx - this.state[2]);
      this.state[3] += Kv * (measuredVy - this.state[3]);

      // Acceleration update
      const Ka = 0.2;
      const measuredAx = (this.state[2] - prevVx) / clampedDt;
      const measuredAy = (this.state[3] - prevVy) / clampedDt;
      this.state[4] += Ka * (measuredAx - this.state[4]);
      this.state[5] += Ka * (measuredAy - this.state[5]);

      // Keep historical trend buffer
      this.historyPoints.push({ x: currentDetectedX, y: currentDetectedY, time: performance.now() / 1000 });
      if (this.historyPoints.length > 25) this.historyPoints.shift();
    } else {
      // Coasting / propagating kinematics if detection briefly dropped
      this.state[0] += this.state[2] * clampedDt + 0.5 * this.state[4] * clampedDt * clampedDt;
      this.state[1] += this.state[3] * clampedDt + 0.5 * this.state[5] * clampedDt * clampedDt;
      // Damping on unmeasured velocities
      this.state[2] *= 0.98;
      this.state[3] *= 0.98;
    }

    // Adaptive Lookahead Horizon:
    // Scales based on control delay and target velocity to cancel physical motor inertia
    const delayFactor = disturbances.controlDelay / 100;
    const speed = Math.sqrt(this.state[2] ** 2 + this.state[3] ** 2);
    const adaptiveLookahead = 0.15 + delayFactor * 0.18 + Math.min(0.12, speed * 0.002);

    // Compute Future Predicted Position:
    // X_pred = X + Vx * dt_look + 0.5 * Ax * dt_look^2
    const dtLook = adaptiveLookahead;
    const predictedX = this.state[0] + this.state[2] * dtLook + 0.5 * this.state[4] * (dtLook ** 2);
    const predictedY = this.state[1] + this.state[3] * dtLook + 0.5 * this.state[5] * (dtLook ** 2);

    this.prevPredictedX = predictedX;
    this.prevPredictedY = predictedY;

    // Disturbance & Jitter Compensation Status
    const compensationActive = ((disturbances.satelliteVibration ?? disturbances.vibration ?? 0) > 10) ||
      ((disturbances.angularJitter ?? 0) > 10) ||
      ((disturbances.pointingError ?? 0) > 15);

    // Confidence in prediction: drops if prediction error is high or target is highly erratic
    const predConf = Math.max(15, Math.min(99.5, 100 - this.lastPredictionErrorPx * 2.8));

    // Intelligent Reacquisition Sector Projection (Requirement 16 & 31):
    // When beacon is lost, predict where the beacon moved in spherical gimbal coordinates
    const effFovDegX = camera.fov / Math.max(0.1, camera.zoom);
    const effFovDegY = effFovDegX * (camera.height / camera.width);
    
    // Convert estimated pixel velocity to angular rate (deg/s)
    const velDegX = (this.state[2] / camera.width) * effFovDegX;
    const velDegY = -(this.state[3] / camera.height) * effFovDegY;

    const reacquisitionSector = {
      centerYaw: camera.yaw + velDegX * 0.8,
      centerPitch: camera.pitch + velDegY * 0.8,
      radiusDeg: Math.max(1.5, Math.min(6.0, Math.sqrt(velDegX ** 2 + velDegY ** 2) * 1.2 + 1.0)),
    };

    return {
      predictedX: Math.round(predictedX * 10) / 10,
      predictedY: Math.round(predictedY * 10) / 10,
      velocityX: parseFloat(this.state[2].toFixed(1)),
      velocityY: parseFloat(this.state[3].toFixed(1)),
      accelerationX: parseFloat(this.state[4].toFixed(1)),
      accelerationY: parseFloat(this.state[5].toFixed(1)),
      lookaheadSeconds: parseFloat(dtLook.toFixed(2)),
      predictionConfidence: parseFloat(predConf.toFixed(1)),
      predictionErrorPx: parseFloat(this.lastPredictionErrorPx.toFixed(1)),
      stateEstimate: [
        parseFloat(this.state[0].toFixed(1)),
        parseFloat(this.state[1].toFixed(1)),
        parseFloat(this.state[2].toFixed(1)),
        parseFloat(this.state[3].toFixed(1)),
      ],
      isPredicting: isDetected || this.historyPoints.length > 5,
      compensationActive,
      reacquisitionSector,
    };
  }
}
