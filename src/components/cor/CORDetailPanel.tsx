import { useState, useRef } from 'react';
import { X, Clock, ImagePlus, Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { useCOR, type COR } from '@/contexts/CORContext';
import { StatusBadge, formatAUD, formatDate, PaidBar } from '@/components/SharedUI';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
  const cor = getCORById(corId);
  const [tab, setTab] = useState<'details' | 'files' | 'activity'>('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<COR>>({});
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  if (!cor) return null;

  const startEdit = () => { setForm({ ...cor }); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setForm({}); };
  const saveEdit = () => {
    updateCOR(corId, form);
    setEditing(false);
    toast.success('Record updated ✓');
  };

  const total = cor.price + cor.price * cor.vat / 100;
  const inputCls = "w-full border-[1.5px] border-border rounded-lg px-3 py-2 text-sm focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        updateCOR(corId, { pictureUrls: [...cor.pictureUrls, reader.result as string] });
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
        updateCOR(corId, { fileUrls: [...cor.fileUrls, reader.result as string] });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    updateCOR(corId, { pictureUrls: cor.pictureUrls.filter((_, i) => i !== idx) });
  };

  const removeFile = (idx: number) => {
    updateCOR(corId, { fileUrls: cor.fileUrls.filter((_, i) => i !== idx) });
  };

  const handleExtract = async () => {
    setExtracting(true);
    await new Promise(r => setTimeout(r, 2000));
    setExtracting(false);
    setExtracted(true);
  };

  const applyExtracted = () => {
    updateCOR(corId, { productName: 'Site cleanup services', price: 1240 });
    setExtracted(false);
    toast.success('Bill data applied ✓');
  };

  const handleDelete = () => {
    deleteCOR(corId);
    toast.success('COR deleted');
    onClose();
  };

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'files', label: 'Files & Images' },
    { key: 'activity', label: 'Activity' },
  ] as const;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/30 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-card z-50 animate-slide-in-right flex flex-col shadow-2xl">
        {/* Header */}
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

        {/* Content */}
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
              <button onClick={startEdit} className="w-full py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Edit Record</button>
            </div>
          )}

          {tab === 'details' && editing && (
            <div className="space-y-4">
              {([
                ['corName', 'COR Name', 'text'], ['corNumber', 'COR Number', 'text'],
                ['corDate', 'COR Date', 'date'], ['clientName', 'Client Name', 'text'],
                ['vatNumber', 'VAT / ABN', 'text'], ['productName', 'Product Name', 'text'],
                ['location', 'Location', 'text'],
              ] as [keyof COR, string, string][]).map(([key, label, type]) => (
                <div key={key}>
                  <label className="label-uppercase block mb-1.5">{label}</label>
                  <input type={type} className={inputCls} value={(form[key] as string) || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="label-uppercase block mb-1.5">Status</label>
                {segments(['Ongoing', 'Paid', 'Cancelled'], form.status || cor.status, v => setForm(f => ({ ...f, status: v as COR['status'] })))}
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
                <label className="label-uppercase block mb-1.5">Paid %</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={100} value={form.paidPercentage ?? cor.paidPercentage} onChange={e => setForm(f => ({ ...f, paidPercentage: Number(e.target.value) }))} className="flex-1 accent-primary" />
                  <span className="bg-accent text-primary text-xs font-semibold px-2 py-1 rounded-md">{form.paidPercentage ?? cor.paidPercentage}%</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'files' && (
            <div className="space-y-6">
              {/* Images */}
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

              {/* Documents */}
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

                {extracted && (
                  <div className="mt-4 bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-bold text-sm">Extracted Bill Data</span>
                      <span className="bg-accent text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">AI</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {[['Supplier', 'BuildClean Pty Ltd'], ['Invoice #', 'INV-00234'], ['Date', '12 Mar 2024'], ['Amount', '$1,240.00'], ['Line item', 'Site cleanup services']].map(([l, v]) => (
                        <div key={l} className="flex justify-between">
                          <span className="text-muted-foreground">{l}</span>
                          <span className="font-medium">{v}</span>
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

        {/* Footer */}
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
