import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Vector3, type Box3, type Object3D } from "three";

// model-viewer keeps its three.js scene behind a private symbol; it is the only way to add
// objects that orbit together with the model. Relies on model-viewer resolving the same
// `three` package (it is a peer dependency of @google/model-viewer 4.x).
type ModelScene = Object3D & { target: Object3D; boundingBox: Box3; queueRender: () => void };

const GRID_NAME = "laprinta-floor-grid";

function sceneOf(el: HTMLElement): ModelScene | null {
  const sym = Object.getOwnPropertySymbols(el).find((s) => s.description === "scene");
  const scene = sym ? (el as unknown as Record<symbol, ModelScene | undefined>)[sym] : undefined;
  return scene?.target && scene.boundingBox ? scene : null;
}

type GridOptions = { color?: [number, number, number]; opacity?: number; divisions?: number };

function buildGrid(radius: number, { color = [0, 232 / 255, 239 / 255], opacity = 0.32, divisions = 8 }: GridOptions) {
  const step = radius / divisions;
  const segments = divisions * 4;
  const positions: number[] = [];
  const colors: number[] = [];
  // Lines fade out towards the rim so the grid reads as a floor, not a box.
  const alphaAt = (x: number, z: number, major: boolean) => {
    const r = Math.min(1, Math.hypot(x, z) / radius);
    return opacity * (major ? 1.5 : 1) * (1 - r * r) ** 1.5;
  };
  const push = (x: number, z: number, major: boolean) => {
    positions.push(x, 0, z);
    colors.push(color[0], color[1], color[2], alphaAt(x, z, major));
  };
  for (let i = -divisions; i <= divisions; i++) {
    const c = i * step;
    const major = i === 0;
    for (let s = 0; s < segments; s++) {
      const a = -radius + (2 * radius * s) / segments;
      const b = -radius + (2 * radius * (s + 1)) / segments;
      push(a, c, major);
      push(b, c, major);
      push(c, a, major);
      push(c, b, major);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 4));
  const material = new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false });
  const grid = new LineSegments(geometry, material);
  grid.name = GRID_NAME;
  grid.userData.noHit = true;
  grid.renderOrder = -1;
  return grid;
}

/** Puts a muted floor grid under the loaded model. Call after model-viewer's `load` event. */
export function attachFloorGrid(el: HTMLElement, options: GridOptions = {}) {
  const scene = sceneOf(el);
  if (!scene || scene.boundingBox.isEmpty()) return () => {};
  const old = scene.target.getObjectByName(GRID_NAME);
  if (old) detach(scene, old as LineSegments);

  const box = scene.boundingBox;
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  // Tall, thin models (floats) still get a floor wide enough to show the rotation.
  const radius = Math.max(size.x, size.z, size.y * 0.55) * 1.1;
  const grid = buildGrid(radius, options);
  grid.position.set(center.x, box.min.y + size.y * 0.002, center.z);
  scene.target.add(grid);
  scene.queueRender();
  return () => detach(scene, grid);
}

function detach(scene: ModelScene, grid: LineSegments) {
  scene.target.remove(grid);
  grid.geometry.dispose();
  (grid.material as LineBasicMaterial).dispose();
  scene.queueRender();
}
