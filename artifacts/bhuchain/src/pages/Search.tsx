import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetProperty } from "@workspace/api-client-react";
import { Search as SearchIcon, AlertTriangle, CheckCircle, User, Clock, Copy, ChevronDown, ChevronUp, Shield, Award } from "lucide-react";
import { truncateHash, formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import CertificateModal from "@/components/CertificateModal";
import type { CertificateData } from "@/components/Certificate";

export default function Search() {
  const [ulpin, setUlpin] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [certOpen, setCertOpen] = useState(false);

  const { data, isLoading, isError } = useGetProperty(submitted, {
    query: { enabled: !!submitted },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (ulpin.trim()) setSubmitted(ulpin.trim());
  };

  const certData: CertificateData | null =
    data?.success && data.latestBlock
      ? {
          ulpin: (data.latestBlock.data?.["ulpin"] as string) ?? submitted,
          ownerName: data.currentOwner ?? "Unknown",
          area: (data.latestBlock.data?.["area"] as string) ?? "",
          landType: (data.latestBlock.data?.["landType"] as string) ?? "",
          district: (data.latestBlock.data?.["district"] as string) ?? "",
          state: (data.latestBlock.data?.["state"] as string) ?? "",
          blockIndex: data.latestBlock.index,
          blockHash: data.latestBlock.hash,
          previousHash: data.latestBlock.previousHash,
          timestamp:
            (data.latestBlock.data?.["timestamp"] as string) ??
            data.latestBlock.timestamp ??
            new Date().toISOString(),
          transactionType:
            (data.latestBlock.data?.["type"] as "registration" | "transfer") ??
            "registration",
          fromOwner:
            (data.latestBlock.data?.["currentOwner"] as string) ?? undefined,
        }
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
            <SearchIcon className="w-4.5 h-4.5 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Property Search</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Search by ULPIN to trace full ownership history and verify records
        </p>
      </motion.div>

      {/* Search bar */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onSubmit={handleSearch}
        className="flex gap-3"
      >
        <input
          value={ulpin}
          onChange={(e) => setUlpin(e.target.value)}
          placeholder="Enter 14-digit ULPIN..."
          maxLength={14}
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <SearchIcon className="w-4 h-4" />
          Search
        </button>
      </motion.form>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-card border border-card-border rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error / not found */}
      {isError && submitted && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-card-border rounded-xl p-8 text-center"
        >
          <SearchIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No record found</p>
          <p className="text-xs text-muted-foreground mt-1">ULPIN <span className="font-mono">{submitted}</span> is not registered on the chain</p>
        </motion.div>
      )}

      {/* Results */}
      {data?.success && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Fraud alerts */}
            {(data.alerts ?? []).length > 0 && (
              <div className="space-y-2">
                {data.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 rounded-xl border text-sm",
                      alert.level === "critical"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    )}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Current owner card */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">Current Owner</h2>
                {(data.alerts ?? []).length === 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                )}
                {certData && (
                  <button
                    onClick={() => setCertOpen(true)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/25 text-primary text-xs font-semibold rounded-lg hover:bg-primary/25 transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Certificate
                  </button>
                )}
              </div>
              <p className="text-xl font-bold text-foreground">{data.currentOwner ?? "Unknown"}</p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {data.latestBlock?.data && (
                  <>
                    {renderField("ULPIN", data.latestBlock.data["ulpin"] as string)}
                    {renderField("Area", data.latestBlock.data["area"] as string)}
                    {renderField("Land Type", data.latestBlock.data["landType"] as string)}
                    {renderField("District", data.latestBlock.data["district"] as string)}
                    {renderField("State", data.latestBlock.data["state"] as string)}
                    {renderField("Aadhaar KYC", data.latestBlock.data["aadhaarKycStatus"] as string)}
                  </>
                )}
              </div>
            </div>

            {/* Latest block detail */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold">Blockchain Record</h2>
                <span className="ml-auto text-xs text-muted-foreground font-mono">Block #{data.latestBlock?.index}</span>
              </div>
              <div className="space-y-2 text-xs">
                <HashRow label="Block Hash" value={data.latestBlock?.hash ?? ""} />
                <HashRow label="Previous Hash" value={data.latestBlock?.previousHash ?? ""} />
                {data.latestBlock?.data?.["ipfsDocHash"] && (
                  <HashRow label="IPFS Doc CID" value={data.latestBlock.data["ipfsDocHash"] as string} />
                )}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-muted-foreground w-24 flex-shrink-0">Timestamp</span>
                  <span className="text-foreground/80">
                    {formatTimestamp((data.latestBlock?.data?.["timestamp"] as string) ?? data.latestBlock?.timestamp ?? "")}
                  </span>
                </div>
              </div>
            </div>

            {/* Ownership history */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold">Ownership Chain</h2>
                <span className="ml-auto text-xs text-muted-foreground">{data.history.length} record{data.history.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="relative space-y-0">
                {data.history.map((entry, i) => (
                  <HistoryEntry key={i} entry={entry} isLast={i === data.history.length - 1} />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Certificate modal */}
      {certData && (
        <CertificateModal
          data={certData}
          open={certOpen}
          onClose={() => setCertOpen(false)}
        />
      )}
    </div>
  );
}

function renderField(label: string, value: string) {
  return (
    <div key={label} className="space-y-0.5">
      <span className="text-muted-foreground block">{label}</span>
      <span className="text-foreground/90 font-medium">{value || "—"}</span>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <span className="font-mono text-foreground/80 truncate flex-1">{truncateHash(value)}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(value); toast.info("Copied!"); }}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        <Copy className="w-3 h-3" />
      </button>
    </div>
  );
}

function HistoryEntry({ entry, isLast }: { entry: { type: string; timestamp: string; owner?: string | null; from?: string | null; to?: string | null; details: string; hash: string; blockIndex: number }; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="relative flex gap-3">
      {!isLast && <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />}
      <div className={cn("w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 z-10",
        entry.type === "registration" ? "bg-primary/20 border border-primary/40" : "bg-accent/20 border border-accent/40"
      )}>
        <div className={cn("w-2 h-2 rounded-full", entry.type === "registration" ? "bg-primary" : "bg-accent")} />
      </div>
      <div className="flex-1 pb-4">
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{entry.details}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase",
              entry.type === "registration" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"
            )}>{entry.type}</span>
            {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground ml-auto" /> : <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {entry.type === "registration" ? `Owner: ${entry.owner}` : `${entry.from} → ${entry.to}`}
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{formatTimestamp(entry.timestamp)}</p>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Block #</span>
                  <span className="font-mono">{entry.blockIndex}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Hash</span>
                  <span className="font-mono truncate">{truncateHash(entry.hash)}</span>
                  <button onClick={() => { navigator.clipboard.writeText(entry.hash); toast.info("Copied!"); }}>
                    <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
