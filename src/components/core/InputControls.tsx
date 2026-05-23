import React from "react";
import { useInputStore, useControlStore } from "../../stores/transducerStore";

const InputControls: React.FC = () => {
  const input = useInputStore((state) => state.input);
  const setInput = useInputStore((state) => state.setInput);
  const { isActive } = useControlStore((state) => state.controls);

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Input Controls</h2>
      <textarea
        className="w-full p-3 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
        rows={6}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter your input here..."
        disabled={isActive}
      ></textarea>
    </div>
  );
};

export default InputControls;
