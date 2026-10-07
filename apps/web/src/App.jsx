import { useEffect, useState } from 'react';
import './App.css';
import { login, getCurrentUser, logout } from './api/auth.js';
import Home from './pages/Home.jsx';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let active = true;

    async function restore() {
      try {
        const token = sessionStorage.getItem('windchime_token');
        if (!token) return;

        const user = await getCurrentUser(token, controller.signal);
        if (active) setSession({ user, token });
      } catch (error) {
        if (!active) return;

        if (error.status === 401) {
          sessionStorage.removeItem('windchime_token');
          setMessage('Your session expired. Please sign in again.');
        } else {
          setRestoreError(
            'We couldn’t verify your session. Check your connection and retry.'
          );
        }
      } finally {
        clearTimeout(timeout);
        if (active) setRestoring(false);
      }
    }

    restore();

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await login(username.trim(), password);
      sessionStorage.setItem('windchime_token', result.token);
      setSession(result);
      setPassword('');
      setMessage(`Welcome, ${result.user.name}!`);
    } catch (error) {
      setMessage(
        error instanceof TypeError || error.name === 'TimeoutError'
          ? 'Unable to reach sign-in. Please try again.'
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!session || loggingOut) return;

    setLoggingOut(true);
    setLogoutError('');

    try {
      await logout(session.token);
      sessionStorage.removeItem('windchime_token');
      setSession(null);
      setPassword('');
      setMessage('You’re signed out.');
    } catch (error) {
      setLogoutError(
        error instanceof TypeError || error.name === 'TimeoutError'
          ? 'Could not confirm sign-out. Please retry.'
          : error.message
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (restoring) {
    return (
      <main className="session-screen">
        <p role="status">Finding your corner…</p>
      </main>
    );
  }

  if (restoreError) {
    return (
      <main className="session-screen">
        <p role="alert">{restoreError}</p>
        <button className="btn btn-dark"
          onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    );
  }

  if (session) {
    return (
      <Home
        session={session}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        logoutError={logoutError}
      />
    );
  }

  return (
    <main className="windchime-auth">
      <section className="story-panel">
        <a className="wordmark signin-wordmark" href="/" aria-label="WindChime home">
          <img src="/logo-light.svg" alt="WindChime" width="236" height="45" />
        </a>

        <div className="chimes" aria-hidden="true">
          <div className="chime chime-one"><span>hello</span></div>
          <div className="chime chime-two"><span>you around?</span></div>
          <div className="chime chime-three"><span>always.</span></div>
        </div>

        <div className="story-copy">
          <p className="eyebrow">A LITTLE CLOSER, EVERY DAY</p>
          <h1>Let the<br />conversation<br /><em>find you.</em></h1>
          <p className="story-description">
            A place for familiar faces, unexpected friendships,
            and the little things worth sharing.
          </p>
        </div>

        <footer className="story-footer">
          <span>Make room for connection.</span>
          <span>WindChime © {new Date().getFullYear()}</span>
        </footer>
      </section>

      <section className="signin-panel">
        <div className="signin-content">
          <span className="welcome-symbol" aria-hidden="true">✳</span>
          <p className="eyebrow signin-eyebrow">YOUR CORNER OF THE INTERNET</p>
          <h2>Come on in.</h2>
          <p className="signin-description">
            Your next conversation starts here.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                className="form-control"
                placeholder="Your username"
                value={username}
                onChange={event => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                className="form-control"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              className="signin-button"
              type="submit"
              disabled={loading || Boolean(session)}
            >
              {loading ? 'Signing in…' : session ? 'Signed in' : 'Sign in'}
              <span aria-hidden="true">↗</span>
            </button>

            <div className="signin-divider">
              <span>or continue with</span>
            </div>

            <div className="provider-buttons">
              <button
                type="button"
                className="provider-button"
                onClick={() => setMessage('Google sign-in is not connected yet.')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.13H3.07v2.59A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.51l3.34-2.59Z" />
                  <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z" />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="provider-button"
                onClick={() => setMessage('Microsoft sign-in is not connected yet.')}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill="#F25022" d="M0 0h9v9H0z" />
                  <path fill="#7FBA00" d="M11 0h9v9h-9z" />
                  <path fill="#00A4EF" d="M0 11h9v9H0z" />
                  <path fill="#FFB900" d="M11 11h9v9h-9z" />
                </svg>
                <span>Microsoft</span>
              </button>
            </div>

            {message && (
              <p className="form-message" role="status">{message}</p>
            )}
          </form>

          <p className="signin-note">
            A moment shared can become a connection.
          </p>
        </div>

        <div className="signin-footer">
          Less noise. More people.
        </div>
      </section>
    </main>
  );
}

export default App;
