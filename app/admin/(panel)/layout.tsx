import Link from "next/link";
import { Wordmark } from "@/components/site/Wordmark";
import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/admin-auth";
import { logout } from "../actions";
import { AdminNav } from "./AdminNav";
import { ToastProvider } from "./Toast";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="admin-top__brand">
          <Wordmark href="/admin/products" className="wordmark--sm" />
          <span className="admin-top__label">каталог</span>
        </div>
        <AdminNav />
        <div className="admin-top__actions">
          <Link href="/" className="abtn abtn--ghost abtn--sm" target="_blank">
            <Icon name="external" size={16} />
            <span className="hide-sm">Открыть сайт</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="abtn abtn--ghost abtn--sm" aria-label="Выйти">
              <Icon name="logout" size={16} />
              <span className="hide-sm">Выйти</span>
            </button>
          </form>
        </div>
      </header>
      <main className="admin-main">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
