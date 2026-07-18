#!/usr/bin/env node
/**
 * SafeEats Smoke Test — chalk-powered endpoint regression checks
 *
 * Run:  node scripts/smoke.mjs
 * With Places check:  GOOGLE_API_KEY=xxx node scripts/smoke.mjs
 *
 * Checks are grounded in real past bugs:
 *  - EPA SDWIS zip + city-served lookups (county fallback / GEOGRAPHIC_AREA fix)
 *  - Willimantic CT vs "Windham" locality mismatch (Google Places v1)
 *  - Vercel proxy availability (Socrata passthrough)
 *  - EWG tap water link format
 */
import chalk from 'chalk';

const TIMEOUT_MS = 15000;
const results = [];

const label = {
  pass: chalk.green.bold('  PASS '),
  warn: chalk.yellow.bold('  WARN '),
  fail: chalk.red.bold('  FAIL '),
  skip: chalk.gray.bold('  SKIP '),
};

function report(status, name, detail, ms) {
  results.push(status);
  const time = ms != null ? chalk.dim(`${ms}ms`.padStart(8)) : chalk.dim(' '.repeat(8));
  console.log(`${label[status]}${time}  ${chalk.cyan(name)}  ${chalk.dim('—')} ${detail}`);
}

async function timedFetch(url, opts = {}) {
  const start = Date.now();
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { res, ms: Date.now() - start };
}

async function check(name, fn) {
  try {
    await fn();
  } catch (err) {
    report('fail', name, chalk.red(err.message));
  }
}

console.log(chalk.bold.underline('\nSafeEats Smoke Test') + chalk.dim(`  ${new Date().toISOString()}\n`));

// ── 1. EPA SDWIS: zip lookup (Seattle) ──────────────────────────────
await check('EPA SDWIS zip lookup (98101/WA)', async () => {
  const url = 'https://data.epa.gov/dmapservice/sdwis.water_system/primacy_agency_code/equals/WA/and/pws_activity_code/equals/A/and/pws_type_code/equals/CWS/and/zip_code/equals/98101/json';
  const { res, ms } = await timedFetch(url);
  if (!res.ok) return report('fail', 'EPA SDWIS zip lookup (98101/WA)', `HTTP ${res.status}`, ms);
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    report('pass', 'EPA SDWIS zip lookup (98101/WA)', `${data.length} active CWS, e.g. ${chalk.bold(data[0]?.pws_name ?? data[0]?.PWS_NAME ?? '?')}`, ms);
  } else {
    report('warn', 'EPA SDWIS zip lookup (98101/WA)', 'HTTP 200 but zero systems returned', ms);
  }
});

// ── 2. EPA SDWIS: city-served lookup (Willimantic, CT) ──────────────
await check('EPA SDWIS city-served (Willimantic/CT)', async () => {
  const url = 'https://data.epa.gov/dmapservice/sdwis.water_system/primacy_agency_code/equals/CT/and/pws_activity_code/equals/A/and/pws_type_code/equals/CWS/and/city_name/equals/WILLIMANTIC/json';
  const { res, ms } = await timedFetch(url);
  if (!res.ok) return report('fail', 'EPA SDWIS city-served (Willimantic/CT)', `HTTP ${res.status}`, ms);
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    report('pass', 'EPA SDWIS city-served (Willimantic/CT)', `${data.length} system(s), e.g. ${chalk.bold(data[0]?.pws_name ?? data[0]?.PWS_NAME ?? '?')}`, ms);
  } else {
    report('warn', 'EPA SDWIS city-served (Willimantic/CT)', 'zero systems — county fallback would trigger', ms);
  }
});

// ── 3. Vercel proxy availability ─────────────────────────────────────
await check('Vercel proxy (safeeats-proxy)', async () => {
  const { res, ms } = await timedFetch('https://safeeats-proxy.vercel.app/');
  if (res.status < 500) {
    report('pass', 'Vercel proxy (safeeats-proxy)', `reachable, HTTP ${res.status}`, ms);
  } else {
    report('fail', 'Vercel proxy (safeeats-proxy)', `HTTP ${res.status} — proxy down?`, ms);
  }
});

// ── 4. Production site up ────────────────────────────────────────────
await check('safeeats.site', async () => {
  const { res, ms } = await timedFetch('https://safeeats.site/');
  res.ok
    ? report('pass', 'safeeats.site', `HTTP ${res.status}`, ms)
    : report('fail', 'safeeats.site', `HTTP ${res.status}`, ms);
});

// ── 5. EWG tap water link format (zip-based) ─────────────────────────
await check('EWG tap water link (98101)', async () => {
  const url = 'https://www.ewg.org/tapwater/search-results.php?zip5=98101&searchtype=zip';
  const { res, ms } = await timedFetch(url, { method: 'GET', redirect: 'follow' });
  if (res.status === 200) {
    report('pass', 'EWG tap water link (98101)', 'link format resolves', ms);
  } else {
    report('warn', 'EWG tap water link (98101)', `HTTP ${res.status} — check link format on restaurant cards`, ms);
  }
});

// ── 6. Google Places v1: Willimantic locality regression ────────────
const key = process.env.GOOGLE_API_KEY;
if (!key) {
  report('skip', 'Places locality check (Willimantic)', chalk.dim('set GOOGLE_API_KEY to enable'));
} else {
  await check('Places locality check (Willimantic)', async () => {
    const { res, ms } = await timedFetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: 'restaurants in Willimantic, CT', maxResultCount: 5 }),
    });
    if (!res.ok) return report('fail', 'Places locality check (Willimantic)', `HTTP ${res.status}`, ms);
    const data = await res.json();
    const places = data.places ?? [];
    const windhamOnly = places.filter(p => /Windham/i.test(p.formattedAddress) && !/Willimantic/i.test(p.formattedAddress));
    if (places.length === 0) {
      report('warn', 'Places locality check (Willimantic)', 'zero results', ms);
    } else if (windhamOnly.length > 0) {
      report('warn', 'Places locality check (Willimantic)', `${windhamOnly.length}/${places.length} results say "Windham" — locality normalization needed`, ms);
    } else {
      report('pass', 'Places locality check (Willimantic)', `${places.length} results, locality clean`, ms);
    }
  });
}

// ── Summary ──────────────────────────────────────────────────────────
const counts = results.reduce((a, s) => ((a[s] = (a[s] ?? 0) + 1), a), {});
const bar = [
  counts.pass && chalk.green(`${counts.pass} passed`),
  counts.warn && chalk.yellow(`${counts.warn} warned`),
  counts.fail && chalk.red(`${counts.fail} failed`),
  counts.skip && chalk.gray(`${counts.skip} skipped`),
].filter(Boolean).join(chalk.dim(' · '));
console.log('\n' + chalk.bold('Summary: ') + bar + '\n');
process.exit(counts.fail ? 1 : 0);