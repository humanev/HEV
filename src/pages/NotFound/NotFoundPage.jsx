
import {Link} from "react-router-dom";


import {PageHero} from "../../components/common/PageRuntime";



export default function NotFound(){return <><PageHero kicker="404" title="Page not found" desc="The page you're looking for doesn't exist."/><section className="section"><div className="container center"><Link className="primary" to="/">Return home</Link></div></section></>}

