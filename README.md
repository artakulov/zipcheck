# zipcheck

Available home-safety evidence for a US ZIP code, right in your terminal. Unknown and insufficient-coverage values remain explicit.

## Setup

Since 2026-08-19 the API requires a key. Free, no card:

1. Get one at [zipcheckup.com/api/pricing/](https://zipcheckup.com/api/pricing/)
2. `export ZIPCHECKUP_API_KEY=zc_live_...`

The key is read from the environment rather than a flag or a config file: a flag ends up in shell history, a config file ends up committed.

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

- **Versioned safety grade** when all required model domains have sufficient evidence
- **Water evidence** with unknown values kept distinct from measured zero
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

The CLI calls the public ZipCheckup API:

```
GET https://api.zipcheckup.com/v1/zip/{zip}
GET https://api.zipcheckup.com/v1/zip/{zip}/score
```

Both take `X-API-Key`. Rate limit is **100 requests per day** on the free tier, counted per key, resetting at midnight UTC — one ZIP lookup uses two requests. Higher limits, bulk lookup and CSV export are on the paid tier: [zipcheckup.com/api/pricing/](https://zipcheckup.com/api/pricing/). Full reference: [zipcheckup.com/api/docs/](https://zipcheckup.com/api/docs/).

## Upgrading from 1.x

1.x sent no key and stopped working when the API began requiring one. Set `ZIPCHECKUP_API_KEY` and it works again. Nothing else changed: same commands, same output.

The old README said the limit was 100 requests per *minute*. It was never that — the worker has counted 100 per day since it was written.

## License

MIT — Data is CC BY 4.0 (attribution required).

Built by [ZipCheckup](https://zipcheckup.com). Check the full report for source, vintage, and geographic-coverage limitations.
