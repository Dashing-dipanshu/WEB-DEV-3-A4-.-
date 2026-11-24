import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password); // GuestRoute redirects to "/" once the user is set
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue your conversations."
      footer={<>New here? <Link to="/register">Create an account</Link></>}
    >
      <form onSubmit={submit} className="auth-form">
        {error && <div className="auth-error" role="alert">{error}</div>}
        <label className="field">
          <span>Email</span>
          <input type="email" name="email" value={form.email} onChange={change} placeholder="you@college.edu" autoComplete="email" required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" name="password" value={form.password} onChange={change} placeholder="••••••••" autoComplete="current-password" required />
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthLayout>
  );
}
