import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useRegisterProperty,
  useCheckUlpin,
  getGetStatsQueryKey,
  getGetActivityQueryKey,
} from "@workspace/api-client-react";
import { FilePlus, CheckCircle, AlertTriangle, Loader2, Blocks, Copy, Award } from "lucide-react";
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

const LAND_TYPES = ["Agricultural","Residential","Commercial","Industrial","Forest","Barren","Wetland"];

const schema = z.object({
  ownerName: z.string().min(2, "Name must be at least 2 characters"),
  ownerAge: z.coerce.number().int().min(18).max(120),
  ownerAddress: z.string().min(5, "Address too short"),
  ulpin: z.string().length(14, "ULPIN must be exactly 14 digits").regex(/^\d{14}$/, "ULPIN must be numeric"),
  area: z.string().min(1, "Area is required"),
  landType: z.string().min(1, "Land type is required"),
  district: z.string().min(2, "District is required"),
  state: z.string().min(1, "State is required"),
  aadhaarLast4: z.string().length(4).regex(/^\d{4}$/, "Must be 4 digits").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const qc = useQueryClient();
  const mutation = useRegisterProperty();
  const [minedBlock, setMinedBlock] = useState<{ hash: string; index: number } | null>(null);
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [ulpinQuery, setUlpinQuery] = useState("");
  const [debouncedUlpin, setDebouncedUlpin] = useState("");

  const { data: ulpinCheck } = useCheckUlpin(debouncedUlpin, {
    query: { enabled: debouncedUlpin.length === 14 },
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUlpin(ulpinQuery), 500);
    return () => clearTimeout(t);
  }, [ulpinQuery]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    mutation.mutate(
      { data: { ...data, ownerAge: Number(data.ownerAge) } },
      {
        onSuccess: (res) => {
          toast.success("Land block mined successfully!");
          setMinedBlock({ hash: res.block.hash, index: res.block.index });
          setCertData({
            ulpin: data.ulpin,
            ownerName: data.ownerName,
            area: data.area,
            landType: data.landType,
            district: data.district,
            state: data.state,
            blockIndex: res.block.index,
            blockHash: res.block.hash,
            previousHash: res.block.previousHash,
            timestamp: new Date().toISOString(),
            transactionType: "registration",
          });
          reset();
          setUlpinQuery("");
          qc.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetActivityQueryKey() });
        },
        onError: (err: { data?: { message?: string } }) => {
          toast.error(err?.data?.message ?? "Registration failed. Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <FilePlus className="w-4.5 h-4.5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Register Land Parcel</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Submit a mutation request to record a new land parcel on the blockchain
        </p>
      </motion.div>

      {/* Mined block success */}
      <AnimatePresence>
        {minedBlock && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400">Block Mined Successfully</p>
              <p className="text-xs text-muted-foreground mt-1">
                Block #{minedBlock.index} added to the immutable chain
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-muted-foreground/80">
                    {truncateHash(minedBlock.hash)}
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(minedBlock.hash); toast.info("Hash copied"); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3 h-3" />
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

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-card-border rounded-xl p-6 space-y-6"
      >
        {/* ULPIN */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">
              ULPIN <span className="text-destructive">*</span>
            </label>
            <span className="text-[10px] text-muted-foreground">Unique Land Parcel ID (14 digits)</span>
          </div>
          <div className="relative">
            <input
              {...register("ulpin", {
                onChange: (e) => setUlpinQuery(e.target.value),
              })}
              placeholder="e.g. 09280100012345"
              className={cn(
                "w-full bg-input/30 border rounded-lg px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all",
                errors.ulpin ? "border-destructive" : "border-border",
                ulpinCheck?.exists ? "border-amber-500/60" : ""
              )}
            />
            {debouncedUlpin.length === 14 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {ulpinCheck?.exists ? (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] text-amber-500">Already registered</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">Available</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {errors.ulpin && <p className="text-xs text-destructive mt-1">{errors.ulpin.message}</p>}
        </div>

        <div className="border-t border-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Owner Name" required error={errors.ownerName?.message}>
            <input {...register("ownerName")} placeholder="Full legal name" className={inputCls(!!errors.ownerName)} />
          </Field>
          <Field label="Owner Age" required error={errors.ownerAge?.message}>
            <input {...register("ownerAge")} type="number" placeholder="Age" className={inputCls(!!errors.ownerAge)} />
          </Field>
        </div>

        <Field label="Owner Address" required error={errors.ownerAddress?.message}>
          <textarea {...register("ownerAddress")} placeholder="Full address including district" rows={2} className={cn(inputCls(!!errors.ownerAddress), "resize-none")} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Land Area" required error={errors.area?.message}>
            <input {...register("area")} placeholder="e.g. 0.5 acres or 2000 sq ft" className={inputCls(!!errors.area)} />
          </Field>
          <Field label="Land Type" required error={errors.landType?.message}>
            <select {...register("landType")} className={inputCls(!!errors.landType)}>
              <option value="">Select type</option>
              {LAND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="District" required error={errors.district?.message}>
            <input {...register("district")} placeholder="e.g. Varanasi" className={inputCls(!!errors.district)} />
          </Field>
          <Field label="State" required error={errors.state?.message}>
            <select {...register("state")} className={inputCls(!!errors.state)}>
              <option value="">Select state</option>
              {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Aadhaar Last 4 Digits" sublabel="KYC simulation" error={errors.aadhaarLast4?.message}>
          <input {...register("aadhaarLast4")} placeholder="XXXX" maxLength={4} className={inputCls(!!errors.aadhaarLast4)} />
        </Field>

        <button
          type="submit"
          disabled={mutation.isPending || ulpinCheck?.exists}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Mining Block...
            </>
          ) : (
            <>
              <Blocks className="w-4 h-4" />
              Submit &amp; Mine Block
            </>
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
  return cn(
    "w-full bg-input/30 border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all",
    hasError ? "border-destructive" : "border-border"
  );
}

function Field({
  label,
  sublabel,
  required,
  error,
  children,
}: {
  label: string;
  sublabel?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
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
