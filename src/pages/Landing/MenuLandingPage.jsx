
import {Link} from "react-router-dom";
import {ArrowUpRight} from "lucide-react";

import {PageHero} from "../../components/common/PageRuntime";

import menuLandingPages from "../../features/navigation/menuLandingPages";


export default function MenuLanding({page}){
  const content=menuLandingPages[page];
  if(!content)return null;
  return <><PageHero kicker={content.kicker} title={content.title} desc={content.description}/>{content.sections.map((section,index)=><section className={`section menu-topic-section${index%2===1?" menu-topic-muted":""}`} key={section.title}><div className="container"><div className="menu-topic-heading"><span className="eyebrow">{section.kicker}</span><h2>{section.title}</h2><p>{section.description}</p></div><div className="menu-topic-grid">{section.links.map(([label,path])=><Link className="menu-topic-card" to={path} key={`${label}-${path}`}><span>{label}</span><ArrowUpRight size={17}/></Link>)}</div></div></section>)}</>;
}


