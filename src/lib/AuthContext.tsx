import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, login as authLogin, register as authRegister, logout as authLogout } from './auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName: string, profileType: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(u => { setUser(u); setLoading(false); });
  }, []);

  const login = async (email: string, password: string) => {
    const u = await authLogin(email, password);
    setUser(u);
  };

  const register = async (email: string, username: string, password: string, displayName: string, profileType: string) => {
    const u = await authRegister(email, username, password, displayName, profileType);
    setUser(u);
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
