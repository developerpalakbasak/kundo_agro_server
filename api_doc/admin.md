# Admin API Testing Guide (Postman)

This guide contains complete endpoints, HTTP methods, authorization requirements, and sample payloads for Admin operations, including **Seller Verification & Approval**, User Management, Dashboard Stats, Orders, and Catalog control.

---

## 🛠️ Postman Environment Setup

Create or switch to your Postman Environment and define:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:4000/api/v1` | Server base URL (Port 4000) |
| `adminToken` | `(leave blank initially)` | Populated after admin login |
| `targetUserId` | `(leave blank)` | ID of user/seller to manage/approve |
| `adminProductId` | `(leave blank)` | Product ID for admin operations |
| `adminOrderId` | `(leave blank)` | Order ID for status updates |

### Postman Script to Capture Admin Token
Under the **Tests** tab of your **Admin Login** request in Postman:
```javascript
if (pm.response.code === 200) {
    const json = pm.response.json();
    if (json.accessToken || json.token) {
        pm.environment.set("adminToken", json.accessToken || json.token);
    }
}
```

---

## 1. Admin Authentication (`/auth`)

### `POST` Admin Login
- **URL**: `{{baseUrl}}/auth/login`
- **Method**: `POST`
- **Auth**: None
- **Headers**:
  - `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "email": "admin@kundoagro.com",
  "password": "AdminPassword123"
}
```
*(Or use your seeded admin credentials)*

---

### `GET` Verify Admin Session & Permissions
- **URL**: `{{baseUrl}}/auth/me`
- **Method**: `GET`
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Authorization: Bearer {{adminToken}}`
- **Verification**: `role` must be `"Admin"`.

---

## 2. Seller Approval & Verification (`/admin/users/:id/approve-seller`)

### `PATCH` / `PUT` / `POST` Approve Seller Account
Approves a pending seller application and sets `"isVerifiedSeller": true`.

- **URL**: `{{baseUrl}}/admin/users/{{targetUserId}}/approve-seller`
- **Method**: `PATCH` *(or `PUT` / `POST`)*
- **Auth**: `Bearer {{adminToken}}` (Admin only)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON - Optional to specify status)**:
```json
{
  "isVerifiedSeller": true
}
```
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Seller “Kamrul Hassan Hatchery” approved successfully.",
  "user": {
    "id": "66df9876543210fedcba5678",
    "name": "Kamrul Hassan Hatchery",
    "email": "kamrul.hatchery@gmail.com",
    "role": "Seller",
    "status": "Active",
    "phone": "01788990011",
    "avatar": "https://images.unsplash.com/...",
    "isVerifiedSeller": true
  }
}
```

> **Tip**: To unapprove or revoke a seller, pass `{"isVerifiedSeller": false}` to the same endpoint.

---

## 3. User & Seller Management (`/admin/users`)

### `GET` List All Users (Filter by Role, Verification, Status)
- **URL**: `{{baseUrl}}/admin/users`
- **Method**: `GET`
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Authorization: Bearer {{adminToken}}`
- **Query Parameters**:
  - `role`: `Seller` *(options: `Admin`, `Seller`, `Customer`, `all`)*
  - `isVerifiedSeller`: `false` *(filter pending sellers: `false` or `true`)*
  - `status`: `Active` *(options: `Active`, `Inactive`, `all`)*
  - `search`: `hatchery`
  - `page`: `1`
  - `limit`: `20`
  - `sort`: `newest` *(options: `newest`, `oldest`, `name_asc`, `name_desc`)*

---

### `GET` Get Single User Details by ID
- **URL**: `{{baseUrl}}/admin/users/{{targetUserId}}`
- **Method**: `GET`
- **Auth**: `Bearer {{adminToken}}`

---

### `POST` Admin Create New User / Seller / Admin
- **URL**: `{{baseUrl}}/admin/users`
- **Method**: `POST`
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON)**:
```json
{
  "name": "Direct Verified Seller",
  "email": "direct.seller@padmahatchery.com",
  "password": "SecurePassword123",
  "role": "Seller",
  "status": "Active",
  "isVerifiedSeller": true,
  "phone": "01755443322"
}
```

---

### `PATCH` / `PUT` Update User Details & Roles
- **URL**: `{{baseUrl}}/admin/users/{{targetUserId}}`
- **Method**: `PATCH` *(or `PUT`)*
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON)**:
```json
{
  "name": "Kamrul Hassan Hatchery (VIP)",
  "role": "Seller",
  "status": "Active",
  "isVerifiedSeller": true,
  "phone": "01788990099"
}
```

---

### `PATCH` Update User Role Only
- **URL**: `{{baseUrl}}/admin/users/{{targetUserId}}/role`
- **Method**: `PATCH`
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON)**:
```json
{
  "role": "Seller"
}
```

