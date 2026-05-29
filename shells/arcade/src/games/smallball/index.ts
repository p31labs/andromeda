/**
 * Smallball 2.5D Isometric Implementation
 * Phase 1 Flagship - Casual basketball with visual polish
 */

import * as THREE from 'three';
import { P31Colors } from '../../visual-system';
import { shaderManager, LoveEconomyParticles } from '../../visual-system';

export interface SmallballConfig {
  container: HTMLElement;
  playerId: 'sj' | 'wj';
  isCoop: boolean;
  siblingPlayer?: 'sj' | 'wj';
}

export class SmallballGame {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: LoveEconomyParticles;
  private clock = new THREE.Clock();
  
  // Game objects
  private court: THREE.Group;
  private playerMesh: THREE.Mesh;
  private ballMesh: THREE.Mesh;
  private hoopGroup: THREE.Group;
  private crowdLayers: THREE.Group[] = [];
  private trailPositions: THREE.Vector3[] = [];
  
  // State
  private isRunning = false;
  private score = 0;
  private ballVelocity = new THREE.Vector3();
  private isDribbling = false;
  
  // Co-op
  private siblingMesh?: THREE.Mesh;
  private coOpGlowMesh?: THREE.Mesh;

  constructor(private config: SmallballConfig) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a2e');
    
