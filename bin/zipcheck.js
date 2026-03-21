#!/usr/bin/env node

'use strict';

const https = require('https');
const http = require('http');

// ── ANSI colors (zero dependencies) ──────────────────────────────────────────

const IS_TTY = process.stdout.isTTY;

const c = {
  reset:   IS_TTY ? '\x1b[0m'  : '',
  bold:    IS_TTY ? '\x1b[1m'  : '',
  dim:     IS_TTY ? '\x1b[2m'  : '',
  red:     IS_TTY ? '\x1b[31m' : '',
  green:   IS_TTY ? '\x1b[32m' : '',
  yellow:  IS_TTY ? '\x1b[33m' : '',
  blue:    IS_TTY ? '\x1b[34m' : '',
  cyan:    IS_TTY ? '\x1b[36m' : '',
  white:   IS_TTY ? '\x1b[37m' : '',
  bgRed:   IS_TTY ? '\x1b[41m' : '',
  bgGreen: IS_TTY ? '\x1b[42m' : '',
  bgYellow:IS_TTY ? '\x1b[43m' : '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const VERSION = '1.0.0';
const API_BASE = 'https://zipcheckup.com/api/water';

function isValidZip(z) {
  return /^\d{5}$/.test(z);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': `zipcheck-cli/${VERSION}` } }, (res) => {
      if (res.statusCode === 404) {
        return reject(new Error('ZIP_NOT_FOUND'));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Invalid JSON response')); }
      });
    }).on('error', (e) => reject(new Error(`Network error: ${e.message}`)));
  });
}

// ── Scoring ──────────────────────────────────────────────────────────────────
// Compute sub-scores (each out of 25) from raw API data.
// The API provides homeSafetyScore (0-100) and homeSafetyGrade.
// Sub-scores are derived from the underlying risk factors.

function computeWaterScore(d) {
  let score = 25;
  // Health violations (most severe)
  score -= Math.min((d.healthViolations || 0) * 3, 10);
  // Total violations
  score -= Math.min((d.totalViolations || 0) * 1, 5);
  // Enforcement actions
  score -= Math.min((d.enforcement_count || 0) * 0.5, 5);
  // Active issues
  if (d.has_active_issues) score -= 3;
  // Boil water advisories
  if (d.boil_water_advisories > 0) score -= 5;
  // Contaminants detected
  score -= Math.min((d.contaminants || []).length * 1, 3);
  // PFAS
  if (d.pfasDetected) score -= 3;
  return Math.max(0, Math.min(25, Math.round(score)));
}

function computeLeadScore(d) {
  let score = 25;
  // Lead pipe risk
  if (d.leadPipeRisk === 'high') score -= 8;
  else if (d.leadPipeRisk === 'elevated') score -= 4;
  else if (d.leadPipeRisk === 'moderate') score -= 2;
  // Pre-1986 housing (lead solder)
  const pre86 = d.pre1986Pct || 0;
  if (pre86 > 70) score -= 7;
  else if (pre86 > 50) score -= 5;
  else if (pre86 > 30) score -= 3;
  else if (pre86 > 10) score -= 1;
  // Lead level (mg/L) — EPA action level is 0.015
  const lead = d.leadLevel || 0;
  if (lead > 0.015) score -= 8;
  else if (lead > 0.010) score -= 5;
  else if (lead > 0.005) score -= 3;
  else if (lead > 0.002) score -= 1;
  return Math.max(0, Math.min(25, Math.round(score)));
}

function computeRadonScore(d) {
  let score = 25;
  // EPA radon zones: 1 = highest risk, 2 = moderate, 3 = low
  const zone = d.radonZone;
  if (zone === 1) score -= 15;
  else if (zone === 2) score -= 5;
  // zone 3 or null = no deduction
  return Math.max(0, Math.min(25, Math.round(score)));
}

function computeEnvironmentScore(d) {
  let score = 25;
  // Superfund sites nearby
  const sf = d.superfundNearby || 0;
  if (sf >= 5) score -= 10;
  else if (sf >= 3) score -= 6;
  else if (sf >= 1) score -= 3;
  // Electrical risk
  if (d.electricalRisk === 'high') score -= 6;
  else if (d.electricalRisk === 'elevated') score -= 3;
  // Median home age (older = more risk for asbestos, etc.)
  const age = d.medianHomeAge || 0;
  if (age > 70) score -= 5;
  else if (age > 50) score -= 3;
  else if (age > 30) score -= 1;
  return Math.max(0, Math.min(25, Math.round(score)));
}

