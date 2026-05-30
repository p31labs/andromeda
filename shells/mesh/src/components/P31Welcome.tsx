import React, { useState, useEffect } from 'react';
import { ArrowRight, X, Network } from 'lucide-react';

type WelcomeStep = {
  title: string;
  description: string;
  action?: string;
};

const steps: WelcomeStep[] = [
  {
    title: 'MESH Shell',
    description: 'Network topology monitor and node fleet dashboard for the P31 ecosystem. Visualize the K4 mesh, monitor fleet health, and track signal relays.',
    action: 'View Mesh'
  },
  {
    title: 'K4 Tetrahedron',
    description: 'The family cage forms a complete graph K4: 4 vertices (Will, S.J., W.J., Infrastructure) with 6 edges connecting every pair. 3D visualization via Three.js.',
  },
  {
    title: 'Fleet Monitor',
    description: 'Track Node Zero (ESP32-S3), Chromebook, family tablets, and infrastructure. Signal relay status in real-time.',
    action: 'Enter MESH'
  }
];

type P31WelcomeProps = {
  onComplete?: () => void;
};

export const P31Welcome: React.FC<P31WelcomeProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('p31:mesh-welcome:seen');
    if (stored) {
      setIsVisible(false);
      onComplete?.();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('p31:mesh-welcome:seen', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0d]/95 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-p31-cyan to-p31-teal transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={`glass rounded-2xl p-8 border border-white/10 transition-all duration-200 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-p31-cyan to-p31-teal flex items-center justify-center">
                <Network className="w-4 h-4 text-[#0a0b0d]" />
              </div>
              <span className="text-sm font-medium text-white/60">P31</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-white/40 hover:text-white/80 transition-colors"
              aria-label="Skip welcome"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 mb-8">
            <h2 className="text-2xl font-bold text-white">{step.title}</h2>
            <p className="text-white/60 leading-relaxed">{step.description}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-white/40">
              Step {currentStep + 1} of {steps.length}
            </div>
            <button
              onClick={handleNext}
              className="btn-primary flex items-center gap-2"
            >
              {step.action || 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          K4 tetrahedron • Fleet monitor • Signal relay status
        </p>
      </div>
    </div>
  );
};
