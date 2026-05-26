import { motion } from 'framer-motion';
import { Sparkles, Lock, Trash2 } from 'lucide-react';
import { useSovereignData } from '../../hooks/useSovereignData';
import { useState } from 'react';

export default function SurvivalFacet() {
  const { data, isLoading, addVaultItem, deleteVaultItem } = useSovereignData();
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
        className="min-h-[500px] bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800 font-sans p-8 flex items-center justify-center rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="flex items-center gap-3 animate-pulse">
          <Sparkles size={32} />
          <span className="text-2xl font-bold">Waking up the backpack...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-8 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-100 text-amber-900 font-sans min-h-[500px] flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[3rem]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="border-b border-amber-200 pb-4">
        <h2 className="text-4xl font-bold flex items-center gap-3 text-amber-700">
          <Sparkles size={40} className="text-amber-500" />
          My Secret Backpack
        </h2>
      </div>

      <form onSubmit={handleAppend} className="flex gap-4 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What's your secret?"
          aria-label="Enter your secret to keep it safe"
          className="flex-1 bg-white border border-amber-300 p-4 text-lg rounded-[2rem] focus:outline-none focus:border-amber-500 transition-colors placeholder:text-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        />
        <motion.button
          type="submit"
          disabled={!input.trim()}
          aria-label="Keep it Secret!"
          className="bg-gradient-to-b from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 text-xl rounded-[2rem] font-bold flex items-center gap-2 shadow-[0_10px_30px_rgba(234,88,12,0.3)] border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Lock size={24} />
          Keep it Secret!
        </motion.button>
      </form>

      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-4">
          {data.map((item) => (
            <motion.li
              key={item.id}
              whileHover={{ y: -5 }}
              className="p-4 bg-white rounded-[2rem] shadow-md flex justify-between items-center group"
            >
              <p className="text-lg text-amber-900">{item.text}</p>
              <button
                onClick={() => deleteVaultItem(item.id)}
                aria-label={`Delete secret ${item.id}`}
                className="text-amber-400 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 size={20} aria-hidden="true" />
              </button>
            </motion.li>
          ))}
          {data.length === 0 && (
            <li className="p-8 text-center text-amber-500 italic">
              Your backpack is empty. Add a secret!
            </li>
          )}
        </ul>
      </div>
    </motion.div>
  );
}