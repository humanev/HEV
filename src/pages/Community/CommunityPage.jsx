import { CstButton } from "../../components/common/ui-components";


import {Users} from "lucide-react";

import {PageHero, useSiteContent} from "../../components/common/PageRuntime";



export default function Community(){const {communityFeatures}=useSiteContent();return <><PageHero kicker="COMMUNITY" title="Connect with the people behind the transition" desc="Industry discussions, private groups, expert forums, mentorship, polls and networking."/><section className="section"><div className="container"><div className="community-grid">{communityFeatures.map(([a,b])=><div className="community-card" key={a}><Users/><h3>{a}</h3><p>{b}</p><CstButton className="outline">Join</CstButton></div>)}</div></div></section></>}

