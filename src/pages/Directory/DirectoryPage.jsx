

import {Search, ArrowUpRight} from "lucide-react";

import {PageHero, useSiteContent} from "../../components/common/PageRuntime";



export default function Directory({type}){const {directory}=useSiteContent();return <><PageHero kicker="ECOSYSTEM" title={type} desc="Searchable profiles across OEMs, batteries, charging, fleets, software, components, investors and more."/><section className="section"><div className="container"><div className="directory-tools"><div className="searchbox"><Search size={18}/><input placeholder={"Search "+type.toLowerCase()+"..."}/></div><select><option>All industries</option><option>Battery</option><option>Charging</option><option>OEM</option><option>Fleet</option></select><select><option>India</option><option>Global</option></select></div><div className="company-grid">{directory.map(c=><div className="company-card" key={c[0]}><div className="company-logo">{c[0][0]}</div><div><h3>{c[0]}</h3><p>{c[1]} · {c[2]}</p><span>{c[3]}</span></div><ArrowUpRight size={17}/></div>)}</div></div></section></>}

