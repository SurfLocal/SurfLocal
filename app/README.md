# Salt - Frontend Application

**Surf session logging and social platform for surfers**

This is the frontend React application for the Salt platform, a self-hosted surf tracking application.

## Architecture

This application is part of the Salt ecosystem:
- **Frontend**: React + TypeScript + Vite (this directory)
- **Backend**: Express.js + TypeScript API (`/api`)
- **Database**: PostgreSQL (`/postgres`)
- **Storage**: MinIO S3-compatible object storage (`/helm/minio`)
- **Infrastructure**: Kubernetes + Ansible (`/helm`, `/ansible`)

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Mapbox GL** - Interactive maps
- **Recharts** - Data visualization

## Prerequisites

- Node.js 18+ and npm
- Backend API running (see `/api/README.md`)
- PostgreSQL database (see `/postgres`)
- MinIO storage (see `/helm/minio`)

## Local Development

### 1. Install Dependencies

```bash
cd app
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.qa` or `.env.prod`:

```bash
cp .env.example .env.qa
# Edit with your values
```

Required variables:
```env
VITE_API_URL=http://localhost:3000/api
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

### 3. Start Development Server

```bash
npm run dev
```

Application will be available at `http://localhost:5173`

## Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

Built files will be in `dist/` directory.

## Docker Deployment

### Build Container (ARM64 for Raspberry Pi)

```bash
# From project root
docker build -f app/salt_app.Dockerfile -t salt-app:latest .
```

### Run Container

```bash
docker run -p 80:80 \
  --build-arg VITE_API_URL=http://api.salt.local/api \
  --build-arg VITE_MAPBOX_TOKEN=your_mapbox_token \
  salt-app:latest
```

### Docker Compose

```bash
# From project root - runs entire stack
docker-compose up
```

## Features

### Core Features
- **Session Logging** - Log surf sessions with location, conditions, ratings
- **Quiver Management** - Track your surfboards
- **Social Feed** - View and interact with other surfers' sessions
- **Spot Reports** - Real-time surf conditions and forecasts
- **Maps** - Interactive map of surf spots and sessions
- **Profile & Stats** - User profiles with session statistics
- **Connections** - Follow other surfers

### Media Features
- **Photo/Video Upload** - Attach media to sessions
- **Avatar Management** - Custom profile pictures
- **Board Photos** - Visual quiver management

### Analytics
- **Session Statistics** - Track your surfing progress
- **Streak Tracking** - Monitor consistency
- **Activity Charts** - Visualize your surf data

## Project Structure

```
app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Auth, Theme)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and API client
│   ├── pages/          # Route components
│   └── assets/         # Images and icons
├── public/             # Static assets
├── nginx.conf          # Nginx configuration for production
├── salt_app.Dockerfile  # Docker build configuration
└── package.json        # Dependencies and scripts
```

## Status

**Completed:**
- All UI components and pages
- JWT authentication via Salt API
- File uploads via MinIO
- Session management
- Social features (follows, likes, comments)
- Quiver management
- Maps and spot reports

**Pending Backend Endpoints:**
- Forecast comments (daily discussions)
- Favorite spots management
- Saved locations
- Admin user management
- Top surfers leaderboard

## API Integration

The frontend communicates with the Salt backend API:

```typescript
// Example API call
import { api } from '@/lib/api';

const sessions = await api.get('/sessions/public');
const newSession = await api.post('/sessions', sessionData);
```

See `/api/README.md` for complete API documentation.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | http://localhost:3000/api |
| `VITE_MAPBOX_TOKEN` | Mapbox API token for maps | (required) |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build with development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report

## Testing

The app includes a comprehensive test suite using Vitest and React Testing Library.

### Test Structure

```
app/tests/
├── setup.ts                          # Vitest setup and environment config
├── mocks/                            # Shared test mocks
│   ├── api.ts                        # API client mocks
│   └── auth.ts                       # Auth context mocks
├── unit/                             # Unit tests
│   ├── lib/
│   │   ├── formatNumber.test.ts      # Number formatting tests
│   │   └── utils.test.ts             # Utility function tests
│   └── components/
│       ├── ImageLightbox.test.tsx    # ImageLightbox component tests
│       └── SessionCard.test.tsx      # SessionCard component tests
└── integration/                      # Integration tests
    ├── api.test.ts                   # API client integration tests
    └── auth.test.tsx                 # Authentication flow tests
```

### Running Tests

#### Install Test Dependencies

```bash
cd app
npm install
```

#### Run All Tests (Watch Mode)

```bash
npm test
```

#### Run Tests Once

```bash
npm run test:run
```

#### Run Tests with Coverage

```bash
npm run test:coverage
```

#### Run Specific Test File

```bash
npm test tests/unit/lib/formatNumber.test.ts
```

#### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="formatStatNumber"
```

### Test Coverage

Coverage reports are generated in the `coverage/` directory. View the HTML report by opening `coverage/index.html`.

### Writing New Tests

1. Place unit tests in `tests/unit/` following the source structure
2. Place integration tests in `tests/integration/`
3. Use the provided mocks in `tests/mocks/` for API and auth
4. Use `@testing-library/react` for component testing
5. Follow the existing test patterns for consistency

### Test Utilities

The test setup includes:

- **jsdom** - DOM environment for React testing
- **@testing-library/react** - React component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom DOM matchers

Example test:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from '../src/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Deployment

### Kubernetes

See `/helm/README.md` for Helm chart deployment documentation.

### Nginx Configuration

The production build uses Nginx to serve static files with:
- Gzip compression
- Browser caching for assets
- SPA routing support
- Security headers

See `nginx.conf` for configuration details.

## Contributing

See `/CONTRIBUTING.md` for contribution guidelines.

## License

See project root for license information.

## Support

For issues and questions, please use the GitHub issue tracker.
