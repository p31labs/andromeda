// P31 Smallball: Volumetric Lighting System
// God rays, light shafts, atmospheric scattering
// Optimized ray marching for web performance

import * as THREE from 'three';

// ============================================
// VOLUMETRIC LIGHT SHAFTS (God Rays)
// ============================================

export class VolumetricLightShaft extends THREE.Mesh {
  declare material: THREE.ShaderMaterial;
  private lightPosition: THREE.Vector3;
  private lightDirection: THREE.Vector3;

  constructor(
    lightPosition: THREE.Vector3,
    lightDirection: THREE.Vector3,
    color: THREE.Color = new THREE.Color(0xffffee),
    intensity: number = 0.5,
    length: number = 100
  ) {
    // Create a cone geometry aligned with light direction
    const geometry = new THREE.ConeGeometry(20, length, 32, 1, true);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        lightPosition: { value: lightPosition },
        lightDirection: { value: lightDirection },
        lightColor: { value: color },
        intensity: { value: intensity },
        decay: { value: 0.95 },
        dustDensity: { value: 0.02 },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 lightPosition;
        uniform vec3 lightDirection;
        uniform vec3 lightColor;
        uniform float intensity;
        uniform float decay;
        uniform float dustDensity;
        uniform float time;

        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        // Simple noise function
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }

        void main() {
          // Distance from light
          float dist = length(vWorldPosition - lightPosition);

          // Check if we're looking toward the light
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float lightFacing = max(0.0, dot(viewDir, -lightDirection));

          // Volumetric density (simplified)
          float density = dustDensity * exp(-dist * 0.01);

          // Dust motes animation
          float dust = noise(vWorldPosition * 0.5 + time * 0.1);
          dust = smoothstep(0.7, 1.0, dust) * 0.3;

          // Combine
          float volumetric = density * lightFacing * (1.0 + dust);
          volumetric *= pow(decay, dist * 0.1);

          // Fade at edges
          float edgeFade = 1.0 - smoothstep(0.0, 0.3, abs(vNormal.z));

          vec3 finalColor = lightColor * volumetric * intensity;
          float alpha = volumetric * intensity * edgeFade;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    super(geometry, material);
    this.material = material;
    this.lightPosition = lightPosition.clone();
    this.lightDirection = lightDirection.clone().normalize();

    // Align cone with light direction
    this.lookAt(lightPosition.clone().add(lightDirection));
  }

  update(time: number): void {
    this.material.uniforms.time.value = time;
  }

  setIntensity(intensity: number): void {
    this.material.uniforms.intensity.value = intensity;
  }
}

// ============================================
// GOD RAY POST-PROCESS PASS
// ============================================

export class GodRayPass {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private occlusionTarget: THREE.WebGLRenderTarget;
  private blurTarget: THREE.WebGLRenderTarget[];

  private godRayMaterial: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const size = renderer.getSize(new THREE.Vector2());

