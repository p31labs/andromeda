import React from "react";
import { useControlStore } from "../../stores/transducerStore";

const ControlPanel: React.FC = () => {
  const { isActive, intervalMs } = useControlStore((state) => state.controls);
  const toggleActive = useControlStore((state) => state.toggleActive);
  const setIntervalMs = useControlStore((state) => state.setInterval);

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Control Panel</h2>
      <div className="flex items-center justify-between mb-4">
        <span className="text-white">Transducer Active:</span>
        <button
          onClick={toggleActive}
          className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200 ${
            isActive
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          } text-white`}
        >
          {isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
      <div className="mb-4">
        <label htmlFor="interval" className="block text-white mb-2">
          Processing Interval (ms):
        </label>
        <input
          type="range"
          id="interval"
          min="100"
          max="5000"
          step="100"
          value={intervalMs}
          onChange={(e) => setIntervalMs(Number(e.target.value))}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm dark:bg-gray-700"
        />
        <div className="text-right text-gray-400 text-sm mt-1">
          {intervalMs} ms
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
