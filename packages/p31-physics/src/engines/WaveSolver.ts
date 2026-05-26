/**
 * GPU Wave Solver Engine
 * For Resonance Rings - Wave interference simulation
 */

import {
  WaveEmitter,
  WaveField,
  Vector2,
} from '../types/physics';

export class WaveSolver {
  private gl: WebGL2RenderingContext | null = null;
  private shaderProgram: WebGLProgram | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private textures: [WebGLTexture | null, WebGLTexture | null] = [null, null];
  private currentTexture = 0;
  private resolution: number;
  private vertexBuffer: WebGLBuffer | null = null;

  constructor(canvas: HTMLCanvasElement, resolution: number) {
    this.resolution = resolution;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;
    this.initShaders();
    this.initBuffers();
    this.initFramebuffers();
  }

  private initShaders(): void {
    if (!this.gl) return;

    const vertexShaderSource = `#version 300 es
      in vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `#version 300 es
      precision highp float;
      
      uniform sampler2D u_prev;
      uniform sampler2D u_curr;
      uniform vec2 u_resolution;
      uniform float u_damping;
      uniform float u_time;
      
      uniform vec2 u_emitterPos[16];
      uniform float u_emitterAmp[16];
      uniform float u_emitterFreq[16];
      uniform float u_emitterPhase[16];
      uniform int u_emitterCount;
      
      out vec4 fragColor;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float dt = 0.1;
        float c = 0.5;
        
        float dx = 1.0 / u_resolution.x;
        float dy = 1.0 / u_resolution.y;
        
        float curr = texture(u_curr, uv).r;
        float prev = texture(u_prev, uv).r;
        
        float left = texture(u_curr, uv + vec2(-dx, 0.0)).r;
        float right = texture(u_curr, uv + vec2(dx, 0.0)).r;
        float up = texture(u_curr, uv + vec2(0.0, dy)).r;
        float down = texture(u_curr, uv + vec2(0.0, -dy)).r;
        
        float laplacian = left + right + up + down - 4.0 * curr;
        float next = 2.0 * curr - prev + c * c * laplacian * dt * dt;
        
        next *= u_damping;
        
        for (int i = 0; i < 16; i++) {
          if (i >= u_emitterCount) break;
          
          float dist = distance(uv, u_emitterPos[i]);
          if (dist < 0.02) {
            float wave = sin(u_time * u_emitterFreq[i] + u_emitterPhase[i]);
            next += u_emitterAmp[i] * wave * (1.0 - dist / 0.02);
          }
        }
        
        fragColor = vec4(next, 0.0, 0.0, 1.0);
      }
    `;

    const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Shader compilation failed');
    }

    this.shaderProgram = this.gl.createProgram();
    if (!this.shaderProgram) {
      throw new Error('Failed to create shader program');
    }

    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(this.shaderProgram);
      throw new Error(`Shader program link failed: ${info}`);
    }
  }

  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      console.error('Shader compile error:', info);
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private initBuffers(): void {
    if (!this.gl || !this.shaderProgram) return;

    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]);

    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLoc = this.gl.getAttribLocation(this.shaderProgram, 'a_position');
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
  }

  private initFramebuffers(): void {
    if (!this.gl) return;

    this.framebuffer = this.gl.createFramebuffer();

    this.textures = [
      this.createTexture(),
      this.createTexture(),
    ];
  }

  private createTexture(): WebGLTexture | null {
    if (!this.gl) return null;

    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.R32F,
      this.resolution,
      this.resolution,
      0,
      this.gl.RED,
      this.gl.FLOAT,
      null
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    return texture;
  }

  public step(emitters: WaveEmitter[], time: number, damping: number): void {
    if (!this.gl || !this.shaderProgram || !this.framebuffer) return;

    const gl = this.gl;

    gl.useProgram(this.shaderProgram);

    // Set uniforms
    const emitterCount = Math.min(emitters.length, 16);
    const positions = new Float32Array(32);
    const amplitudes = new Float32Array(16);
    const frequencies = new Float32Array(16);
    const phases = new Float32Array(16);

    emitters.forEach((e, i) => {
      positions[i * 2] = e.position.x;
      positions[i * 2 + 1] = e.position.y;
      amplitudes[i] = e.isPlaying ? e.amplitude : 0;
      frequencies[i] = e.frequency * 0.01; // Scale down for shader
      phases[i] = e.phase;
    });

    gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'u_emitterCount'), emitterCount);
    gl.uniform2fv(gl.getUniformLocation(this.shaderProgram, 'u_emitterPos'), positions);
    gl.uniform1fv(gl.getUniformLocation(this.shaderProgram, 'u_emitterAmp'), amplitudes);
    gl.uniform1fv(gl.getUniformLocation(this.shaderProgram, 'u_emitterFreq'), frequencies);
    gl.uniform1fv(gl.getUniformLocation(this.shaderProgram, 'u_emitterPhase'), phases);
    gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_time'), time);
    gl.uniform2f(gl.getUniformLocation(this.shaderProgram, 'u_resolution'), this.resolution, this.resolution);
    gl.uniform1f(gl.getUniformLocation(this.shaderProgram, 'u_damping'), damping);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
    gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'u_prev'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[1 - this.currentTexture]);
    gl.uniform1i(gl.getUniformLocation(this.shaderProgram, 'u_curr'), 1);

    // Render to framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.textures[this.currentTexture],
      0
    );

    gl.viewport(0, 0, this.resolution, this.resolution);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Swap buffers
    this.currentTexture = 1 - this.currentTexture;
  }

  public renderToCanvas(): void {
    if (!this.gl || !this.shaderProgram) return;

    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Use a simple pass-through shader for rendering
    // In production, you'd have a separate render shader
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  public getCurrentField(): Float32Array {
    if (!this.gl) return new Float32Array(0);

    const data = new Float32Array(this.resolution * this.resolution);
    this.gl.readPixels(
      0, 0,
      this.resolution, this.resolution,
      this.gl.RED,
      this.gl.FLOAT,
      data
    );
    return data;
  }

  public calculatePatternMatch(target: Float32Array): number {
    const current = this.getCurrentField();
    if (current.length !== target.length) return 0;

    let correlation = 0;
    let currentEnergy = 0;
    let targetEnergy = 0;

    for (let i = 0; i < current.length; i++) {
      correlation += current[i] * target[i];
      currentEnergy += current[i] * current[i];
      targetEnergy += target[i] * target[i];
    }

    if (currentEnergy === 0 || targetEnergy === 0) return 0;
    return correlation / (Math.sqrt(currentEnergy) * Math.sqrt(targetEnergy));
  }

  public destroy(): void {
    if (!this.gl) return;

    if (this.textures[0]) this.gl.deleteTexture(this.textures[0]);
    if (this.textures[1]) this.gl.deleteTexture(this.textures[1]);
    if (this.framebuffer) this.gl.deleteFramebuffer(this.framebuffer);
    if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
    if (this.shaderProgram) this.gl.deleteProgram(this.shaderProgram);
  }
}

export default WaveSolver;
