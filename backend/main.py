from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import uvicorn
import os
import json
import base64
import asyncio
from pathlib import Path
from typing import List, Optional, Any
from dotenv import load_dotenv

import time

# --- Simple Memory Session ---
SESSION_TIMEOUT_SECONDS = 60
last_interaction_time = 0
chat_history = []
# -----------------------------

from openai import OpenAI
from elevenlabs.client import ElevenLabs
import jwt
from datetime import datetime, timedelta

load_dotenv(override=True)

# Configuration Paths
DATA_DIR = Path('data')
DATA_DIR.mkdir(exist_ok=True)
SETTINGS_FILE = DATA_DIR / 'settings.json'
SECRET_KEY = "sr-million-secret-key" # In production, use env variable
ALGORITHM = "HS256"

def load_settings():
    # File-based defaults (works for local dev)
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, 'r') as f:
            base = json.load(f)
    else:
        base = {
            "openai_api_key": "",
            "elevenlabs_api_key": "",
            "elevenlabs_voice_id": "Daniel",
            "avatar_url": "/sr.million.glb",
            "system_prompt": "Você é um assistente de IA corporativo.",
            "admin_password": "admin",
            "openai_model": "gpt-4o-mini",
        }
    # Environment variables override file values (used in Vercel/production)
    env_map = {
        "OPENAI_API_KEY":        "openai_api_key",
        "ELEVENLABS_API_KEY":    "elevenlabs_api_key",
        "ELEVENLABS_VOICE_ID":   "elevenlabs_voice_id",
        "OPENAI_MODEL":          "openai_model",
        "ADMIN_PASSWORD":        "admin_password",
        "JWT_SECRET":            "jwt_secret",
        "SYSTEM_PROMPT":         "system_prompt",
        "AVATAR_URL":            "avatar_url",
        "SUPABASE_URL":          "supabase_url",
        "SUPABASE_KEY":          "supabase_key",
    }
    for env_key, setting_key in env_map.items():
        value = os.environ.get(env_key)
        if value:
            base[setting_key] = value
    return base


def save_settings(settings):
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=2)

# Global State
settings = load_settings()
app = FastAPI(title="Corporate 3D Agent API")
security = HTTPBearer()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Helpers
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
    try:
        payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class LoginRequest(BaseModel):
    password: str

class ChatRequest(BaseModel):
    message: str

class DisplayCard(BaseModel):
    type: str  # 'highlight' | 'step' | 'info' | 'warning'
    content: str

class ChatResponse(BaseModel):
    response: str
    audio_content: Optional[str] = None
    display_cards: Optional[list] = None

# API Endpoints
@app.post("/login")
async def login(req: LoginRequest):
    current_settings = load_settings()
    if req.password == current_settings.get("admin_password"):
        token = create_access_token({"sub": "admin"})
        return {"access_token": token}
    raise HTTPException(status_code=401, detail="Incorrect password")

@app.get("/settings_public")
async def get_settings_public():
    s = load_settings()
    # Filter sensitive data
    return {
        "avatar_url": s.get("avatar_url"),
        "system_prompt": s.get("system_prompt"), # Needed for client if doing stuff there, or just placeholder
        "elevenlabs_voice_id": s.get("elevenlabs_voice_id")
    }

@app.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    return load_settings()

@app.post("/settings")
async def update_settings(new_settings: dict, user=Depends(get_current_user)):
    current = load_settings()
    current.update(new_settings)
    save_settings(current)
    # Refresh Global State if needed or reload in endpoint
    return {"status": "success"}

try:
    from supabase_rag import SupabaseMemory
    HAS_MEMORY = True
except ImportError:
    HAS_MEMORY = False
    SupabaseMemory = None

# Add after load_settings
memory = None

def init_memory():
    global memory
    if not HAS_MEMORY:
        print("RAG memory not available (sentence-transformers not installed).")
        return
    s = load_settings()
    api_key = s.get("openai_api_key")
    supabase_url = s.get("supabase_url")
    supabase_key = s.get("supabase_key")
    if api_key and supabase_url and supabase_key:
        try:
           memory = SupabaseMemory(
               openai_api_key=api_key,
               supabase_url=supabase_url,
               supabase_key=supabase_key
           )
           print("Supabase Memory initialized.")
        except Exception as e:
           print(f"Memory init failed: {e}")


# Call init on startup
init_memory()

# Models
class IngestRequest(BaseModel):
    text: str
    source: str = "manual"

