import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export interface CertificateData {
  ulpin: string;
  ownerName: string;
  area: string;
  landType: string;
  district: string;
  state: string;
  blockIndex: number;
  blockHash: string;
  previousHash: string;
  timestamp: string;
  transactionType: "registration" | "transfer";
  fromOwner?: string;
}

const Certificate = forwardRef<HTMLDivElement, { data: CertificateData }>(
  ({ data }, ref) => {
    const qrPayload = JSON.stringify({
      ulpin: data.ulpin,
      owner: data.ownerName,
      block: data.blockIndex,
      hash: data.blockHash.slice(0, 16),
      issued: data.timestamp,
    });

    const issueDate = (() => {
      try {
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(new Date(data.timestamp));
      } catch {
        return data.timestamp;
      }
    })();

    const shortHash = `${data.blockHash.slice(0, 16)}...${data.blockHash.slice(-8)}`;
    const shortPrev = `${data.previousHash.slice(0, 12)}...${data.previousHash.slice(-8)}`;

    return (
      <div
        ref={ref}
        style={{
          width: 860,
          background: "linear-gradient(135deg, #0d1117 0%, #0f1923 40%, #0d1117 100%)",
          fontFamily: "'Inter', sans-serif",
          padding: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 5, background: "linear-gradient(90deg, #f59e0b, #fbbf24, #d97706)" }} />

        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            pointerEvents: "none",
          }}
        />

        {/* Corner decorations */}
        <CornerDecor pos="top-left" />
        <CornerDecor pos="top-right" />
        <CornerDecor pos="bottom-left" />
        <CornerDecor pos="bottom-right" />

        <div style={{ padding: "36px 48px 40px", position: "relative" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(245,158,11,0.15)",
                  border: "1.5px solid rgba(245,158,11,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                🏛️
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
                  BhuChain
                </div>
                <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em", fontWeight: 500, textTransform: "uppercase", marginTop: 1 }}>
                  Digital Land Registry — India
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 6,
                  background: data.transactionType === "registration" ? "rgba(245,158,11,0.15)" : "rgba(96,165,250,0.15)",
                  border: `1px solid ${data.transactionType === "registration" ? "rgba(245,158,11,0.3)" : "rgba(96,165,250,0.3)"}`,
                  color: data.transactionType === "registration" ? "#fbbf24" : "#93c5fd",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {data.transactionType === "registration" ? "Land Registration" : "Ownership Transfer"}
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                Issued: <span style={{ color: "#94a3b8" }}>{issueDate}</span>
              </div>
              <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>
                Block #{data.blockIndex}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.3) 30%, rgba(245,158,11,0.3) 70%, transparent)", marginBottom: 28 }} />

          {/* Main content */}
          <div style={{ display: "flex", gap: 32 }}>
            {/* Left — property details */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase", marginBottom: 14 }}>
                CERTIFICATE OF {data.transactionType === "registration" ? "REGISTRATION" : "OWNERSHIP TRANSFER"}
              </div>

              {data.transactionType === "transfer" && data.fromOwner && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Transferred From
                  </div>
                  <div style={{ fontSize: 15, color: "#94a3b8", fontWeight: 500, textDecoration: "line-through", textDecorationColor: "rgba(148,163,184,0.4)" }}>
                    {data.fromOwner}
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, marginTop: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    New Owner
                  </div>
                </div>
              )}

              {data.transactionType === "registration" && (
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Registered Owner
                </div>
              )}

              <div style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.3px", marginBottom: 20, lineHeight: 1.2 }}>
                {data.ownerName}
              </div>

              {/* Property grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                <InfoField label="ULPIN" value={data.ulpin} mono />
                <InfoField label="Area" value={data.area} />
                <InfoField label="Land Type" value={data.landType} />
                <InfoField label="District" value={data.district} />
                <InfoField label="State" value={data.state} />
              </div>
            </div>

            {/* Right — QR code */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div
                style={{
                  padding: 12,
                  background: "#ffffff",
                  borderRadius: 12,
                  border: "1.5px solid rgba(245,158,11,0.3)",
                }}
              >
                <QRCodeSVG
                  value={qrPayload}
                  size={110}
                  bgColor="#ffffff"
                  fgColor="#0d1117"
                  level="M"
                />
              </div>
              <div style={{ fontSize: 10, color: "#475569", textAlign: "center", maxWidth: 120 }}>
                Scan to verify on BhuChain
              </div>
            </div>
          </div>

          {/* Blockchain Proof section */}
          <div
            style={{
              marginTop: 24,
              padding: "14px 16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
              Blockchain Proof of Record
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
              <HashField label="Block Hash" value={shortHash} />
              <HashField label="Previous Hash" value={shortPrev} />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 10, color: "#334155", maxWidth: 420 }}>
              This certificate is cryptographically secured on the BhuChain blockchain. The block hash above uniquely identifies this record and cannot be altered without invalidating the entire chain.
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "#475569" }}>blockchain.gov.in</div>
              <div style={{ fontSize: 9, color: "#334155", marginTop: 2 }}>NIC Digital India Initiative</div>
            </div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #d97706, #f59e0b, #d97706, transparent)" }} />
      </div>
    );
  }
);

Certificate.displayName = "Certificate";

export default Certificate;

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#cbd5e1",
          fontWeight: 500,
          fontFamily: mono ? "'JetBrains Mono', 'Fira Code', monospace" : "inherit",
          letterSpacing: mono ? "0.04em" : "inherit",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function HashField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 3 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          letterSpacing: "0.06em",
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CornerDecor({ pos }: { pos: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const isTop = pos.startsWith("top");
  const isLeft = pos.endsWith("left");
  return (
    <div
      style={{
        position: "absolute",
        top: isTop ? 12 : undefined,
        bottom: !isTop ? 12 : undefined,
        left: isLeft ? 16 : undefined,
        right: !isLeft ? 16 : undefined,
        width: 24,
        height: 24,
        borderTop: isTop ? "1.5px solid rgba(245,158,11,0.25)" : undefined,
        borderBottom: !isTop ? "1.5px solid rgba(245,158,11,0.25)" : undefined,
        borderLeft: isLeft ? "1.5px solid rgba(245,158,11,0.25)" : undefined,
        borderRight: !isLeft ? "1.5px solid rgba(245,158,11,0.25)" : undefined,
        borderRadius: isTop && isLeft ? "4px 0 0 0" : isTop ? "0 4px 0 0" : isLeft ? "0 0 0 4px" : "0 0 4px 0",
        pointerEvents: "none",
      }}
    />
  );
}
