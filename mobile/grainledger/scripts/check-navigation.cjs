const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/navigation/tabs.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, sandbox);
const { appTabs, activateTab, tabBarPadding, tabTransitionDuration } = sandbox.exports;
assert.deepEqual(Array.from(appTabs, (tab) => tab.href), ['/home', '/stock', '/settings/profile']);
assert.equal(new Set(appTabs.map((tab) => tab.name)).size, 3);
for (const file of ['home.tsx', 'stock/index.tsx', 'stock/_layout.tsx', 'settings/profile.tsx', 'settings/_layout.tsx']) {
  assert.ok(fs.existsSync(path.join(root, 'src/app/(tabs)', file)), `Missing route: ${file}`);
}
for (const selected of [false, true]) {
  for (const prevented of [false, true]) {
    const events = [];
    const navigations = [];
    activateTab('stock-route-key', selected, {
      emitter: { emit: (event) => { events.push(event); return { defaultPrevented: prevented }; } },
      navigateToTab: (key) => navigations.push(key),
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'tabPress');
    assert.equal(events[0].target, 'stock-route-key');
    assert.equal(events[0].canPreventDefault, true);
    assert.deepEqual(navigations, !selected && !prevented ? ['stock-route-key'] : []);
  }
}
for (const insets of [{ bottom: 0, left: 0, right: 0 }, { bottom: 24, left: 34, right: 0 }, { bottom: 34, left: 0, right: 34 }]) {
  const padding = tabBarPadding(insets, { sm: 8, md: 12, lg: 16 });
  assert.ok(padding.paddingBottom >= insets.bottom + 12);
  assert.ok(padding.paddingLeft >= insets.left + 16);
  assert.ok(padding.paddingRight >= insets.right + 16);
}
assert.ok(tabTransitionDuration > 0 && tabTransitionDuration <= 200);
for (const layout of ['src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx', 'src/app/(tabs)/stock/_layout.tsx', 'src/app/(tabs)/settings/_layout.tsx']) {
  assert.doesNotMatch(fs.readFileSync(path.join(root, layout), 'utf8'), /initialRouteName/);
}
assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/app/(tabs)/_layout.tsx'), 'utf8'), /anchor:/,
  'History-based tabs must not declare an anchor; the entry URL selects Home.');
console.log('PASS: canonical routes, nested stack files, tab events/cancellation/reselection, safe-area spacing and transition budget. Native interaction testing remains separate.');
