# Oikyo Server - Backend API Documentation

## 1. Overview & Architecture

### Tech Stack
- **Backend**: Node.js (ES Modules) + Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Caching**: Redis (Upstash Redis with in-memory fallback)
- **Real-time**: Socket.io
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **File Storage**: Cloudinary
- **Email Service**: Resend
- **External API Integration**: Mahasagar ERP
- **Logging**: Winston
- **Security**: Helmet, CORS, express-rate-limit, express-mongo-sanitize

### Base URLs
- **Local**: `http://localhost:5000/api`
- **Production**: `https://yourdomain.com/api`

## 2. Environment Variables

### Database Configuration
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### Security Configuration
```
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
INIT_KEY=initialization_key_for_first_admin_registration
```

### External Services Configuration
```
# Cloudinary (File Upload)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Resend (Email Service)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=your_email@example.com

# Mahasagar ERP Integration
MAHASAGAR_API_URL=https://api.mahasagar.com/products
MAHASAGAR_API_KEY=your_mahasagar_api_key
MAHASAGAR_SECRET_KEY=your_mahasagar_secret_key

# Firebase (Push Notifications)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}
FIREBASE_PROJECT_ID=your_firebase_project_id

# Redis Caching
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Feature Configuration
```
# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Other
DEBUG=true
```

## 3. API Endpoints (Detailed)

### Authentication

#### POST `/api/auth/register`
- **Access Level**: Public (Requires X-Init-Key header)
- **Headers Required**: `X-Init-Key: <init_key>`
- **Request Body**:
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "user": {
      "id": "ObjectId",
      "name": "string",
      "email": "string",
      "role": "admin",
      "isActive": true,
      "createdAt": "ISO date"
    },
    "token": "JWT token"
  },
  "statusCode": 201
}
```
- **Error Response**:
```json
{
  "success": false,
  "message": "Error message",
  "errors": null,
  "statusCode": 400
}
```
- **Description**: Registers the first admin user. Requires INIT_KEY in headers for security.

#### POST `/api/auth/login`
- **Access Level**: Public
- **Request Body**:
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "ObjectId",
      "name": "string",
      "email": "string",
      "role": "admin",
      "isActive": true,
      "createdAt": "ISO date"
    },
    "token": "JWT token"
  },
  "statusCode": 200
}
```
- **Description**: Authenticates admin user and returns JWT token.

### CMS (Content Management System)

#### GET `/api/cms/settings`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Site settings retrieved successfully",
  "data": {
    "siteName": "string",
    "logoUrl": "string (nullable)",
    "faviconUrl": "string (nullable)",
    "contactEmail": "string (nullable)",
    "contactPhone": "string (nullable)",
    "socialLinks": {
      "facebook": "string (nullable)",
      "instagram": "string (nullable)",
      "tiktok": "string (nullable)",
      "twitter": "string (nullable)"
    },
    "pixelIds": {
      "googleAnalytics": "string (nullable)",
      "facebookPixel": "string (nullable)",
      "tiktokPixel": "string (nullable)"
    },
    "currencySymbol": "string",
    "shippingPolicyText": "string (nullable)",
    "returnPolicyText": "string (nullable)"
  },
  "statusCode": 200
}
```
- **Description**: Retrieves site-wide settings. Cached for 1 hour.

#### PUT `/api/cms/settings`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "siteName": "string (max 100 chars)",
  "logoUrl": "string (valid URL)",
  "faviconUrl": "string (valid URL)",
  "contactEmail": "string (valid email)",
  "contactPhone": "string (max 20 chars)",
  "socialLinks": {
    "facebook": "string (valid URL)",
    "instagram": "string (valid URL)",
    "tiktok": "string (valid URL)",
    "twitter": "string (valid URL)"
  },
  "pixelIds": {
    "googleAnalytics": "string",
    "facebookPixel": "string",
    "tiktokPixel": "string"
  },
  "currencySymbol": "string (max 5 chars)",
  "shippingPolicyText": "string",
  "returnPolicyText": "string"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Site settings updated successfully",
  "data": { /* updated settings */ },
  "statusCode": 200
}
```
- **Description**: Updates site-wide settings. Cache invalidated after update.

#### GET `/api/cms/pages`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Active pages retrieved successfully",
  "data": [
    {
      "_id": "ObjectId",
      "slug": "string",
      "title": "string",
      "metaDescription": "string (nullable)",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ],
  "statusCode": 200
}
```
- **Description**: Retrieves all active CMS pages.

