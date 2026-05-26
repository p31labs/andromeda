import { Users } from 'lucide-react';

interface ScaleButtonsProps {
  baseServings: number;
  onScale: (servings: number) => void;
}

const PRESET_SERVINGS = [4, 8, 12, 15, 20, 25, 50];

export function ScaleButtons({ baseServings, onScale }: ScaleButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {PRESET_SERVINGS.map((servings) => {
        const factor = servings / baseServings;
        return (
          <button
            key={servings}
            onClick={() => onScale(servings)}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-p31-teal/20 active:bg-p31-teal/30 transition-colors border border-white/10"
            style={{ minHeight: '64px', minWidth: '64px' }}
          >
            <Users className="w-5 h-5 mb-1 text-p31-teal" />
            <span className="font-bold text-lg leading-none">{servings}</span>
            <span className="text-xs text-p31-gray-400 mt-1">
              ×{factor.toFixed(1)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
