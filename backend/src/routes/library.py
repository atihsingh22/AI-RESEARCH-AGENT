import json
import os
from flask import Blueprint, request, jsonify
from src.models.paper import Paper, db
from src.utils.vector_store import VectorStore

library_bp = Blueprint('library', __name__)

# Initialize vector store
vector_store_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'vector_store')
vector_store = VectorStore(vector_store_path)

@library_bp.route('/add-to-library/<int:paper_id>', methods=['POST'])
def add_to_library(paper_id):
    """Add a paper to the vector store library."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        
        # Parse sections
        sections = json.loads(paper.sections) if paper.sections else {}
        
        # Prepare metadata
        metadata = {
            'authors': json.loads(paper.authors) if paper.authors else [],
            'abstract': paper.abstract,
            'filename': paper.filename,
            'upload_date': paper.upload_date.isoformat() if paper.upload_date else None
        }
        
        # Add to vector store
        vector_store.add_paper(
            paper_id=paper.id,
            title=paper.title,
            content=paper.content,
            sections=sections,
            metadata=metadata
        )
        
        return jsonify({
            'message': f'Paper "{paper.title}" added to library successfully',
            'paper_id': paper_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@library_bp.route('/remove-from-library/<int:paper_id>', methods=['DELETE'])
def remove_from_library(paper_id):
    """Remove a paper from the vector store library."""
    try:
        success = vector_store.remove_paper(paper_id)
        
        if success:
            return jsonify({
                'message': f'Paper {paper_id} removed from library successfully'
            }), 200
        else:
            return jsonify({'error': 'Paper not found in library'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@library_bp.route('/chat', methods=['POST'])
def multi_paper_chat():
    """Chat with multiple papers in the library."""
    try:
        data = request.get_json()
        question = data.get('question', '')
        paper_ids = data.get('paper_ids', None)  # None means search all papers
        
        if not question:
            return jsonify({'error': 'No question provided'}), 400
        
        # Validate paper_ids if provided
        if paper_ids:
            existing_papers = Paper.query.filter(Paper.id.in_(paper_ids)).all()
            if len(existing_papers) != len(paper_ids):
                return jsonify({'error': 'Some specified papers not found'}), 404
        
        # Get answer from vector store
        result = vector_store.multi_paper_chat(question, paper_ids)
        
        return jsonify({
            'question': question,
            'answer': result['answer'],
            'sources': result['sources'],
            'papers_searched': result['papers_searched'],
            'total_results_found': result['total_results_found']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@library_bp.route('/search', methods=['POST'])
def search_library():
    """Search across papers in the library."""
    try:
        data = request.get_json()
        query = data.get('query', '')
        paper_ids = data.get('paper_ids', None)
        limit = data.get('limit', 10)
        
        if not query:
            return jsonify({'error': 'No search query provided'}), 400
        
        # Search in vector store
        results = vector_store.search(query, k=limit, paper_ids=paper_ids)
        
        return jsonify({
            'query': query,
            'results': results,
            'total_found': len(results)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@library_bp.route('/stats', methods=['GET'])
def get_library_stats():
    """Get statistics about the library."""
    try:
        stats = vector_store.get_stats()
        
        # Get paper details for papers in the library
        paper_details = []
        if stats['papers']:
            papers = Paper.query.filter(Paper.id.in_(stats['papers'])).all()
            for paper in papers:
                paper_details.append({
                    'id': paper.id,
                    'title': paper.title,
                    'authors': json.loads(paper.authors) if paper.authors else [],
                    'upload_date': paper.upload_date.isoformat() if paper.upload_date else None
                })
        
        return jsonify({
            'stats': stats,
            'papers': paper_details
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@library_bp.route('/paper-summary/<int:paper_id>', methods=['GET'])
def get_paper_summary_from_library(paper_id):
    """Get summary of a paper from the library."""
    try:
        summary = vector_store.get_paper_summary(paper_id)
        
        if 'error' in summary:
            return jsonify(summary), 404
        
        return jsonify(summary), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@library_bp.route('/bulk-add', methods=['POST'])
def bulk_add_to_library():
    """Add multiple papers to the library at once."""
    try:
        data = request.get_json()
        paper_ids = data.get('paper_ids', [])
        
        if not paper_ids:
            return jsonify({'error': 'No paper IDs provided'}), 400
        
        papers = Paper.query.filter(Paper.id.in_(paper_ids)).all()
        if len(papers) != len(paper_ids):
            return jsonify({'error': 'Some papers not found'}), 404
        
        added_papers = []
        errors = []
        
        for paper in papers:
            try:
                # Parse sections
                sections = json.loads(paper.sections) if paper.sections else {}
                
                # Prepare metadata
                metadata = {
                    'authors': json.loads(paper.authors) if paper.authors else [],
                    'abstract': paper.abstract,
                    'filename': paper.filename,
                    'upload_date': paper.upload_date.isoformat() if paper.upload_date else None
                }
                
                # Add to vector store
                vector_store.add_paper(
                    paper_id=paper.id,
                    title=paper.title,
                    content=paper.content,
                    sections=sections,
                    metadata=metadata
                )
                
                added_papers.append({
                    'id': paper.id,
                    'title': paper.title
                })
                
            except Exception as e:
                errors.append({
                    'paper_id': paper.id,
                    'error': str(e)
                })
        
        return jsonify({
            'message': f'Successfully added {len(added_papers)} papers to library',
            'added_papers': added_papers,
            'errors': errors
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@library_bp.route('/similar-papers/<int:paper_id>', methods=['GET'])
def find_similar_papers(paper_id):
    """Find papers similar to a given paper."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        
        # Use the paper's abstract or first part of content as query
        query_text = paper.abstract or paper.content[:1000]
        
        # Search for similar papers (excluding the paper itself)
        all_results = vector_store.search(query_text, k=20)
        similar_papers = [r for r in all_results if r['paper_id'] != paper_id][:10]
        
        return jsonify({
            'paper_id': paper_id,
            'title': paper.title,
            'similar_papers': similar_papers
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@library_bp.route('/topic-analysis', methods=['POST'])
def analyze_topics():
    """Analyze common topics across papers in the library."""
    try:
        data = request.get_json()
        paper_ids = data.get('paper_ids', None)
        
        # Get papers from library
        if paper_ids:
            papers = Paper.query.filter(Paper.id.in_(paper_ids)).all()
        else:
            # Get all papers in the library
            stats = vector_store.get_stats()
            papers = Paper.query.filter(Paper.id.in_(stats['papers'])).all()
        
        if not papers:
            return jsonify({'error': 'No papers found in library'}), 404
        
        # Prepare content for topic analysis
        paper_summaries = []
        for paper in papers:
            summary = {
                'id': paper.id,
                'title': paper.title,
                'abstract': paper.abstract,
                'methods_summary': paper.methods_summary
            }
            paper_summaries.append(summary)
        
        # Use LLM to analyze topics
        from openai import OpenAI
        client = OpenAI()
        
        papers_text = "\n\n".join([
            f"Paper {p['id']}: {p['title']}\nAbstract: {p['abstract']}\nMethods: {p['methods_summary']}"
            for p in paper_summaries
        ])
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert research analyst. Analyze the common topics, themes, and research areas across multiple papers."},
                {"role": "user", "content": f"Analyze these research papers and identify:\n1. Common topics and themes\n2. Research methodologies used\n3. Emerging trends\n4. Knowledge gaps\n\nPapers:\n{papers_text[:4000]}"}
            ],
            max_tokens=600,
            temperature=0.3
        )
        
        analysis = response.choices[0].message.content.strip()
        
        return jsonify({
            'papers_analyzed': len(papers),
            'topic_analysis': analysis,
            'papers': [{'id': p['id'], 'title': p['title']} for p in paper_summaries]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

