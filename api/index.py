"""
Vercel serverless entry point.
@vercel/python runtime sends the FULL path (e.g. /api/chat) to this file.
We mount the backend app under /api so FastAPI strips that prefix and
routes /api/chat → backend's /chat endpoint.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from fastapi import FastAPI
    from main import app as backend_app

    app = FastAPI()
    app.mount("/api", backend_app)

except Exception as _boot_err:
    from fastapi import FastAPI, HTTPException
    app = FastAPI()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def catch_all(path: str):
        raise HTTPException(status_code=503, detail=f"Boot error: {_boot_err}")
