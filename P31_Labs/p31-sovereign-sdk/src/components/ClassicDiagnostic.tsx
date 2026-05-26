import { useSovereignStore } from '../store/useSovereignStore';

const roomDescriptions: Record<string, string> = {
  OBSERVATORY: "Quantum Core Monitoring & Diagnostics",
  COLLIDER: "Data Fragmentation & Conflict Resolution",
  BONDING: "Peer-to-Peer Identity Handshakes",
  BRIDGE: "LoRa Mesh & WebBLE Uplink",
  BUFFER: "Sensory Deprivation & Safe Mode"
};

export const ClassicDiagnosticUI = () => {
  const {
    didKey, ucanStatus, crdtVersion, telemetryHashes, bleStatus, loraNodes, pwaStatus, audioEnabled,
    activeRoom, isRoomTransitioning, initIdentity, connectBLE, appendTelemetry, initAudio, exportLedger
  } = useSovereignStore();

  return (
    <div className={`absolute inset-0 z-10 bg-[#050a05] text-[#39FF14] font-mono p-4 md:p-8 overflow-y-auto pt-14 pb-8 mt-10 transition-opacity duration-500 ${isRoomTransitioning ? 'opacity-30' : 'opacity-100'}`}>
      <div className="max-w-7xl mx-auto">
        <header className="border-b-2 border-[#39FF14] pb-3 mb-6">
          <h1 className="text-2xl md:text-4xl font-bold tracking-wider">P31 DIAGNOSTIC</h1>
          <p className="text-xs opacity-80 mt-1">v2026.03.05 | Sovereign Stack SDK Native Client | <span className={isRoomTransitioning ? 'animate-pulse text-red-500' : ''}>[{activeRoom}]</span> <span className="text-gray-400">{roomDescriptions[activeRoom]}</span></p>
        </header>

        {/* L0: Host Environment */}
        <div className="mb-6 border border-[#005500] bg-[#001100] p-3 rounded flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
             <span className="font-bold text-sm">L0: HOST ENVIRONMENT</span>
             <p className="text-[10px] text-gray-400 mt-0.5">Zero-build PWA & Web Audio Synesthesia Engine</p>
          </div>
          <div className="flex gap-3">
            <button onClick={initAudio} disabled={audioEnabled} className="px-3 py-1.5 bg-transparent border border-[#39FF14] text-xs font-bold hover:bg-[#39FF14] hover:text-black disabled:opacity-50 disabled:bg-[#39FF14]/20 disabled:text-[#39FF14]">
               {audioEnabled ? 'AUDIO: ACTIVE' : 'ENABLE AUDIO SYNESTHESIA'}
            </button>
            <div className="px-3 py-1.5 bg-black/50 border border-[#003300] rounded text-xs flex items-center">
              <span className="opacity-60 text-gray-400 mr-2">PWA CACHE:</span>
              <span className={pwaStatus.includes('ACTIVE') ? 'text-[#39FF14] font-bold' : 'text-yellow-500'}>{pwaStatus}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <div className="border border-[#005500] bg-[#001100] p-5 rounded flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold mb-3 border-b border-[#005500] pb-2 text-white">L3: IDENTITY & AUTH</h2>
              <div className="space-y-3 text-sm mb-6">
                <div><span className="opacity-60 text-gray-400">ROOT:</span> SE050 SECURE ELEMENT</div>
                <div><span className="opacity-60 text-gray-400">UCAN:</span> <span className={didKey !== 'UNINITIALIZED' ? 'text-[#39FF14] ml-2 font-bold' : 'text-red-500 ml-2'}>{ucanStatus}</span></div>
                <div className="break-all bg-black/50 p-2 rounded border border-[#003300]">
                  <span className="opacity-60 block mb-1 text-gray-400 text-xs">ACTIVE DID:KEY:</span>
                  <span className={`text-xs ${didKey !== 'UNINITIALIZED' ? 'text-[#39FF14]' : 'text-gray-500'}`}>{didKey}</span>
                </div>
              </div>
            </div>
            <button disabled={isRoomTransitioning} onClick={initIdentity} className="w-full py-2.5 bg-[#002200] border border-[#39FF14] text-[#39FF14] font-bold hover:bg-[#39FF14] hover:text-black transition-colors disabled:opacity-50">
              EXECUTE: INIT IDENTITY
            </button>
          </div>

          <div className="border border-[#005500] bg-[#001100] p-5 rounded flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold mb-3 border-b border-[#005500] pb-2 text-white">L2: NETWORK & MESH</h2>
              <div className="space-y-3 text-sm mb-6">
                <div className="bg-black/50 p-2 rounded border border-[#003300]">
                  <span className="opacity-60 text-gray-400 block mb-1 text-xs">WebBLE GATT:</span>
                  <span className={bleStatus.includes('CONNECTED') ? 'text-[#39FF14] font-bold' : 'text-yellow-500'}>{bleStatus}</span>
                </div>
                <div className="bg-black/50 p-2 rounded border border-[#003300]">
                  <span className="opacity-60 text-gray-400 block mb-1 text-xs">LoRa MESH:</span>
                  <span className={bleStatus.includes('CONNECTED') ? 'text-[#39FF14] font-bold' : 'text-gray-500'}>
                    {bleStatus.includes('CONNECTED') ? `ACTIVE (${loraNodes} PEERS)` : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
            <button disabled={isRoomTransitioning} onClick={connectBLE} className="w-full py-2.5 bg-[#002200] border border-[#39FF14] text-[#39FF14] font-bold hover:bg-[#39FF14] hover:text-black transition-colors disabled:opacity-50">
              EXECUTE: BRIDGE WEBBLE
            </button>
          </div>

          <div className="border border-[#005500] bg-[#001100] p-5 rounded flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold mb-3 border-b border-[#005500] pb-2 text-white">L1: CRDT DATABASE</h2>
              <div className="space-y-3 text-sm mb-6">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="opacity-60 text-gray-400">ENGINE:</span> AUTOMERGE</div>
                  <div><span className="opacity-60 text-gray-400">STORAGE:</span> INDEXED-DB</div>
                </div>
                <div className="text-lg font-bold border-l-4 border-[#39FF14] pl-3 py-1 bg-black/30">
                  <span className="opacity-60 text-gray-400 text-sm font-normal">DOC VERSION:</span> v{crdtVersion}
                </div>
                <div className="bg-black/50 p-2 rounded border border-[#003300] min-h-[100px]">
                  <span className="opacity-60 block mb-1 text-gray-400 text-xs">TELEMETRY HASH CHAIN:</span>
                  {telemetryHashes.length === 0 ? (
                    <span className="text-gray-600 italic text-xs">[ NO DATA ]</span>
                  ) : (
                    <ul className="space-y-0.5 font-mono text-xs">
                      {telemetryHashes.map((hash: string, i: number) => (
                        <li key={i} style={{ opacity: 1 - (i * 0.15) }} className="text-[#39FF14]">{`-> ${hash}...`}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
                <button disabled={isRoomTransitioning} onClick={appendTelemetry} className="w-full py-2.5 bg-[#002200] border border-[#39FF14] text-[#39FF14] font-bold hover:bg-[#39FF14] hover:text-black transition-colors disabled:opacity-50">
                EXECUTE: APPEND HASH
                </button>
                <button disabled={isRoomTransitioning || telemetryHashes.length === 0} onClick={exportLedger} className="w-full py-2 bg-transparent border border-[#39FF14]/50 text-[#39FF14]/70 text-xs font-bold hover:bg-[#39FF14] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                EXPORT LEDGER (.JSON)
                </button>
            </div>
          </div>

        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 z-20 mix-blend-screen opacity-50" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))', backgroundSize: '100% 4px, 6px 100%' }}></div>
    </div>
  );
};
