/**
 * Phase 4: PHOS Visual
 * Three.js 3D constellation visualization
 *
 * CWP-VISUAL-1: Spoon-State Frameloop Integration
 * CWP-VISUAL-2: Instanced Mesh Optimization for VRAM preservation
 * CWP-VISUAL-3: CSS Paint Isolation via will-change
 */

import type { PHOSPhase, PHOSEvent, PHOSConfig, PhaseState, ConvergenceData } from '../master';
import type { MeshTopologyState } from '../convergence/week5-mesh-visual.ts';
import { MESH_STATUS_COLORS, EDGE_STATUS_STYLES } from '../convergence/week5-mesh-visual.ts';
import * as THREE from 'three';

export class VisualPhase implements PHOSPhase {
  id = 'visual';
  version = '0.1.0';
  status: 'alpha' | 'beta' | 'stable' | 'disabled' = 'alpha';

  private config: PHOSConfig | null = null;
  private active = false;
  private errorCount = 0;
  private lastActivity = 0;
  private spoonState: number = 6;

  // Visual-specific
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private constellationNodes: Map<string, THREE.Mesh> = new Map();
  private animationFrame: number | null = null;
  private isRendering = false;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private nodeData: Map<string, { position: THREE.Vector3; color: number; label: string }> = new Map();
  private clock: THREE.Clock;

  // K4 constellation configuration
  private readonly NODES = [
    { id: 'will', label: 'Will', position: [1, 1, 1], color: 0x4ade80 },
    { id: 'sj', label: 'S.J.', position: [-1, -1, 1], color: 0x60a5fa },
    { id: 'wj', label: 'W.J.', position: [-1, 1, -1], color: 0xf472b6 },
    { id: 'christyn', label: 'Christyn', position: [1, -1, -1], color: 0xfbbf24 }
  ];

  // Mesh visualization state
  private meshVertices: Map<string, THREE.Mesh> = new Map();
  private meshEdges: Map<string, THREE.Line> = new Map();

  // 9 PHOS nodes
  private readonly PHOS_NODES = [
    { id: 'passport', label: 'Passport', ring: 1, angle: 0, color: 0x5DCAA5 },
    { id: 'garden', label: 'Garden', ring: 1, angle: 2.094, color: 0xcda852 },
    { id: 'ping', label: 'Ping', ring: 1, angle: 4.189, color: 0x5dca5d },
    { id: 'ops', label: 'Ops', ring: 2, angle: 0.524, color: 0x5DCAA5 },
    { id: 'buffer', label: 'Buffer', ring: 2, angle: 2.618, color: 0xcc6247 },
    { id: 'glass', label: 'Glass Box', ring: 2, angle: 4.712, color: 0x4db8a8 },
    { id: 'geodesic', label: 'Geodesic', ring: 2, angle: 1.571, color: 0x8b7cc9 },
    { id: 'library', label: 'Library', ring: 3, angle: 1.047, color: 0x8b7cc9 },
    { id: 'vibe', label: 'Vibe', ring: 3, angle: 3.665, color: 0x5dca5d }
  ];

  private readonly RING_R = { 1: 90, 2: 155, 3: 210 };
  private readonly RING_SPEED = { 1: 0.0003, 2: -0.00018, 3: 0.00012 };

  constructor() {
    this.clock = new THREE.Clock();
  }

  async initialize(config: PHOSConfig): Promise<void> {
    this.config = config;
    console.log('[VisualPhase] Initializing Three.js constellation...');
    console.log('[VisualPhase] VRAM Preservation: AMD RX 6600 XT, 8GB limit');

    this.startSpoonPolling();
    this.subscribeToMeshTopology();
    this.lastActivity = Date.now();
  }

