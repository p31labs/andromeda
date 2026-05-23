import React, { useEffect, useRef, useState } from "react";
import {
  useInputStore,
  useOutputStore,
  useControlStore,
} from "../../stores/transducerStore";
import { processInput } from "../../utils/processing";

interface TransducerProps {
  className?: string;
}

const Transducer: React.FC<TransducerProps> = ({ className }) => {
  const input = useInputStore((state) => state.input);
  const setOutput = useOutputStore((state) => state.setOutput);
  const { isActive, intervalMs } = useControlStore((state) => state.controls);

  const [localOutput, setLocalOutput] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        const result = processInput(input);
        setLocalOutput(result);
        setOutput(result);
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, input, intervalMs, setOutput]);

  return (
    <div className={`transducer-container ${className || ""}`}>
      <h2 className="text-xl font-bold mb-4">Transducer Output</h2>
      <div className="bg-gray-800 text-green-400 p-4 rounded font-mono whitespace-pre-wrap">
        {localOutput || "Awaiting input..."}
      </div>
    </div>
  );
};

export default Transducer;
