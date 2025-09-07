import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  BarChart3, 
  Upload, 
  TrendingUp,
  Clock,
  Users,
  BookOpen,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const Dashboard = ({ papers, selectedPaper, onSelectPaper }) => {
  const [libraryStats, setLibraryStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    fetchLibraryStats()
  }, [])

  const fetchLibraryStats = async () => {
    try {
      const response = await fetch('/api/library/stats')
      if (response.ok) {
        const data = await response.json()
        setLibraryStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching library stats:', error)
    }
  }

  const getRecentPapers = () => {
    return papers
      .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))
      .slice(0, 5)
  }

  const getAnalyzedPapers = () => {
    return papers.filter(paper => paper.summary || paper.methods_summary)
  }

  const stats = [
    {
      title: 'Total Papers',
      value: papers.length,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Analyzed Papers',
      value: getAnalyzedPapers().length,
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'In Library',
      value: libraryStats?.total_papers || 0,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Vector Documents',
      value: libraryStats?.total_documents || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const quickActions = [
    {
      title: 'Upload New Paper',
      description: 'Add a new research paper to analyze',
      icon: Upload,
      link: '/upload',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Compare Papers',
      description: 'Compare multiple papers side by side',
      icon: BarChart3,
      link: '/comparison',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Voice Interface',
      description: 'Interact with papers using voice',
      icon: Users,
      link: '/voice',
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome to your AI Research Agent. Analyze, compare, and explore research papers with advanced AI capabilities.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link key={index} to={action.link}>
                  <div className={`p-6 rounded-lg text-white ${action.color} transition-colors group`}>
                    <Icon className="h-8 w-8 mb-3" />
                    <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                    <p className="text-sm opacity-90 mb-4">{action.description}</p>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Papers and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Papers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Papers</CardTitle>
              <CardDescription>
                Latest uploaded research papers
              </CardDescription>
            </div>
            <Link to="/papers">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getRecentPapers().length > 0 ? (
                getRecentPapers().map((paper) => (
                  <div 
                    key={paper.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onSelectPaper(paper)}
                  >
                    <FileText className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {paper.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {paper.authors && paper.authors.length > 0 
                          ? paper.authors.slice(0, 2).join(', ')
                          : 'Unknown authors'
                        }
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(paper.upload_date).toLocaleDateString()}
                        </span>
                        {(paper.summary || paper.methods_summary) && (
                          <Badge variant="secondary" className="text-xs">
                            Analyzed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No papers uploaded yet</p>
                  <Link to="/upload">
                    <Button className="mt-2" size="sm">
                      Upload Your First Paper
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Available Features</CardTitle>
            <CardDescription>
              Explore what you can do with your papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Deep Analysis</p>
                  <p className="text-xs text-gray-500">Section-wise summaries, methods, results, and limitations</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cross-Paper Comparison</p>
                  <p className="text-xs text-gray-500">Compare models, datasets, and results across papers</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Voice Interface</p>
                  <p className="text-xs text-gray-500">Speech-to-text queries and text-to-speech responses</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Multi-Paper Chat</p>
                  <p className="text-xs text-gray-500">Query across multiple papers simultaneously</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard

