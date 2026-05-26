import React, { useState } from 'react';
import { BookOpen, Heart, Zap, DollarSign, ArrowRight, X, Sparkles, Package } from 'lucide-react';

interface P31WelcomeProps {
  userName?: string;
  onClose: () => void;
}

type Tab = 'story' | 'what' | 'money' | 'next';

export const P31Welcome: React.FC<P31WelcomeProps> = ({ 
  userName = 'there',
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('story');
  const [showMoneyDetails, setShowMoneyDetails] = useState(false);

  const tabs = [
    { id: 'story' as Tab, label: 'The Story', icon: Heart },
    { id: 'what' as Tab, label: 'What This Does', icon: BookOpen },
    { id: 'money' as Tab, label: 'Make Money', icon: DollarSign },
    { id: 'next' as Tab, label: 'Start Now', icon: ArrowRight },
  ];

  const renderStory = () => (
    <div className="space-y-4 text-slate-300">
      <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 p-4 rounded-lg border border-blue-500/30">
        <p className="text-sm italic text-blue-400 mb-2">
          "A warehouse isn't just storage. It's memory made concrete. Every item is a decision you already made."
        </p>
      </div>
      
      <p className="leading-relaxed">
        Hey {userName}. This is <span className="text-blue-400 font-semibold">AJ's Warehouse</span>—
        your family's digital storage room.
      </p>
      
      <p className="leading-relaxed">
        AJ (your son) helped name this one. Because a warehouse isn't boring—it's where the adventure supplies live. 
        Where the bulk buys from Costco become smart strategy. Where you always know what you have before you need it.
      </p>

      <div className="bg-slate-800/50 p-4 rounded-lg my-4">
        <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          The Mesh Is Family
        </h4>
        <p className="text-sm">
          This warehouse talks to your kitchen. When Culinary Matria plans a meal, it checks what's here first. 
          When you buy in bulk, it celebrates the savings. When something's about to expire, it warns you before it's too late.
        </p>
      </div>

      <p className="leading-relaxed text-sm">
        No more buying another bottle of soy sauce when you have three. No more discovering expired pasta 
        in the back of the pantry. No more guessing what's in the freezer.
      </p>

      <p className="leading-relaxed text-sm text-slate-400">
        <span className="text-blue-400">Built with precision</span> by someone who knows that knowing what you have 
        is the first step to using it well.
      </p>
    </div>
  );

  const renderWhat = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📦</span>
          <div>
            <h3 className="text-xl font-bold text-white">AJ's Warehouse</h3>
            <p className="text-sm text-slate-400">Your family's inventory command center</p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm text-slate-300">
          <p><span className="text-blue-400 font-semibold">🧠 What it does:</span> Tracks every item in your storage—pantry, freezer, garage, emergency supplies. Knows quantities. Knows expiration dates.</p>
          <p><span className="text-blue-400 font-semibold">💡 Why it matters:</span> No more duplicates. No more waste. Know exactly what you have when money gets tight.</p>
          <p><span className="text-blue-400 font-semibold">📱 The magic:</span> Scan barcodes with your camera. It auto-fills everything—name, category, expiration. Like magic.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-blue-400 font-semibold mb-1">📱 Works Offline</p>
          <p className="text-slate-400">Scan items in the basement. Sync when you're back up.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-blue-400 font-semibold mb-1">📷 Camera Scanner</p>
          <p className="text-slate-400">Point at barcode. Done. No typing required.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-blue-400 font-semibold mb-1">📦 Syncs with Kitchen</p>
          <p className="text-slate-400">Culinary Matria knows what you have.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-blue-400 font-semibold mb-1">⚠️ Expiration Alerts</p>
          <p className="text-slate-400">Warns you before food goes bad.</p>
        </div>
      </div>

      <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/30">
        <p className="text-xs text-blue-300">
          <strong>Pro tip:</strong> Start by scanning 10 items you buy regularly. 
          That's all you need to see the value.
        </p>
      </div>
    </div>
  );

  const renderMoney = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-4 rounded-lg border border-green-500/30">
        <h3 className="text-green-400 font-bold text-lg mb-2 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          How This Saves You Money
        </h3>
        <p className="text-sm text-slate-300">
          This app pays for itself immediately. Here's how:
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-800/50 p-3 rounded-lg border-l-4 border-green-500">
          <h4 className="text-green-400 font-semibold text-sm">💰 THIS MONTH: Stop Waste</h4>
          <ul className="text-xs text-slate-300 mt-2 space-y-1">
            <li>• Never buy duplicates — saves $20-40/month</li>
            <li>• Use items before expiration — saves $30-60/month</li>
            <li>• Bulk buy with confidence — saves 15-25% on staples</li>
            <li>• Know what you have before shopping — saves impulse buys</li>
          </ul>
          <p className="text-xs text-green-400 mt-2 font-semibold">
            Estimated monthly savings: $50-100
          </p>
        </div>

        <button
          onClick={() => setShowMoneyDetails(!showMoneyDetails)}
          className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded text-sm text-blue-400 font-semibold transition-colors"
        >
          {showMoneyDetails ? 'Hide Future Money' : 'Show Future Money →'}
        </button>

        {showMoneyDetails && (
          <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 p-4 rounded-lg border border-purple-500/30 animate-fade-in">
            <h4 className="text-purple-400 font-semibold text-sm mb-2">🚀 THE FUTURE: Build Income</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-400">📊</span>
                <span>
                  <strong className="text-purple-300">Supply Chain Data:</strong> Your inventory patterns train AI that helps other families optimize. You earn tokens for contributing (privacy preserved).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">🛒</span>
                <span>
                  <strong className="text-purple-300">Group Buying:</strong> When enough families need the same bulk item, coordinated purchasing unlocks wholesale prices.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">🏛️</span>
                <span>
                  <strong className="text-purple-300">Food Security Grants:</strong> Running inventory infrastructure qualifies for resilience grants.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">💎</span>
                <span>
                  <strong className="text-purple-300">Early User Tokens:</strong> As the P31 network grows, early users get governance tokens.
                </span>
              </li>
            </ul>
            <p className="text-xs text-blue-400 mt-3 italic">
              "Inventory is the foundation of sovereignty."
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderNext = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 p-4 rounded-lg border border-blue-500/30">
        <h3 className="text-blue-400 font-bold text-lg mb-2">Start Organizing</h3>
        <p className="text-sm text-slate-300">
          Pick your energy level. No overwhelm, just the next step:
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-green-500">
          <h4 className="text-green-400 font-semibold text-sm mb-2">🟢 I Have 5 Minutes</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Tap the 📷 camera button</li>
            <li>2. Point at a barcode of anything in your pantry</li>
            <li>3. Watch it auto-fill</li>
            <li>4. Done. You just used AJ's Warehouse.</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-yellow-500">
          <h4 className="text-yellow-400 font-semibold text-sm mb-2">🟡 I Have 15 Minutes</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Scan 5 items you buy regularly</li>
            <li>2. Add expiration dates</li>
            <li>3. Set minimum stock levels (when to buy more)</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-purple-500">
          <h4 className="text-purple-400 font-semibold text-sm mb-2">🟣 I Have 30 Minutes (Full Setup)</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Import existing inventory (spreadsheets, photos)</li>
            <li>2. Organize by storage location (pantry, freezer, garage)</li>
            <li>3. Set up family sharing</li>
            <li>4. Connect to Culinary Matria</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 p-4 rounded-lg border border-cyan-500/20 mt-4">
        <h4 className="text-cyan-400 font-semibold text-sm mb-2">🆘 Stuck? No Worries.</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800 p-2 rounded">
            <p className="text-slate-400">Tap the 🐛 ladybug</p>
            <p className="text-slate-500">Voice bug reporter</p>
          </div>
          <div className="bg-slate-800 p-2 rounded">
            <p className="text-slate-400">Say "help me"</p>
            <p className="text-slate-500">Voice assistant</p>
          </div>
          <div className="bg-slate-800 p-2 rounded">
            <p className="text-slate-400">Email will@p31.family</p>
            <p className="text-slate-500">Human help</p>
          </div>
          <div className="bg-slate-800 p-2 rounded">
            <p className="text-slate-400">Shake your phone</p>
            <p className="text-slate-500">Quick feedback</p>
          </div>
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-sm text-slate-400 italic">
          "Every item you track is money saved. 
          Every expiration avoided is waste prevented."
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <h2 className="text-lg font-bold text-white">Welcome to AJ's Warehouse</h2>
                <p className="text-xs text-blue-400">Your family's inventory command center</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                activeTab === tab.id 
                  ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' 
                  : 'text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'story' && renderStory()}
          {activeTab === 'what' && renderWhat()}
          {activeTab === 'money' && renderMoney()}
          {activeTab === 'next' && renderNext()}
        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 p-3 border-t border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Zap className="w-3 h-3 text-blue-400" />
            <span>P31 Network — The Mesh Is Family</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Start Scanning →
          </button>
        </div>
      </div>
    </div>
  );
};

export default P31Welcome;
