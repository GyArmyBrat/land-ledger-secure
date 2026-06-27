import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTransferProperty,
  useGetProperty,
  getGetStatsQueryKey,
  getGetActivityQueryKey,
  getGetPropertyQueryKey,
} from "@workspace/api-client-react";
import { ArrowRightLeft, CheckCircle, AlertTriangle, Loader2, Blocks, Copy, User, Award } from "lucide-react";
import { truncateHash } from "@/lib/utils";
import { cn } from "@/lib/utils";
import CertificateModal from "@/components/CertificateModal";
import type { CertificateData } from "@/components/Certificate";

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry",
];

const TRANSFER_REASONS = ["Sale","Inheritance","Gift","Court Order","Exchange","Partition"];

const schema = z.object({
  ulpin: z.string().length(14, "ULPIN must be 14 digits").regex(/^\d{14}$/),
  currentOwner: z.string().min(2, "Current owner name required"),
  newOwnerName: z.string().min(2, "New owner name required"),
  newOwnerAge: z.coerce.number().int().min(18).max(120),
  newOwnerAddress: z.string().min(5, "Address too short"),
  transferReason: z.string().min(1, "Reason is required"),
  aadhaarLast4: z.string().length(4).regex(/^\d{4}$/).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function Transfer() {
  const qc = useQueryClient();
  const mutation = useTransferProperty();
  const [minedBlock, setMinedBlock] = useState<{ hash: string; index: number } | null>(null);
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [ulpinSearch, setUlpinSearch] = useState("");
  const [lookupUlpin, setLookupUlpin] = useState("");

  const { data: propertyData } = useGetProperty(lookupUlpin, {
    query: { enabled: lookupUlpin.length === 14 },
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleLookup = () => {
    if (ulpinSearch.length === 14) {
      setLookupUlpin(ulpinSearch);
      setValue("ulpin", ulpinSearch);
      if (propertyData?.currentOwner) {
        setValue("currentOwner", propertyData.currentOwner);
      }
    }
  };

  const onSubmit = (data: FormData) => {
    mutation.mutate(
      { data: { ...data, newOwnerAge: Number(data.newOwnerAge) } },
      {
        onSuccess: (res) => {
          toast.success("Ownership transferred successfully!");
          setMinedBlock({ hash: res.block.hash, index: res.block.index });
          setCertData({
            ulpin: data.ulpin,
            ownerName: data.newOwnerName,
            area: (propertyData?.latestBlock?.data?.["area"] as string) ?? "",
            landType: (propertyData?.latestBlock?.data?.["landType"] as string) ?? "",
            district: (propertyData?.latestBlock?.data?.["district"] as string) ?? "",
            state: (propertyData?.latestBlock?.data?.["state"] as string) ?? "",
            blockIndex: res.block.index,
            blockHash: res.block.hash,
            previousHash: res.block.previousHash,
            timestamp: new Date().toISOString(),
            transactionType: "transfer",
            fromOwner: data.currentOwner,
          });
          qc.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetActivityQueryKey() });
          qc.invalidateQueries({ queryKey: getGetPropertyQueryKey(data.ulpin) });
        },
        onError: (err: { data?: { message?: string } }) => {
          toast.error(err?.data?.message ?? "Transfer failed.");
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <ArrowRightLeft className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Transfer Ownership</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Transfer land to a new owner — creates an immutable audit trail
        </p>
      </motion.div>

      {/* Success */}
      <AnimatePresence>
        {minedBlock && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400">Transfer Block Mined</p>
              <p className="text-xs text-muted-foreground mt-1">Block #{minedBlock.index} — Transfer recorded on the immutable chain</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-muted-foreground/80">{truncateHash(minedBlock.hash)}</span>
                  <button onClick={() => { navigator.clipboard.writeText(minedBlock.hash); toast.info("Copied"); }}>
                    <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
                {certData && (
                  <button
                    onClick={() => setCertOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-primary/20 border border-primary/30 text-primary text-xs font-semibold rounded-lg hover:bg-primary/30 transition-colors"
                  >
                    <Award className="w-3 h-3" />
                    View Certificate
                  </button>
                )}
              </div>
            </div>
            <button onClick={() => setMinedBlock(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ULPIN lookup */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-card-border rounded-xl p-5"
      >
        <h2 className="text-sm font-semibold mb-3">Look Up Property</h2>
        <div className="flex gap-3">
          <input
            value={ulpinSearch}
            onChange={(e) => setUlpinSearch(e.target.value)}
            placeholder="Enter 14-digit ULPIN..."
            maxLength={14}
            className="flex-1 bg-input/30 border border-border rounded-lg px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleLookup}
            className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Lookup
          </button>
        </div>
        {propertyData?.success && propertyData.currentOwner && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <User className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">Current Owner: </span>
              <span className="font-semibold text-foreground">{propertyData.currentOwner}</span>
            </div>
          </motion.div>
        )}
        {propertyData && !propertyData.success && lookupUlpin && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            Property not found for this ULPIN
          </div>
        )}
      </motion.div>

      {/* Transfer form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-card-border rounded-xl p-6 space-y-5"
      >
        <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">Transfer Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ULPIN" required error={errors.ulpin?.message}>
            <input {...register("ulpin")} readOnly={!!lookupUlpin} placeholder="14-digit ULPIN" className={cn(inputCls(!!errors.ulpin), lookupUlpin ? "opacity-60 cursor-not-allowed" : "")} />
          </Field>
          <Field label="Current Owner" required error={errors.currentOwner?.message}>
            <input {...register("currentOwner")} placeholder="Exact name as registered" className={inputCls(!!errors.currentOwner)} />
          </Field>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">New Owner Details</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="New Owner Name" required error={errors.newOwnerName?.message}>
                <input {...register("newOwnerName")} placeholder="Full legal name" className={inputCls(!!errors.newOwnerName)} />
              </Field>
              <Field label="New Owner Age" required error={errors.newOwnerAge?.message}>
                <input {...register("newOwnerAge")} type="number" placeholder="Age" className={inputCls(!!errors.newOwnerAge)} />
              </Field>
            </div>
            <Field label="New Owner Address" required error={errors.newOwnerAddress?.message}>
              <textarea {...register("newOwnerAddress")} placeholder="Full address" rows={2} className={cn(inputCls(!!errors.newOwnerAddress), "resize-none")} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Transfer Reason" required error={errors.transferReason?.message}>
                <select {...register("transferReason")} className={inputCls(!!errors.transferReason)}>
                  <option value="">Select reason</option>
                  {TRANSFER_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="New Owner Aadhaar Last 4" sublabel="KYC sim" error={errors.aadhaarLast4?.message}>
                <input {...register("aadhaarLast4")} placeholder="XXXX" maxLength={4} className={inputCls(!!errors.aadhaarLast4)} />
              </Field>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing Transfer...</>
          ) : (
            <><Blocks className="w-4 h-4" /> Confirm Transfer &amp; Mine Block</>
          )}
        </button>
      </motion.form>

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

function inputCls(hasError: boolean) {
  return cn("w-full bg-input/30 border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all",
    hasError ? "border-destructive" : "border-border"
  );
}

function Field({ label, sublabel, required, error, children }: { label: string; sublabel?: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
