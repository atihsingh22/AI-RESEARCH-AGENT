import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  BarChart3, 
  Trash2,
  Download,
  Calendar,
  Users,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

const PaperList = ({ papers, onSelectPaper, onPaperDeleted, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [filterBy, setFilterBy] = useState('all')
  const { toast } = useToast()

  const filteredPapers = papers
    .filter(paper => {
      const matchesSearch = paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (paper.authors && paper.authors.some(author => 
                             author.toLowerCase().includes(searchTerm.toLowerCase())
                           ))
      
      if (filterBy === 'analyzed') {
        return matchesSearch && (paper.summary || paper.methods_summary)
      }
      if (filterBy === 'unanalyzed') {
        return matchesSearch && !(paper.summary || paper.methods_summary)
      }
      return matchesSearch
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.upload_date) - new Date(a.upload_date)
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      }
      return 0
    })

  const handleDelete = async (paperId, paperTitle) => {
    if (!confirm(`Are you sure you want to delete "${paperTitle}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/papers/${paperId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onPaperDeleted(paperId)
        toast({
          title: 'Paper Deleted',
          description: `"${paperTitle}" has been deleted successfully.`,
        })
      } else {
        throw new Error('Failed to delete paper')
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (paper) => {
    if (paper.summary || paper.methods_summary) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Analyzed</Badge>
    }
    return <Badge variant="secondary">Not Analyzed</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Research Papers</h1>
          <p className="text-gray-600 mt-2">
            Manage and explore your uploaded research papers
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link to="/upload">
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Upload Paper
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search papers by title or author..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
              </select>
              
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Papers</option>
                <option value="analyzed">Analyzed</option>
                <option value="unanalyzed">Not Analyzed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Papers Grid */}
      {filteredPapers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPapers.map((paper) => (
            <Card key={paper.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-tight line-clamp-2">
                      {paper.title}
                    </CardTitle>
                    {paper.authors && paper.authors.length > 0 && (
                      <CardDescription className="mt-1 flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {paper.authors.slice(0, 2).join(', ')}
                        {paper.authors.length > 2 && ` +${paper.authors.length - 2} more`}
                      </CardDescription>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelectPaper(paper)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <Link to={`/analysis/${paper.id}`}>
                        <DropdownMenuItem>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analyze
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(paper.id, paper.title)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {paper.abstract && (
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {paper.abstract}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(paper)}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(paper.upload_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onSelectPaper(paper)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Link to={`/analysis/${paper.id}`} className="flex-1">
                    <Button size="sm" className="w-full">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Analyze
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || filterBy !== 'all' ? 'No papers found' : 'No papers uploaded yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterBy !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first research paper to get started with AI-powered analysis'
              }
            </p>
            {!searchTerm && filterBy === 'all' && (
              <Link to="/upload">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Your First Paper
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {papers.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{papers.length}</p>
                <p className="text-sm text-gray-600">Total Papers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {papers.filter(p => p.summary || p.methods_summary).length}
                </p>
                <p className="text-sm text-gray-600">Analyzed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {papers.filter(p => !(p.summary || p.methods_summary)).length}
                </p>
                <p className="text-sm text-gray-600">Pending Analysis</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{filteredPapers.length}</p>
                <p className="text-sm text-gray-600">Showing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PaperList

