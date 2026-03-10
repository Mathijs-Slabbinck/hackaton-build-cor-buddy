import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Project {
  id: string;
  projectName: string;
  clientName: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'On Hold';
  budget: number;
  amountSpent: number;
  description: string;
  companyId: string;
}

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  addProject: (p: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
}

const SEED: Project[] = [
  {
    id: crypto.randomUUID(),
    projectName: "Rue de la Loi Office Renovation",
    clientName: "Eurocenter Real Estate NV",
    location: "Rue de la Loi 40, 1000 Brussels",
    startDate: "2024-01-10", endDate: "2024-07-31",
    status: "Active", budget: 620000, amountSpent: 0,
    description: "Full strip-out and fit-out of floors 4–7. Structural reinforcement, MEP works and interior finishing.",
    companyId: "c1",
  },
  {
    id: crypto.randomUUID(),
    projectName: "Ghent Canal Apartments — Phase 2",
    clientName: "Vandenberghe Vastgoed BV",
    location: "Nieuwevaart 58, 9000 Ghent",
    startDate: "2024-03-01", endDate: "2024-10-15",
    status: "Active", budget: 430000, amountSpent: 0,
    description: "Structural carcass and façade works for 18-unit residential canal-side development.",
    companyId: "c1",
  },
  {
    id: crypto.randomUUID(),
    projectName: "Mechelen Logistics Hub",
    clientName: "BelFreight Logistics SA",
    location: "Industrieweg 12, 2800 Mechelen",
    startDate: "2023-09-01", endDate: "2024-02-28",
    status: "Completed", budget: 185000, amountSpent: 0,
    description: "Warehouse floor reinforcement, loading dock extension and drainage works.",
    companyId: "c1",
  },
  {
    id: crypto.randomUUID(),
    projectName: "Antwerp Port Authority HQ Rewire",
    clientName: "Port of Antwerp-Bruges NV",
    location: "Entrepotkaai 1, 2000 Antwerp",
    startDate: "2024-03-01", endDate: "2024-09-30",
    status: "Active", budget: 310000, amountSpent: 0,
    description: "Full rewire of 6-floor HQ building, new switchboard installation and emergency lighting upgrade.",
    companyId: "c2",
  },
  {
    id: crypto.randomUUID(),
    projectName: "Liège Train Station — Platform Lighting",
    clientName: "Infrabel SA",
    location: "Place des Guillemins 2, 4000 Liège",
    startDate: "2024-01-15", endDate: "2024-04-30",
    status: "Completed", budget: 98000, amountSpent: 0,
    description: "LED platform lighting replacement and control panel upgrade across platforms 1–6.",
    companyId: "c2",
  },
  {
    id: crypto.randomUUID(),
    projectName: "Bruges Historic Centre — Solar Install",
    clientName: "Stad Brugge",
    location: "Markt 1, 8000 Bruges",
    startDate: "2024-06-01", endDate: "2024-12-15",
    status: "Active", budget: 420000, amountSpent: 0,
    description: "Rooftop solar array installation across 9 municipal buildings with grid tie-in.",
    companyId: "c2",
  },
];

const KEY = "cortrack_projects";
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      setProjects(parsed.map((p: any) => ({ ...p, amountSpent: p.amountSpent ?? 0, companyId: p.companyId || 'c1' })));
    }
    else { setProjects(SEED); localStorage.setItem(KEY, JSON.stringify(SEED)); }
    setLoading(false);
  }, []);

  const persist = useCallback((next: Project[]) => { setProjects(next); localStorage.setItem(KEY, JSON.stringify(next)); }, []);
  const addProject = useCallback((p: Project) => persist([p, ...projects]), [projects, persist]);
  const updateProject = useCallback((id: string, updates: Partial<Project>) => persist(projects.map(p => p.id === id ? { ...p, ...updates } : p)), [projects, persist]);
  const deleteProject = useCallback((id: string) => persist(projects.filter(p => p.id !== id)), [projects, persist]);
  const getProjectById = useCallback((id: string) => projects.find(p => p.id === id), [projects]);

  return <ProjectContext.Provider value={{ projects, loading, addProject, updateProject, deleteProject, getProjectById }}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => { const ctx = useContext(ProjectContext); if (!ctx) throw new Error("useProjects must be within ProjectProvider"); return ctx; };
