import { useState, useMemo } from 'react';
import { FileText, Clock, CheckCircle, DollarSign, Search, Pencil, Trash2, Plus, Loader2, Paperclip, Image as ImageIcon, Wrench, Package as PackageIcon, Download } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { StatusBadge, formatEUR, formatDate, PaidBar } from '@/components/SharedUI';
import { useCOR } from '@/contexts/CORContext';
import { useAuth, getCompanyName, USERS } from '@/contexts/AuthContext';
import CORDrawer from '@/components/cor/CORDrawer';
import CORDetailPanel from '@/components/cor/CORDetailPanel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { exportBulkJSON, exportBulkPDF } from '@/lib/corExport';

const PIE_COLORS = { Paid: '#009A93', Ongoing: '#FFED00', Cancelled: '#EC008C' };

const CORPage = () => {
  const { cors, loading, deleteCOR } = useCOR();
  const { session } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailReadOnly, setDetailReadOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [page, setPage] = useState(0);
  

  // Own company CORs
  const companyCors = useMemo(() =>
    cors.filter(c => c.companyId === session?.companyId),
    [cors, session]
  );

  const filtered = useMemo(() => {
    return companyCors.filter(c => {
      const q = search.toLowerCase();
      if (q && !c.corName.toLowerCase().includes(q) && !c.clientName.toLowerCase().includes(q) && !c.location.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (typeFilter !== 'All' && c.productType !== typeFilter) return false;
      if (clientFilter !== 'All' && c.clientKind !== clientFilter) return false;
      return true;
    });
  }, [activeCors, search, statusFilter, typeFilter, clientFilter]);

  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const totalCors = companyCors.length;
  const ongoing = companyCors.filter(c => c.status === 'Ongoing').length;
  const paid = companyCors.filter(c => c.status === 'Paid').length;
  const cancelled = companyCors.filter(c => c.status === 'Cancelled').length;
  const totalValue = companyCors.reduce((s, c) => s + c.price + c.price * c.vat / 100, 0);

  const pieData = [
    { name: 'Paid', value: paid },
    { name: 'Ongoing', value: ongoing },
    { name: 'Cancelled', value: cancelled },
  ].filter(d => d.value > 0);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={40} /></div></AppLayout>;

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteCOR(deleteId);
      setDeleteId(null);
      if (detailId === deleteId) setDetailId(null);
      toast.success('COR deleted');
    }
  };

  const selectClasses = "border-[1.5px] border-border rounded-lg px-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20";

  const openDetail = (id: string, readOnly: boolean) => {
    setDetailId(id);
    setDetailReadOnly(readOnly);
  };

  const handleExportJSON = () => {
    if (!session) return;
    const toastId = toast.loading('Preparing export...');
    try {
      const count = exportBulkJSON(filtered, session);
      toast.dismiss(toastId);
      toast.success(`Exported ${count} record(s) as JSON ✓`);
    } catch { toast.dismiss(toastId); toast.error('Export failed. Please try again.'); }
  };

  const handleExportPDF = () => {
    if (!session) return;
    const toastId = toast.loading('Preparing export...');
    try {
      const count = exportBulkPDF(filtered, session);
      toast.dismiss(toastId);
      toast.success(`Exported ${count} record(s) as PDF ✓`);
    } catch { toast.dismiss(toastId); toast.error('Export failed. Please try again.'); }
  };

  const exportButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={filtered.length === 0}
          className="font-semibold rounded-lg px-4 py-2.5 text-sm border-[1.5px] border-border hover:border-primary transition-colors bg-card flex items-center gap-2 disabled:opacity-40"
        >
          <Download size={16} /> Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
          <FileText size={14} /> Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON} className="gap-2">
          <span className="text-xs font-mono">{'{ }'}</span> Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Change Order Requests"
        subtitle="Manage and track all backcharge records"
        action={
          <div className="flex items-center gap-2">
            {exportButton}
            {activeTab === 'my' && (
              <button onClick={() => setDrawerOpen(true)} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#007A74] transition-colors flex items-center gap-2">
                <Plus size={16} /> New COR
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-6">
        <button onClick={() => { setActiveTab('my'); setPage(0); }}
          className={`px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'my' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          My CORs
        </button>
        <button onClick={() => { setActiveTab('assigned'); setPage(0); }}
          className={`px-4 pb-3 text-sm font-medium border-b-2 transition-colors relative ${activeTab === 'assigned' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Assigned to Me
          {assignedCors.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#EC008C' }}>
              {assignedCors.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'my' && (
        <>
          {/* Row 1: Stats (60%) + Pie Chart (40%) */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="col-span-3 grid grid-cols-2 gap-4">
              <SummaryCard label="Total CORs" value={totalCors} icon={FileText} iconBg="#EAF5F5" iconColor="#009A93" />
              <SummaryCard label="Ongoing" value={ongoing} icon={Clock} iconBg="#fffded" iconColor="#856A00" valueColor="#856A00" />
              <SummaryCard label="Paid" value={paid} icon={CheckCircle} iconBg="#EAF5F5" iconColor="#009A93" valueColor="#009A93" />
              <SummaryCard label="Total Value (EUR)" value={formatEUR(totalValue)} icon={DollarSign} iconBg="#EEF9FD" iconColor="#44C8F5" />
            </div>
            <div className="col-span-2 card-cor p-5 flex flex-col">
              <h3 className="font-bold text-base mb-2">Status Overview</h3>
              {pieData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 flex-1 flex items-center justify-center">No records yet</p>
              ) : (
                <div className="flex-1 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map(entry => <Cell key={entry.name} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS]} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-around mt-2">
                    {[
                      { label: 'Paid', count: paid, color: '#009A93' },
                      { label: 'Ongoing', count: ongoing, color: '#856A00' },
                      { label: 'Cancelled', count: cancelled, color: '#EC008C' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-0.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: PIE_COLORS[s.label as keyof typeof PIE_COLORS] }} />
                          <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">{s.label}</span>
                        </div>
                        <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

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
            <option>All</option><option>Paid</option><option>Ongoing</option><option>Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Type</span>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} className={selectClasses}>
            <option>All</option><option>Service</option><option>Product</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Client</span>
          <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setPage(0); }} className={selectClasses}>
            <option>All</option><option>Company</option><option>Private</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card-cor overflow-hidden">
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            {activeTab === 'assigned' ? (
              <>
                <Share2 size={48} className="text-border mb-3" />
                <p className="text-muted-foreground">No CORs have been shared with you.</p>
              </>
            ) : (
              <>
                <FileText size={48} className="text-border mb-3" />
                <p className="text-muted-foreground mb-4">No CORs found</p>
                <button onClick={() => setDrawerOpen(true)} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#007A74] transition-colors flex items-center gap-2">
                  <Plus size={16} /> New COR
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    {activeTab === 'assigned' && <th className="text-left px-4 py-3">From</th>}
                    <th className="text-left px-4 py-3">COR #</th>
                    <th className="text-left px-4 py-3">COR Name</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Location</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Total (EUR)</th>
                    <th className="text-left px-4 py-3">Paid %</th>
                    <th className="text-left px-4 py-3"><span className="flex items-center gap-1"><Paperclip size={12} />Attach.</span></th>
                    {activeTab === 'my' && <th className="text-left px-4 py-3">Shared</th>}
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <TooltipProvider>
                    {paged.map((c, i) => {
                      const imgCount = c.pictureUrls.length;
                      const fileCount = c.fileUrls.length;
                      const isExternal = activeTab === 'assigned';
                      const sharedUsers = (c.sharedWith || []).map(uid => USERS.find(u => u.id === uid)).filter(Boolean);
                      return (
                        <tr key={c.id} onClick={() => openDetail(c.id, isExternal)}
                          className={`group cursor-pointer transition-colors duration-150 hover:bg-accent ${i % 2 === 1 ? 'bg-accent/40' : ''}`}>
                          {isExternal && (
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {getCompanyName(c.companyId)}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{c.corNumber}</td>
                          <td className="px-4 py-3 font-medium">{c.corName}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {c.clientName}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${c.clientKind === 'Company' ? 'bg-accent text-primary' : 'bg-blue-light text-blue'}`}>{c.clientKind}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5">
                              {c.productType === 'Service' ? <Wrench size={14} className="text-muted-foreground" /> : <PackageIcon size={14} className="text-muted-foreground" />}
                              {c.productType}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[160px] truncate">{c.location}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.corDate)}</td>
                          <td className="px-4 py-3 font-medium">{formatEUR(c.price + c.price * c.vat / 100)}</td>
                          <td className="px-4 py-3 w-24"><PaidBar pct={c.paidPercentage} /></td>
                          <td className="px-4 py-3">
                            {imgCount === 0 && fileCount === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {imgCount > 0 && <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#EEF9FD', color: '#44C8F5' }}><ImageIcon size={12} />{imgCount}</span>}
                                {fileCount > 0 && <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-primary"><FileText size={12} />{fileCount}</span>}
                              </div>
                            )}
                          </td>
                          {activeTab === 'my' && (
                            <td className="px-4 py-3">
                              {sharedUsers.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <div className="flex items-center">
                                  {sharedUsers.slice(0, 3).map((u, ai) => {
                                    const initials = (() => {
                                      const parts = u!.fullName.trim().split(/\s+/);
                                      return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : u!.fullName.slice(0, 2).toUpperCase();
                                    })();
                                    return (
                                      <Tooltip key={u!.id}>
                                        <TooltipTrigger asChild>
                                          <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-white"
                                            style={{ background: '#44C8F5', marginLeft: ai > 0 ? '-8px' : 0, zIndex: 10 - ai }}
                                          >
                                            {initials}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{u!.fullName} — {getCompanyName(u!.companyId)}</p></TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                  {sharedUsers.length > 3 && (
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-white bg-muted text-muted-foreground" style={{ marginLeft: '-8px', zIndex: 6 }}>
                                      +{sharedUsers.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3">
                            {isExternal ? (
                              <button onClick={e => { e.stopPropagation(); openDetail(c.id, true); }} className="p-1.5 rounded-md hover:bg-border transition-colors"><Eye size={14} /></button>
                            ) : (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={e => { e.stopPropagation(); openDetail(c.id, false); }} className="p-1.5 rounded-md hover:bg-border transition-colors"><Pencil size={14} /></button>
                                <button onClick={e => { e.stopPropagation(); setDeleteId(c.id); }} className="p-1.5 rounded-md hover:bg-red-100 text-destructive transition-colors"><Trash2 size={14} /></button>
                              </div>
                            )}
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

      {drawerOpen && <CORDrawer onClose={() => setDrawerOpen(false)} />}
      {detailId && <CORDetailPanel corId={detailId} onClose={() => { setDetailId(null); setDetailReadOnly(false); }} onDelete={id => setDeleteId(id)} readOnly={detailReadOnly} />}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete COR?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default CORPage;
