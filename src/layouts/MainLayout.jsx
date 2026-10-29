import {useEffect, useState} from "react";
import {Outlet, useLocation} from "react-router-dom";
import TopBar from "../components/navigation/TopBar";
import Header from "../components/navigation/Header";
import MobileMenu from "../components/navigation/MobileMenu";
import Footer from "../components/navigation/Footer";
import ContactCta from "../components/navigation/ContactCta";
import AssignedPageContent from "../components/common/AssignedPageContent";
import {getPagePlacement} from "../features/navigation/sitePages";
import {useContext} from "react";
import {ApiStatusErrorContext, SiteContentErrorContext, useSiteContent} from "../components/common/PageRuntime";
export default function MainLayout(){
  const [mobileOpen,setMobileOpen]=useState(false); const location=useLocation();
  const apiStatusError=useContext(ApiStatusErrorContext); const siteContentError=useContext(SiteContentErrorContext); const {navigation}=useSiteContent();
  const pagePlacement=getPagePlacement(location.pathname)?.replace("page-", "") || null;
  useEffect(()=>{setMobileOpen(false);},[location.pathname]);
  return <><TopBar/><Header onMenuOpen={()=>setMobileOpen(true)}/>{mobileOpen&&<MobileMenu navigation={navigation} close={()=>setMobileOpen(false)}/>}<main><Outlet/>{pagePlacement&&<AssignedPageContent page={pagePlacement}/>}{apiStatusError&&<div className="container article-feed-error" role="status">API mode could not be detected: {apiStatusError}</div>}{siteContentError&&<div className="container article-feed-error" role="status">Live website content could not be loaded: {siteContentError}</div>}<ContactCta/></main><Footer/></>;
}
