# Salt API

Express.js + TypeScript backend API for the Salt surf tracking application.

## Features

- **Express.js** - Fast, minimalist web framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Database with connection pooling
- **MinIO** - S3-compatible object storage for media files
- **Security** - Helmet, CORS, rate limiting
- **Performance** - Compression, connection pooling

## Prerequisites

- Node.js 18+ 
- PostgreSQL database (deployed via Ansible)
- MinIO storage (deployed via Helm)

## Installation

```bash
cd api
npm install
```

## Configuration

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | API server port | 3000 |
| `DATABASE_HOST` | PostgreSQL host | postgres |
| `DATABASE_PORT` | PostgreSQL port | 5432 |
| `DATABASE_NAME` | Database name | salt_app |
| `DATABASE_USER` | Database user | salt_app |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `DATABASE_PASSWORD` | Database password | (required) |
| `MINIO_ENDPOINT` | MinIO endpoint | master |
| `MINIO_PORT` | MinIO port | 31000 |
| `MINIO_ACCESS_KEY` | MinIO access key | admin |
| `MINIO_SECRET_KEY` | MinIO secret key | fidelio! |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |

## Development

```bash
npm run dev
```

Server will start on `http://localhost:3000` with hot reload.

## Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Checks

- `GET /health` - Server health status
- `GET /health/db` - Database connection status

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in (returns JWT)
- `GET /api/auth/me` - Get current user (auth required)
- `POST /api/auth/change-password` - Change password (auth required)
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/confirm-reset` - Confirm password reset

### Sessions

- `GET /api/sessions/public` - Get public sessions (feed)
- `GET /api/sessions/:id` - Get session by ID
- `GET /api/sessions/user/:userId` - Get user's sessions
- `POST /api/sessions` - Create new session (auth required)
- `PUT /api/sessions/:id` - Update session (auth required, owner only)
- `DELETE /api/sessions/:id` - Delete session (auth required, owner only)

### Boards

- `GET /api/boards/user/:userId` - Get user's boards
- `GET /api/boards/:id` - Get board by ID
- `POST /api/boards` - Create new board (auth required)
- `PUT /api/boards/:id` - Update board (auth required, owner only)
- `DELETE /api/boards/:id` - Delete board (auth required, owner only)

### Profiles

- `GET /api/profiles/user/:userId` - Get profile by user ID
- `GET /api/profiles/:id` - Get profile by ID
- `PUT /api/profiles/:id` - Update profile

### Spots

- `GET /api/spots` - Get all spots (with search)
- `GET /api/spots/:id` - Get spot by ID
- `POST /api/spots` - Create new spot

### Social

- `POST /api/social/sessions/:sessionId/like` - Like a session (auth required)
- `DELETE /api/social/sessions/:sessionId/like` - Unlike a session (auth required)
- `POST /api/social/sessions/:sessionId/kook` - Kook a session (auth required)
- `DELETE /api/social/sessions/:sessionId/kook` - Remove kook (auth required)
- `GET /api/social/sessions/:sessionId/comments` - Get session comments
- `POST /api/social/sessions/:sessionId/comments` - Add comment (auth required)
- `DELETE /api/social/comments/:commentId` - Delete comment (auth required, owner only)
- `POST /api/social/follow` - Follow a user (auth required)
- `DELETE /api/social/follow/:followingId` - Unfollow (auth required)
- `GET /api/social/followers/:userId` - Get followers
- `GET /api/social/following/:userId` - Get following

### Upload

- `POST /api/upload/session-media` - Upload session media (max 5 files)
- `POST /api/upload/avatar` - Upload avatar
- `POST /api/upload/board-photo` - Upload board photo
- `DELETE /api/upload/file` - Delete file from MinIO

## Database Connection

The API connects to PostgreSQL using the `salt_app` service account with read/write permissions.

Connection pooling is configured with:
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s

## File Storage

Files are stored in MinIO with the following structure:

**session-media bucket:**
```
{user_id}/{session_id}/{uuid}.{ext}
```

**avatars bucket:**
```
{user_id}/avatar.{ext}
```

**board-photos bucket:**
```
{user_id}/{board_id}.{ext}
```

## Error Handling

All routes use async error handling with standardized error responses:

```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400
  }
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Window: 15 minutes
- Max requests: 100 per IP

## Security

- **Helmet** - Sets security headers
- **CORS** - Configured for frontend origin
- **Rate limiting** - Prevents abuse
- **Input validation** - Required fields checked
- **SQL injection protection** - Parameterized queries

## Docker Deployment

See `salt_api.Dockerfile` for containerization.

## Testing

The API includes a comprehensive test suite using Jest with unit and integration tests.

### Test Structure

```
api/tests/
├── setup.ts                      # Jest setup and environment config
├── mocks/                        # Shared test mocks
│   ├── auth.ts                   # Authentication mocks
│   └── database.ts               # Database query mocks
├── unit/                         # Unit tests
│   ├── middleware/
│   │   ├── auth.test.ts          # Auth middleware tests
│   │   └── errorHandler.test.ts  # Error handler tests
│   └── routes/
│       ├── auth.test.ts          # Auth routes tests
│       ├── boards.test.ts        # Boards routes tests
│       ├── profiles.test.ts      # Profiles routes tests
│       ├── sessions.test.ts      # Sessions routes tests
│       └── social.test.ts        # Social routes tests
└── integration/
    └── api.test.ts               # API integration tests
```

### Running Tests

#### Install Test Dependencies

```bash
cd api
npm install
```

#### Run All Tests

```bash
npm test
```

#### Run Tests in Watch Mode

```bash
npm test -- --watch
```

#### Run Tests with Coverage

```bash
npm test -- --coverage
```

#### Run Specific Test File

```bash
npm test -- tests/unit/routes/auth.test.ts
```

#### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="auth"
```

### Test Coverage

Coverage reports are generated in the `coverage/` directory. View the HTML report by opening `coverage/lcov-report/index.html`.

### Writing New Tests

1. Place unit tests in `tests/unit/` following the source structure
2. Place integration tests in `tests/integration/`
3. Use the provided mocks in `tests/mocks/` for database and auth
4. Follow the existing test patterns for consistency

## Next Steps

1. Install dependencies: `npm install`
2. Configure environment: `cp .env.example .env`
3. Start development server: `npm run dev`
4. Run tests: `npm test`
5. Test endpoints: `curl http://localhost:3000/health`

## Authentication

JWT-based authentication is implemented with bcrypt password hashing. See `AUTH_IMPLEMENTATION.md` for details.

### Protected Routes

Routes marked "auth required" need a valid JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/sessions
```

### Getting a Token

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Sign in
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```
