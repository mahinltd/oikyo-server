import SiteSettings from '../models/SiteSettings.js';
import ContentPage from '../models/ContentPage.js';
import Banner from '../models/Banner.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import Joi from 'joi';
import logger from '../config/logger.js';
import { 
  cacheGet, 
  cacheSet, 
  cacheDelete 
} from '../config/redis.js';
import { 
  generateCMSSettingsCacheKey,
  generateCMSBannersCacheKey
} from '../utils/cache.js';

/**
 * Site Settings Controllers
 */

// Get site settings
const getSettings = asyncHandler(async (req, res) => {
  try {
    // Generate cache key
    const cacheKey = generateCMSSettingsCacheKey();
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    const settings = await SiteSettings.getSettings();
    
    result = successResponse(200, settings, 'Site settings retrieved successfully');

    // Cache the result for 1 hour (3600 seconds)
    await cacheSet(cacheKey, result, 3600);
    logger.http(`Cached: ${cacheKey}`);

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getSettings: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to retrieve site settings'));
  }
});

// Update site settings
const updateSettings = asyncHandler(async (req, res) => {
  try {
    const settingsSchema = Joi.object({
      siteName: Joi.string().trim().max(100),
      logoUrl: Joi.string().uri().allow(null, ''),
      faviconUrl: Joi.string().uri().allow(null, ''),
      contactEmail: Joi.string().email().allow(null, ''),
      contactPhone: Joi.string().max(20).allow(null, ''),
      socialLinks: Joi.object({
        facebook: Joi.string().uri().allow(null, ''),
        instagram: Joi.string().uri().allow(null, ''),
        tiktok: Joi.string().uri().allow(null, ''),
        twitter: Joi.string().uri().allow(null, ''),
      }),
      pixelIds: Joi.object({
        googleAnalytics: Joi.string().allow(null, ''),
        facebookPixel: Joi.string().allow(null, ''),
        tiktokPixel: Joi.string().allow(null, ''),
      }),
      currencySymbol: Joi.string().max(5),
      shippingPolicyText: Joi.string().allow(null, ''),
      returnPolicyText: Joi.string().allow(null, ''),
    });

    const { error, value } = settingsSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid settings update request: ${error.details[0].message}`);
      return res.status(400).json(errorResponse(400, error.details[0].message));
    }

    // Use findOneAndUpdate with upsert option to ensure only one document exists
    const updatedSettings = await SiteSettings.findOneAndUpdate({}, value, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    // Invalidate cache after update
    await cacheDelete(generateCMSSettingsCacheKey());
    logger.info(`Site settings updated and cache invalidated`);

    res.status(200).json(successResponse(200, updatedSettings, 'Site settings updated successfully'));
  } catch (error) {
    logger.error(`Error in updateSettings: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to update site settings'));
  }
});

/**
 * Content Pages Controllers
 */

// Get all active pages
const getPages = asyncHandler(async (req, res) => {
  try {
    const pages = await ContentPage.find({ isActive: true }).select('slug title metaDescription createdAt updatedAt');
    res.status(200).json(successResponse(200, pages, 'Active pages retrieved successfully'));
  } catch (error) {
    logger.error(`Error in getPages: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to retrieve pages'));
  }
});

// Get page by slug (public endpoint)
const getPageBySlug = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;

    const page = await ContentPage.findOne({ slug, isActive: true });
    if (!page) {
      logger.warn(`Page not found: ${slug}`);
      return res.status(404).json(errorResponse(404, 'Page not found or inactive'));
    }

    res.status(200).json(successResponse(200, page, 'Page retrieved successfully'));
  } catch (error) {
    logger.error(`Error in getPageBySlug: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to retrieve page'));
  }
});

// Create a new content page
const createPage = asyncHandler(async (req, res) => {
  try {
    const pageSchema = Joi.object({
      slug: Joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).required().lowercase(),
      title: Joi.string().trim().max(200).required(),
      content: Joi.string().required(),
      metaDescription: Joi.string().max(300).allow(null, ''),
      isActive: Joi.boolean(),
    });

    const { error, value } = pageSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid page creation request: ${error.details[0].message}`);
      return res.status(400).json(errorResponse(400, error.details[0].message));
    }

    // Check if slug already exists
    const existingPage = await ContentPage.findOne({ slug: value.slug });
    if (existingPage) {
      logger.warn(`Page with slug already exists: ${value.slug}`);
      return res.status(400).json(errorResponse(400, 'Page with this slug already exists'));
    }

    const newPage = await ContentPage.create(value);

    logger.info(`New page created: ${newPage.slug}`);

    res.status(201).json(successResponse(201, newPage, 'Page created successfully'));
  } catch (error) {
    logger.error(`Error in createPage: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to create page'));
  }
});

