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
      <div className="bg-gradient-to-r from-pink-900/30 to-rose-900/30 p-4 rounded-lg border border-pink-500/30">
        <p className="text-sm italic text-pink-400 mb-2">
          "A clean space isn't about perfection. It's about having the energy to face the day."
        </p>
      </div>
      
      <p className="leading-relaxed">
        Hey {userName}. This is <span className="text-pink-400 font-semibold">Maid Manager</span>—
        and it's not about being a maid. It's about being <em>supported</em>.
      </p>
      
      <p className="leading-relaxed">
        This app knows something important: you have limited spoons. Some days you can conquer the world. 
        Other days, just getting out of bed is a victory. It doesn't judge. It just adjusts.
      </p>

      <div className="bg-slate-800/50 p-4 rounded-lg my-4">
        <h4 className="text-pink-400 font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          The Mesh Is Family
        </h4>
        <p className="text-sm">
          When your pain level is high, Maid Manager only shows you tasks you can do sitting down. 
          When your energy is good, it might suggest that thing you've been putting off. 
          It knows you. It cares about your actual capacity, not some imaginary standard.
        </p>
      </div>

      <p className="leading-relaxed text-sm">
        No more shame about a messy house. No more all-day cleaning marathons that leave you wrecked. 
        Just 15-minute wins that add up without breaking you.
      </p>

      <p className="leading-relaxed text-sm text-slate-400">
        <span className="text-pink-400">Built with compassion</span> by someone who knows what it's like 
        to need the house clean but not have the body cooperate.
      </p>
    </div>
  );

  const renderWhat = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🧹</span>
          <div>
            <h3 className="text-xl font-bold text-white">Maid Manager</h3>
            <p className="text-sm text-slate-400">Energy-aware home maintenance</p>
          </div>
        </div>
        
        <div className="space-y-3 text-sm text-slate-300">
          <p><span className="text-pink-400 font-semibold">🧠 What it does:</span> Breaks overwhelming cleaning into tiny, doable tasks. Tracks your energy. Adjusts suggestions based on how you feel.</p>
          <p><span className="text-pink-400 font-semibold">💡 Why it matters:</span> No shame. No overwhelm. No all-day marathons. Just sustainable maintenance that respects your body.</p>
          <p><span className="text-pink-400 font-semibold">🎙️ The magic:</span> Tell it "I'm at pain level 6" and it only shows you seated tasks. Tell it "I have energy" and it unlocks more.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-pink-400 font-semibold mb-1">🩺 Pain Aware</p>
          <p className="text-slate-400">Adjusts tasks based on your pain level.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-pink-400 font-semibold mb-1">⏱️ 15-Minute Wins</p>
          <p className="text-slate-400">No task takes longer than 15 minutes.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-pink-400 font-semibold mb-1">📅 Smart Scheduling</p>
          <p className="text-slate-400">Spaces tasks based on your history.</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-pink-400 font-semibold mb-1">👥 Family Sync</p>
          <p className="text-slate-400">Everyone sees what needs doing.</p>
        </div>
      </div>

      <div className="bg-pink-900/20 p-3 rounded-lg border border-pink-500/30">
        <p className="text-xs text-pink-300">
          <strong>Pro tip:</strong> Set your pain level honestly. The app works better when it knows 
          your real capacity, not what you wish it was.
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
          This app saves money by keeping you out of crisis mode:
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-800/50 p-3 rounded-lg border-l-4 border-green-500">
          <h4 className="text-green-400 font-semibold text-sm">💰 THIS MONTH: Prevent Crisis</h4>
          <ul className="text-xs text-slate-300 mt-2 space-y-1">
            <li>• Avoid cleaning service fees — saves $150-300/month</li>
            <li>• Prevent appliance breakdown (maintenance) — saves repairs</li>
            <li>• No more "emergency" takeout because kitchen's a mess</li>
            <li>• Energy-aware scheduling — do more without crashing</li>
          </ul>
          <p className="text-xs text-green-400 mt-2 font-semibold">
            Estimated monthly savings: $150-300
          </p>
        </div>

        <button
          onClick={() => setShowMoneyDetails(!showMoneyDetails)}
          className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded text-sm text-pink-400 font-semibold transition-colors"
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
                  <strong className="text-purple-300">Accessibility Data:</strong> Your pain/energy patterns help improve accessibility design. You earn tokens for contributing (anonymized).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">🤝</span>
                <span>
                  <strong className="text-purple-300">Community Support:</strong> Get matched with families who need your help (when you have spoons) and help you (when you don't).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">🏛️</span>
                <span>
                  <strong className="text-purple-300">Disability Grants:</strong> Running accessible home-management infrastructure qualifies for accessibility grants.
                </span>
              </li>
            </ul>
            <p className="text-xs text-pink-400 mt-3 italic">
              "Taking care of yourself is the foundation of taking care of others."
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderNext = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-pink-900/30 to-rose-900/30 p-4 rounded-lg border border-pink-500/30">
        <h3 className="text-pink-400 font-bold text-lg mb-2">Start With Compassion</h3>
        <p className="text-sm text-slate-300">
          Pick your energy level. No guilt, just the next small step:
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-green-500">
          <h4 className="text-green-400 font-semibold text-sm mb-2">🟢 I Have 5 Minutes & Some Energy</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Tap "Quick Win"</li>
            <li>2. Do the one task shown</li>
            <li>3. Check it off</li>
            <li>4. Feel good about it. That's enough.</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-yellow-500">
          <h4 className="text-yellow-400 font-semibold text-sm mb-2">🟡 I Have Low Energy / Pain</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Set your pain level honestly</li>
            <li>2. Look at seated-only tasks</li>
            <li>3. Pick one tiny thing (wiping a counter)</li>
            <li>4. That's still a win. It counts.</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-purple-500">
          <h4 className="text-purple-400 font-semibold text-sm mb-2">🟣 I Have 30 Minutes (Let's Set Up)</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. Set your pain scale preferences</li>
            <li>2. Add your recurring tasks</li>
            <li>3. Set realistic schedules</li>
            <li>4. Invite family to share the load</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 p-4 rounded-lg border border-cyan-500/20 mt-4">
        <h4 className="text-cyan-400 font-semibold text-sm mb-2">🆘 Stuck? Be Gentle With Yourself.</h4>
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
            <p className="text-slate-400">Just rest</p>
            <p className="text-slate-500">The mess will wait</p>
          </div>
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-sm text-slate-400 italic">
          "You are not the mess in your house. You are the person 
          doing your best with what you have today."
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-900/50 to-rose-900/50 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧹</span>
              <div>
                <h2 className="text-lg font-bold text-white">Welcome to Maid Manager</h2>
                <p className="text-xs text-pink-400">Energy-aware home maintenance</p>
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
                  ? 'bg-slate-800 text-pink-400 border-b-2 border-pink-400' 
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
            <Zap className="w-3 h-3 text-pink-400" />
            <span>P31 Network — The Mesh Is Family</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Take Care of You →
          </button>
        </div>
      </div>
    </div>
  );
};

export default P31Welcome;
