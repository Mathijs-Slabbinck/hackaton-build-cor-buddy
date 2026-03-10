import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, LogOut, Clock, Download, FileText, PlusCircle, Edit, RefreshCw, Upload, Trash2, Scan, CheckCircle, Link, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCOR, makeEntry } from '@/contexts/CORContext';
import { StatusBadge, formatEUR, formatDate, PaidBar, relativeTime } from '@/components/SharedUI';
import { useState } from 'react';

const ACTIVITY_ICONS: Record<string, { icon: any; color: string }> = {
  created: { icon: PlusCircle, color: '#009A93' },
  updated: { icon: Edit, color: '#44C8F5' },
  status_changed: { icon: RefreshCw, color: '#FFED00' },
  file_uploaded: { icon: Upload, color: '#44C8F5' },
  image_uploaded: { icon: Upload, color: '#44C8F5' },
  file_removed: { icon: Trash2, color: '#EC008C' },
  image_removed: { icon: Trash2, color: '#EC008C' },
  bill_extracted: { icon: Scan, color: '#44C8F5' },
  bill_applied: { icon: CheckCircle, color: '#009A93' },
  stock_linked: { icon: Link, color: '#856A00' },
  note_added: { icon: MessageSquare, color: '#6B7280' },
};

const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 mt-5 mb-3">
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap">{label}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const MyCorDetailPage = () => {
  const { corId } = useParams<{ corId: string }>();
  const navigate = useNavigate();
  const { currentUser, currentCompany, logout, getCompanyById } = useAuth();
  const { getCORById, updateCOR } = useCOR();
  const [noteText, setNoteText] = useState('');
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const cor = corId ? getCORById(corId) : undefined;
  if (!cor) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Record not found.</p>
    </div>
  );

  const reportingCompany = getCompanyById(cor.companyId || '');
  const total = cor.price + cor.price * cor.vat / 100;
  const sortedLog = [...(cor.activityLog || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleAddNote = () => {
    if (!noteText.trim() || !currentUser || !currentCompany) return;
    const currentCor = getCORById(cor.id);
    if (!currentCor) return;
    const entry = makeEntry('note_added', noteText.trim());
    entry.actor = `${currentUser.fullName} (external — ${currentCompany.companyName})`;
    const newLog = [...(currentCor.activityLog || []), entry];
    updateCOR(cor.id, { activityLog: newLog });
    setNoteText('');
  };

  const toggleDiff = (id: string) => {
    setExpandedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/my-cors')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">COR</span>
            </div>
            <span className="font-bold text-[22px]">track</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            {currentUser?.avatarInitials}
          </div>
          <div>
            <p className="text-sm font-medium">{currentUser?.fullName}</p>
            <p className="text-[11px] text-muted-foreground">{currentCompany?.companyName}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className="px-6 py-3 flex items-center gap-2 text-[13px]" style={{ background: 'hsl(56 100% 97%)', borderBottom: '2px solid #FFED00' }}>
        <Eye size={16} className="text-muted-foreground" />
        You are viewing this record as an external reviewer. Shared by <strong>{reportingCompany?.companyName || 'Unknown'}</strong>.
      </div>

      <div className="max-w-6xl mx-auto p-8 grid grid-cols-5 gap-6">
        {/* Left 60% */}
        <div className="col-span-3 space-y-6">
          {/* Card 1 — Details */}
          <div className="card-cor p-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[22px] font-bold">{cor.corName}</h1>
              <StatusBadge status={cor.status} />
            </div>
            <p className="text-sm text-muted-foreground mb-4">{cor.corNumber} · Created {formatDate(cor.creationDate)}</p>

            <SectionDivider label="Client Information" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="label-uppercase text-[11px] mb-1">Client Kind</p><p>{cor.clientKind}</p></div>
              <div><p className="label-uppercase text-[11px] mb-1">Client Name</p><p>{cor.clientName}</p></div>
              <div className="col-span-2"><p className="label-uppercase text-[11px] mb-1">VAT / ABN</p><p>{cor.vatNumber || '—'}</p></div>
            </div>

            <SectionDivider label="Product / Service" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="label-uppercase text-[11px] mb-1">Product Name</p><p>{cor.productName}</p></div>
              <div><p className="label-uppercase text-[11px] mb-1">Product Type</p><p>{cor.productType}</p></div>
              <div className="col-span-2"><p className="label-uppercase text-[11px] mb-1">Location</p><p>{cor.location}</p></div>
            </div>

            <SectionDivider label="Financials" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="label-uppercase text-[11px] mb-1">Price (excl VAT)</p><p>{formatEUR(cor.price)}</p></div>
              <div><p className="label-uppercase text-[11px] mb-1">VAT %</p><p>{cor.vat}%</p></div>
              <div><p className="label-uppercase text-[11px] mb-1">Total incl. VAT</p><p>{formatEUR(total)}</p></div>
              <div><p className="label-uppercase text-[11px] mb-1">Paid Percentage</p><div className="w-32"><PaidBar pct={cor.paidPercentage} /></div></div>
            </div>
          </div>

          {/* Card 2 — Files & Images (read only) */}
          <div className="card-cor p-6">
            <h3 className="font-bold text-base mb-4">Files & Images</h3>
            {cor.pictureUrls.length === 0 && cor.fileUrls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments on this record.</p>
            ) : (
              <>
                {cor.pictureUrls.length > 0 && (
                  <div className="mb-4">
                    <p className="label-uppercase text-[11px] mb-2">Images</p>
                    <div className="grid grid-cols-3 gap-3">
                      {cor.pictureUrls.map((url, i) => (
                        <div key={i} className="rounded-lg overflow-hidden h-[100px] cursor-pointer" onClick={() => setLightboxUrl(url)}>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {cor.fileUrls.length > 0 && (
                  <div>
                    <p className="label-uppercase text-[11px] mb-2">Documents</p>
                    <div className="space-y-2">
                      {cor.fileUrls.map((url, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                          <FileText size={16} className="text-primary shrink-0" />
                          <span className="text-sm truncate flex-1">Document-{i + 1}.pdf</span>
                          <a href={url} download className="text-primary hover:underline text-xs"><Download size={14} /></a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right 40% — Activity */}
        <div className="col-span-2">
          <div className="card-cor p-6">
            <h3 className="font-bold text-base mb-4">Activity Log</h3>

            {/* Add note */}
            <div className="flex gap-2 mb-6">
              <input
                className="w-full border-[1.5px] border-border rounded-lg px-3 py-2 text-sm focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20 flex-1"
                placeholder="Add a note..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              />
              <button onClick={handleAddNote} className="bg-primary text-primary-foreground font-semibold rounded-lg px-4 py-2 text-sm hover:bg-[#007A74] transition-colors whitespace-nowrap">Add note</button>
            </div>

            {sortedLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock size={36} className="text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No activity recorded yet</p>
              </div>
            ) : (
              <div className="relative">
                {sortedLog.map((entry, i) => {
                  const config = ACTIVITY_ICONS[entry.action] || ACTIVITY_ICONS.note_added;
                  const IconComp = config.icon;
                  const hasDiff = entry.diff && entry.diff.length > 0;
                  const isExpanded = expandedDiffs.has(entry.id);
                  return (
                    <div key={entry.id} className="flex gap-3 relative">
                      {i < sortedLog.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: config.color + '20' }}>
                        <IconComp size={14} style={{ color: config.color }} />
                      </div>
                      <div className="pb-5 min-w-0 flex-1">
                        <p className="text-sm font-semibold">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">{entry.actor} · {relativeTime(entry.timestamp)}</p>
                        {hasDiff && (
                          <>
                            <button onClick={() => toggleDiff(entry.id)} className="text-xs mt-1 hover:underline flex items-center gap-1" style={{ color: '#44C8F5' }}>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              {isExpanded ? 'Hide changes' : `Show changes (${entry.diff!.length} field${entry.diff!.length > 1 ? 's' : ''})`}
                            </button>
                            {isExpanded && (
                              <div className="mt-2 bg-muted rounded-lg p-3 space-y-1.5">
                                {entry.diff!.map((d, di) => (
                                  <div key={di} className="flex items-center gap-1.5 flex-wrap text-xs">
                                    <span className="font-semibold min-w-[100px]">{d.field}</span>
                                    <span className="line-through px-1.5 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#EC008C' }}>{d.from}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="px-1.5 py-0.5 rounded" style={{ background: '#EAF5F5', color: '#009A93' }}>{d.to}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <>
          <div className="fixed inset-0 bg-foreground/80 z-50 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
            <img src={lightboxUrl} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
          </div>
        </>
      )}
    </div>
  );
};

export default MyCorDetailPage;
