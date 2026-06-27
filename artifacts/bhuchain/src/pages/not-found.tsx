import { Link } from "wouter";
import { motion } from "framer-motion";
import { Link2, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-sm"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center mx-auto">
          <Link2 className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-5xl font-bold font-mono text-foreground/20 mb-2">404</h1>
          <p className="text-lg font-semibold text-foreground">Block not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            This page doesn't exist in the BhuChain registry
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
