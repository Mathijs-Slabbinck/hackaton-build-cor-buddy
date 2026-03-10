import { useState, useMemo } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Employee } from '@/contexts/EmployeeContext';
import { getEmployeeDotColor } from './ShiftBlock';

interface EmployeeSidebarProps {
  employees: Employee[];
  onAddEmployee: () => void;
  onDeleteEmployee: (id: string) => void;
}

export default function EmployeeSidebar({ employees, onAddEmployee, onDeleteEmployee }: EmployeeSidebarProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (search && !e.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [employees, search, statusFilter]);

  const selectCls = "w-full border-[1.5px] border-border rounded-lg px-3 py-2 text-sm bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20";

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDeleteEmployee(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="w-[250px] flex-shrink-0 border-r border-border flex flex-col bg-card rounded-l-xl">
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border-[1.5px] border-border rounded-lg pl-8 pr-3 py-1.5 text-xs bg-card focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${selectCls} text-xs py-1.5`}>
          <option>All</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>On Leave</option>
          <option>Completed</option>
        </select>
      </div>

      <ScrollArea className="flex-1" style={{ maxHeight: '520px' }}>
        <div className="p-2 space-y-0.5">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No employees found</p>
          )}
          {filtered.map(emp => (
            <div
              key={emp.id}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('employeeId', emp.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getEmployeeDotColor(emp.id)}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{emp.fullName}</div>
                <div className="text-[10px] text-muted-foreground truncate">{emp.role}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setDeleteId(emp.id); }}
                className="p-1 rounded-md hover:bg-red-100 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <button
          onClick={onAddEmployee}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary border-[1.5px] border-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Plus size={14} />
          Add Employee
        </button>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the employee and all their shifts. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
