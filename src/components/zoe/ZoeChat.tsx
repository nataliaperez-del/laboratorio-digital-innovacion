import React, { useEffect, useRef, useState } from 'react';
import { Mic, Send, Volume2, VolumeX, X } from 'lucide-react';

/** Un mensaje del chat: de la persona o de ZOE. */
export interface ZoeChatMessage {
  id: number;
  from: 'user' | 'zoe';
  text: string;
}

interface Props {
  messages: ZoeChatMessage[];
  /** ZOE está pensando la respuesta. */
  thinking: boolean;
  /** ZOE responde también en voz. */
  voiceOn: boolean;
  /** Se puede volver a hablarle (el navegador tiene reconocimiento de voz). */
  canUseMic: boolean;
  onSend: (text: string) => void;
  onToggleVoice: () => void;
  onUseMic: () => void;
  onClose: () => void;
}

/**
 * Chat flotante con ZOE: para cuando hay ruido, el micrófono falla o la persona prefiere escribir.
 * ZOE responde en texto y, si la voz está activa, también hablando. Es el mismo ZOE de la voz:
 * lo escrito pasa por el mismo camino que lo dicho.
 */
export const ZoeChat: React.FC<Props> = ({ messages, thinking, voiceOn, canUseMic, onSend, onToggleVoice, onUseMic, onClose }) => {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, thinking]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    onSend(text);
  };

  return (
    <section className="zoe-chat" role="dialog" aria-label="Chat con ZOE" aria-live="polite">
      <header className="zoe-chat-head">
        <strong>Escríbele a ZOE</strong>
        <span className="zoe-chat-tools">
          <button
            type="button"
            onClick={onToggleVoice}
            aria-pressed={voiceOn}
            title={voiceOn ? 'ZOE responde en voz y en texto: toca para solo texto' : 'ZOE responde solo en texto: toca para activar su voz'}
            aria-label={voiceOn ? 'Silenciar la voz de ZOE en el chat' : 'Activar la voz de ZOE en el chat'}
          >
            {voiceOn ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
          </button>
          {canUseMic && (
            <button type="button" onClick={onUseMic} title="Volver a hablarle con el micrófono" aria-label="Hablarle a ZOE con el micrófono">
              <Mic className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={onClose} title="Cerrar el chat" aria-label="Cerrar el chat">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </span>
      </header>

      <div className="zoe-chat-log">
        {messages.length === 0 && <p className="zoe-chat-empty">Escribe tu pregunta o pídeme algo, por ejemplo «llévame al Árbol de Innovación».</p>}
        {messages.map((m) => (
          <p key={m.id} className={m.from === 'user' ? 'zoe-msg zoe-msg-user' : 'zoe-msg zoe-msg-zoe'}>
            {m.text}
          </p>
        ))}
        {thinking && <p className="zoe-msg zoe-msg-zoe zoe-msg-thinking">Pensando…</p>}
        <div ref={endRef} />
      </div>

      <form className="zoe-chat-form" onSubmit={submit}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escríbele a ZOE…"
          aria-label="Mensaje para ZOE"
          autoComplete="off"
          maxLength={600}
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Enviar mensaje">
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
};
