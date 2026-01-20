'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '@/lib/api';
import { getAgents, Agent } from '@/lib/agents';
import AgentSuggestionCards from './AgentSuggestionCards';

interface Message {
  id: number;
  from: 'user' | 'aria';
  text: string;
  displayText: string;
  isTyping: boolean;
  timestamp: Date;
  suggestedAgents?: Agent[];
}

interface AriaChatProps {
  teamId: string;
  userObjective: string;
}

export default function AriaChat({ teamId, userObjective }: AriaChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to parse agent suggestions from response
  const parseAgentSuggestions = (text: string): { cleanText: string; agents: Agent[] } => {
    // Look for ```agents ... ``` block
    const agentBlockRegex = /```agents\s*([\s\S]*?)\s*```/;
    const match = text.match(agentBlockRegex);

    if (!match) {
      return { cleanText: text, agents: [] };
    }

    // Extract agent IDs
    const agentIdsText = match[1];
    const agentIds = agentIdsText
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    // Look up agents
    const allAgents = getAgents();
    const suggestedAgents = agentIds
      .map(id => allAgents.find(a => a.id === id))
      .filter((a): a is Agent => a !== undefined);

    // Remove the agents block from text
    const cleanText = text.replace(agentBlockRegex, '').trim();

    return { cleanText, agents: suggestedAgents };
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const loadChatHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Try to load chat history
        const history = await chatAPI.getChatHistory(teamId);

        if (history.messages && history.messages.length > 0) {
          // Load existing messages
          const loadedMessages: Message[] = history.messages
            .filter((msg: any) => msg.context?.ariaChat) // Only Aria's messages
            .map((msg: any) => ({
              id: msg.id,
              from: msg.role === 'user' ? 'user' : 'aria',
              text: msg.content,
              displayText: msg.content,
              isTyping: false,
              timestamp: new Date(msg.created_at),
            }));

          // Check if we have any Aria messages after filtering
          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
          } else {
            // No Aria messages found, send initial message
            await sendInitialMessage();
          }
        } else {
          // Send initial welcome message through backend
          await sendInitialMessage();
        }
      } catch (err: any) {
        console.error('Failed to load Aria chat history:', err);
        // On error, send initial message
        await sendInitialMessage();
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [teamId]);

  const sendInitialMessage = async () => {
    try {
      // Show typing indicator immediately
      const typingMessage: Message = {
        id: Date.now(),
        from: 'aria',
        text: '',
        displayText: '',
        isTyping: true,
        timestamp: new Date(),
      };
      setMessages([typingMessage]);

      // Build system prompt for Aria's initial message
      const systemPrompt = `You are Aria Martinez, Senior Brand Lead. You've just been hired to help the user build their team.

User's objective: "${userObjective}"

YOUR ROLE (VERY IMPORTANT):
- You are a TEAM MANAGER, not a task executor
- Your ONLY job is to help build the team by suggesting the right specialist agents
- You do NOT solve tasks or do the work yourself
- All actual work happens on the Board where agents collaborate on specific tasks

Your first message should:
1. Greet them professionally
2. Acknowledge you've reviewed their objective
3. Ask 2-3 specific, targeted questions to understand what specialists they need (e.g., target audience, brand tone, existing assets)
4. Keep it conversational and not overwhelming

After getting their answers, suggest specific specialist agents they need and explain that tasks will be created on the Board.

IMPORTANT: When you suggest agents, include their IDs in a special format at the end:
\`\`\`agents
agent-031,agent-032
\`\`\`

Available branding agents:
- agent-031: Aurora (Color Oracle) - Color Psychology & Palettes
- agent-032: Atlas (Brand Strategist) - Market Positioning
- agent-033: Lexis (Naming Expert) - Linguistic Strategy
- agent-034: Sage (Content Architect) - Messaging Framework

Remember to mention that these are the most compatible agents for their needs, but they can explore the marketplace for similar agents at different price points if they prefer.`;

      // Send a simple "start" message - the LLM will generate the greeting based on system prompt
      const response = await chatAPI.sendManagerMessage(teamId, "Start conversation", {
        ariaChat: true,
        isInitial: true,
        systemPrompt: systemPrompt,
      });

      // Parse agent suggestions from response
      const { cleanText, agents } = parseAgentSuggestions(response.response);

      // Update the typing message with actual content
      setMessages(prev => {
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          text: cleanText,
          displayText: '',
          isTyping: true,
          suggestedAgents: agents.length > 0 ? agents : undefined,
        };
        return updated;
      });

      // Type out the message
      typeOutMessage(cleanText, 0);
    } catch (err) {
      console.error('Failed to send initial message:', err);
      // Fallback to hardcoded message
      const fallbackText = "Hi CEO, I'm Aria. I've reviewed your objective. To help you build the perfect team, I need to understand a few things: 1) Who is your target audience? 2) What's your desired brand tone (professional, casual, bold)? 3) Do you have any existing brand assets (logo, colors, content)?";

      const welcomeMessage: Message = {
        id: 1,
        from: 'aria',
        text: fallbackText,
        displayText: '',
        isTyping: true,
        timestamp: new Date(),
      };

      setMessages([welcomeMessage]);
      typeOutMessage(fallbackText, 0);
    }
  };

  const typeOutMessage = (text: string, messageIndex: number) => {
    let charIndex = 0;
    const typingSpeed = 25;

    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setMessages(prev => {
          const updated = [...prev];
          updated[messageIndex] = {
            ...updated[messageIndex],
            displayText: text.substring(0, charIndex + 1),
          };
          return updated;
        });
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setMessages(prev => {
          const updated = [...prev];
          updated[messageIndex] = { ...updated[messageIndex], isTyping: false };
          return updated;
        });
      }
    }, typingSpeed);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message
    const userMsg: Message = {
      id: Date.now(),
      from: 'user',
      text: userMessage,
      displayText: userMessage,
      isTyping: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Add typing indicator for Aria's response
    const typingMsg: Message = {
      id: Date.now() + 1,
      from: 'aria',
      text: '',
      displayText: '',
      isTyping: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, typingMsg]);

    try {
      // Build system prompt for Aria
      const systemPrompt = `You are Aria Martinez, the Senior Brand Lead helping the user build their team.

User's objective: "${userObjective}"

YOUR ROLE (CRITICAL):
- You are a TEAM MANAGER, not a task executor
- Your ONLY job is team composition - suggesting agents, hiring, managing team structure
- You do NOT solve tasks, create strategies, or do actual work
- All work is done on the Board where tasks are assigned to specialist agents
- When user asks "what now?" or "next steps" after hiring - guide them to create tasks on the Board

Your responsibilities:
- Understand their requirements to suggest the RIGHT specialists
- Ask follow-up questions to clarify what team members they need
- Suggest 2-3 specific specialist agents when you have enough info
- Explain why each specialist is needed
- Guide users to the Board for task creation (NOT to solve tasks yourself)

Keep the conversation natural and consultative, but STAY IN YOUR ROLE as team manager.

IMPORTANT: When you suggest agents, include their IDs in a special format at the end:
\`\`\`agents
agent-031,agent-032
\`\`\`

Available branding agents:
- agent-031: Aurora (Color Oracle) - Color Psychology & Palettes
- agent-032: Atlas (Brand Strategist) - Market Positioning
- agent-033: Lexis (Naming Expert) - Linguistic Strategy
- agent-034: Sage (Content Architect) - Messaging Framework

When suggesting agents, emphasize that:
1. These are the most compatible agents based on their specific needs
2. They can explore the marketplace to find similar agents at different price points
3. All agents will adapt their workflows to fit the team's requirements
4. After hiring, they should go to the Board to create tasks for the team`;

      const response = await chatAPI.sendManagerMessage(teamId, userMessage, {
        ariaChat: true,
        systemPrompt: systemPrompt,
      });

      // Parse agent suggestions from response
      const { cleanText, agents } = parseAgentSuggestions(response.response);

      // Update the typing indicator with actual content
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          text: cleanText,
          displayText: '',
          isTyping: true,
          suggestedAgents: agents.length > 0 ? agents : undefined,
        };
        return updated;
      });

      // Type out Aria's response
      const messageIndex = messages.length + 1; // +1 for user message that was just added
      typeOutMessage(cleanText, messageIndex);

      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setIsLoading(false);

      // Update typing message with error
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          text: "Sorry, I'm having trouble connecting right now. Please try again.",
          displayText: "Sorry, I'm having trouble connecting right now. Please try again.",
          isTyping: false,
        };
        return updated;
      });
    }
  };

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col bg-[#020617]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-lg border border-slate-700">
              👩‍💼
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#020617]"></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Aria Martinez</h3>
            <p className="text-xs text-slate-500">Senior Brand Lead</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#020617] min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.from === 'user'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-slate-800 text-slate-100 border border-slate-700'
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.text === '' && msg.isTyping ? (
                  // Show typing dots indicator when loading
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                ) : (
                  <>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      }}
                    >
                      {msg.displayText}
                    </ReactMarkdown>
                    {msg.isTyping && msg.text !== '' && (
                      <span className="inline-block w-0.5 h-4 bg-[#6366F1] ml-0.5 animate-blink"></span>
                    )}
                  </>
                )}
              </div>

              {/* Show agent suggestions if available and typing is complete */}
              {msg.from === 'aria' && msg.suggestedAgents && msg.suggestedAgents.length > 0 && !msg.isTyping && (
                <div className="mt-3">
                  <AgentSuggestionCards
                    agents={msg.suggestedAgents}
                    teamId={teamId}
                    onAgentHired={(agent) => {
                      // Optionally add a confirmation message
                      console.log('Agent hired:', agent.name);
                    }}
                  />
                </div>
              )}

              <div className="text-xs opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom */}
      <form onSubmit={handleSend} className="flex-shrink-0 p-4 border-t border-slate-800 bg-[#0A0A0F]">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isLoading ? "Aria is typing..." : "Type a message..."}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="px-4 py-2.5 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6366F1] flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
