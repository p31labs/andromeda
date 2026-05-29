/**
 * simplex-worker — CF entry (fetch + cron + queue)
 */

import { dispatch, handleScheduled, runAgentById } from './agents/runner';
import { TOOL_REGISTRY } from './agents/tools/index';
import type { AgentId, Env } from './agents/types';
import { verifyDiscordSignature, parseInteractionType, buildInteractionAck, buildInteractionResponse, buildInteractionEmbedResponse, buildStatusEmbed } from './lib/discord';
import { verifyStripeSignature, buildPaymentEmbed, logStripeEvent } from './lib/stripe';
import { verifyHmacSha256 } from './lib/hmac-worker';
import { mergeKvSystemStateWithSentinel, resolveSentinelContext } from './lib/context-fallback';
import { skillCorsHeaders } from './lib/http-json';
import { assertOperatorAuthorized } from './lib/operator-auth';
import { ALL_BREAKERS, estopAll, getAllBreakerStates, setBreakerState } from './lib/breakers';
import { SIMPLEX_CRON_EXPRESSIONS, SIMPLEX_QUEUE_NAME } from './runtime-meta';
import { handleOperatorSkillRequest } from './skills/router';
import { parseHostileSecret } from './lib/hostile';
import { assessVoltagePure } from './lib/voltage';
