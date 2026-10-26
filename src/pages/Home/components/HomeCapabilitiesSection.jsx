
import {Link} from "react-router-dom";
import {ArrowUpRight, FileText, Users, Building2, Sparkles} from "lucide-react";
import {SectionTitle} from "../../../components/common/PageRuntime";


export default function HomeCapabilitiesSection({homeCapabilities}){ return <><section className="dark-section"><div className="container"><SectionTitle kicker="WHY HUMANS OF EV" title="More than news." link="/intelligence"/><div className="cap-grid">{homeCapabilities.map(([t,d,p,iconName])=>{const Icon={FileText,Users,Building2,Sparkles}[iconName];return <Link className="cap" to={p} key={t}><Icon size={25}/><h3>{t}</h3><p>{d}</p><ArrowUpRight size={17}/></Link>})}</div></div></section></>; }
