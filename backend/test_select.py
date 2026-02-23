import os
import urllib.request
from dotenv import load_dotenv

load_dotenv(override=True)
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

headers = {
    'apikey': supabase_key,
    'Authorization': f'Bearer {supabase_key}',
    'Prefer': 'count=exact'
}

req = urllib.request.Request(
    f"{supabase_url}/rest/v1/srmilion_docs?select=*",
    headers=headers,
    method='HEAD'
)

with urllib.request.urlopen(req) as response:
    print(f"Status: {response.status}")
    print(f"Count Header: {response.headers.get('Content-Range')}")
