import React, { useState } from 'react'
import { 
  GitCompare, 
  Plus, 
  X, 
  BarChart3, 
  FileText, 
  Loader2,
  Download,
  ImageIcon
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

const PaperComparison = ({ papers }) => {
  const [selectedPapers, setSelectedPapers] = useState([])
  const [comparison, setComparison] = useState(null)
  const [comparing, setComparing] = useState(false)
  const { toast } = useToast()

  const handlePaperToggle = (paper) => {
    setSelectedPapers(prev => {
      const isSelected = prev.some(p => p.id === paper.id)
      if (isSelected) {
        return prev.filter(p => p.id !== paper.id)
      } else if (prev.length < 5) { // Limit to 5 papers
        return [...prev, paper]
      } else {
        toast({
          title: 'Selection Limit',
          description: 'You can compare up to 5 papers at once.',
          variant: 'destructive'
        })
        return prev
      }
    })
  }

  const runComparison = async () => {
    if (selectedPapers.length < 2) {
      toast({
        title: 'Selection Required',
        description: 'Please select at least 2 papers to compare.',
        variant: 'destructive'
      })
      return
    }

    setComparing(true)
    try {
      const response = await fetch('/api/analysis/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paper_ids: selectedPapers.map(p => p.id)
        })
      })

      if (!response.ok) {
        throw new Error('Comparison failed')
      }

      const data = await response.json()
      setComparison(data.comparison)
      
      toast({
        title: 'Comparison Complete',
        description: 'Papers have been compared successfully.',
      })

    } catch (error) {
      toast({
        title: 'Comparison Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setComparing(false)
    }
  }

  const generateComparisonChart = async () => {
    if (selectedPapers.length < 2) return

    try {
      const response = await fetch('/api/visualizations/comparison-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paper_ids: selectedPapers.map(p => p.id)
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'paper_comparison_chart.png'
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: 'Chart Generated',
          description: 'Comparison chart has been downloaded.',
        })
      }
    } catch (error) {
      toast({
        title: 'Chart Generation Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const clearSelection = () => {
    setSelectedPapers([])
    setComparison(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paper Comparison</h1>
          <p className="text-gray-600 mt-2">
            Compare multiple research papers side by side to identify differences and similarities
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedPapers.length > 0 && (
            <Button variant="outline" onClick={clearSelection}>
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          )}
          {selectedPapers.length >= 2 && (
            <>
              <Button variant="outline" onClick={generateComparisonChart}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Generate Chart
              </Button>
              <Button onClick={runComparison} disabled={comparing}>
                {comparing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare Papers
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Selection Status */}
      {selectedPapers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Papers ({selectedPapers.length}/5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedPapers.map((paper) => (
                <Badge 
                  key={paper.id} 
                  variant="default" 
                  className="px-3 py-1 cursor-pointer hover:bg-red-100 hover:text-red-800"
                  onClick={() => handlePaperToggle(paper)}
                >
                  {paper.title.length > 50 ? paper.title.substring(0, 50) + '...' : paper.title}
                  <X className="h-3 w-3 ml-2" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paper Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Papers to Compare</CardTitle>
          <CardDescription>
            Choose 2-5 papers from your collection to compare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {papers.map((paper) => {
              const isSelected = selectedPapers.some(p => p.id === paper.id)
              const hasAnalysis = paper.summary || paper.methods_summary
              
              return (
                <div
                  key={paper.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePaperToggle(paper)}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      checked={isSelected}
                      onChange={() => handlePaperToggle(paper)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 line-clamp-2">
                        {paper.title}
                      </h4>
                      {paper.authors && paper.authors.length > 0 && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {paper.authors.slice(0, 2).join(', ')}
                          {paper.authors.length > 2 && ` +${paper.authors.length - 2} more`}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={hasAnalysis ? "default" : "secondary"} className="text-xs">
                          {hasAnalysis ? "Analyzed" : "Not Analyzed"}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(paper.upload_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {papers.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No papers available for comparison</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Comparison Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Comparison Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {comparison.analysis}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Aspect</th>
                      {comparison.papers.map((paper) => (
                        <th key={paper.id} className="text-left p-3 font-semibold">
                          {paper.title.length > 30 ? paper.title.substring(0, 30) + '...' : paper.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Models Used */}
                    <tr className="border-b">
                      <td className="p-3 font-medium">Models Used</td>
                      {comparison.papers.map((paper) => (
                        <td key={paper.id} className="p-3">
                          {paper.models_used.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {paper.models_used.slice(0, 3).map((model, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {model}
                                </Badge>
                              ))}
                              {paper.models_used.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{paper.models_used.length - 3} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not specified</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Datasets Used */}
                    <tr className="border-b">
                      <td className="p-3 font-medium">Datasets</td>
                      {comparison.papers.map((paper) => (
                        <td key={paper.id} className="p-3">
                          {paper.datasets_used.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {paper.datasets_used.slice(0, 3).map((dataset, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {dataset}
                                </Badge>
                              ))}
                              {paper.datasets_used.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{paper.datasets_used.length - 3} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not specified</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Key Results */}
                    <tr className="border-b">
                      <td className="p-3 font-medium">Key Results</td>
                      {comparison.papers.map((paper) => (
                        <td key={paper.id} className="p-3">
                          {paper.key_results.length > 0 ? (
                            <ul className="text-sm space-y-1">
                              {paper.key_results.slice(0, 2).map((result, index) => (
                                <li key={index} className="text-gray-700">
                                  • {result.length > 50 ? result.substring(0, 50) + '...' : result}
                                </li>
                              ))}
                              {paper.key_results.length > 2 && (
                                <li className="text-gray-500 italic">
                                  +{paper.key_results.length - 2} more results
                                </li>
                              )}
                            </ul>
                          ) : (
                            <span className="text-gray-400 italic">Not specified</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Innovations */}
                    <tr className="border-b">
                      <td className="p-3 font-medium">Innovations</td>
                      {comparison.papers.map((paper) => (
                        <td key={paper.id} className="p-3">
                          {paper.innovations.length > 0 ? (
                            <ul className="text-sm space-y-1">
                              {paper.innovations.slice(0, 2).map((innovation, index) => (
                                <li key={index} className="text-gray-700">
                                  • {innovation.length > 50 ? innovation.substring(0, 50) + '...' : innovation}
                                </li>
                              ))}
                              {paper.innovations.length > 2 && (
                                <li className="text-gray-500 italic">
                                  +{paper.innovations.length - 2} more innovations
                                </li>
                              )}
                            </ul>
                          ) : (
                            <span className="text-gray-400 italic">Not specified</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Methods Summary */}
                    <tr>
                      <td className="p-3 font-medium">Methods</td>
                      {comparison.papers.map((paper) => (
                        <td key={paper.id} className="p-3">
                          {paper.methods_summary ? (
                            <p className="text-sm text-gray-700">
                              {paper.methods_summary.length > 100 
                                ? paper.methods_summary.substring(0, 100) + '...'
                                : paper.methods_summary
                              }
                            </p>
                          ) : (
                            <span className="text-gray-400 italic">Not analyzed</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {selectedPapers.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>How to Compare Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium mb-2">1. Select Papers</h4>
                <p className="text-sm text-gray-600">
                  Choose 2-5 papers from your collection to compare
                </p>
              </div>
              
              <div className="text-center">
                <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-3">
                  <GitCompare className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium mb-2">2. Run Comparison</h4>
                <p className="text-sm text-gray-600">
                  AI analyzes methodologies, datasets, results, and innovations
                </p>
              </div>
              
              <div className="text-center">
                <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium mb-2">3. View Results</h4>
                <p className="text-sm text-gray-600">
                  Get detailed analysis and visual comparisons
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PaperComparison

