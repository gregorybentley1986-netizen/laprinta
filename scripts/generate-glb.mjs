#!/usr/bin/env node
// Generates simple PBR float models (.glb, glTF 2.0, Y-up, metres) for the demo catalog.
// Each float is a lathe: keel → two-tone body → banded antenna.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.join(root, "seed/media/models");

const RADIAL = 48;

export const MODELS = {
  "signal-13": { keel: [0.07, 0.0016, "#1b1f24"], body: [0.085, 0.0105, 0.3], bodyColors: ["#14363b", "#00c2c9", 0.62], antenna: [0.045, 0.0022], bands: ["#ff5a1f", "#111111", "#ffe600"] },
  "signal-9": { keel: [0.06, 0.0014, "#1b1f24"], body: [0.07, 0.0085, 0.32], bodyColors: ["#14363b", "#00c2c9", 0.6], antenna: [0.04, 0.0019], bands: ["#ff5a1f", "#ffe600"] },
  strela: { keel: [0.05, 0.0012, "#2a2f36"], body: [0.065, 0.0072, 0.38], bodyColors: ["#f2f4f5", "#ff3b30", 0.7], antenna: [0.05, 0.0016], bands: ["#ff3b30", "#ffffff", "#ff3b30", "#ffffff", "#ffe600"] },
  laguna: { keel: [0.055, 0.0011, "#2a2f36"], body: [0.05, 0.0075, 0.62], bodyColors: ["#1d2b22", "#3e7d4f", 0.55], antenna: [0.04, 0.0015], bands: ["#ff6a00", "#111111", "#ff6a00"] },
  volga: { keel: [0.06, 0.0014, "#1b1f24"], body: [0.06, 0.0105, 0.7], bodyColors: ["#20262c", "#2f6f3e", 0.5], antenna: [0.045, 0.002], bands: ["#ff3b30", "#ffe600"] },
  orion: { keel: [0.065, 0.0013, "#1b1f24"], body: [0.07, 0.0095, 0.55], bodyColors: ["#0f2330", "#1f6fb2", 0.58], antenna: [0.045, 0.0018], bands: ["#ffe600", "#111111", "#ff5a1f"] },
  neva: { keel: [0.045, 0.0009, "#2a2f36"], body: [0.045, 0.0055, 0.72], bodyColors: ["#2b1a14", "#a2341f", 0.6], antenna: [0.05, 0.0011], bands: ["#ff2d55", "#ffffff", "#ff2d55", "#111111"] },
  mayak: { keel: [0.035, 0.0018, "#e9e4d8"], body: [0.05, 0.022, 0.5], bodyColors: ["#f4f4f2", "#e3262b", 0.5], antenna: [0.03, 0.0025], bands: ["#e3262b"] },
  shchuka: { keel: [0.04, 0.0022, "#1b1f24"], body: [0.09, 0.016, 0.42], bodyColors: ["#1f3a1f", "#9ad12b", 0.55], antenna: [0.04, 0.0035], bands: ["#ff5a1f", "#ffe600"] },
};

function hexToLinear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
}

/** Lathe a profile [[r, y], ...] (bottom → top) around Y. */
function lathe(profile) {
  const positions = [];
  const normals = [];
  const indices = [];
  const n = profile.length;
  for (let i = 0; i < n; i++) {
    const prev = profile[Math.max(0, i - 1)];
    const next = profile[Math.min(n - 1, i + 1)];
    const dr = next[0] - prev[0];
    const dy = next[1] - prev[1];
    let nr = dy;
    let ny = -dr;
    const len = Math.hypot(nr, ny) || 1;
    nr /= len;
    ny /= len;
    for (let j = 0; j <= RADIAL; j++) {
      const a = (j / RADIAL) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      positions.push(profile[i][0] * c, profile[i][1], profile[i][0] * s);
      normals.push(nr * c, ny, nr * s);
    }
  }
  const row = RADIAL + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = i * row + j;
      const b = a + row;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { positions, normals, indices };
}

function capProfile(r, y0, y1, steps = 2) {
  const p = [[0, y0]];
  for (let i = 0; i <= steps; i++) p.push([r, y0 + ((y1 - y0) * i) / steps]);
  return p;
}

