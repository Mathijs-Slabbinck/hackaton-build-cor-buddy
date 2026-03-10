import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Shift {
  id: string;
  employeeId: string;
  project: string;
  date: string;
  startOfShift: string;
  endOfShift: string;
  dailyRate?: number;
}

interface ShiftContextType {
  shifts: Shift[];
  addShift: (s: Shift) => void;
  updateShift: (id: string, updates: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  getShiftsForEmployee: (employeeId: string) => Shift[];
  getShiftsForWeek: (weekStart: Date) => Shift[];
}

const KEY = 'cortrack_shifts';
const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

function buildSeedShifts(): Shift[] {
  const raw = localStorage.getItem('cortrack_employees');
  if (!raw) return [];
  const employees = JSON.parse(raw);
  const jake = employees.find((e: any) => e.fullName === 'Jake Morrison');
  const sandra = employees.find((e: any) => e.fullName === 'Sandra Pham');
  const shifts: Shift[] = [];

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  if (jake) {
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      shifts.push({
        id: crypto.randomUUID(),
        employeeId: jake.id,
        project: jake.assignedProject || 'Collins St Tower Fit-out',
        date: d.toISOString().split('T')[0],
        startOfShift: '07:00',
        endOfShift: '15:00',
        dailyRate: jake.dailyRate || 480,
      });
    }
  }

  if (sandra) {
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      shifts.push({
        id: crypto.randomUUID(),
        employeeId: sandra.id,
        project: sandra.assignedProject || 'George St Residential',
        date: d.toISOString().split('T')[0],
        startOfShift: '08:00',
        endOfShift: '17:00',
        dailyRate: sandra.dailyRate || 620,
      });
    }
  }

  return shifts;
}

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      setShifts(JSON.parse(raw));
    } else {
      const seed = buildSeedShifts();
      setShifts(seed);
      localStorage.setItem(KEY, JSON.stringify(seed));
    }
  }, []);

  const persist = useCallback((next: Shift[]) => {
    setShifts(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const addShift = useCallback((s: Shift) => persist([s, ...shifts]), [shifts, persist]);

  const updateShift = useCallback((id: string, updates: Partial<Shift>) =>
    persist(shifts.map(s => s.id === id ? { ...s, ...updates } : s)), [shifts, persist]);

  const deleteShift = useCallback((id: string) =>
    persist(shifts.filter(s => s.id !== id)), [shifts, persist]);

  const getShiftsForEmployee = useCallback((employeeId: string) =>
    shifts.filter(s => s.employeeId === employeeId), [shifts]);

  const getShiftsForWeek = useCallback((weekStart: Date) => {
    const start = weekStart.toISOString().split('T')[0];
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split('T')[0];
    return shifts.filter(s => s.date >= start && s.date <= endStr);
  }, [shifts]);

  return (
    <ShiftContext.Provider value={{ shifts, addShift, updateShift, deleteShift, getShiftsForEmployee, getShiftsForWeek }}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShifts = () => {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShifts must be within ShiftProvider');
  return ctx;
};
