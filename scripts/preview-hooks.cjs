// Lets the static preview render client components outside Next.js (stubs server-only modules).
const M = require('module'); const orig = M._load;
M._load = function (req, ...rest) {
  if (req === 'server-only') return {};
  if (typeof req === 'string' && req.includes('lib/auth/actions')) return { signOutHere: async () => {} };
  return orig.call(this, req, ...rest);
};
