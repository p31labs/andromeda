import * as THREE from 'three';

/**
 * disposeMaterial
 * Recursively disposes of a material and its associated textures.
 */
export function disposeMaterial(material: THREE.Material) {
  material.dispose();

  // Dispose of textures attached to the material
  for (const key of Object.keys(material)) {
    const value = (material as any)[key];
    if (value && typeof value === 'object' && (value instanceof THREE.Texture)) {
      value.dispose();
    }
  }
}

/**
 * disposeHierarchy
 * Traverses a scene or group and disposes of all geometries, materials, and textures.
 */
export function disposeHierarchy(node: THREE.Object3D) {
  if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points || node instanceof THREE.Sprite) {
    if (node.geometry) {
      node.geometry.dispose();
    }

    if (node.material) {
      if (Array.isArray(node.material)) {
        node.material.forEach((m) => disposeMaterial(m));
      } else {
        disposeMaterial(node.material);
      }
    }
  }

  // Recursive call for children
  while (node.children.length > 0) {
    const child = node.children[0];
    disposeHierarchy(child);
    node.remove(child);
  }
}