    // Isometric camera: 30° angle
    const aspect = config.container.clientWidth / config.container.clientHeight;
    const d = 10;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);
    
    // Renderer with performance optimizations
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Performance: disable AA on low-end
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(config.container.clientWidth, config.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    config.container.appendChild(this.renderer.domElement);
    
    // Particle system
    this.particles = new LoveEconomyParticles(this.scene);
    
    // Build scene
    this.court = this.createCourt();
    this.playerMesh = this.createPlayer(config.playerId);
    this.ballMesh = this.createBall();
    this.hoopGroup = this.createHoop();
    this.createCrowdSystem();
    
    if (config.isCoop && config.siblingPlayer) {
      this.setupCoOp(config.siblingPlayer);
    }
    
    this.scene.add(this.court);
    this.scene.add(this.playerMesh);
    this.scene.add(this.ballMesh);
    this.scene.add(this.hoopGroup);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = false; // Performance
    this.scene.add(dirLight);
    
    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createCourt(): THREE.Group {
    const group = new THREE.Group();
    
    // Court floor - normal mapped hardwood
    const floorGeom = new THREE.PlaneGeometry(18, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);
    
    // Court lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Free throw line
    const ftLine = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.1), lineMat);
    ftLine.rotation.x = -Math.PI / 2;
    ftLine.position.set(0, 0.01, -4);
    group.add(ftLine);
    
    // Key area
    const key = new THREE.Mesh(new THREE.PlaneGeometry(6, 5.8), new THREE.MeshBasicMaterial({
      color: 0x6b3e0f,
      transparent: true,
      opacity: 0.3,
    }));
    key.rotation.x = -Math.PI / 2;
    key.position.set(0, 0.005, -1.5);
    group.add(key);
    
    // 3-point arc (simplified as segments)
    const arcRadius = 6.75;
    const arcSegments = 20;
    for (let i = 0; i < arcSegments; i++) {
      const angle = (Math.PI / arcSegments) * i;
      const x = Math.cos(angle) * arcRadius;
      const z = Math.sin(angle) * arcRadius - 4;
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05), lineMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(x, 0.01, z);
      group.add(dot);
    }
    
    return group;
  }

  private createPlayer(playerId: 'sj' | 'wj'): THREE.Mesh {
    const color = playerId === 'sj' ? P31Colors.cyanVibe : P31Colors.phosGreen;
    const group = new THREE.Group();
    
    // Low-poly player: ~500 triangles total
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
    });
    
    // Body (box)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.4), material);
    body.position.y = 1;
    group.add(body);
    
    // Head (sphere low-poly)
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), material);
    head.position.y = 1.8;
    group.add(head);
    
    // Arms
    const armGeom = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const leftArm = new THREE.Mesh(armGeom, material);
    leftArm.position.set(-0.5, 1.2, 0);
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeom, material);
    rightArm.position.set(0.5, 1.2, 0);
    group.add(rightArm);
    
    // Legs
    const legGeom = new THREE.BoxGeometry(0.25, 0.9, 0.25);
    const leftLeg = new THREE.Mesh(legGeom, material);
    leftLeg.position.set(-0.2, 0.45, 0);
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeom, material);
    rightLeg.position.set(0.2, 0.45, 0);
    group.add(rightLeg);
    
    // Cap (player indicator)
    const capGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8);
    const cap = new THREE.Mesh(capGeom, new THREE.MeshStandardMaterial({ color: color }));
    cap.position.y = 2.05;
    group.add(cap);
    
    // Avatar cursor glow
    const glowGeom = new THREE.RingGeometry(0.5, 0.7, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.05;
    group.add(glow);
    
    const playerMesh = group as unknown as THREE.Mesh;
    playerMesh.position.set(0, 0, 2);
    return playerMesh;
  }

  private createBall(): THREE.Mesh {
    const geom = new THREE.IcosahedronGeometry(0.2, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      roughness: 0.4,
    });
    const ball = new THREE.Mesh(geom, mat);
    ball.position.set(0.5, 0.2, 2);
    
    // Add trail effect marker
    ball.userData = { trailColor: new THREE.Color(P31Colors.cyanVibe) };
    
    return ball;
  }

  private createHoop(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0, 3, -5);
    
    // Backboard
    const boardGeom = new THREE.BoxGeometry(1.8, 1.2, 0.05);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
    });
    const board = new THREE.Mesh(boardGeom, boardMat);
    group.add(board);
    
    // Rim
    const rimGeom = new THREE.TorusGeometry(0.25, 0.02, 4, 16);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.position.set(0, -0.4, 0.15);
    group.add(rim);
    
    // Net (simplified as cone)
    const netGeom = new THREE.ConeGeometry(0.25, 0.4, 8, 1, true);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const net = new THREE.Mesh(netGeom, netMat);
    net.position.set(0, -0.6, 0.15);
    group.add(net);
    
    // Pole
    const poleGeom = new THREE.CylinderGeometry(0.1, 0.1, 3.5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.set(0, -1.5, -0.5);
    group.add(pole);
    
    return group;
  }

  private createCrowdSystem(): void {
    // 3 parallax layers
    const layers = [
      { count: 30, z: -12, color: 0x333333, scale: 0.6, speed: 0.5 },
      { count: 50, z: -15, color: 0x222222, scale: 0.4, speed: 0.3 },
      { count: 80, z: -20, color: 0x111111, scale: 0.25, speed: 0.15 },
    ];
    
    layers.forEach((layer) => {
      const group = new THREE.Group();
      
      // Procedural crowd sprites
      for (let i = 0; i < layer.count; i++) {
        const x = (Math.random() - 0.5) * 30;
        const y = Math.random() * 3;
        
        // Simple humanoid shape
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.2 * layer.scale, 0.6 * layer.scale, 4, 8),
          new THREE.MeshBasicMaterial({ color: layer.color })
        );
        body.position.set(x, y + 2, layer.z);
        
        // Random variation
        const variation = Math.floor(Math.random() * 4);
        if (variation === 0) {
          // Arms up (cheering)
          const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.1 * layer.scale, 0.4 * layer.scale, 0.1 * layer.scale),
            body.material
          );
          arm.position.set(0, 0.3 * layer.scale, 0);
          arm.rotation.z = Math.PI / 4;
          body.add(arm);
        }
        
        body.userData = {
          cheerPhase: Math.random() * Math.PI * 2,
          cheerSpeed: 2 + Math.random() * 2,
          baseY: body.position.y,
        };
        
        group.add(body);
      }
      
      group.userData = { parallaxSpeed: layer.speed };
      this.crowdLayers.push(group);
      this.scene.add(group);
    });
  }

  private setupCoOp(siblingPlayer: 'sj' | 'wj'): void {
    // Create sibling player
    this.siblingMesh = this.createPlayer(siblingPlayer);
    this.siblingMesh.position.set(-2, 0, 2);
    this.scene.add(this.siblingMesh);
    
    // Co-op glow border
    const glowGeom = new THREE.PlaneGeometry(25, 15);
    const glowMat = shaderManager.createCoOpGlow();
    this.coOpGlowMesh = new THREE.Mesh(glowGeom, glowMat);
    this.coOpGlowMesh.position.set(0, 0, 8);
    this.scene.add(this.coOpGlowMesh);
    
    // Emit care flow on setup
    this.particles.emitCareFlow({
      source: new THREE.Vector3(0, 2, 2),
      target: new THREE.Vector3(-2, 2, 2),
      color: new THREE.Color(P31Colors.orchidSoul),
    });
  }

  private onResize(): void {
    const aspect = this.config.container.clientWidth / this.config.container.clientHeight;
    const d = 10;
    
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(this.config.container.clientWidth, this.config.container.clientHeight);
  }

  // Game actions
  shootBall(targetX: number, targetZ: number): void {
    // Calculate velocity for arc shot
    const start = this.ballMesh.position.clone();
    const end = new THREE.Vector3(targetX, 3, targetZ);
    const velocity = end.sub(start).multiplyScalar(0.1);
    velocity.y = 0.3; // Arc
    
    this.ballVelocity = velocity;
    this.isDribbling = false;
  }

  dribble(): void {
    this.isDribbling = true;
    this.ballVelocity.set(0, 0, 0);
  }

  movePlayer(x: number, z: number): void {
    this.playerMesh.position.x = Math.max(-8, Math.min(8, x));
    this.playerMesh.position.z = Math.max(-4, Math.min(5, z));
    
    // Ball follows player
    if (this.isDribbling) {
      this.ballMesh.position.x = this.playerMesh.position.x + 0.5;
      this.ballMesh.position.z = this.playerMesh.position.z;
    }
  }

  // Animation loop
  start(): void {
    this.isRunning = true;
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
  }

  private animate(): void {
    if (!this.isRunning) return;
    
    const elapsed = this.clock.getElapsedTime();
    
    // Update shaders
    shaderManager.update();
    
    // Animate crowd cheering
    this.crowdLayers.forEach(layer => {
      layer.children.forEach((crowd) => {
        const mesh = crowd as THREE.Mesh;
        const data = mesh.userData;
        const cheerOffset = Math.sin(elapsed * data.cheerSpeed + data.cheerPhase) * 0.1;
        mesh.position.y = data.baseY + Math.abs(cheerOffset);
      });
    });
    
    // Ball physics
    if (!this.isDribbling) {
      this.ballMesh.position.add(this.ballVelocity);
      this.ballVelocity.y -= 0.01; // Gravity
      
      // Bounce
      if (this.ballMesh.position.y <= 0.2) {
        this.ballMesh.position.y = 0.2;
        this.ballVelocity.y *= -0.7;
      }
      
      // Rotation
      this.ballMesh.rotation.x += this.ballVelocity.z * 5;
      this.ballMesh.rotation.z -= this.ballVelocity.x * 5;
      
      // Trail
      if (this.ballMesh.position.y > 0.5) {
        this.trailPositions.push(this.ballMesh.position.clone());
        if (this.trailPositions.length > 10) {
          this.trailPositions.shift();
        }
      }
    } else {
      // Dribble animation
      const dribbleHeight = Math.abs(Math.sin(elapsed * 10)) * 0.3;
      this.ballMesh.position.y = 0.2 + dribbleHeight;
      this.trailPositions = [];
    }
    
    // Update particles
    this.particles.update();
    
    // Render
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  // Score event
  onScore(): void {
    this.score++;
    
    // Victory particles
    this.particles.emitCoopVictory(new THREE.Vector3(0, 4, -5));
    
    // Care flow
    this.particles.emitCareFlow({
      source: new THREE.Vector3(0, 3, -5),
      target: this.playerMesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
      color: new THREE.Color(P31Colors.orchidSoul),
    });
  }

  dispose(): void {
    this.stop();
    this.particles.dispose();
    this.renderer.dispose();
    this.config.container.removeChild(this.renderer.domElement);
  }

  getScore(): number {
    return this.score;
  }
}

export default SmallballGame;
