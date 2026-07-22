# Oikyo E-commerce Backend API Documentation

## Table of Contents
- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [CMS](#cms-endpoints)
  - [Products](#products-endpoints)
  - [Orders](#orders-endpoints)
  - [Reviews](#reviews-endpoints)
  - [Wishlist](#wishlist-endpoints)
  - [Sync](#sync-endpoints)
- [Data Models](#data-models)
- [Frontend Integration Guide](#frontend-integration-guide)
- [Production Features](#production-features)
- [Architecture](#architecture)

## Overview

The Oikyo E-commerce Backend is a Node.js/Express/MongoDB application that provides a complete e-commerce solution with dynamic CMS, product synchronization from external APIs, and order management with manual payment processing.

### Architecture
- **Backend**: Node.js with Express framework
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with admin roles
- **Security**: Helmet, CORS, rate limiting, input validation
- **Email**: Resend for notifications
- **File Upload**: Cloudinary integration
- **Caching**: UPSTASH_REDIS for performance optimization
- **Logging**: Winston for comprehensive logging
- **Monitoring**: Health checks and error tracking

## Base URL

All API endpoints are prefixed with `/api/`
Example: `https://your-domain.com/api/auth/login`

## Authentication

### JWT Token
- All authenticated requests require a JWT token in the Authorization header
- Format: `Authorization: Bearer <token>`
- Token is returned upon successful login
- Token expires after 7 days by default (configurable)

### Admin Roles
- Only users with role `admin` can access protected endpoints
- Initial admin user is created via seeding script or protected registration

## Environment Variables

### Required Variables
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Security
NODE_ENV=development
PORT=5000

# Upstash Redis Configuration (Production Caching)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=email@yourdomain.com

# External APIs (Mahasagar, etc.)
MAHASAGAR_API_URL=your_mahasagar_api_url
MAHASAGAR_API_KEY=your_mahasagar_api_key
MAHASAGAR_SECRET_KEY=your_mahasagar_secret_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15 * 60 * 1000
RATE_LIMIT_MAX=100

# Admin User (for seeding)
ADMIN_EMAIL=admin@oikyo.me
ADMIN_PASSWORD=ChangeMe123!

# Init Key (for registering first admin via API)
INIT_KEY=your_init_key_here
```

### Frontend Configuration
For frontend applications, you'll typically need:
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/login
- **Description**: Authenticate admin user and return JWT token
- **Access**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_object_id",
      "name": "Admin Name",
      "email": "admin@example.com",
      "role": "admin",
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_string"
  },
  "statusCode": 200
}
```
- **Error Response (400, 401)**:
```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": null,
  "statusCode": 401
}
```

#### POST /auth/register
- **Description**: Register new admin user (requires init key)
- **Access**: Public (with X-Init-Key header)
- **Headers**: 
  - `Content-Type: application/json`
  - `X-Init-Key: your_init_key`
- **Request Body**:
```json
{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "SecurePassword123!"
}
```
- **Success Response (201)**:
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "user": {
      "id": "user_object_id",
      "name": "New Admin",
      "email": "newadmin@example.com",
      "role": "admin",
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_string"
  },
  "statusCode": 201
}
```
- **Error Response (400, 403)**:
```json
{
  "success": false,
  "message": "Forbidden: Invalid initialization key",
  "errors": null,
  "statusCode": 403
}
```

### CMS Endpoints

#### GET /cms/settings
- **Description**: Get site settings
- **Access**: Public
- **Headers**: None required
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Site settings retrieved successfully",
  "data": {
    "_id": "settings_object_id",
    "siteName": "Oikyo E-commerce",
    "logoUrl": "https://example.com/logo.png",
    "faviconUrl": "https://example.com/favicon.ico",
    "contactEmail": "contact@oikyo.com",
    "contactPhone": "+8801712345678",
    "socialLinks": {
      "facebook": "https://facebook.com/oikyo",
      "instagram": "https://instagram.com/oikyo",
      "tiktok": "https://tiktok.com/@oikyo",
      "twitter": "https://twitter.com/oikyo"
    },
    "pixelIds": {
      "googleAnalytics": "GA-XXXXXXXX-X",
      "facebookPixel": "1234567890",
      "tiktokPixel": "1234567890"
    },
    "currencySymbol": "৳",
    "shippingPolicyText": "Shipping policy text...",
    "returnPolicyText": "Return policy text...",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "statusCode": 200
}
```

#### PUT /cms/settings
- **Description**: Update site settings
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: Partial update of settings fields
```json
{
  "siteName": "New Site Name",
  "contactEmail": "new-contact@oikyo.com"
}
```
- **Success Response (200)**: Similar to GET but with updated data

#### GET /cms/pages
- **Description**: Get all active content pages
- **Access**: Public
- **Headers**: None required
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Active pages retrieved successfully",
  "data": [
    {
      "slug": "about-us",
      "title": "About Us",
      "metaDescription": "Learn about our company",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "statusCode": 200
}
```

#### GET /cms/pages/:slug
- **Description**: Get content page by slug
- **Access**: Public
- **Headers**: None required
- **URL Parameter**: `slug` - the page slug
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Page retrieved successfully",
  "data": {
    "_id": "page_object_id",
    "slug": "about-us",
    "title": "About Us",
    "content": "<h1>About Us</h1><p>Content here...</p>",
    "metaDescription": "Learn about our company",
    "isActive": true,
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "statusCode": 200
}
```

#### POST /cms/pages
- **Description**: Create new content page
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "slug": "privacy-policy",
  "title": "Privacy Policy",
  "content": "<h1>Privacy Policy</h1><p>Content here...</p>",
  "metaDescription": "Our privacy policy",
  "isActive": true
}
```
- **Success Response (201)**:
```json
{
  "success": true,
  "message": "Page created successfully",
  "data": {
    "_id": "page_object_id",
    "slug": "privacy-policy",
    "title": "Privacy Policy",
    "content": "<h1>Privacy Policy</h1><p>Content here...</p>",
    "metaDescription": "Our privacy policy",
    "isActive": true,
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "statusCode": 201
}
```

#### PUT /cms/pages/:slug
- **Description**: Update content page by slug
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameter**: `slug` - the page slug
- **Request Body**: Partial update of page fields
```json
{
  "title": "Updated Privacy Policy",
  "content": "Updated content..."
}
```

#### DELETE /cms/pages/:slug
- **Description**: Delete content page by slug
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameter**: `slug` - the page slug

#### GET /cms/banners
- **Description**: Get all active banners
- **Access**: Public
- **Headers**: None required
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": [
    {
      "_id": "banner_object_id",
      "imageUrl": "https://example.com/banner.jpg",
      "linkUrl": "https://example.com/promotion",
      "title": "Summer Sale",
      "subtitle": "Up to 50% off",
      "orderIndex": 1,
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "statusCode": 200
}
```

#### POST /cms/banners
- **Description**: Create new banner
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "imageUrl": "https://example.com/new-banner.jpg",
  "linkUrl": "https://example.com/new-promotion",
  "title": "New Promotion",
  "subtitle": "Limited time offer",
  "orderIndex": 2,
  "isActive": true
}
```

#### PUT /cms/banners/:id
- **Description**: Update banner by ID
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameter**: `id` - the banner ID
- **Request Body**: Partial update of banner fields

#### DELETE /cms/banners/:id
- **Description**: Delete banner by ID
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameter**: `id` - the banner ID

### Products Endpoints

#### GET /products
- **Description**: Get all active products with pagination and filtering
- **Access**: Public
- **Headers**: None required
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 12, max: 100)
  - `category` (filter by category)
  - `minPrice` (minimum price filter)
  - `maxPrice` (maximum price filter)
  - `search` (search in name/description)
  - `sort` (price_low_to_high, price_high_to_low, newest, popularity, discount)
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "product_object_id",
        "name": "Product Name",
        "price": 100,
        "salePrice": 80,
        "images": ["https://example.com/image.jpg"],
        "category": "Electronics",
        "status": "active",
        "isFeatured": false,
        "discountPercentage": 20,
        "shortDescription": "Short description...",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "slug": "product-name"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalProducts": 50,
      "hasNextPage": true,
      "hasPrevPage": false,
      "hasMore": true,
      "limit": 12
    }
  },
  "statusCode": 200
}
```

#### GET /products/:id
- **Description**: Get product details by ID or slug
- **Access**: Public
- **Headers**: None required
- **URL Parameter**: `id` - the product ID or slug
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Product details fetched successfully",
  "data": {
    "product": {
      "_id": "product_object_id",
      "sourceId": "external_source_id",
      "name": "Product Name",
      "description": "Full product description...",
      "sanitizedDescription": "Clean description...",
      "category": "Electronics",
      "price": 100,
      "salePrice": 80,
      "images": ["https://example.com/image.jpg"],
      "stock": 10,
      "status": "active",
      "isFeatured": false,
      "views": 0,
      "salesCount": 0,
      "attributes": {
        "sizes": ["S", "M", "L"],
        "colors": ["Red", "Blue"],
        "variants": []
      },
      "discountPercentage": 20,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "slug": "product-name"
    }
  },
  "statusCode": 200
}
```

#### GET /products/featured
- **Description**: Get featured products
- **Access**: Public
- **Headers**: None required
- **Query Parameters**:
  - `limit` (default: 8, max: 20)
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Featured products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "product_object_id",
        "name": "Featured Product",
        "price": 100,
        "salePrice": 80,
        "images": ["https://example.com/image.jpg"],
        "category": "Electronics",
        "status": "active",
        "isFeatured": true,
        "discountPercentage": 20,
        "shortDescription": "Short description...",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "slug": "featured-product"
      }
    ]
  },
  "statusCode": 200
}
```

#### GET /products/categories
- **Description**: Get all unique categories with product counts
- **Access**: Public
- **Headers**: None required
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": {
    "categories": [
      {
        "name": "Electronics",
        "count": 150
      },
      {
        "name": "Clothing",
        "count": 89
      }
    ]
  },
  "statusCode": 200
}
```

#### GET /products/deals
- **Description**: Get products on sale (today's deals)
- **Access**: Public
- **Headers**: None required
- **Query Parameters**:
  - `limit` (default: 10, max: 20)
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Deal products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "product_object_id",
        "name": "On Sale Product",
        "price": 100,
        "salePrice": 80,
        "images": ["https://example.com/image.jpg"],
        "category": "Electronics",
        "status": "active",
        "isFeatured": false,
        "discountPercentage": 20,
        "shortDescription": "Short description...",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "slug": "on-sale-product"
      }
    ]
  },
  "statusCode": 200
}
```

#### GET /products/trending
- **Description**: Get trending products
- **Access**: Public
- **Headers**: None required
- **Query Parameters**:
  - `limit` (default: 8, max: 20)
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Trending products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "product_object_id",
        "name": "Trending Product",
        "price": 100,
        "salePrice": 80,
        "images": ["https://example.com/image.jpg"],
        "category": "Electronics",
        "status": "active",
        "isFeatured": false,
        "views": 150,
        "salesCount": 25,
        "discountPercentage": 20,
        "shortDescription": "Short description...",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "slug": "trending-product"
      }
    ]
  },
  "statusCode": 200
}
```

#### GET /products/top-selling
- **Description**: Get top selling products
- **Access**: Public
- **Headers**: None required
- **Query Parameters**:
  - `limit` (default: 8, max: 20)
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Top selling products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "product_object_id",
        "name": "Top Selling Product",
        "price": 100,
        "salePrice": 80,
        "images": ["https://example.com/image.jpg"],
        "category": "Electronics",
        "status": "active",
        "isFeatured": false,
        "salesCount": 120,
        "discountPercentage": 20,
        "shortDescription": "Short description...",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "slug": "top-selling-product"
      }
    ]
  },
  "statusCode": 200
}
```

#### GET /products/category/:category
- **Description**: Get products by category with optional filters
- **Access**: Public
- **Headers**: None required
- **URL Parameter**: `category` - the category name
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 12, max: 100)
  - `minPrice` (minimum price filter)
  - `maxPrice` (maximum price filter)
  - `search` (search in name/description)
  - `sort` (price_low_to_high, price_high_to_low, newest, popularity)
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Category products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "product_object_id",
        "name": "Category Product",
        "price": 100,
        "salePrice": 80,
        "images": ["https://example.com/image.jpg"],
        "category": "Electronics",
        "status": "active",
        "isFeatured": false,
        "discountPercentage": 20,
        "shortDescription": "Short description...",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "slug": "category-product"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalProducts": 25,
      "hasNextPage": true,
      "hasPrevPage": false,
      "hasMore": true,
      "limit": 12
    }
  },
  "statusCode": 200
}
```

### Reviews Endpoints

#### POST /reviews
- **Description**: Create a new product review (with optional images)
- **Access**: Public
- **Headers**: `Content-Type: multipart/form-data` (for image uploads)
- **Form Data**:
  - `productId`: Product ID
  - `customerName`: Customer's name
  - `customerEmail`: Customer's email
  - `rating`: Rating (1-5)
  - `comment`: Review comment (min 10 chars)
  - `images`: Array of image files (max 3, max 2MB each)
- **Success Response (201)**:
```json
{
  "success": true,
  "message": "Review submitted successfully. Awaiting approval.",
  "data": {
    "_id": "review_object_id",
    "product": "product_object_id",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "rating": 5,
    "comment": "Great product!",
    "images": [
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/reviews/image1.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/reviews/image2.jpg"
    ],
    "status": "pending",
    "verifiedPurchase": false,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "statusCode": 201
}
```
- **Error Response (400, 404)**:
```json
{
  "success": false,
  "message": "You have already reviewed this product",
  "errors": null,
  "statusCode": 400
}
```
- **Notes**: 
  - Reviews are created with 'pending' status and must be approved by admin
  - Images are uploaded to Cloudinary and URLs are stored
  - Maximum 3 images per review, 2MB each

#### GET /reviews/product/:productId
- **Description**: Get all approved reviews for a product
- **Access**: Public
- **Headers**: None required
- **URL Parameter**: `productId` - the product ID
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Product reviews retrieved successfully",
  "data": {
    "reviews": [
      {
        "_id": "review_object_id",
        "product": "product_object_id",
        "customerName": "John Doe",
        "rating": 5,
        "comment": "Great product!",
        "images": [
          "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/reviews/image1.jpg"
        ],
        "status": "approved",
        "verifiedPurchase": true,
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "averageRating": 4.5
  },
  "statusCode": 200
}
```

#### PUT /reviews/:id/approve
- **Description**: Approve a pending review
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameter**: `id` - the review ID
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Review approved successfully",
  "data": {
    "_id": "review_object_id",
    "status": "approved",
    // ... rest of review data
  },
  "statusCode": 200
}
```

#### PUT /reviews/:id/reject
- **Description**: Reject a pending review
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameter**: `id` - the review ID
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Review rejected successfully",
  "data": {
    "_id": "review_object_id",
    "status": "rejected",
    // ... rest of review data
  },
  "statusCode": 200
}
```

