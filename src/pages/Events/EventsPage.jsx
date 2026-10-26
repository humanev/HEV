import { CstButton } from "../../components/common/ui-components";


import {CalendarDays} from "lucide-react";

import {PageHero, useSiteContent} from "../../components/common/PageRuntime";



export default function Events(){const {events}=useSiteContent();return <><PageHero kicker="CONNECT" title="Events that move the industry" desc="Executive forums, summits, webinars, roundtables and the Humans of EV Awards."/><section className="section"><div className="container"><div className="event-list">{events.map(e=><div className="event-card" key={e[0]}><div className="event-date">{e[4]?<><CalendarDays/><strong>EV</strong><span>Event</span></>:<><CalendarDays/><strong>{e[2].split(" ")[0]}</strong><span>{e[2].split(" ").slice(1).join(" ")}</span></>}</div><div><span className="tag">{e[3]}</span><h2>{e[0]}</h2><p>{e[4]?`${e[2]} · ${e[1]}`:`${e[1]} · Registration open`}</p></div>{e[4]?<a className="outline" href={e[4]} target="_blank" rel="noreferrer">View event</a>:<CstButton className="outline">Register</CstButton>}</div>)}</div></div></section></>}

