
import {Link, useParams} from "react-router-dom";
import {Sparkles} from "lucide-react";

import {PageHero} from "../../components/common/PageRuntime";



export default function GenericPage({section}){const {slug}=useParams();const title=(slug||section).replaceAll("-"," ");return <><PageHero kicker={section.toUpperCase()} title={title.replace(/\b\w/g,m=>m.toUpperCase())} desc="A dedicated Humans of EV destination with structured content, intelligence and industry resources."/><section className="section"><div className="container placeholder"><Sparkles size={42}/><h2>Built as a reusable platform module</h2><p>This route is ready for real CMS/API data. Replace the mock content in <b>src/data.js</b> without rebuilding the page architecture.</p><Link className="primary" to="/membership">Explore membership</Link></div></section></>}

