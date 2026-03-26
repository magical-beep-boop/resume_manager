import { NextResponse } from "next/server";

function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function cleanScrapedText(text) {
  return (text || "")
    .replace(/#+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/Apply on company site[\s\S]*/i, "")
    .replace(/LinkedIn and 3rd parties use essential and non-essential cookies[\s\S]*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Failed with status ${response.status}`);
  }
  return response.text();
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "A job URL is required." }, { status: 400 });
    }

    const normalized = normalizeUrl(url);
    const attempts = [
      () =>
        fetchText(normalized, {
          headers: {
            "User-Agent": "Mozilla/5.0 ResumeTailorBot/1.0"
          },
          cache: "no-store"
        }),
      () =>
        fetchText(`https://r.jina.ai/http://${normalized.replace(/^https?:\/\//, "")}`, {
          cache: "no-store"
        })
    ];

    for (const attempt of attempts) {
      try {
        const text = cleanScrapedText(await attempt());
        if (text.length > 500) {
          return NextResponse.json({ text });
        }
      } catch (error) {
        continue;
      }
    }

    return NextResponse.json(
      { error: "Unable to extract the job description from this URL. Paste the description manually instead." },
      { status: 422 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "The scrape request could not be processed." },
      { status: 500 }
    );
  }
}
