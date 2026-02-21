import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useNavigate } from 'react-router-dom';
import { Settings, User, MessageSquare, Monitor, Save, LogOut } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '/api');

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('settings');
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { token, logout } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConfig(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post(`${API_BASE}/settings`, config, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Configurações salvas!');
        } catch (err) {
            alert('Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-2xl font-bold">Carregando Painel...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Monitor size={20} className="text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white italic">Admin Panel</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <TabButton
                        active={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                        icon={<Settings size={20} />}
                        label="Configurações Gerdas"
                    />
                    <TabButton
                        active={activeTab === 'personality'}
                        onClick={() => setActiveTab('personality')}
                        icon={<MessageSquare size={20} />}
                        label="Personalidade de IA"
                    />
                    <TabButton
                        active={activeTab === 'appearance'}
                        onClick={() => setActiveTab('appearance')}
                        icon={<User size={20} />}
                        label="Editor de Avatar"
                    />
                </nav>

                <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all w-full text-left"
                    >
                        <Monitor size={20} /> Ir para o Totem
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all w-full text-left font-medium"
                    >
                        <LogOut size={20} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-20 bg-slate-900/50 border-b border-slate-900 px-8 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                    <h2 className="text-xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <Save size={20} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </header>

                <div className="p-8 max-w-4xl w-full mx-auto overflow-y-auto">
                    {activeTab === 'settings' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SectionCard title="Chaves de API">
                                <InputGroup
                                    label="OpenAI API Key"
                                    value={config.openai_api_key}
                                    onChange={(v: string) => setConfig({ ...config, openai_api_key: v })}
                                    type="password"
                                />
                                <InputGroup
                                    label="ElevenLabs API Key"
                                    value={config.eleven_api_key}
                                    onChange={(v: string) => setConfig({ ...config, eleven_api_key: v })}
                                    type="password"
                                />
                            </SectionCard>

                            <SectionCard title="Voz e Áudio">
                                <InputGroup
                                    label="ID da Voz (ElevenLabs)"
                                    value={config.elevenlabs_voice_id}
                                    onChange={(v: string) => setConfig({ ...config, elevenlabs_voice_id: v })}
                                    placeholder="Ex: CstacWqMhJQlnfLPxRG4"
                                />
                                <p className="text-xs text-slate-500 mt-2 italic px-1">Você pode encontrar este ID no painel da ElevenLabs em 'Voices'.</p>
                            </SectionCard>
                        </div>
                    )}

                    {activeTab === 'personality' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SectionCard title="Comportamento da IA">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-3">Prompt de Sistema (O cérebro do Agente)</label>
                                    <textarea
                                        value={config.system_prompt}
                                        onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                                        className="w-full h-64 bg-slate-900 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                        placeholder="Ex: Você é um recepcionista bilingue que fala sobre..."
                                    />
                                    <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3 text-sm text-blue-400">
                                        <MessageSquare size={20} className="shrink-0" />
                                        <p>Defina aqui as regras de como o avatar deve responder. Seja específico sobre o tom de voz e o conhecimento dele.</p>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                            <SectionCard title="Criação Local (Morph Targets)">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <p className="text-sm text-slate-400">Ajuste as características do seu avatar em tempo real sem precisar de API externa.</p>

                                        <MorphSlider label="Sorriso" name="mouthSmile" />
                                        <MorphSlider label="Frustração" name="mouthFrown" />
                                        <MorphSlider label="Bochechas" name="cheekPuff" />
                                        <MorphSlider label="Puxar Lábios" name="mouthPucker" />
                                        <MorphSlider label="Espantado" name="jawOpen" />
                                        <MorphSlider label="Sobrancelhas" name="browInnerUp" />
                                    </div>

                                    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 flex items-center justify-center min-h-[300px] relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent"></div>
                                        <User size={80} className="text-slate-800" />
                                        <p className="absolute bottom-4 text-xs text-slate-500 font-mono tracking-widest uppercase">Visualizador Local</p>
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard title="Configurações Técnicas">
                                <InputGroup
                                    label="URL do Modelo (GLB)"
                                    value={config.avatar_url}
                                    onChange={(v: string) => setConfig({ ...config, avatar_url: v })}
                                />
                            </SectionCard>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// UI Components
const MorphSlider = ({ label, name }: { label: string, name: string }) => {
    const { morphTargets, setMorphTarget } = useChatStore();
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                <span className="text-xs font-mono text-blue-400">{(morphTargets[name] || 0).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={morphTargets[name] || 0}
                onChange={(e) => setMorphTarget(name, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
        <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>{icon}</span>
        <span className="font-medium">{label}</span>
    </button>
);

const SectionCard = ({ title, children }: any) => (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            {title}
        </h3>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const InputGroup = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
    <div>
        <label className="block text-sm font-medium text-slate-400 mb-2 px-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-700 shadow-inner"
        />
    </div>
);

export default Dashboard;
