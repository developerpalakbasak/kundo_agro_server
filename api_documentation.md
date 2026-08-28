# Kundu Agro & Fisheries - Backend API Documentation

Complete REST API documentation for the **Kundu Agro & Fisheries** backend server, including endpoint details, authentication methods, role-based permissions, request payloads, and query parameters.

---

## 🌐 Base URL & Server Info

- **Base URL**: `http://localhost:8000/api/v1` (or your configured `PORT` in `.env`)
- **Static Uploads URL**: `http://localhost:8000/uploads`
- **Content-Type**:
  - JSON Endpoints: `application/json`
  - Upload Endpoints (Products & Blogs): `multipart/form-data`

---

## 🔐 Role-Based Access Control (RBAC) Matrix

The system defines 4 roles (`user.model.js:L28`):

| Role | Description & Privileges |
|---|---|
| **Admin** | Full system access: User management (create, update, delete, reset passwords), Order management, Product & Blog full CRUD, view full analytics & revenue. |
| **Manager** | Operational management: Product & Blog full CRUD, Order management & status updates, User read-only access, view dashboard statistics. |
| **Staff** | Daily operations: View and update Order statuses, create/edit Products and Blogs, view dashboard. Cannot manage users or delete catalog items. |
| **Customer** | End user: Browse public products and blogs, submit fish seed seller listings, place orders, track personal orders, manage own profile. |

---

## 📑 API Endpoints Summary

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register new customer / user | Public / Admin |
| `POST` | `/auth/login` | Login with email/phone & password | Public |
| `GET/POST` | `/auth/logout` | Logout & clear session cookies | Authenticated |
| `GET` | `/auth/me` | Get current logged-in user profile | Authenticated |
| `GET` | `/auth/verify` | Verify session token | Authenticated |
| `POST/PUT` | `/auth/changepassword` | Change own password | Authenticated |

### 2. Customer / Authenticated User (`/api/v1/user`)
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET` | `/user/profile` | Get my profile details | Authenticated |
| `PUT/PATCH` | `/user/profile` | Update my profile (name, phone, avatar) | Authenticated |
| `PUT` | `/user/change-password` | Change my password | Authenticated |
| `GET` | `/user/orders` | Get my order history | Authenticated Customer |
| `GET` | `/user/orders/:id` | Get details of my specific order | Authenticated Customer |
| `POST` | `/user/products/fish-seed` | Submit fish-seed / pond seller listing | Public / Customer |

### 3. Public Products (`/api/v1/products`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/products` | List products with filters, search, sort | Public |
| `GET` | `/products/categories` | Get all product categories | Public |
| `GET` | `/products/:idOrSlug` | Get single product by ID or Slug | Public |
| `POST` | `/products/fish-seed` | Submit fish seed listing | Public / Customer |

### 4. Public Blogs (`/api/v1/blogs`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/blogs` | List published blogs with filters, search | Public |
| `GET` | `/blogs/tags` | Get all blog tags | Public |
| `GET` | `/blogs/:idOrSlug` | Get single blog by ID or Slug | Public |

### 5. Orders & Checkout (`/api/v1/orders`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/orders` | Place a new order (Checkout) | Public / Customer |
| `GET` | `/orders/my-orders` | Get current user's orders | Authenticated |
| `GET` | `/orders/track/:id` | Track order by Order ID or MongoDB ID | Public |

### 6. Admin / Staff / Manager (`/api/v1/admin`)
| Category | Method | Endpoint | Description | Role Allowed |
|---|---|---|---|---|
| **Dashboard** | `GET` | `/admin/dashboard/stats` | Overview statistics & revenue | Staff, Manager, Admin |
| **Products** | `GET` | `/admin/products` | List all inventory products | Staff, Manager, Admin |
| **Products** | `GET` | `/admin/products/:idOrSlug` | Get product details | Staff, Manager, Admin |
| **Products** | `POST` | `/admin/products` | Create product (multipart) | Staff, Manager, Admin |
| **Products** | `PUT/PATCH`| `/admin/products/:id` | Update product & thumbnail | Staff, Manager, Admin |
| **Products** | `DELETE`| `/admin/products/:id` | Delete product | Manager, Admin |
| **Blogs** | `GET` | `/admin/blogs` | List all blog articles | Staff, Manager, Admin |
| **Blogs** | `POST` | `/admin/blogs` | Create blog (thumbnail & video) | Staff, Manager, Admin |
| **Blogs** | `PUT/PATCH`| `/admin/blogs/:id` | Update blog article | Staff, Manager, Admin |
| **Blogs** | `DELETE`| `/admin/blogs/:id` | Delete blog article | Manager, Admin |
| **Orders** | `GET` | `/admin/orders` | List all customer orders | Staff, Manager, Admin |
| **Orders** | `GET` | `/admin/orders/:id` | Get order details | Staff, Manager, Admin |
| **Orders** | `PATCH/PUT`| `/admin/orders/:id/status`| Update order status | Staff, Manager, Admin |
| **Orders** | `DELETE`| `/admin/orders/:id` | Delete order record | Manager, Admin |
| **Users** | `GET` | `/admin/users` | List users (filters by role/status) | Manager, Admin |
| **Users** | `GET` | `/admin/users/:id` | Get user profile | Manager, Admin |
| **Users** | `POST` | `/admin/users` | Create staff/manager/customer | Admin only |
| **Users** | `PUT/PATCH`| `/admin/users/:id` | Update user role, status | Admin only |
| **Users** | `DELETE`| `/admin/users/:id` | Delete user | Admin only |
| **Users** | `POST` | `/admin/users/:id/change-password` | Reset user password | Admin only |

