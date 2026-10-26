


import {SectionTitle, StoryCard} from "../../../components/common/PageRuntime";


export default function HomeNewsSection({articles}){ return <><section className="section"><div className="container"><SectionTitle kicker="THE NEWSROOM" title="Latest industry intelligence"/><div className="news-grid">{articles.slice(0,4).map((s,i)=><StoryCard story={s} featured={i===0} key={s.id}/>)}</div></div></section></>; }
