import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TSUMUGU";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f8fafc",
          color: "#09090b",
          padding: "72px",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontSize: 30,
            fontWeight: 700
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "#0f172a",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22
            }}
          >
            T
          </div>
          TSUMUGU
        </div>
        <div>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.16 }}>
            あなたの言葉を、そのまま、
            <br />
            もっと伝わる文章へ。
          </div>
          <div
            style={{
              marginTop: 32,
              width: 760,
              fontSize: 28,
              lineHeight: 1.55,
              color: "#3f3f46"
            }}
          >
            AIに代わりに書かせるのではなく、あなた自身の言葉を自然で伝わりやすい文章へ整えるAIライティングアシスタント。
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#64748b" }}>0→1 Lab</div>
      </div>
    ),
    size
  );
}