function buildScores(d) {
  const water = computeWaterScore(d);
  const lead = computeLeadScore(d);
  const radon = computeRadonScore(d);
  const env = computeEnvironmentScore(d);
  return { water, lead, radon, environment: env, total: water + lead + radon + env };
}

// ── Risk identification ──────────────────────────────────────────────────────

function buildRisks(d) {
  const risks = [];
  if ((d.healthViolations || 0) > 0) {
    risks.push(`${d.healthViolations} health violation${d.healthViolations > 1 ? 's' : ''} in recent testing`);
  }
  if ((d.totalViolations || 0) > 0 && (d.healthViolations || 0) === 0) {
    risks.push(`${d.totalViolations} water system violation${d.totalViolations > 1 ? 's' : ''} on record`);
  }
  if (d.has_active_issues) {
    risks.push('Active unresolved water system issues');
  }
  if ((d.boil_water_advisories || 0) > 0) {
    risks.push(`${d.boil_water_advisories} boil water advisor${d.boil_water_advisories > 1 ? 'ies' : 'y'} issued`);
  }
  if (d.pfasDetected) {
    risks.push('PFAS ("forever chemicals") detected in water supply');
  }
  if ((d.pre1986Pct || 0) > 40) {
    risks.push(`${d.pre1986Pct}% of homes built before 1986 (lead solder risk)`);
  }
  if (d.leadPipeRisk === 'high') {
    risks.push('High lead pipe risk based on housing age and infrastructure');
  }
  if (d.leadLevel > 0.010) {
    risks.push(`Lead level ${(d.leadLevel * 1000).toFixed(1)} ppb (EPA action level: 15 ppb)`);
  }
  if (d.radonZone === 1) {
    risks.push('EPA Radon Zone 1 — highest risk, testing strongly recommended');
  }
  if ((d.superfundNearby || 0) >= 2) {
    risks.push(`${d.superfundNearby} Superfund sites within proximity`);
  }
  if ((d.enforcement_count || 0) >= 5) {
    risks.push(`${d.enforcement_count} enforcement actions against water system`);
  }
  if ((d.contaminants || []).length > 0) {
    risks.push(`Contaminants detected: ${d.contaminants.join(', ')}`);
  }
  return risks;
}

// ── Recommendations ──────────────────────────────────────────────────────────

function buildRecommendations(d, scores) {
  const recs = [];
  if (scores.lead < 20) {
    recs.push('Test your water for lead ($20-40, EPA-certified lab)');
  }
  if (scores.water < 20 || d.pfasDetected) {
    recs.push('Install NSF/ANSI 53 certified water filter ($50-200)');
  }
  if (d.radonZone === 1) {
    recs.push('Get a radon test kit ($15-30) — mitigation if >4 pCi/L');
  } else if (d.radonZone === 2) {
    recs.push('Consider a radon test kit ($15-30), moderate risk area');
  }
  if ((d.pre1986Pct || 0) > 50 && d.medianHomeAge > 40) {
    recs.push('Check for lead paint if your home was built before 1978');
  }
  if ((d.superfundNearby || 0) >= 2) {
    recs.push('Review nearby Superfund sites on EPA.gov for your area');
  }
  if (d.has_active_issues) {
    recs.push('Check your water utility\'s latest consumer confidence report');
  }
  if (recs.length === 0) {
    recs.push('Your area looks good! Annual water testing is still recommended');
  }
  return recs;
}

// ── Grade color ──────────────────────────────────────────────────────────────

function gradeColor(grade) {
  if (grade === 'A' || grade === 'A+') return c.green;
  if (grade === 'B') return c.yellow;
  if (grade === 'C') return c.yellow;
  return c.red;
}

function scoreBar(score, max) {
  if (!IS_TTY) return '';
  const width = 20;
  const filled = Math.round((score / max) * width);
  const empty = width - filled;
  const pct = score / max;
  let color = c.green;
  if (pct < 0.5) color = c.red;
  else if (pct < 0.75) color = c.yellow;
  return ` ${color}${'█'.repeat(filled)}${c.dim}${'░'.repeat(empty)}${c.reset}`;
}

