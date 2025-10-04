# 🚀 Quick Admin Commands - User Profile Management

## Setup & Migration

```bash
# 1. Install dependencies
npm install

# 2. Run migration (adds phone field + demo users)
npm run typeorm:run-migrations

# 3. Start server
npm run start:dev
```

## Demo Data Management

```bash
# Create demo users
npm run demo:seed

# Show demo credentials  
npm run demo:info

# Clear demo users
npm run demo:clear
```

## Demo User Credentials

| Email | Password | Role | Features |
|-------|----------|------|----------|
| john.doe@managehub.demo | password123 | ADMIN | Full access + avatar |
| jane.smith@managehub.demo | password123 | USER | Complete profile |
| michael.johnson@managehub.demo | password123 | USER | Complete profile |
| sarah.williams@managehub.demo | password123 | USER | Unverified user |
| robert.brown@managehub.demo | password123 | USER | No avatar |
| emily.davis@managehub.demo | password123 | USER | No phone |

## API Endpoints

### User Profile (All authenticated users)
- `GET /profile` - Get profile
- `PATCH /profile` - Update profile  
- `POST /profile/avatar` - Upload avatar
- `DELETE /profile/avatar` - Remove avatar

### Admin Demo Management (Admin only)
- `POST /admin/demo/profiles/seed` - Create demo users
- `GET /admin/demo/profiles/credentials` - Get demo credentials
- `DELETE /admin/demo/profiles` - Clear demo users

## API Documentation
```
http://localhost:6000/swagger
```

## Environment Variables Required

```bash
# Cloudinary (for avatars)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key  
CLOUDINARY_API_SECRET=your_api_secret

# Database
DATABASE_HOST=localhost
DATABASE_NAME=managehub
DATABASE_USERNAME=your_user
DATABASE_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
```

## Testing Flow

1. **Run migration** → `npm run typeorm:run-migrations`
2. **Seed demo data** → `npm run demo:seed`
3. **Start server** → `npm run start:dev`
4. **Login with admin** → POST `/auth/login` (john.doe@managehub.demo)
5. **Test profile API** → Use JWT token with profile endpoints
6. **View API docs** → http://localhost:6000/swagger

## Production Cleanup

```bash
# Before production deployment
npm run demo:clear
```

---

✅ **Ready to test!** Use admin account to access all features and API documentation.