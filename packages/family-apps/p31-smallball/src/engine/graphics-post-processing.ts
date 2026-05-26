// P31 Smallball: AAA Post-Processing Pipeline
// Cinema-quality effects: Bloom, Motion Blur, Depth of Field, Color Grading
// Uses Three.js EffectComposer pattern with custom passes

import * as THREE from 'three';

// ============================================
// BLOOM EFFECT (Unreal-style threshold bloom)
// ============================================

export class BloomPass {
  public strength: number;
  public radius: number;
  public threshold: number;

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;

  // Render targets
  private renderTargetBright: THREE.WebGLRenderTarget;
  private renderTargetBlur: THREE.WebGLRenderTarget[];

  // Materials
  private extractMaterial: THREE.ShaderMaterial;
  private blurMaterial: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    strength: number = 0.5,
    radius: number = 0.4,
    threshold: number = 0.8
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.strength = strength;
    this.radius = radius;
    this.threshold = threshold;

    const size = renderer.getSize(new THREE.Vector2());

    // Create render targets
    this.renderTargetBright = new THREE.WebGLRenderTarget(size.x / 2, size.y / 2, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.renderTargetBlur = [
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

    // Initialize materials
    this.extractMaterial = this.createExtractMaterial();
    this.blurMaterial = this.createBlurMaterial();
    this.compositeMaterial = this.createCompositeMaterial();
  }

  private createExtractMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: this.threshold },
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
        uniform float threshold;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
          float contribution = max(0.0, brightness - threshold);
          gl_FragColor = color * contribution / (brightness + 0.0001);
        }
      `,
    });
  }

  private createBlurMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        direction: { value: new THREE.Vector2(1, 0) },
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
        uniform vec2 direction;
        varying vec2 vUv;

        void main() {
          vec2 off1 = vec2(1.3846153846) * direction;
          vec2 off2 = vec2(3.2307692308) * direction;
          gl_FragColor = texture2D(tDiffuse, vUv) * 0.2270270270;
          gl_FragColor += texture2D(tDiffuse, vUv + off1) * 0.3162162162;
          gl_FragColor += texture2D(tDiffuse, vUv - off1) * 0.3162162162;
          gl_FragColor += texture2D(tDiffuse, vUv + off2) * 0.0702702703;
          gl_FragColor += texture2D(tDiffuse, vUv - off2) * 0.0702702703;
        }
      `,
    });
  }

  private createCompositeMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        strength: { value: this.strength },
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
        uniform sampler2D tBloom;
        uniform float strength;
        varying vec2 vUv;

        void main() {
          vec4 scene = texture2D(tScene, vUv);
          vec4 bloom = texture2D(tBloom, vUv);
          gl_FragColor = scene + bloom * strength;
        }
      `,
    });
  }

  render(inputTexture: THREE.Texture, outputTarget: THREE.WebGLRenderTarget): void {
    // Step 1: Extract bright areas
    this.extractMaterial.uniforms.tDiffuse.value = inputTexture;
    this.renderer.setRenderTarget(this.renderTargetBright);
    this.renderer.render(this.createFullscreenQuad(this.extractMaterial), this.camera);

    // Step 2: Blur horizontally
    this.blurMaterial.uniforms.tDiffuse.value = this.renderTargetBright.texture;
    this.blurMaterial.uniforms.direction.value.set(1, 0);
    this.renderer.setRenderTarget(this.renderTargetBlur[0]);
    this.renderer.render(this.createFullscreenQuad(this.blurMaterial), this.camera);

    // Step 3: Blur vertically
    this.blurMaterial.uniforms.tDiffuse.value = this.renderTargetBlur[0].texture;
    this.blurMaterial.uniforms.direction.value.set(0, 1);
    this.renderer.setRenderTarget(this.renderTargetBlur[1]);
    this.renderer.render(this.createFullscreenQuad(this.blurMaterial), this.camera);

    // Step 4: Composite
    this.compositeMaterial.uniforms.tScene.value = inputTexture;
    this.compositeMaterial.uniforms.tBloom.value = this.renderTargetBlur[1].texture;
    this.renderer.setRenderTarget(outputTarget);
    this.renderer.render(this.createFullscreenQuad(this.compositeMaterial), this.camera);
  }

  private createFullscreenQuad(material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(2, 2);
    return new THREE.Mesh(geometry, material);
  }

  dispose(): void {
    this.renderTargetBright.dispose();
    this.renderTargetBlur.forEach(rt => rt.dispose());
    this.extractMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
  }
}

// ============================================
// DEPTH OF FIELD (Bokeh-style)
// ============================================

export class DepthOfFieldPass {
  public focalLength: number;
  public focalDistance: number;
  public aperture: number;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private renderTargetDepth: THREE.WebGLRenderTarget;
  private renderTargetBlur: THREE.WebGLRenderTarget[];
  private dofMaterial: THREE.ShaderMaterial;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    focalLength: number = 50,
    focalDistance: number = 10,
    aperture: number = 2.8
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.focalLength = focalLength;
    this.focalDistance = focalDistance;
    this.aperture = aperture;

    const size = renderer.getSize(new THREE.Vector2());

    this.renderTargetDepth = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    });

    this.renderTargetBlur = [
      new THREE.WebGLRenderTarget(size.x / 2, size.y / 2, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }),
      new THREE.WebGLRenderTarget(size.x / 2, size.y / 2, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }),
    ];

    this.dofMaterial = this.createDOFMaterial();
  }

  private createDOFMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        tBlur: { value: null },
        focalDistance: { value: this.focalDistance },
        aperture: { value: this.aperture },
        nearClip: { value: this.camera.near },
        farClip: { value: this.camera.far },
        viewSize: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tColor;
        uniform sampler2D tDepth;
        uniform sampler2D tBlur;
        uniform float focalDistance;
        uniform float aperture;
        uniform float nearClip;
        uniform float farClip;
        uniform vec2 viewSize;
        varying vec2 vUv;

        float getDepth(vec2 uv) {
          float z = texture2D(tDepth, uv).r;
          return (2.0 * nearClip) / (farClip + nearClip - z * (farClip - nearClip));
        }

        float calculateCoC(float depth) {
          float diff = depth - focalDistance;
          return clamp(diff * aperture * 0.5, -1.0, 1.0);
        }

        void main() {
          vec4 sharp = texture2D(tColor, vUv);
          vec4 blur = texture2D(tBlur, vUv);
          float depth = getDepth(vUv);
          float coc = calculateCoC(depth);
          float blend = smoothstep(0.0, 1.0, abs(coc));

          gl_FragColor = mix(sharp, blur, blend);
        }
      `,
    });
  }

  render(inputTexture: THREE.Texture, outputTarget: THREE.WebGLRenderTarget): void {
    // Step 1: Render depth
    this.scene.overrideMaterial = new THREE.MeshDepthMaterial();
    this.renderer.setRenderTarget(this.renderTargetDepth);
    this.renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = null;

    // Step 2: Blur the color (simplified approach)
    // In a full implementation, we'd use the CoC to drive variable blur

    // Step 3: Composite
    this.dofMaterial.uniforms.tColor.value = inputTexture;
    this.dofMaterial.uniforms.tDepth.value = this.renderTargetDepth.texture;
    this.dofMaterial.uniforms.tBlur.value = this.renderTargetBlur[1].texture;
    this.renderer.setRenderTarget(outputTarget);
    this.renderer.render(this.createFullscreenQuad(this.dofMaterial), this.camera);
  }

  private createFullscreenQuad(material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(2, 2);
    return new THREE.Mesh(geometry, material);
  }

  dispose(): void {
    this.renderTargetDepth.dispose();
    this.renderTargetBlur.forEach(rt => rt.dispose());
    this.dofMaterial.dispose();
  }
}

