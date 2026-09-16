"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
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

type TrackState = {
  matrix: THREE.Matrix4;
  jawOpen: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  browInnerUp: number;
  ready: boolean;
};

function usarFaceTracking(
  video: HTMLVideoElement | null,
  activoTrack: boolean
) {
  const estado = useRef<TrackState>({
    matrix: new THREE.Matrix4(),
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
  const [ojosCerrados, setOjosCerrados] = useState<number>(0);

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

        // Intentar GPU delegate para rendimiento liviano
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
          // Fallback a CPU delegate
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
        // Throttle a 30 FPS (33ms) para que el Event Loop y la UI respiren libremente
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
              estado.current.jawOpen = shapes["jawOpen"] ?? 0;
              estado.current.eyeBlinkLeft = shapes["eyeBlinkLeft"] ?? 0;
              estado.current.eyeBlinkRight = shapes["eyeBlinkRight"] ?? 0;
              estado.current.mouthSmileLeft = shapes["mouthSmileLeft"] ?? 0;
              estado.current.mouthSmileRight = shapes["mouthSmileRight"] ?? 0;
              estado.current.browInnerUp = shapes["browInnerUp"] ?? 0;
            }

            // Sincronizar indicadores de UI sin saturar React (cada 120ms)
            if (now - lastUiUpdate > 120) {
              lastUiUpdate = now;
              setRostroDetectado(estado.current.ready);
              setAperturaBoca(Math.round(estado.current.jawOpen * 100));
              const smile = Math.round(
                ((estado.current.mouthSmileLeft +
                  estado.current.mouthSmileRight) /
                  2) *
                  100
              );
              setSonrisaNivel(smile);
              const blink = Math.round(
                Math.max(
                  estado.current.eyeBlinkLeft,
                  estado.current.eyeBlinkRight
                ) * 100
              );
              setOjosCerrados(blink);
            }
          } catch {
            // Ignorar frame skips normales de timestamp
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
    ojosCerrados,
  };
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

// Plano de corte para modo avatar: oculta todo lo que queda por debajo de los hombros
// Se aplica como clippingPlane en Three.js con localClippingEnabled=true en el renderer
const AVATAR_CLIP_Y = -0.18; // en unidades de escena (ajustado para modelo normalizado a escala ~2.4)

function PulpoModelo({
  estado,
  rotacionY = -Math.PI / 2,
  invertirEspejo = true,
  invertirPitch = false,
  offsetCalibrado = { x: 0, y: 0, z: 0 },
}: {
  estado: React.RefObject<TrackState>;
  rotacionY?: number;
  invertirEspejo?: boolean;
  invertirPitch?: boolean;
  offsetCalibrado?: { x: number; y: number; z: number };
}) {
  const grupo = useRef<THREE.Group>(null);
  const gltf = useGLTF(MODEL_PATH);

  // Plano de corte: elimina todo lo que esté por debajo de AVATAR_CLIP_Y en espacio de escena
  // El plano tiene normal apuntando hacia +Y, así que corta todo con Y < -AVATAR_CLIP_Y
  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -AVATAR_CLIP_Y),
    []
  );

  // Escala mayor para llenar el visor con cabeza+hombros
  const ESCALA_AVATAR = 2.4;
  const modeloCentrado = useMemo(() => {
    const scene = SkeletonUtils.clone(gltf.scene);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const factorEscala = ESCALA_AVATAR / (maxDim || 1);

    // Centrar en X y Z; en Y subimos para que la cabeza quede en el centro-alto del visor
    scene.position.x = -center.x * factorEscala;
    scene.position.z = -center.z * factorEscala;
    // Subir el modelo: la cabeza debe quedar ~en Y=0.4..0.6 del visor
    scene.position.y = (-center.y + size.y * 0.28) * factorEscala;
    scene.scale.setScalar(factorEscala);

    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Aplicar el plano de corte a cada material del modelo
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const mat = m.clone();
            mat.clippingPlanes = [clipPlane];
            mat.clipShadows = true;
            return mat;
          });
        } else if (mesh.material) {
          const mat = (mesh.material as THREE.Material).clone();
          (mat as THREE.MeshStandardMaterial).clippingPlanes = [clipPlane];
          (mat as THREE.MeshStandardMaterial).clipShadows = true;
          mesh.material = mat;
        }
      }
    });

    return scene;
  }, [gltf.scene, clipPlane]);

  useFrame((_, delta) => {
    if (!grupo.current) return;
    const e = estado.current;
    if (e.ready) {
      const eulerRaw = new THREE.Euler().setFromRotationMatrix(e.matrix, "YXZ");

      const deadZone = (val: number, umbral = 0.007) =>
        Math.abs(val) < umbral ? 0 : val;

      const deltaPitch = deadZone(eulerRaw.x - offsetCalibrado.x);
      const deltaYaw = deadZone(eulerRaw.y - offsetCalibrado.y);
      const deltaRoll = deadZone(eulerRaw.z - offsetCalibrado.z);

      const pitch = THREE.MathUtils.clamp(
        (invertirPitch ? -1 : 1) * deltaPitch,
        -0.65,
        0.65
      );
      const yaw = THREE.MathUtils.clamp(
        (invertirEspejo ? -1 : 1) * deltaYaw,
        -1.15,
        1.15
      );
      const roll = THREE.MathUtils.clamp(-deltaRoll, -0.5, 0.5);

      const targetEuler = new THREE.Euler(pitch, yaw + rotacionY, roll, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);
      grupo.current.quaternion.slerp(targetQuat, 0.22);

      // Squash & stretch orgánico (solo en el grupo pivote, no afecta el clip)
      const targetScaleY = 1 + (e.jawOpen || 0) * 0.15;
      const targetScaleXZ = 1 - (e.jawOpen || 0) * 0.05;
      const smileBoost = ((e.mouthSmileLeft + e.mouthSmileRight) / 2) * 0.04;

      grupo.current.scale.y = THREE.MathUtils.damp(
        grupo.current.scale.y,
        targetScaleY + smileBoost,
        14,
        delta
      );
      grupo.current.scale.x = THREE.MathUtils.damp(
        grupo.current.scale.x,
        targetScaleXZ + smileBoost,
        14,
        delta
      );
      grupo.current.scale.z = THREE.MathUtils.damp(
        grupo.current.scale.z,
        targetScaleXZ,
        14,
        delta
      );
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
  // rotacionY fijo: -90° = de frente a la cámara (modo avatar, no se cambia)
  const ROT_Y_FRENTE = -Math.PI / 2;
  const [invertirEspejo, setInvertirEspejo] = useState<boolean>(true);
  const [invertirPitch, setInvertirPitch] = useState<boolean>(false);
  const [offsetCalibrado, setOffsetCalibrado] = useState<{
    x: number;
    y: number;
    z: number;
  }>({ x: 0, y: 0, z: 0 });
  const [mostrarCamara, setMostrarCamara] = useState<boolean>(true);
  const [intentoCamara, setIntentoCamara] = useState<number>(0);
  const [trackingIniciado, setTrackingIniciado] = useState<boolean>(false);

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
        // Intento 1: Resolución ideal amigable (640x480)
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
          // Intento 2: Fallback universal para cualquier webcam de PC
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
    ojosCerrados,
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
            camera={{ position: [0, 0.1, 1.4], fov: 36 }}
            gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
            className="w-full h-full"
          >
            {/* Iluminación de estudio 3 puntos */}
            <ambientLight intensity={0.65} />
            <directionalLight position={[2, 3, 3]} intensity={1.3} />
            <directionalLight position={[-1, -1, 2]} intensity={0.4} color="#ffffff" />
            {/* Rim-light neón Pulpo Volt */}
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
                />
              </Suspense>
            ) : (
              <PulpoPlaceholder estado={estado} />
            )}
          </Canvas>

          {/* Overlay de inicio controlado */}
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

          {/* Badge del Modelo GLB Rigged */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-[#10e7a0]/30 text-[11px] text-[#10e7a0] flex items-center gap-1.5 font-medium shadow-sm z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10e7a0] animate-ping" />
            🐙 Pulpo Volt (Rigged GLB)
          </div>

          {/* Calibrar botón flotante */}
          <button
            onClick={calibrarCentro}
            className="absolute top-3 right-3 bg-black/50 hover:bg-[#10e7a0]/20 active:scale-95 transition backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] text-[#10e7a0] font-medium flex items-center gap-1"
            title="Centrar la mirada donde estás mirando ahora"
          >
            🎯 Calibrar centro
          </button>

          {/* Controles flotantes sobre el visor — solo espejo y pitch */}
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
                <span>Sonrisa / Ánimo:</span>
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

              {/* Medidor Parpadeo / Guiño */}
              <div className="flex justify-between items-center">
                <span>Ojos / Parpadeo:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10e7a0] transition-all duration-75"
                      style={{ width: `${Math.min(100, ojosCerrados)}%` }}
                    />
                  </div>
                  <span className="font-mono text-white/90 w-8 text-right">
                    {ojosCerrados}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-[20px] bg-[#0c1410]/60 border border-white/5 text-xs text-white/50 leading-relaxed space-y-1.5">
            <p>
              💡 <b>Tip de calibración:</b> Mirá al centro de la pantalla y tocá{" "}
              <b>"🎯 Calibrar centro"</b> para alinear la mirada a tu posición
              neutral.
            </p>
            <p>
              Filtro de <b>dead-zone</b> y <b>clamping</b> activos para máxima
              estabilidad sin temblores.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
