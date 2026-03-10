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

export interface FieldDiff {
  field: string;
  from: string;
  to: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  action: ActivityAction;
  description: string;
  actor: string;
  diff?: FieldDiff[];
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
  companyId: string;
  sharedWith: string[];
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
    id: 'cor-seed-001', corName: "Cleanup after plasterer damage",
    clientKind: "Company", clientName: "Hargreaves Construction Pty Ltd",
    productName: "Site cleanup services", productType: "Service",
    corDate: "2024-02-15", creationDate: "2024-02-15T08:00:00.000Z",
    corNumber: "COR-2024-001", vatNumber: "ABN 51 123 456 789",
    vat: 10, price: 1800, paidPercentage: 100,
    location: "42 George St, Sydney NSW 2000",
    status: "Paid", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-02-15T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: ['u3', 'u4'],
  },
  {
    id: 'cor-seed-002', corName: "Damaged drywall rectification",
    clientKind: "Company", clientName: "Meridian Build Group",
    productName: "Drywall repair materials", productType: "Product",
    corDate: "2024-03-08", creationDate: "2024-03-08T08:00:00.000Z",
    corNumber: "COR-2024-002", vatNumber: "ABN 72 987 654 321",
    vat: 10, price: 4200, paidPercentage: 50,
    location: "17 Collins St, Melbourne VIC 3000",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-03-08T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-003', corName: "Electrical conduit rerouting",
    clientKind: "Private", clientName: "Thomas Nguyen",
    productName: "Conduit rerouting labour", productType: "Service",
    corDate: "2024-01-22", creationDate: "2024-01-22T08:00:00.000Z",
    corNumber: "COR-2024-003", vatNumber: "",
    vat: 10, price: 950, paidPercentage: 0,
    location: "9 Roma St, Brisbane QLD 4000",
    status: "Cancelled", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-01-22T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-004', corName: "Waterproofing membrane replacement",
    clientKind: "Company", clientName: "Meridian Build Group",
    productName: "Waterproofing labour and materials", productType: "Service",
    corDate: "2024-03-18", creationDate: "2024-03-18T08:00:00.000Z",
    corNumber: "COR-2024-004", vatNumber: "ABN 72 987 654 321",
    vat: 10, price: 3400, paidPercentage: 0,
    location: "Collins St, Melbourne VIC 3000",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-03-18T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-005', corName: "Scaffolding damage rectification",
    clientKind: "Company", clientName: "Pinnacle Structures Pty Ltd",
    productName: "Steel scaffold panel replacement", productType: "Product",
    corDate: "2024-04-02", creationDate: "2024-04-02T08:00:00.000Z",
    corNumber: "COR-2024-005", vatNumber: "ABN 33 456 789 012",
    vat: 10, price: 6800, paidPercentage: 100,
    location: "Harbour View Apartments, Brisbane QLD",
    status: "Paid", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-04-02T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-006', corName: "Concrete spill cleanup — Level 2 slab",
    clientKind: "Private", clientName: "James Whitfield",
    productName: "Industrial concrete removal service", productType: "Service",
    corDate: "2024-04-15", creationDate: "2024-04-15T08:00:00.000Z",
    corNumber: "COR-2024-006", vatNumber: "",
    vat: 10, price: 1150, paidPercentage: 50,
    location: "42 George St, Sydney NSW 2000",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-04-15T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-007', corName: "Paint oversprayed — adjacent unit",
    clientKind: "Company", clientName: "Hargreaves Construction Pty Ltd",
    productName: "Repainting and surface prep", productType: "Service",
    corDate: "2024-05-01", creationDate: "2024-05-01T08:00:00.000Z",
    corNumber: "COR-2024-007", vatNumber: "ABN 51 123 456 789",
    vat: 10, price: 2200, paidPercentage: 0,
    location: "17 Collins St, Melbourne VIC 3000",
    status: "Cancelled", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-05-01T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  // Company c2 seed CORs
  {
    id: 'cor-seed-c2-001', corName: "Conduit damaged by concreter",
    clientKind: "Company", clientName: "NexGen Hosting Pty Ltd",
    productName: "Conduit replacement and rerouting", productType: "Service",
    corDate: "2024-05-14", creationDate: "2024-05-14T08:00:00.000Z",
    corNumber: "BES-2024-001", vatNumber: "ABN 88 321 654 987",
    vat: 10, price: 2750, paidPercentage: 100,
    location: "Parramatta Data Centre, Floor 3",
    status: "Paid", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-05-14T08:00:00.000Z')],
    companyId: 'c2',
    sharedWith: [],
  },
  {
    id: 'cor-seed-c2-002', corName: "Switchboard mislabelled — rectification",
    clientKind: "Company", clientName: "Westfield Group",
    productName: "Switchboard audit and relabelling", productType: "Service",
    corDate: "2024-04-03", creationDate: "2024-04-03T08:00:00.000Z",
    corNumber: "BES-2024-002", vatNumber: "ABN 55 678 901 234",
    vat: 10, price: 980, paidPercentage: 0,
    location: "500 Oxford St, Bondi Junction NSW 2022",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-04-03T08:00:00.000Z')],
    companyId: 'c2',
    sharedWith: [],
  },
  {
    id: 'cor-seed-c2-003', corName: "Emergency lighting not installed to spec",
    clientKind: "Company", clientName: "Randwick City Council",
    productName: "Emergency light replacement (x6 units)", productType: "Product",
    corDate: "2024-05-20", creationDate: "2024-05-20T08:00:00.000Z",
    corNumber: "BES-2024-003", vatNumber: "ABN 12 999 888 777",
    vat: 10, price: 1640, paidPercentage: 50,
    location: "Queen Elizabeth Dr, Bondi Beach NSW 2026",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-05-20T08:00:00.000Z')],
    companyId: 'c2',
    sharedWith: [],
  },
  {
    id: 'cor-seed-c2-004', corName: "Cable tray installed in wrong zone",
    clientKind: "Company", clientName: "NexGen Hosting Pty Ltd",
    productName: "Cable tray removal and reinstall", productType: "Service",
    corDate: "2024-06-01", creationDate: "2024-06-01T08:00:00.000Z",
    corNumber: "BES-2024-004", vatNumber: "ABN 88 321 654 987",
    vat: 10, price: 3300, paidPercentage: 0,
    location: "Parramatta Data Centre, Floor 4",
    status: "Cancelled", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-06-01T08:00:00.000Z')],
    companyId: 'c2',
    sharedWith: [],
  },
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
      setCors(parsed.map((c: any) => ({
        ...c,
        activityLog: c.activityLog || [],
        companyId: c.companyId || 'c1',
        sharedWith: c.sharedWith || [],
        // Remove old field if present
        assignedExternalManagers: undefined,
      })));
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
