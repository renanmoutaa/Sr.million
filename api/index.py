"""
Vercel serverless entry point — exposes the FastAPI app from backend/main.py
All requests to /api/* are routed here, with /api prefix already stripped by Vercel.
"""
import sys
import os

# Add backend folder to Python path so we can import main
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app  # This IS the app Vercel will call
