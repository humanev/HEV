
import {Link} from "react-router-dom";
import {ArrowUpRight} from "lucide-react";

import {PageHero, SectionTitle, imgFallback, useManagedContent} from "../../components/common/PageRuntime";
import RelatedPageLinks from "../../components/common/RelatedPageLinks";



export default function Magazine(){
  const {items,error}=useManagedContent("magazine", "page-media");
  const current=items[0];
  const archive=items.slice(1);
  return <><PageHero kicker="DIGITAL MAGAZINE" title="The Humans of EV Magazine" desc="Long-form stories, visual essays, executive interviews and deep industry analysis."/>
    {error&&<div className="container article-feed-error">Magazine issues could not be loaded: {error}</div>}
    <section className="section"><div className="container">
      {current?<div className="magazine-hero"><div className="mag-cover managed-mag-cover" style={{backgroundImage:`linear-gradient(145deg,rgba(7,29,39,.24),rgba(7,29,39,.88)),url("${current.image}")`}}><span>HUMANS<br/><b>OF EV</b></span><small>{current.issueLabel}</small></div><div>{current.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<span className="eyebrow">CURRENT ISSUE · {current.issueLabel}</span><h2>{current.title}</h2><p>{current.description}</p><RelatedPageLinks item={current}/><div className="hero-actions">{current.requiresMembership?<Link className="primary" to="/membership">Unlock with membership <ArrowUpRight size={16}/></Link>:current.mediaUrl?<a className="primary" href={current.mediaUrl} target="_blank" rel="noreferrer">Read this issue <ArrowUpRight size={16}/></a>:<Link className="primary" to="/magazine/archive">View issue details <ArrowUpRight size={16}/></Link>}<Link className="outline" to="/magazine/archive">Browse archive</Link></div></div></div>
        :<div className="magazine-empty"><div className="magazine-empty-cover"><span>HUMANS<br/><b>OF EV</b></span></div><div><span className="eyebrow">THE DIGITAL EDITION</span><h2>Our next issue is on its way.</h2><p>Published magazine issues will appear here. Browse the archive to revisit past editions.</p><Link className="outline" to="/magazine/archive">Browse the archive <ArrowUpRight size={15}/></Link></div></div>}
      {archive.length>0&&<div className="managed-archive"><SectionTitle kicker="THE ARCHIVE" title="More magazine issues" link="/magazine/archive"/><div className="managed-content-grid">{archive.map((issue)=><article className="managed-content-card" key={issue.id}><img src={issue.image} alt={issue.title} onError={e=>e.currentTarget.src=imgFallback}/><div><span className="tag">{issue.issueLabel}</span>{issue.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{issue.title}</h3><p>{issue.description}</p><RelatedPageLinks item={issue}/>{issue.requiresMembership?<Link to="/membership">Unlock with membership <ArrowUpRight size={14}/></Link>:issue.mediaUrl&&<a href={issue.mediaUrl} target="_blank" rel="noreferrer">Read issue <ArrowUpRight size={14}/></a>}</div></article>)}</div></div>}
    </div></section></>
}
