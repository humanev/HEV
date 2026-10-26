import { CstButton, CstInput } from "../../components/common/ui-components";
import {useEffect, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {ArrowUpRight, User, ShieldCheck, Check} from "lucide-react";
import {apiRequest} from "../../api";
import {PageHero, useSiteContent} from "../../components/common/PageRuntime";



export default function Account(){
  const {plans}=useSiteContent();
  const [searchParams,setSearchParams]=useSearchParams();
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState(searchParams.get("mode")==="signup"?"signup":"login");
  const [selectedPlan,setSelectedPlan]=useState(searchParams.get("plan")||"");
  const [paymentsEnabled,setPaymentsEnabled]=useState(false);
  const [localDemoMode,setLocalDemoMode]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    let mounted=true;
    apiRequest("/api/member/session")
      .then(({user:member})=>{if(mounted)setUser(member)})
      .catch(requestError=>{
        if(mounted&&requestError.status!==401)setError(requestError.message);
      })
      .finally(()=>{if(mounted)setLoading(false)});
    apiRequest("/api/member/payment-config")
      .then(({razorpayEnabled,localDemoMode:demo})=>{if(mounted){setLocalDemoMode(demo);setPaymentsEnabled(razorpayEnabled||demo)}})
      .catch(requestError=>{if(mounted)setError(requestError.message)});
    return ()=>{mounted=false};
  },[]);

  useEffect(()=>{
    const nextPlan=searchParams.get("plan")||"";
    const nextMode=searchParams.get("mode")==="signup"?"signup":"login";
    setSelectedPlan(nextPlan);
    setMode(nextMode);
  },[searchParams]);

  function selectMode(nextMode){
    setMode(nextMode);
    setError("");
    setNotice("");
    setSearchParams(selectedPlan?{plan:selectedPlan,mode:nextMode}:{mode:nextMode});
  }

  async function authenticate(event){
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const fields=new FormData(event.currentTarget);
    const isSignup=mode==="signup";
    const payload={
      email:fields.get("email"),
      password:fields.get("password"),
      ...(isSignup?{name:fields.get("name")}:{})
    };
    if(isSignup&&payload.password!==fields.get("confirmPassword")){
      setError("Your passwords do not match.");
      setBusy(false);
      return;
    }
    try{
      const result=await apiRequest(`/api/member/${isSignup?"signup":"login"}`,{method:"POST",body:JSON.stringify(payload)});
      setUser(result.user);
      setNotice(isSignup
        ? `Your free member account is ready.${selectedPlan&&selectedPlan!=="Free Member"?` ${selectedPlan} is selected; continue to its payment from your account.`:""}`
        : "Welcome back.");
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setBusy(false);
    }
  }

  async function signOut(){
    setBusy(true);
    setError("");
    try{
      await apiRequest("/api/auth/logout",{method:"POST"});
      setUser(null);
      setNotice("You have signed out.");
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setBusy(false);
    }
  }

  async function buyPlan(plan){
    if(plan==="Free Member"){
      setSelectedPlan(plan);
      setNotice("Free membership is included with your account.");
      return;
    }
    if(!paymentsEnabled){
      setError("Online payments are not configured yet. Please contact us for membership assistance.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try{
      const checkout=await apiRequest("/api/member/checkout",{method:"POST",body:JSON.stringify({plan})});
      if(checkout.demo){
        const paymentId=`demo_payment_${window.crypto.randomUUID().replaceAll("-","").slice(0,24)}`;
        const verified=await apiRequest("/api/member/checkout/verify",{method:"POST",body:JSON.stringify({
          razorpayOrderId:checkout.orderId,
          razorpayPaymentId:paymentId,
          razorpaySignature:"local-demo-signature"
        })});
        setUser(verified.user);
        setSelectedPlan("");
        setSearchParams({});
        setNotice(`Local demo payment complete — no money was charged. ${verified.user.membershipPlan} membership is active until ${new Date(verified.user.membershipExpiresAt).toLocaleDateString()}.`);
        setBusy(false);
        return;
      }
      await new Promise((resolveScript,rejectScript)=>{
        if(window.Razorpay){resolveScript();return}
        const existing=document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if(existing){
          existing.addEventListener("load",resolveScript,{once:true});
          existing.addEventListener("error",()=>rejectScript(new Error("Could not load the secure payment window.")),{once:true});
          return;
        }
        const script=document.createElement("script");
        script.src="https://checkout.razorpay.com/v1/checkout.js";
        script.async=true;
        script.onload=resolveScript;
        script.onerror=()=>rejectScript(new Error("Could not load the secure payment window."));
        document.body.appendChild(script);
      });
      const checkoutWindow=new window.Razorpay({
        key:checkout.keyId,
        amount:checkout.amount,
        currency:checkout.currency,
        name:"Humans of EV",
        description:`${plan} membership · one month`,
        order_id:checkout.orderId,
        prefill:{name:checkout.name,email:checkout.email},
        theme:{color:"#20c77a"},
        handler:async response=>{
          try{
            const verified=await apiRequest("/api/member/checkout/verify",{method:"POST",body:JSON.stringify({
              razorpayOrderId:response.razorpay_order_id,
              razorpayPaymentId:response.razorpay_payment_id,
              razorpaySignature:response.razorpay_signature
            })});
            setUser(verified.user);
            setSelectedPlan("");
            setSearchParams({});
            setNotice(`${verified.user.membershipPlan} membership is active until ${new Date(verified.user.membershipExpiresAt).toLocaleDateString()}.`);
          }catch(verifyError){
            setError(verifyError.message);
          }finally{
            setBusy(false);
          }
        },
        modal:{ondismiss:()=>setBusy(false)}
      });
      checkoutWindow.on("payment.failed",response=>{
        setError(response.error?.description||"Payment was not completed. You have not been charged for a successful membership.");
        setBusy(false);
      });
      checkoutWindow.open();
    }catch(requestError){
      setError(requestError.message);
      setBusy(false);
    }
  }

  if(loading)return <><PageHero kicker="MEMBER ACCESS" title="Your Humans of EV account" desc="Checking your account…"/><section className="section"><div className="container account-box"><span className="admin-spinner"/></div></section></>;
  if(user){
    const activePlan=user.membershipPlan!=="Free Member"&&user.membershipExpiresAt;
    return <><PageHero kicker="MEMBER ACCESS" title={`Welcome, ${user.name.split(" ")[0]}.`} desc="Manage your membership, account and access."/><section className="section"><div className="container member-account">
      {error&&<div className="member-alert error" role="alert">{error}</div>}{notice&&<div className="member-alert success" role="status">{notice}</div>}
      <div className="member-dashboard">
        <div className="member-profile"><div className="member-profile-icon"><User size={24}/></div><div><span className="eyebrow">YOUR ACCOUNT</span><h2>{user.name}</h2><p>{user.email}</p></div><CstButton className="outline" onClick={signOut} disabled={busy}>Sign out</CstButton></div>
        <div className="member-plan-card"><span className="eyebrow">CURRENT MEMBERSHIP</span><h2>{activePlan?user.membershipPlan:"Free Member"}</h2><p>{activePlan?`Active until ${new Date(user.membershipExpiresAt).toLocaleDateString()}`:"Your free account is active. Upgrade for premium intelligence and member benefits."}</p>{activePlan&&<span className="member-active-label"><ShieldCheck size={15}/> Active</span>}</div>
      </div>
      <div className="member-upgrade"><span className="eyebrow">MEMBERSHIP OPTIONS</span><h2>Choose your next level.</h2><div className="member-plan-options">{plans.filter(plan=>plan.name!=="Enterprise").map(plan=><article className={`member-plan-option${(plan.name===user.membershipPlan&&activePlan)||plan.name===selectedPlan?" selected":""}`} key={plan.name}><h3>{plan.name}</h3><strong>{plan.price}{plan.price==="₹0"?"":" / month"}</strong><p>{plan.description}</p>{plan.name===user.membershipPlan&&activePlan?<span className="member-current-plan"><Check size={15}/> Your current plan</span>:<CstButton className="primary" disabled={busy||plan.name==="Free Member"||!paymentsEnabled} onClick={()=>buyPlan(plan.name)}>{plan.name==="Free Member"?"Included with account":localDemoMode?"Simulate demo payment":paymentsEnabled?"Continue to secure payment":"Payments not configured"}</CstButton>}</article>)}</div>
        {localDemoMode?<p className="membership-payment-note">Local demo mode simulates membership payments. No payment provider is contacted and no money is charged.</p>:!paymentsEnabled&&<p className="membership-payment-note">Paid checkout requires Razorpay keys in the server environment. Contact us if you’d like help getting started.</p>}
      </div>
      <div className="member-shortcuts"><Link to="/news">Explore news <ArrowUpRight size={15}/></Link><Link to="/research">Explore research <ArrowUpRight size={15}/></Link><Link to="/events">Explore events <ArrowUpRight size={15}/></Link></div>
    </div></section></>;
  }
  return <><PageHero kicker="MEMBER ACCESS" title="Your Humans of EV account" desc="Sign in or create a free account to save your membership and access the EV community."/><section className="section"><div className="container member-auth-layout">
    <div className="member-auth-card"><div className="member-auth-tabs"><CstButton className={mode==="login"?"active":""} onClick={()=>selectMode("login")}>Sign in</CstButton><CstButton className={mode==="signup"?"active":""} onClick={()=>selectMode("signup")}>Create account</CstButton></div>
      <form className="member-auth-form" onSubmit={authenticate}><span className="eyebrow">{mode==="signup"?"FREE MEMBER REGISTRATION":"MEMBER SIGN IN"}</span><h2>{mode==="signup"?"Join Humans of EV.":"Welcome back."}</h2><p>{mode==="signup"?"Create your account first. You can choose a paid plan whenever you’re ready.":"Sign in to view your account and membership."}</p>
        {selectedPlan&&<div className="member-selected-plan">Selected plan: <strong>{selectedPlan}</strong>. {selectedPlan==="Free Member"?"Your account is free.":"After sign-in or sign-up, continue to secure checkout."}</div>}
        {error&&<div className="member-alert error" role="alert">{error}</div>}{notice&&<div className="member-alert success" role="status">{notice}</div>}
        {mode==="signup"&&<CstInput label="Full name" name="name" type="text" autoComplete="name" minLength="2" maxLength={120} required/>}
        <CstInput label="Email address" name="email" type="email" autoComplete="email" maxLength={254} required/>
        <CstInput label="Password" name="password" type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={mode==="signup"?12:1} required supportingText={mode==="signup"?"Use at least 12 characters.":undefined}/>
        {mode==="signup"&&<CstInput label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength="12" required/>}
        <CstButton className="primary member-auth-submit" type="submit" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create free account":"Sign in"} <ArrowUpRight size={16}/></CstButton>
        <small className="member-privacy-note">Your account is protected. Passwords are securely hashed and never stored as plain text.</small>
      </form>
    </div>
    <aside className="member-auth-aside"><span className="eyebrow light">MEMBERSHIP, YOUR WAY</span><h2>Know more. Connect deeper. Move forward.</h2><p>Start with a free account, then upgrade securely whenever a paid membership fits your needs.</p><ul><li><Check size={16}/> Free account with weekly intelligence</li><li><Check size={16}/> Upgrade to Professional or Executive</li><li><Check size={16}/> {localDemoMode?"Simulated membership checkout for UI testing":"One clear monthly payment via Razorpay"}</li><li><Check size={16}/> Membership stays active for one month after payment</li></ul>{!paymentsEnabled&&<span className="member-payment-status">Razorpay checkout is not configured yet.</span>}</aside>
  </div></section></>;
}

