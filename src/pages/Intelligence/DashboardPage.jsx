



import {PageHero, useSiteContent} from "../../components/common/PageRuntime";



export default function Dashboard(){const {dashboardData}=useSiteContent();return <><PageHero kicker="LIVE INDUSTRY DASHBOARD" title="India EV intelligence dashboard" desc="A decision-support view of the indicators shaping electric mobility."/><section className="section"><div className="container"><div className="dashboard-cards">{dashboardData.map(x=><div className="dash-card" key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><small>{x[2]} YoY</small></div>)}</div><div className="chart"><div className="chart-head"><h2>Market momentum</h2><span>2024 — 2026</span></div><div className="bars">{[48,62,58,72,81,78,91,96].map((h,i)=><div key={i} className="bar-wrap"><div className="bar" style={{height:h+"%"}}></div><small>{2023+i}</small></div>)}</div></div></div></section></>}

