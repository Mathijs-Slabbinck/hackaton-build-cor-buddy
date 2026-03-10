import { useMemo } from 'react';
import { FileText, Briefcase, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { StatusBadge, formatEUR, formatDate } from '@/components/SharedUI';
import { useCOR } from '@/contexts/CORContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useEmployees } from '@/contexts/EmployeeContext';
import { useStock } from '@/contexts/StockContext';
import { useAuth } from '@/contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const PIE_COLORS = { Paid: '#009A93', Ongoing: '#FFED00', Cancelled: '#EC008C' };

const DashboardPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { cors } = useCOR();
  const { projects } = useProjects();
  const { employees } = useEmployees();
  const { items: stockItems } = useStock();

  // Filter by company
  const companyCors = useMemo(() => cors.filter(c => c.companyId === session?.companyId), [cors, session]);
  const companyProjects = useMemo(() => projects.filter(p => p.companyId === session?.companyId), [projects, session]);
  const companyEmployees = useMemo(() => employees.filter(e => e.companyId === session?.companyId), [employees, session]);
  const companyStock = useMemo(() => stockItems.filter(i => i.companyId === session?.companyId), [stockItems, session]);

  const openCors = companyCors.filter(c => c.status === 'Ongoing').length;
  const activeProjects = companyProjects.filter(p => p.status === 'Active').length;
  const activeEmployees = companyEmployees.filter(e => e.status === 'Active').length;
  const lowStock = companyStock.filter(i => i.quantityOnHand < i.reorderLevel);

  const recentCors = useMemo(() =>
    [...companyCors].sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()).slice(0, 5),
    [companyCors]
  );

  const paidCount = companyCors.filter(c => c.status === 'Paid').length;
  const ongoingCount = companyCors.filter(c => c.status === 'Ongoing').length;
  const cancelledCount = companyCors.filter(c => c.status === 'Cancelled').length;

  const pieData = useMemo(() => {
    return [
      { name: 'Paid', value: paidCount },
      { name: 'Ongoing', value: ongoingCount },
      { name: 'Cancelled', value: cancelledCount },
    ].filter(d => d.value > 0);
  }, [paidCount, ongoingCount, cancelledCount]);

  const barData = useMemo(() =>
    companyProjects.map(p => ({
      name: p.projectName.length > 20 ? p.projectName.slice(0, 20) + '…' : p.projectName,
      fullName: p.projectName,
      budget: p.budget,
    })),
    [companyProjects]
  );

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold">{d.fullName}</p>
        <p className="text-muted-foreground">Budget: {formatEUR(d.budget)}</p>
      </div>
    );
  };

  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle="Live overview across all operations" />

      {/* Row 1: Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Open CORs" value={openCors} icon={FileText} iconBg="#EAF5F5" iconColor="#009A93" />
        <SummaryCard label="Active Projects" value={activeProjects} icon={Briefcase} iconBg="#EEF9FD" iconColor="#44C8F5" />
        <SummaryCard label="Active Employees" value={activeEmployees} icon={Users} iconBg="#EAF5F5" iconColor="#009A93" />
        <SummaryCard label="Low Stock Items" value={lowStock.length} icon={AlertTriangle} iconBg="#FEE2E2" iconColor="#EC008C" valueColor="#EC008C" />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="col-span-3 card-cor p-5">
          <h3 className="font-bold text-base mb-3">Recent CORs</h3>
          {recentCors.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No COR records yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="table-header"><th className="text-left px-3 py-2">COR #</th><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Total</th><th className="text-left px-3 py-2">Status</th></tr></thead>
              <tbody>
                {recentCors.map(c => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.corNumber}</td>
                    <td className="px-3 py-2">{c.corName}</td>
                    <td className="px-3 py-2">{c.clientName}</td>
                    <td className="px-3 py-2">{formatEUR(c.price + c.price * c.vat / 100)}</td>
                    <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="text-right mt-2">
            <button onClick={() => navigate('/cor')} className="text-sm text-primary font-semibold hover:underline">View all →</button>
          </div>
        </div>

        <div className="col-span-2 card-cor p-5">
          <h3 className="font-bold text-base mb-3">COR Status Breakdown</h3>
          {pieData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No COR data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                    {pieData.map(entry => <Cell key={entry.name} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-around mt-3">
                {[
                  { label: 'Paid', count: paidCount, color: '#009A93' },
                  { label: 'Ongoing', count: ongoingCount, color: '#856A00' },
                  { label: 'Cancelled', count: cancelledCount, color: '#EC008C' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PIE_COLORS[s.label as keyof typeof PIE_COLORS] }} />
                      <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">{s.label}</span>
                    </div>
                    <p className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-[11px] text-muted-foreground">records</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-cor p-5">
          <h3 className="font-bold text-base mb-3">Project Budget Overview</h3>
          {barData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No projects yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="budget" fill="#44C8F5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-cor p-5">
          <h3 className="font-bold text-base mb-3">Low Stock Alerts</h3>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle size={32} className="text-primary mb-2" />
              <p className="text-muted-foreground text-sm">All stock levels are healthy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.itemName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{item.quantityOnHand} in stock (min {item.reorderLevel})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
