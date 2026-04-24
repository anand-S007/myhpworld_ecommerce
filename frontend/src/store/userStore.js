import { create } from 'zustand';

// Customer session lives here. Any UI that needs to react to "is the user
// signed in?" (Navbar, Account icon, private routes) should subscribe to
// this store instead of reading localStorage directly — otherwise logging
// in doesn't re-render the components that care.
//
// We still write to localStorage so the session survives a page reload, and
// we read from it exactly once (on module load) to hydrate the initial
// state. After that, all updates flow through this store.

const TOKEN_KEY = 'myhpworld_token';
const USER_KEY  = 'myhpworld_user';

function readInitialUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    const parsed = JSON.parse(raw);
    // Guard against a partial write that stored something useless.
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    // Corrupted value — drop it so we don't re-encounter the same error.
    try { localStorage.removeItem(USER_KEY); } catch { /* noop */ }
    return null;
  }
}

export const useUserStore = create((set) => ({
  user: readInitialUser(),

  // Call after a successful customer login / registration.
  login: (userData, token) => {
    if (!userData) return; // defensive — don't persist "undefined"
    try {
      localStorage.setItem(TOKEN_KEY, token || '');
      localStorage.setItem(USER_KEY,  JSON.stringify(userData));
    } catch { /* storage might be disabled — the store still works */ }
    set({ user: userData });
  },

  // Clears both in-memory and persisted session.
  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* noop */ }
    set({ user: null });
  },
}));
