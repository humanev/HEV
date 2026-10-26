

import {BarChart3, Building2, TrendingUp} from "lucide-react";

import {PageHero, SectionTitle, useSiteContent} from "../../components/common/PageRuntime";



export default function Investors(){const {investorDeals}=useSiteContent();return <><PageHero kicker="CAPITAL & DEALS" title="Investors Hub" desc="Track venture funding, strategic investment, acquisitions and the capital shaping electric mobility."/><section className="section"><div className="container"><div className="metric-row"><div><TrendingUp/><strong>$1.4B</strong><span>tracked startup funding</span></div><div><Building2/><strong>128</strong><span>deals tracked</span></div><div><BarChart3/><strong>42</strong><span>active investors</span></div></div><SectionTitle kicker="LATEST" title="Funding intelligence" link="/investors/funding"/><div className="funding-list">{investorDeals.map(([title,amount,date])=><div key={title}><span>{date}</span><h3>{title}</h3><strong>{amount}</strong></div>)}</div></div></section></>}

