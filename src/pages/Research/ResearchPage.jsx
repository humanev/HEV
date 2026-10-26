import { CstButton } from "../../components/common/ui-components";

import {Link} from "react-router-dom";


import {PageHero, useSiteContent} from "../../components/common/PageRuntime";



export default function Research(){const {reports}=useSiteContent();return <><PageHero kicker="RESEARCH LIBRARY" title="Research that moves markets" desc="Premium reports, whitepapers, case studies, datasets and market forecasts."/><section className="section"><div className="container"><div className="report-grid full">{reports.map(r=><Link className="report-card" to="/research/report" key={r[0]}><div className="report-cover"><span>HOEV<br/><b>INSIGHT</b></span><small>2026</small></div><div><span className="tag">{r[2]}</span><h3>{r[0]}</h3><p>{r[1]} · Executive edition</p><CstButton>View report</CstButton></div></Link>)}</div></div></section></>}

