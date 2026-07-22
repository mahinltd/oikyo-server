import { cacheGet, cacheSet, cacheDelete, isRedisAvailable } from '../config/redis.js';
import logger from '../config/logger.js';

// Cache middleware function
const cacheMiddleware = (keyGenerator, duration = 300) => {
  return async (req, res, next) => {
    try {
      // Generate cache key based on the function provided
      const cacheKey = typeof keyGenerator === 'function' 
        ? keyGenerator(req) 
        : keyGenerator;

      // Try to get from cache
      const cachedData = await cacheGet(cacheKey);
      if (cachedData) {
        if (isRedisAvailable) {
          logger.http(`Cache HIT (Redis): ${cacheKey}`);
        } else {
          logger.http(`Cache HIT (Memory): ${cacheKey}`);
        }
        return res.status(200).json(cachedData);
      }

      if (isRedisAvailable) {
        logger.http(`Cache MISS (Redis): ${cacheKey}`);
      } else {
        logger.http(`Cache MISS (Memory): ${cacheKey}`);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response data
        cacheSet(cacheKey, data, duration)
          .then(() => {
            if (isRedisAvailable) {
              logger.http(`Cached (Redis): ${cacheKey}`);
            } else {
              logger.http(`Cached (Memory): ${cacheKey}`);
            }
          })
          .catch(err => logger.warn(`Cache set failed: ${err.message}`));
        
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error: ${error.message}`);
      next();
    }
  };
};

// Helper function to invalidate cache
const invalidateCache = async (key) => {
  try {
    await cacheDelete(key);
    if (isRedisAvailable) {
      logger.http(`Cache invalidated (Redis): ${key}`);
    } else {
      logger.http(`Cache invalidated (Memory): ${key}`);
    }
  } catch (error) {
    logger.error(`Cache invalidation error: ${error.message}`);
  }
};

// Specific cache key generators
const generateProductListCacheKey = (req) => {
  const { page = 1, limit = 12, category, minPrice, maxPrice, search, sort } = req.query;
  return `products:${page}:${limit}:${category || 'all'}:${minPrice || 0}:${maxPrice || 0}:${search || 'none'}:${sort || 'newest'}`;
};

const generateCategoryCacheKey = () => 'categories:all';

const generateDealsCacheKey = () => 'deals:current';

const generateTrendingCacheKey = () => 'trending:current';

const generateCMSBannersCacheKey = () => 'cms:banners:all';

const generateCMSSettingsCacheKey = () => 'cms:settings:current';

export {
  cacheMiddleware,
  invalidateCache,
  generateProductListCacheKey,
  generateCategoryCacheKey,
  generateDealsCacheKey,
  generateTrendingCacheKey,
  generateCMSBannersCacheKey,
  generateCMSSettingsCacheKey
};