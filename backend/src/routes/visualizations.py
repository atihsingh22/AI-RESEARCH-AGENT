import os
import subprocess
from flask import Blueprint, request, jsonify, send_file
from openai import OpenAI
from src.models.paper import Paper

visualizations_bp = Blueprint('visualizations', __name__)

DIAGRAMS_FOLDER = 'diagrams'

@visualizations_bp.route('/generate-diagram/<int:paper_id>', methods=['POST'])
def generate_diagram(paper_id):
    """Generate visual diagram from paper content."""
    try:
        data = request.get_json()
        diagram_type = data.get('type', 'methodology')  # 'methodology', 'architecture', 'flowchart', 'mindmap'
        
        paper = Paper.query.get_or_404(paper_id)
        
        # Create diagrams directory
        diagrams_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), DIAGRAMS_FOLDER)
        os.makedirs(diagrams_dir, exist_ok=True)
        
        client = OpenAI()
        
        # Generate Mermaid diagram based on paper content
        if diagram_type == 'methodology':
            prompt = f"""Based on this research paper, create a Mermaid flowchart diagram showing the methodology/approach:

Title: {paper.title}
Methods Summary: {paper.methods_summary or 'Not available'}
Content: {paper.content[:2000]}

Create a Mermaid flowchart that shows:
1. Data input/preprocessing steps
2. Main algorithm/model components
3. Training/evaluation process
4. Output/results

Return only the Mermaid code starting with 'flowchart TD' or 'graph TD'."""

        elif diagram_type == 'architecture':
            prompt = f"""Based on this research paper, create a Mermaid diagram showing the system/model architecture:

Title: {paper.title}
Content: {paper.content[:2000]}

Create a Mermaid diagram that shows:
1. Input layers/components
2. Processing layers/modules
3. Output layers/components
4. Data flow between components

Return only the Mermaid code starting with 'flowchart TD' or 'graph TD'."""

        elif diagram_type == 'mindmap':
            prompt = f"""Based on this research paper, create a Mermaid mindmap showing key concepts:

Title: {paper.title}
Abstract: {paper.abstract}
Content: {paper.content[:1500]}

Create a Mermaid mindmap that shows:
1. Central topic
2. Main concepts/themes
3. Sub-concepts and relationships
4. Key findings

Return only the Mermaid code starting with 'mindmap'."""

        else:  # flowchart
            prompt = f"""Based on this research paper, create a Mermaid flowchart showing the overall process:

Title: {paper.title}
Content: {paper.content[:2000]}

Create a Mermaid flowchart that shows:
1. Problem identification
2. Solution approach
3. Implementation steps
4. Evaluation and results

Return only the Mermaid code starting with 'flowchart TD' or 'graph TD'."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at creating Mermaid diagrams. Return only valid Mermaid syntax."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.3
        )
        
        mermaid_code = response.choices[0].message.content.strip()
        
        # Clean up the mermaid code
        if mermaid_code.startswith('```mermaid'):
            mermaid_code = mermaid_code.replace('```mermaid', '').replace('```', '').strip()
        elif mermaid_code.startswith('```'):
            mermaid_code = mermaid_code.replace('```', '').strip()
        
        # Save Mermaid file
        mermaid_filename = f"paper_{paper_id}_{diagram_type}.mmd"
        mermaid_path = os.path.join(diagrams_dir, mermaid_filename)
        
        with open(mermaid_path, 'w') as f:
            f.write(mermaid_code)
        
        # Generate PNG using manus-render-diagram
        png_filename = f"paper_{paper_id}_{diagram_type}.png"
        png_path = os.path.join(diagrams_dir, png_filename)
        
        try:
            result = subprocess.run(
                ['manus-render-diagram', mermaid_path, png_path],
                capture_output=True,
                text=True,
                check=True
            )
            
            return send_file(png_path, as_attachment=True, download_name=png_filename)
            
        except subprocess.CalledProcessError as e:
            return jsonify({
                'error': f'Diagram generation failed: {e.stderr}',
                'mermaid_code': mermaid_code
            }), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@visualizations_bp.route('/custom-diagram', methods=['POST'])
def create_custom_diagram():
    """Create custom diagram from user-provided description."""
    try:
        data = request.get_json()
        description = data.get('description', '')
        diagram_type = data.get('type', 'flowchart')
        
        if not description:
            return jsonify({'error': 'No description provided'}), 400
        
        # Create diagrams directory
        diagrams_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), DIAGRAMS_FOLDER)
        os.makedirs(diagrams_dir, exist_ok=True)
        
        client = OpenAI()
        
        # Generate Mermaid diagram based on description
        if diagram_type == 'mindmap':
            prompt = f"""Create a Mermaid mindmap based on this description:

