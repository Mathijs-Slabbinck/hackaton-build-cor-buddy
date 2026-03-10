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
    projectName: "Collins St Tower Fit-out",
    clientName: "Hargreaves Construction Pty Ltd",
    location: "Collins St, Melbourne VIC 3000",
    startDate: "2024-01-15", endDate: "2024-06-30",
    status: "Active", budget: 480000, amountSpent: 510000,
    description: "Full electrical and mechanical fit-out, levels 12–18.",
    companyId: "c1",
  },
  {
    id: crypto.randomUUID(),
    projectName: "George St Residential",
    clientName: "Meridian Build Group",
    location: "42 George St, Sydney NSW 2000",
    startDate: "2024-02-01", endDate: "2024-08-15",
    status: "Active", budget: 320000, amountSpent: 275000,
    description: "12-unit residential build, structural and fit-out works.",
    companyId: "c1",
  },
  {
    id: crypto.randomUUID(),
    projectName: "Roma St Commercial Reno",
    clientName: "Thomas Nguyen",
    location: "9 Roma St, Brisbane QLD 4000",
    startDate: "2023-10-01", endDate: "2024-03-31",
    status: "Completed", budget: 95000, amountSpent: 91000,
    description: "Office strip-out and refit, ground floor only.",
    companyId: "c1",
  },
  // Company c2 seed
  {
    id: crypto.randomUUID(),
    projectName: "Westfield Substation Upgrade",
    clientName: "Westfield Group",
    location: "500 Oxford St, Bondi Junction NSW 2022",
    startDate: "2024-03-01", endDate: "2024-09-30",
    status: "Active", budget: 210000, amountSpent: 0,
    description: "HV switchboard replacement and conduit install.",
    companyId: "c2",
  },
  {
    id: crypto.randomUUID(),
    projectName: "Bondi Beach Surf Club Rewire",
    clientName: "Randwick City Council",
    location: "Queen Elizabeth Dr, Bondi Beach NSW 2026",
    startDate: "2024-02-12", endDate: "2024-05-30",
    status: "Completed", budget: 74000, amountSpent: 68000,
    description: "Full rewire of heritage surf club building, switchboard upgrade and emergency lighting install.",
    companyId: "c2",
  },
  {
    id: crypto.randomUUID(),
    projectName: "Parramatta Data Centre Fit-out",
    clientName: "NexGen Hosting Pty Ltd",
    location: "1 Parramatta Sq, Parramatta NSW 2150",
    startDate: "2024-05-01", endDate: "2024-11-30",
    status: "Active", budget: 530000, amountSpent: 0,
    description: "High-density power distribution, UPS installation and structured cabling — floors 3 and 4.",
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