### Wishlist Endpoints

#### POST /wishlist/add
- **Description**: Add a product to user's wishlist
- **Access**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "userIdentifier": "user@example.com", // or phone number like "+8801712345678"
  "productId": "product_object_id"
}
```
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Product added to wishlist successfully",
  "data": {
    "_id": "wishlist_object_id",
    "userIdentifier": "user@example.com",
    "products": ["product_object_id", "another_product_id"],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "statusCode": 200
}
```
- **Notes**: 
  - `userIdentifier` can be email or phone number
  - Product is added only if not already in wishlist

#### DELETE /wishlist/remove
- **Description**: Remove a product from user's wishlist
- **Access**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "userIdentifier": "user@example.com", // or phone number
  "productId": "product_object_id"
}
```
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Product removed from wishlist successfully",
  "data": {
    "_id": "wishlist_object_id",
    "userIdentifier": "user@example.com",
    "products": ["another_product_id"], // Product removed
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "statusCode": 200
}
```

#### GET /wishlist/:identifier
- **Description**: Get user's wishlist with product details
- **Access**: Public
- **Headers**: None required
- **URL Parameter**: `identifier` - user's email or phone number
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": {
    "_id": "wishlist_object_id",
    "userIdentifier": "user@example.com",
    "products": [
      {
        "_id": "product_object_id",
        "name": "Product Name",
        "price": 100,
        "salePrice": 80,
        "images": ["https://example.com/image.jpg"],
        "category": "Electronics",
        "stock": 10,
        "status": "active",
        "isFeatured": true
      }
    ],
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "statusCode": 200
}
```

### Orders Endpoints

#### POST /orders
- **Description**: Create new order (public)
- **Access**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "customerInfo": {
    "name": "John Doe",
    "phone": "+8801712345678",
    "email": "john@example.com",
    "address": "123 Main St",
    "city": "Dhaka",
    "zip": "1200"
  },
  "items": [
    {
      "productId": "product_object_id",
      "quantity": 2
    }
  ],
  "paymentMethod": "bkash", // or 'nagad', 'rocket', 'cod'
  "transactionId": "BKASH123456789" // Required for bKash/Nagad/Rocket, optional for COD
}
```
- **Success Response (201)**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "order_object_id",
    "customerInfo": {
      "name": "John Doe",
      "phone": "+8801712345678",
      "email": "john@example.com",
      "address": "123 Main St",
      "city": "Dhaka",
      "zip": "1200"
    },
    "items": [
      {
        "productId": "product_object_id",
        "productName": "Product Name",
        "quantity": 2,
        "priceAtPurchase": 100,
        "image": "https://example.com/image.jpg",
        "_id": "item_object_id"
      }
    ],
    "paymentMethod": "bkash",
    "transactionId": "BKASH123456789",
    "paymentStatus": "pending", // or 'verified' for COD
    "orderStatus": "pending_payment", // or 'confirmed' for COD
    "totalAmount": 200,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "statusCode": 201
}
```
- **Notes**: 
  - Stock is deducted immediately upon order creation
  - For COD orders, paymentStatus is 'verified' and orderStatus is 'confirmed'
  - For online payments, status remains 'pending' until admin verifies

#### GET /orders/phone/:phone
- **Description**: Get orders by customer phone number (for tracking)
- **Access**: Public
- **Headers**: None required
- **URL Parameter**: `phone` - customer phone number
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "_id": "order_object_id",
      "customerInfo": { ... },
      "items": [...],
      "paymentMethod": "bkash",
      "transactionId": "BKASH123456789",
      "paymentStatus": "pending",
      "orderStatus": "pending_payment",
      "totalAmount": 200,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "statusCode": 200
}
```