    // Create render targets
    this.occlusionTarget = new THREE.WebGLRenderTarget(size.x / 4, size.y / 4, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.blurTarget = [
      new THREE.WebGLRenderTarget(size.x / 4, size.y / 4, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }),
      new THREE.WebGLRenderTarget(size.x / 4, size.y / 4, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }),
    ];

    this.godRayMaterial = this.createGodRayMaterial();
    this.compositeMaterial = this.createCompositeMaterial();
  }

  private createGodRayMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
        exposure: { value: 0.3 },
        decay: { value: 0.95 },
        density: { value: 0.5 },
        weight: { value: 0.4 },
        samples: { value: 60 },
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
        uniform vec2 lightPosition;
        uniform float exposure;
        uniform float decay;
        uniform float density;
        uniform float weight;
        uniform int samples;

        varying vec2 vUv;

        void main() {
          vec2 delta = vUv - lightPosition;
          vec2 coord = vUv;

          float illuminationDecay = 1.0;
          vec3 color = vec3(0.0);

          for(int i = 0; i < 60; i++) {
            if(i >= samples) break;

            coord -= delta * density / float(samples);
            vec3 sampleColor = texture2D(tDiffuse, coord).rgb;
            sampleColor *= illuminationDecay * weight;
            color += sampleColor;
            illuminationDecay *= decay;
          }

          gl_FragColor = vec4(color * exposure, 1.0);
        }
      `,
    });
  }

  private createCompositeMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tGodRays: { value: null },
        intensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tScene;
        uniform sampler2D tGodRays;
        uniform float intensity;
        varying vec2 vUv;

        void main() {
          vec4 scene = texture2D(tScene, vUv);
          vec4 godRays = texture2D(tGodRays, vUv);
          gl_FragColor = scene + godRays * intensity;
        }
      `,
    });
  }

  render(lightScreenPosition: THREE.Vector2, inputTexture: THREE.Texture, outputTarget: THREE.WebGLRenderTarget): void {
    // Step 1: Render scene with occlusion (bright areas only)
    // This is a simplified version - full implementation would render to occlusion target
    // with only emissive/bright materials

    // Step 2: Generate god rays
    this.godRayMaterial.uniforms.tDiffuse.value = inputTexture;
    this.godRayMaterial.uniforms.lightPosition.value.copy(lightScreenPosition);

    this.renderer.setRenderTarget(this.blurTarget[0]);
    this.renderer.render(this.createFullscreenQuad(this.godRayMaterial), this.camera);

    // Step 3: Blur god rays
    // (Simplified - skip blur for performance)

    // Step 4: Composite
    this.compositeMaterial.uniforms.tScene.value = inputTexture;
    this.compositeMaterial.uniforms.tGodRays.value = this.blurTarget[0].texture;

    this.renderer.setRenderTarget(outputTarget);
    this.renderer.render(this.createFullscreenQuad(this.compositeMaterial), this.camera);
  }

  private createFullscreenQuad(material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(2, 2);
    return new THREE.Mesh(geometry, material);
  }

  dispose(): void {
    this.occlusionTarget.dispose();
    this.blurTarget.forEach(t => t.dispose());
    this.godRayMaterial.dispose();
    this.compositeMaterial.dispose();
  }
}

// ============================================
// LENS FLARE SYSTEM
// ============================================

export class LensFlareSystem extends THREE.Group {
  private lightPosition: THREE.Vector3;
  private elements: Array<{
    mesh: THREE.Sprite;
    distance: number;
    size: number;
    color: THREE.Color;
  }> = [];

  constructor(lightPosition: THREE.Vector3) {
    super();

    this.lightPosition = lightPosition.clone();

    // Create flare elements
    this.createFlareElement(0, 4, new THREE.Color(0xffffff), 1.0);    // Glow
    this.createFlareElement(0.1, 1, new THREE.Color(0xffffee), 0.8);   // Inner
    this.createFlareElement(0.4, 0.5, new THREE.Color(0xffaa00), 0.6); // Ring 1
    this.createFlareElement(0.6, 0.3, new THREE.Color(0xff4400), 0.4); // Ring 2
    this.createFlareElement(0.8, 0.2, new THREE.Color(0xff0088), 0.3); // Ring 3
  }

  private createFlareElement(distance: number, size: number, color: THREE.Color, alpha: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Create soft glow
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${alpha * 0.3})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size * 10, size * 10, 1);

    this.add(sprite);

    this.elements.push({
      mesh: sprite,
      distance,
      size: size * 10,
      color,
    });
  }

  update(camera: THREE.Camera): void {
    // Calculate screen position of light
    const lightScreenPos = this.lightPosition.clone().project(camera);

    // Check if light is in front of camera
    if (lightScreenPos.z > 1) {
      this.visible = false;
      return;
    }

    this.visible = true;

    // Calculate vector from screen center to light
    const center = new THREE.Vector2(0, 0);
    const lightPos = new THREE.Vector2(lightScreenPos.x, lightScreenPos.y);
    const dir = lightPos.clone().sub(center);

    // Position flare elements
    this.elements.forEach(element => {
      const pos = center.clone().add(dir.clone().multiplyScalar(element.distance));
      element.mesh.position.set(pos.x * 100, pos.y * 100, 0);

      // Scale based on distance from center
      const distFromCenter = dir.length();
      const scale = Math.max(0.2, 1 - distFromCenter * 0.5);
      element.mesh.scale.setScalar(element.size * scale);

      // Fade when light goes off screen
      const alpha = Math.max(0, 1 - distFromCenter * 2);
      (element.mesh.material as THREE.SpriteMaterial).opacity = alpha;
    });

    // Always face camera
    this.lookAt(camera.position);
  }

  setIntensity(intensity: number): void {
    this.elements.forEach(element => {
      (element.mesh.material as THREE.SpriteMaterial).opacity = intensity;
    });
  }
}

