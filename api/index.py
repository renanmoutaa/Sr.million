"""
Vercel serverless entry point.
Uses lazy imports to avoid crashing Vercel on module load.
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Guard all imports so any missing dep shows a useful 500 message instead of a silent crash
try:
    from main import app
except Exception as _boot_err:
    # If main.py fails to import, create a minimal emergency app that reports the error
    from fastapi import FastAPI
    app = FastAPI()

    @app.get("/health")
    def health():
        return {"status": "boot_error", "error": str(_boot_err)}

    @app.post("/chat")
    def chat_err():
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Backend failed to start: {_boot_err}")
