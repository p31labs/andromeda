import { useState, useEffect } from 'react';
import { P31Welcome } from './components/P31Welcome';
import { VoiceBugReporter } from './components/VoiceBugReporter';
import { K4Tetrahedron } from './components/K4Tetrahedron';
import {
  Network,
  Users,
  Activity,
  Zap,
  Shield,
  RefreshCw,
  Server,
  Radio,
  CheckCircle,
  AlertCircle,
  Box,
  Tablet,
  Laptop,
  Cpu,
  Wifi,
  Eye,
} from 'lucide-react';

type NodeStatus = 'online' | 'offline' | 'syncing';

type FleetNode = {
  id: string;
  name: string;
  status: NodeStatus;
  latency: number;
  lastSeen: string;
  type: 'family' | 'infrastructure' | 'hardware';
  icon: 'tablet' | 'laptop' | 'cpu' | 'server';
  hardware?: string;
};

const fleetNodes: FleetNode[] = [
  { id: 'will', name: 'Will', status: 'online', latency: 12, lastSeen: 'now', type: 'family', icon: 'laptop' },
  { id: 'sj', name: 'S.J.', status: 'online', latency: 18, lastSeen: 'now', type: 'family', icon: 'tablet', hardware: 'Android tablet' },
  { id: 'wj', name: 'W.J.', status: 'online', latency: 15, lastSeen: 'now', type: 'family', icon: 'tablet', hardware: 'Android tablet' },
  { id: 'node-zero', name: 'Node Zero', status: 'online', latency: 8, lastSeen: 'now', type: 'hardware', icon: 'cpu', hardware: 'ESP32-S3-Touch-LCD-3.5B' },
  { id: 'orchestrator', name: 'orchestrator', status: 'online', latency: 8, lastSeen: 'now', type: 'infrastructure', icon: 'server' },
  { id: 'geodesic', name: 'geodesic-room', status: 'online', latency: 14, lastSeen: 'now', type: 'infrastructure', icon: 'server' },
  { id: 'k4-personal', name: 'k4-personal', status: 'syncing', latency: 45, lastSeen: '2s ago', type: 'infrastructure', icon: 'server' },
  { id: 'passkey', name: 'passkey', status: 'online', latency: 6, lastSeen: 'now', type: 'infrastructure', icon: 'server' },
];

type RelayStatus = 'active' | 'degraded' | 'offline';

type Relay = {
  id: string;
  name: string;
  endpoint: string;
  status: RelayStatus;
  pings: number;
  lastPing: string;
};

const relays: Relay[] = [
  { id: 'bonding-relay', name: 'BONDING Relay', endpoint: 'bonding-relay.trimtab-signal.workers.dev', status: 'active', pings: 1247, lastPing: '1s ago' },
  { id: 'cf-kv', name: 'CF KV Store', endpoint: ' KV namespace', status: 'active', pings: 892, lastPing: 'now' },
  { id: 'stripe', name: 'Stripe Bridge', endpoint: 'api.phosphorus31.org', status: 'active', pings: 341, lastPing: '3s ago' },
];

const statusIcons = {
  online: CheckCircle,
  offline: AlertCircle,
  syncing: RefreshCw,
};

const statusColors = {
  online: 'text-p31-teal',
  offline: 'text-p31-red',
  syncing: 'text-p31-gold',
};

const nodeIcons = {
  tablet: Tablet,
  laptop: Laptop,
  cpu: Cpu,
  server: Server,
};

const relayColors: Record<RelayStatus, string> = {
  active: 'text-p31-teal',
  degraded: 'text-p31-gold',
  offline: 'text-p31-red',
};

