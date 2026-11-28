"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="login__form">
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span className="field__label">Пароль</span>
        <input className="input" type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      {state.error && (
        <p className="notice notice--error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="abtn abtn--primary abtn--block" disabled={pending}>
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
