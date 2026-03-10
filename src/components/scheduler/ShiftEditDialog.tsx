import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useProjects } from '@/contexts/ProjectContext';
import type { Shift } from '@/contexts/ShiftContext';

interface ShiftEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Partial<Shift> | null;
  employeeName: string;
  onSave: (shift: Shift) => void;
  onDelete?: (shiftId: string) => void;
}

export default function ShiftEditDialog({ open, onOpenChange, shift, employeeName, onSave, onDelete }: ShiftEditDialogProps) {
  const { projects } = useProjects();
  const isEdit = !!shift?.id && !!onDelete;

  const [form, setForm] = useState({
    project: '',
    date: '',
    startOfShift: '08:00',
    endOfShift: '17:00',
    dailyRate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (shift) {
      setForm({
        project: shift.project || '',
        date: shift.date || '',
        startOfShift: shift.startOfShift || '08:00',
        endOfShift: shift.endOfShift || '17:00',
        dailyRate: shift.dailyRate !== undefined ? String(shift.dailyRate) : '',
      });
      setErrors({});
    }
  }, [shift]);

  const inputCls = (field: string) =>
    `w-full border-[1.5px] rounded-lg px-3 py-2.5 text-sm transition ${errors[field] ? 'border-destructive' : 'border-border'} focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20`;

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.project) errs.project = 'Required';
    if (!form.date) errs.date = 'Required';
    if (!form.startOfShift) errs.startOfShift = 'Required';
    if (!form.endOfShift) errs.endOfShift = 'Required';
    if (form.startOfShift >= form.endOfShift) errs.endOfShift = 'Must be after start';
    if (!form.dailyRate) errs.dailyRate = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: shift?.id || crypto.randomUUID(),
      employeeId: shift?.employeeId || '',
      project: form.project,
      date: form.date,
      startOfShift: form.startOfShift,
      endOfShift: form.endOfShift,
      dailyRate: form.dailyRate ? Number(form.dailyRate) : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Shift' : 'New Shift'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="label-uppercase block mb-1.5">Employee</label>
            <input className={`${inputCls('_')} bg-muted`} value={employeeName} readOnly />
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Project *</label>
            <select className={inputCls('project')} value={form.project} onChange={e => set('project', e.target.value)}>
              <option value="">— Select project —</option>
              {projects.map(p => <option key={p.id} value={p.projectName}>{p.projectName}</option>)}
            </select>
            {errors.project && <p className="text-destructive text-xs mt-1">{errors.project}</p>}
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Date *</label>
            <input type="date" className={inputCls('date')} value={form.date} onChange={e => set('date', e.target.value)} />
            {errors.date && <p className="text-destructive text-xs mt-1">{errors.date}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-uppercase block mb-1.5">Start *</label>
              <input type="time" className={inputCls('startOfShift')} value={form.startOfShift} onChange={e => set('startOfShift', e.target.value)} />
              {errors.startOfShift && <p className="text-destructive text-xs mt-1">{errors.startOfShift}</p>}
            </div>
            <div>
              <label className="label-uppercase block mb-1.5">End *</label>
              <input type="time" className={inputCls('endOfShift')} value={form.endOfShift} onChange={e => set('endOfShift', e.target.value)} />
              {errors.endOfShift && <p className="text-destructive text-xs mt-1">{errors.endOfShift}</p>}
            </div>
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Daily Rate EUR *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              <input type="number" min={0} className={`${inputCls('dailyRate')} pl-7`} value={form.dailyRate} onChange={e => set('dailyRate', e.target.value)} />
            </div>
            {errors.dailyRate && <p className="text-destructive text-xs mt-1">{errors.dailyRate}</p>}
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {isEdit && onDelete ? (
            <button
              onClick={() => { onDelete(shift!.id!); onOpenChange(false); }}
              className="px-4 py-2 text-sm font-semibold text-destructive border-[1.5px] border-destructive rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
            <button onClick={handleSave} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors">Save</button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
