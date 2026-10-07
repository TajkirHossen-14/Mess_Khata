import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'messkhata_token';
const ACTIVE_ROLE_KEY = 'messkhata_active_role';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState(() => localStorage.getItem(ACTIVE_ROLE_KEY));

  const resolveInitialRole = (roles) => {
    if (!roles || roles.length === 0) return null;
    const storedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
    if (storedRole && roles.includes(storedRole)) {
      return storedRole;
    }
    // Default to manager if available, otherwise resident, otherwise first role
    if (roles.includes('manager')) return 'manager';
    if (roles.includes('resident')) return 'resident';
    return roles[0];
  };

  const setActiveRole = (role) => {
    setActiveRoleState(role);
    if (role) {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    } else {
      localStorage.removeItem(ACTIVE_ROLE_KEY);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    setToken(null);
    setUser(null);
    setActiveRoleState(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) {
      setIsLoading(false);
      return null;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.success && result.data) {
        const { user: fetchedUser, token: refreshedToken } = result.data;
        setUser(fetchedUser);
        if (refreshedToken) {
          localStorage.setItem(TOKEN_KEY, refreshedToken);
          setToken(refreshedToken);
        }
        const assignedRole = resolveInitialRole(fetchedUser.roles);
        setActiveRole(assignedRole);
        return fetchedUser;
      } else {
        logout();
        return null;
      }
    } catch {
      logout();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Invalid email or password');
    }

    const { token: receivedToken, user: loggedInUser } = result.data;
    localStorage.setItem(TOKEN_KEY, receivedToken);
    setToken(receivedToken);
    setUser(loggedInUser);

    const initialRole = resolveInitialRole(loggedInUser.roles);
    setActiveRole(initialRole);

    return loggedInUser;
  };

  const register = async (name, email, password) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Registration failed');
    }

    const { token: receivedToken, user: registeredUser } = result.data;
    localStorage.setItem(TOKEN_KEY, receivedToken);
    setToken(receivedToken);
    setUser(registeredUser);

    const initialRole = resolveInitialRole(registeredUser.roles);
    setActiveRole(initialRole);

    return registeredUser;
  };

  const updateAuth = (newToken, updatedUser) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
    }
    if (updatedUser) {
      setUser(updatedUser);
      const initialRole = resolveInitialRole(updatedUser.roles);
      setActiveRole(initialRole);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateAuth,
    activeRole,
    setActiveRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
