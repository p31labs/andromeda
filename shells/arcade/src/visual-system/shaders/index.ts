/**
 * P31 Arcade Shader Library
 * Shared GLSL shaders for visual effects
 */

import * as THREE from 'three';

// Co-op border glow shader
export const CoOpGlowShader = {
  uniforms: {
    time: { value: 0 },
    color1: { value: new THREE.Color('#39ff14') }, // Phos green
    color2: { value: new THREE.Color('#00f5ff') }, // Cyan
    intensity: { value: 0.3 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float intensity;
    varying vec2 vUv;

    void main() {
      // Distance from edge (0 at center, 1 at corners)
      float edgeDist = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
      
      // Pulse effect
      float pulse = sin(time * 3.0) * 0.5 + 0.5;
      
      // Color mix based on position
      float mixFactor = sin(vUv.x * 3.14159 + time) * 0.5 + 0.5;
      vec3 color = mix(color1, color2, mixFactor);
      
      // Glow only at edges
      float edgeGlow = smoothstep(0.7, 1.0, edgeDist);
      
      gl_FragColor = vec4(color, edgeGlow * pulse * intensity);
    }
  `,
};

// Ball trail shader (for Smallball)
export const BallTrailShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#39ff14') },
    fadeSpeed: { value: 2.0 },
  },
  vertexShader: `
    attribute float alpha;
    varying float vAlpha;
    void main() {
      vAlpha = alpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    varying float vAlpha;

    void main() {
      gl_FragColor = vec4(color, vAlpha);
    }
  `,
};

// Grass/turf shader (for Gridiron)
export const TurfShader = {
  uniforms: {
    time: { value: 0 },
    windDirection: { value: new THREE.Vector2(1, 0) },
    baseColor: { value: new THREE.Color('#2d5016') },
  },
  vertexShader: `
    uniform float time;
    uniform vec2 windDirection;
    varying vec2 vUv;
    varying float vWind;

    void main() {
      vUv = uv;
      
      // Wind animation on grass
      float windStrength = sin(position.x * 0.5 + time * 2.0) * 0.1;
      windStrength += sin(position.z * 0.3 + time * 1.5) * 0.05;
      
      vec3 pos = position;
      pos.x += windStrength * windDirection.x;
      pos.z += windStrength * windDirection.y;
      
      vWind = windStrength;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 baseColor;
    varying vec2 vUv;
    varying float vWind;

    void main() {
      // Add subtle color variation based on wind
      vec3 color = baseColor * (1.0 + vWind * 0.2);
      
      // Yard line markings
      float yardLine = step(0.98, fract(vUv.x * 10.0));
      color = mix(color, vec3(1.0), yardLine * 0.5);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// HDR Bloom setup
export function createHDRTripleTarget(width: number, height: number) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  });
  return target;
}

// Simplex noise for organic effects
export const SimplexNoiseShader = {
  uniforms: {
    time: { value: 0 },
    scale: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float scale;
    varying vec2 vUv;

    // Simplex 3D Noise
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

    float snoise(vec3 v){ 
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1. + 3.0 * C.xxx;
      i = mod(i, 289.0); 
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec3 pos = vec3(vUv * scale, time * 0.1);
      float noise = snoise(pos);
      gl_FragColor = vec4(vec3(noise * 0.5 + 0.5), 1.0);
    }
  `,
};

// Glass morphism shader
export const GlassShader = {
  uniforms: {
    tDiffuse: { value: null },
    blurStrength: { value: 10.0 },
    opacity: { value: 0.8 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float blurStrength;
    uniform float opacity;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Simple blur approximation
      vec2 offset = vec2(blurStrength) / vec2(1024.0);
      vec4 blur = vec4(0.0);
      blur += texture2D(tDiffuse, vUv + vec2(-offset.x, -offset.y)) * 0.0625;
      blur += texture2D(tDiffuse, vUv + vec2(0.0, -offset.y)) * 0.125;
      blur += texture2D(tDiffuse, vUv + vec2(offset.x, -offset.y)) * 0.0625;
      blur += texture2D(tDiffuse, vUv + vec2(-offset.x, 0.0)) * 0.125;
      blur += color * 0.25;
      blur += texture2D(tDiffuse, vUv + vec2(offset.x, 0.0)) * 0.125;
      blur += texture2D(tDiffuse, vUv + vec2(-offset.x, offset.y)) * 0.0625;
      blur += texture2D(tDiffuse, vUv + vec2(0.0, offset.y)) * 0.125;
      blur += texture2D(tDiffuse, vUv + vec2(offset.x, offset.y)) * 0.0625;
      
      gl_FragColor = vec4(blur.rgb, opacity);
    }
  `,
};

export class ShaderManager {
  private clock = new THREE.Clock();
  private materials: THREE.ShaderMaterial[] = [];

  update() {
    const time = this.clock.getElapsedTime();
    this.materials.forEach(mat => {
      if (mat.uniforms.time) {
        mat.uniforms.time.value = time;
      }
    });
  }

  register(material: THREE.ShaderMaterial) {
    this.materials.push(material);
    return material;
  }

  createCoOpGlow(): THREE.ShaderMaterial {
    return this.register(new THREE.ShaderMaterial(CoOpGlowShader));
  }

  createBallTrail(color: THREE.Color = new THREE.Color('#39ff14')): THREE.ShaderMaterial {
    const mat = new THREE.ShaderMaterial({
      ...BallTrailShader,
      uniforms: {
        ...BallTrailShader.uniforms,
        color: { value: color },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    return this.register(mat);
  }

  createTurf(): THREE.ShaderMaterial {
    return this.register(new THREE.ShaderMaterial({
      ...TurfShader,
      side: THREE.DoubleSide,
    }));
  }
}

export const shaderManager = new ShaderManager();