// Update a content page
const updatePage = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;

    const pageSchema = Joi.object({
      title: Joi.string().trim().max(200),
      content: Joi.string(),
      metaDescription: Joi.string().max(300).allow(null, ''),
      isActive: Joi.boolean(),
    });

    const { error, value } = pageSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid page update request: ${error.details[0].message}`);
      return res.status(400).json(errorResponse(400, error.details[0].message));
    }

    const updatedPage = await ContentPage.findOneAndUpdate(
      { slug },
      { ...value, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedPage) {
      logger.warn(`Page not found for update: ${slug}`);
      return res.status(404).json(errorResponse(404, 'Page not found'));
    }

    logger.info(`Page updated: ${updatedPage.slug}`);

    res.status(200).json(successResponse(200, updatedPage, 'Page updated successfully'));
  } catch (error) {
    logger.error(`Error in updatePage: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to update page'));
  }
});

// Delete a content page
const deletePage = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;

    const deletedPage = await ContentPage.findOneAndDelete({ slug });

    if (!deletedPage) {
      logger.warn(`Page not found for deletion: ${slug}`);
      return res.status(404).json(errorResponse(404, 'Page not found'));
    }

    logger.info(`Page deleted: ${deletedPage.slug}`);

    res.status(200).json(successResponse(200, null, 'Page deleted successfully'));
  } catch (error) {
    logger.error(`Error in deletePage: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to delete page'));
  }
});

/**
 * Banners Controllers
 */

// Get all active banners sorted by orderIndex
const getBanners = asyncHandler(async (req, res) => {
  try {
    // Generate cache key
    const cacheKey = generateCMSBannersCacheKey();
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    const banners = await Banner.find({ isActive: true }).sort({ orderIndex: 1 });
    
    result = successResponse(200, banners, 'Banners retrieved successfully');

    // Cache the result for 1 hour (3600 seconds)
    await cacheSet(cacheKey, result, 3600);
    logger.http(`Cached: ${cacheKey}`);

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getBanners: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to retrieve banners'));
  }
});

// Create a new banner
const createBanner = asyncHandler(async (req, res) => {
  try {
    const bannerSchema = Joi.object({
      imageUrl: Joi.string().uri().required(),
      linkUrl: Joi.string().uri().allow(null, ''),
      title: Joi.string().trim().max(100).allow(null, ''),
      subtitle: Joi.string().trim().max(200).allow(null, ''),
      orderIndex: Joi.number().integer().min(0).default(0),
      isActive: Joi.boolean().default(true),
    });

    const { error, value } = bannerSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid banner creation request: ${error.details[0].message}`);
      return res.status(400).json(errorResponse(400, error.details[0].message));
    }

    const newBanner = await Banner.create(value);

    // Invalidate cache after creation
    await cacheDelete(generateCMSBannersCacheKey());
    logger.info(`New banner created and cache invalidated: ${newBanner._id}`);

    res.status(201).json(successResponse(201, newBanner, 'Banner created successfully'));
  } catch (error) {
    logger.error(`Error in createBanner: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to create banner'));
  }
});

// Update a banner
const updateBanner = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const bannerSchema = Joi.object({
      imageUrl: Joi.string().uri(),
      linkUrl: Joi.string().uri().allow(null, ''),
      title: Joi.string().trim().max(100).allow(null, ''),
      subtitle: Joi.string().trim().max(200).allow(null, ''),
      orderIndex: Joi.number().integer().min(0),
      isActive: Joi.boolean(),
    });

    const { error, value } = bannerSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid banner update request: ${error.details[0].message}`);
      return res.status(400).json(errorResponse(400, error.details[0].message));
    }

    const updatedBanner = await Banner.findByIdAndUpdate(id, value, {
      new: true,
      runValidators: true,
    });

    if (!updatedBanner) {
      logger.warn(`Banner not found for update: ${id}`);
      return res.status(404).json(errorResponse(404, 'Banner not found'));
    }

    // Invalidate cache after update
    await cacheDelete(generateCMSBannersCacheKey());
    logger.info(`Banner updated and cache invalidated: ${updatedBanner._id}`);

    res.status(200).json(successResponse(200, updatedBanner, 'Banner updated successfully'));
  } catch (error) {
    logger.error(`Error in updateBanner: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to update banner'));
  }
});

// Delete a banner
const deleteBanner = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBanner = await Banner.findByIdAndDelete(id);

    if (!deletedBanner) {
      logger.warn(`Banner not found for deletion: ${id}`);
      return res.status(404).json(errorResponse(404, 'Banner not found'));
    }

    // Invalidate cache after deletion
    await cacheDelete(generateCMSBannersCacheKey());
    logger.info(`Banner deleted and cache invalidated: ${deletedBanner._id}`);

    res.status(200).json(successResponse(200, null, 'Banner deleted successfully'));
  } catch (error) {
    logger.error(`Error in deleteBanner: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to delete banner'));
  }
});

export {
  getSettings,
  updateSettings,
  getPages,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner
};