function buildFloat(spec) {
  const [keelLen, keelR, keelColor] = spec.keel;
  const [bodyLen, bodyR, peak] = spec.body;
  const [bottomColor, topColor, split] = spec.bodyColors;
  const [antLen, antR] = spec.antenna;
  const parts = [];
  const overlap = 0.002;

  parts.push({ color: keelColor, roughness: 0.5, profile: capProfile(keelR, 0, keelLen + overlap) });

  const bodyY0 = keelLen;
  const radiusAt = (t) => {
    const tt = t < peak ? (t / peak) * 0.5 : 0.5 + ((t - peak) / (1 - peak)) * 0.5;
    return Math.max(Math.sin(Math.PI * tt) ** 0.85 * bodyR, t < 0.5 ? keelR * 0.98 : antR * 0.98);
  };
  const STEPS = 40;
  const bodyPoint = (t) => [radiusAt(t), bodyY0 + t * bodyLen];
  const lower = [];
  const upper = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    if (t <= split) lower.push(bodyPoint(t));
    if (t >= split) upper.push(bodyPoint(t));
  }
  if (lower[lower.length - 1][1] !== bodyY0 + split * bodyLen) lower.push(bodyPoint(split));
  if (upper[0][1] !== bodyY0 + split * bodyLen) upper.unshift(bodyPoint(split));
  parts.push({ color: bottomColor, roughness: 0.32, profile: [[0, bodyY0], ...lower] });
  parts.push({ color: topColor, roughness: 0.28, profile: [...upper, [0, bodyY0 + bodyLen]] });

  const antY0 = bodyY0 + bodyLen - overlap;
  const bandLen = antLen / spec.bands.length;
  spec.bands.forEach((color, i) => {
    const y0 = antY0 + i * bandLen;
    const y1 = y0 + bandLen;
    const isTip = i === spec.bands.length - 1;
    const profile = [[0, y0], [antR, y0], [antR, isTip ? y1 - antR : y1]];
    if (isTip) {
      for (let k = 1; k <= 6; k++) {
        const a = (k / 6) * (Math.PI / 2);
        profile.push([Math.cos(a) * antR, y1 - antR + Math.sin(a) * antR]);
      }
    } else profile.push([0, y1]);
    parts.push({ color, roughness: 0.25, profile, emissive: i === spec.bands.length - 1 });
  });
  return parts;
}

function toGlb(parts, name) {
  const buffers = [];
  let byteOffset = 0;
  const bufferViews = [];
  const accessors = [];
  const materials = [];
  const primitives = [];

  const pushView = (typed, target) => {
    const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const pad = (4 - (buf.length % 4)) % 4;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: buf.length, target });
    buffers.push(buf, Buffer.alloc(pad));
    byteOffset += buf.length + pad;
    return bufferViews.length - 1;
  };

  parts.forEach((part, idx) => {
    const { positions, normals, indices } = lathe(part.profile);
    const pos = new Float32Array(positions);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], pos[i + k]);
        max[k] = Math.max(max[k], pos[i + k]);
      }
    }
    const posView = pushView(pos, 34962);
    const nrmView = pushView(new Float32Array(normals), 34962);
    const idxView = pushView(new Uint16Array(indices), 34963);
    accessors.push({ bufferView: posView, componentType: 5126, count: pos.length / 3, type: "VEC3", min, max });
    accessors.push({ bufferView: nrmView, componentType: 5126, count: normals.length / 3, type: "VEC3" });
    accessors.push({ bufferView: idxView, componentType: 5123, count: indices.length, type: "SCALAR" });
    const base = hexToLinear(part.color);
    materials.push({
      name: `part-${idx}`,
      pbrMetallicRoughness: { baseColorFactor: [...base, 1], metallicFactor: 0, roughnessFactor: part.roughness },
      ...(part.emissive ? { emissiveFactor: base.map((c) => c * 0.25) } : {}),
    });
    primitives.push({ attributes: { POSITION: accessors.length - 3, NORMAL: accessors.length - 2 }, indices: accessors.length - 1, material: idx });
  });

  const bin = Buffer.concat(buffers);
  const gltf = {
    asset: { version: "2.0", generator: "laprinta generate-glb" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives }],
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const jsonHead = Buffer.alloc(8);
  jsonHead.writeUInt32LE(json.length, 0);
  jsonHead.writeUInt32LE(0x4e4f534a, 4);
  const binHead = Buffer.alloc(8);
  binHead.writeUInt32LE(bin.length, 0);
  binHead.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHead, json, binHead, bin]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await mkdir(outDir, { recursive: true });
  for (const [id, spec] of Object.entries(MODELS)) {
    const glb = toGlb(buildFloat(spec), id);
    await writeFile(path.join(outDir, `${id}.glb`), glb);
    console.log(`✓ ${id}.glb ${(glb.length / 1024).toFixed(1)} KB`);
  }
}
