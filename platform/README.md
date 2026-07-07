# Renote AI Platform Roadmap

This folder contains implementation notes and starter files for Phase4 surfaces.

## React Native Expo

- Share product language, plans, and API contracts with the Next.js app.
- Use Supabase Auth for Google login.
- Call the existing `/api/refine` and `/api/consult` endpoints.
- Store drafts locally with SecureStore/SQLite, then sync to Supabase.

## Chrome Extension

- Use the context menu entry "Renote AIで整形".
- Send selected text to the web app or API.
- Reuse Supabase session through a token handoff flow.

## Google Docs / Microsoft Word

- Start with "copy to document" flows.
- Add direct insertion after OAuth scopes and enterprise review are ready.
