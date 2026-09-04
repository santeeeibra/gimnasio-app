// Genera los iconos de la PWA (manifest + badge de las notificaciones push).
// Correr desde la raíz: `node scripts/gen-iconos.mjs`. Sólo hace falta si se
// cambia la marca; los PNG resultantes están commiteados en public/.
//
// `sharp` no está declarado en package.json: viene arrastrado por Next. Si el
// import falla en una instalación limpia: `npm i -D sharp`.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const FONDO = "#16181d"; // theme_color del manifest
const VOLT = "#cde94a";

// Mancuerna centrada. El maskable de Android recorta hasta un círculo del 80%,
// así que la marca vive dentro del 60% central para no perder los discos.
// Escala de la marca. El maskable de Android recorta a un círculo del 80%
// (radio 40 sobre 100), así que la esquina más lejana de la mancuerna tiene que
// quedar por debajo de ese radio: con k = 0.7 el punto extremo cae en ~32.
const K = 0.7;

const marca = (s, color = VOLT) => {
  const c = s / 2;
  const u = (s / 100) * K;
  const barra = `<rect x="${-30 * u}" y="${-4 * u}" width="${60 * u}" height="${8 * u}" rx="${4 * u}" fill="${color}"/>`;
  // Dos discos por lado, con aire entre ellos para que se lea la mancuerna y
  // no un borrón. El interior es más alto que el exterior.
  const disco = (x, w, h) =>
    `<rect x="${x * u}" y="${(-h / 2) * u}" width="${w * u}" height="${h * u}" rx="${(w / 2) * u}" fill="${color}"/>`;
  return `
    <g transform="translate(${c} ${c}) rotate(-45)">
      ${barra}
      ${disco(-32, 9, 34)}${disco(23, 9, 34)}
      ${disco(-45, 8, 22)}${disco(37, 8, 22)}
    </g>`;
};

// icon-*: fondo a sangre (el manifest lo usa como `any` y como `maskable`).
const icono = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="${FONDO}"/>
  ${marca(s)}
</svg>`;

// badge-72: Android lo pinta como máscara monocroma, así que va la silueta
// blanca sobre transparente, sin fondo.
const badge = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  ${marca(s, "#ffffff")}
</svg>`;

const salidas = [
  ["public/icon-192.png", icono(192), 192],
  ["public/icon-512.png", icono(512), 512],
  ["public/badge-72.png", badge(72), 72],
];

for (const [ruta, svg, size] of salidas) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  writeFileSync(ruta, buf);
  console.log(ruta, buf.length, "bytes");
}

