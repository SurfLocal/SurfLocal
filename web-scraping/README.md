# Web Scraping Docker Images

This repository contains Dockerfiles and scripts for running web scrapers that collect surf-related data. The scrapers are built as Docker images and executed in a Kubernetes environment using Argo Workflows.

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

#### Build & Run Commands

```
docker build -f web_scraper.Dockerfile \
  --build-arg DB_HOST=<RASPBERRY_PI_IP> \
  --build-arg DB_USER=<DB_USER> \
  --build-arg DB_PASSWORD=<DB_PASSWORD> \
  --build-arg DB_NAME=surf_analytics \
  --build-arg API_KEY=<API_KEY> \
  --build-arg JOB_NAME=wind_scraper_hourly.py \
  -t argo-wind-scraper-hourly:latest .

docker run --name argo-wind-scraper-hourly argo-wind-scraper-hourly:latest
```

## Deployment and Secrets Management

All sensitive information, such as database credentials and API keys, is securely stored in GitHub repository secrets. These secrets are automatically retrieved by the GitHub Actions workflow during the build process.

## Database Configuration

The PostgreSQL database used for storing scraped data is hosted on a Raspberry Pi. The workflow passes the appropriate database configuration as build arguments, ensuring seamless integration during deployment.
