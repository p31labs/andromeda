export type TetraClass =

  if (d.schema !== TETRA_SCHEMA) return false;
  if (typeof d.id !== 'string') return false;
  if (typeof d.metadata !== 'object') return false;

  const meta = d.metadata as Record<string, unknown>;
  if (typeof meta.scale !== 'string') return false;
  if (typeof meta.class !== 'string') return false;

  const vertices = d.vertices as Array<unknown> | undefined;
  if (!Array.isArray(vertices) || vertices.length !== 4) return false;

  const edges = d.edges as Array<unknown> | undefined;
  if (!Array.isArray(edges) || edges.length !== 6) return false;


      { id: 'v1', label: 'Connections', val: activeConnections / 1000, color: 'var(--color-phosphor)' },


