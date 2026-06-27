import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVerifyChain, getVerifyChainQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { truncateHash } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  genesis: "Genesis",
  registration: "Registration",
  transfer: "Transfer",
  unknown: "Unknown",
};

export default function Verify() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useVerifyChain();
  const [revealed, setRevealed] = useState(0);

  const runVerification = () => {
    setRevealed(0);
    qc.invalidateQueries({ queryKey: getVerifyChainQueryKey() });
    const timer = setInterval(() => {
      setRevealed((r) => {
        if (r >= (data?.results.length ?? 0)) { clearInterval(timer); return r; }
        return r + 1;
      });
    }, 80);
    return () => clearInterval(timer);
  };

  const allValid = data?.isValid ?? false;
  const total = data?.totalBlocks ?? 0;
  const validCount = data?.results.filter((r) => r.hashValid && r.previousHashValid).length ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center",
            data ? (allValid ? "bg-emerald-500/15 border-emerald-500/25" : "bg-destructive/15 border-destructive/25") : "bg-muted/30 border-muted"
          )}>
            {data && !allValid ? (
              <ShieldAlert className="w-4.5 h-4.5 text-destructive" />
            ) : (
              <ShieldCheck className={cn("w-4.5 h-4.5", data ? "text-emerald-400" : "text-muted-foreground")} />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Chain Verification</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Validate every block's cryptographic hash and chain linkage
        </p>
      </motion.div>

      {/* Status banner */}
      {data && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "rounded-xl border p-5 flex items-center gap-4",
            allValid
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-destructive/10 border-destructive/30"
          )}
        >
          {allValid ? (
            <ShieldCheck className="w-10 h-10 text-emerald-400 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-10 h-10 text-destructive flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={cn("text-lg font-bold", allValid ? "text-emerald-400" : "text-destructive")}>
              {allValid ? "Blockchain Integrity Verified" : "Chain Integrity Compromised!"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {validCount}/{total} blocks valid
              {!allValid && " — tampered blocks detected"}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold font-mono">{total > 0 ? Math.round((validCount / total) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">integrity</p>
          </div>
        </motion.div>
      )}

      {/* Run button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <button
          onClick={runVerification}
          disabled={isFetching}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isFetching ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Run Verification</>
          )}
        </button>
      </motion.div>

      {/* Block results */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-card border border-card-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold">Block Verification Results</p>
            <span className="text-xs text-muted-foreground">{data.results.length} blocks</span>
          </div>
          <div className="divide-y divide-border">
            {data.results.map((result, i) => {
              const ok = result.hashValid && result.previousHashValid;
              const show = i < revealed || revealed === 0;
              return (
                <AnimatePresence key={result.index}>
                  {show && (
                    <motion.div
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-5 py-3 flex items-center gap-4"
                    >
                      {/* Status icon */}
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                        ok ? "bg-emerald-500/15" : "bg-destructive/15"
                      )}>
                        {ok
                          ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                          : <XCircle className="w-4 h-4 text-destructive" />
                        }
                      </div>

                      {/* Block info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-semibold text-foreground">
                            #{result.index}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase px-1.5 py-0.5 bg-muted rounded">
                            {TYPE_LABELS[result.type] ?? result.type}
                          </span>
                          {!result.hashValid && (
                            <span className="text-[10px] text-destructive font-semibold">HASH INVALID</span>
                          )}
                          {!result.previousHashValid && result.index > 0 && (
                            <span className="text-[10px] text-destructive font-semibold">LINK BROKEN</span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground/60 truncate mt-0.5">
                          {truncateHash(result.storedHash)}
                        </p>
                      </div>

                      {/* Checks */}
                      <div className="flex items-center gap-3 flex-shrink-0 text-[10px]">
                        <div className={cn("flex items-center gap-1", result.hashValid ? "text-emerald-400" : "text-destructive")}>
                          {result.hashValid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          Hash
                        </div>
                        <div className={cn("flex items-center gap-1", result.previousHashValid ? "text-emerald-400" : "text-destructive")}>
                          {result.previousHashValid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          Link
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !isLoading && (
        <div className="py-16 text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Click "Run Verification" to validate the blockchain</p>
        </div>
      )}
    </div>
  );
}
