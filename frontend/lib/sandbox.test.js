const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldBlockSandbox } = require('./sandbox.js');

test('blocks sandbox routes in production when the flag is off', () => {
  const env = { NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_SANDBOX: 'false' };
  assert.equal(shouldBlockSandbox('/sandbox', env), true);
  assert.equal(shouldBlockSandbox('/sandbox/settings', env), true);
});

test('allows sandbox routes when the flag is on in development', () => {
  const env = { NODE_ENV: 'development', NEXT_PUBLIC_ENABLE_SANDBOX: 'true' };
  assert.equal(shouldBlockSandbox('/sandbox', env), false);
  assert.equal(shouldBlockSandbox('/sandbox/settings', env), false);
});

test('ignores non-sandbox routes', () => {
  const env = { NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_SANDBOX: 'false' };
  assert.equal(shouldBlockSandbox('/dashboard', env), false);
});
