import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Upload, 
  FileText, 
  BarChart3, 
  GitCompare, 
  Mic, 
  Library,
  Menu,
  X,
  Brain
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const Sidebar = ({ isOpen, onToggle, papers, selectedPaper, onSelectPaper }) => {
  const location = useLocation()

  const navigationItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/upload', icon: Upload, label: 'Upload Paper' },
    { path: '/papers', icon: FileText, label: 'Papers' },
    { path: '/analysis', icon: BarChart3, label: 'Analysis' },
    { path: '/comparison', icon: GitCompare, label: 'Compare' },
    { path: '/voice', icon: Mic, label: 'Voice Interface' },
    { path: '/library', icon: Library, label: 'Library Chat' },
  ]

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 ${
      isOpen ? 'w-64' : 'w-16'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {isOpen && (
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">AI Research</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Recent Papers */}
      {isOpen && papers.length > 0 && (
        <>
          <Separator className="mx-4" />
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Papers</h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {papers.slice(0, 10).map((paper) => (
                  <button
                    key={paper.id}
                    onClick={() => onSelectPaper(paper)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                      selectedPaper && selectedPaper.id === paper.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium truncate">{paper.title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {paper.authors && paper.authors.length > 0 
                        ? paper.authors.slice(0, 2).join(', ')
                        : 'Unknown authors'
                      }
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Footer */}
      {isOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            AI Research Agent v1.0
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar

