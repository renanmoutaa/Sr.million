import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { cn } from "../../../lib/utils";

export type WorkflowStep = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "current" | "completed";
};

interface WorkflowVisualizerProps {
  steps: WorkflowStep[];
  className?: string;
}

export function WorkflowVisualizer({ steps, className }: WorkflowVisualizerProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={cn("w-full max-w-md mx-auto p-4 rounded-xl backdrop-blur-md bg-black/40 border border-white/10", className)}>
      <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-semibold mb-4 border-b border-white/10 pb-2">
        Protocolo de Execução
      </h3>
      <div className="space-y-4 relative">
        {/* Connecting Line */}
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-white/10 -z-10" />

        <AnimatePresence>
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-start gap-4 p-3 rounded-lg transition-colors duration-500",
                step.status === "current" ? "bg-cyan-500/10 border border-cyan-500/30" : "opacity-60"
              )}
            >
              <div className="mt-1 relative z-10 bg-black rounded-full">
                {step.status === "completed" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : step.status === "current" ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Circle className="w-6 h-6 text-cyan-400 fill-cyan-400/20" />
                  </motion.div>
                ) : (
                  <Circle className="w-6 h-6 text-gray-600" />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className={cn(
                  "font-medium text-sm transition-colors",
                  step.status === "current" ? "text-cyan-100" : "text-gray-400"
                )}>
                  {step.label}
                </h4>
                {step.status === "current" && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-xs text-cyan-200/70 mt-1 leading-relaxed"
                  >
                    {step.description}
                  </motion.p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
