import * as THREE from 'three';

// P31 Canon Colors
const COLORS = {
  phos: 0x39ff14,
  cyan: 0x00f5ff,
  orchid: 0xda70d6,
  gold: 0xfeca57,
  bg: 0x030408,
  wireframe: 0x111522
};

export interface GeodesicBuilderConfig {
  container: HTMLElement;
  onPieceBuilt?: (isCoop: boolean, position: THREE.Vector3) => void;
  onStructurePulse?: () => void;
}

export interface BuiltPiece {
  mesh: THREE.Mesh;
  wire: THREE.Mesh;
  targetScale: number;
  baseColor: number;
  isCoop: boolean;
}

export interface CareParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  rotSpeed: number;
}

export class GeodesicBuilderGame {
  private container: HTMLElement;
  private config: GeodesicBuilderConfig;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private buildGroup!: THREE.Group;
  private cursorsGroup!: THREE.Group;
  private dome!: THREE.Mesh;
  private floorPlane!: THREE.Mesh;
  private sjCursor!: THREE.Mesh;
  private wjCursor!: THREE.Mesh;
  private tetherLine!: THREE.Line;
  private tetherMat!: THREE.LineDashedMaterial;
  private buildLight!: THREE.PointLight;
  private raycaster!: THREE.Raycaster;
  private pointer!: THREE.Vector2;
  private targetCursorPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private wjTargetOffset: THREE.Vector3 = new THREE.Vector3();
  private builtPieces: BuiltPiece[] = [];
  private careParticles: CareParticle[] = [];
  private isCoopActive: boolean = false;
  private readonly MAX_PIECES = 50;
  private pieceGeo!: THREE.TetrahedronGeometry;
  private heartGeo!: THREE.OctahedronGeometry;
  private clock!: THREE.Clock;
  private rafId: number = 0;
  private isDisposed: boolean = false;

  constructor(config: GeodesicBuilderConfig) {
    this.container = config.container;
    this.config = config;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.pieceGeo = new THREE.TetrahedronGeometry(1.2, 0);
    this.heartGeo = new THREE.OctahedronGeometry(0.3, 0);
    this.init();
  }

