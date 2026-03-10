import { useRef, useCallback } from 'react';
import type { Shift } from '@/contexts/ShiftContext';

const PALETTE_BG = [
  'bg-blue-200 border-blue-400 text-blue-900',
  'bg-emerald-200 border-emerald-400 text-emerald-900',
  'bg-purple-200 border-purple-400 text-purple-900',
  'bg-orange-200 border-orange-400 text-orange-900',
  'bg-teal-200 border-teal-400 text-teal-900',
  'bg-amber-200 border-amber-400 text-amber-900',
  'bg-indigo-200 border-indigo-400 text-indigo-900',
  'bg-cyan-200 border-cyan-400 text-cyan-900',
];

const PALETTE_DOT = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-indigo-500',
  'bg-cyan-500',
];

const ON_LEAVE_BG = 'bg-red-200 border-red-400 text-red-900';
const ON_LEAVE_DOT = 'bg-red-500';

export function hashToIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % PALETTE_BG.length;
}

export function getEmployeeDotColor(employeeId: string, status?: string): string {
  if (status === 'On Leave') return ON_LEAVE_DOT;
  return PALETTE_DOT[hashToIndex(employeeId)];
}

export function getEmployeeBlockColor(employeeId: string, status?: string): string {
  if (status === 'On Leave') return ON_LEAVE_BG;
  return PALETTE_BG[hashToIndex(employeeId)];
}

function timeToHour(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

interface ShiftBlockProps {
  shift: Shift;
  employeeName: string;
  employeeStatus?: string;
  onClick: (shift: Shift) => void;
  onResize: (shiftId: string, newEndTime: string) => void;
  style?: React.CSSProperties;
}

const HOUR_HEIGHT = 60;

export default function ShiftBlock({ shift, employeeName, employeeStatus, onClick, onResize, style }: ShiftBlockProps) {
  const resizing = useRef(false);
  const startY = useRef(0);
  const startHour = useRef(0);

  const startHourVal = timeToHour(shift.startOfShift);
  const endHourVal = timeToHour(shift.endOfShift);
  const top = startHourVal * HOUR_HEIGHT;
  const height = Math.max((endHourVal - startHourVal) * HOUR_HEIGHT, HOUR_HEIGHT / 2);

  const colorClass = getEmployeeBlockColor(shift.employeeId, employeeStatus);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizing.current = true;
    startY.current = e.clientY;
    startHour.current = endHourVal;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const deltaY = ev.clientY - startY.current;
      const deltaHours = Math.round(deltaY / HOUR_HEIGHT);
      const newEnd = Math.max(startHourVal + 1, Math.min(24, startHour.current + deltaHours));
      const h = Math.floor(newEnd);
      const m = Math.round((newEnd - h) * 60);
      const newEndTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (newEndTime !== shift.endOfShift) {
        onResize(shift.id, newEndTime);
      }
    };

    const handleMouseUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [endHourVal, startHourVal, shift.id, shift.endOfShift, onResize]);

  return (
    <div
      className={`absolute rounded-md border-l-[3px] px-1.5 py-0.5 cursor-pointer overflow-hidden select-none text-xs leading-tight ${colorClass}`}
      style={{ top, height, left: style?.left, width: style?.width }}
      onClick={(e) => { e.stopPropagation(); onClick(shift); }}
    >
      <div className="font-semibold truncate">{employeeName}</div>
      <div className="truncate opacity-75">{shift.project}</div>
      <div className="opacity-60">{shift.startOfShift}–{shift.endOfShift}</div>
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black/10 rounded-b"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
