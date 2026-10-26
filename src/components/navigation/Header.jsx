import { CstButton } from "../../components/common/ui-components";
import {useTheme} from "../../hooks/useTheme";
import {Link} from "react-router-dom";
import {Menu, Search, Moon, Sun, User} from "lucide-react";
import {useSiteContent} from "../common/PageRuntime";

export default function Header({onMenuOpen}){
  const {navigation}=useSiteContent(); const {dark,toggle}=useTheme();
  return <header className="header"><div className="container header-inner">
    <CstButton className="mobile-menu" onClick={onMenuOpen} aria-label="Open navigation"><Menu/></CstButton>
    <Link to="/" className="logo"><span className="logo-mark">H</span><span>HUMANS <i>of</i> EV</span></Link>
    <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(item=><Link key={item.label} to={item.path} className="nav-link">{item.label}</Link>)}</nav>
    <div className="header-actions"><CstButton className="icon-btn" href="/search" aria-label="Search"><Search size={18}/></CstButton><CstButton className="icon-btn" onClick={toggle} aria-label={dark?"Switch to light mode":"Switch to dark mode"}>{dark?<Sun size={18}/>:<Moon size={18}/>}</CstButton><CstButton className="subscribe-btn" href="/membership">Subscribe</CstButton><CstButton className="account-btn" href="/account" aria-label="Account"><User size={17}/></CstButton></div>
  </div></header>;
}


