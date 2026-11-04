/**
 * redowan's synth forest - 3D Nature Scene
 * Upgraded Features:
 * - Animal Habitat Spatial Clearance (6.5m clear buffer around animals so they stand out clearly)
 * - Soft Lush Sine-Wave Mode-Tuned Animal Chord Harmonies
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
    type: 'tree' | 'stump' | 'log' | 'stone' | 'bush' | 'mushroom' | 'sapling' | 'mossStick' | 'flower' | 'ground' | 'animal' | 'pondPlant',
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

interface ForestAnimal {
  group: THREE.Group;
  kind: 'bunny' | 'deer' | 'bear' | 'frog' | 'owl' | 'nightAngel' | 'asianCuckoo' | 'cricket';
  label: string;
  posX: number;
  posZ: number;
  posY: number;
  zoneRadius: number;
  freq: number;
  phase: number;
  wasInside: boolean;
  lastSoundAt: number;
  headPart?: THREE.Object3D;
  bodyPart?: THREE.Object3D;
  wingParts?: THREE.Object3D[];
}

interface PondPlant {
  group: THREE.Group;
  freq: number;
  phase: number;
  type: 'lotus' | 'cattail';
  label: string;
  baseY: number;
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

    const scene = new THREE.Scene();
    const initialTheme = FOREST_THEMES[themeRef.current] || FOREST_THEMES.astral;
    scene.background = new THREE.Color(initialTheme.fogColor);
    scene.fog = new THREE.FogExp2(initialTheme.fogColor, 0.02);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);
    camera.position.set(0, 2.4, 8);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      initialTheme.bloomStrength,
      initialTheme.bloomRadius,
      initialTheme.bloomThreshold
    );
    composer.addPass(bloomPass);

    const ambientLight = new THREE.AmbientLight(initialTheme.ambientLightColor, 1.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(initialTheme.keyLightColor, initialTheme.fogColor, 0.95);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(initialTheme.keyLightColor, 1.85);
    dirLight.position.set(35, 55, 30);
    scene.add(dirLight);

    // Terrain & Pond
    const planetRadius = 135;
    const pondCenter = new THREE.Vector2(14, -7);
    const getPondRadiusAtAngle = (angle: number): number => {
      return 5.2 + Math.sin(angle * 3) * 0.95 + Math.cos(angle * 5) * 0.55 + Math.sin(angle * 2) * 0.4;
    };

    const getPondDistanceRatio = (x: number, z: number): number => {
      const dx = x - pondCenter.x;
      const dz = z - pondCenter.y;
      const dist = Math.hypot(dx, dz);
      return dist / getPondRadiusAtAngle(Math.atan2(dz, dx));
    };

    const getLittlePlanetHeight = (x: number, z: number): number => {
      const distSq = x * x + z * z;
      const planetCurve = -distSq / (2 * planetRadius);
      const hills = Math.sin(x * 0.06) * Math.cos(z * 0.06) * 2.2 + Math.sin(x * 0.025 + z * 0.02) * 2.8;
      const baseHeight = hills + planetCurve;
      const pRatio = getPondDistanceRatio(x, z);
      if (pRatio < 1.8) {
        const factor = Math.max(0, 1 - Math.pow(pRatio / 1.8, 2));
        return baseHeight - 0.55 * Math.cos((pRatio / 1.8) * (Math.PI / 2)) * factor;
      }
      return baseHeight;
    };

    const terrainGeo = new THREE.RingGeometry(0.1, 74, 48, 64);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setY(i, getLittlePlanetHeight(posAttr.getX(i), posAttr.getZ(i)));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({ color: initialTheme.groundSolidColor, roughness: 0.82, flatShading: true });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrainMesh);

    const wireMat = new THREE.MeshBasicMaterial({ color: initialTheme.groundWireColor, wireframe: true, transparent: true, opacity: 0.45 });
    const wireMesh = new THREE.Mesh(terrainGeo, wireMat);
    wireMesh.position.y += 0.04;
    scene.add(wireMesh);

    // ANIMAL LOCATIONS (Clearances will be maintained around these)
    const animalSpawns = [
      { kind: 'bunny', x: -16, z: -18, freq: 392 },
      { kind: 'deer', x: 24, z: -24, freq: 293.66 },
      { kind: 'bear', x: -27, z: 20, freq: 196 },
      { kind: 'frog', x: 10.8, z: -9.2, freq: 523.25 },
      { kind: 'owl', x: 0, z: -35, freq: 349.23 },
      { kind: 'nightAngel', x: -2, z: 35, freq: 587.33 },
      { kind: 'asianCuckoo', x: 27, z: 25, freq: 440 },
      { kind: 'cricket', x: -27, z: -23, freq: 659.25 },
    ];

    // Helper to enforce spatial clearance buffer around animals
    const isInsideAnimalClearance = (x: number, z: number, clearRadius = 6.5): boolean => {
      return animalSpawns.some((a) => Math.hypot(x - a.x, z - a.z) < clearRadius);
    };

    const interactiveProps: InteractiveProp[] = [];
    const clickableMeshes: THREE.Object3D[] = [];

    const getModeNote = (index: number) => {
      const mode: MusicalMode = MUSICAL_MODES[modeRef.current] || MUSICAL_MODES.dorian;
      const noteIdx = Math.abs(index) % mode.notes.length;
      return { freq: mode.notes[noteIdx], noteName: mode.noteNames[noteIdx] };
    };

    // Shared Materials
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x361f14, roughness: 0.88 });
    const woodCoreMat = new THREE.MeshStandardMaterial({ color: 0xd97736, roughness: 0.65 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x442617, roughness: 0.85 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x93a5be, roughness: 0.18, metalness: 0.82 });
    const pineMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(initialTheme.foliageHue, 0.74, initialTheme.foliageLightness) });

    const registerProp = (group: THREE.Group, type: InteractiveProp['type'], freq: number, noteName: string, name: string) => {
      group.userData = { isProp: true, type, freq, noteName, name };
      scene.add(group);
      clickableMeshes.push(group);
      interactiveProps.push({ group, type, originalScale: group.scale.clone(), animTimer: 0, freq, noteName, name });
    };

    // Spawn Props ensuring spatial clearance around animals
    const groveCenters = [
      { x: -25, z: -22 }, { x: 26, z: -26 }, { x: -28, z: 24 },
      { x: 27, z: 27 }, { x: 0, z: -38 }, { x: -2, z: 36 },
    ];

    const getClusteredClearPosition = (index: number, maxRadius: number) => {
      const grove = groveCenters[index % groveCenters.length];
      for (let attempt = 0; attempt < 25; attempt++) {
        const offsetRadius = Math.random() * maxRadius;
        const angle = Math.random() * Math.PI * 2;
        const x = grove.x + Math.cos(angle) * offsetRadius;
        const z = grove.z + Math.sin(angle) * offsetRadius;
        if (!isInsideAnimalClearance(x, z, 6.5)) {
          return { x, z, y: getLittlePlanetHeight(x, z) };
        }
      }
      return { x: grove.x + 8, z: grove.z + 8, y: getLittlePlanetHeight(grove.x + 8, grove.z + 8) };
    };

    // Spawn 68 Pine Trees
    for (let i = 0; i < 68; i++) {
      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 2.4, 7), trunkMat);
      trunk.position.y = 1.2;
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.6, 7), pineMat);
      f1.position.y = 2.4;
      treeGroup.add(trunk, f1);

      const pos = getClusteredClearPosition(i, 20);
      treeGroup.position.set(pos.x, pos.y, pos.z);
      const note = getModeNote(i);
      registerProp(treeGroup, 'tree', note.freq, note.noteName, `Crystal Pine (${note.noteName})`);
    }

    // Spawn Animals in clear dedicated zones
    const forestAnimals: ForestAnimal[] = [];
    const animalMats = {
      cream: new THREE.MeshStandardMaterial({ color: 0xd8c6a4 }),
      tan: new THREE.MeshStandardMaterial({ color: 0xb88754 }),
      brown: new THREE.MeshStandardMaterial({ color: 0x805238 }),
      green: new THREE.MeshStandardMaterial({ color: 0x6b9b54 }),
      glow: new THREE.MeshStandardMaterial({ color: 0xc4b5fd, emissive: 0x8b5cf6, emissiveIntensity: 1.4 }),
    };

    animalSpawns.forEach((spawn, idx) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(spawn.kind === 'bear' ? 0.48 : 0.3, 8, 6),
        animalMats.cream
      );
      body.position.y = 0.35;
      group.add(body);

      const groundY = getLittlePlanetHeight(spawn.x, spawn.z);
      group.position.set(spawn.x, groundY, spawn.z);

      group.userData = { isAnimal: true, kind: spawn.kind, label: spawn.kind.toUpperCase(), freq: spawn.freq };
      scene.add(group);
      clickableMeshes.push(group);

      forestAnimals.push({
        group,
        kind: spawn.kind as ForestAnimal['kind'],
        label: spawn.kind.toUpperCase(),
        posX: spawn.x,
        posZ: spawn.z,
        posY: groundY,
        zoneRadius: 7.5,
        freq: spawn.freq,
        phase: idx * 0.7,
        wasInside: false,
        lastSoundAt: -100,
        bodyPart: body,
      });
    });

    const triggerAnimalSound = (animal: ForestAnimal) => {
      // Triggers Soft Lush Sine-Wave Mode-Tuned Chords
      audioEngine.triggerAnimalChord(animal.freq, animal.kind);
      onObjectPlayedRef.current?.('animal', animal.label, animal.freq, animal.kind.toUpperCase());
    };

    const performInteraction = (clientX: number, clientY: number) => {
      const pointer = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);

      const intersects = raycaster.intersectObjects(clickableMeshes, true);
      if (intersects.length > 0) {
        let top: THREE.Object3D | null = intersects[0].object;
        while (top && !top.userData?.isProp && !top.userData?.isAnimal && top.parent) {
          top = top.parent;
        }

        if (top && top.userData?.isAnimal) {
          const hit = forestAnimals.find((a) => a.kind === top.userData.kind);
          if (hit) triggerAnimalSound(hit);
          return;
        }

        if (top && top.userData?.isProp) {
          const hitProp = interactiveProps.find((p) => p.group === top);
          if (hitProp) {
            hitProp.animTimer = 1.0;
            audioEngine.triggerTreeTap(hitProp.freq);
            onObjectPlayedRef.current?.(hitProp.type, hitProp.name, hitProp.freq, hitProp.noteName);
          }
        }
      }
    };

    const onClick = (e: MouseEvent) => performInteraction(e.clientX, e.clientY);
    window.addEventListener('click', onClick);

    let animFrameId = 0;
    const clock = new THREE.Clock();

    const renderLoop = () => {
      animFrameId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Animate Animal Gentle Idle Breath & Habitat Proximity Triggers
      const playerPos = camera.position;
      const playerXZ = new THREE.Vector2(playerPos.x, playerPos.z);

      for (const animal of forestAnimals) {
        animal.group.position.y = animal.posY + Math.sin(elapsed * 1.6 + animal.phase) * 0.025;

        const inside = playerXZ.distanceTo(new THREE.Vector2(animal.posX, animal.posZ)) < animal.zoneRadius;
        if (inside && !animal.wasInside && elapsed - animal.lastSoundAt > 5.0) {
          triggerAnimalSound(animal);
          animal.lastSoundAt = elapsed;
        }
        animal.wasInside = inside;
      }

      composer.render();
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 cursor-grab select-none" />;
};
