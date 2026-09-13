# Kundu Agro & Fisheries - Postman API Testing Guide & Payloads

This document contains all categorized API endpoints, HTTP methods, authorization requirements, headers, query parameters, and ready-to-use request payloads for API testing in Postman.

---

## 🛠️ Postman Environment Setup

Create an Environment in Postman (e.g. `Kundu Agro Local`) and add the following variables:

| Variable Name | Initial / Current Value | Description |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:8000` | Backend API base URL |
| `accessToken` | `(leave blank initially)` | JWT token saved after login |
| `productId` | `(sample product id/slug)` | Saved from product endpoints |
| `blogId` | `(sample blog id/slug)` | Saved from blog endpoints |
| `orderId` | `(sample order id or ORD-2026-xxxx)` | Saved from order checkout |
| `userId` | `(sample user id)` | Saved from user management |

### Global Authorization Setup in Postman
- **Collection / Request Auth Type**: `Bearer Token`
- **Token**: `{{accessToken}}`
- **Default Headers**:
  - `Content-Type: application/json`

---

## 1. System & Health Check

### `GET` Health Check
- **URL**: `{{baseUrl}}/api/v1`
- **Auth**: None (Public)
- **Sample Success Response**:
```json
{
  "success": true,
  "message": "Kundu Agro & Fisheries API is LIVE",
  "timestamp": "2026-08-28T10:00:00.000Z"
}
```

---

## 2. Authentication & Session (`/api/v1/auth`)

### `POST` Register New User / Customer
- **URL**: `{{baseUrl}}/api/v1/auth/register` *(or legacy `{{baseUrl}}/api/v1/auth/user/register`)*
- **Auth**: Public (Optional Auth: Admin token allows setting `role` and `status`)
- **Headers**: `Content-Type: application/json`
- **Request Body (JSON)**:
```json
{
  "name": "Rahim Ahmed",
  "email": "rahim@example.com",
  "password": "Password123",
  "phone": "01712345678",
  "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
}
```

### `POST` User / Staff / Admin Login
- **URL**: `{{baseUrl}}/api/v1/auth/login`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body (JSON - Email login)**:
```json
{
  "email": "rahim@example.com",
  "password": "Password123"
}
```
*Or login using Phone Number:*
```json
{
  "identifier": "01712345678",
  "password": "Password123"
}
```
> **Postman Test Script**: Under the **Tests** tab of your Login request in Postman, add:
> ```javascript
> if (pm.response.code === 200) {
>     const res = pm.response.json();
>     // Set cookie or token variable
>     if (res.token) {
>         pm.environment.set("accessToken", res.token);
>     }
> }
> ```

### `GET` Get Authenticated User Profile (Me)
- **URL**: `{{baseUrl}}/api/v1/auth/me`
- **Auth**: `Bearer {{accessToken}}` (Customer / Seller / Admin)

### `GET` Verify Session Token
- **URL**: `{{baseUrl}}/api/v1/auth/verify`
- **Auth**: `Bearer {{accessToken}}`

### `POST` / `GET` Refresh Session Token
- **URL**: `{{baseUrl}}/api/v1/auth/refresh` *(or `POST {{baseUrl}}/api/v1/auth/refresh-token`)*
- **Auth**: Cookie `refreshToken` or Header `x-refresh-token` or JSON body `{"refreshToken": "..."}`
- **Description**: Automatically issues a new `accessToken` and updates the cookies.

### `POST` / `PUT` Change Own Password
- **URL**: `{{baseUrl}}/api/v1/auth/changepassword` *(or legacy `POST {{baseUrl}}/api/v1/auth/admin/changepassword`)*
- **Auth**: `Bearer {{accessToken}}`
- **Request Body (JSON)**:
```json
{
  "oldPassword": "Password123",
  "newPassword": "NewPassword123"
}
```

### `POST` / `GET` Logout
- **URL**: `{{baseUrl}}/api/v1/auth/logout`
- **Auth**: Public / Authenticated

---

## 3. Customer Profile & Personal Portal (`/api/v1/user`)

### `GET` Get Customer Profile
- **URL**: `{{baseUrl}}/api/v1/user/profile`
- **Auth**: `Bearer {{accessToken}}`

### `PUT` / `PATCH` Update Customer Profile
- **URL**: `{{baseUrl}}/api/v1/user/profile`
- **Auth**: `Bearer {{accessToken}}`
- **Request Body (JSON)**:
```json
{
  "name": "Rahim Ahmed Basak",
  "phone": "01712345678",
  "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
}
```

### `PUT` Change Password via User Route
- **URL**: `{{baseUrl}}/api/v1/user/change-password`
- **Auth**: `Bearer {{accessToken}}`
- **Request Body (JSON)**:
```json
{
  "oldPassword": "Password123",
  "newPassword": "UpdatedPassword456"
}
```

### `GET` Get My Order History
- **URL**: `{{baseUrl}}/api/v1/user/orders`
- **Auth**: `Bearer {{accessToken}}`

### `GET` Get Single Order by Tracking ID / Mongo ID
- **URL**: `{{baseUrl}}/api/v1/user/orders/ORD-2026-8841`
- **Auth**: `Bearer {{accessToken}}`

### `POST` Seller / Customer Submit Fish-Seed Listing
- **URL**: `{{baseUrl}}/api/v1/user/products/fish-seed`
- **Auth**: Public or `Bearer {{accessToken}}` (Optional)
- **Body Type**: `application/json` or `multipart/form-data`
- **Request Body (JSON)**:
```json
{
  "name": "Ruhi Fish Seed / রুই মাছের পোনা (3 inch)",
  "description": "High quality disease-free Ruhi fry ready for pond culture.",
  "price": 2.5,
  "unit": "piece",
  "sellerName": "Md. Rafiqul Islam",
  "sellerDistrict": "Bogura",
  "sellerPhone": "01700112233",
  "imageUrl": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80"
}
```
*(If using `multipart/form-data`, pass field `thumbnail` as File)*

---

## 4. Products Catalog (`/api/v1/products`)

### `GET` Get All Products (With Filters & Pagination)
- **URL**: `{{baseUrl}}/api/v1/products`
- **Auth**: None (Public)
- **Query Parameters**:
  - `page`: `1`
  - `limit`: `20`
  - `search`: `carp`
  - `category`: `Fish seed / মাছের পোনা` *(or `Fisheries medicine / chemical`, `Dairy medicine`, `Human food`, `Fish feed / raw materials`, `Dairy feed / raw materials`, `Import items`)*
  - `unit`: `kg`
  - `minPrice`: `50`
  - `maxPrice`: `5000`
  - `isAvailable`: `true`
  - `sort`: `price_asc` *(options: `price_asc`, `price_desc`, `name_asc`, `name_desc`, `oldest`)*

### `GET` Get Product Categories List
- **URL**: `{{baseUrl}}/api/v1/products/categories`
- **Auth**: None (Public)

### `GET` Get Single Product by ID or Slug
- **URL**: `{{baseUrl}}/api/v1/products/premium-fish-feed-grower-20kg` *(or MongoDB `_id`)*
- **Auth**: None (Public)

### `POST` Public / Seller Fish-Seed Submission
- **URL**: `{{baseUrl}}/api/v1/products/fish-seed`
- **Auth**: Public (Optional Auth)
- **Request Body**: Same as Fish Seed payload above.

### `POST` Create New Product (Seller / Admin)
- **URL**: `{{baseUrl}}/api/v1/products` *(or `POST {{baseUrl}}/api/v1/admin/products`)*
- **Auth**: `Bearer {{accessToken}}` (Role: `Seller`, `Admin`)
- **Body Type**: `application/json` or `multipart/form-data`
- **Request Body (JSON)**:
```json
{
  "name": "Floating Fish Feed Grower 20kg",
  "description": "28% protein floating pellets formulated for fast fish growth and clean water maintenance.",
  "category": "Fish feed / raw materials",
  "unit": "packet",
  "price": 2450,
  "compareAtPrice": 2650,
  "thumbnail": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80",
  "video": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "sellerName": "Kundu Agro",
  "sellerDistrict": "Mymensingh",
  "sellerPhone": "01711223344",
  "isAvailable": true
}
```

### `PUT` / `PATCH` Update Product (Seller / Admin)
- **URL**: `{{baseUrl}}/api/v1/products/{{productId}}`
- **Auth**: `Bearer {{accessToken}}` (Role: `Seller`, `Admin`)
- **Request Body (JSON)**:
```json
{
  "name": "Floating Fish Feed Grower 20kg (Updated)",
  "price": 2390,
  "compareAtPrice": 2600,
  "isAvailable": true
}
```

### `DELETE` Delete Product (Admin only)
- **URL**: `{{baseUrl}}/api/v1/products/{{productId}}`
- **Auth**: `Bearer {{accessToken}}` (Role: `Admin`)

---

## 5. Blogs & Articles (`/api/v1/blogs`)

### `GET` Get All Blogs (Filtered & Paginated)
- **URL**: `{{baseUrl}}/api/v1/blogs`
- **Auth**: None (Public)
- **Query Parameters**:
  - `page`: `1`
  - `limit`: `10`
  - `search`: `aquaculture`
  - `tag`: `fish-farming`
  - `isPublished`: `true`
  - `sort`: `title_asc` *(options: `title_asc`, `title_desc`, `oldest`)*

### `GET` Get Blog Tags List
- **URL**: `{{baseUrl}}/api/v1/blogs/tags`
- **Auth**: None (Public)

### `GET` Get Single Blog by ID or Slug
- **URL**: `{{baseUrl}}/api/v1/blogs/complete-guide-to-pond-preparation` *(or MongoDB `_id`)*
- **Auth**: None (Public)

### `POST` Create Blog Post (Seller / Admin)
- **URL**: `{{baseUrl}}/api/v1/blogs` *(or `POST {{baseUrl}}/api/v1/admin/blogs`)*
- **Auth**: `Bearer {{accessToken}}` (Role: `Seller`, `Admin`)
- **Body Type**: `application/json` or `multipart/form-data`
- **Request Body (JSON)**:
```json
{
  "title": "Complete Guide to Pond Preparation for Fish Farming",
  "description": "Essential lime dosing, drying, and plankton bloom management before stocking fish seed.",
  "content": "Pond preparation is the most critical foundation for successful fish farming. First, drain and dry the pond bed. Second, apply agricultural lime (CaCO3) at 1kg per decimal. Third, fill with water and apply organic manure to bloom phytoplankton...",
  "thumbnail": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
  "videoUrl": "https://www.youtube.com/watch?v=sample-video",
  "tags": ["aquaculture", "pond-care", "fish-farming", "kundu-tips"],
  "isPublished": true
}
```
*(If using `multipart/form-data`: field `thumbnail` [File], field `videoFile` [File])*

### `PUT` / `PATCH` Update Blog Post (Seller / Admin)
- **URL**: `{{baseUrl}}/api/v1/blogs/{{blogId}}`
- **Auth**: `Bearer {{accessToken}}` (Role: `Seller`, `Admin`)
- **Request Body (JSON)**:
```json
{
  "title": "Complete Guide to Pond Preparation (2026 Updated)",
  "isPublished": true,
  "tags": ["aquaculture", "pond-care", "tips-2026"]
}
```

### `DELETE` Delete Blog Post (Admin only)
- **URL**: `{{baseUrl}}/api/v1/blogs/{{blogId}}`
- **Auth**: `Bearer {{accessToken}}` (Role: `Admin`)

---

## 6. Orders & Checkout (`/api/v1/orders`)

### `POST` Place New Order / Checkout (Public / Customer)
- **URL**: `{{baseUrl}}/api/v1/orders`
- **Auth**: Public *(or pass `Bearer {{accessToken}}` to automatically bind to logged-in user profile)*
- **Headers**: `Content-Type: application/json`
- **Request Body (JSON)**:
```json
{
  "customerName": "Tanvir Hasan",
  "phone": "01912345678",
  "address": "House #14, Road #3, Sector 7, Uttara",
  "city": "Dhaka",
  "notes": "Please call before delivery",
  "paymentMethod": "Cash on Delivery",
  "deliveryFee": 120,
  "items": [
    {
      "product": "66ce00000000000000000001",
      "name": "Ruhi Fish Seed (1000 pcs)",
      "thumbnail": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80",
      "price": 1500,
      "quantity": 2,
      "unit": "packet"
    },
    {
      "product": "66ce00000000000000000002",
      "name": "Probiotic Pond Cleaner 1L",
      "thumbnail": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80",
      "price": 850,
      "quantity": 1,
      "unit": "bottle"
    }
  ]
}
```

### `GET` Track Order (Public Tracking)
- **URL**: `{{baseUrl}}/api/v1/orders/track/ORD-2026-8841` *(or `{{baseUrl}}/api/v1/orders/ORD-2026-8841`)*
- **Auth**: None (Public)

### `GET` Get Logged-in Customer Orders
- **URL**: `{{baseUrl}}/api/v1/orders/my-orders`
- **Auth**: `Bearer {{accessToken}}`

---

## 7. Dedicated Admin & Staff Portal (`/api/v1/admin`)

### 7.1 Dashboard & Statistics
- **URL**: `GET {{baseUrl}}/api/v1/admin/dashboard` *(or `GET {{baseUrl}}/api/v1/admin/dashboard/stats`, `GET {{baseUrl}}/api/v1/admin/stats`)*
- **Auth**: `Bearer {{accessToken}}` (Role: `Seller`, `Admin`)
- **Sample Success Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "products": 45,
      "availableProducts": 42,
      "users": 180,
      "blogs": 12,
      "orders": 85,
      "totalRevenue": 345200
    },
    "breakdown": {
      "roles": { "Admin": 2, "Seller": 8, "Customer": 170 },
      "userStatuses": { "Active": 178, "Inactive": 2 },
      "orderStatuses": { "processing": 12, "shipped": 18, "delivered": 50, "cancelled": 5 }
    },
    "recent": {
      "orders": [],
      "products": [],
      "users": []
    }
  }
}
```

