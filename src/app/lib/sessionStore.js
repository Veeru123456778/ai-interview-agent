// lib/sessionStore.js

const sessions = new Map();

export function createSession(id, chatInstance) {
  sessions.set(id, chatInstance);
}

export function getSession(id) {
  return sessions.get(id);
}

export function deleteSession(id) {
  sessions.delete(id);
}
