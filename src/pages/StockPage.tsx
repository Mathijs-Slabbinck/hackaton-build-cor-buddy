import { useState, useMemo } from 'react';
import { Package, AlertTriangle, DollarSign, Truck, Search, Pencil, Trash2, Plus, Loader2, X, Link2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { formatEUR, formatDate } from '@/components/SharedUI';
import { useStock, type StockItem } from '@/contexts/StockContext';
import { useCOR } from '@/contexts/CORContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const categories = ['Fasteners', 'Adhesives', 'Safety', 'Electrical', 'Plumbing', 'Timber', 'Concrete', 'Other'];
const units = ['each', 'box', 'roll', 'litre', 'kg', 'm²', 'bag', 'pallet'];

const StockPage = () => {
  const { items, loading, addItem, updateItem, deleteItem } = useStock();
  const { cors } = useCOR();
  const { projects } = useProjects();
  const { session } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [supFilter, setSupFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [linkModalId, setLinkModalId] = useState<string | null>(null);
  const [linkCorId, setLinkCorId] = useState('');
  const [linkDamageLog, setLinkDamageLog] = useState('');

  useBodyScrollLock(modalOpen || !!linkModalId);

  // Filter by company
  const companyItems = useMemo(() => items.filter(i => i.companyId === session?.companyId), [items, session]);
  const companyCors = useMemo(() => cors.filter(c => c.companyId === session?.companyId), [cors, session]);
  const companyProjects = useMemo(() => projects.filter(p => p.companyId === session?.companyId), [projects, session]);

  const emptyForm = { itemName: '', sku: '', category: 'Fasteners', unit: 'each', quantityOnHand: '', reorderLevel: '', unitCost: '', supplier: '', lastRestocked: new Date().toISOString().split('T')[0], assignedProject: '', damageLog: '', linkedCorId: '' };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const suppliers = useMemo(() => [...new Set(companyItems.map(i => i.supplier))], [companyItems]);

  const filtered = useMemo(() => {
    return companyItems.filter(i => {
      const q = search.toLowerCase();
      if (q && !i.itemName.toLowerCase().includes(q) && !i.sku.toLowerCase().includes(q)) return false;
      if (catFilter !== 'All' && i.category !== catFilter) return false;
      if (supFilter !== 'All' && i.supplier !== supFilter) return false;
      return true;
    });
  }, [companyItems, search, catFilter, supFilter]);

  const pageSize = 10;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const lowStockCount = companyItems.filter(i => i.quantityOnHand < i.reorderLevel).length;
  const totalValue = companyItems.reduce((s, i) => s + i.quantityOnHand * i.unitCost, 0);
  const uniqueSuppliers = suppliers.length;

  const openAdd = () => { setForm(emptyForm); setEditId(null); setErrors({}); setModalOpen(true); };
  const openEdit = (item: StockItem) => {
    setForm({ ...item, quantityOnHand: String(item.quantityOnHand), reorderLevel: String(item.reorderLevel), unitCost: String(item.unitCost), linkedCorId: item.linkedCorId || '', damageLog: item.damageLog || '' } as any);
    setEditId(item.id); setErrors({}); setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    ['itemName', 'sku', 'category', 'unit', 'quantityOnHand', 'reorderLevel', 'unitCost', 'supplier', 'lastRestocked', 'assignedProject'].forEach(k => {
      if (!(form as any)[k] && (form as any)[k] !== 0) errs[k] = 'Required';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const data: StockItem = {
      id: editId || crypto.randomUUID(),
      itemName: form.itemName.trim(), sku: form.sku.trim(),
      category: form.category, unit: form.unit,
      quantityOnHand: Number(form.quantityOnHand), reorderLevel: Number(form.reorderLevel),
      unitCost: Number(form.unitCost), supplier: form.supplier.trim(),
      lastRestocked: form.lastRestocked, assignedProject: form.assignedProject.trim(),
      linkedCorId: form.linkedCorId || null,
      damageLog: form.damageLog || '',
      companyId: session?.companyId || 'c1',
    };
    if (editId) updateItem(editId, data);
    else addItem(data);
    toast.success(editId ? 'Item updated ✓' : 'Item added ✓');
    setModalOpen(false);
  };

  const handleDelete = () => { if (deleteId) { deleteItem(deleteId); setDeleteId(null); toast.success('Item deleted'); } };

  const handleRestock = (id: string) => {
    const item = companyItems.find(i => i.id === id);
    if (!item) return;
    updateItem(id, { quantityOnHand: item.quantityOnHand + restockQty, lastRestocked: new Date().toISOString().split('T')[0] });
    toast.success('Stock updated ✓');
    setRestockId(null); setRestockQty(1);
  };

  const handleLinkCor = () => {
    if (!linkModalId || !linkCorId) return;
    updateItem(linkModalId, { linkedCorId: linkCorId, damageLog: linkDamageLog });
    toast.success('Stock item linked to COR ✓');
    setLinkModalId(null); setLinkCorId(''); setLinkDamageLog('');
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = (field: string) => `w-full border-[1.5px] rounded-lg px-3 py-2.5 text-sm transition ${errors[field] ? 'border-destructive' : 'border-border'} focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20`;
  const selectClasses = "border-[1.5px] border-border rounded-lg px-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20";

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={40} /></div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader title="Stock Manager" subtitle="Track consumables and materials across projects"
        action={<button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm hover:bg-[#007A74] transition-colors flex items-center gap-2"><Plus size={16} /> Add Item</button>} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Items" value={companyItems.length} icon={Package} iconBg="#EAF5F5" iconColor="#009A93" />
        <SummaryCard label="Not Enough Stock" value={lowStockCount} icon={AlertTriangle} iconBg="#FEE2E2" iconColor="#EC008C" valueColor="#EC008C" />
        <SummaryCard label="Total Stock Value" value={formatEUR(totalValue)} icon={DollarSign} iconBg="#EEF9FD" iconColor="#44C8F5" />
        <SummaryCard label="Suppliers" value={uniqueSuppliers} icon={Truck} iconBg="#fffded" iconColor="#856A00" />
      </div>

      {lowStockCount > 0 && (
        <div className="border-l-4 border-destructive bg-red-100 rounded-xl px-5 py-3.5 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-destructive shrink-0" />
          <span className="text-sm">⚠ {lowStockCount} item(s) do not have enough stock. Review urgently.</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Search</span>
          <div className="relative min-w-[280px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search by name, SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full border-[1.5px] border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Category</span>
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(0); }} className={selectClasses}>
            <option>All</option>{categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Supplier</span>
          <select value={supFilter} onChange={e => { setSupFilter(e.target.value); setPage(0); }} className={selectClasses}>
            <option>All</option>{suppliers.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card-cor overflow-hidden">
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="text-border mb-3" />
            <p className="text-muted-foreground mb-4">No items found</p>
            <button onClick={openAdd} className="bg-primary text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm">+ Add Item</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="text-left px-4 py-3">Item Name</th><th className="text-left px-4 py-3">SKU</th>
                  <th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Qty</th>
                  <th className="text-left px-4 py-3">Reorder</th><th className="text-left px-4 py-3">Unit</th>
                  <th className="text-left px-4 py-3">Unit Cost</th><th className="text-left px-4 py-3">Total Value</th>
                  <th className="text-left px-4 py-3">Supplier</th><th className="text-left px-4 py-3">Last Restocked</th>
                  <th className="text-left px-4 py-3">Project</th><th className="text-left px-4 py-3">Linked COR</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr></thead>
                <tbody>
                  {paged.map((item, i) => {
                    const isLow = item.quantityOnHand < item.reorderLevel;
                    const linkedCor = item.linkedCorId ? companyCors.find(c => c.id === item.linkedCorId) : null;
                    return (
                      <tr key={item.id} className={`group transition-colors duration-150 hover:bg-accent ${i % 2 === 1 ? 'bg-accent/40' : ''}`}>
                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                          <span className="block text-[11px] text-muted-foreground">SKU</span>
                        </td>
                        <td className="px-4 py-3">
                          {item.category}
                          <span className="block text-[11px] text-muted-foreground">category</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={isLow ? 'text-destructive font-bold' : ''}>{item.quantityOnHand}</span>
                          {isLow && <span className="status-lowstock ml-2">Not enough</span>}
                        </td>
                        <td className="px-4 py-3">{item.reorderLevel}</td>
                        <td className="px-4 py-3">
                          {item.unit}
                          <span className="block text-[11px] text-muted-foreground">unit</span>
                        </td>
                        <td className="px-4 py-3">{formatEUR(item.unitCost)}</td>
                        <td className="px-4 py-3 font-medium">{formatEUR(item.quantityOnHand * item.unitCost)}</td>
                        <td className="px-4 py-3 max-w-[120px] truncate">
                          {item.supplier}
                          <span className="block text-[11px] text-muted-foreground">supplier</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.lastRestocked)}</td>
                        <td className="px-4 py-3 max-w-[120px] truncate">{item.assignedProject}</td>
                        <td className="px-4 py-3">
                          {linkedCor ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary cursor-pointer" title={linkedCor.corName}>
                              {linkedCor.corNumber}
                            </span>
                          ) : (
                            <button onClick={() => { setLinkModalId(item.id); setLinkCorId(''); setLinkDamageLog(''); }}
                              className="text-[10px] px-2 py-0.5 rounded-full border border-muted-foreground text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                              Link COR
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-border transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-md hover:bg-red-100 text-destructive transition-colors"><Trash2 size={14} /></button>
                            <Popover open={restockId === item.id} onOpenChange={open => { if (open) { setRestockId(item.id); setRestockQty(1); } else setRestockId(null); }}>
                              <PopoverTrigger asChild>
                                <button className="p-1.5 rounded-md hover:bg-accent transition-colors text-primary"><Plus size={14} /></button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-3" side="left">
                                <p className="text-xs font-semibold mb-2">Restock quantity</p>
                                <input type="number" min={1} value={restockQty} onChange={e => setRestockQty(Math.max(1, Number(e.target.value)))}
                                  className="w-full border-[1.5px] border-border rounded-lg px-3 py-2 text-sm mb-2 focus:border-blue" />
                                <button onClick={() => handleRestock(item.id)} className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-2 text-sm hover:bg-[#007A74] transition-colors">Add Stock</button>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[580px] bg-card rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">{editId ? 'Edit Stock Item' : 'Add Stock Item'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-accent rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div><label className="label-uppercase block mb-1.5">Item Name *</label><input className={inputCls('itemName')} value={form.itemName} onChange={e => set('itemName', e.target.value)} />{errors.itemName && <p className="text-destructive text-xs mt-1">{errors.itemName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">SKU *</label><input className={inputCls('sku')} value={form.sku} onChange={e => set('sku', e.target.value)} />{errors.sku && <p className="text-destructive text-xs mt-1">{errors.sku}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Category *</label><select className={inputCls('category')} value={form.category} onChange={e => set('category', e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="label-uppercase block mb-1.5">Unit *</label><select className={inputCls('unit')} value={form.unit} onChange={e => set('unit', e.target.value)}>{units.map(u => <option key={u}>{u}</option>)}</select></div>
              <div><label className="label-uppercase block mb-1.5">Qty on Hand *</label><input type="number" min={0} className={inputCls('quantityOnHand')} value={form.quantityOnHand} onChange={e => set('quantityOnHand', e.target.value)} />{errors.quantityOnHand && <p className="text-destructive text-xs mt-1">{errors.quantityOnHand}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Reorder Level *</label><input type="number" min={0} className={inputCls('reorderLevel')} value={form.reorderLevel} onChange={e => set('reorderLevel', e.target.value)} />{errors.reorderLevel && <p className="text-destructive text-xs mt-1">{errors.reorderLevel}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Unit Cost EUR *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span><input type="number" min={0} step={0.01} className={`${inputCls('unitCost')} pl-7`} value={form.unitCost} onChange={e => set('unitCost', e.target.value)} /></div>{errors.unitCost && <p className="text-destructive text-xs mt-1">{errors.unitCost}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Supplier *</label><input className={inputCls('supplier')} value={form.supplier} onChange={e => set('supplier', e.target.value)} />{errors.supplier && <p className="text-destructive text-xs mt-1">{errors.supplier}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Last Restocked *</label><input type="date" className={inputCls('lastRestocked')} value={form.lastRestocked} onChange={e => set('lastRestocked', e.target.value)} />{errors.lastRestocked && <p className="text-destructive text-xs mt-1">{errors.lastRestocked}</p>}</div>
              <div>
                <label className="label-uppercase block mb-1.5">Project *</label>
                <select className={inputCls('assignedProject')} value={form.assignedProject} onChange={e => set('assignedProject', e.target.value)}>
                  <option value="">Select project...</option>
                  {companyProjects.map(p => <option key={p.id} value={p.projectName}>{p.projectName}</option>)}
                </select>
                {errors.assignedProject && <p className="text-destructive text-xs mt-1">{errors.assignedProject}</p>}
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-between">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
              <button onClick={save} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors">Save</button>
            </div>
          </div>
        </>
      )}

      {/* Link COR Modal */}
      {linkModalId && (
        <>
          <div className="fixed inset-0 bg-foreground/30 z-50" onClick={() => setLinkModalId(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-card rounded-2xl shadow-2xl z-50">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Link to COR</h2>
              <button onClick={() => setLinkModalId(null)} className="p-1 hover:bg-accent rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label-uppercase block mb-1.5">Select COR</label>
                <select className="w-full border-[1.5px] border-border rounded-lg px-3 py-2.5 text-sm" value={linkCorId} onChange={e => setLinkCorId(e.target.value)}>
                  <option value="">Choose a COR...</option>
                  {companyCors.map(c => <option key={c.id} value={c.id}>{c.corNumber} — {c.corName}</option>)}
                </select>
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Damage / Usage Note</label>
                <textarea className="w-full border-[1.5px] border-border rounded-lg px-3 py-2.5 text-sm" rows={3} value={linkDamageLog} onChange={e => setLinkDamageLog(e.target.value)} placeholder="Optional: describe damage or usage..." />
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-between">
              <button onClick={() => setLinkModalId(null)} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
              <button onClick={handleLinkCor} disabled={!linkCorId} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors disabled:opacity-50">Link</button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete item?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default StockPage;