---

### 7.2 Admin Order Management

#### `GET` Get All Orders with Filters & Pagination
- **URL**: `{{baseUrl}}/api/v1/admin/orders`
- **Auth**: `Bearer {{accessToken}}` (Seller, Admin)
- **Query Parameters**:
  - `page`: `1`
  - `limit`: `20`
  - `status`: `processing` *(options: `processing`, `shipped`, `delivered`, `cancelled`)*
  - `paymentStatus`: `pending` *(options: `pending`, `paid`, `failed`)*
  - `search`: `Tanvir` *(searches order ID, customer name, phone, city)*
  - `sort`: `total_desc` *(options: `oldest`, `total_desc`, `total_asc`)*

#### `GET` Get Single Order Full Details
- **URL**: `{{baseUrl}}/api/v1/admin/orders/ORD-2026-8841` *(or MongoDB `_id`)*
- **Auth**: `Bearer {{accessToken}}` (Seller, Admin)

#### `PATCH` / `PUT` Update Order Status & Payment
- **URL**: `{{baseUrl}}/api/v1/admin/orders/ORD-2026-8841/status` *(or `PATCH {{baseUrl}}/api/v1/admin/orders/ORD-2026-8841`)*
- **Auth**: `Bearer {{accessToken}}` (Seller, Admin)
- **Request Body (JSON)**:
```json
{
  "status": "shipped",
  "paymentStatus": "paid",
  "notes": "Parcel handed over to Sundarban Courier (CN# 994821)."
}
```

