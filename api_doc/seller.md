# Seller API Testing Guide (Postman)

This guide contains complete endpoints, HTTP methods, authorization requirements, and sample payloads for Fish-Seed Sellers and Hatcheries.

---

## 🛠️ Postman Environment Setup

Create or switch to your Postman Environment and set:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:4000/api/v1` | Server base URL (Port 4000) |
| `sellerToken` | `(leave blank initially)` | Populated after seller login or creation |
| `sellerProductId` | `(leave blank)` | Product ID created by the seller |

### Postman Script to Capture Seller Token
Under the **Tests** tab of your **Seller Registration** or **Seller Login** request:
```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
    const json = pm.response.json();
    if (json.accessToken || json.token) {
        pm.environment.set("sellerToken", json.accessToken || json.token);
    }
}
```

---

## 1. Seller Account Registration (`/seller/create-account`)

### `POST` Create Seller Account (Unverified by default)
> **Notice**:
> 1. If you already have active session cookies in Postman, you must log out or clear cookies first, otherwise this endpoint returns an error (HTTP 400).
> 2. Newly registered sellers have `"role": "Seller"` and `"isVerifiedSeller": false`.
> 3. An **Admin** must approve the seller account to set `"isVerifiedSeller": true` (see `admin.md`).

- **URL**: `{{baseUrl}}/seller/create-account` *(or `{{baseUrl}}/auth/seller/register`)*
- **Method**: `POST`
- **Auth**: None (Guest only)
- **Headers**:
  - `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "name": "Kamrul Hassan Hatchery",
  "email": "kamrul.hatchery@gmail.com",
  "password": "SellerPassword123",
  "phone": "01788990011",
  "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
}
```
- **Expected Response (201 Created)**:
```json
{
  "success": true,
  "message": "Seller registration successful. Pending admin approval.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "66df9876543210fedcba5678",
    "name": "Kamrul Hassan Hatchery",
    "email": "kamrul.hatchery@gmail.com",
    "role": "Seller",
    "status": "Active",
    "phone": "01788990011",
    "avatar": "https://images.unsplash.com/...",
    "isVerifiedSeller": false
  }
}
```

---

## 2. Seller Login & Verification (`/auth`)

### `POST` Seller Login
- **URL**: `{{baseUrl}}/auth/login`
- **Method**: `POST`
- **Auth**: None
- **Headers**:
  - `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "email": "kamrul.hatchery@gmail.com",
  "password": "SellerPassword123"
}
```

---

### `GET` Check Seller Profile & Verification Status
- **URL**: `{{baseUrl}}/auth/me`
- **Method**: `GET`
- **Auth**: `Bearer {{sellerToken}}`
- **Headers**:
  - `Authorization: Bearer {{sellerToken}}`
- **Response Check**: Verify that `role` is `"Seller"` and check if `isVerifiedSeller` is `false` (pending) or `true` (approved).

---

## 3. Seller Dashboard Statistics (`/seller/dashboard`)

### `GET` Individual Seller Dashboard Stats
Aggregates performance statistics strictly for the logged-in seller.

- **URL**: `{{baseUrl}}/seller/dashboard/stats`
- **Method**: `GET`
- **Auth**: `Bearer {{sellerToken}}` (Role: `Seller` or `Admin`)
- **Headers**:
  - `Authorization: Bearer {{sellerToken}}`
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "stats": {
    "totalProducts": 14,
    "availableProducts": 12,
    "outOfStockProducts": 2,
    "totalOrders": 28,
    "totalRevenue": 142500,
    "orderStatuses": {
      "processing": 5,
      "shipped": 8,
      "delivered": 14,
      "cancelled": 1
    }
  }
}
```

---

## 4. Seller Product Management (`/seller/products`)

### `GET` List Seller's Own Products
Fetches only products created by and assigned to the authenticated seller.

- **URL**: `{{baseUrl}}/seller/products`
- **Method**: `GET`
- **Auth**: `Bearer {{sellerToken}}`
- **Headers**:
  - `Authorization: Bearer {{sellerToken}}`
- **Query Parameters (Optional)**:
  - `page`: `1`
  - `limit`: `20`
  - `search`: `carp`
  - `isAvailable`: `true`

---

### `POST` Create New Seller Product (Form-Data with Thumbnail)
- **URL**: `{{baseUrl}}/seller/products`
- **Method**: `POST`
- **Auth**: `Bearer {{sellerToken}}`
- **Headers**:
  - `Authorization: Bearer {{sellerToken}}`
- **Body (form-data)**:
  - `thumbnail`: *(select image file)*
  - `name`: `Padma Premium Rui Fry (Grade A)`
  - `category`: `Fish Seed`
  - `species`: `Labeo rohita (Rui)`
  - `price`: `4.50`
  - `stock`: `100000`
  - `minOrderQuantity`: `1000`
  - `unit`: `piece`
  - `age`: `15 Days`
  - `hatcheryLocation`: `Rajbari, Bangladesh`
  - `description`: `Fast-growing healthy Rui fish seed produced from high quality broods.`
  - `isAvailable`: `true`

> *Note: If testing with JSON without file upload, send `Content-Type: application/json` with the above fields and a thumbnail URL string.*

---

### `GET` Get Seller Product Details by ID or Slug
- **URL**: `{{baseUrl}}/seller/products/{{sellerProductId}}`
- **Method**: `GET`
- **Auth**: `Bearer {{sellerToken}}`
- **Headers**:
  - `Authorization: Bearer {{sellerToken}}`

---

### `PUT` / `PATCH` Update Seller Product
- **URL**: `{{baseUrl}}/seller/products/{{sellerProductId}}`
- **Method**: `PATCH` *(or `PUT`)*
- **Auth**: `Bearer {{sellerToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{sellerToken}}`
- **Body (raw JSON)**:
```json
{
  "price": 4.20,
  "stock": 85000,
  "isAvailable": true,
  "description": "Updated stock and seasonal special rate for large hatchery orders."
}
```

---

### `DELETE` Delete Seller Product
- **URL**: `{{baseUrl}}/seller/products/{{sellerProductId}}`
- **Method**: `DELETE`
- **Auth**: `Bearer {{sellerToken}}`
- **Headers**:
  - `Authorization: Bearer {{sellerToken}}`
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "“Padma Premium Rui Fry (Grade A)” deleted successfully."
}
```
