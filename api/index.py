"""
Vercel serverless entry point for the FastAPI backend.
Vercel routes /api/* here with the full path preserved (e.g. /api/chat).
We mount the backend app at /api so /api/chat → backend's /chat.
"""
import sys
import os

# Add backend folder to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi import FastAPI
from main import app as backend_app

# Top-level Vercel ASGI app — mounts backend under /api prefix
# Vercel sends us /api/chat → backend sees /chat (prefix is stripped by mount)
app = FastAPI()
app.mount("/api", backend_app)
