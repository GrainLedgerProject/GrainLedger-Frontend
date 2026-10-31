// Compare actual endpoint behavior to the web contract without making network calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, transport) {
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, URLSearchParams,
    require: (name) => {
      assert.equal(name, './client', `Unexpected runtime dependency in ${file}`);
      return { apiFetch: transport };
    },
  }, { filename: file });
  return exports;
}

const webRoot = path.resolve(__dirname, '../../../web/grainledger/src/api');
const mobileRoot = path.resolve(__dirname, '../src/services/endpoints');
const modules = ['admin', 'auth', 'catalogs', 'compliance', 'ledger', 'procurement', 'profile', 'residue'];
let cases = 0;
for (const name of modules) {
  const capture = (url, options = {}) => JSON.stringify({ url, ...options });
  const web = load(path.join(webRoot, `${name}.ts`), capture);
  const mobile = load(path.join(mobileRoot, `${name}.ts`), capture);
  const factory = mobile[`create${name[0].toUpperCase()}${name.slice(1)}Endpoints`];
  assert.equal(typeof factory, 'function');
  const native = factory(capture);
  for (const [group, endpoints] of Object.entries(web)) {
    if (!group.endsWith('Endpoints')) continue;
    assert.deepEqual(Object.keys(native[group]).sort(), Object.keys(endpoints).sort());
    for (const [method, endpoint] of Object.entries(endpoints)) {
      // Cover omitted args, filtered query values, identifiers and structured payloads.
      const fixtures = [[], ['lot-123', { reason: 'Review', massKg: '12.50' }, { revision: 3 }],
        [{ page: 2, search: 'Lúa & gạo', empty: '', missing: undefined, active: false }, 'facility-456']];
      for (const args of fixtures) {
        assert.equal(native[group][method](...args), endpoint(...args), `${name}.${method}`);
        cases++;
      }
    }
  }
}
console.log(`API contract parity passed: ${cases} cases across ${modules.length} modules.`);
