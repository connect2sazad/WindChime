import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { completePasswordRecovery, requestPasswordRecovery } from '../api/index.js';

export default function PasswordRecovery() {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState('email');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const pending = useRef(false);
    const navigate = useNavigate();

    async function submit(event) {
        event.preventDefault();
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setMessage('');
        try {
            if (step === 'email') {
                await requestPasswordRecovery(email.trim().toLowerCase());
                setStep('code');
                setMessage('If an account matches that email, a recovery code has been sent.');
            } else {
                await completePasswordRecovery(
                    email.trim().toLowerCase(),
                    code,
                    password,
                    confirmPassword,
                );
                setStep('done');
                setMessage('Your password has been updated. Sign in with your new password.');
            }
        } catch (error) {
            setMessage(
                error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Unable to reach WindChime. Please try again.'
                    : error.message,
            );
        } finally {
            pending.current = false;
            setBusy(false);
        }
    }

    return (
        <main className="register-page">
            <section className="register-card recovery-card">
                <div className="signin-content register-content">
                    <div className="register-topbar">
                        <img src="/logo.svg" width="190" height="36" alt="WindChime" />
                        <Link className="register-back" to="/">
                            ← Sign in
                        </Link>
                    </div>
                    <header className="register-heading">
                        <p className="eyebrow signin-eyebrow">LET’S GET YOU BACK IN</p>
                        <h2>
                            {step === 'done' ? 'You’re all set.' : <>Find your way <em>home.</em></>}
                        </h2>
                        <p className="signin-description">
                            {step === 'email'
                                ? 'Enter your account email and we’ll send a short-lived recovery code.'
                                : step === 'code'
                                  ? `Enter the six-digit code sent to ${email}.`
                                  : 'Your account is ready for a fresh sign in.'}
                        </p>
                    </header>

                    {step !== 'done' && (
                        <form className="recovery-form" onSubmit={submit}>
                            <div>
                                <label className="form-label" htmlFor="recovery-email">Email</label>
                                <input
                                    id="recovery-email"
                                    className="form-control"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    disabled={busy || step === 'code'}
                                    required
                                />
                            </div>
                            {step === 'code' && (
                                <>
                                    <div>
                                        <label className="form-label" htmlFor="recovery-code">Recovery code</label>
                                        <input
                                            id="recovery-code"
                                            className="form-control register-code"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            pattern="[0-9]{6}"
                                            maxLength={6}
                                            value={code}
                                            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                                            disabled={busy}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label" htmlFor="recovery-password">New password</label>
                                        <input
                                            id="recovery-password"
                                            className="form-control"
                                            type="password"
                                            autoComplete="new-password"
                                            minLength={6}
                                            maxLength={100}
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            disabled={busy}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label" htmlFor="recovery-confirm">Confirm new password</label>
                                        <input
                                            id="recovery-confirm"
                                            className="form-control"
                                            type="password"
                                            autoComplete="new-password"
                                            minLength={6}
                                            maxLength={100}
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                            disabled={busy}
                                            required
                                        />
                                    </div>
                                </>
                            )}
                            <button className="signin-button" disabled={busy || (step === 'code' && code.length !== 6)}>
                                {busy ? 'Please wait…' : step === 'email' ? 'Send recovery code' : 'Update password'}
                                <span aria-hidden="true">→</span>
                            </button>
                            {message && <p className="form-message" role="status">{message}</p>}
                            {import.meta.env.DEV && step === 'code' && (
                                <p className="register-dev-note">Local development codes are saved in Identity’s private mail outbox.</p>
                            )}
                            {step === 'code' && (
                                <button className="recovery-change-email" type="button" onClick={() => { setStep('email'); setCode(''); setMessage(''); }}>
                                    Use a different email
                                </button>
                            )}
                        </form>
                    )}

                    {step === 'done' && (
                        <button className="signin-button" type="button" onClick={() => navigate('/', { replace: true })}>
                            Return to sign in <span aria-hidden="true">→</span>
                        </button>
                    )}
                    <p className="register-footer">A fresh start, one small step at a time.</p>
                </div>
            </section>
        </main>
    );
}
