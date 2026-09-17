"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, TransformControls, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { hapticoDial } from "@/lib/ui/hapticos";

const MODEL_PATH = "/models/pulpo-volt.glb";
useGLTF.preload(MODEL_PATH);

const ELEMENT_KEYS = ["leftEye", "rightEye", "leftBrow", "rightBrow", "mouth"] as const;
type ElementKey = typeof ELEMENT_KEYS[number];

const ELEMENT_LABELS: Record<ElementKey, string> = {
  leftEye:   "Left Eye",
  rightEye:  "Right Eye",
  leftBrow:  "Left Brow",
  rightBrow: "Right Brow",
  mouth:     "Mouth",
};

type LiveCoords = {
  position: [number, number, number];
  rotation: [number, number, number]; // degrees
  scale:    [number, number, number];
};


export type FacialState = {
  jawOpen: number;
  smileLeft: number;
  smileRight: number;
  blinkLeft: number;
  blinkRight: number;
  squintLeft: number;
  squintRight: number;
  browDownLeft: number;
  browDownRight: number;
  browUpLeft: number;
  browUpRight: number;
  browInnerUp: number;
  lookX: number; // -1 (izq) .. 1 (der), combinado ambos ojos
  lookY: number; // -1 (abajo) .. 1 (arriba)
  // F4D: Estado coordinado procedural (micro-delays sutiles)
  smileDelayedLeft?: number;
  smileDelayedRight?: number;
  browUpDelayedLeft?: number;
  browUpDelayedRight?: number;
  jawOpenDelayed?: number;
};

type TrackState = {
  matrix: THREE.Matrix4;
  facialState: FacialState;
  ready: boolean;
};

// ─────────────────────────────────────────────
//  FACE CONFIG — coordenadas locales del bone Head
// ─────────────────────────────────────────────
const FACE_CONFIG = {
  leftEye: {
    position: [-0.0767, 0.1572, -0.1100],
    rotation: [0.1479, 1.4814, -0.0000],
    scale:    [0.5000, 0.8569, 0.8500],
  },
  rightEye: {
    position: [0.0834, 0.1673, -0.1008],
    rotation: [0.0000, 1.4468, 0.0000],
    scale:    [0.5000, 0.9776, 0.8500],
  },
  leftBrow: {
    position: [-0.0975, 0.2201, -0.1196],
    rotation: [-2.9019, 1.4026, 2.9888],
    scale:    [1.0000, 1.0000, 1.0000],
  },
  rightBrow: {
    position: [0.0874, 0.2286, -0.1185],
    rotation: [-0.1908, 1.2704, 0.1795],
    scale:    [1.0000, 1.0000, 1.0000],
  },
  mouth: {
    position: [0.0019, 0.0747, -0.1117],
    rotation: [-1.9768, 1.5040, 2.3083],
    scale:    [1.0000, 1.0035, 1.0003],
  },
};

export interface EyeAssembly {
  group: THREE.Group;
  sclera: THREE.Mesh;           // Esclera (blanco del ojo)
  iris: THREE.Mesh;             // Iris (oscuro)
  highlight: THREE.Mesh;        // Highlight (reflejo blanco)
  upperLid: THREE.Mesh;         // Párpado superior
  lowerLid: THREE.Mesh;         // Párpado inferior
  upperLidPivot: THREE.Group;   // Pivote para rotación del párpado superior
  lowerLidPivot: THREE.Group;   // Pivote para rotación del párpado inferior
}

export interface MouthAssembly {
  group: THREE.Group;
  upperLip: THREE.Mesh;
  lowerLip: THREE.Mesh;
  cavity: THREE.Mesh;
}

export interface FaceRigElements {
  group: THREE.Group;
  leftEye: EyeAssembly;
  rightEye: EyeAssembly;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  mouth: MouthAssembly;
  axesHelper: THREE.AxesHelper;
  markers?: THREE.Mesh[];
}

let _faceRigLogged = false;

/**
 * Crea un ensamble de ojo con esclera + iris + highlight + párpados como casquetes esféricos.
 * Los párpados rotan sobre pivotes para cerrar (no escalan).
 */
function createEyeAssembly(name: string, config: LiveCoords): EyeAssembly {
  const group = new THREE.Group();
  group.name = name;
  group.position.fromArray(config.position);
  group.rotation.fromArray(config.rotation.map(r => r * Math.PI / 180) as [number, number, number]);
  group.scale.fromArray(config.scale);

  const eyeRadius = 0.038;

  // Esclera (blanco del ojo)
  const scleraGeo = new THREE.SphereGeometry(eyeRadius, 16, 12);
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    roughness: 0.4,
    metalness: 0.0,
    depthTest: true,
    depthWrite: true,
  });
  const sclera = new THREE.Mesh(scleraGeo, scleraMat);
  sclera.name = `${name}_Sclera`;
  group.add(sclera);

  // Iris (oscuro #052e22) - Geometría circular sobre la superficie frontal (+X)
  const irisRadius = eyeRadius * 0.48;
  const irisGeo = new THREE.CircleGeometry(irisRadius, 24);
  const irisMat = new THREE.MeshStandardMaterial({
    color: 0x052e22,
    roughness: 0.3,
    metalness: 0.0,
    depthTest: true,
    depthWrite: true,
  });
  const iris = new THREE.Mesh(irisGeo, irisMat);
  iris.name = `${name}_Iris`;
  // Posición ligeramente sobre la esclera para evitar z-fighting (+X es forward)
  iris.position.set(eyeRadius * 1.005, 0, 0);
  iris.rotation.y = Math.PI / 2;
  group.add(iris);

  // Highlight (brillo blanco #ffffff) - Pequeño reflejo especular
  const highlightRadius = eyeRadius * 0.14;
  const highlightGeo = new THREE.CircleGeometry(highlightRadius, 16);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: true,
    depthWrite: true,
  });
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.name = `${name}_Highlight`;
  highlight.position.set(eyeRadius * 1.010, 0.007, 0.006);
  highlight.rotation.y = Math.PI / 2;
  group.add(highlight);

  // Material de los párpados (color piel del pulpo)
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x10e7a0, // Verde Pulpo Volt — integra el párpado con la piel
    roughness: 0.6,
    metalness: 0.0,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });

  // Párpado SUPERIOR - casquete esférico
  // Radio ligeramente mayor para que cubra la esclera
  const lidRadius = eyeRadius * 1.02;
  
  // Casquete superior: de 0° a ~100° (cubre más de media esfera)
  const upperLidGeo = new THREE.SphereGeometry(
    lidRadius,
    16,
    12,
    0,           // phiStart
    Math.PI * 2, // phiLength (360°)
    0,           // thetaStart (desde el polo norte)
    Math.PI * 0.55 // thetaLength (cubre ~55% = más de la mitad)
  );
  const upperLid = new THREE.Mesh(upperLidGeo, lidMat);
  upperLid.name = `${name}_UpperLid`;

  // Pivote del párpado superior - rota sobre el eje X para cerrar hacia abajo
  const upperLidPivot = new THREE.Group();
  upperLidPivot.name = `${name}_UpperLidPivot`;
  upperLidPivot.add(upperLid);
  group.add(upperLidPivot);

  // Párpado INFERIOR - casquete esférico pequeño
  // Cubre solo ~20% inferior
  const lowerLidGeo = new THREE.SphereGeometry(
    lidRadius,
    16,
    12,
    0,              // phiStart
    Math.PI * 2,    // phiLength (360°)
    Math.PI * 0.80, // thetaStart (comienza en ~80% desde arriba)
    Math.PI * 0.20  // thetaLength (cubre ~20% inferior)
  );
  const lowerLid = new THREE.Mesh(lowerLidGeo, lidMat);
  lowerLid.name = `${name}_LowerLid`;

  // Pivote del párpado inferior - rota sobre el eje X para cerrar hacia arriba
  const lowerLidPivot = new THREE.Group();
  lowerLidPivot.name = `${name}_LowerLidPivot`;
  lowerLidPivot.add(lowerLid);
  group.add(lowerLidPivot);

  return {
    group,
    sclera,
    iris,
    highlight,
    upperLid,
    lowerLid,
    upperLidPivot,
    lowerLidPivot,
  };
}

function updateTubeGeometryInPlace(
  geometry: THREE.BufferGeometry,
  curve: THREE.Curve<THREE.Vector3>,
  tubularSegments = 16,
  radius = 0.0024,
  radialSegments = 8,
  closed = false
) {
  const tempGeo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const tempPos = tempGeo.attributes.position as THREE.BufferAttribute;
  if (pos && tempPos && pos.count === tempPos.count) {
    pos.copy(tempPos);
    pos.needsUpdate = true;
  }
  tempGeo.dispose();
}

function buildBrowCurve(): THREE.CatmullRomCurve3 {
  // Arco fino siguiendo forma de ceja real (arranca bajo cerca de la nariz,
  // sube a un pico y baja hacia la sien) en vez de una caja recta plana.
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0000, -0.0020,  0.0450), // sien (extremo exterior)
    new THREE.Vector3(0.0012,  0.0030,  0.0220),
    new THREE.Vector3(0.0018,  0.0075,  0.0020), // pico del arco
    new THREE.Vector3(0.0010,  0.0040, -0.0180),
    new THREE.Vector3(0.0000, -0.0010, -0.0400), // nariz (extremo interior)
  ]);
}

