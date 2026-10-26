import {useArticles, useSiteContent} from "../../components/common/PageRuntime";
import HomeHeroSection from "./components/HomeHeroSection";
import NewsroomError from "./components/NewsroomError";
import HomeDashboardSection from "./components/HomeDashboardSection";
import HomeNewsSection from "./components/HomeNewsSection";
import HomeCapabilitiesSection from "./components/HomeCapabilitiesSection";
import HomeResearchSection from "./components/HomeResearchSection";
import HomeNewsletterSection from "./components/HomeNewsletterSection";
export default function HomePage(){
 const {articles,error}=useArticles();
 const {homeStats,reports,homeCapabilities}=useSiteContent();
 const featured=articles[0];
 return <><HomeHeroSection featured={featured}/><NewsroomError error={error}/><HomeDashboardSection homeStats={homeStats}/><HomeNewsSection articles={articles}/><HomeCapabilitiesSection homeCapabilities={homeCapabilities}/><HomeResearchSection reports={reports}/><HomeNewsletterSection/></>;
}
