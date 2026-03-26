#!/usr/bin/env python3
"""
P31 Spoons Economy API - Backend Implementation
===============================================

This module implements the /api/shelter/brain/expend endpoint that handles
spoon deductions for the Spoons economy system. It includes protection
against race conditions using Redis Lua scripts and idempotency keys.

Compliance: ISO 13485:2016 (Post-Market Clinical Follow-up)
Medical Safety: 21 CFR §890.3710 (0 Spoon hard-stop)
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple, Any

import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import exceptions directly from redis.asyncio
from redis.asyncio import exceptions as redis_exceptions

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
REDIS_URL = os.getenv('UPSTASH_REDIS_URL', 'redis://localhost:6379')
IDEMPOTENCY_TTL = 5  # seconds
SPOONS_BASELINE = 12.0
SPOONS_MINIMUM = 0.0

# Initialize Redis connection
redis_client = redis.from_url(REDIS_URL)

# FastAPI app
app = FastAPI(
    title="P31 Spoons Economy API",
    description="Backend API for Spoons economy with race condition protection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ExpendRequest(BaseModel):
    fingerprint_hash: str = Field(..., description="User identifier hash")
    action_type: str = Field(..., description="Type of action (e.g., POSNER_VOTE)")
    idempotency_key: Optional[str] = Field(None, description="Unique request identifier")

class ExpendResponse(BaseModel):
    status: str
    spoons_remaining: float
    message: Optional[str] = None

class SpoonsState(BaseModel):
    spoons: float
    last_updated: str

# Lua script for atomic spoon deduction
ATOMIC_SPOON_DEDUCTION = """
local user_key = KEYS[1]
local idempotency_key = KEYS[2]
local action_type = ARGV[1]
local fingerprint_hash = ARGV[2]

-- 1. Check Idempotency (Did they double click in the last 5 seconds?)
if redis.call("EXISTS", idempotency_key) == 1 then
    return {err = "IDEMPOTENT_REJECT", spoons = redis.call("HGET", user_key, "spoons")}
end

-- 2. Lock the idempotency key for 5 seconds
redis.call("SETEX", idempotency_key, tonumber(ARGV[3]), "LOCKED")

-- 3. Check Spoons Capacity
local current_spoons = tonumber(redis.call("HGET", user_key, "spoons"))
if current_spoons == nil then
    -- Initialize user with baseline spoons
    redis.call("HSET", user_key, "spoons", ARGV[4])
    current_spoons = tonumber(ARGV[4])
end

if current_spoons <= 0 then
    return {err = "CLINICAL_HALT", spoons = 0}
end

-- 4. Safely deduct and return new balance
local new_balance = redis.call("HINCRBYFLOAT", user_key, "spoons", -1.0)
redis.call("HSET", user_key, "last_updated", ARGV[5])

