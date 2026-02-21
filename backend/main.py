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
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs
import jwt
from datetime import datetime, timedelta

# Configuration Paths
DATA_DIR = Path('data')
DATA_DIR.mkdir(exist_ok=True)
SETTINGS_FILE = DATA_DIR / 'settings.json'
SECRET_KEY = "sr-million-secret-key" # In production, use env variable
ALGORITHM = "HS256"

def load_settings():
    if not SETTINGS_FILE.exists():
        return {
            "openai_api_key": "",
            "elevenlabs_api_key": "",
            "elevenlabs_voice_id": "Daniel",
            "avatar_url": "https://models.readyplayer.me/69961da73781699417e09098.glb",
            "system_prompt": "Você é um assistente de IA corporativo realista.",
            "admin_password": "admin"
        }
    with open(SETTINGS_FILE, 'r') as f:
        return json.load(f)

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

from memory_rag import LightMemory

# Add after load_settings
memory = None

def init_memory():
    global memory
    s = load_settings()
    api_key = s.get("openai_api_key")
    if api_key:
        try:
           memory = LightMemory(openai_api_key=api_key)
           print("Memory initialized.")
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

    # Add instruction to return structured visual cards
    structured_instruction = """

ALÉM DA SUA RESPOSTA NORMAL, você DEVE retornar um JSON estruturado com o seguinte formato (e NADA MAIS fora do JSON):
{
  "speech": "<texto fluido para ser falado em voz alta, SEM markdown>",
  "cards": [
    {"type": "highlight", "content": "<frase principal de destaque>"},
    {"type": "step", "content": "<etapa ou ação específica do processo>"},
    {"type": "info", "content": "<informação complementar ou detalhe importante>"},
    {"type": "warning", "content": "<alerta ou cuidado especial>"}
  ]
}
Regras para os cards:
- Use "highlight" para a ideia central da resposta (1 por resposta)
- Use "step" para cada etapa de um processo ou fluxo (1 card por etapa)
- Use "info" para detalhes ou observações importantes
- Use "warning" apenas se houver alertas
- Mínimo 1 card, máximo 12 cards — se o processo tiver 8 etapas, crie 8 cards "step"
- O campo "speech" deve ser EXATAMENTE o texto a ser narrado em voz alta — conciso, máximo 80 palavras
- OBRIGATÓRIO: termine o campo "speech" com um gancho curto e natural, por exemplo: 'Ficou com dúvida em alguma etapa?' ou 'Quer detalhes sobre algum passo específico?' ou 'Posso aprofundar algum desses pontos para você.'
- Cards devem ser concisos (máximo 12 palavras cada)"""

    messages = [
        {"role": "system", "content": base_prompt + structured_instruction},
        {"role": "user", "content": request.message}
    ]

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