#### GET /orders
- **Description**: Get all orders (admin only, with pagination/filtering)
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `status` (filter by order status)
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalOrders": 45,
    "hasNext": true,
    "hasPrev": false
  },
  "statusCode": 200
}
```

#### POST /orders/:id/verify
- **Description**: Verify payment for an order
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameter**: `id` - order ID
- **Request Body**:
```json
{
  "action": "approve", // or 'reject'
  "reason": "Payment verified" // required if rejecting
}
```
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Payment approved successfully",
  "data": {
    "order": { ... }, // Updated order object
    "emailSent": true
  },
  "statusCode": 200
}
```

#### PUT /orders/:id/status
- **Description**: Update order status
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameter**: `id` - order ID
- **Request Body**:
```json
{
  "status": "shipped" // or 'processing', 'delivered', 'cancelled'
}
```
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Order status updated to shipped",
  "data": { ... }, // Updated order object
  "statusCode": 200
}
```

### Sync Endpoints

#### POST /sync/products
- **Description**: Trigger product sync from external API
- **Access**: Admin only
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Sync started in background",
  "data": {
    "message": "Sync started in background"
  },
  "statusCode": 200
}
```
- **Notes**: 
  - Sync runs in background to avoid blocking the request
  - Actual sync results are logged to server console
  - Respects manualOverride settings on products