return {err = "SUCCESS", spoons = new_balance}
"""

# Register the Lua script
async def register_lua_script():
    """Register the atomic spoon deduction script with Redis."""
    try:
        # Test the script registration
        script_sha = await redis_client.script_load(ATOMIC_SPOON_DEDUCTION)
        logger.info(f"Lua script registered with SHA: {script_sha}")
        return script_sha
    except Exception as e:
        logger.error(f"Failed to register Lua script: {e}")
        raise

# Initialize script registration
script_sha = None

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    global script_sha
    script_sha = await register_lua_script()
    logger.info("P31 Spoons Economy API started successfully")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Test Redis connection
        await redis_client.ping()
        return {
            "status": "healthy",
            "redis": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.get("/spoons/{fingerprint_hash}")
async def get_spoons(fingerprint_hash: str) -> SpoonsState:
    """Get current spoons for a user."""
    try:
        user_key = f"user:{fingerprint_hash}"
        spoons = await redis_client.hget(user_key, "spoons")
        last_updated = await redis_client.hget(user_key, "last_updated")
        
        if spoons is None:
            # Initialize user with baseline spoons
            await redis_client.hset(user_key, mapping={
                "spoons": str(SPOONS_BASELINE),
                "last_updated": datetime.now(timezone.utc).isoformat()
            })
            spoons = str(SPOONS_BASELINE)
        
        return SpoonsState(
            spoons=float(spoons),
            last_updated=last_updated or datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        logger.error(f"Error getting spoons for {fingerprint_hash}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.patch("/api/shelter/brain/expend")
async def expend_spoons(request: ExpendRequest) -> ExpendResponse:
    """
    Expend spoons for a user action.
    
    This endpoint is protected against race conditions using:
    1. Atomic Lua script execution in Redis
    2. Idempotency keys to prevent double-spending
    3. Hard stop at 0 spoons (medical safety requirement)
    """
    global script_sha
    try:
        # Generate idempotency key if not provided
        idempotency_key = request.idempotency_key or str(uuid.uuid4())
        user_key = f"user:{request.fingerprint_hash}"
        full_idempotency_key = f"idempotency:{request.fingerprint_hash}:{idempotency_key}"
        
        # Execute atomic Lua script
        result = await redis_client.evalsha(
            script_sha,
            2,  # Number of keys
            user_key,
            full_idempotency_key,
            request.action_type,
            request.fingerprint_hash,
            str(IDEMPOTENCY_TTL),
            str(SPOONS_BASELINE),
            datetime.now(timezone.utc).isoformat()
        )
        
        # Parse result - handle both list and tuple results
        if isinstance(result, (list, tuple)) and len(result) >= 2:
            err_code = result[0]
            spoons_remaining = float(result[1])
        else:
            logger.error(f"Unexpected result format from Lua script: {result}")
            raise HTTPException(status_code=500, detail="Script execution error")
        
        if err_code == "IDEMPOTENT_REJECT":
            return ExpendResponse(
                status="IGNORED",
                spoons_remaining=spoons_remaining,
                message="Duplicate somatic input detected. Safe-shield engaged."
            )
        elif err_code == "CLINICAL_HALT":
            return ExpendResponse(
                status="HALTED",
                spoons_remaining=0.0,
                message="Cognitive capacity depleted. System requires biological rest."
            )
        elif err_code == "SUCCESS":
            return ExpendResponse(
                status="APPROVED",
                spoons_remaining=spoons_remaining
            )
        else:
            logger.error(f"Unexpected result from Lua script: {result}")
            raise HTTPException(status_code=500, detail="Script execution error")
            
    except redis.exceptions.NoScriptError:
        # Script not loaded, reload it
        logger.warning("Lua script not found, reloading...")
        script_sha = await register_lua_script()
        # Retry the request
        return await expend_spoons(request)
    except Exception as e:
        logger.error(f"Error processing spoon expenditure: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/spoons/reset/{fingerprint_hash}")
async def reset_spoons(fingerprint_hash: str) -> SpoonsState:
    """Reset spoons to baseline for testing purposes."""
    try:
        user_key = f"user:{fingerprint_hash}"
        await redis_client.hset(user_key, mapping={
            "spoons": str(SPOONS_BASELINE),
            "last_updated": datetime.now(timezone.utc).isoformat()
        })
        
        return SpoonsState(
            spoons=SPOONS_BASELINE,
            last_updated=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        logger.error(f"Error resetting spoons for {fingerprint_hash}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/spoons/clear/{fingerprint_hash}")
async def clear_user_data(fingerprint_hash: str):
    """Clear all data for a user (testing only)."""
    try:
        user_key = f"user:{fingerprint_hash}"
        idempotency_pattern = f"idempotency:{fingerprint_hash}:*"
        
        # Delete user data
        await redis_client.delete(user_key)
        
        # Delete all idempotency keys for this user
        async for key in redis_client.scan_iter(match=idempotency_pattern):
            await redis_client.delete(key)
        
        return {"message": f"Cleared data for user {fingerprint_hash}"}
    except Exception as e:
        logger.error(f"Error clearing user data for {fingerprint_hash}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "spoons_api:app",
        host="0.0.0.0",
        port=3001,
        reload=True
    )