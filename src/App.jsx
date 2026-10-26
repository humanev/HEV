import {useEffect, useState} from "react";
import {Routes, Route} from "react-router-dom";
import {siteContentDefaults} from "./data";
import {apiRequest} from "./api";
import {SiteContentContext, DemoModeContext, SiteContentErrorContext, ApiStatusErrorContext} from "./components/common/PageRuntime";
import {ThemeContext, useThemeState} from "./hooks/useTheme";
import MainLayout from "./layouts/MainLayout";
import AdminPage from "./pages/Admin/AdminPage";
import HomePage from "./pages/Home/HomePage";
import NewsLandingPage from "./pages/Landing/NewsLandingPage";
import ArticlesPage from "./pages/Articles/ArticlesPage";
import ArticleDetailsPage from "./pages/Articles/ArticleDetailsPage";
import IntelligenceLandingPage from "./pages/Landing/IntelligenceLandingPage";
import DashboardPage from "./pages/Intelligence/DashboardPage";
import IntelligenceDetailPage from "./pages/Intelligence/IntelligenceDetailPage";
import VehiclesLandingPage from "./pages/Landing/VehiclesLandingPage";
import BusinessLandingPage from "./pages/Landing/BusinessLandingPage";
import EnergyLandingPage from "./pages/Landing/EnergyLandingPage";
import PeopleLandingPage from "./pages/Landing/PeopleLandingPage";
import CXOVoicesPage from "./pages/People/CXOVoicesPage";
import PeopleProfilePage from "./pages/People/PeopleProfilePage";
import StartupHubPage from "./pages/Directory/StartupHubPage";
import CompanyDirectoryPage from "./pages/Directory/CompanyDirectoryPage";
import InvestorsPage from "./pages/Investors/InvestorsPage";
import InvestorDetailPage from "./pages/Investors/InvestorDetailPage";
import ResearchPage from "./pages/Research/ResearchPage";
import ResearchDetailPage from "./pages/Research/ResearchDetailPage";
import MagazinePage from "./pages/Magazine/MagazinePage";
import MagazineArchivePage from "./pages/Magazine/MagazineArchivePage";
import MagazineArticlePage from "./pages/Magazine/MagazineArticlePage";
import MediaLandingPage from "./pages/Landing/MediaLandingPage";
import MediaPage from "./pages/Media/MediaPage";
import EventsLandingPage from "./pages/Landing/EventsLandingPage";
import EventsPage from "./pages/Events/EventsPage";
import B2BSolutionsLandingPage from "./pages/Landing/B2BSolutionsLandingPage";
import AwardsPage from "./pages/Awards/AwardsPage";
import LearningPage from "./pages/Learning/LearningPage";
import CommunityPage from "./pages/Community/CommunityPage";
import MembershipPage from "./pages/Membership/MembershipPage";
import AccountPage from "./pages/Account/AccountPage";
import SearchPage from "./pages/Search/SearchPage";
import JobsPage from "./pages/Jobs/JobsPage";
import ContactPage from "./pages/Contact/ContactPage";
import NewsletterPage from "./pages/Newsletter/NewsletterPage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";
import EcosystemLandingPage from "./pages/Landing/EcosystemLandingPage";

export default function App(){
  const [dark,toggle]=useThemeState();
  const [siteContent,setSiteContent]=useState(siteContentDefaults);
  const [siteContentError,setSiteContentError]=useState("");
  const [localDemoMode,setLocalDemoMode]=useState(false);
  const [apiStatusError,setApiStatusError]=useState("");
  useEffect(()=>{
    let mounted=true;
    apiRequest("/api/site-content").then(({content})=>{if(mounted){setSiteContent({...siteContentDefaults,...content});setSiteContentError("")}}).catch(error=>{if(mounted)setSiteContentError(error.message)});
    apiRequest("/api/status").then(({localDemoMode:enabled})=>{if(mounted){setLocalDemoMode(enabled);setApiStatusError("")}}).catch(error=>{if(mounted)setApiStatusError(error.message)});
    return ()=>{mounted=false};
  },[]);
  return <ThemeContext.Provider value={{dark,toggle}}><DemoModeContext.Provider value={localDemoMode}><SiteContentContext.Provider value={siteContent}><SiteContentErrorContext.Provider value={siteContentError}><ApiStatusErrorContext.Provider value={apiStatusError}><div className={dark?"app dark":"app"}>
    <Routes>
      <Route path="/admin/*" element={<AdminPage onSiteContentChange={(section,content)=>setSiteContent(current=>({...current,[section]:content}))}/>}/>
      <Route element={<MainLayout/>}>
        <Route path="/" element={<HomePage/>}/>
        <Route path="/news" element={<NewsLandingPage/>}/>
        <Route path="/news/all" element={<ArticlesPage title="Latest News" kicker="THE NEWSROOM"/>}/>
        <Route path="/news/:slug" element={<ArticleDetailsPage/>}/>
        <Route path="/intelligence" element={<IntelligenceLandingPage/>}/>
        <Route path="/intelligence/dashboard" element={<DashboardPage/>}/>
        <Route path="/intelligence/:slug" element={<IntelligenceDetailPage/>}/>
        <Route path="/vehicles" element={<VehiclesLandingPage/>}/>
        <Route path="/ev-business" element={<BusinessLandingPage/>}/>
        <Route path="/ecosystem" element={<EcosystemLandingPage/>}/>
        <Route path="/energy" element={<EnergyLandingPage/>}/>
        <Route path="/people" element={<PeopleLandingPage/>}/>
        <Route path="/people/cxo-voices" element={<CXOVoicesPage/>}/>
        <Route path="/people/:slug" element={<PeopleProfilePage/>}/>
        <Route path="/startups" element={<StartupHubPage/>}/>
        <Route path="/directory" element={<CompanyDirectoryPage/>}/>
        <Route path="/investors" element={<InvestorsPage/>}/>
        <Route path="/investors/:slug" element={<InvestorDetailPage/>}/>
        <Route path="/research" element={<ResearchPage/>}/>
        <Route path="/research/:slug" element={<ResearchDetailPage/>}/>
        <Route path="/magazine" element={<MagazinePage/>}/>
        <Route path="/magazine/archive" element={<MagazineArchivePage/>}/>
        <Route path="/magazine/:slug" element={<MagazineArticlePage/>}/>
        <Route path="/podcasts" element={<MediaPage type="Podcasts"/>}/>
        <Route path="/videos" element={<MediaPage type="Videos"/>}/>
        <Route path="/media" element={<MediaLandingPage/>}/>
        <Route path="/events" element={<EventsLandingPage/>}/>
        <Route path="/events/calendar" element={<EventsPage/>}/>
        <Route path="/b2b-solutions" element={<B2BSolutionsLandingPage/>}/>
        <Route path="/awards" element={<AwardsPage/>}/>
        <Route path="/learning" element={<LearningPage/>}/>
        <Route path="/community" element={<CommunityPage/>}/>
        <Route path="/membership" element={<MembershipPage/>}/>
        <Route path="/account" element={<AccountPage/>}/>
        <Route path="/search" element={<SearchPage/>}/>
        <Route path="/jobs" element={<JobsPage/>}/>
        <Route path="/contact" element={<ContactPage/>}/>
        <Route path="/newsletter" element={<NewsletterPage/>}/>
        <Route path="*" element={<NotFoundPage/>}/>
      </Route>
    </Routes>
  </div></ApiStatusErrorContext.Provider></SiteContentErrorContext.Provider></SiteContentContext.Provider></DemoModeContext.Provider></ThemeContext.Provider>;
}

