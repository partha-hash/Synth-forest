/**
 * redowan's synth forest - 3D Nature Scene
 * Features:
 * - Circular Little-Planet Curvature (curved downward horizon like an infinite celestial orb)
 * - Infinite Toroidal Wrapping: walking past the planet perimeter seamlessly loops without walls
 * - Two-Finger Sweep Gesture: swipe horizontally with 2 fingers to cycle biomes & DSP profiles
 * - UnrealBloomPass post-processing for lucid bioluminescent atmosphere
 * - Clustered dense mystical groves (Pines, Stumps, Logs, Stones, Bushes, Glowing Spore Mushrooms)
 * - Stationary Ambient Wildlife with Proximity/Touch Chords & Organic Embedded Low-Cost Pond
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { audioEngine } from '../audio/AudioEngine';
import {
  FOREST_THEMES,
  ForestThemeKey,
  ModeKey,
  MusicalMode,
  MUSICAL_MODES,
  THEME_KEYS_ORDER,
} from '../types/synth';

interface ForestSceneProps {
  currentTheme: ForestThemeKey;
  selectedMode: ModeKey;
  bloomEnabled: boolean;
  isAutoExploring?: boolean;
  joystickVector: { x: number; y: number };
  onThemeCycle?: (newTheme: ForestThemeKey) => void;
  onObjectPlayed?: (
    type: 'tree' | 'stump' | 'log' | 'stone' | 'bush' | 'mushroom' | 'sapling' | 'mossStick' | 'flower' | 'ground',
    label: string,
    freq: number,
    noteName: string
  ) => void;
}

interface InteractiveProp {
  group: THREE.Group;
  type: 'tree' | 'stump' | 'log' | 'stone' | 'bush' | 'mushroom' | 'sapling' | 'mossStick' | 'flower';
  originalScale: THREE.Vector3;
  animTimer: number;
  freq: number;
  noteName: string;
  name: string;
  glowMesh?: THREE.Mesh;
  subtype?: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  maxRadius: number;
  progress: number;
}

interface SplashPointLight {
  light: THREE.PointLight;
  initialIntensity: number;
  timer: number;
}

interface SplashSpark {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

interface ForestAnimal {
  group: THREE.Group;
  kind: 'bunny' | 'deer' | 'bear' | 'frog' | 'owl' | 'nightAngel' | 'asianCuckoo' | 'cricket';
  label: string;
  anchorX: number;
  anchorZ: number;
  zoneRadius: number;
  freq: number;
  wasInside: boolean;
  lastSoundAt: number;
  character: number;
  ears?: THREE.Object3D[];
  head?: THREE.Object3D;
  wings?: THREE.Object3D[];
  antenna?: THREE.Object3D[];
}

const _moveDir = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export const ForestScene: React.FC<ForestSceneProps> = ({
  currentTheme,
  selectedMode,
  bloomEnabled,
  isAutoExploring = false,
  joystickVector,
  onThemeCycle,
  onObjectPlayed,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef(currentTheme);
  themeRef.current = currentTheme;
  const modeRef = useRef(selectedMode);
  modeRef.current = selectedMode;
  const bloomRef = useRef(bloomEnabled);
  bloomRef.current = bloomEnabled;
  const autoExploreRef = useRef(isAutoExploring);
  autoExploreRef.current = isAutoExploring;
  const joystickRef = useRef(joystickVector);
  joystickRef.current = joystickVector;
  const onThemeCycleRef = useRef(onThemeCycle);
  onThemeCycleRef.current = onThemeCycle;
  const onObjectPlayedRef = useRef(onObjectPlayed);
  onObjectPlayedRef.current = onObjectPlayed;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect Software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene & Lucid Fog
    const scene = new THREE.Scene();
    const initialTheme = FOREST_THEMES[themeRef.current] || FOREST_THEMES.astral;
    scene.background = new THREE.Color(initialTheme.fogColor);
    scene.fog = new THREE.FogExp2(initialTheme.fogColor, 0.02);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);
    camera.position.set(0, 2.4, 8);
    camera.rotation.order = 'YXZ';

    // 3. Renderer with ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. UnrealBloomPass Post-Processing
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;

    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        initialTheme.bloomStrength,
        initialTheme.bloomRadius,
        initialTheme.bloomThreshold
      );
      composer.addPass(bloomPass);
    }

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(initialTheme.ambientLightColor, 1.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(initialTheme.keyLightColor, initialTheme.fogColor, 0.95);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(initialTheme.keyLightColor, 1.85);
    dirLight.position.set(35, 55, 30);
    scene.add(dirLight);

    // 6. Circular Little-Planet Terrain
    const planetRadius = 135;
    const worldBoundRadius = 60;

    const getLittlePlanetHeight = (x: number, z: number): number => {
      const distSq = x * x + z * z;
      const planetCurve = -distSq / (2 * planetRadius);
      const hills =
        Math.sin(x * 0.06) * Math.cos(z * 0.06) * 2.2 +
        Math.sin(x * 0.025 + z * 0.02) * 2.8 +
        Math.cos(x * 0.12) * 0.4;
      return hills + planetCurve;
    };

    // Circular Disc Terrain (Little Planet Disc)
    const terrainGeo = new THREE.RingGeometry(0.1, 74, 48, 64);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, getLittlePlanetHeight(x, z));
    }
    // Cut a real opening in the terrain for the sunken pond basin.
    // The same geometry is shared by the terrain wire overlay, so neither can cover the water.
    const terrainIndex = terrainGeo.getIndex();
    if (terrainIndex) {
      const kept: number[] = [];
      for (let i = 0; i < terrainIndex.count; i += 3) {
        const ia = terrainIndex.getX(i), ib = terrainIndex.getX(i + 1), ic = terrainIndex.getX(i + 2);
        const cx = (posAttr.getX(ia) + posAttr.getX(ib) + posAttr.getX(ic)) / 3;
        const cz = (posAttr.getZ(ia) + posAttr.getZ(ib) + posAttr.getZ(ic)) / 3;
        if (Math.hypot(cx, cz) > 8.9) kept.push(ia, ib, ic);
      }
      terrainGeo.setIndex(kept);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: initialTheme.groundSolidColor,
      roughness: 0.82,
      metalness: 0.18,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.userData = { isGround: true };
    scene.add(terrainMesh);

    // Luminous Circular Wireframe Mesh
    const wireMat = new THREE.MeshBasicMaterial({
      color: initialTheme.groundWireColor,
      wireframe: false,
      transparent: true,
      opacity: 0.45,
    });
    const wireMesh = new THREE.Mesh(terrainGeo, wireMat);
    wireMesh.position.y += 0.04;
    scene.add(wireMesh);

    // Sunken pond banks: concentric sloped rings descend from the ground into the basin.
    const bankSegments = 64;
    const bankRings = [
      { radius: 8.9, drop: 0.02, color: new THREE.Color(0x68734a) },
      { radius: 7.6, drop: 0.20, color: new THREE.Color(0x536344) },
      { radius: 6.35, drop: 0.72, color: new THREE.Color(0x66533b) },
      { radius: 5.55, drop: 0.92, color: new THREE.Color(0x3d5143) },
    ];
    const bankPositions: number[] = [];
    const bankColors: number[] = [];
    const bankIndices: number[] = [];
    for (const ring of bankRings) {
      for (let i = 0; i < bankSegments; i++) {
        const a = (i / bankSegments) * Math.PI * 2;
        const x = Math.cos(a) * ring.radius;
        const z = Math.sin(a) * ring.radius;
        bankPositions.push(x, getLittlePlanetHeight(x, z) - ring.drop, z);
        bankColors.push(ring.color.r, ring.color.g, ring.color.b);
      }
    }
    for (let r = 0; r < bankRings.length - 1; r++) {
      for (let i = 0; i < bankSegments; i++) {
        const a = r * bankSegments + i;
        const b = r * bankSegments + (i + 1) % bankSegments;
        const c = (r + 1) * bankSegments + i;
        const d = (r + 1) * bankSegments + (i + 1) % bankSegments;
        bankIndices.push(a, c, b, b, c, d);
      }
    }
    const bankGeo = new THREE.BufferGeometry();
    bankGeo.setAttribute('position', new THREE.Float32BufferAttribute(bankPositions, 3));
    bankGeo.setAttribute('color', new THREE.Float32BufferAttribute(bankColors, 3));
    bankGeo.setIndex(bankIndices);
    bankGeo.computeVertexNormals();
    const bankMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
    const pondBank = new THREE.Mesh(bankGeo, bankMat);
    pondBank.renderOrder = 2;
    scene.add(pondBank);

    // Circular Little-Planet Atmospheric Glow Ring
    const atmoGeo = new THREE.RingGeometry(73.5, 76.5, 64);
    atmoGeo.rotateX(-Math.PI / 2);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: initialTheme.groundWireColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const atmoRing = new THREE.Mesh(atmoGeo, atmoMat);
    atmoRing.position.y = -20;
    scene.add(atmoRing);

    // 7. Interactive Clustered Props
    const interactiveProps: InteractiveProp[] = [];
    const clickableMeshes: THREE.Object3D[] = [];

    const getModeNote = (index: number) => {
      const mode: MusicalMode = MUSICAL_MODES[modeRef.current] || MUSICAL_MODES.dorian;
      const noteIdx = Math.abs(index) % mode.notes.length;
      return {
        freq: mode.notes[noteIdx],
        name: mode.noteNames[noteIdx],
        noteName: mode.noteNames[noteIdx],
      };
    };

    // Shared Materials
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x361f14, roughness: 0.88 });
    const woodCoreMat = new THREE.MeshStandardMaterial({ color: 0xd97736, roughness: 0.65 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x442617, roughness: 0.85 });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x93a5be,
      roughness: 0.18,
      metalness: 0.82,
    });

    const pineMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(initialTheme.foliageHue, 0.74, initialTheme.foliageLightness),
      roughness: 0.35,
      metalness: 0.22,
    });

    const bushMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(initialTheme.foliageHue, 0.6, initialTheme.foliageLightness * 0.9),
      roughness: 0.6,
    });

    const mushroomCapMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(initialTheme.accentColor),
      roughness: 0.25,
      metalness: 0.35,
      emissive: new THREE.Color(initialTheme.sporeColor),
      emissiveIntensity: 0.45,
    });

    const mushroomStemMat = new THREE.MeshStandardMaterial({
      color: 0xe0e7ff,
      roughness: 0.5,
    });

    const saplingLeafMat = new THREE.MeshStandardMaterial({ color: 0x4f9b58, roughness: 0.82 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x527d45, roughness: 1.0 });
    const flowerStemMat = new THREE.MeshStandardMaterial({ color: 0x4d8b48, roughness: 0.9 });
    const flowerPetalMat = new THREE.MeshStandardMaterial({
      color: 0xd98bc7, roughness: 0.55, emissive: 0x542044, emissiveIntensity: 0.12,
    });
    const flowerCenterMat = new THREE.MeshStandardMaterial({ color: 0xf4cf69, roughness: 0.55 });

    const registerProp = (
      group: THREE.Group,
      type: InteractiveProp['type'],
      freq: number,
      noteName: string,
      name: string,
      glowMesh?: THREE.Mesh,
      subtype?: number
    ) => {
      group.userData = { isProp: true, type, freq, noteName, name, subtype };
      scene.add(group);
      clickableMeshes.push(group);
      interactiveProps.push({
        group,
        type,
        originalScale: group.scale.clone(),
        animTimer: 0,
        freq,
        noteName,
        name,
        glowMesh,
        subtype,
      });
    };

    // Wildlife stationary habitats & ambient synthesizer setup
    const forestAnimals: ForestAnimal[] = [];
    const animalMats = {
      cream: new THREE.MeshStandardMaterial({ color: 0xf0dfbd, roughness: 0.82, emissive: 0x3b2916, emissiveIntensity: 0.12 }),
      brown: new THREE.MeshStandardMaterial({ color: 0xa66a43, roughness: 0.82, emissive: 0x241006, emissiveIntensity: 0.14 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x292b32, roughness: 0.82 }),
      tan: new THREE.MeshStandardMaterial({ color: 0xd6a064, roughness: 0.82, emissive: 0x39200b, emissiveIntensity: 0.12 }),
      white: new THREE.MeshStandardMaterial({ color: 0xfff7e8, roughness: 0.65, emissive: 0x55442c, emissiveIntensity: 0.12 }),
      green: new THREE.MeshStandardMaterial({ color: 0x91c96a, roughness: 0.78, emissive: 0x1b3810, emissiveIntensity: 0.16 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xf0c779, roughness: 0.68, emissive: 0x53340b, emissiveIntensity: 0.14 }),
      eye: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35 }),
      glow: new THREE.MeshStandardMaterial({ color: 0xc4b5fd, emissive: 0x8b5cf6, emissiveIntensity: 1.4 }),
    };
    const animalSphere = new THREE.SphereGeometry(1, 16, 12);
    const animalCone = new THREE.ConeGeometry(0.16, 0.55, 8);

    const makeAnimal = (
      kind: ForestAnimal['kind'],
      x: number,
      z: number,
      freq: number,
      character: number
    ) => {
      const group = new THREE.Group();
      let ears: THREE.Object3D[] = [];
      let head: THREE.Object3D | undefined;
      let wings: THREE.Object3D[] = [];
      let antenna: THREE.Object3D[] = [];

      const addPart = (
        geo: THREE.BufferGeometry,
        mat: THREE.Material,
        px: number, py: number, pz: number,
        sx: number, sy: number, sz: number,
        rz = 0
      ) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(px, py, pz);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.z = rz;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      };

      const eyes = (mat = animalMats.eye) => {
        addPart(animalSphere, mat, -0.19, 0.55, -0.34, 0.055, 0.065, 0.04);
        addPart(animalSphere, mat, 0.19, 0.55, -0.34, 0.055, 0.065, 0.04);
      };

      if (kind === 'bunny') {
        addPart(animalSphere, animalMats.cream, 0, 0.35, 0, 0.34, 0.29, 0.48);
        head = addPart(animalSphere, animalMats.cream, 0, 0.62, -0.34, 0.27, 0.27, 0.27);
        const earL = addPart(animalSphere, animalMats.cream, -0.13, 1.0, -0.37, 0.09, 0.36, 0.09, -0.12);
        const earR = addPart(animalSphere, animalMats.cream, 0.13, 1.0, -0.37, 0.09, 0.36, 0.09, 0.12);
        ears = [earL, earR];
        eyes();
      } else if (kind === 'deer') {
        addPart(animalSphere, animalMats.tan, 0, 0.55, 0.05, 0.34, 0.42, 0.62);
        head = addPart(animalSphere, animalMats.tan, 0, 0.88, -0.42, 0.2, 0.27, 0.23);
        addPart(animalSphere, animalMats.dark, 0, 0.8, -0.62, 0.12, 0.1, 0.1);
        for (const s of [-1, 1]) {
          addPart(animalSphere, animalMats.tan, s * 0.2, 0.35, -0.02, 0.09, 0.34, 0.09);
          addPart(animalCone, animalMats.gold, s * 0.13, 1.2, -0.4, 0.45, 0.65, 0.45, s * -0.25);
          addPart(animalCone, animalMats.gold, s * 0.34, 1.28, -0.4, 0.28, 0.48, 0.28, s * 0.35);
        }
        eyes(animalMats.eye);
      } else if (kind === 'bear') {
        addPart(animalSphere, animalMats.brown, 0, 0.48, 0.02, 0.48, 0.48, 0.52);
        head = addPart(animalSphere, animalMats.brown, 0, 0.88, -0.36, 0.34, 0.33, 0.3);
        addPart(animalSphere, animalMats.brown, -0.26, 1.13, -0.37, 0.13, 0.13, 0.12);
        addPart(animalSphere, animalMats.brown, 0.26, 1.13, -0.37, 0.13, 0.13, 0.12);
        addPart(animalSphere, animalMats.cream, 0, 0.78, -0.62, 0.19, 0.14, 0.12);
        eyes();
      } else if (kind === 'frog') {
        addPart(animalSphere, animalMats.green, 0, 0.22, 0, 0.4, 0.22, 0.34);
        addPart(animalSphere, animalMats.green, -0.23, 0.45, -0.18, 0.15, 0.16, 0.15);
        addPart(animalSphere, animalMats.green, 0.23, 0.45, -0.18, 0.15, 0.16, 0.15);
        addPart(animalSphere, animalMats.eye, -0.23, 0.49, -0.3, 0.06, 0.07, 0.05);
        addPart(animalSphere, animalMats.eye, 0.23, 0.49, -0.3, 0.06, 0.07, 0.05);
      } else if (kind === 'owl' || kind === 'nightAngel' || kind === 'asianCuckoo') {
        const bodyMat = kind === 'owl' ? animalMats.tan : (kind === 'nightAngel' ? animalMats.glow : animalMats.brown);
        addPart(animalSphere, bodyMat, 0, 0.58, 0, 0.32, 0.43, 0.3);
        head = addPart(animalSphere, bodyMat, 0, 0.9, -0.12, 0.28, 0.27, 0.25);
        addPart(animalSphere, animalMats.white, -0.13, 0.91, -0.34, 0.12, 0.13, 0.05);
        addPart(animalSphere, animalMats.white, 0.13, 0.91, -0.34, 0.12, 0.13, 0.05);
        eyes();
        addPart(animalCone, animalMats.gold, 0, 0.75, -0.39, 0.45, 0.45, 0.45);
        const wL = addPart(animalSphere, bodyMat, -0.33, 0.58, 0, 0.28, 0.12, 0.22, -0.22);
        const wR = addPart(animalSphere, bodyMat, 0.33, 0.58, 0, 0.28, 0.12, 0.22, 0.22);
        wings = [wL, wR];
      } else if (kind === 'cricket') {
        addPart(animalSphere, animalMats.green, 0, 0.18, 0, 0.16, 0.12, 0.34);
        addPart(animalSphere, animalMats.green, 0, 0.24, -0.28, 0.12, 0.1, 0.12);
        const a1 = addPart(animalCone, animalMats.green, -0.06, 0.38, -0.32, 0.06, 0.4, 0.06, -0.2);
        const a2 = addPart(animalCone, animalMats.green, 0.06, 0.38, -0.32, 0.06, 0.4, 0.06, 0.2);
        antenna = [a1, a2];
        for (const s of [-1, 1]) {
          addPart(animalCone, animalMats.green, s * 0.18, 0.13, 0.02, 0.35, 0.5, 0.35, s * 0.8);
          addPart(animalCone, animalMats.green, s * 0.16, 0.2, -0.22, 0.18, 0.5, 0.18, s * -0.5);
        }
      }

      const y = getLittlePlanetHeight(x, z);
      group.position.set(x, y + 0.06, z);
      group.scale.setScalar(1.38);
      group.userData = { isAnimal: true, kind, freq, character };
      scene.add(group);

      const names: Record<ForestAnimal['kind'], string> = {
        bunny: 'Forest Bunny', deer: 'Grove Deer', bear: 'Woodland Bear', frog: 'Pond Frogs',
        owl: 'Moonlit Owl', nightAngel: 'Night Angel', asianCuckoo: 'Asian Cuckoo', cricket: 'Forest Crickets',
      };

      forestAnimals.push({
        group, kind, label: names[kind], anchorX: x, anchorZ: z,
        zoneRadius: kind === 'cricket' ? 7.5 : 8.5, freq,
        wasInside: false, lastSoundAt: -100, character,
        ears, head, wings, antenna
      });
    };

    // Instantiate 8 stationary animals
    makeAnimal('bunny', -16, -18, 392, 0);
    makeAnimal('deer', 24, -24, 293.66, 1);
    makeAnimal('bear', -27, 20, 196, 2);
    makeAnimal('frog', 7.4, -2.8, 523.25, 3);
    makeAnimal('owl', 0, -35, 349.23, 4);
    makeAnimal('nightAngel', -2, 35, 587.33, 5);
    makeAnimal('asianCuckoo', 27, 25, 440, 6);
    makeAnimal('cricket', -27, -23, 659.25, 7);

    // Optimized Organic Pond Setup
    const pondCenter = new THREE.Vector2(0, 0);
    const pondY = getLittlePlanetHeight(pondCenter.x, pondCenter.y);
    const pondRadiusBase = 5.4;

    // Organic non-circular shape using 16 polar boundary points
    const pondVerticesCount = 16;
    const pondBoundaryPoints: THREE.Vector2[] = [];
    for (let i = 0; i < pondVerticesCount; i++) {
      const angle = (i / pondVerticesCount) * Math.PI * 2;
      const radiusOffset = Math.sin(angle * 3) * 0.75 + Math.cos(angle * 2) * 0.5;
      const r = pondRadiusBase + radiusOffset;
      const px = pondCenter.x + Math.cos(angle) * r;
      const pz = pondCenter.y + Math.sin(angle) * r;
      pondBoundaryPoints.push(new THREE.Vector2(px, pz));
    }
    // Player collision follows the outside lip of the entire ditch, not just the water edge.
    const pondCollisionBoundaryPoints = pondBoundaryPoints.map((pt) =>
      new THREE.Vector2(pondCenter.x + (pt.x - pondCenter.x) * 1.65, pondCenter.y + (pt.y - pondCenter.y) * 1.65)
    );

    // Organic Pond Shape
    const pondShape = new THREE.Shape();
    pondBoundaryPoints.forEach((pt, idx) => {
      const localX = pt.x - pondCenter.x;
      const localZ = pt.y - pondCenter.y;
      if (idx === 0) pondShape.moveTo(localX, localZ);
      else pondShape.lineTo(localX, localZ);
    });

    const pondGeo = new THREE.ShapeGeometry(pondShape, 24);
    const posPond = pondGeo.attributes.position;
    const colors = new Float32Array(posPond.count * 3);

    const cCenter = new THREE.Color(0x133d47);
    const cEdge = new THREE.Color(0x286f82);

    for (let i = 0; i < posPond.count; i++) {
      const vx = posPond.getX(i);
      const vz = posPond.getY(i);
      const distFromCenter = Math.hypot(vx, vz) / pondRadiusBase;
      const alpha = Math.min(1, Math.max(0, distFromCenter));
      const vertexColor = cCenter.clone().lerp(cEdge, alpha);
      colors[i * 3] = vertexColor.r;
      colors[i * 3 + 1] = vertexColor.g;
      colors[i * 3 + 2] = vertexColor.b;
    }
    // Conform every pond vertex to the curved terrain so the water sits on the ground.
    for (let i = 0; i < posPond.count; i++) {
      const worldX = pondCenter.x + posPond.getX(i);
      const worldZ = pondCenter.y - posPond.getY(i);
      posPond.setZ(i, getLittlePlanetHeight(worldX, worldZ) - pondY - 0.92);
    }
    posPond.needsUpdate = true;
    pondGeo.computeVertexNormals();
    pondGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Use an unlit, opaque-enough water surface so the pond remains visible
    // in dark biomes and is not lost against the terrain lighting.
    const pondWaterMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: false,
      opacity: 1,
      vertexColors: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      toneMapped: false,
    });

    const pondWater = new THREE.Mesh(pondGeo, pondWaterMat);
    pondWater.rotation.x = -Math.PI / 2;
    pondWater.position.set(pondCenter.x, pondY, pondCenter.y);
    pondWater.renderOrder = 3;
    scene.add(pondWater);

    // Draw only the shoreline outline (not a wireframe-filled second surface).
    const shorePoints: THREE.Vector3[] = pondBoundaryPoints.map((pt) => new THREE.Vector3(
      pt.x,
      getLittlePlanetHeight(pt.x, pt.y) + 0.10,
      pt.y,
    ));
    const shoreGeo = new THREE.BufferGeometry().setFromPoints(shorePoints);
    const shoreMat = new THREE.LineBasicMaterial({
      color: 0x83a96b,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    });
    const shoreRing = new THREE.LineLoop(shoreGeo, shoreMat);
    shoreRing.renderOrder = 4;
    scene.add(shoreRing);

    // Pond Plants (Lotus & Cattails)
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0x477f62, roughness: 0.75, side: THREE.DoubleSide });
    const lotusPetalMat = new THREE.MeshStandardMaterial({ color: 0xe9a9cf, emissive: 0x5c294b, emissiveIntensity: 0.18, roughness: 0.55, side: THREE.DoubleSide });
    const cattailMat = new THREE.MeshStandardMaterial({ color: 0x6e8a4d, roughness: 0.9 });
    const cattailHeadMat = new THREE.MeshStandardMaterial({ color: 0x79513b, roughness: 0.9 });
    const pondPlants: { group: THREE.Group; freq: number; phase: number; type: 'lotus' | 'cattail' }[] = [];

    const addPondPlant = (x: number, z: number, type: 'lotus' | 'cattail', freq: number, phase: number) => {
      const g = new THREE.Group();
      if (type === 'lotus') {
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.62, 9), lotusMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = 0.16;
        g.add(pad);
        const flower = new THREE.Group();
        for (let i = 0; i < 7; i++) {
          const a = (i * Math.PI * 2) / 7;
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), lotusPetalMat);
          p.position.set(Math.cos(a) * 0.19, 0.39, Math.sin(a) * 0.19);
          p.scale.set(0.7, 1.0, 0.55);
          flower.add(p);
        }
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), animalMats.gold);
        center.position.y = 0.4;
        flower.add(center);
        g.add(flower);
      } else {
        for (let i = 0; i < 3; i++) {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.2 + i * 0.15, 5), cattailMat);
          stem.position.set((i - 1) * 0.2, 0.68, 0);
          stem.rotation.z = (i - 1) * 0.12;
          g.add(stem);
          const head = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.38, 6), cattailHeadMat);
          head.position.set((i - 1) * 0.2, 1.42 + i * 0.15, 0);
          g.add(head);
        }
      }
      g.position.set(x, getLittlePlanetHeight(x, z) + 0.025, z);
      scene.add(g);
      pondPlants.push({ group: g, freq, phase, type });
    };

    addPondPlant(-2.2, -1.0, 'lotus', 659.25, 0.2);
    addPondPlant(2.0, 1.8, 'lotus', 783.99, 1.1);
    addPondPlant(1.8, -2.0, 'lotus', 587.33, 2.0);
    addPondPlant(-3.5, 1.9, 'cattail', 261.63, 2.8);
    addPondPlant(3.6, -0.8, 'cattail', 293.66, 3.5);

    // 2D Polygon Point-In-Polygon Collision Checker for Irregular Pond Edge
    const isPointInPolygon = (pt: THREE.Vector2, poly: THREE.Vector2[]) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
            (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    // 6 Clustered Little-Planet Grove Coordinates
    const groveCenters = [
      { x: -25, z: -22 },
      { x: 26, z: -26 },
      { x: -28, z: 24 },
      { x: 27, z: 27 },
      { x: 0, z: -38 },
      { x: -2, z: 36 },
    ];

    const getClusteredPosition = (index: number, maxRadius: number) => {
      const grove = groveCenters[index % groveCenters.length];
      const offsetRadius = Math.random() * maxRadius;
      const angle = Math.random() * Math.PI * 2;
      const x = grove.x + Math.cos(angle) * offsetRadius;
      const z = grove.z + Math.sin(angle) * offsetRadius;
      return { x, z, y: getLittlePlanetHeight(x, z) };
    };

    // --- A. Clustered Crystal Pines ---
    const pineCount = 68;
    for (let i = 0; i < pineCount; i++) {
      const treeGroup = new THREE.Group();
      const isElder = i % 8 === 0;
      const scaleRatio = (isElder ? 1.45 : 0.8) + Math.random() * 0.4;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 2.4 * scaleRatio, 7), trunkMat);
      trunk.position.y = 1.2 * scaleRatio;
      treeGroup.add(trunk);

      const f1 = new THREE.Mesh(new THREE.ConeGeometry(2.1 * scaleRatio, 2.6 * scaleRatio, 7), pineMat);
      f1.position.y = 2.4 * scaleRatio;
      f1.rotation.y = Math.random();

      const f2 = new THREE.Mesh(new THREE.ConeGeometry(1.6 * scaleRatio, 2.2 * scaleRatio, 7), pineMat);
      f2.position.y = 3.6 * scaleRatio;
      f2.rotation.y = Math.random();

      const f3 = new THREE.Mesh(new THREE.ConeGeometry(1.1 * scaleRatio, 1.8 * scaleRatio, 7), pineMat);
      f3.position.y = 4.8 * scaleRatio;
      f3.rotation.y = Math.random();

      const topperMat = new THREE.MeshBasicMaterial({
        color: initialTheme.fireflyColor,
        wireframe: true,
      });
      const topper = new THREE.Mesh(new THREE.OctahedronGeometry(0.4 * scaleRatio, 0), topperMat);
      topper.position.y = 6.0 * scaleRatio;

      treeGroup.add(f1, f2, f3, topper);

      const pos = getClusteredPosition(i, 20);
      treeGroup.position.set(pos.x, pos.y, pos.z);
      treeGroup.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i);
      registerProp(treeGroup, 'tree', note.freq, note.noteName, `Crystal Pine (${note.name})`, topper);
    }

    // --- B. Bioluminescent Spore Mushrooms ---
    const mushroomCount = 26;
    const mushroomSubtypeNames = [
      'Liquid Bubble Spore',
      'Lucid FM Bell',
      'Deep Fungal Thump',
      'Crystal Spore Shimmer',
    ];

    for (let i = 0; i < mushroomCount; i++) {
      const shroomGroup = new THREE.Group();
      const mScale = 0.75 + Math.random() * 0.6;
      const subtype = i % 4;

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * mScale, 0.28 * mScale, 1.2 * mScale, 8),
        mushroomStemMat
      );
      stem.position.y = 0.6 * mScale;

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.85 * mScale, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mushroomCapMat
      );
      cap.position.y = 1.2 * mScale;

      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12 * mScale, 6, 6), dotMat);
      dot.position.set(0.3 * mScale, 1.6 * mScale, 0.3 * mScale);

      shroomGroup.add(stem, cap, dot);

      const pos = getClusteredPosition(i + 2, 16);
      shroomGroup.position.set(pos.x, pos.y, pos.z);
      shroomGroup.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i + 4);
      const freqMultiplier = subtype === 2 ? 0.75 : 1.25;
      registerProp(
        shroomGroup,
        'mushroom',
        note.freq * freqMultiplier,
        note.noteName,
        `${mushroomSubtypeNames[subtype]} (${note.name})`,
        cap,
        subtype
      );
    }

    // --- C. Wood Stumps ---
    const stumpCount = 26;
    for (let i = 0; i < stumpCount; i++) {
      const stumpGroup = new THREE.Group();
      const outerBark = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.85, 8), trunkMat);
      outerBark.position.y = 0.42;

      const innerWood = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 8), woodCoreMat);
      innerWood.position.y = 0.85;

      stumpGroup.add(outerBark, innerWood);

      const pos = getClusteredPosition(i + 5, 18);
      stumpGroup.position.set(pos.x, pos.y, pos.z);
      stumpGroup.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i + 2);
      registerProp(stumpGroup, 'stump', note.freq * 0.72, note.noteName, `Wood Tongue Drum (${note.name})`);
    }

    // --- D. Fallen Marimba Logs ---
    const logCount = 22;
    for (let i = 0; i < logCount; i++) {
      const logGroup = new THREE.Group();
      const mainLog = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.52, 3.8, 8), logMat);
      mainLog.rotation.z = Math.PI / 2;
      mainLog.position.y = 0.45;

      const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 7), woodCoreMat);
      cap1.rotation.z = Math.PI / 2;
      cap1.position.set(-1.91, 0.45, 0);

      const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 7), woodCoreMat);
      cap2.rotation.z = Math.PI / 2;
      cap2.position.set(1.91, 0.45, 0);

      logGroup.add(mainLog, cap1, cap2);

      const pos = getClusteredPosition(i + 8, 20);
      logGroup.position.set(pos.x, pos.y, pos.z);
      logGroup.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i + 5);
      registerProp(logGroup, 'log', note.freq * 0.88, note.noteName, `Marimba Log (${note.name})`);
    }

    // --- E. Lithophone Mineral Stones ---
    const stoneCount = 28;
    for (let i = 0; i < stoneCount; i++) {
      const stoneGroup = new THREE.Group();
      const s1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), stoneMat);
      s1.position.set(0, 0.7, 0);
      s1.rotation.set(Math.random(), Math.random(), Math.random());

      const s2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), stoneMat);
      s2.position.set(0.7, 0.45, 0.3);

      const s3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), stoneMat);
      s3.position.set(-0.65, 0.35, -0.25);

      stoneGroup.add(s1, s2, s3);

      const pos = getClusteredPosition(i + 12, 22);
      stoneGroup.position.set(pos.x, pos.y, pos.z);

      const note = getModeNote(i + 7);
      registerProp(stoneGroup, 'stone', note.freq * 1.55, note.noteName, `Mineral Stone (${note.name})`);
    }

    // --- F. Foliage Bushes ---
    const bushCount = 38;
    for (let i = 0; i < bushCount; i++) {
      const bushGroup = new THREE.Group();
      const b1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), bushMat);
      b1.position.set(0, 0.65, 0);

      const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), bushMat);
      b2.position.set(0.65, 0.5, 0.3);

      const b3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), bushMat);
      b3.position.set(-0.6, 0.5, -0.25);

      bushGroup.add(b1, b2, b3);

      const pos = getClusteredPosition(i + 15, 24);
      bushGroup.position.set(pos.x, pos.y, pos.z);

      registerProp(bushGroup, 'bush', 850, 'Rustle', `Foliage Bush #${i + 1}`);
    }

    // --- G. Tiny Saplings ---
    const saplingCount = 24;
    for (let i = 0; i < saplingCount; i++) {
      const sapling = new THREE.Group();
      const scale = 0.62 + Math.random() * 0.32;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.095, 1.05 * scale, 6), trunkMat);
      stem.position.y = 0.52 * scale;
      const leafA = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 7, 6), saplingLeafMat);
      leafA.position.set(0, 1.05 * scale, 0);
      const leafB = new THREE.Mesh(new THREE.SphereGeometry(0.27 * scale, 7, 6), saplingLeafMat);
      leafB.position.set(0.22 * scale, 0.82 * scale, 0.12 * scale);
      const leafC = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 7, 6), saplingLeafMat);
      leafC.position.set(-0.2 * scale, 0.78 * scale, -0.1 * scale);
      sapling.add(stem, leafA, leafB, leafC);
      const pos = getClusteredPosition(i + 31, 25);
      sapling.position.set(pos.x, pos.y, pos.z);
      sapling.rotation.y = Math.random() * Math.PI * 2;
      const note = getModeNote(i + 1);
      registerProp(sapling, 'sapling', note.freq * 0.82, note.noteName, `Young Sapling (${note.name})`);
    }

    // --- H. Moss-Covered Sticks ---
    const mossStickCount = 30;
    for (let i = 0; i < mossStickCount; i++) {
      const stick = new THREE.Group();
      const length = 1.25 + Math.random() * 1.05;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, length, 6), logMat);
      branch.rotation.z = Math.PI / 2;
      branch.position.y = 0.13;
      const mossPatch1 = new THREE.Mesh(new THREE.SphereGeometry(0.19, 6, 5), mossMat);
      mossPatch1.scale.set(1.5, 0.48, 0.8);
      mossPatch1.position.set(-0.25, 0.22, 0.015);
      const mossPatch2 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), mossMat);
      mossPatch2.scale.set(1.25, 0.5, 0.8);
      mossPatch2.position.set(0.36, 0.21, -0.02);
      stick.add(branch, mossPatch1, mossPatch2);
      const pos = getClusteredPosition(i + 47, 27);
      stick.position.set(pos.x, pos.y, pos.z);
      stick.rotation.y = Math.random() * Math.PI * 2;
      const note = getModeNote(i + 3);
      registerProp(stick, 'mossStick', note.freq * 0.68, note.noteName, `Mossy Stick (${note.name})`);
    }

    // --- I. Small Wildflowers ---
    const flowerCount = 36;
    for (let i = 0; i < flowerCount; i++) {
      const flower = new THREE.Group();
      const scale = 0.7 + Math.random() * 0.45;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.72 * scale, 5), flowerStemMat);
      stem.position.y = 0.36 * scale;
      const bloom = new THREE.Group();
      const petalGeo = new THREE.SphereGeometry(0.105 * scale, 6, 5);
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeo, flowerPetalMat);
        petal.position.set(Math.cos(angle) * 0.16 * scale, 0, Math.sin(angle) * 0.16 * scale);
        petal.scale.set(1.0, 0.58, 1.45);
        bloom.add(petal);
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 7, 6), flowerCenterMat);
      bloom.add(center);
      bloom.position.y = 0.76 * scale;
      flower.add(stem, bloom);
      const pos = getClusteredPosition(i + 61, 28);
      flower.position.set(pos.x, pos.y, pos.z);
      flower.rotation.y = Math.random() * Math.PI * 2;
      const note = getModeNote(i + 6);
      registerProp(flower, 'flower', note.freq * 1.65, note.noteName, `Forest Flower (${note.name})`);
    }

    // 8. Fireflies System
    const fireflyCount = 130;
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyPositions = new Float32Array(fireflyCount * 3);
    const fireflyBaseData: { x: number; y: number; z: number; seed: number; speed: number }[] = [];

    for (let i = 0; i < fireflyCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 56;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getLittlePlanetHeight(x, z) + 0.8 + Math.random() * 4.8;
      fireflyPositions[i * 3] = x;
      fireflyPositions[i * 3 + 1] = y;
      fireflyPositions[i * 3 + 2] = z;
      fireflyBaseData.push({
        x, y, z, seed: Math.random() * 100, speed: 0.7 + Math.random() * 1.1,
      });
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: initialTheme.fireflyColor,
      size: 0.6,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
    scene.add(fireflyPoints);

    // 9. Floating Celestial Spores
    const sporeCount = 180;
    const sporeGeo = new THREE.BufferGeometry();
    const sporePositions = new Float32Array(sporeCount * 3);
    const sporeData: { x: number; y: number; z: number; speed: number; seed: number }[] = [];

    for (let i = 0; i < sporeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 55;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getLittlePlanetHeight(x, z) + Math.random() * 8.0;
      sporePositions[i * 3] = x;
      sporePositions[i * 3 + 1] = y;
      sporePositions[i * 3 + 2] = z;
      sporeData.push({
        x, y, z, speed: 0.18 + Math.random() * 0.35, seed: Math.random() * 100,
      });
    }
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePositions, 3));
    const sporeMat = new THREE.PointsMaterial({
      color: initialTheme.sporeColor,
      size: 0.35,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sporePoints = new THREE.Points(sporeGeo, sporeMat);
    scene.add(sporePoints);

    // 10. Ground Splash Systems
    const shockwaves: ShockwaveRing[] = [];
    const splashLights: SplashPointLight[] = [];
    const splashSparks: SplashSpark[] = [];

    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1.0, depthWrite: false,
    });
    const sparkGeo = new THREE.SphereGeometry(0.12, 4, 4);

    const triggerGroundSplashEffect = (x: number, y: number, z: number, colorHex: number) => {
      for (let s = 0; s < 2; s++) {
        const ringGeo = new THREE.RingGeometry(0.2, 0.55, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.95 - s * 0.25, depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(x, y + 0.08 + s * 0.02, z);
        scene.add(ringMesh);

        shockwaves.push({
          mesh: ringMesh, maxRadius: 8.5 + s * 2.5, progress: -s * 0.12,
        });
      }

      const splashLight = new THREE.PointLight(colorHex, 4.5, 18);
      splashLight.position.set(x, y + 1.2, z);
      scene.add(splashLight);
      splashLights.push({
        light: splashLight, initialIntensity: 4.5, timer: 1.0,
      });

      for (let i = 0; i < 16; i++) {
        const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
        sparkMesh.position.set(x, y + 0.3, z);
        scene.add(sparkMesh);

        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 3.5;
        const upSpeed = 3.5 + Math.random() * 4.0;
        splashSparks.push({
          mesh: sparkMesh,
          velocity: new THREE.Vector3(Math.cos(angle) * speed, upSpeed, Math.sin(angle) * speed),
          life: 1.0,
        });
      }
    };

    // 11. Two-Finger Long Vertical Swipe Gesture Recognition
    interface TwoTouchRecord {
      id0: number; id1: number; startY0: number; startY1: number; startX0: number; startX1: number;
      currentY0: number; currentY1: number; currentX0: number; currentX1: number;
      initialSpan: number; startTime: number; hasMoved: boolean; isValid: boolean;
    }

    let activeTwoTouch: TwoTouchRecord | null = null;
    let lastTwoFingerGestureTime = 0;
    let lastBiomeShiftTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const span = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);

        activeTwoTouch = {
          id0: t0.identifier, id1: t1.identifier, startY0: t0.clientY, startY1: t1.clientY,
          startX0: t0.clientX, startX1: t1.clientX, currentY0: t0.clientY, currentY1: t1.clientY,
          currentX0: t0.clientX, currentX1: t1.clientX, initialSpan: span, startTime: performance.now(),
          hasMoved: false, isValid: true,
        };
        lastTwoFingerGestureTime = Date.now();
      } else {
        if (activeTwoTouch) {
          activeTwoTouch = null;
          lastTwoFingerGestureTime = Date.now();
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeTwoTouch || e.touches.length !== 2) return;

      const t0 = Array.from(e.touches).find((t) => t.identifier === activeTwoTouch!.id0);
      const t1 = Array.from(e.touches).find((t) => t.identifier === activeTwoTouch!.id1);
      if (!t0 || !t1) {
        activeTwoTouch.isValid = false;
        return;
      }

      activeTwoTouch.currentX0 = t0.clientX; activeTwoTouch.currentY0 = t0.clientY;
      activeTwoTouch.currentX1 = t1.clientX; activeTwoTouch.currentY1 = t1.clientY;
      activeTwoTouch.hasMoved = true;

      const currentSpan = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      if (Math.abs(currentSpan - activeTwoTouch.initialSpan) > 95) {
        activeTwoTouch.isValid = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!activeTwoTouch) return;
      lastTwoFingerGestureTime = Date.now();

      if (activeTwoTouch.isValid && activeTwoTouch.hasMoved) {
        const dy0 = activeTwoTouch.currentY0 - activeTwoTouch.startY0;
        const dy1 = activeTwoTouch.currentY1 - activeTwoTouch.startY1;
        const dx0 = activeTwoTouch.currentX0 - activeTwoTouch.startX0;
        const dx1 = activeTwoTouch.currentX1 - activeTwoTouch.startX1;

        const avgDY = (dy0 + dy1) / 2;
        const avgDX = (dx0 + dx1) / 2;

        const LONG_SWIPE_MIN_DISTANCE = 130;
        const hasLongTravel =
          Math.abs(dy0) >= LONG_SWIPE_MIN_DISTANCE &&
          Math.abs(dy1) >= LONG_SWIPE_MIN_DISTANCE &&
          Math.abs(avgDY) >= LONG_SWIPE_MIN_DISTANCE;

        const isParallel = Math.sign(dy0) === Math.sign(dy1);
        const isStrictlyVertical = Math.abs(avgDY) > Math.abs(avgDX) * 2.0;

        const now = Date.now();
        const canShift = now - lastBiomeShiftTime > 800;

        if (hasLongTravel && isParallel && isStrictlyVertical && canShift) {
          lastBiomeShiftTime = now;
          const currentIndex = THEME_KEYS_ORDER.indexOf(themeRef.current);
          let nextIndex: number;
          if (avgDY < 0) {
            nextIndex = (currentIndex + 1) % THEME_KEYS_ORDER.length;
          } else {
            nextIndex = (currentIndex - 1 + THEME_KEYS_ORDER.length) % THEME_KEYS_ORDER.length;
          }
          const nextTheme = THEME_KEYS_ORDER[nextIndex];
          onThemeCycleRef.current?.(nextTheme);
        }
      }

      activeTwoTouch = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    // Tap Nearest Tree Action
    const tapNearestTree = () => {
      const playerPos = camera.position;
      const trees = interactiveProps
        .filter((p) => p.type === 'tree')
        .map((p) => ({ prop: p, dist: p.group.position.distanceTo(playerPos) }))
        .sort((a, b) => a.dist - b.dist);

      if (trees.length > 0) {
        triggerPropSound(trees[0].prop);
      }
    };

    const handleCustomTreeTap = () => {
      tapNearestTree();
    };
    window.addEventListener('synth-tap-tree', handleCustomTreeTap);

    // Keyboard shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;
      keysDown[e.code] = true;

      if (e.code === 'KeyT' || e.code === 'KeyE') {
        tapNearestTree();
      }

      if (e.code === 'KeyB') {
        const currentIndex = THEME_KEYS_ORDER.indexOf(themeRef.current);
        const nextTheme = THEME_KEYS_ORDER[(currentIndex + 1) % THEME_KEYS_ORDER.length];
        onThemeCycleRef.current?.(nextTheme);
      }

      if (e.code === 'Space') {
        e.preventDefault();
        pulseNearbyProps();
      }
    };

    const keysDown: Record<string, boolean> = {};
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse / Touch Look Dragging
    let isMouseDragging = false;
    let lookTouchId: number | null = null;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let cameraYaw = 0;
    let cameraPitch = 0;

    const applyLookDelta = (clientX: number, clientY: number) => {
      const deltaX = clientX - prevPointerX;
      const deltaY = clientY - prevPointerY;
      prevPointerX = clientX;
      prevPointerY = clientY;

      const sens = 0.003;
      cameraYaw -= deltaX * sens;
      cameraPitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, cameraPitch - deltaY * sens));

      camera.rotation.set(0, 0, 0);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = cameraYaw;
      camera.rotation.x = cameraPitch;
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if ((e.target as HTMLElement)?.closest('.no-scene-drag')) return;

      if ('touches' in e) {
        const lookTouch = Array.from(e.changedTouches).find(
          touch => touch.clientX >= window.innerWidth * 0.65
        );
        if (!lookTouch) return;
        lookTouchId = lookTouch.identifier;
        prevPointerX = lookTouch.clientX;
        prevPointerY = lookTouch.clientY;
        return;
      }

      isMouseDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e) {
        if (lookTouchId === null) return;
        const touch = Array.from(e.changedTouches).find(item => item.identifier === lookTouchId);
        if (!touch) return;
        applyLookDelta(touch.clientX, touch.clientY);
        return;
      }
      if (!isMouseDragging) return;
      applyLookDelta(e.clientX, e.clientY);
    };

    const onPointerUp = (e?: MouseEvent | TouchEvent) => {
      if (e && 'changedTouches' in e && lookTouchId !== null) {
        if (Array.from(e.changedTouches).some(item => item.identifier === lookTouchId)) {
          lookTouchId = null;
        }
        return;
      }
      isMouseDragging = false;
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });
    window.addEventListener('touchcancel', onPointerUp, { passive: true });

    // 12. Sound Triggering on Prop Click & Animal Touch
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const triggerNaturePad = (freq: number, character: number = 0) => {
      audioEngine.triggerNaturePad(freq, character);
    };

    const triggerPropSound = (prop: InteractiveProp) => {
      prop.animTimer = 1.0;
      triggerGroundSplashEffect(
        prop.group.position.x,
        prop.group.position.y,
        prop.group.position.z,
        initialTheme.groundWireColor
      );

      switch (prop.type) {
        case 'tree':
          audioEngine.triggerTreeTap(prop.freq);
          break;
        case 'mushroom':
          audioEngine.triggerMushroomSound(prop.freq, prop.subtype ?? 0);
          break;
        case 'stump':
          audioEngine.triggerWoodDrum(prop.freq);
          break;
        case 'log':
          audioEngine.triggerWoodDrum(prop.freq * 1.35);
          break;
        case 'stone':
          audioEngine.triggerStoneChime(prop.freq);
          break;
        case 'bush':
          audioEngine.triggerBushNoiseImpact(0.85);
          break;
        case 'sapling':
          audioEngine.triggerTreeTap(prop.freq);
          break;
        case 'mossStick':
          audioEngine.triggerWoodDrum(prop.freq);
          break;
        case 'flower':
          audioEngine.triggerChime(prop.freq, 0.58);
          break;
      }

      onObjectPlayedRef.current?.(prop.type, prop.name, prop.freq, prop.noteName);
    };

    const pulseNearbyProps = () => {
      const playerPos = camera.position;
      const groundY = getLittlePlanetHeight(playerPos.x, playerPos.z);
      triggerGroundSplashEffect(playerPos.x, groundY, playerPos.z, 0xffffff);

      const nearby = interactiveProps
        .map((p) => ({
          prop: p,
          dist: p.group.position.distanceTo(playerPos),
        }))
        .filter((item) => item.dist < 15)
        .sort((a, b) => a.dist - b.dist);

      if (nearby.length === 0) {
        audioEngine.triggerGroundSplash(55);
        onObjectPlayedRef.current?.('ground', 'Forest Resonance Pulse', 55, 'A1');
        return;
      }

      nearby.forEach((item, idx) => {
        setTimeout(() => {
          triggerPropSound(item.prop);
        }, idx * 110);
      });
    };

    const performSceneInteraction = (clientX: number, clientY: number) => {
      pointer.x = (clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // Animal Raycast Detection
      const animalHits = raycaster.intersectObjects(
        forestAnimals.map((animal) => animal.group),
        true
      );
      if (animalHits.length > 0) {
        let root: THREE.Object3D | null = animalHits[0].object;
        while (root && !forestAnimals.some((a) => a.group === root) && root.parent) {
          root = root.parent;
        }
        const animal = forestAnimals.find((a) => a.group === root);
        if (animal) {
          audioEngine.triggerAnimalChord(animal.freq, animal.character);
          return;
        }
      }

      // Prop Raycast Detection
      const intersects = raycaster.intersectObjects(clickableMeshes, true);
      if (intersects.length > 0) {
        let top: THREE.Object3D | null = intersects[0].object;
        while (top && !top.userData?.isProp && top.parent) {
          top = top.parent;
        }
        if (top && top.userData?.isProp) {
          const hit = interactiveProps.find((p) => p.group === top);
          if (hit) {
            triggerPropSound(hit);
            return;
          }
        }
      }

      // Pond Plants Raycast
      const plantHits = raycaster.intersectObjects(pondPlants.map((p) => p.group), true);
      if (plantHits.length > 0) {
        let root: THREE.Object3D | null = plantHits[0].object;
        while (root && !pondPlants.some((p) => p.group === root) && root.parent) root = root.parent;
        const plant = pondPlants.find((p) => p.group === root);
        if (plant) { triggerNaturePad(plant.freq, plant.type === 'lotus' ? 1 : 2); return; }
      }

      // Ground Splash Raycast
      const groundHit = raycaster.intersectObject(terrainMesh);
      if (groundHit.length > 0) {
        const pt = groundHit[0].point;
        triggerGroundSplashEffect(pt.x, pt.y, pt.z, initialTheme.groundWireColor);
        const groundFreq = 50 + (Math.abs(pt.x + pt.z) % 65);
        audioEngine.triggerGroundSplash(groundFreq);
        onObjectPlayedRef.current?.('ground', 'Ground Splash Impact', groundFreq, 'G1');
      }
    };

    const onSceneClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('.no-scene-drag')) return;
      if (Date.now() - lastTouchTapTime < 500) return;
      if (Date.now() - lastTwoFingerGestureTime < 450) return;
      performSceneInteraction(e.clientX, e.clientY);
    };

    type SceneTouchTap = { x: number; y: number; startX: number; startY: number; startedAt: number; moved: boolean; eligible: boolean };
    const sceneTouchTaps = new Map<number, SceneTouchTap>();
    let lastTouchTapTime = 0;
    const isSceneControl = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('.no-scene-drag, button, input, select, textarea, [role="button"]'));

    const onSceneTouchStart = (e: TouchEvent) => {
      if (isSceneControl(e.target)) return;
      Array.from(e.changedTouches).forEach((touch) => {
        const eligible = touch.clientX >= window.innerWidth * 0.65;
        sceneTouchTaps.set(touch.identifier, {
          x: touch.clientX, y: touch.clientY,
          startX: touch.clientX, startY: touch.clientY,
          startedAt: performance.now(), moved: false, eligible,
        });
      });
    };

    const onSceneTouchMove = (e: TouchEvent) => {
      Array.from(e.changedTouches).forEach((touch) => {
        const tap = sceneTouchTaps.get(touch.identifier);
        if (!tap) return;
        tap.x = touch.clientX;
        tap.y = touch.clientY;
        if (Math.hypot(tap.x - tap.startX, tap.y - tap.startY) > 14) tap.moved = true;
      });
    };

    const onSceneTouchEnd = (e: TouchEvent) => {
      if (e.type !== 'touchend') {
        Array.from(e.changedTouches).forEach((touch) => sceneTouchTaps.delete(touch.identifier));
        return;
      }
      Array.from(e.changedTouches).forEach((touch) => {
        const tap = sceneTouchTaps.get(touch.identifier);
        if (!tap) return;
        sceneTouchTaps.delete(touch.identifier);
        const duration = performance.now() - tap.startedAt;
        const stayedStill = !tap.moved && Math.hypot(touch.clientX - tap.startX, touch.clientY - tap.startY) <= 14;
        if (tap.eligible && stayedStill && duration <= 700 && e.touches.length > 0) {
          lastTouchTapTime = Date.now();
          performSceneInteraction(touch.clientX, touch.clientY);
        }
      });
    };

    window.addEventListener('touchstart', onSceneTouchStart, { passive: true });
    window.addEventListener('touchmove', onSceneTouchMove, { passive: true });
    window.addEventListener('touchend', onSceneTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onSceneTouchEnd, { passive: true });
    window.addEventListener('click', onSceneClick);

    // 13. Window Resize
    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (composer) composer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // 14. Main Animation & Render Loop
    let animFrameId = 0;
    const clock = new THREE.Clock();
    const autoPropTriggers = new Map<InteractiveProp, number>();
    let lastAutoRandomizeTime = 0;

    const renderLoop = () => {
      animFrameId = requestAnimationFrame(renderLoop);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Theme Dynamic Updating
      const activeTheme = FOREST_THEMES[themeRef.current] || FOREST_THEMES.astral;
      scene.background = new THREE.Color(activeTheme.fogColor);
      (scene.fog as THREE.FogExp2).color.set(activeTheme.fogColor);
      ambientLight.color.set(activeTheme.ambientLightColor);
      hemiLight.color.set(activeTheme.keyLightColor);
      hemiLight.groundColor.set(activeTheme.fogColor);
      dirLight.color.set(activeTheme.keyLightColor);
      terrainMat.color.set(activeTheme.groundSolidColor);
      wireMat.color.set(activeTheme.groundWireColor);
      atmoMat.color.set(activeTheme.groundWireColor);
      fireflyMat.color.set(activeTheme.fireflyColor);
      sporeMat.color.set(activeTheme.sporeColor);
      mushroomCapMat.color.set(activeTheme.accentColor);
      mushroomCapMat.emissive.set(activeTheme.sporeColor);

      // Bloom Parameters
      if (bloomPass) {
        bloomPass.enabled = bloomRef.current;
        bloomPass.strength = activeTheme.bloomStrength;
        bloomPass.radius = activeTheme.bloomRadius;
        bloomPass.threshold = activeTheme.bloomThreshold;
      }

      // Audio-Reactive Energy
      const audioEnergy = audioEngine.getAverageEnergy();
      dirLight.intensity = 1.6 + audioEnergy * 2.0;
      wireMat.opacity = 0.42 + audioEnergy * 0.48;

      // 1st-Person Movement with Keyboard & Virtual Joystick OR Auto Explore
      _moveDir.set(0, 0, 0);

      const isAutoExplore = autoExploreRef.current;

      if (isAutoExplore) {
        cameraYaw += (Math.sin(elapsed * 0.35) * 0.45 + Math.cos(elapsed * 0.17) * 0.25) * delta;
        cameraPitch = THREE.MathUtils.damp(cameraPitch, Math.sin(elapsed * 0.5) * 0.05, 2.5, delta);
        camera.rotation.set(0, 0, 0);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = cameraYaw;
        camera.rotation.x = cameraPitch;

        _moveDir.z -= 1.0;

        const playerPos = camera.position;
        for (const prop of interactiveProps) {
          const dist = prop.group.position.distanceTo(playerPos);
          if (dist < 3.8) {
            const lastTrig = autoPropTriggers.get(prop) || 0;
            if (elapsed - lastTrig > 2.2) {
              autoPropTriggers.set(prop, elapsed);
              triggerPropSound(prop);
            }
          }
        }

        if (elapsed - lastAutoRandomizeTime > 24.0) {
          lastAutoRandomizeTime = elapsed;
          audioEngine.randomizeBiomeMelody(themeRef.current);
        }
      }

      if (keysDown['KeyW'] || keysDown['ArrowUp']) _moveDir.z -= 1;
      if (keysDown['KeyS'] || keysDown['ArrowDown']) _moveDir.z += 1;
      if (keysDown['KeyA'] || keysDown['ArrowLeft']) _moveDir.x -= 1;
      if (keysDown['KeyD'] || keysDown['ArrowRight']) _moveDir.x += 1;

      const jv = joystickRef.current;
      if (jv && (Math.abs(jv.x) > 0.05 || Math.abs(jv.y) > 0.05)) {
        _moveDir.x += jv.x;
        _moveDir.z += jv.y;
      }

      if (_moveDir.lengthSq() > 0) {
        if (_moveDir.length() > 1) _moveDir.normalize();
        _euler.set(0, cameraYaw, 0, 'YXZ');
        _moveDir.applyEuler(_euler);

        const walkSpeed = isAutoExplore ? 2.1 : 2.4;
        const previousX = camera.position.x;
        const previousZ = camera.position.z;
        const nextX = previousX + _moveDir.x * walkSpeed * delta;
        const nextZ = previousZ + _moveDir.z * walkSpeed * delta;

        // Polygon Shoreline Collision Enforcement
        const nextPos = new THREE.Vector2(nextX, nextZ);
        if (!isPointInPolygon(nextPos, pondCollisionBoundaryPoints)) {
          camera.position.x = nextX;
          camera.position.z = nextZ;
        } else {
          camera.position.x = previousX;
          camera.position.z = previousZ;
        }

        // Infinite Circular Little-Planet Seamless Toroidal Wrapping
        const distFromPlanetCenter = Math.hypot(camera.position.x, camera.position.z);
        if (distFromPlanetCenter > worldBoundRadius) {
          const scale = (worldBoundRadius - 1.5) / distFromPlanetCenter;
          camera.position.x = -camera.position.x * scale;
          camera.position.z = -camera.position.z * scale;
        }
      }

      // Smooth terrain height dampening
      const targetGroundY = getLittlePlanetHeight(camera.position.x, camera.position.z);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetGroundY + 1.85, 10, delta);

      // Stationary Wildlife Idle Animations & Proximity Detection
      const playerXZ = new THREE.Vector2(camera.position.x, camera.position.z);
      for (const animal of forestAnimals) {
        // Idle Animation (Transforms remain fixed at anchorX, anchorZ)
        const breathe = Math.sin(elapsed * 2.2 + animal.freq) * 0.03;
        animal.group.scale.y = 1 + breathe;

        if (animal.ears.length >= 2) {
          const earTilt = Math.sin(elapsed * 1.5) * 0.1;
          animal.ears[0].rotation.z = -0.12 + earTilt;
          animal.ears[1].rotation.z = 0.12 - earTilt;
        }
        if (animal.head) {
          animal.head.rotation.y = Math.sin(elapsed * 0.8) * 0.12;
        }
        if (animal.wings.length >= 2) {
          const wingFlap = Math.sin(elapsed * 3.5) * 0.08;
          animal.wings[0].rotation.z = -0.22 + wingFlap;
          animal.wings[1].rotation.z = 0.22 - wingFlap;
        }
        if (animal.antenna.length >= 2) {
          const antTwitch = Math.sin(elapsed * 4.0) * 0.15;
          animal.antenna[0].rotation.z = -0.2 + antTwitch;
          animal.antenna[1].rotation.z = 0.2 - antTwitch;
        }

        // Proximity Chord Triggering
        const distance = playerXZ.distanceTo(new THREE.Vector2(animal.anchorX, animal.anchorZ));
        const inside = distance < animal.zoneRadius;
        if (inside && !animal.wasInside && elapsed - animal.lastSoundAt > 5) {
          audioEngine.triggerAnimalChord(animal.freq, animal.character);
          animal.lastSoundAt = elapsed;
        }
        animal.wasInside = inside;
      }

      for (const plant of pondPlants) {
        plant.group.rotation.y = Math.sin(elapsed * 0.35 + plant.phase) * 0.08;
      }

      // Animate Fireflies
      const fPositions = fireflyGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < fireflyCount; i++) {
        const bp = fireflyBaseData[i];
        const driftX = Math.sin(elapsed * bp.speed * 0.6 + bp.seed) * 0.5;
        const driftY = Math.cos(elapsed * bp.speed * 0.8 + bp.seed) * 0.4;
        const driftZ = Math.sin(elapsed * bp.speed * 0.4 + bp.seed * 0.6) * 0.5;

        fPositions[i * 3] = bp.x + driftX;
        fPositions[i * 3 + 1] = bp.y + driftY;
        fPositions[i * 3 + 2] = bp.z + driftZ;
      }
      fireflyGeo.attributes.position.needsUpdate = true;

      // Animate Celestial Spores
      const sPositions = sporeGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < sporeCount; i++) {
        const sp = sporeData[i];
        sPositions[i * 3 + 1] += delta * sp.speed;
        sPositions[i * 3] += Math.sin(elapsed * 0.5 + sp.seed) * 0.02;

        if (sPositions[i * 3 + 1] > targetGroundY + 9.5) {
          sPositions[i * 3 + 1] = targetGroundY + 0.3;
        }
      }
      sporeGeo.attributes.position.needsUpdate = true;

      // Animate Shockwave Rings
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.progress += delta * 1.6;
        if (sw.progress >= 1.0) {
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          (sw.mesh.material as THREE.Material).dispose();
          shockwaves.splice(i, 1);
        } else if (sw.progress > 0) {
          const scale = 1 + sw.progress * (sw.maxRadius - 1);
          sw.mesh.scale.set(scale, scale, 1);
          const mat = sw.mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = (1 - sw.progress) * 0.9;
        }
      }

      // Animate Splash Lights
      for (let i = splashLights.length - 1; i >= 0; i--) {
        const sl = splashLights[i];
        sl.timer -= delta * 2.0;
        if (sl.timer <= 0) {
          scene.remove(sl.light);
          sl.light.dispose();
          splashLights.splice(i, 1);
        } else {
          sl.light.intensity = sl.initialIntensity * Math.pow(sl.timer, 1.8);
        }
      }

      // Animate Splash Sparks
      for (let i = splashSparks.length - 1; i >= 0; i--) {
        const sp = splashSparks[i];
        sp.life -= delta * 1.5;
        if (sp.life <= 0) {
          scene.remove(sp.mesh);
          sp.mesh.geometry.dispose();
          (sp.mesh.material as THREE.Material).dispose();
          splashSparks.splice(i, 1);
        } else {
          sp.velocity.y -= 9.8 * delta;
          sp.mesh.position.addScaledVector(sp.velocity, delta);
          (sp.mesh.material as THREE.MeshBasicMaterial).opacity = sp.life;
        }
      }

      // Animate Interactive Props
      for (const prop of interactiveProps) {
        if (prop.animTimer > 0) {
          prop.animTimer = Math.max(0, prop.animTimer - delta * 3.4);
          const bounce = Math.sin(prop.animTimer * Math.PI) * 0.35;
          prop.group.scale.set(
            prop.originalScale.x * (1 + bounce),
            prop.originalScale.y * (1 - bounce * 0.45),
            prop.originalScale.z * (1 + bounce)
          );

          if (prop.glowMesh) {
            (prop.glowMesh.material as THREE.MeshStandardMaterial).emissive?.setHex(0xffffff);
          }
        } else {
          prop.group.scale.copy(prop.originalScale);
          if (prop.glowMesh) {
            (prop.glowMesh.material as THREE.MeshStandardMaterial).emissive?.set(activeTheme.sporeColor);
          }
        }
      }

      // Render Loop
      if (composer && bloomRef.current) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    renderLoop();

    // 15. Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchcancel', onPointerUp);
      window.removeEventListener('click', onSceneClick);
      window.removeEventListener('touchstart', onSceneTouchStart);
      window.removeEventListener('touchmove', onSceneTouchMove);
      window.removeEventListener('touchend', onSceneTouchEnd);
      window.removeEventListener('touchcancel', onSceneTouchEnd);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('synth-tap-tree', handleCustomTreeTap);

      shockwaves.forEach((sw) => scene.remove(sw.mesh));
      splashLights.forEach((sl) => scene.remove(sl.light));
      splashSparks.forEach((sp) => scene.remove(sp.mesh));

      terrainGeo.dispose();
      terrainMat.dispose();
      wireMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      fireflyGeo.dispose();
      fireflyMat.dispose();
      sporeGeo.dispose();
      sporeMat.dispose();
      trunkMat.dispose();
      woodCoreMat.dispose();
      logMat.dispose();
      stoneMat.dispose();
      pineMat.dispose();
      bushMat.dispose();
      mushroomCapMat.dispose();
      mushroomStemMat.dispose();
      saplingLeafMat.dispose();
      mossMat.dispose();
      flowerStemMat.dispose();
      flowerPetalMat.dispose();
      flowerCenterMat.dispose();
      animalSphere.dispose();
      animalCone.dispose();
      Object.values(animalMats).forEach((mat) => mat.dispose());
      pondWater.geometry.dispose(); pondWaterMat.dispose();
      pondBank.geometry.dispose(); bankMat.dispose();
      shoreRing.geometry.dispose(); shoreMat.dispose();
      lotusMat.dispose(); lotusPetalMat.dispose(); cattailMat.dispose(); cattailHeadMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none overflow-hidden"
    />
  );
};