#### GET `/api/cms/pages/:slug`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Page retrieved successfully",
  "data": {
    "_id": "ObjectId",
    "slug": "string",
    "title": "string",
    "content": "string",
    "metaDescription": "string (nullable)",
    "isActive": true
  },
  "statusCode": 200
}
```
- **Description**: Retrieves a specific page by slug.

#### POST `/api/cms/pages`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "slug": "string (kebab-case, required)",
  "title": "string (max 200 chars, required)",
  "content": "string (required)",
  "metaDescription": "string (max 300 chars)",
  "isActive": "boolean"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Page created successfully",
  "data": { /* created page */ },
  "statusCode": 201
}
```
- **Description**: Creates a new CMS page.

#### PUT `/api/cms/pages/:slug`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "title": "string (max 200 chars)",
  "content": "string",
  "metaDescription": "string (max 300 chars)",
  "isActive": "boolean"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Page updated successfully",
  "data": { /* updated page */ },
  "statusCode": 200
}
```
- **Description**: Updates an existing CMS page.

#### DELETE `/api/cms/pages/:slug`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Success Response**:
```json
{
  "success": true,
  "message": "Page deleted successfully",
  "data": null,
  "statusCode": 200
}
```
- **Description**: Deletes a CMS page.

#### GET `/api/cms/banners`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": [
    {
      "_id": "ObjectId",
      "imageUrl": "string",
      "linkUrl": "string (nullable)",
      "title": "string (nullable)",
      "subtitle": "string (nullable)",
      "orderIndex": "number",
      "isActive": true,
      "createdAt": "ISO date"
    }
  ],
  "statusCode": 200
}
```
- **Description**: Retrieves all active banners. Results are sorted by orderIndex and cached for 1 hour.

#### POST `/api/cms/banners`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "imageUrl": "string (valid URL, required)",
  "linkUrl": "string (valid URL)",
  "title": "string (max 100 chars)",
  "subtitle": "string (max 200 chars)",
  "orderIndex": "number (min 0)",
  "isActive": "boolean"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Banner created successfully",
  "data": { /* created banner */ },
  "statusCode": 201
}
```
- **Description**: Creates a new banner.

#### PUT `/api/cms/banners/:id`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "imageUrl": "string (valid URL)",
  "linkUrl": "string (valid URL)",
  "title": "string (max 100 chars)",
  "subtitle": "string (max 200 chars)",
  "orderIndex": "number (min 0)",
  "isActive": "boolean"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Banner updated successfully",
  "data": { /* updated banner */ },
  "statusCode": 200
}
```
- **Description**: Updates an existing banner.

#### DELETE `/api/cms/banners/:id`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Success Response**:
```json
{
  "success": true,
  "message": "Banner deleted successfully",
  "data": null,
  "statusCode": 200
}
```
- **Description**: Deletes a banner.

### Products

#### GET `/api/products`
- **Access Level**: Public
- **Headers Required**: None
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 12, max: 100)
  - `category`: string
  - `minPrice`: number
  - `maxPrice`: number
  - `search`: string
  - `sort`: string (values: price_low_to_high, price_high_to_low, name_asc, name_desc, popularity, discount)
- **Success Response**:
```json
{
  "success": true,
  "message": "Products fetched successfully",
  "data": {
    "products": [
      {
        "_id": "ObjectId",
        "name": "string",
        "price": "number",
        "salePrice": "number (nullable)",
        "images": ["string"],
        "category": "string",
        "status": "string",
        "isFeatured": "boolean",
        "createdAt": "ISO date",
        "updatedAt": "ISO date",
        "slug": "string",
        "salesCount": "number",
        "views": "number",
        "discountPercentage": "number",
        "shortDescription": "string"
      }
    ],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalProducts": "number",
      "hasNextPage": "boolean",
      "hasPrevPage": "boolean",
      "hasMore": "boolean",
      "limit": "number"
    }
  },
  "statusCode": 200
}
```
- **Description**: Retrieves all active products with pagination and filtering. Cached for 5 minutes.

