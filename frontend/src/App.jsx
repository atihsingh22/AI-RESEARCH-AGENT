import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import PaperUpload from './components/PaperUpload'
import PaperList from './components/PaperList'
import PaperAnalysis from './components/PaperAnalysis'
import PaperComparison from './components/PaperComparison'
import VoiceInterface from './components/VoiceInterface'
import LibraryChat from './components/LibraryChat'
import './App.css'

function App() {
  const [papers, setPapers] = useState([])
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Fetch papers on component mount
  useEffect(() => {
    fetchPapers()
  }, [])

  const fetchPapers = async () => {
    try {
      const response = await fetch('/api/papers/list')
      if (response.ok) {
        const data = await response.json()
        setPapers(data.papers)
      }
    } catch (error) {
      console.error('Error fetching papers:', error)
    }
  }

  const handlePaperUploaded = (newPaper) => {
    setPapers(prev => [...prev, newPaper])
  }

  const handlePaperDeleted = (paperId) => {
    setPapers(prev => prev.filter(p => p.id !== paperId))
    if (selectedPaper && selectedPaper.id === paperId) {
      setSelectedPaper(null)
    }
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          papers={papers}
          selectedPaper={selectedPaper}
          onSelectPaper={setSelectedPaper}
        />
        
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <Dashboard 
                  papers={papers}
                  selectedPaper={selectedPaper}
                  onSelectPaper={setSelectedPaper}
                />
              } 
            />
            <Route 
              path="/upload" 
              element={
                <PaperUpload 
                  onPaperUploaded={handlePaperUploaded}
                />
              } 
            />
            <Route 
              path="/papers" 
              element={
                <PaperList 
                  papers={papers}
                  onSelectPaper={setSelectedPaper}
                  onPaperDeleted={handlePaperDeleted}
                  onRefresh={fetchPapers}
                />
              } 
            />
            <Route 
              path="/analysis/:paperId?" 
              element={
                <PaperAnalysis 
                  selectedPaper={selectedPaper}
                  onSelectPaper={setSelectedPaper}
                  papers={papers}
                />
              } 
            />
            <Route 
              path="/comparison" 
              element={
                <PaperComparison 
                  papers={papers}
                />
              } 
            />
            <Route 
              path="/voice" 
              element={
                <VoiceInterface 
                  papers={papers}
                  selectedPaper={selectedPaper}
                />
              } 
            />
            <Route 
              path="/library" 
              element={
                <LibraryChat 
                  papers={papers}
                />
              } 
            />
          </Routes>
        </main>
        
        <Toaster />
      </div>
    </Router>
  )
}

export default App

