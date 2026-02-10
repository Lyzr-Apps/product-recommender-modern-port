'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  uploadAndTrainDocument,
  getDocuments,
  deleteDocuments,
} from '@/lib/ragKnowledgeBase'
import {
  FiSend,
  FiSearch,
  FiUpload,
  FiTrash2,
  FiX,
  FiAlertCircle,
  FiInfo,
  FiFileText,
  FiSettings,
  FiCheck,
  FiLoader,
  FiCpu,
  FiUser,
  FiPackage,
  FiDollarSign,
  FiShoppingBag,
  FiMail,
  FiCheckCircle,
} from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// Constants
const AGENT_ID = '698ba5ef1795f4806db0eb5a'
const RAG_ID = '698ba5de67a82d6d27bdde7a'

// Theme
const THEME_VARS = {
  '--background': '160 35% 96%',
  '--foreground': '160 35% 8%',
  '--card': '160 30% 99%',
  '--card-foreground': '160 35% 8%',
  '--popover': '160 30% 99%',
  '--popover-foreground': '160 35% 8%',
  '--primary': '160 85% 35%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '160 30% 93%',
  '--secondary-foreground': '160 35% 12%',
  '--accent': '45 95% 50%',
  '--accent-foreground': '160 35% 8%',
  '--muted': '160 25% 90%',
  '--muted-foreground': '160 25% 40%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '160 28% 88%',
  '--input': '160 25% 85%',
  '--ring': '160 85% 35%',
  '--radius': '0.875rem',
} as React.CSSProperties

// TypeScript Interfaces
interface Recommendation {
  product_name?: string
  key_features?: string
  why_its_a_fit?: string
  price?: string
}

interface ResponseData {
  greeting?: string
  clarifying_questions?: string[]
  recommendations?: Recommendation[]
  comparison_notes?: string
  comparison?: string | null
  next_steps?: string
  email_acknowledgment?: string
  ticket_notification?: string
  ticket_sent?: boolean
  summary_sent?: boolean
  email_recipient?: string
}

interface ParsedAgentResponse {
  summary?: string
  data?: ResponseData
  rawText?: string
}

interface AgentMetadata {
  agent_name?: string
  timestamp?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  parsed?: ParsedAgentResponse
  metadata?: AgentMetadata
  timestamp: string
}

interface KBDocument {
  id?: string
  fileName: string
  fileType: 'pdf' | 'docx' | 'txt'
  fileSize?: number
  status?: 'processing' | 'active' | 'failed' | 'deleted'
  uploadedAt?: string
}

// Sample data
const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'sample-1',
    role: 'user',
    content: 'I need a solution for team collaboration that supports remote work. What do you recommend?',
    timestamp: '2024-06-13T15:19:00Z',
  },
  {
    id: 'sample-2',
    role: 'agent',
    content: '',
    parsed: {
      summary: 'Recommended top team collaboration solutions for remote work.',
      data: {
        greeting: 'Thank you for reaching out! I\'d love to help you find the perfect team collaboration solution for remote work.',
        clarifying_questions: [
          'Could you share how large your team is?',
          'Are there any specific features you need, such as video conferencing, file sharing, or task management?',
          'Do you have a preferred budget or any existing tools you\'d like to integrate with?',
        ],
        recommendations: [
          {
            product_name: 'Microsoft Teams',
            key_features: 'Integrated chat, video calls, file sharing, calendar, and seamless integration with Office 365 apps.',
            why_its_a_fit: 'Great for both small and large remote teams, providing robust collaboration tools in one platform. Highly secure and scalable.',
            price: 'Free version available; paid plans start at $4/user/month.',
          },
          {
            product_name: 'Slack',
            key_features: 'Real-time messaging, channels, rich integration ecosystem, audio/video huddles, and easy file sharing.',
            why_its_a_fit: 'Excellent for remote teams needing agile communication, with thousands of integrations for workflow automation.',
            price: 'Free version available; paid plans from $7.25/user/month.',
          },
          {
            product_name: 'Zoom One',
            key_features: 'High-quality video conferencing, chat, collaboration boards, and a marketplace with app integrations.',
            why_its_a_fit: 'Ideal if your team prioritizes video meetings and needs flexible collaboration tools for remote work.',
            price: 'Free basic plan; paid plans from $14.99/user/month.',
          },
        ],
        comparison_notes: 'Microsoft Teams offers the broadest suite for collaboration, covering messaging, meetings, and documents. Slack focuses on fast-paced communication and integration flexibility, while Zoom is best for teams with heavy video call requirements.',
        next_steps: 'Let me know your team size and required features, or if you\'d like a deeper comparison between these options!',
      },
    },
    metadata: {
      agent_name: 'Product Recommendation Agent',
      timestamp: '2024-06-13T15:20:00Z',
    },
    timestamp: '2024-06-13T15:20:00Z',
  },
]

