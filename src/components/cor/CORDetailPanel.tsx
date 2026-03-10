import { useState, useRef, useEffect } from 'react';
import { X, Clock, ImagePlus, Upload, FileText, Trash2, Download, Loader2, Pencil, Lock, PlusCircle, Edit, RefreshCw, Scan, CheckCircle, Link, MessageSquare, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportSingleJSON, exportSinglePDF } from '@/lib/corExport';
import { useCOR, type COR, type FieldDiff, makeEntry } from '@/contexts/CORContext';
import { useStock } from '@/contexts/StockContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth, USERS, COMPANIES, getCompanyName, getUserInitials } from '@/contexts/AuthContext';
import { StatusBadge, formatEUR, formatDate, PaidBar, relativeTime } from '@/components/SharedUI';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface Props { corId: string; onClose: () => void; onDelete: (id: string) => void; readOnly?: boolean; }

const segments = (options: string[], value: string, onChange: (v: string) => void) => (
  <div className="flex border border-border rounded-lg overflow-hidden">
    {options.map(o => (
      <button key={o} type="button" onClick={() => onChange(o)}
        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${value === o ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent'}`}>
        {o}
      </button>
    ))}
  </div>
);

const ACTIVITY_ICONS: Record<string, { icon: any; color: string }> = {
  created: { icon: PlusCircle, color: '#009A93' },
  updated: { icon: Edit, color: '#44C8F5' },
  status_changed: { icon: RefreshCw, color: '#FFED00' },
  file_uploaded: { icon: Upload, color: '#44C8F5' },
  image_uploaded: { icon: Upload, color: '#44C8F5' },
  file_removed: { icon: Trash2, color: '#EC008C' },
  image_removed: { icon: Trash2, color: '#EC008C' },
  bill_extracted: { icon: Scan, color: '#44C8F5' },
  bill_applied: { icon: CheckCircle, color: '#009A93' },
  stock_linked: { icon: Link, color: '#856A00' },
  note_added: { icon: MessageSquare, color: '#6B7280' },
};

const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 mt-5 mb-3">
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap">{label}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const DIFF_FIELDS: [keyof COR, string][] = [
  ['corName', 'COR Name'], ['clientKind', 'Client Kind'], ['clientName', 'Client Name'],
  ['productName', 'Product Name'], ['productType', 'Product Type'], ['corDate', 'COR Date'],
  ['corNumber', 'COR Number'], ['vatNumber', 'VAT Number'], ['vat', 'VAT %'],
  ['price', 'Price'], ['paidPercentage', 'Paid %'], ['location', 'Location'],
  ['status', 'Status'], ['projectId', 'Project'],
];

const fieldToString = (key: keyof COR, value: any): string => {
  if (value == null || value === '') return '—';
  if (key === 'price') return formatEUR(Number(value));
  if (key === 'paidPercentage') return `${Number(value).toFixed(1)}%`;
  if (key === 'vat') return `${value}%`;
  if (key === 'corDate') return formatDate(String(value));
  return String(value);
};

const computeDiff = (oldCor: COR, newForm: Record<string, any>): FieldDiff[] => {
  const diffs: FieldDiff[] = [];
  for (const [key, label] of DIFF_FIELDS) {
    const oldVal = (oldCor as any)[key];
    const newVal = newForm[key];
    if (newVal !== undefined && String(oldVal ?? '') !== String(newVal ?? '')) {
      diffs.push({ field: label, from: fieldToString(key, oldVal), to: fieldToString(key, newVal) });
    }
  }
  return diffs;
};

