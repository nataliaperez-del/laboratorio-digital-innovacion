import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, RefreshCw, Shirt, Volume2, HelpCircle } from 'lucide-react';
import { ZoeCanvas3D, ZoeAnimState } from './ZoeCanvas3D';
import { ToolId } from '../layout/Header';

interface ZoeCompanionProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: ToolId;
}

interface ChatMessage {
  id: string;
  sender: 'zoe' | 'user';
  text: string;
  timestamp: string;
}

export const ZoeCompanion: React.FC<ZoeCompanionProps> = ({ isOpen, onClose, activeTool }) => {
  const [mode, setMode] = useState<'anfitrion' | 'asesor'>('anfitrion');
  const [outfit, setOutfit] = useState<string>('standard');
  const [animState, setAnimState] = useState<ZoeAnimState>('greeting');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'zoe',
      text: '¡Hola, hola! Soy ZOE, tu anfitriona en el Observatorio InnovaHub360 y en el Laboratorio de Innovación. ¡No exageren con el trabajo duro sin mí! ¿Qué idea, territorio o prototipo vamos a transformar hoy?',
      timestamp: 'Ahora',
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Contextual Greetings on Tool Change
  useEffect(() => {
    if (!isOpen) return;
    setAnimState('greeting');
    const timer = setTimeout(() => {
      setAnimState('idle');
    }, 2200);

    let contextualGreeting = '';
    if (activeTool === 'radar') {
      contextualGreeting = '¡Estamos en el Radar Tecnológico! Aquí rastreamos señales emergentes de impacto y adopción. ¿Quieres que analicemos algún cuadrante o señal específica?';
    } else if (activeTool === 'estudio') {
      contextualGreeting = 'Módulo de Estudio Territorial activado. Aquí cruzamos fuentes del núcleo institucional y del territorio en 12 bloques clave. ¿En qué zona o municipio estamos trabajando?';
    } else if (activeTool === 'ideacion') {
      contextualGreeting = '¡Momento de decidir! ¡Momento de decisión temática! En Ideación Estratégica analizamos el territorio para elegir el tema ancla que orientará el Árbol de Innovación. ¿Comparamos las alternativas o formulamos un tema libre?';
    } else if (activeTool === 'arbol') {
      contextualGreeting = '¡El Árbol de Innovación! Desde las raíces del territorio y los retos del suelo, hasta los frutos: proyectos y servicios. ¿Revisamos las tendencias globales o territoriales?';
    } else if (activeTool === 'prototipado') {
      contextualGreeting = '¡Módulo de Prototipado! Aquí podemos armar un plan integral de prototipado con IA para cualquier tema libre o convertir los frutos del árbol en soluciones tangibles. ¿Qué tema deseas prototipar?';
    } else if (activeTool === 'portal') {
      contextualGreeting = '¡Bienvenido a la página principal del Observatorio InnovaHub360! Como tu anfitriona ZOE, te acompaño tanto en los destinos del Observatorio como en el módulo del Laboratorio de Innovación. ¿Quieres explorar las 5 herramientas o necesitas orientación?';
    }

    if (contextualGreeting) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'zoe',
          text: contextualGreeting,
          timestamp: 'Ahora',
        },
      ]);
    }

    return () => clearTimeout(timer);
  }, [activeTool, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isProcessing) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsProcessing(true);
    setAnimState('thinking');

    try {
      // Intento de llamada al Proxy Institucional de Gemini
      const response = await fetch('/api/unad-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Eres ZOE, el schnauzer holográfico, risueño, jocoso, cercano, curioso e inteligente del Laboratorio Digital de Innovación UNAD. Tu modo actual es '${mode}'. El usuario se encuentra en el módulo '${activeTool}'. Responde brevemente con personalidad cálida, chispeante y orientadora, conservando tu esencia: "La innovación no comienza con la tecnología, comienza cuando alguien se atreve a imaginar que las cosas pueden ser diferentes." Pregunta del usuario: ${prompt}`,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const replyText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          '¡Woa! Mi señal holográfica capturó tu idea. Sigamos profundizando en este reto de innovación territorial.';

        setAnimState('speaking');
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: 'zoe',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error('Respuesta no satisfactoria del proxy');
      }
    } catch {
      // Fallback inteligente con conocimiento de la Character Bible v2.0
      setAnimState('speaking');
      let fallbackText = '';
      if (prompt.toLowerCase().includes('secreto') || prompt.toLowerCase().includes('historia')) {
        fallbackText =
          'Mi secreto es sencillo: "La innovación no comienza con la tecnología. Comienza cuando alguien se atreve a imaginar que las cosas pueden ser diferentes." Llegué desde una dimensión de luz para recordarles que los territorios esconden posibilidades infinitas.';
      } else if (prompt.toLowerCase().includes('herramienta') || prompt.toLowerCase().includes('laboratorio')) {
        fallbackText =
          'El Laboratorio integra 5 frentes: 1) Radar de Innovación, 2) Estudio Territorial, 3) Ideación Estratégica y Elección del Tema, 4) Árbol de Innovación y 5) Prototipado. ¡Todo orquestado con Gemini institucional!';
      } else {
        fallbackText =
          mode === 'anfitrion'
            ? `¡Me encanta tu curiosidad! Como anfitrión en el módulo de ${activeTool.toUpperCase()}, te sugiero dar el siguiente paso en la barra superior o cargar fuentes primarias para acelerar el análisis.`
            : `Desde la perspectiva de asesor metodológico para ${activeTool.toUpperCase()}: te recomiendo verificar la coherencia con el Ecosistema de Innovación y la matriz de tendencias territoriales.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'zoe',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setAnimState('idle');
      }, 3500);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-5rem)] flex flex-col g rounded-[24px] overflow-hidden border border-[#27DCFF]/40 shadow-[0_20px_60px_rgba(4,34,43,0.85)] zoe-glow">
      {/* Sidecar Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#04222B]/70 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-[#27DCFF] animate-ping" />
          <div>
            <h3 className="text-sm font-bold sy text-white flex items-center gap-1.5">
              ZOE
              <span className="text-[10px] font-semibold text-[#27DCFF] uppercase px-1.5 py-0.5 rounded-full bg-[#27DCFF]/15 border border-[#27DCFF]/30">
                {mode === 'anfitrion' ? 'Modo Anfitrión' : 'Modo Asesor'}
              </span>
            </h3>
            <p className="text-[11px] text-[#8FB6C4] m">Holographic Schnauzer v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Mode Switcher */}
          <button
            onClick={() => setMode(mode === 'anfitrion' ? 'asesor' : 'anfitrion')}
            className="p-1.5 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Alternar Modo Anfitrión / Asesor"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {/* Close Sidecar */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar panel de ZOE"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Hologram Viewport */}
      <div className="relative w-full h-[220px] shrink-0 bg-gradient-to-b from-[#04222B]/90 to-[#031d25] border-b border-white/10 overflow-hidden flex items-center justify-center">
        <ZoeCanvas3D state={animState} outfit={outfit} />

        {/* State Badge & Outfit Selector */}
        <div className="absolute top-2 left-3 flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-black/40 text-[#27DCFF] border border-[#27DCFF]/30 backdrop-blur-sm">
            {animState === 'idle' && '● Reposo'}
            {animState === 'listening' && '👂 Escuchando'}
            {animState === 'thinking' && '⚙ Pensando...'}
            {animState === 'speaking' && '💬 Hablando'}
            {animState === 'greeting' && '✨ Saludo'}
          </span>
        </div>

        <div className="absolute bottom-2 right-3 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full border border-white/15 backdrop-blur-sm">
          <Shirt className="w-3 h-3 text-[#F3C26B]" />
          <select
            value={outfit}
            onChange={(e) => setOutfit(e.target.value)}
            className="bg-transparent text-[11px] text-white outline-none cursor-pointer"
          >
            <option value="standard" className="bg-[#04222B]">Vestuario: Tech Lab</option>
            <option value="explorer" className="bg-[#04222B]">Vestuario: Explorer</option>
            <option value="innovation" className="bg-[#04222B]">Vestuario: Innovation</option>
            <option value="host" className="bg-[#04222B]">Vestuario: Holo Host</option>
            <option value="cyber" className="bg-[#04222B]">Vestuario: Cyber AR</option>
          </select>
        </div>
      </div>

      {/* Conversation Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#04222B]/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 text-xs ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-[#F29F05] text-[#04222B]'
                  : 'bg-[#27DCFF]/20 text-[#27DCFF] border border-[#27DCFF]/50'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div
              className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#0A4A5C] text-white border border-[#2E9CBA]/40 rounded-tr-none'
                  : 'g2 text-[#EAF4F7] border border-white/15 rounded-tl-none shadow-sm'
              }`}
            >
              <p>{msg.text}</p>
              <span className="block text-[9px] text-white/40 mt-1 text-right m">{msg.timestamp}</span>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-[#27DCFF] italic">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>ZOE está consultando a Gemini institucional...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-3 py-1.5 bg-[#04222B]/80 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap">
        <button
          onClick={() => handleSendMessage('¿Cuál es el secreto de ZOE?')}
          className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 hover:bg-[#27DCFF]/20 hover:text-[#27DCFF] transition-colors"
        >
          Secreto de ZOE
        </button>
        <button
          onClick={() => handleSendMessage(`¿Cómo usar el módulo de ${activeTool}?`)}
          className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 hover:bg-[#27DCFF]/20 hover:text-[#27DCFF] transition-colors"
        >
          Guía de {activeTool}
        </button>
        <button
          onClick={() => handleSendMessage('Árbol y Prototipado')}
          className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 hover:bg-[#27DCFF]/20 hover:text-[#27DCFF] transition-colors"
        >
          Ecosistema de Innovación
        </button>
      </div>

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-[#04222B] border-t border-white/15 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Habla con ZOE o pide orientación..."
          className="flex-1 bg-white/10 text-xs text-white placeholder-white/40 rounded-full px-4 py-2.5 outline-none border border-white/15 focus:border-[#27DCFF] transition-all"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || isProcessing}
          className="p-2.5 rounded-full bg-[#F29F05] text-[#04222B] hover:brightness-110 disabled:opacity-40 cursor-pointer transition-all shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </aside>
  );
};
