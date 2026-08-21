const paystack = require("./paystack");
const squad = require("./squad");
const monnify = require("./monnify");

const registry = { PAYSTACK: paystack, SQUAD: squad, MONNIFY: monnify };

// Only returns providers whose keys are actually set — this is what makes
// checkout "zero friction": a gateway the owner hasn't configured yet
// simply never appears as an option, rather than showing up and failing.
function availableProviders() {
  return Object.values(registry).filter((p) => p.isConfigured());
}

function getProvider(name) {
  const provider = registry[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  if (!provider.isConfigured()) throw new Error(`${name} is not configured on this server yet.`);
  return provider;
}

module.exports = { registry, availableProviders, getProvider };