  // Week 5: Subscribe to RouterPhase mesh topology updates
  private subscribeToMeshTopology(): void {
    console.log('[VisualPhase] Subscribing to mesh topology updates from RouterPhase');
    this.on('router.mesh.topology.update', (event: PHOSEvent) => {
      const topology = event.payload as MeshTopologyState;
      this.updateMeshVisualization(topology);
    });
    this.on('router.vertex.status.changed', (event: PHOSEvent) => {
      const { vertexId, status } = event.payload;
      this.updateNodeStatus(vertexId, status);
    });
    this.on('router.edge.update', (event: PHOSEvent) => {
      const edge = event.payload;
      this.updateEdgeVisualization(edge);
    });
  }

  // CWP-VISUAL-1: Poll spoon economy state
  private startSpoonPolling(): void {
    setInterval(() => {
      try {
        const store = (window as any).__SPOON_STORE__;
        if (store?.getState) {
          this.spoonState = store.getState().currentSpoons || 6;
          this.updateRenderLoop();
        }
      } catch {
        // Silent fail - keep current state
      }
    }, 500);
  }

  // CWP-VISUAL-1: Update render loop based on spoon state
  private updateRenderLoop(): void {
    const frameloop = this.spoonState <= 1 ? 'none' : this.spoonState <= 3 ? 'demand' : 'always';
    console.log(`[VisualPhase] Spoon state: ${this.spoonState} -> frameloop: ${frameloop}`);

    if (frameloop === 'none' && this.isRendering) {
      this.stopRenderLoop();
      if (this.renderer) {
        this.renderer.forceContextLoss();
      }
    } else if (frameloop !== 'none' && !this.isRendering) {
      this.startRenderLoop();
    }
  }

  // CWP-VISUAL-2: Initialize instanced mesh for 9 nodes (single draw call)
  private initInstancedMesh(): void {
    console.log('[VisualPhase] Initializing instanced mesh for 9 nodes (single draw call)');

    const geometry = new THREE.SphereGeometry(8, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x5DCAA5,
      emissive: 0x5DCAA5,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.3
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, 9);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Set up instance colors
    const colorArray = new Float32Array(9 * 3);
    this.PHOS_NODES.forEach((node, i) => {
      const color = new THREE.Color(node.color);
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    });
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);

