"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export function AnalyticsBeacon({
  eventName,
  properties = {}
}: {
  eventName: string;
  properties?: Record<string, unknown>;
}) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function send() {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      await fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {})
        },
        body: JSON.stringify({ eventName, properties })
      }).catch(() => undefined);
    }

    void send();
  }, [eventName, properties]);

  return null;
}
