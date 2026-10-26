
import {Link} from "react-router-dom";
import {ArrowUpRight} from "lucide-react";



export default function HomeDashboardSection({homeStats}){ return <><section className="dashboard-strip"><div className="container"><div className="section-title compact"><div><span className="eyebrow">LIVE INDUSTRY DASHBOARD</span><h2>EV market at a glance</h2></div><Link to="/intelligence/dashboard">Open dashboard <ArrowUpRight size={16}/></Link></div><div className="stat-grid">{homeStats.map(([a,b,c])=><div className="stat" key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></div>)}</div></div></section></>; }
