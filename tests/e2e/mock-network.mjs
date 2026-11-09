// Test-process preload only: no runtime switch or authentication bypass in src/.
// Actual Auth.js state, PKCE, token exchange, encrypted cookies and logout run.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (
    url.origin === "https://github.com" &&
    url.pathname === "/login/oauth/access_token"
  ) {
    const request = new Request(input, init);
    const body = new URLSearchParams(await request.text());
    if (
      !body.get("code_verifier") ||
      !["mock-owner", "mock-other"].includes(body.get("code"))
    ) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    return Response.json({
      access_token: body.get("code"),
      token_type: "bearer",
      scope: "",
    });
  }
  if (url.origin === "https://api.github.com" && url.pathname === "/user") {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    return Response.json({
      id:
        headers.get("Authorization") === "Bearer mock-owner" ? 424242 : 999999,
    });
  }
  if (["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    return realFetch(input, init);
  throw new Error("E2E external network blocked");
};
