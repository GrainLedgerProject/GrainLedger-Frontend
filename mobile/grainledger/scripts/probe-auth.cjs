/* Optional live contract probe. Use only a disposable account; never prints credentials/cookies. */
const path = require('node:path');
const { createAuthClient, memoryStorage, load } = require('./check-auth.cjs');
const { resolveApiConfiguration } = load(path.join(__dirname, '../src/services/api/config.ts'));
const { createProfileService } = load(path.join(__dirname, '../src/services/profile.ts'));
const config = resolveApiConfiguration({ isDevelopment: true, environment: process.env.EXPO_PUBLIC_APP_ENV,
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL, developmentUrl: process.env.EXPO_PUBLIC_API_BASE_URL_DEVELOPMENT,
  stagingUrl: process.env.EXPO_PUBLIC_API_BASE_URL_STAGING, productionUrl: process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION });
const { origin } = config;
const email = process.env.GRAINLEDGER_AUTH_TEST_EMAIL;
const password = process.env.GRAINLEDGER_AUTH_TEST_PASSWORD;

async function run() {
  if (!origin || !email || !password) {
    console.log('SKIP live auth/API: configure a valid selected API origin (or EXPO_PUBLIC_API_BASE_URL override), GRAINLEDGER_AUTH_TEST_EMAIL and GRAINLEDGER_AUTH_TEST_PASSWORD in the shell. No login was attempted.');
    return;
  }
  const storage = memoryStorage();
  const cookieObservations = [];
  const options = { ...config, storage, fetcher: async (url, init) => {
    // Node has no browser cookie jar. This checks explicit token transport, not native cookie behavior.
    const response = await fetch(url, init);
    const cookies = response.headers.get('set-cookie') ?? '';
    cookieObservations.push({ path: new URL(typeof url === 'string' || url instanceof URL ? url : url.url).pathname, status: response.status,
      setCookieSeen: Boolean(cookies), httpOnlySeen: /\bhttponly\b/i.test(cookies) });
    return response;
  } };
  let client = createAuthClient(options);
  let issuedSession = false;
  try {
    await client.initialize();
    await client.login(email, password, true);
    issuedSession = true;
    await client.getSession();
    await createProfileService(client.api).getProfile();
    client = createAuthClient(options);
    await client.initialize();
    if (client.getSnapshot().status !== 'authenticated') throw new Error('RESTORE_FAILED');
    await client.getSession();
    await createProfileService(client.api).getProfile();
    console.log('PASS live JSON login, bearer session/profile and rotating refresh restoration (Axios/Node transport, memory storage).');
  } finally {
    await client.logout();
    const state = client.getSnapshot();
    console.log(!issuedSession ? 'No authenticated session was established; local cleanup attempted.'
      : state.message === 'Signed out.' ? 'Logout/local cleanup returned without an error; backend refresh-token revocation remains unverified.'
      : 'BLOCKED server logout could not be confirmed; inspect backend cookie/CSRF requirements.');
    console.log(JSON.stringify(cookieObservations));
    console.log('Native SecureStore, native cookie behavior and device transport require device verification.');
  }
}
run().catch((error) => {
  console.error(`FAIL live auth contract: status=${error.status ?? 0}, code=${error.code ?? 'restore'}. Response bodies and credentials are suppressed.`);
  process.exitCode = 1;
});
