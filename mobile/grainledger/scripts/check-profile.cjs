/* Profile contract & controller test suite */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const context = vm.createContext({
  URL,
  URLSearchParams,
  Headers,
  Response,
  Request,
  FormData,
  Blob,
  AbortController,
  AbortSignal,
  fetch,
  atob,
  setTimeout,
  clearTimeout,
  Error,
  console,
});

const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInContext(
    `(function(require,module,exports){${compiled}\n})`,
    context
  )((name) => {
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), name);
      if (fs.existsSync(resolved + '.ts')) return load(resolved + '.ts');
      if (fs.existsSync(resolved + '.tsx')) return load(resolved + '.tsx');
      if (fs.existsSync(path.join(resolved, 'index.ts'))) return load(path.join(resolved, 'index.ts'));
      return load(resolved);
    }
    return require(name);
  }, module, module.exports);
  return module.exports;
}

const profileApi = load(path.join(root, 'src/features/profile/profile-api.ts'));
const { validateProfile, createProfileService, ROLE_DETAILS, PHONE_REGEX } = profileApi;

const userFixture = {
  id: 'usr-123',
  email: 'operator@grainledger.test',
  displayName: 'Nguyễn Văn Vận Hành',
  phoneNumber: '0901234567',
  role: 'MillOperator',
  organizationId: 'org-mill-1',
  organizationName: 'Nhà máy Tiền Giang',
  isActive: true,
  permissions: ['receiving.record', 'lots.read'],
};

const json = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}

async function run() {
  await test('profile validation rules: displayName and optional phoneNumber', async () => {
    // Valid inputs
    assert.deepEqual(Object.keys(validateProfile({ displayName: 'Nguyễn Văn A', phoneNumber: '0901234567' })), []);
    assert.deepEqual(Object.keys(validateProfile({ displayName: 'John Doe', phoneNumber: null })), []);
    assert.deepEqual(Object.keys(validateProfile({ displayName: 'John Doe', phoneNumber: '' })), []);
    assert.deepEqual(Object.keys(validateProfile({ displayName: 'AB', phoneNumber: '+84 901 234 567' })), []);

    // displayName validations
    assert.equal(validateProfile({ displayName: '' }).displayName, 'required');
    assert.equal(validateProfile({ displayName: '   ' }).displayName, 'required');
    assert.equal(validateProfile({ displayName: 'A' }).displayName, 'too_short');
    assert.equal(validateProfile({ displayName: 'x'.repeat(121) }).displayName, 'too_long');
    assert.equal(validateProfile({ displayName: 'x'.repeat(120) }).displayName, undefined);

    // phoneNumber validations
    assert.equal(validateProfile({ displayName: 'Valid Name', phoneNumber: '123' }).phoneNumber, 'format');
    assert.equal(validateProfile({ displayName: 'Valid Name', phoneNumber: 'abc1234567' }).phoneNumber, 'format');
    assert.equal(validateProfile({ displayName: 'Valid Name', phoneNumber: '1'.repeat(33) }).phoneNumber, 'too_long');
    assert.ok(PHONE_REGEX.test('0901234567'));
    assert.ok(PHONE_REGEX.test('+84 901 234 567'));
    assert.ok(!PHONE_REGEX.test('invalid-phone'));
  });

  await test('getProfile contract: GET /api/profile consumes SessionUserDto and parses normalized AuthUser', async () => {
    let capturedPath = '';
    let capturedMethod = '';
    const mockApi = {
      request: async (path, init) => {
        capturedPath = path;
        capturedMethod = init?.method || 'GET';
        return userFixture;
      },
    };

    const service = createProfileService(mockApi);
    const profile = await service.getProfile();

    assert.equal(capturedPath, '/api/profile');
    assert.equal(capturedMethod, 'GET');
    assert.equal(profile.id, userFixture.id);
    assert.equal(profile.displayName, userFixture.displayName);
    assert.equal(profile.normalizedRole, 'MILL_OPERATOR');
    assert.equal(profile.isActive, true);
  });

  await test('updateProfile contract: PUT /api/profile sends trimmed payload and parses updated user', async () => {
    let capturedPath = '';
    let capturedInit = null;

    const mockApi = {
      request: async (path, init) => {
        capturedPath = path;
        capturedInit = init;
        return {
          ...userFixture,
          displayName: init.data.displayName,
          phoneNumber: init.data.phoneNumber,
        };
      },
    };

    const service = createProfileService(mockApi);
    const updated = await service.updateProfile({
      displayName: '   Trần Thị Quản Lý   ',
      phoneNumber: '  +84988776655  ',
    });

    assert.equal(capturedPath, '/api/profile');
    assert.equal(capturedInit.method, 'PUT');
    assert.equal(capturedInit.data.displayName, 'Trần Thị Quản Lý');
    assert.equal(capturedInit.data.phoneNumber, '+84988776655');
    assert.equal(updated.displayName, 'Trần Thị Quản Lý');
    assert.equal(updated.phoneNumber, '+84988776655');
  });

  await test('updateProfile handles empty phone number as null', async () => {
    let capturedInit = null;
    const mockApi = {
      request: async (_, init) => {
        capturedInit = init;
        return { ...userFixture, phoneNumber: null };
      },
    };

    const service = createProfileService(mockApi);
    await service.updateProfile({ displayName: 'Nguyễn Văn A', phoneNumber: '' });
    assert.equal(capturedInit.data.phoneNumber, null);

    await service.updateProfile({ displayName: 'Nguyễn Văn A', phoneNumber: null });
    assert.equal(capturedInit.data.phoneNumber, null);
  });

  await test('updateProfile rejects invalid payload before making network request', async () => {
    let called = false;
    const mockApi = {
      request: async () => {
        called = true;
        return userFixture;
      },
    };

    const service = createProfileService(mockApi);
    await assert.rejects(
      service.updateProfile({ displayName: '', phoneNumber: '0901234567' }),
      { message: 'Dữ liệu hồ sơ không hợp lệ.' }
    );
    assert.equal(called, false);

    await assert.rejects(
      service.updateProfile({ displayName: 'Valid', phoneNumber: 'bad-phone' }),
      { message: 'Dữ liệu hồ sơ không hợp lệ.' }
    );
    assert.equal(called, false);
  });

  await test('all seven operational roles have complete ROLE_DETAILS metadata', async () => {
    const roles = [
      'MILL_ADMIN',
      'MILL_MANAGER',
      'MILL_OPERATOR',
      'CUSTOMER_PROCUREMENT_OFFICER',
      'CUSTOMER_MANAGER',
      'CUSTOMER_EXPORT_OFFICER',
      'AUTHORIZED_STOCK_VIEWER',
    ];

    for (const role of roles) {
      const meta = ROLE_DETAILS[role];
      assert.ok(meta, `Missing role metadata for ${role}`);
      assert.ok(meta.code.length >= 2);
      assert.ok(meta.labelVi.length > 0);
      assert.ok(meta.labelEn.length > 0);
      assert.ok(['MILL', 'CUSTOMER', 'QUALIFIED_ACCESS'].includes(meta.side));
    }
  });

  console.log(`\nPASS: All ${passed} profile test groups passed successfully.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
