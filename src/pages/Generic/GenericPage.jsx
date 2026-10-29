
import {Link, useParams} from "react-router-dom";
import {Sparkles} from "lucide-react";

import {PageHero} from "../../components/common/PageRuntime";



export default function GenericPage({section}){const {slug}=useParams();const title=(slug||section).replaceAll("-"," ");return <><PageHero kicker={section.toUpperCase()} title={title.replace(/\b\w/g,m=>m.toUpperCase())} desc="A dedicated Humans of EV destination with structured content, intelligence and industry resources."/><section className="section"><div className="container placeholder"><Sparkles size={42}/><h2>Content is being prepared</h2><p>This page is ready for structured content from the Admin Panel.</p><Link className="primary" to="/membership">Explore membership</Link></div></section></>}
