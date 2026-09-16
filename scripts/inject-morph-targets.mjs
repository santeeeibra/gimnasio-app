import fs from 'fs';
import path from 'path';

const glbPath = 'd:/SISTEMA GYM/public/models/pulpo-volt.glb';
const buf = fs.readFileSync(glbPath);

// Decode GLB header
const magic = buf.toString('utf8', 0, 4);
if (magic !== 'glTF') {
  console.error('Archivo no es glTF válido');
  process.exit(1);
}

const jsonLength = buf.readUInt32LE(12);
const jsonBuf = buf.subarray(20, 20 + jsonLength);
const json = JSON.parse(jsonBuf.toString('utf8'));

// Binary buffer chunk offset
const binHeaderOffset = 20 + jsonLength;
const binLength = buf.readUInt32LE(binHeaderOffset);
const binDataOffset = binHeaderOffset + 8;
const origBinData = buf.subarray(binDataOffset, binDataOffset + binLength);

// Get original position accessor
const posAccessorIdx = json.meshes[0].primitives[0].attributes.POSITION;
const posAccessor = json.accessors[posAccessorIdx];
const posBufferView = json.bufferViews[posAccessor.bufferView];
const count = posAccessor.count;

// Read original positions
const origPosOffset = posBufferView.byteOffset || 0;
const positions = new Float32Array(
  origBinData.buffer,
  origBinData.byteOffset + origPosOffset,
  count * 3
);

console.log(`Cargadas ${count} posiciones de vértices de Volt.`);

// Definir los 5 Morph Targets
const targetNames = ['jawOpen', 'smileLeft', 'smileRight', 'blinkLeft', 'blinkRight'];
const targetDeltas = targetNames.map(() => new Float32Array(count * 3));

for (let i = 0; i < count; i++) {
  const x = positions[i * 3];
  const y = positions[i * 3 + 1];
  const z = positions[i * 3 + 2];

  // 1. jawOpen (Zona mandibular y labio inferior: Y < 0.10, Z > 0.35, |X| < 0.22)
  if (z > 0.35 && Math.abs(x) < 0.22 && y < 0.10 && y > -0.15) {
    const mouthFactor = Math.max(0, 1 - Math.abs(y - (-0.02)) / 0.12) * Math.max(0, (z - 0.35) / 0.65);
    targetDeltas[0][i * 3 + 1] = -0.045 * mouthFactor; // deltaY
    targetDeltas[0][i * 3 + 2] = -0.015 * mouthFactor; // deltaZ
  }

  // 2. smileLeft (Comisura izquierda del personaje: X < -0.02, Y entre 0.02 y 0.15, Z > 0.35)
  if (z > 0.35 && x < -0.02 && x > -0.22 && y > 0.02 && y < 0.15) {
    const smileFactor = Math.max(0, 1 - Math.abs(x - (-0.10)) / 0.10) * Math.max(0, (z - 0.35) / 0.65);
    targetDeltas[1][i * 3 + 1] = 0.030 * smileFactor; // deltaY (elevar)
    targetDeltas[1][i * 3]     = -0.015 * smileFactor; // deltaX (hacia afuera)
  }

  // 3. smileRight (Comisura derecha del personaje: X > 0.02, Y entre 0.02 y 0.15, Z > 0.35)
  if (z > 0.35 && x > 0.02 && x < 0.22 && y > 0.02 && y < 0.15) {
    const smileFactor = Math.max(0, 1 - Math.abs(x - 0.10) / 0.10) * Math.max(0, (z - 0.35) / 0.65);
    targetDeltas[2][i * 3 + 1] = 0.030 * smileFactor; // deltaY (elevar)
    targetDeltas[2][i * 3]     = 0.015 * smileFactor;  // deltaX (hacia afuera)
  }

  // 4. blinkLeft (Párpado ojo izquierdo del personaje: X < -0.02, Y entre 0.15 y 0.28, Z > 0.35)
  if (z > 0.35 && x < -0.02 && x > -0.20 && y > 0.15 && y < 0.28) {
    const blinkFactor = Math.max(0, 1 - Math.abs(y - 0.21) / 0.07) * Math.max(0, (z - 0.35) / 0.65);
    targetDeltas[3][i * 3 + 1] = -0.032 * blinkFactor; // deltaY (bajar párpado)
  }

  // 5. blinkRight (Párpado ojo derecho del personaje: X > 0.02, Y entre 0.15 y 0.28, Z > 0.35)
  if (z > 0.35 && x > 0.02 && x < 0.20 && y > 0.15 && y < 0.28) {
    const blinkFactor = Math.max(0, 1 - Math.abs(y - 0.21) / 0.07) * Math.max(0, (z - 0.35) / 0.65);
    targetDeltas[4][i * 3 + 1] = -0.032 * blinkFactor; // deltaY (bajar párpado)
  }
}

