# Kundu Agro & Fisheries - Backend API Documentation

Complete REST API documentation for the **Kundu Agro & Fisheries** backend server, including endpoint details, authentication methods, Postman testing payloads, and query parameters.

---

## 🌐 Base URL & Server Info

- **Development Base URL**: `http://localhost:4000/api/v1` (or your configured `PORT` in `.env`)
- **Static Uploads URL**: `http://localhost:4000/uploads`
- **Content-Type**:
  - JSON Endpoints: `application/json`
  - Upload Endpoints (Products & Blogs): `multipart/form-data`

---

## 🔐 Authentication & Authorization

Protected endpoints require an **Admin** or authenticated session.

### 1. Header (Recommended for Postman)
Add the JWT token in the `Authorization` header:
```http
Authorization: Bearer <your_access_token_here>
```

### 2. Cookies (Browser / Next.js)
The server automatically sets `accessToken` and `refreshToken` in `httpOnly` cookies upon successful login.

---

## 🚀 Postman Quick Setup Guide

1. **Create Environment Variables** in Postman:
   - `base_url`: `http://localhost:4000/api/v1`
   - `token`: *(leave empty, will be set after login)*
   - `productId`: *(sample ID)*
   - `blogId`: *(sample ID)*
   - `userId`: *(sample ID)*

2. **Testing Workflow**:
   1. `POST {{base_url}}/auth/user/register` (Create Admin or User)
   2. `POST {{base_url}}/auth/login` (Login & copy the `token` from response or cookies)
   3. Set `token` in Postman header: `Authorization: Bearer {{token}}`
   4. Test Product, Blog, User, and Admin Stats endpoints.

---

## 📑 API Endpoints Summary

| Category | Method | Endpoint | Description | Auth Required |
|---|---|---|---|---|
| **Health** | `GET` | `/` | API Health Check | No |
| **Auth** | `POST` | `/auth/user/register` | Register new user / admin | No |
| **Auth** | `POST` | `/auth/login` | Login with email/phone & password | No |
| **Auth** | `GET` | `/auth/me` | Get current logged-in user profile | Yes |
| **Auth** | `GET` | `/auth/verify` | Verify active session | Yes |
| **Auth** | `POST` | `/auth/admin/changepassword` | Change own password | Yes |
| **Auth** | `GET` | `/auth/logout` | Logout & clear cookies | Yes |
| **Dashboard**| `GET` | `/admin/stats` | Admin Dashboard overview statistics | Admin |
| **Products** | `GET` | `/products` | List all products (filters & search) | No |
| **Products** | `GET` | `/products/:idOrSlug` | Get single product by ID or Slug | No |
| **Products** | `POST` | `/products` | Create product (with thumbnail upload) | Admin |
| **Products** | `PUT/PATCH` | `/products/:id` | Update product details / thumbnail | Admin |
| **Products** | `DELETE`| `/products/:id` | Delete product & associated image | Admin |
| **Blogs** | `GET` | `/blogs` | List all blogs (filters & search) | No |
| **Blogs** | `GET` | `/blogs/:idOrSlug` | Get single blog by ID or Slug | No |
| **Blogs** | `POST` | `/blogs` | Create blog (with thumbnail & video) | Admin |
| **Blogs** | `PUT/PATCH` | `/blogs/:id` | Update blog details / media | Admin |
| **Blogs** | `DELETE`| `/blogs/:id` | Delete blog & associated media | Admin |
| **Users** | `GET` | `/users` | List all users (filters & search) | Admin |
| **Users** | `GET` | `/users/:id` | Get user by ID | Admin |
| **Users** | `POST` | `/users` | Create user | Admin |
| **Users** | `PUT/PATCH` | `/users/:id` | Update user role, status, etc. | Admin |
| **Users** | `DELETE`| `/users/:id` | Delete user | Admin |
| **Users** | `POST` | `/users/:id/change-password` | Admin change user's password | Admin |

---

## 1. Health Check

### `GET /api/v1`
Check if the API server is live.

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Api is LIVE"
}
```

---

## 2. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/user/register`
Register a new customer, staff, manager, or admin user.

