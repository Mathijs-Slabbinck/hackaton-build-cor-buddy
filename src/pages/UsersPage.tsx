import { useState, useMemo } from 'react';
import { Users, UserCheck, ShieldCheck, User as UserIcon, Pencil, X, Plus, Building, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { useAuth, type User } from '@/contexts/AuthContext';
import { useCOR } from '@/contexts/CORContext';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { relativeTime } from '@/components/SharedUI';

const UsersPage = () => {
  const { currentUser, currentCompany, users, companies, addUser, updateUser, getUserById } = useAuth();
  const { cors } = useCOR();
  const [activeTab, setActiveTab] = useState<'team' | 'external'>('team');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useBodyScrollLock(modalOpen);

  const myTeam = useMemo(() => users.filter(u => u.companyId === currentUser?.companyId), [users, currentUser]);
  const externalCompanies = useMemo(() => companies.filter(c => c.id !== currentUser?.companyId), [companies, currentUser]);

  const totalUsers = myTeam.length;
  const activeUsers = myTeam.filter(u => u.isActive).length;

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = (field: string) => `w-full border-[1.5px] rounded-lg px-3 py-2.5 text-sm transition ${errors[field] ? 'border-destructive' : 'border-border'} focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20`;

  const openAdd = () => { setForm({ fullName: '', username: '', email: '', password: '' }); setEditId(null); setErrors({}); setModalOpen(true); };
  const openEdit = (u: User) => { setForm({ fullName: u.fullName, username: u.username, email: u.email, password: '' }); setEditId(u.id); setErrors({}); setModalOpen(true); };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Required';
    if (!form.username.trim()) errs.username = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    if (!editId && !form.password.trim()) errs.password = 'Required';
    // Check username uniqueness
    if (form.username.trim() && users.some(u => u.username === form.username.trim() && u.id !== editId)) {
      errs.username = 'Username already taken';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const save = () => {
    if (!validate() || !currentUser) return;
    if (editId) {
      const updates: Partial<User> = {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        avatarInitials: getInitials(form.fullName.trim()),
      };
      if (form.password.trim()) updates.password = form.password.trim();
      updateUser(editId, updates);
      toast.success('User updated ✓');
    } else {
      const newUser: User = {
        id: crypto.randomUUID(),
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        role: 'manager',
        companyId: currentUser.companyId,
        avatarInitials: getInitials(form.fullName.trim()),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      addUser(newUser);
      toast.success('Manager account created ✓');
    }
    setModalOpen(false);
  };

  const toggleActive = (u: User) => {
    if (u.id === currentUser?.id) return;
    updateUser(u.id, { isActive: !u.isActive });
    toast.success(u.isActive ? 'User deactivated' : 'User activated');
  };

  const tabCls = (t: string) => `px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`;

  return (
    <AppLayout>
      <PageHeader title="Users & Access" subtitle="Manage your team and external company access"
        action={activeTab === 'team' ? <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#007A74] transition-colors flex items-center gap-2"><Plus size={16} /> Invite Manager</button> : undefined} />

      <div className="flex gap-0 border-b border-border mb-6">
        <button onClick={() => setActiveTab('team')} className={tabCls('team')}>My Team</button>
        <button onClick={() => setActiveTab('external')} className={tabCls('external')}>External Companies</button>
      </div>

      {activeTab === 'team' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SummaryCard label="Total Users" value={totalUsers} icon={Users} iconBg="#EAF5F5" iconColor="#009A93" />
            <SummaryCard label="Active" value={activeUsers} icon={UserCheck} iconBg="#EAF5F5" iconColor="#009A93" />
          </div>

          <div className="card-cor overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr></thead>
                <tbody>
                  <TooltipProvider>
                    {myTeam.map((u, i) => (
                      <tr key={u.id} className={`group transition-colors duration-150 hover:bg-accent ${i % 2 === 1 ? 'bg-accent/40' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{u.avatarInitials}</div>
                            <div>
                              <p className="font-medium">{u.fullName}</p>
                              <p className="text-xs text-muted-foreground">{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {u.role === 'owner' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary"><ShieldCheck size={12} /> Owner</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#EEF9FD', color: '#44C8F5' }}><UserIcon size={12} /> Manager</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary">Active</span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(u)} className="p-1.5 rounded-md hover:bg-border transition-colors"><Pencil size={14} /></button>
                            {u.id === currentUser?.id ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button disabled className="p-1.5 rounded-md opacity-30 cursor-not-allowed text-muted-foreground text-xs">
                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent><p>You cannot deactivate your own account</p></TooltipContent>
                              </Tooltip>
                            ) : (
                              <button onClick={() => toggleActive(u)} className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${u.isActive ? 'hover:bg-red-100 text-destructive' : 'hover:bg-accent text-primary'}`}>
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </TooltipProvider>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'external' && (
        <>
          {externalCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Building size={40} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">No external companies in the system yet.</p>
              <p className="text-sm text-muted-foreground mt-1">External companies appear here once another company registers and you assign their managers to a COR.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {externalCompanies.map(comp => {
                const sharedCors = cors.filter(c =>
                  (c.assignedExternalManagers || []).some(a => a.companyId === comp.id)
                );
                return (
                  <div key={comp.id} className="card-cor p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Building size={18} className="text-muted-foreground" />
                      <span className="font-bold">{comp.companyName}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary">{comp.industry}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{comp.country}</p>

                    <p className="label-uppercase text-[11px] mb-2">Shared CORs</p>
                    {sharedCors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No records shared with this company yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead><tr className="table-header">
                          <th className="text-left px-2 py-1.5">COR #</th>
                          <th className="text-left px-2 py-1.5">COR Name</th>
                          <th className="text-left px-2 py-1.5">Assigned To</th>
                          <th className="text-left px-2 py-1.5">Date</th>
                        </tr></thead>
                        <tbody>
                          {sharedCors.map(c => {
                            const assignedUsers = (c.assignedExternalManagers || [])
                              .filter(a => a.companyId === comp.id)
                              .map(a => getUserById(a.userId)?.fullName || 'Unknown');
                            return (
                              <tr key={c.id} className="border-b border-border">
                                <td className="px-2 py-1.5 font-mono text-muted-foreground">{c.corNumber}</td>
                                <td className="px-2 py-1.5">{c.corName}</td>
                                <td className="px-2 py-1.5">{assignedUsers.join(', ')}</td>
                                <td className="px-2 py-1.5">{c.assignedExternalManagers?.find(a => a.companyId === comp.id)?.assignedAt ? relativeTime(c.assignedExternalManagers.find(a => a.companyId === comp.id)!.assignedAt) : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] bg-card rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">{editId ? 'Edit User' : `Add Manager to ${currentCompany?.companyName}`}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-accent rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="label-uppercase block mb-1.5">Full Name *</label><input className={inputCls('fullName')} value={form.fullName} onChange={e => set('fullName', e.target.value)} />{errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Username *</label><input className={inputCls('username')} value={form.username} onChange={e => set('username', e.target.value)} />{errors.username && <p className="text-destructive text-xs mt-1">{errors.username}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Email *</label><input type="email" className={inputCls('email')} value={form.email} onChange={e => set('email', e.target.value)} />{errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}</div>
              <div>
                <label className="label-uppercase block mb-1.5">Password {editId ? '' : '*'}</label>
                <input className={inputCls('password')} value={form.password} onChange={e => set('password', e.target.value)} placeholder={editId ? 'Leave blank to keep current' : ''} />
                {!editId && <p className="text-xs text-muted-foreground mt-1">⚠ Share this password securely with the user</p>}
                {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
              </div>
              {!editId && (
                <div>
                  <label className="label-uppercase block mb-1.5">Role</label>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#EEF9FD', color: '#44C8F5' }}><UserIcon size={12} /> Manager</span>
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex justify-between">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
              <button onClick={save} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors">{editId ? 'Save' : 'Create Manager'}</button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default UsersPage;
