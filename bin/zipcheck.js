#!/usr/bin/env node

'use strict';

const https = require('https');

const VERSION = '1.0.0';
const API_BASE = 'https://api.zipcheckup.com/v1';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan: '\x1b[36m', white: '\x1b[37m',
};

function gradeColor(grade) {
  if (grade === 'A' || grade === 'B') return C.green;
  if (grade === 'C') return C.yellow;
  if (grade === 'D' || grade === 'F') return C.red;
  return C.dim;
}

function known(value) {
  return value !== null && value !== undefined;
}

function displayNumber(value) {
  return known(value) ? Number(value).toLocaleString() : 'N/A';
}

function pfasLabel(value) {
  if (value === true) return 'Detected';
  if (value === false) return 'Not detected in reported evidence';
  return 'N/A';
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'zipcheck-cli/' + VERSION } }, (res) => {
      if (res.statusCode === 404) return reject(new Error('ZIP code not found'));
      if (res.statusCode !== 200) return reject(new Error('API error: ' + res.statusCode));
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid response')); }
      });
    }).on('error', reject);
  });
}

async function getZipData(zip) {
  const [main, score] = await Promise.all([
    fetch(`${API_BASE}/zip/${zip}`),
    fetch(`${API_BASE}/zip/${zip}/score`),
  ]);
  return { ...main.data, score: score.data.score, grade: score.data.grade };
}

function printReport(d) {
  const gc = gradeColor(d.grade);

  console.log();
  console.log(`${C.bold}${gc}  ┌─────────────────────────────────────────┐${C.reset}`);
  console.log(`${C.bold}${gc}  │  Home Safety Report: ZIP ${d.zip}          │${C.reset}`);
  console.log(`${C.bold}${gc}  └─────────────────────────────────────────┘${C.reset}`);
  console.log();

  const grade = known(d.grade) ? d.grade : 'N/A';
  const score = known(d.score) ? `${d.score}/100` : 'insufficient coverage';
  console.log(`  ${C.bold}Grade:${C.reset}  ${gc}${C.bold}${grade}${C.reset} ${C.dim}(${score})${C.reset}`);
  console.log(`  ${C.bold}Location:${C.reset}  ${d.city}, ${d.state}${d.county ? ' (' + d.county + ' County)' : ''}`);

  if (known(d.totalPopulation)) {
    console.log(`  ${C.bold}Population:${C.reset}  ${Number(d.totalPopulation).toLocaleString()}`);
  }

  if (d.primarySystem) {
    console.log(`  ${C.bold}Water System:${C.reset}  ${d.primarySystem.name} (${d.primarySystem.sourceLabel || d.primarySystem.source})`);
  }

  console.log();

  // Violations
  const hv = d.healthViolations;
  const hvColor = !known(hv) ? C.dim : hv > 0 ? C.red : C.green;
  console.log(`  ${C.bold}Health Violations:${C.reset}  ${hvColor}${displayNumber(hv)}${C.reset}`);
  if (known(d.totalViolations)) {
    console.log(`  ${C.bold}Total Violations:${C.reset}  ${d.totalViolations}`);
  }

  // Lead
  if (known(d.leadLevel)) {
    const lc = d.leadExceedsActionLevel ? C.red : C.green;
    const note = d.leadExceedsActionLevel ? ' ⚠ EXCEEDS EPA LIMIT' : '';
    console.log(`  ${C.bold}Lead Level:${C.reset}  ${lc}${d.leadLevel} mg/L${note}${C.reset}`);
  }

  // Radon
  if (known(d.radonZone)) {
    const rc = d.radonZone === 1 ? C.red : d.radonZone === 2 ? C.yellow : C.green;
    console.log(`  ${C.bold}Radon Risk:${C.reset}  ${rc}Zone ${d.radonZone}${d.radonRisk ? ' (' + d.radonRisk + ')' : ''}${C.reset}`);
  }

  // PFAS
  const pfasColor = d.pfasDetected === true ? C.red : d.pfasDetected === false ? C.green : C.dim;
  console.log(`  ${C.bold}PFAS:${C.reset}  ${pfasColor}${pfasLabel(d.pfasDetected)}${C.reset}`);

  // Flood
  if (known(d.floodClaims)) {
    console.log(`  ${C.bold}Flood Claims:${C.reset}  ${Number(d.floodClaims).toLocaleString()}`);
  }

  console.log();
  console.log(`  ${C.dim}Full report: https://zipcheckup.com/report/${d.zip}/${C.reset}`);
  console.log(`  ${C.dim}Source and coverage details: https://zipcheckup.com/report/${d.zip}/${C.reset}`);
  console.log();
}

