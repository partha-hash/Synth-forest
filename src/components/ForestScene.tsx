/**
 * redowan's synth forest - 3D Nature Scene
 * Features:
 * - Circular Little-Planet Curvature (curved downward horizon like an infinite celestial orb)
 * - Infinite Toroidal Wrapping: walking past the planet perimeter seamlessly loops without walls
 * - Two-Finger Sweep Gesture: swipe horizontally with 2 fingers to cycle biomes & DSP profiles
 * - UnrealBloomPass post-processing for lucid bioluminescent atmosphere
 * - Clustered dense mystical groves (Pines, Stumps, Logs, Stones, Bushes, Glowing Spore Mushrooms)
 * - Forest floor life: Saplings, Ferns, Glass Blooms, Twigs and Dripping Moss, each with its own sound
 * - Dynamic ground splash with omnidirectional point light flare, shockwaves & spark fountains
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
    type: 'tree' | 'stump' | 'log' | 'stone' | 'bush' | 'mushroom' | 'ground',
    label: string,
    freq: number,
    noteName: string
  ) => void;
}

type PropType =
  | 'tree'
  | 'stump'
  | 'log'
  | 'stone'
  | 'bush'
  | 'mushroom'
  | 'sapling'
  | 'fern'
  | 'flower'
  | 'twig'
  | 'moss';

// The type names the rest of the app already understands (used for the "last played" display)
type ReportedType = 'tree' | 'stump' | 'log' | 'stone' | 'bush' | 'mushroom';

const toReportedType = (t: PropType): ReportedType => {
  switch (t) {
    case 'sapling':
      return 'tree';
    case 'fern':
      return 'bush';
    case 'flower':
      return 'mushroom';
    case 'twig':
      return 'log';
    case 'moss':
      return 'stone';
    default:
      return t;
  }
};

// While Auto Roam is on, walking past these objects plays them automatically.
// Add 'sapling', 'fern', 'flower', 'twig' or 'moss' here if you want the floor to play itself too.
const AUTO_PLAY_TYPES = new Set<PropType>(['tree', 'mushroom', 'stump', 'log', 'stone', 'bush']);

// The Space pulse plays at most this many nearby objects (keeps it musical with a busy floor)
const MAX_PULSE_SOUNDS = 16;

interface SwayParams {
  seed: number;
  amp: number;
  speed: number;
}

interface InteractiveProp {
  group: THREE.Group;
  type: PropType;
  originalScale: THREE.Vector3;
  animTimer: number;
  freq: number;
  noteName: string;
  name: string;
  glowMesh?: THREE.Mesh;
  subtype?: number;
  sway?: SwayParams;
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
    // Planet curvature radius: curves downward gracefully towards edge
    const planetRadius = 135;
    const worldBoundRadius = 60; // Infinite wrap boundary

    const getLittlePlanetHeight = (x: number, z: number): number => {
      const distSq = x * x + z * z;
      const planetCurve = -distSq / (2 * planetRadius);
      // Gentle natural hills undulating across the planet surface
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
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const wireMesh = new THREE.Mesh(terrainGeo, wireMat);
    wireMesh.position.y += 0.04;
    scene.add(wireMesh);

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

    // 7. Interactive Clustered Props (Clustered on the Little Planet)
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

    const registerProp = (
      group: THREE.Group,
      type: InteractiveProp['type'],
      freq: number,
      noteName: string,
      name: string,
      glowMesh?: THREE.Mesh,
      subtype?: number,
      sway?: SwayParams
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
        sway,
      });
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

    // --- A. Clustered Crystal Pines (68+ trees) ---
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

    // --- B. Bioluminescent Spore Mushrooms (26+ glowing mushrooms with 4 sound varieties) ---
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

    // --- C. Wood Stumps (26+ stumps) ---
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

    // --- D. Fallen Marimba Logs (22+ logs) ---
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

    // --- E. Lithophone Mineral Stones (28+ stones) ---
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

    // --- F. Foliage Bushes (38+ bushes) ---
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

    // ------------------------------------------------------------------
    // FOREST FLOOR LIFE
    // Small, soft details that fill the ground between the big props.
    // To change how many of each appear, edit the *Count numbers below.
    // ------------------------------------------------------------------
    const floorGeos: THREE.BufferGeometry[] = [];
    const floorMats: THREE.Material[] = [];
    const flowerHeadMats: THREE.Material[] = [];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      floorGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      floorMats.push(m);
      return m;
    };

    // Floor materials
    const saplingLeafMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(
          initialTheme.foliageHue,
          0.7,
          Math.min(0.7, initialTheme.foliageLightness + 0.08)
        ),
        roughness: 0.4,
        metalness: 0.15,
      })
    );
    const fernMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(initialTheme.foliageHue, 0.65, initialTheme.foliageLightness * 1.05),
        roughness: 0.55,
      })
    );
    const stemMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: 0.7 }));
    const twigMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 }));
    const mossMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(initialTheme.foliageHue, 0.5, initialTheme.foliageLightness * 0.55),
        roughness: 0.95,
      })
    );
    const flowerHeadBaseMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        emissive: new THREE.Color(initialTheme.sporeColor),
        emissiveIntensity: 0.9,
      })
    );
    // Invisible, slightly larger "tap targets" so tiny objects are easy to click
    const hitMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));

    // Floor geometries (shared by every object of that kind)
    const hitGeo = trackGeo(new THREE.SphereGeometry(1, 8, 6));
    const saplingTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.1, 1.1, 5));
    const saplingLowerGeo = trackGeo(new THREE.ConeGeometry(0.55, 1.0, 6));
    const saplingUpperGeo = trackGeo(new THREE.ConeGeometry(0.38, 0.8, 6));
    const fernBladeGeo = trackGeo(new THREE.ConeGeometry(0.07, 1.0, 4));
    const flowerStemGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 5));
    const flowerHeadGeo = trackGeo(new THREE.IcosahedronGeometry(0.16, 0));
    const twigGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.05, 1.4, 5));
    const mossGeo = trackGeo(new THREE.SphereGeometry(0.6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2));

    // Place near a grove, or (scatter = chance from 0 to 1) anywhere on the planet
    const getFloorPosition = (index: number, groveRadius: number, scatter: number) => {
      if (Math.random() < scatter) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 56;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        return { x, z, y: getLittlePlanetHeight(x, z) };
      }
      return getClusteredPosition(index, groveRadius);
    };

    const addHitProxy = (group: THREE.Group, radius: number, y: number) => {
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.scale.setScalar(radius);
      hit.position.y = y;
      group.add(hit);
    };

    // --- G. Young Pine Saplings (small trees, soft kalimba pluck) ---
    const saplingCount = 46;
    for (let i = 0; i < saplingCount; i++) {
      const g = new THREE.Group();
      const s = 0.7 + Math.random() * 0.5;

      const trunk = new THREE.Mesh(saplingTrunkGeo, trunkMat);
      trunk.position.y = 0.55;
      const lower = new THREE.Mesh(saplingLowerGeo, saplingLeafMat);
      lower.position.y = 1.15;
      lower.rotation.y = Math.random();
      const upper = new THREE.Mesh(saplingUpperGeo, saplingLeafMat);
      upper.position.y = 1.7;
      upper.rotation.y = Math.random();

      g.add(trunk, lower, upper);
      addHitProxy(g, 1.0, 1.0);
      g.scale.setScalar(s);

      const pos = getFloorPosition(i + 3, 24, 0.25);
      g.position.set(pos.x, pos.y, pos.z);
      g.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i + 6);
      registerProp(g, 'sapling', note.freq * 2, note.noteName, `Sapling Pluck (${note.name})`, undefined, undefined, {
        seed: Math.random() * 100,
        amp: 0.035,
        speed: 0.9 + Math.random() * 0.5,
      });
    }

    // --- H. Whisper Ferns (a fan of leaves, airy brush sound) ---
    const fernCount = 36;
    for (let i = 0; i < fernCount; i++) {
      const g = new THREE.Group();
      const s = 0.7 + Math.random() * 0.6;
      const blades = 7;

      for (let b = 0; b < blades; b++) {
        const pivot = new THREE.Group();
        pivot.rotation.set(0, (b / blades) * Math.PI * 2 + Math.random() * 0.4, 0.4 + Math.random() * 0.5);
        const length = 0.7 + Math.random() * 0.5;
        const blade = new THREE.Mesh(fernBladeGeo, fernMat);
        blade.scale.y = length;
        blade.position.y = 0.5 * length; // keeps the base of the leaf at the middle of the fern
        pivot.add(blade);
        g.add(pivot);
      }

      addHitProxy(g, 0.9, 0.5);
      g.scale.setScalar(s);

      const pos = getFloorPosition(i + 7, 22, 0.2);
      g.position.set(pos.x, pos.y, pos.z);
      g.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i + 9);
      registerProp(g, 'fern', note.freq, note.noteName, `Whisper Fern (${note.name})`, undefined, undefined, {
        seed: Math.random() * 100,
        amp: 0.05,
        speed: 0.7 + Math.random() * 0.5,
      });
    }

    // --- I. Glass Blooms (tiny glowing flowers, music-box bell) ---
    const flowerCount = 44;
    for (let i = 0; i < flowerCount; i++) {
      const g = new THREE.Group();
      const s = 0.8 + Math.random() * 0.7;

      const stem = new THREE.Mesh(flowerStemGeo, stemMat);
      stem.position.y = 0.35;

      // Each flower gets its own head material so only the tapped flower flashes
      const headMat = flowerHeadBaseMat.clone();
      headMat.color.setHSL(Math.random(), 0.4, 0.85);
      flowerHeadMats.push(headMat);
      const head = new THREE.Mesh(flowerHeadGeo, headMat);
      head.position.y = 0.78;

      g.add(stem, head);
      addHitProxy(g, 0.5, 0.55);
      g.scale.setScalar(s);

      const pos = getFloorPosition(i + 11, 26, 0.45);
      g.position.set(pos.x, pos.y, pos.z);
      g.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i + 3);
      registerProp(g, 'flower', note.freq * 2, note.noteName, `Glass Bloom (${note.name})`, head, undefined, {
        seed: Math.random() * 100,
        amp: 0.06,
        speed: 1.0 + Math.random() * 0.6,
      });
    }

    // --- J. Snapping Twigs (dry sticks lying on the ground, wooden snap) ---
    const twigCount = 30;
    for (let i = 0; i < twigCount; i++) {
      const g = new THREE.Group();
      const pieces = 2 + Math.floor(Math.random() * 2);

      for (let p = 0; p < pieces; p++) {
        const t = new THREE.Mesh(twigGeo, twigMat);
        t.rotation.set(0, (Math.random() - 0.5) * 1.6, Math.PI / 2);
        t.scale.y = 0.6 + Math.random() * 0.6;
        t.position.set((Math.random() - 0.5) * 0.4, 0.06 + p * 0.05, (Math.random() - 0.5) * 0.4);
        g.add(t);
      }

      addHitProxy(g, 0.8, 0.1);

      const pos = getFloorPosition(i + 14, 24, 0.5);
      g.position.set(pos.x, pos.y, pos.z);
      g.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i + 5);
      registerProp(g, 'twig', note.freq * 0.9, note.noteName, `Snapping Twig (${note.name})`);
    }

    // --- K. Dripping Moss (soft green mounds, water-drop sound) ---
    const mossCount = 30;
    for (let i = 0; i < mossCount; i++) {
      const g = new THREE.Group();
      const clumps = 3;

      for (let c = 0; c < clumps; c++) {
        const m = new THREE.Mesh(mossGeo, mossMat);
        const r = 0.6 + Math.random() * 0.6;
        m.scale.set(r, r * 0.5, r);
        m.position.set((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.9);
        g.add(m);
      }

      addHitProxy(g, 0.9, 0.15);

      const pos = getFloorPosition(i + 17, 22, 0.15);
      g.position.set(pos.x, pos.y, pos.z);
      g.rotation.y = Math.random() * Math.PI * 2;

      const note = getModeNote(i + 8);
      registerProp(g, 'moss', note.freq * 0.6, note.noteName, `Dripping Moss (${note.name})`);
    }

    // 8. Fireflies System (130+ particles)
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
        x,
        y,
        z,
        seed: Math.random() * 100,
        speed: 0.7 + Math.random() * 1.1,
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

    // 9. Floating Celestial Spores (180+ particles)
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
        x,
        y,
        z,
        speed: 0.18 + Math.random() * 0.35,
        seed: Math.random() * 100,
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

    // 10. Strengthened Ground Splash Systems
    const shockwaves: ShockwaveRing[] = [];
    const splashLights: SplashPointLight[] = [];
    const splashSparks: SplashSpark[] = [];

    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    const sparkGeo = new THREE.SphereGeometry(0.12, 4, 4);

    const triggerGroundSplashEffect = (x: number, y: number, z: number, colorHex: number) => {
      // Concentric rings
      for (let s = 0; s < 2; s++) {
        const ringGeo = new THREE.RingGeometry(0.2, 0.55, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95 - s * 0.25,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(x, y + 0.08 + s * 0.02, z);
        scene.add(ringMesh);

        shockwaves.push({
          mesh: ringMesh,
          maxRadius: 8.5 + s * 2.5,
          progress: -s * 0.12,
        });
      }

      // PointLight flare
      const splashLight = new THREE.PointLight(colorHex, 4.5, 18);
      splashLight.position.set(x, y + 1.2, z);
      scene.add(splashLight);
      splashLights.push({
        light: splashLight,
        initialIntensity: 4.5,
        timer: 1.0,
      });

      // Sparks
      for (let i = 0; i < 16; i++) {
        const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
        sparkMesh.position.set(x, y + 0.3, z);
        scene.add(sparkMesh);

        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 3.5;
        const upSpeed = 3.5 + Math.random() * 4.0;
        splashSparks.push({
          mesh: sparkMesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            upSpeed,
            Math.sin(angle) * speed
          ),
          life: 1.0,
        });
      }
    };

    // 11. Two-Finger Long Vertical Swipe Gesture Recognition (Swipe Up / Down to Cycle Biomes)
    // Specifically engineered to prevent accidental triggers while playing with forest trees:
    // Requires both fingers to travel a long vertical distance (>=130px) in parallel in the same direction.
    interface TwoTouchRecord {
      id0: number;
      id1: number;
      startY0: number;
      startY1: number;
      startX0: number;
      startX1: number;
      currentY0: number;
      currentY1: number;
      currentX0: number;
      currentX1: number;
      initialSpan: number;
      startTime: number;
      hasMoved: boolean;
      isValid: boolean;
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
          id0: t0.identifier,
          id1: t1.identifier,
          startY0: t0.clientY,
          startY1: t1.clientY,
          startX0: t0.clientX,
          startX1: t1.clientX,
          currentY0: t0.clientY,
          currentY1: t1.clientY,
          currentX0: t0.clientX,
          currentX1: t1.clientX,
          initialSpan: span,
          startTime: performance.now(),
          hasMoved: false,
          isValid: true,
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

      activeTwoTouch.currentX0 = t0.clientX;
      activeTwoTouch.currentY0 = t0.clientY;
      activeTwoTouch.currentX1 = t1.clientX;
      activeTwoTouch.currentY1 = t1.clientY;
      activeTwoTouch.hasMoved = true;

      // Reject if distance between the two fingers changes drastically (pinch-zoom or tapping 2 distant trees)
      const currentSpan = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      if (Math.abs(currentSpan - activeTwoTouch.initialSpan) > 95) {
        activeTwoTouch.isValid = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!activeTwoTouch) return;
      lastTwoFingerGestureTime = Date.now();

      // Only evaluate if fingers stayed valid and actively moved
      if (activeTwoTouch.isValid && activeTwoTouch.hasMoved) {
        const dy0 = activeTwoTouch.currentY0 - activeTwoTouch.startY0;
        const dy1 = activeTwoTouch.currentY1 - activeTwoTouch.startY1;
        const dx0 = activeTwoTouch.currentX0 - activeTwoTouch.startX0;
        const dx1 = activeTwoTouch.currentX1 - activeTwoTouch.startX1;

        const avgDY = (dy0 + dy1) / 2;
        const avgDX = (dx0 + dx1) / 2;

        // Long swipe threshold: minimum 130px displacement for each finger and average
        const LONG_SWIPE_MIN_DISTANCE = 130;
        const hasLongTravel =
          Math.abs(dy0) >= LONG_SWIPE_MIN_DISTANCE &&
          Math.abs(dy1) >= LONG_SWIPE_MIN_DISTANCE &&
          Math.abs(avgDY) >= LONG_SWIPE_MIN_DISTANCE;

        // Both fingers must swipe in the same vertical direction (parallel motion)
        const isParallel = Math.sign(dy0) === Math.sign(dy1);

        // Strict vertical dominance (> 2.0x horizontal drift)
        const isStrictlyVertical = Math.abs(avgDY) > Math.abs(avgDX) * 2.0;

        // Debounce cooldown (prevent bouncing)
        const now = Date.now();
        const canShift = now - lastBiomeShiftTime > 800;

        if (hasLongTravel && isParallel && isStrictlyVertical && canShift) {
          lastBiomeShiftTime = now;
          const currentIndex = THEME_KEYS_ORDER.indexOf(themeRef.current);
          let nextIndex: number;
          if (avgDY < 0) {
            // Long swipe up -> next biome
            nextIndex = (currentIndex + 1) % THEME_KEYS_ORDER.length;
          } else {
            // Long swipe down -> previous biome
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

      // Tap tree with 'T' or 'E'
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
    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let cameraYaw = 0;
    let cameraPitch = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if ((e.target as HTMLElement)?.closest('.no-scene-drag')) return;
      if ('touches' in e && e.touches.length >= 2) return; // 2 fingers handled by gesture
      if ('touches' in e && e.touches[0].clientX < window.innerWidth * 0.5) return;

      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevPointerX = clientX;
      prevPointerY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
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

    const onPointerUp = () => {
      isDragging = false;
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 12. Sound Triggering on Prop Click
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

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
          audioEngine.triggerSaplingPluck(prop.freq);
          break;
        case 'fern':
          audioEngine.triggerFernBrush(prop.freq);
          break;
        case 'flower':
          audioEngine.triggerFlowerBell(prop.freq);
          break;
        case 'twig':
          audioEngine.triggerTwigSnap(prop.freq);
          break;
        case 'moss':
          audioEngine.triggerMossDrip(prop.freq);
          break;
      }

      onObjectPlayedRef.current?.(toReportedType(prop.type), prop.name, prop.freq, prop.noteName);
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
        .sort((a, b) => a.dist - b.dist)
        .slice(0, MAX_PULSE_SOUNDS);

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

    const onSceneClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('.no-scene-drag')) return;
      // Prevent clicks immediately following multi-touch gestures (e.g. lifting fingers from swipe)
      if (Date.now() - lastTwoFingerGestureTime < 450) return;

      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

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

      const groundHit = raycaster.intersectObject(terrainMesh);
      if (groundHit.length > 0) {
        const pt = groundHit[0].point;
        triggerGroundSplashEffect(pt.x, pt.y, pt.z, initialTheme.groundWireColor);
        const groundFreq = 50 + (Math.abs(pt.x + pt.z) % 65);
        audioEngine.triggerGroundSplash(groundFreq);
        onObjectPlayedRef.current?.('ground', 'Ground Splash Impact', groundFreq, 'G1');
      }
    };
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

    // 14. Main Animation & Render Loop (With Planet Continuous Toroidal Wrap)
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

      // 1st-Person Movement with Keyboard & Virtual Joystick OR Auto Explore Roaming
      _moveDir.set(0, 0, 0);

      const isAutoExplore = autoExploreRef.current;

      if (isAutoExplore) {
        // Autonomous continuous smooth roaming across little planet
        cameraYaw += (Math.sin(elapsed * 0.35) * 0.45 + Math.cos(elapsed * 0.17) * 0.25) * delta;
        cameraPitch = THREE.MathUtils.damp(cameraPitch, Math.sin(elapsed * 0.5) * 0.05, 2.5, delta);
        camera.rotation.set(0, 0, 0);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = cameraYaw;
        camera.rotation.x = cameraPitch;

        // Auto move forward in facing direction
        _moveDir.z -= 1.0;

        // Proximity Prop Interactivity: Automatically play nearby nature instruments while roaming!
        const playerPos = camera.position;
        for (const prop of interactiveProps) {
          if (!AUTO_PLAY_TYPES.has(prop.type)) continue;
          const dist = prop.group.position.distanceTo(playerPos);
          if (dist < 3.8) {
            const lastTrig = autoPropTriggers.get(prop) || 0;
            if (elapsed - lastTrig > 2.2) {
              autoPropTriggers.set(prop, elapsed);
              triggerPropSound(prop);
            }
          }
        }

        // Periodic Biome & Melody Randomization during Auto Explore
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

        // Slow, meditative lucid dream gliding pace
        const walkSpeed = isAutoExplore ? 2.1 : 2.4;
        camera.position.addScaledVector(_moveDir, walkSpeed * delta);

        // Infinite Circular Little-Planet Seamless Toroidal Wrapping!
        // When user walks across the planet radius, smoothly wrap to the other side!
        const distFromPlanetCenter = Math.hypot(camera.position.x, camera.position.z);
        if (distFromPlanetCenter > worldBoundRadius) {
          // Wrap around seamlessly
          const scale = (worldBoundRadius - 1.5) / distFromPlanetCenter;
          camera.position.x = -camera.position.x * scale;
          camera.position.z = -camera.position.z * scale;
        }
      }

      // Smooth terrain vertical dampening to curved little-planet surface
      const targetGroundY = getLittlePlanetHeight(camera.position.x, camera.position.z);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetGroundY + 1.85, 10, delta);

      // Animate Firefly Swarm
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
        // Gentle breeze sway for saplings, ferns and flowers
        if (prop.sway) {
          const sw = prop.sway;
          prop.group.rotation.z = Math.sin(elapsed * sw.speed + sw.seed) * sw.amp;
          prop.group.rotation.x = Math.cos(elapsed * sw.speed * 0.8 + sw.seed) * sw.amp * 0.6;
        }

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
      window.removeEventListener('click', onSceneClick);
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
      floorGeos.forEach((g) => g.dispose());
      floorMats.forEach((m) => m.dispose());
      flowerHeadMats.forEach((m) => m.dispose());
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
