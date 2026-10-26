import { CstButton, CstInput, CstSelect } from "../../components/common/ui-components";
import {useState} from "react";
import {Link} from "react-router-dom";
import {ChevronDown, ArrowUpRight, BarChart3, Building2, CalendarDays, FileText, ShieldCheck} from "lucide-react";
import {apiRequest} from "../../api";
import {PageHero} from "../../components/common/PageRuntime";



export default function Contact(){
  const [sent,setSent]=useState(false);
  const [notification,setNotification]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [form,setForm]=useState({name:"",email:"",company:"",type:"General enquiry",message:""});
  const update=(e)=>setForm({...form,[e.target.name]:e.target.value});
  const submit=async(e)=>{
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try{
      const result=await apiRequest("/api/contact",{method:"POST",body:JSON.stringify(form)});
      setNotification(result.notification?.simulated
        ?"Demo mode: enquiry saved and email notifications simulated locally. No email was sent."
        :result.notification?.adminNotified&&result.notification?.senderAcknowledged
          ?"A confirmation email was sent, and the team was notified."
        :result.notification?.adminNotified
          ?"The team was notified, but we could not confirm delivery of your acknowledgement email."
          :result.notification?.senderAcknowledged
            ?"A confirmation email was sent, but we could not confirm the team's email notification. Your enquiry is saved in our admin inbox."
            :"Your enquiry is saved in our admin inbox. Email delivery is not configured or could not be confirmed.");
      setSent(true);
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setSubmitting(false);
    }
  };
  return <>
    <PageHero kicker="CONNECT WITH HUMANS OF EV" title="Let's start a conversation." desc="Whether you want to tell a story, discuss a partnership, access our research, sponsor an event or simply reach the right team, we're here to help."/>
    <section className="section contact-section">
      <div className="container">
        <div className="contact-layout">
          <div className="contact-main">
            <span className="eyebrow">SEND AN ENQUIRY</span>
            <h2>How can we help?</h2>
            {sent ? <div className="contact-success">
              <div className="success-icon"><ShieldCheck size={26}/></div>
              <h3>Thank you, {form.name || "there"}.</h3>
              <p>Your enquiry has been received. Our team will review it and get back to you using the email address provided.</p>
              <p role="status">{notification}</p>
              <CstButton className="outline dark-outline" onClick={()=>{setSent(false);setForm({name:"",email:"",company:"",type:"General enquiry",message:""})}}>Send another enquiry</CstButton>
            </div> : <form className="contact-form" onSubmit={submit}>
              {error&&<div className="contact-form-error" role="alert">{error}</div>}
              <div className="form-grid">
                <CstInput label="Full name" name="name" value={form.name} onChange={update} required placeholder="Your full name"/>
                <CstInput label="Work email" type="email" name="email" value={form.email} onChange={update} required placeholder="name@company.com"/>
              </div>
              <div className="form-grid">
                <CstInput label="Company / organisation" name="company" value={form.company} onChange={update} placeholder="Organisation name"/>
                <CstSelect label="Enquiry type" name="type" value={form.type} onChange={update} options={[
                  { label: "General enquiry", value: "General enquiry" },
                  { label: "Editorial / newsroom", value: "Editorial / newsroom" },
                  { label: "Advertising & sponsorship", value: "Advertising & sponsorship" },
                  { label: "Membership & subscriptions", value: "Membership & subscriptions" },
                  { label: "Research & intelligence", value: "Research & intelligence" },
                  { label: "Events & awards", value: "Events & awards" },
                  { label: "Enterprise partnership", value: "Enterprise partnership" },
                  { label: "Media enquiry", value: "Media enquiry" },
                  { label: "Careers", value: "Careers" },
                ]}/>
              </div>
              <CstInput label="Message" multiline name="message" value={form.message} onChange={update} required rows={7} placeholder="Tell us how we can help..."/>
              <div className="contact-submit">
                <CstButton className="primary" type="submit" disabled={submitting}>{submitting?"Sending…":<>Send enquiry <ArrowUpRight size={17}/></>}</CstButton>
                <span>We respect your privacy and never sell your contact details.</span>
              </div>
            </form>}
          </div>
          <aside className="contact-side">
            <div className="contact-card highlight">
              <span className="eyebrow">HUMANS OF EV</span>
              <h3>India's Most Trusted Electric Mobility Intelligence Platform</h3>
              <p>Trusted journalism, industry intelligence, research and networking for the people building the electric future.</p>
            </div>
            {[
              [Building2,"General enquiries","For questions about Humans of EV, our content and platform.","hello@humansofev.com"],
              [FileText,"Editorial & newsroom","Share a story, press release, correction or editorial idea.","editorial@humansofev.com"],
              [BarChart3,"Research & enterprise","Discuss reports, data, custom research and enterprise intelligence.","research@humansofev.com"],
              [CalendarDays,"Events & sponsorship","Partnerships, sponsorships, speaking opportunities and event registration.","events@humansofev.com"]
            ].map(([Icon,title,desc,email])=><div className="contact-card" key={title}>
              <div className="contact-icon"><Icon size={19}/></div>
              <h3>{title}</h3><p>{desc}</p><a href={"mailto:"+email}>{email}</a>
            </div>)}
          </aside>
        </div>
      </div>
    </section>
    <section className="contact-bottom">
      <div className="container">
        <div className="section-title"><div><span className="eyebrow">OTHER WAYS TO CONNECT</span><h2>Find the right team.</h2></div></div>
        <div className="contact-channels">
          {[
            ["Advertising & Sponsorship","Build visibility with the EV decision-makers who matter.","/membership"],
            ["Membership Support","Need help with your account, plan, invoice or access?","/membership"],
            ["Media & Press","Request interviews, media kits, company information or expert commentary.","/people"],
            ["Careers","Join a team documenting and shaping India's electric mobility transition.","/jobs"]
          ].map(([title,desc,path])=><Link to={path} className="contact-channel" key={title}><h3>{title}</h3><p>{desc}</p><ArrowUpRight size={17}/></Link>)}
        </div>
      </div>
    </section>
    <section className="faq-section">
      <div className="container faq-grid">
        <div><span className="eyebrow">CONTACT FAQ</span><h2>Before you write to us.</h2></div>
        <div>
          {[
            ["How quickly will you respond?","For most enquiries, our team aims to respond within two business days."],
            ["Can I submit a story or press release?","Yes. Select Editorial / newsroom in the form and include the relevant details or supporting material."],
            ["Do you offer enterprise research?","Yes. Enterprise clients can discuss custom research, data intelligence, team access and strategic partnerships."],
            ["Can I sponsor an event or report?","Yes. Our partnerships team can create sponsorship packages around events, reports, awards and editorially appropriate campaigns."]
          ].map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={16}/></summary><p>{a}</p></details>)}
        </div>
      </div>
    </section>
  </>
}

