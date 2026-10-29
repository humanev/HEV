
import {Link} from "react-router-dom";
import {ArrowUpRight, FileText} from "lucide-react";

import {PageHero, imgFallback, useManagedContent} from "../../components/common/PageRuntime";
import RelatedPageLinks from "../../components/common/RelatedPageLinks";



export default function MagazineArchive(){
  const {items,error}=useManagedContent("magazine", "page-magazine-archive");
  return <><PageHero kicker="DIGITAL MAGAZINE" title="Magazine archive" desc="Browse every issue of Humans of EV, with stories and perspectives from across the electric mobility industry."/>
    {error&&<div className="container article-feed-error">Magazine issues could not be loaded: {error}</div>}
    <section className="section"><div className="container"><div className="managed-content-grid">{items.map((issue)=><article className="managed-content-card" key={issue.id}><img src={issue.image} alt={issue.title} onError={e=>e.currentTarget.src=imgFallback}/><div><span className="tag">{issue.issueLabel}</span>{issue.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{issue.title}</h3><p>{issue.description}</p><RelatedPageLinks item={issue}/>{issue.body&&!issue.mediaUrl&&<p>{issue.body}</p>}{issue.requiresMembership?<Link to="/membership">Unlock with membership <ArrowUpRight size={14}/></Link>:issue.mediaUrl&&<a href={issue.mediaUrl} target="_blank" rel="noreferrer">Read issue <ArrowUpRight size={14}/></a>}</div></article>)}</div>{items.length===0&&!error&&<div className="placeholder"><FileText size={34}/><h2>No magazine issues published yet.</h2><p>New issues will appear here when they are published.</p></div>}</div></section>
  </>;
}

