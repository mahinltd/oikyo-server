import { Redis } from '@upstash/redis';

// Delay accessing environment variables until they're actually needed
let redisClient = null;
let isRedisAvailable = false;
let hasCheckedEnv = false;

// Function to initialize Redis with environment variables
const initializeRedis = () => {
  if (hasCheckedEnv) return; // Only check once
  
  hasCheckedEnv = true;
  
  // Add more debugging
  console.log('Environment variables check:');
  console.log('UPSTASH_REDIS_REST_URL exists:', !!process.env.UPSTASH_REDIS_REST_URL);
  console.log('UPSTASH_REDIS_REST_TOKEN exists:', !!process.env.UPSTASH_REDIS_REST_TOKEN);
  
  const hasRedisUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasRedisToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;

  // Log environment variable detection
  if (hasRedisUrl) {
    console.log('✓ UPSTASH_REDIS_REST_URL detected');
  } else {
    console.log('✗ UPSTASH_REDIS_REST_URL not found');
  }

  if (hasRedisToken) {
    console.log('✓ UPSTASH_REDIS_REST_TOKEN detected');
  } else {
    console.log('✗ UPSTASH_REDIS_REST_TOKEN not found');
  }

  // Initialize Redis client with error handling
  try {
    if (hasRedisUrl && hasRedisToken) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      isRedisAvailable = true;
      console.log('✓ Upstash Redis connected successfully');
    } else {
      console.warn('⚠️ UPSTASH_REDIS configuration incomplete. Caching will be disabled and will fall back to in-memory or DB.');
    }
  } catch (error) {
    console.error('❌ Failed to connect to UPSTASH_REDIS:', error.message);
    redisClient = null;
    isRedisAvailable = false;
  }
};

// In-memory cache as fallback when Redis is not available
const fallbackCache = new Map();
const FALLBACK_TTL = 300; // 5 minutes default TTL for fallback cache

// Simple in-memory cache with TTL for fallback
const setFallbackCache = (key, value, ttl = FALLBACK_TTL) => {
  if (!isRedisAvailable) {
    // Clear expired entries periodically
    const now = Date.now();
    for (const [cachedKey, { expiry }] of fallbackCache.entries()) {
      if (expiry < now) {
        fallbackCache.delete(cachedKey);
      }
    }
    
    // Set the new value with expiry
    fallbackCache.set(key, {
      value,
      expiry: now + (ttl * 1000)
    });
  }
};

const getFallbackCache = (key) => {
  if (!isRedisAvailable) {
    const cached = fallbackCache.get(key);
    if (cached) {
      const now = Date.now();
      if (cached.expiry > now) {
        return cached.value;
      } else {
        // Expired, remove it
        fallbackCache.delete(key);
        return null;
      }
    }
  }
  return null;
};

const deleteFallbackCache = (key) => {
  if (!isRedisAvailable) {
    fallbackCache.delete(key);
  }
};

const invalidateFallbackPattern = (pattern) => {
  if (!isRedisAvailable) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of fallbackCache.keys()) {
      if (regex.test(key)) {
        fallbackCache.delete(key);
      }
    }
  }
};

// Wrapper functions for Redis operations with fail-open strategy
const cacheGet = async (key) => {
  // Ensure Redis is initialized before attempting to use it
  initializeRedis();
  
  try {
    if (isRedisAvailable && redisClient) {
      const result = await redisClient.get(key);
      return result;
    } else {
      // Fallback to in-memory cache
      return getFallbackCache(key);
    }
  } catch (error) {
    console.warn('⚠️ Redis GET failed, falling back to in-memory cache:', error.message);
    return getFallbackCache(key);
  }
};

const cacheSet = async (key, value, expiration = 300) => { // Default to 5 minutes
  // Ensure Redis is initialized before attempting to use it
  initializeRedis();
  
  try {
    if (isRedisAvailable && redisClient) {
      await redisClient.set(key, value, {
        ex: expiration // TTL in seconds
      });
    } else {
      // Fallback to in-memory cache
      setFallbackCache(key, value, expiration);
    }
  } catch (error) {
    console.warn('⚠️ Redis SET failed, using in-memory cache:', error.message);
    setFallbackCache(key, value, expiration);
  }
};

const cacheDelete = async (key) => {
  // Ensure Redis is initialized before attempting to use it
  initializeRedis();
  
  try {
    if (isRedisAvailable && redisClient) {
      await redisClient.del(key);
    } else {
      // Fallback to in-memory cache
      deleteFallbackCache(key);
    }
  } catch (error) {
    console.warn('⚠️ Redis DELETE failed, clearing in-memory cache:', error.message);
    deleteFallbackCache(key);
  }
};

const cacheInvalidatePattern = async (pattern) => {
  // Ensure Redis is initialized before attempting to use it
  initializeRedis();
  
  try {
    if (isRedisAvailable && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } else {
      // Fallback to in-memory cache
      invalidateFallbackPattern(pattern);
    }
  } catch (error) {
    console.warn('⚠️ Redis invalidate pattern failed, clearing in-memory cache:', error.message);
    invalidateFallbackPattern(pattern);
  }
};

export {
  redisClient,
  isRedisAvailable,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheInvalidatePattern
};