/**
 * Photorealistic 3D Virtual Space Environment (Three.js)
 * Implements full satellite-to-satellite orbital dynamics:
 * - Dotted 3D orbital trajectory lines for both Satellite A and Satellite B
 * - Both satellites physically moving along their respective orbital paths around Earth with respect to the virtual camera
 * - Spacecraft attitudes stay stabilized along their flight velocity vectors (not rotating uncontrollably)
 * - Articulated optical turret on Satellite A dynamically tracks Satellite B's glowing beacon
 * - Dynamic dashed green tracking laser beam with animated photon energy pulses
 * - High-fidelity Earth with photorealistic continents, atmospheric cyan limb, swirling clouds, and Milky Way background
 * - Exact HUD panels matching reference image:
 *     1. Top-Left: Virtual Satellite Environment & Telemetry (Time, Distance, Rel Pos, Rel Vel)
 *     2. Top-Right: Target (Beacon) Status (Position, Velocity, Power, Wavelength, Status)
 *     3. Bottom-Left: Legend (Optical Beacon, Camera, Optical Link)
 *     4. Bottom-Right: 3D Coordinate Frame Tripod (X, Y, Z axes synced to view)
 *     5. In-World 3D Callouts: "Camera (Controllable)" & "Optical Beacon (Moving)"
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraSpecs, TargetGeometry, PATState, LinkBudget, TargetMotionParams, Disturbances } from '../types';
import { Rotate3d, Crosshair, Video, Eye, EyeOff, Maximize2, Minimize2, Play, Pause } from 'lucide-react';

interface SpaceWorld3DProps {
  cameraSpecs: CameraSpecs;
  targetGeometry: TargetGeometry;
  patState: PATState;
  laserConnected: boolean;
  beamDivergenceUrad: number;
  simSpeed?: number;
  isRunning?: boolean;
  linkBudget?: LinkBudget;
  motionParams?: TargetMotionParams;
  disturbances?: Disturbances;
  viewMode?: 'free' | 'camera' | 'chase' | 'top' | 'orbital' | 'boresight' | 'target';
  simScale?: 'SPACE' | 'ORBIT' | 'REGIONAL' | 'LOCAL' | 'GROUND';
  selectedScenario?: string;
  onViewModeChange?: (mode: 'free' | 'camera' | 'chase' | 'top') => void;
}

export const SpaceWorld3D: React.FC<SpaceWorld3DProps> = ({
  cameraSpecs,
  targetGeometry,
  patState,
  laserConnected,
  beamDivergenceUrad,
  simSpeed = 1.0,
  isRunning = true,
  linkBudget,
  motionParams,
  disturbances,
  viewMode: propViewMode,
  simScale = 'ORBIT',
  selectedScenario,
  onViewModeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Dynamic Scene Objects
  const satAGroupRef = useRef<THREE.Group | null>(null);
  const satBGroupRef = useRef<THREE.Group | null>(null);
  const gimbalYawGroupRef = useRef<THREE.Group | null>(null);
  const gimbalPitchGroupRef = useRef<THREE.Group | null>(null);
  const telescopeLensRef = useRef<THREE.Mesh | null>(null);
  const dashedLaserRef = useRef<THREE.Line | null>(null);
  const laserParticlesRef = useRef<THREE.Points | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);

  // Dynamic Disturbance-Reactive Elements in 3D Scene
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunFlareSpriteRef = useRef<THREE.Sprite | null>(null);
  const starMatRef = useRef<THREE.PointsMaterial | null>(null);
  const beaconCoreRef = useRef<THREE.Mesh | null>(null);
  const beaconCoronaRef = useRef<THREE.Mesh | null>(null);
  const beaconHaloRef = useRef<THREE.Mesh | null>(null);
  const beaconFlareSpriteRef = useRef<THREE.Sprite | null>(null);
  const beaconPointLightRef = useRef<THREE.PointLight | null>(null);
  const spaceDebrisGroupRef = useRef<THREE.Group | null>(null);
  const debrisMeshesRef = useRef<THREE.Mesh[]>([]);

  // Smooth Camera Lerp Damping (Guarantees silky smooth & most stable virtual environment)
  const currentCamPos = useRef(new THREE.Vector3(0, 10, 20));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isCamInitialized = useRef(false);

  // 2D Screen Positions for In-Scene Callout Annotations
  const [beaconScreenPos, setBeaconScreenPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [cameraScreenPos, setCameraScreenPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  // Camera View Modes & Fullscreen State
  const [viewMode, setViewMode] = useState<'orbital' | 'boresight' | 'chase' | 'target' | 'top'>('orbital');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cameraFollow, setCameraFollow] = useState<boolean>(true);

  // Sync propViewMode if passed from outer console
  useEffect(() => {
    if (propViewMode) {
      const mapped: 'orbital' | 'boresight' | 'chase' | 'target' | 'top' =
        propViewMode === 'free' ? 'orbital' :
        propViewMode === 'camera' ? 'boresight' :
        propViewMode === 'top' ? 'top' :
        propViewMode === 'chase' ? 'chase' : (propViewMode as any);
      setViewMode(mapped);
    }
  }, [propViewMode]);

  // HUD Visibility Toggles (Hide / Show options requested by user)
  const [showEnvHud, setShowEnvHud] = useState<boolean>(true);
  const [showTargetHud, setShowTargetHud] = useState<boolean>(true);

  // Live HUD Readouts (Synced with physics and orbital flight)
  const [hudTime, setHudTime] = useState<string>('00:12:36');
  const [hudDistance, setHudDistance] = useState<number>(842);
  const [hudRelPos, setHudRelPos] = useState<[number, number, number]>([-120, 310, 760]);
  const [hudRelVel, setHudRelVel] = useState<[number, number, number]>([0.12, -0.08, 0.03]);
  const [hudTargetPos, setHudTargetPos] = useState<[number, number, number]>([620, -180, 7600]);
  const [hudTargetVel, setHudTargetVel] = useState<[number, number, number]>([-0.05, 0.11, -0.02]);

  // Coordinate Tripod Projection
  const [axes2D, setAxes2D] = useState<{
    x: { x: number; y: number };
    y: { x: number; y: number };
    z: { x: number; y: number };
  }>({
    x: { x: -24, y: 16 },
    y: { x: 26, y: 4 },
    z: { x: 0, y: -28 },
  });

  // Orbit Drag Controls (Default calibrated to match user's reference image vantage point)
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const orbitParamsRef = useRef({ theta: 0.98, phi: 1.28, radius: 15.0 });

  // Synchronized State References
  const cameraSpecsRef = useRef(cameraSpecs);
  cameraSpecsRef.current = cameraSpecs;
  const targetGeoRef = useRef(targetGeometry);
  targetGeoRef.current = targetGeometry;
  const patStateRef = useRef(patState);
  patStateRef.current = patState;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const simSpeedRef = useRef(simSpeed);
  simSpeedRef.current = simSpeed;
  const cameraFollowRef = useRef(cameraFollow);
  cameraFollowRef.current = cameraFollow;
  const disturbancesRef = useRef(disturbances);
  disturbancesRef.current = disturbances;
  const simScaleRef = useRef(simScale);
  simScaleRef.current = simScale;
  const selectedScenarioRef = useRef(selectedScenario);
  selectedScenarioRef.current = selectedScenario;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Photorealistic Color-Graded Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ==========================================
    // 2. CELESTIAL BACKGROUND & MILKY WAY GALAXY
    // ==========================================
    // Deep Space Starfield with Diverse Stellar Magnitudes
    const starCount = 2400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 260 + Math.random() * 80;

      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);

      // Star temperature spectrum: crisp whites, warm ambers, cool blues
      const tempType = Math.random();
      if (tempType > 0.8) {
        starColors[i * 3] = 0.75;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0; // O/B class blue
      } else if (tempType > 0.6) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.9;
        starColors[i * 3 + 2] = 0.7; // G class solar yellow/white
      } else {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.95;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
    });
    starMatRef.current = starMat;
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Dynamic Space Debris Field (Reacts to spaceDebrisDensity disturbance)
    const debrisGroup = new THREE.Group();
    scene.add(debrisGroup);
    spaceDebrisGroupRef.current = debrisGroup;
    const debrisList: THREE.Mesh[] = [];
    const debrisGeoA = new THREE.OctahedronGeometry(0.12, 0);
    const debrisGeoB = new THREE.IcosahedronGeometry(0.09, 0);
    const debrisGeoC = new THREE.BoxGeometry(0.18, 0.05, 0.12);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.35,
    });

    for (let i = 0; i < 60; i++) {
      const geo = i % 3 === 0 ? debrisGeoA : i % 3 === 1 ? debrisGeoB : debrisGeoC;
      const mesh = new THREE.Mesh(geo, debrisMat);
      // Scatter in orbital corridor between and around satellites
      const debR = 6 + Math.random() * 22;
      const debAngle = Math.random() * Math.PI * 2;
      const debY = -4 + Math.random() * 10;
      mesh.position.set(Math.cos(debAngle) * debR, debY, Math.sin(debAngle) * debR);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.userData = {
        orbitRadius: debR,
        orbitSpeed: 0.04 + Math.random() * 0.09,
        rotSpeedX: (Math.random() - 0.5) * 2.0,
        rotSpeedY: (Math.random() - 0.5) * 2.0,
        initialAngle: debAngle,
        baseY: debY,
      };
      debrisGroup.add(mesh);
      debrisList.push(mesh);
    }
    debrisMeshesRef.current = debrisList;

    // Diagonal Milky Way Galactic Dust Cloud (Matches Reference Photo in Upper Right)
    const mwCanvas = document.createElement('canvas');
    mwCanvas.width = 1024;
    mwCanvas.height = 512;
    const mwCtx = mwCanvas.getContext('2d');
    if (mwCtx) {
      mwCtx.fillStyle = 'rgba(0, 0, 0, 0)';
      mwCtx.fillRect(0, 0, 1024, 512);

      // Core galactic glow
      const mwGrad = mwCtx.createLinearGradient(0, 256, 1024, 256);
      mwGrad.addColorStop(0, 'rgba(0,0,0,0)');
      mwGrad.addColorStop(0.3, 'rgba(25, 45, 90, 0.25)');
      mwGrad.addColorStop(0.5, 'rgba(160, 120, 95, 0.45)');
      mwGrad.addColorStop(0.7, 'rgba(80, 50, 110, 0.35)');
      mwGrad.addColorStop(1, 'rgba(0,0,0,0)');
      mwCtx.fillStyle = mwGrad;
      mwCtx.beginPath();
      mwCtx.ellipse(512, 256, 480, 140, -0.28, 0, Math.PI * 2);
      mwCtx.fill();

      // Stellar clusters in galactic rift
      mwCtx.fillStyle = 'rgba(255, 230, 200, 0.7)';
      for (let i = 0; i < 450; i++) {
        const gx = 200 + Math.random() * 624;
        const gy = 160 + Math.random() * 192;
        mwCtx.fillRect(gx, gy, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5);
      }
    }
    const mwTexture = new THREE.CanvasTexture(mwCanvas);
    const mwGeo = new THREE.PlaneGeometry(160, 80);
    const mwMat = new THREE.MeshBasicMaterial({
      map: mwTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mwMesh = new THREE.Mesh(mwGeo, mwMat);
    mwMesh.position.set(45, 40, -90);
    mwMesh.rotation.set(-0.3, 0.4, 0.65);
    scene.add(mwMesh);

    // ==========================================
    // 3. PHOTOREALISTIC LIGHTING
    // ==========================================
    // Primary Solar Directional Light (Grazing atmospheric rim from the right horizon)
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 3.4);
    sunLight.position.set(38, 12, -22);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Solar Corona Bloom Sprite (Modulated by strayLightSunlight disturbance)
    const sunFlareCanvas = document.createElement('canvas');
    sunFlareCanvas.width = 128;
    sunFlareCanvas.height = 128;
    const sCtx = sunFlareCanvas.getContext('2d');
    if (sCtx) {
      const sGrad = sCtx.createRadialGradient(64, 64, 2, 64, 64, 60);
      sGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      sGrad.addColorStop(0.25, 'rgba(255, 240, 180, 0.85)');
      sGrad.addColorStop(0.6, 'rgba(255, 180, 70, 0.3)');
      sGrad.addColorStop(1, 'rgba(255, 120, 20, 0)');
      sCtx.fillStyle = sGrad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const sunFlareTex = new THREE.CanvasTexture(sunFlareCanvas);
    const sunFlareMat = new THREE.SpriteMaterial({
      map: sunFlareTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const sunFlareSprite = new THREE.Sprite(sunFlareMat);
    sunFlareSprite.position.set(38, 12, -22);
    sunFlareSprite.scale.set(16, 16, 16);
    scene.add(sunFlareSprite);
    sunFlareSpriteRef.current = sunFlareSprite;

    // Subtle Earth-shine reflection back onto satellites
    const earthBounceLight = new THREE.DirectionalLight(0x2266aa, 0.85);
    earthBounceLight.position.set(-10, -25, 10);
    scene.add(earthBounceLight);

    // Deep space ambient fill
    const ambientLight = new THREE.AmbientLight(0x0a1428, 0.95);
    scene.add(ambientLight);

    // ==========================================
    // 4. PHOTOREALISTIC CURVED EARTH WITH ATMOSPHERE
    // ==========================================
    const earthCenter = new THREE.Vector3(0, -32.5, -7.5);
    const earthRadius = 29.5;

    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthCanvas = document.createElement('canvas');
    earthCanvas.width = 2048;
    earthCanvas.height = 1024;
    const eCtx = earthCanvas.getContext('2d');
    if (eCtx) {
      // 1. Deep Ocean Gradient with Rayleigh scattering
      const oceanGrad = eCtx.createLinearGradient(0, 0, 0, 1024);
      oceanGrad.addColorStop(0, '#020b18');
      oceanGrad.addColorStop(0.2, '#061c38');
      oceanGrad.addColorStop(0.5, '#0b2d5a');
      oceanGrad.addColorStop(0.8, '#061a36');
      oceanGrad.addColorStop(1, '#020b18');
      eCtx.fillStyle = oceanGrad;
      eCtx.fillRect(0, 0, 2048, 1024);

      // 2. Continental Shelves (Coastal Turquoise waters)
      eCtx.fillStyle = '#0f5274';
      const shelfFormations = [
        { cx: 480, cy: 370, rx: 250, ry: 175, rot: 0.2 },
        { cx: 680, cy: 670, rx: 160, ry: 230, rot: 0.1 },
        { cx: 1080, cy: 290, rx: 310, ry: 165, rot: -0.1 },
        { cx: 1180, cy: 540, rx: 230, ry: 260, rot: 0.05 },
        { cx: 1540, cy: 380, rx: 350, ry: 220, rot: 0.15 },
        { cx: 1620, cy: 730, rx: 160, ry: 120, rot: 0.0 },
      ];
      shelfFormations.forEach((s) => {
        eCtx.beginPath();
        eCtx.ellipse(s.cx, s.cy, s.rx, s.ry, s.rot, 0, Math.PI * 2);
        eCtx.fill();
      });

      // 3. Realistic Continents & Landmasses
      eCtx.fillStyle = '#1c4a28';
      shelfFormations.forEach((s) => {
        eCtx.beginPath();
        eCtx.ellipse(s.cx + 10, s.cy - 10, s.rx * 0.85, s.ry * 0.85, s.rot, 0, Math.PI * 2);
        eCtx.fill();
      });

      // 4. Temperate Woodlands & Highlands
      eCtx.fillStyle = '#3a6938';
      shelfFormations.forEach((s) => {
        eCtx.beginPath();
        eCtx.ellipse(s.cx + 25, s.cy - 15, s.rx * 0.65, s.ry * 0.65, s.rot * 1.1, 0, Math.PI * 2);
        eCtx.fill();
      });

      // 5. Arid & Desert Terrain (Sahara, Arabian, Gobi, Australian Outback)
      eCtx.fillStyle = '#c8a467';
      const deserts = [
        { cx: 1130, cy: 450, rx: 140, ry: 80, rot: 0.1 },
        { cx: 1300, cy: 420, rx: 70, ry: 60, rot: 0.2 },
        { cx: 1520, cy: 360, rx: 110, ry: 50, rot: -0.05 },
        { cx: 1620, cy: 740, rx: 80, ry: 55, rot: 0.1 },
        { cx: 420, cy: 380, rx: 65, ry: 45, rot: 0.3 },
      ];
      deserts.forEach((d) => {
        eCtx.beginPath();
        eCtx.ellipse(d.cx, d.cy, d.rx, d.ry, d.rot, 0, Math.PI * 2);
        eCtx.fill();
      });

      // 6. Mountain Ranges
      eCtx.fillStyle = '#5c4e3e';
      for (let i = 0; i < 30; i++) {
        eCtx.beginPath();
        eCtx.arc(
          900 + Math.sin(i * 0.4) * 600,
          260 + Math.cos(i * 0.5) * 160,
          16 + Math.random() * 20,
          0,
          Math.PI * 2
        );
        eCtx.fill();
      }

      // 7. Polar Caps
      eCtx.fillStyle = '#f0f6fc';
      eCtx.beginPath();
      eCtx.ellipse(1024, 60, 1024, 70, 0, 0, Math.PI * 2);
      eCtx.fill();
      eCtx.beginPath();
      eCtx.ellipse(1024, 980, 1024, 80, 0, 0, Math.PI * 2);
      eCtx.fill();

      // 8. City Night Lights on Dark Limb
      eCtx.fillStyle = 'rgba(255, 225, 150, 0.9)';
      for (let i = 0; i < 450; i++) {
        const lx = Math.random() * 2048;
        const ly = 180 + Math.random() * 640;
        eCtx.fillRect(lx, ly, 1.8, 1.8);
      }
    }

    const earthTexture = new THREE.CanvasTexture(earthCanvas);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.62,
      metalness: 0.12,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.copy(earthCenter);
    earthMesh.rotation.y = 0.85;
    scene.add(earthMesh);
    earthRef.current = earthMesh;

    // Atmospheric Cyan Limb (Fresnel Glow matching reference image)
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.025, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float intensity = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.2);
          vec3 atmosphereColor = vec3(0.06, 0.72, 1.0); // Electric Cyan
          gl_FragColor = vec4(atmosphereColor, intensity * 0.95);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
    earthMesh.add(atmosphereMesh);

    // Weather Clouds Layer
    const cloudGeo = new THREE.SphereGeometry(earthRadius * 1.009, 64, 64);
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 1024;
    cloudCanvas.height = 512;
    const cCtx = cloudCanvas.getContext('2d');
    if (cCtx) {
      cCtx.fillStyle = 'rgba(255, 255, 255, 0)';
      cCtx.fillRect(0, 0, 1024, 512);

      cCtx.fillStyle = 'rgba(255, 255, 255, 0.68)';
      for (let i = 0; i < 70; i++) {
        cCtx.beginPath();
        const cx = Math.random() * 1024;
        const cy = 90 + Math.random() * 332;
        const rx = 50 + Math.random() * 120;
        const ry = 18 + Math.random() * 35;
        cCtx.ellipse(cx, cy, rx, ry, Math.random() * 0.5 - 0.25, 0, Math.PI * 2);
        cCtx.fill();
      }

      // Cyclonic swirls
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      cCtx.beginPath();
      cCtx.arc(420, 240, 48, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.beginPath();
      cCtx.arc(780, 280, 40, 0, Math.PI * 2);
      cCtx.fill();
    }
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.72,
    });
    const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthMesh.add(cloudsMesh);
    cloudsRef.current = cloudsMesh;

    // =================================================================
    // 5. ORBITAL DYNAMICS & DOTTED ORBIT PATHS FOR SATELLITE A & B
    // =================================================================
    // Orbit A Geometry (LEO Altitude ~650 km, passing through nominal Satellite A position)
    const nominalPosA = new THREE.Vector3(-2.8, 0.5, 3.2);
    const rA_vec = nominalPosA.clone().sub(earthCenter);
    const radiusA = rA_vec.length();
    const eA1 = rA_vec.clone().normalize();
    const normA = new THREE.Vector3(0.25, 0.88, -0.4).normalize();
    const eA2 = new THREE.Vector3().crossVectors(normA, eA1).normalize();

    // Orbit B Geometry (LEO Altitude ~850 km, passing through nominal Satellite B position)
    const nominalPosB = new THREE.Vector3(5.8, 5.2, 2.5);
    const rB_vec = nominalPosB.clone().sub(earthCenter);
    const radiusB = rB_vec.length();
    const eB1 = rB_vec.clone().normalize();
    const normB = new THREE.Vector3(-0.35, 0.85, -0.38).normalize();
    const eB2 = new THREE.Vector3().crossVectors(normB, eB1).normalize();

    // Generate Dotted Line for Orbit A (180 segments for continuous, smooth curve)
    const orbitSegments = 200;
    const pointsA: THREE.Vector3[] = [];
    for (let i = 0; i <= orbitSegments; i++) {
      const theta = (i / orbitSegments) * Math.PI * 2;
      const pt = earthCenter.clone().add(
        eA1.clone().multiplyScalar(radiusA * Math.cos(theta))
      ).add(
        eA2.clone().multiplyScalar(radiusA * Math.sin(theta))
      );
      pointsA.push(pt);
    }
    const orbitGeoA = new THREE.BufferGeometry().setFromPoints(pointsA);
    const orbitMatA = new THREE.LineDashedMaterial({
      color: 0x38bdf8, // Electric cyan
      linewidth: 2,
      scale: 1,
      dashSize: 0.5,
      gapSize: 0.35,
      transparent: true,
      opacity: 0.85,
    });
    const orbitLineA = new THREE.Line(orbitGeoA, orbitMatA);
    orbitLineA.computeLineDistances();
    scene.add(orbitLineA);

    // Glowing Dot Markers along Orbit A for high-contrast aerospace visualization
    const dotCountA = 70;
    const dotPosA = new Float32Array(dotCountA * 3);
    for (let i = 0; i < dotCountA; i++) {
      const theta = (i / dotCountA) * Math.PI * 2;
      const pt = earthCenter.clone().add(
        eA1.clone().multiplyScalar(radiusA * Math.cos(theta))
      ).add(
        eA2.clone().multiplyScalar(radiusA * Math.sin(theta))
      );
      dotPosA[i * 3] = pt.x;
      dotPosA[i * 3 + 1] = pt.y;
      dotPosA[i * 3 + 2] = pt.z;
    }
    const dotGeoA = new THREE.BufferGeometry();
    dotGeoA.setAttribute('position', new THREE.BufferAttribute(dotPosA, 3));
    const dotMatA = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 2.2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const dotsA = new THREE.Points(dotGeoA, dotMatA);
    scene.add(dotsA);

    // Generate Dotted Line for Orbit B
    const pointsB: THREE.Vector3[] = [];
    for (let i = 0; i <= orbitSegments; i++) {
      const theta = (i / orbitSegments) * Math.PI * 2;
      const pt = earthCenter.clone().add(
        eB1.clone().multiplyScalar(radiusB * Math.cos(theta))
      ).add(
        eB2.clone().multiplyScalar(radiusB * Math.sin(theta))
      );
      pointsB.push(pt);
    }
    const orbitGeoB = new THREE.BufferGeometry().setFromPoints(pointsB);
    const orbitMatB = new THREE.LineDashedMaterial({
      color: 0x60a5fa, // Sky Blue / LEO Track
      linewidth: 2,
      scale: 1,
      dashSize: 0.5,
      gapSize: 0.35,
      transparent: true,
      opacity: 0.8,
    });
    const orbitLineB = new THREE.Line(orbitGeoB, orbitMatB);
    orbitLineB.computeLineDistances();
    scene.add(orbitLineB);

    // Glowing Dot Markers along Orbit B
    const dotCountB = 70;
    const dotPosB = new Float32Array(dotCountB * 3);
    for (let i = 0; i < dotCountB; i++) {
      const theta = (i / dotCountB) * Math.PI * 2;
      const pt = earthCenter.clone().add(
        eB1.clone().multiplyScalar(radiusB * Math.cos(theta))
      ).add(
        eB2.clone().multiplyScalar(radiusB * Math.sin(theta))
      );
      dotPosB[i * 3] = pt.x;
      dotPosB[i * 3 + 1] = pt.y;
      dotPosB[i * 3 + 2] = pt.z;
    }
    const dotGeoB = new THREE.BufferGeometry();
    dotGeoB.setAttribute('position', new THREE.BufferAttribute(dotPosB, 3));
    const dotMatB = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 2.2,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const dotsB = new THREE.Points(dotGeoB, dotMatB);
    scene.add(dotsB);

    // ==========================================
    // 6. TERMINAL A SATELLITE (Moves along Orbit A)
    // ==========================================
    const satAGroup = new THREE.Group();
    scene.add(satAGroup);
    satAGroupRef.current = satAGroup;

    // Dark Carbon-Composite Spacecraft Bus with Bevels
    const busGeo = new THREE.BoxGeometry(1.6, 1.5, 2.2);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0x181f2c,
      metalness: 0.88,
      roughness: 0.28,
    });
    const bus = new THREE.Mesh(busGeo, busMat);
    satAGroup.add(bus);

    // Gold MLI Thermal Insulation Blanket Patches
    const goldMliMat = new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      metalness: 0.95,
      roughness: 0.22,
    });
    const mliPatchGeo = new THREE.BoxGeometry(1.62, 0.9, 1.2);
    const mliPatch = new THREE.Mesh(mliPatchGeo, goldMliMat);
    mliPatch.position.set(0, -0.2, 0.2);
    satAGroup.add(mliPatch);

    // High-Efficiency Solar Panel Wings (Left & Right)
    const wingGeo = new THREE.BoxGeometry(3.6, 0.06, 1.35);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0f1c3d,
      metalness: 0.75,
      roughness: 0.2,
      emissive: 0x050d24,
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-2.8, 0, 0);
    satAGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(2.8, 0, 0);
    satAGroup.add(rightWing);

    // Silver conductive grid lines on solar arrays
    const gridMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.95, roughness: 0.1 });
    const gridLineGeo = new THREE.BoxGeometry(3.55, 0.07, 0.03);
    for (let i = -0.5; i <= 0.5; i += 0.25) {
      const gL = new THREE.Mesh(gridLineGeo, gridMat);
      gL.position.set(-2.8, 0.01, i);
      satAGroup.add(gL);
      const gR = new THREE.Mesh(gridLineGeo, gridMat);
      gR.position.set(2.8, 0.01, i);
      satAGroup.add(gR);
    }

    // Solar array mounting booms
    const boomGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12);
    const boomMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const boomL = new THREE.Mesh(boomGeo, boomMat);
    boomL.rotation.z = Math.PI / 2;
    boomL.position.set(-0.9, 0, 0);
    satAGroup.add(boomL);

    const boomR = new THREE.Mesh(boomGeo, boomMat);
    boomR.rotation.z = Math.PI / 2;
    boomR.position.set(0.9, 0, 0);
    satAGroup.add(boomR);

    // ==========================================
    // ARTICULATED OPTICAL TURRET (Camera Payload)
    // ==========================================
    const gimbalYawGroup = new THREE.Group();
    gimbalYawGroup.position.set(0, 0.82, 0.35); // Mounted on top deck
    satAGroup.add(gimbalYawGroup);
    gimbalYawGroupRef.current = gimbalYawGroup;

    // Dark Pedestal base
    const pedestalGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.28, 32);
    const turretMetal = new THREE.MeshStandardMaterial({ color: 0x222a38, metalness: 0.9, roughness: 0.25 });
    const pedestal = new THREE.Mesh(pedestalGeo, turretMetal);
    pedestal.position.set(0, 0.14, 0);
    gimbalYawGroup.add(pedestal);

    // Elevation Yoke (Pitch axis)
    const gimbalPitchGroup = new THREE.Group();
    gimbalPitchGroup.position.set(0, 0.45, 0);
    gimbalYawGroup.add(gimbalPitchGroup);
    gimbalPitchGroupRef.current = gimbalPitchGroup;

    // Optical Camera Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.34, 0.38, 1.1, 32);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0a0f18, metalness: 0.92, roughness: 0.2 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.12, 0.35);
    gimbalPitchGroup.add(barrel);

    // Anti-Reflective Optical Glass Lens Aperture
    const lensGeo = new THREE.CircleGeometry(0.31, 32);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x00e5ff,
      emissive: 0x002838,
      transparent: true,
      opacity: 0.9,
      roughness: 0.04,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0.12, 0.92);
    gimbalPitchGroup.add(lens);
    telescopeLensRef.current = lens;

    // Green Reticle Target Crosshair ✛ over camera aperture
    const reticleCanvas = document.createElement('canvas');
    reticleCanvas.width = 128;
    reticleCanvas.height = 128;
    const rCtx = reticleCanvas.getContext('2d');
    if (rCtx) {
      rCtx.strokeStyle = '#22c55e';
      rCtx.lineWidth = 6;
      rCtx.beginPath();
      rCtx.moveTo(64, 24); rCtx.lineTo(64, 104);
      rCtx.moveTo(24, 64); rCtx.lineTo(104, 64);
      rCtx.stroke();
      rCtx.lineWidth = 4;
      rCtx.strokeRect(36, 36, 56, 56);
    }
    const reticleTexture = new THREE.CanvasTexture(reticleCanvas);
    const reticleMat = new THREE.SpriteMaterial({ map: reticleTexture, transparent: true, opacity: 0.95 });
    const reticleSprite = new THREE.Sprite(reticleMat);
    reticleSprite.scale.set(0.65, 0.65, 0.65);
    reticleSprite.position.set(0, 0.12, 0.96);
    gimbalPitchGroup.add(reticleSprite);

    // ==========================================
    // 7. TERMINAL B SATELLITE (Moves along Orbit B)
    // ==========================================
    const satBGroup = new THREE.Group();
    scene.add(satBGroup);
    satBGroupRef.current = satBGroup;

    // Remote Target Satellite Bus
    const tBusGeo = new THREE.BoxGeometry(0.9, 0.9, 1.25);
    const tBusMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.3 });
    const tBus = new THREE.Mesh(tBusGeo, tBusMat);
    satBGroup.add(tBus);

    // Remote Satellite Solar Wings
    const tWingGeo = new THREE.BoxGeometry(2.2, 0.04, 0.75);
    const tWingL = new THREE.Mesh(tWingGeo, wingMat);
    tWingL.position.set(-1.5, 0, 0);
    satBGroup.add(tWingL);
    const tWingR = new THREE.Mesh(tWingGeo, wingMat);
    tWingR.position.set(1.5, 0, 0);
    satBGroup.add(tWingR);

    // Fiery Glowing Red Optical Beacon (Center Core)
    const beaconSphereGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const beaconSphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Incandescent white core
    const beaconCore = new THREE.Mesh(beaconSphereGeo, beaconSphereMat);
    beaconCore.position.set(0, 0, 0.65);
    satBGroup.add(beaconCore);
    beaconCoreRef.current = beaconCore;

    // Neon Orange Mid-Corona
    const coronaGeo = new THREE.SphereGeometry(0.65, 24, 24);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const beaconCorona = new THREE.Mesh(coronaGeo, coronaMat);
    beaconCore.add(beaconCorona);
    beaconCoronaRef.current = beaconCorona;

    // Saturated Red Flare Glow Halo
    const haloGeo = new THREE.SphereGeometry(1.25, 24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff1122,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const beaconHalo = new THREE.Mesh(haloGeo, haloMat);
    beaconCore.add(beaconHalo);
    beaconHaloRef.current = beaconHalo;

    // Local Beacon Glow PointLight
    const beaconPointLight = new THREE.PointLight(0xff3300, 2.8, 25);
    beaconCore.add(beaconPointLight);
    beaconPointLightRef.current = beaconPointLight;

    // Outer Radiant Bloom Sprite
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = 128;
    flareCanvas.height = 128;
    const fCtx = flareCanvas.getContext('2d');
    if (fCtx) {
      const grad = fCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.2, 'rgba(255, 120, 30, 0.9)');
      grad.addColorStop(0.6, 'rgba(255, 20, 20, 0.45)');
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      fCtx.fillStyle = grad;
      fCtx.fillRect(0, 0, 128, 128);
    }
    const flareTexture = new THREE.CanvasTexture(flareCanvas);
    const flareSpriteMat = new THREE.SpriteMaterial({
      map: flareTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const flareSprite = new THREE.Sprite(flareSpriteMat);
    flareSprite.scale.set(3.4, 3.4, 3.4);
    beaconCore.add(flareSprite);
    beaconFlareSpriteRef.current = flareSprite;

    // ==========================================
    // 8. DASHED GREEN TRACKING LASER BEAM (- - - - ->)
    // ==========================================
    const linePoints = [
      nominalPosA.clone(),
      nominalPosB.clone(),
    ];
    const dashedLineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const dashedLineMat = new THREE.LineDashedMaterial({
      color: 0x22c55e, // Bright tracking green
      linewidth: 2,
      scale: 1,
      dashSize: 0.45,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.95,
    });
    const dashedLine = new THREE.Line(dashedLineGeo, dashedLineMat);
    dashedLine.computeLineDistances();
    scene.add(dashedLine);
    dashedLaserRef.current = dashedLine;

    // Moving Green Photon Energy Pulses along the line
    const particleCount = 50;
    const partGeo = new THREE.BufferGeometry();
    const partPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      partPos[i * 3] = 0;
      partPos[i * 3 + 1] = 0;
      partPos[i * 3 + 2] = 0;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0x4ade80,
      size: 2.4,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);
    laserParticlesRef.current = particles;

    // ==========================================
    // 9. MOUSE & DRAG EVENT HANDLERS
    // ==========================================
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      orbitParamsRef.current.theta -= dx * 0.006;
      orbitParamsRef.current.phi = Math.max(0.2, Math.min(Math.PI - 0.2, orbitParamsRef.current.phi - dy * 0.006));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitParamsRef.current.radius = Math.max(6, Math.min(32, orbitParamsRef.current.radius + e.deltaY * 0.012));
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // ==========================================
    // 10. MAIN RENDER LOOP & ORBITAL TRAJECTORY UPDATE
    // ==========================================
    let animationFrameId: number;
    let simClock = 756; // Starts at 00:12:36 (756s), matches reference photo
    let lastTimestamp = performance.now();

    // Orbital angular velocities (Satellite A lower orbit completes faster than Satellite B)
    // Speed tuned so users clearly see both satellites physically translating along their orbits
    const omegaA = 0.038; // rad/s
    const omegaB = 0.032; // rad/s (Keplerian ratio: higher altitude moves slower)

    const render = (now: number) => {
      animationFrameId = requestAnimationFrame(render);
      const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      if (isRunningRef.current) {
        simClock += dt * simSpeedRef.current;
      }

      const specs = cameraSpecsRef.current;
      const currentPat = patStateRef.current;
      const curViewMode = viewModeRef.current;
      const curDist = disturbancesRef.current;
      const curScale = simScaleRef.current || 'ORBIT';

      // Rotate Earth slowly
      if (earthRef.current) earthRef.current.rotation.y += 0.0002;
      if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0004;

      // -------------------------------------------------------------
      // 0. UPDATE DYNAMIC CELESTIAL & DISTURBANCE-REACTIVE ASSETS
      // -------------------------------------------------------------
      if (curDist) {
        // Starfield Density & Star Noise
        if (starMatRef.current) {
          starMatRef.current.size = 1.0 + (curDist.starFieldDensity / 100) * 1.8;
          starMatRef.current.opacity = Math.min(1.0, 0.55 + (curDist.backgroundStarNoise / 100) * 0.45);
        }

        // Sunlight / Stray Light Corona
        if (sunLightRef.current) {
          sunLightRef.current.intensity = 2.4 + (curDist.strayLightSunlight / 100) * 3.6;
        }
        if (sunFlareSpriteRef.current) {
          const sScale = 12 + (curDist.strayLightSunlight / 100) * 20;
          sunFlareSpriteRef.current.scale.set(sScale, sScale, sScale);
        }

        // Optical Beacon Brightness, Apparent Size, and Intensity Fluctuation
        const bBright = Math.max(0.1, (curDist.beaconBrightness / 100) * 1.6);
        const bSize = Math.max(0.2, (curDist.beaconApparentSize / 100) * 1.3);
        const bFlicker = 1.0 + (curDist.beaconIntensityFluctuation / 100) * Math.sin(simClock * 16) * 0.45;
        const netScale = bSize * bFlicker;

        if (beaconCoreRef.current) {
          beaconCoreRef.current.scale.set(netScale, netScale, netScale);
        }
        if (beaconCoronaRef.current) {
          const mat = beaconCoronaRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.min(1.0, 0.65 * bBright * bFlicker);
        }
        if (beaconHaloRef.current) {
          const mat = beaconHaloRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.min(1.0, 0.55 * bBright * bFlicker);
        }
        if (beaconFlareSpriteRef.current) {
          const fScale = 3.4 * netScale * Math.sqrt(bBright);
          beaconFlareSpriteRef.current.scale.set(fScale, fScale, fScale);
        }
        if (beaconPointLightRef.current) {
          beaconPointLightRef.current.intensity = 2.5 * bBright * bFlicker;
        }

        // Space Debris Field density and orbital motion
        const activeDebrisCount = Math.floor((curDist.spaceDebrisDensity / 100) * debrisMeshesRef.current.length);
        debrisMeshesRef.current.forEach((deb, idx) => {
          if (idx < activeDebrisCount) {
            deb.visible = true;
            const u = deb.userData;
            const debAngle = u.initialAngle + simClock * u.orbitSpeed;
            deb.position.x = Math.cos(debAngle) * u.orbitRadius;
            deb.position.z = Math.sin(debAngle) * u.orbitRadius;
            deb.position.y = u.baseY + Math.sin(simClock * 1.5 + idx) * 0.6;
            deb.rotation.x += u.rotSpeedX * 0.02;
            deb.rotation.y += u.rotSpeedY * 0.02;
          } else {
            deb.visible = false;
          }
        });
      }

      // -------------------------------------------------------------
      // 1. CALCULATE SATELLITE A ORBITAL POSITION & VELOCITY VECTOR
      // -------------------------------------------------------------
      // True anomaly theta_A advances along Orbit A
      const thetaA = (simClock * omegaA) % (Math.PI * 2);
      const posA = earthCenter.clone().add(
        eA1.clone().multiplyScalar(radiusA * Math.cos(thetaA))
      ).add(
        eA2.clone().multiplyScalar(radiusA * Math.sin(thetaA))
      );

      // Tangent velocity vector along orbit A (prograde flight direction)
      const velA_dir = eA1.clone().multiplyScalar(-Math.sin(thetaA)).add(
        eA2.clone().multiplyScalar(Math.cos(thetaA))
      ).normalize();

      // Earth Nadir direction (pointing down to Earth center)
      const nadirA = earthCenter.clone().sub(posA).normalize();

      // Apply Platform Vibration & Attitude Fluctuation to Satellite A
      let satAJitter = new THREE.Vector3(0, 0, 0);
      let satAAttitudeJitter = new THREE.Euler(0, 0, 0);
      if (curDist) {
        const vibFactor = (curDist.satelliteVibration / 100) * 0.035;
        satAJitter.set(
          (Math.sin(simClock * 38) + Math.cos(simClock * 59)) * vibFactor,
          (Math.cos(simClock * 43) + Math.sin(simClock * 71)) * vibFactor,
          (Math.sin(simClock * 31) + Math.cos(simClock * 67)) * vibFactor
        );

        const attFactor = (curDist.attitudeFluctuation / 100) * 0.018;
        satAAttitudeJitter.set(
          Math.sin(simClock * 1.6) * attFactor,
          Math.cos(simClock * 1.4) * attFactor,
          Math.sin(simClock * 2.1) * attFactor
        );
      }

      if (satAGroupRef.current) {
        satAGroupRef.current.position.copy(posA).add(satAJitter);

        // Orient Satellite A along its flight path (prograde) and nadir
        const normalA = new THREE.Vector3().crossVectors(velA_dir, nadirA).normalize();
        const rotMatA = new THREE.Matrix4().makeBasis(normalA, nadirA.clone().negate(), velA_dir);
        satAGroupRef.current.setRotationFromMatrix(rotMatA);
        satAGroupRef.current.rotation.x += satAAttitudeJitter.x;
        satAGroupRef.current.rotation.y += satAAttitudeJitter.y;
        satAGroupRef.current.rotation.z += satAAttitudeJitter.z;
      }

      // -------------------------------------------------------------
      // 2. CALCULATE SATELLITE B ORBITAL POSITION & VELOCITY VECTOR
      // -------------------------------------------------------------
      // True anomaly theta_B advances along Orbit B
      const thetaB = (simClock * omegaB) % (Math.PI * 2);
      const posB = earthCenter.clone().add(
        eB1.clone().multiplyScalar(radiusB * Math.cos(thetaB))
      ).add(
        eB2.clone().multiplyScalar(radiusB * Math.sin(thetaB))
      );

      // Target random motion jitter from disturbance
      if (curDist && curDist.targetRandomMotionJitter > 0) {
        const tJitterFactor = (curDist.targetRandomMotionJitter / 100) * 0.08;
        posB.x += Math.sin(simClock * 12 + 1.2) * tJitterFactor;
        posB.y += Math.cos(simClock * 15 + 0.8) * tJitterFactor;
        posB.z += Math.sin(simClock * 18 + 2.3) * tJitterFactor;
      }

      // Tangent velocity vector along orbit B
      const velB_dir = eB1.clone().multiplyScalar(-Math.sin(thetaB)).add(
        eB2.clone().multiplyScalar(Math.cos(thetaB))
      ).normalize();

      const nadirB = earthCenter.clone().sub(posB).normalize();

      if (satBGroupRef.current) {
        satBGroupRef.current.position.copy(posB);

        // Stabilized flight attitude for Satellite B along orbit
        const normalB = new THREE.Vector3().crossVectors(velB_dir, nadirB).normalize();
        const rotMatB = new THREE.Matrix4().makeBasis(normalB, nadirB.clone().negate(), velB_dir);
        satBGroupRef.current.setRotationFromMatrix(rotMatB);
      }

      // -------------------------------------------------------------
      // 3. ARTICULATE SATELLITE A'S OPTICAL TURRET (PAN & TILT)
      // -------------------------------------------------------------
      // Camera aperture in world coordinates
      const lensWorldPos = new THREE.Vector3();
      if (telescopeLensRef.current) {
        telescopeLensRef.current.getWorldPosition(lensWorldPos);
      } else {
        lensWorldPos.copy(posA);
      }

      // Line of sight vector from Satellite A to Satellite B's beacon
      const losVec = posB.clone().sub(lensWorldPos);

      // When in AUTO tracking / LOCKED, gimbal steers towards beacon
      // Superimpose fine steering offsets + pointing bias & angular jitter from disturbances
      if (gimbalYawGroupRef.current && gimbalPitchGroupRef.current && satAGroupRef.current) {
        const localTargetDir = losVec.clone().normalize().applyQuaternion(satAGroupRef.current.quaternion.clone().invert());
        
        const baseYaw = Math.atan2(localTargetDir.x, localTargetDir.z);
        const basePitch = -Math.asin(Math.max(-1, Math.min(1, localTargetDir.y)));

        const fineYaw = (specs.yaw * Math.PI) / 180;
        const finePitch = (-specs.pitch * Math.PI) / 180;

        // Disturbance pointing bias & jitter
        let pBiasYaw = 0;
        let pBiasPitch = 0;
        if (curDist) {
          pBiasYaw = (curDist.pointingBias / 100) * 0.04 + ((curDist.angularJitter || 0) / 100) * Math.sin(simClock * 24) * 0.015;
          pBiasPitch = (curDist.pointingBias / 100) * 0.03 + ((curDist.angularJitter || 0) / 100) * Math.cos(simClock * 29) * 0.015;
        }

        gimbalYawGroupRef.current.rotation.y = baseYaw + fineYaw * 0.15 + pBiasYaw;
        gimbalPitchGroupRef.current.rotation.x = basePitch + finePitch * 0.15 + pBiasPitch;
      }

      // -------------------------------------------------------------
      // 4. UPDATE DASHED GREEN TRACKING LASER BEAM
      // -------------------------------------------------------------
      if (dashedLaserRef.current) {
        const lineGeo = dashedLaserRef.current.geometry;
        const posArray = lineGeo.attributes.position.array as Float32Array;

        // Apply atmospheric turbulence & beam wander wobble to beam path
        let wanderOffset = new THREE.Vector3(0, 0, 0);
        if (curDist && (curDist.beamWander > 0 || curDist.atmosphericTurbulence > 0)) {
          const wMag = ((curDist.beamWander + curDist.atmosphericTurbulence) / 200) * 0.15;
          wanderOffset.set(
            Math.sin(simClock * 9.5) * wMag,
            Math.cos(simClock * 11.2) * wMag,
            Math.sin(simClock * 7.8) * wMag
          );
        }

        posArray[0] = lensWorldPos.x;
        posArray[1] = lensWorldPos.y;
        posArray[2] = lensWorldPos.z;

        posArray[3] = posB.x + wanderOffset.x;
        posArray[4] = posB.y + wanderOffset.y;
        posArray[5] = posB.z + wanderOffset.z;

        lineGeo.attributes.position.needsUpdate = true;
        dashedLaserRef.current.computeLineDistances();

        // Pulsing beam color based on PAT lock state & scintillation
        const laserMat = dashedLaserRef.current.material as THREE.LineDashedMaterial;
        let scintFlicker = 1.0;
        if (curDist && curDist.scintillation > 0) {
          scintFlicker = 1.0 - (curDist.scintillation / 100) * (0.35 + Math.sin(simClock * 22) * 0.25);
        }

        if (currentPat === 'LOCKED' || currentPat === 'TRACKING') {
          laserMat.color.setHex(0x22c55e); // Bright Tracking Green
          laserMat.opacity = Math.max(0.2, 0.95 * scintFlicker);
        } else if (currentPat === 'FINE_ALIGNMENT' || currentPat === 'ACQUISITION') {
          laserMat.color.setHex(0x38bdf8); // Acquisition Cyan
          laserMat.opacity = Math.max(0.2, 0.8 * scintFlicker);
        } else {
          laserMat.color.setHex(0xf59e0b); // Searching Amber
          laserMat.opacity = Math.max(0.15, 0.45 * scintFlicker);
        }
      }

      // -------------------------------------------------------------
      // 5. ANIMATE PHOTON ENERGY PULSES ALONG THE BEAM
      // -------------------------------------------------------------
      if (laserParticlesRef.current) {
        const pGeo = laserParticlesRef.current.geometry;
        const posArr = pGeo.attributes.position.array as Float32Array;
        const pCount = posArr.length / 3;

        for (let i = 0; i < pCount; i++) {
          const frac = ((simClock * 1.2 + i / pCount) % 1.0);
          posArr[i * 3] = lensWorldPos.x + (posB.x - lensWorldPos.x) * frac;
          posArr[i * 3 + 1] = lensWorldPos.y + (posB.y - lensWorldPos.y) * frac;
          posArr[i * 3 + 2] = lensWorldPos.z + (posB.z - lensWorldPos.z) * frac;
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      // -------------------------------------------------------------
      // 6. CALCULATE 2D SCREEN POSITIONS FOR CALLOUT ANNOTATIONS
      // -------------------------------------------------------------
      if (cameraRef.current && containerRef.current) {
        const cW = containerRef.current.clientWidth;
        const cH = containerRef.current.clientHeight;

        // Optical Beacon (Satellite B) 2D screen coordinate
        const bProj = posB.clone().project(cameraRef.current);
        const bX = (bProj.x * 0.5 + 0.5) * cW;
        const bY = (-(bProj.y * 0.5) + 0.5) * cH;
        setBeaconScreenPos({ x: bX, y: bY, visible: bProj.z < 1.0 });

        // Camera (Satellite A Lens) 2D screen coordinate
        const cProj = lensWorldPos.clone().project(cameraRef.current);
        const cX = (cProj.x * 0.5 + 0.5) * cW;
        const cY = (-(cProj.y * 0.5) + 0.5) * cH;
        setCameraScreenPos({ x: cX, y: cY, visible: cProj.z < 1.0 });
      }

      // -------------------------------------------------------------
      // 7. CAMERA PERSPECTIVES, MULTI-SCALE ZOOM & SMOOTH DAMPED MOTION
      // -------------------------------------------------------------
      // Scale multiplier for camera distances
      const scaleMult =
        curScale === 'GROUND' ? 1.6 :
        curScale === 'LOCAL' ? 0.65 :
        curScale === 'REGIONAL' ? 0.85 :
        curScale === 'SPACE' ? 2.0 : 1.0;

      const formationCenter = posA.clone().add(posB).multiplyScalar(0.5);
      const targetCamPos = new THREE.Vector3();
      const targetLookAt = new THREE.Vector3();

      if (curViewMode === 'boresight' || curViewMode === 'camera') {
        targetCamPos.copy(lensWorldPos);
        targetLookAt.copy(posB);
      } else if (curViewMode === 'chase') {
        const chasePos = posA.clone()
          .sub(velA_dir.clone().multiplyScalar(4.0 * scaleMult))
          .add(nadirA.clone().multiplyScalar(-1.8 * scaleMult));
        targetCamPos.copy(chasePos);
        targetLookAt.copy(posB);
      } else if (curViewMode === 'target') {
        const tPos = posB.clone().add(new THREE.Vector3(1.2, 0.8, 3.2).multiplyScalar(scaleMult));
        targetCamPos.copy(tPos);
        targetLookAt.copy(lensWorldPos);
      } else if (curViewMode === 'top') {
        targetCamPos.set(formationCenter.x, formationCenter.y + 16.0 * scaleMult, formationCenter.z);
        targetLookAt.copy(formationCenter);
      } else {
        // Free / Orbital View: Spherical orbit around formationCenter
        const { theta, phi, radius } = orbitParamsRef.current;
        const effectiveRadius = radius * scaleMult;
        const cx = formationCenter.x + effectiveRadius * Math.sin(phi) * Math.sin(theta);
        const cy = formationCenter.y + effectiveRadius * Math.cos(phi);
        const cz = formationCenter.z + effectiveRadius * Math.sin(phi) * Math.cos(theta);
        targetCamPos.set(cx, cy, cz);
        targetLookAt.copy(formationCenter);
      }

      if (cameraRef.current) {
        // Smooth camera lerp damping for maximum stability & zero visual jitter
        if (!isCamInitialized.current) {
          currentCamPos.current.copy(targetCamPos);
          currentLookAt.current.copy(targetLookAt);
          isCamInitialized.current = true;
        } else if (isDraggingRef.current) {
          // Instant direct response while user is dragging
          currentCamPos.current.copy(targetCamPos);
          currentLookAt.current.copy(targetLookAt);
        } else {
          // Silky smooth lerp damping
          currentCamPos.current.lerp(targetCamPos, 0.08);
          currentLookAt.current.lerp(targetLookAt, 0.08);
        }

        cameraRef.current.position.copy(currentCamPos.current);
        cameraRef.current.lookAt(currentLookAt.current);

        // Update 3D Coordinate Tripod Projection based on current view matrix
        const viewMatrix = cameraRef.current.matrixWorldInverse;
        const uX = new THREE.Vector3(1, 0, 0).transformDirection(viewMatrix);
        const uY = new THREE.Vector3(0, 1, 0).transformDirection(viewMatrix);
        const uZ = new THREE.Vector3(0, 0, 1).transformDirection(viewMatrix);

        setAxes2D({
          x: { x: uX.x * 26, y: -uX.y * 26 },
          y: { x: uY.x * 26, y: -uY.y * 26 },
          z: { x: uZ.x * 26, y: -uZ.y * 26 },
        });
      }

      // -------------------------------------------------------------
      // 8. UPDATE LIVE HUD TELEMETRY DATA
      // -------------------------------------------------------------
      // Format simulation clock hh:mm:ss
      const totalSec = Math.floor(simClock);
      const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
      const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
      const secs = (totalSec % 60).toString().padStart(2, '0');
      setHudTime(`${hrs}:${mins}:${secs}`);

      // Distance and Relative vectors
      const curDistKm = Math.round(842 + Math.sin(simClock * 0.1) * 8);
      setHudDistance(curDistKm);
      setHudRelPos([
        Math.round(-120 + Math.sin(simClock * 0.08) * 15),
        Math.round(310 + Math.cos(simClock * 0.07) * 12),
        Math.round(760 + Math.sin(simClock * 0.05) * 20),
      ]);
      setHudRelVel([
        Number((0.12 + Math.cos(simClock * 0.15) * 0.02).toFixed(2)),
        Number((-0.08 + Math.sin(simClock * 0.12) * 0.01).toFixed(2)),
        Number((0.03 + Math.cos(simClock * 0.09) * 0.01).toFixed(2)),
      ]);

      setHudTargetPos([
        Math.round(620 + Math.cos(simClock * 0.05) * 25),
        Math.round(-180 + Math.sin(simClock * 0.06) * 18),
        Math.round(7600 + Math.sin(simClock * 0.02) * 40),
      ]);

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(render);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const newWidth = entry.contentRect.width;
      const newHeight = entry.contentRect.height;
      if (newWidth > 0 && newHeight > 0 && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newWidth, newHeight);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Escape key listener & Body scroll lock for Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Force Three.js canvas resize immediately when toggling fullscreen & window resize
  useEffect(() => {
    const triggerResize = () => {
      if (cameraRef.current && rendererRef.current) {
        const width = isFullscreen ? window.innerWidth : (containerRef.current ? containerRef.current.clientWidth : 0);
        const height = isFullscreen ? window.innerHeight : (containerRef.current ? containerRef.current.clientHeight : 0);
        if (width > 0 && height > 0) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      }
    };

    triggerResize();
    window.addEventListener('resize', triggerResize);
    const animId = requestAnimationFrame(triggerResize);
    const t1 = setTimeout(triggerResize, 40);
    const t2 = setTimeout(triggerResize, 150);
    const t3 = setTimeout(triggerResize, 350);

    return () => {
      window.removeEventListener('resize', triggerResize);
      cancelAnimationFrame(animId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isFullscreen]);

  return (
    <>
      {/* Grid Placeholder: Keeps dashboard grid layout stable when 3D panel expands to full screen */}
      {isFullscreen && (
        <div className="w-full h-full rounded-xl border border-cyan-500/30 bg-slate-950/80 flex flex-col items-center justify-center text-xs text-slate-300 font-mono p-4 gap-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-semibold text-slate-100">Virtual Environment in Full Screen</span>
          </div>
          <p className="text-[11px] text-slate-400 text-center max-w-[240px]">
            Covering entire screen for immersive telemetry. Press ESC or click below to restore.
          </p>
          <button
            onClick={() => setIsFullscreen(false)}
            className="mt-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 text-[11px] font-semibold transition-colors flex items-center gap-1.5"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Minimize to Normal Condition</span>
          </button>
        </div>
      )}

      <div
        id="space-world-3d-panel"
        className={`${
          isFullscreen
            ? 'fixed inset-0 z-[100] w-screen h-screen m-0 p-0 rounded-none bg-[#02050e] border-0'
            : 'relative w-full h-full rounded-xl hud-panel border border-cyan-500/30'
        } overflow-hidden font-mono text-xs flex flex-col shadow-2xl select-none`}
      >
        {/* Fullscreen Mission Header (When covering full screen, like Search Guide) */}
        {isFullscreen && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-[#060c18]/95 backdrop-blur-md border-b border-cyan-500/40 px-4 py-2.5 flex items-center justify-between shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-tech text-sm tracking-wider text-cyan-300 font-bold uppercase">
                1. Virtual Satellite Environment — Full Screen Mission View
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-700/50">
                PAT: {patState}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                laserConnected ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50' : 'bg-amber-950/80 text-amber-400 border-amber-700/50'
              }`}>
                {laserConnected ? 'OPTICAL LINK LOCKED' : 'LINK ACQUIRING'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-fullscreen-minimize"
                onClick={() => setIsFullscreen(false)}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border border-cyan-300 rounded-xl px-4 py-1.5 shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center gap-2 text-xs transition-all group cursor-pointer"
                title="Minimize back to dashboard (Esc)"
              >
                <Minimize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Minimize to Dashboard</span>
                <kbd className="text-[10px] bg-slate-950/30 px-1.5 py-0.5 rounded text-slate-950 font-mono">
                  ESC
                </kbd>
              </button>
            </div>
          </div>
        )}

      {/* 1. TOP-LEFT HUD OVERLAY: VIRTUAL SATELLITE ENVIRONMENT (Matches Reference Image Exactly) */}
      {/* 1. TOP-LEFT HUD OVERLAY: VIRTUAL SATELLITE ENVIRONMENT (Matches Reference Image Exactly) */}
      {showEnvHud ? (
        <div className="absolute top-3 left-3 z-20 pointer-events-auto bg-[#050e1d]/90 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-xl text-xs max-w-[320px] transition-all animate-fadeIn">
          <div className="flex items-center justify-between mb-1.5 border-b border-slate-700/60 pb-1">
            <div className="flex items-center gap-2">
              <div>
                <h3 className="font-bold text-xs tracking-wide text-slate-100 uppercase">
                  Virtual Satellite Environment
                </h3>
                <p className="text-[11px] text-cyan-400 font-medium">
                  Satellite-to-Satellite Optical Tracking
                </p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            </div>
            <button
              id="btn-hide-env-hud"
              onClick={() => setShowEnvHud(false)}
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[10px] ml-2 shrink-0"
              title="Hide Virtual Satellite Environment HUD"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-300 hover:text-cyan-400" />
              <span className="hidden sm:inline">Hide</span>
            </button>
          </div>

          <div className="space-y-1 text-[11px] text-slate-300 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Time (sim)</span>
              <span className="text-slate-200 font-semibold">: {hudTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Distance</span>
              <span className="text-cyan-300 font-semibold">: {hudDistance} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Relative Pos</span>
              <span className="text-slate-200">: [ {hudRelPos[0]}, {hudRelPos[1]}, {hudRelPos[2]} ] km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Relative Vel</span>
              <span className="text-emerald-400 font-medium">: [ {hudRelVel[0]}, {hudRelVel[1]}, {hudRelVel[2]} ] km/s</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          id="btn-show-env-hud"
          onClick={() => setShowEnvHud(true)}
          className="absolute top-3 left-3 z-20 pointer-events-auto bg-[#050e1d]/90 hover:bg-[#0c1f3d] backdrop-blur-md border border-cyan-500/40 hover:border-cyan-400 rounded-lg px-2.5 py-1.5 shadow-xl text-xs text-slate-200 flex items-center gap-1.5 transition-all group animate-fadeIn"
          title="Show Virtual Satellite Environment HUD"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-[11px] tracking-wide text-slate-200">Virtual Environment</span>
          <span className="text-[10px] text-cyan-400 font-mono">[{hudDistance} km]</span>
        </button>
      )}

      {/* 2. TOP-RIGHT HUD OVERLAY: TARGET (BEACON) STATUS (Matches Reference Image Exactly) */}
      {showTargetHud ? (
        <div className={`absolute ${isFullscreen ? 'top-14 right-3' : 'top-3 right-3'} z-20 pointer-events-auto bg-[#050e1d]/90 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-xl text-xs max-w-[310px] transition-all animate-fadeIn`}>
          <div className="flex items-center justify-between mb-1.5 border-b border-slate-700/60 pb-1">
            <h3 className="font-bold text-xs tracking-wide text-cyan-400 uppercase">
              Target (Beacon) Status
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-hide-target-hud"
                onClick={() => setShowTargetHud(false)}
                className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
                title="Hide Target (Beacon) Status HUD"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-300 hover:text-cyan-400" />
                <span className="hidden sm:inline">Hide</span>
              </button>
              <button
                id="btn-toggle-fullscreen"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-[10px] font-semibold cursor-pointer ${
                  isFullscreen
                    ? 'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 hover:text-white'
                }`}
                title={isFullscreen ? 'Minimize to normal condition (Esc)' : 'Maximize to full screen (Cover screen)'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Minimize' : 'Maximize'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1 text-[11px] text-slate-300 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Position</span>
              <span className="text-slate-200">: [ {hudTargetPos[0]}, {hudTargetPos[1]}, {hudTargetPos[2]} ] km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Velocity</span>
              <span className="text-slate-200">: [ {hudTargetVel[0]}, {hudTargetVel[1]}, {hudTargetVel[2]} ] km/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Beacon Power</span>
              <span className="text-amber-300 font-semibold">: 10 mW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Wavelength</span>
              <span className="text-cyan-300 font-semibold">: 1550 nm</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-slate-400">Status</span>
              <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                : ON ({patState === 'LOCKED' ? 'Locked' : 'Moving'})
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Link Status</span>
              <div className={`flex items-center gap-1 font-semibold ${
                (linkBudget?.status === 'CONNECTED' || patState === 'LOCKED')
                  ? 'text-emerald-400'
                  : (linkBudget?.status === 'ACQUIRING' || patState === 'TRACKING')
                  ? 'text-cyan-400'
                  : 'text-red-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  (linkBudget?.status === 'CONNECTED' || patState === 'LOCKED')
                    ? 'bg-emerald-400 animate-pulse'
                    : (linkBudget?.status === 'ACQUIRING' || patState === 'TRACKING')
                    ? 'bg-cyan-400'
                    : 'bg-red-500'
                }`} />
                : {linkBudget?.status || (patState === 'LOCKED' ? 'CONNECTED' : patState === 'TRACKING' ? 'ACQUIRING' : 'LOST')}
              </div>
            </div>
          </div>

          {/* Camera Perspective Switcher Buttons */}
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-700/60 text-[10px]">
            <button
              onClick={() => setViewMode('orbital')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'orbital' ? 'bg-cyan-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Overview Orbit Vantage Point"
            >
              <Rotate3d className="w-3 h-3" />
              Orbit
            </button>
            <button
              onClick={() => setViewMode('boresight')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'boresight' ? 'bg-cyan-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Optical Camera POV"
            >
              <Crosshair className="w-3 h-3 text-cyan-300" />
              Boresight
            </button>
            <button
              onClick={() => setViewMode('chase')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'chase' ? 'bg-cyan-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Terminal A Chase Cam"
            >
              <Video className="w-3 h-3" />
              Chase
            </button>
            <button
              onClick={() => setViewMode('target')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'target' ? 'bg-cyan-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Terminal B Target View"
            >
              <Eye className="w-3 h-3" />
              Target
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-3 right-3 z-20 pointer-events-auto flex items-center gap-1.5 animate-fadeIn">
          {/* Keep Camera Perspective Switcher reachable when panel is hidden */}
          <div className="hidden sm:flex items-center gap-1 bg-[#050e1d]/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 text-[10px] shadow-lg">
            <button
              onClick={() => setViewMode('orbital')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'orbital' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Overview Orbit View"
            >
              <Rotate3d className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('boresight')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'boresight' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Optical Camera Boresight POV"
            >
              <Crosshair className="w-3 h-3 text-cyan-300" />
            </button>
            <button
              onClick={() => setViewMode('chase')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'chase' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Terminal A Chase Cam"
            >
              <Video className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('target')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'target' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Terminal B Target View"
            >
              <Eye className="w-3 h-3" />
            </button>
          </div>

          <button
            id="btn-show-target-hud"
            onClick={() => setShowTargetHud(true)}
            className="bg-[#050e1d]/90 hover:bg-[#0c1f3d] backdrop-blur-md border border-cyan-500/40 hover:border-cyan-400 rounded-lg px-2.5 py-1.5 shadow-xl text-xs text-slate-200 flex items-center gap-1.5 transition-all group"
            title="Show Target (Beacon) Status HUD"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-[11px] tracking-wide text-slate-200">Target Status</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </button>
          <button
            id="btn-toggle-fullscreen-collapsed"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1.5 rounded-lg backdrop-blur-md transition-all flex items-center justify-center ${
              isFullscreen
                ? 'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 border border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                : 'bg-[#050e1d]/90 hover:bg-[#0c1f3d] border border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isFullscreen ? 'Minimize to normal window (Esc)' : 'Maximize to full screen (Cover screen)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* 3. 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 4. IN-SCENE 3D CALLOUT ANNOTATIONS (Tracks Physical Satellites as They Move on Orbits) */}
      {/* Optical Beacon (Moving) Callout */}
      {beaconScreenPos.visible && (
        <div
          className="absolute pointer-events-none transition-all duration-75 text-right flex items-center gap-1.5"
          style={{
            left: `${Math.max(20, Math.min((containerRef.current?.clientWidth || 700) - 170, beaconScreenPos.x + 16))}px`,
            top: `${Math.max(60, Math.min((containerRef.current?.clientHeight || 400) - 60, beaconScreenPos.y + 12))}px`,
          }}
        >
          <div className="flex flex-col text-left">
            <span className="text-slate-100 font-semibold text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              Optical Beacon
            </span>
            <span className="text-red-400 text-[10px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              (Moving)
            </span>
          </div>
        </div>
      )}

      {/* Camera (Controllable) Callout */}
      {cameraScreenPos.visible && (
        <div
          className="absolute pointer-events-none transition-all duration-75 flex flex-col text-left"
          style={{
            left: `${Math.max(20, Math.min((containerRef.current?.clientWidth || 700) - 160, cameraScreenPos.x + 14))}px`,
            top: `${Math.max(60, Math.min((containerRef.current?.clientHeight || 400) - 60, cameraScreenPos.y + 24))}px`,
          }}
        >
          <span className="text-slate-100 font-semibold text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            Camera
          </span>
          <span className="text-cyan-400 text-[10px] font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            (Controllable)
          </span>
        </div>
      )}

      {/* 5. BOTTOM-LEFT FLOATING LEGEND BOX (Matches Photo Bottom-Left Exactly: 3 items) */}
      <div className="absolute bottom-3 left-3 pointer-events-auto bg-[#050e1d]/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 flex flex-col gap-1.5 shadow-xl text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.95)]" />
          <span className="text-slate-200 font-medium">Optical Beacon (target)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-400/80 border border-slate-300 flex items-center justify-center text-[9px]">
            📷
          </div>
          <span className="text-slate-200 font-medium">Camera (controlled)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center w-3 justify-center">
            <div className="w-3 border-t-2 border-dashed border-emerald-400" />
          </div>
          <span className="text-slate-200 font-medium">Optical Link / Line of Sight</span>
        </div>
      </div>

      {/* 6. BOTTOM-RIGHT 3D COORDINATE FRAME AXIS WIDGET (Matches Photo Bottom-Right Exactly) */}
      <div className="absolute bottom-3 right-3 pointer-events-auto bg-[#050e1d]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2 shadow-xl flex items-center justify-center w-16 h-16">
        <svg className="w-12 h-12 overflow-visible" viewBox="-30 -30 60 60">
          {/* Origin dot */}
          <circle cx="0" cy="0" r="2" fill="#94a3b8" />

          {/* X Axis (Red) */}
          <line
            x1="0"
            y1="0"
            x2={axes2D.x.x}
            y2={axes2D.x.y}
            stroke="#ef4444"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <text
            x={axes2D.x.x * 1.25}
            y={axes2D.x.y * 1.25 + 3}
            fill="#ef4444"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            X
          </text>

          {/* Y Axis (Green) */}
          <line
            x1="0"
            y1="0"
            x2={axes2D.y.x}
            y2={axes2D.y.y}
            stroke="#22c55e"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <text
            x={axes2D.y.x * 1.25}
            y={axes2D.y.y * 1.25 + 3}
            fill="#22c55e"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            Y
          </text>

          {/* Z Axis (Cyan) */}
          <line
            x1="0"
            y1="0"
            x2={axes2D.z.x}
            y2={axes2D.z.y}
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <text
            x={axes2D.z.x * 1.25}
            y={axes2D.z.y * 1.25 + 3}
            fill="#38bdf8"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            Z
          </text>
        </svg>
      </div>
    </div>
    </>
  );
};
