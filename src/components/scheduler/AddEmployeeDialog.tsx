import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useProjects } from '@/contexts/ProjectContext';
import { useEmployees, type Employee } from '@/contexts/EmployeeContext';
import { useShifts } from '@/contexts/ShiftContext';
import { generateShiftsFromEmployee } from './syncUtils';
import { toast } from 'sonner';

const roles = ['Electrician', 'Plumber', 'Plasterer', 'Carpenter', 'Site Manager', 'Labourer', 'HVAC Tech', 'Demolition Worker'];

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEmployee?: Employee | null;
}

export default function AddEmployeeDialog({ open, onOpenChange, editEmployee }: AddEmployeeDialogProps) {
  const { projects } = useProjects();
  const { addEmployee, updateEmployee } = useEmployees();
  const { addShift, replaceShiftsForEmployee, getShiftsForEmployee } = useShifts();

  const emptyForm = {
    fullName: '', role: '', email: '', phone: '',
    assignedProject: '', startDate: '', endDate: '',
    startOfShift: '', endOfShift: '', dailyRate: '', status: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [onLeaveWarning, setOnLeaveWarning] = useState(false);
  const isEdit = !!editEmployee;

  useEffect(() => {
    if (open && editEmployee) {
      setForm({
        fullName: editEmployee.fullName,
        role: editEmployee.role,
        email: editEmployee.email,
        phone: editEmployee.phone,
        assignedProject: editEmployee.assignedProject === 'none' ? '' : editEmployee.assignedProject,
        startDate: editEmployee.startDate,
        endDate: editEmployee.endDate,
        startOfShift: '',
        endOfShift: '',
        dailyRate: editEmployee.dailyRate ? String(editEmployee.dailyRate) : '',
        status: editEmployee.status,
      });
      setErrors({});
    } else if (open && !editEmployee) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [open, editEmployee]);

  const inputCls = (field: string) =>
    `w-full border-[1.5px] rounded-lg px-3 py-2.5 text-sm transition ${errors[field] ? 'border-destructive' : 'border-border'} focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20`;

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Required';
    if (!form.role.trim()) errs.role = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    if (!form.phone.trim()) errs.phone = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const doSave = () => {
    const hasProjectInfo = form.assignedProject && form.assignedProject !== '' && form.startDate && form.endDate;

    const resolveStatus = (): Employee['status'] => {
      if (isEdit && form.status) return form.status as Employee['status'];
      return hasProjectInfo ? 'Active' : 'Inactive';
    };

    if (isEdit) {
      const updates: Partial<Employee> = {
        fullName: form.fullName.trim(),
        role: form.role.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        assignedProject: hasProjectInfo ? form.assignedProject : 'none',
        startDate: form.startDate || '',
        endDate: form.endDate || '',
        dailyRate: form.dailyRate ? Number(form.dailyRate) : 0,
        status: resolveStatus(),
      };

      updateEmployee(editEmployee!.id, updates);

      // Re-generate shifts in one atomic operation
      if (hasProjectInfo) {
        const updatedEmp = { ...editEmployee!, ...updates } as Employee;
        const newShifts = generateShiftsFromEmployee(updatedEmp);
        replaceShiftsForEmployee(editEmployee!.id, newShifts);
      } else {
        replaceShiftsForEmployee(editEmployee!.id, []);
      }

      toast.success('Employee updated');
    } else {
      const employee: Employee = {
        id: crypto.randomUUID(),
        fullName: form.fullName.trim(),
        role: form.role.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        assignedProject: hasProjectInfo ? form.assignedProject : 'none',
        startDate: form.startDate || '',
        endDate: form.endDate || '',
        dailyRate: form.dailyRate ? Number(form.dailyRate) : 0,
        status: resolveStatus(),
      };

      addEmployee(employee);

      if (hasProjectInfo) {
        const shifts = generateShiftsFromEmployee(employee);
        shifts.forEach(s => addShift(s));
      }

      toast.success('Employee added');
    }

    setForm(emptyForm);
    setErrors({});
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!validate()) return;

    // Check if changing to "On Leave" and employee has shifts
    if (isEdit && form.status === 'On Leave' && editEmployee?.status !== 'On Leave') {
      const existingShifts = getShiftsForEmployee(editEmployee!.id);
      if (existingShifts.length > 0) {
        setOnLeaveWarning(true);
        return;
      }
    }

    doSave();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setForm(emptyForm); setErrors({}); } onOpenChange(v); }}>
      <DialogContent className="max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="label-uppercase block mb-1.5">Full Name *</label>
            <input className={inputCls('fullName')} value={form.fullName} onChange={e => set('fullName', e.target.value)} />
            {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Role *</label>
            <input list="add-emp-roles" className={inputCls('role')} value={form.role} onChange={e => set('role', e.target.value)} />
            <datalist id="add-emp-roles">{roles.map(r => <option key={r} value={r} />)}</datalist>
            {errors.role && <p className="text-destructive text-xs mt-1">{errors.role}</p>}
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Email *</label>
            <input type="email" className={inputCls('email')} value={form.email} onChange={e => set('email', e.target.value)} />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Phone *</label>
            <input className={inputCls('phone')} placeholder="04XX XXX XXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
            {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
          </div>

          {isEdit && (
            <div>
              <label className="label-uppercase block mb-1.5">Status</label>
              <select className={inputCls('status')} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-3">{isEdit ? 'Project & scheduling details' : 'Optional — leave blank for Inactive status'}</p>
          </div>

          <div>
            <label className="label-uppercase block mb-1.5">Assigned Project</label>
            <select className={inputCls('assignedProject')} value={form.assignedProject} onChange={e => set('assignedProject', e.target.value)}>
              <option value="">— No project assigned —</option>
              {projects.map(p => <option key={p.id} value={p.projectName}>{p.projectName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-uppercase block mb-1.5">Start Date</label>
              <input type="date" className={inputCls('startDate')} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="label-uppercase block mb-1.5">End Date</label>
              <input type="date" className={inputCls('endDate')} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Daily Rate EUR</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              <input type="number" min={0} className={`${inputCls('dailyRate')} pl-7`} value={form.dailyRate} onChange={e => set('dailyRate', e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-border rounded-lg hover:border-primary transition-colors bg-card">Cancel</button>
          <button onClick={handleSave} className="bg-primary text-primary-foreground font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#007A74] transition-colors">
            {isEdit ? 'Save Changes' : 'Add Employee'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={onLeaveWarning} onOpenChange={setOnLeaveWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Employee has scheduled shifts</AlertDialogTitle>
          <AlertDialogDescription>
            {editEmployee?.fullName} currently has shifts planned in the scheduler. Setting their status to "On Leave" will keep the shifts visible but they'll be highlighted in red to indicate unavailability.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setOnLeaveWarning(false); doSave(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Set On Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
