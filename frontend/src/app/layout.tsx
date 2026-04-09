import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning AI Assistant",
  description: "RAG-powered document assistant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              color: "#000000",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "700",
              border: "3px solid #000",
              boxShadow: "4px 4px 0px 0px #000",
              padding: "12px 16px",
              fontFamily: "Space Grotesk, sans-serif",
            },
            success: { iconTheme: { primary: "#6BCB77", secondary: "#000" } },
            error:   { iconTheme: { primary: "#FF6B6B", secondary: "#000" } },
          }}
        />
      </body>
    </html>
  );
}
