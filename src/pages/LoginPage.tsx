import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { session, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to={session.role === 'external_manager' ? '/my-cors' : '/cor'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const success = login(username, password);
    if (success) {
      // Re-read session to determine redirect
      const rawS = localStorage.getItem('cortrack_session');
      if (rawS) {
        const sess = JSON.parse(rawS);
        navigate(sess.role === 'external_manager' ? '/my-cors' : '/cor');
      }
    } else {
      setError('Invalid username or password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-[420px] bg-card rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.10)] p-12 px-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">COR</span>
          </div>
          <span className="font-bold text-[22px]">track</span>
        </div>
        <p className="text-center text-sm text-muted-foreground mb-8">Sign in to your company workspace</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-uppercase block mb-1.5">Username</label>
            <input
              className="w-full border-[1.5px] border-border rounded-lg px-3 py-2.5 text-sm focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20 transition"
              value={username} onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="label-uppercase block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="w-full border-[1.5px] border-border rounded-lg px-3 py-2.5 text-sm pr-10 focus:border-blue focus:outline focus:outline-[3px] focus:outline-blue/20 transition"
                value={password} onChange={e => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-[#007A74] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Sign in
          </button>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}
        </form>

        <div className="mt-6 rounded-[10px] p-3 text-[12px] leading-relaxed" style={{ background: 'hsl(177 33% 94%)', color: '#009A93' }}>
          <p className="font-semibold mb-1">Demo accounts:</p>
          <p><strong>admin</strong> / admin — Owner (Alpha Build Group)</p>
          <p><strong>maria</strong> / maria123 — Manager (Alpha Build Group)</p>
          <p><strong>ben</strong> / ben123 — Owner (Beta Electrical Services)</p>
          <p><strong>sophie</strong> / sophie123 — External Manager (Beta Electrical)</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
