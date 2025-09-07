import os
import json
import pickle
import numpy as np
from typing import List, Dict, Tuple
import faiss
from sklearn.feature_extraction.text import TfidfVectorizer
from openai import OpenAI

class VectorStore:
    def __init__(self, store_path: str = 'vector_store'):
        self.store_path = store_path
        self.client = OpenAI()
        self.index = None
        self.documents = []
        self.metadata = []
        self.vectorizer = None
        self.dimension = 1536  # OpenAI embedding dimension
        
        # Create store directory
        os.makedirs(store_path, exist_ok=True)
        
        # Load existing store if available
        self.load_store()
    
    def get_embedding(self, text: str) -> np.ndarray:
        """Get embedding for text using OpenAI API."""
        try:
            response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=text[:8000]  # Limit text length
            )
            return np.array(response.data[0].embedding, dtype=np.float32)
        except Exception as e:
            # Fallback to TF-IDF if OpenAI fails
            if self.vectorizer is None:
                self.vectorizer = TfidfVectorizer(max_features=1536, stop_words='english')
                # Fit on existing documents or dummy text
                fit_texts = [doc['content'][:1000] for doc in self.documents] or [text]
                self.vectorizer.fit(fit_texts)
            
            tfidf_vector = self.vectorizer.transform([text[:1000]]).toarray()[0]
            # Pad or truncate to match dimension
            if len(tfidf_vector) < self.dimension:
                tfidf_vector = np.pad(tfidf_vector, (0, self.dimension - len(tfidf_vector)))
            else:
                tfidf_vector = tfidf_vector[:self.dimension]
            
            return tfidf_vector.astype(np.float32)
    
    def add_paper(self, paper_id: int, title: str, content: str, sections: Dict[str, str], metadata: Dict = None):
        """Add a paper to the vector store."""
        # Split content into chunks for better retrieval
        chunks = self._split_text(content, chunk_size=1000, overlap=200)
        
        for i, chunk in enumerate(chunks):
            # Get embedding for chunk
            embedding = self.get_embedding(chunk)
            
            # Add to FAISS index
            if self.index is None:
                self.index = faiss.IndexFlatIP(self.dimension)  # Inner product for cosine similarity
            
            # Normalize embedding for cosine similarity
            faiss.normalize_L2(embedding.reshape(1, -1))
            self.index.add(embedding.reshape(1, -1))
            
            # Store document and metadata
            doc_metadata = {
                'paper_id': paper_id,
                'title': title,
                'chunk_id': i,
                'chunk_text': chunk,
                'total_chunks': len(chunks),
                'metadata': metadata or {}
            }
            
            self.documents.append({
                'content': chunk,
                'paper_id': paper_id,
                'title': title,
                'chunk_id': i
            })
            self.metadata.append(doc_metadata)
        
        # Add sections as separate documents
        for section_name, section_content in sections.items():
            if section_content.strip():
                embedding = self.get_embedding(section_content)
                faiss.normalize_L2(embedding.reshape(1, -1))
                self.index.add(embedding.reshape(1, -1))
                
                section_metadata = {
                    'paper_id': paper_id,
                    'title': title,
                    'section_name': section_name,
                    'chunk_text': section_content,
                    'is_section': True,
                    'metadata': metadata or {}
                }
                
                self.documents.append({
                    'content': section_content,
                    'paper_id': paper_id,
                    'title': title,
                    'section_name': section_name
                })
                self.metadata.append(section_metadata)
        
        # Save store
        self.save_store()
    
    def _split_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks."""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence ending within the last 100 characters
                last_period = text.rfind('.', start + chunk_size - 100, end)
                if last_period > start:
                    end = last_period + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks
    
    def search(self, query: str, k: int = 5, paper_ids: List[int] = None) -> List[Dict]:
        """Search for relevant documents."""
        if self.index is None or len(self.documents) == 0:
            return []
        
        # Get query embedding
        query_embedding = self.get_embedding(query)
        faiss.normalize_L2(query_embedding.reshape(1, -1))
        
        # Search in FAISS index
        scores, indices = self.index.search(query_embedding.reshape(1, -1), min(k * 3, len(self.documents)))
        
        results = []
        seen_papers = set()
        
        for score, idx in zip(scores[0], indices[0]):
            if idx >= len(self.metadata):
                continue
                
            metadata = self.metadata[idx]
            
            # Filter by paper_ids if specified
            if paper_ids and metadata['paper_id'] not in paper_ids:
                continue
            
            # Avoid too many results from the same paper
            paper_key = (metadata['paper_id'], metadata.get('section_name', ''))
            if paper_key in seen_papers and len(results) >= k:
                continue
            
            results.append({
                'score': float(score),
                'paper_id': metadata['paper_id'],
                'title': metadata['title'],
                'content': metadata['chunk_text'],
                'section_name': metadata.get('section_name', ''),
                'is_section': metadata.get('is_section', False),
                'metadata': metadata.get('metadata', {})
            })
            
            seen_papers.add(paper_key)
            
            if len(results) >= k:
                break
        
        return results
    
    def multi_paper_chat(self, question: str, paper_ids: List[int] = None, max_context: int = 3000) -> Dict:
        """Answer questions across multiple papers."""
        # Search for relevant content
        search_results = self.search(question, k=8, paper_ids=paper_ids)
        
        if not search_results:
            return {
                'answer': 'No relevant information found in the papers.',
                'sources': [],
                'papers_searched': paper_ids or []
            }
        
        # Prepare context from search results
        context_parts = []
        sources = []
        
        current_length = 0
        for result in search_results:
            content = result['content']
            if current_length + len(content) > max_context:
                content = content[:max_context - current_length]
            
            section_info = f" (Section: {result['section_name']})" if result['section_name'] else ""
            context_parts.append(f"From '{result['title']}'{section_info}:\n{content}")
            
            sources.append({
                'paper_id': result['paper_id'],
                'title': result['title'],
                'section': result['section_name'],
                'relevance_score': result['score'],
                'excerpt': content[:200] + '...' if len(content) > 200 else content
            })
            
            current_length += len(content)
            if current_length >= max_context:
                break
        
        context = '\n\n'.join(context_parts)
        
        # Generate answer using LLM
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a research assistant that answers questions based on multiple research papers. Provide comprehensive answers and cite which papers support your statements."},
                    {"role": "user", "content": f"Question: {question}\n\nContext from research papers:\n{context}\n\nPlease provide a comprehensive answer based on the information from these papers. When possible, mention which specific papers support different points."}
                ],
                max_tokens=600,
                temperature=0.3
            )
            
            answer = response.choices[0].message.content.strip()
            
        except Exception as e:
            answer = f"Error generating answer: {str(e)}"
        
        return {
            'answer': answer,
            'sources': sources,
            'papers_searched': paper_ids or [s['paper_id'] for s in sources],
            'total_results_found': len(search_results)
        }
    
    def get_paper_summary(self, paper_id: int) -> Dict:
        """Get summary of a specific paper from the vector store."""
        paper_docs = [doc for doc in self.documents if doc['paper_id'] == paper_id]
        
        if not paper_docs:
            return {'error': 'Paper not found in vector store'}
        
        # Get the first document (usually contains title and basic info)
        main_doc = paper_docs[0]
        
        # Find sections
        sections = {}
        for doc in paper_docs:
            if 'section_name' in doc:
                sections[doc['section_name']] = doc['content']
        
        return {
            'paper_id': paper_id,
            'title': main_doc['title'],
            'total_chunks': len(paper_docs),
            'sections': list(sections.keys()),
            'content_preview': main_doc['content'][:500] + '...' if len(main_doc['content']) > 500 else main_doc['content']
        }
    
    def remove_paper(self, paper_id: int):
        """Remove a paper from the vector store."""
        # Find indices to remove
        indices_to_remove = []
        for i, metadata in enumerate(self.metadata):
            if metadata['paper_id'] == paper_id:
                indices_to_remove.append(i)
        
        if not indices_to_remove:
            return False
        
        # Remove from documents and metadata (in reverse order to maintain indices)
        for idx in reversed(indices_to_remove):
            del self.documents[idx]
            del self.metadata[idx]
        
        # Rebuild FAISS index
        if self.documents:
            self.index = faiss.IndexFlatIP(self.dimension)
            for doc in self.documents:
                embedding = self.get_embedding(doc['content'])
                faiss.normalize_L2(embedding.reshape(1, -1))
                self.index.add(embedding.reshape(1, -1))
        else:
            self.index = None
        
        # Save store
        self.save_store()
        return True
    
    def save_store(self):
        """Save the vector store to disk."""
        try:
            # Save FAISS index
            if self.index is not None:
                faiss.write_index(self.index, os.path.join(self.store_path, 'faiss_index.bin'))
            
            # Save documents and metadata
            with open(os.path.join(self.store_path, 'documents.pkl'), 'wb') as f:
                pickle.dump(self.documents, f)
            
            with open(os.path.join(self.store_path, 'metadata.pkl'), 'wb') as f:
                pickle.dump(self.metadata, f)
            
            # Save vectorizer if exists
            if self.vectorizer is not None:
                with open(os.path.join(self.store_path, 'vectorizer.pkl'), 'wb') as f:
                    pickle.dump(self.vectorizer, f)
                    
        except Exception as e:
            print(f"Error saving vector store: {e}")
    
    def load_store(self):
        """Load the vector store from disk."""
        try:
            # Load FAISS index
            index_path = os.path.join(self.store_path, 'faiss_index.bin')
            if os.path.exists(index_path):
                self.index = faiss.read_index(index_path)
            
            # Load documents
            docs_path = os.path.join(self.store_path, 'documents.pkl')
            if os.path.exists(docs_path):
                with open(docs_path, 'rb') as f:
                    self.documents = pickle.load(f)
            
            # Load metadata
            meta_path = os.path.join(self.store_path, 'metadata.pkl')
            if os.path.exists(meta_path):
                with open(meta_path, 'rb') as f:
                    self.metadata = pickle.load(f)
            
            # Load vectorizer
            vec_path = os.path.join(self.store_path, 'vectorizer.pkl')
            if os.path.exists(vec_path):
                with open(vec_path, 'rb') as f:
                    self.vectorizer = pickle.load(f)
                    
        except Exception as e:
            print(f"Error loading vector store: {e}")
            # Initialize empty store
            self.index = None
            self.documents = []
            self.metadata = []
            self.vectorizer = None
    
    def get_stats(self) -> Dict:
        """Get statistics about the vector store."""
        paper_ids = set(doc['paper_id'] for doc in self.documents)
        
        return {
            'total_documents': len(self.documents),
            'total_papers': len(paper_ids),
            'papers': list(paper_ids),
            'index_size': self.index.ntotal if self.index else 0,
            'dimension': self.dimension
        }

