import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetChain } from "@workspace/api-client-react";
import { Blocks, Copy, ChevronDown, ChevronUp, Link2, ArrowDown } from "lucide-react";
import { truncateHash, formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  genesis: "bg-muted text-muted-foreground border-muted",
  registration: "bg-primary/15 text-primary border-primary/30",
  transfer: "bg-accent/15 text-accent border-accent/30",
};

const TYPE_RING: Record<string, string> = {
  genesis: "border-muted-foreground/30",
  registration: "border-primary/40",
  transfer: "border-accent/40",
};

export default function Explorer() {
  const { data, isLoading } = useGetChain();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const chain = data?.chain ?? [];
  const filtered = search
    ? chain.filter(
        (b) =>
          b.hash.includes(search) ||
          String(b.index).includes(search) ||
          String(b.data?.["ulpin"] ?? "").includes(search) ||
          String(b.data?.["ownerName"] ?? "").toLowerCase().includes(search.toLowerCase()) ||
          String(b.data?.["newOwnerName"] ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : chain;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Blocks className="w-4.5 h-4.5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Blockchain Explorer</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Browse all {data?.length ?? 0} block{(data?.length ?? 0) !== 1 ? "s" : ""} in the immutable chain
        </p>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by block index, hash, ULPIN, or owner name..."
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-card border border-card-border rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Chain */}
      {!isLoading && (
        <div className="space-y-0">
          {[...filtered].reverse().map((block, i) => {
            const isExpanded = expandedIndex === block.index;
            const type = (block.data?.["type"] as string) ?? "genesis";
            return (
              <motion.div
                key={block.index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5) }}
              >
                {/* Chain connector */}
                {i > 0 && (
                  <div className="flex justify-center py-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    "bg-card border rounded-xl overflow-hidden transition-all duration-200",
                    isExpanded ? "border-primary/30" : "border-card-border hover:border-border"
                  )}
                >
                  {/* Block header */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedIndex(isExpanded ? null : block.index)}
                    onKeyDown={(e) => e.key === "Enter" && setExpandedIndex(isExpanded ? null : block.index)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 cursor-pointer"
                  >
                    {/* Block icon */}
                    <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono", TYPE_RING[type] ?? "border-border")}>
                      {block.index}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border", TYPE_COLORS[type] ?? TYPE_COLORS.genesis)}>
                          {type}
                        </span>
                        {block.data?.["ulpin"] && (
                          <span className="text-xs font-mono text-muted-foreground">{block.data["ulpin"] as string}</span>
                        )}
                        {(block.data?.["ownerName"] || block.data?.["newOwnerName"]) && (
                          <span className="text-xs text-foreground/80 truncate">
                            {(block.data?.["ownerName"] ?? block.data?.["newOwnerName"]) as string}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Link2 className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[11px] font-mono text-muted-foreground/60 truncate max-w-[200px] sm:max-w-xs">
                          {truncateHash(block.hash)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(block.hash); toast.info("Hash copied"); }}
                          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Timestamp + expand */}
                    <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatTimestamp((block.data?.["timestamp"] as string) ?? block.timestamp)}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-border/50 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-2">
                            <DetailRow label="Block Index" value={String(block.index)} mono />
                            <DetailRow label="Nonce" value={String(block.nonce)} mono />
                            <DetailRow label="Timestamp" value={formatTimestamp((block.data?.["timestamp"] as string) ?? block.timestamp)} />
                          </div>
                          <div className="space-y-2">
                            <HashDetail label="Block Hash" value={block.hash} />
                            <HashDetail label="Previous Hash" value={block.previousHash} />
                          </div>
                          {/* Block data fields */}
                          {Object.entries(block.data ?? {}).filter(([k]) => !["type","timestamp"].includes(k)).length > 0 && (
                            <div className="col-span-full space-y-2 pt-2 border-t border-border/50">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Block Data</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(block.data ?? {}).filter(([k]) => !["type","timestamp"].includes(k)).map(([k, v]) => (
                                  <div key={k} className="space-y-0.5">
                                    <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                    <p className={cn("text-foreground/80 break-all", k.toLowerCase().includes("hash") || k === "ulpin" ? "font-mono text-[10px]" : "")}>
                                      {String(v)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && !isLoading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? "No blocks match your search." : "The blockchain is empty."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <span className={cn("text-foreground/80 break-all", mono ? "font-mono" : "")}>{value}</span>
    </div>
  );
}

function HashDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground block mb-0.5">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-foreground/70 break-all">{value}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); toast.info("Copied!"); }} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
