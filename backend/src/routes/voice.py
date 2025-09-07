import os
import json
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from openai import OpenAI
from src.models.paper import Paper, db
from src.utils.llm_analyzer import LLMAnalyzer

voice_bp = Blueprint('voice', __name__)

AUDIO_UPLOAD_FOLDER = 'audio_uploads'
AUDIO_OUTPUT_FOLDER = 'audio_outputs'
ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'm4a', 'ogg', 'flac'}

def allowed_audio_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS

@voice_bp.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    """Convert speech to text using Whisper."""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_audio_file(file.filename):
        return jsonify({'error': 'Invalid audio file format'}), 400
    
    try:
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), AUDIO_UPLOAD_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # Transcribe using Whisper
        client = OpenAI()
        with open(file_path, 'rb') as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        # Clean up uploaded file
        os.remove(file_path)
        
        return jsonify({
            'transcript': transcript.text,
            'message': 'Speech transcribed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voice_bp.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech using OpenAI TTS."""
    try:
        data = request.get_json()
        text = data.get('text', '')
        voice = data.get('voice', 'alloy')  # Default voice
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Limit text length for TTS
        if len(text) > 4096:
            text = text[:4096] + "..."
        
        # Create output directory if it doesn't exist
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), AUDIO_OUTPUT_FOLDER)
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate speech
        client = OpenAI()
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        
        # Save audio file
        audio_filename = f"speech_{hash(text) % 10000}.mp3"
        audio_path = os.path.join(output_dir, audio_filename)
        
        with open(audio_path, 'wb') as f:
            f.write(response.content)
        
        return send_file(audio_path, as_attachment=True, download_name=audio_filename)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voice_bp.route('/paper-to-speech/<int:paper_id>', methods=['POST'])
def paper_to_speech(paper_id):
    """Convert paper summary to speech."""
    try:
        data = request.get_json()
        summary_type = data.get('type', 'easy')  # 'easy', 'methods', 'results', 'limitations'
        voice = data.get('voice', 'alloy')
        
        paper = Paper.query.get_or_404(paper_id)
        
        # Get the appropriate summary
        if summary_type == 'easy':
            text = paper.easy_language_summary
            if not text:
                analyzer = LLMAnalyzer()
                text = analyzer.generate_easy_language_summary(paper.content, paper.title)
                paper.easy_language_summary = text
                db.session.commit()
        elif summary_type == 'methods':
            text = paper.methods_summary
        elif summary_type == 'results':
            text = paper.results_summary
        elif summary_type == 'limitations':
            text = paper.limitations_summary
        else:
            return jsonify({'error': 'Invalid summary type'}), 400
        
        if not text:
            return jsonify({'error': f'No {summary_type} summary available'}), 404
        
        # Add title and introduction
        full_text = f"Research Paper Summary: {paper.title}. {text}"
        
        # Limit text length
        if len(full_text) > 4096:
            full_text = full_text[:4096] + "..."
        
        # Create output directory
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), AUDIO_OUTPUT_FOLDER)
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate speech
        client = OpenAI()
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=full_text
        )
        
        # Save audio file
        audio_filename = f"paper_{paper_id}_{summary_type}_{voice}.mp3"
        audio_path = os.path.join(output_dir, audio_filename)
        
        with open(audio_path, 'wb') as f:
            f.write(response.content)
        
        return send_file(audio_path, as_attachment=True, download_name=audio_filename)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voice_bp.route('/voice-query', methods=['POST'])
def voice_query():
    """Process voice query about papers."""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    if not allowed_audio_file(file.filename):
        return jsonify({'error': 'Invalid audio file format'}), 400
    
    try:
        # Create upload directory
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), AUDIO_UPLOAD_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save and transcribe audio
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        client = OpenAI()
        with open(file_path, 'rb') as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        query_text = transcript.text
        
        # Clean up uploaded file
        os.remove(file_path)
        
        # Process the query (simple implementation - can be enhanced)
        papers = Paper.query.all()
        
        # Use LLM to answer the query based on available papers
        papers_info = []
        for paper in papers[:5]:  # Limit to first 5 papers
            papers_info.append({
                'title': paper.title,
                'abstract': paper.abstract,
                'easy_summary': paper.easy_language_summary
            })
        
        context = f"Available papers: {json.dumps(papers_info, indent=2)}"
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful research assistant. Answer questions about the available research papers."},
                {"role": "user", "content": f"Question: {query_text}\n\nContext: {context}\n\nProvide a helpful answer based on the available papers."}
            ],
            max_tokens=300
        )
        
        answer = response.choices[0].message.content.strip()
        
        return jsonify({
            'query': query_text,
            'answer': answer,
            'message': 'Voice query processed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

