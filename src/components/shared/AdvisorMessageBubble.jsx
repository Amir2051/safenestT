import ReactMarkdown from "react-markdown";
import { Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdvisorMessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm",
        isUser
          ? "bg-slate-800 text-white rounded-br-sm"
          : "bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-sm"
      )}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-gray-300">{children}</li>,
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              h3: ({ children }) => <h3 className="text-white font-bold mt-3 mb-1">{children}</h3>,
              h4: ({ children }) => <h4 className="text-cyan-400 font-semibold mt-2 mb-1">{children}</h4>,
              code: ({ children }) => <code className="px-1 py-0.5 rounded bg-gray-800 text-cyan-300 text-xs">{children}</code>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-gray-300" />
        </div>
      )}
    </div>
  );
}