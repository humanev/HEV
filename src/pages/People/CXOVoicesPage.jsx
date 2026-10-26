
import {Link} from "react-router-dom";
import {ArrowUpRight, Users, Check} from "lucide-react";

import {PageHero, imgFallback, useManagedContent} from "../../components/common/PageRuntime";



export default function CXOPage(){
  const {items:cxos,error}=useManagedContent("cxo");
  return <><PageHero kicker="CXO VOICES" title="Conversations with industry leaders" desc="First-hand perspectives from the executives building India's electric mobility ecosystem."/>
    {error&&<div className="container article-feed-error">Executive profiles could not be loaded: {error}</div>}
    <section className="section"><div className="container"><div className="managed-content-grid cxo-profile-grid">{cxos.map((person)=><article className="managed-content-card cxo-profile-card" key={person.id}><img src={person.image} alt={person.personName} onError={e=>e.currentTarget.src=imgFallback}/><div><span className="tag">{person.role}</span>{person.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{person.personName}</h3>{person.organization&&<strong>{person.organization}</strong>}<h4>{person.title}</h4><p>{person.description}</p>{person.body&&!person.mediaUrl&&<p>{person.body}</p>}{person.requiresMembership?<Link to="/membership">View membership options <ArrowUpRight size={14}/></Link>:person.mediaUrl&&<a href={person.mediaUrl} target="_blank" rel="noreferrer">View conversation <ArrowUpRight size={14}/></a>}</div></article>)}</div>{cxos.length===0&&!error&&<div className="placeholder"><Users size={34}/><h2>Executive conversations are coming soon.</h2><p>Check back for perspectives from the people shaping electric mobility.</p></div>}</div></section>
  </>;
}

