import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import "../styles/site.css";
import "../styles/cart.css";
import "../styles/articles.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        К содержимому
      </a>
      <SiteHeader />
      <div id="main" className="site-main">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
