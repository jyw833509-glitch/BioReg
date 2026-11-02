"use client";
import { useState } from "react";
import Link from "next/link";
export default function AdminPage() {
  const [message, setMessage] = useState("");
  return (
    <main>
      <section className="panel">
        <h1>工作区管理</h1>
        <p>
          公共访问为只读。管理员密钥只在此处输入，不要发送到聊天；登录有效期为 8
          小时。
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const value = new FormData(form).get("key");
            const r = await fetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: value }),
            });
            form.reset();
            setMessage(
              r.ok
                ? "登录成功，可以管理关注列表、通知及摘要。"
                : "登录失败，请检查密钥或平台配置。",
            );
          }}
        >
          <label>
            管理员密钥{" "}
            <input
              name="key"
              type="password"
              required
              minLength={32}
              autoComplete="current-password"
            />
          </label>
          <button className="button">登录</button>
        </form>
        <button
          className="button"
          onClick={async () => {
            const r = await fetch("/api/admin", { method: "DELETE" });
            setMessage(r.ok ? "已退出" : "退出失败，请重试");
          }}
        >
          退出登录
        </button>
        <p role="status">{message}</p>
        <Link href="/">返回 BioReg</Link>
      </section>
    </main>
  );
}
