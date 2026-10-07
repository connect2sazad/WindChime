import { useEffect,useRef,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { register,verifyRegistration,resendRegistration } from '../api/auth.js';
import useAvailability from '../hooks/useAvailability.js';
import '../App.css';
import './Register.css';
export default function Register(){
 const [form,setForm]=useState({name:'',username:'',email:'',password:'',confirm_password:''});
 const [verification,setVerification]=useState(null);const [code,setCode]=useState('');const [wait,setWait]=useState(0);
 const [loading,setLoading]=useState(false);const [message,setMessage]=useState('');const pending=useRef(false);const navigate=useNavigate();
 const username=useAvailability('username',form.username,!verification);const email=useAvailability('email',form.email,!verification);
 useEffect(()=>{if(!verification)return;const timer=setInterval(()=>setWait(value=>Math.max(0,value-1)),1000);return()=>clearInterval(timer);},[verification]);
 function change(event){const {name,value}=event.target;setForm(previous=>({...previous,[name]:name==='username'?value.toLowerCase():value}));setMessage('');}
 async function submit(event){
  event.preventDefault();if(pending.current)return;
  if(!verification){if(username.status!=='available'||email.status!=='available'){setMessage('Resolve username and email availability first');return;}if(form.password!==form.confirm_password){setMessage('Passwords do not match');return;}}
  pending.current=true;setLoading(true);setMessage('');
  try{
   if(verification){const result=await verifyRegistration(verification.verification_id,code);sessionStorage.setItem('windchime_token',result.token);navigate('/',{replace:true});}
   else{const result=await register(form.name.trim(),form.username.trim(),form.email.trim().toLowerCase(),form.password,form.confirm_password);setVerification(result);setWait(60);setForm(previous=>({...previous,password:'',confirm_password:''}));}
  }catch(e){setMessage(e.message);}
  finally{pending.current=false;setLoading(false);}
 }
 async function resend(){if(wait||pending.current)return;pending.current=true;setLoading(true);setMessage('');try{setVerification(await resendRegistration(verification.verification_id));setWait(60);setCode('');setMessage('A new code is ready');}catch(e){setMessage(e.message);}finally{pending.current=false;setLoading(false);}}
 return <main className="register-page"><section className="register-card"><div className="signin-content register-content">
  <div className="register-topbar"><img src="/logo.svg" width="190" height="36" alt="WindChime"/><Link className="register-back" to="/">← Sign in</Link></div>
  <header className="register-heading"><p className="eyebrow signin-eyebrow">MAKE YOURSELF AT HOME</p><h2>{verification?'Check your inbox.':<>Start with <em>hello.</em></>}</h2><p className="signin-description">{verification?`Enter the six-digit code for ${verification.email}`:'A small hello. A whole new connection.'}</p></header>
  {verification?<>
   {verification.delivery==='outbox'&&<p className="register-dev-note">Development mode: your code is in the private local mail outbox.</p>}
   <form className="register-verification" onSubmit={submit}><div><label className="form-label" htmlFor="verification-code">Verification code</label><input className="form-control register-code" id="verification-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} disabled={loading} required/></div><button className="signin-button" disabled={loading||code.length!==6}>{loading?'Verifying…':'Verify and join WindChime'}</button></form>
   <div className="register-code-actions"><button type="button" disabled={loading||wait>0} onClick={resend}>{wait?`Resend in ${wait}s`:'Resend code'}</button><button type="button" disabled={loading} onClick={()=>{setVerification(null);setCode('');setMessage('');}}>Change details</button></div>
  </>:<form onSubmit={submit}>
   <div><label className="form-label" htmlFor="register-name">Your name</label><input id="register-name" name="name" className="form-control" value={form.name} onChange={change} minLength={3} maxLength={100} autoComplete="name" disabled={loading} required/></div>
   <div><label className="form-label" htmlFor="register-username">Username</label><input id="register-username" name="username" className="form-control" value={form.username} onChange={change} minLength={3} maxLength={50} autoComplete="username" autoCapitalize="none" aria-describedby="username-check" disabled={loading} required/><small id="username-check" className={`availability ${username.status}`} role="status">{username.message}</small></div>
   <div><label className="form-label" htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" className="form-control" value={form.email} onChange={change} maxLength={150} autoComplete="email" aria-describedby="email-check" disabled={loading} required/><small id="email-check" className={`availability ${email.status}`} role="status">{email.message}</small></div>
   <div><label className="form-label" htmlFor="register-password">Password</label><input id="register-password" name="password" type="password" className="form-control" value={form.password} onChange={change} autoComplete="new-password" disabled={loading} required/></div>
   <div><label className="form-label" htmlFor="register-confirm">Confirm password</label><input id="register-confirm" name="confirm_password" type="password" className="form-control" value={form.confirm_password} onChange={change} autoComplete="new-password" disabled={loading} required/></div>
   <button className="signin-button" disabled={loading||username.status!=='available'||email.status!=='available'}>{loading?'Preparing your code…':'Create account'}</button>
  </form>}
  {message&&<p className="form-message" role="status">{message}</p>}<p className="register-footer">Already part of WindChime? <Link to="/">Sign in</Link></p>
 </div></section></main>;
}
