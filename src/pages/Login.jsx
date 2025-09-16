import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [checking, setChecking] = React.useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const nextPath = React.useMemo(() => {
    try {
      const params = new URLSearchParams(location.search);
      const next = params.get('next');
      if (next && typeof next === 'string' && next.startsWith('/')) {
        return next;
      }
    } catch {}
    return '/admin';
  }, [location.search]);

  React.useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const res = await fetch('/admin/api/session', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.status === 200) {
          if (!cancelled) navigate(nextPath, { replace: true });
          return;
        }
      } catch {}
      if (!cancelled) setChecking(false);
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [navigate, nextPath]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (pending || checking) return;
    setPending(true);
    setError('');
    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 200) {
        navigate(nextPath, { replace: true });
        return;
      }
      if (res.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(`Login failed (${res.status}).`);
      }
    } catch (err) {
      setError(err?.message || 'Unable to log in.');
    } finally {
      setPending(false);
    }
  };

  if (checking) {
    return (
      <div className="flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-20 text-gray-800">
        <p className="text-sm text-gray-500">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800">
      <div className="inline-flex items-center gap-2 mb-2 mt-10">
        <p className="prata-regular text-3xl">Admin Login</p>
        <hr className="border-none h-[1.5px] w-8 bg-gray-800" />
      </div>
      {error && <div className="w-full text-sm text-red-600">{error}</div>}
      <form onSubmit={onSubmit} className="w-full flex flex-col gap-4">
        <input
          className="w-full px-3 py-2 border border-gray-800"
          type="email"
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full px-3 py-2 border border-gray-800"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-black text-white font-light px-8 py-2 mt-2 disabled:opacity-60"
          disabled={pending}
        >
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
