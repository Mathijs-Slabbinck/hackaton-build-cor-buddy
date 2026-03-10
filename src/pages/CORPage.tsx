import { useState, useMemo } from 'react';
import { FileText, Clock, CheckCircle, DollarSign, Search, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { StatusBadge, formatAUD, formatDate, PaidBar } from '@/components/SharedUI';
import { useCOR } from '@/contexts/CORContext';
import CORDrawer from '@/components/cor/CORDrawer';
import CORDetailPanel from '@/components/cor/CORDetailPanel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const CORPage = () => {
  const { cors, loading, deleteCOR } = useCOR();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return cors.filter(c => {
      const q = search.toLowerCase();
      if (q && !c.corName.toLowerCase().includes(q) && !c.clientName.toLowerCase().includes(q) && !c.location.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (typeFilter !== 'All' && c.productType !== typeFilter) return false;
      if (clientFilter !== 'All' && c.clientKind !== clientFilter) return false;
      return true;
    });
  }, [cors, search, statusFilter, typeFilter, clientFilter]);

  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const totalCors = cors.length;
  const ongoing = cors.filter(c => c.status === 'Ongoing').length;
  const paid = cors.filter(c => c.status === 'Paid').length;
  const totalValue = cors.reduce((s, c) => s + c.price + c.price * c.vat / 100, 0);

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

  return (
    <AppLayout>
      <PageHeader
        title="Change Order Requests"
        subtitle="Manage and track all backcharge records"
        action={
          <button onClick={() => setDrawerOpen(true)} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#007A74] transition-colors flex items-center gap-2">
            <Plus size={16} /> New COR
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total CORs" value={totalCors} icon={FileText} iconBg="#EAF5F5" iconColor="#009A93" />
        <SummaryCard label="Ongoing" value={ongoing} icon={Clock} iconBg="#fffded" iconColor="#856A00" valueColor="#856A00" />
        <SummaryCard label="Paid" value={paid} icon={CheckCircle} iconBg="#EAF5F5" iconColor="#009A93" valueColor="#009A93" />
        <SummaryCard label="Total Value (AUD)" value={formatAUD(totalValue)} icon={DollarSign} iconBg="#EEF9FD" iconColor="#44C8F5" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative min-w-[280px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search by name, client, location..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full border-[1.5px] border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} className={selectClasses}>
          <option>All</option><option>Paid</option><option>Ongoing</option><option>Cancelled</option>
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} className={selectClasses}>
          <option>All</option><option>Service</option><option>Product</option>
        </select>
        <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); setPage(0); }} className={selectClasses}>
          <option>All</option><option>Company</option><option>Private</option>
        </select>
      </div>

      {/* Table */}
      <div className="card-cor overflow-hidden">
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText size={48} className="text-border mb-3" />
            <p className="text-muted-foreground mb-4">No CORs found</p>
            <button onClick={() => setDrawerOpen(true)} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#007A74] transition-colors flex items-center gap-2">
              <Plus size={16} /> New COR
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-4 py-3">COR #</th>
                    <th className="text-left px-4 py-3">COR Name</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Location</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Total (AUD)</th>
                    <th className="text-left px-4 py-3">Paid %</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => setDetailId(c.id)}
                      className={`group cursor-pointer transition-colors duration-150 hover:bg-accent ${i % 2 === 1 ? 'bg-accent/40' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{c.corNumber}</td>
                      <td className="px-4 py-3 font-medium">{c.corName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.clientName}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${c.clientKind === 'Company' ? 'bg-accent text-primary' : 'bg-blue-light text-blue'}`}>
                            {c.clientKind}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{c.productType}</td>
                      <td className="px-4 py-3 max-w-[160px] truncate">{c.location}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.corDate)}</td>
                      <td className="px-4 py-3 font-medium">{formatAUD(c.price + c.price * c.vat / 100)}</td>
                      <td className="px-4 py-3 w-24"><PaidBar pct={c.paidPercentage} /></td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); setDetailId(c.id); }} className="p-1.5 rounded-md hover:bg-border transition-colors"><Pencil size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); setDeleteId(c.id); }} className="p-1.5 rounded-md hover:bg-red-100 text-destructive transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} results
              </span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:border-primary transition-colors bg-card">Prev</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:border-primary transition-colors bg-card">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && <CORDrawer onClose={() => setDrawerOpen(false)} />}

      {/* Detail Panel */}
      {detailId && <CORDetailPanel corId={detailId} onClose={() => setDetailId(null)} onDelete={id => setDeleteId(id)} />}

      {/* Delete dialog */}
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
