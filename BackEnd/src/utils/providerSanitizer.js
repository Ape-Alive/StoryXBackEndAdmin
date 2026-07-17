const SENSITIVE_PROVIDER_FIELDS = [
  'mainAccountToken',
  'apiKeys',
  'apiKeyCreationConfig',
]

function stripCatalogRoleMeta(item) {
  if (!item || typeof item !== 'object') return item
  const { clientRoleIds, clientRoles, clientRoleBindAll, ...rest } = item
  return rest
}

function sanitizeProviderForClient(provider) {
  if (!provider) return provider
  const safe = { ...provider }
  for (const key of SENSITIVE_PROVIDER_FIELDS) {
    delete safe[key]
  }
  return stripCatalogRoleMeta(safe)
}

function sanitizeModelForClient(model) {
  if (!model) return model
  const safe = { ...model }
  if (safe.provider) {
    safe.provider = sanitizeProviderForClient(safe.provider)
  }
  return stripCatalogRoleMeta(safe)
}

module.exports = {
  sanitizeProviderForClient,
  sanitizeModelForClient,
  stripCatalogRoleMeta,
  SENSITIVE_PROVIDER_FIELDS,
}
