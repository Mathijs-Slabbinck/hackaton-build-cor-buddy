import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Package, LogOut } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cor', icon: FileText, label: 'COR' },
  { to: '/employees', icon: Users, label: 'Employee Planner' },
  { to: '/stock', icon: Package, label: 'Stock Manager' },
];

const AppSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('cortrack_auth');
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar flex flex-col p-6 pb-4 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">COR</span>
        </div>
        <span className="text-sidebar-foreground font-bold text-[22px]">track</span>
      </div>
      <div className="h-px bg-sidebar-accent mb-4" />

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-accent-foreground hover:bg-sidebar-accent'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom user */}
      <div className="h-px bg-sidebar-accent mb-3" />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground text-xs font-semibold">
          A
        </div>
        <span className="text-sidebar-foreground text-[13px] flex-1">Admin</span>
        <button onClick={handleLogout} className="text-sidebar-accent-foreground hover:text-sidebar-foreground transition-colors">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
