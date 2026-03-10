import { useState, useMemo, useCallback } from 'react';
import { useEmployees } from '@/contexts/EmployeeContext';
import { useShifts, type Shift } from '@/contexts/ShiftContext';
import WeekCalendar from './WeekCalendar';
import EmployeeSidebar from './EmployeeSidebar';
import ShiftEditDialog from './ShiftEditDialog';
import AddEmployeeDialog from './AddEmployeeDialog';
import { syncEmployeeFromShifts } from './syncUtils';
import { toast } from 'sonner';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function SchedulerSection() {
  const { employees, updateEmployee, deleteEmployee } = useEmployees();
  const { shifts, addShift, updateShift, deleteShift, getShiftsForEmployee, getShiftsForWeek } = useShifts();

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editShift, setEditShift] = useState<Partial<Shift> | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState('');
  const [isNewShift, setIsNewShift] = useState(false);

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const weekShifts = useMemo(() => getShiftsForWeek(weekStart), [getShiftsForWeek, weekStart]);

  const prevWeek = useCallback(() => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const nextWeek = useCallback(() => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const goToday = useCallback(() => {
    setWeekStart(getMonday(new Date()));
  }, []);

  const runSync = useCallback((employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    const empShifts = getShiftsForEmployee(employeeId);
    syncEmployeeFromShifts(employeeId, empShifts, updateEmployee, emp);
  }, [employees, getShiftsForEmployee, updateEmployee]);

  const handleDropEmployee = useCallback((employeeId: string, date: string, hour: number) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    const startH = String(hour).padStart(2, '0') + ':00';
    const endHour = Math.min(hour + 1, 24);
    const endH = String(endHour).padStart(2, '0') + ':00';

    setEditShift({
      employeeId,
      project: emp.assignedProject && emp.assignedProject !== 'none' ? emp.assignedProject : '',
      date,
      startOfShift: startH,
      endOfShift: endH,
      dailyRate: undefined,
    });
    setEditEmployeeName(emp.fullName);
    setIsNewShift(true);
    setEditDialogOpen(true);
  }, [employees]);

  const handleShiftClick = useCallback((shift: Shift) => {
    const emp = employees.find(e => e.id === shift.employeeId);
    setEditShift(shift);
    setEditEmployeeName(emp?.fullName || 'Unknown');
    setIsNewShift(false);
    setEditDialogOpen(true);
  }, [employees]);

  const handleShiftSave = useCallback((shift: Shift) => {
    if (isNewShift) {
      addShift(shift);
      toast.success('Shift created');
    } else {
      updateShift(shift.id, shift);
      toast.success('Shift updated');
    }
    setTimeout(() => runSync(shift.employeeId), 0);
  }, [isNewShift, addShift, updateShift, runSync]);

  const handleShiftDelete = useCallback((shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    deleteShift(shiftId);
    toast.success('Shift deleted');
    if (shift) {
      setTimeout(() => runSync(shift.employeeId), 0);
    }
  }, [shifts, deleteShift, runSync]);

  const handleDeleteEmployee = useCallback((employeeId: string) => {
    const empShifts = getShiftsForEmployee(employeeId);
    empShifts.forEach(s => deleteShift(s.id));
    deleteEmployee(employeeId);
    toast.success('Employee deleted');
  }, [getShiftsForEmployee, deleteShift, deleteEmployee]);

  const handleShiftResize = useCallback((shiftId: string, newEndTime: string) => {
    updateShift(shiftId, { endOfShift: newEndTime });
    const shift = shifts.find(s => s.id === shiftId);
    if (shift) {
      setTimeout(() => runSync(shift.employeeId), 0);
    }
  }, [updateShift, shifts, runSync]);

  return (
    <div className="mt-14">
      <h2 className="text-xl font-bold mb-4">Visual Scheduler</h2>
      <div className="card-cor flex overflow-hidden" style={{ minHeight: '500px' }}>
        <EmployeeSidebar
          employees={employees}
          onAddEmployee={() => setAddEmployeeOpen(true)}
          onDeleteEmployee={handleDeleteEmployee}
        />
        <WeekCalendar
          weekStart={weekStart}
          onPrevWeek={prevWeek}
          onNextWeek={nextWeek}
          onToday={goToday}
          shifts={weekShifts}
          employees={employees}
          onShiftClick={handleShiftClick}
          onShiftResize={handleShiftResize}
          onDropEmployee={handleDropEmployee}
        />
      </div>

      <ShiftEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        shift={editShift}
        employeeName={editEmployeeName}
        onSave={handleShiftSave}
        onDelete={isNewShift ? undefined : handleShiftDelete}
      />

      <AddEmployeeDialog
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
      />
    </div>
  );
}
