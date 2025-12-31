# Web Scraping

This directory contains Docker images and scripts for automated surf data collection. The scrapers are built as multi-architecture Docker images and deployed to the Kubernetes cluster via Argo Workflows, which orchestrates scheduled execution and log management.

## Automated Docker Image Builds

Docker images for the scrapers are automatically built and pushed to Docker Hub using a GitHub Actions workflow defined in `.github/workflows/docker-build.yml`. The workflow is triggered when changes are pushed to the `main` or `qa` branches via a pull request. It tags the images accordingly and securely retrieves necessary secrets for the build process.

### Build Process

The GitHub Actions workflow:
1. Runs when a push to the `main` or `qa` branches occurs (only through a PR merge).
2. Checks out the repository.
3. Sets up Docker Buildx.
4. Extracts the latest commit hash to use for tagging.
5. Determines the target branch and assigns a tag prefix (`qa` for `qa`, `prod` for `main`).
6. Builds the Docker images with appropriate build arguments (database credentials, API keys, etc.).
7. Tags images with `<prefix>-latest` and `<prefix>-<commit-hash>`.
8. Pushes the built images to Docker Hub.

## Swell Scraper

This scraper collects wave and swell data from NOAA buoys. The extracted information includes:
- Wave height
- Swell height
- Swell period
- Swell direction
- Wind wave height
- Wind wave period
- Wind wave direction
- Wave steepness
- Average wave period

## Wind Scraper

This scraper fetches real-time wind data from the OpenWeather API. The extracted information includes:
- Wind speed
- Wind direction
- Wind gusts (if available)

### Manual Testing

To test scrapers locally:

```bash
# Build image
docker build -f web_scraper.Dockerfile \
  --build-arg DB_HOST=<RASPBERRY_PI_IP> \
  --build-arg DB_USER=<DB_USER> \
  --build-arg DB_PASSWORD=<DB_PASSWORD> \
  --build-arg DB_NAME=surf_analytics \
  --build-arg API_KEY=<API_KEY> \
  --build-arg JOB_NAME=wind_scraper_hourly.py \
  -t web-scraper:test .

# Run locally
docker run --rm web-scraper:test
```

**Or test directly on a cluster node:**

```bash
ssh worker1
docker run --rm surflocally/web-scraper:prod-latest python /app/jobs/swell_scraper_hourly.py
```

## Deployment

### Kubernetes Deployment via Argo Workflows

Scrapers are deployed as CronWorkflows in the Kubernetes cluster:

- **Namespace**: `argo`
- **Schedule**: Hourly execution (`0 * * * *`)
- **Timezone**: America/Los_Angeles
- **Log Storage**: MinIO S3-compatible storage at `http://master:31000`

**Active Workflows:**
- `swell-scraper-hourly`: Collects NOAA buoy data every hour
- `wind-scraper-hourly`: Fetches OpenWeather API data every hour

Logs are automatically uploaded to the `argo-logs` MinIO bucket in JSON format. See the [Argo Workflows Helm chart](../helm/argo-workflows/README.md) for deployment details.

### Secrets Management

**Build-time secrets** (GitHub Actions):
- Database credentials and API keys are stored in GitHub repository secrets
- Automatically injected during Docker image builds

**Runtime secrets** (Kubernetes):
- Database connection details configured in Argo Workflow templates
- MinIO credentials stored in Kubernetes secrets
- API keys passed as environment variables to workflow pods

### Database Configuration

The PostgreSQL database is hosted on a dedicated Raspberry Pi node:
- **Host**: `postgres` (resolved via CoreDNS)
- **Database**: `surf_analytics`
- **Connection**: Configured in Argo Workflow templates
- **Monitoring**: PostgreSQL Exporter provides metrics to Prometheus

## Testing

Comprehensive unit and integration tests are provided for both scraper jobs to ensure reliability and correctness.

### Test Structure

```
web-scraping/jobs/tests/
├── __init__.py
├── conftest.py                    # Shared fixtures and configuration
├── test_swell_scraper_unit.py     # Unit tests for swell scraper
├── test_wind_scraper_unit.py      # Unit tests for wind scraper
└── test_integration.py            # Integration tests for both scrapers
```

### Running Tests

#### Install Test Dependencies

```bash
cd web-scraping
pip install -r requirements-test.txt
```

#### Run All Tests

```bash
pytest
```

#### Run Specific Test Categories

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run tests for a specific scraper
pytest jobs/tests/test_swell_scraper_unit.py
pytest jobs/tests/test_wind_scraper_unit.py
```

#### Run with Coverage Report

```bash
# Terminal coverage report
pytest --cov=jobs --cov-report=term-missing

# HTML coverage report (opens in browser)
pytest --cov=jobs --cov-report=html
open htmlcov/index.html
```

#### Run Verbose Output

```bash
pytest -v
```

### Test Coverage

The test suite includes:

**Unit Tests:**
- `extract_number()` utility function
- `fetch_swell_data()` - data extraction from NOAA buoys
- `fetch_wind_data()` - data extraction from OpenWeather API
- `insert_swell_data()` - database insertion for swell data
- `insert_wind_data()` - database insertion for wind data
- `get_buoy_ids()` - buoy ID retrieval from database
- `get_spot_info()` - spot information retrieval from database

**Integration Tests:**
- Full swell scraper workflow (fetch → parse → insert)
- Full wind scraper workflow (fetch → parse → insert)
- Error handling and partial failures
- Database connection management
- API failure scenarios

### Writing New Tests

When adding new functionality:

1. **Add unit tests** for individual functions in the appropriate `test_*_unit.py` file
2. **Add integration tests** in `test_integration.py` for end-to-end workflows
3. **Use fixtures** from `conftest.py` for common test setup
4. **Mock external dependencies** (HTTP requests, database connections)
5. **Follow naming conventions**: `test_<function_name>_<scenario>`

### Continuous Integration

Tests are automatically run in the CI/CD pipeline before Docker images are built and deployed. All tests must pass before changes are merged to `main` or `qa` branches.
