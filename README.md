# zipcheck

Home safety report for any US ZIP code, right in your terminal.

```
npx zipcheck 10001
```

```
  ┌─────────────────────────────────────────┐
  │  Home Safety Report: ZIP 10001          │
  └─────────────────────────────────────────┘

  Grade:  B (72/100)
  Location:  New York, NY (New York County)
  Population:  21,102
  Water System:  NEW YORK CITY (Surface water)

  Health Violations (5yr):  0
  Lead Level:  0.004 mg/L
  Radon Risk:  Zone 3 (Low)

  National Rank:  Better than 68% of US ZIPs

  Full report: https://zipcheckup.com/report/10001/
  Data: EPA SDWIS, FEMA, Census, CDC | CC BY 4.0
```

## Features

- **Instant safety grade** (A–F) for any of 29,000+ US ZIP codes
- **Water quality** — EPA violations, lead levels, PFAS detection
- **Environmental risks** — radon zones, flood claims, air quality
- **Compare two ZIPs** side by side
- **JSON output** for scripting and automation
- **Zero dependencies** — just Node.js 14+

## Usage

```bash
# Check a ZIP code
npx zipcheck 90210

# JSON output (for piping/scripting)
npx zipcheck 10001 --json

# Compare two ZIP codes
npx zipcheck --compare 10001 90210
```

## Data Sources

All data from official US government sources:
- EPA SDWIS (water quality, violations)
- FEMA NFIP (flood claims)
- U.S. Census (demographics, housing)
- CDC (health risk factors)
- EIA (energy costs)
- USGS (radon zones)
- And 9 more federal databases

Full methodology at [zipcheckup.com/press/](https://zipcheckup.com/press/)

## API

The CLI uses the free ZipCheckup API:

```
https://api.zipcheckup.com/v1/{zip}.json
```

Rate limit: 100 requests/minute. For bulk access, contact data@zipcheckup.com.

## License

MIT — Data is CC BY 4.0 (attribution required).

Built by [ZipCheckup](https://zipcheckup.com) — Home Safety Reports for Every US ZIP Code.
