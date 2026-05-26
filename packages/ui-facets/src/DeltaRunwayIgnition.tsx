import { motion } from 'framer-motion';
import { useSovereignData } from '../hooks/useSovereignData';
import { useState } from 'react';

interface DeltaRunwayIgnitionProps {
  onIgnite: () => void;
  isLoading: boolean;
}

// Generate Ed25519 key pair using WebCrypto
async function generateEd25519KeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
    },
    true,
    ['sign', 'verify']
  );
}

// Convert CryptoKey to raw bytes for storage
async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export default function DeltaRunwayIgnition({ onIgnite, isLoading }: DeltaRunwayIgnitionProps) {
  const { initializeVault } = useSovereignData();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIgnite = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Step 1: Generate Ed25519 key pair
      const keyPair = await generateEd25519KeyPair();
      const publicKeyB64 = await exportKey(keyPair.publicKey);
      
      // Step 2: Initialize PGLite vault with the generated key
      await initializeVault(publicKeyB64);
      
      // Step 3: Wait for vault to be ready (simulated 2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 4: Call parent onIgnite callback
      onIgnite();
    } catch (e) {
      console.error('Ignition failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to initialize vault');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen w-full bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    >
      <div className="max-w-md w-full space-y-12 text-center">
        
        <motion.h1
          className="text-5xl font-extrabold text-amber-900 tracking-tight"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Welcome home.
        </motion.h1>

        <motion.p
          className="text-xl text-amber-800/80 leading-relaxed font-medium"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          You are about to step out of the noise and into the Sanctuary.
          No passwords to remember. No WYE trackers watching you.
          Just a private vault for your data, locked directly to this device.
        </motion.p>

        {error && (
          <motion.div
            className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.div>
        )}

        <motion.button
          onClick={handleIgnite}
          disabled={isLoading || isGenerating}
          className="relative w-full py-6 bg-gradient-to-b from-orange-400 to-orange-600 rounded-[2rem] shadow-[0_10px_40px_rgba(234,88,12,0.4)] border-b-8 border-orange-700 active:border-b-0 active:translate-y-2 transition-all group disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 200 }}
        >
          <span className="block text-2xl font-bold text-white drop-shadow-md">
            {isGenerating ? 'Sealing your device...' : isLoading ? 'Preparing vault...' : 'I am ready. Seal my device and open the DELTA.'}
          </span>
          
          {!isGenerating && !isLoading && (
            <span className="absolute inset-0 rounded-[2rem] border-2 border-white/20 animate-pulse pointer-events-none" />
          )}
        </motion.button>

        <motion.p
          className="text-sm text-amber-700/60 font-semibold uppercase tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Tapping this generates your secure key and prepares your local vault. Takes 2 seconds.
        </motion.p>

      </div>
    </motion.div>
  );
}