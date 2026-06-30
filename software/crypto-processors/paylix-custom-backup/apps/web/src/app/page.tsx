export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="border border-cyan-500/30 rounded-lg p-6 bg-cyan-950/10">
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">Paylix</h1>
          <p className="text-gray-400 font-mono text-sm">
            Multi-chain EVM payment processor — P31 Labs enterprise stack
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-violet-500/30 rounded-lg p-4 bg-violet-950/10">
            <h2 className="text-lg text-violet-400 mb-2">Status</h2>
            <p className="text-2xl font-bold text-green-400">Operational</p>
          </div>
          <div className="border border-amber-500/30 rounded-lg p-4 bg-amber-950/10">
            <h2 className="text-lg text-amber-400 mb-2">Chains</h2>
            <p className="text-2xl font-bold">7</p>
          </div>
        </div>

        <div className="border border-white/10 rounded-lg p-4 space-y-2">
          <h3 className="text-sm text-gray-500 uppercase tracking-wider">API Endpoints</h3>
          <div className="font-mono text-xs space-y-1">
            <p><span className="text-green-400">POST</span> /v1/checkout/session</p>
            <p><span className="text-green-400">POST</span> /v1/webhook</p>
            <p><span className="text-blue-400">GET</span> /api/health</p>
          </div>
        </div>

        <div className="border border-white/10 rounded-lg p-4">
          <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Supported Tokens</h3>
          <p className="text-xs text-gray-400">USDC, USDT on Polygon, Arbitrum, Optimism, Base, Fantom testnets</p>
        </div>
      </div>
    </main>
  );
}
