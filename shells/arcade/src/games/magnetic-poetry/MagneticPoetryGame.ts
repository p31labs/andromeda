import * as THREE from 'three';

// P31 Canon Colors
const COLORS = {
  phos: 0x39ff14,
  cyan: 0x00f5ff,
  orchid: 0xda70d6,
  gold: 0xfeca57,
  fridge: 0x222428,
  magnetBase: 0x0a0b0e
};

export interface MagneticPoetryConfig {
  container: HTMLElement;
  onWordSnap?: (word1: string, word2: string) => void;
  onPoemComplete?: () => void;
}

export interface MagnetData {
  mesh: THREE.Mesh;
  word: string;
  width: number;
  isDragging: boolean;
  originalColor: string;
}

export interface FieldLine {
  mesh: THREE.Line;
  life: number;
}

export class MagneticPoetryGame {
  private container: HTMLElement;
  private config: MagneticPoetryConfig;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private magnets: MagnetData[] = [];
  private magnetGroup!: THREE.Group;
  private fieldLines: FieldLine[] = [];
  private raycaster!: THREE.Raycaster;
  private pointer!: THREE.Vector2;
  private dragPlane!: THREE.Plane;
  private draggedMagnet: MagnetData | null = null;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private coopLight!: THREE.PointLight;
  private isCoopMode: boolean = false;
  private isPoemComplete: boolean = false;
  private targetCamPos: THREE.Vector3 = new THREE.Vector3(0, 0, 35);
  private targetCamLook: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private rafId: number = 0;
  private isDisposed: boolean = false;

  // Magnet dimensions
  private readonly MAGNET_HEIGHT = 1.5;
  private readonly MAGNET_DEPTH = 0.3;
  private readonly SNAP_THRESHOLD = 1.5;
  private readonly ALIGN_THRESHOLD = 0.8;

  // Word data sets
  private readonly wordData = [
    // S.J. (Cyan)
    { w: 'FLOW', c: '#00f5ff' }, { w: 'WAVE', c: '#00f5ff' },
    { w: 'CALM', c: '#00f5ff' }, { w: 'MOTION', c: '#00f5ff' },
    { w: 'BREATHE', c: '#00f5ff' }, { w: 'WATER', c: '#00f5ff' },
    // W.J. (Phos)
    { w: 'GROWTH', c: '#39ff14' }, { w: 'BUILD', c: '#39ff14' },
    { w: 'STRONG', c: '#39ff14' }, { w: 'ENERGY', c: '#39ff14' },
    { w: 'POWER', c: '#39ff14' }, { w: 'SPARK', c: '#39ff14' },
    // Shared (Orchid/Whiteish)
    { w: 'LOVE', c: '#da70d6' }, { w: 'FAMILY', c: '#da70d6' },
    { w: 'TOGETHER', c: '#da70d6' }, { w: 'WE', c: '#da70d6' },
    { w: 'ARE', c: '#da70d6' }, { w: 'THE', c: '#da70d6' },
    { w: 'CHUMP', c: '#feca57' }, { w: 'ARCADE', c: '#feca57' }
  ];

