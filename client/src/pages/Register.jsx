import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join your classmates on ChatBuddy."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form onSubmit={submit} className="auth-form">
        {error && <div className="auth-error" role="alert">{error}</div>}
        <label className="field">
          <span>Full name</span>
          <input name="name" value={form.name} onChange={change} placeholder="Aarav Sharma" autoComplete="name" required autoFocus />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" name="email" value={form.email} onChange={change} placeholder="you@college.edu" autoComplete="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" name="password" value={form.password} onChange={change} placeholder="At least 6 characters" autoComplete="new-password" required />
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating account…' : 'Sign up'}</button>
      </form>
    </AuthLayout>
  );
}
