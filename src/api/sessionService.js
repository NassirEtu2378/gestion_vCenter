const SESSION_KEYS = {
  default: 'vcenter_session_default',
  secondary: 'vcenter_session_secondary',
}

function getSessionKey(vcenterId = 'default') {
  return SESSION_KEYS[vcenterId] || SESSION_KEYS.default
}

export function getSessionToken(vcenterId = 'default') {
  return localStorage.getItem(getSessionKey(vcenterId))
}

export function setSessionToken(vcenterId = 'default', token) {
  const key = getSessionKey(vcenterId)
  if (token) {
    localStorage.setItem(key, token)
  } else {
    localStorage.removeItem(key)
  }
}

export function removeSessionToken(vcenterId = 'default') {
  localStorage.removeItem(getSessionKey(vcenterId))
}
