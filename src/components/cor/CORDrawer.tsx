import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCOR, type COR } from '@/contexts/CORContext';
import { useProjects } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface Props { onClose: () => void; }

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

const CORDrawer = ({ onClose }: Props) => {
  const { cors, addCOR } = useCOR();
  const { projects } = useProjects();
  const [form, setForm] = useState({
    corName: '', corNumber: '', corDate: new Date().toISOString().split('T')[0],
    status: 'Ongoing' as COR['status'], clientKind: 'Company' as COR['clientKind'],
    clientName: '', vatNumber: '', productName: '',
    productType: 'Service' as COR['productType'], location: '',
    price: '', vat: '10', amountPaid: '0', projectId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoStatusNote, setAutoStatusNote] = useState(false);

  useBodyScrollLock(true);

  const price = Number(form.price) || 0;
  const vat = Number(form.vat) || 0;
  const total = price + price * vat / 100;
  const amountPaid = Number(form.amountPaid) || 0;
  const paidPct = total > 0 ? Math.min((amountPaid / total) * 100, 100) : 0;
  const overpaid = amountPaid > total && total > 0;

  useEffect(() => {
    if (total > 0 && amountPaid >= total) {
      setForm(f => ({ ...f, status: 'Paid' }));
      setAutoStatusNote(true);
    } else if (autoStatusNote) {
      setForm(f => ({ ...f, status: 'Ongoing' }));
      setAutoStatusNote(false);
    }
  }, [amountPaid, total]);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setForm(f => ({ ...f, projectId, location: project?.location || f.location }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.corName.trim()) errs.corName = 'This field is required';
    if (!form.corNumber.trim()) errs.corNumber = 'This field is required';
    if (!form.corDate) errs.corDate = 'This field is required';
    if (!form.clientName.trim()) errs.clientName = 'This field is required';
    if (!form.productName.trim()) errs.productName = 'This field is required';
    if (!form.location.trim()) errs.location = 'This field is required';
    if (!form.projectId) errs.projectId = 'This field is required';
    if (!form.price || Number(form.price) < 0) errs.price = 'This field is required';
    if (form.vat === '') errs.vat = 'This field is required';
    if (overpaid) errs.amountPaid = 'Paid amount cannot exceed total';
    if (cors.some(c => c.corNumber === form.corNumber.trim())) errs.corNumber = 'COR number already exists';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const cor: COR = {
      id: crypto.randomUUID(),
      corName: form.corName.trim(), corNumber: form.corNumber.trim(),
      corDate: form.corDate, creationDate: new Date().toISOString(),
      status: form.status, clientKind: form.clientKind,
      clientName: form.clientName.trim(), vatNumber: form.vatNumber.trim(),
      productName: form.productName.trim(), productType: form.productType,
      location: form.location.trim(), projectId: form.projectId || undefined,
      price: Number(form.price), vat: Number(form.vat),
      paidPercentage: Math.round(paidPct * 10) / 10,
      pictureUrls: [], fileUrls: [],
    };
    addCOR(cor);
    toast.success('COR saved successfully ✓');
    onClose();
  };

  const inputCls = (field: string) =>
    `w-full border-[1.5px] rounded-lg px-3 py-2.5 text-sm transition ${errors[field] ? 'border-destructive' : 'border-border'} focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20`;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/30 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-card z-50 animate-slide-in-right flex flex-col shadow-2xl">
        <div className="p-6 pb-4 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">New Change Order Request</h2>
            <p className="text-sm text-muted-foreground mt-1">Fill in the details. Attach bills after saving.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-lg transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1 */}
          <div>
            <p className="label-uppercase text-[11px] mb-3 border-b border-border pb-2">Record Info</p>
            <div className="space-y-4">
              <div><label className="label-uppercase block mb-1.5">COR Name *</label><input className={inputCls('corName')} placeholder="e.g. Cleanup after plasterer" value={form.corName} onChange={e => set('corName', e.target.value)} />{errors.corName && <p className="text-destructive text-xs mt-1">{errors.corName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">COR Number *</label><input className={inputCls('corNumber')} placeholder="e.g. COR-2024-004" value={form.corNumber} onChange={e => set('corNumber', e.target.value)} />{errors.corNumber && <p className="text-destructive text-xs mt-1">{errors.corNumber}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">COR Date *</label><input type="date" className={inputCls('corDate')} value={form.corDate} onChange={e => set('corDate', e.target.value)} />{errors.corDate && <p className="text-destructive text-xs mt-1">{errors.corDate}</p>}</div>
              <div>
                <label className="label-uppercase block mb-1.5">Status *</label>
                {segments(['Ongoing', 'Paid', 'Cancelled'], form.status, v => set('status', v))}
                {autoStatusNote && <p className="text-xs mt-1" style={{ color: '#009A93' }}>✓ Status automatically set to Paid</p>}
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <p className="label-uppercase text-[11px] mb-3 border-b border-border pb-2">Client Details</p>
            <div className="space-y-4">
              <div><label className="label-uppercase block mb-1.5">Client Kind *</label>{segments(['Company', 'Private'], form.clientKind, v => set('clientKind', v))}</div>
              <div><label className="label-uppercase block mb-1.5">Client Name *</label><input className={inputCls('clientName')} value={form.clientName} onChange={e => set('clientName', e.target.value)} />{errors.clientName && <p className="text-destructive text-xs mt-1">{errors.clientName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">VAT / ABN Number</label><input className={inputCls('vatNumber')} placeholder="e.g. ABN 51 123 456 789" value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} /></div>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <p className="label-uppercase text-[11px] mb-3 border-b border-border pb-2">Product / Service</p>
            <div className="space-y-4">
              <div><label className="label-uppercase block mb-1.5">Product Name *</label><input className={inputCls('productName')} value={form.productName} onChange={e => set('productName', e.target.value)} />{errors.productName && <p className="text-destructive text-xs mt-1">{errors.productName}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">Product Type *</label>{segments(['Service', 'Product'], form.productType, v => set('productType', v))}</div>
              <div>
                <label className="label-uppercase block mb-1.5">Project *</label>
                <select className={inputCls('projectId')} value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
                  <option value="">Select a project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                </select>
                {errors.projectId && <p className="text-destructive text-xs mt-1">{errors.projectId}</p>}
              </div>
              <div><label className="label-uppercase block mb-1.5">Location *</label><input className={inputCls('location')} placeholder="e.g. 42 George St, Sydney NSW 2000" value={form.location} onChange={e => set('location', e.target.value)} />{errors.location && <p className="text-destructive text-xs mt-1">{errors.location}</p>}</div>
            </div>
          </div>

          {/* Section 4 */}
          <div>
            <p className="label-uppercase text-[11px] mb-3 border-b border-border pb-2">Financials</p>
            <div className="space-y-4">
              <div><label className="label-uppercase block mb-1.5">Price AUD *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><input type="number" min={0} step={0.01} className={`${inputCls('price')} pl-7`} value={form.price} onChange={e => set('price', e.target.value)} /></div>{errors.price && <p className="text-destructive text-xs mt-1">{errors.price}</p>}</div>
              <div><label className="label-uppercase block mb-1.5">VAT % *</label><div className="relative"><input type="number" min={0} max={100} className={`${inputCls('vat')} pr-7`} value={form.vat} onChange={e => set('vat', e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span></div>{errors.vat && <p className="text-destructive text-xs mt-1">{errors.vat}</p>}</div>
              <div>
                <label className="label-uppercase block mb-1.5">Amount Paid AUD</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input type="number" min={0} step={0.01} placeholder="0.00" className={`${inputCls('amountPaid')} pl-7`} value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} />
                </div>
                {overpaid && <p className="text-destructive text-xs mt-1">Paid amount cannot exceed total</p>}
              </div>
              <div className="flex items-center justify-between">
                <span className="label-uppercase text-[11px]">Paid Percentage</span>
                <span className="font-bold" style={{ color: '#009A93' }}>{paidPct.toFixed(1)}%</span>
              </div>
              <div className="bg-accent rounded-xl p-4">
                <p className="label-uppercase text-[11px] mb-1">Total incl. VAT</p>
                <p className="text-xl font-bold text-primary">${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-border flex items-center justify-between">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
          <button onClick={handleSave} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors">Save COR</button>
        </div>
      </div>
    </>
  );
};

export default CORDrawer;
