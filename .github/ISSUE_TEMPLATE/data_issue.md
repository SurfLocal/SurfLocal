---
name: Data Issue
about: Report problems with data collection, scraping, or database
title: "[DATA] "
labels: ["data", "triage"]
assignees: ""

---

## Data Issue Description
A clear description of the data-related problem you're experiencing.

## Data Type
What type of data is affected?
- [ ] Swell data (NOAA buoys)
- [ ] Wind data (OpenWeather API)
- [ ] Tide data
- [ ] Database storage
- [ ] Data processing/analysis
- [ ] Log files in MinIO
- [ ] Other (please specify)

## Location
Where did you encounter this issue?
- [ ] Web scraping job execution
- [ ] Database queries
- [ ] MinIO storage
- [ ] Argo Workflows
- [ ] Prometheus metrics
- [ ] Other (please specify)

## Reproduction Steps
Steps to reproduce the issue:

1. 
2. 
3. 

## Problem Description
Please describe what went wrong:

**Data Missing:**
- [ ] Expected data not present
- [ ] Incomplete data records
- [ ] Data not updating

**Data Quality:**
- [ ] Incorrect values
- [ ] Data format issues
- [ ] Duplicate records
- [ ] Out of range values

**Performance:**
- [ ] Slow data collection
- [ ] Timeout errors
- [ ] Resource exhaustion

**Other:**
- [ ] API errors
- [ ] Database connection issues
- [ ] Storage problems

## Specific Examples
Please provide specific examples of the problem:

**Buoy ID(s) affected:**
- [ ] 46237 (San Francisco)
- [ ] 46013 (Santa Monica)
- [ ] Other: ___________

**Time range:**
- From: [YYYY-MM-DD HH:MM]
- To: [YYYY-MM-DD HH:MM]

**Expected vs Actual:**
```
Expected: [what you expected to see]
Actual: [what you actually got]
```

## Database Query Results
If applicable, please provide database query results:

```sql
-- Paste your query here
SELECT * FROM ingested.swell_data 
WHERE buoy_id = '46237' 
  AND timestamp >= '2024-01-01'
ORDER BY timestamp DESC 
LIMIT 10;
```

## API Responses
If the issue involves external APIs, please provide the API response:

**NOAA Buoy API:**
```json
// Paste API response here
```

**OpenWeather API:**
```json
// Paste API response here
```

## Argo Workflow Status
If the issue involves workflow execution:

**Workflow Logs:**
```bash
# Paste argo logs output
argo logs -n argo <workflow-name>
```

**Workflow Status:**
```bash
# Paste workflow status
kubectl get workflow <workflow-name> -n argo -o yaml
```

## Environment Details
**Scraper Version:**
- Docker image: [e.g., surflocally/web-scraper:prod-latest]
- Commit hash: [if known]

**API Keys:**
- [ ] OpenWeather API key is valid
- [ ] NOAA API is accessible
- [ ] Database credentials are correct

**Database Connection:**
```bash
# Test database connection
psql -h postgres -U pi -d surf_analytics -c "SELECT COUNT(*) FROM ingested.swell_data;"
```

## Additional Context
Add any other context about the data issue here.

## Impact
- [ ] Critical - No data being collected
- [ ] High - Significant data loss or corruption
- [ ] Medium - Partial data collection issues
- [ ] Low - Minor data quality problems

## Checklist
- [ ] I have checked API key validity
- [ ] I have verified database connectivity
- [ ] I have checked workflow execution logs
- [ ] I have provided specific examples with timestamps
- [ ] I have included relevant query results
