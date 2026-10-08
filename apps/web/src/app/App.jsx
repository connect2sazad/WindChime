import useSessionController from '../modules/identity/session.js';
import { Login } from '../modules/identity/index.js';
import SignedInRoutes from './routes.jsx';
export default function App(){
 const auth=useSessionController();
 if(auth.restoring)return <main className="session-screen"><p role="status">Finding your corner…</p></main>;
 if(auth.restoreError)return <main className="session-screen"><p role="alert">{auth.restoreError}</p><button className="btn btn-dark" onClick={()=>window.location.reload()}>Retry</button></main>;
 return auth.session?<SignedInRoutes auth={auth}/>:<Login {...auth}/>;
}
