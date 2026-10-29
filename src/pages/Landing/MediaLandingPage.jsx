import {Link} from "react-router-dom";
import {ArrowUpRight, BookOpen, Image as ImageIcon, Mic2, Video} from "lucide-react";
import {PageHero, imgFallback, useManagedContent} from "../../components/common/PageRuntime";
import RelatedPageLinks from "../../components/common/RelatedPageLinks";

function MediaPreview({item, kind}) {
  const label = kind === "video" ? "Video" : kind === "podcast" ? "Podcast" : "Magazine";
  return <article className="managed-content-card">
    <img src={item.image || imgFallback} alt="" onError={(event) => { event.currentTarget.src = imgFallback; }}/>
    <div>
      <span className="tag">{label}</span>
      {item.issueLabel && <span className="tag">{item.issueLabel}</span>}
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <RelatedPageLinks item={item}/>
      <Link to={kind === "magazine" ? "/magazine" : kind === "podcast" ? "/podcasts" : "/videos"}>Open {label.toLowerCase()} library <ArrowUpRight size={14}/></Link>
    </div>
  </article>;
}

export default function MediaLandingPage() {
  const {items: videos, error: videoError} = useManagedContent("video", "page-media");
  const {items: podcasts, error: podcastError} = useManagedContent("podcast", "page-media");
  const {items: magazines, error: magazineError} = useManagedContent("magazine", "page-media");
  const hasError = videoError || podcastError || magazineError;
  return <><PageHero kicker="HEV MEDIA" title="Media" desc="Videos, podcasts, digital magazines and visual stories from the people building electric mobility."/>
    {hasError && <div className="container article-feed-error">Some media could not be loaded. Please try again later.</div>}
    <section className="section"><div className="container">
      <div className="section-title"><div><span className="eyebrow">EXPLORE MEDIA</span><h2>Everything in one place</h2></div></div>
      <div className="managed-content-grid">
        {videos.slice(0, 3).map((item) => <MediaPreview key={`video-${item.id}`} item={item} kind="video"/>)}
        {podcasts.slice(0, 3).map((item) => <MediaPreview key={`podcast-${item.id}`} item={item} kind="podcast"/>)}
        {magazines.slice(0, 3).map((item) => <MediaPreview key={`magazine-${item.id}`} item={item} kind="magazine"/>)}
      </div>
      {!videos.length && !podcasts.length && !magazines.length && !hasError && <div className="placeholder"><ImageIcon size={34}/><Mic2 size={34}/><Video size={34}/><BookOpen size={34}/><h2>Your media library is ready</h2><p>Published videos, images, podcasts and magazine issues added in Admin will appear here.</p><Link className="primary" to="/admin">Open media administration <ArrowUpRight size={15}/></Link></div>}
    </div></section>
  </>;
}
