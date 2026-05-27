import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, CheckCircle, Link as LinkIcon, FileText } from "lucide-react";

export type TxResult = { hash: string; error?: never } | { hash?: never; error: string };

export function TransactionResult({ result, tab, lotId, CARDANOSCAN }: { result: TxResult | null, tab: string, lotId: string, CARDANOSCAN: string }) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`mt-8 p-6 rounded-3xl border overflow-hidden backdrop-blur-xl ${
            result.error
              ? "bg-red-500/10 border-red-500/30"
              : "bg-emerald-500/10 border-emerald-500/30"
          }`}
        >
          {result.error ? (
            <div>
              <p className="font-bold text-red-400 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Transaction Failed</p>
              <p className="font-mono text-sm mt-3 text-red-300 break-all bg-red-950/50 p-4 rounded-xl border border-red-500/20">{result.error}</p>
            </div>
          ) : (
            <div>
              <p className="font-bold text-emerald-400 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Transaction Successfully Submitted</p>
              <a
                href={`${CARDANOSCAN}/transaction/${result.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-mono mt-4 text-emerald-300 hover:text-emerald-100 transition bg-emerald-900/30 p-3 rounded-xl border border-emerald-500/20 break-all"
              >
                {result.hash} <LinkIcon className="w-4 h-4" />
              </a>
              {tab === "mint" && lotId && <ConsumerLink lotId={lotId} />}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConsumerLink({ lotId }: { lotId: string }) {
  const url = typeof window !== "undefined"
      ? `${window.location.origin}/lot/${encodeURIComponent(lotId)}?mock=true`
      : `/lot/${encodeURIComponent(lotId)}?mock=true`;
      
  return (
    <div className="mt-6 pt-6 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div className="bg-white p-3 rounded-2xl shadow-xl flex-shrink-0">
        <QRCodeSVG value={url} size={110} />
      </div>
      <div className="text-stone-300 space-y-2 text-center sm:text-left">
        <p className="font-bold text-white text-lg flex items-center justify-center sm:justify-start gap-2">
          <FileText className="w-5 h-5 text-amber-500" /> Consumer Passport Ready
        </p>
        <p className="text-sm">The passport has been minted. You can now view the public page.</p>
        <a
          href={`/lot/${encodeURIComponent(lotId)}?mock=true`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 font-mono text-xs text-emerald-400 hover:text-emerald-300 hover:underline break-all bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-500/20"
        >
          /lot/{lotId}
        </a>
      </div>
    </div>
  );
}
