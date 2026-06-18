// src/pages/Login.jsx — login + self-registration (vendors, guests, venue owners).
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { runValidation, isBlank, isEmail, FieldError } from '../validation.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'guest' });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function validate() {
    const rules = {
      email: (v) => (isBlank(v) ? 'Email is required' : !isEmail(v) && 'Enter a valid email address'),
      password: (v) => (isBlank(v) ? 'Password is required' : String(v).length < 6 && 'Password must be at least 6 characters'),
    };
    if (mode === 'register') {
      rules.name = (v) => isBlank(v) && 'Please enter your full name';
    }
    return runValidation(form, rules);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setErrors({});
  }

  function quickFill(email) {
    setForm({ ...form, email, password: 'password123' });
    setErrors({});
    setMode('login');
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">Pop<span>Eyez</span></div>
        <p className="tagline">Pop-up café event management, end to end.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={submit} noValidate>
          {mode === 'register' && (
            <>
              <div className="field">
                <label>Full name</label>
                <input className={errors.name ? 'invalid' : ''} value={form.name} onChange={set('name')} placeholder="Jane Doe" />
                <FieldError msg={errors.name} />
              </div>
              <div className="field">
                <label>I am a…</label>
                <select value={form.role} onChange={set('role')}>
                  <option value="guest">Guest</option>
                  <option value="vendor">Vendor / Supplier</option>
                  <option value="venue_owner">Venue Owner</option>
                  <option value="organizer">Event Organizer</option>
                </select>
              </div>
            </>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" className={errors.email ? 'invalid' : ''} value={form.email} onChange={set('email')} placeholder="you@popeyez.com" />
            <FieldError msg={errors.email} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" className={errors.password ? 'invalid' : ''} value={form.password} onChange={set('password')} placeholder="••••••••" />
            <FieldError msg={errors.password} />
          </div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>New here? <button onClick={() => switchMode('register')}>Create an account</button></>
          ) : (
            <>Have an account? <button onClick={() => switchMode('login')}>Log in</button></>
          )}
        </div>

        <div className="demo-box">
          <b>Demo accounts</b> — password <b>password123</b> (tap to fill):<br />
          <a onClick={() => quickFill('organizer@popeyez.com')} style={{ cursor: 'pointer' }}>organizer@popeyez.com</a> ·{' '}
          <a onClick={() => quickFill('staff1@popeyez.com')} style={{ cursor: 'pointer' }}>staff1@popeyez.com</a> ·{' '}
          <a onClick={() => quickFill('vendor1@popeyez.com')} style={{ cursor: 'pointer' }}>vendor1@popeyez.com</a> ·{' '}
          <a onClick={() => quickFill('owner1@popeyez.com')} style={{ cursor: 'pointer' }}>owner1@popeyez.com</a> ·{' '}
          <a onClick={() => quickFill('guest1@popeyez.com')} style={{ cursor: 'pointer' }}>guest1@popeyez.com</a>
        </div>
      </div>
    </div>
  );
}
