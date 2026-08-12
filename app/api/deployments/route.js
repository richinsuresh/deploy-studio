import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.DEPLOY_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    return NextResponse.json(
      { error: "Server is missing DEPLOY_API_TOKEN." },
      { status: 500 }
    );
  }

  const url = new URL("https://api.vercel.com/v6/deployments");
  url.searchParams.set("limit", "50");
  if (teamId) url.searchParams.set("teamId", teamId);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Could not list deployments." },
        { status: res.status }
      );
    }

    const raw = data.deployments || [];

    // Look up each project's short stable domain once (not per deployment)
    const uniqueNames = [...new Set(raw.map((d) => d.name))];
    const domainMap = {};
    await Promise.all(
      uniqueNames.map(async (name) => {
        try {
          const domainsUrl = new URL(
            `https://api.vercel.com/v9/projects/${name}/domains`
          );
          if (teamId) domainsUrl.searchParams.set("teamId", teamId);
          const dRes = await fetch(domainsUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (dRes.ok) {
            const dData = await dRes.json();
            const candidates = (dData.domains || [])
              .map((d) => d.name)
              .filter((n) => n.endsWith(".vercel.app"));
            candidates.sort((a, b) => a.length - b.length);
            if (candidates[0]) domainMap[name] = candidates[0];
          }
        } catch (e) {
          // fall back to the deployment's own URL below
        }
      })
    );

    const deployments = raw.map((d) => ({
      id: d.uid,
      name: d.name,
      url: `https://${domainMap[d.name] || d.url}`,
      state: d.state,
      createdAt: d.createdAt || d.created,
    }));

    return NextResponse.json({ deployments });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach Vercel API: " + err.message },
      { status: 500 }
    );
  }
}
