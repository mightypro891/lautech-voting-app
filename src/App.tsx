import { useEffect, useState } from 'react';
import { Route, Routes, NavLink, Navigate } from 'react-router-dom';
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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    () => localStorage.getItem('adminAuthenticated') === 'true'
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xl font-semibold text-slate-900">LAUTECH AGRIC CLASS 29</p>
            <p className="text-sm text-slate-500">Anonymous daily voting system</p>
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
