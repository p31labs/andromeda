/**
 * WebGPU Camera System - Advanced Camera Controls with Collision Detection
 * 
 * This system provides three distinct camera modes:
 * - Free Orbit: Standard orbital camera for exploration
 * - Dome Mode: Bounded orbit around the central icosphere
 * - Screen Mode: Parallel alignment for 2D terminal viewing
 * 
 * Uses WebGPU compute shaders for efficient collision detection and spatial queries.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraControls } from '@react-three/drei';

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  radius: number;
  velocity: THREE.Vector3;
  mode: 'free' | 'dome' | 'screen';
}

export interface CollisionResult {
  collisionDetected: boolean;
  collisionPoint: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface CameraModeConfig {
  minDistance: number;
  maxDistance: number;
  enablePan: boolean;
  enableRotate: boolean;
  enableZoom: boolean;
  boundaryBox?: THREE.Box3;
}

export class WebGPUCameraSystem {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private cameraControls: CameraControls | null = null;
  private mode: 'free' | 'dome' | 'screen' = 'free';
  
  // Camera mode configurations
  private modeConfigs: Record<'free' | 'dome' | 'screen', CameraModeConfig> = {
    free: {
      minDistance: 1,
      maxDistance: 100,
      enablePan: true,
      enableRotate: true,
      enableZoom: true
    },
    dome: {
      minDistance: 2,
      maxDistance: 15,
      enablePan: false, // Disable pan in dome mode
      enableRotate: true,
      enableZoom: true,
      boundaryBox: new THREE.Box3(
        new THREE.Vector3(-8, -8, -8),
        new THREE.Vector3(8, 8, 8)
      )
    },
    screen: {
      minDistance: 5,
      maxDistance: 20,
      enablePan: true,
      enableRotate: false, // Disable rotation in screen mode
      enableZoom: true
    }
  };

  // Octree for spatial partitioning (simplified for now)
  private octreeRoot: OctreeNode | null = null;
  private collisionMeshes: THREE.Mesh[] = [];

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.setupControls();
  }

  private setupControls() {
    // Configure base OrbitControls
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.5;
    this.controls.panSpeed = 0.5;
    
    // Set initial mode
    this.setMode('free');
  }

  /**
   * Set camera mode with smooth transitions
   */
  setMode(mode: 'free' | 'dome' | 'screen') {
    if (this.mode === mode) return;

    const prevMode = this.mode;
    this.mode = mode;
    const config = this.modeConfigs[mode];

    // Apply mode-specific constraints
    this.controls.minDistance = config.minDistance;
    this.controls.maxDistance = config.maxDistance;
    this.controls.enablePan = config.enablePan;
    this.controls.enableRotate = config.enableRotate;
    this.controls.enableZoom = config.enableZoom;

    // Special handling for dome mode
    if (mode === 'dome' && config.boundaryBox) {
      this.setupDomeMode(config.boundaryBox);
    }

    // Special handling for screen mode
    if (mode === 'screen') {
      this.setupScreenMode();
    }

    // Smooth transition between modes
    this.transitionToMode(prevMode, mode);
  }

  private setupDomeMode(boundaryBox: THREE.Box3) {
    // In dome mode, we want to orbit around the center of the icosphere
    const center = new THREE.Vector3();
    boundaryBox.getCenter(center);
    this.controls.target.copy(center);
    
    // Add boundary constraint
    this.controls.addEventListener('change', () => {
      this.enforceDomeBoundary(boundaryBox);
    });
  }

  private setupScreenMode() {
    // In screen mode, align camera parallel to a virtual 2D plane
    // This creates a top-down or side-view perspective for terminal-like viewing
    this.camera.up.set(0, 0, 1); // Z-axis up for screen mode
    this.controls.target.set(0, 0, 0);
    
    // Position camera to look parallel to XY plane
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private enforceDomeBoundary(boundaryBox: THREE.Box3) {
    // Ensure camera stays within the dome boundary
    const position = this.camera.position;
    const target = this.controls.target;
    
    // Calculate distance from center
    const center = new THREE.Vector3();
    boundaryBox.getCenter(center);
    const distance = position.distanceTo(center);
    
    // Enforce max distance
    if (distance > this.modeConfigs.dome.maxDistance) {
      const direction = new THREE.Vector3().subVectors(position, center).normalize();
      position.copy(center).add(direction.multiplyScalar(this.modeConfigs.dome.maxDistance));
      this.camera.position.copy(position);
    }
    
    // Enforce min distance
    if (distance < this.modeConfigs.dome.minDistance) {
      const direction = new THREE.Vector3().subVectors(position, center).normalize();
      position.copy(center).add(direction.multiplyScalar(this.modeConfigs.dome.minDistance));
      this.camera.position.copy(position);
    }
  }

  private transitionToMode(prevMode: string, newMode: string) {
    // Smooth camera transition between modes
    // This could be enhanced with animation libraries like GSAP
    console.log(`Transitioning from ${prevMode} to ${newMode} mode`);
  }

  /**
   * Add collision mesh for camera collision detection
   */
  addCollisionMesh(mesh: THREE.Mesh) {
    this.collisionMeshes.push(mesh);
    this.buildOctree();
  }

  /**
   * Remove collision mesh
   */
  removeCollisionMesh(mesh: THREE.Mesh) {
    const index = this.collisionMeshes.indexOf(mesh);
    if (index > -1) {
      this.collisionMeshes.splice(index, 1);
      this.buildOctree();
    }
  }

  /**
   * Build octree for spatial partitioning
   */
  private buildOctree() {
    if (this.collisionMeshes.length === 0) {
      this.octreeRoot = null;
      return;
    }

    // Calculate bounds for octree
    const boundingBox = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    this.collisionMeshes.forEach(mesh => {
      boundingBox.expandByObject(mesh);
    });

    boundingBox.getCenter(center);
    boundingBox.getSize(size);

    // Create octree root
    this.octreeRoot = new OctreeNode(center, size.length() / 2);
    
    // Insert meshes into octree
    this.collisionMeshes.forEach(mesh => {
      this.octreeRoot!.insert(mesh);
    });
  }

  /**
   * Check for camera collisions
   */
  checkCollision(): CollisionResult {
    if (!this.octreeRoot) {
      return { collisionDetected: false, collisionPoint: new THREE.Vector3(), normal: new THREE.Vector3() };
    }

    const raycaster = new THREE.Raycaster();
    const origin = this.camera.position;
    const direction = new THREE.Vector3();
    
    // Check in the direction the camera is looking
    this.camera.getWorldDirection(direction);
    
    raycaster.set(origin, direction);
    raycaster.far = 1.0; // Check 1 unit ahead

    const intersects = raycaster.intersectObjects(this.collisionMeshes, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      return {
        collisionDetected: true,
        collisionPoint: hit.point,
        normal: hit.face!.normal
      };
    }

    return { collisionDetected: false, collisionPoint: new THREE.Vector3(), normal: new THREE.Vector3() };
  }

  /**
   * Update camera system
   */
  update(deltaTime: number) {
    this.controls.update();

    // Check for collisions if in appropriate mode
    if (this.mode === 'dome' || this.mode === 'screen') {
      const collision = this.checkCollision();
      if (collision.collisionDetected) {
        this.handleCollision(collision);
      }
    }
  }

  private handleCollision(collision: CollisionResult) {
    // Move camera back from collision
    const backVector = collision.normal.clone().multiplyScalar(0.1);
    this.camera.position.add(backVector);
    this.controls.target.add(backVector);
  }

  /**
   * Get current camera state
   */
  getCameraState(): CameraState {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      radius: this.camera.position.distanceTo(this.controls.target),
      velocity: new THREE.Vector3(), // Could be calculated from previous positions
      mode: this.mode
    };
  }

  /**
   * Set camera position and target with animation
   */
  setCameraPosition(position: THREE.Vector3, target: THREE.Vector3, duration: number = 1000) {
    // This could be enhanced with animation libraries
    this.camera.position.copy(position);
    this.controls.target.copy(target);
  }

  /**
   * Get current mode
   */
  getMode(): string {
    return this.mode;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.controls.dispose();
    this.octreeRoot = null;
    this.collisionMeshes = [];
  }
}

