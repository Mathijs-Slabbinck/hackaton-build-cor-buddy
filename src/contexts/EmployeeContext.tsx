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
  { id: crypto.randomUUID(), fullName: "Thomas Maes", role: "Site Manager", email: "t.maes@alphabuild.be", phone: "0476 12 34 56", assignedProject: "Rue de la Loi Office Renovation", startDate: "2024-01-10", endDate: "", dailyRate: 580, status: "Active", companyId: "c1" },
  { id: crypto.randomUUID(), fullName: "Isabelle Peeters", role: "Structural Engineer", email: "i.peeters@alphabuild.be", phone: "0487 23 45 67", assignedProject: "Ghent Canal Apartments — Phase 2", startDate: "2024-03-01", endDate: "", dailyRate: 640, status: "Active", companyId: "c1" },
  { id: crypto.randomUUID(), fullName: "Nico Janssen", role: "Carpenter", email: "n.janssen@alphabuild.be", phone: "0498 34 56 78", assignedProject: "Rue de la Loi Office Renovation", startDate: "2024-01-15", endDate: "", dailyRate: 390, status: "On Leave", companyId: "c1" },
  { id: crypto.randomUUID(), fullName: "Fatima El Ouahabi", role: "Plasterer", email: "f.elouahabi@alphabuild.be", phone: "0465 45 67 89", assignedProject: "Mechelen Logistics Hub", startDate: "2023-09-01", endDate: "2024-02-28", dailyRate: 360, status: "Completed", companyId: "c1" },
  { id: crypto.randomUUID(), fullName: "Derek Van den Berg", role: "Electrician", email: "d.vandenberg@betaelec.be", phone: "0472 11 22 33", assignedProject: "Antwerp Port Authority HQ Rewire", startDate: "2024-03-01", endDate: "", dailyRate: 480, status: "Active", companyId: "c2" },
  { id: crypto.randomUUID(), fullName: "Anika Bogaert", role: "Site Manager", email: "a.bogaert@betaelec.be", phone: "0483 22 33 44", assignedProject: "Bruges Historic Centre — Solar Install", startDate: "2024-06-01", endDate: "", dailyRate: 560, status: "Active", companyId: "c2" },
  { id: crypto.randomUUID(), fullName: "Marcus Pirard", role: "Electrician", email: "m.pirard@betaelec.be", phone: "0494 33 44 55", assignedProject: "Liège Train Station — Platform Lighting", startDate: "2024-01-15", endDate: "2024-04-30", dailyRate: 440, status: "Completed", companyId: "c2" },
  { id: crypto.randomUUID(), fullName: "Tine Baert", role: "Safety Officer", email: "t.baert@betaelec.be", phone: "0461 44 55 66", assignedProject: "Antwerp Port Authority HQ Rewire", startDate: "2024-03-01", endDate: "", dailyRate: 410, status: "Active", companyId: "c2" },
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
