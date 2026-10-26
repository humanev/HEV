import {useEffect, useState} from "react";
import {Outlet, useLocation} from "react-router-dom";
import TopBar from "../components/navigation/TopBar";
import Header from "../components/navigation/Header";
import MobileMenu from "../components/navigation/MobileMenu";
import Footer from "../components/navigation/Footer";
import ContactCta from "../components/navigation/ContactCta";
import {useContext} from "react";
import {ApiStatusErrorContext, SiteContentErrorContext, useSiteContent} from "../components/common/PageRuntime";
export default function MainLayout(){
  const [mobileOpen,setMobileOpen]=useState(false); const location=useLocation();
  const apiStatusError=useContext(ApiStatusErrorContext); const siteContentError=useContext(SiteContentErrorContext); const {navigation}=useSiteContent();
  useEffect(()=>{setMobileOpen(false);},[location.pathname]);
  return <><TopBar/><Header onMenuOpen={()=>setMobileOpen(true)}/>{mobileOpen&&<MobileMenu navigation={navigation} close={()=>setMobileOpen(false)}/>}<main><Outlet/>{apiStatusError&&<div className="container article-feed-error" role="status">API mode could not be detected: {apiStatusError}</div>}{siteContentError&&<div className="container article-feed-error" role="status">Live website content could not be loaded: {siteContentError}</div>}<ContactCta/></main><Footer/></>;
}

