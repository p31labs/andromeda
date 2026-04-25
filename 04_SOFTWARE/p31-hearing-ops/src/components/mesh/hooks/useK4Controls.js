import { useEffect } from 'react'
export function useK4Controls(groupRef, isSafeMode) {
  useEffect(() => {
    if (!groupRef.current) return
    const group = groupRef.current
    let userInteracting = false
    let interactionTimeout = null
    const handlePointerDown = () => { userInteracting = true; if (interactionTimeout) clearTimeout(interactionTimeout) }
    const handlePointerUp = () => {
      interactionTimeout = setTimeout(() => { userInteracting = false }, 3000)
    }
    const handleWheel = (e) => {
      if (isSafeMode) return
      e.preventDefault()
      const zoom = group.position.z + e.deltaY * 0.01
      group.position.z = Math.max(3, Math.min(10, zoom))
    }
    const canvas = group.parent?.parent?.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('pointerdown', handlePointerDown)
      canvas.addEventListener('pointerup', handlePointerUp)
      canvas.addEventListener('wheel', handleWheel, { passive: false })
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('pointerdown', handlePointerDown)
        canvas.removeEventListener('pointerup', handlePointerUp)
        canvas.removeEventListener('wheel', handleWheel)
      }
      if (interactionTimeout) clearTimeout(interactionTimeout)
    }
  }, [isSafeMode])
}
