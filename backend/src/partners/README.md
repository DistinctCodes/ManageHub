# Partners Management Module

The Partners Management module allows administrators to store and manage a list of third-party partners, their contact information, and descriptions of their services. This module is fully standalone and doesn't depend on any other modules.

## Features

- Create, read, update, and delete partner organizations
- Manage multiple contact information for each partner
- Track services offered by each partner
- Filter active/inactive partners

## API Endpoints

### Partners

- `POST /partners` - Create a new partner
- `GET /partners` - Get all partners
- `GET /partners?active=true` - Get only active partners
- `GET /partners/:id` - Get a specific partner by ID
- `PATCH /partners/:id` - Update a partner
- `DELETE /partners/:id` - Delete a partner

### Partner Contacts

- `POST /partners/:id/contacts` - Add a new contact to a partner
- `PATCH /partners/contacts/:id` - Update a contact
- `DELETE /partners/contacts/:id` - Delete a contact

### Partner Services

- `POST /partners/:id/services` - Add a new service to a partner
- `PATCH /partners/services/:id` - Update a service
- `DELETE /partners/services/:id` - Delete a service

## Usage Examples

### Creating a Partner

```json
POST /partners
{
  "name": "Acme Corporation",
  "description": "A partner that provides various tech services",
  "website": "https://acme.example.com",
  "logo": "https://acme.example.com/logo.png",
  "contacts": [
    {
      "type": "email",
      "value": "contact@acme.example.com",
      "label": "Main Contact",
      "isPrimary": true
    },
    {
      "type": "phone",
      "value": "+1234567890",
      "label": "Support"
    },
    {
      "type": "address",
      "value": "123 Main St, City, Country",
      "label": "Headquarters"
    }
  ],
  "services": [
    {
      "name": "IT Consulting",
      "description": "Expert IT consulting services"
    },
    {
      "name": "Cloud Solutions",
      "description": "Managed cloud infrastructure services"
    }
  ]
}
```

### Adding a Contact

```json
POST /partners/partner-uuid/contacts
{
  "type": "email",
  "value": "sales@acme.example.com",
  "label": "Sales Department"
}
```

### Adding a Service

```json
POST /partners/partner-uuid/services
{
  "name": "Security Audits",
  "description": "Comprehensive security audit services"
}
```
