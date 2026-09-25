import { getProjects } from "../lib/content";
import site from "../config/site.json";
export async function GET() {
  const projects = await getProjects();
  const paths = [
    "/",
    "/work/",
    "/work/our-time/",
    "/about/",
    "/contact/",
    ...projects.map((p) => "/work/" + p.slug + "/"),
    ...projects.filter((p) => p.hasBook).map((p) => "/book/" + p.slug + "/"),
  ];
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths.map((p) => "<url><loc>" + site.url + p + "</loc></url>").join("") +
      "</urlset>",
    { headers: { "Content-Type": "application/xml" } },
  );
}
