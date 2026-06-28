import React from 'react'
import ReactMarkdown from 'react-markdown'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (assistant only) */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brev-blue flex items-center justify-center flex-shrink-0 mb-1">
          <span className="text-xs">🎓</span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-brev-blue text-white rounded-br-sm'
            : 'bg-white shadow-sm border border-gray-100 text-brev-dark rounded-bl-sm'
          }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-strong:text-brev-dark">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
