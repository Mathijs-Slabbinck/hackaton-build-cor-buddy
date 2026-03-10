import { useState, useMemo } from 'react';
import { Briefcase, PlayCircle, PauseCircle, Pencil, Trash2, Plus, Loader2, X, CheckCircle, AlertTriangle, TrendingUp, Search } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { StatusBadge, formatEUR, formatDate } from '@/components/SharedUI';
import { useProjects, type Project } from '@/contexts/ProjectContext';
import { useEmployees } from '@/contexts/EmployeeContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const BudgetStatusBadge = ({ budget, spent }: { budget: number; spent: number }) => {
  if (spent > budget) {
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEE9D6', color: '#C2410C' }}><TrendingUp size={12} /> Over Budget</span>;
  }
  if (spent >= budget * 0.9) {
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-light" style={{ color: '#856A00' }}><AlertTriangle size={12} /> Near Limit</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary"><CheckCircle size={12} /> On Track</span>;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const ProjectsPage = () => {
  const { projects, loading, addProject, updateProject, deleteProject } = useProjects();
  const { employees } = useEmployees();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useBodyScrollLock(modalOpen);

  const emptyForm = { projectName: '', clientName: '', location: '', startDate: '', endDate: '', budget: '', amountSpent: '0', status: 'Active' as Project['status'], description: '' };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const q = search.toLowerCase();
      if (q && !p.projectName.toLowerCase().includes(q) && !p.clientName.toLowerCase().includes(q) && !p.location.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setErrors({}); setModalOpen(true); };
  const openEdit = (p: Project) => {
    setForm({ ...p, budget: String(p.budget), amountSpent: String(p.amountSpent) } as any);
    setEditId(p.id); setErrors({}); setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.projectName.trim()) errs.projectName = 'Required';
    if (!form.clientName.trim()) errs.clientName = 'Required';
    if (!form.location.trim()) errs.location = 'Required';
    if (!form.budget) errs.budget = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const data: Project = {
      id: editId || crypto.randomUUID(),
      projectName: form.projectName.trim(), clientName: form.clientName.trim(),
      location: form.location.trim(), startDate: form.startDate, endDate: form.endDate,
      budget: Number(form.budget), amountSpent: Number(form.amountSpent) || 0,
      status: form.status, description: form.description.trim(),
    };
    if (editId) updateProject(editId, data);
    else addProject(data);
    toast.success(editId ? 'Project updated ✓' : 'Project added ✓');
    setModalOpen(false);
  };

  const handleDelete = () => { if (deleteId) { deleteProject(deleteId); setDeleteId(null); toast.success('Project deleted'); } };
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = (field: string) => `w-full border-[1.5px] rounded-lg px-3 py-2.5 text-sm transition ${errors[field] ? 'border-destructive' : 'border-border'} focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20`;

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={40} /></div></AppLayout>;

  const totalProjects = projects.length;
  const activeCount = projects.filter(p => p.status === 'Active').length;
  const onHoldCount = projects.filter(p => p.status === 'On Hold').length;

  const remaining = Number(form.budget || 0) - Number(form.amountSpent || 0);

  const selectClasses = "border-[1.5px] border-border rounded-lg px-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20";

  return (
    <AppLayout>
      <PageHeader title="Projects" subtitle="Manage active and completed construction projects"
        action={<button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#007A74] transition-colors flex items-center gap-2"><Plus size={16} /> New Project</button>} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Projects" value={totalProjects} icon={Briefcase} iconBg="#EAF5F5" iconColor="#009A93" />
        <SummaryCard label="Active" value={activeCount} icon={PlayCircle} iconBg="#EAF5F5" iconColor="#009A93" valueColor="#009A93" />
        <SummaryCard label="On Hold" value={onHoldCount} icon={PauseCircle} iconBg="#fffded" iconColor="#856A00" valueColor="#856A00" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Search</span>
          <div className="relative min-w-[280px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search by name, client, location..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full border-[1.5px] border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</span>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} className={selectClasses}>
            <option>All</option><option>Active</option><option>Completed</option><option>On Hold</option>
          </select>
        </div>
      </div>

      <div className="card-cor overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Briefcase size={48} className="text-border mb-3" />
            <p className="text-muted-foreground mb-4">No projects found</p>
            <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm">+ New Project</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="text-left px-4 py-3">Project Name</th><th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Location</th><th className="text-left px-4 py-3">Start</th>
                  <th className="text-left px-4 py-3">End</th><th className="text-left px-4 py-3">Budget (€)</th>
                  <th className="text-left px-4 py-3">Spent (€)</th><th className="text-left px-4 py-3">Budget Status</th>
                  <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Team</th><th className="text-left px-4 py-3">Actions</th>
                </tr></thead>
                <tbody>
                  <TooltipProvider>
                    {paged.map((p, i) => {
                      const isOver = p.amountSpent > p.budget;
                      const teamMembers = employees.filter(e => e.assignedProject === p.projectName);
                      const displayAvatars = teamMembers.slice(0, 3);
                      const remainingCount = teamMembers.length - 3;
                      return (
                        <tr key={p.id} className={`group transition-colors duration-150 hover:bg-accent ${i % 2 === 1 ? 'bg-accent/40' : ''}`}
                          style={isOver ? { borderLeft: '3px solid #C2410C' } : undefined}>
                          <td className="px-4 py-3 font-medium">{p.projectName}</td>
                          <td className="px-4 py-3">{p.clientName}</td>
                          <td className="px-4 py-3 max-w-[160px] truncate">{p.location}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{p.startDate ? formatDate(p.startDate) : '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{p.endDate ? formatDate(p.endDate) : '—'}</td>
                          <td className="px-4 py-3 font-medium">{formatEUR(p.budget)}</td>
                          <td className="px-4 py-3 font-medium">{formatEUR(p.amountSpent)}</td>
                          <td className="px-4 py-3"><BudgetStatusBadge budget={p.budget} spent={p.amountSpent} /></td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            {teamMembers.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div>
                                <div className="flex items-center">
                                  {displayAvatars.map((emp, ai) => (
                                    <Tooltip key={emp.id}>
                                      <TooltipTrigger asChild>
                                        <div
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-white"
                                          style={{ background: '#009A93', marginLeft: ai > 0 ? '-8px' : 0, zIndex: 10 - ai }}
                                        >
                                          {getInitials(emp.fullName)}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{emp.fullName} — {emp.role}</p></TooltipContent>
                                    </Tooltip>
                                  ))}
                                  {remainingCount > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-white bg-muted text-muted-foreground"
                                          style={{ marginLeft: '-8px', zIndex: 6 }}
                                        >
                                          +{remainingCount}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {teamMembers.slice(3).map(e => <p key={e.id}>{e.fullName} — {e.role}</p>)}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-border transition-colors"><Pencil size={14} /></button>
                              <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-md hover:bg-red-100 text-destructive transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </TooltipProvider>
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} results</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:border-primary transition-colors bg-card">Prev</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:border-primary transition-colors bg-card">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[520px] bg-card rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">{editId ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-accent rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="label-uppercase block mb-1.5">Project Name *</label><input className={inputCls('projectName')} value={form.projectName} onChange={e => set('projectName', e.target.value)} />{errors.projectName && <p className="text-destructive text-xs mt-1">{errors.projectName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Client Name *</label><input className={inputCls('clientName')} value={form.clientName} onChange={e => set('clientName', e.target.value)} />{errors.clientName && <p className="text-destructive text-xs mt-1">{errors.clientName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Location *</label><input className={inputCls('location')} value={form.location} onChange={e => set('location', e.target.value)} />{errors.location && <p className="text-destructive text-xs mt-1">{errors.location}</p>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-uppercase block mb-1.5">Start Date</label><input type="date" className={inputCls('startDate')} value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
                <div><label className="label-uppercase block mb-1.5">End Date</label><input type="date" className={inputCls('endDate')} value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
              </div>
              <div><label className="label-uppercase block mb-1.5">Budget EUR *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span><input type="number" min={0} className={`${inputCls('budget')} pl-7`} value={form.budget} onChange={e => set('budget', e.target.value)} /></div>{errors.budget && <p className="text-destructive text-xs mt-1">{errors.budget}</p>}</div>
              <div>
                <label className="label-uppercase block mb-1.5">Amount Spent (€)</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span><input type="number" min={0} step={0.01} className={`${inputCls('amountSpent')} pl-7`} value={form.amountSpent} onChange={e => set('amountSpent', e.target.value)} /></div>
              </div>
              {form.budget && (
                <div className="text-sm">
                  <span className="label-uppercase text-[11px]">Remaining Budget: </span>
                  {remaining >= 0 ? (
                    <span className="font-bold text-primary">{formatEUR(remaining)} remaining</span>
                  ) : (
                    <span className="font-bold" style={{ color: '#C2410C' }}>{formatEUR(Math.abs(remaining))} over budget</span>
                  )}
                </div>
              )}
              <div><label className="label-uppercase block mb-1.5">Status *</label><select className={inputCls('status')} value={form.status} onChange={e => set('status', e.target.value)}><option>Active</option><option>Completed</option><option>On Hold</option></select></div>
              <div><label className="label-uppercase block mb-1.5">Description</label><textarea rows={3} className={inputCls('description')} value={form.description} onChange={e => set('description', e.target.value)} /></div>
            </div>
            <div className="p-6 pt-0 flex justify-between">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
              <button onClick={save} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors">Save</button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete project?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default ProjectsPage;
