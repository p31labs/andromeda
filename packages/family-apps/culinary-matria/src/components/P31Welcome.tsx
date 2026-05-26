import { useState, useEffect } from 'react';
import { X, ChefHat, Database, Users, Sparkles } from 'lucide-react';

interface Props {
  appName: string;
  description: string;
  onClose: () => void;
}

export function P31Welcome({ appName, description, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [passportState, setPassportState] = useState<{spoons?: number; calcium?: number}>({});

  useEffect(() => {
    // Load passport state for personalized greeting
    try {
      const stored = localStorage.getItem('p31:passport:state');
      if (stored) {
        setPassportState(JSON.parse(stored));
      }
    } catch(e) {}
  }, []);

  const steps = [
    {
      title: `Welcome to ${appName}`,
      content: description,
      icon: <ChefHat className="w-8 h-8 text-p31-teal" />
    },
    {
      title: "Local-First",
      content: "Your recipes live on your device first. The cloud is for backup and sharing with family—not for lock-in.",
      icon: <Database className="w-8 h-8 text-p31-cyan" />
    },
    {
      title: "Family Sharing",
      content: "Share recipes with your family mesh. Everyone stays in sync while keeping control of their data.",
      icon: <Users className="w-8 h-8 text-p31-purple" />
    },
    {
      title: "Ready to Cook",
      content: getPersonalizedMessage(passportState),
      icon: <Sparkles className="w-8 h-8 text-p31-gold" />
    }
  ];

  function getPersonalizedMessage(state: {spoons?: number; calcium?: number}) {
    if (state.spoons !== undefined && state.spoons < 0.3) {
      return "Your spoons are low today. Remember: simple meals are still nourishing. One step at a time.";
    }
    if (state.calcium !== undefined && state.calcium <= 7.5) {
      return "Your calcium is critical. Please take care of yourself first. Emergency kit nearby?";
    }
    return "Let's create something delicious together. Your kitchen, your rules.";
  }

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-p31-void/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5 text-p31-gray-400" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-p31-teal/20 to-p31-cyan/20 flex items-center justify-center mb-4">
            {currentStep.icon}
          </div>
          <h2 className="text-xl font-bold mb-2">{currentStep.title}</h2>
          <p className="text-sm text-p31-gray-400">{currentStep.content}</p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-p31-teal' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
            >
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 px-4 py-2 rounded-lg bg-p31-teal text-p31-void font-medium text-sm hover:bg-p31-teal/90 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-p31-teal text-p31-void font-medium text-sm hover:bg-p31-teal/90 transition-colors"
            >
              Get Started
            </button>
          )}
        </div>

        <div className="mt-4 text-center">
          <button 
            onClick={onClose}
            className="text-xs text-p31-gray-500 hover:text-p31-gray-400"
          >
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}
