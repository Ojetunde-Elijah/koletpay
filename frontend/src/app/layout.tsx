import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";
import "./global.css";
export const metadata: Metadata = {
  title: "KoletPay | Invoice & Customer Ledger",
  description:
    "A responsive web-based business ledger and invoicing demo for Nigerian small businesses.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