## Data Models

### TypeScript Interfaces for Frontend

```typescript
// User Interface
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  isActive: boolean;
  createdAt: string;
}

// Product Interface
interface Product {
  _id: string;
  sourceId: string; // ID from external API
  name: string;
  description: string;
  category: string;
  price: number;
  salePrice?: number;
  images: string[];
  stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  isFeatured: boolean;
  views: number;
  salesCount: number;
  attributes: {
    sizes: string[];
    colors: string[];
    variants: { name: string; value: string }[];
  };
  manualOverride?: {
    price?: number;
    stock?: number;
    isActive?: boolean;
  };
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
  slug: string;
}

// Review Interface
interface Review {
  _id: string;
  product: string; // Product ID
  customerName: string;
  customerEmail: string;
  rating: number; // 1-5
  comment: string;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected';
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

// Wishlist Interface
interface Wishlist {
  _id: string;
  userIdentifier: string; // Email or phone
  products: Product[]; // Populated product objects
  createdAt: string;
  updatedAt: string;
}

// Order Item Interface
interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
  image?: string;
}

// Order Interface
interface Order {
  _id: string;
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    zip: string;
  };
  items: OrderItem[];
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cod';
  transactionId?: string;
  paymentStatus: 'pending' | 'verified' | 'rejected';
  orderStatus: 'pending_payment' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Banner Interface
interface Banner {
  _id: string;
  imageUrl: string;
  linkUrl?: string;
  title?: string;
  subtitle?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
}

// ContentPage Interface
interface ContentPage {
  _id: string;
  slug: string;
  title: string;
  content: string;
  metaDescription?: string;
  isActive: boolean;
  updatedAt: string;
}

// SiteSettings Interface
interface SiteSettings {
  _id: string;
  siteName: string;
  logoUrl?: string;
  faviconUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
  };
  pixelIds?: {
    googleAnalytics?: string;
    facebookPixel?: string;
    tiktokPixel?: string;
  };
  currencySymbol: string;
  shippingPolicyText?: string;
  returnPolicyText?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Enums

```typescript
// Payment Methods
type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'cod';