function buildLipCurve(
  isUpper: boolean,
  jawOpen: number,
  smileLeft: number,
  smileRight: number
): THREE.CatmullRomCurve3 {
  // P0 Fix: Amortiguar suavemente la elevación de comisuras cuando jawOpen es alto
  // para evitar exposición de la arista superior de la cavidad (flared edge)
  const smileDamp = 1.0 - jawOpen * 0.25;
  const smileLiftL = smileLeft * 0.0140 * smileDamp;
  const smileLiftR = smileRight * 0.0140 * smileDamp;

  // Ancho lateral (Z): las comisuras se desplazan hacia los lados independientemente
  const baseHalfWidth = 0.046;
  const leftZ  = -baseHalfWidth * (1.0 - jawOpen * 0.04 + smileLeft * 0.14);
  const rightZ =  baseHalfWidth * (1.0 - jawOpen * 0.04 + smileRight * 0.14);

  // Retracción en -X (profundidad) para seguir la curvatura facial de Volt
  const leftX  = -0.0060 - smileLeft * 0.0050;
  const rightX = -0.0060 - smileRight * 0.0050;
  const midX   = 0.0008;

  const midZ_L = leftZ * 0.5;
  const midZ_R = rightZ * 0.5;

  if (isUpper) {
    // Elevación de comisuras superiores (Y) independizada por lado con amortiguación P0
    const leftY  =  0.0024 - jawOpen * 0.0015 + smileLiftL;
    const rightY =  0.0024 - jawOpen * 0.0015 + smileLiftR;

    // P1 Fix: Centro geométrico (Z=0) perfectamente estable en smirk asimétrico
    // Se usa producto (smileLeft * smileRight) para elevar centro únicamente en sonrisa simétrica
    const symSmile = smileLeft * smileRight;
    const centerY = 0.0024 + jawOpen * 0.0020 + symSmile * 0.0030;
    const centerX = 0.0025;

    // Asimetría concentrada progresivamente hacia la comisura afectada
    const midY_L = (leftY + centerY) * 0.5 + 0.0004 + smileLeft * 0.0025;
    const midY_R = (rightY + centerY) * 0.5 + 0.0004 + smileRight * 0.0025;

    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(leftX,  leftY,  leftZ),
      new THREE.Vector3(midX,   midY_L, midZ_L),
      new THREE.Vector3(centerX, centerY, 0),
      new THREE.Vector3(midX,   midY_R, midZ_R),
      new THREE.Vector3(rightX, rightY, rightZ),
    ]);
  } else {
    // Elevación de comisuras inferiores (Y) alineadas con las superiores
    const leftY  = -0.0024 - jawOpen * 0.0015 + smileLiftL;
    const rightY = -0.0024 - jawOpen * 0.0015 + smileLiftR;

    // P1 Fix: Centro inferior estable en smirk asimétrico
    const symSmile = smileLeft * smileRight;
    const centerY = -0.0024 - jawOpen * 0.0180 + symSmile * 0.0020;
    const centerX = 0.0020;

    // Puntos intermedios para labio inferior
    const midY_L = leftY * 0.35 + centerY * 0.65 + smileLeft * 0.0020;
    const midY_R = rightY * 0.35 + centerY * 0.65 + smileRight * 0.0020;

    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(leftX,  leftY,  leftZ),
      new THREE.Vector3(midX,   midY_L, midZ_L),
      new THREE.Vector3(centerX, centerY, 0),
      new THREE.Vector3(midX,   midY_R, midZ_R),
      new THREE.Vector3(rightX, rightY, rightZ),
    ]);
  }
}

