import {useMemo, useState} from "react";

import {Search} from "lucide-react";

import {PageHero, StoryCard, useArticles} from "../../components/common/PageRuntime";
import { CstInput } from "../../components/common/ui-components";



export default function SearchPage(){const [q,setQ]=useState("");const {articles,error}=useArticles();const results=useMemo(()=>articles.filter(s=>(s.title+" "+s.excerpt).toLowerCase().includes(q.toLowerCase())),[articles,q]);return <><PageHero kicker="DISCOVERY" title="Search the EV ecosystem" desc="Find stories, companies, people, research, events and more."/>{error&&<div className="container article-feed-error">News search could not be loaded: {error}</div>}<section className="section"><div className="container"><div className="large-search"><Search/><CstInput type="search" aria-label="Search stories" autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search company, founder, technology, policy..."/></div><div className="search-results">{results.map(s=><StoryCard story={s} key={s.id}/>)}</div></div></section></>}

