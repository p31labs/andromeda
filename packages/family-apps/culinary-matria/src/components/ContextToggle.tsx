import { Home, Briefcase } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export function ContextToggle() {
  const { context, setContext } = useAppStore();
  
  const isHome = context === 'home';
  
  return (
    <div 
      className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 border border-white/10"
      style={{ minHeight: '64px' }} // 64px touch target
    >
      <button
        onClick={() => setContext('home')}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all min-w-[80px] justify-center ${
          isHome 
            ? 'bg-p31-teal text-p31-void' 
            : 'text-p31-gray-400 hover:text-p31-cloud'
        }`}
        style={{ minHeight: '56px' }} // 56px internal, 64px with padding
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>
      
      <button
        onClick={() => setContext('business')}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all min-w-[80px] justify-center ${
          !isHome 
            ? 'bg-p31-phosphorus text-p31-void' 
            : 'text-p31-gray-400 hover:text-p31-cloud'
        }`}
        style={{ minHeight: '56px' }}
      >
        <Briefcase className="w-5 h-5" />
        <span>Work</span>
      </button>
    </div>
  );
}
