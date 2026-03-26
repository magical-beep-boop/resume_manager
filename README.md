# Resume Tailor

Resume Tailor is a Next.js app that generates a one-page ATS-friendly resume from a job URL or pasted job description.

## Features

- Server-side job scraping endpoint with manual paste fallback
- Editable bullet bank for each role
- Keyword-based matching that only selects existing bullets
- One-page ATS preview with print-to-PDF export
- Local revision history stored in the browser

## Run locally

1. `npm.cmd install`
2. `npm.cmd run dev`
3. Open [http://localhost:3000](http://localhost:3000)

## Build

- `npm.cmd run build`
- `npm.cmd run start`

## Notes

- LinkedIn scraping is best-effort and may still require manual JD paste for some listings.
- Current persistence is browser local storage for the single-user use case.
- The original static prototype files are still present in the repo for reference.
