"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function AdminPage() {
  const [message, setMessage] = useState("");
  const [configuration, setConfiguration] = useState("checking");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        if (!active) return;
        setConfiguration(data.configuration);
        if (data.admin) setMessage("当前已登录，可返回工作区进行管理。");
      })
      .catch(() => { if (active) setConfiguration("unreachable"); });
    return () => { active = false; };
  }, []);
  return (
    <main className="admin-page">
      <section className="panel admin-panel">
        <h1>工作区管理</h1>
        <p>输入你在 Netlify 配置的管理员密码。登录有效期为 8 小时，请勿将密码发送到聊天。</p>
        <p className="admin-configuration" role="status">
          {configuration === "ready" ? "服务端已读取到有效格式的管理员配置。"
            : configuration === "missing" ? "服务端未读取到 BIOREG_ADMIN_KEY。"
            : configuration === "invalid" ? "服务端管理员密码不满足至少 32 个字符的要求。"
            : configuration === "checking" ? "正在检查登录服务…" : "暂时无法检查登录服务，请刷新重试。"}
        </p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const value = String(new FormData(form).get("key") || "");
          if (value !== value.trim()) {
            setMessage("密码前后含有空白字符，请确认后重新输入。");
            return;
          }
          setBusy(true);
          setMessage("正在登录…");
          try {
            const r = await fetch("/api/admin", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: value }),
            });
            const data = await r.json();
            if (!r.ok) {
              setMessage(`${data.message || "登录失败，请稍后重试。"}（HTTP ${r.status}，${data.code || "REQUEST_FAILED"}）`);
              return;
            }
            const session = await fetch("/api/admin", { cache: "no-store" });
            const state = await session.json();
            setMessage(session.ok && state.admin
              ? "登录成功，可以管理关注列表、通知及摘要。"
              : "密码已验证，但浏览器未保持登录会话，请检查 Cookie 设置后重试。");
          } catch {
            setMessage("网络连接失败，请确认网络正常后重试。");
          } finally {
            form.reset();
            setBusy(false);
          }
        }}>
          <label htmlFor="admin-key">管理员密码</label>
          <input id="admin-key" name="key" type="password" required minLength={32}
            autoComplete="current-password" spellCheck={false} autoCapitalize="none"
            placeholder="输入至少 32 个字符的管理员密码" aria-describedby="admin-help" />
          <p id="admin-help">与 Netlify 的 BIOREG_ADMIN_KEY 值完全一致，前后不要加空格。</p>
          <button className="button primary" disabled={busy}>{busy ? "登录中…" : "登录"}</button>
        </form>
        <div className="admin-actions">
          <button className="button" disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              const r = await fetch("/api/admin", { method: "DELETE" });
              setMessage(r.ok ? "已退出登录" : "退出失败，请重试");
            } catch { setMessage("网络连接失败，请稍后重试。"); }
            finally { setBusy(false); }
          }}>退出登录</button>
          <Link href="/">返回 BioReg</Link>
        </div>
        <p className="admin-message" role="status" aria-live="polite">{message}</p>
      </section>
    </main>
  );
}
