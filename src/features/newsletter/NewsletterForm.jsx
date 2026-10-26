import { CstButton, CstInput } from "../../components/common/ui-components";
import {useState} from "react";
import {ArrowUpRight} from "lucide-react";
import {apiRequest} from "../../api";

export default function NewsletterForm(){
  const [email,setEmail]=useState("");
  const [done,setDone]=useState(false);
  const [successMessage,setSuccessMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function subscribe(event){
    event.preventDefault();
    setBusy(true);
    setError("");
    try{
      const result=await apiRequest("/api/newsletter/subscribe",{method:"POST",body:JSON.stringify({email})});
      setSuccessMessage(result.simulated
        ?"Demo mode: you were added locally; no email was sent."
        :"You're on the list. Welcome to Humans of EV.");
      setDone(true);
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setBusy(false);
    }
  }
  return <form className="newsletter-form" onSubmit={subscribe}>
    {done?<strong role="status">{successMessage}</strong>:<>
      <CstInput type="email" aria-label="Your work email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="Your work email" autoComplete="email" maxLength="254" required/>
      <CstButton className="primary" disabled={busy}>{busy?"Subscribing…":<>Subscribe <ArrowUpRight size={16}/></>}</CstButton>
      {error&&<span className="newsletter-error" role="alert">{error}</span>}
    </>}
  </form>
}
