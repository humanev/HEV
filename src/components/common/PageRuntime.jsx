import React, {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {ArrowUpRight, Bookmark} from "lucide-react";
import {siteContentDefaults} from "../../data";
import {apiRequest} from "../../api";
import { CstCard, CstTag } from "./ui-components";
export const SiteContentContext = React.createContext(siteContentDefaults);
export const DemoModeContext = React.createContext(false);
export const SiteContentErrorContext = React.createContext("");
export const ApiStatusErrorContext = React.createContext("");
export const imgFallback = "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80";
export function useSiteContent(){ return React.useContext(SiteContentContext); }
export function useArticles(){
 const [articles,setArticles]=useState([]); const [error,setError]=useState("");
 useEffect(()=>{let mounted=true; apiRequest("/api/articles").then(({articles:published})=>{if(mounted)setArticles(published)}).catch(e=>{if(mounted)setError(e.message)}); return ()=>{mounted=false};},[]);
 return {articles,error};
}
export function useManagedContent(kind){
 const [items,setItems]=useState([]); const [error,setError]=useState("");
 useEffect(()=>{let mounted=true; apiRequest("/api/content/"+kind).then(({items:published})=>{if(mounted){setItems(published);setError("")}}).catch(e=>{if(mounted)setError(e.message)}); return ()=>{mounted=false};},[kind]);
 return {items,error};
}

export function PageHero({kicker,title,desc}){return <section className="page-hero"><div className="container"><span className="eyebrow">{kicker}</span><h1>{title}</h1>{desc&&<p>{desc}</p>}</div></section>}

export function SectionTitle({kicker,title,link="/news"}){return <div className="section-title"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div><Link to={link}>Explore all <ArrowUpRight size={16}/></Link></div>}

export function StoryCard({story,featured}){return <article className={featured?"story featured":"story"}><Link to={"/news/"+story.id} className="story-img"><img src={story.image} onError={e=>e.currentTarget.src=imgFallback}/></Link><CstCard className="story-body" variant="outlined"><CstTag variant="neutral" size="sm">{story.category}</CstTag>{story.accessLevel==="member"&&<CstTag variant="warning" size="sm">Members only</CstTag>}<Link to={"/news/"+story.id}><h3>{story.title}</h3></Link><p>{story.excerpt}</p><div className="story-meta"><span>{story.author} · {story.time}</span><Bookmark size={16}/></div></CstCard></article>}

export function MembershipGate(){return <div className="membership-gate"><span className="access-badge">MEMBERS ONLY</span><h2>Unlock this content with membership</h2><p>This article is reserved for active Humans of EV members.</p><div><Link className="primary" to="/membership">View membership options</Link><Link className="outline" to="/account">Sign in</Link></div></div>}


