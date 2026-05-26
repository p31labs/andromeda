import React, { useState } from 'react';
import { BookOpen, Heart, Zap, DollarSign, ArrowRight, X, Sparkles } from 'lucide-react';

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
      <div className="bg-gradient-to-r from-purple-900/30 to-violet-900/30 p-4 rounded-lg border border-purple-500/30">
        <p className="text-sm italic text-purple-400 mb-2">
          "Money is just energy in numeric form. This app helps you direct that energy where it matters."
        </p>
      </div>
      
      <p className="leading-relaxed">
        Hey {userName}. This is <span className="text-purple-400 font-semibold">Cheomatica</span>—
        your money command center.
      </p>
      
      <p className="leading-relaxed">
        The name comes from <em>cheo</em>—flow—and <em>matic</em>—automatic. 
        It's about the flow of resources in your life, automated and visible.
      </p>

      <div className="bg-slate-800/50 p-4 rounded-lg my-4">
        <h4 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          The Mesh Is Family
        </h4>
        <p className="text-sm">
          This app sees the whole picture. It knows what Culinary Matria is spending on groceries. 
          It knows what Warehouse AJ saved by preventing waste. It knows Maid Manager kept you 
          from hiring help you couldn't afford.
        </p>
        <p className="text-sm mt-2">
          It doesn't judge your spending. It just shows you where the energy flows—so you can direct it better.
        </p>
      </div>

      <p className="leading-relaxed text-sm">
        No more "where did it all go?" No more mystery. No more shame about money. 
        Just clarity. Just sovereignty. Just you, knowing exactly where you stand.
      </p>

      <p className="leading-relaxed text-sm text-slate-400">
        <span className="text-purple-400">Built with transparency</span> by someone who knows that 
        financial clarity is the foundation of freedom.
      </p>
    </div>
  );

  const renderWhat = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">💰</span>
          <div>
            <h3 className="text-xl font-bold text-white">Cheomatica</h3>
            <p className="text-sm text-slate-400">Your money command center</p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm text-slate-300">
          <p><span className="text-purple-400 font-semibold">🧠 What it does:</span> Tracks spending without judgment. Shows exactly where every dollar goes. Predicts shortfalls before they hit.</p>
          <p><span className="text-purple-400 font-semibold">💡 Why it matters:</span> Financial independence starts with knowing. No more mystery. No more surprises.</p>
          <p><span className="text-purple-400 font-semibold">🔮 The magic:</span> It predicts when you'll run low on funds <em>before</em> it happens. Gives you time to adjust.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-purple-400 font-semibold mb-1">📱 Works Offline</p>
          <p className="text-slate-400">Your financial data never leaves your device.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-purple-400 font-semibold mb-1">🎙️ Voice Entry</p>
          <p className="text-slate-400">"Spent $50 on groceries" — done.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-purple-400 font-semibold mb-1">📊 Predictive</p>
          <p className="text-slate-400">Sees problems coming before they arrive.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-purple-400 font-semibold mb-1">🔒 Private</p>
          <p className="text-slate-400">No bank connections. No data sharing.</p>
        </div>
      </div>

      <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30">
        <p className="text-xs text-purple-300">
          <strong>Pro tip:</strong> Start by just <em>observing</em> for a week. Don't try to change anything yet. 
          Just see where it goes. Awareness comes first.
        </p>
      </div>
    </div>
  );

  const renderMoney = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-4 rounded-lg border border-green-500/30">
        <h3 className="text-green-400 font-bold text-lg mb-2 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          How This Makes You Money
        </h3>
        <p className="text-sm text-slate-300">
          This isn't just tracking. It's a wealth-building system:
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-800/50 p-3 rounded-lg border-l-4 border-green-500">
          <h4 className="text-green-400 font-semibold text-sm">💰 TODAY: Stop Leaks</h4>
          <ul className="text-xs text-slate-300 mt-2 space-y-1">
            <li>• See where money actually goes (shocking, then useful)</li>
            <li>• Predict shortfalls before they hit</li>
            <li>• Optimize spending without deprivation</li>
            <li>• Connect all family apps for full picture</li>
          </ul>
          <p className="text-xs text-green-400 mt-2 font-semibold">
            Savings vary, but visibility always wins.
          </p>
        </div>

        <button
          onClick={() => setShowMoneyDetails(!showMoneyDetails)}
          className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded text-sm text-purple-400 font-semibold transition-colors"
        >
          {showMoneyDetails ? 'Hide Wealth Building' : 'Show Wealth Building →'}
        </button>

        {showMoneyDetails && (
          <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 p-4 rounded-lg border border-purple-500/30 animate-fade-in">
            <h4 className="text-purple-400 font-semibold text-sm mb-2">🚀 THE FUTURE: Build Wealth</h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-400">💎</span>
                <span>
                  <strong className="text-purple-300">Budget Templates:</strong> Sell your successful budget templates to other families. Passive income from what you already built.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">🤝</span>
                <span>
                  <strong className="text-purple-300">Family Banking:</strong> Pool resources with trusted families for better interest rates and bulk buying power.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">📊</span>
                <span>
                  <strong className="text-purple-300">DeFi Integration:</strong> When ready, your savings can earn yield in decentralized finance protocols you control.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">🏛️</span>
                <span>
                  <strong className="text-purple-300">Financial Education Grants:</strong> Running transparent family finance infrastructure qualifies for education grants.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">💰</span>
                <span>
                  <strong className="text-purple-300">Early User Tokens:</strong> As P31 network grows, early financial infrastructure users get governance tokens.
                </span>
              </li>
            </ul>
            <p className="text-xs text-purple-400 mt-3 italic">
              "The first step to wealth is knowing where you are. The second step is sovereignty."
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderNext = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-900/30 to-violet-900/30 p-4 rounded-lg border border-purple-500/30">
        <h3 className="text-purple-400 font-bold text-lg mb-2">Start With Clarity</h3>
        <p className="text-sm text-slate-300">
          Pick your energy level. No overwhelm, just the next step:
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-green-500">
          <h4 className="text-green-400 font-semibold text-sm mb-2">🟢 I Have 5 Minutes</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Tap the 🎙️ microphone</li>
            <li>2. Say "spent $20 on gas"</li>
            <li>3. That's it. You just started tracking.</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-yellow-500">
          <h4 className="text-yellow-400 font-semibold text-sm mb-2">🟡 I Have 15 Minutes</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Add 3 recurring bills (rent, utilities, etc.)</li>
            <li>2. Set your monthly income</li>
            <li>3. Look at the dashboard. See the picture.</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-purple-500">
          <h4 className="text-purple-400 font-semibold text-sm mb-2">🟣 I Have 30 Minutes (Full Setup)</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Import existing budget/spending data</li>
            <li>2. Set up spending categories</li>
            <li>3. Configure alerts (when to warn about low funds)</li>
            <li>4. Connect other P31 apps for full picture</li>
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
          "Every dollar you track is a dollar you control. 
          Every pattern you see is power you gain."
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-violet-900/50 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <h2 className="text-lg font-bold text-white">Welcome to Cheomatica</h2>
                <p className="text-xs text-purple-400">Your money command center</p>
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
                  ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-400' 
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
            <Zap className="w-3 h-3 text-purple-400" />
            <span>P31 Network — The Mesh Is Family</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Take Control →
          </button>
        </div>
      </div>
    </div>
  );
};

export default P31Welcome;