---

## 🛠️ Detailed Endpoint Specifications & Payloads

### 1. Health Check
#### `GET /api/v1`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Kundu Agro & Fisheries API is LIVE",
  "timestamp": "2026-08-28T09:20:00.000Z"
}
```

---

### 2. Authentication

#### `POST /api/v1/auth/register`
- **Body**:
```json
{
  "name": "Customer User",
  "email": "customer@example.com",
  "password": "Password123!",
  "phone": "01700-000000"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "66ce78901234567890abcdef",
    "name": "Customer User",
    "email": "customer@example.com",
    "role": "Customer",
    "status": "Active",
    "phone": "01700-000000"
  }
}
```

#### `POST /api/v1/auth/login`
- **Body**:
```json
{
  "email": "admin@kunduagro.com",
  "password": "AdminPassword123!"
}
```
*(Supports `email`, `phone`, `identifier`)*
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "66ce78901234567890abcdef",
    "name": "Kundu Admin",
    "email": "admin@kunduagro.com",
    "role": "Admin",
    "status": "Active",
    "phone": "01711-000001"
  }
}
```

---

### 3. Orders & Checkout

#### `POST /api/v1/orders`
- **Body**:
```json
{
  "customerName": "Md. Alim Hossain",
  "phone": "01712-345678",
  "address": "House 14, Road 5, Block B, Mirpur",
  "city": "Dhaka",
  "notes": "Please call before delivery",
  "paymentMethod": "Cash on Delivery",
  "deliveryFee": 0,
  "items": [
    {
      "product": "66ce78901234567890abcdef",
      "name": "Fresh Rui Fish (রুই মাছ)",
      "thumbnail": "/uploads/products/rui.jpg",
      "price": 450,
      "quantity": 3,
      "unit": "kg"
    },
    {
      "name": "Organic Bio-Fertilizer (জৈব সার)",
      "thumbnail": "/uploads/products/fertilizer.jpg",
      "price": 1050,
      "quantity": 2,
      "unit": "bag (25kg)"
    }
  ]
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Order placed successfully.",
  "order": {
    "id": "66ce99901234567890abcdef",
    "orderId": "ORD-2026-8841",
    "customerName": "Md. Alim Hossain",
    "phone": "01712-345678",
    "address": "House 14, Road 5, Block B, Mirpur",
    "city": "Dhaka",
    "paymentMethod": "Cash on Delivery",
    "paymentStatus": "pending",
    "status": "processing",
    "subtotal": 3450,
    "deliveryFee": 0,
    "total": 3450,
    "date": "2026-08-28"
  }
}
```

#### `PATCH /api/v1/admin/orders/:id/status`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "status": "shipped",
  "paymentStatus": "paid"
}
```
*(Valid statuses: `"processing"`, `"shipped"`, `"delivered"`, `"cancelled"`)*

---

### 4. Admin Dashboard Analytics

#### `GET /api/v1/admin/dashboard/stats`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "products": 45,
      "availableProducts": 42,
      "users": 120,
      "blogs": 18,
      "orders": 85,
      "totalRevenue": 348500
    },
    "breakdown": {
      "roles": {
        "Admin": 2,
        "Manager": 4,
        "Staff": 10,
        "Customer": 104
      },
      "userStatuses": {
        "Active": 118,
        "Inactive": 2
      },
      "orderStatuses": {
        "processing": 12,
        "shipped": 8,
        "delivered": 62,
        "cancelled": 3
      }
    },
    "recent": {
      "orders": [...],
      "products": [...],
      "users": [...]
    }
  }
}
```
