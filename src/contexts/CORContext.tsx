import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'file_uploaded'
  | 'image_uploaded'
  | 'file_removed'
  | 'image_removed'
  | 'bill_extracted'
  | 'bill_applied'
  | 'stock_linked'
  | 'note_added';

export interface ActivityEntry {
  id: string;
  timestamp: string;
  action: ActivityAction;
  description: string;
  actor: string;
}

export interface COR {
  id: string;
  corName: string;
  clientKind: 'Company' | 'Private';
  clientName: string;
  productName: string;
  corDate: string;
  creationDate: string;
  corNumber: string;
  vatNumber: string;
  vat: number;
  price: number;
  productType: 'Service' | 'Product';
  paidPercentage: number;
  location: string;
  pictureUrls: string[];
  fileUrls: string[];
  status: 'Paid' | 'Ongoing' | 'Cancelled';
  projectId?: string;
  activityLog: ActivityEntry[];
}

interface CORContextType {
  cors: COR[];
  loading: boolean;
  addCOR: (cor: COR) => void;
  updateCOR: (id: string, updates: Partial<COR>) => void;
  deleteCOR: (id: string) => void;
  getCORById: (id: string) => COR | undefined;
}

const makeEntry = (action: ActivityAction, description: string, timestamp?: string): ActivityEntry => ({
  id: crypto.randomUUID(),
  timestamp: timestamp || new Date().toISOString(),
  action,
  description,
  actor: 'Admin',
});

const SEED: COR[] = [
  {
    id: crypto.randomUUID(), corName: "Cleanup after plasterer damage",
    clientKind: "Company", clientName: "Hargreaves Construction Pty Ltd",
    productName: "Site cleanup services", productType: "Service",
    corDate: "2024-02-15", creationDate: "2024-02-15T08:00:00.000Z",
    corNumber: "COR-2024-001", vatNumber: "ABN 51 123 456 789",
    vat: 10, price: 1800, paidPercentage: 100,
    location: "42 George St, Sydney NSW 2000",
    status: "Paid", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-02-15T08:00:00.000Z')]
  },
  {
    id: crypto.randomUUID(), corName: "Damaged drywall rectification",
    clientKind: "Company", clientName: "Meridian Build Group",
    productName: "Drywall repair materials", productType: "Product",
    corDate: "2024-03-08", creationDate: "2024-03-08T08:00:00.000Z",
    corNumber: "COR-2024-002", vatNumber: "ABN 72 987 654 321",
    vat: 10, price: 4200, paidPercentage: 50,
    location: "17 Collins St, Melbourne VIC 3000",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-03-08T08:00:00.000Z')]
  },
  {
    id: crypto.randomUUID(), corName: "Electrical conduit rerouting",
    clientKind: "Private", clientName: "Thomas Nguyen",
    productName: "Conduit rerouting labour", productType: "Service",
    corDate: "2024-01-22", creationDate: "2024-01-22T08:00:00.000Z",
    corNumber: "COR-2024-003", vatNumber: "",
    vat: 10, price: 950, paidPercentage: 0,
    location: "9 Roma St, Brisbane QLD 4000",
    status: "Cancelled", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-01-22T08:00:00.000Z')]
  }
];

const KEY = "cortrack_cors";
const CORContext = createContext<CORContextType | undefined>(undefined);

export const CORProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cors, setCors] = useState<COR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure activityLog exists on loaded records
      setCors(parsed.map((c: any) => ({ ...c, activityLog: c.activityLog || [] })));
    }
    else { setCors(SEED); localStorage.setItem(KEY, JSON.stringify(SEED)); }
    setLoading(false);
  }, []);

  const persist = useCallback((next: COR[]) => { setCors(next); localStorage.setItem(KEY, JSON.stringify(next)); }, []);
  const addCOR = useCallback((cor: COR) => persist([cor, ...cors]), [cors, persist]);
  const updateCOR = useCallback((id: string, updates: Partial<COR>) => {
    persist(cors.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [cors, persist]);
  const deleteCOR = useCallback((id: string) => persist(cors.filter(c => c.id !== id)), [cors, persist]);
  const getCORById = useCallback((id: string) => cors.find(c => c.id === id), [cors]);

  return (
    <CORContext.Provider value={{ cors, loading, addCOR, updateCOR, deleteCOR, getCORById }}>
      {children}
    </CORContext.Provider>
  );
};

export const useCOR = () => {
  const ctx = useContext(CORContext);
  if (!ctx) throw new Error("useCOR must be used within CORProvider");
  return ctx;
};

export { makeEntry };
