# User Profile Management Module

## Overview

The User Profile Management module provides a comprehensive solution for users to manage their personal profile information, including personal details and profile pictures. This module is built with modern NestJS architecture, following best practices for security, validation, and error handling.

## Features

### ✅ Implemented Features

1. **Profile Information Management**
   - View current profile details
   - Update personal information (name, email, phone, username)
   - Email and username uniqueness validation
   - Input validation and sanitization

2. **Avatar Management**
   - Upload profile pictures (JPEG, PNG, WebP)
   - File size validation (max 5MB)
   - Automatic image optimization via Cloudinary
   - Remove existing profile pictures
   - Replace existing avatars automatically

3. **Security & Validation**
   - JWT authentication required for all endpoints
   - Role-based access control
   - Input validation using class-validator
   - File type and size validation
   - SQL injection protection via TypeORM

4. **API Documentation**
   - Complete Swagger/OpenAPI documentation
   - Request/response schemas
   - Error response documentation
   - Authentication requirements

## API Endpoints

### 1. Get User Profile
```http
GET /api/profile
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": "uuid",
  "firstname": "string",
  "lastname": "string",
  "username": "string?",
  "email": "string",
  "phone": "string?",
  "profilePicture": "string?",
  "isVerified": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### 2. Update Profile Information
```http
PATCH /api/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstname": "string?",
  "lastname": "string?",
  "username": "string?",
  "email": "string?",
  "phone": "string?"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    // Updated profile data
  }
}
```

### 3. Upload Avatar
```http
POST /api/profile/avatar
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: <image_file>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "profilePicture": "https://cloudinary.com/secure_url"
  }
}
```

### 4. Remove Avatar
```http
DELETE /api/profile/avatar
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile picture removed successfully"
}
```

## Validation Rules

### Profile Information
- **firstname**: 1-30 characters, required if provided
- **lastname**: 1-30 characters, required if provided  
- **username**: 3-20 characters, alphanumeric with dots, underscores, hyphens
- **email**: Valid email format, max 50 characters, must be unique
- **phone**: 10-15 characters, international format supported

### Avatar Upload
- **File Types**: JPEG, JPG, PNG, WebP only
- **File Size**: Maximum 5MB
- **Processing**: Auto-resize to 500x500px, quality optimization
- **Storage**: Cloudinary with automatic format conversion

## Error Handling

### Common HTTP Status Codes
- `200 OK`: Request successful
- `400 Bad Request`: Invalid input data or file
- `401 Unauthorized`: Authentication required
- `404 Not Found`: User not found
- `409 Conflict`: Email/username already exists
- `413 Payload Too Large`: File size exceeds limit

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Database Schema Changes

### New Column Added
```sql
ALTER TABLE "users" ADD "phone" character varying(15);
```

The `phone` column is nullable and supports international phone number formats.

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Users can only access their own profile data
3. **Input Validation**: All inputs are validated using class-validator
4. **File Security**: Strict file type and size validation
5. **Data Privacy**: Sensitive fields (password, tokens) are excluded from responses
6. **Rate Limiting**: Inherited from application-level throttling configuration

## Integration Points

### Dependencies
- **CloudinaryModule**: For image upload and management
- **AuthModule**: For JWT authentication and guards
- **UsersModule**: For user entity and related services

### File Upload Pipeline
1. File received via FileInterceptor
2. Validation (type, size, format)
3. Upload to Cloudinary with optimization
4. Database update with secure URL
5. Cleanup of old images (if replacing)

## Testing

The module includes comprehensive unit tests covering:
- Service methods with mocked dependencies
- Error handling scenarios
- Validation edge cases
- File upload workflows
- Authentication and authorization

### Running Tests
```bash
# Unit tests
npm run test user-profile

# Test coverage
npm run test:cov user-profile
```

## Usage Examples

### Frontend Integration (React/Next.js)

```typescript
// Get user profile
const getProfile = async () => {
  const response = await fetch('/api/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};

// Update profile
const updateProfile = async (data) => {
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

// Upload avatar
const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/profile/avatar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  return response.json();
};
```

## Performance Considerations

1. **Database Queries**: Optimized with proper indexing on email and username
2. **Image Processing**: Handled by Cloudinary CDN for optimal performance
3. **Caching**: Response caching can be added at the API Gateway level
4. **Validation**: Client-side validation recommended to reduce server load

## Future Enhancements

1. **Profile Completion**: Track and display profile completion percentage
2. **Social Links**: Add support for social media profile links
3. **Privacy Settings**: Allow users to control profile visibility
4. **Profile History**: Maintain audit trail of profile changes
5. **Avatar Variations**: Support multiple avatar sizes and formats
6. **Bulk Operations**: Support batch profile updates for admin users

## Deployment Notes

1. **Environment Variables**: Ensure Cloudinary credentials are properly configured
2. **Database Migration**: Run the migration for the phone field
3. **File Upload Limits**: Configure server-level file upload limits
4. **CORS**: Ensure proper CORS configuration for file uploads
5. **Rate Limiting**: Consider stricter rate limits for file upload endpoints