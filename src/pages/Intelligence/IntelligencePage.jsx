
import {Link} from "react-router-dom";
import {ArrowUpRight, BarChart3} from "lucide-react";

import {PageHero, useSiteContent} from "../../components/common/PageRuntime";



export default function Intelligence(){const {reports}=useSiteContent();return <><PageHero kicker="RESEARCH CENTRE" title="Intelligence for decisions" desc="A premium research platform covering markets, technology, policy, investment and the economics of electrification."/><section className="section"><div className="container"><div className="int-grid"><Link className="big-tile" to="/intelligence/dashboard"><BarChart3/><span className="eyebrow">LIVE DATA</span><h2>EV Industry Dashboard</h2><p>Track market activity, infrastructure, funding and manufacturing indicators.</p></Link>{reports.map(r=><Link className="intel-card" to="/research" key={r[0]}><span className="tag">{r[2]}</span><h3>{r[0]}</h3><p>{r[1]}</p><ArrowUpRight size={17}/></Link>)}</div></div></section></>}

