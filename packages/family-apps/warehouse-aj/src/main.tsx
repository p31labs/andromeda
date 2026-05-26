import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { getWarehouseDB } from './utils/pglite-warehouse.ts'
import { createSyncBridge } from './sdk/sync-bridge.ts'

function WarehouseApp(): JSX.Element {
  useEffect(() => {
    getWarehouseDB().then(async (db) => {
      console.log('[Warehouse] PGLite ready, initializing SBT sync...')
      
      const bridge = await createSyncBridge(
        db,
        'aj_live',          // userId
        'warehouse-aj',    // appId
        ['warehouse_manager'] // roles
      )
      
      bridge.start()
      console.log('[Warehouse] Sync bridge active — AJ is connected to the mesh')
    }).catch(err => {
      console.error('[Warehouse] Failed to initialize sync:', err)
    })
  }, [])

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WarehouseApp />
  </React.StrictMode>,
)