- **Headers**: `Content-Type: application/json`
- **Request Body (Demo)**:
```json
{
  "name": "Kundu Admin",
  "email": "admin@kunduagro.com",
  "password": "AdminPassword123!",
  "role": "Admin",
  "status": "Active",
  "phone": "+880 1711-000001"
}
```
*(Valid roles: `"Admin"`, `"Manager"`, `"Staff"`, `"Customer"`)*
*(Valid statuses: `"Active"`, `"Inactive"`)*

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "name": "Kundu Admin",
    "email": "admin@kunduagro.com",
    "role": "Admin",
    "status": "Active",
    "phone": "+880 1711-000001",
    "avatar": null,
    "createdAt": "2026-08-24T16:00:00.000Z",
    "updatedAt": "2026-08-24T16:00:00.000Z",
    "id": "66ca0b91d2929e01f56b9c81"
  }
}
```

---

### `POST /api/v1/auth/login`
Authenticate user and receive access/refresh tokens.

- **Headers**: `Content-Type: application/json`
- **Request Body (Demo)**:
```json
{
  "email": "admin@kunduagro.com",
  "password": "AdminPassword123!"
}
```
*(You can also use `"phone"` or `"identifier"` instead of `"email"`)*

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "User logged in successfully"
}
```
*(Cookies `accessToken` and `refreshToken` are set in response headers)*

---

### `GET /api/v1/auth/me`
Get current logged-in user profile.

- **Headers**: `Authorization: Bearer <your_access_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "user": {
    "name": "Kundu Admin",
    "email": "admin@kunduagro.com",
    "role": "Admin",
    "status": "Active",
    "phone": "+880 1711-000001",
    "id": "66ca0b91d2929e01f56b9c81"
  }
}
```

---

### `GET /api/v1/auth/verify`
Verify if current session / token is valid.

- **Headers**: `Authorization: Bearer <your_access_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "User verified successfully",
  "user": {
    "name": "Kundu Admin",
    "email": "admin@kunduagro.com",
    "role": "Admin",
    "status": "Active",
    "phone": "+880 1711-000001",
    "id": "66ca0b91d2929e01f56b9c81"
  }
}
```

---

### `POST /api/v1/auth/admin/changepassword`
Change own password (logged-in user).

- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your_access_token>`
- **Request Body (Demo)**:
```json
{
  "oldPassword": "AdminPassword123!",
  "newPassword": "NewAdminPassword2026!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### `GET /api/v1/auth/logout`
Log out and clear cookies.

- **Headers**: `Authorization: Bearer <your_access_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "User logged out successfully"
}
```

---

## 3. Dashboard Statistics (`/api/v1/admin`)

### `GET /api/v1/admin/stats`
Get aggregated statistics and breakdowns for the Admin Dashboard.

- **Headers**: `Authorization: Bearer <your_admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "products": 12,
      "availableProducts": 10,
      "users": 5,
      "blogs": 4,
      "orders": 0
    },
    "breakdown": {
      "roles": {
        "Admin": 1,
        "Manager": 1,
        "Staff": 1,
        "Customer": 2
      },
      "statuses": {
        "Active": 4,
        "Inactive": 1
      }
    },
    "recent": {
      "products": [ /* recent 5 products */ ],
      "users": [ /* recent 5 users */ ]
    }
  }
}
```

---

## 4. Products Management (`/api/v1/products`)

### `GET /api/v1/products`
Retrieve products with search, filtering, and pagination.

- **Query Parameters (Optional)**:
  - `search`: Search query across name, description, category (e.g. `?search=fish`)
  - `category`: Filter by category (e.g. `?category=Fish feed / raw materials`)
  - `unit`: Filter by unit (`kg`, `gram`, `litre`, `piece`, `dozen`, `pack`)
  - `minPrice`: Filter minimum price (e.g. `?minPrice=100`)
  - `maxPrice`: Filter maximum price (e.g. `?maxPrice=1000`)
  - `isAvailable`: Filter availability (`true` / `false`)
  - `sort`: Sorting options: `price_asc`, `price_desc`, `name_asc`, `name_desc`, `oldest` (default: newest)
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `50`)

- **Example Request**:
`GET {{base_url}}/products?category=Human food&page=1&limit=10`

