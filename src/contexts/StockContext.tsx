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
  // Company c1
  { id: crypto.randomUUID(), itemName: "Plasterboard Sheet 12.5mm (2400x1200)", category: "Timber", sku: "PLB-125-STD", unit: "each", quantityOnHand: 4, reorderLevel: 10, unitCost: 18.50, supplier: "Knauf Belgium NV", lastRestocked: "2024-03-12", assignedProject: "Rue de la Loi Office Renovation", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "Ceramic Floor Tile 60x60cm (Grey)", category: "Other", sku: "TIL-6060-GR", unit: "each", quantityOnHand: 3, reorderLevel: 20, unitCost: 22.00, supplier: "Ceraline Distributie BV", lastRestocked: "2024-02-28", assignedProject: "Ghent Canal Apartments — Phase 2", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "Insulation Roll (Rockwool 100mm)", category: "Other", sku: "INS-RW100", unit: "roll", quantityOnHand: 2, reorderLevel: 6, unitCost: 64.00, supplier: "Rockwool Belgium SA", lastRestocked: "2024-01-20", assignedProject: "Rue de la Loi Office Renovation", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "OSB Board 18mm (2500x1250)", category: "Timber", sku: "OSB-18-STD", unit: "each", quantityOnHand: 6, reorderLevel: 8, unitCost: 31.00, supplier: "Van Marcke Bouwmaterialen", lastRestocked: "2024-03-05", assignedProject: "Mechelen Logistics Hub", linkedCorId: null, damageLog: "", companyId: "c1" },
  { id: crypto.randomUUID(), itemName: "Safety Barrier Fence Panel (2m)", category: "Safety", sku: "SAF-BFP-2M", unit: "each", quantityOnHand: 3, reorderLevel: 5, unitCost: 48.00, supplier: "Veiligheidsshop BE", lastRestocked: "2024-02-14", assignedProject: "Ghent Canal Apartments — Phase 2", linkedCorId: null, damageLog: "", companyId: "c1" },
  // Company c2
  { id: crypto.randomUUID(), itemName: "20mm Steel Conduit (3m)", category: "Electrical", sku: "ELE-SC20-3M", unit: "each", quantityOnHand: 5, reorderLevel: 12, unitCost: 9.80, supplier: "Rexel Belgium NV", lastRestocked: "2024-03-18", assignedProject: "Antwerp Port Authority HQ Rewire", linkedCorId: null, damageLog: "", companyId: "c2" },
  { id: crypto.randomUUID(), itemName: "LED Panel Light 60x60cm 36W", category: "Electrical", sku: "ELE-LED-6060", unit: "each", quantityOnHand: 6, reorderLevel: 10, unitCost: 38.00, supplier: "Sonepar Belgium SA", lastRestocked: "2024-04-02", assignedProject: "Liège Train Station — Platform Lighting", linkedCorId: null, damageLog: "", companyId: "c2" },
  { id: crypto.randomUUID(), itemName: "Circuit Breaker 40A Three-Phase", category: "Electrical", sku: "ELE-CB40-3P", unit: "each", quantityOnHand: 3, reorderLevel: 8, unitCost: 54.00, supplier: "Rexel Belgium NV", lastRestocked: "2024-03-05", assignedProject: "Antwerp Port Authority HQ Rewire", linkedCorId: null, damageLog: "", companyId: "c2" },
  { id: crypto.randomUUID(), itemName: "Solar Panel 400W Monocrystalline", category: "Electrical", sku: "SOL-PNL-400M", unit: "each", quantityOnHand: 8, reorderLevel: 15, unitCost: 210.00, supplier: "SMA Solar Belgium", lastRestocked: "2024-06-03", assignedProject: "Bruges Historic Centre — Solar Install", linkedCorId: null, damageLog: "", companyId: "c2" },
  { id: crypto.randomUUID(), itemName: "Safety Helmet EN397 (Yellow)", category: "Safety", sku: "SAF-HLM-Y", unit: "each", quantityOnHand: 2, reorderLevel: 4, unitCost: 24.00, supplier: "Veiligheidsshop BE", lastRestocked: "2024-02-20", assignedProject: "Antwerp Port Authority HQ Rewire", linkedCorId: null, damageLog: "", companyId: "c2" },
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
