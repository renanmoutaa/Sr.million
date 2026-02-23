import os
import json
import urllib.request
from dotenv import load_dotenv
from supabase_rag import SupabaseMemory

def main():
    load_dotenv(override=True)
    api_key = os.environ.get("OPENAI_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print("Missing Supabase credentials")
        return
        
    import sys
    sys.stdout = open('test_search_out.txt', 'w', encoding='utf-8')
    sys.stderr = sys.stdout

    # 1. Count Total Chunks and List Sources
    print("--- 1. VERIFYING UPLOADED FILES IN SUPABASE ---")
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Prefer': 'return=representation'
    }
    
    # We fetch only the metadata to count sources
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/srmilion_docs?select=metadata",
        headers=headers,
        method='GET'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"Total chunks in database: {len(data)}")
            
            sources = {}
            for row in data:
                src = row.get("metadata", {}).get("source", "unknown")
                sources[src] = sources.get(src, 0) + 1
                
            print("\nChunks per file:")
            for src, count in sources.items():
                print(f" - {src}: {count} chunks")
    except Exception as e:
        print(f"Error querying Supabase: {e}")

    # 2. Test RAG Search
    print("\n--- 2. VERIFYING AGENT SEARCH (RAG) ---")
    memory = SupabaseMemory(
        openai_api_key=api_key,
        supabase_url=supabase_url,
        supabase_key=supabase_key
    )
    
    test_queries = [
        "Qual a primeira etapa da Aplicação Técnica?",
        "Como funciona a preparação do Setup Empacotado?",
        "O que envolve a Geração e Gestão de Leads no Marketing?",
        "Qual o tipo de frete para Nutrição Animal Grão?"
    ]
    
    for q in test_queries:
        print(f"\n[Question] {q}")
        context = memory.search(q, top_k=2) # Only getting top 2 for brevity
        if context:
            # Print the first 200 chars to prove it found the text
            print(f"   [Context Found]: {context[:150].replace(chr(10), ' ')}...")
        else:
            print("   [Context Found]: NONE (Failed to search)")

if __name__ == "__main__":
    main()
