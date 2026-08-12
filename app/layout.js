import "./globals.css";

export const metadata = {
  title: "Deploy Studio",
  description: "Push HTML sites to Vercel with one click",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
