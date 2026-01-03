# Security Overview

This document outlines the security measures implemented in the Salt application to protect against common web vulnerabilities.

## Authentication and Authorization

Salt uses JSON Web Tokens (JWT) for stateless authentication. When a user signs in, the server generates a signed token that the client stores and sends with subsequent requests.

### Password Handling

Passwords are never stored in plaintext. The API uses bcrypt with a cost factor of 10 to hash passwords before storage:

```typescript
const passwordHash = await bcrypt.hash(password, 10);
```

During sign-in, the submitted password is compared against the stored hash:

```typescript
const validPassword = await bcrypt.compare(password, user.password_hash);
```

### Token Validation

Protected routes use the `authenticate` middleware to verify the JWT before processing requests:

```typescript
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'No token provided');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }
};
```

### Resource Ownership Verification

For operations that modify user data, the API verifies that the authenticated user owns the resource before allowing changes. This prevents users from modifying or deleting other users' content:

```typescript
const sessionCheck = await query('SELECT user_id FROM sessions WHERE id = $1', [id]);
if (sessionCheck.rows[0].user_id !== req.userId) {
  throw new ApiError(403, 'Not authorized to update this session');
}
```

## SQL Injection Prevention

All database queries use parameterized statements. User input is never concatenated directly into SQL strings.

For example, instead of building a query like this (vulnerable):

```typescript
// WRONG - vulnerable to SQL injection
const result = await query(`SELECT * FROM users WHERE email = '${email}'`);
```

The API uses parameterized queries:

```typescript
// CORRECT - parameterized query
const result = await query('SELECT * FROM users WHERE email = $1', [email]);
```

The PostgreSQL driver handles parameter escaping, ensuring that malicious input cannot alter the query structure.

### ILIKE Pattern Escaping

For search functionality using PostgreSQL's ILIKE operator, special pattern characters are escaped to prevent users from crafting queries that match unintended results:

```typescript
const sanitizedQuery = q.replace(/[%_\\]/g, '\\$&');

const result = await query(
  `SELECT * FROM profiles WHERE display_name ILIKE $1`,
  [`%${sanitizedQuery}%`]
);
```

## File Upload Security

The upload system implements several layers of protection.

### MIME Type Validation

Only specific file types are accepted. The upload middleware validates the MIME type of each uploaded file:

```typescript
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

if (!allowedMimeTypes.includes(file.mimetype)) {
  cb(new ApiError(400, `File type ${file.mimetype} is not allowed`));
}
```

### Size Limits

File uploads are constrained by configurable size limits to prevent denial of service through resource exhaustion:

```typescript
limits: {
  fileSize: Number(process.env.MAX_FILE_SIZE) || 20971520, // 20MB default
  files: Number(process.env.MAX_FILES_PER_UPLOAD) || 5,
}
```

### Ownership Verification for Uploads

All upload endpoints require authentication and verify that the user owns the resource they are uploading to:

```typescript
router.post('/session-media', authenticate, upload.array('files', 5), 
  asyncHandler(async (req: AuthRequest, res) => {
    const sessionCheck = await query('SELECT user_id FROM sessions WHERE id = $1', [session_id]);
    if (sessionCheck.rows[0].user_id !== user_id) {
      throw new ApiError(403, 'Not authorized to upload media to this session');
    }
    // proceed with upload
  })
);
```

### File Deletion Protection

Users can only delete files that belong to them. The deletion endpoint validates that the file path starts with the authenticated user's ID:

```typescript
if (!objectName.startsWith(`${user_id}/`)) {
  throw new ApiError(403, 'Not authorized to delete this file');
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse and denial of service attacks. In production, requests are limited per IP address:

```typescript
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  message: 'Too many requests from this IP, please try again later.',
  skip: () => process.env.NODE_ENV !== 'production',
});

app.use('/api/', limiter);
```

## HTTP Security Headers

The API uses the Helmet middleware to set security-related HTTP headers:

```typescript
app.use(helmet());
```

This automatically enables protections including:

- Content-Security-Policy to prevent XSS attacks
- X-Content-Type-Options to prevent MIME sniffing
- X-Frame-Options to prevent clickjacking
- Strict-Transport-Security to enforce HTTPS

## Cross-Origin Resource Sharing (CORS)

CORS is configured to only allow requests from the expected frontend origin:

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
```

This prevents unauthorized websites from making requests to the API on behalf of authenticated users.

## Information Disclosure Prevention

The API avoids revealing information that could aid attackers.

### Email Enumeration

The password reset endpoint returns the same message regardless of whether the email exists:

```typescript
if (userResult.rows.length === 0) {
  res.json({ message: 'If email exists, reset link will be sent' });
  return;
}
// ... process reset request ...
res.json({ message: 'If email exists, reset link will be sent' });
```

This prevents attackers from discovering which email addresses have accounts.

### Generic Authentication Errors

Login failures return the same error message for invalid email and invalid password:

```typescript
if (userResult.rows.length === 0) {
  throw new ApiError(401, 'Invalid email or password');
}

if (!validPassword) {
  throw new ApiError(401, 'Invalid email or password');
}
```

### Admin Status Protection

The admin check endpoint requires authentication and only allows users to check their own admin status:

```typescript
router.get('/check-admin', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const result = await query(
    "SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin') as is_admin",
    [req.userId]
  );
  res.json({ is_admin: result.rows[0].is_admin });
}));
```

## Client-Side Security

### Token Storage

Authentication tokens are stored in localStorage. While this is vulnerable to XSS attacks, the application mitigates this risk through Content-Security-Policy headers that restrict script execution.

### Input Encoding

React automatically escapes content rendered in JSX, preventing XSS attacks from user-generated content. The application avoids using `dangerouslySetInnerHTML` which would bypass this protection.

## Environment Configuration

Sensitive configuration values are never committed to version control. The application uses environment variables for all secrets:

- `JWT_SECRET` - Token signing key
- `DATABASE_PASSWORD` - Database credentials
- `MINIO_SECRET_KEY` - Object storage credentials

Production deployments use Kubernetes Secrets to inject these values securely.

## Test Coverage

All security measures are covered by automated tests to prevent regressions.

### Upload Security Tests

The upload test suite verifies authentication and authorization for all file operations:

- Session media uploads require authentication and session ownership
- Avatar uploads require authentication
- Board photo uploads require authentication and board ownership
- File deletion requires authentication, validates bucket whitelist, and verifies file ownership

Run with: `npm test -- upload.test.ts`

### Authentication Tests

The auth test suite includes tests for the admin check endpoint:

- Admin status check requires authentication
- Users can only check their own admin status
- Returns correct admin status based on database roles

Run with: `npm test -- auth.test.ts`

### Search Security Tests

The social test suite includes tests for ILIKE pattern escaping:

- Special characters (`%`, `_`, `\`) are properly escaped
- Prevents pattern injection attacks in search queries
- Returns empty results for empty queries

Run with: `npm test -- social.test.ts`

### Running All Tests

Execute the full test suite with:

```bash
cd api
npm test
```

All 82 tests should pass, including 13 new security-focused tests.

## Reporting Security Issues

If you discover a security vulnerability, please report it privately rather than opening a public issue. Contact the maintainers directly to coordinate disclosure.
