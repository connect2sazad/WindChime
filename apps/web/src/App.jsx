import { useEffect, useState } from 'react';
import './App.css';
import { login, getCurrentUser, logout } from './api/auth.js';
import Home from './pages/Home.jsx';
import { Link } from 'react-router-dom';

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

  useEffect(() => {
    function expired(event) {
      if (event.detail !== session?.token) return;
      sessionStorage.removeItem('windchime_token');
      setSession(null);
      setPassword('');
      setLogoutError('');
      setMessage('Your session expired. Please sign in again.');
    }
    window.addEventListener('windchime:session-expired', expired);
    return () => window.removeEventListener('windchime:session-expired', expired);
  }, [session?.token]);

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
              <span aria-hidden="true">→</span>
            </button>

            <Link
              className="signin-button mt-3 text-decoration-none"
              to="/identity/new/"
            >
              Join the community
              <span aria-hidden="true">↗</span>
            </Link>

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
