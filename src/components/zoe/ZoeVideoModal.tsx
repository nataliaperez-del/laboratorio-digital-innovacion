import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** El video de presentación de ZOE, grande en pantalla; se abre con la carita de sus controles. */
export const ZoeVideoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    void video?.play().catch(() => {
      // Si el navegador no deja reproducir con sonido, se intenta en silencio; el control sigue ahí.
      if (video) {
        video.muted = true;
        void video.play().catch(() => undefined);
      }
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="zoe-video-modal" role="dialog" aria-modal="true" aria-label="Presentación de ZOE" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="zoe-video-close" onClick={onClose} aria-label="Cerrar la presentación de ZOE">
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
      <video ref={videoRef} src="/assets/zoe/zoe_presentation.mp4" controls playsInline onEnded={onClose} className="zoe-video-player" title="Presentación de ZOE">
        Tu navegador no soporta reproducción de video.
      </video>
    </div>
  );
};

export default ZoeVideoModal;
