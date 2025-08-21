# Sources API Documentation

This document provides comprehensive documentation for the enhanced Sources API, which provides robust endpoints for managing publishers and publications.

## Overview

The Sources API offers full CRUD operations for both Publishers and Publications, with advanced filtering, search, bulk operations, and comprehensive metadata endpoints.

## Base URL

All endpoints are available at: `/api/sources/`

## Authentication

Currently, all endpoints allow unrestricted access (`permissions.AllowAny`). Consider implementing authentication for production use.

## Endpoints

### Publishers

#### List Publishers
```
GET /api/sources/publishers/
```

**Query Parameters:**
- `q` - Search in name and website
- `hidden` - Filter by hidden status (true/false)
- `name_contains` - Name contains this text
- `website_domain` - Filter by website domain
- `min_publications` - Publishers with at least N publications
- `max_publications` - Publishers with at most N publications
- `has_publications` - Only publishers with/without publications (true/false)
- `created_after` - Created after this datetime (ISO format)
- `created_before` - Created before this datetime (ISO format)
- `ordering` - Order by: created_at, name, publication_count
- `search` - Search in name and website

**Example:**
```bash
GET /api/sources/publishers/?q=tech&min_publications=5&ordering=-created_at
```

#### Create Publisher
```
POST /api/sources/publishers/
```

**Request Body:**
```json
{
  "name": "Example Publisher",
  "website": "https://example.com",
  "hidden": false
}
```

#### Get Publisher
```
GET /api/sources/publishers/{id}/
```

#### Update Publisher
```
PATCH /api/sources/publishers/{id}/
```

#### Delete Publisher
```
DELETE /api/sources/publishers/{id}/
```

#### Publisher Publications
```
GET /api/sources/publishers/{id}/publications/
```

Returns all publications for a specific publisher with full filtering support.

#### Publisher Statistics
```
GET /api/sources/publishers/{id}/stats/
```

Returns detailed statistics for a publisher including publication counts, latest publication, etc.

#### Bulk Update Publishers
```
POST /api/sources/publishers/bulk-update/
```

**Request Body:**
```json
{
  "ids": [1, 2, 3],
  "hidden": true,
  "website": "https://updated-website.com"
}
```

#### Bulk Delete Publishers
```
POST /api/sources/publishers/bulk-delete/
```

**Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```

### Publications

#### List Publications
```
GET /api/sources/publications/
```

**Query Parameters:**
- `q` - Search in title, link, and publisher name
- `start` - Published after date (YYYY-MM-DD)
- `end` - Published before date (YYYY-MM-DD)
- `source` - Filter by publisher names (comma-separated)
- `publisher_id` - Filter by publisher ID
- `hidden` - Filter by hidden status (true/false)
- `published_after` - Published after datetime (ISO format)
- `published_before` - Published before datetime (ISO format)
- `title_contains` - Title contains this text
- `link_domain` - Filter by link domain
- `publisher_hidden` - Filter by publisher hidden status
- `days_old` - Publications from last N days
- `ordering` - Order by: published_at, title, publisher__name, created_at
- `search` - Search in title and link

**Example:**
```bash
GET /api/sources/publications/?q=climate&days_old=30&ordering=-published_at
```

#### Create Publication
```
POST /api/sources/publications/
```

**Request Body:**
```json
{
  "title": "Example Publication",
  "link": "https://example.com/article",
  "publisher": 1,
  "published_at": "2024-01-15T10:00:00Z",
  "hidden": false
}
```

#### Get Publication
```
GET /api/sources/publications/{id}/
```

#### Update Publication
```
PATCH /api/sources/publications/{id}/
```

#### Delete Publication
```
DELETE /api/sources/publications/{id}/
```

#### Visible Publications
```
GET /api/sources/publications/visible/
```

Returns only publications that are not hidden and whose publisher is not hidden.

#### Recent Publications
```
GET /api/sources/publications/recent/?days=7
```

Returns publications from the last N days (default: 7 days).

#### Advanced Search
```
GET /api/sources/publications/search/?q=your+search+terms
```

Full-text search across title, link, and publisher name.

#### Bulk Create Publications
```
POST /api/sources/publications/bulk-create/
```

**Request Body:**
```json
[
  {
    "title": "Publication 1",
    "link": "https://example.com/1",
    "publisher": 1,
    "published_at": "2024-01-15T10:00:00Z"
  },
  {
    "title": "Publication 2",
    "link": "https://example.com/2",
    "publisher": 2,
    "published_at": "2024-01-16T10:00:00Z"
  }
]
```

#### Bulk Update Publications
```
POST /api/sources/publications/bulk-update/
```

**Request Body:**
```json
{
  "ids": [1, 2, 3],
  "hidden": true,
  "publisher": 2
}
```

#### Bulk Delete Publications
```
POST /api/sources/publications/bulk-delete/
```

**Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```

### Metadata

#### Sources Metadata
```
GET /api/sources/meta/
```

Returns comprehensive statistics about the sources including:
- Total counts
- Date-based statistics (today, this week, this month)
- Publisher statistics
- Top publishers by publication count
- Database statistics

## Response Format

### Success Response
```json
{
  "id": 1,
  "name": "Example Publisher",
  "website": "https://example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "hidden": false,
  "publication_count": 42,
  "visible_publications_count": 40
}
```

### Error Response
```json
{
  "error": "Detailed error message"
}
```

### Validation Error Response
```json
{
  "field_name": ["Error message 1", "Error message 2"]
}
```

## Filtering Examples

### Complex Publication Query
```bash
GET /api/sources/publications/?q=climate+change&days_old=30&publisher_hidden=false&ordering=-published_at&limit=50&offset=0
```

### Publisher Query with Publication Count
```bash
GET /api/sources/publishers/?min_publications=10&max_publications=100&created_after=2024-01-01T00:00:00Z&ordering=-publication_count
```

### Search with Multiple Terms
```bash
GET /api/sources/publications/?q=oil+prices+forecast&source=Bloomberg,Reuters,CNBC
```

## Pagination

All list endpoints support pagination:
- `limit` - Number of results per page (default: 100, max: 500)
- `offset` - Number of results to skip

**Example:**
```bash
GET /api/sources/publications/?limit=50&offset=100
```

## Validation Rules

### Publisher
- Name must be unique (case-insensitive)
- Website must be unique (case-insensitive)
- Name must be at least 1 character

### Publication
- Title must be at least 5 characters
- Link must be unique (case-insensitive)
- Publication date cannot be in the future
- Publisher must exist

## Bulk Operations Limits

- Bulk create: Maximum 50 publications at once
- Bulk update: Maximum 100 records at once
- Bulk delete: Maximum 100 records at once

## Error Handling

The API provides detailed error messages:
- 400 Bad Request: Validation errors, invalid parameters
- 404 Not Found: Resource not found
- 207 Multi-Status: Bulk operations with partial failures

## Best Practices

1. **Use appropriate filters** to limit result sets
2. **Implement pagination** for large datasets
3. **Use bulk operations** for multiple create/update/delete operations
4. **Check validation errors** in responses for failed operations
5. **Use the metadata endpoint** to understand data distribution

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production use.