type TabId = 'topology' | 'fleet' | 'relay';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [nodes, setNodes] = useState(fleetNodes);
  const [selectedK4Node, setSelectedK4Node] = useState<string | null>(null);
  const [selectedFleetNode, setSelectedFleetNode] = useState<FleetNode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('topology');
  const [relayData, setRelayData] = useState(relays);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const refreshMesh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNodes(prev => prev.map(n => ({
        ...n,
        latency: Math.floor(Math.random() * 50) + 5,
      })));
      setRelayData(prev => prev.map(r => ({
        ...r,
        pings: r.pings + Math.floor(Math.random() * 10),
        lastPing: 'now',
      })));
      setIsRefreshing(false);
    }, 1000);
  };

  const onlineCount = nodes.filter(n => n.status === 'online').length;
  const avgLatency = Math.round(nodes.reduce((acc, n) => acc + n.latency, 0) / nodes.length);
  const activeRelays = relayData.filter(r => r.status === 'active').length;

  const matchedK4Node = selectedK4Node ? nodes.find(n => n.id === selectedK4Node || (selectedK4Node === 'infra' && n.type === 'infrastructure')) : null;

  const selectedNode = matchedK4Node || selectedFleetNode;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'topology', label: 'K4 Topology', icon: <Network className="w-4 h-4" /> },
    { id: 'fleet', label: 'Fleet Monitor', icon: <Users className="w-4 h-4" /> },
    { id: 'relay', label: 'Signal Relay', icon: <Wifi className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-[#e8e8e8]">
      {showWelcome && <P31Welcome onComplete={() => setShowWelcome(false)} />}

      <header className="glass border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-p31-cyan to-p31-teal flex items-center justify-center">
              <Box className="w-5 h-5 text-[#0a0b0d]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">P31 MESH</h1>
              <p className="text-xs text-white/50">Network Topology &amp; Node Fleet Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <VoiceBugReporter />
            <button
              onClick={refreshMesh}
              disabled={isRefreshing}
              className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-p31-teal/10 border border-p31-teal/20">
              <Radio className="w-3 h-3 text-p31-teal animate-pulse" />
              <span className="text-xs text-p31-teal">Live</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-p31-teal border-p31-teal bg-white/[0.03]'
                    : 'text-white/50 border-transparent hover:text-white/80 hover:bg-white/[0.02]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Nodes</span>
              <Server className="w-4 h-4 text-p31-cyan" />
            </div>
            <div className="text-2xl font-bold text-white">{nodes.length}</div>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Online</span>
              <Activity className="w-4 h-4 text-p31-teal" />
            </div>
            <div className="text-2xl font-bold text-p31-teal">{onlineCount}</div>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Avg Latency</span>
              <Zap className="w-4 h-4 text-p31-gold" />
            </div>
            <div className="text-2xl font-bold text-white">{avgLatency}ms</div>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Relays Active</span>
              <Wifi className="w-4 h-4 text-p31-purple" />
            </div>
            <div className="text-2xl font-bold text-p31-purple">{activeRelays}/{relayData.length}</div>
          </div>
        </div>

        {activeTab === 'topology' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Network className="w-5 h-5 text-p31-cyan" />
                K4 Tetrahedron — 3D Topology
              </h2>

              <K4Tetrahedron
                selectedNode={selectedK4Node}
                onSelectNode={(id) => setSelectedK4Node(prev => prev === id ? null : id)}
              />

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-white/40">
                  K4: 4 vertices, 6 edges, fully connected mesh
                </p>
                <div className="flex items-center gap-4 text-xs text-white/30">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#5DCAA5]" /> Will</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00d4ff]" /> S.J.</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a78bfa]" /> W.J.</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fbbf24]" /> Infra</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-p31-teal" />
                K4 Vertices
              </h2>

              <div className="space-y-2">
                {[
                  { id: 'will', label: 'Will', desc: 'Primary operator', color: '#5DCAA5' },
                  { id: 'sj', label: 'S.J.', desc: 'Family node · Android tablet', color: '#00d4ff' },
                  { id: 'wj', label: 'W.J.', desc: 'Family node · Android tablet', color: '#a78bfa' },
                  { id: 'infra', label: 'Infrastructure', desc: 'orchestrator · geodesic · KV', color: '#fbbf24' },
                ].map(vertex => {
                  const matched = vertex.id === 'infra'
                    ? nodes.filter(n => n.type === 'infrastructure')
                    : nodes.filter(n => n.id === vertex.id);
                  const allOnline = matched.every(n => n.status === 'online');

                  return (
                    <div
                      key={vertex.id}
                      onClick={() => setSelectedK4Node(prev => prev === vertex.id ? null : vertex.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedK4Node === vertex.id
                          ? 'bg-white/10 border-p31-teal/30'
                          : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vertex.color }} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            {vertex.label}
                            {allOnline ? (
                              <CheckCircle className="w-3 h-3 text-p31-teal" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-p31-gold" />
                            )}
                          </div>
                          <div className="text-xs text-white/40">{vertex.desc}</div>
                        </div>
                        <div className="text-xs text-white/30">{matched.length} node{matched.length > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedK4Node && (
                <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-xs text-white/40 mb-1">Click a vertex for details →</div>
                  <div className="text-sm text-white/70">
                    {selectedK4Node === 'infra' ? 'All infrastructure nodes' : `Node: ${selectedK4Node}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-p31-cyan" />
                Fleet Overview
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nodes.map((node) => {
                  const StatusIcon = statusIcons[node.status];
                  const NodeIcon = nodeIcons[node.icon];
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedFleetNode(prev => prev?.id === node.id ? null : node)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedFleetNode?.id === node.id
                          ? 'bg-white/10 border-p31-teal/30'
                          : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <NodeIcon className="w-4 h-4 text-white/60" />
                          <span className="text-sm font-medium text-white">{node.name}</span>
                        </div>
                        <StatusIcon className={`w-4 h-4 ${statusColors[node.status]} ${node.status === 'syncing' ? 'animate-spin' : ''}`} />
                      </div>
                      {node.hardware && (
                        <div className="text-xs text-white/30 mb-1">{node.hardware}</div>
                      )}
                      <div className="flex items-center justify-between text-xs text-white/40">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-white/5">{node.type}</span>
                        <span>{node.latency}ms · {node.lastSeen}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-p31-purple" />
                Node Detail
              </h2>

              {selectedFleetNode ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-p31-teal/20 flex items-center justify-center">
                        {(() => { const I = nodeIcons[selectedFleetNode.icon]; return <I className="w-5 h-5 text-p31-teal" />; })()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{selectedFleetNode.name}</div>
                        <div className="text-xs text-white/40">{selectedFleetNode.hardware || selectedFleetNode.type}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-white/40 mb-1">Status</div>
                        <div className={`text-sm font-medium capitalize ${statusColors[selectedFleetNode.status]}`}>
                          {selectedFleetNode.status}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Latency</div>
                        <div className="text-sm font-medium text-white">{selectedFleetNode.latency}ms</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Last Seen</div>
                        <div className="text-sm font-medium text-white">{selectedFleetNode.lastSeen}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Health</div>
                        <div className="text-sm font-medium text-p31-teal">100%</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFleetNode(null)}
                    className="w-full text-center text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    Clear selection
                  </button>
                </div>
              ) : (
                <div className="text-center text-white/30 py-8">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select a node to view details</p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="text-xs text-white/30 mb-2">Legend</div>
                <div className="space-y-1 text-xs text-white/50">
                  <div className="flex items-center gap-2"><Tablet className="w-3 h-3" /> Family tablet</div>
                  <div className="flex items-center gap-2"><Laptop className="w-3 h-3" /> Laptop / workstation</div>
                  <div className="flex items-center gap-2"><Cpu className="w-3 h-3" /> Hardware node</div>
                  <div className="flex items-center gap-2"><Server className="w-3 h-3" /> Infrastructure</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'relay' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-p31-purple" />
                Signal Relay Status
              </h2>

              <div className="space-y-3">
                {relayData.map(relay => (
                  <div key={relay.id} className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Radio className={`w-4 h-4 ${relayColors[relay.status]} ${relay.status === 'active' ? 'animate-pulse' : ''}`} />
                        <span className="text-sm font-medium text-white">{relay.name}</span>
                      </div>
                      <span className={`text-xs capitalize px-2 py-0.5 rounded-full border ${
                        relay.status === 'active' ? 'bg-p31-teal/10 border-p31-teal/30 text-p31-teal' :
                        relay.status === 'degraded' ? 'bg-p31-gold/10 border-p31-gold/30 text-p31-gold' :
                        'bg-p31-red/10 border-p31-red/30 text-p31-red'
                      }`}>
                        {relay.status}
                      </span>
                    </div>
                    <div className="text-xs text-white/30 font-mono mb-1">{relay.endpoint}</div>
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>{relay.pings.toLocaleString()} pings</span>
                      <span>{relay.lastPing}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-p31-cyan" />
                Relay Metrics
              </h2>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-xs text-white/40 mb-1">Total Relays</div>
                  <div className="text-2xl font-bold text-white">{relayData.length}</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-xs text-white/40 mb-1">Active / Degraded / Offline</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-p31-teal font-bold">{relayData.filter(r => r.status === 'active').length}</span>
                    <span className="text-white/20">/</span>
                    <span className="text-p31-gold font-bold">{relayData.filter(r => r.status === 'degraded').length}</span>
                    <span className="text-white/20">/</span>
                    <span className="text-p31-red font-bold">{relayData.filter(r => r.status === 'offline').length}</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-xs text-white/40 mb-1">Total Pings</div>
                  <div className="text-2xl font-bold text-white">
                    {relayData.reduce((acc, r) => acc + r.pings, 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-xs text-white/40 mb-1">Uptime</div>
                  <div className="text-2xl font-bold text-p31-teal">99.7%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedNode && activeTab === 'topology' && (
          <div className="mt-6 glass rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-p31-teal/20 flex items-center justify-center">
                  <Server className="w-6 h-6 text-p31-teal" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedNode.name}</h3>
                  <p className="text-sm text-white/60">
                    ID: {selectedNode.id} • Type: {selectedNode.type}
                    {selectedNode.hardware && ` • ${selectedNode.hardware}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedFleetNode(null); setSelectedK4Node(null); }}
                className="text-white/40 hover:text-white/80"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
              <div>
                <div className="text-xs text-white/40 mb-1">Status</div>
                <div className={`font-medium capitalize ${statusColors[selectedNode.status]}`}>
                  {selectedNode.status}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Latency</div>
                <div className="font-medium text-white">{selectedNode.latency}ms</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Last Seen</div>
                <div className="font-medium text-white">{selectedNode.lastSeen}</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Health</div>
                <div className="font-medium text-p31-teal">100%</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-white/20">
          <span>P31 MESH Shell v1.0 — K4 Delta Topology</span>
          <span>Larmor frequency: 863 Hz</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
