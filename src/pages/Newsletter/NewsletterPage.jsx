



import {PageHero} from "../../components/common/PageRuntime";
import NewsletterForm from "../../features/newsletter/NewsletterForm";


export default function Newsletter(){return <><PageHero kicker="NEWSLETTER" title="The weekly EV intelligence brief" desc="Market moves, policy, funding, technology and the people behind the transition."/><section className="section"><div className="container newsletter-page"><NewsletterForm/><p>Subscribe to receive Humans of EV updates. Contact us if you need your address removed.</p></div></section></>}