{description}

Return only the Mermaid code starting with 'mindmap'."""
        else:
            prompt = f"""Create a Mermaid {diagram_type} diagram based on this description:

{description}

Return only the Mermaid code starting with 'flowchart TD' or 'graph TD'."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at creating Mermaid diagrams. Return only valid Mermaid syntax."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600,
            temperature=0.3
        )
        
        mermaid_code = response.choices[0].message.content.strip()
        
        # Clean up the mermaid code
        if mermaid_code.startswith('```mermaid'):
            mermaid_code = mermaid_code.replace('```mermaid', '').replace('```', '').strip()
        elif mermaid_code.startswith('```'):
            mermaid_code = mermaid_code.replace('```', '').strip()
        
        # Save Mermaid file
        import hashlib
        desc_hash = hashlib.md5(description.encode()).hexdigest()[:8]
        mermaid_filename = f"custom_{diagram_type}_{desc_hash}.mmd"
        mermaid_path = os.path.join(diagrams_dir, mermaid_filename)
        
        with open(mermaid_path, 'w') as f:
            f.write(mermaid_code)
        
        # Generate PNG using manus-render-diagram
        png_filename = f"custom_{diagram_type}_{desc_hash}.png"
        png_path = os.path.join(diagrams_dir, png_filename)
        
        try:
            result = subprocess.run(
                ['manus-render-diagram', mermaid_path, png_path],
                capture_output=True,
                text=True,
                check=True
            )
            
            return send_file(png_path, as_attachment=True, download_name=png_filename)
            
        except subprocess.CalledProcessError as e:
            return jsonify({
                'error': f'Diagram generation failed: {e.stderr}',
                'mermaid_code': mermaid_code
            }), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@visualizations_bp.route('/comparison-chart', methods=['POST'])
def create_comparison_chart():
    """Create comparison visualization for multiple papers."""
    try:
        data = request.get_json()
        paper_ids = data.get('paper_ids', [])
        
        if len(paper_ids) < 2:
            return jsonify({'error': 'At least 2 papers required for comparison'}), 400
        
        papers = Paper.query.filter(Paper.id.in_(paper_ids)).all()
        if len(papers) != len(paper_ids):
            return jsonify({'error': 'Some papers not found'}), 404
        
        # Create diagrams directory
        diagrams_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), DIAGRAMS_FOLDER)
        os.makedirs(diagrams_dir, exist_ok=True)
        
        client = OpenAI()
        
        # Prepare comparison data
        comparison_info = []
        for paper in papers:
            comparison_info.append({
                'title': paper.title[:50] + '...' if len(paper.title) > 50 else paper.title,
                'methods': paper.methods_summary[:100] + '...' if paper.methods_summary and len(paper.methods_summary) > 100 else paper.methods_summary or 'N/A'
            })
        
        # Generate comparison diagram
        prompt = f"""Create a Mermaid diagram comparing these research papers:

{comparison_info}

Create a flowchart or graph that shows:
1. Each paper as a node
2. Their main methodologies
3. Relationships or differences between approaches
4. Key distinguishing features

Return only the Mermaid code starting with 'flowchart TD' or 'graph TD'."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at creating Mermaid comparison diagrams. Return only valid Mermaid syntax."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.3
        )
        
        mermaid_code = response.choices[0].message.content.strip()
        
        # Clean up the mermaid code
        if mermaid_code.startswith('```mermaid'):
            mermaid_code = mermaid_code.replace('```mermaid', '').replace('```', '').strip()
        elif mermaid_code.startswith('```'):
            mermaid_code = mermaid_code.replace('```', '').strip()
        
        # Save Mermaid file
        papers_hash = '_'.join(str(pid) for pid in sorted(paper_ids))
        mermaid_filename = f"comparison_{papers_hash}.mmd"
        mermaid_path = os.path.join(diagrams_dir, mermaid_filename)
        
        with open(mermaid_path, 'w') as f:
            f.write(mermaid_code)
        
        # Generate PNG using manus-render-diagram
        png_filename = f"comparison_{papers_hash}.png"
        png_path = os.path.join(diagrams_dir, png_filename)
        
        try:
            result = subprocess.run(
                ['manus-render-diagram', mermaid_path, png_path],
                capture_output=True,
                text=True,
                check=True
            )
            
            return send_file(png_path, as_attachment=True, download_name=png_filename)
            
        except subprocess.CalledProcessError as e:
            return jsonify({
                'error': f'Diagram generation failed: {e.stderr}',
                'mermaid_code': mermaid_code
            }), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

