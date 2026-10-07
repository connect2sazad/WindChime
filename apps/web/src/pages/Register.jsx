import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';
import './Register.css';
import { register, login } from '../api/auth.js';

export default function Register() {
    const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm_password: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [accountCreated, setAccountCreated] = useState(false);
    const pending = useRef(false);
    const navigate = useNavigate();

    function handleChange(event) {
        const { name, value } = event.target;
        setForm(previous => ({ ...previous, [name]: value }));
        setMessage('');
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (pending.current) return;
        if (!accountCreated && form.password !== form.confirm_password) {
            setMessage('Your passwords do not match.');
            return;
        }
        pending.current = true;
        setLoading(true);
        setMessage('');
        let signedIn = false;
        try {
            const result = accountCreated
                ? await login(form.username.trim(), form.password)
                : await register(form.name.trim(), form.username.trim(), form.email.trim(), form.password, form.confirm_password);
            signedIn = true;
            sessionStorage.setItem('windchime_token', result.token);
            setForm(previous => ({ ...previous, password: '', confirm_password: '' }));
            navigate('/', { replace: true });
        } catch (error) {
            if (error.accountCreated || signedIn) setAccountCreated(true);
            setMessage(signedIn ? 'Signed in, but this browser could not save your session. Please use the sign-in page.'
                : error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Could not confirm account creation or sign-in. Try the sign-in page before submitting again.'
                    : error.message);
        } finally {
            pending.current = false;
            setLoading(false);
        }
    }

    return (
        <main className="register-page">
            <section className="register-card">
                <div className="signin-content register-content">
                    <div className="register-topbar">
                        <span className="welcome-symbol" aria-hidden="true">✳</span>
                        <Link className="register-back" to="/">
                            <span aria-hidden="true">←</span> Sign in
                        </Link>
                    </div>

                    <header className="register-heading">
                        <p className="eyebrow signin-eyebrow">MAKE YOURSELF AT HOME</p>
                        <h2>Start with <em>hello.</em></h2>
                        <p className="signin-description">
                            A small hello. A whole new connection.
                        </p>
                    </header>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="register-name" className="form-label">
                                Your name
                            </label>
                            <input
                                id="register-name"
                                name="name"
                                disabled={loading || accountCreated}
                                className="form-control"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="How should we call you?"
                                autoComplete="name"
                                minLength={3}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="register-username" className="form-label">
                                Username
                            </label>
                            <input
                                id="register-username"
                                name="username"
                                disabled={loading || accountCreated}
                                className="form-control"
                                value={form.username}
                                onChange={handleChange}
                                placeholder="Choose your username"
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                minLength={3}
                                maxLength={50}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="register-email" className="form-label">
                                Email
                            </label>
                            <input
                                id="register-email"
                                name="email"
                                disabled={loading || accountCreated}
                                type="email"
                                className="form-control"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                autoComplete="email"
                                maxLength={150}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="register-password" className="form-label">
                                Password
                            </label>
                            <input
                                id="register-password"
                                name="password"
                                disabled={loading}
                                type="password"
                                className="form-control"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Create a password"
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="register-confirm" className="form-label">
                                Confirm password
                            </label>
                            <input
                                id="register-confirm"
                                name="confirm_password"
                                disabled={loading}
                                type="password"
                                className="form-control"
                                value={form.confirm_password}
                                onChange={handleChange}
                                placeholder="Enter it again"
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <button
                            className="signin-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (accountCreated ? 'Signing you in…' : 'Creating & signing you in…') : accountCreated ? 'Retry sign in' : 'Create account and join the community'}
                            <span aria-hidden="true">↗</span>
                        </button>

                        {message && (
                            <p className="form-message" role="status">
                                {message}
                            </p>
                        )}
                    </form>

                    <p className="register-footer">
                        Already part of WindChime? <Link to="/">Sign in</Link>
                    </p>


                </div>
            </section>
        </main>
    );
}