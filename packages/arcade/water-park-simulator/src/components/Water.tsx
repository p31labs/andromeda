import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Water = ({ size = [100, 100], position = [0, 0, 0], rotation = [-Math.PI / 2, 0, 0] }) => {
  const [time] = useState(0);
  const waterRef = useRef(null);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;
    if (waterRef.current) {
      waterRef.current.material.uniforms.time.value = elapsed;
    }
  });

  return (
    <mesh
      ref={waterRef}
      position={position}
      rotation={rotation}
    >
      <planeGeometry args={size} />
      <shaderMaterial
        fragmentShader={`
          varying vec2 vUv;
          uniform float time;
          void main() {
            vec2 uv = vUv;
            // Create wave pattern
            float wave1 = sin(uv.x * 10.0 + time) * 0.5;
            float wave2 = sin(uv.y * 10.0 + time * 1.3) * 0.5;
            float wave3 = sin(uv.x * 5.0 + uv.y * 5.0 + time * 0.7) * 0.3;
            float wave = wave1 + wave2 + wave3;
            // Water color
            vec3 waterColor = vec3(0.0, 0.4, 0.8);
            // Add some foam based on wave height
            float foam = smoothstep(0.8, 1.0, abs(wave));
            vec3 color = mix(waterColor, vec3(1.0), foam * 0.3);
            gl_FragColor = vec4(color, 0.8 + wave * 0.2);
          }
        `}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        uniforms={{
          time: { value: 0 }
        }}
        transparent
      />
    </mesh>
  );
};

export default Water;