import { Link } from 'react-router-dom';
export default function Login({username,setUsername,password,setPassword,message,loading,session,handleSubmit}){
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
