import type { Metadata } from "next";
import "../styles/admin.css";

export const metadata: Metadata = {
  title: { default: "Админка", template: "%s · Админка laprinta" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
