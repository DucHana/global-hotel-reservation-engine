'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, tokenStore } from './api';

export interface AuthUser {
  user_id: number | string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  is_active?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (fullName: string, email: string, password: string, phone?: string) => Promise<unknown>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = tokenStore.getUser();
      if (storedUser) setUser(storedUser as AuthUser);
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    const data = await authApi.login(email, password) as { access_token: string; user: AuthUser };
    tokenStore.set(data.access_token, remember);
    tokenStore.setUser(data.user, remember);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (fullName: string, email: string, password: string, phone?: string) => {
      return authApi.register({ full_name: fullName, email, password, phone });
    },
    [],
  );

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}