// ── Output formatting ────────────────────────────────────────────────────────

function formatReport(d) {
  const scores = buildScores(d);
  const risks = buildRisks(d);
  const recs = buildRecommendations(d, scores);
  const gc = gradeColor(d.homeSafetyGrade);

  const lines = [];
  lines.push('');
  lines.push(`${c.bold}ZipCheckup Report: ${d.zip} — ${d.city}, ${d.state}${c.reset}`);
  lines.push('');
  lines.push(`${c.bold}Home Safety Score: ${gc}${d.homeSafetyScore}/100 (${d.homeSafetyGrade})${c.reset}`);
  lines.push(`  Water Quality:  ${pad(scores.water, 2)}/25${scoreBar(scores.water, 25)}`);
  lines.push(`  Lead Risk:      ${pad(scores.lead, 2)}/25${scoreBar(scores.lead, 25)}`);
  lines.push(`  Radon Risk:     ${pad(scores.radon, 2)}/25${scoreBar(scores.radon, 25)}`);
  lines.push(`  Environment:    ${pad(scores.environment, 2)}/25${scoreBar(scores.environment, 25)}`);

  if (risks.length > 0) {
    lines.push('');
    lines.push(`${c.bold}Top Risks:${c.reset}`);
    risks.slice(0, 5).forEach(r => {
      lines.push(`  ${c.yellow}!${c.reset} ${r}`);
    });
  }

  lines.push('');
  lines.push(`${c.bold}Recommendations:${c.reset}`);
  recs.forEach((r, i) => {
    lines.push(`  ${i + 1}. ${r}`);
  });

  lines.push('');
  lines.push(`${c.dim}Full report: https://zipcheckup.com/report/${d.zip}/${c.reset}`);
  lines.push('');

  return lines.join('\n');
}

function formatCompare(d1, d2) {
  const s1 = buildScores(d1);
  const s2 = buildScores(d2);

  const lines = [];
  lines.push('');
  lines.push(`${c.bold}ZipCheckup Comparison${c.reset}`);
  lines.push('');

  const label1 = `${d1.zip} (${d1.city}, ${d1.state})`;
  const label2 = `${d2.zip} (${d2.city}, ${d2.state})`;
  const w = 28;

  lines.push(`  ${pad(' ', 18)} ${padRight(label1, w)} ${padRight(label2, w)}`);
  lines.push(`  ${'─'.repeat(18 + w * 2 + 2)}`);

  function row(name, v1, v2, max) {
    const diff = v1 - v2;
    let indicator = '';
    if (diff > 0) indicator = `${c.green} (+${diff})${c.reset}`;
    else if (diff < 0) indicator = `${c.red} (${diff})${c.reset}`;
    lines.push(`  ${padRight(name, 18)} ${padRight(`${v1}/${max}`, w)} ${padRight(`${v2}/${max}`, w)}${indicator}`);
  }

  const gc1 = gradeColor(d1.homeSafetyGrade);
  const gc2 = gradeColor(d2.homeSafetyGrade);
  lines.push(`  ${padRight('Overall', 18)} ${gc1}${padRight(`${d1.homeSafetyScore}/100 (${d1.homeSafetyGrade})`, w)}${c.reset} ${gc2}${padRight(`${d2.homeSafetyScore}/100 (${d2.homeSafetyGrade})`, w)}${c.reset}`);
  row('Water Quality', s1.water, s2.water, 25);
  row('Lead Risk', s1.lead, s2.lead, 25);
  row('Radon Risk', s1.radon, s2.radon, 25);
  row('Environment', s1.environment, s2.environment, 25);

  lines.push('');
  lines.push(`${c.dim}Full reports:${c.reset}`);
  lines.push(`  ${c.dim}https://zipcheckup.com/report/${d1.zip}/${c.reset}`);
  lines.push(`  ${c.dim}https://zipcheckup.com/report/${d2.zip}/${c.reset}`);
  lines.push('');

  return lines.join('\n');
}