#### GET `/api/products/categories`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": {
    "categories": [
      {
        "name": "string",
        "count": "number"
      }
    ]
  },
  "statusCode": 200
}
```
- **Description**: Retrieves all unique categories with product counts. Cached for 1 hour.

#### GET `/api/products/featured`
- **Access Level**: Public
- **Headers Required**: None
- **Query Parameters**:
  - `limit`: number (default: 8, max: 20)
- **Success Response**:
```json
{
  "success": true,
  "message": "Featured products fetched successfully",
  "data": {
    "products": [/* product objects */]
  },
  "statusCode": 200
}
```
- **Description**: Retrieves featured products. Cached for 10 minutes.

#### GET `/api/products/deals`
- **Access Level**: Public
- **Headers Required**: None
- **Query Parameters**:
  - `limit`: number (default: 10, max: 20)
- **Success Response**:
```json
{
  "success": true,
  "message": "Deal products fetched successfully",
  "data": {
    "products": [/* product objects */]
  },
  "statusCode": 200
}
```
- **Description**: Retrieves products on sale (with salePrice < price). Cached for 10 minutes.

#### GET `/api/products/trending`
- **Access Level**: Public
- **Headers Required**: None
- **Query Parameters**:
  - `limit`: number (default: 8, max: 20)
- **Success Response**:
```json
{
  "success": true,
  "message": "Trending products fetched successfully",
  "data": {
    "products": [/* product objects */]
  },
  "statusCode": 200
}
```
- **Description**: Retrieves trending products based on views and recency. Cached for 10 minutes.

#### GET `/api/products/top-selling`
- **Access Level**: Public
- **Headers Required**: None
- **Query Parameters**:
  - `limit`: number (default: 8, max: 20)
- **Success Response**:
```json
{
  "success": true,
  "message": "Top selling products fetched successfully",
  "data": {
    "products": [/* product objects */]
  },
  "statusCode": 200
}
```
- **Description**: Retrieves top selling products based on sales count. Cached for 10 minutes.

#### GET `/api/products/:id`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Product details fetched successfully",
  "data": {
    "product": {
      "_id": "ObjectId",
      "name": "string",
      "description": "string",
      "category": "string",
      "price": "number",
      "salePrice": "number (nullable)",
      "images": ["string"],
      "stock": "number",
      "status": "string",
      "isFeatured": "boolean",
      "views": "number",
      "salesCount": "number",
      "attributes": {
        "sizes": ["string"],
        "colors": ["string"],
        "variants": [{"name": "string", "value": "string"}]
      },
      "discountPercentage": "number",
      "sanitizedDescription": "string"
    }
  },
  "statusCode": 200
}
```
- **Description**: Retrieves detailed product information by ID or slug. Increments view count.

#### GET `/api/products/category/:category`
- **Access Level**: Public
- **Headers Required**: None
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 12, max: 100)
  - `minPrice`: number
  - `maxPrice`: number
  - `search`: string
  - `sort`: string (values: price_low_to_high, price_high_to_low, name_asc, name_desc, popularity)
- **Success Response**:
```json
{
  "success": true,
  "message": "Category products fetched successfully",
  "data": {
    "products": [/* product objects */],
    "pagination": {/* pagination info */}
  },
  "statusCode": 200
}
```
- **Description**: Retrieves products filtered by category with pagination and filtering. Cached for 5 minutes.

### Orders

