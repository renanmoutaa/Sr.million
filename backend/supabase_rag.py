import os
import json
import urllib.request
from openai import OpenAI
from typing import List, Dict, Any

class SupabaseMemory:
    def __init__(self, openai_api_key: str, supabase_url: str, supabase_key: str):
        print(f"Initializing SupabaseMemory with Native HTTP. URL: {supabase_url}")
        self.openai_client = OpenAI(api_key=openai_api_key)
        self.supabase_url = supabase_url.rstrip('/')
        self.supabase_key = supabase_key
        print("Supabase headers initialized.")

    def _get_headers(self):
        return {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

    def get_embedding(self, text: str) -> List[float]:
        try:
            response = self.openai_client.embeddings.create(
                input=text,
                model="text-embedding-3-small"
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Embedding error: {e}")
            return []

    def chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        lines = text.split('\n')
        chunks = []
        current_chunk = []
        current_len = 0
        
        for line in lines:
            line = line.strip()
            if not line: continue
            current_chunk.append(line)
            current_len += len(line)
            if current_len >= chunk_size:
                chunks.append("\n".join(current_chunk))
                current_chunk = []
                current_len = 0
        
        if current_chunk:
            chunks.append("\n".join(current_chunk))
            
        return chunks

    def ingest(self, text: str, source: str = "manual"):
        chunks = self.chunk_text(text)
        print(f"Supabase (Native API): Ingesting {len(chunks)} chunks from {source}...")
        
        for i, chunk in enumerate(chunks):
            embedding = self.get_embedding(chunk)
            if embedding:
                try:
                    payload = json.dumps({
                        "content": chunk,
                        "metadata": {"source": source, "index": i},
                        "embedding": embedding
                    }).encode('utf-8')
                    
                    req = urllib.request.Request(
                        f"{self.supabase_url}/rest/v1/srmilion_docs",
                        data=payload,
                        headers=self._get_headers(),
                        method='POST'
                    )
                    
                    with urllib.request.urlopen(req) as response:
                        if response.status not in (200, 201):
                            error_body = response.read().decode('utf-8')
                            print(f"Error inserting chunk {i}: HTTP {response.status} - {error_body}")
                        else:
                            success_body = response.read().decode('utf-8')
                            print(f"Insert Success Response: {success_body[:200]}...")
                except urllib.error.HTTPError as he:
                    error_body = he.read().decode('utf-8')
                    print(f"HTTPError inserting chunk {i}: {he.code} {he.reason} - {error_body}")
                except Exception as e:
                    print(f"Error inserting chunk {i} into Supabase (Native API): {e}")
                    
        print("Supabase Ingestion (Native API) complete.")

    def search(self, query: str, top_k: int = 3, match_threshold: float = 0.5) -> str:
        query_embedding = self.get_embedding(query)
        if not query_embedding:
            print("Error generating query embedding.")
            return ""
            
        try:
            payload = json.dumps({
                "query_embedding": query_embedding,
                "match_threshold": match_threshold,
                "match_count": top_k
            }).encode('utf-8')
            
            req = urllib.request.Request(
                f"{self.supabase_url}/rest/v1/rpc/match_documents",
                data=payload,
                headers=self._get_headers(),
                method='POST'
            )
            
            with urllib.request.urlopen(req) as response:
                result_data = response.read().decode('utf-8')
                results = json.loads(result_data)
                
            if not results:
                return ""
            
            vector_context = [doc['content'] for doc in results]
            final_context = "### Supabase Semantic Search Results:\n" + "\n---\n".join(vector_context)
            return final_context
            
        except Exception as e:
            print(f"Supabase Search error (Native API): {e}")
            return ""