  private init(): void {
    this.setupScene();
    this.setupLighting();
    this.createEnvironment();
    this.createAvatars();
    this.setupEvents();
    this.animate();
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.bg);
    this.scene.fog = new THREE.FogExp2(COLORS.bg, 0.015);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 15, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.container.appendChild(this.renderer.domElement);
    this.container.style.cursor = 'crosshair';
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    this.buildLight = new THREE.PointLight(COLORS.cyan, 0.5, 50);
    this.buildLight.position.set(0, 10, 0);
    this.scene.add(this.buildLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-10, 20, -10);
    this.scene.add(fillLight);
  }

  private createEnvironment(): void {
    const domeGeo = new THREE.IcosahedronGeometry(40, 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: COLORS.wireframe,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.dome = new THREE.Mesh(domeGeo, domeMat);
    this.scene.add(this.dome);

    const gridHelper = new THREE.GridHelper(40, 20, 0x222222, 0x111111);
    this.scene.add(gridHelper);

    const floorPlaneGeo = new THREE.PlaneGeometry(40, 40);
    const floorPlaneMat = new THREE.MeshBasicMaterial({ visible: false });
    this.floorPlane = new THREE.Mesh(floorPlaneGeo, floorPlaneMat);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.floorPlane);

    this.buildGroup = new THREE.Group();
    this.scene.add(this.buildGroup);
  }

  private createAvatars(): void {
    this.cursorsGroup = new THREE.Group();
    this.scene.add(this.cursorsGroup);

    // S.J. Avatar (Cyan Icosahedron)
    const sjGeo = new THREE.IcosahedronGeometry(0.8, 0);
    const sjMat = new THREE.MeshStandardMaterial({
      color: COLORS.cyan,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.5,
      wireframe: true
    });
    this.sjCursor = new THREE.Mesh(sjGeo, sjMat);
    this.cursorsGroup.add(this.sjCursor);

    // W.J. Avatar (Phos Dodecahedron)
    const wjGeo = new THREE.DodecahedronGeometry(0.8, 0);
    const wjMat = new THREE.MeshStandardMaterial({
      color: COLORS.phos,
      emissive: COLORS.phos,
      emissiveIntensity: 0.5,
      wireframe: true
    });
    this.wjCursor = new THREE.Mesh(wjGeo, wjMat);
    this.wjCursor.position.set(5, 0, -5);
    this.cursorsGroup.add(this.wjCursor);

    // Tether Line
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([
      this.sjCursor.position,
      this.wjCursor.position
    ]);
    this.tetherMat = new THREE.LineDashedMaterial({
      color: COLORS.orchid,
      dashSize: 0.5,
      gapSize: 0.5,
      transparent: true,
      opacity: 0
    });
    this.tetherLine = new THREE.Line(tetherGeo, this.tetherMat);
    this.tetherLine.computeLineDistances();
    this.cursorsGroup.add(this.tetherLine);
  }

  private createBuildPiece(position: THREE.Vector3, colorHex: number, isCoopMode: boolean): void {
    if (this.builtPieces.length >= this.MAX_PIECES) return;

    const pieceMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.5,
      flatShading: true,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(this.pieceGeo, pieceMat);

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.2
    });
    const wire = new THREE.Mesh(this.pieceGeo, wireMat);
    mesh.add(wire);

    // Snap to grid
    mesh.position.set(
      Math.round(position.x / 2) * 2,
      Math.max(0.6, position.y),
      Math.round(position.z / 2) * 2
    );

    // Stack if clicking on existing piece
    this.builtPieces.forEach(p => {
      if (Math.abs(p.mesh.position.x - mesh.position.x) < 0.1 &&
          Math.abs(p.mesh.position.z - mesh.position.z) < 0.1) {
        mesh.position.y = p.mesh.position.y + 1.5;
      }
    });

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    mesh.scale.set(0.01, 0.01, 0.01);

    this.buildGroup.add(mesh);
    this.builtPieces.push({
      mesh,
      wire,
      targetScale: 1.0,
      baseColor: colorHex,
      isCoop: isCoopMode
    });

    if (isCoopMode) {
      this.spawnCareParticles(mesh.position);
      this.buildLight.color.setHex(COLORS.orchid);
      this.buildLight.intensity = 1.0;
    } else {
      this.buildLight.color.setHex(colorHex);
      this.buildLight.intensity = 0.8;
    }
    this.buildLight.position.copy(mesh.position);
    this.buildLight.position.y += 2;

    this.config.onPieceBuilt?.(isCoopMode, mesh.position);
  }

  private spawnCareParticles(origin: THREE.Vector3): void {
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: COLORS.orchid,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(this.heartGeo, mat);
      mesh.position.copy(origin);

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.1;

      this.scene.add(mesh);
      this.careParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.1 + Math.random() * 0.15,
          Math.sin(angle) * speed
        ),
        life: 1.0,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  private updatePointer(clientX: number, clientY: number): void {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const meshes = [this.floorPlane, ...this.builtPieces.map(p => p.mesh)];
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      this.targetCursorPos.copy(intersects[0].point);
    }
  }

  private onPointerMove = (e: MouseEvent | TouchEvent): void => {
    let clientX: number, clientY: number;

    if (e instanceof TouchEvent) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    this.updatePointer(clientX, clientY);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('.ui-layer')) return;

    const dist = this.sjCursor.position.distanceTo(this.wjCursor.position);
    const isTogether = this.isCoopActive && dist < 3.0;

    const buildColor = isTogether ? COLORS.orchid : COLORS.cyan;

    this.createBuildPiece(this.targetCursorPos, buildColor, isTogether);
  };

  setCoOpMode(enabled: boolean): void {
    this.isCoopActive = enabled;
    this.tetherMat.opacity = enabled ? 0.5 : 0;
  }

  pulseStructure(): void {
    this.builtPieces.forEach(p => {
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(COLORS.orchid);
      mat.emissiveIntensity = 1.0;

      setTimeout(() => {
        mat.emissive.setHex(p.baseColor);
        mat.emissiveIntensity = 0.4;
      }, 1000);
    });

    this.buildLight.color.setHex(COLORS.orchid);
    this.buildLight.intensity = 2.0;

    this.config.onStructurePulse?.();
  }

  clearStructure(): void {
    this.builtPieces.forEach(p => {
      this.buildGroup.remove(p.mesh);
    });
    this.builtPieces.length = 0;
  }

  getPieceCount(): number {
    return this.builtPieces.length;
  }

  private setupEvents(): void {
    this.renderer.domElement.addEventListener('mousemove', this.onPointerMove);
    this.renderer.domElement.addEventListener('touchmove', this.onPointerMove, { passive: true });
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);

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

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Dome rotation
    this.dome.rotation.y += 0.001;
    this.dome.rotation.z += 0.0005;

    // S.J. cursor - follows pointer with bobbing
    this.sjCursor.position.lerp(this.targetCursorPos, 0.2);
    this.sjCursor.position.y += Math.sin(time * 5) * 0.05;
    this.sjCursor.rotation.x += 0.02;
    this.sjCursor.rotation.y += 0.03;

    // W.J. cursor - AI controlled
    if (this.isCoopActive) {
      const targetWJ = this.sjCursor.position.clone();
      targetWJ.x += Math.sin(time * 2) * 1.5;
      targetWJ.z += Math.cos(time * 2) * 1.5;
      this.wjCursor.position.lerp(targetWJ, 0.1);
    } else {
      if (Math.random() < 0.02) {
        this.wjTargetOffset.set(
          (Math.random() - 0.5) * 20,
          0,
          (Math.random() - 0.5) * 20
        );
      }
      this.wjCursor.position.lerp(this.wjTargetOffset, 0.02);
    }

    this.wjCursor.position.y = Math.max(0.8, this.wjCursor.position.y + Math.cos(time * 4) * 0.05);
    this.wjCursor.rotation.x -= 0.02;
    this.wjCursor.rotation.z += 0.03;

    // Update tether
    if (this.isCoopActive) {
      const positions = this.tetherLine.geometry.attributes.position.array as Float32Array;
      positions[0] = this.sjCursor.position.x;
      positions[1] = this.sjCursor.position.y;
      positions[2] = this.sjCursor.position.z;
      positions[3] = this.wjCursor.position.x;
      positions[4] = this.wjCursor.position.y;
      positions[5] = this.wjCursor.position.z;
      this.tetherLine.geometry.attributes.position.needsUpdate = true;

      const dist = this.sjCursor.position.distanceTo(this.wjCursor.position);
      this.tetherMat.opacity = Math.max(0.2, 1 - (dist / 10));
    }

    // Maxwell Rigidity - wind sway on build group
    this.buildGroup.rotation.z = Math.sin(time * 1.5) * 0.02;
    this.buildGroup.rotation.x = Math.cos(time * 1.2) * 0.02;

    // Piece animations
    this.builtPieces.forEach((p, i) => {
      if (p.mesh.scale.x < p.targetScale) {
        p.mesh.scale.lerp(new THREE.Vector3(p.targetScale, p.targetScale, p.targetScale), 0.15);
      }

      const heightFactor = p.mesh.position.y * 0.05;
      p.mesh.position.x += Math.sin(time * 2 + i) * 0.005 * heightFactor;
      p.mesh.position.z += Math.cos(time * 2 + i) * 0.005 * heightFactor;
    });

    // Care particles
    for (let i = this.careParticles.length - 1; i >= 0; i--) {
      const p = this.careParticles[i];
      p.mesh.position.add(p.velocity);
      p.mesh.rotation.x += p.rotSpeed;
      p.mesh.rotation.y += p.rotSpeed;
      p.velocity.y -= delta * 0.2;

      p.life -= delta * 1.0;
      p.mesh.scale.setScalar(Math.max(0, p.life));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.careParticles.splice(i, 1);
      }
    }

    // Light decay
    if (this.buildLight.intensity > 0) {
      this.buildLight.intensity = Math.max(0, this.buildLight.intensity - delta * 0.5);
    }

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.isDisposed = true;
    cancelAnimationFrame(this.rafId);

    window.removeEventListener('resize', this.handleResize);

    this.builtPieces.forEach(p => {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      p.wire.geometry.dispose();
      (p.wire.material as THREE.Material).dispose();
    });

    this.careParticles.forEach(p => {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
