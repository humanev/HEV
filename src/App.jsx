import React, {useEffect, useMemo, useState} from "react";
import {Routes, Route, Link, useLocation, useParams, useSearchParams} from "react-router-dom";
import {Search, Menu, X, ChevronDown, ArrowUpRight, Bookmark, Play, Moon, Sun, User, Bell, Sparkles, BarChart3, Building2, CalendarDays, FileText, Mic2, Award, GraduationCap, Users, TrendingUp, ShieldCheck, Zap, Check, Video as VideoIcon} from "lucide-react";
import {siteContentDefaults, stories} from "./data";
import {apiRequest} from "./api";
import AdminPanel from "./AdminPanel";

const imgFallback = "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80";
const SiteContentContext = React.createContext(siteContentDefaults);
const DemoModeContext = React.createContext(false);

function useSiteContent(){
  return React.useContext(SiteContentContext);
}

function useTheme(){
  const [dark,setDark] = useState(()=>localStorage.getItem("hev-theme")==="dark");
  const toggle=()=>setDark(v=>{const n=!v; localStorage.setItem("hev-theme",n?"dark":"light"); return n});
  return [dark,toggle];
}

function useArticles(){
  const [articles,setArticles] = useState(stories);
  const [error,setError] = useState("");
  useEffect(()=>{
    let mounted=true;
    apiRequest("/api/articles")
      .then(({articles:published})=>{if(mounted)setArticles(published)})
      .catch(requestError=>{if(mounted)setError(requestError.message)})
    return ()=>{mounted=false};
  },[]);
  return {articles,error};
}

function useManagedContent(kind){
  const [items,setItems]=useState([]);
  const [error,setError]=useState("");
  useEffect(()=>{
    let mounted=true;
    apiRequest(`/api/content/${kind}`)
      .then(({items:published})=>{if(mounted){setItems(published);setError("")}})
      .catch(requestError=>{if(mounted)setError(requestError.message)})
    return ()=>{mounted=false};
  },[kind]);
  return {items,error};
}

