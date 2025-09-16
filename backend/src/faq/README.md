# FAQ Manager Module

A standalone NestJS module for managing Frequently Asked Questions (FAQs) with comprehensive admin and user functionality. This module is completely independent and doesn't rely on any authentication or user management modules.

## 🏗️ Architecture Overview

The FAQ module follows standard NestJS architecture patterns:

```
src/faq/
├── faq.entity.ts           # TypeORM entity definition
├── faq.service.ts          # Business logic service
├── faq.controller.ts       # REST API endpoints
├── faq.module.ts           # NestJS module configuration
├── dto/
│   ├── create-faq.dto.ts   # Data validation for creating FAQs
│   ├── update-faq.dto.ts   # Data validation for updating FAQs
│   └── faq-query.dto.ts    # Query parameters for filtering/pagination
├── faq.service.spec.ts     # Unit tests for service
├── faq.controller.spec.ts  # Integration tests for controller
└── README.md               # This documentation
```

## 📊 Database Schema

### FAQ Entity Fields

- **id**: UUID primary key
- **question**: FAQ question (max 500 characters)
- **answer**: Detailed answer (text field)
- **category**: Enum (general, workspace, policies, technical, billing, security, support)
- **status**: Enum (active, inactive, draft)
- **isActive**: Boolean flag for quick enable/disable
- **priority**: Integer for ordering (higher = more important)
- **viewCount**: Track popularity
- **tags**: Array of searchable tags
- **metadata**: JSON field for additional data
- **createdBy**: Admin who created the FAQ
- **updatedBy**: Admin who last updated the FAQ
- **createdAt**: Timestamp
- **updatedAt**: Timestamp

### Database Indexes

- Composite index on `[category, status]`
- Composite index on `[isActive, priority]`

## 🔗 API Endpoints

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/faq/admin` | Create new FAQ |
| PUT | `/faq/admin/:id` | Update existing FAQ |
| DELETE | `/faq/admin/:id` | Delete FAQ |
| PUT | `/faq/admin/:id/toggle` | Toggle FAQ active status |
| PUT | `/faq/admin/bulk/priority` | Bulk update FAQ priorities |
| GET | `/faq/admin/all` | Get all FAQs (including inactive) |
| GET | `/faq/admin/stats` | Get FAQ statistics |

### Public/User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/faq` | Get active FAQs with filtering/pagination |
| GET | `/faq/search?q=term` | Search FAQs |
| GET | `/faq/popular` | Get most viewed FAQs |
| GET | `/faq/categories` | Get all available categories |
| GET | `/faq/category/:category` | Get FAQs by category |
| GET | `/faq/:id` | Get FAQ by ID |
| GET | `/faq/:id?increment=true` | Get FAQ by ID and increment view count |

## 🎯 Key Features

### Admin Features
- ✅ **CRUD Operations**: Full create, read, update, delete functionality
- ✅ **Status Management**: Toggle active/inactive status
- ✅ **Priority Management**: Bulk priority updates for ordering
- ✅ **Analytics**: Comprehensive statistics and reporting
- ✅ **Category Management**: Organize FAQs by categories
- ✅ **Draft Mode**: Save FAQs as drafts before publishing

### User Features
- ✅ **Browse FAQs**: Paginated listing with filtering
- ✅ **Search**: Full-text search across questions, answers, and tags
- ✅ **Categories**: Browse by specific categories
- ✅ **Popular FAQs**: View most accessed questions
- ✅ **View Tracking**: Automatic view count increment
- ✅ **Responsive**: Clean JSON API responses

### Advanced Features
- ✅ **Pagination**: Offset/limit based pagination with metadata
- ✅ **Filtering**: By category, status, tags, and more
- ✅ **Sorting**: Flexible sorting by priority, date, views, etc.
- ✅ **Validation**: Comprehensive input validation with class-validator
- ✅ **Error Handling**: Proper HTTP status codes and error messages
- ✅ **Duplicate Prevention**: Prevents duplicate questions
- ✅ **View Analytics**: Track FAQ popularity and usage

## 🧪 Testing

The module includes comprehensive test coverage:

### Unit Tests (`faq.service.spec.ts`)
- Tests all service methods
- Mock repository interactions
- Error condition handling
- Business logic validation