function formatJSON(d) {
  const scores = buildScores(d);
  const risks = buildRisks(d);
  const recs = buildRecommendations(d, scores);
  return JSON.stringify({
    zip: d.zip,
    city: d.city,
    state: d.state,
    homeSafetyScore: d.homeSafetyScore,
    homeSafetyGrade: d.homeSafetyGrade,
    scores: {
      waterQuality: scores.water,
      leadRisk: scores.lead,
      radonRisk: scores.radon,
      environment: scores.environment,
    },
    risks,
    recommendations: recs,
    reportUrl: `https://zipcheckup.com/report/${d.zip}/`,
  }, null, 2);
}

function pad(val, len) {
  return String(val).padStart(len, ' ');
}

function padRight(val, len) {
  return String(val).padEnd(len, ' ');
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const HELP = `
${c.bold}zipcheck${c.reset} — Check home safety scores for any US ZIP code

${c.bold}Usage:${c.reset}
  zipcheck <ZIP>                    Look up a ZIP code
  zipcheck --compare <ZIP1> <ZIP2>  Compare two ZIP codes
  zipcheck <ZIP> --json             Machine-readable output
  zipcheck --help                   Show this help
  zipcheck --version                Show version

${c.bold}Examples:${c.reset}
  zipcheck 60172                    Roselle, IL
  zipcheck 90210 --json             Beverly Hills, JSON output
  zipcheck --compare 60172 90210    Side-by-side comparison

${c.bold}Data:${c.reset}
  Scores derived from EPA SDWIS, Census ACS, EPA radon maps,
  and Superfund site data. Updated quarterly.

  ${c.dim}https://zipcheckup.com${c.reset}
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    process.stdout.write(HELP + '\n');
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`zipcheck ${VERSION}`);
    process.exit(0);
  }

  const jsonMode = args.includes('--json');
  const compareIdx = args.indexOf('--compare');

  try {
    if (compareIdx !== -1) {
      // Compare mode
      const zips = args.filter(a => !a.startsWith('--'));
      if (zips.length < 2) {
        console.error(`${c.red}Error:${c.reset} --compare requires two ZIP codes`);
        console.error('  Usage: zipcheck --compare 60172 90210');
        process.exit(1);
      }
      const [zip1, zip2] = zips.slice(0, 2);
      if (!isValidZip(zip1) || !isValidZip(zip2)) {
        console.error(`${c.red}Error:${c.reset} Invalid ZIP code. Must be 5 digits.`);
        process.exit(1);
      }
      const [d1, d2] = await Promise.all([
        fetchJSON(`${API_BASE}/${zip1}.json`),
        fetchJSON(`${API_BASE}/${zip2}.json`),
      ]);
      if (jsonMode) {
        console.log(JSON.stringify({
          comparison: [JSON.parse(formatJSON(d1)), JSON.parse(formatJSON(d2))],
        }, null, 2));
      } else {
        process.stdout.write(formatCompare(d1, d2));
      }
    } else {
      // Single ZIP mode
      const zip = args.find(a => !a.startsWith('--'));
      if (!zip) {
        console.error(`${c.red}Error:${c.reset} Please provide a ZIP code.`);
        console.error('  Usage: zipcheck 60172');
        process.exit(1);
      }
      if (!isValidZip(zip)) {
        console.error(`${c.red}Error:${c.reset} "${zip}" is not a valid ZIP code. Must be 5 digits.`);
        process.exit(1);
      }
      const data = await fetchJSON(`${API_BASE}/${zip}.json`);
      if (jsonMode) {
        console.log(formatJSON(data));
      } else {
        process.stdout.write(formatReport(data));
      }
    }
  } catch (err) {
    if (err.message === 'ZIP_NOT_FOUND') {
      console.error(`${c.red}Error:${c.reset} No data found for ZIP ${args.find(a => /^\d{5}$/.test(a)) || '?'}.`);
      console.error('  We cover 33,000+ US ZIP codes. This one may not be in our database yet.');
    } else if (err.message.includes('Network error') || err.message.includes('ENOTFOUND')) {
      console.error(`${c.red}Error:${c.reset} Could not reach zipcheckup.com. Check your internet connection.`);
    } else {
      console.error(`${c.red}Error:${c.reset} ${err.message}`);
    }
    process.exit(1);
  }
}

main();
