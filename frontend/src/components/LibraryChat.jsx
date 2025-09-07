import React, { useState, useEffect, useRef } from 'react'
import { 
  Library, 
  MessageCircle, 
  Send, 
  Plus, 
  Search, 
  Loader2,
  BookOpen,
  Users,
  BarChart3,
  X,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'

const LibraryChat = ({ papers }) => {
  const [libraryPapers, setLibraryPapers] = useState([])
  const [libraryStats, setLibraryStats] = useState(null)
  const [selectedPapers, setSelectedPapers] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [addingToLibrary, setAddingToLibrary] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  
  const chatEndRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchLibraryStats()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory])

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchLibraryStats = async () => {
    try {
      const response = await fetch('/api/library/stats')
      if (response.ok) {
        const data = await response.json()
        setLibraryStats(data.stats)
        setLibraryPapers(data.papers)
      }
    } catch (error) {
      console.error('Error fetching library stats:', error)
    }
  }

  const addToLibrary = async (paperIds) => {
    setAddingToLibrary(true)
    try {
      const response = await fetch('/api/library/bulk-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paper_ids: paperIds })
      })

      if (response.ok) {
        const data = await response.json()
        await fetchLibraryStats()
        toast({
          title: 'Papers Added',
          description: `${data.added_papers.length} papers added to library successfully.`,
        })
      } else {
        throw new Error('Failed to add papers to library')
      }
    } catch (error) {
      toast({
        title: 'Add Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setAddingToLibrary(false)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/library/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: currentMessage,
          paper_ids: selectedPapers.length > 0 ? selectedPapers : null
        })
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const data = await response.json()
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.answer,
        sources: data.sources,
        papers_searched: data.papers_searched,
        timestamp: new Date()
      }

      setChatHistory(prev => [...prev, aiMessage])

    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const searchLibrary = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch('/api/library/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results)
      } else {
        throw new Error('Search failed')
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSearching(false)
    }
  }

  const handlePaperSelection = (paperId) => {
    setSelectedPapers(prev => {
      if (prev.includes(paperId)) {
        return prev.filter(id => id !== paperId)
      } else {
        return [...prev, paperId]
      }
    })
  }

  const clearSelection = () => {
    setSelectedPapers([])
  }

  const clearChat = () => {
    setChatHistory([])
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const papersNotInLibrary = papers.filter(paper => 
    !libraryPapers.some(libPaper => libPaper.id === paper.id)
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Library Chat</h1>
          <p className="text-gray-600 mt-2">
            Chat with multiple papers simultaneously using AI-powered vector search
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {chatHistory.length > 0 && (
            <Button variant="outline" onClick={clearChat}>
              Clear Chat
            </Button>
          )}
        </div>
      </div>

      {/* Library Stats */}
      {libraryStats && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{libraryStats.total_papers}</p>
                <p className="text-sm text-gray-600">Papers in Library</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{libraryStats.total_documents}</p>
                <p className="text-sm text-gray-600">Document Chunks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{selectedPapers.length}</p>
                <p className="text-sm text-gray-600">Selected Papers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{chatHistory.length}</p>
                <p className="text-sm text-gray-600">Chat Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Library Management */}
        <div className="space-y-6">
          {/* Add Papers to Library */}
          {papersNotInLibrary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Add to Library
                </CardTitle>
                <CardDescription>
                  Add papers to enable multi-paper chat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {papersNotInLibrary.slice(0, 5).map((paper) => (
                    <div key={paper.id} className="flex items-start space-x-3 p-2 border rounded">
                      <Checkbox
                        id={`add-${paper.id}`}
                        onChange={(checked) => {
                          const checkbox = document.getElementById(`add-${paper.id}`)
                          if (checked) {
                            checkbox.dataset.selected = 'true'
                          } else {
                            checkbox.dataset.selected = 'false'
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{paper.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(paper.upload_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    onClick={() => {
                      const selectedIds = []
                      papersNotInLibrary.forEach(paper => {
                        const checkbox = document.getElementById(`add-${paper.id}`)
                        if (checkbox?.dataset.selected === 'true') {
                          selectedIds.push(paper.id)
                        }
                      })
                      if (selectedIds.length > 0) {
                        addToLibrary(selectedIds)
                      }
                    }}
                    disabled={addingToLibrary}
                    className="w-full"
                  >
                    {addingToLibrary ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Selected
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paper Selection */}
          {libraryPapers.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Select Papers</CardTitle>
                  <CardDescription>
                    Choose specific papers to chat with
                  </CardDescription>
                </div>
                {selectedPapers.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {libraryPapers.map((paper) => (
                      <div
                        key={paper.id}
                        className={`flex items-start space-x-3 p-2 rounded cursor-pointer transition-colors ${
                          selectedPapers.includes(paper.id) 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handlePaperSelection(paper.id)}
                      >
                        <Checkbox
                          checked={selectedPapers.includes(paper.id)}
                          onChange={() => handlePaperSelection(paper.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{paper.title}</p>
                          <p className="text-xs text-gray-500">
                            {paper.authors?.slice(0, 2).join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="mt-3 text-xs text-gray-500 text-center">
                  {selectedPapers.length === 0 
                    ? 'No papers selected (will search all papers)'
                    : `${selectedPapers.length} papers selected`
                  }
                </div>
              </CardContent>
            </Card>
          )}

          {/* Library Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Search Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search across all papers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchLibrary()}
                />
                <Button onClick={searchLibrary} disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Search Results:</h4>
                  <ScrollArea className="h-32">
                    {searchResults.map((result, index) => (
                      <div key={index} className="p-2 text-xs bg-gray-50 rounded mb-2">
                        <p className="font-medium">{result.title}</p>
                        <p className="text-gray-600 line-clamp-2">{result.content}</p>
                        <Badge variant="outline" className="mt-1">
                          Score: {result.score.toFixed(3)}
                        </Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Multi-Paper Chat
              </CardTitle>
              <CardDescription>
                Ask questions across {selectedPapers.length > 0 ? `${selectedPapers.length} selected papers` : 'all papers in library'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* Chat History */}
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-4">
                  {chatHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Start a conversation with your research papers</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Try asking: "What are the main methodologies used?" or "Compare the results across papers"
                      </p>
                    </div>
                  ) : (
                    chatHistory.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-blue-600 text-white'
                              : message.type === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-medium mb-2">Sources:</p>
                              <div className="space-y-1">
                                {message.sources.slice(0, 3).map((source, index) => (
                                  <div key={index} className="text-xs">
                                    <p className="font-medium">{source.title}</p>
                                    <p className="text-gray-600">{source.excerpt}</p>
                                    <Badge variant="outline" className="mt-1">
                                      Relevance: {source.relevance_score.toFixed(3)}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs opacity-70 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask a question about your papers..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={2}
                  className="flex-1"
                  disabled={isLoading || libraryStats?.total_papers === 0}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !currentMessage.trim() || libraryStats?.total_papers === 0}
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {libraryStats?.total_papers === 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Add papers to library to start chatting
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Paper Chat Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto">
                <Library className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium">Vector Search</h4>
              <p className="text-sm text-gray-600">
                AI-powered semantic search across all papers in your library
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium">Cross-Paper Chat</h4>
              <p className="text-sm text-gray-600">
                Ask questions that span multiple papers simultaneously
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium">Source Attribution</h4>
              <p className="text-sm text-gray-600">
                Get answers with citations and relevance scores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LibraryChat

