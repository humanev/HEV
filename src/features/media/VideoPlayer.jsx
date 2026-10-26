import {useState} from "react";
import {ArrowUpRight} from "lucide-react";

function getVideoSource(value){
  try{
    const url=new URL(value,window.location.origin);
    const host=url.hostname.toLowerCase().replace(/^www\./,"");
    if(["youtube.com","m.youtube.com","youtube-nocookie.com"].includes(host)||host==="youtu.be"){
      const id=host==="youtu.be"?url.pathname.split("/").filter(Boolean)[0]:url.searchParams.get("v")||url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      return id&&/^[\w-]{11}$/.test(id)?{type:"embed",url:`https://www.youtube-nocookie.com/embed/${id}`}:null;
    }
    if(host==="vimeo.com"||host==="player.vimeo.com"){
      const id=url.pathname.match(/\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];
      return id?{type:"embed",url:`https://player.vimeo.com/video/${id}`}:null;
    }
    if(/\.(mp4|webm|ogv|ogg)$/i.test(url.pathname)) return {type:"file",url:url.href};
    return null;
  }catch{return null}
}
export function isAudioSource(value){
  try{return /\.(mp3|m4a|wav|aac|ogg)$/i.test(new URL(value,window.location.origin).pathname)}catch{return false}
}
export function isVideoFileSource(value){
  try{return /\.(mp4|webm|ogv)$/i.test(new URL(value,window.location.origin).pathname)}catch{return false}
}
export default function VideoPlayer({src,title,poster}){
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
