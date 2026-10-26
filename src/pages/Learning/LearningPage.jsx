import { CstButton } from "../../components/common/ui-components";


import {GraduationCap} from "lucide-react";

import {PageHero, useSiteContent} from "../../components/common/PageRuntime";



export default function Learning(){const {learningCourses}=useSiteContent();return <><PageHero kicker="LEARNING CENTRE" title="Learn the EV ecosystem" desc="Build practical knowledge across vehicles, batteries, charging, policy, business and technology."/><section className="section"><div className="container"><div className="course-grid">{learningCourses.map((x,i)=><div className="course" key={x}><div className="course-icon"><GraduationCap/></div><span>COURSE {i+1}</span><h3>{x}</h3><p>Structured lessons, explainers and industry examples.</p><CstButton className="outline">Explore</CstButton></div>)}</div></div></section></>}

