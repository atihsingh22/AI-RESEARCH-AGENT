import re
import json
from typing import List, Dict, Tuple
from openai import OpenAI

class CitationTracer:
    def __init__(self):
        self.client = OpenAI()
        
        # Common citation patterns
        self.citation_patterns = [
            r'\[(\d+(?:,\s*\d+)*)\]',  # [1], [1,2,3]
            r'\(([A-Za-z]+(?:\s+et\s+al\.?)?\s*,?\s*\d{4}[a-z]?(?:;\s*[A-Za-z]+(?:\s+et\s+al\.?)?\s*,?\s*\d{4}[a-z]?)*)\)',  # (Author, 2023)
            r'([A-Za-z]+(?:\s+et\s+al\.?)?\s*\(\d{4}[a-z]?\))',  # Author (2023)
            r'\((\d{4}[a-z]?)\)',  # (2023)
        ]
    
    def extract_citations(self, text: str) -> List[Dict]:
        """Extract citations from text with their positions."""
        citations = []
        
        for pattern in self.citation_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                citation = {
                    'text': match.group(0),
                    'content': match.group(1),
                    'start': match.start(),
                    'end': match.end(),
                    'type': self._classify_citation_type(match.group(0))
                }
                citations.append(citation)
        
        # Remove duplicates and sort by position
        unique_citations = []
        seen_positions = set()
        
        for citation in sorted(citations, key=lambda x: x['start']):
            pos_key = (citation['start'], citation['end'])
            if pos_key not in seen_positions:
                unique_citations.append(citation)
                seen_positions.add(pos_key)
        
        return unique_citations
    
    def _classify_citation_type(self, citation_text: str) -> str:
        """Classify the type of citation."""
        if re.match(r'\[\d+', citation_text):
            return 'numeric'
        elif re.match(r'\([A-Za-z]', citation_text):
            return 'author_year'
        elif re.match(r'[A-Za-z].*\(\d{4}', citation_text):
            return 'author_parenthetical'
        else:
            return 'other'
    
    def extract_references_section(self, text: str) -> str:
        """Extract the references section from the paper."""
        # Look for references section
        references_patterns = [
            r'references\s*\n(.*?)(?=\n\s*(?:appendix|acknowledgments?|$))',
            r'bibliography\s*\n(.*?)(?=\n\s*(?:appendix|acknowledgments?|$))',
            r'works\s+cited\s*\n(.*?)(?=\n\s*(?:appendix|acknowledgments?|$))'
        ]
        
        for pattern in references_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()
        
        # Fallback: look for a section with many citations
        lines = text.split('\n')
        reference_start = -1
        
        for i, line in enumerate(lines):
            if re.match(r'^\s*references?\s*$', line, re.IGNORECASE):
                reference_start = i + 1
                break
        
        if reference_start > 0:
            # Take everything from references to end or next major section
            references_text = '\n'.join(lines[reference_start:])
            return references_text[:5000]  # Limit length
        
        return ""
    
    def parse_references(self, references_text: str) -> List[Dict]:
        """Parse individual references from the references section."""
        if not references_text:
            return []
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at parsing academic references. Extract structured information from reference lists."},
                    {"role": "user", "content": f"Parse this references section and extract individual references with their details. Return as JSON array with fields: 'number', 'authors', 'title', 'venue', 'year', 'full_text'.\n\nReferences:\n{references_text[:3000]}"}
                ],
                max_tokens=1000,
                temperature=0.1
            )
            
            result = response.choices[0].message.content.strip()
            
            # Try to parse JSON
            try:
                if result.startswith('```json'):
                    result = result.replace('```json', '').replace('```', '').strip()
                elif result.startswith('```'):
                    result = result.replace('```', '').strip()
                
                references = json.loads(result)
                return references if isinstance(references, list) else []
            except json.JSONDecodeError:
                # Fallback: simple parsing
                return self._simple_reference_parsing(references_text)
                
        except Exception as e:
            return self._simple_reference_parsing(references_text)
    
    def _simple_reference_parsing(self, references_text: str) -> List[Dict]:
        """Simple fallback reference parsing."""
        references = []
        lines = references_text.split('\n')
        
        current_ref = ""
        ref_number = 1
        
        for line in lines:
            line = line.strip()
            if not line:
                if current_ref:
                    references.append({
                        'number': ref_number,
                        'full_text': current_ref,
                        'authors': '',
                        'title': '',
                        'venue': '',
                        'year': ''
                    })
                    ref_number += 1
                    current_ref = ""
            else:
                if current_ref:
                    current_ref += " " + line
                else:
                    current_ref = line
        
        # Add last reference
        if current_ref:
            references.append({
                'number': ref_number,
                'full_text': current_ref,
                'authors': '',
                'title': '',
                'venue': '',
                'year': ''
            })
        
        return references[:50]  # Limit to 50 references
    
    def trace_citation_to_source(self, citation: Dict, references: List[Dict]) -> Dict:
        """Trace a citation to its source in the references."""
        citation_type = citation['type']
        citation_content = citation['content']
        
        if citation_type == 'numeric':
            # Extract numbers from citation
            numbers = re.findall(r'\d+', citation_content)
            for num_str in numbers:
                num = int(num_str)
                for ref in references:
                    if ref.get('number') == num:
                        return ref
        
        elif citation_type in ['author_year', 'author_parenthetical']:
            # Extract year and author from citation
            year_match = re.search(r'\d{4}', citation_content)
            if year_match:
                year = year_match.group()
                
                # Simple author matching
                for ref in references:
                    if year in ref.get('full_text', '') or year in ref.get('year', ''):
                        return ref
        
        return {}
    
    def find_citation_context(self, text: str, citation: Dict, context_window: int = 200) -> str:
        """Find the context around a citation."""
        start = max(0, citation['start'] - context_window)
        end = min(len(text), citation['end'] + context_window)
        
        context = text[start:end]
        
        # Highlight the citation in the context
        citation_start = citation['start'] - start
        citation_end = citation['end'] - start
        
        highlighted_context = (
            context[:citation_start] + 
            f"**{context[citation_start:citation_end]}**" + 
            context[citation_end:]
        )
        
        return highlighted_context
    
    def answer_with_citations(self, question: str, paper_content: str, citations: List[Dict], references: List[Dict]) -> Dict:
        """Answer a question and provide citation sources."""
        try:
            # Prepare context with citations and references
            context_parts = [f"Paper content: {paper_content[:3000]}"]
            
            if references:
                ref_text = "References:\n"
                for ref in references[:10]:  # Limit to first 10 references
                    ref_text += f"{ref.get('number', '')}: {ref.get('full_text', '')}\n"
                context_parts.append(ref_text)
            
            context = "\n\n".join(context_parts)
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a research assistant. Answer questions based on the provided paper content and cite specific sources when possible. When you reference information, indicate which part of the paper or which reference supports your statement."},
                    {"role": "user", "content": f"Question: {question}\n\nContext: {context}\n\nPlease answer the question and indicate which parts of the paper or which references support your answer."}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            answer = response.choices[0].message.content.strip()
            
            # Find relevant citations for the answer
            relevant_citations = []
            for citation in citations:
                citation_context = self.find_citation_context(paper_content, citation)
                if any(word.lower() in citation_context.lower() for word in question.split() if len(word) > 3):
                    source_ref = self.trace_citation_to_source(citation, references)
                    relevant_citations.append({
                        'citation': citation,
                        'context': citation_context,
                        'source': source_ref
                    })
            
            return {
                'answer': answer,
                'relevant_citations': relevant_citations[:5],  # Limit to 5 most relevant
                'total_citations_found': len(citations)
            }
            
        except Exception as e:
            return {
                'answer': f"Error generating answer: {str(e)}",
                'relevant_citations': [],
                'total_citations_found': len(citations)
            }

