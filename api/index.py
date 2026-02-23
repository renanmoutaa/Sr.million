"""
Vercel serverless entry point — mounts the FastAPI app from backend/main.py
All requests to /api/* are handled here.
"""
from fastapi import FastAPI
import sys
import os

# Add backend folder to path so we can import main
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app as backend_app

# Create a top-level Vercel app and mount the backend to /api
app = FastAPI()
app.mount("/api", backend_app)
