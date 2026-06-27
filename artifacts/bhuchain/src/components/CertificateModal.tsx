import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Download, X, Loader2, Award } from "lucide-react";
import Certificate, { type CertificateData } from "./Certificate";

interface Props {
  data: CertificateData;
  open: boolean;
  onClose: () => void;
}

export default function CertificateModal({ data, open, onClose }: Props) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(certRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0d1117",
      });
      const link = document.createElement("a");
      link.download = `bhuchain-cert-${data.ulpin}-block${data.blockIndex}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Certificate downloaded!");
    } catch {
      toast.error("Download failed. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
          >
            <div
              className="bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto w-full"
              style={{ maxWidth: 900 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <Award className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Blockchain Certificate</p>
                    <p className="text-[11px] text-muted-foreground">
                      ULPIN {data.ulpin} · Block #{data.blockIndex}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {downloading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> Download PNG</>
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Certificate preview */}
              <div className="p-4 overflow-auto max-h-[80vh] bg-black/30 flex items-center justify-center">
                <div
                  className="rounded-xl overflow-hidden shadow-xl"
                  style={{ transform: "scale(0.92)", transformOrigin: "top center" }}
                >
                  <Certificate ref={certRef} data={data} />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
