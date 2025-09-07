import React, { useState, useRef } from 'react'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Download,
  Loader2,
  MessageCircle,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

const VoiceInterface = ({ papers, selectedPaper }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [processing, setProcessing] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('alloy')
  const [selectedPaperForTTS, setSelectedPaperForTTS] = useState(selectedPaper?.id || '')
  const [summaryType, setSummaryType] = useState('easy')
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioRef = useRef(null)
  const { toast } = useToast()

  const voices = [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (British Male)' },
    { value: 'onyx', label: 'Onyx (Deep Male)' },
    { value: 'nova', label: 'Nova (Female)' },
    { value: 'shimmer', label: 'Shimmer (Soft Female)' }
  ]

  const summaryTypes = [
    { value: 'easy', label: 'Easy Language' },
    { value: 'methods', label: 'Methods Summary' },
    { value: 'results', label: 'Results Summary' },
    { value: 'limitations', label: 'Limitations' }
  ]

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await transcribeAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      
      toast({
        title: 'Recording Started',
        description: 'Speak your question about the research papers.',
      })

    } catch (error) {
      toast({
        title: 'Recording Failed',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive'
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob) => {
    setProcessing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')

      const response = await fetch('/api/voice/speech-to-text', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      setTranscript(data.transcript)
      
      // Automatically process the voice query
      await processVoiceQuery(audioBlob)

    } catch (error) {
      toast({
        title: 'Transcription Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  const processVoiceQuery = async (audioBlob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'query.wav')

      const response = await fetch('/api/voice/voice-query', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Voice query failed')
      }

      const data = await response.json()
      setResponse(data.answer)

    } catch (error) {
      toast({
        title: 'Query Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const generateSpeech = async (text) => {
    if (!text.trim()) {
      toast({
        title: 'No Text',
        description: 'Please provide text to convert to speech.',
        variant: 'destructive'
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/voice/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice: selectedVoice
        })
      })

      if (!response.ok) {
        throw new Error('Speech generation failed')
      }

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
        setIsPlaying(true)
      }

    } catch (error) {
      toast({
        title: 'Speech Generation Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  const generatePaperSpeech = async () => {
    if (!selectedPaperForTTS) {
      toast({
        title: 'No Paper Selected',
        description: 'Please select a paper to generate speech.',
        variant: 'destructive'
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/voice/paper-to-speech/${selectedPaperForTTS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: summaryType,
          voice: selectedVoice
        })
      })

      if (!response.ok) {
        throw new Error('Paper speech generation failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paper_${selectedPaperForTTS}_${summaryType}_${selectedVoice}.mp3`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Audio Generated',
        description: 'Paper summary audio has been downloaded.',
      })

    } catch (error) {
      toast({
        title: 'Speech Generation Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Voice Interface</h1>
        <p className="text-gray-600 mt-2">
          Interact with your research papers using voice commands and get audio responses
        </p>
      </div>

      {/* Voice Query */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mic className="h-5 w-5 mr-2" />
            Voice Query
          </CardTitle>
          <CardDescription>
            Ask questions about your papers using voice input
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={processing}
              className="h-20 w-20 rounded-full"
            >
              {processing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {isRecording 
                ? 'Recording... Click to stop' 
                : processing 
                ? 'Processing your voice...'
                : 'Click to start recording your question'
              }
            </p>
          </div>

          {transcript && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Your Question:</h4>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-gray-800">{transcript}</p>
                </div>
              </div>

              {response && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">AI Response:</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateSpeech(response)}
                      disabled={processing}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      Listen
                    </Button>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-gray-800">{response}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Text to Speech */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Volume2 className="h-5 w-5 mr-2" />
            Text to Speech
          </CardTitle>
          <CardDescription>
            Convert any text to natural-sounding speech
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Voice</label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Text to Convert</label>
            <Textarea
              placeholder="Enter text to convert to speech..."
              rows={4}
              id="tts-text"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => {
                const text = document.getElementById('tts-text').value
                generateSpeech(text)
              }}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4 mr-2" />
              )}
              Generate Speech
            </Button>

            {audioRef.current && (
              <Button
                variant="outline"
                onClick={togglePlayback}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            )}
          </div>

          <audio
            ref={audioRef}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Paper Summary to Speech */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Paper Summary Audio
          </CardTitle>
          <CardDescription>
            Generate audio summaries of your research papers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Paper</label>
              <Select value={selectedPaperForTTS} onValueChange={setSelectedPaperForTTS}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a paper" />
                </SelectTrigger>
                <SelectContent>
                  {papers.map((paper) => (
                    <SelectItem key={paper.id} value={paper.id.toString()}>
                      {paper.title.length > 50 ? paper.title.substring(0, 50) + '...' : paper.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Summary Type</label>
              <Select value={summaryType} onValueChange={setSummaryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {summaryTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Voice</label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={generatePaperSpeech}
            disabled={processing || !selectedPaperForTTS}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Generate & Download Audio
          </Button>

          {papers.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No papers available for audio generation</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Interface Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto">
                <Mic className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium">Speech-to-Text</h4>
              <p className="text-sm text-gray-600">
                Ask questions about your papers using voice commands
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                <Volume2 className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium">Text-to-Speech</h4>
              <p className="text-sm text-gray-600">
                Convert any text to natural-sounding audio
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium">Paper Audio</h4>
              <p className="text-sm text-gray-600">
                Generate audio summaries of research papers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VoiceInterface

