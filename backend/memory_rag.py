import os
import json
import networkx as nx
import pickle
import numpy as np
from openai import OpenAI
import tiktoken
from pathlib import Path
from typing import List, Dict, Any

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / 'data'
GRAPH_FILE = DATA_DIR / 'knowledge_graph.json'
VECTOR_FILE = DATA_DIR / 'vector_store.pkl'

class LightMemory:
    def __init__(self, openai_api_key: str):
        self.openai_client = OpenAI(api_key=openai_api_key)
        self.graph = nx.Graph()
        self.vector_store = [] # List of {id, text, metadata, embedding}
        
        self.load_graph()
        self.load_vector_store()

    def load_graph(self):
        if GRAPH_FILE.exists():
            try:
                with open(GRAPH_FILE, 'r') as f:
                    data = json.load(f)
                    self.graph = nx.node_link_graph(data)
                print(f"Graph loaded with {self.graph.number_of_nodes()} nodes.")
            except Exception as e:
                print(f"Error loading graph: {e}")
                self.graph = nx.Graph()
        else:
            self.graph = nx.Graph()

    def save_graph(self):
        try:
            data = nx.node_link_data(self.graph)
            with open(GRAPH_FILE, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            print(f"Error saving graph: {e}")

    def load_vector_store(self):
        if VECTOR_FILE.exists():
            try:
                with open(VECTOR_FILE, 'rb') as f:
                    self.vector_store = pickle.load(f)
                print(f"Vector store loaded with {len(self.vector_store)} documents.")
            except Exception as e:
                print(f"Error loading vector store: {e}")
                self.vector_store = []
        else:
            self.vector_store = []

    def save_vector_store(self):
        try:
            with open(VECTOR_FILE, 'wb') as f:
                pickle.dump(self.vector_store, f)
        except Exception as e:
            print(f"Error saving vector store: {e}")

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

    def extract_entities(self, text: str) -> List[Dict]:
        prompt = f"""
        Extract key entities (Concepts, Tools, Procedures, Locations) and their relationships from the text below.
        Return ONLY a JSON list of objects format: {{"head": "Entity A", "relation": "WORKS_WITH", "tail": "Entity B"}}
        
        Text:
        {text[:1500]} 
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a Knowledge Graph extraction expert. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            result = json.loads(content)
            
            if 'relationships' in result: return result['relationships']
            if 'edges' in result: return result['edges']
            if isinstance(result, list): return result
            return list(result.values())[0] if result else []
            
        except Exception as e:
            print(f"Extraction error: {e}")
            return []

    def ingest(self, text: str, source: str = "manual"):
        chunks = self.chunk_text(text)
        print(f"Ingesting {len(chunks)} chunks from {source}...")
        
        ids = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{source}_{i}"
            
            # Simple check if exists (skip for now to allow updates, or implement check)
            
            # 1. Embed and Store
            embedding = self.get_embedding(chunk)
            if embedding:
                self.vector_store.append({
                    "id": chunk_id,
                    "text": chunk,
                    "metadata": {"source": source, "index": i},
                    "embedding": embedding
                })
            
            # 2. Extract Graph Data
            relations = self.extract_entities(chunk)
            for rel in relations:
                head = rel.get('head')
                tail = rel.get('tail')
                edge = rel.get('relation', 'RELATED_TO')
                
                if head and tail:
                    self.graph.add_edge(head, tail, relation=edge, source_chunk=chunk_id)
        
        self.save_vector_store()
        self.save_graph()
        print("Ingestion complete.")

    def search(self, query: str, top_k: int = 3) -> str:
        # 1. Vector Search
        query_embedding = self.get_embedding(query)
        if not query_embedding: return "Error generating query embedding."
        
        # Optimize: Matrix Operation
        if not self.vector_store:
            return ""
            
        embeddings = np.array([doc['embedding'] for doc in self.vector_store])
        query_vec = np.array(query_embedding)
        
        # Cosine Similarity: (A . B) / (|A| * |B|)
        # Assume embeddings are normalized? OpenAI usually are. 
        # But let's safe compute.
        norm_docs = np.linalg.norm(embeddings, axis=1)
        norm_query = np.linalg.norm(query_vec)
        
        if norm_query == 0: return ""
        
        # scores = dot(docs, query) / (norm_docs * norm_query)
        scores = np.dot(embeddings, query_vec) / (norm_docs * norm_query)
        
        # Get top_k indices
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        vector_context = []
        start_nodes = []
        
        # Heuristic for Graph Start Nodes from Top Docs
        # Or simple keyword match
        query_words = set(query.lower().split())

        for idx in top_indices:
            doc = self.vector_store[idx]
            vector_context.append(doc['text'])
            # Check keywords in this doc? No, just use query words globally
        
        # Graph Search Optimization
        start_nodes = []
        for node in self.graph.nodes():
             if str(node).lower() in query.lower():
                 start_nodes.append(node)
                    
        # 2. Graph Traversal (1-hop)
        graph_context = []
        visited = set()
        
        for node in start_nodes[:5]: 
            if node in visited: continue
            visited.add(node)
            if node in self.graph:
                neighbors = self.graph[node]
                for neighbor, attr in neighbors.items():
                    relation = attr.get('relation', 'RELATED_TO')
                    graph_context.append(f"{node} {relation} {neighbor}")
                
        # Format Final Context
        final_context = "### Document Excerpts:\n" + "\n---\n".join(vector_context)
        if graph_context:
            final_context += "\n\n### Related Concepts (Graph):\n" + "\n".join(graph_context)
            
        return final_context

