/**
 * Simulated Computer Vision & Optical Sensor Detection Pipeline
 * Supports both Traditional Mode (Thresholding / Blob Centroid)
 * and AI-Assisted Mode (AI Perception, Glare Rejection, and Kalman Motion Prediction).
 */

import { 
  CameraSpecs, 
  Disturbances, 
  BeaconDetectionResult, 
  TargetGeometry,
  DetectionMode,
  AIPredictionResult,
  TrackingArchitecture
} from '../types';
import { AIPerceptionEngine } from './aiPerception';

export class BeaconDetector {
  private static aiEngine: AIPerceptionEngine = new AIPerceptionEngine();

  public static reset() {
    this.aiEngine.reset();
  }

  /**
   * Projects 3D target coordinates onto the 640x480 sensor plane
   * and runs detection algorithm with motion estimation.
   */
  public static detectBeacon(
    dt: number,
    targetGeo: TargetGeometry,
    camera: CameraSpecs,
    disturbances: Disturbances,
    detectionMode: DetectionMode,
    architecture: TrackingArchitecture,
    opticalIntensity: number = 1.0
  ): BeaconDetectionResult {
    // Effective field of view taking zoom into account
    const effFovDegX = camera.fov / Math.max(0.1, camera.zoom);
    const effFovDegY = effFovDegX * (camera.height / camera.width); // 480 / 640 = 0.75

    // Relative angle between camera optical boresight and target LOS
    // Camera yaw (+ is right), pitch (+ is up)
    const deltaAzDeg = targetGeo.azimuthDeg - camera.yaw;
    const deltaElDeg = targetGeo.elevationDeg - camera.pitch;

    // Convert angular offset into camera sensor normalized coordinates [-0.5, +0.5]
    const normX = deltaAzDeg / effFovDegX;
    const normY = deltaElDeg / effFovDegY;

    // Center coordinates
    const cx = camera.width / 2; // 320
    const cy = camera.height / 2; // 240

    // Ideal projection in pixels (Y axis inverted on sensor: positive elevation moves up, which is smaller pixel Y)
    const idealPixelX = cx + normX * camera.width;
    const idealPixelY = cy - normY * camera.height;

    // Apply simulated physical disturbances:
    // 1. Satellite micro-vibrations & reaction wheels jitter
    const vibLevel = (disturbances.satelliteVibration ?? disturbances.vibration ?? 12) / 100;
    const jitterLevel = (disturbances.angularJitter ?? 10) / 100;
    const sensorNoiseLevel = ((disturbances.imageNoise ?? disturbances.sensorNoise ?? 15) * 0.6 + (disturbances.gaussianNoise ?? 12) * 0.4) / 100;
    const detectionNoiseLevel = (disturbances.detectionNoise ?? 10) / 100;
    const biasLevel = (disturbances.pointingBias ?? 5) / 100;
    const pointingErrLevel = (disturbances.pointingError ?? 10) / 100;
    const motionBlurLevel = (disturbances.motionBlur ?? 10) / 100;
    const focusBlurLevel = (disturbances.focusBlur ?? 5) / 100;

    const vibrationAmp = vibLevel * 6.5;
    const jitterAmp = jitterLevel * 5.0;

    const vibNoiseX = (Math.sin(performance.now() * 0.045) + (Math.random() - 0.5) * 2) * (vibrationAmp + jitterAmp);
    const vibNoiseY = (Math.cos(performance.now() * 0.052) + (Math.random() - 0.5) * 2) * (vibrationAmp + jitterAmp);

    // Static pointing bias + attitude perturbation
    const biasOffsetPxX = (biasLevel * 14.0) + (pointingErrLevel * 10.0 * Math.sin(performance.now() * 0.003));
    const biasOffsetPxY = (biasLevel * 10.0) + (pointingErrLevel * 10.0 * Math.cos(performance.now() * 0.0025));

    const readoutJitterX = (Math.random() - 0.5) * 4.5 * (sensorNoiseLevel + detectionNoiseLevel);
    const readoutJitterY = (Math.random() - 0.5) * 4.5 * (sensorNoiseLevel + detectionNoiseLevel);

    // Directional motion blur elongation
    const motionStreakX = (targetGeo.velocityVec ? targetGeo.velocityVec[0] : 0) * motionBlurLevel * 2.5;
    const motionStreakY = (targetGeo.velocityVec ? targetGeo.velocityVec[1] : 0) * motionBlurLevel * 2.5;

    const rawPixelX = idealPixelX + vibNoiseX + biasOffsetPxX + readoutJitterX + motionStreakX;
    const rawPixelY = idealPixelY + vibNoiseY + biasOffsetPxY + readoutJitterY + motionStreakY;

    // Check if the beacon is physically within sensor bounds (with 8px margin)
    const margin = 8;
    const isInFov = (
      idealPixelX >= -margin &&
      idealPixelX <= camera.width + margin &&
      idealPixelY >= -margin &&
      idealPixelY <= camera.height + margin
    );

    // Optical blur / spot size: sharpest at focus = 1.0 (Airy disc diameter ~ 6-8 px)
    const defocusFactor = Math.abs(1.0 - camera.focus) + focusBlurLevel * 0.8;
    const apparentSizeScale = Math.max(0.3, (disturbances.beaconApparentSize ?? 50) / 50);
    const spotSize = Math.max(5, (7 + defocusFactor * 22) * apparentSizeScale);

    // Generate simulated distractor celestial/debris objects
    const distractorDensity = (disturbances.otherBrightObjects ?? 15) / 100;
    const distractorCount = Math.floor(distractorDensity * 6);
    const distractorPositions: { x: number; y: number; brightness: number; isTrueBeacon: boolean }[] = [];

    if (distractorCount > 0) {
      for (let i = 0; i < distractorCount; i++) {
        // Deterministic pseudo-random orbital sweep for distractors
        const angle = (i * 1.618) + (performance.now() * 0.0003 * (i + 1));
        const rad = 70 + (i * 45);
        const dx = cx + rad * Math.cos(angle);
        const dy = cy + rad * Math.sin(angle) * 0.75;
        if (dx >= 10 && dx <= camera.width - 10 && dy >= 10 && dy <= camera.height - 10) {
          distractorPositions.push({
            x: dx,
            y: dy,
            brightness: 120 + (i * 25) % 100,
            isTrueBeacon: false,
          });
        }
      }
    }

    let detected = false;
    let confidence = 0;
    let detectedX = cx;
    let detectedY = cy;
    let filteredX = cx;
    let filteredY = cy;
    let detectionQuality: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'MARGINAL' | 'UNRELIABLE' = 'EXCELLENT';

    if (architecture === 'AI_ASSISTED') {
      // AI Perception & Learned Classification (Rejects distractors & glare using kinematic consistency)
      const aiResult = this.aiEngine.detectAndClassify(
        rawPixelX,
        rawPixelY,
        camera,
        disturbances,
        opticalIntensity,
        isInFov
      );
      detected = aiResult.detected;
      confidence = aiResult.confidence;
      filteredX = aiResult.filteredX;
      filteredY = aiResult.filteredY;
      detectedX = filteredX;
      detectedY = filteredY;
      detectionQuality = aiResult.detectionQuality;
    } else {
      // Traditional PAT: Simple Brightness Threshold & Blob Centroid
      // Susceptible to distractors and raw sensor jitter
      const bgNoiseLevel = ((disturbances.backgroundStarNoise ?? disturbances.backgroundNoise ?? 15) + (disturbances.backgroundLight ?? 12)) / 200;
      if (isInFov) {
        const peakSignal = 220 * opticalIntensity * (1 - defocusFactor * 0.3);
        const threshold = 85 + bgNoiseLevel * 90;
        
        // If distractor is present and bright, Traditional mode gets distracted!
        let chosenX = rawPixelX;
        let chosenY = rawPixelY;
        let isDistracted = false;

        if (distractorPositions.length > 0 && Math.random() < distractorDensity * 0.7) {
          const nearestDistractor = distractorPositions[0];
          chosenX = nearestDistractor.x + (Math.random() - 0.5) * 3;
          chosenY = nearestDistractor.y + (Math.random() - 0.5) * 3;
          isDistracted = true;
        }

        detected = peakSignal > threshold;
        confidence = detected
          ? Math.max(15, Math.min(92, 88 - bgNoiseLevel * 35 - sensorNoiseLevel * 30 - (isDistracted ? 40 : 0)))
          : 0;

        detectedX = chosenX;
        detectedY = chosenY;
        filteredX = chosenX; // Traditional has no Kalman filter
        filteredY = chosenY;

        if (confidence > 75) detectionQuality = 'GOOD';
        else if (confidence > 50) detectionQuality = 'DEGRADED';
        else if (confidence > 25) detectionQuality = 'MARGINAL';
        else detectionQuality = 'UNRELIABLE';
      } else {
        detected = false;
        confidence = 0;
        detectionQuality = 'UNRELIABLE';
      }
    }

    // Run AI Motion Prediction Engine
    const aiPrediction: AIPredictionResult = this.aiEngine.updateMotionPrediction(
      dt,
      detectedX,
      detectedY,
      detected,
      camera,
      disturbances,
      targetGeo
    );

    // Active disturbance tags for diagnostic telemetry
    const activeDisturbances: string[] = [];
    if (vibLevel > 0.25) activeDisturbances.push('Platform Vibration');
    if (jitterLevel > 0.25) activeDisturbances.push('Reaction Wheel Jitter');
    if (sensorNoiseLevel > 0.3) activeDisturbances.push('High Sensor Noise');
    if (defocusFactor > 0.2) activeDisturbances.push('Optical Defocus');
    if (motionBlurLevel > 0.3) activeDisturbances.push('Motion Blur');
    if (distractorCount > 1) activeDisturbances.push('Distractors Present');
    if ((disturbances.strayLightSunlight ?? 0) > 30) activeDisturbances.push('Solar Glare');
    if ((disturbances.atmosphericTurbulence ?? 0) > 20) activeDisturbances.push('Turbulence');

    // Pixel error from camera image center (320, 240)
    const errorX = detected ? Math.round(detectedX - cx) : 0;
    const errorY = detected ? Math.round(detectedY - cy) : 0;

    // Angular error conversion:
    // In a 2-stage FSOC PAT terminal, the Coarse Acquisition Camera (5°-10° FOV)
    // feeds into a high-magnification Fine Tracking Sensor (FTS) / Fast Steering Mirror (FSM)
    // optical stage (~1.25 µrad/pixel fine tracking resolution).
    // This allows sub-arcsecond / microradian-level laser line-of-sight stabilization,
    // where the 12-16px tracking lock ring maps directly to the ~15 µrad beam divergence footprint.
    const fineTrackingScaleUradPerPx = 1.25 / Math.max(0.2, camera.zoom);

    const angularErrorX = detected ? (errorX * fineTrackingScaleUradPerPx) : 0;
    const angularErrorY = detected ? (-errorY * fineTrackingScaleUradPerPx) : 0;
    const totalAngularError = detected ? Math.sqrt(angularErrorX * angularErrorX + angularErrorY * angularErrorY) : 9999;

    // Simulated raw peak intensity & SNR
    const rawIntensity = detected ? Math.min(255, Math.round(230 * opticalIntensity * (1 - defocusFactor * 0.3))) : 20;
    const snrEstimate = detected ? Math.max(2, 22 * (confidence / 100) - (disturbances.backgroundNoise / 100) * 10) : 0;

    return {
      detected,
      confidence: parseFloat(confidence.toFixed(1)),
      x: detected ? parseFloat(detectedX.toFixed(1)) : cx,
      y: detected ? parseFloat(detectedY.toFixed(1)) : cy,
      rawX: parseFloat(rawPixelX.toFixed(1)),
      rawY: parseFloat(rawPixelY.toFixed(1)),
      filteredX: parseFloat(filteredX.toFixed(1)),
      filteredY: parseFloat(filteredY.toFixed(1)),
      size: parseFloat(spotSize.toFixed(1)),
      errorX,
      errorY,
      angularErrorX: parseFloat(angularErrorX.toFixed(2)),
      angularErrorY: parseFloat(angularErrorY.toFixed(2)),
      totalAngularError: parseFloat(totalAngularError.toFixed(2)),
      rawIntensity,
      snrEstimate: parseFloat(snrEstimate.toFixed(1)),
      isInFov,
      detectionQuality,
      distractorCount,
      activeDisturbances,
      distractorPositions,
      aiPrediction,
    };
  }
}
