import os
import json
from openai import OpenAI
from typing import Dict, List

class LLMAnalyzer:
    def __init__(self):
        self.client = OpenAI()
    
    def section_wise_summarization(self, sections: Dict[str, str], title: str = "") -> Dict[str, str]:
        """Generate section-wise summaries of the paper."""
        summaries = {}
        
        # Define section-specific prompts
        section_prompts = {
            'abstract': "Summarize this abstract in 2-3 sentences, highlighting the main contribution and findings.",
            'introduction': "Summarize the introduction, focusing on the problem statement, motivation, and research objectives.",
            'methodology': "Summarize the methodology section, explaining the approach, techniques, and experimental setup.",
            'methods': "Summarize the methods section, explaining the approach, techniques, and experimental setup.",
            'approach': "Summarize the approach section, explaining the methodology and techniques used.",
            'experiments': "Summarize the experiments section, focusing on the experimental design and setup.",
            'results': "Summarize the results section, highlighting key findings, metrics, and performance outcomes.",
            'discussion': "Summarize the discussion section, focusing on interpretation of results and implications.",
            'conclusion': "Summarize the conclusion section, highlighting main contributions and future work.",
            'related work': "Summarize the related work section, focusing on how this work relates to existing research."
        }
        
        for section_name, content in sections.items():
            if not content.strip():
                continue
                
            # Get appropriate prompt for this section
            prompt = section_prompts.get(section_name.lower(), 
                f"Summarize this {section_name} section in 2-3 sentences, focusing on the key points.")
            
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are an expert research paper analyst. Provide clear, concise summaries."},
                        {"role": "user", "content": f"Paper title: {title}\n\nSection: {section_name}\n\nContent: {content[:3000]}\n\n{prompt}"}
                    ],
                    max_tokens=300,
                    temperature=0.3
                )
                summaries[section_name] = response.choices[0].message.content.strip()
            except Exception as e:
                summaries[section_name] = f"Error generating summary: {str(e)}"
        
        return summaries
    
    def generate_methods_summary(self, content: str, sections: Dict[str, str]) -> str:
        """Generate detailed methods summary."""
        methods_content = ""
        for section in ['methodology', 'methods', 'approach', 'experiments']:
            if section in sections:
                methods_content += f"{section.title()}:\n{sections[section]}\n\n"
        
        if not methods_content:
            methods_content = content[:4000]  # Use first part of paper if no specific methods section
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert research analyst. Focus on methodology, experimental design, and technical approaches."},
                    {"role": "user", "content": f"Analyze the methods and methodology of this research paper. Provide a detailed summary covering:\n1. Main approach/methodology\n2. Experimental setup\n3. Data and datasets used\n4. Evaluation metrics\n5. Technical implementation details\n\nContent:\n{methods_content[:4000]}"}
                ],
                max_tokens=500,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error generating methods summary: {str(e)}"
    
    def generate_results_summary(self, content: str, sections: Dict[str, str]) -> str:
        """Generate detailed results summary."""
        results_content = ""
        for section in ['results', 'experiments', 'evaluation', 'discussion']:
            if section in sections:
                results_content += f"{section.title()}:\n{sections[section]}\n\n"
        
        if not results_content:
            results_content = content[len(content)//2:]  # Use latter part of paper
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert research analyst. Focus on experimental results, performance metrics, and findings."},
                    {"role": "user", "content": f"Analyze the results and findings of this research paper. Provide a detailed summary covering:\n1. Key experimental results\n2. Performance metrics and comparisons\n3. Statistical significance\n4. Main findings and discoveries\n5. Comparison with baseline/state-of-the-art\n\nContent:\n{results_content[:4000]}"}
                ],
                max_tokens=500,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error generating results summary: {str(e)}"
    
    def generate_limitations_summary(self, content: str, sections: Dict[str, str]) -> str:
        """Generate limitations and future work summary."""
        limitations_content = ""
        for section in ['limitations', 'discussion', 'conclusion', 'future work']:
            if section in sections:
                limitations_content += f"{section.title()}:\n{sections[section]}\n\n"
        
        if not limitations_content:
            limitations_content = content[len(content)*3//4:]  # Use last quarter of paper
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert research analyst. Focus on limitations, weaknesses, and areas for improvement."},
                    {"role": "user", "content": f"Analyze the limitations and future work directions of this research paper. Provide a summary covering:\n1. Acknowledged limitations\n2. Potential weaknesses\n3. Scope constraints\n4. Future research directions\n5. Areas for improvement\n\nContent:\n{limitations_content[:4000]}"}
                ],
                max_tokens=400,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error generating limitations summary: {str(e)}"
    
    def generate_easy_language_summary(self, content: str, title: str) -> str:
        """Generate easy-to-understand summary for general audience."""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at explaining complex research to high school students. Use simple language, avoid jargon, and use analogies when helpful."},
                    {"role": "user", "content": f"Explain this research paper like I'm a 10th grade student. Make it engaging and easy to understand:\n\nTitle: {title}\n\nContent: {content[:3000]}\n\nCover:\n1. What problem they're trying to solve\n2. How they solved it (in simple terms)\n3. What they found out\n4. Why it matters"}
                ],
                max_tokens=400,
                temperature=0.5
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error generating easy language summary: {str(e)}"
    
    def generate_research_ideas(self, content: str, limitations: str) -> List[str]:
        """Generate future research ideas based on the paper and its limitations."""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a creative research strategist. Generate innovative and feasible research ideas."},
                    {"role": "user", "content": f"Based on this research paper and its limitations, suggest 5-7 specific future research directions or ideas:\n\nPaper content: {content[:2000]}\n\nLimitations: {limitations}\n\nProvide concrete, actionable research ideas that could extend or improve this work."}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            ideas_text = response.choices[0].message.content.strip()
            # Parse ideas into a list
            ideas = []
            for line in ideas_text.split('\n'):
                line = line.strip()
                if line and (line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '-', '•'))):
                    # Clean up the idea text
                    idea = line.split('.', 1)[-1].strip() if '.' in line else line[1:].strip()
                    ideas.append(idea)
            
            return ideas[:7]  # Limit to 7 ideas
        except Exception as e:
            return [f"Error generating research ideas: {str(e)}"]
    
    def extract_metadata(self, content: str, sections: Dict[str, str]) -> Dict[str, List[str]]:
        """Extract models, datasets, innovations, and key results."""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting structured information from research papers. Return information in JSON format."},
                    {"role": "user", "content": f"Extract the following information from this research paper and return as JSON:\n\n1. models_used: List of AI/ML models, algorithms, or architectures mentioned\n2. datasets_used: List of datasets used for training/evaluation\n3. key_results: List of main quantitative results or performance metrics\n4. innovations: List of novel contributions or innovations introduced\n\nPaper content: {content[:4000]}\n\nReturn only valid JSON with these four keys."}
                ],
                max_tokens=600,
                temperature=0.2
            )
            
            result = response.choices[0].message.content.strip()
            # Try to parse JSON
            try:
                metadata = json.loads(result)
                return {
                    'models_used': metadata.get('models_used', []),
                    'datasets_used': metadata.get('datasets_used', []),
                    'key_results': metadata.get('key_results', []),
                    'innovations': metadata.get('innovations', [])
                }
            except json.JSONDecodeError:
                # Fallback: parse manually
                return {
                    'models_used': [],
                    'datasets_used': [],
                    'key_results': [],
                    'innovations': []
                }
        except Exception as e:
            return {
                'models_used': [],
                'datasets_used': [],
                'key_results': [],
                'innovations': []
            }

