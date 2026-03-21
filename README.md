# zipcheck

Check home safety scores for any US ZIP code from your terminal. Zero dependencies.

Data sourced from EPA SDWIS, Census ACS, EPA radon maps, and Superfund site records.

## Install

```bash
# Run instantly (no install)
npx zipcheck 60172

# Or install globally
npm install -g zipcheck
```

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
  "risks": [...],
  "recommendations": [...],
  "reportUrl": "https://zipcheckup.com/report/60172/"
}
```

### Pipe to other tools

```bash
# Get just the score
zipcheck 60172 --json | jq '.homeSafetyScore'

# Compare scores across multiple ZIPs
for zip in 60172 90210 10001 33101; do
  score=$(npx zipcheck $zip --json 2>/dev/null | jq -r '"\(.zip) \(.city), \(.state): \(.homeSafetyScore)/100"')
  echo "$score"
done
```

## Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for scripts/pipelines) |
| `--compare ZIP1 ZIP2` | Side-by-side comparison of two ZIPs |
| `--help` | Show usage information |
| `--version` | Show version |

## Scoring

Each ZIP receives a **Home Safety Score** (0-100) broken into four categories (each 0-25):

| Category | Based on |
|----------|----------|
| **Water Quality** | EPA violations, enforcement actions, contaminants, PFAS |
| **Lead Risk** | Lead levels, pre-1986 housing %, pipe infrastructure age |
| **Radon Risk** | EPA radon zone classification |
| **Environment** | Superfund proximity, electrical risk, housing age |

Grades: **A** (85-100), **B** (70-84), **C** (55-69), **D** (40-54), **F** (<40)

## Coverage

33,000+ US ZIP codes with data from:
- **EPA SDWIS** — Safe Drinking Water Information System
- **Census ACS** — American Community Survey (housing age)
- **EPA Radon** — Zone classifications by county
- **EPA Superfund** — CERCLIS site locations

## Requirements

- Node.js 14+
- No dependencies

## Links

- Full reports: [zipcheckup.com](https://zipcheckup.com)
- Data methodology: [zipcheckup.com/methodology](https://zipcheckup.com/methodology/)

## License

MIT
