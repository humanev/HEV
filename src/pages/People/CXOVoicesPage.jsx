import {Link} from "react-router-dom";
import {ArrowUpRight, CalendarDays, Headphones, Mic2, Play, Users, Video} from "lucide-react";
import {PageHero, SectionTitle, StoryCard, imgFallback, useArticles, useManagedContent, useSiteContent} from "../../components/common/PageRuntime";
import RelatedPageLinks from "../../components/common/RelatedPageLinks";

function MediaLink({item, type}) {
  return <article className="cxo-media-card">
    <div className="cxo-media-image">
      <img src={item.image || imgFallback} alt="" onError={(event) => { event.currentTarget.src = imgFallback; }}/>
      <span className="cxo-media-icon">{type === "podcast" ? <Headphones size={17}/> : <Play size={17} fill="currentColor"/>}</span>
    </div>
    <div><span className="tag">{type === "podcast" ? "PODCAST" : "INTERVIEW"}</span><h3>{item.title}</h3><p>{item.description}</p><RelatedPageLinks item={item}/><Link to={type === "podcast" ? "/podcasts" : "/videos"}>Listen / watch <ArrowUpRight size={14}/></Link></div>
  </article>;
}

export default function CXOVoicesPage() {
  const {items: profiles, error: profileError} = useManagedContent("cxo", "page-people-cxo");
  const {items: podcasts, error: podcastError} = useManagedContent("podcast", "page-people-cxo");
  const {items: videos, error: videoError} = useManagedContent("video", "page-people-cxo");
  const {articles, error: articleError} = useArticles("page-people-cxo");
  const {events} = useSiteContent();
  const leadershipNews = articles.filter((article) => /leadership|ceo|founder|executive|cxo/i.test(`${article.title} ${article.category} ${article.excerpt}`)).slice(0, 3);
  const cxoEvents = events.filter((event) => /cxo|executive|leader|forum|roundtable/i.test(event.join(" "))).slice(0, 4);
  const featured = profiles[0];
  const hasError = profileError || podcastError || videoError || articleError;

  return <><PageHero kicker="CXO VOICES" title="Leadership from the front line" desc="A dedicated intelligence destination for the executives shaping strategy, technology, investment and growth across electric mobility."/>
    <section className="cxo-intro section"><div className="container">
      <nav className="cxo-program-nav" aria-label="CXO Voices sections">
        <a href="#executive-profiles"><Users size={18}/><span>Executive conversations</span><ArrowUpRight size={17}/></a>
        <a href="#leadership-podcasts"><Mic2 size={18}/><span>Podcasts & interviews</span><ArrowUpRight size={17}/></a>
        <a href="#leadership-news"><CalendarDays size={18}/><span>CXO Bridge & leadership news</span><ArrowUpRight size={17}/></a>
      </nav>
    </div></section>
    {hasError && <div className="container article-feed-error">Some leadership content could not be loaded. Please try again later.</div>}
    {featured && <section className="section cxo-featured"><div className="container"><SectionTitle kicker="LEADER IN FOCUS" title="The person behind the decision" link="/people/cxo-voices"/><article className="cxo-featured-card"><img src={featured.image || imgFallback} alt={featured.personName} onError={(event) => { event.currentTarget.src = imgFallback; }}/><div><span className="tag">{featured.role}</span><h2>{featured.personName}</h2><strong>{featured.organization}</strong><h3>{featured.title}</h3><p>{featured.description}</p><p>{featured.body}</p><RelatedPageLinks item={featured}/>{featured.mediaUrl && <a className="primary" href={featured.mediaUrl} target="_blank" rel="noreferrer">View conversation <ArrowUpRight size={15}/></a>}</div></article></div></section>}
    <section className="section cxo-profiles" id="executive-profiles"><div className="container"><SectionTitle kicker="EXECUTIVE CONVERSATIONS" title="People shaping the next decade" link="/people/cxo-voices"/>{profiles.length ? <div className="cxo-profile-grid">{profiles.map((person) => <article className="cxo-profile-card" key={person.id}><img src={person.image || imgFallback} alt={person.personName} onError={(event) => { event.currentTarget.src = imgFallback; }}/><div><span className="tag">{person.role}</span><h3>{person.personName}</h3><strong>{person.organization}</strong><h4>{person.title}</h4><p>{person.description}</p><RelatedPageLinks item={person}/><Link to="/people/cxo-voices">Read profile <ArrowUpRight size={14}/></Link></div></article>)}</div> : <div className="cxo-empty"><Users size={30}/><h3>No executive profiles published yet.</h3><p>Use Admin → People & Leadership to add a person, role, organization, portrait, biography and related interview.</p><Link className="outline" to="/admin">Open People & Leadership</Link></div>}</div></section>
    <section className="section cxo-dark-section"><div className="container"><SectionTitle kicker="CXO BRIDGE" title="From conversation to connection" link="/events"/><div className="cxo-events-grid">{cxoEvents.length ? cxoEvents.map((event) => <article className="cxo-event-card" key={event[0]}><CalendarDays size={19}/><span className="tag">{event[3]}</span><h3>{event[0]}</h3><p>{event[1]} · {event[2]}</p><Link to="/events">View programme <ArrowUpRight size={14}/></Link></article>) : <div className="cxo-empty"><CalendarDays size={30}/><h3>CXO Bridge programmes will appear here.</h3><p>Add executive forums, roundtables and leadership events in Website Content.</p></div>}</div></div></section>
    <section className="section" id="leadership-podcasts"><div className="container"><SectionTitle kicker="INTERVIEWS & PODCASTS" title="Hear the thinking behind the work" link="/podcasts"/><div className="cxo-media-grid">{videos.slice(0, 3).map((item) => <MediaLink key={`video-${item.id}`} item={item} type="video"/>)}{podcasts.slice(0, 3).map((item) => <MediaLink key={`podcast-${item.id}`} item={item} type="podcast"/>)}</div>{!videos.length && !podcasts.length && <div className="cxo-empty"><Video size={30}/><Headphones size={30}/><h3>No interviews or podcasts published yet.</h3><p>Add a video or podcast in Admin → Website Content to populate this section.</p><Link className="outline" to="/admin">Open media library</Link></div>}</div></section>
    <section className="section cxo-news" id="leadership-news"><div className="container"><SectionTitle kicker="CXO BRIDGE & LEADERSHIP NEWS" title="The decisions moving the market" link="/news/all"/>{leadershipNews.length > 0 ? <div className="news-grid">{leadershipNews.map((story) => <StoryCard key={story.id} story={story}/>)}</div> : <div className="cxo-empty"><CalendarDays size={30}/><h3>No leadership news published yet.</h3><p>Publish leadership, executive, founder or CXO articles in Admin → News & Articles.</p><Link className="outline" to="/admin">Open News & Articles</Link></div>}</div></section>
  </>;
}
