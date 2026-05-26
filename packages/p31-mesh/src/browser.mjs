/**
 * Browser / bundler entry — no Node fs. Pass URLs explicitly or read JSON in your app.
 */
export { meshGet, meshPost } from "./client.mjs";
export { createK4PersonalAgentClient } from "./agent.mjs";
export { runK4PersonalMeshProbe, probeExitCode } from "./probe.mjs";
export { runMeshFleetProbe, runSingleHealthProbe } from "./fleet.mjs";
export {
  validateK4PersonalHealth,
  validatePersonalAgentManifest,
  PERSONAL_AGENT_MANIFEST_SCHEMA,
  validateK4CageHealth,
  validateK4HubsHealth,
} from "./schemas.mjs";
