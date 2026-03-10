import { useState, useMemo } from 'react';
import { Users, UserCheck, Coffee, Pencil, Trash2, Loader2, X, Search, UserX } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { StatusBadge, formatDate } from '@/components/SharedUI';
import { useEmployees, type Employee } from '@/contexts/EmployeeContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useShifts } from '@/contexts/ShiftContext';
import { generateShiftsFromEmployee } from '@/components/scheduler/syncUtils';
import SchedulerSection from '@/components/scheduler/SchedulerSection';

const roles = ['Electrician', 'Plumber', 'Plasterer', 'Carpenter', 'Site Manager', 'Labourer', 'HVAC Tech', 'Demolition Worker'];

const EmployeesPage = () => {
  const { employees, loading, updateEmployee, deleteEmployee } = useEmployees();
  const { projects } = useProjects();
  const { session } = useAuth();
  const { replaceShiftsForEmployee } = useShifts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  useBodyScrollLock(modalOpen);

  // Filter by company
  const companyEmployees = useMemo(() => employees.filter(e => e.companyId === session?.companyId), [employees, session]);
  const companyProjects = useMemo(() => projects.filter(p => p.companyId === session?.companyId), [projects, session]);

  const emptyForm = { fullName: '', role: '', email: '', phone: '', assignedProject: '', startDate: '', endDate: '', dailyRate: '', status: 'Active' as Employee['status'] };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const uniqueRoles = useMemo(() => [...new Set(companyEmployees.map(e => e.role))], [companyEmployees]);

  const filtered = useMemo(() => {
    return companyEmployees.filter(e => {
      const q = search.toLowerCase();
      if (q && !e.fullName.toLowerCase().includes(q) && !e.role.toLowerCase().includes(q) && !(e.assignedProject || '').toLowerCase().includes(q)) return false;
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (roleFilter !== 'All' && e.role !== roleFilter) return false;
      return true;
    });
  }, [companyEmployees, search, statusFilter, roleFilter]);

  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const openEdit = (emp: Employee) => {
    setForm({
      ...emp,
      dailyRate: String(emp.dailyRate),
      assignedProject: emp.assignedProject === 'none' ? '' : emp.assignedProject,
    } as any);
    setEditId(emp.id); setErrors({}); setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Required';
    if (!form.role.trim()) errs.role = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    if (!form.dailyRate) errs.dailyRate = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (!editId) return;
    const data: Employee = {
      id: editId,
      fullName: form.fullName.trim(), role: form.role.trim(),
      email: form.email.trim(), phone: form.phone.trim(),
      assignedProject: form.assignedProject.trim(),
      startDate: form.startDate, endDate: form.endDate,
      dailyRate: Number(form.dailyRate), status: form.status,
      companyId: session?.companyId || 'c1',
    };
    updateEmployee(editId, data);

    // Sync shifts: replace all shifts for this employee in one atomic operation
    const hasProject = data.assignedProject && data.assignedProject !== '' && data.assignedProject !== 'none';
    if (hasProject && data.startDate && data.endDate) {
      const newShifts = generateShiftsFromEmployee(data);
      replaceShiftsForEmployee(data.id, newShifts);
    } else {
      replaceShiftsForEmployee(data.id, []);
      if (!hasProject) {
        updateEmployee(editId, { assignedProject: 'none' });
      }
    }

    toast.success('Employee updated ✓');
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) { deleteEmployee(deleteId); setDeleteId(null); toast.success('Employee deleted'); }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = (field: string) => `w-full border-[1.5px] rounded-lg px-3 py-2.5 text-sm transition ${errors[field] ? 'border-destructive' : 'border-border'} focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20`;

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={40} /></div></AppLayout>;

  const totalEmp = companyEmployees.length;
  const active = companyEmployees.filter(e => e.status === 'Active').length;
  const inactive = companyEmployees.filter(e => e.status === 'Inactive').length;
  const onLeave = companyEmployees.filter(e => e.status === 'On Leave').length;

  const selectClasses = "border-[1.5px] border-border rounded-lg px-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20";

  return (
    <AppLayout>
      <PageHeader title="Employee Planner" subtitle="Track crew assignments across projects" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Employees" value={totalEmp} icon={Users} iconBg="#EAF5F5" iconColor="#009A93" />
        <SummaryCard label="Active" value={active} icon={UserCheck} iconBg="#EAF5F5" iconColor="#009A93" valueColor="#009A93" />
        <SummaryCard label="Inactive" value={inactive} icon={UserX} iconBg="#f3f4f6" iconColor="#6b7280" valueColor="#6b7280" />
        <SummaryCard label="On Leave" value={onLeave} icon={Coffee} iconBg="#fffded" iconColor="#856A00" valueColor="#856A00" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Search</span>
          <div className="relative min-w-[280px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search by name, role, project..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full border-[1.5px] border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</span>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} className={selectClasses}>
            <option>All</option><option>Active</option><option>Inactive</option><option>On Leave</option><option>Completed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Role</span>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0); }} className={selectClasses}>
            <option>All</option>{uniqueRoles.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="card-cor overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users size={48} className="text-border mb-3" />
            <p className="text-muted-foreground mb-4">No employees found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Assigned Project</th><th className="text-left px-4 py-3">Start</th>
                  <th className="text-left px-4 py-3">End</th><th className="text-left px-4 py-3">Daily Rate</th>
                  <th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Actions</th>
                </tr></thead>
                <tbody>
                  {paged.map((e, i) => (
                    <tr key={e.id} className={`group transition-colors duration-150 hover:bg-accent ${i % 2 === 1 ? 'bg-accent/40' : ''}`}>
                      <td className="px-4 py-3 font-medium">{e.fullName}</td>
                      <td className="px-4 py-3">{e.role}</td>
                      <td className="px-4 py-3">{e.assignedProject || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{e.startDate ? formatDate(e.startDate) : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{e.endDate ? formatDate(e.endDate) : '—'}</td>
                      <td className="px-4 py-3">€{e.dailyRate} /day</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded-md hover:bg-border transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded-md hover:bg-red-100 text-destructive transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      <SchedulerSection />

      {/* Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[520px] bg-card rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Employee</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-accent rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="label-uppercase block mb-1.5">Full Name *</label><input className={inputCls('fullName')} value={form.fullName} onChange={e => set('fullName', e.target.value)} />{errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Role *</label><input list="roles" className={inputCls('role')} value={form.role} onChange={e => set('role', e.target.value)} /><datalist id="roles">{roles.map(r => <option key={r} value={r} />)}</datalist>{errors.role && <p className="text-destructive text-xs mt-1">{errors.role}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Email *</label><input type="email" className={inputCls('email')} value={form.email} onChange={e => set('email', e.target.value)} />{errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Phone</label><input className={inputCls('phone')} placeholder="04XX XXX XXX" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div>
                <label className="label-uppercase block mb-1.5">Assigned Project</label>
                <select className={inputCls('assignedProject')} value={form.assignedProject} onChange={e => set('assignedProject', e.target.value)}>
                  <option value="">— No project assigned —</option>
                  {companyProjects.map(p => <option key={p.id} value={p.projectName}>{p.projectName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-uppercase block mb-1.5">Start Date</label><input type="date" className={inputCls('startDate')} value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
                <div><label className="label-uppercase block mb-1.5">End Date</label><input type="date" className={inputCls('endDate')} value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
              </div>
              <div><label className="label-uppercase block mb-1.5">Daily Rate EUR *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span><input type="number" min={0} className={`${inputCls('dailyRate')} pl-7`} value={form.dailyRate} onChange={e => set('dailyRate', e.target.value)} /></div>{errors.dailyRate && <p className="text-destructive text-xs mt-1">{errors.dailyRate}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Status *</label><select className={inputCls('status')} value={form.status} onChange={e => set('status', e.target.value)}><option>Active</option><option>Inactive</option><option>On Leave</option><option>Completed</option></select></div>
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
          <AlertDialogHeader><AlertDialogTitle>Delete employee?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default EmployeesPage;