function createMouthAssembly(name: string, config: LiveCoords): MouthAssembly {
  const group = new THREE.Group();
  group.name = name;
  group.position.fromArray(config.position);
  group.rotation.fromArray(config.rotation as [number, number, number]);
  group.scale.fromArray(config.scale);

  // P2: Cavidad bucal oscura de fondo
  const cavityGeo = new THREE.CircleGeometry(0.040, 24);
  const cavityMat = new THREE.MeshBasicMaterial({
    color: 0x020202,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const cavity = new THREE.Mesh(cavityGeo, cavityMat);
  cavity.name = `${name}_Cavity`;
  cavity.position.set(-0.003, -0.004, 0);
  cavity.rotation.y = Math.PI / 2;
  cavity.scale.set(1.0, 0.2, 0.95);
  group.add(cavity);

  const lipMat = new THREE.MeshStandardMaterial({
    color: 0x080808,
    roughness: 0.35,
    metalness: 0.0,
    depthTest: true,
    depthWrite: true,
  });

  const upperCurve = buildLipCurve(true, 0, 0, 0);
  const upperGeo = new THREE.TubeGeometry(upperCurve, 16, 0.0024, 8, false);
  const upperLip = new THREE.Mesh(upperGeo, lipMat);
  upperLip.name = `${name}_UpperLip`;
  group.add(upperLip);

  const lowerCurve = buildLipCurve(false, 0, 0, 0);
  const lowerGeo = new THREE.TubeGeometry(lowerCurve, 16, 0.0024, 8, false);
  const lowerLip = new THREE.Mesh(lowerGeo, lipMat);
  lowerLip.name = `${name}_LowerLip`;
  group.add(lowerLip);

  return {
    group,
    upperLip,
    lowerLip,
    cavity,
  };
}

function createFaceRig(): FaceRigElements {
  const group = new THREE.Group();
  group.name = "FaceRig";
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);

  // Crear ensambles de ojos con la nueva arquitectura
  const leftEye = createEyeAssembly("LeftEye", FACE_CONFIG.leftEye as LiveCoords);
  const rightEye = createEyeAssembly("RightEye", FACE_CONFIG.rightEye as LiveCoords);

  // Material para cejas y boca
  const mat = new THREE.MeshStandardMaterial({
    color: 0x080808,
    roughness: 0.25,
    metalness: 0.0,
    depthTest: true,
    depthWrite: true,
  });

  // Arco curvo (TubeGeometry sobre CatmullRomCurve3), no una caja recta:
  // una caja vista de frente se lee como una barra solida negra, sin forma
  // de ceja. Mismo enfoque que ya usan los labios (buildLipCurve).
  const browGeo = new THREE.TubeGeometry(buildBrowCurve(), 12, 0.0022, 8, false);

  const leftBrow = new THREE.Mesh(browGeo, mat);
  leftBrow.name = "LeftBrow";
  leftBrow.position.fromArray(FACE_CONFIG.leftBrow.position);
  leftBrow.rotation.fromArray(FACE_CONFIG.leftBrow.rotation as [number,number,number]);
  leftBrow.scale.fromArray(FACE_CONFIG.leftBrow.scale);

  const rightBrow = new THREE.Mesh(browGeo.clone(), mat);
  rightBrow.name = "RightBrow";
  rightBrow.position.fromArray(FACE_CONFIG.rightBrow.position);
  rightBrow.rotation.fromArray(FACE_CONFIG.rightBrow.rotation as [number,number,number]);
  rightBrow.scale.fromArray(FACE_CONFIG.rightBrow.scale);

  const mouth = createMouthAssembly("Mouth", FACE_CONFIG.mouth as LiveCoords);

  // Markers
  const mkMat = (color: number) => new THREE.MeshBasicMaterial({ color, depthTest: false });
  const mkGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const markerX = new THREE.Mesh(mkGeo, mkMat(0xff2222)); markerX.position.set(0.18, 0, 0); markerX.visible = false;
  const markerY = new THREE.Mesh(mkGeo, mkMat(0x22ff22)); markerY.position.set(0, 0.18, 0); markerY.visible = false;
  const markerZ = new THREE.Mesh(mkGeo, mkMat(0x2255ff)); markerZ.position.set(0, 0, 0.18); markerZ.visible = false;
  const markers = [markerX, markerY, markerZ];

  const axesHelper = new THREE.AxesHelper(0.22);
  axesHelper.visible = false;

  group.add(leftEye.group, rightEye.group, leftBrow, rightBrow, mouth.group);
  group.add(markerX, markerY, markerZ);
  group.add(axesHelper);

  if (!_faceRigLogged) {
    _faceRigLogged = true;
    console.log("[FaceRig] FaceRig elements calibrated and created with eyelid assembly and Memoji mouth.");
  }

  return { group, leftEye, rightEye, leftBrow, rightBrow, mouth, axesHelper, markers };
}

// ─────────────────────────────────────────────
//  MOTOR DE AUTO-BLINK (Fase 0)
// ─────────────────────────────────────────────
interface BlinkState {
  phase: 'idle' | 'closing' | 'paused' | 'opening';
  progress: number;
  nextBlinkTime: number;
  isDoubleBlink: boolean;
  doubleBlinkCount: number;
}

const autoBlinkState: BlinkState = {
  phase: 'idle',
  progress: 0,
  nextBlinkTime: performance.now() + 3000 + Math.random() * 2000,
  isDoubleBlink: false,
  doubleBlinkCount: 0,
};

// Timings en ms según la spec
const BLINK_TIMING = {
  close: 80 + Math.random() * 20,    // 80-100ms
  pause: 10 + Math.random() * 20,    // 10-30ms
  open: 150 + Math.random() * 30,    // 150-180ms
  jitterMin: 3000,                   // 3s
  jitterMax: 5000,                   // 5s
  doubleChance: 0.08,                // 8%
};

function easeInQuad(t: number): number {
  return t * t;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// Fase 2 — eyeSquint: tope de cierre por contracción, sensiblemente menor a
// un blink completo (1.0) para que se lea como gesto de esfuerzo, no parpadeo.
const SQUINT_CAP = 0.4;

/**
 * Actualiza el auto-blink procedural (evento bilateral sincronizado)
 */
function updateAutoBlink(state: BlinkState, now: number): number {
  switch (state.phase) {
    case 'idle':
      if (now >= state.nextBlinkTime) {
        // Decidir si es doble parpadeo
        state.isDoubleBlink = Math.random() < BLINK_TIMING.doubleChance;
        state.doubleBlinkCount = state.isDoubleBlink ? 2 : 1;
        state.phase = 'closing';
        state.progress = 0;
      }
      return 0;

    case 'closing':
      state.progress += (1000 / 60) / BLINK_TIMING.close;
      if (state.progress >= 1) {
        state.progress = 0;
        state.phase = 'paused';
      }
      return easeInQuad(Math.min(state.progress, 1));

    case 'paused':
      state.progress += (1000 / 60) / BLINK_TIMING.pause;
      if (state.progress >= 1) {
        state.progress = 0;
        state.phase = 'opening';
      }
      return 1;

    case 'opening':
      state.progress += (1000 / 60) / BLINK_TIMING.open;
      if (state.progress >= 1) {
        state.doubleBlinkCount--;
        if (state.doubleBlinkCount > 0) {
          // Segundo parpadeo del doble blink
          state.phase = 'closing';
          state.progress = 0;
        } else {
          // Fin del ciclo
          state.phase = 'idle';
          state.progress = 0;
          state.nextBlinkTime = now + BLINK_TIMING.jitterMin + 
                                Math.random() * (BLINK_TIMING.jitterMax - BLINK_TIMING.jitterMin);
        }
        return 0;
      }
      return 1 - easeOutQuad(Math.min(state.progress, 1));

    default:
      return 0;
  }
}

const UPPER_LID_ROT_MAX = Math.PI * 0.85; // ~85% del cierre
const LOWER_LID_ROT_MAX = Math.PI * 0.15; // ~15% del cierre

function applyEyeClosure(eye: EyeAssembly, closure: number) {
  eye.upperLidPivot.rotation.x = closure * UPPER_LID_ROT_MAX;
  eye.lowerLidPivot.rotation.x = -closure * LOWER_LID_ROT_MAX;
}

function computeEyeClosure(autoBlink: number, blinkTracked: number, squintTracked: number): number {
  const finalBlink = Math.max(autoBlink, blinkTracked);
  const squintCap = THREE.MathUtils.clamp(squintTracked * SQUINT_CAP, 0, SQUINT_CAP);
  return Math.max(finalBlink, squintCap);
}

// ─────────────────────────────────────────────
//  MOTOR DE IDLE SACCADES (Fase 3C)
// ─────────────────────────────────────────────
interface SaccadeState {
  phase: 'fixating' | 'moving';
  progress: number;
  nextSaccadeTime: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
}

const saccadeIdleState: SaccadeState = {
  phase: 'fixating',
  progress: 0,
  nextSaccadeTime: performance.now() + 2000 + Math.random() * 2000,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  targetX: 0,
  targetY: 0,
};

// Timings según spec Fase 3C
const SACCADE_TIMING = {
  fixationMin: 2000,  // 2s
  fixationMax: 4000,  // 4s
  movement: 50,       // 50ms (saccade rápido)
  maxX: 0.3,          // Amplitud horizontal máxima (micro-mirada)
  maxY: 0.2,          // Amplitud vertical máxima (micro-mirada)
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Actualiza el motor de saccades idle (solo activo cuando NO hay rostro detectado)
 */
function updateSaccadeIdle(state: SaccadeState, now: number): { x: number; y: number } {
  switch (state.phase) {
    case 'fixating':
      if (now >= state.nextSaccadeTime) {
        // Generar nuevo target aleatorio (micro-mirada)
        state.targetX = (Math.random() - 0.5) * 2 * SACCADE_TIMING.maxX;
        state.targetY = (Math.random() - 0.5) * 2 * SACCADE_TIMING.maxY;
        state.startX = state.currentX;
        state.startY = state.currentY;
        state.phase = 'moving';
        state.progress = 0;
      }
      return { x: state.currentX, y: state.currentY };

    case 'moving':
      state.progress += (1000 / 60) / SACCADE_TIMING.movement;
      if (state.progress >= 1) {
        // Fin del movimiento
        state.currentX = state.targetX;
        state.currentY = state.targetY;
        state.phase = 'fixating';
        state.progress = 0;
        const jitter = SACCADE_TIMING.fixationMin + 
                       Math.random() * (SACCADE_TIMING.fixationMax - SACCADE_TIMING.fixationMin);
        state.nextSaccadeTime = now + jitter;
      } else {
        // Interpolación desde start hacia target con easeOutCubic
        const t = Math.min(state.progress, 1);
        const eased = easeOutCubic(t);
        state.currentX = state.startX + (state.targetX - state.startX) * eased;
        state.currentY = state.startY + (state.targetY - state.startY) * eased;
      }
      return { x: state.currentX, y: state.currentY };

    default:
      return { x: state.currentX, y: state.currentY };
  }
}

function updateFaceRig(
  elements: FaceRigElements,
  targetState: FacialState,
  currentState: FacialState,
  debugMode: boolean,
  faceDetected: boolean
) {
  const LERP_FACTOR = 0.25;
  const COORD_LERP = 0.14; // Smoothing sutil con micro-delay de ~40-60ms para acoplamiento secundario

  // 1. Smoothing primario de blendshapes tracked
  currentState.jawOpen = THREE.MathUtils.lerp(currentState.jawOpen, targetState.jawOpen, LERP_FACTOR);
  currentState.smileLeft = THREE.MathUtils.lerp(currentState.smileLeft, targetState.smileLeft, LERP_FACTOR);
  currentState.smileRight = THREE.MathUtils.lerp(currentState.smileRight, targetState.smileRight, LERP_FACTOR);
  currentState.blinkLeft = THREE.MathUtils.lerp(currentState.blinkLeft, targetState.blinkLeft, LERP_FACTOR);
  currentState.blinkRight = THREE.MathUtils.lerp(currentState.blinkRight, targetState.blinkRight, LERP_FACTOR);
  currentState.squintLeft = THREE.MathUtils.lerp(currentState.squintLeft, targetState.squintLeft, LERP_FACTOR);
  currentState.squintRight = THREE.MathUtils.lerp(currentState.squintRight, targetState.squintRight, LERP_FACTOR);
  currentState.browDownLeft = THREE.MathUtils.lerp(currentState.browDownLeft, targetState.browDownLeft, LERP_FACTOR);
  currentState.browDownRight = THREE.MathUtils.lerp(currentState.browDownRight, targetState.browDownRight, LERP_FACTOR);
  currentState.browUpLeft = THREE.MathUtils.lerp(currentState.browUpLeft, targetState.browUpLeft, LERP_FACTOR);
  currentState.browUpRight = THREE.MathUtils.lerp(currentState.browUpRight, targetState.browUpRight, LERP_FACTOR);
  currentState.browInnerUp = THREE.MathUtils.lerp(currentState.browInnerUp, targetState.browInnerUp || 0, LERP_FACTOR);

  // 2. FASE F4D — Micro-delays sutiles (30-80ms offset) para acoplamiento coordinado
  currentState.smileDelayedLeft = THREE.MathUtils.lerp(currentState.smileDelayedLeft || 0, currentState.smileLeft, COORD_LERP);
  currentState.smileDelayedRight = THREE.MathUtils.lerp(currentState.smileDelayedRight || 0, currentState.smileRight, COORD_LERP);
  currentState.browUpDelayedLeft = THREE.MathUtils.lerp(currentState.browUpDelayedLeft || 0, currentState.browUpLeft, COORD_LERP);
  currentState.browUpDelayedRight = THREE.MathUtils.lerp(currentState.browUpDelayedRight || 0, currentState.browUpRight, COORD_LERP);
  currentState.jawOpenDelayed = THREE.MathUtils.lerp(currentState.jawOpenDelayed || 0, currentState.jawOpen, COORD_LERP);

  // Aportes procedimentales coordinados conservadores (Estilo Memoji, conservando L/R):
  // a) Smile -> Eye Squint (Duchenne) & Brow Lift sutil por lado
  const smileCoordinatedSquintL = currentState.smileDelayedLeft * 0.22;
  const smileCoordinatedSquintR = currentState.smileDelayedRight * 0.22;
  const smileCoordinatedBrowLiftL = currentState.smileDelayedLeft * 0.005;
  const smileCoordinatedBrowLiftR = currentState.smileDelayedRight * 0.005;

  // b) Surprise -> Eye Widen (apertura extra de párpados), Jaw Open support & Gaze pitch boost
  const avgSurpriseBrowDelayed = (currentState.browUpDelayedLeft + currentState.browUpDelayedRight) / 2;
  const surpriseCoordinatedWidenL = currentState.browUpDelayedLeft * 0.14 + currentState.jawOpenDelayed * 0.08;
  const surpriseCoordinatedWidenR = currentState.browUpDelayedRight * 0.14 + currentState.jawOpenDelayed * 0.08;
  const surpriseGazeYOffset = avgSurpriseBrowDelayed * 0.12 * (currentState.jawOpenDelayed * 0.5 + 0.5);
  const surpriseJawBoost = avgSurpriseBrowDelayed * 0.10;

  // c) BrowDown (Fruncido) -> Eye Squint sutil
  const frownCoordinatedSquintL = currentState.browDownLeft * 0.12;
  const frownCoordinatedSquintR = currentState.browDownRight * 0.12;

  // Total de Squint (independiente L/R)
  const totalSquintL = THREE.MathUtils.clamp(currentState.squintLeft + smileCoordinatedSquintL + frownCoordinatedSquintL, 0, 1);
  const totalSquintR = THREE.MathUtils.clamp(currentState.squintRight + smileCoordinatedSquintR + frownCoordinatedSquintR, 0, 1);

  // Apertura de boca coordinada (JawOpen + boost por sorpresa)
  const effectiveJawOpen = THREE.MathUtils.clamp(currentState.jawOpen + surpriseJawBoost, 0, 1);

  // ─────────────────────────────────────────────
  // 1. MIRADA E IRIS CON COORDINACIÓN GAZE (Fase 3B + F4D)
  // ─────────────────────────────────────────────
  const MAX_LOOK_Y = 0.010; // Límite vertical conservador (metros)
  const MAX_LOOK_Z = 0.010; // Límite horizontal conservador (metros)
  const EYE_RADIUS = 0.038;

  const now = performance.now();
  const saccadeIdle = updateSaccadeIdle(saccadeIdleState, now);

  const effectiveTargetX = faceDetected ? targetState.lookX : saccadeIdle.x;
  const rawTargetY = faceDetected ? targetState.lookY : saccadeIdle.y;
  const effectiveTargetY = THREE.MathUtils.clamp(rawTargetY + surpriseGazeYOffset, -1, 1);

  currentState.lookX = THREE.MathUtils.lerp(currentState.lookX, effectiveTargetX, 0.20);
  currentState.lookY = THREE.MathUtils.lerp(currentState.lookY, effectiveTargetY, 0.20);

  // Aplicar mirada al iris
  const dY = currentState.lookY * MAX_LOOK_Y;
  const dZ = currentState.lookX * MAX_LOOK_Z;
  const dX = Math.sqrt(Math.max(0, EYE_RADIUS * EYE_RADIUS - dY * dY - dZ * dZ)) * 1.005;

  for (const eye of [elements.leftEye, elements.rightEye]) {
    eye.iris.position.set(dX, dY, dZ);
    eye.highlight.position.set(dX + 0.00019, dY + 0.007, dZ + 0.006);
  }

  // Auto-blink bilateral + Párpados (Fase 0+1+2 + F4D Eye Widen)
  const autoBlink = updateAutoBlink(autoBlinkState, now);

  const baseClosureLeft = computeEyeClosure(autoBlink, currentState.blinkLeft, totalSquintL);
  const baseClosureRight = computeEyeClosure(autoBlink, currentState.blinkRight, totalSquintR);

  // Si hay parpadeo explícito/autoblink (>0.5), respeta el cierre. Si no, aplica apertura sorpresa
  const closureLeft = baseClosureLeft > 0.5 ? baseClosureLeft : (baseClosureLeft - surpriseCoordinatedWidenL);
  const closureRight = baseClosureRight > 0.5 ? baseClosureRight : (baseClosureRight - surpriseCoordinatedWidenR);

  applyEyeClosure(elements.leftEye, closureLeft);
  applyEyeClosure(elements.rightEye, closureRight);

  // ─────────────────────────────────────────────
  // 2. BOCA Y SONRISA MEMOJI-LIKE (Fase 4A.1 + F4D)
  // ─────────────────────────────────────────────
  const smileAvg = (currentState.smileLeft + currentState.smileRight) / 2;
  const upperCurve = buildLipCurve(true, effectiveJawOpen, currentState.smileLeft, currentState.smileRight);
  const lowerCurve = buildLipCurve(false, effectiveJawOpen, currentState.smileLeft, currentState.smileRight);

  updateTubeGeometryInPlace(elements.mouth.upperLip.geometry, upperCurve);
  updateTubeGeometryInPlace(elements.mouth.lowerLip.geometry, lowerCurve);

  const cavityScaleY = 0.2 + effectiveJawOpen * 1.6;
  const cavityScaleZ = 0.95 + smileAvg * 0.15;
  elements.mouth.cavity.scale.set(1.0, cavityScaleY, cavityScaleZ);
  elements.mouth.cavity.position.y = -0.004 - effectiveJawOpen * 0.008;

  // ─────────────────────────────────────────────
  // 3. CEJAS MEMOJI-LIKE CON APORTE SONRISA (Fase 4C + F4D)
  // ─────────────────────────────────────────────
  const effectiveInnerUpL = currentState.browInnerUp * (1.0 - currentState.browDownLeft);
  const effectiveInnerUpR = currentState.browInnerUp * (1.0 - currentState.browDownRight);

  const leftBrowYOffset  = currentState.browUpLeft * 0.014 + effectiveInnerUpL * 0.008 - currentState.browDownLeft * 0.010 + smileCoordinatedBrowLiftL;
  const rightBrowYOffset = currentState.browUpRight * 0.014 + effectiveInnerUpR * 0.008 - currentState.browDownRight * 0.010 + smileCoordinatedBrowLiftR;

  const leftBrowXOffset  = currentState.browDownLeft * 0.003;
  const rightBrowXOffset = -currentState.browDownRight * 0.003;

  const leftBrowRotZ  =  currentState.browDownLeft * 0.18 - effectiveInnerUpL * 0.18 - currentState.browUpLeft * 0.06;
  const rightBrowRotZ = -currentState.browDownRight * 0.18 + effectiveInnerUpR * 0.18 + currentState.browUpRight * 0.06;

  elements.leftBrow.position.x  = FACE_CONFIG.leftBrow.position[0] + leftBrowXOffset;
  elements.leftBrow.position.y  = FACE_CONFIG.leftBrow.position[1] + leftBrowYOffset;

  elements.rightBrow.position.x = FACE_CONFIG.rightBrow.position[0] + rightBrowXOffset;
  elements.rightBrow.position.y = FACE_CONFIG.rightBrow.position[1] + rightBrowYOffset;
  
  elements.leftBrow.rotation.z  = FACE_CONFIG.leftBrow.rotation[2] + leftBrowRotZ;
  elements.rightBrow.rotation.z = FACE_CONFIG.rightBrow.rotation[2] + rightBrowRotZ;

  elements.axesHelper.visible = debugMode;
  if (elements.markers) {
    for (const m of elements.markers) m.visible = debugMode;
  }
}

function usarFaceTracking(
  video: HTMLVideoElement | null,
  activoTrack: boolean
) {
  const estado = useRef<TrackState>({
    matrix: new THREE.Matrix4(),
    facialState: {
      jawOpen: 0,
      smileLeft: 0,
      smileRight: 0,
      blinkLeft: 0,
      blinkRight: 0,
      squintLeft: 0,
      squintRight: 0,
      browDownLeft: 0,
      browDownRight: 0,
      browUpLeft: 0,
      browUpRight: 0,
      browInnerUp: 0,
      lookX: 0,
      lookY: 0,
    },
    ready: false,
  });
  const [status, setStatus] = useState<
    "inactivo" | "cargando" | "listo" | "error"
  >("inactivo");
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [rostroDetectado, setRostroDetectado] = useState<boolean>(false);
  const [aperturaBoca, setAperturaBoca] = useState<number>(0);
  const [sonrisaNivel, setSonrisaNivel] = useState<number>(0);
  const [parpadeoL, setParpadeoL] = useState<number>(0);
  const [parpadeoR, setParpadeoR] = useState<number>(0);
  const [squintL, setSquintL] = useState<number>(0);
  const [squintR, setSquintR] = useState<number>(0);

  const videoRefActual = useRef<HTMLVideoElement | null>(video);
  videoRefActual.current = video;

  useEffect(() => {
    if (!activoTrack) {
      setStatus("inactivo");
      return;
    }

    setStatus("cargando");
    let landmarker: FaceLandmarker | null = null;
    let raf = 0;
    let activo = true;
    let lastVideoTime = -1;
    let detectando = false;
    let lastInferenceTime = 0;
    let lastUiUpdate = 0;

    const timeoutId = setTimeout(() => {
      if (activo && !landmarker) {
        setDetalleError("timeout: no cargó en 20s (red lenta o CDN bloqueado)");
        setStatus("error");
      }
    }, 20000);

    async function iniciar() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        if (!activo) return;

        try {
          landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            outputFacialTransformationMatrixes: true,
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        } catch {
          landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            outputFacialTransformationMatrixes: true,
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        }

        clearTimeout(timeoutId);
        if (!activo) {
          landmarker?.close();
          return;
        }
        setStatus("listo");
        loop();
      } catch (e) {
        clearTimeout(timeoutId);
        console.error("[memoji-poc] error iniciando face tracking", e);
        setDetalleError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    }

    function loop() {
      if (!activo) return;

      const vid = videoRefActual.current;
      if (
        landmarker &&
        vid &&
        vid.readyState >= 2 &&
        !vid.paused &&
        !detectando
      ) {
        const now = performance.now();
        if (now - lastInferenceTime >= 33 && vid.currentTime !== lastVideoTime) {
          lastInferenceTime = now;
          lastVideoTime = vid.currentTime;
          detectando = true;
          try {
            const resultado: FaceLandmarkerResult = landmarker.detectForVideo(
              vid,
              now
            );

            const mat = resultado.facialTransformationMatrixes?.[0]?.data;
            if (mat && mat.length === 16) {
              estado.current.matrix.fromArray(mat);
              estado.current.ready = true;
            } else {
              estado.current.ready = false;
            }

            const cats = resultado.faceBlendshapes?.[0]?.categories;
            if (cats && cats.length > 0) {
              const shapes: Record<string, number> = {};
              for (let i = 0; i < cats.length; i++) {
                shapes[cats[i].categoryName] = cats[i].score;
              }
              const fs = estado.current.facialState;
              fs.jawOpen = shapes["jawOpen"] ?? 0;
              fs.smileLeft = shapes["mouthSmileLeft"] ?? 0;
              fs.smileRight = shapes["mouthSmileRight"] ?? 0;
              fs.blinkLeft = shapes["eyeBlinkLeft"] ?? 0;
              fs.blinkRight = shapes["eyeBlinkRight"] ?? 0;
              fs.squintLeft = shapes["eyeSquintLeft"] ?? 0;
              fs.squintRight = shapes["eyeSquintRight"] ?? 0;
              fs.browDownLeft = shapes["browDownLeft"] ?? 0;
              fs.browDownRight = shapes["browDownRight"] ?? 0;
              fs.browUpLeft =
                shapes["browUpLeft"] ??
                shapes["browOuterUpLeft"] ??
                0;
              fs.browUpRight =
                shapes["browUpRight"] ??
                shapes["browOuterUpRight"] ??
                0;
              fs.browInnerUp = shapes["browInnerUp"] ?? 0;

              // Extracción de blendshapes de mirada (Fase 3B)
              const lookInL   = shapes["eyeLookInLeft"]    ?? 0;
              const lookOutL  = shapes["eyeLookOutLeft"]   ?? 0;
              const lookUpL   = shapes["eyeLookUpLeft"]    ?? 0;
              const lookDownL = shapes["eyeLookDownLeft"]  ?? 0;

              const lookInR   = shapes["eyeLookInRight"]   ?? 0;
              const lookOutR  = shapes["eyeLookOutRight"]  ?? 0;
              const lookUpR   = shapes["eyeLookUpRight"]   ?? 0;
              const lookDownR = shapes["eyeLookDownRight"] ?? 0;

              // Mapeo horizontal (lookX: -1 izq .. +1 der) y vertical (lookY: -1 abajo .. +1 arriba)
              const rawLookX = ((lookInL - lookOutL) + (lookOutR - lookInR)) / 2;
              const rawLookY = ((lookUpL - lookDownL) + (lookUpR - lookDownR)) / 2;

              fs.lookX = THREE.MathUtils.clamp(rawLookX, -1, 1);
              fs.lookY = THREE.MathUtils.clamp(rawLookY, -1, 1);
            }

            if (now - lastUiUpdate > 120) {
              lastUiUpdate = now;
              setRostroDetectado(estado.current.ready);
              setAperturaBoca(
                Math.round(estado.current.facialState.jawOpen * 100)
              );
              const smile = Math.round(
                ((estado.current.facialState.smileLeft +
                  estado.current.facialState.smileRight) /
                  2) *
                  100
              );
              setSonrisaNivel(smile);
              setParpadeoL(
                Math.round(estado.current.facialState.blinkLeft * 100)
              );
              setParpadeoR(
                Math.round(estado.current.facialState.blinkRight * 100)
              );
              setSquintL(
                Math.round(estado.current.facialState.squintLeft * 100)
              );
              setSquintR(
                Math.round(estado.current.facialState.squintRight * 100)
              );
            }
          } catch {
          } finally {
            detectando = false;
          }
        }
      }

      raf = requestAnimationFrame(loop);
    }

    iniciar();

    return () => {
      activo = false;
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf);
      try {
        landmarker?.close();
      } catch {}
    };
  }, [activoTrack]);

  return {
    estado,
    status,
    detalleError,
    rostroDetectado,
    aperturaBoca,
    sonrisaNivel,
    parpadeoL,
    parpadeoR,
    squintL,
    squintR,
  };
}

// ──────────────────────────────────────────────────────────
//  FACE RIG CALIBRATOR — localStorage helpers
// ──────────────────────────────────────────────────────────
const LS_KEY = "facerig_calibration_v1";

function getRigObject(rig: FaceRigElements, key: ElementKey): THREE.Object3D {
  const el = rig[key];
  if (!el) return new THREE.Object3D();
  if (key === 'leftEye' || key === 'rightEye') {
    return (el as EyeAssembly).group || (el as unknown as THREE.Object3D);
  }
  if (key === 'mouth') {
    return (el as MouthAssembly).group || (el as unknown as THREE.Object3D);
  }
  return el as THREE.Mesh;
}

function saveCalibToLS(rig: FaceRigElements) {
  const data: Record<string, unknown> = {};
  for (const k of ELEMENT_KEYS) {
    const obj = getRigObject(rig, k);
    data[k] = {
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale:    [obj.scale.x,    obj.scale.y,    obj.scale.z],
    };
  }
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function loadCalibFromLS(rig: FaceRigElements) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, { position: number[]; rotation: number[]; scale: number[] }>;
    for (const k of ELEMENT_KEYS) {
      if (!data[k]) continue;
      const obj = getRigObject(rig, k);
      const { position: p, rotation: r, scale: s } = data[k];
      if (p) obj.position.set(p[0], p[1], p[2]);
      if (r) obj.rotation.set(r[0], r[1], r[2]);
      if (s) obj.scale.set(s[0], s[1], s[2]);
    }
  } catch {}
}

