import { useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ShiftBlock from './ShiftBlock';
import type { Shift } from '@/contexts/ShiftContext';
import type { Employee } from '@/contexts/EmployeeContext';

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const startStr = weekStart.toLocaleDateString('en-AU', opts);
  const endStr = end.toLocaleDateString('en-AU', { ...opts, year: 'numeric' });
  return `${startStr} — ${endStr}`;
}

function getDayDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function timeToHour(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

interface WeekCalendarProps {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  shifts: Shift[];
  employees: Employee[];
  onShiftClick: (shift: Shift) => void;
  onShiftResize: (shiftId: string, newEndTime: string) => void;
  onDropEmployee: (employeeId: string, date: string, hour: number) => void;
}

export default function WeekCalendar({
  weekStart, onPrevWeek, onNextWeek, onToday,
  shifts, employees, onShiftClick, onShiftResize, onDropEmployee,
}: WeekCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => getDayDates(weekStart), [weekStart]);
  const employeeMap = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach(e => m.set(e.id, e));
    return m;
  }, [employees]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    days.forEach(d => {
      const key = d.toISOString().split('T')[0];
      map.set(key, []);
    });
    shifts.forEach(s => {
      const arr = map.get(s.date);
      if (arr) arr.push(s);
    });
    return map;
  }, [shifts, days]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
    }
  }, [weekStart]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const employeeId = e.dataTransfer.getData('employeeId');
    if (!employeeId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop || 0);
    const hour = Math.max(0, Math.min(23, Math.floor(y / HOUR_HEIGHT)));
    onDropEmployee(employeeId, dateStr, hour);
  };

  function layoutOverlapping(dayShifts: Shift[]): Map<string, { left: string; width: string }> {
    const layout = new Map<string, { left: string; width: string }>();
    if (dayShifts.length === 0) return layout;

    const sorted = [...dayShifts].sort((a, b) => timeToHour(a.startOfShift) - timeToHour(b.startOfShift));
    const groups: Shift[][] = [];
    let currentGroup: Shift[] = [];
    let groupEnd = 0;

    sorted.forEach(shift => {
      const start = timeToHour(shift.startOfShift);
      if (currentGroup.length === 0 || start < groupEnd) {
        currentGroup.push(shift);
        groupEnd = Math.max(groupEnd, timeToHour(shift.endOfShift));
      } else {
        groups.push(currentGroup);
        currentGroup = [shift];
        groupEnd = timeToHour(shift.endOfShift);
      }
    });
    if (currentGroup.length > 0) groups.push(currentGroup);

    groups.forEach(group => {
      const count = group.length;
      group.forEach((shift, idx) => {
        const widthPct = (100 / count) - 1;
        layout.set(shift.id, {
          left: `calc(${idx * (100 / count)}% + 1px)`,
          width: `calc(${widthPct}% - 1px)`,
        });
      });
    });

    return layout;
  }

  const isToday = (date: Date) => {
    const now = new Date();
    return date.toISOString().split('T')[0] === now.toISOString().split('T')[0];
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Scrollable area with sticky header inside */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: '600px' }}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          {/* Week nav row */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-1.5">
              <button onClick={onPrevWeek} className="p-1 rounded-md hover:bg-accent border border-border transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={onNextWeek} className="p-1 rounded-md hover:bg-accent border border-border transition-colors">
                <ChevronRight size={14} />
              </button>
              <button onClick={onToday} className="ml-1 px-2.5 py-1 text-xs font-semibold border border-border rounded-md hover:border-primary transition-colors bg-card">
                Today
              </button>
            </div>
            <span className="text-sm font-semibold text-foreground">{formatWeekRange(weekStart)}</span>
          </div>
          {/* Day labels row */}
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div className="border-r border-border" />
            {days.map((d, i) => (
              <div
                key={i}
                className={`text-center py-2 text-xs font-semibold border-r border-border ${isToday(d) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
              >
                <div>{DAY_LABELS[i]}</div>
                <div className={`text-lg font-bold ${isToday(d) ? 'text-primary' : 'text-foreground'}`}>{d.getDate()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid body */}
        <div className="grid relative" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          {/* Time labels + grid rows */}
          {HOURS.map(h => (
            <div key={h} className="contents">
              <div
                className="border-r border-b border-border text-[10px] text-muted-foreground pr-2 text-right flex items-start justify-end pt-0.5"
                style={{ height: HOUR_HEIGHT }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
              {days.map((d, di) => (
                <div
                  key={`${h}-${di}`}
                  className="border-r border-b border-border"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}
            </div>
          ))}

          {/* Shift blocks overlay */}
          {days.map((d, di) => {
            const dateStr = d.toISOString().split('T')[0];
            const dayShifts = shiftsByDay.get(dateStr) || [];
            const layout = layoutOverlapping(dayShifts);

            return (
              <div
                key={dateStr}
                className="absolute top-0"
                style={{
                  left: `calc(60px + (100% - 60px) / 7 * ${di})`,
                  width: `calc((100% - 60px) / 7)`,
                  height: 24 * HOUR_HEIGHT,
                }}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, dateStr)}
              >
                {dayShifts.map(shift => {
                  const emp = employeeMap.get(shift.employeeId);
                  const pos = layout.get(shift.id) || { left: '0%', width: '100%' };
                  return (
                    <ShiftBlock
                      key={shift.id}
                      shift={shift}
                      employeeName={emp?.fullName || 'Unknown'}
                      employeeStatus={emp?.status}
                      onClick={onShiftClick}
                      onResize={onShiftResize}
                      style={{ left: pos.left, width: pos.width }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
