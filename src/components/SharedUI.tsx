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

export const formatEUR = (n: number) =>
  `€${n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** @deprecated Use formatEUR instead */
export const formatAUD = formatEUR;

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

export const relativeTime = (iso: string) => {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return formatDate(iso).replace(/\s/g, ' ') + ' ' + new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
};