### Integration Tests (`faq.controller.spec.ts`)
- Tests all controller endpoints
- HTTP response validation
- Request/response flow testing
- Mock service interactions

Run tests with:
```bash
# Unit tests
npm run test faq.service.spec.ts

# Integration tests
npm run test faq.controller.spec.ts

# All FAQ tests
npm run test faq

# Test coverage
npm run test:cov
```

## 🚀 Usage Examples

### Admin Operations

#### Create a new FAQ
```bash
curl -X POST http://localhost:3000/faq/admin \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the workspace hours?",
    "answer": "The workspace is open Monday-Friday from 9 AM to 6 PM.",
    "category": "workspace",
    "priority": 10,
    "tags": ["hours", "schedule", "workspace"],
    "createdBy": "admin@example.com"
  }'
```

#### Update an FAQ
```bash
curl -X PUT http://localhost:3000/faq/admin/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "Updated: The workspace is now open 24/7 for premium members.",
    "updatedBy": "admin@example.com"
  }'
```

#### Get FAQ statistics
```bash
curl http://localhost:3000/faq/admin/stats
```

### User Operations

#### Browse all FAQs
```bash
curl "http://localhost:3000/faq?category=workspace&limit=10&offset=0"
```

#### Search FAQs
```bash
curl "http://localhost:3000/faq/search?q=workspace&limit=5"
```

#### Get popular FAQs
```bash
curl "http://localhost:3000/faq/popular?limit=10"
```

#### Get FAQ by category
```bash
curl "http://localhost:3000/faq/category/workspace?limit=15"
```

#### View a specific FAQ (with view count increment)
```bash
curl "http://localhost:3000/faq/123e4567-e89b-12d3-a456-426614174000?increment=true"
```

## 📋 Response Format

All endpoints return consistent JSON responses:

### Success Response
```json
{
  "statusCode": 200,
  "message": "FAQs retrieved successfully",
  "data": {
    "faqs": [...],
    "total": 25,
    "pagination": {
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Error Response
```json
{
  "statusCode": 404,
  "message": "FAQ with ID abc123 not found",
  "error": "Not Found"
}
```

## 🔧 Configuration

### Environment Variables (if needed)
```env
# Database settings are inherited from main app configuration
# No additional environment variables required
```

### Module Configuration
The module is self-contained and requires no additional configuration. It automatically:
- Creates database tables via TypeORM
- Registers API routes
- Sets up validation pipes
- Configures error handling

## 🛡️ Security Considerations

Since this is a standalone module without authentication:

### Recommendations
- **Admin Endpoints**: Should be protected with authentication middleware in production
- **Rate Limiting**: Consider adding rate limiting to search endpoints
- **Input Validation**: All inputs are validated using class-validator
- **SQL Injection**: Protected by TypeORM query builder
- **XSS Protection**: HTML content should be sanitized on the frontend

### Example Auth Integration
```typescript
// In your auth guard
@UseGuards(JwtAuthGuard) // Add to admin endpoints
@Post('admin')
async createFAQ(@Body() createFAQDto: CreateFAQDto) {
  // Implementation
}
```

## 📈 Performance Optimization

### Database Optimization
- Indexed columns for fast queries
- Query builder for complex searches
- Pagination to limit result sets

### Caching Recommendations
```typescript
// Example caching for popular FAQs
@CacheKey('popular-faqs')
@CacheTTL(300) // 5 minutes
async getPopularFAQs() {
  // Implementation
}
```

## 🔄 Migration from Existing Systems

### Data Import
```typescript
// Example migration script
async function migrateFAQs(existingData: any[]) {
  for (const item of existingData) {
    await faqService.createFAQ({
      question: item.question,
      answer: item.answer,
      category: FAQCategory.GENERAL,
      createdBy: 'migration-script'
    });
  }
}
```

## 📝 Changelog

### Version 1.0.0
- Initial implementation
- Complete CRUD operations
- Search functionality
- Analytics and statistics
- Comprehensive test coverage
- Full documentation

## 🤝 Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Follow NestJS best practices

## 📞 Support

This FAQ module is designed to be self-documenting and easy to use. For questions or issues:
1. Check this README
2. Review the test files for usage examples
3. Examine the controller/service implementations
