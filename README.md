# AI Research Agent - Advanced Paper Analysis Tool

A comprehensive AI-powered research paper analysis tool with advanced features including deep summarization, cross-paper comparison, voice interface, visual explanations, citation tracing, and multi-paper chat functionality.

## Features

### 🧾 Deep, Section-Wise Summarization
- **Methods Summary**: Detailed analysis of research methodologies
- **Results Summary**: Key findings and experimental results
- **Limitations Summary**: Study limitations and future work suggestions
- **Section-wise Analysis**: Automatic detection and summarization of paper sections

### 🔄 Cross-Paper Comparison
- **Model Comparison**: Compare models and algorithms used across papers
- **Dataset Analysis**: Identify and compare datasets used
- **Results Comparison**: Side-by-side comparison of research outcomes
- **Innovation Tracking**: Highlight unique contributions and innovations

### 🎙️ Voice Interface
- **Speech-to-Text**: Ask questions about papers using voice commands
- **Text-to-Speech**: Get audio responses with natural-sounding voices
- **Paper Audio**: Generate audio summaries of research papers
- **Multiple Voices**: Choose from 6 different voice options

### 💬 Easy Language Mode
- **Simplified Explanations**: Complex research explained in high-school level language
- **Accessible Content**: Make research accessible to broader audiences
- **Audio Support**: Listen to simplified explanations

### 💡 Idea/Insight Generator
- **Future Research**: AI-generated suggestions for future research directions
- **Gap Analysis**: Identify research gaps and opportunities
- **Innovation Ideas**: Creative suggestions based on paper limitations

### 📈 Visual Explanations
- **Methodology Diagrams**: Visual representation of research methods
- **Architecture Diagrams**: System and model architecture visualizations
- **Process Flowcharts**: Step-by-step process visualizations
- **Mind Maps**: Conceptual relationship mapping

### 📌 Citation Tracing + Source Highlighting
- **Citation Extraction**: Automatic identification of citations and references
- **Source Attribution**: Exact sentence/paragraph highlighting for answers
- **Context Preservation**: Maintain citation context and relevance
- **Query with Sources**: Ask questions and get answers with source citations

### 🗃️ Personal Library + Multi-Paper Chat
- **Vector Database**: FAISS-powered semantic search across papers
- **Multi-Paper Queries**: Ask questions spanning multiple papers
- **Relevance Scoring**: AI-powered relevance scoring for search results
- **Cross-Paper Analysis**: Identify patterns and connections across research

## Technology Stack

### Backend
- **Framework**: Flask (Python)
- **AI/ML**: OpenAI GPT-4, Whisper, TTS
- **PDF Processing**: PyPDF2, pdfplumber
- **Vector Database**: FAISS
- **Text Processing**: spaCy, NLTK
- **Database**: SQLite with SQLAlchemy

### Frontend
- **Framework**: React 18
- **UI Components**: shadcn/ui, Tailwind CSS
- **Routing**: React Router
- **Icons**: Lucide React
- **State Management**: React Hooks

### Additional Tools
- **Diagram Generation**: Mermaid.js, PlantUML
- **Audio Processing**: OpenAI Whisper & TTS
- **File Processing**: PDF parsing and text extraction
- **API Integration**: RESTful API design

## Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- OpenAI API Key

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Activate virtual environment**:
   ```bash
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables**:
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export OPENAI_API_BASE="https://api.openai.com/v1"
   ```

5. **Initialize database**:
   ```bash
   python -c "from src.models.user import db; db.create_all()"
   ```

6. **Run the backend server**:
   ```bash
   python src/main.py
   ```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start the development server**:
   ```bash
   pnpm run dev
   ```

The frontend will be available at `http://localhost:5173`

## Usage Guide

### 1. Upload Papers
- Navigate to the "Upload Paper" section
- Drag and drop PDF files or click to browse
- Wait for automatic text extraction and processing

### 2. Analyze Papers
- Select a paper from your collection
- Click "Analyze" to generate comprehensive summaries
- Explore different analysis tabs (Methods, Results, Limitations, etc.)

### 3. Compare Papers
- Go to the "Compare" section
- Select 2-5 papers to compare
- Generate detailed comparison analysis and charts

### 4. Use Voice Interface
- Navigate to "Voice Interface"
- Click the microphone to record voice questions
- Listen to AI responses with text-to-speech
- Generate audio summaries of papers

### 5. Multi-Paper Chat
- Add papers to your library in "Library Chat"
- Ask questions across multiple papers simultaneously
- Get answers with source citations and relevance scores

### 6. Generate Visuals
- In the analysis section, use the "Visuals" tab
- Generate methodology diagrams, flowcharts, and mind maps
- Download visualizations for presentations or reports

## API Endpoints

### Papers
- `POST /api/papers/upload` - Upload a new paper
- `GET /api/papers/list` - List all papers
- `GET /api/papers/{id}` - Get paper details
- `DELETE /api/papers/{id}` - Delete a paper

### Analysis
- `POST /api/analysis/summarize/{id}` - Generate paper summary
- `POST /api/analysis/compare` - Compare multiple papers
- `POST /api/analysis/easy-language/{id}` - Generate easy language summary

### Voice Interface
- `POST /api/voice/speech-to-text` - Convert speech to text
- `POST /api/voice/text-to-speech` - Convert text to speech
- `POST /api/voice/voice-query` - Process voice queries
- `POST /api/voice/paper-to-speech/{id}` - Generate paper audio

### Visualizations
- `POST /api/visualizations/generate-diagram/{id}` - Generate diagrams
- `POST /api/visualizations/comparison-chart` - Generate comparison charts

### Citations
- `POST /api/citations/extract/{id}` - Extract citations
- `POST /api/citations/query-with-sources/{id}` - Query with source highlighting

### Library
- `POST /api/library/bulk-add` - Add papers to library
- `POST /api/library/chat` - Multi-paper chat
- `POST /api/library/search` - Search library
- `GET /api/library/stats` - Get library statistics

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_API_BASE`: OpenAI API base URL
- `FLASK_ENV`: Flask environment (development/production)
- `DATABASE_URL`: Database connection string (optional)

### Customization
- **Voice Options**: Modify voice settings in `VoiceInterface.jsx`
- **Analysis Prompts**: Customize AI prompts in `llm_analyzer.py`
- **UI Theme**: Adjust colors and styling in `App.css`
- **Vector Database**: Configure FAISS settings in `vector_store.py`

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**:
   - Ensure your API key is valid and has sufficient credits
   - Check API rate limits and quotas

2. **PDF Processing Errors**:
   - Ensure PDFs are not password-protected
   - Check file size limits (50MB max)

3. **Voice Interface Issues**:
   - Grant microphone permissions in your browser
   - Ensure stable internet connection for API calls

4. **Frontend Build Errors**:
   - Clear node_modules and reinstall dependencies
   - Check Node.js version compatibility

### Performance Optimization

1. **Large Libraries**:
   - Consider using more powerful vector database for >1000 papers
   - Implement pagination for large paper collections

2. **API Response Times**:
   - Cache frequently accessed summaries
   - Implement background processing for long operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For issues, questions, or feature requests, please create an issue in the repository or contact the development team.

## Acknowledgments

- OpenAI for GPT-4, Whisper, and TTS APIs
- The open-source community for various libraries and tools
- Research community for inspiration and feedback

---

**AI Research Agent** - Making research analysis accessible, comprehensive, and interactive.

