import { useEffect,useState } from 'react';
import { checkAvailability } from '../api/index.js';
export default function useAvailability(field,value,enabled=true,token){
 const normalized=value.trim().toLowerCase();
 const valid=field==='username'?/^[a-z0-9._]{3,50}$/.test(normalized):/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
 const [result,setResult]=useState({value:'',status:'idle',message:''});
 useEffect(()=>{
  if(!enabled||!valid)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setResult({value:normalized,status:'checking',message:''});
   try{const response=await checkAvailability(field,normalized,token,controller.signal);if(!controller.signal.aborted)setResult({value:normalized,status:response.available?'available':'taken',message:response.available?(field==='username'?'Username available':'Email available'):(field==='username'?'Username is already taken':'Email is already registered')});}
   catch(e){if(!controller.signal.aborted)setResult({value:normalized,status:'error',message:e.message});}
  },350);
  return()=>{clearTimeout(timer);controller.abort();};
 },[field,normalized,enabled,token,valid]);
 if(!enabled||!normalized)return {status:'idle',message:''};
 if(!valid)return {status:'invalid',message:field==='username'?'Use 3–50 letters, numbers, periods or underscores':'Enter a valid email address'};
 return result.value===normalized?result:{status:'checking',message:'Checking…'};
}
