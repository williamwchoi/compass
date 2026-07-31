// Single source of identity for the whole app. Who is this Compass for?
// Set USER_NAME in your .env (see .env.example). Everything that needs to name
// the user — the AI system prompt, generated reflections — reads it from here,
// so the app never hardcodes a person. Falls back to a neutral label if unset.
export const USER_NAME = process.env.USER_NAME?.trim() || 'the user'
