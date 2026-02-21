"""
Vercel serverless entry point — mounts the FastAPI app from backend/main.py
All requests to /api/* are handled here.
"""
import sys
import os

# Add backend folder to path so we can import main
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app  # noqa: E402 — import after sys.path update