- **Response `200 OK`**:
```json
{
  "success": true,
  "total": 1,
  "page": 1,
  "totalPages": 1,
  "count": 1,
  "data": [
    {
      "name": "Fresh Rui Fish",
      "slug": "fresh-rui-fish",
      "description": "High quality fresh river Rui fish harvested directly from local ponds.",
      "category": "Human food",
      "unit": "kg",
      "price": 380,
      "compareAtPrice": 420,
      "thumbnail": "/uploads/products/1787527061739-rui.png",
      "images": [],
      "video": null,
      "isAvailable": true,
      "createdAt": "2026-08-24T12:00:00.000Z",
      "updatedAt": "2026-08-24T12:00:00.000Z",
      "id": "66ca0b91d2929e01f56b9c90"
    }
  ]
}
```

---

### `GET /api/v1/products/:idOrSlug`
Fetch a single product by either MongoDB `_id` or `slug`.

- **Example Request**: `GET {{base_url}}/products/fresh-rui-fish`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "name": "Fresh Rui Fish",
    "slug": "fresh-rui-fish",
    "description": "High quality fresh river Rui fish harvested directly from local ponds.",
    "category": "Human food",
    "unit": "kg",
    "price": 380,
    "compareAtPrice": 420,
    "thumbnail": "/uploads/products/1787527061739-rui.png",
    "isAvailable": true,
    "id": "66ca0b91d2929e01f56b9c90"
  }
}
```

---

### `POST /api/v1/products` (Admin Only)
Create a new product with image thumbnail.

- **Headers**:
  - `Authorization: Bearer <your_admin_token>`
  - `Content-Type: multipart/form-data` *(Leave Postman to set boundary automatically)*

- **Postman `form-data` Body**:
| Key | Type | Value (Demo) |
|---|---|---|
| `name` | Text | `Premium Fish Feed Growth Booster` |
| `description` | Text | `Nutritious floating pellet feed for commercial aquaculture.` |
| `category` | Text | `Fish feed / raw materials` |
| `unit` | Text | `kg` |
| `price` | Text / Number | `1250` |
| `compareAtPrice` | Text / Number | `1400` |
| `isAvailable` | Text | `true` |
| `thumbnail` | **File** | *(Select an image file e.g. feed.jpg)* |

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "“Premium Fish Feed Growth Booster” has been added.",
  "data": {
    "name": "Premium Fish Feed Growth Booster",
    "slug": "premium-fish-feed-growth-booster",
    "description": "Nutritious floating pellet feed for commercial aquaculture.",
    "category": "Fish feed / raw materials",
    "unit": "kg",
    "price": 1250,
    "compareAtPrice": 1400,
    "thumbnail": "/uploads/products/1787550000000-feed.jpg",
    "isAvailable": true,
    "createdAt": "2026-08-24T16:30:00.000Z",
    "id": "66ca1029d2929e01f56b9ca5"
  }
}
```

---

### `PATCH` / `PUT /api/v1/products/:id` (Admin Only)
Update product fields and optionally replace the thumbnail image.

- **Headers**:
  - `Authorization: Bearer <your_admin_token>`
  - `Content-Type: multipart/form-data` or `application/json`

- **Postman `form-data` or JSON Body (Demo)**:
```json
{
  "price": 1200,
  "compareAtPrice": 1350,
  "isAvailable": true
}
```
*(If a new `thumbnail` file is uploaded in form-data, the previous file is automatically deleted from disk)*

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": "66ca1029d2929e01f56b9ca5",
    "name": "Premium Fish Feed Growth Booster",
    "slug": "premium-fish-feed-growth-booster",
    "price": 1200,
    "compareAtPrice": 1350,
    "thumbnail": "/uploads/products/1787550000000-feed.jpg"
  }
}
```

---

### `DELETE /api/v1/products/:id` (Admin Only)
Delete a product by MongoDB ID or slug.

- **Headers**: `Authorization: Bearer <your_admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "deletedId": "66ca1029d2929e01f56b9ca5"
}
```

---

## 5. Blogs Management (`/api/v1/blogs`)

### `GET /api/v1/blogs`
Retrieve blog posts with search and filtering.

- **Query Parameters (Optional)**:
  - `search`: Search title, description, or tags (e.g. `?search=aquaculture`)
  - `tag`: Filter by tag (e.g. `?tag=Fisheries`)
  - `isPublished`: Filter published status (`true` / `false`)
  - `sort`: `title_asc`, `title_desc`, `oldest` (default: newest)
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `50`)

- **Response `200 OK`**:
```json
{
  "success": true,
  "total": 1,
  "page": 1,
  "totalPages": 1,
  "count": 1,
  "data": [
    {
      "title": "Modern Carp Hatchery Management Guide",
      "slug": "modern-carp-hatchery-management-guide",
      "description": "Key principles and bio-security protocols for high yield carp breeding in Bangladesh.",
      "content": "Full article content in markdown or HTML format...",
      "thumbnail": "/uploads/blogs/1787551000000-carp-breeding.jpg",
      "videoUrl": "https://www.youtube.com/watch?v=sample",
      "tags": ["Fisheries", "Hatchery", "Breeding"],
      "isPublished": true,
      "createdAt": "2026-08-24T14:00:00.000Z",
      "id": "66ca1201d2929e01f56b9cc0"
    }
  ]
}
```

---

### `GET /api/v1/blogs/:idOrSlug`
Fetch a single blog post by ID or Slug.

- **Example Request**: `GET {{base_url}}/blogs/modern-carp-hatchery-management-guide`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "title": "Modern Carp Hatchery Management Guide",
    "slug": "modern-carp-hatchery-management-guide",
    "description": "Key principles and bio-security protocols for high yield carp breeding in Bangladesh.",
    "content": "Full article content in markdown or HTML format...",
    "thumbnail": "/uploads/blogs/1787551000000-carp-breeding.jpg",
    "videoUrl": "https://www.youtube.com/watch?v=sample",
    "tags": ["Fisheries", "Hatchery", "Breeding"],
    "isPublished": true,
    "id": "66ca1201d2929e01f56b9cc0"
  }
}
```

