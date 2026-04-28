/**
 * Solo geodesic build snapshot — mirrors `public/geodesic.html` export/import (`exportGeodesicSnapshot` / `applyGeodesicSnapshotPayload`).
 * Verifier: p31ca `npm run verify:geodesic-build-snapshot`.
 */

export const GEODESIC_BUILD_SNAPSHOT_SCHEMA = 'p31.geodesicBuildSnapshot/1.0.0' as const;

/** Must match GEODESIC_BUILD_SHAPE_CAP in public/geodesic.html and SHAPE_CAP alignment with geodesic-room. */
export const GEODESIC_BUILD_SHAPE_CAP = 50 as const;
