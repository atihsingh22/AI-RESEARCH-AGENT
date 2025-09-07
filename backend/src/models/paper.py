from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Paper(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    authors = db.Column(db.Text)  # JSON string of authors list
    abstract = db.Column(db.Text)
    content = db.Column(db.Text)  # Full extracted text
    sections = db.Column(db.Text)  # JSON string of sections
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Analysis results
    summary = db.Column(db.Text)
    methods_summary = db.Column(db.Text)
    results_summary = db.Column(db.Text)
    limitations_summary = db.Column(db.Text)
    easy_language_summary = db.Column(db.Text)
    research_ideas = db.Column(db.Text)  # JSON string of ideas
    
    # Metadata
    models_used = db.Column(db.Text)  # JSON string
    datasets_used = db.Column(db.Text)  # JSON string
    key_results = db.Column(db.Text)  # JSON string
    innovations = db.Column(db.Text)  # JSON string
    
    def __repr__(self):
        return f'<Paper {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'authors': json.loads(self.authors) if self.authors else [],
            'abstract': self.abstract,
            'filename': self.filename,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None,
            'summary': self.summary,
            'methods_summary': self.methods_summary,
            'results_summary': self.results_summary,
            'limitations_summary': self.limitations_summary,
            'easy_language_summary': self.easy_language_summary,
            'research_ideas': json.loads(self.research_ideas) if self.research_ideas else [],
            'models_used': json.loads(self.models_used) if self.models_used else [],
            'datasets_used': json.loads(self.datasets_used) if self.datasets_used else [],
            'key_results': json.loads(self.key_results) if self.key_results else [],
            'innovations': json.loads(self.innovations) if self.innovations else []
        }