  constructor(config: MagneticPoetryConfig) {
    this.container = config.container;
    this.config = config;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.MAGNET_DEPTH / 2);
    this.init();
  }

  private init(): void {
    this.setupScene();
    this.setupLighting();
    this.createFridge();
    this.createMagnets();
    this.setupEvents();
    this.animate();
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c10);
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.01);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 1, 100);
    this.camera.position.set(0, 0, 35);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.container.appendChild(this.renderer.domElement);
    this.container.style.cursor = 'grab';
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const overheadLight = new THREE.PointLight(0xffffff, 1.5, 100);
    overheadLight.position.set(0, 20, 15);
    this.scene.add(overheadLight);

    const sideLight = new THREE.DirectionalLight(0xaaccff, 0.8);
    sideLight.position.set(-20, 10, 15);
    this.scene.add(sideLight);

    this.coopLight = new THREE.PointLight(COLORS.orchid, 0, 50);
    this.coopLight.position.set(0, 0, 10);
    this.scene.add(this.coopLight);
  }

  private createBrushedMetalTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.04})`;
      ctx.fillRect(0, Math.random() * 512, 512, Math.random() * 2);

      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.06})`;
      ctx.fillRect(0, Math.random() * 512, 512, Math.random() * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  private createFridge(): void {
    const fridgeGeo = new THREE.PlaneGeometry(100, 100);
    const fridgeMat = new THREE.MeshStandardMaterial({
      map: this.createBrushedMetalTexture(),
      roughness: 0.35,
      metalness: 0.8,
      color: COLORS.fridge
    });
    const fridge = new THREE.Mesh(fridgeGeo, fridgeMat);
    this.scene.add(fridge);
  }

  private createNeonWordTexture(word: string, hexColor: string): { tex: THREE.CanvasTexture; aspect: number } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const fontStr = 'bold 44px monospace';
    ctx.font = fontStr;
    const textWidth = ctx.measureText(word).width;

    const padding = 60;
    canvas.width = textWidth + padding;
    canvas.height = 80;

    ctx.fillStyle = '#08090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = hexColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = hexColor;
    ctx.fillText(word, canvas.width / 2, canvas.height / 2);

    ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(word, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return { tex, aspect: canvas.width / canvas.height };
  }

  private createMagnets(): void {
    this.magnetGroup = new THREE.Group();
    this.scene.add(this.magnetGroup);

    const magnetMatBase = new THREE.MeshStandardMaterial({
      color: COLORS.magnetBase,
      roughness: 0.2,
      metalness: 0.5
    });

    this.wordData.forEach((data) => {
      const { tex, aspect } = this.createNeonWordTexture(data.w, data.c);
      const w = this.MAGNET_HEIGHT * aspect;

      const matFront = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(data.c),
        emissiveMap: tex,
        emissiveIntensity: 0.8,
        roughness: 0.2
      });

      const materials = [
        magnetMatBase, // Right
        magnetMatBase, // Left
        magnetMatBase, // Top
        magnetMatBase, // Bottom
        matFront,      // Front
        magnetMatBase  // Back
      ];

      const geo = new THREE.BoxGeometry(w, this.MAGNET_HEIGHT, this.MAGNET_DEPTH);
      const mesh = new THREE.Mesh(geo, materials);

      mesh.position.set(
        (Math.random() - 0.5) * 30,
        -8 - Math.random() * 6,
        this.MAGNET_DEPTH / 2
      );

      const magnetData: MagnetData = {
        mesh,
        word: data.w,
        width: w,
        isDragging: false,
        originalColor: data.c
      };

      mesh.userData = { magnetData };

      this.magnetGroup.add(mesh);
      this.magnets.push(magnetData);
    });
  }

  private getPointerIntersect(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersect);
    return intersect;
  }

  private onPointerDown = (e: MouseEvent | TouchEvent): void => {
    let clientX: number, clientY: number;

    if (e instanceof TouchEvent) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.magnets.map(m => m.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      this.draggedMagnet = hitMesh.userData.magnetData;
      if (this.draggedMagnet) this.draggedMagnet.isDragging = true;

      hitMesh.position.z = this.MAGNET_DEPTH / 2 + 0.5;

      const intersectPoint = this.getPointerIntersect(clientX, clientY);
      if (intersectPoint) {
        this.dragOffset.copy(hitMesh.position).sub(intersectPoint);
      }

      this.container.style.cursor = 'grabbing';
    }
  };

  private onPointerMove = (e: MouseEvent | TouchEvent): void => {
    if (!this.draggedMagnet) return;
    e.preventDefault();

    let clientX: number, clientY: number;

    if (e instanceof TouchEvent) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const intersectPoint = this.getPointerIntersect(clientX, clientY);
    if (intersectPoint) {
      this.draggedMagnet.mesh.position.x = intersectPoint.x + this.dragOffset.x;
      this.draggedMagnet.mesh.position.y = intersectPoint.y + this.dragOffset.y;
    }
  };

  private onPointerUp = (): void => {
    if (!this.draggedMagnet) return;

    this.draggedMagnet.mesh.position.z = this.MAGNET_DEPTH / 2;
    this.draggedMagnet.isDragging = false;
    this.container.style.cursor = 'grab';

    this.checkMagneticSnap();

    this.draggedMagnet = null;
  };

  private checkMagneticSnap(): void {
    if (!this.draggedMagnet) return;

    const p1 = this.draggedMagnet.mesh.position;
    const w1 = this.draggedMagnet.width;

    for (const other of this.magnets) {
      if (other === this.draggedMagnet) continue;

      const p2 = other.mesh.position;
      const w2 = other.width;

      const dy = Math.abs(p1.y - p2.y);
      const dx = p1.x - p2.x;

      if (dy < this.ALIGN_THRESHOLD) {
        const distRight = Math.abs(dx - ((w1 + w2) / 2 + 0.2));
        if (distRight < this.SNAP_THRESHOLD) {
          p1.y = p2.y;
          p1.x = p2.x + ((w1 + w2) / 2) + 0.1;
          this.spawnFieldLine(p1.clone(), p2.clone(), COLORS.cyan);
          this.config.onWordSnap?.(this.draggedMagnet!.word, other.word);
          return;
        }

        const distLeft = Math.abs(dx - (-((w1 + w2) / 2 + 0.2)));
        if (distLeft < this.SNAP_THRESHOLD) {
          p1.y = p2.y;
          p1.x = p2.x - ((w1 + w2) / 2) - 0.1;
          this.spawnFieldLine(p1.clone(), p2.clone(), COLORS.phos);
          this.config.onWordSnap?.(this.draggedMagnet!.word, other.word);
          return;
        }
      }

      if (Math.abs(p1.x - p2.x) < 1.0) {
        const distDown = Math.abs(p1.y - (p2.y - this.MAGNET_HEIGHT - 0.2));
        if (distDown < 1.0) {
          p1.x = p2.x;
          p1.y = p2.y - this.MAGNET_HEIGHT - 0.1;
          this.spawnFieldLine(p1.clone(), p2.clone(), COLORS.orchid);
          this.config.onWordSnap?.(this.draggedMagnet!.word, other.word);
          return;
        }
      }
    }
  }

  private spawnFieldLine(posA: THREE.Vector3, posB: THREE.Vector3, colorHex: number): void {
    const mid = posA.clone().lerp(posB, 0.5);
    mid.z += 2.0;

    const curve = new THREE.QuadraticBezierCurve3(posA, mid, posB);
    const pts = curve.getPoints(16);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);

    const mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.fieldLines.push({ mesh: line, life: 1.0 });
  }

  private setupEvents(): void {
    this.renderer.domElement.addEventListener('mousedown', this.onPointerDown);
    this.renderer.domElement.addEventListener('mousemove', this.onPointerMove);
    this.renderer.domElement.addEventListener('mouseup', this.onPointerUp);
    this.renderer.domElement.addEventListener('mouseleave', this.onPointerUp);

    this.renderer.domElement.addEventListener('touchstart', this.onPointerDown, { passive: false });
    this.renderer.domElement.addEventListener('touchmove', this.onPointerMove, { passive: false });
    this.renderer.domElement.addEventListener('touchend', this.onPointerUp);

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private animate = (): void => {
    if (this.isDisposed) return;

    this.rafId = requestAnimationFrame(this.animate);

    if (this.isPoemComplete) {
      let sumX = 0, sumY = 0, count = 0;
      this.magnets.forEach(m => {
        if (m.mesh.position.y > -5) {
          sumX += m.mesh.position.x;
          sumY += m.mesh.position.y;
          count++;
        }
      });

      if (count > 0) {
        this.targetCamLook.set(sumX / count, sumY / count, 0);
        this.targetCamPos.set(sumX / count, sumY / count, 20);
      } else {
        this.targetCamPos.set(0, 0, 20);
      }
    }

    this.camera.position.lerp(this.targetCamPos, 0.05);
    const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    currentLook.lerp(this.targetCamLook, 0.05);
    this.camera.lookAt(currentLook);

    for (let i = this.fieldLines.length - 1; i >= 0; i--) {
      const line = this.fieldLines[i];
      line.life -= 0.016 * 2.5;
      const mat = line.mesh.material as THREE.Material;
      mat.opacity = line.life;
      line.mesh.scale.setScalar(1.0 + (1.0 - line.life) * 0.2);

      if (line.life <= 0) {
        this.scene.remove(line.mesh);
        line.mesh.geometry.dispose();
        (line.mesh.material as THREE.LineBasicMaterial).dispose();
        this.fieldLines.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  setCoOpMode(enabled: boolean): void {
    this.isCoopMode = enabled;
    this.coopLight.intensity = enabled ? 2 : 0;
  }

  triggerPoemComplete(): void {
    this.isPoemComplete = true;
    this.coopLight.intensity = 3;
    this.config.onPoemComplete?.();
  }

  resetCamera(): void {
    this.isPoemComplete = false;
    this.targetCamPos.set(0, 0, 35);
    this.targetCamLook.set(0, 0, 0);
    this.coopLight.intensity = this.isCoopMode ? 2 : 0;
  }

  getMagnets(): MagnetData[] {
    return this.magnets;
  }

  dispose(): void {
    this.isDisposed = true;
    cancelAnimationFrame(this.rafId);

    window.removeEventListener('resize', this.handleResize);

    this.magnets.forEach(m => {
      m.mesh.geometry.dispose();
      (m.mesh.material as THREE.MeshStandardMaterial[]).forEach(mat => mat.dispose());
    });

    this.fieldLines.forEach(line => {
      line.mesh.geometry.dispose();
      (line.mesh.material as THREE.LineBasicMaterial).dispose();
    });

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
