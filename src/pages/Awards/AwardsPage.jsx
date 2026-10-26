
import {Link} from "react-router-dom";
import {Award} from "lucide-react";

import {PageHero} from "../../components/common/PageRuntime";



export default function Awards(){return <><PageHero kicker="HUMANS OF EV AWARDS" title="Recognising the people changing mobility" desc="A flagship platform celebrating leaders, startups, women, innovators and emerging voices."/><section className="award-hero"><div className="container"><Award size={40}/><h2>2026 Awards</h2><p>Top 100 Leaders · Top Startups · Women in EV · Innovation Awards · Emerging Leaders</p><Link className="primary" to="/community">Nominate a leader</Link></div></section></>}

