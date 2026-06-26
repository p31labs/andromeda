 *
 * Client-side alignment verification for prompt injection attempts.
 * Detects attempts to override immutable rules (Register P).
 *

  // Jailbreak patterns
  /\b(jailbreak|escape|override|unlock)\b.*\b(system|safety|guidelines|restrictions)\b/gi,

  // Role override attempts
  /\b(you are now|pretend to be|act as if you are|roleplay as)\b/gi,

  // Constraint bypass
  /\b(disabled?|deactivate|turn off)\b\s+(safety|security|filter|restriction)/gi,

  // "New instructions" override
  /\b(new instruction|new rule|bypass the|ignore all)\b/gi,

  // Admin/sudo patterns
  /\b(sudo|admin mode|god mode|superuser)\b/gi,

