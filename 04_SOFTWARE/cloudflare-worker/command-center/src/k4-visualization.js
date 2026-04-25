// K4 Tetrahedron Visualization with Custom GLSL Shaders
// Implements neuro-inclusive biological telemetry encoding

export function getK4VisualizationScript() {
  return `
// Three.js K4 Tetrahedron Renderer
class K4TetrahedronRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.instancedMesh = null;
    this.nodePositions = null;
    this.edgeLines = [];
    this.particles = null;
    this.clock = new THREE.Clock();
    this.nodeNames = null;
    
    this.init();
  }
  
  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);
    
    var aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 8);
    
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
    
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    this.createK4Mesh();
    this.createEdges();
    this.createParticles();
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    var self = this;
    this.container.addEventListener('mousemove', function(e) { self.onMouseMove(e); });
    this.container.addEventListener('click', function(e) { self.onClick(e); });
    window.addEventListener('resize', function() { self.onResize(); });
    
    this.animate();
  }
  
  createK4Mesh() {
    const vertices = [
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(1, -1, -1),
      new THREE.Vector3(-1, 1, -1),
      new THREE.Vector3(-1, -1, 1)
    ];
    
    this.nodePositions = vertices;
    
    var vertexShader = [
      'varying vec3 vNormal;',
      'varying vec3 vViewPosition;',
      'uniform float uSpoonDeficitExponent;',
      'uniform float uTime;',
      'uniform float uSpoonLevel;',
      'void main() {',
      '  vNormal = normalize(normalMatrix * normal);',
      '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
      '  vViewPosition = -mvPosition.xyz;',
      '  float pulse = 1.0 + 0.1 * sin(uTime * 3.0) * (1.0 - uSpoonDeficitExponent);',
      '  float glow = 0.3 + 0.7 * uSpoonLevel;',
      '  vec3 pulsedPosition = position * pulse * glow;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pulsedPosition, 1.0);',
      '}'
    ].join('\n');
    
    var fragmentShader = [
      'varying vec3 vNormal;',
      'varying vec3 vViewPosition;',
      'uniform vec3 uColor;',
      'void main() {',
      '  vec3 viewDir = normalize(vViewPosition);',
      '  float intensity = pow(0.7 - dot(viewDir, vNormal), 2.0);',
      '  vec3 glow = uColor * intensity * 2.0;',
      '  gl_FragColor = vec4(glow, intensity * 0.9);',
      '}'
    ].join('\n');
    
    var nodeColors = [0x4db8a8, 0xe8873a, 0x0066ff, 0xffee58];
    var nodeNames = ['energy', 'tasks', 'env', 'creation'];
    
    // Use InstancedMesh for performance (4 instances of same sphere)
    var geometry = new THREE.SphereGeometry(0.3, 32, 32);
    var material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(0x4db8a8) },
        uSpoonLevel: { value: 1.0 },
        uSpoonDeficitExponent: { value: 1.0 },
        uTime: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, 4);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    var dummy = new THREE.Object3D();
    vertices.forEach(function(pos, i) {
      dummy.position.copy(pos);
      dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, dummy.matrix);
      // Store instance data for shader uniform updates
      this.instancedMesh.setColorAt(i, new THREE.Color(nodeColors[i]));
    }, this);
    
    this.scene.add(this.instancedMesh);
    
    // Store node name mapping for click interaction
    this.nodeNames = nodeNames;
  }
  
  createEdges() {
    var edgeIndices = [[0,1], [0,2], [0,3], [1,2], [1,3], [2,3]];
    
    var self = this;
    edgeIndices.forEach(function(idx) {
      var points = [self.nodePositions[idx[0]], self.nodePositions[idx[1]]];
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      var material = new THREE.LineBasicMaterial({
        color: 0x4db8a8,
        transparent: true,
        opacity: 0.6
      });
      
      var line = new THREE.Line(geometry, material);
      self.scene.add(line);
      self.edgeLines.push(line);
    });
  }
  
  createParticles() {
    var particleCount = 500;
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(particleCount * 3);
    var colors = new Float32Array(particleCount * 3);
    
    for (var i = 0; i < particleCount; i++) {
      var i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 10;
      positions[i3 + 1] = (Math.random() - 0.5) * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;
      
      var element = Math.floor(Math.random() * 5);
      switch(element) {
        case 0: colors[i3] = 0; colors[i3+1] = 1; colors[i3+2] = 1; break;
        case 1: colors[i3] = 0.16; colors[i3+1] = 0.16; colors[i3+2] = 0.16; break;
        case 2: colors[i3] = 0; colors[i3+1] = 0; colors[i3+2] = 1; break;
        case 3: colors[i3] = 1; colors[i3+1] = 0; colors[i3+2] = 0; break;
        case 4: colors[i3] = 1; colors[i3+1] = 0.93; colors[i3+2] = 0.34; break;
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    var material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }
  
  onMouseMove(event) {
    var rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  onClick(event) {
    var nodeNames = ['energy', 'tasks', 'env', 'creation'];
    var vertices = this.nodePositions;
    
    // Simple distance-based picking (project 3D to 2D)
    var vector = new THREE.Vector3();
    vector.set(this.mouse.x, this.mouse.y, 0.5);
    vector.unproject(this.camera);
    
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse, this.camera);
    
    var intersects = raycaster.intersectObject(this.instancedMesh);
    if (intersects.length > 0) {
      var instanceId = intersects[0].instanceId;
      if (instanceId < nodeNames.length) {
        var nodeName = nodeNames[instanceId];
        if (window.k4Mesh && window.k4Mesh.zoomTo) {
          window.k4Mesh.zoomTo(nodeName);
        }
      }
    }
  }
  
  onResize() {
    var width = this.container.clientWidth;
    var height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  animate() {
    var self = this;
    requestAnimationFrame(function() { self.animate(); });
    
    var time = this.clock.getElapsedTime();
    var qEngine = window.k4Mesh && window.k4Mesh.qEngine;
    if (!qEngine) return;
    
    var qFactor = qEngine.computeQFactor();
    
    // Update instanced mesh shader uniforms
    var pods = ['energy', 'tasks', 'env', 'creation'];
    var avgSpoonLevel = pods.reduce(function(sum, pod, i) {
      return sum + (qEngine.pods[pod] ? qEngine.pods[pod].value : 1.0);
    }, 0) / 4;
    
    this.instancedMesh.material.uniforms.uSpoonLevel.value = avgSpoonLevel;
    this.instancedMesh.material.uniforms.uSpoonDeficitExponent.value = 1.0 - avgSpoonLevel;
    this.instancedMesh.material.uniforms.uTime.value = time;
    this.instancedMesh.rotation.y = time * 0.05;
    
    // Update edges based on Q factor
    this.edgeLines.forEach(function(line) {
      var opacity = 0.3 + 0.7 * qFactor;
      line.material.opacity = opacity;
      line.material.color.setHSL(0.45, 0.7, 0.4 + 0.3 * qFactor);
    });
    
    // Update particles (hide during low-spoon/frame-saving mode)
    if (this.particles) {
      if (qFactor > 0.4 && avgSpoonLevel > 0.4) {
        this.particles.rotation.y = time * 0.03;
        this.particles.material.opacity = 0.2 + 0.5 * qFactor;
      } else {
        this.particles.material.opacity = 0;
      }
    }
    
    // Quantum decoherence camera effect when Q is critical
    if (qFactor < 0.4) {
      this.camera.position.x = 8 * Math.sin(time * 0.15) * (1 - qFactor);
    } else {
      this.camera.position.x += (0 - this.camera.position.x) * 0.02;
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

function loadThreeJS() {
  if (typeof THREE !== 'undefined') {
    window.k4Renderer = new K4TetrahedronRenderer('canvas-container');
  } else {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = function() {
      window.k4Renderer = new K4TetrahedronRenderer('canvas-container');
    };
    document.head.appendChild(script);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadThreeJS);
} else {
  loadThreeJS();
}
  `;
}
