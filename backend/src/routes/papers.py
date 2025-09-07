import os
import json
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from src.models.paper import Paper, db
from src.utils.pdf_processor import PDFProcessor

papers_bp = Blueprint('papers', __name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@papers_bp.route('/upload', methods=['POST'])
def upload_paper():
    """Upload and process a PDF paper."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Only PDF files are allowed'}), 400
    
    try:
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(os.path.dirname(current_app.instance_path), UPLOAD_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # Process PDF
        processor = PDFProcessor()
        result = processor.process_pdf(file_path)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 500
        
        # Save to database
        paper = Paper(
            title=result['title'],
            authors=json.dumps(result['authors']),
            abstract=result['abstract'],
            content=result['text'],
            sections=json.dumps(result['sections']),
            filename=filename,
            file_path=file_path
        )
        
        db.session.add(paper)
        db.session.commit()
        
        return jsonify({
            'message': 'Paper uploaded and processed successfully',
            'paper_id': paper.id,
            'paper': paper.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@papers_bp.route('/list', methods=['GET'])
def list_papers():
    """Get list of all uploaded papers."""
    try:
        papers = Paper.query.all()
        return jsonify({
            'papers': [paper.to_dict() for paper in papers]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@papers_bp.route('/<int:paper_id>', methods=['GET'])
def get_paper(paper_id):
    """Get details of a specific paper."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        return jsonify({
            'paper': paper.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@papers_bp.route('/<int:paper_id>', methods=['DELETE'])
def delete_paper(paper_id):
    """Delete a paper."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        
        # Delete file if it exists
        if os.path.exists(paper.file_path):
            os.remove(paper.file_path)
        
        db.session.delete(paper)
        db.session.commit()
        
        return jsonify({'message': 'Paper deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@papers_bp.route('/<int:paper_id>/sections', methods=['GET'])
def get_paper_sections(paper_id):
    """Get sections of a specific paper."""
    try:
        paper = Paper.query.get_or_404(paper_id)
        sections = json.loads(paper.sections) if paper.sections else {}
        
        return jsonify({
            'paper_id': paper_id,
            'title': paper.title,
            'sections': sections
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

