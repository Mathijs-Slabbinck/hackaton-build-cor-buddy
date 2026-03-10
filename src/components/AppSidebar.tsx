import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Briefcase, Users, Package, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cor', icon: FileText, label: 'COR' },
  { to: '/projects', icon: Briefcase, label: 'Projects' },
  { to: '/employees', icon: Users, label: 'Employee Planner' },
  { to: '/stock', icon: Package, label: 'Stock Manager' },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const { session, logout, isOwner } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = session ? (() => {
    const parts = session.fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return session.fullName.slice(0, 2).toUpperCase();
  })() : 'A';

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar flex flex-col p-6 pb-4 z-50">
      <NavLink to="/dashboard" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">COR</span>
        </div>
        <span className="text-sidebar-foreground font-bold text-[22px]">track</span>
      </NavLink>
      <div className="h-px bg-sidebar-accent mb-4" />

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-sidebar-accent-foreground hover:bg-sidebar-accent'
              }`
            }>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        {isOwner() && (
          <NavLink to="/users"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-sidebar-accent-foreground hover:bg-sidebar-accent'
              }`
            }>
            <ShieldCheck size={18} />
            Users & Access
          </NavLink>
        )}
      </nav>

      <div className="h-px bg-sidebar-accent mb-3" />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground text-xs font-semibold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sidebar-foreground text-[13px] block truncate">{session?.fullName || 'User'}</span>
          <span className="text-[11px] block truncate" style={{ color: '#9CA3AF' }}>{session?.companyName || ''}</span>
          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 text-white ${session?.role === 'Owner' ? 'bg-[#009A93]' : 'bg-[#44C8F5]'}`}>
            {session?.role || ''}
          </span>
        </div>
        <button onClick={handleLogout} className="text-sidebar-accent-foreground hover:text-sidebar-foreground transition-colors"><LogOut size={16} /></button>
      </div>
    </aside>
  );
};

export default AppSidebar;
