import os
import re
from pypdf import PdfReader
from typing import Dict, List, Tuple

class PDFProcessor:
    def __init__(self):
        self.section_patterns = [
            r'^\d+\.?\s*(abstract|introduction|related work|methodology|methods|approach|experiments|results|discussion|conclusion|references|acknowledgments)',
            r'^(abstract|introduction|related work|methodology|methods|approach|experiments|results|discussion|conclusion|references|acknowledgments)',
            r'^\d+\.\d+\.?\s*',  # Subsections like 3.1, 3.2
            r'^[A-Z][A-Z\s]+$'   # ALL CAPS headings
        ]
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract all text from PDF file."""
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            raise Exception(f"Error reading PDF: {str(e)}")
    
    def extract_metadata(self, file_path: str) -> Dict:
        """Extract metadata from PDF."""
        try:
            reader = PdfReader(file_path)
            metadata = reader.metadata
            return {
                'title': metadata.get('/Title', ''),
                'author': metadata.get('/Author', ''),
                'subject': metadata.get('/Subject', ''),
                'creator': metadata.get('/Creator', ''),
                'producer': metadata.get('/Producer', ''),
                'creation_date': metadata.get('/CreationDate', ''),
                'modification_date': metadata.get('/ModDate', ''),
                'pages': len(reader.pages)
            }
        except Exception as e:
            return {'error': str(e)}
    
    def detect_sections(self, text: str) -> Dict[str, str]:
        """Detect and extract different sections from the paper."""
        lines = text.split('\n')
        sections = {}
        current_section = 'introduction'
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if this line is a section header
            section_found = False
            for pattern in self.section_patterns:
                match = re.match(pattern, line.lower())
                if match:
                    # Save previous section
                    if current_content:
                        sections[current_section] = '\n'.join(current_content)
                    
                    # Start new section
                    if match.group(1) if len(match.groups()) > 0 else match.group(0):
                        section_name = (match.group(1) if len(match.groups()) > 0 else match.group(0)).lower()
                        current_section = section_name
                    else:
                        current_section = line.lower()
                    current_content = []
                    section_found = True
                    break
            
            if not section_found:
                current_content.append(line)
        
        # Save the last section
        if current_content:
            sections[current_section] = '\n'.join(current_content)
        
        return sections
    
    def extract_title_and_authors(self, text: str) -> Tuple[str, List[str]]:
        """Extract title and authors from the beginning of the paper."""
        lines = text.split('\n')[:20]  # Look at first 20 lines
        
        title = ""
        authors = []
        
        # Simple heuristic: title is usually the first non-empty line with substantial text
        for i, line in enumerate(lines):
            line = line.strip()
            if len(line) > 10 and not line.lower().startswith(('abstract', 'keywords')):
                title = line
                break
        
        # Authors are usually after title, before abstract
        title_found = False
        for line in lines:
            line = line.strip()
            if title_found and line and not line.lower().startswith(('abstract', 'keywords', 'introduction')):
                # Simple author detection - look for patterns like "Name1, Name2"
                if ',' in line or ' and ' in line.lower():
                    authors = [author.strip() for author in re.split(r',| and ', line)]
                    break
            elif line == title:
                title_found = True
        
        return title, authors
    
    def extract_abstract(self, text: str) -> str:
        """Extract abstract from the paper."""
        # Look for abstract section
        abstract_pattern = r'abstract\s*[:\-]?\s*(.*?)(?=\n\s*(?:keywords|introduction|\d+\.?\s*introduction))'
        match = re.search(abstract_pattern, text.lower(), re.DOTALL | re.IGNORECASE)
        
        if match:
            abstract = match.group(1).strip()
            # Clean up the abstract
            abstract = re.sub(r'\s+', ' ', abstract)
            return abstract
        
        return ""
    
    def process_pdf(self, file_path: str) -> Dict:
        """Process PDF and extract all relevant information."""
        try:
            # Extract text
            text = self.extract_text_from_pdf(file_path)
            
            # Extract metadata
            metadata = self.extract_metadata(file_path)
            
            # Extract title and authors
            title, authors = self.extract_title_and_authors(text)
            
            # Extract abstract
            abstract = self.extract_abstract(text)
            
            # Detect sections
            sections = self.detect_sections(text)
            
            return {
                'text': text,
                'metadata': metadata,
                'title': title or metadata.get('title', ''),
                'authors': authors,
                'abstract': abstract,
                'sections': sections,
                'success': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

