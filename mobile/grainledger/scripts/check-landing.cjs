const assert = require('node:assert/strict');
const path = require('node:path');
const { Decimal } = require('decimal.js');
const { load } = require('./check-auth.cjs');
const moduleAt = (file) => load(path.join(__dirname, '..', file));
const model = moduleAt('src/features/landing/landing-model.ts');
const { landingContent, MRL_DEMO } = moduleAt('src/features/landing/landing-data.ts');
let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }

test('source ledger presets preserve balanced and MSG01 rejection outcomes', () => {
  const balanced = model.evaluateLedgerDemo(...model.demoPresets.balanced);
  assert.equal(balanced.status, 'balanced'); assert.equal(balanced.variance, '0'); assert.equal(balanced.allowed, '500');
  const rejected = model.evaluateLedgerDemo(...model.demoPresets.rejected);
  assert.equal(rejected.status, 'rejected'); assert.equal(rejected.variance, '4000');
});
test('inclusive 0.5% boundary, decimal sums and zero inputs preserve numeric meaning', () => {
  assert.equal(model.evaluateLedgerDemo('100000', '88500', '12000').status, 'balanced');
  assert.equal(model.evaluateLedgerDemo('100000', '88500.001', '12000').status, 'rejected');
  assert.equal(model.evaluateLedgerDemo('0.3', '0.1', '0.2').variance, '0');
  assert.equal(model.evaluateLedgerDemo('0', '0', '0').status, 'balanced');
});
test('empty, invalid and overflowing input cannot masquerade as successful zero-mass demos', () => {
  for (const value of ['', '   ']) assert.equal(model.evaluateLedgerDemo(value, '0', '0').status, 'empty');
  for (const value of ['NaN', 'Infinity', '1e99999999', 'not-a-number', '1.2.3']) {
    assert.equal(model.evaluateLedgerDemo(value, '0', '0').status, 'invalid');
  }
});
test('native decimal-comma input and localized mass formatting remain exact', () => {
  assert.equal(model.evaluateLedgerDemo('0,3', '0,1', '0,2').variance, '0');
  assert.equal(model.formatDemoMass('100000.125', 'vi'), '100.000,125');
  assert.equal(model.formatDemoMass('100000.125', 'en'), '100,000.125');
});
test('all twelve MRL demo cells retain source values and compare measured residue to safety margin', () => {
  const expected = {
    TCZ: { limits: ['0.01', '3', '3', '0.7'], margins: ['0.008', '2.4', '2.4', '0.56'], measured: '0.0075' },
    IPT: { limits: ['6', '6', '7', '2'], margins: ['4.8', '4.8', '5.6', '1.6'], measured: '1.25' },
    HXC: { limits: ['0.01', '0.05', '0.01', '0.3'], margins: ['0.008', '0.04', '0.008', '0.24'], measured: '0.0095' },
  };
  for (const id of model.substances) for (const [index, market] of Array.from(model.markets).entries()) {
    const result = model.evaluateMrlDemo(market, id);
    assert.equal(String(result.limit), expected[id].limits[index]);
    assert.equal(String(result.safeMargin), expected[id].margins[index]);
    assert.equal(String(result.measured), expected[id].measured);
    assert.equal(result.compliant, new Decimal(expected[id].measured).lte(expected[id].margins[index]));
    assert.equal(new Decimal(result.limit).times('0.8').toString(), String(result.safeMargin));
    assert.equal(result.unit, 'mg/kg'); assert.ok(result.basis);
  }
  assert.equal(MRL_DEMO.TCZ.cas, '41814-78-2'); assert.equal(MRL_DEMO.IPT.cas, '50512-35-1'); assert.equal(MRL_DEMO.HXC.cas, '79983-71-4');
});
test('an under-limit measurement can still fail the source safety threshold', () => {
  const result = model.evaluateMrlDemo('EU', 'HXC');
  assert.ok(result.measured < result.limit); assert.equal(result.compliant, false);
  assert.equal(model.evaluateMrlDemo('JAPAN', 'HXC').compliant, false);
  assert.equal(model.evaluateMrlDemo('USA', 'HXC').compliant, true);
});
test('both locales include every source pillar/comparison/stakeholder and illustrative sample', () => {
  for (const locale of ['vi', 'en']) {
    const content = landingContent[locale];
    assert.ok(content.heroTitle && content.heroDescription && content.signInLabel);
    assert.equal(content.problem.length, 4); assert.equal(content.pillars.length, 4); assert.equal(content.comparisons.length, 4);
    assert.deepEqual(Array.from(content.stakeholders, (entry) => entry.id), ['MILL', 'EXPORTER', 'FARMER', 'AUDIT']);
    assert.ok(content.stakeholders.every((entry) => entry.label && entry.title && entry.desc && entry.benefits.length >= 2 && entry.sample.length));
    assert.deepEqual(Array.from(content.problem, (entry) => entry.metric), locale === 'vi'
      ? ['8,06M', '0,01', '100%', '< 30s'] : ['8.06M', '0.01', '100%', '< 30s']);
  }
});
test('public and authenticated CTAs retain the existing sign-in/home destinations', () => {
  assert.equal(model.primaryDestination(false), '/sign-in'); assert.equal(model.primaryDestination(true), '/home');
});
test('all section targets clear the sticky header and select their own source navigation item', () => {
  const offsets = { problem: 1000, tech: 2000, comparison: 3000, simulators: 4000, ecosystem: 5000 };
  assert.equal(new Set(model.landingSections).size, 5);
  for (const id of model.landingSections) for (const header of [96, 180, 240]) {
    const scroll = model.sectionScrollOffset(offsets[id], header, header);
    assert.equal(model.activeLandingSection(scroll, header, header, offsets, 700, 7000), id);
    assert.equal(header + offsets[id] - scroll, header + 24);
  }
  assert.equal(model.activeLandingSection(0, 180, 180, offsets, 700, 7000), null);
  assert.equal(model.activeLandingSection(6300, 180, 180, offsets, 700, 7000), 'ecosystem');
  assert.equal(model.sectionScrollOffset(0, 0, 180), 0);
  assert.equal(model.activeLandingSection(100, 100, 100, {}, 700, 800), null);
});
console.log(`PASS: ${passed} Landing demo/content/navigation groups. No backend writes, legal verification or device execution are implied.`);
