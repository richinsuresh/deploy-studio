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

    const deployments = (data.deployments || []).map((d) => ({
      id: d.uid,
      name: d.name,
      url: `https://${d.url}`,
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