#### POST `/api/orders`
- **Access Level**: Public
- **Headers Required**: None
- **Request Body**:
```json
{
  "customerInfo": {
    "name": "string (max 100 chars, required)",
    "phone": "string (max 20 chars, required)",
    "email": "string (valid email, required)",
    "address": "string (max 500 chars, required)",
    "city": "string (max 50 chars, required)",
    "zip": "string (max 10 chars, required)"
  },
  "items": [
    {
      "productId": "ObjectId (required)",
      "quantity": "number (min 1, required)"
    }
  ],
  "paymentMethod": "string (values: bkash, nagad, rocket, cod, required)",
  "transactionId": "string (required for online payments, optional for COD)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "ObjectId",
    "customerInfo": { /* customer info */ },
    "items": [
      {
        "productId": "ObjectId",
        "productName": "string",
        "quantity": "number",
        "priceAtPurchase": "number",
        "image": "string (nullable)"
      }
    ],
    "paymentMethod": "string",
    "transactionId": "string (nullable)",
    "paymentStatus": "string",
    "orderStatus": "string",
    "totalAmount": "number",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  },
  "statusCode": 201
}
```
- **Description**: Creates a new order. For COD, sets orderStatus to 'processing' and paymentStatus to 'verified'. For online payments, sets orderStatus to 'pending_payment' and paymentStatus to 'pending'.

#### GET `/api/orders/phone/:phone`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "_id": "ObjectId",
      "customerInfo": { /* customer info */ },
      "items": [/* items */],
      "paymentMethod": "string",
      "transactionId": "string (nullable)",
      "paymentStatus": "string",
      "orderStatus": "string",
      "totalAmount": "number",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ],
  "statusCode": 200
}
```
- **Description**: Retrieves orders by customer phone number for tracking purposes.

#### GET `/api/orders`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 10)
  - `status`: string (filter by order status)
- **Success Response**:
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [/* order objects */],
  "pagination": {
    "currentPage": "number",
    "totalPages": "number",
    "totalOrders": "number",
    "hasNext": "boolean",
    "hasPrev": "boolean"
  },
  "statusCode": 200
}
```
- **Description**: Retrieves all orders with pagination and optional status filtering.

#### POST `/api/orders/:id/verify`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "action": "string (values: approve, reject, required)",
  "reason": "string (required for reject action)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Payment approved/rejected successfully",
  "data": {
    "order": { /* updated order */ },
    "emailSent": "boolean"
  },
  "statusCode": 200
}
```
- **Description**: Verifies or rejects payment for an order. For approval, sets paymentStatus to 'verified' and orderStatus to 'processing'. For rejection, sets paymentStatus to 'rejected', orderStatus to 'cancelled', and restores stock.

#### PUT `/api/orders/:id/status`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "status": "string (values: processing, shipped, delivered, cancelled, required)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Order status updated to [status]",
  "data": { /* updated order */ },
  "statusCode": 200
}
```
- **Description**: Updates order status. For cancellation, restores stock if payment was verified and order wasn't delivered.

### Reviews

#### POST `/api/reviews`
- **Access Level**: Public
- **Headers Required**: None
- **Request Body**:
```json
{
  "productId": "ObjectId (required)",
  "customerName": "string (2-100 chars, required)",
  "customerEmail": "string (valid email, required)",
  "rating": "number (1-5, required)",
  "comment": "string (10-1000 chars, required)"
}
```
- **Request Files**:
  - `images`: Array of image files (max 3, max 2MB each)
- **Success Response**:
```json
{
  "success": true,
  "message": "Review submitted successfully. Awaiting approval.",
  "data": {
    "_id": "ObjectId",
    "product": "ObjectId",
    "customerName": "string",
    "customerEmail": "string",
    "rating": "number",
    "comment": "string",
    "images": ["string"],
    "status": "pending",
    "verifiedPurchase": false,
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  },
  "statusCode": 201
}
```
- **Description**: Submits a new review for a product. Reviews start as 'pending' status for admin approval.

#### GET `/api/reviews/product/:productId`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Product reviews retrieved successfully",
  "data": {
    "reviews": [
      {
        "_id": "ObjectId",
        "customerName": "string",
        "rating": "number",
        "comment": "string",
        "images": ["string"],
        "verifiedPurchase": "boolean",
        "createdAt": "ISO date"
      }
    ],
    "averageRating": "number"
  },
  "statusCode": 200
}
```
- **Description**: Retrieves all approved reviews for a specific product.

#### PUT `/api/reviews/:id/approve`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Success Response**:
```json
{
  "success": true,
  "message": "Review approved successfully",
  "data": { /* updated review */ },
  "statusCode": 200
}
```
- **Description**: Approves a pending review.

#### PUT `/api/reviews/:id/reject`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "reason": "string (optional)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Review rejected successfully",
  "data": { /* updated review */ },
  "statusCode": 200
}
```
- **Description**: Rejects a pending review.

