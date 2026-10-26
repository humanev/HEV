import { CstButton } from "../../components/common/ui-components";
import {Link} from "react-router-dom";
import {X, ArrowUpRight} from "lucide-react";
export default function MobileMenu({navigation,close}){return <div className="mobile-overlay" onClick={close}><aside className="mobile-drawer" onClick={e=>e.stopPropagation()}><div className="mobile-head"><Link to="/" className="logo" onClick={close}><span className="logo-mark">H</span><span>HUMANS <i>of</i> EV</span></Link><CstButton onClick={close}><X/></CstButton></div><nav className="mobile-nav-links">{navigation.map(n=><Link key={n.label} to={n.path} onClick={close}>{n.label}<ArrowUpRight size={14}/></Link>)}</nav><Link to="/membership" className="mobile-sub" onClick={close}>Subscribe</Link></aside></div>}
