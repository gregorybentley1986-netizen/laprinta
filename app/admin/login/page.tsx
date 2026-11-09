import { redirect } from "next/navigation";
import { Wordmark } from "@/components/site/Wordmark";
import { isAdmin } from "@/lib/admin-auth";
import { adminPassword } from "@/lib/auth-token";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await isAdmin()) redirect("/admin/products");
  const { next = "" } = await searchParams;
  const configured = adminPassword() !== null;
  const devDefault = !process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== "production";

  return (
    <main className="login">
      <div className="login__card">
        <Wordmark className="wordmark--md" />
        <h1>Вход в админку каталога</h1>
        {configured ? (
          <LoginForm next={next} />
        ) : (
          <p className="notice notice--error">Пароль не настроен. Задайте переменную окружения ADMIN_PASSWORD и перезапустите сервер.</p>
        )}
        {devDefault && (
          <p className="notice">
            Режим разработки: пароль по умолчанию <code>laprinta</code>. Задайте ADMIN_PASSWORD в .env.local.
          </p>
        )}
      </div>
    </main>
  );
}
