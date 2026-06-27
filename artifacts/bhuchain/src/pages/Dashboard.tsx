import { motion, AnimatePresence } from "framer-motion";
import { useGetStats, useGetActivity, useSeedData } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Blocks,
  FileCheck,
  ArrowRightLeft,
  ShieldCheck,
  ShieldAlert,
  Activity,
  TrendingUp,
  DatabaseZap,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { truncateHash, formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } },
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: activity, isLoading: actLoading } = useGetActivity();
  const { mutate: seed, isPending: seeding } = useSeedData({
    mutation: {
      onSuccess: (data) => {
        if (data.blocksAdded > 0) {
          toast.success(`Seeded ${data.blocksAdded} blocks!`, {
            description: "Dashboard charts and explorer now show 7 days of realistic data.",
          });
        } else {
          toast.info("Seed skipped — chain already has enough data.");
        }
        void queryClient.invalidateQueries();
      },
      onError: () => toast.error("Seed failed. Check server logs."),
    },
  });

  const isEmptyChain = !statsLoading && (stats?.totalBlocks ?? 0) < 5;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          BhuChain — Blockchain-secured land registry overview
        </p>
      </motion.div>

      {/* Seed demo data banner */}
      <AnimatePresence>
        {isEmptyChain && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="flex items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <DatabaseZap className="w-5 h-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Chain is nearly empty</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Load 12 realistic Indian land records + 5 transfers spread over the last 7 days to populate the charts and explorer.
                </p>
              </div>
            </div>
            <button
              onClick={() => seed({})}
              disabled={seeding}
              className="shrink-0 flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold hover:bg-accent/90 disabled:opacity-60 transition-colors"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mining blocks…
                </>
              ) : (
                <>
                  <DatabaseZap className="w-4 h-4" />
                  Seed Demo Data
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          label="Total Blocks"
          value={stats?.totalBlocks}
          loading={statsLoading}
          icon={Blocks}
          color="text-primary"
          bg="bg-primary/10"
        />
        <KpiCard
          label="Registrations"
          value={stats?.totalRegistrations}
          loading={statsLoading}
          icon={FileCheck}
          color="text-accent"
          bg="bg-accent/10"
        />
        <KpiCard
          label="Transfers"
          value={stats?.totalTransfers}
          loading={statsLoading}
          icon={ArrowRightLeft}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />
        <KpiCard
          label="Chain Status"
          value={statsLoading ? undefined : stats?.chainValid ? "Valid" : "Compromised"}
          loading={statsLoading}
          icon={stats?.chainValid === false ? ShieldAlert : ShieldCheck}
          color={stats?.chainValid === false ? "text-destructive" : "text-emerald-400"}
          bg={stats?.chainValid === false ? "bg-destructive/10" : "bg-emerald-400/10"}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity over time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-card-border rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Activity — Last 7 Days</h2>
          </div>
          {statsLoading ? (
            <div className="h-48 bg-muted/30 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats?.transfersOverTime ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 11%)",
                    border: "1px solid hsl(217 32% 20%)",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                <Line
                  type="monotone"
                  dataKey="registrations"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(38 92% 50%)", r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="transfers"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(217 91% 60%)", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Registrations by state */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-card-border rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Registrations by State</h2>
          </div>
          {statsLoading ? (
            <div className="h-48 bg-muted/30 rounded-lg animate-pulse" />
          ) : (stats?.registrationsByState?.length ?? 0) === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No registrations yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats?.registrationsByState ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="state" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 47% 11%)",
                    border: "1px solid hsl(217 32% 20%)",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="hsl(217 91% 60%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-card border border-card-border rounded-xl p-5"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Recent Blockchain Activity</h2>
        {actLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No transactions recorded yet. Register a land parcel to get started.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activity.map((entry, i) => (
              <motion.div
                key={entry.index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 py-3"
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                    entry.type === "registration"
                      ? "bg-primary"
                      : entry.type === "transfer"
                      ? "bg-accent"
                      : "bg-muted-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{entry.description}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground/70">
                      #{entry.index}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0",
                    entry.type === "registration"
                      ? "bg-primary/15 text-primary"
                      : entry.type === "transfer"
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {entry.type}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Chain hash preview */}
      {stats && stats.totalBlocks > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Blockchain integrity verified —{" "}
              <span className={stats.chainValid ? "text-emerald-400" : "text-destructive"}>
                {stats.chainValid ? "All blocks valid" : "Chain integrity compromised!"}
              </span>
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {stats.totalBlocks} block{stats.totalBlocks !== 1 ? "s" : ""}
          </span>
        </motion.div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  loading,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value?: string | number;
  loading: boolean;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <motion.div
      variants={stagger.item}
      className="bg-card border border-card-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", bg)}>
          <Icon className={cn("w-3.5 h-3.5", color)} />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-16 bg-muted/30 rounded animate-pulse" />
      ) : (
        <p className={cn("text-2xl font-bold tracking-tight", color)}>{value ?? "—"}</p>
      )}
    </motion.div>
  );
}