#### DELETE `/api/reviews/:id`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Success Response**:
```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": {},
  "statusCode": 200
}
```
- **Description**: Deletes a review and removes associated images from Cloudinary.

### Wishlist

#### POST `/api/wishlist/add`
- **Access Level**: Public
- **Headers Required**: None
- **Request Body**:
```json
{
  "userIdentifier": "string (email or phone number, required)",
  "productId": "ObjectId (required)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Product added to wishlist successfully",
  "data": {
    "_id": "ObjectId",
    "userIdentifier": "string",
    "products": ["ObjectId"],
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  },
  "statusCode": 200
}
```
- **Description**: Adds a product to the user's wishlist.

#### DELETE `/api/wishlist/remove`
- **Access Level**: Public
- **Headers Required**: None
- **Request Body**:
```json
{
  "userIdentifier": "string (email or phone number, required)",
  "productId": "ObjectId (required)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "Product removed from wishlist successfully",
  "data": {
    "_id": "ObjectId",
    "userIdentifier": "string",
    "products": ["ObjectId"],
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  },
  "statusCode": 200
}
```
- **Description**: Removes a product from the user's wishlist.

#### GET `/api/wishlist/:identifier`
- **Access Level**: Public
- **Headers Required**: None
- **Success Response**:
```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": {
    "products": [
      {
        "_id": "ObjectId",
        "name": "string",
        "price": "number",
        "salePrice": "number (nullable)",
        "images": ["string"],
        "category": "string",
        "stock": "number",
        "status": "string",
        "isFeatured": "boolean"
      }
    ]
  },
  "statusCode": 200
}
```
- **Description**: Retrieves the user's wishlist by email or phone number.

### Sync

#### POST `/api/sync/products`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Success Response**:
```json
{
  "success": true,
  "message": "Sync started in background",
  "data": {
    "message": "Product sync initiated"
  },
  "statusCode": 200
}
```
- **Description**: Triggers product sync from Mahasagar API. The sync runs in the background and returns immediately. The sync includes creating/updating products based on the external API data and respects manual overrides.

### Notifications

#### POST `/api/notifications/register-token`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "fcmToken": "string (required)",
  "userType": "string (values: admin, customer, default: admin)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "data": {
    "message": "FCM token registered successfully",
    "fcmToken": "string"
  },
  "statusCode": 200
}
```
- **Description**: Registers an FCM token for push notifications.

#### DELETE `/api/notifications/unregister-token`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "fcmToken": "string (required)"
}
```
- **Success Response**:
```json
{
  "success": true,
  "message": "FCM token unregistered successfully",
  "data": {
    "message": "FCM token unregistered successfully",
    "fcmToken": "string"
  },
  "statusCode": 200
}
```
- **Description**: Unregisters an FCM token.

#### GET `/api/notifications`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 10)
  - `type`: string (filter by notification type)
- **Success Response**:
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "_id": "ObjectId",
        "type": "string",
        "title": "string",
        "message": "string",
        "data": {},
        "read": "boolean",
        "readAt": "ISO date (nullable)",
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      }
    ],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalNotifications": "number",
      "hasNext": "boolean",
      "hasPrev": "boolean"
    }
  },
  "statusCode": 200
}
```
- **Description**: Retrieves user's notifications with pagination.

#### PUT `/api/notifications/:id/read`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Success Response**:
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": { /* updated notification */ },
  "statusCode": 200
}
```
- **Description**: Marks a notification as read.

