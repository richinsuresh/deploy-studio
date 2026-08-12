import { NextResponse } from "next/server";

// This runs on the server only. The Vercel token never reaches the browser.
export async function POST(req) {
  const passcode = process.env.APP_PASSCODE;
  const token = process.env.DEPLOY_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID; // optional

  if (!token) {
    return NextResponse.json(
      { error: "Server is missing DEPLOY_API_TOKEN. Add it in Vercel project settings." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { siteName, files, enteredPasscode } = body;

  if (passcode && enteredPasscode !== passcode) {
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  if (!siteName || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: "Missing site name or files." },
      { status: 400 }
    );
  }

  // Vercel project names: lowercase letters, numbers, and dashes only
  const safeName = siteName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "site";

  // Clean up relative paths: strip leading slashes, normalize backslashes
  const cleaned = files
    .map((f) => ({
      file: f.path.replace(/\\/g, "/").replace(/^\/+/, ""),
      data: f.data, // base64 string
      encoding: "base64",
    }))
    .filter((f) => f.file.length > 0);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No valid files found." }, { status: 400 });
  }

  // Vercel needs a root index.html. If one isn't present at the top level,
  // duplicate the best candidate .html file so the site has an entry point.
  const hasRootIndex = cleaned.some((f) => f.file.toLowerCase() === "index.html");
  if (!hasRootIndex) {
    const htmlFiles = cleaned.filter((f) => f.file.toLowerCase().endsWith(".html"));
    if (htmlFiles.length === 0) {
      return NextResponse.json(
        { error: "No .html file found among the uploaded files." },
        { status: 400 }
      );
    }
    // Prefer a shallow file (fewest path segments) as the entry point
    htmlFiles.sort((a, b) => a.file.split("/").length - b.file.split("/").length);
    cleaned.push({ file: "index.html", data: htmlFiles[0].data, encoding: "base64" });
  }

  const url = new URL("https://api.vercel.com/v13/deployments");
  if (teamId) url.searchParams.set("teamId", teamId);

  try {
    const vercelRes = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: safeName,
        target: "production",
        files: cleaned,
        projectSettings: {
          framework: null,
        },
      }),
    });

    const data = await vercelRes.json();

    if (!vercelRes.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Vercel API rejected the deployment." },
        { status: vercelRes.status }
      );
    }

    // The deployment response gives a long, unique-per-push URL. Projects also
    // get a short, stable domain (e.g. my-site.vercel.app) that stays the same
    // across pushes — that's the one worth showing. Look it up, with a couple
    // of short retries since it can take a moment to attach after creation.
    let shortDomain = null;
    for (let attempt = 0; attempt < 4 && !shortDomain; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1200));

      const domainsUrl = new URL(
        `https://api.vercel.com/v9/projects/${safeName}/domains`
      );
      if (teamId) domainsUrl.searchParams.set("teamId", teamId);

      const domainsRes = await fetch(domainsUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        const candidates = (domainsData.domains || [])
          .map((d) => d.name)
          .filter((n) => n.endsWith(".vercel.app"));
        if (candidates.length > 0) {
          candidates.sort((a, b) => a.length - b.length);
          shortDomain = candidates[0];
        }
      }
    }

    return NextResponse.json({
      url: `https://${shortDomain || data.url}`,
      name: safeName,
      id: data.id,
      createdAt: data.createdAt || Date.now(),
      fileCount: cleaned.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach Vercel API: " + err.message },
      { status: 500 }
    );
  }
}
