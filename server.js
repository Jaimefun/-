import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

/* 1. serve homepage & webgl page */
app.use(express.static(join(__dirname, "public")));

/* 2. tiny search-rewrite helper */
function searchRewrite(pathname, searchParams) {
  const q = searchParams.get("q") || searchParams.get("query");
  if (!q) return null; // not a search → let normal proxy handle it

  /* pick engine: first word of query can override */
  const [maybeEngine, ...rest] = q.split(" ");
  let engine = "https://www.google.com/search";
  if (["d", "ddg"].includes(maybeEngine)) {
    engine = "https://duckduckgo.com/";
    searchParams.set("q", rest.join(" "));
  } else if (["b", "bing"].includes(maybeEngine)) {
    engine = "https://www.bing.com/search";
    searchParams.set("q", rest.join(" "));
  }
  return engine + "?" + searchParams.toString();
}

/* 3. proxy middleware with search intercept */
const proxyMiddleware = createProxyMiddleware({
  changeOrigin: true,
  followRedirects: true,
  pathRewrite: { "^/proxy": "" },
  router: (req) => {
    const url = new URL(req.url.slice(7), "http://localhost"); // slice "/proxy/"
    const rewritten = searchRewrite(url.pathname, url.searchParams);
    return rewritten ? rewritten : url.href;
  },
  onProxyReq: (p) => console.log("[PROXY]", p.path),
});

app.use("/proxy", proxyMiddleware);

/* 4. start */
app.listen(PORT, () => console.log(`Unblocker listening on ${PORT}`));