#### PUT `/api/notifications/mark-all-read`
- **Access Level**: Admin Only
- **Headers Required**: `Authorization: Bearer <token>`
- **Success Response**:
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {},
  "statusCode": 200
}
```
- **Description**: Marks all unread notifications as read.

## 4. Data Models (TypeScript Interfaces)

```typescript
// Product Interface
interface Product {
  _id: string;
  sourceId: string;
  name: string;
  slug: string;
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
    variants: {
      name: string;
      value: string;
    }[];
  };
  manualOverride?: {
    price?: number;
    stock?: number;
    isActive?: boolean;
  };
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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
  items: {
    productId: string;
    productName: string;
    quantity: number;
    priceAtPurchase: number;
    image?: string;
  }[];
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cod';
  transactionId?: string;
  paymentStatus: 'pending' | 'verified' | 'rejected';
  orderStatus: 'pending_payment' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

// User Interface
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin';
  isActive: boolean;
  fcmTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Review Interface
interface Review {
  _id: string;
  product: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  comment: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  verifiedPurchase: boolean;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Wishlist Interface
interface Wishlist {
  _id: string;
  userIdentifier: string;
  products: string[];
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
}

// ContentPage Interface
interface ContentPage {
  _id: string;
  slug: string;
  title: string;
  content: string;
  metaDescription?: string;
  isActive: boolean;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

// Notification Interface
interface Notification {
  _id: string;
  userId: string;
  type: 'order' | 'payment' | 'review' | 'low_stock' | 'system';
  title: string;
  message: string;
  data: any;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Enums
enum PaymentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock'
}

enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}
```

## 5. Frontend Integration Guide

### Authentication Flow
1. For the first admin registration, use the `/api/auth/register` endpoint with the `X-Init-Key` header
2. For subsequent logins, use `/api/auth/login` with email and password
3. Store the returned JWT token in localStorage/sessionStorage
4. Include the token in the Authorization header for protected routes: `Authorization: Bearer <token>`
5. Handle token expiration by redirecting to login page

### Infinite Scroll
1. Use the `hasMore` flag in the pagination object returned by product endpoints
2. When `hasMore` is true, automatically load the next page of products
3. Example implementation:
```javascript
// When scrolling near bottom of page
if (pagination.hasMore) {
  loadMoreProducts(pagination.currentPage + 1);
}
```

### Manual Payment Flow
1. For Cash on Delivery (COD): 
   - Set `paymentMethod: 'cod'`
   - The order status will automatically be set to 'processing' (not 'pending_payment')
   - Payment is considered verified on delivery
2. For Online Payments (bkash/nagad/rocket):
   - Set `paymentMethod: 'bkash'|'nagad'|'rocket'`
   - Include `transactionId` in the request
   - Order status will be 'pending_payment' until admin verifies payment
3. Admin must verify payment using `/api/orders/:id/verify` endpoint

### Real-Time Notifications
1. Connect to Socket.io server at the same domain
2. Authenticate with JWT token
3. Join the 'admin_room' to receive order and other notifications
4. Listen for events: `new_order`, `payment_verified`, `new_review`, `low_stock_alert`

### Error Handling
1. All API responses follow the standard format:
```json
{
  "success": true/false,
  "message": "Human-readable message",
  "data": {...}, // Present on success
  "errors": {...}, // Present on error
  "statusCode": 200/400/500/etc
}
```
2. Check the `success` field first to determine if the request was successful
3. Display the `message` field to users for feedback

## 6. Production Features

### Caching Strategy (Redis)
- Product listings: Cached for 5 minutes
- Category listings: Cached for 1 hour
- Deal products: Cached for 10 minutes
- Trending products: Cached for 10 minutes
- Top selling products: Cached for 10 minutes
- Featured products: Cached for 10 minutes
- CMS settings: Cached for 1 hour
- CMS banners: Cached for 1 hour
- Automatic cache invalidation after product sync or CMS updates

### Security Measures
- Rate limiting: General (100 requests per 15 min), Auth (5 login attempts per 15 min), Orders (10 requests per 1 min)
- Input sanitization: Prevents NoSQL injection attacks
- JWT authentication with HttpOnly cookies
- Helmet security headers including CSP
- CORS configured for specific domains in production
- Password hashing with bcryptjs

### Logging
- Winston logger with different log levels (info, warn, error, http)
- Logs include timestamps and structured data
- Error logs capture stack traces
- HTTP request logging in development mode