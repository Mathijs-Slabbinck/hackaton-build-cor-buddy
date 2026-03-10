export const StatusBadge = ({ status }: { status: string }) => {
  const cls =
    status === 'Paid' ? 'status-paid' :
    status === 'Ongoing' ? 'status-ongoing' :
    status === 'Cancelled' ? 'status-cancelled' :
    status === 'Active' ? 'status-active' :
    status === 'On Leave' ? 'status-onleave' :
    status === 'On Hold' ? 'status-onhold' :
    status === 'Completed' ? 'status-completed' :
    'status-completed';
  return <span className={cls}>{status}</span>;
};

export const formatAUD = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const PaidBar = ({ pct }: { pct: number }) => (
  <div>
    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
    <span className="text-xs text-muted-foreground mt-0.5 block">{pct}%</span>
  </div>
);