// Convert deltas into new buffers, bufferViews & accessors
const deltaBufferViews = [];
const deltaAccessors = [];
const newBinBuffers = [origBinData];

let currentByteOffset = origBinData.length;

for (let t = 0; t < targetNames.length; t++) {
  const deltaFloatArray = targetDeltas[t];
  const deltaBuf = Buffer.from(deltaFloatArray.buffer);
  
  // Calculate min & max for VEC3 accessor
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const dx = deltaFloatArray[i * 3];
    const dy = deltaFloatArray[i * 3 + 1];
    const dz = deltaFloatArray[i * 3 + 2];
    if (dx < minX) minX = dx; if (dx > maxX) maxX = dx;
    if (dy < minY) minY = dy; if (dy > maxY) maxY = dy;
    if (dz < minZ) minZ = dz; if (dz > maxZ) maxZ = dz;
  }

  const bufferViewIdx = json.bufferViews.length;
  json.bufferViews.push({
    buffer: 0,
    byteOffset: currentByteOffset,
    byteLength: deltaBuf.length,
    target: 34962
  });

  const accessorIdx = json.accessors.length;
  json.accessors.push({
    bufferView: bufferViewIdx,
    componentType: 5126, // FLOAT
    count: count,
    max: [maxX, maxY, maxZ],
    min: [minX, minY, minZ],
    type: 'VEC3'
  });

  deltaAccessors.push(accessorIdx);
  newBinBuffers.push(deltaBuf);
  currentByteOffset += deltaBuf.length;
}

// Attach targets to mesh primitive
json.meshes[0].primitives[0].targets = deltaAccessors.map((accIdx) => ({
  POSITION: accIdx
}));
json.meshes[0].targetNames = targetNames;

// Build new GLB
const finalBinBuffer = Buffer.concat(newBinBuffers);
const jsonString = JSON.stringify(json);

// Align json to 4-byte boundary with spaces
let jsonBuffer = Buffer.from(jsonString, 'utf8');
const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
if (jsonPadding > 0) {
  jsonBuffer = Buffer.concat([jsonBuffer, Buffer.from(' '.repeat(jsonPadding), 'utf8')]);
}

// Align bin buffer to 4-byte boundary
let binBuffer = finalBinBuffer;
const binPadding = (4 - (binBuffer.length % 4)) % 4;
if (binPadding > 0) {
  binBuffer = Buffer.concat([binBuffer, Buffer.alloc(binPadding, 0)]);
}

const totalFileLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
const outBuf = Buffer.alloc(totalFileLength);

// GLB Header
outBuf.write('glTF', 0);
outBuf.writeUInt32LE(2, 4);
outBuf.writeUInt32LE(totalFileLength, 8);

// JSON Chunk Header
outBuf.writeUInt32LE(jsonBuffer.length, 12);
outBuf.write('JSON', 16);
jsonBuffer.copy(outBuf, 20);

// BIN Chunk Header
const binHeaderOffsetOut = 20 + jsonBuffer.length;
outBuf.writeUInt32LE(binBuffer.length, binHeaderOffsetOut);
outBuf.write('BIN\0', binHeaderOffsetOut + 4);
binBuffer.copy(outBuf, binHeaderOffsetOut + 8);

fs.writeFileSync(glbPath, outBuf);
console.log(`✅ Inyectados ${targetNames.length} Morph Targets faciales en ${glbPath}`);
console.log('Targets:', targetNames);
