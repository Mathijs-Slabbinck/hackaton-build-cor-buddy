import { useNavigate } from 'react-router-dom';
import { FileText, Building, MapPin, Calendar, Euro, Paperclip, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCOR } from '@/contexts/CORContext';
import { StatusBadge, formatEUR, formatDate } from '@/components/SharedUI';

const MyCorListPage = () => {
  const navigate = useNavigate();
  const { currentUser, currentCompany, logout, getCompanyById } = useAuth();
  const { cors } = useCOR();

  const myCors = cors.filter(c =>
    (c.assignedExternalManagers || []).some(a => a.userId === currentUser?.id)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">COR</span>
          </div>
          <span className="font-bold text-[22px]">track</span>
        </div>
        <span className="font-semibold text-sm">My Assigned Records</span>
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

      <div className="max-w-4xl mx-auto p-8">
        <p className="text-sm text-muted-foreground mb-6">Records shared with you by other companies</p>

        {myCors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText size={48} className="text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No records have been assigned to you yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myCors.map(cor => {
              const reportingCompany = getCompanyById(cor.companyId || '');
              const total = cor.price + cor.price * cor.vat / 100;
              return (
                <div
                  key={cor.id}
                  onClick={() => navigate(`/my-cors/${cor.id}`)}
                  className="card-cor p-5 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-muted-foreground">{cor.corNumber}</span>
                    <StatusBadge status={cor.status} />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{cor.corName}</h3>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building size={14} />
                      <span className="text-[11px] uppercase tracking-wider font-semibold mr-1">Reported by</span>
                      {reportingCompany?.companyName || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2"><MapPin size={14} />{cor.location}</div>
                    <div className="flex items-center gap-2"><Calendar size={14} />{formatDate(cor.corDate)}</div>
                    <div className="flex items-center gap-2"><Euro size={14} />{formatEUR(total)}</div>
                    <div className="flex items-center gap-2">
                      <Paperclip size={14} />
                      <span className="text-xs">{cor.fileUrls.length} files · {cor.pictureUrls.length} images</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCorListPage;