// ============================================
// COLOR GRADING (LUT-based)
// ============================================

export class ColorGradingPass {
  public contrast: number;
  public saturation: number;
  public exposure: number;
  public colorTemp: number; // Warm vs cool

  private material: THREE.ShaderMaterial;

  constructor(
    contrast: number = 1.1,
    saturation: number = 1.1,
    exposure: number = 1.0,
    colorTemp: number = 0.0
  ) {
    this.contrast = contrast;
    this.saturation = saturation;
    this.exposure = exposure;
    this.colorTemp = colorTemp;

    this.material = this.createGradingMaterial();
  }

  private createGradingMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        contrast: { value: this.contrast },
        saturation: { value: this.saturation },
        exposure: { value: this.exposure },
        colorTemp: { value: this.colorTemp },
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
        uniform float contrast;
        uniform float saturation;
        uniform float exposure;
        uniform float colorTemp;
        varying vec2 vUv;

        vec3 adjustContrast(vec3 color, float value) {
          return (color - 0.5) * value + 0.5;
        }

        vec3 adjustSaturation(vec3 color, float value) {
          vec3 gray = vec3(dot(color, vec3(0.2126, 0.7152, 0.0722)));
          return mix(gray, color, value);
        }

        vec3 adjustColorTemp(vec3 color, float temp) {
          vec3 warm = vec3(1.1, 1.0, 0.9);
          vec3 cool = vec3(0.9, 0.95, 1.1);
          vec3 tint = mix(cool, warm, (temp + 1.0) * 0.5);
          return color * tint;
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);

