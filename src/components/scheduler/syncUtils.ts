import type { Employee } from '@/contexts/EmployeeContext';
import type { Shift } from '@/contexts/ShiftContext';

export function syncEmployeeFromShifts(
  employeeId: string,
  allShiftsForEmployee: Shift[],
  updateEmployee: (id: string, updates: Partial<Employee>) => void,
  currentEmployee: Employee
) {
  const preserveStatuses: Employee['status'][] = ['On Leave', 'Completed'];

  if (allShiftsForEmployee.length === 0) {
    const updates: Partial<Employee> = {
      assignedProject: 'none',
      startDate: '',
      endDate: '',
    };
    if (!preserveStatuses.includes(currentEmployee.status)) {
      updates.status = 'Inactive';
    }
    updateEmployee(employeeId, updates);
    return;
  }

  const sorted = [...allShiftsForEmployee].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];

  const updates: Partial<Employee> = {
    assignedProject: latest.project,
    startDate: earliest.date,
    endDate: latest.date,
  };

  if (latest.dailyRate !== undefined) {
    updates.dailyRate = latest.dailyRate;
  }

  if (!preserveStatuses.includes(currentEmployee.status)) {
    updates.status = 'Active';
  }

  updateEmployee(employeeId, updates);
}

export function generateShiftsFromEmployee(employee: Employee): Shift[] {
  if (!employee.assignedProject || employee.assignedProject === 'none' || employee.assignedProject === '') {
    return [];
  }
  if (!employee.startDate || !employee.endDate) {
    return [];
  }

  const shifts: Shift[] = [];
  const start = new Date(employee.startDate);
  const end = new Date(employee.endDate);

  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      shifts.push({
        id: crypto.randomUUID(),
        employeeId: employee.id,
        project: employee.assignedProject,
        date: current.toISOString().split('T')[0],
        startOfShift: '08:00',
        endOfShift: '17:00',
        dailyRate: employee.dailyRate || undefined,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return shifts;
}
