import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminLoginPageProps {
  onLogin: () => void;
}

const ADMIN_USERNAME = 'mightypro891';

export default function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username.trim() === ADMIN_USERNAME) {
      onLogin();
      navigate('/admin');
    } else {
      setError('Invalid admin username. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-4xl border border-slate-200 bg-white p-10 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Admin login</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Enter the admin username to access the dashboard.
      </p>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
          <input
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError('');
            }}
            className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            placeholder="Enter admin username"
          />
        </div>
        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          Sign in
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Use username <span className="font-semibold">{ADMIN_USERNAME}</span> to access the admin dashboard.
        </p>
      </form>
    </div>
  );
}