// Payment Status
type PaymentStatus = 'pending' | 'verified' | 'rejected';

// Order Status
type OrderStatus = 'pending_payment' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Product Status
type ProductStatus = 'active' | 'inactive' | 'out_of_stock';

// Review Status
type ReviewStatus = 'pending' | 'approved' | 'rejected';
```

## Frontend Integration Guide

### Authentication Flow

1. **Login**: Call `POST /auth/login` with email/password
2. **Store Token**: Save the JWT token in localStorage/sessionStorage
3. **Include Token**: Add `Authorization: Bearer <token>` header to all protected requests
4. **Handle Expiry**: Implement token refresh or redirect to login when receiving 401 errors

### Order Flow Implementation

1. **Cart Creation**: Collect products and quantities
2. **Customer Info**: Gather customer details (name, phone, address, etc.)
3. **Payment Selection**: 
   - For COD: Set `paymentMethod: 'cod'`, no transaction ID needed
   - For Online Payments: Set method and collect transaction ID
4. **Place Order**: Call `POST /orders` with collected data
5. **Track Order**: Use `GET /orders/phone/{phone}` for customer tracking
6. **Show Instructions**: Display payment instructions based on selected method

### Review System Implementation

1. **Display Reviews**: Use `GET /reviews/product/{productId}` to show approved reviews
2. **Submit Review**: Use `POST /reviews` with form data including images
3. **Admin Approval**: Only admin can approve/reject reviews via respective endpoints
4. **Image Upload**: Reviews support up to 3 images, max 2MB each, stored on Cloudinary
5. **Pending Status**: Reviews are pending until admin approves them

### Wishlist Implementation

1. **Add to Wishlist**: Use `POST /wishlist/add` with user identifier and product ID
2. **Remove from Wishlist**: Use `DELETE /wishlist/remove` with user identifier and product ID
3. **View Wishlist**: Use `GET /wishlist/{identifier}` to get user's wishlist with product details
4. **User Identification**: Use email or phone number as user identifier

### Error Handling Strategy

The backend returns consistent error responses:

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[] | string | object; // Specific validation errors
  statusCode: number;
}
```

