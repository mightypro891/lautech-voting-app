import { useEffect, useState } from 'react';
import { Route, Routes, NavLink, Navigate, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import VotePage from './pages/VotePage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-slate-800 text-white shadow-soft' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
  }`;

function App() {
  const navigate = useNavigate();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    () => localStorage.getItem('adminAuthenticated') === 'true'
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const [adminPressStart, setAdminPressStart] = useState<number | null>(null);
  const [adminPressProgress, setAdminPressProgress] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleAdminLogin = () => {
    localStorage.setItem('adminAuthenticated', 'true');
    setIsAdminAuthenticated(true);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleAdminMouseDown = () => {
    setAdminPressStart(Date.now());
    setAdminPressProgress(0);

    const interval = setInterval(() => {
      if (adminPressStart) {
        const elapsed = Date.now() - adminPressStart;
        const progress = Math.min((elapsed / 5000) * 100, 100);
        setAdminPressProgress(progress);

        if (elapsed >= 5000) {
          clearInterval(interval);
          accessAdmin();
        }
      }
    }, 50);

    // Clear interval if mouse/finger is released early
    const clearProgress = () => {
      clearInterval(interval);
      setAdminPressStart(null);
      setAdminPressProgress(0);
    };

    document.addEventListener('mouseup', clearProgress, { once: true });
    document.addEventListener('mouseleave', clearProgress, { once: true });
    document.addEventListener('touchend', clearProgress, { once: true });
  };

  const handleAdminTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on mobile
    handleAdminMouseDown();
  };

  const accessAdmin = () => {
    if (isAdminAuthenticated) {
      navigate('/admin');
    } else {
      navigate('/admin');
    }
    setAdminPressStart(null);
    setAdminPressProgress(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">FACULTY OF AGRICULTURAL SCIENCE</p>
            <button
              type="button"
              onMouseDown={handleAdminMouseDown}
              onTouchStart={handleAdminTouchStart}
              className="relative bg-transparent p-0 text-sm text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition cursor-pointer overflow-hidden select-none"
              title="Long press for 5 seconds to access admin panel"
            >
              <span className="relative z-10">Anonymous daily voting system</span>
              {adminPressProgress > 0 && (
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-50"
                  style={{ width: `${adminPressProgress}%` }}
                />
              )}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap items-center gap-2">
              <NavLink to="/" className={navLinkClass}>Home</NavLink>
              <NavLink to="/vote" className={navLinkClass}>Vote</NavLink>
              <NavLink to="/results" className={navLinkClass}>Results</NavLink>
            </nav>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route
            path="/admin"
            element={
              isAdminAuthenticated ? (
                <AdminPage />
              ) : (
                <AdminLoginPage onLogin={handleAdminLogin} />
              )
            }
          />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
