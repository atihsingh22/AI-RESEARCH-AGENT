import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  FileText, 
  BarChart3, 
  Loader2, 
  Brain, 
  BookOpen, 
  Lightbulb,
  Download,
  Volume2,
  Image as ImageIcon,
  Search,
  Quote
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

const PaperAnalysis = ({ selectedPaper, onSelectPaper, papers }) => {
  const { paperId } = useParams()
  const [paper, setPaper] = useState(selectedPaper)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [citations, setCitations] = useState(null)
  const [queryText, setQueryText] = useState('')
  const [queryResult, setQueryResult] = useState(null)
  const [querying, setQuerying] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (paperId && (!paper || paper.id !== parseInt(paperId))) {
      const foundPaper = papers.find(p => p.id === parseInt(paperId))
      if (foundPaper) {
        setPaper(foundPaper)
        onSelectPaper(foundPaper)
      }
    }
  }, [paperId, papers, paper, onSelectPaper])

  useEffect(() => {
    if (paper) {
      // Check if analysis already exists
      if (paper.summary || paper.methods_summary) {
        setAnalysis({
          section_summaries: paper.summary ? JSON.parse(paper.summary) : {},
          methods_summary: paper.methods_summary,
          results_summary: paper.results_summary,
          limitations_summary: paper.limitations_summary,
          easy_language_summary: paper.easy_language_summary,
          research_ideas: paper.research_ideas ? JSON.parse(paper.research_ideas) : [],
          metadata: {
            models_used: paper.models_used ? JSON.parse(paper.models_used) : [],
            datasets_used: paper.datasets_used ? JSON.parse(paper.datasets_used) : [],
            key_results: paper.key_results ? JSON.parse(paper.key_results) : [],
            innovations: paper.innovations ? JSON.parse(paper.innovations) : []
          }
        })
      }
    }
  }, [paper])

  const runAnalysis = async () => {
    if (!paper) return

    setAnalyzing(true)
    try {
      const response = await fetch(`/api/analysis/summarize/${paper.id}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
      
      toast({
        title: 'Analysis Complete',
        description: 'Paper has been analyzed successfully.',
      })

    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const extractCitations = async () => {
    if (!paper) return

    try {
      const response = await fetch(`/api/citations/extract/${paper.id}`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setCitations(data)
      }
    } catch (error) {
      console.error('Error extracting citations:', error)
    }
  }

  const queryWithSources = async () => {
    if (!paper || !queryText.trim()) return

    setQuerying(true)
    try {
      const response = await fetch(`/api/citations/query-with-sources/${paper.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: queryText })
      })

      if (response.ok) {
        const data = await response.json()
        setQueryResult(data)
      } else {
        throw new Error('Query failed')
      }
    } catch (error) {
      toast({
        title: 'Query Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setQuerying(false)
    }
  }

  const generateDiagram = async (type) => {
    if (!paper) return

    try {
      const response = await fetch(`/api/visualizations/generate-diagram/${paper.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${paper.title}_${type}_diagram.png`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: 'Diagram Generated',
          description: `${type} diagram has been downloaded.`,
        })
      }
    } catch (error) {
      toast({
        title: 'Diagram Generation Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const generateSpeech = async (type) => {
    if (!paper) return

    try {
      const response = await fetch(`/api/voice/paper-to-speech/${paper.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, voice: 'alloy' })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${paper.title}_${type}_summary.mp3`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: 'Audio Generated',
          description: `${type} summary audio has been downloaded.`,
        })
      }
    } catch (error) {
      toast({
        title: 'Audio Generation Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  if (!paper) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Paper Selected</h3>
            <p className="text-gray-600">Select a paper from the sidebar to start analysis</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            {paper.title}
          </h1>
          {paper.authors && paper.authors.length > 0 && (
            <p className="text-gray-600 mt-2">
              By {paper.authors.join(', ')}
            </p>
          )}
          <div className="flex items-center space-x-4 mt-3">
            <Badge variant="outline">
              Uploaded: {new Date(paper.upload_date).toLocaleDateString()}
            </Badge>
            {analysis && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                Analyzed
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!analysis ? (
            <Button onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Re-analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Re-analyze
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Abstract */}
      {paper.abstract && (
        <Card>
          <CardHeader>
            <CardTitle>Abstract</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{paper.abstract}</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis ? (
        <Tabs defaultValue="summaries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="summaries">Summaries</TabsTrigger>
            <TabsTrigger value="easy">Easy Mode</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="ideas">Ideas</TabsTrigger>
            <TabsTrigger value="visuals">Visuals</TabsTrigger>
            <TabsTrigger value="citations">Citations</TabsTrigger>
          </TabsList>

          <TabsContent value="summaries" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Methods Summary */}
              {analysis.methods_summary && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Methods & Methodology
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateSpeech('methods')}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{analysis.methods_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Results Summary */}
              {analysis.results_summary && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Results & Findings
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateSpeech('results')}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{analysis.results_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Limitations Summary */}
              {analysis.limitations_summary && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Limitations & Future Work
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateSpeech('limitations')}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{analysis.limitations_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Section Summaries */}
              {analysis.section_summaries && Object.keys(analysis.section_summaries).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Section-wise Summaries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analysis.section_summaries).map(([section, summary]) => (
                        <div key={section} className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold text-gray-900 capitalize">{section}</h4>
                          <p className="text-gray-700 text-sm mt-1">{summary}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="easy" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Easy Language Explanation
                  </CardTitle>
                  <CardDescription>
                    Research explained in simple, high-school level language
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateSpeech('easy')}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {analysis.easy_language_summary ? (
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {analysis.easy_language_summary}
                  </p>
                ) : (
                  <p className="text-gray-500 italic">
                    Easy language summary not available. Run analysis to generate.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Models Used */}
              <Card>
                <CardHeader>
                  <CardTitle>Models & Algorithms</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.metadata.models_used.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {analysis.metadata.models_used.map((model, index) => (
                        <Badge key={index} variant="outline">{model}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No models identified</p>
                  )}
                </CardContent>
              </Card>

              {/* Datasets Used */}
              <Card>
                <CardHeader>
                  <CardTitle>Datasets</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.metadata.datasets_used.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {analysis.metadata.datasets_used.map((dataset, index) => (
                        <Badge key={index} variant="outline">{dataset}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No datasets identified</p>
                  )}
                </CardContent>
              </Card>

              {/* Key Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.metadata.key_results.length > 0 ? (
                    <ul className="space-y-2">
                      {analysis.metadata.key_results.map((result, index) => (
                        <li key={index} className="text-gray-700">• {result}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">No key results identified</p>
                  )}
                </CardContent>
              </Card>

              {/* Innovations */}
              <Card>
                <CardHeader>
                  <CardTitle>Innovations & Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.metadata.innovations.length > 0 ? (
                    <ul className="space-y-2">
                      {analysis.metadata.innovations.map((innovation, index) => (
                        <li key={index} className="text-gray-700">• {innovation}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">No innovations identified</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ideas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Research Ideas & Future Directions
                </CardTitle>
                <CardDescription>
                  AI-generated suggestions for future research based on this paper
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.research_ideas.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.research_ideas.map((idea, index) => (
                      <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-gray-800">{idea}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    No research ideas generated. Run analysis to generate suggestions.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visuals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Visual Explanations
                </CardTitle>
                <CardDescription>
                  Generate diagrams and flowcharts to visualize the research
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => generateDiagram('methodology')}
                    className="h-20 flex-col"
                  >
                    <BarChart3 className="h-6 w-6 mb-2" />
                    Methodology
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => generateDiagram('architecture')}
                    className="h-20 flex-col"
                  >
                    <ImageIcon className="h-6 w-6 mb-2" />
                    Architecture
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => generateDiagram('flowchart')}
                    className="h-20 flex-col"
                  >
                    <BarChart3 className="h-6 w-6 mb-2" />
                    Process Flow
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => generateDiagram('mindmap')}
                    className="h-20 flex-col"
                  >
                    <Brain className="h-6 w-6 mb-2" />
                    Mind Map
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="citations" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Quote className="h-5 w-5 mr-2" />
                    Citation Analysis
                  </CardTitle>
                  <CardDescription>
                    Extract and trace citations with source highlighting
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={extractCitations}>
                  Extract Citations
                </Button>
              </CardHeader>
              <CardContent>
                {/* Query with Sources */}
                <div className="space-y-4 mb-6">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask a question about this paper and get answers with source citations..."
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={queryWithSources}
                      disabled={querying || !queryText.trim()}
                    >
                      {querying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {queryResult && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Answer:</h4>
                      <p className="text-gray-700 mb-4">{queryResult.answer}</p>
                      
                      {queryResult.relevant_citations.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Supporting Citations:</h5>
                          <div className="space-y-2">
                            {queryResult.relevant_citations.map((citation, index) => (
                              <div key={index} className="text-sm p-2 bg-white rounded border">
                                <p className="font-mono text-xs text-blue-600 mb-1">
                                  {citation.citation.text}
                                </p>
                                <p className="text-gray-600">{citation.context}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Citations List */}
                {citations && (
                  <div>
                    <h4 className="font-semibold mb-4">
                      Found {citations.total_citations} citations and {citations.total_references} references
                    </h4>
                    
                    {citations.citations.slice(0, 10).map((citation, index) => (
                      <div key={index} className="mb-4 p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {citation.citation.text}
                          </code>
                          <Badge variant="outline">{citation.citation.type}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{citation.context}</p>
                        {citation.source && citation.source.full_text && (
                          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            <strong>Source:</strong> {citation.source.full_text.substring(0, 200)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Analysis</h3>
            <p className="text-gray-600 mb-6">
              Click "Run Analysis" to generate comprehensive AI-powered insights for this paper
            </p>
            <Button onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PaperAnalysis

