function shouldBlockSandbox(pathname, env = process.env) {
  if (!pathname || !pathname.startsWith('/sandbox')) {
    return false;
  }

  const enabled = env.NEXT_PUBLIC_ENABLE_SANDBOX === 'true';
  const isProduction = env.NODE_ENV === 'production';

  return isProduction && !enabled;
}

module.exports = {
  shouldBlockSandbox,
};
