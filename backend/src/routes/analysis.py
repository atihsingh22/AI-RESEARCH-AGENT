import json
from flask import Blueprint, request, jsonify
from src.models.paper import Paper, db
from src.utils.llm_analyzer import LLMAnalyzer

analysis_bp = Blueprint('analysis', __name__)

@analysis_bp.route('/summarize/<int:paper_id>', methods=['POST'])
def analyze_paper(paper_id):
    """Generate comprehensive analysis for a paper."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        analyzer = LLMAnalyzer()
        
        # Parse sections
        sections = json.loads(paper.sections) if paper.sections else {}
        
        # Generate section-wise summaries
        section_summaries = analyzer.section_wise_summarization(sections, paper.title)
        
        # Generate detailed summaries
        methods_summary = analyzer.generate_methods_summary(paper.content, sections)
        results_summary = analyzer.generate_results_summary(paper.content, sections)
        limitations_summary = analyzer.generate_limitations_summary(paper.content, sections)
        
        # Generate easy language summary
        easy_language_summary = analyzer.generate_easy_language_summary(paper.content, paper.title)
        
        # Generate research ideas
        research_ideas = analyzer.generate_research_ideas(paper.content, limitations_summary)
        
        # Extract metadata
        metadata = analyzer.extract_metadata(paper.content, sections)
        
        # Update paper in database
        paper.summary = json.dumps(section_summaries)
        paper.methods_summary = methods_summary
        paper.results_summary = results_summary
        paper.limitations_summary = limitations_summary
        paper.easy_language_summary = easy_language_summary
        paper.research_ideas = json.dumps(research_ideas)
        paper.models_used = json.dumps(metadata['models_used'])
        paper.datasets_used = json.dumps(metadata['datasets_used'])
        paper.key_results = json.dumps(metadata['key_results'])
        paper.innovations = json.dumps(metadata['innovations'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Analysis completed successfully',
            'analysis': {
                'section_summaries': section_summaries,
                'methods_summary': methods_summary,
                'results_summary': results_summary,
                'limitations_summary': limitations_summary,
                'easy_language_summary': easy_language_summary,
                'research_ideas': research_ideas,
                'metadata': metadata
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/compare', methods=['POST'])
def compare_papers():
    """Compare multiple papers."""
    try:
        data = request.get_json()
        paper_ids = data.get('paper_ids', [])
        
        if len(paper_ids) < 2:
            return jsonify({'error': 'At least 2 papers required for comparison'}), 400
        
        papers = Paper.query.filter(Paper.id.in_(paper_ids)).all()
        if len(papers) != len(paper_ids):
            return jsonify({'error': 'Some papers not found'}), 404
        
        analyzer = LLMAnalyzer()
        
        # Prepare comparison data
        comparison_data = []
        for paper in papers:
            comparison_data.append({
                'id': paper.id,
                'title': paper.title,
                'models_used': json.loads(paper.models_used) if paper.models_used else [],
                'datasets_used': json.loads(paper.datasets_used) if paper.datasets_used else [],
                'key_results': json.loads(paper.key_results) if paper.key_results else [],
                'innovations': json.loads(paper.innovations) if paper.innovations else [],
                'methods_summary': paper.methods_summary,
                'results_summary': paper.results_summary
            })
        
        # Generate comparison analysis
        comparison_text = f"Compare these {len(papers)} research papers:\n\n"
        for i, data in enumerate(comparison_data, 1):
            comparison_text += f"Paper {i}: {data['title']}\n"
            comparison_text += f"Models: {', '.join(data['models_used'])}\n"
            comparison_text += f"Datasets: {', '.join(data['datasets_used'])}\n"
            comparison_text += f"Methods: {data['methods_summary'][:500]}...\n"
            comparison_text += f"Results: {data['results_summary'][:500]}...\n\n"
        
        try:
            response = analyzer.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert research analyst. Provide detailed comparisons of research papers."},
                    {"role": "user", "content": f"{comparison_text}\n\nProvide a comprehensive comparison covering:\n1. Methodological differences\n2. Dataset and evaluation differences\n3. Results comparison\n4. Innovation comparison\n5. Strengths and weaknesses of each approach"}
                ],
                max_tokens=800,
                temperature=0.3
            )
            comparison_analysis = response.choices[0].message.content.strip()
        except Exception as e:
            comparison_analysis = f"Error generating comparison: {str(e)}"
        
        return jsonify({
            'comparison': {
                'papers': comparison_data,
                'analysis': comparison_analysis
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/easy-explain/<int:paper_id>', methods=['GET'])
def easy_explain(paper_id):
    """Get easy language explanation of a paper."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        
        if not paper.easy_language_summary:
            # Generate if not exists
            analyzer = LLMAnalyzer()
            easy_summary = analyzer.generate_easy_language_summary(paper.content, paper.title)
            paper.easy_language_summary = easy_summary
            db.session.commit()
        
        return jsonify({
            'paper_id': paper_id,
            'title': paper.title,
            'easy_explanation': paper.easy_language_summary
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/research-ideas/<int:paper_id>', methods=['GET'])
def get_research_ideas(paper_id):
    """Get research ideas based on a paper."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        
        if not paper.research_ideas:
            # Generate if not exists
            analyzer = LLMAnalyzer()
            ideas = analyzer.generate_research_ideas(paper.content, paper.limitations_summary or "")
            paper.research_ideas = json.dumps(ideas)
            db.session.commit()
        
        return jsonify({
            'paper_id': paper_id,
            'title': paper.title,
            'research_ideas': json.loads(paper.research_ideas)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

