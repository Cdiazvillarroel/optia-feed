'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Sparkles, Send } from 'lucide-react'
import { useAiStore } from '@/lib/utils/store'

export function AiPanel() {
  const { open, messages, close, addMessage } = useAiStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    const prompt = input.trim()
    setInput('')
    addMessage({ role: 'user', text: prompt })
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      addMessage({ role: 'assistant', text: data.response || 'Sorry, I could not process that request.' })
    } catch {
      addMessage({ role: 'assistant', text: 'Connection error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const suggestions = ['Review this formula', 'Suggest canola substitutes', 'Check amino acid balance']

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/25 z-[25]" onClick={close} />
      )}

      {/* Panel */}
      <div className={`fixed right-0 top-0 w-[400px] h-screen bg-surface-sidebar border-l border-border
        flex flex-col z-30 transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-text">Optia AI</div>
              <div className="text-2xs text-text-ghost">Nutrition co-pilot</div>
            </div>
          </div>
          <button onClick={close} className="text-text-ghost hover:text-text-muted transition-colors bg-transparent border-none cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[90%] px-3.5 py-2.5 rounded-xl text-[12.5px] leading-relaxed whitespace-pre-wrap
                ${m.role === 'user'
                  ? 'bg-brand text-white self-end rounded-br-sm'
                  : 'bg-[#253442] text-text-dim self-start rounded-bl-sm border border-border'}`}
              dangerouslySetInnerHTML={{
                __html: m.text
                  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                  .replace(/\n/g, '<br/>'),
              }}
            />
          ))}
          {loading && (
            <div className="self-start px-3.5 py-2.5 rounded-xl bg-[#253442] text-text-ghost text-sm">
              Thinking...
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div className="px-4 py-2 flex gap-1.5 flex-wrap">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="px-2.5 py-1 rounded-md border border-border bg-surface-card text-text-faint text-xs
                cursor-pointer hover:border-brand/25 hover:text-brand transition-all"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Optia anything..."
            className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-border bg-surface-deep text-text-dim text-base outline-none focus:border-border-focus"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="w-10 h-10 rounded-[10px] bg-brand text-white flex items-center justify-center border-none cursor-pointer hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  )
}
