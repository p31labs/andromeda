import * as THREE from "three";
import { buildIcosaSphereDome } from "./icosphere-geometry";

/** Icosa sphere subdivision → same shape `dome-cockpit` / landing use for face meshes. */
export function buildGeoThree(rad: number, subs: number) {
  const built = buildIcosaSphereDome(rad, subs);
  const verts = built.vertices.map(
    ([x, y, z]) => new THREE.Vector3(x, y, z)
  );
  const faces = built.faces.map((f) => {
    const [a, b, c] = f;
    return {
      indices: f as [number, number, number],
      centroid: new THREE.Vector3()
        .add(verts[a]!)
        .add(verts[b]!)
        .add(verts[c]!)
        .divideScalar(3),
    };
  });
  return { verts, edges: built.edges, faces };
}
