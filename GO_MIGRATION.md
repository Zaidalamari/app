# Go Backend Migration

This document describes the migration from Node.js/Express to Go for the Alameri Digital Platform backend.

## Overview

The backend has been migrated from Node.js to Go for improved performance, type safety, and concurrency handling. The migration maintains API compatibility with the existing frontend.

## Requirements

- Go 1.23 or later
- PostgreSQL 16
- Node.js 22 (for frontend build only)

## Environment Variables

The Go backend requires the following environment variables:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
PORT=5000                    # Optional, defaults to 5000
JWT_SECRET=your-secret-key   # Optional, has a default value
```

## Building

```bash
# Install dependencies
go mod download

# Build the server
go build -o bin/server main.go

# Or use the Makefile (if available)
make build
```

## Running

```bash
# Set environment variables
export DATABASE_URL="your-database-connection-string"

# Run the server
./bin/server

# Or use go run for development
go run main.go
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires authentication)

### Products
- `GET /api/products/categories` - List all categories
- `GET /api/products` - List all products (supports `category_id` and `search` query params)
- `GET /api/products/{id}` - Get product by ID

### Orders
- `GET /api/orders` - List user orders (requires authentication)
- `POST /api/orders` - Create new order (requires authentication)

### Wallet
- `GET /api/wallet/balance` - Get wallet balance (requires authentication)
- `GET /api/wallet/transactions` - List transactions (requires authentication)
- `POST /api/wallet/add-balance` - Add balance to user wallet (requires admin role)

## Project Structure

```
.
├── main.go                 # Main application entry point
├── config/
│   └── database.go        # Database configuration and connection pool
├── middleware/
│   ├── auth.go            # Authentication middleware (JWT, API keys)
│   └── cache.go           # Cache control middleware
├── models/
│   └── models.go          # Data models
├── routes/
│   ├── auth.go            # Authentication routes
│   ├── products.go        # Product routes
│   ├── orders.go          # Order routes
│   ├── wallet.go          # Wallet routes
│   └── other.go           # Placeholder for additional routes
├── utils/
│   └── response.go        # HTTP response utilities
└── bin/
    └── server             # Compiled binary (gitignored)
```

## Migrated Features

✅ **Completed:**
- Database connection with PostgreSQL
- JWT authentication middleware
- API key authentication for distributors
- User registration and login
- Product listing and categories
- Order creation and listing
- Wallet balance and transactions
- Role-based access control (admin, distributor, seller)

🚧 **Pending:**
- Admin routes for user and product management
- External API routes for distributors
- Chat/AI support routes
- Payment gateway integration
- Marketing routes (banners, promotions)
- Currency management
- Referral system routes
- Support ticket routes
- SMM panel integration
- Multi-channel notifications

## Differences from Node.js Version

1. **Type Safety**: Go provides compile-time type checking
2. **Performance**: Go's compiled nature and goroutines provide better performance
3. **Concurrency**: Built-in goroutines for handling concurrent requests
4. **Dependencies**: Fewer dependencies compared to Node.js version
5. **Error Handling**: Explicit error handling rather than try-catch blocks

## Testing

To test the API endpoints:

```bash
# Health check (if implemented)
curl http://localhost:5000/health

# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get products (use token from login response)
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Database Schema

The Go backend uses the same database schema as the Node.js version. All tables remain unchanged:
- users
- wallets
- categories
- products
- card_codes
- orders
- transactions
- api_logs
- And all other existing tables

## Deployment

### Using Replit
The `.replit` file has been updated to use the Go backend:
```
entrypoint = "main.go"
modules = ["go-1.23", "nodejs-22", "postgresql-16"]
```

Build command:
```bash
cd client && npm run build && cd .. && go build -o bin/server main.go
```

Run command:
```bash
./bin/server
```

### Using Docker (example)
```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o server main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
COPY --from=builder /app/client/dist ./client/dist
CMD ["./server"]
```

## Migration Notes

- The API maintains backward compatibility with the React frontend
- Arabic RTL messages are preserved
- Authentication tokens remain compatible
- Database queries use parameterized statements to prevent SQL injection
- All routes use the same URL patterns as the Node.js version

## Contributing

When adding new routes:
1. Create handler functions in the appropriate route file
2. Register routes in the `Register*Routes` function
3. Use middleware for authentication when needed
4. Follow the existing code structure and error handling patterns

## Support

For issues or questions:
- Email: zaid@alameri.digital
- Phone (Saudi): +966531832836
- Phone (Oman): +96890644452
