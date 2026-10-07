import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('messkhata_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState(localStorage.getItem('messkhata_active_role') || null);
  const mountedRef = useRef(true);

  const setActiveRole = (role) => {
    setActiveRoleState(role);
    localStorage.setItem('messkhata_active_role', role);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setActiveRoleState(null);
    localStorage.removeItem('messkhata_token');
    localStorage.removeItem('messkhata_active_role');
  };

  const fetchMe = async (currentToken) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      if (data.success) {
        if (mountedRef.current) {
          setUser(data.data.user);
          setIsAuthenticated(true);
          if (!activeRole && data.data.user.roles.length > 0) {
            const defaultRole = data.data.user.roles.includes('manager') ? 'manager' : 'resident';
            setActiveRoleState(defaultRole);
            localStorage.setItem('messkhata_active_role', defaultRole);
          }
        }
      } else {
        if (mountedRef.current) logout();
      }
    } catch (err) {
      if (mountedRef.current) logout();
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    if (token) {
      fetchMe(token);
    } else {
      setIsLoading(false);
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        localStorage.setItem('messkhata_token', data.data.token);
        setUser(data.data.user);
        setIsAuthenticated(true);
        
        let newActiveRole = activeRole;
        if (data.data.user.roles.length > 0) {
          newActiveRole = data.data.user.roles.includes('manager') ? 'manager' : 'resident';
          setActiveRole(newActiveRole);
          localStorage.setItem('messkhata_active_role', newActiveRole);
        }
        return { success: true, user: data.data.user };
      }
      return { success: false, message: data.message };
    } catch {
      return { success: false, message: 'Network error. Please try again later.' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        localStorage.setItem('messkhata_token', data.data.token);
        setUser(data.data.user);
        setIsAuthenticated(true);
        return { success: true, user: data.data.user };
      }
      return { success: false, message: data.message };
    } catch {
      return { success: false, message: 'Network error. Please try again later.' };
    }
  };

  const refreshUser = async () => {
    if (token) await fetchMe(token);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        activeRole,
        setActiveRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
