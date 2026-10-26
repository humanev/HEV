
import {Link} from "react-router-dom";

import {SectionTitle} from "../../../components/common/PageRuntime";


export default function HomeResearchSection({reports}){ return <><section className="section"><div className="container"><SectionTitle kicker="RESEARCH & INTELLIGENCE" title="Reports executives are reading" link="/research"/><div className="report-grid">{reports.slice(0,4).map((r,i)=><Link className="report-card" to="/research" key={r[0]}><div className="report-cover"><span>HOEV<br/><b>INSIGHT</b></span><small>2026</small></div><div><span className="tag">{r[2]}</span><h3>{r[0]}</h3><p>{r[1]} · 24 pages</p></div></Link>)}</div></div></section></>; }
