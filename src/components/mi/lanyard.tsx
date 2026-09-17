"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, extend, type ThreeElements } from "@react-three/fiber";
import { useGLTF, useTexture, Environment, Lightformer } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RigidBodyProps,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";

extend({ MeshLineGeometry, MeshLineMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: any;
    meshLineMaterial: any;
  }
}

const CARD_GLB = "/lanyard/card.glb";
const LANYARD_TEXTURE = "/lanyard/lanyard.png";

type LanyardProps = {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
  transparent?: boolean;
  frontImage?: string;
  backImage?: string;
  imageFit?: "cover" | "contain";
  lanyardImage?: string;
  lanyardWidth?: number;
};

export default function Lanyard({
  position = [0, 0, 20],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  frontImage,
  backImage,
  imageFit = "cover",
  lanyardImage,
  lanyardWidth,
}: LanyardProps) {
  return (
    <div className="relative z-0 w-full h-full flex justify-center items-center">
      <Canvas
        camera={{ position, fov }}
        gl={{ alpha: transparent, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0, 0, 0), transparent ? 0 : 1)}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={1 / 60}>
          <Band
            frontImage={frontImage}
            backImage={backImage}
            imageFit={imageFit}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
          />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

type BandProps = {
  maxSpeed?: number;
  minSpeed?: number;
  frontImage?: string;
  backImage?: string;
  imageFit?: "cover" | "contain";
  lanyardImage?: string;
  lanyardWidth?: number;
};

function Band({ maxSpeed = 50, minSpeed = 0, frontImage, backImage, imageFit = "cover", lanyardImage, lanyardWidth }: BandProps) {
  const band = useRef<THREE.Mesh>(null);
  const fixed = useRef<RigidBodyProps extends never ? never : any>(null);
  const j1 = useRef<any>(null);
  const j2 = useRef<any>(null);
  const j3 = useRef<any>(null);
  const card = useRef<any>(null);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps: RigidBodyProps = {
    type: "dynamic",
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  };

  const { nodes, materials } = useGLTF(CARD_GLB) as unknown as {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.MeshPhysicalMaterial>;
  };
  const [frontMap, setFrontMap] = useState<THREE.Texture | null>(null);
  void backImage;
  void imageFit;

  useEffect(() => {
    if (!frontImage) {
      setFrontMap(null);
      return;
    }

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!active) return;
      const targetW = 1024;
      const targetH = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Fondo blanco puro en toda la tarjeta (PVC badge)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Cara Frontal de la tarjeta (en card.glb: U ∈ [0.0, 0.499], V ∈ [0.004, 0.755])
      // Centro horizontal en UV: 256px.
      // Centro vertical útil (compensando clip superior): ~415px.
      const qrSize = 390;
      const frontX = Math.round(256 - qrSize / 2);
      const frontY = Math.round(415 - qrSize / 2);
      ctx.drawImage(img, frontX, frontY, qrSize, qrSize);

      // 3. Cara Trasera de la tarjeta (en card.glb: U ∈ [0.501, 1.0], V ∈ [0.002, 0.757])
      // Centro horizontal en UV: 768px.
      // Si la tarjeta gira o se balancea físicamente, el QR sigue visible y scannable al 100%.
      const backX = Math.round(768 - qrSize / 2);
      const backY = Math.round(415 - qrSize / 2);
      ctx.drawImage(img, backX, backY, qrSize, qrSize);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;
      tex.needsUpdate = true;
      setFrontMap(tex);
    };

    img.src = frontImage;

    return () => {
      active = false;
    };
  }, [frontImage]);

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [hovered, hover] = useState(false);

  const [isSmall, setIsSmall] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => setIsSmall(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => {
        document.body.style.cursor = "auto";
      };
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - (dragged as THREE.Vector3).x,
        y: vec.y - (dragged as THREE.Vector3).y,
        z: vec.z - (dragged as THREE.Vector3).z,
      });
    }
    if (fixed.current && j1.current && j2.current && j3.current && card.current) {
      [j1, j2, j3].forEach((ref) => {
        if (ref.current) {
          const trans = ref.current.translation();
          if (!ref.current.lerped) {
            if (trans.x !== 0 || trans.y !== 0 || trans.z !== 0) {
              ref.current.lerped = new THREE.Vector3(trans.x, trans.y, trans.z);
            }
          } else {
            const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(trans)));
            ref.current.lerped.lerp(trans, delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)));
          }
        }
      });
      curve.points[0].copy(j3.current.lerped ?? j3.current.translation());
      curve.points[1].copy(j2.current.lerped ?? j2.current.translation());
      curve.points[2].copy(j1.current.lerped ?? j1.current.translation());
      curve.points[3].copy(fixed.current.translation());
      if ((band.current as any)?.geometry?.setPoints) {
        (band.current as any).geometry.setPoints(curve.getPoints(32));
      }
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = "chordal";

  const resolvedFrontMap = frontMap ?? materials.base.map;
  const bandLineWidth = lanyardWidth ?? 1;

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e: any) => {
              e.target.releasePointerCapture(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e: any) => {
              e.target.setPointerCapture(e.pointerId);
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={resolvedFrontMap}
                map-repeat={[1, 1]}
                clearcoat={1}
                clearcoatRoughness={0.15}
                roughness={0.25}
                metalness={0.05}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial color="#10e7a0" depthTest={false} resolution={[1000, 1000]} lineWidth={bandLineWidth} />
      </mesh>
    </>
  );
}

useGLTF.preload(CARD_GLB);
