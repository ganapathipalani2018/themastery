# API Documentation

This document provides comprehensive documentation for the Resume Builder API endpoints.

## Base URL

- **Development**: `http://localhost:3001`
- **Staging**: `https://api-staging.resumebuilder.com`
- **Production**: `https://api.resumebuilder.com`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Lifecycle

- **Access Token**: Valid for 15 minutes
- **Refresh Token**: Valid for 7 days
- **Automatic Refresh**: Use the refresh endpoint to get new tokens

## Response Format

All API responses follow this structure:

```json
{
  "success": boolean,
  "message": string,
  "data": object | array | null,
  "error": {
    "code": string,
    "message": string,
    "details": object
  } | null
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `AUTH_INVALID` | Invalid or expired token |
| `AUTH_FORBIDDEN` | Insufficient permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SERVER_ERROR` | Internal server error |

## Endpoints

### Authentication Endpoints

#### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 900
    }
  }
}
```

**Validation Rules:**
- Email: Valid email format, unique
- Password: Minimum 8 characters, must contain uppercase, lowercase, number, and special character
- FirstName: 2-50 characters
- LastName: 2-50 characters

**Rate Limit:** 5 requests per minute per IP

---

#### Login User

**POST** `/api/auth/login`

Authenticate user and return tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": true,
      "lastLoginAt": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 900
    }
  }
}
```

**Rate Limit:** 10 requests per minute per IP

---

#### Refresh Token

**POST** `/api/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-jwt-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 900
  }
}
```

---

#### Get User Profile

**GET** `/api/auth/profile`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "subscription": {
        "plan": "free",
        "status": "active",
        "expiresAt": null
      }
    }
  }
}
```

---

#### Request Password Reset

**POST** `/api/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists",
  "data": null
}
```

**Rate Limit:** 3 requests per hour per IP

---

#### Reset Password

**POST** `/api/auth/reset-password`

Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": null
}
```

---

#### Verify Email

**POST** `/api/auth/verify-email`

Verify user's email address.

**Request Body:**
```json
{
  "token": "verification-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "uuid",
      "emailVerified": true
    }
  }
}
```

---

### Health Check Endpoints

#### Basic Health Check

**GET** `/health`

Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 123456,
  "version": "1.0.0"
}
```

---

#### Database Health Check

**GET** `/health/db`

Check database connectivity.

**Response:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "responseTime": 15,
    "activeConnections": 5
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

#### Detailed Health Check

**GET** `/health/detailed`

Comprehensive health information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 123456,
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "connected": true,
    "responseTime": 15,
    "activeConnections": 5,
    "maxConnections": 20
  },
  "memory": {
    "used": 134217728,
    "available": 1073741824,
    "percentage": 12.5
  },
  "dependencies": {
    "database": "healthy",
    "redis": "healthy",
    "external_apis": "healthy"
  }
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5-10 requests per minute
- **Password reset**: 3 requests per hour
- **General endpoints**: 100 requests per minute per user
- **Public endpoints**: 1000 requests per hour per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Testing the API

### Using cURL

```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

# Get profile (replace TOKEN with actual token)
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

Import the API collection: [Download Postman Collection](../postman/ResumeBuilder-API.postman_collection.json)

## Future Endpoints

The following endpoints are planned for future releases:

### Resume Management
- `GET /api/resumes` - List user's resumes
- `POST /api/resumes` - Create new resume
- `GET /api/resumes/:id` - Get resume by ID
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

### Template Management
- `GET /api/templates` - List available templates
- `GET /api/templates/:id` - Get template details

### Export Service
- `POST /api/export/pdf` - Export resume as PDF
- `POST /api/export/docx` - Export resume as DOCX

### Subscription Management
- `GET /api/subscription` - Get subscription details
- `POST /api/subscription/upgrade` - Upgrade subscription
- `POST /api/subscription/cancel` - Cancel subscription

## Support

For API support, please:

1. Check this documentation
2. Review the [Troubleshooting Guide](troubleshooting.md)
3. Open an issue on [GitHub](https://github.com/yourusername/resumebuilder/issues)
4. Contact support at api-support@resumebuilder.com 