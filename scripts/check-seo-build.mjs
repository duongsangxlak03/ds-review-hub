import fs from "node:fs";
import path from "node:path";

const DOMAIN = "https://www.dsreviewhub.com";
const distDir = path.resolve("dist");
const sitemapPath = path.join(distDir, "sitemap.xml");

const fail = (message) => {
  console.error(`[seo-check] ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(sitemapPath)) {
  fail("dist/sitemap.xml is missing. Run the production build first.");
  process.exit();
}

const sitemap = fs.readFileSync(sitemapPath, "utf8");
const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);

if (urls.length === 0) {
  fail("No URLs found in dist/sitemap.xml.");
  process.exit();
}

const htmlFileForUrl = (url) => {
  const parsed = new URL(url);
  const route = parsed.pathname.replace(/^\/+|\/+$/g, "");
  return route ? path.join(distDir, route, "index.html") : path.join(distDir, "index.html");
};

const canonicalForUrl = (url) => {
  const parsed = new URL(url);
  const pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/g, "");
  return `${DOMAIN}${pathname === "/" ? "/" : pathname}`;
};

let missingHtml = 0;
let badCanonical = 0;
let badTitle = 0;
let badH1 = 0;
let insecureAssets = 0;

for (const url of urls) {
  const file = htmlFileForUrl(url);

  if (!fs.existsSync(file)) {
    missingHtml += 1;
    console.error(`[seo-check] Missing prerendered HTML for ${url}: ${file}`);
    continue;
  }

  const html = fs.readFileSync(file, "utf8");
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || "";
  const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
    || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1]
    || "";
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const expectedCanonical = canonicalForUrl(url);
  const isHome = new URL(url).pathname === "/";

  if (!title || (!isHome && title === "DS Review Hub - Brand Reviews for Smarter Shopping")) {
    badTitle += 1;
    console.error(`[seo-check] Suspicious title for ${url}: ${title || "(missing)"}`);
  }

  if (canonical !== expectedCanonical) {
    badCanonical += 1;
    console.error(`[seo-check] Bad canonical for ${url}: expected ${expectedCanonical}, got ${canonical || "(missing)"}`);
  }

  if (h1Count !== 1) {
    badH1 += 1;
    console.error(`[seo-check] Expected exactly one H1 for ${url}, found ${h1Count}`);
  }

  const insecureMatches = html.match(/\b(?:src|href)=["']http:\/\/[^"']+/gi) || [];
  if (insecureMatches.length > 0) {
    insecureAssets += insecureMatches.length;
    console.error(`[seo-check] Insecure http asset/link for ${url}: ${insecureMatches.slice(0, 3).join(", ")}`);
  }
}

if (missingHtml || badCanonical || badTitle || badH1 || insecureAssets) {
  fail(`SEO build check failed: missingHtml=${missingHtml}, badCanonical=${badCanonical}, badTitle=${badTitle}, badH1=${badH1}, insecureAssets=${insecureAssets}`);
} else {
  console.log(`[seo-check] OK: ${urls.length} sitemap URLs have prerendered HTML, canonical tags, one H1, and no insecure http assets.`);
}
