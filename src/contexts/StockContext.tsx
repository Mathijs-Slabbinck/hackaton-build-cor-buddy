import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface StockItem {
  id: string;
  itemName: string;
  category: string;
  sku: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string;
  lastRestocked: string;
  assignedProject: string;
  linkedCorId: string | null;
  damageLog: string;
  companyId: string;
}

interface StockContextType {
  items: StockItem[];
  loading: boolean;
  addItem: (i: StockItem) => void;
  updateItem: (id: string, updates: Partial<StockItem>) => void;
  deleteItem: (id: string) => void;
}

const SEED: StockItem[] = [
  { id: crypto.randomUUID(), itemName: "Decking Screws 10g x 65mm", category: "Fasteners", sku: "FST-065", unit: "box", quantityOnHand: 3, reorderLevel: 5, unitCost: 42.50, supplier: "Midalia Steel", lastRestocked: "2024-02-20", assignedProject: "Harbour View Apartments", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "PVC Solvent Cement 250mL", category: "Adhesives", sku: "ADH-250", unit: "each", quantityOnHand: 8, reorderLevel: 4, unitCost: 18.90, supplier: "Tradelink Plumbing", lastRestocked: "2024-03-01", assignedProject: "Roma St Commercial Reno", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "Full-Body Safety Harness", category: "Safety", sku: "SAF-H01", unit: "each", quantityOnHand: 2, reorderLevel: 3, unitCost: 189.00, supplier: "Blackwoods Safety", lastRestocked: "2024-01-15", assignedProject: "Collins St Tower Fit-out", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "25mm Steel Conduit 3m", category: "Electrical", sku: "ELE-C25", unit: "each", quantityOnHand: 24, reorderLevel: 10, unitCost: 14.20, supplier: "Rexel Electrical", lastRestocked: "2024-02-28", assignedProject: "George St Residential", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "Silicone Sealant 300mL (Clear)", category: "Adhesives", sku: "ADH-SIL-C", unit: "each", quantityOnHand: 6, reorderLevel: 6, unitCost: 12.40, supplier: "Bunnings Trade", lastRestocked: "2024-03-05", assignedProject: "Harbour View Apartments", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "Concrete Mix 20kg Bag", category: "Concrete", sku: "CON-20KG", unit: "bag", quantityOnHand: 14, reorderLevel: 20, unitCost: 9.80, supplier: "Boral Building Products", lastRestocked: "2024-02-10", assignedProject: "Roma St Commercial Reno", linkedCorId: null, damageLog: "", companyId: "c1" },
  // Company c2 seed
  { id: crypto.randomUUID(), itemName: "20mm PVC Conduit 4m", category: "Electrical", sku: "ELE-PVC-20", unit: "each", quantityOnHand: 6, reorderLevel: 10, unitCost: 11.50, supplier: "Rexel Electrical", lastRestocked: "2024-03-10", assignedProject: "Westfield Substation Upgrade", linkedCorId: null, damageLog: "", companyId: "c2" },
  { id: crypto.randomUUID(), itemName: "Cable Tray 150mm x 3m (Galvanised)", category: "Electrical", sku: "ELE-CT150", unit: "each", quantityOnHand: 18, reorderLevel: 8, unitCost: 34.00, supplier: "Atkinsons Electrical Supplies", lastRestocked: "2024-04-10", assignedProject: "Parramatta Data Centre Fit-out", linkedCorId: null, damageLog: "", companyId: "c2" },
  { id: crypto.randomUUID(), itemName: "Circuit Breaker 32A Single Pole", category: "Electrical", sku: "ELE-CB32S", unit: "each", quantityOnHand: 4, reorderLevel: 10, unitCost: 22.50, supplier: "Rexel Electrical", lastRestocked: "2024-03-22", assignedProject: "Westfield Substation Upgrade", linkedCorId: null, damageLog: "", companyId: "c2" },
  { id: crypto.randomUUID(), itemName: "Electrical Insulation Tape (Black) 20m", category: "Electrical", sku: "ELE-TAPE-B", unit: "roll", quantityOnHand: 11, reorderLevel: 5, unitCost: 4.80, supplier: "Bunnings Trade", lastRestocked: "2024-04-18", assignedProject: "Bondi Beach Surf Club Rewire", linkedCorId: null, damageLog: "", companyId: "c2" },
  { id: crypto.randomUUID(), itemName: "Safety Helmet (White, Class 1)", category: "Safety", sku: "SAF-HLM-W", unit: "each", quantityOnHand: 3, reorderLevel: 4, unitCost: 28.00, supplier: "Blackwoods Safety", lastRestocked: "2024-02-28", assignedProject: "Parramatta Data Centre Fit-out", linkedCorId: null, damageLog: "", companyId: "c2" },
];

const KEY = "cortrack_stock";
const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      setItems(parsed.map((i: any) => ({ ...i, companyId: i.companyId || 'c1' })));
    }
    else { setItems(SEED); localStorage.setItem(KEY, JSON.stringify(SEED)); }
    setLoading(false);
  }, []);

  const persist = useCallback((next: StockItem[]) => { setItems(next); localStorage.setItem(KEY, JSON.stringify(next)); }, []);
  const addItem = useCallback((i: StockItem) => persist([i, ...items]), [items, persist]);
  const updateItem = useCallback((id: string, updates: Partial<StockItem>) => persist(items.map(i => i.id === id ? { ...i, ...updates } : i)), [items, persist]);
  const deleteItem = useCallback((id: string) => persist(items.filter(i => i.id !== id)), [items, persist]);

  return <StockContext.Provider value={{ items, loading, addItem, updateItem, deleteItem }}>{children}</StockContext.Provider>;
};

export const useStock = () => { const ctx = useContext(StockContext); if (!ctx) throw new Error("useStock must be within StockProvider"); return ctx; };
