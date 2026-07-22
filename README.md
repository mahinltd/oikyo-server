# Oikyo E-commerce Backend

The backend server for the Oikyo E-commerce platform built with Node.js and Express.

## Project Structure

```
oikyo-server/
├── config/             # DB connection, Cloudinary config
├── controllers/        # Request handlers (empty for now)
├── middlewares/        # Auth, Error handling, Validation
├── models/             # Mongoose Schemas
├── routes/             # API route definitions
├── services/           # Business logic (API syncing, Email service)
├── utils/              # Helper functions (API response formatter, logger)
├── public/             # Static assets (if needed)
├── .env.example        # Template for environment variables
├── .eslintrc.json      # ESLint configuration
├── .gitignore          # Git ignore rules
├── .prettierrc         # Prettier configuration
├── server.js           # Entry point
└── package.json
```

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm start` - Start the production server
- `npm test` - Run tests

## Dependencies

### Runtime Dependencies
- **express**: Fast, unopinionated, minimalist web framework
- **mongoose**: MongoDB object modeling for Node.js
- **dotenv**: Loads environment variables from .env file
- **cors**: Enable cross-origin resource sharing
- **helmet**: Secure Express apps with various HTTP headers
- **express-rate-limit**: Basic rate-limiting middleware
- **bcryptjs**: Library for hashing passwords
- **jsonwebtoken**: JSON Web Token implementation
- **cookie-parser**: Parse Cookie header
- **joi**: Object schema validation
- **morgan**: HTTP request logger middleware
- **multer**: Middleware for handling multipart/form-data
- **cloudinary**: SDK for uploading files to Cloudinary
- **axios**: Promise based HTTP client
- **resend**: Email sending library

### Development Dependencies
- **nodemon**: Monitor for changes and restart server
- **eslint**: JavaScript linter
- **prettier**: Opinionated code formatter

## Environment Variables

Create a `.env` file based on the `.env.example` template with the following variables:

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: JWT expiration duration
- `NODE_ENV`: Environment (development/production)
- `PORT`: Port number for the server
- `CLOUDINARY_*`: Cloudinary configuration
- `RESEND_API_KEY`: Resend API key for email
- `MAHASAGAR_*`: Mahasagar API configuration
- `RATE_LIMIT_*`: Rate limiting configuration