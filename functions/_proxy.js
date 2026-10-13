const API_PATHS = ["/auth", "/tasks", "/users", "/leaderboard", "/health", "/notifications"];

export async function proxyApi(context) {
  const incoming = new URL(context.request.url);
  if (!API_PATHS.some((base) => incoming.pathname === base || incoming.pathname.startsWith(`${base}/`))) {
    return context.next();
  }

  let apiOrigin;
  try {
    apiOrigin = new URL(context.env.API_ORIGIN || "https://study-buddy-backend-pi.vercel.app");
    const localHttp = apiOrigin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(apiOrigin.hostname);
    if ((apiOrigin.protocol !== "https:" && !localHttp) || apiOrigin.username || apiOrigin.password || apiOrigin.search || apiOrigin.hash) throw new Error("Invalid API origin");
  } catch {
    return Response.json({ message: "API_ORIGIN is not configured for this Pages deployment." }, { status: 503 });
  }

  const upstreamUrl = new URL(`${incoming.pathname}${incoming.search}`, apiOrigin);
  try {
    const headers = new Headers(context.request.headers);
    headers.delete("host");
    headers.delete("content-length");
    const upstreamRequest = new Request(upstreamUrl, {
      method: context.request.method,
      headers,
      body: ["GET", "HEAD"].includes(context.request.method) ? undefined : context.request.body,
      redirect: "manual",
    });
    const upstream = await fetch(upstreamRequest, { redirect: "manual" });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  } catch {
    return Response.json({ message: "The API is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