async function compare(zip1, zip2) {
  const [d1, d2] = await Promise.all([getZipData(zip1), getZipData(zip2)]);

  console.log();
  console.log(`${C.bold}  Comparing ${d1.city}, ${d1.state} (${zip1}) vs ${d2.city}, ${d2.state} (${zip2})${C.reset}`);
  console.log();

  const col1 = 22, col2 = 20;
  const rows = [
    ['Grade', `${known(d1.grade) ? d1.grade : 'N/A'} (${known(d1.score) ? d1.score : 'insufficient'})`, `${known(d2.grade) ? d2.grade : 'N/A'} (${known(d2.score) ? d2.score : 'insufficient'})`],
    ['Health Violations', displayNumber(d1.healthViolations), displayNumber(d2.healthViolations)],
    ['Lead Level', known(d1.leadLevel) ? `${d1.leadLevel} mg/L` : 'N/A', known(d2.leadLevel) ? `${d2.leadLevel} mg/L` : 'N/A'],
    ['Radon Zone', known(d1.radonZone) ? `Zone ${d1.radonZone}` : 'N/A', known(d2.radonZone) ? `Zone ${d2.radonZone}` : 'N/A'],
    ['PFAS', pfasLabel(d1.pfasDetected), pfasLabel(d2.pfasDetected)],
    ['Flood Claims', displayNumber(d1.floodClaims), displayNumber(d2.floodClaims)],
    ['Population', displayNumber(d1.totalPopulation), displayNumber(d2.totalPopulation)],
  ];

  console.log(`  ${C.dim}${'Metric'.padEnd(col1)}${zip1.padEnd(col2)}${zip2}${C.reset}`);
  console.log(`  ${C.dim}${'─'.repeat(col1 + col2 + 10)}${C.reset}`);
  for (const [label, v1, v2] of rows) {
    console.log(`  ${label.padEnd(col1)}${v1.padEnd(col2)}${v2}`);
  }
  console.log();
  console.log(`  ${C.dim}Full comparison: https://zipcheckup.com/compare/?zips=${zip1},${zip2}${C.reset}`);
  console.log();
}

function printHelp() {
  console.log(`
  ${C.bold}zipcheck${C.reset} - available home-safety evidence by US ZIP code

  ${C.bold}Usage:${C.reset}
    npx zipcheck <zip>                  Check a ZIP code
    npx zipcheck <zip> --json           Output raw JSON
    npx zipcheck --compare <z1> <z2>    Compare two ZIPs
    npx zipcheck --help                 Show this help

  ${C.bold}Examples:${C.reset}
    npx zipcheck 10001                  New York, NY
    npx zipcheck 90210                  Beverly Hills, CA
    npx zipcheck 10001 --json           JSON for scripting
    npx zipcheck --compare 10001 90210

  ${C.dim}Source, vintage, and coverage details are returned by ZipCheckup${C.reset}
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }
  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    return;
  }

  if (args.includes('--compare')) {
    const zips = args.filter(a => /^\d{5}$/.test(a));
    if (zips.length < 2) { console.error('Error: --compare needs two ZIP codes'); process.exit(1); }
    await compare(zips[0], zips[1]);
    return;
  }

  const zip = args.find(a => /^\d{5}$/.test(a));
  if (!zip) { console.error('Error: Please provide a valid 5-digit ZIP code'); process.exit(1); }

  const data = await getZipData(zip);
  if (args.includes('--json')) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    printReport(data);
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
