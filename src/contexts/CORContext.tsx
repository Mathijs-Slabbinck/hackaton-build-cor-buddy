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
  // Company c1
  {
    id: 'cor-seed-001', corName: "Plasterboard destroyed — plumbing leak",
    clientKind: "Company", clientName: "Eurocenter Real Estate NV",
    productName: "Plasterboard replacement (12 sheets)", productType: "Product",
    corDate: "2024-02-08", creationDate: "2024-02-08T08:00:00.000Z",
    corNumber: "AGB-2024-001", vatNumber: "BE 0412.345.678",
    vat: 21, price: 2400, paidPercentage: 100,
    location: "Rue de la Loi 40, 1000 Brussels, Floor 5",
    status: "Paid", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-02-08T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: ['u3', 'u4'],
  },
  {
    id: 'cor-seed-002', corName: "Floor tiles cracked by scaffolding sub",
    clientKind: "Company", clientName: "Vandenberghe Vastgoed BV",
    productName: "Ceramic tile replacement and relaying", productType: "Service",
    corDate: "2024-03-22", creationDate: "2024-03-22T08:00:00.000Z",
    corNumber: "AGB-2024-002", vatNumber: "BE 0498.765.432",
    vat: 21, price: 5800, paidPercentage: 50,
    location: "Nieuwevaart 58, 9000 Ghent, Unit 7",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-03-22T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-003', corName: "Insulation ruined — roof left open overnight",
    clientKind: "Company", clientName: "BelFreight Logistics SA",
    productName: "Rockwool insulation rolls (8 units)", productType: "Product",
    corDate: "2024-01-30", creationDate: "2024-01-30T08:00:00.000Z",
    corNumber: "AGB-2024-003", vatNumber: "BE 0567.890.123",
    vat: 21, price: 1280, paidPercentage: 0,
    location: "Industrieweg 12, 2800 Mechelen",
    status: "Cancelled", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-01-30T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-004', corName: "Painted walls scuffed — forklift damage",
    clientKind: "Company", clientName: "Eurocenter Real Estate NV",
    productName: "Repainting — 3 wall sections", productType: "Service",
    corDate: "2024-04-10", creationDate: "2024-04-10T08:00:00.000Z",
    corNumber: "AGB-2024-004", vatNumber: "BE 0412.345.678",
    vat: 21, price: 1750, paidPercentage: 0,
    location: "Rue de la Loi 40, 1000 Brussels, Floor 4",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-04-10T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-005', corName: "Window frame cracked during steel delivery",
    clientKind: "Private", clientName: "Hendrik Wouters",
    productName: "Aluminium window frame replacement", productType: "Product",
    corDate: "2024-04-28", creationDate: "2024-04-28T08:00:00.000Z",
    corNumber: "AGB-2024-005", vatNumber: "",
    vat: 21, price: 3100, paidPercentage: 100,
    location: "Nieuwevaart 58, 9000 Ghent, Unit 3",
    status: "Paid", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-04-28T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  {
    id: 'cor-seed-006', corName: "OSB boards warped — improper storage by sub",
    clientKind: "Company", clientName: "BelFreight Logistics SA",
    productName: "OSB board replacement (10 sheets)", productType: "Product",
    corDate: "2024-05-03", creationDate: "2024-05-03T08:00:00.000Z",
    corNumber: "AGB-2024-006", vatNumber: "BE 0567.890.123",
    vat: 21, price: 620, paidPercentage: 0,
    location: "Industrieweg 12, 2800 Mechelen",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-05-03T08:00:00.000Z')],
    companyId: 'c1',
    sharedWith: [],
  },
  // Company c2
  {
    id: 'cor-seed-c2-001', corName: "Conduit crushed — concrete poured early",
    clientKind: "Company", clientName: "Port of Antwerp-Bruges NV",
    productName: "Steel conduit replacement (14 sections)", productType: "Product",
    corDate: "2024-03-28", creationDate: "2024-03-28T08:00:00.000Z",
    corNumber: "BES-2024-001", vatNumber: "BE 0207.179.373",
    vat: 21, price: 3200, paidPercentage: 100,
    location: "Entrepotkaai 1, 2000 Antwerp, Floor 2",
    status: "Paid", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-03-28T08:00:00.000Z')],
    companyId: 'c2',
    sharedWith: [],
  },
  {
    id: 'cor-seed-c2-002', corName: "LED panels broken — scaffolding collapse",
    clientKind: "Company", clientName: "Infrabel SA",
    productName: "LED panel replacement (8 units)", productType: "Product",
    corDate: "2024-02-14", creationDate: "2024-02-14T08:00:00.000Z",
    corNumber: "BES-2024-002", vatNumber: "BE 0869.763.267",
    vat: 21, price: 4750, paidPercentage: 50,
    location: "Place des Guillemins 2, 4000 Liège, Platform 3",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-02-14T08:00:00.000Z')],
    companyId: 'c2',
    sharedWith: [],
  },
  {
    id: 'cor-seed-c2-003', corName: "Switchboard damaged — unauthorised access",
    clientKind: "Company", clientName: "Port of Antwerp-Bruges NV",
    productName: "Switchboard repair and recertification", productType: "Service",
    corDate: "2024-04-09", creationDate: "2024-04-09T08:00:00.000Z",
    corNumber: "BES-2024-003", vatNumber: "BE 0207.179.373",
    vat: 21, price: 6100, paidPercentage: 0,
    location: "Entrepotkaai 1, 2000 Antwerp, Basement",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-04-09T08:00:00.000Z')],
    companyId: 'c2',
    sharedWith: [],
  },
  {
    id: 'cor-seed-c2-004', corName: "Solar panels cracked during roofing works",
    clientKind: "Company", clientName: "Stad Brugge",
    productName: "Solar panel replacement (3 units)", productType: "Product",
    corDate: "2024-06-18", creationDate: "2024-06-18T08:00:00.000Z",
    corNumber: "BES-2024-004", vatNumber: "BE 0207.018.116",
    vat: 21, price: 8900, paidPercentage: 0,
    location: "Markt 1, 8000 Bruges, Roof Level",
    status: "Ongoing", pictureUrls: [], fileUrls: [],
    activityLog: [makeEntry('created', 'COR created', '2024-06-18T08:00:00.000Z')],
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