#### `DELETE` Delete Order
- **URL**: `{{baseUrl}}/api/v1/admin/orders/ORD-2026-8841`
- **Auth**: `Bearer {{accessToken}}` (Admin only)

---

### 7.3 Admin User Management (`/api/v1/admin/users` & `/api/v1/users`)

#### `GET` Get All Users (Filtered & Paginated)
- **URL**: `{{baseUrl}}/api/v1/admin/users` *(or `GET {{baseUrl}}/api/v1/users`)*
- **Auth**: `Bearer {{accessToken}}` (Admin only)
- **Query Parameters**:
  - `role`: `Seller` *(options: `Admin`, `Seller`, `Customer`)*
  - `status`: `Active` *(options: `Active`, `Inactive`)*
  - `search`: `rahim`
  - `page`: `1`
  - `limit`: `20`
  - `sort`: `name_asc` *(options: `oldest`, `name_asc`, `name_desc`)*

#### `GET` Get Single User Details by ID
- **URL**: `{{baseUrl}}/api/v1/admin/users/{{userId}}`
- **Auth**: `Bearer {{accessToken}}` (Admin only)

#### `POST` Create New User / Seller / Admin
- **URL**: `{{baseUrl}}/api/v1/admin/users`
- **Auth**: `Bearer {{accessToken}}` (Admin only)
- **Request Body (JSON)**:
```json
{
  "name": "Kamrul Hassan",
  "email": "kamrul.staff@kunduagro.com",
  "password": "StaffPassword123",
  "role": "Staff",
  "status": "Active",
  "phone": "01788990011",
  "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
}
```

