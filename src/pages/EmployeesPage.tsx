import { useState, useMemo } from 'react';
import { Users, UserCheck, Coffee, Pencil, Trash2, Plus, Loader2, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { StatusBadge, formatDate } from '@/components/SharedUI';
import { useEmployees, type Employee } from '@/contexts/EmployeeContext';
import { useProjects } from '@/contexts/ProjectContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const roles = ['Electrician', 'Plumber', 'Plasterer', 'Carpenter', 'Site Manager', 'Labourer', 'HVAC Tech', 'Demolition Worker'];

const EmployeesPage = () => {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { projects } = useProjects();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useBodyScrollLock(modalOpen);

  const emptyForm = { fullName: '', role: '', email: '', phone: '', assignedProject: '', startDate: '', endDate: '', dailyRate: '', status: 'Active' as Employee['status'] };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pageSize = 10;
  const totalPages = Math.ceil(employees.length / pageSize);
  const paged = employees.slice(page * pageSize, (page + 1) * pageSize);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setErrors({}); setModalOpen(true); };
  const openEdit = (emp: Employee) => {
    setForm({ ...emp, dailyRate: String(emp.dailyRate) } as any);
    setEditId(emp.id); setErrors({}); setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Required';
    if (!form.role.trim()) errs.role = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    if (!form.assignedProject.trim()) errs.assignedProject = 'Required';
    if (!form.dailyRate) errs.dailyRate = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const data: Employee = {
      id: editId || crypto.randomUUID(),
      fullName: form.fullName.trim(), role: form.role.trim(),
      email: form.email.trim(), phone: form.phone.trim(),
      assignedProject: form.assignedProject.trim(),
      startDate: form.startDate, endDate: form.endDate,
      dailyRate: Number(form.dailyRate), status: form.status,
    };
    if (editId) updateEmployee(editId, data);
    else addEmployee(data);
    toast.success(editId ? 'Employee updated ✓' : 'Employee added ✓');
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) { deleteEmployee(deleteId); setDeleteId(null); toast.success('Employee deleted'); }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = (field: string) => `w-full border-[1.5px] rounded-lg px-3 py-2.5 text-sm transition ${errors[field] ? 'border-destructive' : 'border-border'} focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20`;

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={40} /></div></AppLayout>;

  const totalEmp = employees.length;
  const active = employees.filter(e => e.status === 'Active').length;
  const onLeave = employees.filter(e => e.status === 'On Leave').length;

  return (
    <AppLayout>
      <PageHeader title="Employee Planner" subtitle="Track crew assignments across projects"
        action={<button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#007A74] transition-colors flex items-center gap-2"><Plus size={16} /> Add Employee</button>} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Employees" value={totalEmp} icon={Users} iconBg="#EAF5F5" iconColor="#009A93" />
        <SummaryCard label="Active" value={active} icon={UserCheck} iconBg="#EAF5F5" iconColor="#009A93" valueColor="#009A93" />
        <SummaryCard label="On Leave" value={onLeave} icon={Coffee} iconBg="#fffded" iconColor="#856A00" valueColor="#856A00" />
      </div>

      <div className="card-cor overflow-hidden">
        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users size={48} className="text-border mb-3" />
            <p className="text-muted-foreground mb-4">No employees found</p>
            <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm">+ Add Employee</button>
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
                      <td className="px-4 py-3">{e.assignedProject}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{e.startDate ? formatDate(e.startDate) : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{e.endDate ? formatDate(e.endDate) : '—'}</td>
                      <td className="px-4 py-3">${e.dailyRate} /day</td>
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
              <span className="text-xs text-muted-foreground">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, employees.length)} of {employees.length} results</span>
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
              <h2 className="text-xl font-bold">{editId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-accent rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="label-uppercase block mb-1.5">Full Name *</label><input className={inputCls('fullName')} value={form.fullName} onChange={e => set('fullName', e.target.value)} />{errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Role *</label><input list="roles" className={inputCls('role')} value={form.role} onChange={e => set('role', e.target.value)} /><datalist id="roles">{roles.map(r => <option key={r} value={r} />)}</datalist>{errors.role && <p className="text-destructive text-xs mt-1">{errors.role}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Email *</label><input type="email" className={inputCls('email')} value={form.email} onChange={e => set('email', e.target.value)} />{errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Phone</label><input className={inputCls('phone')} placeholder="04XX XXX XXX" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div>
                <label className="label-uppercase block mb-1.5">Assigned Project *</label>
                <select className={inputCls('assignedProject')} value={form.assignedProject} onChange={e => set('assignedProject', e.target.value)}>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.projectName}>{p.projectName}</option>)}
                </select>
                {errors.assignedProject && <p className="text-destructive text-xs mt-1">{errors.assignedProject}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-uppercase block mb-1.5">Start Date</label><input type="date" className={inputCls('startDate')} value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
                <div><label className="label-uppercase block mb-1.5">End Date</label><input type="date" className={inputCls('endDate')} value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
              </div>
              <div><label className="label-uppercase block mb-1.5">Daily Rate AUD *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><input type="number" min={0} className={`${inputCls('dailyRate')} pl-7`} value={form.dailyRate} onChange={e => set('dailyRate', e.target.value)} /></div>{errors.dailyRate && <p className="text-destructive text-xs mt-1">{errors.dailyRate}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Status *</label><select className={inputCls('status')} value={form.status} onChange={e => set('status', e.target.value)}><option>Active</option><option>On Leave</option><option>Completed</option></select></div>
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