const SUGGESTED_PROMPTS = [
  'Show me your best sellers',
  'I need help choosing a product',
  'Compare solutions for my team',
  "What's new in your catalog?",
]

// Markdown renderer
function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

// Parse agent response robustly
function parseAgentResponse(raw: any): ParsedAgentResponse {
  if (!raw) return { rawText: 'No response received.' }

  // If raw is a string, try to parse as JSON
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parseAgentResponse(parsed)
    } catch {
      return { rawText: raw }
    }
  }

  // If response has the expected structure
  if (raw?.result) {
    return {
      summary: raw?.result?.summary ?? undefined,
      data: {
        greeting: raw?.result?.data?.greeting ?? undefined,
        clarifying_questions: Array.isArray(raw?.result?.data?.clarifying_questions)
          ? raw.result.data.clarifying_questions
          : undefined,
        recommendations: Array.isArray(raw?.result?.data?.recommendations)
          ? raw.result.data.recommendations
          : undefined,
        comparison_notes: raw?.result?.data?.comparison_notes ?? undefined,
        next_steps: raw?.result?.data?.next_steps ?? undefined,
        email_acknowledgment: raw?.result?.data?.email_acknowledgment ?? undefined,
        ticket_notification: raw?.result?.data?.ticket_notification ?? undefined,
        ticket_sent: raw?.result?.data?.ticket_sent ?? undefined,
        summary_sent: raw?.result?.data?.summary_sent ?? undefined,
        email_recipient: raw?.result?.data?.email_recipient ?? undefined,
        comparison: raw?.result?.data?.comparison ?? undefined,
      },
    }
  }

  // If it has direct data fields (no result wrapper)
  if (raw?.data || raw?.recommendations || raw?.greeting) {
    return {
      summary: raw?.summary ?? undefined,
      data: {
        greeting: raw?.greeting ?? raw?.data?.greeting ?? undefined,
        clarifying_questions: Array.isArray(raw?.clarifying_questions ?? raw?.data?.clarifying_questions)
          ? (raw?.clarifying_questions ?? raw?.data?.clarifying_questions)
          : undefined,
        recommendations: Array.isArray(raw?.recommendations ?? raw?.data?.recommendations)
          ? (raw?.recommendations ?? raw?.data?.recommendations)
          : undefined,
        comparison_notes: raw?.comparison_notes ?? raw?.data?.comparison_notes ?? undefined,
        next_steps: raw?.next_steps ?? raw?.data?.next_steps ?? undefined,
        email_acknowledgment: raw?.email_acknowledgment ?? raw?.data?.email_acknowledgment ?? undefined,
        ticket_notification: raw?.ticket_notification ?? raw?.data?.ticket_notification ?? undefined,
        ticket_sent: raw?.ticket_sent ?? raw?.data?.ticket_sent ?? undefined,
        summary_sent: raw?.summary_sent ?? raw?.data?.summary_sent ?? undefined,
        email_recipient: raw?.email_recipient ?? raw?.data?.email_recipient ?? undefined,
        comparison: raw?.comparison ?? raw?.data?.comparison ?? undefined,
      },
    }
  }

  // Fallback: display raw as text
  if (raw?.message) return { rawText: raw.message }
  if (raw?.text) return { rawText: raw.text }
  if (raw?.answer) return { rawText: raw.answer }
  if (typeof raw?.result === 'string') return { rawText: raw.result }

  return { rawText: JSON.stringify(raw, null, 2) }
}

