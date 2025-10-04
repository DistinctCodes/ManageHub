# Admin Setup Guide - User Profile Management with Demo Data

## 🚀 Quick Setup Instructions

This guide helps administrators set up the User Profile Management feature with demo data for testing and development.

## 📋 Prerequisites

1. **Database Setup**: Ensure PostgreSQL is running and configured
2. **Cloudinary Account**: Required for profile picture uploads
3. **Environment Variables**: Configure all required environment variables

## 🔧 Environment Configuration

Add these variables to your `.env` file:

```bash
# Cloudinary Configuration (Required for Profile Pictures)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER=profile-pictures

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=managehub
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_ACCESS_EXPIRATION=86400000
JWT_REFRESH_EXPIRATION=604800000
```

## 📦 Installation Steps

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Run Database Migration
```bash
# This will add the phone field and create demo users
npm run typeorm:run-migrations

# Alternative: Run specific migration
npx typeorm migration:run -d src/config/typeorm.config.ts
```

### Step 3: Start the Application
```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

## 👥 Demo User Management

### API Endpoints for Admin (Requires ADMIN role)

#### 1. Create Demo Users
```http
POST /admin/demo/profiles/seed
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Demo user profiles seeded successfully",
  "data": {
    "usersCreated": 6,
    "credentials": [
      {
        "email": "john.doe@managehub.demo",
        "password": "password123",
        "role": "ADMIN"
      },
      // ... more users
    ],
    "note": "These are demo accounts for testing. All passwords are 'password123'"
  }
}
```

#### 2. Get Demo User Credentials
```http
GET /admin/demo/profiles/credentials
Authorization: Bearer <admin_jwt_token>
```

#### 3. Clear Demo Users
```http
DELETE /admin/demo/profiles
Authorization: Bearer <admin_jwt_token>
```

## 🧪 Demo User Accounts

The migration creates 6 demo users with different profile configurations:

| Name | Email | Role | Phone | Avatar | Verified |
|------|-------|------|-------|--------|----------|
| John Doe | john.doe@managehub.demo | ADMIN | +1234567890 | ✅ | ✅ |
| Jane Smith | jane.smith@managehub.demo | USER | +1987654321 | ✅ | ✅ |
| Michael Johnson | michael.johnson@managehub.demo | USER | +1555123456 | ✅ | ✅ |
| Sarah Williams | sarah.williams@managehub.demo | USER | +1444987654 | ✅ | ❌ |
| Robert Brown | robert.brown@managehub.demo | USER | +1333456789 | ❌ | ✅ |
| Emily Davis | emily.davis@managehub.demo | USER | ❌ | ✅ | ✅ |

**All demo users have the password:** `password123`

## 🔒 Security Notes

1. **Demo Data**: All demo users have emails ending with `@managehub.demo`
2. **Admin Access**: Only users with ADMIN role can manage demo data
3. **Password Security**: Demo passwords are properly hashed with bcrypt
4. **Profile Pictures**: Demo avatars use Unsplash placeholder images

## 📚 API Documentation

Once the server is running, access the complete API documentation at:
```
http://localhost:6000/swagger
```

The documentation includes:
- User Profile Management endpoints
- Admin Demo Data Management endpoints
- Request/response schemas
- Authentication requirements

## 🧪 Testing the Feature

### 1. Get Admin JWT Token
```bash
curl -X POST http://localhost:6000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@managehub.demo",
    "password": "password123"
  }'
```

### 2. Test Profile Endpoints
```bash
# Get current user profile
curl -X GET http://localhost:6000/profile \
  -H "Authorization: Bearer <jwt_token>"

# Update profile
curl -X PATCH http://localhost:6000/profile \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "John Updated",
    "phone": "+1999888777"
  }'

# Upload avatar (multipart form data)
curl -X POST http://localhost:6000/profile/avatar \
  -H "Authorization: Bearer <jwt_token>" \
  -F "file=@/path/to/image.jpg"
```

## 🔄 Database Migration Details

The migration file `1696406400000-AddPhoneToUsersAndSeedDemo.ts` performs:

1. **Schema Changes:**
   - Adds `phone` column (varchar, 15 characters, nullable)

2. **Demo Data:**
   - Creates 6 demo users with varied profile data
   - Uses bcrypt-hashed passwords
   - Includes profile pictures from Unsplash
   - Covers different verification states

3. **Rollback Support:**
   - `npm run typeorm:revert-migration` removes demo data and phone column

## 🚨 Troubleshooting

### Common Issues:

1. **Migration Fails:**
   ```bash
   # Check database connection
   npm run typeorm:connection:check
   
   # View pending migrations
   npm run typeorm:show-migrations
   ```

2. **Cloudinary Upload Fails:**
   - Verify environment variables are set
   - Check Cloudinary account limits
   - Ensure API keys are correct

3. **Demo Users Not Created:**
   - Check if migration ran successfully
   - Verify no existing users with same emails
   - Check database logs for constraint violations

4. **Authentication Issues:**
   - Ensure JWT_SECRET is set
   - Check token expiration settings
   - Verify user roles are correctly assigned

### Logs and Debugging:
```bash
# Enable debug mode
DEBUG=* npm run start:dev

# Check application logs
tail -f logs/application.log
```

## 🔧 Manual Database Operations

If you need to manually manage demo data:

### Create Demo Users Manually:
```sql
-- Run the migration first to add phone column
-- Then insert demo users (see migration file for complete INSERT statements)
```

### Clear Demo Users:
```sql
DELETE FROM "users" WHERE email LIKE '%@managehub.demo';
```

### Check Demo Users:
```sql
SELECT id, firstname, lastname, email, phone, role, "isVerified" 
FROM "users" 
WHERE email LIKE '%@managehub.demo';
```

## 📞 Support

For issues or questions:
1. Check the application logs
2. Review the API documentation at `/swagger`
3. Verify environment configuration
4. Test with demo credentials first

## 🎯 Production Notes

**Before deploying to production:**

1. **Remove Demo Data:**
   ```http
   DELETE /admin/demo/profiles
   ```

2. **Secure Environment:**
   - Use strong JWT secrets
   - Configure proper CORS settings
   - Set up rate limiting
   - Enable HTTPS

3. **Database Backup:**
   - Backup database before running migrations
   - Test migrations in staging environment

4. **Monitoring:**
   - Set up logging and monitoring
   - Configure error tracking
   - Monitor Cloudinary usage and costs

---

🎉 **Setup Complete!** Your User Profile Management feature with demo data is ready for testing and development.