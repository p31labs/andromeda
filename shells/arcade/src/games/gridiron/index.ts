/**
 * Gridiron Broadcast Sports Implementation
 * Phase 1 Flagship - Tactical football with broadcast aesthetic
 */

import * as THREE from 'three';
import { P31Colors } from '../../visual-system';
import { shaderManager, LoveEconomyParticles } from '../../visual-system';

export interface GridironConfig {
  container: HTMLElement;
  playerId: 'sj' | 'wj';
  isCoop: boolean;
  siblingPlayer?: 'sj' | 'wj';
}

export type CameraMode = 'play' | 'sky' | 'replay';

export class GridironGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: LoveEconomyParticles;
  private clock = new THREE.Clock();
  
  // Game objects
  private field: THREE.Mesh;
  private yardLines: THREE.Group;
  private players: Map<string, THREE.Mesh> = new Map();
  private ball: THREE.Mesh;
  private goalPosts: THREE.Group[] = [];
  
  // State
  private isRunning = false;
  private score = { home: 0, away: 0 };
  private cameraMode: CameraMode = 'sky';
  private ballCarrier: string | null = null;
  private playInProgress = false;
  
  // Co-op
  private formationGlow: THREE.Object3D[] = [];

  constructor(private config: GridironConfig) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0f1419');
    this.scene.fog = new THREE.Fog('#0f1419', 20, 80);
    
    // Camera - broadcast angles
    const aspect = config.container.clientWidth / config.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 15, 20);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(config.container.clientWidth, config.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    config.container.appendChild(this.renderer.domElement);
    
    // Particles
    this.particles = new LoveEconomyParticles(this.scene);
    
    // Build field
    this.field = this.createField();
    this.yardLines = this.createYardLines();
    this.ball = this.createBall();
    
    this.scene.add(this.field);
    this.scene.add(this.yardLines);
    this.scene.add(this.ball);
    
    // Setup teams
    this.setupTeam('home', config.playerId);
    this.setupTeam('away', config.playerId === 'sj' ? 'wj' : 'sj');
    
    // Goal posts
    this.goalPosts.push(this.createGoalPost(-50));
    this.goalPosts.push(this.createGoalPost(50));
    this.goalPosts.forEach(post => this.scene.add(post));
    
    // Lighting - broadcast style
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(20, 30, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    this.scene.add(sunLight);
    
    // Stadium lights
    const stadiumLights = this.createStadiumLights();
    this.scene.add(stadiumLights);
    
    if (config.isCoop) {
      this.setupCoOpVisuals();
    }
    
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createField(): THREE.Mesh {
    // Grass with wind shader
    const geom = new THREE.PlaneGeometry(100, 60, 50, 30);
    const mat = shaderManager.createTurf();
    
    const field = new THREE.Mesh(geom, mat);
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    
    return field;
  }

  private createYardLines(): THREE.Group {
    const group = new THREE.Group();
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Yard lines every 10 yards
    for (let i = -50; i <= 50; i += 10) {
      if (i === 0) continue; // Skip 50 (different color)
      
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 60), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(i, 0.02, 0);
      group.add(line);
      
      // Yard numbers (simplified representation)
      // Simplified as colored blocks
      const numBlock = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      numBlock.rotation.x = -Math.PI / 2;
      numBlock.position.set(i, 0.03, 20);
      group.add(numBlock);
      
      const numBlock2 = numBlock.clone();
      numBlock2.position.set(i, 0.03, -20);
      numBlock2.rotation.z = Math.PI; // Face other direction
      group.add(numBlock2);
    }
    
    // 50 yard line
    const fiftyLine = new THREE.Mesh(new THREE.PlaneGeometry(1, 60), new THREE.MeshBasicMaterial({
      color: 0xffff00,
    }));
    fiftyLine.rotation.x = -Math.PI / 2;
    fiftyLine.position.set(0, 0.025, 0);
    group.add(fiftyLine);
    
    // Hash marks
    for (let x = -50; x <= 50; x += 1) {
      if (x % 5 === 0) continue;
      const hash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.6),
        lineMat
      );
      hash.rotation.x = -Math.PI / 2;
      hash.position.set(x, 0.015, 8);
      group.add(hash);
      
      const hash2 = hash.clone();
      hash2.position.set(x, 0.015, -8);
      group.add(hash2);
    }
    
    return group;
  }

  private createBall(): THREE.Mesh {
    const geom = new THREE.SphereGeometry(0.4, 16, 12);
    geom.scale(1, 0.6, 0.6);
    
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6,
    });
    
    const ball = new THREE.Mesh(geom, mat);
    ball.position.set(0, 0.4, 0);
    ball.castShadow = true;
    
    // Laces
    const laces = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.05, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    laces.position.y = 0.25;
    ball.add(laces);
    
    return ball;
  }

  private createGoalPost(z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0, 0, z);
    
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    
    // Uprights
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8), yellowMat);
    leftPost.position.set(-2.7, 4, 0);
    group.add(leftPost);
    
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8), yellowMat);
    rightPost.position.set(2.7, 4, 0);
    group.add(rightPost);
    
    // Crossbar
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.6), yellowMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 0.5, 0);
    group.add(crossbar);
    
    return group;
  }

  private createStadiumLights(): THREE.Group {
    const group = new THREE.Group();
    
    // 4 corner lights
    const positions = [
      [-60, 25, -40],
      [60, 25, -40],
      [-60, 25, 40],
      [60, 25, 40],
    ];
    
    positions.forEach(pos => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 1, 25),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
      );
      tower.position.set(pos[0], pos[1] / 2, pos[2]);
      group.add(tower);
      
      // Light fixture
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(4, 2, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffee })
      );
      fixture.position.set(pos[0], pos[1], pos[2]);
      group.add(fixture);
      
      // Actual light
      const spotLight = new THREE.SpotLight(0xffffee, 0.5);
      spotLight.position.set(pos[0], pos[1], pos[2]);
      spotLight.target.position.set(0, 0, 0);
      spotLight.angle = Math.PI / 3;
      spotLight.penumbra = 0.5;
      group.add(spotLight);
      group.add(spotLight.target);
    });
    
    return group;
  }

  private setupTeam(side: 'home' | 'away', playerId: 'sj' | 'wj'): void {
    const color = playerId === 'sj' ? P31Colors.cyanVibe : P31Colors.phosGreen;
    const zOffset = side === 'home' ? 5 : -5;
    const xStart = side === 'home' ? -20 : 20;
    
    // 11 players
    const formation = side === 'home' 
      ? this.getOffenseFormation() 
      : this.getDefenseFormation();
    
    formation.forEach((pos, i) => {
      const player = this.createPlayerModel(color, playerId);
      player.position.set(xStart + pos.x, 0, pos.z + zOffset);
      player.userData = {
        id: `${side}-${i}`,
        side,
        number: i + 1,
        speed: 5 + Math.random() * 3,
      };
      
      this.players.set(`${side}-${i}`, player);
      this.scene.add(player);
    });
  }

  private getOffenseFormation(): { x: number; z: number }[] {
    // Standard formation
    return [
      { x: 0, z: 0 },    // QB
      { x: -2, z: -3 },  // RB
      { x: 5, z: 0 },    // C
      { x: 5, z: 2 },    // LG
      { x: 5, z: -2 },   // RG
      { x: 8, z: 5 },    // LT
      { x: 8, z: -5 },   // RT
      { x: 10, z: 8 },   // WR1
      { x: 10, z: -8 },  // WR2
      { x: 12, z: 0 },   // TE
      { x: -5, z: 10 },  // Slot
    ];
  }

  private getDefenseFormation(): { x: number; z: number }[] {
    return [
      { x: 0, z: 0 },    // NT
      { x: -3, z: 3 },   // DE1
      { x: -3, z: -3 },  // DE2
      { x: -5, z: 8 },   // OLB1
      { x: -5, z: -8 },  // OLB2
      { x: -7, z: 0 },   // MLB
      { x: -10, z: 5 },  // CB1
      { x: -10, z: -5 }, // CB2
      { x: -12, z: 10 }, // S1
      { x: -12, z: -10 }, // S2
      { x: -15, z: 0 },  // FS
    ];
  }

  private createPlayerModel(color: string, playerId: 'sj' | 'wj'): THREE.Mesh {
    const group = new THREE.Group() as unknown as THREE.Mesh;
    
    // Jersey color
    const jerseyMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
    });
    
    // Body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 4, 8), jerseyMat);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);
    
    // Helmet
    const helmetColor = playerId === 'sj' ? 0x00f5ff : 0x39ff14;
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 8),
      new THREE.MeshStandardMaterial({ color: helmetColor, metalness: 0.3 })
    );
    helmet.position.y = 1.9;
    group.add(helmet);
    
    // Number on jersey (simplified)
    const numberPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    numberPlate.position.set(0, 1.2, 0.42);
    group.add(numberPlate);
    
    // Avatar indicator ring
    const ringGeom = new THREE.RingGeometry(0.5, 0.6, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);
    
    return group;
  }

  private setupCoOpVisuals(): void {
    // Formation glow lines
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-20, 0.1, 0),
      new THREE.Vector3(20, 0.1, 0),
    ]);
    
    const lineMat = new THREE.LineBasicMaterial({
      color: P31Colors.phosGreen,
      linewidth: 2,
    });
    
    const line1 = new THREE.Line(lineGeom, lineMat);
    this.formationGlow.push(line1);
    this.scene.add(line1);
    
    // Secondary glow for sibling
    const line2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-20, 0.1, 10),
        new THREE.Vector3(20, 0.1, 10),
      ]),
      new THREE.LineBasicMaterial({ color: P31Colors.cyanVibe })
    );
    this.formationGlow.push(line2);
    this.scene.add(line2);
  }

  setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    
    switch (mode) {
      case 'play':
        // Follow ball
        break;
      case 'sky':
        this.camera.position.set(0, 30, 0);
        this.camera.lookAt(0, 0, 0);
        break;
      case 'replay':
        // Cinematic angle
        this.camera.position.set(20, 5, 20);
        this.camera.lookAt(0, 0, 0);
        break;
    }
  }

  snapBall(): void {
    this.playInProgress = true;
    this.ballCarrier = 'home-0'; // QB starts with ball
    
    // Move ball to QB
    const qb = this.players.get('home-0');
    if (qb) {
      this.ball.position.copy(qb.position);
      this.ball.position.y += 1;
    }
    
    // Care flow emit
    this.particles.emitCareFlow({
      source: new THREE.Vector3(0, 2, 0),
      target: new THREE.Vector3(0, 2, 10),
      color: new THREE.Color(P31Colors.orchidSoul),
    });
  }

  passBall(targetId: string): void {
    if (!this.ballCarrier) return;
    
    const target = this.players.get(targetId);
    if (!target) return;
    
    // Animate ball to target
    const start = this.ball.position.clone();
    const end = target.position.clone();
    end.y += 1.5;
    
    // Arc trajectory
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += 8;
    
    // Trail effect
    this.particles.emitCareFlow({
      source: start,
      target: end,
      color: new THREE.Color(P31Colors.chumpGold),
      particleCount: 10,
    });
    
    this.ballCarrier = targetId;
  }

  scoreTouchdown(): void {
    this.score.home += 6;
    
    // Dual-color fireworks
    this.particles.emitCoopVictory(new THREE.Vector3(50, 5, 0));
    
    // Formation glow pulse
    // Pulse effect on formation glow
    this.formationGlow.forEach(line => {
      line.userData = { pulse: true };
    });
    
    // Reset after delay
    setTimeout(() => {
      this.formationGlow.forEach(line => {
        line.userData = { pulse: false };
      });
    }, 2000);
  }

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
    
    shaderManager.update();
    this.particles.update();
    
    // Camera follow ball in play mode
    if (this.cameraMode === 'play' && this.ballCarrier) {
      const target = this.players.get(this.ballCarrier);
      if (target) {
        this.camera.position.x += (target.position.x - this.camera.position.x) * 0.05;
        this.camera.position.z += ((target.position.z + 10) - this.camera.position.z) * 0.05;
        this.camera.lookAt(target.position);
      }
    }
    
    // Animate players (idle bob)
    this.players.forEach((player, id) => {
      if (!this.playInProgress) {
        player.position.y = Math.sin(elapsed * 2 + id.length) * 0.05;
      }
    });
    
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  private onResize(): void {
    const aspect = this.config.container.clientWidth / this.config.container.clientHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.config.container.clientWidth, this.config.container.clientHeight);
  }

  dispose(): void {
    this.stop();
    this.particles.dispose();
    this.renderer.dispose();
    this.config.container.removeChild(this.renderer.domElement);
  }

  getScore() {
    return this.score;
  }
}

export default GridironGame;
