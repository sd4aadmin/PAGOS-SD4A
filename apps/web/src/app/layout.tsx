import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SD4A Portal — Ingeniería Estructural",
    template: "%s | SD4A Portal",
  },
  description: "Portal de seguimiento de proyectos, avances y pagos de SD4A Ingeniería Estructural.",
  openGraph: {
    title: "SD4A Portal — Ingeniería Estructural",
    description: "Consulta el avance de tus proyectos estructurales, archivos y pagos en un solo lugar.",
    siteName: "SD4A Portal",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SD4A Portal — Ingeniería Estructural",
    description: "Portal de seguimiento de proyectos, avances y pagos.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans`}>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
