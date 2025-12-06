import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, MessageCircle, Bot } from 'lucide-react';
import { Subscription, ChatMessage, AppSettings } from '../types';
import { generateId, getRandomColor, getTodayString } from '../utils';

interface AIChatProps {
  subscriptions: Subscription[];
  onAdd: (sub: Subscription) => void;
  onUpdate: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  settings: AppSettings;
}

const AIChat: React.FC<AIChatProps> = ({ subscriptions, onAdd, onUpdate, onDelete, isOpen, onClose, onOpen, settings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Keep subscriptions ref updated for tool calls to access latest state without closures issues
  const subsRef = useRef(subscriptions);
  useEffect(() => { subsRef.current = subscriptions; }, [subscriptions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // --- AI Logic ---
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { id: generateId(), role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      if (!settings.openRouterApiKey) {
        throw new Error("API Key не настроен. Пожалуйста, укажите ключ OpenRouter в настройках.");
      }

      // Define tools (OpenAI format)
      const tools = [
        {
          type: "function",
          function: {
            name: "add_subscription",
            description: "Add a new subscription service. If currency is not specified, infer from context (RUB for Russian services, USD for international). If period is not specified, default to month.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Name of service" },
                price: { type: "number", description: "Price amount" },
                currency: { type: "string", description: "RUB or USD" },
                periodUnit: { type: "string", description: "month, year, or day" },
                periodValue: { type: "number", description: "Frequency (e.g. 1)" },
                nextPaymentDate: { type: "string", description: "YYYY-MM-DD date for next payment. Defaults to today if not specified." },
                description: { type: "string", description: "Optional notes" },
                active: { type: "boolean", description: "Is the subscription currently active? Defaults to true." }
              },
              required: ["name", "price", "currency"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_subscription",
            description: "Update an existing subscription by ID.",
            parameters: {
              type: "object",
              properties: {
                id: { type: "string", description: "The ID of the subscription to update" },
                name: { type: "string" },
                price: { type: "number" },
                currency: { type: "string" },
                paidUntil: { type: "string", description: "YYYY-MM-DD" },
                active: { type: "boolean", description: "Set subscription status to active (true) or inactive (false)" }
              },
              required: ["id"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "delete_subscription",
            description: "Delete a subscription by ID.",
            parameters: {
              type: "object",
              properties: {
                id: { type: "string", description: "The ID of the subscription to delete" }
              },
              required: ["id"]
            }
          }
        }
      ];

      // Construct system prompt with current state
      const subContext = subsRef.current.map(s => `ID: ${s.id}, Name: ${s.name}, Price: ${s.price} ${s.currency}, Active: ${s.active}`).join('\n');
      const systemInstruction = `You are a helpful subscription manager assistant. 
      Current Date: ${getTodayString()}.
      Current Subscriptions:
      ${subContext}
      
      If the user wants to add a subscription and doesn't specify a date, assume the next payment is 1 period from today.
      If the user wants to delete or update, try to find the ID from the name provided.
      Respond in Russian language.`;

      const apiMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
        { role: "user", content: userText }
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin, // Optional, for including your app on openrouter.ai rankings.
          "X-Title": "SubManager", // Optional. Shows in rankings on openrouter.ai.
        },
        body: JSON.stringify({
          model: settings.aiModel || "google/gemini-2.0-flash-001",
          messages: apiMessages,
          tools: tools,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;
      
      let toolOutputText = '';
      let finalResponseText = message.content || '';

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          if (functionName === 'add_subscription') {
            const newSub: Subscription = {
              id: generateId(),
              name: args.name,
              price: args.price,
              currency: (args.currency as 'RUB'|'USD') || 'RUB',
              periodUnit: (args.periodUnit as 'month'|'year'|'day') || 'month',
              periodValue: args.periodValue || 1,
              paidUntil: args.nextPaymentDate || getTodayString(),
              description: args.description || '',
              color: getRandomColor(),
              url: '',
              active: args.active !== undefined ? args.active : true
            };
            onAdd(newSub);
            toolOutputText += `✅ Добавлена подписка: ${newSub.name} (${newSub.price} ${newSub.currency}). `;
          } 
          else if (functionName === 'update_subscription') {
            const existing = subsRef.current.find(s => s.id === args.id);
            if (existing) {
              const updated = { ...existing, ...args };
              onUpdate(updated);
              toolOutputText += `✅ Обновлена подписка: ${updated.name}. `;
            } else {
              toolOutputText += `❌ Ошибка: Не удалось найти подписку с ID ${args.id}. `;
            }
          }
          else if (functionName === 'delete_subscription') {
             onDelete(args.id);
             toolOutputText += `🗑️ Подписка удалена. `;
          }
        }
      }

      // Combine model text and tool output
      const finalResponse = (finalResponseText ? finalResponseText + '\n' : '') + toolOutputText;
      
      setMessages(prev => [...prev, { 
        id: generateId(), 
        role: 'model', 
        text: finalResponse || "Готово." 
      }]);

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { id: generateId(), role: 'model', text: `Ошибка: ${error.message}`, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={onOpen}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg shadow-blue-500/40 hover:scale-105 transition-transform z-40 flex items-center justify-center"
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-[90vw] md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-200" style={{ height: '500px', maxHeight: '70vh' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center space-x-2">
            <Bot size={20} />
            <h3 className="font-bold">AI Помощник</h3>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <Sparkles className="mx-auto mb-2 opacity-50" size={32} />
            <p className="text-sm">Напишите что-нибудь, например:</p>
            <p className="text-xs mt-2 italic">"Добавь Netflix за 10 долларов в месяц"</p>
            {!settings.openRouterApiKey && (
               <p className="text-xs mt-4 text-red-400 font-medium">⚠️ Не забудьте указать API ключ в настройках</p>
            )}
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            } ${msg.isError ? 'bg-red-50 text-red-600 border-red-200' : ''}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center space-x-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Опишите подписку..."
          className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-blue-500/20"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;