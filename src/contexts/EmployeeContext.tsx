import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  assignedProject: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  status: 'Active' | 'Inactive' | 'On Leave' | 'Completed';
  companyId: string;
}

interface EmployeeContextType {
  employees: Employee[];
  loading: boolean;
  addEmployee: (e: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
}

const SEED: Employee[] = [
  { id: crypto.randomUUID(), fullName: "Jake Morrison", role: "Electrician", email: "jake.m@tradeco.com.au", phone: "0412 345 678", assignedProject: "Collins St Tower Fit-out", startDate: "2024-01-15", endDate: "2024-06-30", dailyRate: 480, status: "Active", companyId: "c1" },
  { id: crypto.randomUUID(), fullName: "Sandra Pham", role: "Site Manager", email: "sandra.p@tradeco.com.au", phone: "0423 456 789", assignedProject: "George St Residential", startDate: "2024-02-01", endDate: "2024-08-15", dailyRate: 620, status: "Active", companyId: "c1" },
  { id: crypto.randomUUID(), fullName: "Liam Chen", role: "Plumber", email: "liam.c@tradeco.com.au", phone: "0434 567 890", assignedProject: "Roma St Commercial Reno", startDate: "2024-01-08", endDate: "2024-03-31", dailyRate: 440, status: "On Leave", companyId: "c1" },
  { id: crypto.randomUUID(), fullName: "Priya Kapoor", role: "Carpenter", email: "priya.k@tradeco.com.au", phone: "0445 678 901", assignedProject: "Harbour View Apartments", startDate: "2023-10-01", endDate: "2024-01-31", dailyRate: 390, status: "Completed", companyId: "c1" },
  // Company c2 seed
  { id: crypto.randomUUID(), fullName: "Derek Walsh", role: "Electrician", email: "derek.w@betaelec.com.au", phone: "0411 222 333", assignedProject: "Westfield Substation Upgrade", startDate: "2024-03-01", endDate: "2024-09-30", dailyRate: 510, status: "Active", companyId: "c2" },
];

const KEY = "cortrack_employees";
const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      setEmployees(parsed.map((e: any) => ({ ...e, companyId: e.companyId || 'c1' })));
    }
    else { setEmployees(SEED); localStorage.setItem(KEY, JSON.stringify(SEED)); }
    setLoading(false);
  }, []);

  const persist = useCallback((next: Employee[]) => { setEmployees(next); localStorage.setItem(KEY, JSON.stringify(next)); }, []);
  const addEmployee = useCallback((e: Employee) => persist([e, ...employees]), [employees, persist]);
  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => persist(employees.map(e => e.id === id ? { ...e, ...updates } : e)), [employees, persist]);
  const deleteEmployee = useCallback((id: string) => persist(employees.filter(e => e.id !== id)), [employees, persist]);

  return <EmployeeContext.Provider value={{ employees, loading, addEmployee, updateEmployee, deleteEmployee }}>{children}</EmployeeContext.Provider>;
};

export const useEmployees = () => { const ctx = useContext(EmployeeContext); if (!ctx) throw new Error("useEmployees must be within EmployeeProvider"); return ctx; };
