#!/usr/bin/env node
// Kenosis mesh test harness: post an INIT to Root and observe leaf aggregation

const fetch = typeof globalThis.fetch === 'function'
  ? globalThis.fetch
  : require('node-fetch');

const WORKER_URL = "https://kenosis-mesh.YOUR_SUBDOMAIN.workers.dev"; // Replace with your deployed URL
const ROOT_BEARER_TOKEN = "<ROOT_BEARER_TOKEN>"; // Replace with the deployed root bearer token

async function testMesh() {
  console.log("🟢 INITIATING KENOSIS MESH TEST...");

  const envelope = {
    id: "init-" + Date.now(),
    from: "OPERATOR",
    to: "R",
    type: "init",
    payload: { command: "VERIFY_K4_INTEGRITY" },
    timestamp: Date.now()
  };

  try {
    const resp = await fetch(WORKER_URL + "/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ROOT_BEARER_TOKEN}`
      },
      body: JSON.stringify(envelope)
    });

    const data = await resp.json();
    console.log("Root response:", data);
  } catch (error) {
    console.error("Mesh test error:", error);
  }
}

testMesh();