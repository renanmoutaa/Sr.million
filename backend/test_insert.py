import os
from dotenv import load_dotenv
from supabase_rag import SupabaseMemory

load_dotenv(override=True)
api_key = os.environ.get("OPENAI_API_KEY")
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

memory = SupabaseMemory(
    openai_api_key=api_key,
    supabase_url=supabase_url,
    supabase_key=supabase_key
)

print("Attempting to ingest 1 dummy chunk...")
memory.ingest("This is a test chunk to verify Supabase insertion.", "test_manual")