---

### `POST` Force-Reset User Password by Admin
- **URL**: `{{baseUrl}}/admin/users/{{targetUserId}}/change-password`
- **Method**: `POST`
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON)**:
```json
{
  "newPassword": "AdminResetPassword789"
}
```

---

### `DELETE` Delete User Account
- **URL**: `{{baseUrl}}/admin/users/{{targetUserId}}`
- **Method**: `DELETE`
- **Auth**: `Bearer {{adminToken}}`

---

## 4. Admin Dashboard & Analytics (`/admin/dashboard` & `/admin/stats`)

### `GET` Overall Platform Dashboard Overview
- **URL**: `{{baseUrl}}/admin/dashboard` *(or `{{baseUrl}}/admin/stats`)*
- **Method**: `GET`
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Authorization: Bearer {{adminToken}}`
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "summary": {
    "totalRevenue": 875400,
    "totalOrders": 320,
    "totalProducts": 54,
    "totalUsers": 180,
    "roles": { "Admin": 2, "Seller": 12, "Customer": 166 }
  }
}
```

---

## 5. Admin Order Management (`/admin/orders`)

### `GET` Get All Platform Orders
- **URL**: `{{baseUrl}}/admin/orders`
- **Method**: `GET`
- **Auth**: `Bearer {{adminToken}}`
- **Query Parameters**:
  - `status`: `processing` *(options: `pending`, `processing`, `shipped`, `delivered`, `cancelled`)*
  - `page`: `1`
  - `limit`: `20`

---

### `GET` Single Order by ID
- **URL**: `{{baseUrl}}/admin/orders/{{adminOrderId}}`
- **Method**: `GET`
- **Auth**: `Bearer {{adminToken}}`

---

### `PATCH` / `PUT` Update Order Status
- **URL**: `{{baseUrl}}/admin/orders/{{adminOrderId}}/status`
- **Method**: `PATCH` *(or `PUT`)*
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON)**:
```json
{
  "status": "shipped",
  "trackingNumber": "TRK-9827361",
  "note": "Package dispatched with cold-chain fish container van."
}
```

---

### `DELETE` Delete Order
- **URL**: `{{baseUrl}}/admin/orders/{{adminOrderId}}`
- **Method**: `DELETE`
- **Auth**: `Bearer {{adminToken}}`

---

## 6. Admin Product Catalog (`/admin/products`)

### `GET` All Products (Admin View)
- **URL**: `{{baseUrl}}/admin/products`
- **Method**: `GET`
- **Auth**: `Bearer {{adminToken}}`
- **Query Parameters (Optional)**:
  - `isSeller`: `true`
  - `category`: `Fish Seed`
  - `page`: `1`
  - `limit`: `20`

---

### `POST` Create Admin Product
- **URL**: `{{baseUrl}}/admin/products`
- **Method**: `POST`
- **Auth**: `Bearer {{adminToken}}`
- **Body (form-data)**:
  - `thumbnail`: *(select image file)*
  - `name`: `Grass Carp Fingerling 3-Inch`
  - `category`: `Fish Seed`
  - `price`: `5.00`
  - `stock`: `20000`
  - `unit`: `piece`
  - `isAvailable`: `true`

---

### `PUT` / `PATCH` Update Any Product
- **URL**: `{{baseUrl}}/admin/products/{{adminProductId}}`
- **Method**: `PATCH` *(or `PUT`)*
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON)**:
```json
{
  "price": 4.80,
  "isAvailable": true,
  "stock": 18500
}
```

---

### `DELETE` Delete Product
- **URL**: `{{baseUrl}}/admin/products/{{adminProductId}}`
- **Method**: `DELETE`
- **Auth**: `Bearer {{adminToken}}`

---

## 7. Category Management (`/admin/products/category`)

### `POST` Create New Category
- **URL**: `{{baseUrl}}/admin/products/category/create`
- **Method**: `POST`
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON)**:
```json
{
  "name": "Aquarium Fingerlings",
  "description": "Ornamental and juvenile fingerlings for pond and tank stocking."
}
```

---

### `PUT` Update Category
- **URL**: `{{baseUrl}}/admin/products/category/update/aquarium-fingerlings`
- **Method**: `PUT`
- **Auth**: `Bearer {{adminToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{adminToken}}`
- **Body (raw JSON)**:
```json
{
  "name": "Ornamental Fish Seeds",
  "description": "Updated category description."
}
```

---

### `DELETE` Delete Category
- **URL**: `{{baseUrl}}/admin/products/category/delete/ornamental-fish-seeds`
- **Method**: `DELETE`
- **Auth**: `Bearer {{adminToken}}`
