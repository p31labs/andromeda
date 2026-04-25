import { useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line2, LineMaterial, LineSegments2, LineGeometry } from 'three-stdlib'
import { useCoherence } from '../CoherenceContext'
import { MeshGlowShader } from './shaders/MeshGlowShader.js'
import { useK4Mesh } from './hooks/useK4Mesh.js'
import { useK4Particles } from './hooks/useK4Particles.js'
import { useK4Controls } from './hooks/useK4Controls.js'
import { AmbientVoltageStrip } from './AmbientVoltageStrip.jsx'
import { SafeModePrompt } from './SafeModePrompt.jsx'
import { ProgressiveDisclosure } from './ProgressiveDisclosure.jsx'
import './K4MeshDashboard.css'

const BACKGROUND_VOID = '#050505'
const BACKGROUND_SURFACE = '#12121A'

function K4Scene() {
  const { spoons, qFactor, computedQ, nodePings, jitter, mode } = useCoherence()
  const groupRef = useRef()
  const lineRefs = useRef([])
  const glowMeshRefs = useRef([])
  const particlesRef = useRef()
  const safeModeRef = useRef(false)

  const isSafeMode = mode === 'safe' || spoons < 3 || computedQ < 0.4
  const isHighCoherence = mode === 'high-coherence'

  useEffect(() => {
    safeModeRef.current = isSafeMode
  }, [isSafeMode])

  const vertices = useMemo(() => [
    [0, 1.5, 0],
    [-1.3, -0.5, 0.8],
    [1.3, -0.5, 0.8],
    [0, -0.5, -1.4]
  ], [])

  const edges = useMemo(() => [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3], [2, 3]
  ], [])

  const { nodes: fractalNodes, levels } = useK4Mesh(vertices, isSafeMode)

  useK4Particles(particlesRef, qFactor, isSafeMode, isHighCoherence)
  useK4Controls(groupRef, isSafeMode)

  const edgeThickness = useMemo(() => Math.max(0.5, qFactor * 0.15), [qFactor])
  const glowAmplitude = useMemo(() => {
    const deficit = Math.max(0, 10 - spoons) / 10
    return 0.3 + deficit * 0.8
  }, [spoons])

  const edgeColor = useMemo(() => {
    const t = Math.max(0, Math.min(1, 1 - computedQ))
    const r = Math.round(6 + t * 249)
    const g = Math.round(214 - t * 100)
    const b = Math.round(212 - t * 50)
    return [r / 255, g / 255, b / 255]
  }, [computedQ])

  const vertexColor = useMemo(() => {
    const t = Math.max(0, Math.min(1, (20 - spoons) / 20))
    return [0.024, 0.784, 0.859, 1.0 - t * 0.3]
  }, [spoons])

  const avgPing = useMemo(() => {
    return nodePings.reduce((a, b) => a + b, 0) / nodePings.length
  }, [nodePings])

  const avgJitter = useMemo(() => {
    return jitter.reduce((a, b) => a + b, 0) / jitter.length
  }, [jitter])

  useFrame((state, delta) => {
    if (isSafeMode) return
    const time = state.clock.getElapsedTime()
    lineRefs.current.forEach((line, i) => {
      if (line && line.material) {
        line.material.linewidth = edgeThickness
        line.material.resolution.set(state.size.width, state.size.height)
        line.material.uniforms.uTime.value = time
        line.material.uniforms.uQFactor.value = computedQ
      }
    })
    glowMeshRefs.current.forEach((mesh, i) => {
      if (mesh && mesh.material) {
        mesh.material.uniforms.uTime.value = time
        mesh.material.uniforms.uSpoonDeficitExponent.value = glowAmplitude
        mesh.material.uniforms.uPingDelta.value = avgPing / 100
        mesh.material.uniforms.uJitter.value = avgJitter / 50
      }
    })
    if (groupRef.current && !isSafeMode) {
      groupRef.current.rotation.y += delta * 0.05 * (isHighCoherence ? 2 : 0.5)
    }
    if (particlesRef.current) {
      const pulse = 1 + Math.sin(time * 2) * 0.05 * (avgPing / 50)
      particlesRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group ref={groupRef}>
      {edges.map(([startIdx, endIdx], i) => {
        const start = vertices[startIdx]
        const end = vertices[endIdx]
        return (
          <Line2
            key={`edge-${i}`}
            ref={(el) => (lineRefs.current[i] = el)}
            scale={1.5}
          >
            <LineGeometry
              attach="geometry"
              positions={[
                start[0], start[1], start[2],
                end[0], end[1], end[2]
              ]}
            />
            <LineMaterial
              attach="material"
              color={edgeColor}
              linewidth={edgeThickness}
              resolution={[1024, 768]}
              dashed={false}
              opacity={0.6 + computedQ * 0.4}
              transparent
            />
          </Line2>
        )
      })}
      {vertices.map((pos, i) => (
        <mesh
          key={`glow-${i}`}
          ref={(el) => (glowMeshRefs.current[i] = el)}
          position={pos}
          scale={[0.3, 0.3, 0.3]}
        >
          <sphereGeometry args={[1, 32, 32]} />
          <shaderMaterial
            attach="material"
            args={[MeshGlowShader]}
            uniforms={{
              uColor: { value: vertexColor },
              uTime: { value: 0 },
              uSpoonDeficitExponent: { value: glowAmplitude },
              uPingDelta: { value: avgPing / 100 },
              uJitter: { value: avgJitter / 50 },
              uViewVector: { value: [0, 0, 1] }
            }}
            transparent
            depthWrite={false}
            blending={2}
            side={2}
          />
        </mesh>
      ))}
      <points ref={particlesRef} />
      {levels > 1 && fractalNodes.map((node, i) => (
        <mesh
          key={`fractal-${i}`}
          position={node.position}
          scale={node.scale}
        >
          <sphereGeometry args={[node.radius, 16, 16]} />
          <meshBasicMaterial
            color={vertexColor}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

export function K4MeshDashboard() {
  const { mode, spoons, computedQ } = useCoherence()
  const isSafeMode = mode === 'safe' || spoons < 3 || computedQ < 0.4
  const isHighCoherence = mode === 'high-coherence'

  return (
    <div className="k4-dashboard">
      <AmbientVoltageStrip />
      <div className="k4-canvas-container">
        <Canvas
          frameloop={isSafeMode ? 'demand' : 'demand'}
          dpr={isHighCoherence ? 2 : Math.min(2, window.devicePixelRatio)}
          gl={{
            powerPreference: 'high-performance',
            antialias: isHighCoherence,
            alpha: true,
            preserveDrawingBuffer: false
          }}
          camera={{
            fov: 50,
            position: [0, 2, 6],
            near: 0.1,
            far: 100
          }}
          style={{
            background: BACKGROUND_VOID,
            position: 'absolute',
            inset: 0,
            zIndex: 0
          }}
        >
          <color attach="background" args={[BACKGROUND_VOID]} />
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[-5, -5, -5]} intensity={0.4} />
          <K4Scene />
        </Canvas>
      </div>
      <ProgressiveDisclosure />
      {isSafeMode && <SafeModePrompt />}
    </div>
  )
}
