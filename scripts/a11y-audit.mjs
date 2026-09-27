/**
 * SafeEats accessibility + health audit.
 * Usage: node scripts/a11y-audit.mjs [baseUrl]
 * Setup once: npm i -D playwright @axe-core/playwright && npx playwright install chromium
 * Outputs: a11y-report.json  (machine readable)  +  console summary
 */
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';

const BASE = process.argv[2] || 'https://safeeats.site';

// Every public route in src/App.jsx + pages.config.js. /restaurant/:id is
// omitted because it needs a live backend record to render.
const ROUTES = [
  '/', '/About', '/global-coverage', '/country-codes', '/county-drilldown',
  '/press-notice', '/contact', '/fact-detective', '/data-audit', '/privacy',
  '/terms', '/data-safety', '/pitch', '/embed', '/widget', '/this-page-does-not-exist',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch();
  const report = { base: BASE, generated: new Date().toISOString(), pages: [] };

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: 'SafeEatsAudit/1.0 (accessibility check)',
      });
      const page = await ctx.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
      page.on('response', r => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url().slice(0, 200)}`); });

      const entry = { route, viewport: vp.name };
      try {
        const resp = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 });
        entry.status = resp ? resp.status() : null;
        await page.waitForTimeout(2500);

        entry.title = await page.title();
        entry.textLength = (await page.innerText('body')).replace(/\s+/g, ' ').trim().length;

        // Document-level structure checks
        entry.structure = await page.evaluate(() => {
          const h = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e => ({ t: e.tagName, x: e.innerText.trim().slice(0, 80) }));
          const imgs = [...document.querySelectorAll('img')];
          const links = [...document.querySelectorAll('a')];
          const inputs = [...document.querySelectorAll('input,select,textarea')];
          const buttons = [...document.querySelectorAll('button')];
          const labelled = el => !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
            (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label'));
          return {
            lang: document.documentElement.getAttribute('lang') || null,
            titleLen: (document.title || '').length,
            metaDescription: (document.querySelector('meta[name="description"]') || {}).content || null,
            h1Count: document.querySelectorAll('h1').length,
            headingOutline: h.slice(0, 25),
            imgTotal: imgs.length,
            imgMissingAlt: imgs.filter(i => i.getAttribute('alt') === null).length,
            linkTotal: links.length,
            linksNoText: links.filter(a => !a.innerText.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')).length,
            inputTotal: inputs.length,
            inputsUnlabelled: inputs.filter(i => i.type !== 'hidden' && !labelled(i)).length,
            buttonTotal: buttons.length,
            buttonsNoName: buttons.filter(b => !b.innerText.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')).length,
            hasSkipLink: !!document.querySelector('a[href^="#"]'),
            hasMainLandmark: !!document.querySelector('main,[role="main"]'),
            hasNavLandmark: !!document.querySelector('nav,[role="navigation"]'),
            hasFooterLandmark: !!document.querySelector('footer,[role="contentinfo"]'),
            emojiInHeadings: h.filter(x => /\p{Extended_Pictographic}/u.test(x.x)).length,
          };
        });

        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze();

        entry.violations = axe.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          wcag: v.tags.filter(t => /^wcag/.test(t)),
          nodes: v.nodes.length,
          sample: v.nodes.slice(0, 3).map(n => ({
            target: n.target.join(' '),
            html: (n.html || '').slice(0, 200),
            fix: (n.failureSummary || '').split('\n').filter(Boolean).slice(0, 3).join(' | '),
          })),
        }));
        entry.violationCount = entry.violations.reduce((a, v) => a + v.nodes, 0);
        entry.incomplete = axe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length, help: v.help }));
      } catch (e) {
        entry.error = String(e).slice(0, 400);
      }
      entry.consoleErrors = consoleErrors.slice(0, 8);
      entry.failedRequests = failedRequests.slice(0, 12);
      report.pages.push(entry);
      await ctx.close();
      process.stderr.write(`  done ${route} [${vp.name}]\n`);
    }
  }

  await browser.close();
  fs.writeFileSync('a11y-report.json', JSON.stringify(report, null, 2));

  // ---- summary ----
  const byRule = {};
  for (const p of report.pages) {
    for (const v of (p.violations || [])) {
      byRule[v.id] = byRule[v.id] || { id: v.id, impact: v.impact, help: v.help, wcag: v.wcag, nodes: 0, routes: new Set() };
      byRule[v.id].nodes += v.nodes;
      byRule[v.id].routes.add(p.route);
    }
  }
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const rules = Object.values(byRule).sort((a, b) => (order[a.impact] ?? 9) - (order[b.impact] ?? 9) || b.nodes - a.nodes);

  console.log('\n=== SAFEEATS ACCESSIBILITY AUDIT ===');
  console.log(BASE, '|', report.generated);
  const total = report.pages.reduce((a, p) => a + (p.violationCount || 0), 0);
  console.log(`Pages scanned: ${ROUTES.length} x ${VIEWPORTS.length} viewports = ${report.pages.length} scans`);
  console.log(`Total violation instances: ${total}`);
  console.log(`Distinct failing rules: ${rules.length}\n`);
  console.log('--- BY RULE (worst first) ---');
  for (const r of rules) {
    console.log(`[${(r.impact || '?').toUpperCase()}] ${r.id} :: ${r.nodes} instances`);
    console.log(`    ${r.help}`);
    console.log(`    WCAG: ${r.wcag.join(', ') || 'best-practice'}`);
    console.log(`    Routes: ${[...r.routes].join(', ')}`);
  }
  console.log('\n--- PER PAGE ---');
  for (const p of report.pages.filter(p => p.viewport === 'desktop')) {
    const s = p.structure || {};
    console.log(`${p.route.padEnd(18)} status=${p.status} axe=${p.violationCount ?? 'ERR'} text=${p.textLength ?? 0}ch h1=${s.h1Count ?? '?'} lang=${s.lang ?? 'MISSING'} main=${s.hasMainLandmark ? 'y' : 'NO'} desc=${s.metaDescription ? 'y' : 'NO'} noAlt=${s.imgMissingAlt ?? '?'} unlabelledInputs=${s.inputsUnlabelled ?? '?'} emptyBtns=${s.buttonsNoName ?? '?'}`);
    if (p.error) console.log('    ERROR:', p.error);
    if (p.consoleErrors.length) console.log('    console:', p.consoleErrors[0]);
  }
  const blocking = rules.filter(r => r.impact === 'critical' || r.impact === 'serious');
  process.exit(blocking.length ? 1 : 0);
})();