// ============================================
// ATMOSPHERIC SCATTERING (Simple approximation)
// ============================================

export class AtmosphericScattering extends THREE.Mesh {
  constructor() {
    const geometry = new THREE.SphereGeometry(500, 32, 32);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        sunPosition: { value: new THREE.Vector3(100, 100, 100) },
        sunColor: { value: new THREE.Color(0xffffee) },
        skyColor: { value: new THREE.Color(0x87ceeb) },
        horizonColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 sunPosition;
        uniform vec3 sunColor;
        uniform vec3 skyColor;
        uniform vec3 horizonColor;

        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          // Height gradient
          float height = normalize(vWorldPosition).y;
          vec3 sky = mix(horizonColor, skyColor, max(0.0, height));

          // Sun glow
          vec3 sunDir = normalize(sunPosition);
          float sunDot = dot(normalize(vWorldPosition), sunDir);
          float sunGlow = pow(max(0.0, sunDot), 32.0);

          // Rayleigh scattering approximation
          float scatter = pow(max(0.0, sunDot), 8.0) * max(0.0, height);

          vec3 finalColor = sky + sunColor * sunGlow * 0.5 + skyColor * scatter * 0.3;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    super(geometry, material);
  }

  update(sunPosition: THREE.Vector3, skyColor: THREE.Color): void {
    (this.material as THREE.ShaderMaterial).uniforms.sunPosition.value.copy(sunPosition);
    (this.material as THREE.ShaderMaterial).uniforms.skyColor.value.copy(skyColor);
  }
}

// ============================================
// VOLUMETRIC MANAGER
// ============================================

export class VolumetricManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;

  public lightShafts: VolumetricLightShaft[] = [];
  public lensFlare: LensFlareSystem | null = null;
  public scattering: AtmosphericScattering;

  private godRayPass: GodRayPass | null = null;
  private enabled: boolean = true;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.scattering = new AtmosphericScattering();
    this.scene.add(this.scattering);
  }

  addStadiumLightShafts(positions: THREE.Vector3[]): void {
    positions.forEach(pos => {
      // Point all shafts toward center field
      const direction = new THREE.Vector3(0, 0, 0).sub(pos).normalize();
      const shaft = new VolumetricLightShaft(
        pos,
        direction,
        new THREE.Color(0xffffee),
        0.3,
        150
      );

      this.scene.add(shaft);
      this.lightShafts.push(shaft);
    });
  }

  addSunFlare(sunPosition: THREE.Vector3): void {
    this.lensFlare = new LensFlareSystem(sunPosition);
    this.camera.add(this.lensFlare);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    this.lightShafts.forEach(shaft => {
      shaft.visible = enabled;
    });

    if (this.lensFlare) {
      this.lensFlare.visible = enabled;
    }

    this.scattering.visible = enabled;
  }

  update(time: number, sunPosition: THREE.Vector3, skyColor: THREE.Color): void {
    if (!this.enabled) return;

    // Update light shafts
    this.lightShafts.forEach(shaft => {
      shaft.update(time);
    });

    // Update lens flare
    if (this.lensFlare) {
      this.lensFlare.update(this.camera);
    }

    // Update atmospheric scattering
    this.scattering.update(sunPosition, skyColor);
  }

  // Enable/disable god ray post-processing
  enableGodRays(enabled: boolean): void {
    if (enabled && !this.godRayPass) {
      this.godRayPass = new GodRayPass(this.renderer, this.scene, this.camera);
    } else if (!enabled && this.godRayPass) {
      this.godRayPass.dispose();
      this.godRayPass = null;
    }
  }
}
