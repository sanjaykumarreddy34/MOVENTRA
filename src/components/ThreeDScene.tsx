import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Eye, EyeOff, Truck, Building2, Compass, Moon } from 'lucide-react';
import heroTruckImg from '../assets/images/hero_moventra_truck_1794551054512.jpg';

export type CameraPreset = 'transit' | 'loading' | 'orbit360' | 'twilight';

interface ThreeDSceneProps {
  mode?: 'background' | 'showcase';
  className?: string;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

function createRoadCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#151c2c';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 22 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${v},${v + 5},${v + 12})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Yellow shoulder lines & dashed white center lane
  ctx.fillStyle = '#d97706';
  ctx.fillRect(24, 0, 8, 512);
  ctx.fillRect(480, 0, 8, 512);

  ctx.fillStyle = '#e2e8f0';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(252, y, 8, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  return tex;
}

function createContainerLiveryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#0b1836');
  grad.addColorStop(0.6, '#102552');
  grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Corrugated vertical ribs
  for (let x = 0; x < 1024; x += 28) {
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(x, 0, 10, 512);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x + 10, 0, 4, 512);
  }

  // Electric blue & amber speed stripe
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, 358, 1024, 14);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 376, 1024, 6);

  // MOVENTRA brand typography
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 104px Outfit, sans-serif';
  ctx.fillText('MOVENTRA', 92, 230);

  ctx.fillStyle = '#93c5fd';
  ctx.font = '600 32px Plus Jakarta Sans, sans-serif';
  ctx.fillText('INDIAN PACKERS & MOVERS  •  GPS FLEET', 96, 286);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCardboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b48a5a';
  ctx.fillRect(0, 0, 256, 256);

  // Corrugated paper fibers
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(90,60,30,0.12)' : 'rgba(220,190,140,0.12)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 14, 2);
  }

  // Packing tape strip & fragile label
  ctx.fillStyle = '#d6b482';
  ctx.fillRect(108, 0, 40, 256);
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(24, 175, 92, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('MOVENTRA', 30, 202);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ThreeDScene: React.FC<ThreeDSceneProps> = ({
  mode = 'showcase',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const presetRef = useRef<CameraPreset>('transit');
  const userInteractingRef = useRef(false);
  const [preset, setPreset] = useState<CameraPreset>('transit');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  const selectPreset = (next: CameraPreset) => {
    presetRef.current = next;
    userInteractingRef.current = false;
    setPreset(next);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b19);
    scene.fog = new THREE.FogExp2(0x060b19, 0.016);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 220);
    camera.position.set(11.5, 4.6, 13.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 7;
    controls.maxDistance = 32;
    controls.target.set(0, 1.8, 0);
    controls.enabled = mode === 'showcase';
    controls.addEventListener('start', () => {
      userInteractingRef.current = true;
    });

    // 3-Point Architectural + Electric Blue/Purple Twilight Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    keyLight.position.set(14, 18, 12);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 55;
    const d = 16;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.45);
    rimLight.position.set(-14, 9, -12);
    scene.add(rimLight);

    // Environment Ground & Wet Asphalt Highway
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const roadTex = createRoadCanvasTexture();
    roadTex.anisotropy = maxAniso;

    const terrainGeo = new THREE.PlaneGeometry(180, 180);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x0b1222,
      roughness: 0.92,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    const roadGeo = new THREE.PlaneGeometry(10.5, 160);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.36,
      metalness: 0.18,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(-0.5, 0.02, 0);
    road.receiveShadow = true;
    scene.add(road);

    // Sidewalk Curb along Residential Complex
    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.18, 120),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.1 })
    );
    sidewalk.position.set(10.75, 0.09, 0);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);

    // Realistic Modern Indian Residential Apartment Complex (Multi-part Group)
    const buildingsGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78, metalness: 0.08 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.25 });
    const warmWindowMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.2,
    });
    const coolGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      roughness: 0.12,
      metalness: 0.25,
      clearcoat: 1.0,
    });

    const towerSpecs = [
      { x: 11.5, z: -4, w: 7.5, h: 16, d: 10 },
      { x: 12.2, z: -18, w: 8.0, h: 21, d: 10 },
      { x: 12.0, z: 11, w: 7.0, h: 13, d: 9 },
      { x: -13.5, z: -12, w: 8.0, h: 18, d: 12 },
      { x: -14.0, z: 6, w: 7.5, h: 14, d: 10 },
    ];

    towerSpecs.forEach((spec, idx) => {
      const tower = new THREE.Group();
      const core = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, spec.d), concreteMat);
      core.position.y = spec.h / 2;
      core.castShadow = true;
      core.receiveShadow = true;
      tower.add(core);

      // Floor slabs / balconies
      const floors = Math.floor(spec.h / 2.6);
      for (let f = 1; f < floors; f++) {
        const y = f * 2.6;
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(spec.w + 0.5, 0.22, spec.d + 0.5),
          trimMat
        );
        slab.position.y = y;
        tower.add(slab);

        // Windows facing road
        for (let wz = -spec.d / 2 + 1.5; wz <= spec.d / 2 - 1.5; wz += 2.3) {
          const isLit = (f + Math.round(wz) + idx) % 3 !== 0;
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 1.35, 1.4),
            isLit ? warmWindowMat : coolGlassMat
          );
          win.position.set(spec.x > 0 ? -spec.w / 2 - 0.02 : spec.w / 2 + 0.02, y + 1.1, wz);
          tower.add(win);
        }
      }

      // Ground lobby entrance canopy
      if (idx === 0) {
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, 5.2), trimMat);
        canopy.position.set(-spec.w / 2 - 1.3, 3.1, 0);
        canopy.castShadow = true;
        tower.add(canopy);
      }

      tower.position.set(spec.x, 0.18, spec.z);
      buildingsGroup.add(tower);
    });
    scene.add(buildingsGroup);

    // Street Lights along road
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.75, roughness: 0.3 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.5,
    });
    for (let z = -36; z <= 36; z += 18) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.5, 10), poleMat);
      pole.position.set(5.2, 2.75, z);
      scene.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.1), poleMat);
      arm.position.set(4.5, 5.45, z);
      scene.add(arm);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.22), lampMat);
      bulb.position.set(4.0, 5.38, z);
      scene.add(bulb);
    }

    // Stacked Packing Boxes & Wooden Crate by the Loading Bay
    const boxTex = createCardboardTexture();
    boxTex.anisotropy = maxAniso;
    const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.85, metalness: 0.02 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x785032, roughness: 0.75, metalness: 0.05 });

    const propStack = new THREE.Group();
    const boxDefs = [
      { x: 6.4, y: 0.45, z: -2.5, w: 0.75, h: 0.55, d: 0.65 },
      { x: 6.4, y: 0.98, z: -2.45, w: 0.6, h: 0.5, d: 0.55 },
      { x: 7.2, y: 0.43, z: -2.6, w: 0.7, h: 0.5, d: 0.7 },
      { x: 6.6, y: 0.48, z: -3.4, w: 0.8, h: 0.6, d: 0.65 },
    ];
    boxDefs.forEach((b) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), boxMat);
      m.position.set(b.x, b.y, b.z);
      m.castShadow = true;
      m.receiveShadow = true;
      propStack.add(m);
    });
    // Wrapped furniture sofa crate on sidewalk
    const sofaCrate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 2.0), woodMat);
    sofaCrate.position.set(6.9, 0.6, -0.5);
    sofaCrate.castShadow = true;
    propStack.add(sofaCrate);
    scene.add(propStack);

    // =====================================================
    // COMPOSITE MULTI-PART INDIAN COMMERCIAL MOVING TRUCK
    // =====================================================
    const truckGroup = new THREE.Group();
    const liveryTex = createContainerLiveryTexture();
    liveryTex.anisotropy = maxAniso;

    const cabPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      metalness: 0.45,
      roughness: 0.28,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    });
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.5 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.15 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0.05 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.1,
      roughness: 0.08,
      clearcoat: 1.0,
      opacity: 0.82,
      transparent: true,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 2.2,
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.4,
    });

    // 1. Steel Chassis Frame
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.28, 7.6), chassisMat);
    chassis.position.set(0, 0.68, 0);
    chassis.castShadow = true;
    truckGroup.add(chassis);

    // 2. Corrugated Cargo Container Body (with MOVENTRA livery on left/right)
    const containerPlainMat = new THREE.MeshStandardMaterial({ color: 0x0f1f44, metalness: 0.35, roughness: 0.42 });
    const containerSideMat = new THREE.MeshStandardMaterial({ map: liveryTex, metalness: 0.25, roughness: 0.4 });
    const containerBody = new THREE.Mesh(new THREE.BoxGeometry(2.48, 2.55, 5.4), [
      containerSideMat, // +X
      containerSideMat, // -X
      containerPlainMat, // +Y
      chassisMat, // -Y
      containerPlainMat, // +Z
      containerPlainMat, // -Z
    ]);
    containerBody.position.set(0, 2.08, -1.0);
    containerBody.castShadow = true;
    containerBody.receiveShadow = true;
    truckGroup.add(containerBody);

    // 3. Commercial Cab (Eicher/Tata Flat-Front Indian Truck Profile)
    const cabBody = new THREE.Mesh(new THREE.BoxGeometry(2.36, 2.05, 1.95), cabPaintMat);
    cabBody.position.set(0, 1.75, 2.82);
    cabBody.castShadow = true;
    truckGroup.add(cabBody);

    // Aerodynamic Roof Fairing Deflector
    const deflector = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.55), cabPaintMat);
    deflector.position.set(0, 2.95, 2.65);
    deflector.rotation.x = 0.26;
    deflector.castShadow = true;
    truckGroup.add(deflector);

    // Windshield & Side Windows
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.88, 0.08), glassMat);
    windshield.position.set(0, 2.15, 3.79);
    windshield.rotation.x = -0.06;
    truckGroup.add(windshield);

    const sideWinL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 1.1), glassMat);
    sideWinL.position.set(-1.18, 2.15, 2.95);
    truckGroup.add(sideWinL);

    const sideWinR = sideWinL.clone();
    sideWinR.position.x = 1.18;
    truckGroup.add(sideWinR);

    // Front Chrome Grille & Steel Bumper
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 0.1), chromeMat);
    grille.position.set(0, 1.32, 3.81);
    truckGroup.add(grille);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.3, 0.24), chassisMat);
    bumper.position.set(0, 0.78, 3.82);
    truckGroup.add(bumper);

    // Headlights & Taillights
    const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.08), headlightMat);
    hlLeft.position.set(-0.88, 1.05, 3.82);
    truckGroup.add(hlLeft);
    const hlRight = hlLeft.clone();
    hlRight.position.x = 0.88;
    truckGroup.add(hlRight);

    const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.06), taillightMat);
    tlLeft.position.set(-0.92, 0.78, -3.82);
    truckGroup.add(tlLeft);
    const tlRight = tlLeft.clone();
    tlRight.position.x = 0.92;
    truckGroup.add(tlRight);

    // Side Mirrors
    const mirrorArmL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.12), chassisMat);
    mirrorArmL.position.set(-1.32, 2.08, 3.55);
    truckGroup.add(mirrorArmL);
    const mirrorArmR = mirrorArmL.clone();
    mirrorArmR.position.x = 1.32;
    truckGroup.add(mirrorArmR);

    // Side Fuel Tank
    const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.15, 16), chromeMat);
    fuelTank.rotation.x = Math.PI / 2;
    fuelTank.position.set(1.06, 0.65, 0.6);
    truckGroup.add(fuelTank);

    // 6 Heavy Commercial Wheels (Front Steer + Dual Rear Axle)
    const wheelMeshes: THREE.Group[] = [];
    const wheelPositions = [
      { x: -1.12, z: 2.65 },
      { x: 1.12, z: 2.65 },
      { x: -1.12, z: -1.55 },
      { x: 1.12, z: -1.55 },
      { x: -1.12, z: -2.65 },
      { x: 1.12, z: -2.65 },
    ];
    wheelPositions.forEach((wp) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.34, 24), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wg.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.36, 16), rimMat);
      rim.rotation.z = Math.PI / 2;
      wg.add(rim);
      wg.position.set(wp.x, 0.5, wp.z);
      truckGroup.add(wg);
      wheelMeshes.push(wg);
    });

    // Subtle Headlight Ground Beam SpotLight (no shadow to keep <= 2 shadow casters)
    const headBeam = new THREE.SpotLight(0xfffbeb, 6, 22, Math.PI / 5, 0.6, 1.4);
    headBeam.position.set(0, 1.2, 3.9);
    headBeam.target.position.set(0, 0, 14);
    truckGroup.add(headBeam);
    truckGroup.add(headBeam.target);

    truckGroup.position.set(-0.4, 0.02, -4);
    scene.add(truckGroup);

    // Animation & Damped Camera Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let truckZ = -4;

    const getCameraTargetForPreset = (p: CameraPreset, tz: number) => {
      switch (p) {
        case 'loading':
          return {
            pos: _vec3A.set(9.2, 3.4, tz + 6.8),
            target: _vec3B.set(3.5, 1.7, tz - 0.5),
          };
        case 'orbit360':
          return {
            pos: _vec3A.set(-10.5, 5.2, tz + 9.0),
            target: _vec3B.set(0, 1.8, tz),
          };
        case 'twilight':
          return {
            pos: _vec3A.set(13.5, 7.2, tz - 11.5),
            target: _vec3B.set(1.5, 2.2, tz + 1.0),
          };
        case 'transit':
        default:
          return {
            pos: _vec3A.set(8.6, 3.6, tz + 10.5),
            target: _vec3B.set(0.8, 1.8, tz + 1.2),
          };
      }
    };

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        const speed = presetRef.current === 'loading' ? 0 : 4.2;
        if (speed > 0) {
          truckZ += delta * speed;
          if (truckZ > 24) truckZ = -28;
          truckGroup.position.z = truckZ;
          truckGroup.position.y = 0.02 + Math.sin(elapsed * 14) * 0.008;
          wheelMeshes.forEach((w) => {
            w.rotation.x += delta * (speed / 0.5);
          });
          // Smooth road parallax scroll
          roadTex.offset.y -= delta * 0.08;
        } else {
          truckGroup.position.z = THREE.MathUtils.damp(truckGroup.position.z, -1.5, 3, delta);
          truckZ = truckGroup.position.z;
        }
      }

      if (!userInteractingRef.current) {
        const { pos, target } = getCameraTargetForPreset(presetRef.current, truckGroup.position.z);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, 3.2, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, 3.2, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, 3.2, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, target.x, 3.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, target.y, 3.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, target.z, 3.5, delta);
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      roadTex.dispose();
      liveryTex.dispose();
      boxTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mode]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#060b19] ${className}`}>
      {webglFailed ? (
        <img
          src={heroTruckImg}
          alt="MOVENTRA commercial moving truck and residential loading scene"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-70"
        />
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}

      {mode === 'showcase' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 max-w-[94vw]">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-950/90 border border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            {dockCollapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {dockCollapsed ? 'Show Camera Controls' : 'Hide Controls'}
          </button>

          {!dockCollapsed && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-xl bg-slate-950/92 border border-slate-700/80 shadow-2xl">
              <button
                type="button"
                onClick={() => selectPreset('transit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  preset === 'transit'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Highway Transit
              </button>
              <button
                type="button"
                onClick={() => selectPreset('loading')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  preset === 'loading'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Loading Bay
              </button>
              <button
                type="button"
                onClick={() => selectPreset('orbit360')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  preset === 'orbit360'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Fleet 360°
              </button>
              <button
                type="button"
                onClick={() => selectPreset('twilight')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  preset === 'twilight'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Twilight Skyline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