function buildConfigString(rig: FaceRigElements): string {
  const lines: string[] = ["const FACE_CONFIG_CALIBRATED = {"];
  for (const k of ELEMENT_KEYS) {
    const obj = getRigObject(rig, k);
    const p = obj.position;
    const r = obj.rotation;
    const s = obj.scale;
    lines.push(`  ${k}: {`);
    lines.push(`    position: [${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)}],`);
    lines.push(`    rotation: [${r.x.toFixed(4)}, ${r.y.toFixed(4)}, ${r.z.toFixed(4)}],`);
    lines.push(`    scale:    [${s.x.toFixed(4)}, ${s.y.toFixed(4)}, ${s.z.toFixed(4)}],`);
    lines.push(`  },`);
  }
  lines.push("};");
  return lines.join("\n");
}

// Initial positions snapshot (set on first load)
const INITIAL_POSITIONS: Partial<Record<ElementKey, { p: THREE.Vector3; r: THREE.Euler; s: THREE.Vector3 }>> = {};

// ──────────────────────────────────────────────────────────
//  FaceRigGizmo — runs inside <Canvas>
// ──────────────────────────────────────────────────────────
function FaceRigGizmo({
  faceRigRef,
  selectedEl,
  gizmoMode,
  onCoordsUpdate,
}: {
  faceRigRef: React.MutableRefObject<FaceRigElements | null>;
  selectedEl: ElementKey | null;
  gizmoMode: "translate" | "rotate" | "scale";
  onCoordsUpdate: (c: LiveCoords) => void;
}) {
  const { gl } = useThree();
  const lastUpdate = useRef(0);

  const selectedMesh = useMemo<THREE.Object3D | null>(() => {
    if (!selectedEl || !faceRigRef.current) return null;
    return getRigObject(faceRigRef.current, selectedEl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEl, faceRigRef.current]);

  useFrame(() => {
    if (!selectedMesh) return;
    const now = performance.now();
    if (now - lastUpdate.current < 60) return;
    lastUpdate.current = now;
    const p = selectedMesh.position;
    const r = selectedMesh.rotation;
    const s = selectedMesh.scale;
    onCoordsUpdate({
      position: [p.x, p.y, p.z],
      rotation: [
        THREE.MathUtils.radToDeg(r.x),
        THREE.MathUtils.radToDeg(r.y),
        THREE.MathUtils.radToDeg(r.z),
      ],
      scale: [s.x, s.y, s.z],
    });
  });

  if (!selectedMesh) return null;

  return (
    <TransformControls
      object={selectedMesh}
      mode={gizmoMode}
      space="local"
      size={0.6}
      onMouseDown={() => gl.domElement.style.cursor = "grabbing"}
      onMouseUp={()   => gl.domElement.style.cursor = "default"}
    />
  );
}

function PulpoPlaceholder({ estado }: { estado: React.RefObject<TrackState> }) {
  const grupo = useRef<THREE.Group>(null);
  const mandibula = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!grupo.current) return;
    const e = estado.current;
    if (e.ready) {
      const rot = new THREE.Quaternion().setFromRotationMatrix(e.matrix);
      grupo.current.quaternion.slerp(rot, 0.35);
    }
    if (mandibula.current) {
      const apertura = 0.05 + (e.facialState?.jawOpen ?? 0) * 0.35;
      mandibula.current.scale.y = apertura / 0.05;
      mandibula.current.position.y = -0.35 - apertura / 2;
    }
  });

  return (
    <group ref={grupo}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#10e7a0" />
      </mesh>
      <mesh position={[-0.28, 0.15, 0.65]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#052e22" />
      </mesh>
      <mesh position={[0.28, 0.15, 0.65]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#052e22" />
      </mesh>
      <mesh ref={mandibula} position={[0, -0.35, 0.6]}>
        <boxGeometry args={[0.35, 0.05, 0.1]} />
        <meshStandardMaterial color="#052e22" />
      </mesh>
    </group>
  );
}

function PulpoModelo({
  estado,
  rotacionY = -Math.PI / 2,
  invertirEspejo = true,
  invertirPitch = false,
  offsetCalibrado = { x: 0, y: 0, z: 0 },
  debugFaceRig = false,
  calibMode = false,
  faceRigRef,
}: {
  estado: React.RefObject<TrackState>;
  rotacionY?: number;
  invertirEspejo?: boolean;
  invertirPitch?: boolean;
  offsetCalibrado?: { x: number; y: number; z: number };
  debugFaceRig?: boolean;
  calibMode?: boolean;
  faceRigRef?: React.MutableRefObject<FaceRigElements | null>;
}) {
  const grupo = useRef<THREE.Group>(null);
  const gltf = useGLTF(MODEL_PATH);

  // Fase 7 — Microanimaciones idle: fases aleatorias para que respiración/sway
  // de dos instancias nunca se vean sincronizadas entre sí.
  const idleLifeRef = useRef({
    breathPhase: Math.random() * Math.PI * 2,
    swayPhaseYaw: Math.random() * Math.PI * 2,
    swayPhasePitch: Math.random() * Math.PI * 2,
  });

  const currentFacialState = useRef<FacialState>({
    jawOpen: 0, smileLeft: 0, smileRight: 0,
    blinkLeft: 0, blinkRight: 0,
    squintLeft: 0, squintRight: 0,
    browDownLeft: 0, browDownRight: 0,
    browUpLeft: 0, browUpRight: 0,
    browInnerUp: 0,
    lookX: 0, lookY: 0,
  });

  const ESCALA_AVATAR = 2.15;
  const eyeBonesRef = useRef<{ left: THREE.Bone | null; right: THREE.Bone | null }>({ left: null, right: null });

  const { modeloCentrado, faceRigElements } = useMemo(() => {
    const scene = SkeletonUtils.clone(gltf.scene);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const factorEscala = ESCALA_AVATAR / (maxDim || 1);
    scene.scale.setScalar(factorEscala);

    const todosLosBones: THREE.Bone[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true; }
      if ((child as THREE.Bone).isBone) todosLosBones.push(child as THREE.Bone);
    });

    const headBone = todosLosBones.find(
      (b) => b.name === "Head" || b.name.toLowerCase().includes("head")
    );
    const eyeBoneL = todosLosBones.find((b) => b.name === "Eye_L");
    const eyeBoneR = todosLosBones.find((b) => b.name === "Eye_R");
    if (eyeBoneL) eyeBonesRef.current.left = eyeBoneL;
    if (eyeBoneR) eyeBonesRef.current.right = eyeBoneR;

    let elements: FaceRigElements | null = null;
    const headPosWorld = new THREE.Vector3();

    if (headBone) {
      console.log("[PulpoVolt FaceRig] Head encontrado");
      elements = createFaceRig();

      // Snapshot initial positions for Reset
      for (const k of ELEMENT_KEYS) {
        const obj = getRigObject(elements, k);
        INITIAL_POSITIONS[k] = {
          p: obj.position.clone(),
          r: obj.rotation.clone(),
          s: obj.scale.clone(),
        };
      }

      // Load saved calibration if available
      loadCalibFromLS(elements);

      headBone.add(elements.group);
      // El GLB ya trae el face rig real (shape keys + Eye_L/Eye_R): el rig
      // procedural queda montado (debug/calibración lo siguen usando) pero
      // oculto para no duplicar cejas/boca sobre la cara real.
      elements.group.visible = false;
      console.log("[PulpoVolt FaceRig] FaceRig creado (oculto, usando morphs reales)");

      scene.updateMatrixWorld(true);
      headBone.getWorldPosition(headPosWorld);
      scene.position.x = -headPosWorld.x;
      scene.position.y = -headPosWorld.y - 0.26;
      scene.position.z = -headPosWorld.z;
    } else {
      console.warn("⚠️ Head bone not found en el GLB!");
      const center = box.getCenter(new THREE.Vector3());
      scene.position.x = -center.x * factorEscala;
      scene.position.y = (-center.y - size.y * 0.15) * factorEscala;
      scene.position.z = -center.z * factorEscala;
    }

    // Expose to parent via ref
    if (faceRigRef) faceRigRef.current = elements;

    return { modeloCentrado: scene, faceRigElements: elements };
  }, [gltf.scene]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!grupo.current) return;
    const e = estado.current;

    // Morph Targets del GLB (Blender face rig real, 20 shape keys incluyendo
    // wink/surprised). El FaceRig procedural queda oculto (ver useMemo arriba)
    // para no duplicar cejas/boca sobre la cara real.
    if (modeloCentrado && e.facialState) {
      modeloCentrado.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          const dict = mesh.morphTargetDictionary;
          const inf = mesh.morphTargetInfluences;
          const fs = e.facialState;
          if ('jawOpen' in dict) inf[dict['jawOpen']] = fs.jawOpen || 0;
          if ('smileLeft' in dict) inf[dict['smileLeft']] = fs.smileLeft || 0;
          if ('smileRight' in dict) inf[dict['smileRight']] = fs.smileRight || 0;
          if ('blinkLeft' in dict) inf[dict['blinkLeft']] = fs.blinkLeft || 0;
          if ('blinkRight' in dict) inf[dict['blinkRight']] = fs.blinkRight || 0;
          if ('squintLeft' in dict) inf[dict['squintLeft']] = fs.squintLeft || 0;
          if ('squintRight' in dict) inf[dict['squintRight']] = fs.squintRight || 0;
          if ('browUpLeft' in dict) inf[dict['browUpLeft']] = fs.browUpLeft || 0;
          if ('browUpRight' in dict) inf[dict['browUpRight']] = fs.browUpRight || 0;
          if ('browDownLeft' in dict) inf[dict['browDownLeft']] = fs.browDownLeft || 0;
          if ('browDownRight' in dict) inf[dict['browDownRight']] = fs.browDownRight || 0;
          if ('browInnerUp' in dict) inf[dict['browInnerUp']] = fs.browInnerUp || 0;
        }
        // Los eyeballs postizos (Sclera+Pupil) son rigidos y no se deforman
        // junto con el parpado/socket: apenas el parpado empieza a cerrar (o
        // el squint aprieta el ojo) hay que esconderlos, si no el iris queda
        // flotando fuera del hueco. Umbral bajo (0.25) para que se oculten
        // bien antes de que la deformacion real se note.
        const HIDE_START = 0.25;
        const closureL = Math.max(e.facialState.blinkLeft || 0, (e.facialState.squintLeft || 0) * 0.7);
        const closureR = Math.max(e.facialState.blinkRight || 0, (e.facialState.squintRight || 0) * 0.7);
        if (child.name.startsWith("Eyeball_L")) {
          const t = THREE.MathUtils.clamp((closureL - HIDE_START) / (1 - HIDE_START), 0, 1);
          child.scale.setScalar(THREE.MathUtils.lerp(1, 0.02, t));
        } else if (child.name.startsWith("Eyeball_R")) {
          const t = THREE.MathUtils.clamp((closureR - HIDE_START) / (1 - HIDE_START), 0, 1);
          child.scale.setScalar(THREE.MathUtils.lerp(1, 0.02, t));
        }
      });

      // Gaze real: rotar los bones Eye_L/Eye_R segun lookX/lookY.
      const MAX_EYE_YAW = 0.35;
      const MAX_EYE_PITCH = 0.22;
      const gazeYaw = THREE.MathUtils.clamp(e.facialState.lookX || 0, -1, 1) * MAX_EYE_YAW;
      const gazePitch = THREE.MathUtils.clamp(e.facialState.lookY || 0, -1, 1) * MAX_EYE_PITCH;
      const { left: eyeL, right: eyeR } = eyeBonesRef.current;
      if (eyeL) { eyeL.rotation.y = gazeYaw; eyeL.rotation.x = gazePitch; }
      if (eyeR) { eyeR.rotation.y = gazeYaw; eyeR.rotation.x = gazePitch; }
    }

    if (faceRigElements && e.facialState && !calibMode) {
      updateFaceRig(faceRigElements, e.facialState, currentFacialState.current, debugFaceRig, e.ready);
    } else if (faceRigElements) {
      faceRigElements.axesHelper.visible = debugFaceRig;
      if (faceRigElements.markers) {
        for (const m of faceRigElements.markers) m.visible = debugFaceRig;
      }
    }

    // En modo calibración: congela la rotación en frente (-90° Y)
    if (calibMode) {
      const targetQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, rotacionY, 0, "YXZ")
      );
      grupo.current.quaternion.slerp(targetQuat, 0.15);
      grupo.current.scale.setScalar(1);
      return;
    }

    // Fase 7 — Microanimaciones idle (respiración + head sway).
    // Sin esto, Volt se congela apenas no hay tracking: la respiración corre
    // siempre (viva incluso con cara detectada), el sway solo cuando no hay
    // rostro (para no pelear con la rotación real del usuario).
    const life = idleLifeRef.current;
    const tSec = performance.now() / 1000;
    const BREATH_CYCLE_S = 3.6;
    const BREATH_AMOUNT = 0.012;
    const breath = (Math.sin(tSec * ((Math.PI * 2) / BREATH_CYCLE_S) + life.breathPhase) + 1) / 2; // 0..1
    const breathScale = 1 + breath * BREATH_AMOUNT;

    if (e.ready) {
      const eulerRaw = new THREE.Euler().setFromRotationMatrix(e.matrix, "YXZ");
      const deadZone = (val: number, umbral = 0.007) => Math.abs(val) < umbral ? 0 : val;

      const pitch = THREE.MathUtils.clamp((invertirPitch ? -1 : 1) * deadZone(eulerRaw.x - offsetCalibrado.x), -0.65, 0.65);
      const yaw   = THREE.MathUtils.clamp((invertirEspejo ? -1 : 1) * deadZone(eulerRaw.y - offsetCalibrado.y), -1.15, 1.15);
      const roll  = THREE.MathUtils.clamp(-deadZone(eulerRaw.z - offsetCalibrado.z), -0.5, 0.5);

      grupo.current.quaternion.slerp(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw + rotacionY, roll, "YXZ")),
        0.22
      );

      const jawO = e.facialState?.jawOpen || 0;
      const smileBoost = (((e.facialState?.smileLeft || 0) + (e.facialState?.smileRight || 0)) / 2) * 0.04;
      grupo.current.scale.y = THREE.MathUtils.damp(grupo.current.scale.y, breathScale + jawO * 0.15 + smileBoost, 14, delta);
      grupo.current.scale.x = THREE.MathUtils.damp(grupo.current.scale.x, breathScale - jawO * 0.05 + smileBoost, 14, delta);
      grupo.current.scale.z = THREE.MathUtils.damp(grupo.current.scale.z, breathScale - jawO * 0.05, 14, delta);
    } else {
      // Sin rostro detectado: nada de tracking real que respetar. En vez de
      // congelar la última pose, deriva lento con dos senoidales de período
      // distinto (evita el loop mecánico de una sola onda) + respiración.
      const SWAY_YAW_MAX = THREE.MathUtils.degToRad(0.5);
      const SWAY_PITCH_MAX = THREE.MathUtils.degToRad(0.3);
      const swayYaw = Math.sin(tSec * ((Math.PI * 2) / 7.1) + life.swayPhaseYaw) * SWAY_YAW_MAX;
      const swayPitch = Math.sin(tSec * ((Math.PI * 2) / 5.3) + life.swayPhasePitch) * SWAY_PITCH_MAX;

      grupo.current.quaternion.slerp(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(swayPitch, swayYaw + rotacionY, 0, "YXZ")),
        0.05
      );

      grupo.current.scale.y = THREE.MathUtils.damp(grupo.current.scale.y, breathScale, 14, delta);
      grupo.current.scale.x = THREE.MathUtils.damp(grupo.current.scale.x, breathScale, 14, delta);
      grupo.current.scale.z = THREE.MathUtils.damp(grupo.current.scale.z, breathScale, 14, delta);
    }
  });

  return (
    <group ref={grupo}>
      <primitive object={modeloCentrado} />
    </group>
  );
}