#### `PUT` / `PATCH` Update User Details / Role / Status
- **URL**: `{{baseUrl}}/api/v1/admin/users/{{userId}}`
- **Auth**: `Bearer {{accessToken}}` (Admin only)
- **Request Body (JSON)**:
```json
{
  "name": "Kamrul Hassan (Seller)",
  "role": "Seller",
  "status": "Active",
  "phone": "01788990022"
}
```

#### `POST` Force-Reset User Password by Admin
- **URL**: `{{baseUrl}}/api/v1/admin/users/{{userId}}/change-password`
- **Auth**: `Bearer {{accessToken}}` (Admin only)
- **Request Body (JSON)**:
```json
{
  "newPassword": "ResetPassword123"
}
```

#### `DELETE` Delete User Account
- **URL**: `{{baseUrl}}/api/v1/admin/users/{{userId}}`
- **Auth**: `Bearer {{accessToken}}` (Admin only - cannot delete self)

---

## 8. Summary Route Table

| Category | HTTP Method | Endpoint | Auth Level |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/v1` | Public |
| **Auth** | `POST` | `/api/v1/auth/register` | Public / Admin (optional) |
| **Auth** | `POST` | `/api/v1/auth/login` | Public |
| **Auth** | `GET` / `POST` | `/api/v1/auth/logout` | Public / Authenticated |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated |
| **Auth** | `GET` | `/api/v1/auth/verify` | Authenticated |
| **Auth** | `POST` / `PUT` | `/api/v1/auth/changepassword` | Authenticated |
| **User** | `GET` | `/api/v1/user/profile` | Authenticated |
| **User** | `PUT` / `PATCH` | `/api/v1/user/profile` | Authenticated |
| **User** | `PUT` | `/api/v1/user/change-password` | Authenticated |
| **User** | `GET` | `/api/v1/user/orders` | Authenticated |
| **User** | `GET` | `/api/v1/user/orders/:id` | Authenticated |
| **User** | `POST` | `/api/v1/user/products/fish-seed` | Public / Authenticated |
| **Products** | `GET` | `/api/v1/products` | Public |
| **Products** | `GET` | `/api/v1/products/categories` | Public |
| **Products** | `GET` | `/api/v1/products/:idOrSlug` | Public |
| **Products** | `POST` | `/api/v1/products/fish-seed` | Public / Authenticated |
| **Products** | `POST` | `/api/v1/products` | Staff+ |
| **Products** | `PUT` / `PATCH` | `/api/v1/products/:id` | Staff+ |
| **Products** | `DELETE` | `/api/v1/products/:id` | Admin only |
| **Blogs** | `GET` | `/api/v1/blogs` | Public |
| **Blogs** | `GET` | `/api/v1/blogs/tags` | Public |
| **Blogs** | `GET` | `/api/v1/blogs/:idOrSlug` | Public |
| **Blogs** | `POST` | `/api/v1/blogs` | Seller+ |
| **Blogs** | `PUT` / `PATCH` | `/api/v1/blogs/:id` | Seller+ |
| **Blogs** | `DELETE` | `/api/v1/blogs/:id` | Admin only |
| **Orders** | `POST` | `/api/v1/orders` | Public / Authenticated |
| **Orders** | `GET` | `/api/v1/orders/track/:id` | Public |
| **Orders** | `GET` | `/api/v1/orders/my-orders` | Authenticated |
| **Admin Stats** | `GET` | `/api/v1/admin/dashboard` | Seller+ |
| **Admin Orders** | `GET` | `/api/v1/admin/orders` | Seller+ |
| **Admin Orders** | `GET` | `/api/v1/admin/orders/:id` | Seller+ |
| **Admin Orders** | `PATCH` / `PUT` | `/api/v1/admin/orders/:id/status` | Seller+ |
| **Admin Orders** | `DELETE` | `/api/v1/admin/orders/:id` | Admin only |
| **Admin Users** | `GET` | `/api/v1/admin/users` | Admin only |
| **Admin Users** | `GET` | `/api/v1/admin/users/:id` | Admin only |
| **Admin Users** | `POST` | `/api/v1/admin/users` | Admin only |
| **Admin Users** | `PUT` / `PATCH` | `/api/v1/admin/users/:id` | Admin only |
| **Admin Users** | `POST` | `/api/v1/admin/users/:id/change-password` | Admin only |
| **Admin Users** | `DELETE` | `/api/v1/admin/users/:id` | Admin only |
