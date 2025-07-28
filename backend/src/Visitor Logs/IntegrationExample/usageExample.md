1. Register a new visitor:
   POST /visitors
   {
   "fullName": "John Doe",
   "visitReason": "Business meeting with HR department",
   "entryTime": "2025-07-27T09:00:00Z"
   }

2. Get all visitors:
   GET /visitors

3. Search visitors by name:
   GET /visitors/search?name=john

4. Search visitors by date:
   GET /visitors/search?date=2025-07-27

5. Search visitors by date range:
   GET /visitors/search?startDate=2025-07-20&endDate=2025-07-27

6. Get a specific visitor:
   GET /visitors/1

7. Update visitor information:
   PATCH /visitors/1
   {
   "visitReason": "Updated meeting purpose",
   "exitTime": "2025-07-27T17:30:00Z"
   }

8. Check out a visitor (set exit time):
   PATCH /visitors/1/checkout

9. Get active visitors (not checked out):
   GET /visitors/active

10. Get visitor statistics:
    GET /visitors/stats

11. Delete a visitor record:
    DELETE /visitors/1

INSTALLATION DEPENDENCIES:
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm class-validator class-transformer

DATABASE SETUP:
The system uses TypeORM and can work with PostgreSQL, MySQL, SQLite, etc.
Update the database configuration in app.module.ts according to your setup.

FEATURES:
✅ Complete CRUD operations
✅ Search by name (case-insensitive, partial match)
✅ Search by specific date or date range
✅ Check-in/Check-out functionality
✅ Active visitors tracking
✅ Visitor statistics
✅ Input validation
✅ Proper error handling
✅ Self-contained module
✅ TypeScript support
✅ Database migrations ready
\*/