# Endpoints
@app.post("/ingest_text")
async def ingest_text(req: IngestRequest, user=Depends(get_current_user)):
    if not memory:
        init_memory()
    if not memory:
        raise HTTPException(status_code=500, detail="Memory not initialized (Check API Key)")
    
    try:
        memory.ingest(req.text, req.source)
        return {"status": "success", "message": f"Ingested text from {req.source}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    current_settings = load_settings()
    api_key = current_settings.get("openai_api_key")
    eleven_key = current_settings.get("elevenlabs_api_key")
    voice_id = current_settings.get("elevenlabs_voice_id", "Daniel")
    prompt = current_settings.get("system_prompt")
    model = current_settings.get("openai_model", "gpt-4o-mini")

    if not api_key:
        return ChatResponse(response="[MOCK] Configure sua API Key na Dashboard.")

    # Memory Retrieval
    context = ""
    if memory:
        try:
            context = memory.search(request.message)
            print(f"Retrieved Context: {context[:200]}...")
        except Exception as e:
            print(f"Memory search error: {e}")
            
    # Build the base system prompt with context substitution
    if "{context}" in prompt:
        base_prompt = prompt.replace("{context}", context or "Nenhum contexto relevante encontrado.").replace("{question}", request.message)
    else:
        if context:
            prompt = f"{prompt}\n\nLembre-se destas informações do manual:\n{context}"
        base_prompt = prompt

    structured_instruction = """

ALÉM DA SUA RESPOSTA NORMAL, você DEVE retornar um JSON estruturado com o seguinte formato (e NADA MAIS fora do JSON):
{
  "speech": "<texto fluido para ser falado em voz alta, SEM markdown>",
  "cards": [
    {"type": "highlight", "content": "<A ideia central>"},
    {"type": "info", "content": "<Conceito 1>"},
    {"type": "step", "content": "<Ação 1>"}
  ]
}
Regras MÁXIMAS e INQUEBRÁVEIS para os cards:
1. SINCRONIA TOTAL: TUDO que estiver nos cards DEVE obrigatoriamente ter sido dito (ou resumido) na sua chave "speech".
2. PROIBIÇÃO: É estritamente proibido colocar em um card uma etapa ou informação que você não explicou em voz alta no "speech". 
3. RESUMO: Os cards servem apenas como apoio visual para o que você está falando naquele momento.
4. Use "highlight" para a abertura ou contexto da resposta.
5. Use "step" APENAS se estiver explicando um Fluxo com ordem cronológica real (Ex: Como fazer Setup).
6. Use "info" para listar características, conceitos, prazos ou regras soltas (Ex: O que é CIF? Quais as formas de pagamento?).
7. O campo "speech" deve ser EXATAMENTE o texto a ser narrado, como se você fosse um professor amigável ensinando um colega (máximo 85 palavras).
8. Os textos do campo "content" nos cards devem ser MUITO curtos e diretos (máximo 10 palavras)."""

    # ======= SIMPLE MEMORY INJECTION =======
    global last_interaction_time, chat_history
    import time
    current_time = time.time()
    
    if current_time - last_interaction_time > SESSION_TIMEOUT_SECONDS:
        print("Session expired (>60s). Clearing memory.")
        chat_history = []
        
    last_interaction_time = current_time
    # =======================================

    messages = [
        {"role": "system", "content": base_prompt + structured_instruction}
    ]
    
    # Add history
    for msg in chat_history:
        messages.append(msg)
        
    # Add current message
    messages.append({"role": "user", "content": request.message})

    try:
        client = OpenAI(api_key=api_key)
        completion = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model=model if model else "gpt-4o-mini",
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=600,
                temperature=0.5,
            )
        )
        raw = completion.choices[0].message.content

        # Parse structured response
        import json as _json
        try:
            parsed = _json.loads(raw)
            speech_text = parsed.get("speech", raw)
            display_cards = parsed.get("cards", [])
        except Exception:
            speech_text = raw
            display_cards = [{"type": "highlight", "content": raw[:120]}]

        answer = speech_text
        
        # Save to memory (Cap at 10 messages / 5 pairs to avoid token bloat)
        chat_history.append({"role": "user", "content": request.message})
        chat_history.append({"role": "assistant", "content": answer})
        if len(chat_history) > 10:
            chat_history = chat_history[-10:]

        audio_base64 = None
        if eleven_key:
            try:
                def _tts():
                    eleven = ElevenLabs(api_key=eleven_key)
                    audio_gen = eleven.text_to_speech.convert(
                        voice_id=voice_id,
                        text=answer,
                        model_id="eleven_flash_v2_5"
                    )
                    return b"".join(audio_gen)

                audio_bytes = await asyncio.get_event_loop().run_in_executor(None, _tts)
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            except Exception as e:
                print(f"TTS Error: {e}")

        return ChatResponse(response=answer, audio_content=audio_base64, display_cards=display_cards)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    init_memory() # Ensure init main process
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
