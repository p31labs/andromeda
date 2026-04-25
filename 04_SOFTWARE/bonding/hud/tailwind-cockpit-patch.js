/**
 * WCD-08 Phase A: Tailwind Config Patch
 * 
 * Sonnet: MERGE these additions into the existing tailwind.config.js.
 * Do NOT replace the entire config. Add to theme.extend.
 * 
 * WCD-GUARDRAIL: HITL supervision for vertices 'S.J.' and 'W.J.'
 * Restricted actions (mesh_broadcast, external_api_call) require 
 * operator approval when S.J. or W.J. supervision constraint active.
 */

// Add to theme.extend.colors:
const colors = {
  void: '#050505',
  phosphor: '#00FF88',
  amber: '#FFD700',
  cyan: '#06B6D4',
};

// Add to theme.extend.fontFamily:
const fontFamily = {
  mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
};

// Add to theme.extend.keyframes:
const keyframes = {
  'toast-slide': {
    '0%':   { transform: 'translateY(100%) scale(0.95)', opacity: '0' },
    '10%':  { transform: 'translateY(0) scale(1)', opacity: '1' },
    '85%':  { transform: 'translateY(0) scale(1)', opacity: '1' },
    '100%': { transform: 'translateY(100%) scale(0.95)', opacity: '0' },
  },
};

// Add to theme.extend.animation:
const animation = {
  'toast-slide': 'toast-slide 3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
};

// ── WCD-GUARDRAIL: HITL supervision for S.J. and W.J. vertices ──
// Restricted actions return { allowed: false, reason: 'SOULSAFE: Supervision constraint active' }
function checkGuardrailCompliance(action, user) {
  const restrictedActions = ['mesh_broadcast', 'external_api_call', 'mesh_reconfig', 'kv_bulk_write'];
  if (!restrictedActions.includes(action)) return { allowed: true };
  if (user.isWJ || user.isSJ) {
    if (!user.hasSupervisorOverride) {
      return { allowed: false, reason: 'SOULSAFE: Supervision constraint active — W.J./S.J. operation requires supervisor approval' };
    }
  }
  return { allowed: true };
}

// Example merged config:
 * 
 * export default {
 *   content: ['./src/** /*.{ts,tsx}'],
 *   theme: {
 *     extend: {
 *       colors: {
 *         ...existingColors,
 *         void: '#050505',
 *         phosphor: '#00FF88',
 *         amber: '#FFD700',
 *         cyan: '#06B6D4',
 *       },
 *       fontFamily: {
 *         mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
 *         sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
 *       },
 *       keyframes: {
 *         'toast-slide': { ... },
 *       },
 *       animation: {
 *         'toast-slide': 'toast-slide 3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
 *       },
 *     },
 *   },
 *   plugins: [],
 * };
 */