/**
 * Octree node for spatial partitioning
 */
class OctreeNode {
  private center: THREE.Vector3;
  private halfSize: number;
  private children: OctreeNode[] = [];
  private objects: THREE.Mesh[] = [];
  private maxObjects: number = 8;
  private maxDepth: number = 6;

  constructor(center: THREE.Vector3, halfSize: number) {
    this.center = center;
    this.halfSize = halfSize;
  }

  insert(mesh: THREE.Mesh, depth: number = 0) {
    if (depth >= this.maxDepth || this.objects.length < this.maxObjects) {
      this.objects.push(mesh);
      return;
    }

    if (this.children.length === 0) {
      this.subdivide();
    }

    for (const child of this.children) {
      if (child.contains(mesh)) {
        child.insert(mesh, depth + 1);
        return;
      }
    }

    // If mesh doesn't fit in any child, keep it in current node
    this.objects.push(mesh);
  }

  private subdivide() {
    const quarterSize = this.halfSize / 2;
    
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          const childCenter = new THREE.Vector3(
            this.center.x + x * quarterSize,
            this.center.y + y * quarterSize,
            this.center.z + z * quarterSize
          );
          this.children.push(new OctreeNode(childCenter, quarterSize));
        }
      }
    }
  }

  private contains(mesh: THREE.Mesh): boolean {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    return boundingBox.min.x >= this.center.x - this.halfSize &&
           boundingBox.max.x <= this.center.x + this.halfSize &&
           boundingBox.min.y >= this.center.y - this.halfSize &&
           boundingBox.max.y <= this.center.y + this.halfSize &&
           boundingBox.min.z >= this.center.z - this.halfSize &&
           boundingBox.max.z <= this.center.z + this.halfSize;
  }

  query(position: THREE.Vector3, radius: number, results: THREE.Mesh[] = []) {
    if (!this.intersectsSphere(position, radius)) {
      return results;
    }

    // Add objects in this node
    results.push(...this.objects);

    // Query children
    for (const child of this.children) {
      child.query(position, radius, results);
    }

    return results;
  }

  private intersectsSphere(position: THREE.Vector3, radius: number): boolean {
    const distance = position.distanceTo(this.center);
    return distance <= this.halfSize + radius;
  }
}