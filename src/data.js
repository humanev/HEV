export const nav = [
  { label: "Home", path: "/" },
  { label: "News", path: "/news" },
  { label: "EV Intelligence", path: "/intelligence" },
  { label: "Vehicles", path: "/vehicles" },
  { label: "EV Business", path: "/ev-business" },
  { label: "Energy", path: "/energy" },
  { label: "People", path: "/people" },
  { label: "HEV Media", path: "/media" },
  { label: "Events", path: "/events" },
  { label: "B2B Solutions", path: "/b2b-solutions" }
];

export const contactEnquiryTypes = [
  "General enquiry",
  "Editorial / newsroom",
  "Advertising & sponsorship",
  "Membership & subscriptions",
  "Research & intelligence",
  "Events & awards",
  "Enterprise partnership",
  "Media enquiry",
  "Magazine cover page enquiry",
  "Magazine advertising page enquiry",
  "Magazine editorial enquiry",
  "Other magazine-related enquiry",
  "Careers"
];

export const stats = [
  ["EV Sales", "1.86M", "+28.4% YoY"],
  ["Public Chargers", "27,800+", "+19.2% YoY"],
  ["Battery Capacity", "42 GWh", "+31.6% YoY"],
  ["Startup Funding", "$1.4B", "+22.8% YoY"],
  ["EV Share", "6.8%", "+1.7 pts"],
  ["Manufacturing", "₹38.2K Cr", "+26.1% YoY"]
];

export const companies = [
  ["Ather Energy","Two-wheelers","Bengaluru","Growth"],
  ["Tata Passenger Electric Mobility","OEM","Mumbai","Enterprise"],
  ["Exponent Energy","Battery","Bengaluru","Series B"],
  ["ChargeZone","Charging","Ahmedabad","Growth"],
  ["BluSmart","Fleet","Delhi NCR","Growth"],
  ["Euler Motors","Commercial EV","New Delhi","Series C"],
  ["Battery Smart","Battery Swapping","Gurugram","Series B"],
  ["Ola Electric","Two-wheelers","Bengaluru","Public"]
];

export const events = [
  ["EV India Executive Forum","Bengaluru","18 Nov 2026","Executive"],
  ["Battery Intelligence Summit","New Delhi","03 Dec 2026","Summit"],
  ["Charging Infrastructure Leaders Roundtable","Mumbai","16 Dec 2026","Roundtable"],
  ["Humans of EV Awards 2026","Gurugram","22 Jan 2027","Awards"]
];

export const reports = [
  ["India EV Outlook 2027","Market intelligence","Premium"],
  ["Battery Supply Chain in India","Battery","Premium"],
  ["Public Charging Infrastructure Index","Charging","Member"],
  ["Fleet Electrification Economics","Commercial mobility","Premium"],
  ["State EV Policy Tracker","Policy","Member"],
  ["EV Startup Funding Landscape","Investment","Premium"]
];

export const plans = [
  { name:"Free Member", price:"₹0", description:"Start exploring the EV ecosystem.", features:["Limited articles per month","Weekly newsletter","Public podcasts and videos","Basic company directory","Save articles","Follow authors and topics"] },
  { name:"Professional", price:"₹399", description:"For consultants, engineers and founders.", popular:true, features:["Unlimited news","Full digital magazine archive","Premium interviews","Market analysis","AI article summaries","Personalized feed","Monthly reports","Webinar access"] },
  { name:"Executive", price:"₹999", description:"For CXOs, investors and policymakers.", features:["Everything in Professional","Exclusive research reports","Investment tracker","Industry dashboards","Funding database","Executive roundtables","Private networking","Premium event invitations","Downloadable datasets"] },
  { name:"Enterprise", price:"Custom", description:"For organisations building the future of mobility.", features:["Team seats","Organisation dashboard","Shared research library","Custom analytics","API-ready architecture","Dedicated account manager","Company profile","Recruitment credits","Sponsorship benefits"] }
];

export const dashboardData = [
  ["EV registrations","1.86M","28.4%"],
  ["Charging points","27.8K","+19.2%"],
  ["Battery capacity","42 GWh","+31.6%"],
  ["Funding","$1.4B","+22.8%"]
];

export const investorDeals = [
  ["Battery technology raises growth capital to expand domestic manufacturing","$48M","OCT 5"],
  ["Charging network closes strategic round for national expansion","$32M","OCT 4"],
  ["Fleet platform secures institutional capital for electrification","$21M","OCT 3"]
];

export const peopleVoices = [
  ["CEO","AM","The operator's view of EV scale"],
  ["Founder","RS","Building batteries for India"],
  ["Investor","PN","Where smart capital is flowing"],
  ["Policymaker","VK","Policy as an industrial lever"],
  ["Researcher","SM","The science behind safer cells"],
  ["Operator","AJ","Electrifying commercial mobility"]
];

export const learningCourses = [
  "EV Basics",
  "Battery Technology",
  "Charging Explained",
  "Government Policy",
  "EV Economics",
  "Industry Glossary"
];

export const communityFeatures = [
  ["Expert Forums","Ask questions and exchange practical knowledge."],
  ["Private Groups","Build focused communities around your sector."],
  ["Mentorship","Learn from leaders across the EV value chain."],
  ["Ask Experts","Get answers from verified industry specialists."],
  ["Networking","Find relevant people, companies and opportunities."],
  ["Industry Polls","Share perspective and see what the ecosystem thinks."]
];

export const homeCapabilities = [
  ["Research","Decision-ready reports, market forecasts and sector intelligence.","/research","FileText"],
  ["People","The leaders, founders and experts shaping the next decade.","/people","Users"],
  ["Ecosystem","Discover companies, startups, investors, jobs and opportunities.","/directory","Building2"],
  ["Network","Events, communities and executive conversations that create connections.","/community","Sparkles"]
];

export const siteContentDefaults = {
  navigation: nav,
  homeStats: stats,
  directory: companies,
  events,
  reports,
  plans,
  dashboardData,
  investorDeals,
  peopleVoices,
  learningCourses,
  communityFeatures,
  homeCapabilities
};