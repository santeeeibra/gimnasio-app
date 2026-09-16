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
  browDownLeft: number;
  browDownRight: number;
  browUpLeft: number;
  browUpRight: number;
};

type TrackState = {
  matrix: THREE.Matrix4;
  facialState: FacialState;
  jawOpen: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  browInnerUp: number;
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
  upperLid: THREE.Mesh;         // Párpado superior
  lowerLid: THREE.Mesh;         // Párpado inferior
  upperLidPivot: THREE.Group;   // Pivote para rotación del párpado superior
  lowerLidPivot: THREE.Group;   // Pivote para rotación del párpado inferior
}

export interface FaceRigElements {
  group: THREE.Group;
  leftEye: EyeAssembly;
  rightEye: EyeAssembly;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  mouth: THREE.Mesh;
  axesHelper: THREE.AxesHelper;
}

let _faceRigLogged = false;

/**
 * Crea un ensamble de ojo con esclera + párpados como casquetes esféricos.
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

  // Material de los párpados (color piel del pulpo)
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x9b59b6, // Púrpura del pulpo - ajustar según el modelo
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
    upperLid,
    lowerLid,
    upperLidPivot,
    lowerLidPivot,
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

  // Material para cejas y boca (sin cambios por ahora - Fase 6)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x080808,
    roughness: 0.25,
    metalness: 0.0,
    depthTest: true,
    depthWrite: true,
  });

  const browGeo = new THREE.BoxGeometry(0.008, 0.020, 0.09);

  const leftBrow = new THREE.Mesh(browGeo, mat);
  leftBrow.name = "LeftBrow";
  leftBrow.position.fromArray(FACE_CONFIG.leftBrow.position);
  leftBrow.rotation.fromArray(FACE_CONFIG.leftBrow.rotation as [number,number,number]);
  leftBrow.scale.fromArray(FACE_CONFIG.leftBrow.scale);

  const rightBrow = new THREE.Mesh(browGeo, mat);
  rightBrow.name = "RightBrow";
  rightBrow.position.fromArray(FACE_CONFIG.rightBrow.position);
  rightBrow.rotation.fromArray(FACE_CONFIG.rightBrow.rotation as [number,number,number]);
  rightBrow.scale.fromArray(FACE_CONFIG.rightBrow.scale);

  const mouthGeo = new THREE.BoxGeometry(0.008, 0.030, 0.13);

  const mouth = new THREE.Mesh(mouthGeo, mat);
  mouth.name = "Mouth";
  mouth.position.fromArray(FACE_CONFIG.mouth.position);
  mouth.rotation.fromArray(FACE_CONFIG.mouth.rotation as [number,number,number]);
  mouth.scale.fromArray(FACE_CONFIG.mouth.scale);

  // Markers
  const mkMat = (color: number) => new THREE.MeshBasicMaterial({ color, depthTest: false });
  const mkGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const markerX = new THREE.Mesh(mkGeo, mkMat(0xff2222)); markerX.position.set(0.18, 0, 0);
  const markerY = new THREE.Mesh(mkGeo, mkMat(0x22ff22)); markerY.position.set(0, 0.18, 0);
  const markerZ = new THREE.Mesh(mkGeo, mkMat(0x2255ff)); markerZ.position.set(0, 0, 0.18);

  const axesHelper = new THREE.AxesHelper(0.22);
  axesHelper.visible = false;

  group.add(leftEye.group, rightEye.group, leftBrow, rightBrow, mouth);
  group.add(markerX, markerY, markerZ);
  group.add(axesHelper);

  if (!_faceRigLogged) {
    _faceRigLogged = true;
    console.log("[FaceRig] FaceRig elements calibrated and created with eyelid assembly.");
  }

  return { group, leftEye, rightEye, leftBrow, rightBrow, mouth, axesHelper };
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

const autoBlinkState = {
  left: {
    phase: 'idle' as const,
    progress: 0,
    nextBlinkTime: performance.now() + 3000 + Math.random() * 2000,
    isDoubleBlink: false,
    doubleBlinkCount: 0,
  },
  right: {
    phase: 'idle' as const,
    progress: 0,
    nextBlinkTime: performance.now() + 3000 + Math.random() * 2000,
    isDoubleBlink: false,
    doubleBlinkCount: 0,
  },
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

/**
 * Actualiza el auto-blink de un ojo (independiente por ojo)
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

function updateFaceRig(
  elements: FaceRigElements,
  targetState: FacialState,
  currentState: FacialState,
  debugMode: boolean
) {
  const LERP_FACTOR = 0.25;

  currentState.jawOpen = THREE.MathUtils.lerp(currentState.jawOpen, targetState.jawOpen, LERP_FACTOR);
  currentState.smileLeft = THREE.MathUtils.lerp(currentState.smileLeft, targetState.smileLeft, LERP_FACTOR);
  currentState.smileRight = THREE.MathUtils.lerp(currentState.smileRight, targetState.smileRight, LERP_FACTOR);
  currentState.blinkLeft = THREE.MathUtils.lerp(currentState.blinkLeft, targetState.blinkLeft, LERP_FACTOR);
  currentState.blinkRight = THREE.MathUtils.lerp(currentState.blinkRight, targetState.blinkRight, LERP_FACTOR);
  currentState.browDownLeft = THREE.MathUtils.lerp(currentState.browDownLeft, targetState.browDownLeft, LERP_FACTOR);
  currentState.browDownRight = THREE.MathUtils.lerp(currentState.browDownRight, targetState.browDownRight, LERP_FACTOR);
  currentState.browUpLeft = THREE.MathUtils.lerp(currentState.browUpLeft, targetState.browUpLeft, LERP_FACTOR);
  currentState.browUpRight = THREE.MathUtils.lerp(currentState.browUpRight, targetState.browUpRight, LERP_FACTOR);

  // ─────────────────────────────────────────────
  // 1. PARPADEO CON PÁRPADOS QUE ROTAN (Fase 0+1)
  // ─────────────────────────────────────────────
  const now = performance.now();
  
  // Auto-blink independiente por ojo
  const autoBlinkLeft = updateAutoBlink(autoBlinkState.left, now);
  const autoBlinkRight = updateAutoBlink(autoBlinkState.right, now);
  
  // Blend: max(auto, tracked)
  const finalBlinkLeft = Math.max(autoBlinkLeft, currentState.blinkLeft);
  const finalBlinkRight = Math.max(autoBlinkRight, currentState.blinkRight);
  
  // Aplicar rotación a los párpados
  // Párpado superior: 80-90% del cierre (rotación hacia abajo)
  // Párpado inferior: 10-20% del cierre (rotación hacia arriba)
  const upperLidRotationMax = Math.PI * 0.85; // ~85% del cierre
  const lowerLidRotationMax = Math.PI * 0.15; // ~15% del cierre
  
  // Ojo izquierdo
  elements.leftEye.upperLidPivot.rotation.x = finalBlinkLeft * upperLidRotationMax;
  elements.leftEye.lowerLidPivot.rotation.x = -finalBlinkLeft * lowerLidRotationMax;
  
  // Ojo derecho
  elements.rightEye.upperLidPivot.rotation.x = finalBlinkRight * upperLidRotationMax;
  elements.rightEye.lowerLidPivot.rotation.x = -finalBlinkRight * lowerLidRotationMax;

  // ─────────────────────────────────────────────
  // 2. BOCA Y SONRISA (sin cambios - Fase 4 y 5)
  // ─────────────────────────────────────────────
  const smileAvg = (currentState.smileLeft + currentState.smileRight) / 2;
  const mouthScaleY = THREE.MathUtils.lerp(FACE_CONFIG.mouth.scale[1], FACE_CONFIG.mouth.scale[1] * 4.0, currentState.jawOpen);
  const mouthScaleZ = THREE.MathUtils.lerp(FACE_CONFIG.mouth.scale[2], FACE_CONFIG.mouth.scale[2] * 1.5, smileAvg);
  const mouthPosY = FACE_CONFIG.mouth.position[1] - currentState.jawOpen * 0.018 + smileAvg * 0.008;

  elements.mouth.scale.set(FACE_CONFIG.mouth.scale[0], mouthScaleY, mouthScaleZ);
  elements.mouth.position.y = mouthPosY;

  // ─────────────────────────────────────────────
  // 3. CEJAS (sin cambios - Fase 6)
  // ─────────────────────────────────────────────
  const leftBrowYOffset  = currentState.browUpLeft  * 0.03 - currentState.browDownLeft  * 0.02;
  const rightBrowYOffset = currentState.browUpRight * 0.03 - currentState.browDownRight * 0.02;

  const leftBrowRotZ  =  currentState.browDownLeft  * 0.25 - currentState.browUpLeft  * 0.10;
  const rightBrowRotZ = -currentState.browDownRight * 0.25 + currentState.browUpRight * 0.10;

  elements.leftBrow.position.y  = FACE_CONFIG.leftBrow.position[1] + leftBrowYOffset;
  elements.rightBrow.position.y = FACE_CONFIG.rightBrow.position[1] + rightBrowYOffset;
  
  elements.leftBrow.rotation.z  = FACE_CONFIG.leftBrow.rotation[2] + leftBrowRotZ;
  elements.rightBrow.rotation.z = FACE_CONFIG.rightBrow.rotation[2] + rightBrowRotZ;

  elements.axesHelper.visible = debugMode;
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
      browDownLeft: 0,
      browDownRight: 0,
      browUpLeft: 0,
      browUpRight: 0,
    },
    jawOpen: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    mouthSmileLeft: 0,
    mouthSmileRight: 0,
    browInnerUp: 0,
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
              fs.browDownLeft = shapes["browDownLeft"] ?? 0;
              fs.browDownRight = shapes["browDownRight"] ?? 0;
              fs.browUpLeft =
                shapes["browUpLeft"] ??
                shapes["browInnerUp"] ??
                shapes["browOuterUpLeft"] ??
                0;
              fs.browUpRight =
                shapes["browUpRight"] ??
                shapes["browInnerUp"] ??
                shapes["browOuterUpRight"] ??
                0;

              estado.current.jawOpen = fs.jawOpen;
              estado.current.eyeBlinkLeft = fs.blinkLeft;
              estado.current.eyeBlinkRight = fs.blinkRight;
              estado.current.mouthSmileLeft = fs.smileLeft;
              estado.current.mouthSmileRight = fs.smileRight;
              estado.current.browInnerUp = fs.browUpLeft;
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
  };
}

// ──────────────────────────────────────────────────────────
//  FACE RIG CALIBRATOR — localStorage helpers
// ──────────────────────────────────────────────────────────
const LS_KEY = "facerig_calibration_v1";

function saveCalibToLS(rig: FaceRigElements) {
  const data: Record<string, unknown> = {};
  for (const k of ELEMENT_KEYS) {
    const mesh = rig[k] as THREE.Mesh;
    data[k] = {
      position: [mesh.position.x, mesh.position.y, mesh.position.z],
      rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
      scale:    [mesh.scale.x,    mesh.scale.y,    mesh.scale.z],
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
      const mesh = rig[k] as THREE.Mesh;
      const { position: p, rotation: r, scale: s } = data[k];
      if (p) mesh.position.set(p[0], p[1], p[2]);
      if (r) mesh.rotation.set(r[0], r[1], r[2]);
      if (s) mesh.scale.set(s[0], s[1], s[2]);
    }
  } catch {}
}

function buildConfigString(rig: FaceRigElements): string {
  const lines: string[] = ["const FACE_CONFIG_CALIBRATED = {"];
  for (const k of ELEMENT_KEYS) {
    const mesh = rig[k] as THREE.Mesh;
    const p = mesh.position;
    const r = mesh.rotation;
    const s = mesh.scale;
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

  const selectedMesh = useMemo<THREE.Mesh | null>(() => {
    if (!selectedEl || !faceRigRef.current) return null;
    return faceRigRef.current[selectedEl] as THREE.Mesh;
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
      const apertura = 0.05 + e.jawOpen * 0.35;
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

  const currentFacialState = useRef<FacialState>({
    jawOpen: 0, smileLeft: 0, smileRight: 0,
    blinkLeft: 0, blinkRight: 0,
    browDownLeft: 0, browDownRight: 0,
    browUpLeft: 0, browUpRight: 0,
  });

  const ESCALA_AVATAR = 2.15;

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

    let elements: FaceRigElements | null = null;
    const headPosWorld = new THREE.Vector3();

    if (headBone) {
      console.log("[PulpoVolt FaceRig] Head encontrado");
      elements = createFaceRig();

      // Snapshot initial positions for Reset
      for (const k of ELEMENT_KEYS) {
        const mesh = elements[k] as THREE.Mesh;
        INITIAL_POSITIONS[k] = {
          p: mesh.position.clone(),
          r: mesh.rotation.clone(),
          s: mesh.scale.clone(),
        };
      }

      // Load saved calibration if available
      loadCalibFromLS(elements);

      headBone.add(elements.group);
      console.log("[PulpoVolt FaceRig] FaceRig creado");

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

    if (faceRigElements && e.facialState && !calibMode) {
      updateFaceRig(faceRigElements, e.facialState, currentFacialState.current, debugFaceRig);
    } else if (faceRigElements) {
      faceRigElements.axesHelper.visible = debugFaceRig;
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

      const jawO = e.jawOpen || 0;
      const smileBoost = ((e.mouthSmileLeft + e.mouthSmileRight) / 2) * 0.04;
      grupo.current.scale.y = THREE.MathUtils.damp(grupo.current.scale.y, 1 + jawO * 0.15 + smileBoost, 14, delta);
      grupo.current.scale.x = THREE.MathUtils.damp(grupo.current.scale.x, 1 - jawO * 0.05 + smileBoost, 14, delta);
      grupo.current.scale.z = THREE.MathUtils.damp(grupo.current.scale.z, 1 - jawO * 0.05, 14, delta);
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
      (rig[k] as THREE.Mesh).position.copy(snap.p);
      (rig[k] as THREE.Mesh).rotation.copy(snap.r);
      (rig[k] as THREE.Mesh).scale.copy(snap.s);
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
    const mesh = faceRigRef.current[selectedEl] as THREE.Mesh;
    if (gizmoMode === "translate") mesh.position[axis] += delta;
    else if (gizmoMode === "rotate") mesh.rotation[axis] += delta * (Math.PI / 180);
    else if (gizmoMode === "scale") mesh.scale[axis] += delta;
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

