// Check actual exported tokens without loading React Native in Node.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/theme/tokens.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {}, require: (name) => {
  assert.equal(name, 'react-native');
  return { Platform: { select: (options) => options.default } };
} };
vm.runInNewContext(compiled, sandbox);
const { palettes, resolveColorScheme, isThemeMode } = sandbox.exports;
const rgb = (hex) => hex.slice(1).match(/../g).map((part) => parseInt(part, 16));
const luminance = (color) => color.map((v) => {
  const channel = v / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
let count = 0;
let minimum = Infinity;
for (const [scheme, c] of Object.entries(palettes)) {
  const check = (name, foreground, background, target = 4.5) => {
    const ratio = contrast(rgb(foreground), Array.isArray(background) ? background : rgb(background));
    assert.ok(ratio >= target, `${scheme} ${name}: ${ratio.toFixed(2)} < ${target}`);
    if (target === 4.5) minimum = Math.min(minimum, ratio);
    count++;
  };
  const rgba = c.glass.match(/[\d.]+/g).map(Number);
  const extremeGlass = [0, 255].map((base) => rgba.slice(0, 3).map((v) => v * rgba[3] + base * (1 - rgba[3])));
  for (const text of ['textPrimary', 'textSecondary', 'accent']) {
    for (const background of [c.background, c.surface, c.ambientStart, c.ambientEnd, ...extremeGlass]) {
      check(`${text} on solid/ambient/glass`, c[text], background);
    }
  }
  for (const status of ['success', 'warning', 'danger', 'info']) check(status, c[status], c[`${status}Surface`]);
  check('onPrimary', c.onPrimary, c.primary);
  check('disabled', c.textDisabled, c.disabledSurface);
  for (const background of [c.background, c.surface, c.surfaceRaised, c.ambientStart, c.ambientEnd, ...extremeGlass]) {
    check('control boundary on solid/ambient/glass', c.controlBorder, background, 3);
  }
}
for (const system of ['light', 'dark', null]) {
  assert.equal(resolveColorScheme('light', system), 'light');
  assert.equal(resolveColorScheme('dark', system), 'dark');
  assert.equal(resolveColorScheme('system', system), system === 'dark' ? 'dark' : 'light');
}
for (const value of ['system', 'light', 'dark']) assert.equal(isThemeMode(value), true);
for (const value of [null, undefined, '', 'sepia', 1, {}]) assert.equal(isThemeMode(value), false);
console.log(`PASS: ${count} contrast checks; minimum text ratio ${minimum.toFixed(2)}:1. Mode resolution and stored-value validation passed.`);
