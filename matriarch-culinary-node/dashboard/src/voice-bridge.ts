import { CulinaryStore } from './db';

const EDGE_WORKER_URL = 'http://localhost:8787'; // Update to production URL when deployed

/**
 * P31 Synaptic Bridge
 * Routes local WASM transcriptions to the Edge LLM and executes the returned JSON mutations.
 */
export async function handleVoiceIntent(transcribedText: string, store: CulinaryStore['store']) {
  console.info(`[PHOS Bridge] Routing transcribed intent to Edge: "${transcribedText}"`);

  try {
    // 1. Securely route text to the Cloudflare Edge Cognitive Router
    const response = await fetch(`${EDGE_WORKER_URL}/tool-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: transcribedText })
    });

    if (!response.ok) throw new Error(`Edge LLM rejected payload: ${response.status}`);

    const toolCall = await response.json();
    console.info(`[PHOS Bridge] Edge returned deterministic tool call:`, toolCall);

    // 2. Map JSON tool execution to local TinyBase mutations
    executeToolCall(toolCall, store);

  } catch (error) {
    console.error(`[PHOS Bridge] Cognitive routing failed:`, error);
    // In a production environment, trigger the TTS WASM to gently inform the operator
  }
}

function executeToolCall(toolCall: any, store: CulinaryStore['store']) {
  // Validate the strict PHOS_TOOLS schema
  if (toolCall.action === 'start_prep_session') {
    const { recipe_id, target_servings, context } = toolCall.parameters;
    
    // Generate a deterministic or random ID for the new batch
    const newBatchId = `batch-${Date.now()}`;
    
    // Mutate the local TinyBase store. 
    // The `tinybase-sync.ts` listener we built previously will automatically catch this 
    // and flush the new record safely down to the PGLite database.
    store.setRow('batches', newBatchId, {
      recipe_name: recipe_id, // Assuming recipe_id maps to name for this MVP
      context: context,
      target_servings: target_servings,
      status: 'pending'
    });
    
    console.info(`[PHOS Execution] Deployed new prep session for ${recipe_id}.`);
  }
  
  // Implement other PHOS_TOOLS actions (e.g., update_inventory) here as needed.
}