Handle errors in your frontend:
- Show `response.data.message` to users
- Log `response.data.errors` for debugging
- Handle specific status codes (401 redirect to login, etc.)

### Image Handling

- Product and banner images are stored as URLs
- Review images are uploaded to Cloudinary and stored as URLs
- Use the URLs directly in your image tags
- Cloudinary integration provides image optimization and transformations

### Manual Payment Flow

1. Customer selects payment method (bKash, Nagad, Rocket, or COD)
2. If COD, order is confirmed immediately
3. If online payment, customer completes payment externally
4. Customer provides transaction ID
5. Admin verifies payment manually via `POST /orders/{id}/verify`
6. Order proceeds to processing/shipping/delivery

### Pagination

Most list endpoints support pagination:
- Use `page` and `limit` query parameters
- Check the `pagination` object in response for navigation
- Handle `hasNext` and `hasPrev` flags for UI navigation

### Performance Tips

- Cache CMS settings and pages for better performance
- Implement loading states for sync operations
- Use debouncing for search/filter operations
- Consider implementing optimistic updates for better UX
- For reviews, cache average ratings to reduce API calls

## Production Features

### UPSTASH_REDIS Caching
- **Purpose**: High-performance caching layer for frequently accessed data
- **Cached Endpoints**:
  - `GET /products` (5 minutes)
  - `GET /products/categories` (1 hour)
  - `GET /products/deals` (10 minutes)
  - `GET /products/trending` (10 minutes)
  - `GET /cms/settings` (1 hour)
  - `GET /cms/banners` (1 hour)