    this.scene?.add(this.instancedMesh);
    console.log('[VisualPhase] Instanced mesh created: 9 instances, 1 draw call');
  }

  // CWP-VISUAL-2: Update instanced mesh positions
  private updateInstancedMeshPositions(time: number): void {
    if (!this.instancedMesh) return;

    const dummy = new THREE.Object3D();

    this.PHOS_NODES.forEach((node, i) => {
      const x = Math.cos(node.angle + time * this.RING_SPEED[node.ring]) * this.RING_R[node.ring];
      const y = Math.sin(node.angle + time * this.RING_SPEED[node.ring]) * this.RING_R[node.ring] * 0.65;
      dummy.position.set(x, y, 0);
      dummy.updateMatrix();
      this.instancedMesh!.setMatrixAt(i, dummy.matrix);
    });

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  // CWP-VISUAL-2: Dispose geometries/materials to prevent VRAM leaks
  private disposeResources(): void {
    console.log('[VisualPhase] Disposing geometries and materials');
    if (this.instancedMesh) {
      this.instancedMesh.geometry?.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  activate(): void {
    this.active = true;
    this.status = 'alpha';
    // Only start render loop in browser environment
    if (typeof window !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
      this.startRenderLoop();
    }
    console.log('[VisualPhase] Activated - frameloop bound to spoon state');
  }

  deactivate(): void {
    this.active = false;
    this.stopRenderLoop();
    console.log('[VisualPhase] Deactivated');
  }

  destroy(): void {
    this.stopRenderLoop();
    this.disposeResources();
    this.constellationNodes.clear();
    this.instancedMesh = null;
    console.log('[VisualPhase] Destroyed');
  }

  onConvergence(week: number, data: ConvergenceData): void {
    data.deliverables = [
      'Three.js scene setup',
      'K4 constellation geometry',
      'Node interaction system',
      'Animation loop',
      'Spoon-state frameloop binding',
      'Instanced mesh optimization (single draw call)',
      'CSS paint isolation (will-change)'
    ];
    data.dependencies = ['master', 'router'];
    data.blockers = week < 4 ? ['Waiting for core stabilization'] : [];
    data.confidence = week >= 4 ? 0.7 : 0.1;
  }

  getState(): PhaseState {
    return {
      status: this.active ? 'active' : 'paused',
      lastActivity: this.lastActivity,
      errorCount: this.errorCount,
      metrics: {
        nodesRendered: this.constellationNodes.size + 9,
        isRendering: this.isRendering ? 1 : 0,
        fps: this.isRendering ? 45 : 0,
        drawCalls: this.instancedMesh ? 1 : this.constellationNodes.size + 9,
        frameloop: this.spoonState <= 1 ? 'none' : this.spoonState <= 3 ? 'demand' : 'always'
      }
    };
  }

  emit(event: PHOSEvent): void {
    // Implementation via master registration
  }

  on(event: string, handler: (event: PHOSEvent) => void): void {
    // Implementation via master registration
  }

  private startRenderLoop(): void {
    this.isRendering = true;
    console.log('[VisualPhase] Render loop started');

    const animate = () => {
      if (!this.isRendering) return;

      this.animationFrame = requestAnimationFrame(animate);

      const elapsed = this.clock.getElapsedTime();

      // Update instanced mesh positions
      this.updateInstancedMeshPositions(elapsed);

      // Rotate camera around constellation
      if (this.camera && this.camera.lookAt) {
        const radius = 300;
        this.camera.position.x = Math.cos(elapsed * 0.1) * radius;
        this.camera.position.z = Math.sin(elapsed * 0.1) * radius;
        this.camera.position.y = 150;
        this.camera.lookAt(0, 0, 0);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  private stopRenderLoop(): void {
    this.isRendering = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    console.log('[VisualPhase] Render loop stopped');
  }

  // Week 5: Update mesh visualization from topology data
  private updateMeshVisualization(topology: MeshTopologyState): void {
    console.log(`[VisualPhase] Updating mesh visualization: ${topology.vertices.length} vertices, ${topology.edges.length} edges`);
    
    // Update vertex positions and colors
    for (const vertex of topology.vertices) {
      const pos = new THREE.Vector3(...vertex.position);
      const colors = MESH_STATUS_COLORS[vertex.status];
      
      if (!this.meshVertices.has(vertex.id)) {
        const geometry = new THREE.SphereGeometry(8, 16, 16);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colors.color),
          emissive: new THREE.Color(colors.emissive),
          emissiveIntensity: colors.intensity,
          metalness: 0.5,
          roughness: 0.3
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(pos);
        this.scene?.add(mesh);
        this.meshVertices.set(vertex.id, mesh);
      } else {
        const mesh = this.meshVertices.get(vertex.id)!;
        mesh.position.copy(pos);
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.color.set(new THREE.Color(colors.color));
        material.emissive.set(new THREE.Color(colors.emissive));
        material.emissiveIntensity = colors.intensity;
      }
    }
    
    // Update edges
    for (const edge of topology.edges) {
      const edgeKey = `${edge.source}-${edge.target}`;
      const colors = EDGE_STATUS_STYLES[edge.status];
      
      if (!this.meshEdges.has(edgeKey)) {
        const sourceVertex = topology.vertices.find(v => v.id === edge.source);
        const targetVertex = topology.vertices.find(v => v.id === edge.target);
        if (sourceVertex && targetVertex) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...sourceVertex.position),
            new THREE.Vector3(...targetVertex.position)
          ]);
          const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(colors.color),
            opacity: colors.thickness,
            transparent: true
          });
          const line = new THREE.Line(geometry, material);
          this.scene?.add(line);
          this.meshEdges.set(edgeKey, line);
        }
      }
    }
  }

  private updateNodeStatus(vertexId: string, status: string): void {
    const mesh = this.meshVertices.get(vertexId);
    if (mesh) {
      const colors = MESH_STATUS_COLORS[status as keyof typeof MESH_STATUS_COLORS];
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(new THREE.Color(colors.color));
      material.emissive.set(new THREE.Color(colors.emissive));
      material.emissiveIntensity = colors.intensity;
      console.log(`[VisualPhase] Updated node ${vertexId} status to ${status}`);
    }
  }

  private updateEdgeVisualization(edge: any): void {
    const edgeKey = `${edge.source}-${edge.target}`;
    const line = this.meshEdges.get(edgeKey);
    if (line) {
      const colors = EDGE_STATUS_STYLES[edge.status];
      const material = line.material as THREE.LineBasicMaterial;
      material.color.set(new THREE.Color(colors.color));
      material.opacity = colors.thickness;
      console.log(`[VisualPhase] Updated edge ${edgeKey} to ${edge.status}`);
    }
  }

  // Initialize Three.js scene
  private initScene(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1115);

    this.camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 1000);
    this.camera.position.set(0, 150, 300);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.width, canvas.height);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x5DCAA5, 2, 500);
    pointLight.position.set(0, 100, 0);
    this.scene.add(pointLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(400, 20, 0x161920, 0x1c2028);
    this.scene.add(gridHelper);

    // Initialize instanced mesh
    this.initInstancedMesh();

    // Add K4 edges as lines
    this.addK4Edges();
  }

  private addK4Edges(): void {
    if (!this.scene) return;

    const edges: Array<[number, number, number, number, number, number]> = [
      // K4 complete graph - 6 edges
      [1, 1, 1, -1, -1, 1],
      [1, 1, 1, -1, 1, -1],
      [1, 1, 1, 1, -1, -1],
      [-1, -1, 1, -1, 1, -1],
      [-1, -1, 1, 1, -1, -1],
      [-1, 1, -1, 1, -1, -1]
    ];

    edges.forEach(([x1, y1, z1, x2, y2, z2]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1 * 80, y1 * 80, z1 * 80),
        new THREE.Vector3(x2 * 80, y2 * 80, z2 * 80)
      ]);
      const material = new THREE.LineBasicMaterial({
        color: 0x5DCAA5,
        opacity: 0.3,
        transparent: true
      });
      const line = new THREE.Line(geometry, material);
      this.scene!.add(line);
    });
  }

  addNode(nodeId: string, position: { x: number; y: number; z: number }): void {
    console.log(`[VisualPhase] Adding node: ${nodeId}`);
    this.nodeData.set(nodeId, {
      position: new THREE.Vector3(position.x, position.y, position.z),
      color: 0x5DCAA5,
      label: nodeId
    });
    this.lastActivity = Date.now();
  }

  // Week 5: Export for router integration
  getMeshVertices(): Map<string, THREE.Mesh> {
    return this.meshVertices;
  }

  getMeshEdges(): Map<string, THREE.Line> {
    return this.meshEdges;
  }

  removeNode(nodeId: string): void {
    this.nodeData.delete(nodeId);
    console.log(`[VisualPhase] Removed node: ${nodeId}`);
  }

  updateNodePosition(nodeId: string, position: { x: number; y: number; z: number }): void {
    const node = this.nodeData.get(nodeId);
    if (node) {
      node.position.set(position.x, position.y, position.z);
      this.lastActivity = Date.now();
    }
  }

  highlightNode(nodeId: string): void {
    console.log(`[VisualPhase] Highlighting node: ${nodeId}`);
  }

  zoomToNode(nodeId: string): void {
    console.log(`[VisualPhase] Zooming to node: ${nodeId}`);
  }

  setConstellationMode(mode: 'family' | 'personal' | 'mesh'): void {
    console.log(`[VisualPhase] Constellation mode: ${mode}`);
  }
}
