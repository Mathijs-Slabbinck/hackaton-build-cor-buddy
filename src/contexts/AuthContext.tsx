import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Company {
  id: string;
  companyName: string;
  industry: string;
  country: string;
  createdAt: string;
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  password: string;
  email: string;
  role: 'owner' | 'manager' | 'external_manager';
  companyId: string;
  avatarInitials: string;
  createdAt: string;
  isActive: boolean;
}

export interface Session {
  userId: string;
  companyId: string;
  role: 'owner' | 'manager' | 'external_manager';
}

interface AuthContextType {
  currentUser: User | null;
  currentCompany: Company | null;
  session: Session | null;
  users: User[];
  companies: Company[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isOwner: () => boolean;
  isManager: () => boolean;
  isExternalManager: () => boolean;
  addUser: (u: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  getUserById: (id: string) => User | undefined;
  getCompanyById: (id: string) => Company | undefined;
}

const SEED_COMPANIES: Company[] = [
  { id: 'company-alpha', companyName: 'Alpha Build Group', industry: 'Construction', country: 'Australia', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'company-beta', companyName: 'Beta Electrical Services', industry: 'Electrical', country: 'Australia', createdAt: '2024-01-15T00:00:00.000Z' },
];

const SEED_USERS: User[] = [
  { id: 'user-alpha-owner', fullName: 'Alex Owner', username: 'admin', password: 'admin', email: 'alex@alphabuild.com.au', role: 'owner', companyId: 'company-alpha', avatarInitials: 'AO', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'user-alpha-manager', fullName: 'Maria Manager', username: 'maria', password: 'maria123', email: 'maria@alphabuild.com.au', role: 'manager', companyId: 'company-alpha', avatarInitials: 'MM', isActive: true, createdAt: '2024-01-10T00:00:00.000Z' },
  { id: 'user-beta-owner', fullName: 'Ben Beta', username: 'ben', password: 'ben123', email: 'ben@betaelectrical.com.au', role: 'owner', companyId: 'company-beta', avatarInitials: 'BB', isActive: true, createdAt: '2024-01-15T00:00:00.000Z' },
  { id: 'user-beta-manager', fullName: 'Sophie External', username: 'sophie', password: 'sophie123', email: 'sophie@betaelectrical.com.au', role: 'external_manager', companyId: 'company-beta', avatarInitials: 'SE', isActive: true, createdAt: '2024-01-20T00:00:00.000Z' },
];

const COMPANIES_KEY = 'cortrack_companies';
const USERS_KEY = 'cortrack_users';
const SESSION_KEY = 'cortrack_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Seed companies
    const rawC = localStorage.getItem(COMPANIES_KEY);
    const comps = rawC ? JSON.parse(rawC) : SEED_COMPANIES;
    if (!rawC) localStorage.setItem(COMPANIES_KEY, JSON.stringify(SEED_COMPANIES));
    setCompanies(comps);

    // Seed users
    const rawU = localStorage.getItem(USERS_KEY);
    const usrs = rawU ? JSON.parse(rawU) : SEED_USERS;
    if (!rawU) localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    setUsers(usrs);

    // Rehydrate session
    const rawS = localStorage.getItem(SESSION_KEY);
    if (rawS) {
      try {
        const sess: Session = JSON.parse(rawS);
        const user = usrs.find((u: User) => u.id === sess.userId && u.isActive);
        const comp = comps.find((c: Company) => c.id === sess.companyId);
        if (user && comp) {
          setSession(sess);
          setCurrentUser(user);
          setCurrentCompany(comp);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }

    // Clean up old auth key
    localStorage.removeItem('cortrack_auth');
  }, []);

  const persistUsers = useCallback((next: User[]) => {
    setUsers(next);
    localStorage.setItem(USERS_KEY, JSON.stringify(next));
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const allUsers: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = allUsers.find(u => u.username === username && u.password === password && u.isActive);
    if (!user) return false;
    const allCompanies: Company[] = JSON.parse(localStorage.getItem(COMPANIES_KEY) || '[]');
    const comp = allCompanies.find(c => c.id === user.companyId);
    if (!comp) return false;
    const sess: Session = { userId: user.id, companyId: user.companyId, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setSession(sess);
    setCurrentUser(user);
    setCurrentCompany(comp);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setCurrentUser(null);
    setCurrentCompany(null);
  }, []);

  const isOwner = useCallback(() => session?.role === 'owner', [session]);
  const isManager = useCallback(() => session?.role === 'manager', [session]);
  const isExternalManager = useCallback(() => session?.role === 'external_manager', [session]);

  const addUser = useCallback((u: User) => persistUsers([...users, u]), [users, persistUsers]);
  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    persistUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
  }, [users, persistUsers]);
  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);
  const getCompanyById = useCallback((id: string) => companies.find(c => c.id === id), [companies]);

  return (
    <AuthContext.Provider value={{ currentUser, currentCompany, session, users, companies, login, logout, isOwner, isManager, isExternalManager, addUser, updateUser, getUserById, getCompanyById }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
};
