# Surveys Module

The Surveys module allows the creation and management of surveys within the ManageHub platform. Admins can create surveys with different types of questions, and users can respond to them. All data is stored independently from the user module.

## Features

- Create, read, update, and delete surveys
- Create questions with different types (text, single choice, multiple choice, rating)
- Submit responses to surveys
- Get survey responses for analysis

## API Endpoints

### Surveys

- `POST /surveys` - Create a new survey
- `GET /surveys` - Get all surveys
- `GET /surveys?active=true` - Get only active surveys
- `GET /surveys/:id` - Get a specific survey by ID
- `PATCH /surveys/:id` - Update a survey
- `DELETE /surveys/:id` - Delete a survey
- `POST /surveys/responses` - Submit responses to a survey
- `GET /surveys/:id/responses` - Get all responses for a survey

## Usage Examples

### Creating a Survey

```json
POST /surveys
{
  "title": "Office Satisfaction Survey",
  "description": "Please help us improve your workplace experience",
  "createdBy": "admin-123",
  "questions": [
    {
      "text": "How satisfied are you with the office environment?",
      "type": "rating",
      "isRequired": true
    },
    {
      "text": "What could be improved?",
      "type": "text",
      "isRequired": false
    },
    {
      "text": "Which amenities do you use most often?",
      "type": "multiple_choice",
      "options": ["Kitchen", "Meeting Rooms", "Quiet Spaces", "Recreation Area"],
      "isRequired": true
    }
  ]
}
```

### Submitting Responses

```json
POST /surveys/responses
{
  "surveyId": "survey-uuid",
  "respondentId": "user-123",
  "responses": [
    {
      "questionId": "question-1-uuid",
      "value": 4
    },
    {
      "questionId": "question-2-uuid",
      "value": "The temperature control could be improved"
    },
    {
      "questionId": "question-3-uuid",
      "value": ["Kitchen", "Meeting Rooms"]
    }
  ]
}
```

### Getting Survey Responses

```
GET /surveys/survey-uuid/responses
```

Response:
```json
{
  "surveyId": "survey-uuid",
  "title": "Office Satisfaction Survey",
  "description": "Please help us improve your workplace experience",
  "questions": [
    {
      "questionId": "question-1-uuid",
      "questionText": "How satisfied are you with the office environment?",
      "questionType": "rating",
      "responses": [
        {
          "responseId": "response-1-uuid",
          "respondentId": "user-123",
          "value": 4,
          "createdAt": "2025-08-21T10:30:15.000Z"
        }
      ]
    },
    // More questions and responses...
  ]
}
```
