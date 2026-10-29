
import {Link} from "react-router-dom";
import {useMemo, useState} from "react";
import {ArrowUpRight} from "lucide-react";

import {PageHero} from "../../components/common/PageRuntime";

import menuLandingPages from "../../features/navigation/menuLandingPages";

const linkDescriptions = {
  "/news/all": "Current reporting, analysis and decisions shaping the electric mobility market.",
  "/intelligence": "Market indicators, research and data-led insight for better decisions.",
  "/people": "Profiles and perspectives from the people building the electric future.",
  "/vehicles": "Models, segments, launches and ownership trends across electric mobility.",
  "/energy": "Charging, batteries, renewables and the infrastructure behind electrification.",
  "/research": "Reports and analysis covering markets, technology, policy and investment.",
  "/intelligence/dashboard": "Track sales, charging, battery capacity and investment momentum.",
  "/ev-business": "Companies, partnerships and commercial opportunities across the value chain.",
  "/investors": "Funding activity, investors and capital moving the EV ecosystem forward.",
  "/events": "Forums, roundtables, awards and industry conversations to attend or support.",
  "/events/calendar": "Browse upcoming forums, summits and community events by date.",
  "/directory": "Explore companies, sectors, locations and stages across the EV ecosystem.",
  "/startups": "Discover emerging businesses, founders and new technology platforms.",
  "/jobs": "Find career opportunities with companies building electric mobility.",
  "/b2b-solutions": "Connect your organisation with the right audience, research and events.",
  "/podcasts": "Listen to executive conversations, founder stories and expert discussions.",
  "/videos": "Watch interviews, factory visits, panels and product stories.",
  "/magazine": "Read the latest digital edition and long-form stories from the industry.",
  "/membership": "Unlock premium research, interviews, reports and member experiences.",
  "/account": "Manage your profile, saved stories, followed topics and membership.",
  "/contact": "Reach the editorial, research, events, media or partnership teams.",
  "/community": "Join expert forums, private groups, mentorship and industry conversations.",
  "/awards": "Recognise the leaders, startups and innovations moving the sector forward."
};

const categoryFilters = {
  vehicles: ["All", "Cars", "Two Wheelers", "Buses", "Battery", "Charging", "Policy", "Startups"],
  energy: ["All", "Charging", "Battery", "Renewables", "Storage", "Policy"],
  business: ["All", "Companies", "Startups", "Investors", "Manufacturing", "Partnerships"],
  news: ["All", "Cars", "Two Wheelers", "Buses", "Battery", "Charging", "Policy", "Startups"],
  people: ["All", "CXO Voices", "Founders", "Investors", "Experts", "Young Leaders"]
};
const categoryKeywords = {
  Cars: ["car", "passenger"],
  "Two Wheelers": ["wheel", "two-", "three-"],
  Buses: ["bus", "commercial", "fleet"],
  Battery: ["battery", "cell", "storage"],
  Charging: ["charging"],
  Policy: ["policy"],
  Startups: ["startup", "founder"],
  Renewables: ["renewable", "clean power"],
  Storage: ["storage", "system"],
  Companies: ["compan", "directory"],
  Investors: ["investor", "capital", "deal"],
  Manufacturing: ["manufactur", "supply chain"],
  Partnerships: ["partner"],
  "CXO Voices": ["cxo", "executive"],
  Founders: ["founder", "builder"],
  Experts: ["expert", "research"],
  "Young Leaders": ["young", "community"]
};


export default function MenuLanding({page}){
  const content=menuLandingPages[page];
  const primarySections=content?.sections.slice(0,3) || [];
  const filters=categoryFilters[page] || ["All", ...primarySections.map((section)=>section.kicker.replace(/&/g,"and"))];
  const [activeFilter,setActiveFilter]=useState("All");
  const visibleSections=useMemo(()=>{
    if(activeFilter==="All")return primarySections;
    const keywords=categoryKeywords[activeFilter] || [activeFilter.toLowerCase()];
    return primarySections.filter((section)=>keywords.some((keyword)=>`${section.kicker} ${section.title} ${section.description} ${section.links.flat().join(" ")}`.toLowerCase().includes(keyword)));
  },[activeFilter,primarySections]);
  if(!content)return null;
  return <><PageHero kicker={content.kicker} title={content.title} desc={content.description}/><section className="menu-filter-section"><div className="container"><div className="menu-category-filter" role="tablist" aria-label={`${content.kicker} categories`}>{filters.map((filter)=><button type="button" className={activeFilter===filter?"active":""} aria-selected={activeFilter===filter} onClick={()=>setActiveFilter(filter)} key={filter}>{filter}</button>)}</div></div></section>{visibleSections.map((section,index)=><section className={`section menu-topic-section${index%2===1?" menu-topic-muted":""}`} key={section.title}><div className="container"><div className="menu-topic-heading"><span className="eyebrow">{section.kicker}</span><h2>{section.title}</h2><p>{section.description}</p></div><div className="menu-topic-grid">{section.links.slice(0,3).map(([label,path])=><Link className="menu-topic-card" to={path} key={`${label}-${path}`}><span className="menu-topic-card-content"><strong>{label}</strong><small>{linkDescriptions[path] || "Explore the latest content, people and opportunities from Humans of EV."}</small><em>Explore section <ArrowUpRight size={15}/></em></span></Link>)}</div></div></section>)}</>;
}
