/**
 * VoiceInputButton — кнопка голосового ввода (Web Speech API)
 * Распознаёт речь на русском, добавляет текст в textarea
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

// Проверка поддержки Web Speech API
const SpeechRecognition = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

export default function VoiceInputButton({ onResult, disabled, className }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript.trim()) {
        onResult(transcript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        toast.error('Микрофон заблокирован. Разрешите доступ в настройках браузера.');
      } else if (event.error === 'no-speech') {
        toast.info('Речь не обнаружена. Попробуйте ещё раз.');
      } else if (event.error !== 'aborted') {
        toast.error('Ошибка голосового ввода');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, onResult]);

  // Скрываем кнопку если API не поддерживается
  if (!SpeechRecognition) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleRecording}
      disabled={disabled}
      className={`h-8 w-8 ${isRecording ? 'text-red-400 bg-red-500/20 animate-pulse' : 'text-slate-400 hover:text-white'} ${className || ''}`}
      title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
    >
      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
