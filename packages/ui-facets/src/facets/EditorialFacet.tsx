import { motion } from 'framer-motion';
import { CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { useSovereignData } from '../../hooks/useSovereignData';
import { useState } from 'react';

export default function EditorialFacet() {
  const { data, isLoading, error, addVaultItem, deleteVaultItem } = useSovereignData();
  const [input, setInput] = useState('');

  const handleAppend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      addVaultItem(input.trim());
      setInput('');
    }
  };

  if (isLoading) {
    return (
      <motion.div
        className="min-h-[500px] bg-zinc-50 text-zinc-800 font-serif p-8 flex items-center justify-center border-2 border-zinc-200"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-3 animate-pulse">
          <span className="text-2xl font-bold tracking-wide">LOADING SECURE VAULT...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-[500px] bg-zinc-50 text-red-700 font-serif p-8 flex items-center justify-center border-2 border-red-300"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={32} />
          <span className="text-2xl font-bold tracking-wide">ERROR: {error}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.main
      className="p-8 bg-zinc-50 text-zinc-900 font-serif min-h-[500px] flex flex-col gap-6 border-2 border-zinc-200"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <header className="border-b-2 border-zinc-300 pb-4">
        <h1 className="text-4xl font-bold tracking-wide">ACCESSIBLE DATA VAULT</h1>
      </header>

      <section aria-labelledby="add-item-heading">
        <h2 id="add-item-heading" className="sr-only">Add a new item to the vault</h2>
        <form onSubmit={handleAppend} className="flex gap-4 items-stretch">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter data to store securely..."
            aria-label="Enter data to store securely in the vault"
            title="Enter data to store securely in the vault"
            className="flex-1 bg-white border-2 border-zinc-300 p-4 text-xl rounded-lg focus:outline-none focus:ring-4 focus:ring-zinc-400 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Save to Vault"
            title="Save the entered data to the secure vault"
            className="bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 text-xl font-bold flex items-center gap-3 focus:outline-none focus:ring-4 focus:ring-zinc-400 tracking-wide"
          >
            <CheckCircle2 size={32} />
            SAVE TO VAULT
          </button>
        </form>
      </section>

      <section aria-labelledby="vault-items-heading">
        <h2 id="vault-items-heading" className="sr-only">Stored vault items</h2>
        <ul className="space-y-4">
          {data.map((item) => (
            <li key={item.id} className="p-4 border-2 border-zinc-200 flex justify-between items-center">
              <p className="text-xl tracking-wide">{item.text}</p>
              <button
                onClick={() => deleteVaultItem(item.id)}
                aria-label={`Delete item: ${item.text}`}
                title={`Delete item: ${item.text}`}
                className="text-zinc-600 hover:text-red-600 transition-colors p-2 focus:outline-none focus:ring-4 focus:ring-zinc-400"
              >
                <Trash2 size={32} aria-hidden="true" />
              </button>
            </li>
          ))}
          {data.length === 0 && (
            <li className="p-8 text-center text-zinc-500 text-xl italic tracking-wide border-2 border-dashed border-zinc-300">
              The vault is empty.
            </li>
          )}
        </ul>
      </section>
    </motion.main>
  );
}