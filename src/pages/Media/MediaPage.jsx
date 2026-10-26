
import {Link} from "react-router-dom";
import {ArrowUpRight, Play, Mic2, Video as VideoIcon} from "lucide-react";

import {PageHero, imgFallback, useManagedContent} from "../../components/common/PageRuntime";

import VideoPlayer, {isAudioSource, isVideoFileSource} from "../../features/media/VideoPlayer";

export default function Media({type}){
  const {items:podcasts,error}=useManagedContent("podcast");
  const isPodcast=type==="Podcasts";
  const {items:videos,error:videoError}=useManagedContent("video");
  const mediaItems=isPodcast?podcasts:videos;
  return <><PageHero kicker="MEDIA" title={type} desc={isPodcast?"Executive conversations, technology discussions and industry debates.":"Documentaries, factory visits, panels, interviews and product launches."}/>
    {isPodcast&&error&&<div className="container article-feed-error">Podcast episodes could not be loaded: {error}</div>}
    {!isPodcast&&videoError&&<div className="container article-feed-error">Videos could not be loaded: {videoError}</div>}
    <section className="section"><div className="container">{mediaItems.length===0&&!error&&!videoError?<div className="placeholder">{isPodcast?<Mic2 size={34}/>:<VideoIcon size={34}/>}<h2>{isPodcast?"No podcast episodes have been published yet.":"No videos have been published yet."}</h2><p>When {isPodcast?"a podcast episode":"a video"} is added in Admin, it will appear here.</p></div>:<div className="media-grid">{mediaItems.map((episode)=><article className="media-card managed-media-card" key={episode.id}>{episode.requiresMembership?<div><img src={episode.image} alt={episode.title} onError={e=>e.currentTarget.src=imgFallback}/></div>:isPodcast&&isAudioSource(episode.mediaUrl)?<audio className="managed-audio-player" src={episode.mediaUrl} controls preload="metadata"/>:isPodcast&&isVideoFileSource(episode.mediaUrl)?<VideoPlayer src={episode.mediaUrl} title={episode.title} poster={episode.image}/>:isPodcast?<div><img src={episode.image} alt={episode.title} onError={e=>e.currentTarget.src=imgFallback}/><span className="media-play"><Play fill="currentColor" size={18}/></span></div>:<VideoPlayer src={episode.mediaUrl} title={episode.title} poster={episode.image}/>}<span className="tag">{isPodcast?"EPISODE":"WATCH"}</span>{episode.accessLevel==="member"&&<span className="access-badge">MEMBERS ONLY</span>}<h3>{episode.title}</h3><p>{episode.duration||""}{episode.personName?`${episode.duration?" · ":""}${episode.personName}`:""}</p><p>{episode.description}</p>{episode.requiresMembership?<Link to="/membership">Unlock with membership <ArrowUpRight size={14}/></Link>:isPodcast&&episode.mediaUrl&&!isAudioSource(episode.mediaUrl)&&!isVideoFileSource(episode.mediaUrl)&&<a href={episode.mediaUrl} target="_blank" rel="noreferrer">Listen to episode <ArrowUpRight size={14}/></a>}</article>)}</div>}</div></section></>
}