---

### `POST /api/v1/blogs` (Admin Only)
Publish a new blog post with thumbnail image and optional video file.

- **Headers**:
  - `Authorization: Bearer <your_admin_token>`
  - `Content-Type: multipart/form-data`

- **Postman `form-data` Body**:
| Key | Type | Value (Demo) |
|---|---|---|
| `title` | Text | `Modern Carp Hatchery Management Guide` |
| `description` | Text | `Key principles and bio-security protocols for high yield carp breeding.` |
| `content` | Text | `Detailed article explaining pond preparation, water quality parameters...` |
| `tags` | Text | `Fisheries, Hatchery, Breeding` |
| `videoUrl` | Text (Optional) | `https://www.youtube.com/watch?v=sample` |
| `thumbnail` | **File** | *(Select an image <= 5MB)* |
| `videoFile` | **File (Optional)** | *(Select an MP4/WebM video <= 50MB)* |

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "“Modern Carp Hatchery Management Guide” has been published.",
  "data": {
    "title": "Modern Carp Hatchery Management Guide",
    "slug": "modern-carp-hatchery-management-guide",
    "description": "Key principles and bio-security protocols for high yield carp breeding.",
    "content": "Detailed article explaining pond preparation, water quality parameters...",
    "thumbnail": "/uploads/blogs/1787551000000-carp-breeding.jpg",
    "videoUrl": "https://www.youtube.com/watch?v=sample",
    "tags": ["Fisheries", "Hatchery", "Breeding"],
    "isPublished": true,
    "id": "66ca1201d2929e01f56b9cc0"
  }
}
```

---

### `PATCH` / `PUT /api/v1/blogs/:id` (Admin Only)
Update blog post content, thumbnail, or video.

- **Headers**:
  - `Authorization: Bearer <your_admin_token>`
  - `Content-Type: multipart/form-data` or `application/json`

- **Demo Body**:
```json
{
  "title": "Updated Modern Carp Hatchery Management Guide",
  "tags": ["Fisheries", "Hatchery", "Breeding", "Featured"],
  "isPublished": true
}
```

---

### `DELETE /api/v1/blogs/:id` (Admin Only)
Delete a blog post and its uploaded media files.

- **Headers**: `Authorization: Bearer <your_admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Blog deleted successfully",
  "deletedId": "66ca1201d2929e01f56b9cc0"
}
```

---

## 6. Users Management (`/api/v1/users`)

All `/api/v1/users` routes require `Admin` authorization.

### `GET /api/v1/users`
List all users with search, role/status filtering, and pagination.

- **Headers**: `Authorization: Bearer <your_admin_token>`
- **Query Parameters (Optional)**:
  - `search`: Search name, email, phone (e.g. `?search=rahim`)
  - `role`: Filter by role (`Admin`, `Manager`, `Staff`, `Customer`)
  - `status`: Filter by status (`Active`, `Inactive`)
  - `page`: Page number (default: `1`)
  - `limit`: Limit per page (default: `50`)

- **Response `200 OK`**:
```json
{
  "success": true,
  "total": 5,
  "page": 1,
  "totalPages": 1,
  "count": 5,
  "users": [
    {
      "id": "66ca0b91d2929e01f56b9c81",
      "name": "Kundu Admin",
      "email": "admin@kunduagro.com",
      "role": "Admin",
      "status": "Active",
      "phone": "+880 1711-000001",
      "createdAt": "2026-01-10T08:00:00.000Z"
    },
    {
      "id": "66ca0b91d2929e01f56b9c82",
      "name": "Animesh Kundu",
      "email": "animesh@kunduagro.com",
      "role": "Manager",
      "status": "Active",
      "phone": "+880 1712-345678",
      "createdAt": "2026-01-15T10:30:00.000Z"
    },
    {
      "id": "66ca0b91d2929e01f56b9c83",
      "name": "Rahim Ahmed",
      "email": "rahim.ahmed@gmail.com",
      "role": "Customer",
      "status": "Active",
      "phone": "+880 1819-112233",
      "createdAt": "2026-02-01T14:15:00.000Z"
    },
    {
      "id": "66ca0b91d2929e01f56b9c84",
      "name": "Tania Sultana",
      "email": "tania.s@yahoo.com",
      "role": "Customer",
      "status": "Active",
      "phone": "+880 1912-887766",
      "createdAt": "2026-02-12T11:45:00.000Z"
    },
    {
      "id": "66ca0b91d2929e01f56b9c85",
      "name": "Biplob Hasan",
      "email": "biplob.staff@kunduagro.com",
      "role": "Staff",
      "status": "Inactive",
      "phone": "+880 1611-445566",
      "createdAt": "2026-02-20T09:20:00.000Z"
    }
  ]
}
```

---

### `GET /api/v1/users/:id`
Get single user details by MongoDB ID.

- **Headers**: `Authorization: Bearer <your_admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "user": {
    "id": "66ca0b91d2929e01f56b9c83",
    "name": "Rahim Ahmed",
    "email": "rahim.ahmed@gmail.com",
    "role": "Customer",
    "status": "Active",
    "phone": "+880 1819-112233",
    "createdAt": "2026-02-01T14:15:00.000Z"
  }
}
```

---

### `POST /api/v1/users`
Create a new user directly as an Admin.

- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your_admin_token>`
- **Request Body (Demo)**:
```json
{
  "name": "Farhan Kabir",
  "email": "farhan@kunduagro.com",
  "password": "Password123!",
  "role": "Staff",
  "status": "Active",
  "phone": "+880 1715-998877"
}
```

