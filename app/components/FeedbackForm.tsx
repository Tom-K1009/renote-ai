"use client";

import { FormEvent, useState } from "react";

export function FeedbackForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        message: formData.get("message")
      })
    });

    if (response.ok) {
      form.reset();
      setStatus("sent");
      return;
    }

    setStatus("error");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium">
        お名前
        <input
          name="name"
          className="min-h-11 rounded-[8px] border border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900"
          autoComplete="name"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        メールアドレス
        <input
          name="email"
          type="email"
          className="min-h-11 rounded-[8px] border border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900"
          autoComplete="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        内容
        <textarea
          name="message"
          required
          className="min-h-40 rounded-[8px] border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          placeholder="使いにくかった点、ほしい改善、気づいたことを教えてください。"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-11 rounded-[8px] bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950"
      >
        {status === "sending" ? "送信中" : "送信"}
      </button>
      {status === "sent" ? (
        <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
          送信しました。ありがとうございます。
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          送信できませんでした。時間をおいて再度お試しください。
        </p>
      ) : null}
    </form>
  );
}
