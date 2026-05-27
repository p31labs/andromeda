import React from 'react';
import * as THREE from 'three';

const Slide = () => {
  // Create a simple curved slide using a tube
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-20, 5, 0),
    new THREE.Vector3(-10, 15, 10),
    new THREE.Vector3(0, 20, 0),
    new THREE.Vector3(10, 15, -10),
    new THREE.Vector3(20, 5, 0)
  ]);

  const geometry = new THREE.TubeGeometry(path, 64, 2, 8, false);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });

  return <mesh geometry={geometry} material={material} />;
};

export default Slide;