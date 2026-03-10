import { useState, useRef, useEffect } from 'react';
import { X, Clock, ImagePlus, Upload, FileText, Trash2, Download, Loader2, Pencil, Lock } from 'lucide-react';
import { useCOR, type COR } from '@/contexts/CORContext';
import { useStock } from '@/contexts/StockContext';
import { useProjects } from '@/contexts/ProjectContext';
import { StatusBadge, formatAUD, formatDate, PaidBar } from '@/components/SharedUI';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface Props { corId: string; onClose: () => void; onDelete: (id: string) => void; }

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

const CORDetailPanel = ({ corId, onClose, onDelete }: Props) => {
  const { getCORById, updateCOR, deleteCOR } = useCOR();
  const { items: stockItems } = useStock();
  const { projects } = useProjects();
  const cor = getCORById(corId);
  const [tab, setTab] = useState<'details' | 'files' | 'activity'>('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<COR> & { amountPaid?: number }>({});
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, string> | null>(null);
  const [extractEditable, setExtractEditable] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  const cor = getCORById(corId);

  if (!cor) return null;

  const startEdit = () => {
    const amountPaid = cor.paidPercentage / 100 * (cor.price + cor.price * cor.vat / 100);
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

  // Auto-status for edit
  useEffect(() => {
    if (!editing) return;
    const t = editTotal();
    const a = editAmountPaid;
    if (t > 0 && a >= t) {
      setForm(f => ({ ...f, status: 'Paid' }));
      setAutoStatusNote(true);
    } else if (autoStatusNote) {
      setForm(f => ({ ...f, status: 'Ongoing' }));
      setAutoStatusNote(false);
    }
  }, [editing, form.price, form.vat, form.amountPaid]);

  const saveEdit = () => {
    if (editOverpaid) return;
    const updates = { ...form, paidPercentage: Math.round(editPaidPct * 10) / 10 };
    delete (updates as any).amountPaid;
    updateCOR(corId, updates);
    setEditing(false);
    toast.success('Record updated ✓');
  };

  const inputCls = "w-full border-[1.5px] border-border rounded-lg px-3 py-2 text-sm focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => { updateCOR(corId, { pictureUrls: [...cor.pictureUrls, reader.result as string] }); };
      reader.readAsDataURL(file);
    });
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => { updateCOR(corId, { fileUrls: [...cor.fileUrls, reader.result as string] }); };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => { updateCOR(corId, { pictureUrls: cor.pictureUrls.filter((_, i) => i !== idx) }); };
  const removeFile = (idx: number) => { updateCOR(corId, { fileUrls: cor.fileUrls.filter((_, i) => i !== idx) }); };

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
              { type: 'text', text: 'Extract the following fields from this Australian construction invoice and return ONLY a valid JSON object with no markdown, no explanation, no backticks. Fields: supplier (string), invoiceNumber (string), date (ISO date string YYYY-MM-DD), amount (number, excl GST if shown separately), lineItem (string, first or main line item description). If a field cannot be found, use null.' }
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
    } catch {
      toast.error('Extraction failed. You can enter details manually.');
      setExtractedData({ supplier: '', invoiceNumber: '', date: '', amount: '', lineItem: '' });
      setExtractEditable(true);
    }
    setExtracting(false);
  };

  const applyExtracted = () => {
    if (!extractedData) return;
    const updates: Partial<COR> = {};
    if (extractedData.supplier) updates.clientName = extractedData.supplier;
    if (extractedData.invoiceNumber && !cor.corNumber) updates.corNumber = extractedData.invoiceNumber;
    if (extractedData.date) updates.corDate = extractedData.date;
    if (extractedData.amount) updates.price = parseFloat(extractedData.amount);
    if (extractedData.lineItem) updates.productName = extractedData.lineItem;
    updateCOR(corId, updates);
    setExtractedData(null);
    toast.success('Bill data applied to record ✓');
  };

  const handleDelete = () => { deleteCOR(corId); toast.success('COR deleted'); onClose(); };

  const linkedStock = stockItems.filter(s => s.linkedCorId === corId);

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'files', label: 'Files & Images' },
    { key: 'activity', label: 'Activity' },
  ] as const;

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
          <div className="flex gap-0">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setEditing(false); }}
                className={`px-4 pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && !editing && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {([
                  ['Client Kind', cor.clientKind], ['Client Name', cor.clientName],
                  ['VAT / ABN', cor.vatNumber || '—'], ['Product Type', cor.productType],
                  ['Product Name', cor.productName], ['Location', cor.location],
                  ['COR Date', formatDate(cor.corDate)], ['Created Date', formatDate(cor.creationDate)],
                  ['Price (excl VAT)', formatAUD(cor.price)], ['VAT %', `${cor.vat}%`],
                  ['Total incl. VAT', formatAUD(total)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="label-uppercase text-[11px] mb-1">{label}</p>
                    <p className="text-sm">{value}</p>
                  </div>
                ))}
                <div>
                  <p className="label-uppercase text-[11px] mb-1">Paid Percentage</p>
                  <div className="w-32"><PaidBar pct={cor.paidPercentage} /></div>
                </div>
              </div>
              <div className="text-center pt-2"><StatusBadge status={cor.status} /></div>

              {/* Linked Stock Items */}
              <div>
                <p className="label-uppercase text-[11px] mb-2 border-t border-border pt-4">Linked Stock Items</p>
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
                          <td className="px-2 py-1.5">{formatAUD(s.unitCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <button onClick={startEdit} className="w-full py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Edit Record</button>
            </div>
          )}

          {tab === 'details' && editing && (
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
                  {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
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
                <label className="label-uppercase block mb-1.5">Price AUD</label>
                <input type="number" className={inputCls} value={form.price ?? cor.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">VAT %</label>
                <input type="number" className={inputCls} value={form.vat ?? cor.vat} onChange={e => setForm(f => ({ ...f, vat: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label-uppercase block mb-1.5">Amount Paid AUD</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
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
                        <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-2 border-dashed border-blue rounded-xl p-6 text-center cursor-pointer hover:bg-blue-light/50 transition-colors" onClick={() => imgRef.current?.click()}>
                  <ImagePlus size={24} className="mx-auto mb-2 text-blue" />
                  <p className="text-sm font-medium">Drop images here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WEBP accepted</p>
                  <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </div>
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
                        <button onClick={() => removeFile(i)} className="text-destructive"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => docRef.current?.click()}>
                  <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop PDF here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF only</p>
                  <input ref={docRef} type="file" accept="application/pdf" className="hidden" onChange={handleDocUpload} />
                </div>
              </div>

              {/* Extract bill */}
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
                            <p className="font-medium">{key === 'amount' && extractedData[key] ? `$${Number(extractedData[key]).toFixed(2)}` : key === 'date' && extractedData[key] ? formatDate(extractedData[key]) : extractedData[key] || '—'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={applyExtracted} className="w-full mt-3 bg-primary text-primary-foreground font-semibold rounded-lg py-2 text-sm hover:bg-[#007A74] transition-colors">Apply to record</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="flex flex-col items-center justify-center py-20">
              <Clock size={40} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Activity log coming soon</p>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-border">
          {editing ? (
            <div className="flex justify-between">
              <button onClick={cancelEdit} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
              <button onClick={saveEdit} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors">Save Changes</button>
            </div>
          ) : (
            <button onClick={() => setDeleteOpen(true)} className="w-full bg-destructive text-destructive-foreground font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <Trash2 size={16} /> Delete COR
            </button>
          )}
        </div>
      </div>

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
