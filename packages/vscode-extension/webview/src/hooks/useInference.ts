import { useState } from "react";

export function useInference() {
    const [response, setResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const runInference = async (context: string) => {
        setIsLoading(true);
        // Mock inference
        setTimeout(() => {
            setResponse(`Mock response for context: ${context}`);
            setIsLoading(false);
        }, 1000);
    };

    return { response, isLoading, runInference };
}
