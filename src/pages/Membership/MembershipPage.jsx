import React from "react";
import {Link} from "react-router-dom";


import {PageHero, useSiteContent, DemoModeContext} from "../../components/common/PageRuntime";



export default function Membership(){const {plans}=useSiteContent();const localDemoMode=React.useContext(DemoModeContext);return <><PageHero kicker="MEMBERSHIP" title="The intelligence advantage" desc="Choose the access level that fits the way you work in electric mobility."/><section className="section"><div className="container"><div className="plans">{plans.map(p=><div className={p.popular?"plan popular":"plan"} key={p.name}>{p.popular&&<span className="popular-label">MOST POPULAR</span>}<h2>{p.name}</h2><p>{p.description}</p><strong>{p.price}{p.price!=="Custom"&&<small>{p.price==="₹0"?"":" / month"}</small>}</strong>{p.name==="Enterprise"?<Link className="primary" to="/contact">Contact us</Link>:<Link className="primary" to={`/account?plan=${encodeURIComponent(p.name)}&mode=signup`}>{p.name==="Free Member"?"Create free account":"Choose plan"}</Link>}<ul>{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul></div>)}</div><p className="membership-payment-note">{localDemoMode?"Demo checkout simulates a successful payment locally; no payment provider is contacted and no money is charged.":"Professional and Executive memberships are paid securely with Razorpay. Each payment activates one month of membership. Renewals are manual; cancel anytime by letting your membership expire."}</p></div></section></>}