function App(){
  const [dark,toggle] = useTheme();
  const [mobile,setMobile] = useState(false);
  const [siteContent,setSiteContent] = useState(siteContentDefaults);
  const [siteContentError,setSiteContentError] = useState("");
  const [localDemoMode,setLocalDemoMode] = useState(false);
  const [apiStatusError,setApiStatusError] = useState("");
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  useEffect(()=>{
    let mounted=true;
    apiRequest("/api/site-content")
      .then(({content})=>{if(mounted){setSiteContent({...siteContentDefaults,...content});setSiteContentError("")}})
      .catch(requestError=>{if(mounted)setSiteContentError(requestError.message)})
    return ()=>{mounted=false};
  },[]);
  useEffect(()=>{
    let mounted=true;
    apiRequest("/api/status")
      .then(({localDemoMode:enabled})=>{if(mounted){setLocalDemoMode(enabled);setApiStatusError("")}})
      .catch(requestError=>{if(mounted)setApiStatusError(requestError.message)});
    return ()=>{mounted=false};
  },[]);
  return <DemoModeContext.Provider value={localDemoMode}><SiteContentContext.Provider value={siteContent}><div className={dark?"app dark":"app"}>
    {!isAdmin&&<><TopBar/>
    <header className="header">
      <div className="container header-inner">
        <button className="mobile-menu" onClick={()=>setMobile(true)}><Menu/></button>
        <Link to="/" className="logo">
          <span className="logo-mark">H</span><span>HUMANS <i>of</i> EV</span>
        </Link>
        <nav className="desktop-nav">
          {siteContent.navigation.map((n)=><Link key={n.label} to={n.path} className="nav-link">{n.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link to="/search" className="icon-btn"><Search size={18}/></Link>
          <button className="icon-btn" onClick={toggle}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
          <Link to="/membership" className="subscribe-btn">Subscribe</Link>
          <Link to="/account" className="account-btn"><User size={17}/></Link>
        </div>
      </div>
    </header>
    {mobile&&<MobileNav navigation={siteContent.navigation} close={()=>setMobile(false)}/>}
    </>}
    <main><Routes>
      <Route path="/admin/*" element={<AdminPanel onSiteContentChange={(section, content) => setSiteContent((current) => ({...current,[section]:content}))}/>}/>
      <Route path="/" element={<Home/>}/>
      <Route path="/news" element={<MenuLanding page="news"/>}/>
      <Route path="/news/all" element={<Listing title="Latest News" kicker="THE NEWSROOM"/>}/>
      <Route path="/news/:slug" element={<Article/>}/>
      <Route path="/intelligence" element={<MenuLanding page="intelligence"/>}/>
      <Route path="/intelligence/dashboard" element={<Dashboard/>}/>
      <Route path="/intelligence/:slug" element={<GenericPage section="Intelligence"/>}/>
      <Route path="/vehicles" element={<MenuLanding page="vehicles"/>}/>
      <Route path="/ev-business" element={<MenuLanding page="business"/>}/>
      <Route path="/ecosystem" element={<MenuLanding page="business"/>}/>
      <Route path="/energy" element={<MenuLanding page="energy"/>}/>
      <Route path="/people" element={<MenuLanding page="people"/>}/>
      <Route path="/people/cxo-voices" element={<CXOPage/>}/>
      <Route path="/people/:slug" element={<GenericPage section="People"/>}/>
      <Route path="/startups" element={<Directory type="Startup Hub"/>}/>
      <Route path="/directory" element={<Directory type="Company Directory"/>}/>
      <Route path="/investors" element={<Investors/>}/>
      <Route path="/investors/:slug" element={<GenericPage section="Investors Hub"/>}/>
      <Route path="/research" element={<Research/>}/>
      <Route path="/research/:slug" element={<GenericPage section="Research"/>}/>
      <Route path="/magazine" element={<Magazine/>}/>
      <Route path="/magazine/archive" element={<MagazineArchive/>}/>
      <Route path="/magazine/:slug" element={<GenericPage section="Digital Magazine"/>}/>
      <Route path="/podcasts" element={<Media type="Podcasts"/>}/>
      <Route path="/videos" element={<Media type="Videos"/>}/>
      <Route path="/media" element={<MenuLanding page="media"/>}/>
      <Route path="/events" element={<MenuLanding page="events"/>}/>
      <Route path="/events/calendar" element={<Events/>}/>
      <Route path="/b2b-solutions" element={<MenuLanding page="b2b"/>}/>
      <Route path="/awards" element={<Awards/>}/>
      <Route path="/learning" element={<Learning/>}/>
      <Route path="/community" element={<Community/>}/>
      <Route path="/membership" element={<Membership/>}/>
      <Route path="/account" element={<Account/>}/>
      <Route path="/search" element={<SearchPage/>}/>
      <Route path="/jobs" element={<GenericPage section="EV Jobs"/>}/>
      <Route path="/contact" element={<Contact/>}/>
      <Route path="/newsletter" element={<Newsletter/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>{apiStatusError&&<div className="container article-feed-error" role="status">API mode could not be detected: {apiStatusError}</div>}{siteContentError&&!isAdmin&&<div className="container article-feed-error" role="status">Live website content could not be loaded: {siteContentError}</div>}{!isAdmin&&<ContactCta/>}</main>
    {!isAdmin&&<Footer/>}
  </div></SiteContentContext.Provider></DemoModeContext.Provider>
}

function TopBar(){return <div className="topbar"><div className="container topbar-inner"><span>India's Most Trusted Electric Mobility Intelligence Platform</span><div><Link to="/newsletter">Weekly Intelligence</Link><span>•</span><Link to="/events">Events</Link><span>•</span><Link to="/membership">Membership</Link></div></div></div>}
function MobileNav({navigation,close}){return <div className="mobile-overlay" onClick={close}><aside className="mobile-drawer" onClick={e=>e.stopPropagation()}><div className="mobile-head"><Link to="/" className="logo" onClick={close}><span className="logo-mark">H</span><span>HUMANS <i>of</i> EV</span></Link><button onClick={close}><X/></button></div><nav className="mobile-nav-links">{navigation.map(n=><Link key={n.label} to={n.path} onClick={close}>{n.label}<ArrowUpRight size={14}/></Link>)}</nav><Link to="/membership" className="mobile-sub" onClick={close}>Subscribe</Link></aside></div>}

function ContactCta(){return <section className="site-contact-cta"><div className="container site-contact-inner"><div><span className="eyebrow">LET’S CONNECT</span><h2>Have a question or a partnership in mind?</h2><p>Talk to the Humans of EV team about memberships, editorial, events and partnerships.</p></div><Link className="primary" to="/contact">Contact us <ArrowUpRight size={16}/></Link></div></section>}

const menuLandingPages={
  news:{kicker:"LATEST NEWS",title:"The EV industry, updated daily",description:"Independent reporting and timely analysis for everyone following electric mobility.",sections:[
    {kicker:"DAILY BRIEFING",title:"The latest from the newsroom",description:"Read current reporting on the people, companies and decisions moving the market.",links:[["All latest news","/news/all"],["EV Intelligence","/intelligence"],["People shaping the industry","/people"]]},
    {kicker:"VEHICLES",title:"Every segment in motion",description:"Track product launches, sales, policy and investment across electric mobility.",links:[["Explore vehicles","/vehicles"],["Two- and three-wheelers","/vehicles"],["Commercial mobility","/vehicles"]]},
    {kicker:"TECHNOLOGY & ENERGY",title:"The systems behind the transition",description:"Follow batteries, charging, software and the new energy infrastructure.",links:[["Energy coverage","/energy"],["Research and reports","/research"],["Market dashboard","/intelligence/dashboard"]]},
    {kicker:"INDUSTRY MOVES",title:"Companies, capital and leadership",description:"Follow the deals, partnerships and leaders influencing the EV ecosystem.",links:[["EV business","/ev-business"],["Funding and investors","/investors"],["Events and announcements","/events"]]}
  ]},
  intelligence:{kicker:"EV INTELLIGENCE",title:"Make better decisions with industry data",description:"Market intelligence, research and paid insight for the people building electric mobility.",sections:[
    {kicker:"LIVE DATA",title:"See the market at a glance",description:"Explore indicators for EV sales, charging, batteries and investment.",links:[["Open the dashboard","/intelligence/dashboard"],["Latest industry news","/news/all"],["Investment activity","/investors"]]},
    {kicker:"MARKET RESEARCH",title:"Understand where the market is going",description:"Find analysis on market size, adoption, competition and forecasts.",links:[["Browse research","/research"],["Market reports","/research"],["Industry outlook","/research"]]},
    {kicker:"TECHNOLOGY & POLICY",title:"Track the forces changing the economics",description:"Explore research on batteries, charging, manufacturing and policy.",links:[["Energy intelligence","/energy"],["EV business","/ev-business"],["Read the newsroom","/news/all"]]},
    {kicker:"MEMBER ACCESS",title:"Go deeper with premium intelligence",description:"Unlock member content and paid insights for your team.",links:[["Membership options","/membership"],["Sign in to your account","/account"],["Talk to our team","/contact"]]}
  ]},
  vehicles:{kicker:"VEHICLES",title:"Explore the electric vehicle market",description:"Coverage for buyers and professionals tracking electric two-wheelers, cars, fleets and commercial vehicles.",sections:[
    {kicker:"TWO- & THREE-WHEELERS",title:"The vehicles reshaping everyday mobility",description:"Follow launches, ownership trends and the companies leading two- and three-wheeler electrification.",links:[["Latest vehicle news","/news/all"],["Company directory","/directory"],["EV market intelligence","/intelligence"]]},
    {kicker:"ELECTRIC CARS",title:"Passenger EVs and the next wave of choice",description:"Track new models, charging access, price shifts and the evolution of the electric car market.",links:[["Latest car coverage","/news/all"],["EV reports","/research"],["Upcoming events","/events/calendar"]]},
    {kicker:"FLEETS & COMMERCIAL",title:"Electrifying business mobility",description:"Explore electric buses, last-mile delivery, logistics and fleet economics.",links:[["EV business directory","/directory"],["Investment and funding","/investors"],["B2B solutions","/b2b-solutions"]]},
    {kicker:"BUYER INTENT",title:"Make the switch with better information",description:"Compare the market, understand infrastructure and connect with the wider EV ecosystem.",links:[["Charging and energy","/energy"],["Read the latest news","/news/all"],["Ask our team","/contact"]]}
  ]},
  business:{kicker:"EV BUSINESS",title:"Discover the companies building electric mobility",description:"A guide to startups, manufacturers, investors and commercial opportunities across the EV value chain.",sections:[
    {kicker:"COMPANIES",title:"Find your place in the ecosystem",description:"Discover companies across vehicles, components, software and infrastructure.",links:[["Company directory","/directory"],["Startup hub","/startups"],["Jobs in EV","/jobs"]]},
    {kicker:"CAPITAL & DEALS",title:"Follow investment and growth",description:"Track investors, fundraising and the financial activity behind the transition.",links:[["Investors hub","/investors"],["Market dashboard","/intelligence/dashboard"],["Latest business news","/news/all"]]},
    {kicker:"SUPPLY CHAIN",title:"From manufacturing to market",description:"Understand the partnerships, production and technologies scaling the industry.",links:[["Energy ecosystem","/energy"],["Industry research","/research"],["EV intelligence","/intelligence"]]},
    {kicker:"PARTNERSHIPS",title:"Turn discovery into opportunity",description:"Meet leaders, participate in industry events and connect with our B2B team.",links:[["Events and awards","/events"],["People and leaders","/people"],["B2B solutions","/b2b-solutions"]]}
  ]},
  energy:{kicker:"ENERGY",title:"Powering electric mobility",description:"Follow the charging networks, batteries and clean energy systems that make electrification work.",sections:[
    {kicker:"CHARGING",title:"Building access to reliable charging",description:"Explore charging infrastructure, networks, deployment and business models.",links:[["Latest charging news","/news/all"],["Company directory","/directory"],["Market intelligence","/intelligence"]]},
    {kicker:"BATTERIES",title:"The technology at the heart of EVs",description:"Track cells, battery packs, manufacturing, materials and recycling.",links:[["Battery research","/research"],["EV companies","/ev-business"],["Industry news","/news/all"]]},
    {kicker:"RENEWABLES",title:"Connecting mobility with clean power",description:"See how renewable generation and smarter grids support electrified transport.",links:[["Energy market reports","/research"],["EV dashboard","/intelligence/dashboard"],["Industry leaders","/people"]]},
    {kicker:"STORAGE & SYSTEMS",title:"Scaling the infrastructure of tomorrow",description:"Follow stationary storage, software and integrated energy solutions.",links:[["Energy companies","/directory"],["Events and discussions","/events"],["Contact our team","/contact"]]}
  ]},
  people:{kicker:"PEOPLE",title:"Meet the people moving the EV industry forward",description:"Conversations and perspectives from CXOs, founders, investors and the next generation of leaders.",sections:[
    {kicker:"CXO VOICES",title:"Leadership from the front line",description:"Hear from executives shaping strategy, technology and growth.",links:[["Executive conversations","/people/cxo-voices"],["Podcasts","/podcasts"],["Latest leadership news","/news/all"]]},
    {kicker:"FOUNDERS",title:"Meet the builders",description:"Discover the founders creating new products and businesses across mobility.",links:[["Founder stories","/people/founders"],["Startup hub","/startups"],["EV business","/ev-business"]]},
    {kicker:"INVESTORS & EXPERTS",title:"Perspectives on where the market is going",description:"Explore capital, research and insight from people close to the market.",links:[["Investors","/investors"],["Research and intelligence","/intelligence"],["Expert community","/community"]]},
    {kicker:"YOUNG LEADERS",title:"A new generation shaping the transition",description:"Find emerging voices, industry events and opportunities to connect.",links:[["Events and awards","/events"],["Community","/community"],["Contact the editorial team","/contact"]]}
  ]},
  media:{kicker:"HEV MEDIA",title:"Stories, conversations and films from the EV ecosystem",description:"Explore Humans of EV magazine, podcasts, videos and Green Route features.",sections:[
    {kicker:"MAGAZINE",title:"Read the digital edition",description:"Explore the latest issue and the complete magazine archive.",links:[["Current magazine","/magazine"],["Browse the archive","/magazine/archive"],["Latest features","/news/all"]]},
    {kicker:"PODCASTS",title:"Listen to industry conversations",description:"Hear candid discussions with executives, founders and experts.",links:[["Listen to podcasts","/podcasts"],["Meet the leaders","/people"],["Explore intelligence","/intelligence"]]},
    {kicker:"VIDEO",title:"Watch the people and technology in action",description:"See interviews, factory visits, panels and product launches.",links:[["Watch videos","/videos"],["Upcoming events","/events"],["Explore vehicles","/vehicles"]]},
    {kicker:"GREEN ROUTE",title:"Follow the journey to a cleaner future",description:"Discover stories about the people, places and ideas driving change.",links:[["Read the newsroom","/news/all"],["Explore energy","/energy"],["Work with HEV Media","/b2b-solutions"]]}
  ]},
  events:{kicker:"EVENTS",title:"Bring the electric mobility community together",description:"Find industry forums, roundtables and awards—or partner with Humans of EV to create the next conversation.",sections:[
    {kicker:"UPCOMING",title:"Meet the industry in person",description:"Connect with executives, operators, investors and innovators at upcoming events.",links:[["View the event calendar","/events/calendar"],["People and speakers","/people"],["Latest event news","/news/all"]]},
    {kicker:"ROUNDTABLES",title:"Focused conversations, real connections",description:"Join discussions on the markets and technologies changing electric mobility.",links:[["Industry intelligence","/intelligence"],["Energy conversations","/energy"],["Contact the events team","/contact"]]},
    {kicker:"AWARDS",title:"Recognise the people creating change",description:"Celebrate leaders, startups and innovations moving the industry forward.",links:[["Humans of EV Awards","/awards"],["Meet industry leaders","/people"],["Nomination enquiries","/contact"]]},
    {kicker:"SPONSORSHIP",title:"Put your brand in the room",description:"Reach an engaged audience of decision-makers, builders and industry leaders.",links:[["B2B partnerships","/b2b-solutions"],["Explore membership","/membership"],["Talk to our team","/contact"]]}
  ]},
  b2b:{kicker:"B2B SOLUTIONS",title:"Reach the people building electric mobility",description:"Partner with Humans of EV to connect your organisation with the EV industry through trusted content, intelligence and events.",sections:[
    {kicker:"BRAND & MEDIA",title:"Tell your story to the right audience",description:"Build visibility through editorial partnerships, video and digital media.",links:[["HEV Media","/media"],["Audience and news","/news/all"],["Discuss a partnership","/contact"]]},
    {kicker:"RESEARCH & INTELLIGENCE",title:"Make informed commercial decisions",description:"Use market insights and research to understand opportunities and customers.",links:[["Research library","/research"],["EV dashboard","/intelligence/dashboard"],["Membership options","/membership"]]},
    {kicker:"EVENTS & SPONSORSHIP",title:"Create meaningful industry connections",description:"Meet decision-makers and support conversations that move the sector forward.",links:[["Upcoming events","/events"],["Awards","/awards"],["Request sponsorship details","/contact"]]},
    {kicker:"ECOSYSTEM & TALENT",title:"Find partners, companies and people",description:"Discover startups, investors and talent across the electric mobility value chain.",links:[["Company directory","/directory"],["Startup hub","/startups"],["Investor network","/investors"]]}
  ]}
};
function MenuLanding({page}){
  const content=menuLandingPages[page];
  if(!content)return <NotFound/>;
  return <><PageHero kicker={content.kicker} title={content.title} desc={content.description}/>{content.sections.map((section,index)=><section className={`section menu-topic-section${index%2===1?" menu-topic-muted":""}`} key={section.title}><div className="container"><div className="menu-topic-heading"><span className="eyebrow">{section.kicker}</span><h2>{section.title}</h2><p>{section.description}</p></div><div className="menu-topic-grid">{section.links.map(([label,path])=><Link className="menu-topic-card" to={path} key={`${label}-${path}`}><span>{label}</span><ArrowUpRight size={17}/></Link>)}</div></div></section>)}</>;
}

function PageHero({kicker,title,desc}){return <section className="page-hero"><div className="container"><span className="eyebrow">{kicker}</span><h1>{title}</h1>{desc&&<p>{desc}</p>}</div></section>}
function SectionTitle({kicker,title,link="/news"}){return <div className="section-title"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div><Link to={link}>Explore all <ArrowUpRight size={16}/></Link></div>}
function Home(){
  const {articles,error} = useArticles();
  const {homeStats,reports,homeCapabilities} = useSiteContent();
  const featured = articles[0] || stories[0];
  return <><section className="hero"><div className="hero-bg"></div><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow light">HUMANS OF EV 5.0</span><h1>The Voice of India’s <em>Electric Mobility</em> Industry</h1><p>Trusted journalism, intelligence, research and executive insight for the people building the electric future.</p><div className="hero-actions"><Link className="primary" to="/news">Explore Intelligence <ArrowUpRight size={17}/></Link><Link className="ghost" to="/membership">Become a Member</Link></div></div><div className="hero-feature"><div className="feature-image"><img src={featured.image} onError={e=>e.currentTarget.src=imgFallback}/><span className="play"><Play fill="currentColor" size={18}/></span></div><div className="feature-body"><span className="eyebrow">Editor's Pick</span><h3>{featured.title}</h3><span className="meta">{featured.time} · {featured.author}</span></div></div></div><div className="ticker"><div className="ticker-label"><Zap size={14}/> BREAKING</div><div className="ticker-track">India's EV ecosystem crosses a new infrastructure milestone <span>•</span> New battery manufacturing capacity announced <span>•</span> Startup funding activity accelerates</div></div></section>
    {error&&<div className="container article-feed-error" role="status">Live newsroom content could not be loaded: {error}</div>}
    <section className="dashboard-strip"><div className="container"><div className="section-title compact"><div><span className="eyebrow">LIVE INDUSTRY DASHBOARD</span><h2>EV market at a glance</h2></div><Link to="/intelligence/dashboard">Open dashboard <ArrowUpRight size={16}/></Link></div><div className="stat-grid">{homeStats.map(([a,b,c])=><div className="stat" key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></div>)}</div></div></section>
    <section className="section"><div className="container"><SectionTitle kicker="THE NEWSROOM" title="Latest industry intelligence"/><div className="news-grid">{articles.slice(0,4).map((s,i)=><StoryCard story={s} featured={i===0} key={s.id}/>)}</div></div></section>
    <section className="dark-section"><div className="container"><SectionTitle kicker="WHY HUMANS OF EV" title="More than news." link="/intelligence"/><div className="cap-grid">{homeCapabilities.map(([t,d,p,iconName])=>{const Icon={FileText,Users,Building2,Sparkles}[iconName];return <Link className="cap" to={p} key={t}><Icon size={25}/><h3>{t}</h3><p>{d}</p><ArrowUpRight size={17}/></Link>})}</div></div></section>
    <section className="section"><div className="container"><SectionTitle kicker="RESEARCH & INTELLIGENCE" title="Reports executives are reading" link="/research"/><div className="report-grid">{reports.slice(0,4).map((r,i)=><Link className="report-card" to="/research" key={r[0]}><div className="report-cover"><span>HOEV<br/><b>INSIGHT</b></span><small>2026</small></div><div><span className="tag">{r[2]}</span><h3>{r[0]}</h3><p>{r[1]} · 24 pages</p></div></Link>)}</div></div></section>
    <section className="newsletter"><div className="container newsletter-inner"><div><span className="eyebrow">THE WEEKLY BRIEF</span><h2>Make sense of the EV industry.</h2><p>One intelligent briefing. Market moves, policy, funding, technology and the people behind it.</p></div><NewsletterForm/></div></section>
  </>
}
function StoryCard({story,featured}){return <article className={featured?"story featured":"story"}><Link to={"/news/"+story.id} className="story-img"><img src={story.image} onError={e=>e.currentTarget.src=imgFallback}/></Link><div className="story-body"><span className="tag">{story.category}</span>{story.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<Link to={"/news/"+story.id}><h3>{story.title}</h3></Link><p>{story.excerpt}</p><div className="story-meta"><span>{story.author} · {story.time}</span><Bookmark size={16}/></div></div></article>}
function Listing({title,kicker}){
  const {articles,error}=useArticles();
  return <><PageHero kicker={kicker} title={title} desc="Independent reporting, analysis and insight across India's electric mobility ecosystem."/>{error&&<div className="container article-feed-error" role="status">Live newsroom content could not be loaded: {error}</div>}<section className="section"><div className="container"><div className="filter-row"><button className="filter active">All</button>{["Cars","Two Wheelers","Buses","Battery","Charging","Policy","Startups"].map(x=><button className="filter" key={x}>{x}</button>)}</div><div className="news-grid listing">{articles.map((story)=><StoryCard story={story} key={story.id}/>)}</div></div></section></>
}
function Article(){
  const {slug}=useParams();
  const [article,setArticle]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let mounted=true;
    setLoading(true);
    setError("");
    apiRequest(`/api/articles/${encodeURIComponent(slug)}`)
      .then(({article:published})=>{if(mounted){setArticle(published);setError("")}})
      .catch(requestError=>{if(mounted){setArticle(null);setError(requestError.message)}})
      .finally(()=>{if(mounted)setLoading(false)})
    return ()=>{mounted=false};
  },[slug]);
  if(loading)return <><PageHero kicker="THE NEWSROOM" title="Loading article…"/><section className="section"><div className="container article-wrap"><span className="admin-spinner"/></div></section></>;
  if(!article)return <><PageHero kicker="THE NEWSROOM" title="Article unavailable" desc={error||"This article is not available."}/><section className="section"><div className="container center"><Link className="primary" to="/news">Back to the newsroom</Link></div></section></>;
  return <><PageHero kicker={article.category} title={article.title} desc={article.excerpt}/><article className="article"><div className="container article-wrap"><img className="article-image" src={article.image} onError={e=>e.currentTarget.src=imgFallback}/><div className="article-meta"><span>{article.author}</span><span>{article.time}</span><span>{article.createdAt?new Date(`${article.createdAt.replace(" ","T")}Z`).toLocaleDateString():"Published today"}</span></div>{article.requiresMembership?<MembershipGate/>:<div className="article-content">{article.body.split(/\n\n+/).filter(Boolean).map((paragraph,index)=>{const sourceUrl=paragraph.match(/^Source: (https:\/\/humansofev\.info\/\S+)$/)?.[1];return <p className={index===0?"lead":""} key={index}>{sourceUrl?<>Source: <a href={sourceUrl} target="_blank" rel="noreferrer">Original article at Humans of EV</a></>:paragraph}</p>})}</div>}</div></article></>
}
function MembershipGate(){return <div className="membership-gate"><span className="access-badge">MEMBERS ONLY</span><h2>Unlock this content with membership</h2><p>This article is reserved for active Humans of EV members.</p><div><Link className="primary" to="/membership">View membership options</Link><Link className="outline" to="/account">Sign in</Link></div></div>}
function Intelligence(){const {reports}=useSiteContent();return <><PageHero kicker="RESEARCH CENTRE" title="Intelligence for decisions" desc="A premium research platform covering markets, technology, policy, investment and the economics of electrification."/><section className="section"><div className="container"><div className="int-grid"><Link className="big-tile" to="/intelligence/dashboard"><BarChart3/><span className="eyebrow">LIVE DATA</span><h2>EV Industry Dashboard</h2><p>Track market activity, infrastructure, funding and manufacturing indicators.</p></Link>{reports.map(r=><Link className="intel-card" to="/research" key={r[0]}><span className="tag">{r[2]}</span><h3>{r[0]}</h3><p>{r[1]}</p><ArrowUpRight size={17}/></Link>)}</div></div></section></>}
function Dashboard(){const {dashboardData}=useSiteContent();return <><PageHero kicker="LIVE INDUSTRY DASHBOARD" title="India EV intelligence dashboard" desc="A decision-support view of the indicators shaping electric mobility."/><section className="section"><div className="container"><div className="dashboard-cards">{dashboardData.map(x=><div className="dash-card" key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong><small>{x[2]} YoY</small></div>)}</div><div className="chart"><div className="chart-head"><h2>Market momentum</h2><span>2024 — 2026</span></div><div className="bars">{[48,62,58,72,81,78,91,96].map((h,i)=><div key={i} className="bar-wrap"><div className="bar" style={{height:h+"%"}}></div><small>{2023+i}</small></div>)}</div></div></div></section></>}
function Directory({type}){const {directory}=useSiteContent();return <><PageHero kicker="ECOSYSTEM" title={type} desc="Searchable profiles across OEMs, batteries, charging, fleets, software, components, investors and more."/><section className="section"><div className="container"><div className="directory-tools"><div className="searchbox"><Search size={18}/><input placeholder={"Search "+type.toLowerCase()+"..."}/></div><select><option>All industries</option><option>Battery</option><option>Charging</option><option>OEM</option><option>Fleet</option></select><select><option>India</option><option>Global</option></select></div><div className="company-grid">{directory.map(c=><div className="company-card" key={c[0]}><div className="company-logo">{c[0][0]}</div><div><h3>{c[0]}</h3><p>{c[1]} · {c[2]}</p><span>{c[3]}</span></div><ArrowUpRight size={17}/></div>)}</div></div></section></>}
function Investors(){const {investorDeals}=useSiteContent();return <><PageHero kicker="CAPITAL & DEALS" title="Investors Hub" desc="Track venture funding, strategic investment, acquisitions and the capital shaping electric mobility."/><section className="section"><div className="container"><div className="metric-row"><div><TrendingUp/><strong>$1.4B</strong><span>tracked startup funding</span></div><div><Building2/><strong>128</strong><span>deals tracked</span></div><div><BarChart3/><strong>42</strong><span>active investors</span></div></div><SectionTitle kicker="LATEST" title="Funding intelligence" link="/investors/funding"/><div className="funding-list">{investorDeals.map(([title,amount,date])=><div key={title}><span>{date}</span><h3>{title}</h3><strong>{amount}</strong></div>)}</div></div></section></>}
function Research(){const {reports}=useSiteContent();return <><PageHero kicker="RESEARCH LIBRARY" title="Research that moves markets" desc="Premium reports, whitepapers, case studies, datasets and market forecasts."/><section className="section"><div className="container"><div className="report-grid full">{reports.map(r=><Link className="report-card" to="/research/report" key={r[0]}><div className="report-cover"><span>HOEV<br/><b>INSIGHT</b></span><small>2026</small></div><div><span className="tag">{r[2]}</span><h3>{r[0]}</h3><p>{r[1]} · Executive edition</p><button>View report</button></div></Link>)}</div></div></section></>}
function People(){
  const {items:cxos,error}=useManagedContent("cxo");
  const {peopleVoices}=useSiteContent();
  return <><PageHero kicker="HUMANS OF EV" title="The people building the electric future" desc="Conversations with CEOs, founders, investors, policymakers, researchers and global industry leaders."/><section className="section"><div className="container"><div className="people-grid">{peopleVoices.map(([role,initials,title])=><div className="person-card" key={role}><div className="person-avatar">{initials}</div><span className="tag">{role}</span><h3>{title}</h3><p>Executive conversation · 12 min</p></div>)}</div>
      {(cxos.length>0||error)&&<div className="cxo-content"><SectionTitle kicker="CXO VOICES" title="Executive perspectives" link="/people/cxo-voices"/>{error&&<p className="article-feed-error">Executive profiles could not be loaded: {error}</p>}<div className="people-grid">{cxos.map((person)=><article className="person-card managed-person" key={person.id}>{person.image&&<img className="managed-person-image" src={person.image} alt={person.personName} onError={e=>e.currentTarget.src=imgFallback}/>}<span className="tag">{person.role}</span>{person.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{person.title}</h3><strong>{person.personName}</strong><p>{person.organization}</p><p>{person.description}</p>{person.requiresMembership?<Link className="admin-content-link" to="/membership">View membership options <ArrowUpRight size={14}/></Link>:person.mediaUrl&&<a className="admin-content-link" href={person.mediaUrl} target="_blank" rel="noreferrer">View conversation <ArrowUpRight size={14}/></a>}</article>)}</div></div>}
    </div></section></>
}
function CXOPage(){
  const {items:cxos,error}=useManagedContent("cxo");
  return <><PageHero kicker="CXO VOICES" title="Conversations with industry leaders" desc="First-hand perspectives from the executives building India's electric mobility ecosystem."/>
    {error&&<div className="container article-feed-error">Executive profiles could not be loaded: {error}</div>}
    <section className="section"><div className="container"><div className="managed-content-grid cxo-profile-grid">{cxos.map((person)=><article className="managed-content-card cxo-profile-card" key={person.id}><img src={person.image} alt={person.personName} onError={e=>e.currentTarget.src=imgFallback}/><div><span className="tag">{person.role}</span>{person.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{person.personName}</h3>{person.organization&&<strong>{person.organization}</strong>}<h4>{person.title}</h4><p>{person.description}</p>{person.body&&!person.mediaUrl&&<p>{person.body}</p>}{person.requiresMembership?<Link to="/membership">View membership options <ArrowUpRight size={14}/></Link>:person.mediaUrl&&<a href={person.mediaUrl} target="_blank" rel="noreferrer">View conversation <ArrowUpRight size={14}/></a>}</div></article>)}</div>{cxos.length===0&&!error&&<div className="placeholder"><Users size={34}/><h2>Executive conversations are coming soon.</h2><p>Check back for perspectives from the people shaping electric mobility.</p></div>}</div></section>
  </>;
}
function Magazine(){
  const {items,error}=useManagedContent("magazine");
  const current=items[0];
  const archive=items.slice(1);
  return <><PageHero kicker="DIGITAL MAGAZINE" title="The Humans of EV Magazine" desc="Long-form stories, visual essays, executive interviews and deep industry analysis."/>
    {error&&<div className="container article-feed-error">Magazine issues could not be loaded: {error}</div>}
    <section className="section"><div className="container">
      {current?<div className="magazine-hero"><div className="mag-cover managed-mag-cover" style={{backgroundImage:`linear-gradient(145deg,rgba(7,29,39,.24),rgba(7,29,39,.88)),url("${current.image}")`}}><span>HUMANS<br/><b>OF EV</b></span><small>{current.issueLabel}</small></div><div>{current.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<span className="eyebrow">CURRENT ISSUE · {current.issueLabel}</span><h2>{current.title}</h2><p>{current.description}</p><div className="hero-actions">{current.requiresMembership?<Link className="primary" to="/membership">Unlock with membership <ArrowUpRight size={16}/></Link>:current.mediaUrl?<a className="primary" href={current.mediaUrl} target="_blank" rel="noreferrer">Read this issue <ArrowUpRight size={16}/></a>:<Link className="primary" to="/magazine/archive">View issue details <ArrowUpRight size={16}/></Link>}<Link className="outline" to="/magazine/archive">Browse archive</Link></div></div></div>
        :<div className="magazine-hero"><div className="mag-cover"><span>HUMANS<br/><b>OF EV</b></span><small>ISSUE 18 · 2026</small></div><div><span className="eyebrow">CURRENT ISSUE</span><h2>Building the next mobility economy</h2><p>A premium collection of stories on batteries, charging, manufacturing, capital and the leaders shaping India's transition.</p><div className="hero-actions"><Link className="primary" to="/membership">Read with membership</Link><Link className="outline" to="/magazine/archive">Browse archive</Link></div></div></div>}
      {archive.length>0&&<div className="managed-archive"><SectionTitle kicker="THE ARCHIVE" title="More magazine issues" link="/magazine/archive"/><div className="managed-content-grid">{archive.map((issue)=><article className="managed-content-card" key={issue.id}><img src={issue.image} alt={issue.title} onError={e=>e.currentTarget.src=imgFallback}/><div><span className="tag">{issue.issueLabel}</span>{issue.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{issue.title}</h3><p>{issue.description}</p>{issue.requiresMembership?<Link to="/membership">Unlock with membership <ArrowUpRight size={14}/></Link>:issue.mediaUrl&&<a href={issue.mediaUrl} target="_blank" rel="noreferrer">Read issue <ArrowUpRight size={14}/></a>}</div></article>)}</div></div>}
    </div></section></>
}
function MagazineArchive(){
  const {items,error}=useManagedContent("magazine");
  return <><PageHero kicker="DIGITAL MAGAZINE" title="Magazine archive" desc="Browse every issue of Humans of EV, with stories and perspectives from across the electric mobility industry."/>
    {error&&<div className="container article-feed-error">Magazine issues could not be loaded: {error}</div>}
    <section className="section"><div className="container"><div className="managed-content-grid">{items.map((issue)=><article className="managed-content-card" key={issue.id}><img src={issue.image} alt={issue.title} onError={e=>e.currentTarget.src=imgFallback}/><div><span className="tag">{issue.issueLabel}</span>{issue.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{issue.title}</h3><p>{issue.description}</p>{issue.body&&!issue.mediaUrl&&<p>{issue.body}</p>}{issue.requiresMembership?<Link to="/membership">Unlock with membership <ArrowUpRight size={14}/></Link>:issue.mediaUrl&&<a href={issue.mediaUrl} target="_blank" rel="noreferrer">Read issue <ArrowUpRight size={14}/></a>}</div></article>)}</div>{items.length===0&&!error&&<div className="placeholder"><FileText size={34}/><h2>No magazine issues published yet.</h2><p>New issues will appear here when they are published.</p></div>}</div></section>
  </>;
}
function getVideoSource(value){
  try{
    const url=new URL(value);
    const host=url.hostname.toLowerCase().replace(/^www\./,"");
    if(["youtube.com","m.youtube.com","youtube-nocookie.com"].includes(host)||host==="youtu.be"){
      const id=host==="youtu.be"?url.pathname.split("/").filter(Boolean)[0]:url.searchParams.get("v")||url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      return id&&/^[\w-]{11}$/.test(id)?{type:"embed",url:`https://www.youtube-nocookie.com/embed/${id}`}:null;
    }
    if(host==="vimeo.com"||host==="player.vimeo.com"){
      const id=url.pathname.match(/\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];
      return id?{type:"embed",url:`https://player.vimeo.com/video/${id}`}:null;
    }
    if(/\.(mp4|webm|ogg)$/i.test(url.pathname)) return {type:"file",url:url.href};
    return null;
  }catch{return null}
}
function VideoPlayer({src,title,poster}){
  const [playbackError,setPlaybackError]=useState(false);
  const videoSource=getVideoSource(src);
  if(!videoSource)return <a className="managed-video-link" href={src} target="_blank" rel="noreferrer">Open video at source <ArrowUpRight size={14}/></a>;
  return <div className="managed-video-wrap">
    {videoSource.type==="embed"
      ? <iframe className="managed-video-player" src={videoSource.url} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>
      : <video className="managed-video-player" src={videoSource.url} poster={poster||undefined} controls playsInline preload="metadata" onError={()=>setPlaybackError(true)}/>}
    {playbackError&&<p className="managed-video-error" role="alert">This video could not be played. Check that the media URL is public and points to a supported video file.</p>}
  </div>;
}
function Media({type}){
  const {items:podcasts,error}=useManagedContent("podcast");
  const isPodcast=type==="Podcasts";
  const {items:videos,error:videoError}=useManagedContent("video");
  const mediaItems=isPodcast?podcasts:videos;
  return <><PageHero kicker="MEDIA" title={type} desc={isPodcast?"Executive conversations, technology discussions and industry debates.":"Documentaries, factory visits, panels, interviews and product launches."}/>
    {isPodcast&&error&&<div className="container article-feed-error">Podcast episodes could not be loaded: {error}</div>}
    {!isPodcast&&videoError&&<div className="container article-feed-error">Videos could not be loaded: {videoError}</div>}
    <section className="section"><div className="container">{mediaItems.length===0&&!error&&!videoError?<div className="placeholder">{isPodcast?<Mic2 size={34}/>:<VideoIcon size={34}/>}<h2>{isPodcast?"No podcast episodes have been published yet.":"No videos have been published yet."}</h2><p>When {isPodcast?"a podcast episode":"a video"} is added in Admin, it will appear here.</p></div>:<div className="media-grid">{mediaItems.map((episode)=><article className="media-card managed-media-card" key={episode.id}>{isPodcast?<div><img src={episode.image} alt={episode.title} onError={e=>e.currentTarget.src=imgFallback}/><span className="media-play"><Play fill="currentColor" size={18}/></span></div>:episode.requiresMembership?<div><img src={episode.image} alt={episode.title} onError={e=>e.currentTarget.src=imgFallback}/></div>:<VideoPlayer src={episode.mediaUrl} title={episode.title} poster={episode.image}/>}<span className="tag">{isPodcast?"EPISODE":"WATCH"}</span>{episode.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{episode.title}</h3><p>{episode.duration||""}{episode.personName?`${episode.duration?" · ":""}${episode.personName}`:""}</p><p>{episode.description}</p>{episode.requiresMembership?<Link to="/membership">Unlock with membership <ArrowUpRight size={14}/></Link>:isPodcast&&episode.mediaUrl&&<a href={episode.mediaUrl} target="_blank" rel="noreferrer">Listen to episode <ArrowUpRight size={14}/></a>}</article>)}</div>}</div></section></>
}
function Events(){const {events}=useSiteContent();return <><PageHero kicker="CONNECT" title="Events that move the industry" desc="Executive forums, summits, webinars, roundtables and the Humans of EV Awards."/><section className="section"><div className="container"><div className="event-list">{events.map(e=><div className="event-card" key={e[0]}><div className="event-date">{e[4]?<><CalendarDays/><strong>EV</strong><span>Event</span></>:<><CalendarDays/><strong>{e[2].split(" ")[0]}</strong><span>{e[2].split(" ").slice(1).join(" ")}</span></>}</div><div><span className="tag">{e[3]}</span><h2>{e[0]}</h2><p>{e[4]?`${e[2]} · ${e[1]}`:`${e[1]} · Registration open`}</p></div>{e[4]?<a className="outline" href={e[4]} target="_blank" rel="noreferrer">View event</a>:<button className="outline">Register</button>}</div>)}</div></div></section></>}
function Awards(){return <><PageHero kicker="HUMANS OF EV AWARDS" title="Recognising the people changing mobility" desc="A flagship platform celebrating leaders, startups, women, innovators and emerging voices."/><section className="award-hero"><div className="container"><Award size={40}/><h2>2026 Awards</h2><p>Top 100 Leaders · Top Startups · Women in EV · Innovation Awards · Emerging Leaders</p><Link className="primary" to="/community">Nominate a leader</Link></div></section></>}
function Learning(){const {learningCourses}=useSiteContent();return <><PageHero kicker="LEARNING CENTRE" title="Learn the EV ecosystem" desc="Build practical knowledge across vehicles, batteries, charging, policy, business and technology."/><section className="section"><div className="container"><div className="course-grid">{learningCourses.map((x,i)=><div className="course" key={x}><div className="course-icon"><GraduationCap/></div><span>COURSE {i+1}</span><h3>{x}</h3><p>Structured lessons, explainers and industry examples.</p><button className="outline">Explore</button></div>)}</div></div></section></>}
function Community(){const {communityFeatures}=useSiteContent();return <><PageHero kicker="COMMUNITY" title="Connect with the people behind the transition" desc="Industry discussions, private groups, expert forums, mentorship, polls and networking."/><section className="section"><div className="container"><div className="community-grid">{communityFeatures.map(([a,b])=><div className="community-card" key={a}><Users/><h3>{a}</h3><p>{b}</p><button className="outline">Join</button></div>)}</div></div></section></>}
function Membership(){const {plans}=useSiteContent();const localDemoMode=React.useContext(DemoModeContext);return <><PageHero kicker="MEMBERSHIP" title="The intelligence advantage" desc="Choose the access level that fits the way you work in electric mobility."/><section className="section"><div className="container"><div className="plans">{plans.map(p=><div className={p.popular?"plan popular":"plan"} key={p.name}>{p.popular&&<span className="popular-label">MOST POPULAR</span>}<h2>{p.name}</h2><p>{p.description}</p><strong>{p.price}{p.price!=="Custom"&&<small>{p.price==="₹0"?"":" / month"}</small>}</strong>{p.name==="Enterprise"?<Link className="primary" to="/contact">Contact us</Link>:<Link className="primary" to={`/account?plan=${encodeURIComponent(p.name)}&mode=signup`}>{p.name==="Free Member"?"Create free account":"Choose plan"}</Link>}<ul>{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul></div>)}</div><p className="membership-payment-note">{localDemoMode?"Demo checkout simulates a successful payment locally; no payment provider is contacted and no money is charged.":"Professional and Executive memberships are paid securely with Razorpay. Each payment activates one month of membership. Renewals are manual; cancel anytime by letting your membership expire."}</p></div></section></>}
function Account(){
  const {plans}=useSiteContent();
  const [searchParams,setSearchParams]=useSearchParams();
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState(searchParams.get("mode")==="signup"?"signup":"login");
  const [selectedPlan,setSelectedPlan]=useState(searchParams.get("plan")||"");
  const [paymentsEnabled,setPaymentsEnabled]=useState(false);
  const [localDemoMode,setLocalDemoMode]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    let mounted=true;
    apiRequest("/api/member/session")
      .then(({user:member})=>{if(mounted)setUser(member)})
      .catch(requestError=>{
        if(mounted&&requestError.status!==401)setError(requestError.message);
      })
      .finally(()=>{if(mounted)setLoading(false)});
    apiRequest("/api/member/payment-config")
      .then(({razorpayEnabled,localDemoMode:demo})=>{if(mounted){setLocalDemoMode(demo);setPaymentsEnabled(razorpayEnabled||demo)}})
      .catch(requestError=>{if(mounted)setError(requestError.message)});
    return ()=>{mounted=false};
  },[]);

  useEffect(()=>{
    const nextPlan=searchParams.get("plan")||"";
    const nextMode=searchParams.get("mode")==="signup"?"signup":"login";
    setSelectedPlan(nextPlan);
    setMode(nextMode);
  },[searchParams]);

  function selectMode(nextMode){
    setMode(nextMode);
    setError("");
    setNotice("");
    setSearchParams(selectedPlan?{plan:selectedPlan,mode:nextMode}:{mode:nextMode});
  }

  async function authenticate(event){
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const fields=new FormData(event.currentTarget);
    const isSignup=mode==="signup";
    const payload={
      email:fields.get("email"),
      password:fields.get("password"),
      ...(isSignup?{name:fields.get("name")}:{})
    };
    if(isSignup&&payload.password!==fields.get("confirmPassword")){
      setError("Your passwords do not match.");
      setBusy(false);
      return;
    }
    try{
      const result=await apiRequest(`/api/member/${isSignup?"signup":"login"}`,{method:"POST",body:JSON.stringify(payload)});
      setUser(result.user);
      setNotice(isSignup
        ? `Your free member account is ready.${selectedPlan&&selectedPlan!=="Free Member"?` ${selectedPlan} is selected; continue to its payment from your account.`:""}`
        : "Welcome back.");
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setBusy(false);
    }
  }

  async function signOut(){
    setBusy(true);
    setError("");
    try{
      await apiRequest("/api/auth/logout",{method:"POST"});
      setUser(null);
      setNotice("You have signed out.");
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setBusy(false);
    }
  }

  async function buyPlan(plan){
    if(plan==="Free Member"){
      setSelectedPlan(plan);
      setNotice("Free membership is included with your account.");
      return;
    }
    if(!paymentsEnabled){
      setError("Online payments are not configured yet. Please contact us for membership assistance.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try{
      const checkout=await apiRequest("/api/member/checkout",{method:"POST",body:JSON.stringify({plan})});
      if(checkout.demo){
        const paymentId=`demo_payment_${window.crypto.randomUUID().replaceAll("-","").slice(0,24)}`;
        const verified=await apiRequest("/api/member/checkout/verify",{method:"POST",body:JSON.stringify({
          razorpayOrderId:checkout.orderId,
          razorpayPaymentId:paymentId,
          razorpaySignature:"local-demo-signature"
        })});
        setUser(verified.user);
        setSelectedPlan("");
        setSearchParams({});
        setNotice(`Local demo payment complete — no money was charged. ${verified.user.membershipPlan} membership is active until ${new Date(verified.user.membershipExpiresAt).toLocaleDateString()}.`);
        setBusy(false);
        return;
      }
      await new Promise((resolveScript,rejectScript)=>{
        if(window.Razorpay){resolveScript();return}
        const existing=document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if(existing){
          existing.addEventListener("load",resolveScript,{once:true});
          existing.addEventListener("error",()=>rejectScript(new Error("Could not load the secure payment window.")),{once:true});
          return;
        }
        const script=document.createElement("script");
        script.src="https://checkout.razorpay.com/v1/checkout.js";
        script.async=true;
        script.onload=resolveScript;
        script.onerror=()=>rejectScript(new Error("Could not load the secure payment window."));
        document.body.appendChild(script);
      });
      const checkoutWindow=new window.Razorpay({
        key:checkout.keyId,
        amount:checkout.amount,
        currency:checkout.currency,
        name:"Humans of EV",
        description:`${plan} membership · one month`,
        order_id:checkout.orderId,
        prefill:{name:checkout.name,email:checkout.email},
        theme:{color:"#20c77a"},
        handler:async response=>{
          try{
            const verified=await apiRequest("/api/member/checkout/verify",{method:"POST",body:JSON.stringify({
              razorpayOrderId:response.razorpay_order_id,
              razorpayPaymentId:response.razorpay_payment_id,
              razorpaySignature:response.razorpay_signature
            })});
            setUser(verified.user);
            setSelectedPlan("");
            setSearchParams({});
            setNotice(`${verified.user.membershipPlan} membership is active until ${new Date(verified.user.membershipExpiresAt).toLocaleDateString()}.`);
          }catch(verifyError){
            setError(verifyError.message);
          }finally{
            setBusy(false);
          }
        },
        modal:{ondismiss:()=>setBusy(false)}
      });
      checkoutWindow.on("payment.failed",response=>{
        setError(response.error?.description||"Payment was not completed. You have not been charged for a successful membership.");
        setBusy(false);
      });
      checkoutWindow.open();
    }catch(requestError){
      setError(requestError.message);
      setBusy(false);
    }
  }

  if(loading)return <><PageHero kicker="MEMBER ACCESS" title="Your Humans of EV account" desc="Checking your account…"/><section className="section"><div className="container account-box"><span className="admin-spinner"/></div></section></>;
  if(user){
    const activePlan=user.membershipPlan!=="Free Member"&&user.membershipExpiresAt;
    return <><PageHero kicker="MEMBER ACCESS" title={`Welcome, ${user.name.split(" ")[0]}.`} desc="Manage your membership, account and access."/><section className="section"><div className="container member-account">
      {error&&<div className="member-alert error" role="alert">{error}</div>}{notice&&<div className="member-alert success" role="status">{notice}</div>}
      <div className="member-dashboard">
        <div className="member-profile"><div className="member-profile-icon"><User size={24}/></div><div><span className="eyebrow">YOUR ACCOUNT</span><h2>{user.name}</h2><p>{user.email}</p></div><button className="outline" onClick={signOut} disabled={busy}>Sign out</button></div>
        <div className="member-plan-card"><span className="eyebrow">CURRENT MEMBERSHIP</span><h2>{activePlan?user.membershipPlan:"Free Member"}</h2><p>{activePlan?`Active until ${new Date(user.membershipExpiresAt).toLocaleDateString()}`:"Your free account is active. Upgrade for premium intelligence and member benefits."}</p>{activePlan&&<span className="member-active-label"><ShieldCheck size={15}/> Active</span>}</div>
      </div>
      <div className="member-upgrade"><span className="eyebrow">MEMBERSHIP OPTIONS</span><h2>Choose your next level.</h2><div className="member-plan-options">{plans.filter(plan=>plan.name!=="Enterprise").map(plan=><article className={`member-plan-option${(plan.name===user.membershipPlan&&activePlan)||plan.name===selectedPlan?" selected":""}`} key={plan.name}><h3>{plan.name}</h3><strong>{plan.price}{plan.price==="₹0"?"":" / month"}</strong><p>{plan.description}</p>{plan.name===user.membershipPlan&&activePlan?<span className="member-current-plan"><Check size={15}/> Your current plan</span>:<button className="primary" disabled={busy||plan.name==="Free Member"||!paymentsEnabled} onClick={()=>buyPlan(plan.name)}>{plan.name==="Free Member"?"Included with account":localDemoMode?"Simulate demo payment":paymentsEnabled?"Continue to secure payment":"Payments not configured"}</button>}</article>)}</div>
        {localDemoMode?<p className="membership-payment-note">Local demo mode simulates membership payments. No payment provider is contacted and no money is charged.</p>:!paymentsEnabled&&<p className="membership-payment-note">Paid checkout requires Razorpay keys in the server environment. Contact us if you’d like help getting started.</p>}
      </div>
      <div className="member-shortcuts"><Link to="/news">Explore news <ArrowUpRight size={15}/></Link><Link to="/research">Explore research <ArrowUpRight size={15}/></Link><Link to="/events">Explore events <ArrowUpRight size={15}/></Link></div>
    </div></section></>;
  }
  return <><PageHero kicker="MEMBER ACCESS" title="Your Humans of EV account" desc="Sign in or create a free account to save your membership and access the EV community."/><section className="section"><div className="container member-auth-layout">
    <div className="member-auth-card"><div className="member-auth-tabs"><button className={mode==="login"?"active":""} onClick={()=>selectMode("login")}>Sign in</button><button className={mode==="signup"?"active":""} onClick={()=>selectMode("signup")}>Create account</button></div>
      <form className="member-auth-form" onSubmit={authenticate}><span className="eyebrow">{mode==="signup"?"FREE MEMBER REGISTRATION":"MEMBER SIGN IN"}</span><h2>{mode==="signup"?"Join Humans of EV.":"Welcome back."}</h2><p>{mode==="signup"?"Create your account first. You can choose a paid plan whenever you’re ready.":"Sign in to view your account and membership."}</p>
        {selectedPlan&&<div className="member-selected-plan">Selected plan: <strong>{selectedPlan}</strong>. {selectedPlan==="Free Member"?"Your account is free.":"After sign-in or sign-up, continue to secure checkout."}</div>}
        {error&&<div className="member-alert error" role="alert">{error}</div>}{notice&&<div className="member-alert success" role="status">{notice}</div>}
        {mode==="signup"&&<label>Full name<input name="name" type="text" autoComplete="name" minLength="2" maxLength="120" required/></label>}
        <label>Email address<input name="email" type="email" autoComplete="email" maxLength="254" required/></label>
        <label>Password<input name="password" type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={mode==="signup"?12:1} required/>{mode==="signup"&&<small>Use at least 12 characters.</small>}</label>
        {mode==="signup"&&<label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="12" required/></label>}
        <button className="primary member-auth-submit" type="submit" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create free account":"Sign in"} <ArrowUpRight size={16}/></button>
        <small className="member-privacy-note">Your account is protected. Passwords are securely hashed and never stored as plain text.</small>
      </form>
    </div>
    <aside className="member-auth-aside"><span className="eyebrow light">MEMBERSHIP, YOUR WAY</span><h2>Know more. Connect deeper. Move forward.</h2><p>Start with a free account, then upgrade securely whenever a paid membership fits your needs.</p><ul><li><Check size={16}/> Free account with weekly intelligence</li><li><Check size={16}/> Upgrade to Professional or Executive</li><li><Check size={16}/> {localDemoMode?"Simulated membership checkout for UI testing":"One clear monthly payment via Razorpay"}</li><li><Check size={16}/> Membership stays active for one month after payment</li></ul>{!paymentsEnabled&&<span className="member-payment-status">Razorpay checkout is not configured yet.</span>}</aside>
  </div></section></>;
}
function SearchPage(){const [q,setQ]=useState("");const {articles,error}=useArticles();const results=useMemo(()=>articles.filter(s=>(s.title+" "+s.excerpt).toLowerCase().includes(q.toLowerCase())),[articles,q]);return <><PageHero kicker="DISCOVERY" title="Search the EV ecosystem" desc="Find stories, companies, people, research, events and more."/>{error&&<div className="container article-feed-error">News search could not be loaded: {error}</div>}<section className="section"><div className="container"><div className="large-search"><Search/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search company, founder, technology, policy..."/></div><div className="search-results">{results.map(s=><StoryCard story={s} key={s.id}/>)}</div></div></section></>}
function Newsletter(){return <><PageHero kicker="NEWSLETTER" title="The weekly EV intelligence brief" desc="Market moves, policy, funding, technology and the people behind the transition."/><section className="section"><div className="container newsletter-page"><NewsletterForm/><p>Subscribe to receive Humans of EV updates. Contact us if you need your address removed.</p></div></section></>}
function NewsletterForm(){
  const [email,setEmail]=useState("");
  const [done,setDone]=useState(false);
  const [successMessage,setSuccessMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function subscribe(event){
    event.preventDefault();
    setBusy(true);
    setError("");
    try{
      const result=await apiRequest("/api/newsletter/subscribe",{method:"POST",body:JSON.stringify({email})});
      setSuccessMessage(result.simulated
        ?"Demo mode: you were added locally; no email was sent."
        :"You're on the list. Welcome to Humans of EV.");
      setDone(true);
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setBusy(false);
    }
  }
  return <form className="newsletter-form" onSubmit={subscribe}>
    {done?<strong role="status">{successMessage}</strong>:<>
      <input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="Your work email" autoComplete="email" maxLength="254" required/>
      <button className="primary" disabled={busy}>{busy?"Subscribing…":<>Subscribe <ArrowUpRight size={16}/></>}</button>
      {error&&<span className="newsletter-error" role="alert">{error}</span>}
    </>}
  </form>
}

function Contact(){
  const [sent,setSent]=useState(false);
  const [notification,setNotification]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [form,setForm]=useState({name:"",email:"",company:"",type:"General enquiry",message:""});
  const update=(e)=>setForm({...form,[e.target.name]:e.target.value});
  const submit=async(e)=>{
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try{
      const result=await apiRequest("/api/contact",{method:"POST",body:JSON.stringify(form)});
      setNotification(result.notification?.simulated
        ?"Demo mode: enquiry saved and email notifications simulated locally. No email was sent."
        :result.notification?.adminNotified&&result.notification?.senderAcknowledged
          ?"A confirmation email was sent, and the team was notified."
        :result.notification?.adminNotified
          ?"The team was notified, but we could not confirm delivery of your acknowledgement email."
          :result.notification?.senderAcknowledged
            ?"A confirmation email was sent, but we could not confirm the team's email notification. Your enquiry is saved in our admin inbox."
            :"Your enquiry is saved in our admin inbox. Email delivery is not configured or could not be confirmed.");
      setSent(true);
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setSubmitting(false);
    }
  };
  return <>
    <PageHero kicker="CONNECT WITH HUMANS OF EV" title="Let's start a conversation." desc="Whether you want to tell a story, discuss a partnership, access our research, sponsor an event or simply reach the right team, we're here to help."/>
    <section className="section contact-section">
      <div className="container">
        <div className="contact-layout">
          <div className="contact-main">
            <span className="eyebrow">SEND AN ENQUIRY</span>
            <h2>How can we help?</h2>
            {sent ? <div className="contact-success">
              <div className="success-icon"><ShieldCheck size={26}/></div>
              <h3>Thank you, {form.name || "there"}.</h3>
              <p>Your enquiry has been received. Our team will review it and get back to you using the email address provided.</p>
              <p role="status">{notification}</p>
              <button className="outline dark-outline" onClick={()=>{setSent(false);setForm({name:"",email:"",company:"",type:"General enquiry",message:""})}}>Send another enquiry</button>
            </div> : <form className="contact-form" onSubmit={submit}>
              {error&&<div className="contact-form-error" role="alert">{error}</div>}
              <div className="form-grid">
                <label>Full name<input name="name" value={form.name} onChange={update} required placeholder="Your full name"/></label>
                <label>Work email<input type="email" name="email" value={form.email} onChange={update} required placeholder="name@company.com"/></label>
              </div>
              <div className="form-grid">
                <label>Company / organisation<input name="company" value={form.company} onChange={update} placeholder="Organisation name"/></label>
                <label>Enquiry type<select name="type" value={form.type} onChange={update}>
                  <option>General enquiry</option>
                  <option>Editorial / newsroom</option>
                  <option>Advertising & sponsorship</option>
                  <option>Membership & subscriptions</option>
                  <option>Research & intelligence</option>
                  <option>Events & awards</option>
                  <option>Enterprise partnership</option>
                  <option>Media enquiry</option>
                  <option>Careers</option>
                </select></label>
              </div>
              <label>Message<textarea name="message" value={form.message} onChange={update} required rows="7" placeholder="Tell us how we can help..."></textarea></label>
              <div className="contact-submit">
                <button className="primary" type="submit" disabled={submitting}>{submitting?"Sending…":<>Send enquiry <ArrowUpRight size={17}/></>}</button>
                <span>We respect your privacy and never sell your contact details.</span>
              </div>
            </form>}
          </div>
          <aside className="contact-side">
            <div className="contact-card highlight">
              <span className="eyebrow">HUMANS OF EV</span>
              <h3>India's Most Trusted Electric Mobility Intelligence Platform</h3>
              <p>Trusted journalism, industry intelligence, research and networking for the people building the electric future.</p>
            </div>
            {[
              [Building2,"General enquiries","For questions about Humans of EV, our content and platform.","hello@humansofev.com"],
              [FileText,"Editorial & newsroom","Share a story, press release, correction or editorial idea.","editorial@humansofev.com"],
              [BarChart3,"Research & enterprise","Discuss reports, data, custom research and enterprise intelligence.","research@humansofev.com"],
              [CalendarDays,"Events & sponsorship","Partnerships, sponsorships, speaking opportunities and event registration.","events@humansofev.com"]
            ].map(([Icon,title,desc,email])=><div className="contact-card" key={title}>
              <div className="contact-icon"><Icon size={19}/></div>
              <h3>{title}</h3><p>{desc}</p><a href={"mailto:"+email}>{email}</a>
            </div>)}
          </aside>
        </div>
      </div>
    </section>
    <section className="contact-bottom">
      <div className="container">
        <div className="section-title"><div><span className="eyebrow">OTHER WAYS TO CONNECT</span><h2>Find the right team.</h2></div></div>
        <div className="contact-channels">
          {[
            ["Advertising & Sponsorship","Build visibility with the EV decision-makers who matter.","/membership"],
            ["Membership Support","Need help with your account, plan, invoice or access?","/membership"],
            ["Media & Press","Request interviews, media kits, company information or expert commentary.","/people"],
            ["Careers","Join a team documenting and shaping India's electric mobility transition.","/jobs"]
          ].map(([title,desc,path])=><Link to={path} className="contact-channel" key={title}><h3>{title}</h3><p>{desc}</p><ArrowUpRight size={17}/></Link>)}
        </div>
      </div>
    </section>
    <section className="faq-section">
      <div className="container faq-grid">
        <div><span className="eyebrow">CONTACT FAQ</span><h2>Before you write to us.</h2></div>
        <div>
          {[
            ["How quickly will you respond?","For most enquiries, our team aims to respond within two business days."],
            ["Can I submit a story or press release?","Yes. Select Editorial / newsroom in the form and include the relevant details or supporting material."],
            ["Do you offer enterprise research?","Yes. Enterprise clients can discuss custom research, data intelligence, team access and strategic partnerships."],
            ["Can I sponsor an event or report?","Yes. Our partnerships team can create sponsorship packages around events, reports, awards and editorially appropriate campaigns."]
          ].map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={16}/></summary><p>{a}</p></details>)}
        </div>
      </div>
    </section>
  </>
}

function GenericPage({section}){const {slug}=useParams();const title=(slug||section).replaceAll("-"," ");return <><PageHero kicker={section.toUpperCase()} title={title.replace(/\b\w/g,m=>m.toUpperCase())} desc="A dedicated Humans of EV destination with structured content, intelligence and industry resources."/><section className="section"><div className="container placeholder"><Sparkles size={42}/><h2>Built as a reusable platform module</h2><p>This route is ready for real CMS/API data. Replace the mock content in <b>src/data.js</b> without rebuilding the page architecture.</p><Link className="primary" to="/membership">Explore membership</Link></div></section></>}
function NotFound(){return <><PageHero kicker="404" title="Page not found" desc="The page you're looking for doesn't exist."/><section className="section"><div className="container center"><Link className="primary" to="/">Return home</Link></div></section></>}
function Footer(){return <footer><div className="container footer-grid"><div><Link to="/" className="logo footer-logo"><span className="logo-mark">H</span><span>HUMANS <i>of</i> EV</span></Link><p>India’s Most Trusted Electric Mobility Intelligence Platform.</p><div className="socials"><span>in</span><span>yt</span><span>𝕏</span><span>ig</span></div></div>{[["Platform","News","Intelligence","People","Ecosystem","Magazine"],["Business","Directory","Startups","Investors","Research","Events"],["Connect","Community","Learning","Awards","Newsletter","Membership","Contact"]].map(([h,...links])=><div key={h}><h4>{h}</h4>{links.map(x=><Link key={x} to={x==="Contact"?"/contact":"/"+x.toLowerCase().replaceAll(" ","-")}>{x}</Link>)}</div>)}</div><div className="container footer-bottom"><span>© 2026 Humans of EV. All rights reserved.</span><span>Privacy · Terms · Cookie Policy</span></div></footer>}

export default App;