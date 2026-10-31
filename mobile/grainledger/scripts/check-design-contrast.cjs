const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../src/theme/tokens.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const tokens = {};
vm.runInNewContext(output, { exports: tokens, require: () => ({ Platform: { select: (value) => value.ios } }) });
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map((x) => parseInt(x, 16) / 255)
    .map((x) => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
const failures = [];
for (const scheme of ['lightColors', 'darkColors']) {
  const colors = tokens[scheme];
  const pairs = ['label', 'secondaryLabel', 'tertiaryLabel'].flatMap((fg) =>
    ['background', 'surface', 'surfaceSecondary', 'elevatedSurface', 'groupedBackground'].map((bg) => [fg, bg]));
  pairs.push(['onAccent', 'accent'], ['onDestructive', 'destructive']);
  for (const semantic of ['accent', 'success', 'warning', 'destructive', 'info']) {
    pairs.push([semantic, `${semantic}Muted`]);
  }
  for (const [fg, bg] of pairs) {
    const values = [luminance(colors[fg]), luminance(colors[bg])].sort((a, b) => b - a);
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    if (ratio < 4.5) failures.push(`${scheme}: ${fg}/${bg} = ${ratio.toFixed(2)}:1`);
  }
}
assert.deepEqual(failures, [], 'WCAG AA semantic text contrast failed');
console.log('Design contrast passed: 44 semantic text/background pairs meet WCAG AA.');
