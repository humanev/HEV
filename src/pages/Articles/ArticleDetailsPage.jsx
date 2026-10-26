import {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";

import {apiRequest} from "../../api";
import {PageHero, MembershipGate, imgFallback} from "../../components/common/PageRuntime";



export default function Article(){
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

