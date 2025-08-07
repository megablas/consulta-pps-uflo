import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';

export type AuthUser = {
  legajo: string;
  nombre: string;
  isSuperUser?: boolean;
};

interface AuthContextType {
  authenticatedUser: AuthUser | null;
  isSuperUserMode: boolean;
  isAuthLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('authenticatedUser');
      if (storedUser) {
        setAuthenticatedUser(JSON.parse(storedUser));
      }
    } catch (error) {
        console.error("Failed to parse user from session storage", error);
        sessionStorage.removeItem('authenticatedUser');
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  const login = useCallback((user: AuthUser) => {
    sessionStorage.setItem('authenticatedUser', JSON.stringify(user));
    setAuthenticatedUser(user);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('authenticatedUser');
    setAuthenticatedUser(null);
  }, []);

  const isSuperUserMode = authenticatedUser?.isSuperUser === true;

  return (
    <AuthContext.Provider value={{ authenticatedUser, isSuperUserMode, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};