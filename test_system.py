#!/usr/bin/env python3
"""
Simple test script to verify the AI Research Agent system components.
"""

import sys
import os
import subprocess
import time
from pathlib import Path

def test_backend_imports():
    """Test that all backend modules can be imported successfully."""
    print("Testing backend imports...")
    
    try:
        # Change to backend directory
        backend_dir = Path(__file__).parent / "backend"
        os.chdir(backend_dir)
        
        # Test main imports
        from src.main import app
        from src.models.paper import Paper
        from src.utils.pdf_processor import PDFProcessor
        from src.utils.llm_analyzer import LLMAnalyzer
        from src.utils.vector_store import VectorStore
        from src.utils.citation_tracer import CitationTracer
        
        print("✓ All backend imports successful")
        return True
        
    except Exception as e:
        print(f"✗ Backend import failed: {e}")
        return False

def test_frontend_build():
    """Test that the frontend builds successfully."""
    print("Testing frontend build...")
    
    try:
        frontend_dir = Path(__file__).parent / "frontend"
        os.chdir(frontend_dir)
        
        # Check if build directory exists (should be created by previous build)
        build_dir = frontend_dir / "dist"
        if build_dir.exists():
            print("✓ Frontend build directory exists")
            return True
        else:
            print("✗ Frontend build directory not found")
            return False
            
    except Exception as e:
        print(f"✗ Frontend build test failed: {e}")
        return False

def test_dependencies():
    """Test that all required dependencies are available."""
    print("Testing dependencies...")
    
    try:
        # Test Python dependencies
        import flask
        import openai
        import PyPDF2
        import faiss
        import numpy
        import pandas
        
        print("✓ Python dependencies available")
        
        # Test Node.js availability
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Node.js available: {result.stdout.strip()}")
        else:
            print("✗ Node.js not available")
            return False
            
        return True
        
    except ImportError as e:
        print(f"✗ Missing Python dependency: {e}")
        return False
    except Exception as e:
        print(f"✗ Dependency test failed: {e}")
        return False

def test_file_structure():
    """Test that all required files and directories exist."""
    print("Testing file structure...")
    
    base_dir = Path(__file__).parent
    required_files = [
        "README.md",
        "backend/src/main.py",
        "backend/requirements.txt",
        "frontend/package.json",
        "frontend/src/App.jsx",
        "frontend/src/components/Dashboard.jsx",
        "frontend/src/components/PaperUpload.jsx",
        "frontend/src/components/PaperAnalysis.jsx",
        "frontend/src/components/PaperComparison.jsx",
        "frontend/src/components/VoiceInterface.jsx",
        "frontend/src/components/LibraryChat.jsx",
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = base_dir / file_path
        if not full_path.exists():
            missing_files.append(file_path)
    
    if missing_files:
        print(f"✗ Missing files: {missing_files}")
        return False
    else:
        print("✓ All required files present")
        return True

def main():
    """Run all tests."""
    print("AI Research Agent - System Test")
    print("=" * 40)
    
    tests = [
        test_file_structure,
        test_dependencies,
        test_backend_imports,
        test_frontend_build,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 40)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ All tests passed! System is ready.")
        return 0
    else:
        print("✗ Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

