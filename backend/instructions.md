Description
 We need to implement two new endpoints in our backend service:

Get Admin – Fetch details of a single admin by ID.
Get All Admins – Fetch all registered admins.
These endpoints will extend the current Admin module functionality and ensure we can retrieve admin details for system management.

✅ Acceptance Criteria
Create a GET /admins/:id endpoint to fetch a single admin by ID.
Create a GET /admins endpoint to fetch all admins.
Ensure proper DTOs/validation are used where necessary.
Implement error handling (e.g., if admin not found).
Write clear controller, service, and repository logic for both endpoints.
Test endpoints locally to confirm they work without errors.