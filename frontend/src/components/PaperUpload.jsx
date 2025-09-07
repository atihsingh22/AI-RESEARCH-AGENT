import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

const PaperUpload = ({ onPaperUploaded }) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedPaper, setUploadedPaper] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file')
      return
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File size must be less than 50MB')
      return
    }

    setError(null)
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/papers/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      setUploadedPaper(data.paper)
      onPaperUploaded(data.paper)
      
      toast({
        title: 'Upload Successful',
        description: `"${data.paper.title}" has been uploaded and processed.`,
      })

    } catch (error) {
      setError(error.message)
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setUploadedPaper(null)
    setError(null)
    setUploadProgress(0)
  }

  const analyzeNow = () => {
    if (uploadedPaper) {
      navigate(`/analysis/${uploadedPaper.id}`)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Research Paper</h1>
        <p className="text-gray-600 mt-2">
          Upload a PDF research paper to analyze with AI-powered tools
        </p>
      </div>

      {/* Upload Area */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Select PDF File</CardTitle>
          <CardDescription>
            Drag and drop a PDF file or click to browse. Maximum file size: 50MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!uploadedPaper ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              
              <div className="space-y-4">
                {uploading ? (
                  <>
                    <Loader2 className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">
                        Processing your paper...
                      </p>
                      <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                      <p className="text-sm text-gray-500">
                        {uploadProgress < 90 ? 'Uploading...' : 'Extracting text and analyzing...'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drop your PDF here, or click to browse
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports PDF files up to 50MB
                      </p>
                    </div>
                    <Button variant="outline" className="mt-4">
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Upload Successful!
                </h3>
                <p className="text-gray-600 mt-1">
                  Your paper has been processed and is ready for analysis
                </p>
              </div>
              
              <Card className="max-w-md mx-auto text-left">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {uploadedPaper.title || uploadedPaper.filename}
                      </p>
                      {uploadedPaper.authors && uploadedPaper.authors.length > 0 && (
                        <p className="text-sm text-gray-500 truncate">
                          {uploadedPaper.authors.slice(0, 3).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Uploaded: {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center space-x-3">
                <Button onClick={analyzeNow} className="bg-blue-600 hover:bg-blue-700">
                  Analyze Now
                </Button>
                <Button variant="outline" onClick={resetUpload}>
                  Upload Another
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle>What happens after upload?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium">Text Extraction</h4>
              <p className="text-sm text-gray-600">
                Extract and parse content from your PDF
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium">Section Detection</h4>
              <p className="text-sm text-gray-600">
                Identify abstract, methods, results, etc.
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto">
                <Upload className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium">Metadata Extraction</h4>
              <p className="text-sm text-gray-600">
                Extract title, authors, and citations
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-orange-100 rounded-full w-fit mx-auto">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-medium">Ready for Analysis</h4>
              <p className="text-sm text-gray-600">
                Available for AI-powered analysis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaperUpload

