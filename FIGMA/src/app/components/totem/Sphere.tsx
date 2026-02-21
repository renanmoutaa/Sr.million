import { motion } from "motion/react";

export function Sphere({ state }: { state: "idle" | "listening" | "processing" | "speaking" }) {
  // Variations for the sphere based on state
  const variants = {
    idle: {
      scale: [1, 1.05, 1],
      rotate: [0, 360],
      opacity: 0.8,
      transition: {
        scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 20, repeat: Infinity, ease: "linear" },
      },
    },
    listening: {
      scale: [1, 1.2, 1],
      opacity: 1,
      filter: "brightness(1.5)",
      transition: {
        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
      },
    },
    processing: {
      scale: [0.9, 1.1, 0.9],
      rotate: [0, -360],
      transition: {
        scale: { duration: 0.5, repeat: Infinity },
        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
      },
    },
    speaking: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96">
      {/* Core Sphere */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-cyan-500/30 bg-cyan-900/10 backdrop-blur-sm"
        animate={state}
        variants={variants}
        style={{ boxShadow: "0 0 40px rgba(8, 145, 178, 0.2)" }}
      />
      
      {/* Inner Rings - Arrival Style "Ink" feel using irregular rotation */}
      <motion.div
        className="absolute w-[80%] h-[80%] rounded-full border border-cyan-400/20"
        animate={{ rotate: [0, 360], scale: [0.9, 1, 0.9] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[60%] h-[60%] rounded-full border-t-2 border-r-2 border-cyan-300/40"
        animate={{ rotate: [360, 0], scale: [1, 0.9, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[40%] h-[40%] rounded-full border-b-4 border-l-2 border-white/10 bg-cyan-500/5"
        animate={{ rotate: [0, 180, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Particles/Mist Effect (Simplified with blurred elements) */}
      <motion.div
        className="absolute w-full h-full rounded-full bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-cyan-500/20 via-transparent to-transparent blur-xl"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </div>
  );
}
