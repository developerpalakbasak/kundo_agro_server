# Customer & Public API Testing Guide (Postman)

This guide contains complete endpoints, HTTP methods, authorization requirements, and sample payloads for Customer and Public flows.

---

## 🛠️ Postman Environment Setup

Create an Environment in Postman (e.g., `Kundo Agro Local`) and define:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:4000/api/v1` | Server base URL (Port 4000) |
| `accessToken` | `(leave blank initially)` | Automatically populated after login |
| `productId` | `(leave blank)` | Sample product ID or slug from catalog |
| `orderId` | `(leave blank)` | ID or tracking number from placed order |

### Postman Auth Auto-Capture Script
In Postman, under the **Tests** tab of your **Customer Login** or **Customer Register** request:
```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
    const json = pm.response.json();
    if (json.accessToken || json.token) {
        pm.environment.set("accessToken", json.accessToken || json.token);
    }
}
```

---

## 1. System Health Check

### `GET` Server Status
- **URL**: `{{baseUrl}}/`
- **Method**: `GET`
- **Auth**: None
- **Expected Response**:
```json
{
  "success": true,
  "message": "Kundu Agro & Fisheries API is LIVE",
  "timestamp": "2026-09-14T08:30:00.000Z"
}
```

---

## 2. Customer Authentication (`/auth`)

### `POST` Customer Registration
> **Note**: If you already have active session cookies in Postman, you must log out or clear cookies first, otherwise this endpoint returns an error (HTTP 400).

- **URL**: `{{baseUrl}}/auth/user/register`
- **Method**: `POST`
- **Auth**: None (Guest only)
- **Headers**:
  - `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "name": "Tanvir Hasan",
  "email": "tanvir.customer@gmail.com",
  "password": "CustomerPass123",
  "phone": "01712003344",
  "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
}
```
- **Expected Response (201 Created)**:
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "66df1234567890abcdef1234",
    "name": "Tanvir Hasan",
    "email": "tanvir.customer@gmail.com",
    "role": "Customer",
    "status": "Active",
    "phone": "01712003344",
    "avatar": "https://images.unsplash.com/...",
    "isVerifiedSeller": false
  }
}
```

---

### `POST` Customer Login (via Email)
- **URL**: `{{baseUrl}}/auth/login`
- **Method**: `POST`
- **Auth**: None
- **Headers**:
  - `Content-Type: application/json`