// Generate a simple session ID
function generateChatSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'session_'
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// Product Card Component
function ProductCard({ product }: { product: Recommendation }) {
  return (
    <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FiPackage className="w-4 h-4 text-primary" />
            </div>
            {product?.product_name ?? 'Unknown Product'}
          </CardTitle>
          {product?.price && (
            <Badge className="bg-primary/10 text-primary border-primary/20 font-medium text-xs whitespace-nowrap">
              {product.price}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {product?.key_features && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Features</p>
            <p className="text-sm text-card-foreground leading-relaxed">{product.key_features}</p>
          </div>
        )}
        {product?.why_its_a_fit && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Why It Fits</p>
            <p className="text-sm text-card-foreground leading-relaxed">{product.why_its_a_fit}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Typing Indicator
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FiCpu className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// Agent Message
function AgentMessage({ message }: { message: ChatMessage }) {
  const parsed = message?.parsed
  const data = parsed?.data
  const hasStructuredData = data?.greeting || (Array.isArray(data?.recommendations) && data.recommendations.length > 0) || data?.clarifying_questions || data?.ticket_notification || data?.ticket_sent

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <FiCpu className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-3 max-w-[calc(100%-3rem)]">
        {hasStructuredData ? (
          <>
            {/* Greeting */}
            {data?.greeting && (
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <p className="text-sm text-card-foreground leading-relaxed">{data.greeting}</p>
              </div>
            )}

            {/* Clarifying Questions */}
            {Array.isArray(data?.clarifying_questions) && data.clarifying_questions.length > 0 && (
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Questions to refine your search</p>
                <ul className="space-y-1.5">
                  {data.clarifying_questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-card-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray(data?.recommendations) && data.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Recommendations</p>
                <div className="grid gap-3">
                  {data.recommendations.map((rec, i) => (
                    <ProductCard key={i} product={rec} />
                  ))}
                </div>
              </div>
            )}

            {/* Comparison Notes */}
            {(data?.comparison_notes || (typeof data?.comparison === 'string' && data.comparison)) && (
              <div className="bg-secondary/50 backdrop-blur-sm border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Comparison</p>
                <div className="text-sm text-card-foreground leading-relaxed">{renderMarkdown(data?.comparison_notes ?? data?.comparison ?? '')}</div>
              </div>
            )}

            {/* Next Steps */}
            {data?.next_steps && (
              <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3 shadow-sm">
                <p className="text-sm text-card-foreground leading-relaxed">{data.next_steps}</p>
              </div>
            )}

            {/* Email Acknowledgment */}
            {data?.email_acknowledgment && (
              <div className="bg-secondary/50 backdrop-blur-sm border border-primary/20 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-sm text-card-foreground leading-relaxed">{data.email_acknowledgment}</p>
                </div>
              </div>
            )}

            {/* Ticket Notification */}
            {(data?.ticket_notification || data?.ticket_sent) && (
              <div className="bg-accent/10 backdrop-blur-sm border border-accent/30 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-accent uppercase tracking-wide mb-1">Product Request Ticket Sent</p>
                    <p className="text-sm text-card-foreground leading-relaxed">
                      {data?.ticket_notification
                        ? data.ticket_notification
                        : `A product request ticket has been submitted${data?.email_recipient ? ` to ${data.email_recipient}` : ''}. Our team will review your request and follow up.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : parsed?.rawText ? (
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            {renderMarkdown(parsed.rawText)}
          </div>
        ) : (
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <p className="text-sm text-muted-foreground">No content to display.</p>
          </div>
        )}

        {/* Summary badge */}
        {parsed?.summary && (
          <div className="px-1">
            <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">
              {parsed.summary}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

// User Message
function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end py-3">
      <div className="max-w-[80%]">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed">{message?.content ?? ''}</p>
        </div>
      </div>
    </div>
  )
}

// Knowledge Base Panel
function KnowledgeBasePanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [documents, setDocuments] = useState<KBDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const result = await getDocuments(RAG_ID)
    if (result.success && Array.isArray(result?.documents)) {
      setDocuments(result.documents as KBDocument[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchDocs()
    }
  }, [isOpen, fetchDocs])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setStatusMsg(null)
    const result = await uploadAndTrainDocument(RAG_ID, file)
    if (result.success) {
      setStatusMsg({ type: 'success', text: `"${file.name}" uploaded and trained successfully.` })
      await fetchDocs()
    } else {
      setStatusMsg({ type: 'error', text: result?.error ?? 'Upload failed.' })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (fileName: string) => {
    setLoading(true)
    setStatusMsg(null)
    const result = await deleteDocuments(RAG_ID, [fileName])
    if (result.success) {
      setStatusMsg({ type: 'success', text: `"${fileName}" deleted.` })
      setDocuments((prev) => prev.filter((d) => d.fileName !== fileName))
    } else {
      setStatusMsg({ type: 'error', text: result?.error ?? 'Delete failed.' })
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-2xl border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg font-semibold text-card-foreground">Knowledge Base</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Upload product catalogs to enhance recommendations</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <FiX className="w-4 h-4" />
          </Button>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          {/* Upload area */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
            <FiUpload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Upload PDF, DOCX, or TXT files</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleUpload}
              className="hidden"
              id="kb-file-upload"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="border-primary/30 text-primary hover:bg-primary/5"
            >
              {uploading ? (
                <>
                  <FiLoader className="w-3 h-3 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FiUpload className="w-3 h-3 mr-2" />
                  Choose File
                </>
              )}
            </Button>
          </div>

          {/* Status message */}
          {statusMsg && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${statusMsg.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {statusMsg.type === 'success' ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : <FiAlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Documents list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Documents ({documents.length})</p>
            {loading && documents.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <FiLoader className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded yet. Upload a product catalog to get started.</p>
            ) : (
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {documents.map((doc, i) => (
                    <div key={doc?.id ?? i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <FiFileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{doc?.fileName ?? 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{doc?.fileType?.toUpperCase() ?? 'File'} {doc?.status ? `- ${doc.status}` : ''}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => doc?.fileName && handleDelete(doc.fileName)}
                        className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Page Component
export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSampleData, setShowSampleData] = useState(false)
  const [showKB, setShowKB] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [showEmailBar, setShowEmailBar] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session ID on client side to avoid hydration mismatch
  useEffect(() => {
    setSessionId(generateChatSessionId())
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const displayMessages = showSampleData && messages.length === 0 ? SAMPLE_MESSAGES : messages

  const handleSend = async (text?: string) => {
    const messageText = text ?? inputValue.trim()
    if (!messageText || isLoading) return

    setError(null)
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(messageText, AGENT_ID, {
        session_id: sessionId || undefined,
      })

      if (result.success) {
        const parsed = parseAgentResponse(result?.response)
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: '',
          parsed,
          metadata: {
            agent_name: result?.response?.metadata?.agent_name ?? 'Product Recommendation Agent',
            timestamp: result?.response?.metadata?.timestamp ?? new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, agentMsg])
      } else {
        setError(result?.error ?? 'Failed to get response from agent.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmailSummary = async () => {
    if (!userEmail.trim() || isLoading || messages.length === 0) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail.trim())) {
      setEmailStatus('error')
      return
    }

    setEmailStatus('sending')
    const summaryRequest = `Please send a complete summary of our entire conversation to ${userEmail.trim()}. Include all recommendations, key points, and any comparisons we discussed.`

    try {
      const result = await callAIAgent(summaryRequest, AGENT_ID, {
        session_id: sessionId || undefined,
      })

      if (result.success) {
        setEmailStatus('sent')
        const parsed = parseAgentResponse(result?.response)
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: '',
          parsed,
          metadata: {
            agent_name: result?.response?.metadata?.agent_name ?? 'Product Recommendation Agent',
            timestamp: result?.response?.metadata?.timestamp ?? new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, agentMsg])
        setTimeout(() => setEmailStatus('idle'), 5000)
      } else {
        setEmailStatus('error')
        setTimeout(() => setEmailStatus('idle'), 3000)
      }
    } catch {
      setEmailStatus('error')
      setTimeout(() => setEmailStatus('idle'), 3000)
    }
  }

  const showWelcome = displayMessages.length === 0

  return (
    <div style={THEME_VARS} className="min-h-screen bg-background text-foreground font-sans">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, hsl(160 40% 94%) 0%, hsl(180 35% 93%) 30%, hsl(160 35% 95%) 60%, hsl(140 40% 94%) 100%)' }} />

      <div className="relative min-h-screen flex flex-col max-w-3xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FiShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Product Advisor</h1>
              <p className="text-xs text-muted-foreground">AI-powered product recommendations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={showSampleData}
                onCheckedChange={setShowSampleData}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowKB(true)} className="rounded-full text-muted-foreground hover:text-foreground">
              <FiSettings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
          {showWelcome ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-md shadow-primary/10">
                <FiShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">Welcome to Product Advisor</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-8 leading-relaxed">Describe what you are looking for and I will recommend the best products tailored to your needs. You can also upload product catalogs to enhance my suggestions.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                    className="text-left px-4 py-3 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm text-sm text-card-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-1">
              {displayMessages.map((msg) =>
                msg.role === 'user' ? (
                  <UserMessage key={msg.id} message={msg} />
                ) : (
                  <AgentMessage key={msg.id} message={msg} />
                )
              )}
              {isLoading && <TypingIndicator />}
              {error && (
                <div className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <FiAlertCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="bg-destructive/5 border border-destructive/20 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email Summary Bar */}
        {showEmailBar && (
          <div className="px-4 py-2 border-t border-border/50 bg-card/60 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <FiMail className="w-4 h-4 text-primary flex-shrink-0" />
              <Input
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value)
                  if (emailStatus === 'error') setEmailStatus('idle')
                }}
                placeholder="Enter your email address..."
                disabled={emailStatus === 'sending'}
                className={`flex-1 bg-card/80 border-border/60 rounded-xl h-9 text-sm placeholder:text-muted-foreground focus-visible:ring-primary/30 ${emailStatus === 'error' ? 'border-destructive/50 focus-visible:ring-destructive/30' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleEmailSummary()
                  }
                }}
              />
              <Button
                onClick={handleEmailSummary}
                disabled={!userEmail.trim() || emailStatus === 'sending' || messages.length === 0}
                size="sm"
                className={`rounded-xl text-xs font-medium flex-shrink-0 ${
                  emailStatus === 'sent'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : emailStatus === 'error'
                    ? 'bg-destructive/10 text-destructive border border-destructive/30'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                }`}
                variant={emailStatus === 'sent' || emailStatus === 'error' ? 'outline' : 'default'}
              >
                {emailStatus === 'sending' ? (
                  <>
                    <FiLoader className="w-3 h-3 mr-1.5 animate-spin" />
                    Sending...
                  </>
                ) : emailStatus === 'sent' ? (
                  <>
                    <FiCheckCircle className="w-3 h-3 mr-1.5" />
                    Sent
                  </>
                ) : emailStatus === 'error' ? (
                  <>
                    <FiAlertCircle className="w-3 h-3 mr-1.5" />
                    Failed
                  </>
                ) : (
                  <>
                    <FiSend className="w-3 h-3 mr-1.5" />
                    Send Summary
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEmailBar(false)
                  setEmailStatus('idle')
                }}
                className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <FiX className="w-3.5 h-3.5" />
              </Button>
            </div>
            {emailStatus === 'error' && (
              <p className="text-xs text-destructive mt-1.5 ml-6">Please enter a valid email address.</p>
            )}
            {emailStatus === 'sent' && (
              <p className="text-xs text-primary mt-1.5 ml-6">Conversation summary has been sent to your email.</p>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="sticky bottom-0 z-20 px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {/* Email toggle button */}
            {!showEmailBar && messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEmailBar(true)}
                title="Email conversation summary"
                className="h-11 w-11 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 flex-shrink-0"
              >
                <FiMail className="w-4 h-4" />
              </Button>
            )}
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you're looking for..."
              disabled={isLoading}
              className="flex-1 bg-card/80 border-border/60 rounded-xl h-11 text-sm placeholder:text-muted-foreground focus-visible:ring-primary/30"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 flex-shrink-0"
              size="icon"
            >
              {isLoading ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Agent Info Section */}
        <div className="px-4 py-3 border-t border-border/30 bg-background/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
              <span className="text-xs text-muted-foreground">Product Recommendation Agent</span>
              <span className="text-xs text-muted-foreground/60">|</span>
              <span className="text-xs text-muted-foreground/60">{AGENT_ID}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {activeAgentId ? 'Processing...' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Knowledge Base Panel */}
      <KnowledgeBasePanel isOpen={showKB} onClose={() => setShowKB(false)} />
    </div>
  )
}
