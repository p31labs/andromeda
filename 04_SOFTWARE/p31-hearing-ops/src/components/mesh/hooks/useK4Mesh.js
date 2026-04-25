export function useK4Mesh(baseVertices, isSafeMode) {
  const levels = isSafeMode ? 1 : 4
  const nodes = useMemo(() => {
    if (levels <= 1) return []
    return generateSierpinskiNodes(baseVertices, levels)
  }, [baseVertices, levels])
  return { nodes, levels }
}

function useMemo(factory, deps) {
  const [value] = useState(() => factory())
  return value
}

function useState(initial) {
  return [initial, () => {}]
}

function generateSierpinskiNodes(vertices, maxLevel) {
  const allNodes = []
  const edgeCache = new Map()
  function getMidpoint(v1, v2) {
    const key = [v1, v2].sort().join('-')
    if (edgeCache.has(key)) return edgeCache.get(key)
    const mid = [
      (vertices[v1][0] + vertices[v2][0]) / 2,
      (vertices[v1][1] + vertices[v2][1]) / 2,
      (vertices[v1][2] + vertices[v2][2]) / 2
    ]
    edgeCache.set(key, mid)
    return mid
  }
  function subdivide(v1, v2, v3, v4, level, scale) {
    if (level >= maxLevel) return
    const mid12 = getMidpoint(v1, v2)
    const mid13 = getMidpoint(v1, v3)
    const mid14 = getMidpoint(v1, v4)
    const mid23 = getMidpoint(v2, v3)
    const mid24 = getMidpoint(v2, v4)
    const mid34 = getMidpoint(v3, v4)
    const newScale = scale * 0.5
    const subTets = [
      [v1, mid12, mid13, mid14],
      [mid12, v2, mid23, mid24],
      [mid13, mid23, v3, mid34],
      [mid14, mid24, mid34, v4]
    ]
    subTets.forEach((tet) => {
      const center = [
        (vertices[tet[0]][0] + vertices[tet[1]][0] + vertices[tet[2]][0] + vertices[tet[3]][0]) / 4,
        (vertices[tet[0]][1] + vertices[tet[1]][1] + vertices[tet[2]][1] + vertices[tet[3]][1]) / 4,
        (vertices[tet[0]][2] + vertices[tet[1]][2] + vertices[tet[2]][2] + vertices[tet[3]][2]) / 4
      ]
      allNodes.push({ position: center, scale: newScale * (0.8 + Math.random() * 0.2), level: level + 1, radius: 0.05 * newScale })
      if (level + 2 < maxLevel && allNodes.length < 200) {
        subdivide(tet[0], tet[1], tet[2], tet[3], level + 1, newScale)
      }
    })
  }
  subdivide(0, 1, 2, 3, 1, 1.0)
  return allNodes
}
