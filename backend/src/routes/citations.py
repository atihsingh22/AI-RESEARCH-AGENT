import json
from flask import Blueprint, request, jsonify
from src.models.paper import Paper, db
from src.utils.citation_tracer import CitationTracer

citations_bp = Blueprint('citations', __name__)

@citations_bp.route('/extract/<int:paper_id>', methods=['POST'])
def extract_citations(paper_id):
    """Extract citations from a paper."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        tracer = CitationTracer()
        
        # Extract citations from the paper content
        citations = tracer.extract_citations(paper.content)
        
        # Extract references section
        references_text = tracer.extract_references_section(paper.content)
        
        # Parse references
        references = tracer.parse_references(references_text)
        
        # Trace citations to sources
        traced_citations = []
        for citation in citations:
            source = tracer.trace_citation_to_source(citation, references)
            traced_citations.append({
                'citation': citation,
                'source': source,
                'context': tracer.find_citation_context(paper.content, citation)
            })
        
        return jsonify({
            'paper_id': paper_id,
            'title': paper.title,
            'citations': traced_citations,
            'references': references,
            'total_citations': len(citations),
            'total_references': len(references)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@citations_bp.route('/query-with-sources/<int:paper_id>', methods=['POST'])
def query_with_sources(paper_id):
    """Answer a question about a paper with citation sources."""
    try:
        data = request.get_json()
        question = data.get('question', '')
        
        if not question:
            return jsonify({'error': 'No question provided'}), 400
        
        paper = Paper.query.get_or_404(paper_id)
        tracer = CitationTracer()
        
        # Extract citations and references if not already done
        citations = tracer.extract_citations(paper.content)
        references_text = tracer.extract_references_section(paper.content)
        references = tracer.parse_references(references_text)
        
        # Answer question with citations
        result = tracer.answer_with_citations(question, paper.content, citations, references)
        
        return jsonify({
            'paper_id': paper_id,
            'question': question,
            'answer': result['answer'],
            'relevant_citations': result['relevant_citations'],
            'total_citations_found': result['total_citations_found']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@citations_bp.route('/highlight-sources/<int:paper_id>', methods=['POST'])
def highlight_sources(paper_id):
    """Highlight source sentences/paragraphs for a specific claim."""
    try:
        data = request.get_json()
        claim = data.get('claim', '')
        
        if not claim:
            return jsonify({'error': 'No claim provided'}), 400
        
        paper = Paper.query.get_or_404(paper_id)
        tracer = CitationTracer()
        
        # Find relevant sections in the paper that support the claim
        try:
            response = tracer.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at finding supporting evidence in research papers. Identify specific sentences or paragraphs that support a given claim."},
                    {"role": "user", "content": f"Find the specific sentences or paragraphs in this paper that support this claim: '{claim}'\n\nPaper content: {paper.content[:4000]}\n\nReturn the exact text passages that support the claim, along with their approximate position in the paper."}
                ],
                max_tokens=600,
                temperature=0.2
            )
            
            supporting_evidence = response.choices[0].message.content.strip()
            
            # Extract citations from the paper
            citations = tracer.extract_citations(paper.content)
            
            # Find citations near the supporting evidence
            relevant_citations = []
            for citation in citations:
                citation_context = tracer.find_citation_context(paper.content, citation, 300)
                if any(word.lower() in citation_context.lower() for word in claim.split() if len(word) > 3):
                    relevant_citations.append({
                        'citation': citation,
                        'context': citation_context
                    })
            
            return jsonify({
                'paper_id': paper_id,
                'claim': claim,
                'supporting_evidence': supporting_evidence,
                'relevant_citations': relevant_citations[:5],
                'total_citations_found': len(relevant_citations)
            }), 200
            
        except Exception as e:
            return jsonify({'error': f'Error finding supporting evidence: {str(e)}'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@citations_bp.route('/reference-details/<int:paper_id>/<int:ref_number>', methods=['GET'])
def get_reference_details(paper_id, ref_number):
    """Get detailed information about a specific reference."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        tracer = CitationTracer()
        
        # Extract references
        references_text = tracer.extract_references_section(paper.content)
        references = tracer.parse_references(references_text)
        
        # Find the specific reference
        target_ref = None
        for ref in references:
            if ref.get('number') == ref_number:
                target_ref = ref
                break
        
        if not target_ref:
            return jsonify({'error': f'Reference {ref_number} not found'}), 404
        
        # Find all citations to this reference in the paper
        citations = tracer.extract_citations(paper.content)
        citing_contexts = []
        
        for citation in citations:
            if citation['type'] == 'numeric':
                numbers = [int(n) for n in citation['content'].split(',') if n.strip().isdigit()]
                if ref_number in numbers:
                    context = tracer.find_citation_context(paper.content, citation, 250)
                    citing_contexts.append({
                        'citation': citation,
                        'context': context
                    })
        
        return jsonify({
            'paper_id': paper_id,
            'reference': target_ref,
            'citing_contexts': citing_contexts,
            'citation_count': len(citing_contexts)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@citations_bp.route('/citation-network/<int:paper_id>', methods=['GET'])
def get_citation_network(paper_id):
    """Get citation network information for visualization."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        tracer = CitationTracer()
        
        # Extract citations and references
        citations = tracer.extract_citations(paper.content)
        references_text = tracer.extract_references_section(paper.content)
        references = tracer.parse_references(references_text)
        
        # Build network data
        nodes = [{'id': 'main_paper', 'label': paper.title[:50], 'type': 'main'}]
        edges = []
        
        # Add reference nodes and edges
        for ref in references[:20]:  # Limit to first 20 references
            ref_id = f"ref_{ref.get('number', len(nodes))}"
            ref_title = ref.get('title', ref.get('full_text', ''))[:50]
            
            nodes.append({
                'id': ref_id,
                'label': ref_title,
                'type': 'reference',
                'year': ref.get('year', ''),
                'authors': ref.get('authors', '')
            })
            
            edges.append({
                'from': 'main_paper',
                'to': ref_id,
                'type': 'cites'
            })
        
        # Count citation frequency
        citation_counts = {}
        for citation in citations:
            if citation['type'] == 'numeric':
                numbers = [int(n) for n in citation['content'].split(',') if n.strip().isdigit()]
                for num in numbers:
                    citation_counts[num] = citation_counts.get(num, 0) + 1
        
        return jsonify({
            'paper_id': paper_id,
            'network': {
                'nodes': nodes,
                'edges': edges
            },
            'citation_counts': citation_counts,
            'total_citations': len(citations),
            'total_references': len(references)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

