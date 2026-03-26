import "./globals.css";

export const metadata = {
  title: "Resume Tailor",
  description: "Generate an ATS-friendly one-page resume from a job URL or pasted job description."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
