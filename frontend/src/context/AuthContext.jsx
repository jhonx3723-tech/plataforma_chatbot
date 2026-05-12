import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  function login(token, userData) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  function refreshUser(partial) {
    setUser(prev => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      refreshUser,
      loading,
      isSuperAdmin: user?.role === 'super_admin',
      isClient:     user?.role === 'client',
      isAgent:      user?.role === 'company_agent',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
