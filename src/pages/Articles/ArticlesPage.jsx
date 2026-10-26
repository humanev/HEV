import { CstButton } from "../../components/common/ui-components";




import {PageHero, StoryCard, useArticles} from "../../components/common/PageRuntime";



export default function Listing({title,kicker}){
  const {articles,error}=useArticles();
  return <><PageHero kicker={kicker} title={title} desc="Independent reporting, analysis and insight across India's electric mobility ecosystem."/>{error&&<div className="container article-feed-error" role="status">Live newsroom content could not be loaded: {error}</div>}<section className="section"><div className="container"><div className="filter-row"><CstButton className="filter active">All</CstButton>{["Cars","Two Wheelers","Buses","Battery","Charging","Policy","Startups"].map(x=><CstButton className="filter" key={x}>{x}</CstButton>)}</div><div className="news-grid listing">{articles.map((story)=><StoryCard story={story} key={story.id}/>)}</div></div></section></>
}

