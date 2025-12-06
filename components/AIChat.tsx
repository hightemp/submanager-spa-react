import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, MessageCircle, Bot } from 'lucide-react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Subscription, ChatMessage } from '../types';
import { generateId, getRandomColor, getTodayString } from '../utils';

interface AIChatProps {
  subscriptions: Subscription[];
  onAdd: (sub: Subscription) => void;
  onUpdate: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ subscriptions, onAdd, onUpdate, onDelete, isOpen, onClose, onOpen }) => {
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Define tools
      const addTool: FunctionDeclaration = {
        name: "add_subscription",
        description: "Add a new subscription service. If currency is not specified, infer from context (RUB for Russian services, USD for international). If period is not specified, default to month.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of service" },
            price: { type: Type.NUMBER, description: "Price amount" },
            currency: { type: Type.STRING, description: "RUB or USD" },
            periodUnit: { type: Type.STRING, description: "month, year, or day" },
            periodValue: { type: Type.NUMBER, description: "Frequency (e.g. 1)" },
            nextPaymentDate: { type: Type.STRING, description: "YYYY-MM-DD date for next payment. Defaults to today if not specified." },
            description: { type: Type.STRING, description: "Optional notes" },
            active: { type: Type.BOOLEAN, description: "Is the subscription currently active? Defaults to true." }
          },
          required: ["name", "price", "currency"]
        }
      };

      const updateTool: FunctionDeclaration = {
        name: "update_subscription",
        description: "Update an existing subscription by ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "The ID of the subscription to update" },
            name: { type: Type.STRING },
            price: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            paidUntil: { type: Type.STRING, description: "YYYY-MM-DD" },
            active: { type: Type.BOOLEAN, description: "Set subscription status to active (true) or inactive (false)" }
          },
          required: ["id"]
        }
      };

      const deleteTool: FunctionDeclaration = {
        name: "delete_subscription",
        description: "Delete a subscription by ID.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: "The ID of the subscription to delete" }
            },
            required: ["id"]
        }
      };

      // Construct system prompt with current state
      const subContext = subsRef.current.map(s => `ID: ${s.id}, Name: ${s.name}, Price: ${s.price} ${s.currency}, Active: ${s.active}`).join('\n');
      const systemInstruction = `You are a helpful subscription manager assistant. 
      Current Date: ${getTodayString()}.
      Current Subscriptions:
      ${subContext}
      
      If the user wants to add a subscription and doesn't specify a date, assume the next payment is 1 period from today.
      If the user wants to delete or update, try to find the ID from the name provided.
      Respond in Russian language.`;

      // Single turn request with tools
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            ...messages.map(m => ({ 
                role: m.role, 
                parts: [{ text: m.text }] 
            })),
            { role: 'user', parts: [{ text: userText }] }
        ],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [addTool, updateTool, deleteTool] }]
        }
      });

      const functionCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall)?.map(p => p.functionCall);
      const textResponse = response.text;

      let toolOutputText = '';

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          const args = call.args as any;
          
          if (call.name === 'add_subscription') {
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
          else if (call.name === 'update_subscription') {
            const existing = subsRef.current.find(s => s.id === args.id);
            if (existing) {
              const updated = { ...existing, ...args };
              onUpdate(updated);
              toolOutputText += `✅ Обновлена подписка: ${updated.name}. `;
            } else {
              toolOutputText += `❌ Ошибка: Не удалось найти подписку с ID ${args.id}. `;
            }
          }
          else if (call.name === 'delete_subscription') {
             onDelete(args.id);
             toolOutputText += `🗑️ Подписка удалена. `;
          }
        }
      }

      // Combine model text and tool output
      const finalResponse = (textResponse ? textResponse + '\n' : '') + toolOutputText;
      
      setMessages(prev => [...prev, { 
        id: generateId(), 
        role: 'model', 
        text: finalResponse || "Готово." 
      }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: generateId(), role: 'model', text: "Произошла ошибка при обработке запроса.", isError: true }]);
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