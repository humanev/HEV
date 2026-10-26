import { CstButton } from "../../components/common/ui-components";
import {ArrowUpRight} from "lucide-react";
export default function ContactCta(){return <section className="site-contact-cta"><div className="container site-contact-inner"><div><span className="eyebrow">LET’S CONNECT</span><h2>Have a question or a partnership in mind?</h2><p>Talk to the Humans of EV team about memberships, editorial, events and partnerships.</p></div><CstButton className="primary" href="/contact">Contact us <ArrowUpRight size={16}/></CstButton></div></section>}
