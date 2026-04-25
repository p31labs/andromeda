import * as THREE from 'three'
const PARTICLE_COLORS = { H: 0x00ffff, C: 0x404040, N: 0x0066ff, O: 0xff4444, P: 0xffff88 }
const PARTICLE_TYPES = ['H', 'C', 'N', 'O', 'P']
export function useK4Particles(particlesRef, qFactor, isSafeMode, isHighCoherence) {
  useEffect(() => {
    if (!particlesRef.current) createParticleSystem(particlesRef, qFactor, isSafeMode, isHighCoherence)
  }, [])
  useEffect(() => {
    if (particlesRef.current) updateParticleSystem(particlesRef.current, qFactor, isSafeMode, isHighCoherence)
  }, [qFactor, isSafeMode, isHighCoherence])
}
function useEffect(fn, deps) {}
function createParticleSystem(particlesRef, qFactor, isSafeMode, isHighCoherence) {
  const count = isSafeMode ? 50 : 200
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  const speeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const radius = 2 + Math.random() * 3
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)
    const colorType = PARTICLE_TYPES[Math.floor(Math.random() * PARTICLE_TYPES.length)]
    const color = new THREE.Color(PARTICLE_COLORS[colorType])
    colors[i3] = color.r; colors[i3 + 1] = color.g; colors[i3 + 2] = color.b
    sizes[i] = (0.5 + Math.random() * 1.5) * qFactor * (isHighCoherence ? 1.5 : 1)
    phases[i] = Math.random() * Math.PI * 2
    speeds[i] = 0.5 + Math.random() * 1.5
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
  geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uQFactor: { value: qFactor }, uOpacity: { value: isSafeMode ? 0.3 : 0.8 } },
    vertexShader: `
      attribute float size; attribute float phase; attribute float speed; varying vec3 vColor;
      uniform float uTime; uniform float uQFactor;
      void main() {
        vColor = color;
        vec3 pos = position;
        float orbit = uTime * speed * 0.5 + phase;
        float radius = 2.5 + uQFactor * 0.5;
        pos.x = radius * sin(orbit) * cos(orbit * 0.7);
        pos.y = radius * sin(orbit * 0.5) * 0.5;
        pos.z = radius * cos(orbit) * sin(orbit * 0.7);
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z) * uQFactor;
        gl_Position = projectionMatrix * mvPosition;
      }`,
    fragmentShader: `
      varying vec3 vColor; uniform float uOpacity;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * uOpacity;
        gl_FragColor = vec4(vColor, alpha);
      }`,
    transparent: true, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false
  })
  particlesRef.current = new THREE.Points(geometry, material)
}
function updateParticleSystem(particles, qFactor, isSafeMode, isHighCoherence) {
  if (!particles.material) return
  particles.material.uniforms.uQFactor.value = qFactor
  particles.material.uniforms.uOpacity.value = isSafeMode ? 0.3 : 0.8
  const sizes = particles.geometry.attributes.size.array
  for (let i = 0; i < sizes.length; i++) {
    sizes[i] = (0.5 + (i % 10) * 0.1) * qFactor * (isHighCoherence ? 1.5 : 1)
  }
  particles.geometry.attributes.size.needsUpdate = true
}
