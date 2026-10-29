import { Link } from "react-router-dom";
import { relatedPageOptions } from "../../features/navigation/sitePages";

export default function RelatedPageLinks({ item }) {
  let values = [];
  try { values = JSON.parse(item?.relatedContent || "[]"); } catch { return null; }
  if (!Array.isArray(values)) return null;
  const pages = values.map((route) => relatedPageOptions.find((page) => page.value === route)).filter(Boolean);
  if (!pages.length) return null;
  return <nav className="related-page-links" aria-label="Related pages">{pages.map((page) => <Link to={page.value} key={page.value}>{page.label}</Link>)}</nav>;
}
