import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, ArrowRight, MapPin, HelpCircle, CheckCircle } from "lucide-react";
import { Sphere } from "../components/totem/Sphere";
import { WorkflowVisualizer, WorkflowStep } from "../components/totem/WorkflowVisualizer";
import { cn } from "../../lib/utils";

type ConversationState = "idle" | "listening" | "processing" | "answering";

interface Workflow {
  id: string;
  title: string;
  steps: WorkflowStep[];
}

const SAMPLE_WORKFLOWS: Record<string, Workflow> = {
  checkin: {
    id: "checkin",
    title: "Check-in de Voo",
    steps: [
      { id: "1", label: "Escanear Bilhete", description: "Coloque seu código QR no scanner abaixo.", status: "pending" },
      { id: "2", label: "Verificar Identidade", description: "Olhe para a câmera para verificação facial.", status: "pending" },
      { id: "3", label: "Imprimir Etiqueta", description: "Pegue sua etiqueta e prenda na bagagem.", status: "pending" },
      { id: "4", label: "Ir para o Portão", description: "Siga para o Portão B12 para a segurança.", status: "pending" },
    ],
  },
  directions: {
    id: "directions",
    title: "Navegação: Praça de Alimentação",
    steps: [
      { id: "1", label: "Localização Atual", description: "Você está na Entrada do Terminal 2.", status: "pending" },
      { id: "2", label: "Siga em Frente", description: "Ande 50 metros passando o Duty Free.", status: "pending" },
      { id: "3", label: "Vire à Direita", description: "Vire à direita no Starbucks.", status: "pending" },
      { id: "4", label: "Destino", description: "A Praça de Alimentação está à sua esquerda.", status: "pending" },
    ],
  },
  help: {
    id: "help",
    title: "Protocolo de Assistência",
    steps: [
      { id: "1", label: "Analisando Solicitação", description: "Entendendo seu pedido...", status: "pending" },
      { id: "2", label: "Conectando ao Suporte", description: "Encaminhando para agente humano...", status: "pending" },
      { id: "3", label: "Agente Atribuído", description: "Agente Sarah está entrando na chamada.", status: "pending" },
    ],
  },
};

export function TotemPage() {
  const [state, setState] = useState<ConversationState>("idle");
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [conversationContext, setConversationContext] = useState<string>("");

  // Simulate workflow progression
  useEffect(() => {
    if (state === "answering" && activeWorkflow) {
      const interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < activeWorkflow.steps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setTimeout(() => setState("idle"), 3000); // Reset after completion
            return prev;
          }
        });
      }, 2500); // 2.5 seconds per step
      return () => clearInterval(interval);
    }
  }, [state, activeWorkflow]);

  const handleStartListening = () => {
    if (state !== "idle") return;
    setState("listening");
    setConversationContext("Ouvindo...");
    setActiveWorkflow(null);
    setCurrentStepIndex(0);

    // Simulate processing delay
    setTimeout(() => {
      setState("processing");
      setConversationContext("Processando solicitação...");
      
      // Randomly pick a workflow for demo
      setTimeout(() => {
        const keys = Object.keys(SAMPLE_WORKFLOWS);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const workflow = SAMPLE_WORKFLOWS[randomKey];
        
        setActiveWorkflow(workflow);
        setConversationContext(`Contexto: Usuário perguntou sobre "${workflow.title}"`);
        setState("answering");
      }, 1500);
    }, 2000);
  };

  const handleQuickAction = (key: string) => {
    if (state !== "idle") return;
    setState("processing");
    setConversationContext(`Contexto: Ação rápida "${SAMPLE_WORKFLOWS[key].title}" selecionada`);
    
    setTimeout(() => {
      setActiveWorkflow(SAMPLE_WORKFLOWS[key]);
      setCurrentStepIndex(0);
      setState("answering");
    }, 1000);
  };

  // Compute steps with current status
  const currentSteps = activeWorkflow?.steps.map((step, index) => ({
    ...step,
    status: index < currentStepIndex ? "completed" : index === currentStepIndex ? "current" : "pending",
  })) as WorkflowStep[] | undefined;

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-slate-900 via-black to-black -z-20" />
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-cyan-900/10 to-transparent -z-10" />

      {/* Header / Status */}
      <header className="absolute top-8 left-8 right-8 flex justify-between items-start z-20">
        <div>
          <h1 className="text-sm font-light tracking-[0.3em] text-cyan-500 uppercase opacity-80">
            Sistema Online
          </h1>
          <p className="text-xs text-slate-500 mt-1">v2.4.1 • Conectado</p>
        </div>
        
        {/* Context Display - Minimalist */}
        <AnimatePresence>
          {conversationContext && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-xs text-right"
            >
              <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 inline-block">
                <span className="text-xs text-cyan-400 uppercase tracking-wider block mb-1">Contexto Atual</span>
                <p className="text-sm text-slate-300 font-light">{conversationContext}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
        
        {/* The Sphere - Moves based on state */}
        <motion.div
          animate={{
            y: state === "answering" ? -100 : 0, // Move up when answering
            scale: state === "answering" ? 0.8 : 1,
          }}
          transition={{ type: "spring", stiffness: 50 }}
          className="relative z-0"
        >
          <Sphere state={state === "listening" ? "listening" : state === "processing" ? "processing" : state === "answering" ? "speaking" : "idle"} />
        </motion.div>

        {/* Workflow Visualization Overlay */}
        <AnimatePresence>
          {state === "answering" && currentSteps && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-0 right-0 flex justify-center px-4"
            >
              <WorkflowVisualizer steps={currentSteps} className="w-full max-w-lg shadow-2xl shadow-cyan-900/20" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interaction Zone (Mic & Quick Actions) */}
        <motion.div
          animate={{
            opacity: state === "answering" ? 0 : 1, // Fade out controls when answering
            y: state === "answering" ? 50 : 0,
            pointerEvents: state === "answering" ? "none" : "auto",
          }}
          className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-8"
        >
          {/* Quick Actions */}
          <div className="flex gap-4">
            <QuickActionButton 
              icon={<ArrowRight className="w-4 h-4" />} 
              label="Check-In" 
              onClick={() => handleQuickAction("checkin")} 
            />
            <QuickActionButton 
              icon={<MapPin className="w-4 h-4" />} 
              label="Direções" 
              onClick={() => handleQuickAction("directions")} 
            />
            <QuickActionButton 
              icon={<HelpCircle className="w-4 h-4" />} 
              label="Ajuda" 
              onClick={() => handleQuickAction("help")} 
            />
          </div>

          {/* Microphone Button */}
          <button
            onClick={handleStartListening}
            className={cn(
              "relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300",
              state === "listening" 
                ? "bg-red-500/20 text-red-400 shadow-[0_0_40px_rgba(239,68,68,0.4)]" 
                : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:scale-110 shadow-[0_0_20px_rgba(8,145,178,0.2)]"
            )}
          >
            {/* Ripple Effect Ring */}
            <div className={cn(
              "absolute inset-0 rounded-full border border-current opacity-30 scale-110",
              state === "listening" ? "animate-ping" : "group-hover:scale-125 transition-transform duration-500"
            )} />
            
            <Mic className={cn("w-8 h-8", state === "listening" && "animate-pulse")} />
          </button>
          
          <p className="text-xs text-slate-500 tracking-widest uppercase">
            {state === "listening" ? "Ouvindo..." : "Toque para Falar"}
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all text-sm text-slate-300 hover:text-cyan-300"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