export default function MemojiPoc() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [hayModelo, setHayModelo] = useState<boolean | null>(null);
  const ROT_Y_FRENTE = -Math.PI / 2;
  const [invertirEspejo, setInvertirEspejo] = useState<boolean>(true);
  const [invertirPitch, setInvertirPitch] = useState<boolean>(false);
  const [debugFaceRig, setDebugFaceRig] = useState<boolean>(false);
  const [offsetCalibrado, setOffsetCalibrado] = useState<{
    x: number;
    y: number;
    z: number;
  }>({ x: 0, y: 0, z: 0 });
  const [mostrarCamara, setMostrarCamara] = useState<boolean>(true);
  const [intentoCamara, setIntentoCamara] = useState<number>(0);
  const [trackingIniciado, setTrackingIniciado] = useState<boolean>(false);

  // ── Calibrador ──────────────────────────────────────────
  const faceRigRef = useRef<FaceRigElements | null>(null);
  const [calibMode, setCalibMode] = useState(false);
  const [selectedEl, setSelectedEl] = useState<ElementKey | null>(null);
  const [gizmoMode, setGizmoMode] = useState<"translate" | "rotate" | "scale">("translate");
  const [liveCoords, setLiveCoords] = useState<LiveCoords>({
    position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  });
  const [configText, setConfigText] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCoordsUpdate = useCallback((c: LiveCoords) => setLiveCoords(c), []);

  const handleReset = () => {
    const rig = faceRigRef.current;
    if (!rig) return;
    for (const k of ELEMENT_KEYS) {
      const snap = INITIAL_POSITIONS[k];
      if (!snap) continue;
      const obj = getRigObject(rig, k);
      obj.position.copy(snap.p);
      obj.rotation.copy(snap.r);
      obj.scale.copy(snap.s);
    }
  };

  const handleSave = () => {
    const rig = faceRigRef.current;
    if (!rig) return;
    saveCalibToLS(rig);
    hapticoDial();
  };

  const handleCopy = () => {
    const rig = faceRigRef.current;
    if (!rig) return;
    const txt = buildConfigString(rig);
    setConfigText(txt);
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStep = (axis: "x" | "y" | "z", delta: number) => {
    if (!selectedEl || !faceRigRef.current) return;
    const obj = getRigObject(faceRigRef.current, selectedEl);
    if (gizmoMode === "translate") obj.position[axis] += delta;
    else if (gizmoMode === "rotate") obj.rotation[axis] += delta * (Math.PI / 180);
    else if (gizmoMode === "scale") obj.scale[axis] += delta;
  };


  useEffect(() => {
    fetch(MODEL_PATH, { method: "HEAD" })
      .then((r) => {
        const ct = r.headers.get("content-type") || "";
        const esValido = r.ok && !ct.includes("text/html");
        setHayModelo(esValido);
      })
      .catch(() => setHayModelo(false));
  }, []);

  useEffect(() => {
    if (!trackingIniciado) return;
    let stream: MediaStream | null = null;
    let activo = true;

    async function pedirCamara() {
      setCamError(null);
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (!activo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play();
              setVideo(videoRef.current);
            } catch (e) {
              console.error("[memoji-poc] error al reproducir video", e);
            }
          };
          try {
            await videoRef.current.play();
            setVideo(videoRef.current);
          } catch {}
        }
      } catch (e) {
        console.error("[memoji-poc] error de cámara", e);
        setCamError(
          "No se pudo acceder a la cámara. Verificá los permisos del navegador o cerrá otras apps que la usen."
        );
      }
    }

    pedirCamara();

    return () => {
      activo = false;
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
        videoRef.current.srcObject = null;
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [trackingIniciado, intentoCamara]);

  const {
    estado,
    status,
    detalleError,
    rostroDetectado,
    aperturaBoca,
    sonrisaNivel,
    parpadeoL,
    parpadeoR,
    squintL,
    squintR,
  } = usarFaceTracking(video, trackingIniciado);

  const calibrarCentro = () => {
    hapticoDial();
    if (estado.current.ready) {
      const euler = new THREE.Euler().setFromRotationMatrix(
        estado.current.matrix,
        "YXZ"
      );
      setOffsetCalibrado({ x: euler.x, y: euler.y, z: euler.z });
    }
  };

  return (
    <div className="min-h-screen bg-[#070c0a] text-white flex flex-col p-4 md:p-6 font-sans">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Pulpo Volt{" "}
            <span className="text-[#10e7a0] font-mono text-sm px-2 py-0.5 rounded-full bg-[#10e7a0]/10 border border-[#10e7a0]/20">
              Memoji 3D
            </span>
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Face Tracking con MediaPipe &amp; Rigged GLB Three.js
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              status === "listo"
                ? "bg-[#10e7a0] animate-pulse"
                : status === "cargando"
                ? "bg-amber-400 animate-pulse"
                : status === "inactivo"
                ? "bg-white/30"
                : "bg-rose-500"
            }`}
          />
          <span className="text-xs font-mono text-white/80 uppercase">
            {status === "listo"
              ? "Listo"
              : status === "cargando"
              ? "Iniciando..."
              : status === "inactivo"
              ? "Listo para iniciar"
              : "Error"}
          </span>
        </div>
      </header>

      {detalleError && (
        <div className="max-w-4xl mx-auto w-full p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <b>Error:</b> {detalleError}
        </div>
      )}

      {camError && (
        <div className="max-w-4xl mx-auto w-full p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <span>{camError}</span>
          <button
            onClick={() => setIntentoCamara((c) => c + 1)}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-medium text-amber-200 border border-amber-500/40 text-xs shrink-0 transition active:scale-95"
          >
            🔄 Reintentar cámara
          </button>
        </div>
      )}

      <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-6 items-center justify-center">
        {/* Visor 3D Principal */}
        <div className="relative w-full max-w-[420px] aspect-square sm:aspect-[4/4.5] rounded-[24px] overflow-hidden bg-gradient-to-b from-[#0e1613] to-[#080d0b] border border-white/10 shadow-2xl flex items-center justify-center">
        <Canvas
            camera={{ position: [0, 0, 2.0], fov: 40 }}
            gl={{ antialias: true, alpha: true }}
            className="w-full h-full"
          >
            <ambientLight intensity={0.65} />
            <directionalLight position={[2, 3, 3]} intensity={1.3} />
            <directionalLight position={[-1, -1, 2]} intensity={0.4} color="#ffffff" />
            <directionalLight position={[-3, 2, -2]} intensity={2.6} color="#10e7a0" />
            <pointLight position={[0, -2, 1.5]} intensity={0.6} color="#10e7a0" />

            {hayModelo ? (
              <Suspense fallback={<PulpoPlaceholder estado={estado} />}>
                <PulpoModelo
                  estado={estado}
                  rotacionY={ROT_Y_FRENTE}
                  invertirEspejo={invertirEspejo}
                  invertirPitch={invertirPitch}
                  offsetCalibrado={offsetCalibrado}
                  debugFaceRig={debugFaceRig}
                  calibMode={calibMode}
                  faceRigRef={faceRigRef}
                />
              </Suspense>
            ) : (
              <PulpoPlaceholder estado={estado} />
            )}

            {calibMode && (
              <>
                <OrbitControls makeDefault />
                <FaceRigGizmo
                  faceRigRef={faceRigRef}
                  selectedEl={selectedEl}
                  gizmoMode={gizmoMode}
                  onCoordsUpdate={handleCoordsUpdate}
                />
              </>
            )}
          </Canvas>

          {!trackingIniciado && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-[#10e7a0]/15 border border-[#10e7a0]/30 flex items-center justify-center text-2xl shadow-inner">
                🐙
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-sm">
                  Pulpo Volt Memoji 3D
                </h3>
                <p className="text-[11px] text-white/60 max-w-[240px]">
                  Presioná para activar tu cámara y mover la cabeza y gestos de
                  Volt.
                </p>
              </div>
              <button
                onClick={() => {
                  hapticoDial();
                  setTrackingIniciado(true);
                }}
                className="mt-1 px-5 py-2.5 rounded-full bg-[#10e7a0] hover:bg-[#10e7a0]/90 active:scale-95 text-black font-bold text-xs shadow-lg shadow-[#10e7a0]/40 transition flex items-center gap-2"
              >
                <span>📹</span> Activar cámara y tracking
              </button>
            </div>
          )}

          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-[#10e7a0]/30 text-[11px] text-[#10e7a0] flex items-center gap-1.5 font-medium shadow-sm z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10e7a0] animate-ping" />
            🐙 Pulpo Volt (Rigged GLB)
          </div>

          <button
            onClick={calibrarCentro}
            className="absolute top-3 right-3 bg-black/50 hover:bg-[#10e7a0]/20 active:scale-95 transition backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] text-[#10e7a0] font-medium flex items-center gap-1"
            title="Centrar la mirada donde estás mirando ahora"
          >
            🎯 Calibrar centro
          </button>

          <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-[18px] border border-white/10 text-xs">
            <button
              onClick={() => {
                hapticoDial();
                setInvertirEspejo(!invertirEspejo);
              }}
              className={`px-2 py-1 rounded-[8px] text-[11px] font-medium transition ${
                invertirEspejo
                  ? "bg-[#10e7a0]/20 text-[#10e7a0] border border-[#10e7a0]/40"
                  : "bg-white/10 text-white/60"
              }`}
              title="Invertir giro horizontal (modo espejo)"
            >
              🪞 Espejo {invertirEspejo ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => {
                hapticoDial();
                setInvertirPitch(!invertirPitch);
              }}
              className={`px-2 py-1 rounded-[8px] text-[11px] font-medium transition ${
                invertirPitch
                  ? "bg-[#10e7a0]/20 text-[#10e7a0] border border-[#10e7a0]/40"
                  : "bg-white/10 text-white/60"
              }`}
              title="Invertir inclinación vertical (arriba/abajo)"
            >
              ↕️ Vertical {invertirPitch ? "INV" : "NORM"}
            </button>
            <button
              onClick={() => {
                hapticoDial();
                setDebugFaceRig(!debugFaceRig);
              }}
              className={`px-2 py-1 rounded-[8px] text-[11px] font-medium transition ${
                debugFaceRig
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                  : "bg-white/10 text-white/60"
              }`}
              title="Mostrar AxesHelper y logs de debug de la cara"
            >
              🐛 DEBUG FACE RIG {debugFaceRig ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Panel lateral: Video / Telemetría */}
        <div className="w-full max-w-[420px] flex flex-col gap-4">
          <div className="p-4 rounded-[20px] bg-[#0c1410] border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                Cámara frontal
                <span
                  className={`w-2 h-2 rounded-full ${
                    rostroDetectado ? "bg-[#10e7a0] animate-pulse" : "bg-amber-400"
                  }`}
                />
              </h2>
              <button
                onClick={() => {
                  hapticoDial();
                  setMostrarCamara(!mostrarCamara);
                }}
                className="text-xs text-[#10e7a0] hover:underline"
              >
                {mostrarCamara ? "Ocultar preview" : "Ver cámara"}
              </button>
            </div>

            <div
              className={`${
                mostrarCamara ? "relative aspect-video" : "hidden"
              } w-full rounded-[14px] overflow-hidden bg-black border border-white/10`}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover -scale-x-100"
                autoPlay
                muted
                playsInline
              />
              <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-white/70">
                Espejo
              </span>
            </div>

            <div className="text-xs text-white/60 space-y-2.5 pt-1">
              <div className="flex justify-between items-center">
                <span>Rostro detectado:</span>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                    rostroDetectado
                      ? "bg-[#10e7a0]/15 text-[#10e7a0] font-semibold border border-[#10e7a0]/30"
                      : "bg-amber-400/15 text-amber-300 font-semibold border border-amber-400/30"
                  }`}
                >
                  {rostroDetectado ? "🟢 Siguiendo rostro" : "🟡 Buscando..."}
                </span>
              </div>

              {/* Medidor Apertura Boca */}
              <div className="flex justify-between items-center">
                <span>Apertura de boca:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10e7a0] transition-all duration-75"
                      style={{ width: `${Math.min(100, aperturaBoca)}%` }}
                    />
                  </div>
                  <span className="font-mono text-white/90 w-8 text-right">
                    {aperturaBoca}%
                  </span>
                </div>
              </div>

              {/* Medidor Sonrisa */}
              <div className="flex justify-between items-center">
                <span>Sonrisa:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10e7a0] transition-all duration-75"
                      style={{ width: `${Math.min(100, sonrisaNivel)}%` }}
                    />
                  </div>
                  <span className="font-mono text-white/90 w-8 text-right">
                    {sonrisaNivel}%
                  </span>
                </div>
              </div>

              {/* Medidor Parpadeo L */}
              <div className="flex justify-between items-center">
                <span>Parpadeo L:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10e7a0] transition-all duration-75"
                      style={{ width: `${Math.min(100, parpadeoL)}%` }}
                    />
                  </div>
                  <span className="font-mono text-white/90 w-8 text-right">
                    {parpadeoL}%
                  </span>
                </div>
              </div>

              {/* Medidor Parpadeo R */}
              <div className="flex justify-between items-center">
                <span>Parpadeo R:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10e7a0] transition-all duration-75"
                      style={{ width: `${Math.min(100, parpadeoR)}%` }}
                    />
                  </div>
                  <span className="font-mono text-white/90 w-8 text-right">
                    {parpadeoR}%
                  </span>
                </div>
              </div>

              {/* Medidor Squint L */}
              <div className="flex justify-between items-center">
                <span>Squint L:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10e7a0] transition-all duration-75"
                      style={{ width: `${Math.min(100, squintL)}%` }}
                    />
                  </div>
                  <span className="font-mono text-white/90 w-8 text-right">
                    {squintL}%
                  </span>
                </div>
              </div>

              {/* Medidor Squint R */}
              <div className="flex justify-between items-center">
                <span>Squint R:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10e7a0] transition-all duration-75"
                      style={{ width: `${Math.min(100, squintR)}%` }}
                    />
                  </div>
                  <span className="font-mono text-white/90 w-8 text-right">
                    {squintR}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── FACE RIG CALIBRATOR PANEL ─────────────── */}
          <div className="p-4 rounded-[20px] bg-[#0c1410] border border-amber-400/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                🎛️ Face Rig Calibrator
              </h2>
              <button
                onClick={() => { hapticoDial(); setCalibMode(v => !v); }}
                className={`px-2 py-1 rounded-[8px] text-[11px] font-bold transition ${
                  calibMode
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {calibMode ? "🔒 CALIBRACIÓN ON" : "📐 Activar calibración"}
              </button>
            </div>

            {calibMode && (
              <>
                {/* Selector de elemento */}
                <div className="grid grid-cols-3 gap-1">
                  {ELEMENT_KEYS.map(k => (
                    <button
                      key={k}
                      onClick={() => { hapticoDial(); setSelectedEl(k === selectedEl ? null : k); }}
                      className={`px-1.5 py-1 rounded-[7px] text-[10px] font-semibold transition text-center ${
                        selectedEl === k
                          ? "bg-amber-400/25 text-amber-300 border border-amber-400/50"
                          : "bg-white/8 text-white/60 border border-white/10"
                      }`}
                    >
                      {ELEMENT_LABELS[k]}
                    </button>
                  ))}
                </div>

                {/* Modo de gizmo */}
                <div className="flex gap-1">
                  {(["translate","rotate","scale"] as const).map(m => (
                    <button key={m}
                      onClick={() => { hapticoDial(); setGizmoMode(m); }}
                      className={`flex-1 px-1 py-1 rounded-[7px] text-[10px] font-bold uppercase transition ${
                        gizmoMode === m
                          ? "bg-[#10e7a0]/20 text-[#10e7a0] border border-[#10e7a0]/40"
                          : "bg-white/8 text-white/50"
                      }`}
                    >
                      {m === "translate" ? "Mover" : m === "rotate" ? "Rotar" : "Escalar"}
                    </button>
                  ))}
                </div>

                {/* Coordenadas en vivo */}
                {selectedEl && (
                  <div className="bg-black/30 rounded-[10px] p-3 font-mono text-[11px] space-y-1.5">
                    <p className="text-amber-300 font-bold mb-1">{ELEMENT_LABELS[selectedEl]}</p>
                    {(["position","rotation","scale"] as const).map(section => (
                      <div key={section}>
                        <p className="text-white/40 text-[10px] uppercase mb-0.5">{section}</p>
                        {(["X","Y","Z"] as const).map((ax, i) => (
                          <div key={ax} className="flex justify-between text-[11px]">
                            <span className="text-white/60">{ax}:</span>
                            <span className={
                              section === "position" ? "text-[#10e7a0]"
                              : section === "rotation" ? "text-amber-300"
                              : "text-blue-300"
                            }>
                              {section === "rotation"
                                ? `${liveCoords[section][i].toFixed(2)}°`
                                : liveCoords[section][i].toFixed(4)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Controles paso a paso (X, Y, Z) */}
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <p className="text-white/40 text-[10px] mb-1">
                        Ajuste fino de {gizmoMode === "translate" ? "Posición" : gizmoMode === "rotate" ? "Rotación" : "Escala"}
                      </p>
                      {(["x", "y", "z"] as const).map((ax, i) => (
                        <div key={ax} className="flex items-center gap-1">
                          <span className="text-[10px] text-white/50 w-3 uppercase">{ax}</span>
                          <button onClick={() => handleStep(ax, gizmoMode === "rotate" ? -5 : -0.01)} className="px-2 py-0.5 rounded bg-white/10 text-white/80 text-[10px] font-bold hover:bg-white/20 active:scale-95">−</button>
                          <span className="flex-1 text-center text-white/70 text-[10px] font-mono">
                            {gizmoMode === "translate" ? liveCoords.position[i].toFixed(4) :
                             gizmoMode === "rotate"    ? `${liveCoords.rotation[i].toFixed(1)}°` :
                                                         liveCoords.scale[i].toFixed(4)}
                          </span>
                          <button onClick={() => handleStep(ax, gizmoMode === "rotate" ? 5 : 0.01)} className="px-2 py-0.5 rounded bg-white/10 text-white/80 text-[10px] font-bold hover:bg-white/20 active:scale-95">+</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-col gap-1.5">
                  <button onClick={handleCopy}
                    className="w-full py-1.5 rounded-[8px] bg-[#10e7a0]/15 text-[#10e7a0] border border-[#10e7a0]/30 text-xs font-bold hover:bg-[#10e7a0]/25 transition">
                    {copied ? "✅ Copiado!" : "📋 Copiar configuración"}
                  </button>
                  <div className="flex gap-1.5">
                    <button onClick={handleSave}
                      className="flex-1 py-1.5 rounded-[8px] bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-semibold hover:bg-blue-500/25 transition">
                      💾 Guardar
                    </button>
                    <button onClick={() => { localStorage.removeItem(LS_KEY); hapticoDial(); }}
                      className="flex-1 py-1.5 rounded-[8px] bg-white/8 text-white/50 border border-white/10 text-xs hover:bg-white/15 transition">
                      🗑️ Borrar
                    </button>
                    <button onClick={handleReset}
                      className="flex-1 py-1.5 rounded-[8px] bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500/25 transition">
                      ↩️ Reset
                    </button>
                  </div>
                </div>

                {/* Output textarea */}
                {configText && (
                  <textarea
                    readOnly
                    value={configText}
                    className="w-full h-28 text-[10px] font-mono bg-black/40 text-[#10e7a0] rounded-[8px] p-2 border border-[#10e7a0]/20 resize-none"
                  />
                )}
              </>
            )}

            {!calibMode && (
              <p className="text-[11px] text-white/40 leading-relaxed">
                Activá el modo calibración para seleccionar y arrastrar los elementos del FaceRig con el gizmo 3D.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