---

### `PATCH` / `PUT /api/v1/users/:id`
Update a user's role, status, name, email, or phone.

- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your_admin_token>`
- **Request Body (Demo)**:
```json
{
  "role": "Manager",
  "status": "Active",
  "phone": "+880 1715-112233"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": "66ca0b91d2929e01f56b9c83",
    "name": "Rahim Ahmed",
    "email": "rahim.ahmed@gmail.com",
    "role": "Manager",
    "status": "Active",
    "phone": "+880 1715-112233"
  }
}
```

---

### `POST /api/v1/users/:id/change-password`
Admin update a specific user's password.

- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your_admin_token>`
- **Request Body (Demo)**:
```json
{
  "newPassword": "NewGeneratedSecurePass123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "User password updated successfully"
}
```

---

### `DELETE /api/v1/users/:id`
Delete a user from the system.

- **Headers**: `Authorization: Bearer <your_admin_token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "User deleted successfully",
  "deletedId": "66ca0b91d2929e01f56b9c85"
}
```

---

## 7. Common Error Responses

### `400 Bad Request`
Validation failed or missing required fields.
```json
{
  "success": false,
  "message": "Product name is required"
}
```

### `401 Unauthorized`
Missing or invalid authentication token.
```json
{
  "success": false,
  "message": "Authentication required. Please log in."
}
```

### `403 Forbidden`
Insufficient permissions (e.g. Customer attempting Admin action or Inactive account).
```json
{
  "success": false,
  "message": "Forbidden: Admin access required"
}
```

### `404 Not Found`
Resource does not exist.
```json
{
  "success": false,
  "message": "Product not found"
}
```