const CORDetailPanel = ({ corId, onClose, onDelete, readOnly = false }: Props) => {
  const { getCORById, updateCOR, deleteCOR } = useCOR();
  const { items: stockItems } = useStock();
  const { projects } = useProjects();
  const { session } = useAuth();
  const [tab, setTab] = useState<'details' | 'files' | 'activity'>('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<COR> & { amountPaid?: number }>({});
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, string> | null>(null);
  const [extractEditable, setExtractEditable] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [autoStatusNote, setAutoStatusNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUserId, setShareUserId] = useState('');
  const imgRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  const cor = getCORById(corId);

  useEffect(() => {
    if (!editing || !cor) return;
    const p = Number(form.price ?? cor.price);
    const v = Number(form.vat ?? cor.vat);
    const t = p + p * v / 100;
    const a = Number(form.amountPaid ?? 0);
    if (t > 0 && a >= t) {
      setForm(f => ({ ...f, status: 'Paid' }));
      setAutoStatusNote(true);
    } else if (autoStatusNote) {
      setForm(f => ({ ...f, status: 'Ongoing' }));
      setAutoStatusNote(false);
    }
  }, [editing, form.price, form.vat, form.amountPaid]);

  if (!cor) return null;

  const total = cor.price + cor.price * cor.vat / 100;
  const activityLog = cor.activityLog || [];

  const startEdit = () => {
    if (readOnly) return;
    const amountPaid = cor.paidPercentage / 100 * total;
    setForm({ ...cor, amountPaid });
    setEditing(true);
    setAutoStatusNote(false);
  };
  const cancelEdit = () => { setEditing(false); setForm({}); };

  const editTotal = () => {
    const p = Number(form.price ?? cor.price);
    const v = Number(form.vat ?? cor.vat);
    return p + p * v / 100;
  };
  const editAmountPaid = Number(form.amountPaid ?? 0);
  const editPaidPct = editTotal() > 0 ? Math.min((editAmountPaid / editTotal()) * 100, 100) : 0;
  const editOverpaid = editAmountPaid > editTotal() && editTotal() > 0;

  const saveEdit = () => {
    if (editOverpaid) return;
    const updates: Partial<COR> = { ...form, paidPercentage: Math.round(editPaidPct * 10) / 10 };
    delete (updates as any).amountPaid;

    const diffs = computeDiff(cor, updates);
    if (diffs.length === 0) {
      setEditing(false);
      return;
    }

    const entries = [...activityLog];
    const statusChanged = form.status && form.status !== cor.status;
    
    const updateDiffs = statusChanged ? diffs.filter(d => d.field !== 'Status') : diffs;
    if (updateDiffs.length > 0) {
      entries.push({ ...makeEntry('updated', 'Record updated'), diff: updateDiffs });
    }
    
    if (statusChanged) {
      const statusDiff = diffs.filter(d => d.field === 'Status');
      entries.push({ ...makeEntry('status_changed', `Status changed to ${form.status}`), diff: statusDiff });
    }
    
    updates.activityLog = entries;
    updateCOR(corId, updates);
    setEditing(false);
    toast.success('Record updated ✓');
  };

  const inputCls = "w-full border-[1.5px] border-border rounded-lg px-3 py-2 text-sm focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20";

  // MERGED updateCOR calls for file/image operations
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const currentCor = getCORById(corId);
        if (!currentCor) return;
        const newUrls = [...currentCor.pictureUrls, reader.result as string];
        const newLog = [...(currentCor.activityLog || []), makeEntry('image_uploaded', 'Image attached')];
        updateCOR(corId, { pictureUrls: newUrls, activityLog: newLog });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const currentCor = getCORById(corId);
        if (!currentCor) return;
        const newUrls = [...currentCor.fileUrls, reader.result as string];
        const newLog = [...(currentCor.activityLog || []), makeEntry('file_uploaded', 'Document attached')];
        updateCOR(corId, { fileUrls: newUrls, activityLog: newLog });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    const currentCor = getCORById(corId);
    if (!currentCor) return;
    const newUrls = currentCor.pictureUrls.filter((_, i) => i !== idx);
    const newLog = [...(currentCor.activityLog || []), makeEntry('image_removed', 'Image removed')];
    updateCOR(corId, { pictureUrls: newUrls, activityLog: newLog });
  };

  const removeFile = (idx: number) => {
    const currentCor = getCORById(corId);
    if (!currentCor) return;
    const newUrls = currentCor.fileUrls.filter((_, i) => i !== idx);
    const newLog = [...(currentCor.activityLog || []), makeEntry('file_removed', 'Document removed')];
    updateCOR(corId, { fileUrls: newUrls, activityLog: newLog });
  };

  const handleExtract = async () => {
    if (cor.fileUrls.length === 0) {
      toast.error('Please upload a PDF bill first.');
      return;
    }
    setExtracting(true);
    setExtractedData(null);

    const lastFile = cor.fileUrls[cor.fileUrls.length - 1];
    const base64Data = lastFile.includes(',') ? lastFile.split(',')[1] : lastFile;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
              { type: 'text', text: 'Extract the following fields from this construction invoice and return ONLY a valid JSON object with no markdown, no explanation, no backticks. Fields: supplier (string), invoiceNumber (string), date (ISO date string YYYY-MM-DD), amount (number, excl GST/VAT if shown separately), lineItem (string, first or main line item description). If a field cannot be found, use null.' }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.find((b: any) => b.type === 'text')?.text;
      const parsed = JSON.parse(text);
      setExtractedData({
        supplier: parsed.supplier || '',
        invoiceNumber: parsed.invoiceNumber || '',
        date: parsed.date || '',
        amount: parsed.amount != null ? String(parsed.amount) : '',
        lineItem: parsed.lineItem || '',
      });
      setExtractEditable(false);
      const currentCor = getCORById(corId);
      if (currentCor) {
        const newLog = [...(currentCor.activityLog || []), makeEntry('bill_extracted', 'Bill data extracted from PDF')];
        updateCOR(corId, { activityLog: newLog });
      }
    } catch {
      toast.error('Extraction failed. You can enter details manually.');
      setExtractedData({ supplier: '', invoiceNumber: '', date: '', amount: '', lineItem: '' });
      setExtractEditable(true);
    }
    setExtracting(false);
  };

  const applyExtracted = () => {
    if (!extractedData) return;
    const currentCor = getCORById(corId);
    if (!currentCor) return;
    
    const updates: Partial<COR> = {};
    const diffs: FieldDiff[] = [];
    
    if (extractedData.supplier) {
      if (currentCor.clientName !== extractedData.supplier) {
        diffs.push({ field: 'Client Name', from: currentCor.clientName || '—', to: extractedData.supplier });
      }
      updates.clientName = extractedData.supplier;
    }
    if (extractedData.invoiceNumber && !currentCor.corNumber) {
      diffs.push({ field: 'COR Number', from: currentCor.corNumber || '—', to: extractedData.invoiceNumber });
      updates.corNumber = extractedData.invoiceNumber;
    }
    if (extractedData.date) {
      if (currentCor.corDate !== extractedData.date) {
        diffs.push({ field: 'COR Date', from: formatDate(currentCor.corDate), to: formatDate(extractedData.date) });
      }
      updates.corDate = extractedData.date;
    }
    if (extractedData.amount) {
      const newPrice = parseFloat(extractedData.amount);
      if (currentCor.price !== newPrice) {
        diffs.push({ field: 'Price', from: formatEUR(currentCor.price), to: formatEUR(newPrice) });
      }
      updates.price = newPrice;
    }
    if (extractedData.lineItem) {
      if (currentCor.productName !== extractedData.lineItem) {
        diffs.push({ field: 'Product Name', from: currentCor.productName || '—', to: extractedData.lineItem });
      }
      updates.productName = extractedData.lineItem;
    }
    
    const newLog = [...(currentCor.activityLog || []), { ...makeEntry('bill_applied', 'Extracted bill data applied to record'), diff: diffs.length > 0 ? diffs : undefined }];
    updates.activityLog = newLog;
    updateCOR(corId, updates);
    setExtractedData(null);
    toast.success('Bill data applied to record ✓');
  };

  const handleDelete = () => { deleteCOR(corId); toast.success('COR deleted'); onClose(); };

  const linkedStock = stockItems.filter(s => s.linkedCorId === corId);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    const currentCor = getCORById(corId);
    if (!currentCor) return;
    const entry = makeEntry('note_added', noteText.trim());
    if (readOnly && session) {
      entry.actor = `${session.fullName} (external — ${session.companyName})`;
    }
    const newLog = [...(currentCor.activityLog || []), entry];
    updateCOR(corId, { activityLog: newLog });
    setNoteText('');
  };

  const toggleDiff = (id: string) => {
    setExpandedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Sharing logic
  const sharedWith = cor.sharedWith || [];
  const externalUsers = USERS.filter(u => u.id !== session?.userId && u.companyId !== session?.companyId);
  const shareableUsers = externalUsers.filter(u => !sharedWith.includes(u.id));

  const handleShare = () => {
    if (!shareUserId) return;
    const currentCor = getCORById(corId);
    if (!currentCor) return;
    const user = USERS.find(u => u.id === shareUserId);
    const newShared = [...(currentCor.sharedWith || []), shareUserId];
    const newLog = [...(currentCor.activityLog || []), makeEntry('updated', `Shared with ${user?.fullName || 'user'} (${getCompanyName(user?.companyId || '')})`)];
    updateCOR(corId, { sharedWith: newShared, activityLog: newLog });
    toast.success(`${user?.fullName} can now view this record ✓`);
    setShareModalOpen(false);
    setShareUserId('');
  };

  const handleRemoveShare = (userId: string) => {
    const currentCor = getCORById(corId);
    if (!currentCor) return;
    const user = USERS.find(u => u.id === userId);
    const newShared = (currentCor.sharedWith || []).filter(id => id !== userId);
    const newLog = [...(currentCor.activityLog || []), makeEntry('updated', `Removed access for ${user?.fullName || 'user'}`)];
    updateCOR(corId, { sharedWith: newShared, activityLog: newLog });
    toast.success('Access removed');
  };

  const tabs = readOnly
    ? [
        { key: 'details', label: 'Details' },
        { key: 'files', label: 'Files & Images' },
        { key: 'activity', label: 'Activity' },
      ] as const
    : [
        { key: 'details', label: 'Details' },
        { key: 'files', label: 'Files & Images' },
        { key: 'activity', label: 'Activity' },
      ] as const;

  const sortedLog = [...(cor.activityLog || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <>
      <div className="fixed inset-0 bg-foreground/30 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-card z-50 animate-slide-in-right flex flex-col shadow-2xl">
        <div className="p-6 pb-0 border-b border-border">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{cor.corName}</h2>
              <StatusBadge status={cor.status} />
            </div>
            <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg transition-colors"><X size={20} /></button>
          </div>
          <p className="text-[13px] text-muted-foreground mb-4">{cor.corNumber} · Created {formatDate(cor.creationDate)}</p>
          {readOnly && (
            <div className="rounded-lg px-3 py-2 mb-3 text-[12px] flex items-center gap-2" style={{ background: 'hsl(56 100% 97%)', border: '1px solid #FFED00' }}>
              <Lock size={12} className="text-muted-foreground" />
              Read-only — shared by {getCompanyName(cor.companyId)}
            </div>
          )}
          <div className="flex gap-0">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key as any); setEditing(false); }}
                className={`px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && !editing && (
            <div className="space-y-1">
              <SectionDivider label="Client Information" />
              <div className="grid grid-cols-2 gap-4">
                <div><p className="label-uppercase text-[11px] mb-1">Client Kind</p><p className="text-sm">{cor.clientKind}</p></div>
                <div><p className="label-uppercase text-[11px] mb-1">Client Name</p><p className="text-sm">{cor.clientName}</p></div>
                <div className="col-span-2"><p className="label-uppercase text-[11px] mb-1">VAT / ABN</p><p className="text-sm">{cor.vatNumber || '—'}</p></div>
              </div>

              <SectionDivider label="Product / Service" />
              <div className="grid grid-cols-2 gap-4">
                <div><p className="label-uppercase text-[11px] mb-1">Product Name</p><p className="text-sm">{cor.productName}</p></div>
                <div><p className="label-uppercase text-[11px] mb-1">Product Type</p><p className="text-sm">{cor.productType}</p></div>
                <div className="col-span-2"><p className="label-uppercase text-[11px] mb-1">Location</p><p className="text-sm">{cor.location}</p></div>
              </div>

              <SectionDivider label="Financials" />
              <div className="grid grid-cols-2 gap-4">
                <div><p className="label-uppercase text-[11px] mb-1">Price (excl VAT)</p><p className="text-sm">{formatEUR(cor.price)}</p></div>
                <div><p className="label-uppercase text-[11px] mb-1">VAT %</p><p className="text-sm">{cor.vat}%</p></div>
                <div><p className="label-uppercase text-[11px] mb-1">Total incl. VAT</p><p className="text-sm">{formatEUR(total)}</p></div>
                <div><p className="label-uppercase text-[11px] mb-1">Paid Percentage</p><div className="w-32"><PaidBar pct={cor.paidPercentage} /></div></div>
              </div>

              <SectionDivider label="Record Info" />
              <div className="grid grid-cols-2 gap-4">
                <div><p className="label-uppercase text-[11px] mb-1">COR Date</p><p className="text-sm">{formatDate(cor.corDate)}</p></div>
                <div><p className="label-uppercase text-[11px] mb-1">Created Date</p><p className="text-sm">{formatDate(cor.creationDate)}</p></div>
              </div>
              <div className="text-center pt-2"><StatusBadge status={cor.status} /></div>

              {/* Linked Stock Items */}
              <SectionDivider label="Linked Stock Items" />
              {linkedStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock items linked to this COR.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="table-header"><th className="text-left px-2 py-1.5">Item Name</th><th className="text-left px-2 py-1.5">SKU</th><th className="text-left px-2 py-1.5">Qty</th><th className="text-left px-2 py-1.5">Unit Cost</th></tr></thead>
                  <tbody>
                    {linkedStock.map(s => (
                      <tr key={s.id} className="border-b border-border">
                        <td className="px-2 py-1.5 font-medium">{s.itemName}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{s.sku}</td>
                        <td className="px-2 py-1.5">{s.quantityOnHand}</td>
                        <td className="px-2 py-1.5">{formatEUR(s.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Shared With Section */}
              {!readOnly && (
                <>
                  <SectionDivider label="Shared With" />
                  {sharedWith.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not shared with anyone</p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      <TooltipProvider>
                        {sharedWith.map(uid => {
                          const user = USERS.find(u => u.id === uid);
                          if (!user) return null;
                          return (
                            <div key={uid} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: '#009A93' }}>
                                {getUserInitials(uid)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{user.fullName}</p>
                                <p className="text-xs text-muted-foreground">{getCompanyName(user.companyId)}</p>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${user.role === 'Owner' ? 'bg-[#009A93]' : 'bg-[#44C8F5]'}`}>
                                {user.role}
                              </span>
                              <button onClick={() => handleRemoveShare(uid)} className="text-destructive hover:bg-red-100 p-1 rounded transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </TooltipProvider>
                    </div>
                  )}
                  {shareableUsers.length > 0 && (
                    <button onClick={() => { setShareModalOpen(true); setShareUserId(''); }} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">
                      <Plus size={14} /> Share with...
                    </button>
                  )}
                </>
              )}

              {!readOnly && (
                <button onClick={startEdit} className="w-full py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card mt-4">Edit Record</button>
              )}
            </div>
          )}

          {tab === 'details' && editing && !readOnly && (
            <div className="space-y-4">
              {([
                ['corName', 'COR Name', 'text'], ['corNumber', 'COR Number', 'text'],
                ['corDate', 'COR Date', 'date'], ['clientName', 'Client Name', 'text'],
                ['vatNumber', 'VAT / ABN', 'text'], ['productName', 'Product Name', 'text'],
              ] as [keyof COR, string, string][]).map(([key, label, type]) => (
                <div key={key}>
                  <label className="label-uppercase block mb-1.5">{label}</label>
                  <input type={type} className={inputCls} value={(form[key] as string) || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="label-uppercase block mb-1.5">Project</label>
                <select className={inputCls} value={form.projectId || ''} onChange={e => {
                  const proj = projects.find(p => p.id === e.target.value);
                  setForm(f => ({ ...f, projectId: e.target.value, location: proj?.location || f.location || '' }));
                }}>
                  <option value="">Select a project...</option>
                  {projects.filter(p => p.companyId === session?.companyId).map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                </select>
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Location</label>
                <input className={inputCls} value={(form.location as string) || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Status</label>
                {segments(['Ongoing', 'Paid', 'Cancelled'], form.status || cor.status, v => setForm(f => ({ ...f, status: v as COR['status'] })))}
                {autoStatusNote && <p className="text-xs mt-1" style={{ color: '#009A93' }}>✓ Status automatically set to Paid</p>}
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Client Kind</label>
                {segments(['Company', 'Private'], form.clientKind || cor.clientKind, v => setForm(f => ({ ...f, clientKind: v as COR['clientKind'] })))}
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Product Type</label>
                {segments(['Service', 'Product'], form.productType || cor.productType, v => setForm(f => ({ ...f, productType: v as COR['productType'] })))}
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Price EUR</label>
                <input type="number" className={inputCls} value={form.price ?? cor.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">VAT %</label>
                <input type="number" className={inputCls} value={form.vat ?? cor.vat} onChange={e => setForm(f => ({ ...f, vat: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Amount Paid EUR</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <input type="number" min={0} step={0.01} placeholder="0.00" className={`${inputCls} pl-7`} value={form.amountPaid ?? 0} onChange={e => setForm(f => ({ ...f, amountPaid: Number(e.target.value) }))} />
                </div>
                {editOverpaid && <p className="text-destructive text-xs mt-1">Paid amount cannot exceed total</p>}
              </div>
              <div className="flex items-center justify-between">
                <span className="label-uppercase text-[11px]">Paid Percentage</span>
                <span className="font-bold" style={{ color: '#009A93' }}>{editPaidPct.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {tab === 'files' && (
            <div className="space-y-6">
              <div>
                <p className="label-uppercase text-[11px] mb-3">Images</p>
                {cor.pictureUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {cor.pictureUrls.map((url, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden h-[120px]">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {!readOnly && (
                          <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!readOnly && (
                  <div className="border-2 border-dashed border-blue rounded-xl p-6 text-center cursor-pointer hover:bg-blue-light/50 transition-colors" onClick={() => imgRef.current?.click()}>
                    <ImagePlus size={24} className="mx-auto mb-2 text-blue" />
                    <p className="text-sm font-medium">Drop images here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WEBP accepted</p>
                    <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </div>
                )}
                {readOnly && cor.pictureUrls.length === 0 && (
                  <p className="text-sm text-muted-foreground">No images attached.</p>
                )}
              </div>

              <div>
                <p className="label-uppercase text-[11px] mb-3">Documents</p>
                {cor.fileUrls.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {cor.fileUrls.map((url, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                        <FileText size={16} className="text-primary shrink-0" />
                        <span className="text-sm truncate max-w-[200px]">Document-{i + 1}.pdf</span>
                        <span className="text-xs text-muted-foreground ml-auto">{Math.round(url.length * 0.75 / 1024)}KB</span>
                        <a href={url} download className="text-primary hover:underline text-xs"><Download size={14} /></a>
                        {!readOnly && <button onClick={() => removeFile(i)} className="text-destructive"><X size={14} /></button>}
                      </div>
                    ))}
                  </div>
                )}
                {!readOnly && (
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => docRef.current?.click()}>
                    <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop PDF here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF only</p>
                    <input ref={docRef} type="file" accept="application/pdf" className="hidden" onChange={handleDocUpload} />
                  </div>
                )}
                {readOnly && cor.fileUrls.length === 0 && (
                  <p className="text-sm text-muted-foreground">No documents attached.</p>
                )}
              </div>

              {/* Extract bill — only for own CORs */}
              {!readOnly && (
                <div className="border-l-4 border-blue bg-blue-light rounded-xl p-5">
                  <h3 className="font-bold text-blue mb-1">Extract bill data</h3>
                  <p className="text-sm text-muted-foreground mb-3">Upload a supplier invoice PDF to auto-fill backcharge details from the bill.</p>
                  <button onClick={handleExtract} disabled={extracting} className="w-full bg-blue text-card font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                    {extracting ? <><Loader2 size={16} className="animate-spin" /> Extracting data...</> : 'Extract from latest PDF'}
                  </button>

                  {extractedData && (
                    <div className="mt-4 bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Extracted Bill Data</span>
                          <span className="bg-accent text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">AI</span>
                        </div>
                        <button onClick={() => setExtractEditable(!extractEditable)} className="p-1 hover:bg-accent rounded-md transition-colors">
                          {extractEditable ? <Lock size={14} /> : <Pencil size={14} />}
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        {[
                          ['Supplier', 'supplier'],
                          ['Invoice #', 'invoiceNumber'],
                          ['Date', 'date'],
                          ['Amount', 'amount'],
                          ['Line item', 'lineItem'],
                        ].map(([label, key]) => (
                          <div key={key}>
                            <p className="label-uppercase text-[10px] mb-0.5">{label}</p>
                            {extractEditable ? (
                              <input
                                type={key === 'date' ? 'date' : key === 'amount' ? 'number' : 'text'}
                                className={inputCls}
                                value={extractedData[key] || ''}
                                onChange={e => setExtractedData(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                              />
                            ) : (
                              <p className="font-medium">{key === 'amount' && extractedData[key] ? `€${Number(extractedData[key]).toFixed(2)}` : key === 'date' && extractedData[key] ? formatDate(extractedData[key]) : extractedData[key] || '—'}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={applyExtracted} className="w-full mt-3 bg-primary text-primary-foreground font-semibold rounded-lg py-2 text-sm hover:bg-[#007A74] transition-colors">Apply to record</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div>
              {/* Add note — always available */}
              <div className="flex gap-2 mb-6">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Add a manual note..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                />
                <button onClick={handleAddNote} className="bg-primary text-primary-foreground font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#007A74] transition-colors whitespace-nowrap">Add note</button>
              </div>

              {sortedLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Clock size={36} className="text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No activity recorded yet</p>
                </div>
              ) : (
                <div className="relative">
                  {sortedLog.map((entry, i) => {
                    const config = ACTIVITY_ICONS[entry.action] || ACTIVITY_ICONS.note_added;
                    const IconComp = config.icon;
                    const hasDiff = entry.diff && entry.diff.length > 0;
                    const isExpanded = expandedDiffs.has(entry.id);
                    return (
                      <div key={entry.id} className="flex gap-3 relative">
                        {i < sortedLog.length - 1 && (
                          <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
                        )}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: config.color + '20' }}>
                          <IconComp size={14} style={{ color: config.color }} />
                        </div>
                        <div className="pb-5 min-w-0 flex-1">
                          <p className="text-sm font-semibold">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">{entry.actor} · {relativeTime(entry.timestamp)}</p>
                          {hasDiff && (
                            <>
                              <button
                                onClick={() => toggleDiff(entry.id)}
                                className="text-xs mt-1 hover:underline flex items-center gap-1"
                                style={{ color: '#44C8F5' }}
                              >
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {isExpanded ? 'Hide changes' : `Show changes (${entry.diff!.length} field${entry.diff!.length > 1 ? 's' : ''})`}
                              </button>
                              {isExpanded && (
                                <div className="mt-2 ml-0 bg-muted rounded-lg p-3 space-y-1.5">
                                  {entry.diff!.map((d, di) => (
                                    <div key={di} className="flex items-center gap-1.5 flex-wrap text-xs">
                                      <span className="font-semibold min-w-[100px]">{d.field}</span>
                                      <span className="line-through px-1.5 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#EC008C' }}>{d.from}</span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="px-1.5 py-0.5 rounded" style={{ background: '#EAF5F5', color: '#009A93' }}>{d.to}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="p-6 pt-4 border-t border-border">
            {editing ? (
              <div className="flex justify-between">
                <button onClick={cancelEdit} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
                <button onClick={saveEdit} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors">Save Changes</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="px-4 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card flex items-center gap-2">
                      <Download size={16} /> Export
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => {
                      if (!session) return;
                      const toastId = toast.loading('Preparing export...');
                      try { exportSinglePDF(cor, session); toast.dismiss(toastId); toast.success('Exported 1 record as PDF ✓'); }
                      catch { toast.dismiss(toastId); toast.error('Export failed. Please try again.'); }
                    }} className="gap-2">
                      <FileText size={14} /> Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (!session) return;
                      const toastId = toast.loading('Preparing export...');
                      try { exportSingleJSON(cor, session); toast.dismiss(toastId); toast.success('Exported 1 record as JSON ✓'); }
                      catch { toast.dismiss(toastId); toast.error('Export failed. Please try again.'); }
                    }} className="gap-2">
                      <span className="text-xs font-mono">{'{ }'}</span> Export as JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button onClick={() => setDeleteOpen(true)} className="flex-1 bg-destructive text-destructive-foreground font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <Trash2 size={16} /> Delete COR
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/30 z-[60]" onClick={() => setShareModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-card rounded-2xl shadow-2xl z-[60] max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold">Share COR Access</h2>
              <button onClick={() => setShareModalOpen(false)} className="p-1 hover:bg-accent rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label-uppercase block mb-1.5">Select user</label>
                <select className={inputCls} value={shareUserId} onChange={e => setShareUserId(e.target.value)}>
                  <option value="">Choose a user...</option>
                  {shareableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} — {getCompanyName(u.companyId)} ({u.role})</option>
                  ))}
                </select>
              </div>
              {shareUserId && (() => {
                const u = USERS.find(x => x.id === shareUserId);
                return u ? (
                  <div className="rounded-[10px] p-3 text-[13px]" style={{ background: 'hsl(56 100% 97%)' }}>
                    {u.role === 'Manager' ? (
                      <p><strong>{u.fullName}</strong> and the Owner of <strong>{getCompanyName(u.companyId)}</strong> will be able to view this COR.</p>
                    ) : (
                      <p>Only <strong>{u.fullName}</strong> will be able to view this COR.</p>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
            <div className="p-6 pt-0 flex justify-between">
              <button onClick={() => setShareModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
              <button onClick={handleShare} disabled={!shareUserId} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors disabled:opacity-50">Grant Access</button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CORDetailPanel;
