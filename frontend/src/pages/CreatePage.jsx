import React, { useState, useRef, useEffect, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { streamChat } from '../services/api'
import MessageBubble from '../components/MessageBubble'
import TypingIndicator from '../components/TypingIndicator'

const GREETING = {
  id: 'greeting',
  role: 'assistant',
  content: `👋 Salut ! Je suis ton assistant BrevApp.

Dis-moi ce que tu veux réviser et je génère un **sujet personnalisé** à partir de vraies annales officielles du Brevet 📚

Par exemple :
- *"Je veux un développement construit sur la Guerre froide"*
- *"Un sujet de maths avec de la géométrie et des stats"*
- *"Une étude de documents sur les espaces de faible densité"*`,
}

export default function CreatePage() {
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pdfReady, setPdfReady] = useState(null)
  const sessionId = useRef(crypto.randomUUID())
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function send() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    setPdfReady(null)

    const userMsg = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantMsg = { id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    const history = [...messages, userMsg]
      .filter(m => m.id !== 'greeting' || m.content)
      .map(({ role, content }) => ({ role, content }))

    try {
      for await (const { event, data } of streamChat(history, sessionId.current)) {
        if (event === 'token') {
          setMessages(prev => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), { ...last, content: last.content + data.text }]
          })
        } else if (event === 'status') {
          setMessages(prev => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), {
              ...last,
              content: last.content + `\n\n*${data.message}*`,
            }]
          })
        } else if (event === 'pdf_ready') {
          setPdfReady(data)
          setMessages(prev => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), { ...last, streaming: false }]
          })
        } else if (event === 'error') {
          setMessages(prev => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), {
              ...last,
              content: last.content + `\n\n⚠️ ${data.message}`,
              streaming: false,
            }]
          })
        } else if (event === 'done') {
          setMessages(prev => {
            const last = prev[prev.length - 1]
            return [...prev.slice(0, -1), { ...last, streaming: false }]
          })
        }
      }
    } catch (err) {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), {
          ...last,
          content: last.content + '\n\n⚠️ Connexion interrompue. Réessaie.',
          streaming: false,
        }]
      })
    }

    setStreaming(false)
    inputRef.current?.focus()
  }

  function reset() {
    setMessages([GREETING])
    setPdfReady(null)
    sessionId.current = crypto.randomUUID()
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 border-b border-gray-100 bg-white">
        <div>
          <h1 className="text-lg font-bold text-brev-dark">Créer un sujet ✨</h1>
          <p className="text-xs text-gray-400">Annales officielles du DNB</p>
        </div>
        <button
          onClick={reset}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Nouvelle conversation"
        >
          <ResetIcon />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {streaming && messages[messages.length - 1]?.content === '' && (
          <TypingIndicator />
        )}
        {pdfReady && (
          <PDFReadyCard payload={pdfReady} onOpen={() => navigate(`/sujet/${pdfReady.subject_id}`)} />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white/90 backdrop-blur px-4 py-3">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Décris ce que tu veux travailler..."
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none input-field py-3 max-h-32 overflow-y-auto"
            style={{ fieldSizing: 'content' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="w-10 h-10 flex-shrink-0 bg-brev-blue text-white rounded-xl flex items-center justify-center
                       hover:bg-brev-indigo disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {streaming
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <SendIcon />
            }
          </button>
        </div>
        <p className="text-center text-xs text-gray-300 mt-2">Entrée pour envoyer · Maj+Entrée pour sauter une ligne</p>
      </div>
    </div>
  )
}

function PDFReadyCard({ payload, onOpen }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-green-500 text-lg">✅</span>
        <span className="font-semibold text-green-800 text-sm">Sujet généré avec succès !</span>
      </div>
      {payload.title && (
        <p className="text-xs text-green-700 font-medium">{payload.title}</p>
      )}
      <button
        onClick={onOpen}
        className="flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all"
      >
        <span>📄</span> Ouvrir le PDF
      </button>
    </div>
  )
}

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
)

const ResetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)
