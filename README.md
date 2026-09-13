# 🌾 Kundu Agro & Fisheries - Backend API Server

A scalable, secure, and production-ready **REST API** backend for **Kundu Agro and Fisheries**, built with **Node.js (ES Modules)**, **Express 5**, **MongoDB / Mongoose**, and **JWT Authentication**.

---

## 🌟 Key Features

- 🔐 **Authentication & Authorization**:
  - Secure JWT authentication with Access and Refresh tokens.
  - Role-based Access Control (RBAC): `Admin`, `Seller`, `Customer`.
  - Password hashing with `bcryptjs` and pre-save lifecycle hooks.
  - HttpOnly cookie management and Bearer token header support.
- 📦 **Product Catalog Management**:
  - Full CRUD operations with automatic SEO-friendly slug generation (English & Bengali unicode).
  - Multi-criteria filtering (category, price range, unit, availability) and compound text search.
  - Multipart image file upload for product thumbnails with automatic cleanup of replaced/deleted files.
- 📝 **Blog & Media Publishing**:
  - Rich blog publishing with tags, author association, and slug-based routing.
  - Support for image thumbnail uploads (up to 5MB) and video file uploads (up to 50MB) or external video URLs.
- 👥 **User Administration**:
  - Comprehensive user management for Admins (search, filter by status/role, update roles, reset passwords).
- 📊 **Admin Dashboard Statistics**:
  - Aggregated metrics (total counts, role/status distribution, and recent activity).
- 🛡️ **Robust Error Handling**:
  - Centralized error middleware handling Mongoose validation errors, duplicate keys (`code: 11000`), CastErrors, and JWT token expirations.
  - `catchAsync` wrapper for clean controller logic without repetitive try-catch blocks.

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules: `"type": "module"`)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Framework**: [Express.js v5](https://expressjs.com/)
- **Database & ODM**: [MongoDB Atlas](https://www.mongodb.com/atlas) with [Mongoose v9](https://mongoosejs.com/)
- **Authentication**: [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **File Uploads**: [Multer](https://github.com/expressjs/multer)
- **HTTP Logger**: [Morgan](https://github.com/expressjs/morgan)
- **Environment**: [dotenv](https://github.com/motdotla/dotenv)

---

## 📁 Project Structure

```text
server/
├── config/
│   └── database.js               # MongoDB connection with custom DNS resolution
├── controllers/
│   ├── blog.controller.js        # Blog CRUD and media handlers
│   ├── dashboard.controller.js   # Admin analytics and metrics aggregation
│   ├── product.controller.js     # Product catalog CRUD and image upload handlers
│   └── user.controller.js        # User auth, profile, and admin user management
├── middleware/
│   ├── auth.middleware.js        # isAuthenticated, isAdmin, authorizeRoles
│   ├── errorHandler.js           # Centralized global error handling middleware
│   └── upload.middleware.js      # Multer configuration for products and blogs
├── model/
│   ├── blog.model.js             # Mongoose Blog schema and indexes
│   ├── product.model.js          # Mongoose Product schema and indexes
│   └── user.model.js             # Mongoose User schema with bcrypt hooks
├── routes/
│   ├── auth.route.js             # /api/v1/auth routes
│   ├── blog.route.js             # /api/v1/blogs routes
│   ├── dashboard.route.js        # /api/v1/admin routes
│   ├── product.route.js          # /api/v1/products routes
│   └── user.route.js             # /api/v1/users routes
├── uploads/                      # Uploaded media storage (served statically)
│   ├── blogs/
│   ├── blog-videos/
│   └── products/
├── utils/
│   ├── appError.js               # Custom operational Error class
│   ├── catchAsync.js             # Async error catcher wrapper
│   ├── response.js               # Cookie and JSON response utilities
│   ├── slugify.js                # URL slug generator helper
│   └── token.js                  # JWT token generator & verifier
├── .env                          # Local environment configuration (gitignored)
├── env.sample                    # Sample environment template
├── index.js                      # Application entry point & route mounting
├── package.json                  # Project dependencies and scripts
└── api_documentation.md          # Full API endpoints & Postman testing guide
```

---

## ⚙️ Getting Started

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **pnpm** (`npm install -g pnpm`)
- **MongoDB** connection URI (MongoDB Atlas or local instance)

### 2. Installation
Clone the repository and install dependencies in the `server` directory:

```bash
cd server
pnpm install
```

### 3. Environment Variables
Create a `.env` file in the `server` root (you can copy from `env.sample`):

```bash
cp env.sample .env
```

Configure the following variables in `.env`:

```env
PORT=4000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?appName=Cluster0
JWT_SECRET=your_super_secret_jwt_key_here
FRONTEND_URL=http://localhost:3000
ACCESS_COOKIES_VALIDITY=15
REFRESH_COOKIES_VALIDITY=7
```

### 4. Running the Server

#### Development Mode (with hot-reload via Nodemon):
```bash
pnpm dev
```

#### Production Mode:
```bash
pnpm start
```

Once started, the API will be available at `http://localhost:4000/api/v1`.

---

## 📡 API Endpoints Overview

| Route Prefix | Module | Description | Access |
|---|---|---|---|
| `/api/v1` | **Health Check** | API server status check | Public |
| `/api/v1/auth` | **Authentication** | Register, Login, Logout, Profile (`/me`), Password change | Public / Auth |
| `/api/v1/admin` | **Dashboard** | Aggregated stats for products, users, and blogs | Admin |
| `/api/v1/products` | **Products** | Catalog search, filter, detail, and admin CRUD with image upload | Public / Admin |
| `/api/v1/blogs` | **Blogs** | Blog articles, tags filter, detail, and admin CRUD with media upload | Public / Admin |
| `/api/v1/users` | **User Management** | List all users, update roles/statuses, delete, and admin password reset | Admin |
| `/uploads` | **Static Files** | Direct static access to uploaded images and videos | Public |

> 📖 **Full API Specification & Postman Payloads**:
> For complete request bodies, query parameters, and response examples, refer to [**`api_documentation.md`**](./api_documentation.md).

---

## 🧪 Testing with Postman

1. **Register Admin**: Send `POST /api/v1/auth/user/register` with role `"Admin"`.
2. **Login**: Send `POST /api/v1/auth/login` to receive authentication cookies and access token.
3. **Set Authorization Header**: In Postman, add `Authorization: Bearer <your_token>` to protected requests.
4. **Create Products & Blogs**: Use `multipart/form-data` body in Postman to test file uploads for thumbnails and videos.

---

## 🛡️ Security Best Practices

- Passwords are encrypted with `bcryptjs` salt rounds before database insertion.
- Authentication tokens are delivered via `httpOnly`, `secure`, and `sameSite` cookie options.
- User passwords are hidden by default on query operations (`select: false`).
- Allowed file MIME types and size thresholds are strictly enforced on media uploads.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
