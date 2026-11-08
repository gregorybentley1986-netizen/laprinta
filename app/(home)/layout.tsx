import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import "../styles/site.css";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        К содержимому
      </a>
      <SiteHeader variant="home" />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