- **Body (raw JSON)**:
```json
{
  "email": "tanvir.customer@gmail.com",
  "password": "CustomerPass123"
}
```
*Or login using Phone Number:*
```json
{
  "identifier": "01712003344",
  "password": "CustomerPass123"
}
```
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "66df1234567890abcdef1234",
    "name": "Tanvir Hasan",
    "email": "tanvir.customer@gmail.com",
    "role": "Customer",
    "status": "Active",
    "phone": "01712003344",
    "avatar": "https://images.unsplash.com/...",
    "isVerifiedSeller": false
  }
}
```

---

### `GET` Get My Profile (`/me`)
- **URL**: `{{baseUrl}}/auth/me`
- **Method**: `GET`
- **Auth**: `Bearer {{accessToken}}`
- **Headers**:
  - `Authorization: Bearer {{accessToken}}`

---

### `GET` Verify Session Token
- **URL**: `{{baseUrl}}/auth/verify`
- **Method**: `GET`
- **Auth**: `Bearer {{accessToken}}`

---

### `POST` Refresh Access Token
- **URL**: `{{baseUrl}}/auth/refresh`
- **Method**: `POST`
- **Auth**: Cookie `refreshToken` or Header `x-refresh-token` or JSON body:
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

---

### `POST` Customer Logout
- **URL**: `{{baseUrl}}/auth/logout`
- **Method**: `POST`
- **Auth**: None / Authenticated

---

### `POST` Customer Change Password
- **URL**: `{{baseUrl}}/auth/changepassword`
- **Method**: `POST`
- **Auth**: `Bearer {{accessToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{accessToken}}`
- **Body (raw JSON)**:
```json
{
  "oldPassword": "CustomerPass123",
  "newPassword": "NewCustomerPass456"
}
```

---

## 3. Customer Profile Operations (`/customer`)

### `GET` Get Customer Profile
- **URL**: `{{baseUrl}}/customer/profile`
- **Method**: `GET`
- **Auth**: `Bearer {{accessToken}}`

---

### `PUT` / `PATCH` Update Customer Profile
- **URL**: `{{baseUrl}}/customer/profile`
- **Method**: `PATCH` *(or `PUT`)*
- **Auth**: `Bearer {{accessToken}}`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{accessToken}}`
- **Body (raw JSON)**:
```json
{
  "name": "Tanvir Hasan Updated",
  "phone": "01712998877",
  "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
}
```

---

## 4. Public Product Browsing (`/products`)

### `GET` List Products (Catalog Search & Filter)
- **URL**: `{{baseUrl}}/products`
- **Method**: `GET`
- **Auth**: None (Public)
- **Query Parameters (Optional)**:
  - `page`: `1`
  - `limit`: `12`
  - `category`: `Fish Seed`
  - `search`: `carp`
  - `isAvailable`: `true`
  - `sort`: `price_asc` *(options: `newest`, `oldest`, `price_asc`, `price_desc`)*

---

### `GET` Single Product Details by ID or Slug
- **URL**: `{{baseUrl}}/products/rui-fish-seed-grade-a` *(or `{{baseUrl}}/products/{{productId}}`)*
- **Method**: `GET`
- **Auth**: None (Public)

---

## 5. Orders & Checkout (`/orders` & `/customer/orders`)

### `POST` Create New Order (Checkout)
- **URL**: `{{baseUrl}}/orders` *(or `{{baseUrl}}/orders/checkout`)*
- **Method**: `POST`
- **Auth**: Optional (Can be guest or `Bearer {{accessToken}}`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{accessToken}}`
- **Body (raw JSON)**:
```json
{
  "items": [
    {
      "product": "{{productId}}",
      "quantity": 2,
      "price": 450
    }
  ],
  "shippingAddress": {
    "fullName": "Tanvir Hasan",
    "phone": "01712003344",
    "address": "House 12, Road 4, Sector 10, Uttara",
    "city": "Dhaka",
    "district": "Dhaka",
    "postalCode": "1230"
  },
  "paymentMethod": "Cash on Delivery",
  "deliveryNotes": "Please call before delivering."
}
```

---

### `GET` Customer Order History
- **URL**: `{{baseUrl}}/customer/orders`
- **Method**: `GET`
- **Auth**: `Bearer {{accessToken}}`
- **Headers**:
  - `Authorization: Bearer {{accessToken}}`

---

### `GET` Single Order by ID or Tracking
- **URL**: `{{baseUrl}}/customer/orders/{{orderId}}`
- **Method**: `GET`
- **Auth**: `Bearer {{accessToken}}`

---

### `GET` Public Order Tracking (By Tracking Number)
- **URL**: `{{baseUrl}}/orders/track/ORD-2026-XXXXX`
- **Method**: `GET`
- **Auth**: None (Public)

---

## 6. Fish-Seed Submission (`/customer/fish-seed`)

### `POST` Customer Submit Fish-Seed Listing
- **URL**: `{{baseUrl}}/customer/fish-seed`
- **Method**: `POST`
- **Auth**: Optional / `Bearer {{accessToken}}`
- **Body (Form-Data)**:
  - `thumbnail`: *(select image file)*
  - `name`: `Deshi Shing Fry 2-Inch`
  - `category`: `Fish Seed`
  - `species`: `Heteropneustes fossilis (Shing)`
  - `price`: `3.5`
  - `stock`: `50000`
  - `unit`: `piece`
  - `description`: `Locally nurtured pure Deshi Shing fry ready for nursery pond stocking.`
