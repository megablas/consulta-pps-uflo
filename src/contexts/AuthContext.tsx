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

  const verifyUserSession = useCallback(() => {
    try {
        // Check both storages to maintain session after refresh
        const storedUser = localStorage.getItem('authenticatedUser') || sessionStorage.getItem('authenticatedUser');
        if (storedUser) {
            setAuthenticatedUser(JSON.parse(storedUser));
        }
    } catch (error) {
        console.error("Failed to verify user session from storage", error);
        setAuthenticatedUser(null);
        // Clear potentially corrupted storage
        localStorage.removeItem('authenticatedUser');
        sessionStorage.removeItem('authenticatedUser');
    } finally {
        setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyUserSession();
  }, [verifyUserSession]);

  const login = useCallback((user: AuthUser, rememberMe = false) => {
    setAuthenticatedUser(user);
    // Use localStorage for "remember me", otherwise use sessionStorage
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('authenticatedUser', JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setAuthenticatedUser(null);
    // Clear from both storages on logout
    localStorage.removeItem('authenticatedUser');
    sessionStorage.removeItem('authenticatedUser');
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