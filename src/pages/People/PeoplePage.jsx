
import {Link} from "react-router-dom";
import {ArrowUpRight} from "lucide-react";

import {PageHero, SectionTitle, imgFallback, useSiteContent, useManagedContent} from "../../components/common/PageRuntime";



export default function People(){
  const {items:cxos,error}=useManagedContent("cxo");
  const {peopleVoices}=useSiteContent();
  return <><PageHero kicker="HUMANS OF EV" title="The people building the electric future" desc="Conversations with CEOs, founders, investors, policymakers, researchers and global industry leaders."/><section className="section"><div className="container"><div className="people-grid">{peopleVoices.map(([role,initials,title])=><div className="person-card" key={role}><div className="person-avatar">{initials}</div><span className="tag">{role}</span><h3>{title}</h3><p>Executive conversation · 12 min</p></div>)}</div>
      {(cxos.length>0||error)&&<div className="cxo-content"><SectionTitle kicker="CXO VOICES" title="Executive perspectives" link="/people/cxo-voices"/>{error&&<p className="article-feed-error">Executive profiles could not be loaded: {error}</p>}<div className="people-grid">{cxos.map((person)=><article className="person-card managed-person" key={person.id}>{person.image&&<img className="managed-person-image" src={person.image} alt={person.personName} onError={e=>e.currentTarget.src=imgFallback}/>}<span className="tag">{person.role}</span>{person.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{person.title}</h3><strong>{person.personName}</strong><p>{person.organization}</p><p>{person.description}</p>{person.requiresMembership?<Link className="admin-content-link" to="/membership">View membership options <ArrowUpRight size={14}/></Link>:person.mediaUrl&&<a className="admin-content-link" href={person.mediaUrl} target="_blank" rel="noreferrer">View conversation <ArrowUpRight size={14}/></a>}</article>)}</div></div>}
    </div></section></>
}