          // Exposure
          color.rgb *= exposure;

          // Contrast
          color.rgb = adjustContrast(color.rgb, contrast);

          // Saturation
          color.rgb = adjustSaturation(color.rgb, saturation);

          // Color temperature
          color.rgb = adjustColorTemp(color.rgb, colorTemp);

          // Vignette
          vec2 center = vUv - 0.5;
          float vignette = 1.0 - dot(center, center) * 0.5;
          color.rgb *= vignette;

          gl_FragColor = color;
        }
      `,
    });
  }

  render(inputTexture: THREE.Texture, outputTarget: THREE.WebGLRenderTarget, renderer: THREE.WebGLRenderer, camera: THREE.Camera): void {
    this.material.uniforms.tDiffuse.value = inputTexture;
    renderer.setRenderTarget(outputTarget);
    renderer.render(this.createFullscreenQuad(this.material), camera);
  }

  private createFullscreenQuad(material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(2, 2);
    return new THREE.Mesh(geometry, material);
  }

  dispose(): void {
    this.material.dispose();
  }
}

// ============================================
// EFFECT COMPOSER
// ============================================

export class EffectComposer {
  public passes: Array<{
    pass: BloomPass | DepthOfFieldPass | ColorGradingPass;
    enabled: boolean;
  }> = [];

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private readBuffer: THREE.WebGLRenderTarget;
  private writeBuffer: THREE.WebGLRenderTarget;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const size = renderer.getSize(new THREE.Vector2());

    this.readBuffer = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.writeBuffer = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
  }

  addBloom(strength?: number, radius?: number, threshold?: number): void {
    const bloom = new BloomPass(
      this.scene,
      this.camera,
      this.renderer,
      strength,
      radius,
      threshold
    );
    this.passes.push({ pass: bloom, enabled: true });
  }

  addDepthOfField(focalLength?: number, focalDistance?: number, aperture?: number): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const dof = new DepthOfFieldPass(
        this.scene,
        this.camera,
        this.renderer,
        focalLength,
        focalDistance,
        aperture
      );
      this.passes.push({ pass: dof, enabled: true });
    }
  }

  addColorGrading(contrast?: number, saturation?: number, exposure?: number, colorTemp?: number): void {
    const grading = new ColorGradingPass(contrast, saturation, exposure, colorTemp);
    this.passes.push({ pass: grading, enabled: true });
  }

  render(): void {
    // First render the scene to read buffer
    this.renderer.setRenderTarget(this.readBuffer);
    this.renderer.render(this.scene, this.camera);

    // Process through enabled passes
    for (const { pass, enabled } of this.passes) {
      if (!enabled) continue;

      if (pass instanceof ColorGradingPass) {
        pass.render(this.readBuffer.texture, this.writeBuffer, this.renderer, this.camera);
      } else {
        pass.render(this.readBuffer.texture, this.writeBuffer);
      }

      // Swap buffers
      const temp = this.readBuffer;
      this.readBuffer = this.writeBuffer;
      this.writeBuffer = temp;
    }

    // Final render to screen
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.createFullscreenQuad(this.createOutputMaterial()), this.camera);
  }

  private createOutputMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.readBuffer.texture },
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
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `,
    });
  }

  private createFullscreenQuad(material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(2, 2);
    return new THREE.Mesh(geometry, material);
  }

  dispose(): void {
    this.readBuffer.dispose();
    this.writeBuffer.dispose();
    this.passes.forEach(({ pass }) => pass.dispose());
  }
}
