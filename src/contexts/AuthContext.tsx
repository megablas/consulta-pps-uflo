import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';

export type AuthUser = {
  legajo: string;
  nombre: string;
  role?: 'Jefe' | 'SuperUser' | 'Directivo' | 'AdminTester' | 'Reportero';
  orientaciones?: string[];
};

interface AuthContextType {
  authenticatedUser: AuthUser | null;
  isSuperUserMode: boolean;
  isJefeMode: boolean;
  isDirectivoMode: boolean;
  isAdminTesterMode: boolean;
  isReporteroMode: boolean;
  isAuthLoading: boolean;
  login: (user: AuthUser, rememberMe?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    try {
      // Check localStorage first for "remembered" users
      let storedUser = localStorage.getItem('authenticatedUser');
      // If not found, check sessionStorage for non-remembered sessions
      if (!storedUser) {
        storedUser = sessionStorage.getItem('authenticatedUser');
      }
      
      if (storedUser) {
        setAuthenticatedUser(JSON.parse(storedUser));
      }
    } catch (error) {
        console.error("Failed to parse user from storage", error);
        localStorage.removeItem('authenticatedUser');
        sessionStorage.removeItem('authenticatedUser');
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  const login = useCallback((user: AuthUser, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('authenticatedUser', JSON.stringify(user));
    setAuthenticatedUser(user);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('authenticatedUser');
    localStorage.removeItem('authenticatedUser');
    setAuthenticatedUser(null);
  }, []);

  const isSuperUserMode = authenticatedUser?.role === 'SuperUser' || authenticatedUser?.legajo === 'admin';
  const isJefeMode = authenticatedUser?.role === 'Jefe';
  const isDirectivoMode = authenticatedUser?.role === 'Directivo';
  const isAdminTesterMode = authenticatedUser?.role === 'AdminTester';
  const isReporteroMode = authenticatedUser?.role === 'Reportero';

  return (
    <AuthContext.Provider value={{ authenticatedUser, isSuperUserMode, isJefeMode, isDirectivoMode, isAdminTesterMode, isReporteroMode, isAuthLoading, login, logout }}>
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