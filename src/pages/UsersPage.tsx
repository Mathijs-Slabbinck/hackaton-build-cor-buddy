import { useMemo } from 'react';
import { Users, ShieldCheck, User as UserIcon, Building } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { useAuth, USERS, COMPANIES, getCompanyName } from '@/contexts/AuthContext';
import { useCOR } from '@/contexts/CORContext';

const UsersPage = () => {
  const { session } = useAuth();
  const { cors } = useCOR();

  const myTeam = useMemo(() => USERS.filter(u => u.companyId === session?.companyId), [session]);
  const externalCompanies = useMemo(() => COMPANIES.filter(c => c.id !== session?.companyId), [session]);

  // CORs from my company that are shared with external users
  const myCors = useMemo(() => cors.filter(c => c.companyId === session?.companyId), [cors, session]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <AppLayout>
      <PageHeader title="Users & Access" subtitle="View team members and shared access" />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <SummaryCard label="Team Members" value={myTeam.length} icon={Users} iconBg="#EAF5F5" iconColor="#009A93" />
        <SummaryCard label="External Companies" value={externalCompanies.length} icon={Building} iconBg="#EEF9FD" iconColor="#44C8F5" />
      </div>

      {/* My Team */}
      <div className="card-cor overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-bold text-base">My Team</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Username</th>
            </tr></thead>
            <tbody>
              {myTeam.map((u, i) => (
                <tr key={u.id} className={`transition-colors duration-150 hover:bg-accent ${i % 2 === 1 ? 'bg-accent/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{getInitials(u.fullName)}</div>
                      <span className="font-medium">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'Owner' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary"><ShieldCheck size={12} /> Owner</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#EEF9FD', color: '#44C8F5' }}><UserIcon size={12} /> Manager</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* External Companies — shared CORs */}
      <div className="card-cor overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-bold text-base">External Companies & Shared CORs</h3>
        </div>
        {externalCompanies.length === 0 ? (
          <div className="p-8 text-center">
            <Building size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No external companies.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {externalCompanies.map(comp => {
              const compUsers = USERS.filter(u => u.companyId === comp.id);
              const sharedCors = myCors.filter(c =>
                (c.sharedWith || []).some(uid => compUsers.map(u => u.id).includes(uid))
              );
              return (
                <div key={comp.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building size={16} className="text-muted-foreground" />
                    <span className="font-bold">{comp.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Users: {compUsers.map(u => u.fullName).join(', ')}</p>
                  {sharedCors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No CORs shared with this company.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead><tr className="table-header">
                        <th className="text-left px-2 py-1.5">COR #</th>
                        <th className="text-left px-2 py-1.5">Name</th>
                        <th className="text-left px-2 py-1.5">Shared With</th>
                      </tr></thead>
                      <tbody>
                        {sharedCors.map(c => {
                          const sharedUserNames = (c.sharedWith || [])
                            .filter(uid => compUsers.map(u => u.id).includes(uid))
                            .map(uid => USERS.find(u => u.id === uid)?.fullName || 'Unknown');
                          return (
                            <tr key={c.id} className="border-b border-border">
                              <td className="px-2 py-1.5 font-mono text-muted-foreground">{c.corNumber}</td>
                              <td className="px-2 py-1.5">{c.corName}</td>
                              <td className="px-2 py-1.5">{sharedUserNames.join(', ')}</td>
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
      </div>
    </AppLayout>
  );
};

export default UsersPage;
