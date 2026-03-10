import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface HardcodedUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'Owner' | 'Manager';
  companyId: string;
}

export interface HardcodedCompany {
  id: string;
  name: string;
}

export interface Session {
  userId: string;
  username: string;
  fullName: string;
  role: 'Owner' | 'Manager';
  companyId: string;
  companyName: string;
}

export const USERS: HardcodedUser[] = [
  { id: 'u1', username: 'admin', password: 'admin', fullName: 'Admin User', role: 'Owner', companyId: 'c1' },
  { id: 'u2', username: 'maria', password: 'maria123', fullName: 'Maria Santos', role: 'Manager', companyId: 'c1' },
  { id: 'u3', username: 'ben', password: 'ben123', fullName: 'Ben Carter', role: 'Owner', companyId: 'c2' },
  { id: 'u4', username: 'sophie', password: 'sophie123', fullName: 'Sophie Lin', role: 'Manager', companyId: 'c2' },
];

export const COMPANIES: HardcodedCompany[] = [
  { id: 'c1', name: 'Alpha Build Group' },
  { id: 'c2', name: 'Beta Electrical Services' },
];

const SESSION_KEY = 'cortrack_session';

interface AuthContextType {
  session: Session | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isOwner: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Clean up old auth key
    localStorage.removeItem('cortrack_auth');

    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const sess: Session = JSON.parse(raw);
        // Validate session against hardcoded users
        const user = USERS.find(u => u.id === sess.userId);
        if (user) {
          setSession(sess);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) return false;
    const company = COMPANIES.find(c => c.id === user.companyId);
    if (!company) return false;
    const sess: Session = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      companyName: company.name,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setSession(sess);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  const isOwner = useCallback(() => session?.role === 'Owner', [session]);

  return (
    <AuthContext.Provider value={{ session, login, logout, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
};

// Helper: get company name by id
export const getCompanyName = (companyId: string): string => {
  return COMPANIES.find(c => c.id === companyId)?.name || 'Unknown';
};

// Helper: get user by id
export const getUserName = (userId: string): string => {
  return USERS.find(u => u.id === userId)?.fullName || 'Unknown';
};

// Helper: get user initials
export const getUserInitials = (userId: string): string => {
  const user = USERS.find(u => u.id === userId);
  if (!user) return '??';
  const parts = user.fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return user.fullName.slice(0, 2).toUpperCase();
};

// COR access check
export function canAccessCOR(cor: { companyId: string; sharedWith?: string[] }, session: Session): boolean {
  if (cor.companyId === session.companyId) return true;
  const sharedWith = cor.sharedWith || [];
  if (sharedWith.includes(session.userId)) return true;
  if (session.role === 'Owner') {
    const companyUserIds = USERS.filter(u => u.companyId === session.companyId).map(u => u.id);
    return sharedWith.some(id => companyUserIds.includes(id));
  }
  return false;
}
