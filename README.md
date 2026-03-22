# zipcheck

> Check home safety scores for any US ZIP code — from your terminal.

[![npm version](https://img.shields.io/npm/v/zipcheck.svg)](https://www.npmjs.com/package/zipcheck)
[![npm downloads](https://img.shields.io/npm/dm/zipcheck.svg)](https://www.npmjs.com/package/zipcheck)
[![Node.js version](https://img.shields.io/node/v/zipcheck.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by ZipCheckup](https://img.shields.io/badge/Powered%20by-ZipCheckup-teal)](https://zipcheckup.com)

Water quality violations, lead risk, radon zones, and Superfund proximity — all in one score. Zero dependencies. Works with `npx` instantly.

```
$ npx zipcheck 90210

ZipCheckup Report: 90210 — Beverly Hills, CA

Home Safety Score: 85/100 (A)
  Water Quality:  24/25 ████████████████████░░░░
  Lead Risk:      18/25 ██████████████░░░░░░░░░░
  Radon Risk:     25/25 ████████████████████████
  Environment:    20/25 ████████████████░░░░░░░░

Recommendations:
  1. Your area looks good! Annual water testing is still recommended

Full report: https://zipcheckup.com/report/90210/
```

## Install

```bash
# Run instantly — no install needed
npx zipcheck 60172

# Or install globally
npm install -g zipcheck
```

## Demo

![zipcheck demo](https://zipcheckup.com/assets/zipcheck-demo.gif)

> The demo above shows a lookup for ZIP 60172 (Roselle, IL), a comparison between two ZIPs, and JSON output piped to `jq`.

**What the GIF shows:**
1. `zipcheck 60172` — colored score report with progress bars and risk list
2. `zipcheck --compare 60172 90210` — side-by-side table with diff indicators
3. `zipcheck 60172 --json | jq '.homeSafetyScore'` — JSON output for scripting

## Usage

### Basic lookup

```bash
$ zipcheck 60172

ZipCheckup Report: 60172 — Roselle, IL

Home Safety Score: 77/100 (B)
  Water Quality:  22/25 ████████████████░░░░
  Lead Risk:      10/25 ████████░░░░░░░░░░░░
  Radon Risk:     20/25 ████████████████░░░░
  Environment:    16/25 █████████████░░░░░░░

Top Risks:
  ! 71% of homes built before 1986 (lead solder risk)
  ! High lead pipe risk based on housing age and infrastructure
  ! 2 Superfund sites within proximity
  ! 10 enforcement actions against water system

Recommendations:
  1. Test your water for lead ($20-40, EPA-certified lab)
  2. Consider a radon test kit ($15-30), moderate risk area
  3. Check for lead paint if your home was built before 1978
  4. Review nearby Superfund sites on EPA.gov for your area

Full report: https://zipcheckup.com/report/60172/
```

### Compare two ZIP codes

```bash
$ zipcheck --compare 60172 90210

ZipCheckup Comparison

                    60172 (Roselle, IL)      90210 (Beverly Hills, CA)
  ──────────────────────────────────────────────────────────────────────
  Overall           77/100 (B)               85/100 (A)
  Water Quality     22/25                    24/25               (-2)
  Lead Risk         10/25                    18/25               (-8)
  Radon Risk        20/25                    25/25               (-5)
  Environment       16/25                    20/25               (-4)
```

### JSON output

```bash
$ zipcheck 60172 --json
{
  "zip": "60172",
  "city": "Roselle",
  "state": "IL",
  "homeSafetyScore": 77,
  "homeSafetyGrade": "B",
  "scores": {
    "waterQuality": 22,
    "leadRisk": 10,
    "radonRisk": 20,
    "environment": 16
  },
  "risks": [
    "71% of homes built before 1986 (lead solder risk)",
    "High lead pipe risk based on housing age and infrastructure",
    "2 Superfund sites within proximity",
    "10 enforcement actions against water system"
  ],
  "recommendations": [
    "Test your water for lead ($20-40, EPA-certified lab)",
    "Consider a radon test kit ($15-30), moderate risk area"
  ],
  "reportUrl": "https://zipcheckup.com/report/60172/"
}
```

### Pipe to other tools

```bash
# Get just the score
zipcheck 60172 --json | jq '.homeSafetyScore'

# Grade only
zipcheck 60172 --json | jq -r '.homeSafetyGrade'

# Scan a list of ZIPs and sort by score
for zip in 60172 90210 10001 33101 98101; do
  zipcheck $zip --json 2>/dev/null | \
    jq -r '"\(.homeSafetyScore) \(.zip) \(.city), \(.state)"'
done | sort -rn

# Check if a ZIP has any health violations
zipcheck 60172 --json | jq 'if (.risks | length) > 0 then "RISKS FOUND" else "CLEAN" end'
```

## Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (machine-readable, for scripts and pipelines) |
| `--compare ZIP1 ZIP2` | Side-by-side comparison of two ZIP codes |
| `--help` | Show usage information |
| `--version` | Show version |

## API Reference

### JSON Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `zip` | `string` | 5-digit ZIP code |
| `city` | `string` | City name |
| `state` | `string` | 2-letter state abbreviation |
| `homeSafetyScore` | `number` | Overall score, 0–100 |
| `homeSafetyGrade` | `string` | Letter grade: A, B, C, D, or F |
| `scores.waterQuality` | `number` | Water quality sub-score, 0–25 |
| `scores.leadRisk` | `number` | Lead risk sub-score, 0–25 |
| `scores.radonRisk` | `number` | Radon risk sub-score, 0–25 |
| `scores.environment` | `number` | Environmental risk sub-score, 0–25 |
| `risks` | `string[]` | List of identified risk factors |
| `recommendations` | `string[]` | Actionable recommendations |
| `reportUrl` | `string` | Link to full web report |

### Score Grades

| Grade | Score Range | Meaning |
|-------|-------------|---------|
| **A** | 85–100 | Low risk across all categories |
| **B** | 70–84 | Generally safe, minor concerns |
| **C** | 55–69 | Moderate risks worth attention |
| **D** | 40–54 | Multiple significant risk factors |
| **F** | 0–39  | High risk, action recommended |

## Scoring Methodology

Each ZIP receives a **Home Safety Score** (0–100) broken into four equal categories (each 0–25):

| Category | Data Sources | Key Factors |
|----------|-------------|-------------|
| **Water Quality** | EPA SDWIS | Health violations, contaminants, PFAS detection, enforcement actions, boil advisories |
| **Lead Risk** | EPA SDWIS + Census ACS | Lead pipe infrastructure age, pre-1986 housing %, measured lead levels |
| **Radon Risk** | EPA Radon Map | County-level radon zone (Zone 1 = highest risk) |
| **Environment** | EPA Superfund + Census ACS | Superfund site proximity, electrical risk, median home age |

## Coverage

**33,000+ US ZIP codes** with quarterly data updates from:

- **EPA SDWIS** — Safe Drinking Water Information System (violations, enforcement, contaminants)
- **Census ACS** — American Community Survey (housing age, infrastructure estimates)
- **EPA Radon** — Zone classifications by county (Zones 1–3)
- **EPA Superfund** — CERCLIS database (proximity scoring)

## Requirements

- Node.js 14+
- No runtime dependencies

## Related

- **Full web reports:** [zipcheckup.com](https://zipcheckup.com) — detailed breakdowns with maps, trends, and methodology
- **npm data package:** [us-water-quality-data](https://www.npmjs.com/package/us-water-quality-data) — raw EPA water quality data for 6,300+ ZIPs (for developers building their own tools)
- **Methodology:** [zipcheckup.com/methodology](https://zipcheckup.com/methodology/) — how scores are calculated

## Contributing

Issues and PRs welcome at [github.com/artakulov/zipcheck](https://github.com/artakulov/zipcheck).

## License

MIT — see [LICENSE](LICENSE)

---

Powered by [ZipCheckup](https://zipcheckup.com) — Home safety data for every US ZIP code.
