'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { useAiStore } from '@/lib/utils/store'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AiPanel() {
  const { isOpen, toggle } = useAiStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input.trim() }),
      })
      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response || data.error || 'No response received.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI. Check your API key.', timestamp: new Date() }])
    }
    setLoading(false)
  }

  function clearChat() {
    setMessages([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-surface-card border-l border-border shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-text">Optia AI</div>
            <div className="text-2xs text-text-ghost">Nutrition assistant</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-text-ghost hover:text-text-muted bg-transparent border-none cursor-pointer p-1.5 rounded hover:bg-white/5" title="Clear chat">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={toggle} className="text-text-ghost hover:text-text-muted bg-transparent border-none cursor-pointer p-1.5 rounded hover:bg-white/5">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles size={28} className="text-brand/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-text-dim mb-2">How can I help?</p>
            <p className="text-xs text-text-ghost mb-4 max-w-[280px] mx-auto">Ask me about feed formulation, ingredient substitution, nutrient requirements, or any livestock nutrition question.</p>
            <div className="flex flex-col gap-2">
              {[
                'What are the signs of phosphorus deficiency in pastoral beef cattle?',
                'Suggest a protein source to replace canola meal for pigs',
                'What is the ideal Ca:P ratio for feedlot finishing diets?',
                'How do I manage acidosis risk in a step-up program?',
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); }}
                  className="text-left text-xs text-text-muted bg-surface-bg rounded-lg px-3 py-2 border border-border hover:border-brand/30 hover:text-brand transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles size={10} className="text-brand" />
                <span className="text-2xs font-bold text-brand">Optia</span>
                <span className="text-2xs text-text-ghost">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="flex items-center gap-1.5 mb-1 justify-end">
                <span className="text-2xs text-text-ghost">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-2xs font-bold text-text-muted">You</span>
              </div>
            )}
            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-brand text-white ml-auto rounded-br-sm'
                : 'bg-surface-bg text-text-dim border border-border rounded-bl-sm'}`}
            >
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    .replace(/\n- /g, '<br/>\u2022 ')
                    .replace(/\n\d\. /g, (m) => '<br/>' + m.trim() + ' ')
                    .replace(/\n/g, '<br/>')
                }} />
              ) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={10} className="text-brand" />
              <span className="text-2xs font-bold text-brand">Optia</span>
            </div>
            <div className="bg-surface-bg text-text-ghost border border-border rounded-xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2 max-w-[90%]">
              <Loader2 size={14} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about nutrition, formulation, ingredients..."
            className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-brand transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn btn-primary btn-sm disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}