- **Fallback**: In-memory cache when Redis is unavailable (fail-open strategy)
- **Cache Invalidation**: Automatically cleared when products/settings are updated

### Winston Logging
- **Log Levels**: error, warn, info, http
- **Log Files**: 
  - `logs/error.log` (errors only)
  - `logs/combined.log` (all logs)
- **Logged Events**:
  - Order creation and updates
  - Payment verification failures
  - Product synchronization failures
  - Authentication failures
  - Redis cache failures
  - Unexpected server errors

### Security Features
- **Rate Limiting**:
  - General: 100 requests per 15 minutes per IP
  - Authentication: 5 login attempts per 15 minutes per IP
  - Orders: 10 requests per minute per IP
- **Helmet**: Security headers for HTTP response protection
- **Mongo Sanitize**: Protection against NoSQL injection
- **CSP**: Content Security Policy to prevent XSS attacks

### Database Optimization
- **MongoDB Indexes**:
  - Product: status, category, price, name (text), isFeatured, views, salesCount
  - Order: customerInfo.phone, orderStatus, paymentStatus, createdAt
  - Cache: automatic indexes on Redis keys

### Cloudinary Image Optimization
- **Optimization**: Dynamic URL generation with f_auto, q_auto, w_800 transformations
- **Storage**: All product and banner images stored on Cloudinary
- **Delivery**: Optimized images served directly from CDN

### Cron Jobs & Scheduled Tasks
- **Automatic Product Sync**: Periodic synchronization with Mahasagar API
- **Cache Cleanup**: Automatic cleanup of expired cache entries
- **Maintenance Tasks**: Periodic database maintenance and cleanup

### Graceful Shutdown
- **Signal Handling**: SIGTERM and SIGINT signals handled properly
- **Connection Cleanup**: MongoDB connections closed properly
- **Pending Requests**: Finishes all pending requests before shutting down
- **Logging**: Shutdown events logged using Winston

### Global Error Handling
- **Uncaught Exceptions**: Caught and logged using Winston
- **Unhandled Rejections**: Caught and logged using Winston
- **Clean Responses**: Returns clean JSON error responses
- **No Stack Traces**: Stack traces never exposed in production

## Architecture

### Request Flow
1. **Incoming Request** → Express Router
2. **Security Middleware** → Helmet, CORS, Rate Limiting
3. **Authentication** → JWT verification (for protected routes)
4. **Validation** → Joi validation
5. **Caching** → Check Redis/memory cache (public routes)
6. **Business Logic** → Controller/Service layer
7. **Database** → MongoDB operations
8. **Response** → Standardized API response

### Authentication Flow
1. **Login** → Validate credentials → Generate JWT
2. **Protected Route** → Verify JWT → Extract user info → Authorize access
3. **Role-Based Access** → Check admin permissions → Allow/Deny actions

### Order Flow
1. **Create Order** → Validate products/stock → Deduct stock → Create order
2. **Payment Verification** → Admin approval → Update status → Send notifications
3. **Order Status Updates** → Track progress → Send notifications → Complete order

### Product Sync Flow
1. **Trigger Sync** → Fetch from Mahasagar API → Transform data
2. **Upsert Products** → Update existing/create new → Respect manual overrides
3. **Cache Invalidation** → Clear related cache entries → Update timestamps

### Cache Flow
1. **Request** → Check Redis cache → Return if available
2. **Miss** → Query database → Store in cache → Return result
3. **Update** → Invalidate related cache entries → Update database

---

**Last Updated**: July 2026
**Version**: 1.0