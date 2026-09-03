// ── localStorage persistence ──────────────────────────────────────────────────
// A refresh, a sleeping laptop or a misclicked Reset used to wipe a team's whole
// run mid-class. Every accessor here is defensive: storage can be unavailable
// (private windows, blocked site data) and must never take the app down.

const RUN_PREFIX = 'aixdl:run:v1:'
const BOARD_KEY  = 'aixdl:board:v1'

function readJSON(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function removeKey(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* nothing we can do, and nothing worth breaking the app over */
  }
}

export function runKey(teamName) {
  const name = String(teamName || '').trim().toLowerCase()
  return name ? `${RUN_PREFIX}${name}` : null
}

export function loadRun(key) {
  if (!key) return null
  const saved = readJSON(key)
  if (!saved || typeof saved !== 'object') return null
  if (!Array.isArray(saved.choices) || !Array.isArray(saved.livePath)) return null
  return saved
}

export function saveRun(key, state) {
  if (!key) return
  writeJSON(key, { ...state, savedAt: Date.now() })
}

export function clearRun(key) {
  if (!key) return
  removeKey(key)
}

// ── Facilitator leaderboard ───────────────────────────────────────────────────
export function loadBoard() {
  const saved = readJSON(BOARD_KEY)
  return Array.isArray(saved) ? saved : []
}

export function saveBoard(entries) {
  writeJSON(BOARD_KEY, entries)
}
