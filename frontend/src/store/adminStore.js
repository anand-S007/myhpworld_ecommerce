import { create } from 'zustand';

const readInitialAdmin = () => {
  try {
    const stored = localStorage.getItem('hpworld_admin');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useAdminStore = create((set) => ({
  admin: readInitialAdmin(),

  adminLogin: (adminData, token) => {
    localStorage.setItem('hpworld_admin_token', token);
    localStorage.setItem('hpworld_admin', JSON.stringify(adminData));
    set({ admin: adminData });
  },

  adminLogout: () => {
    localStorage.removeItem('hpworld_admin_token');
    localStorage.removeItem('hpworld_admin');
    set({ admin: null });
  },
}));
