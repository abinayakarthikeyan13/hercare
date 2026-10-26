import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Web Speech API microphone input.
 *
 * Fixes over the previous version:
 * - The recognition instance used to be destroyed and rebuilt on EVERY
 *   render because the `onResult` callback was an inline function (new
 *   identity each render) in the effect's dependency list — which aborted
 *   listening the moment the first interim word arrived. Callbacks now live
 *   in refs; the engine is only rebuilt when `language` changes.
 * - While the user is still listening, a recognition session that ends on
 *   its own (Chrome stops after a few seconds of silence) is restarted
 *   automatically, so one tap keeps listening until the user taps stop.
 * - Interim (in-progress) text is exposed so the UI can show words as they
 *   are being spoken.
 */
export function useSpeechRecognition({ language = 'en', onResult } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const wantListeningRef = useRef(false); // user intent (true between start and stop)
  const restartsRef = useRef(0); // consecutive silent auto-restarts
  const hadResultRef = useRef(false); // any final result since start

  // Keep the latest callback without re-triggering the engine effect.
  useEffect(() => {
    onResultRef.current = onResult;
  });

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  // (Re)build the engine only when the language changes.
  useEffect(() => {
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // 'ta' -> 'ta-IN', 'en' -> 'en-IN'
    recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          currentFinal += item[0].transcript;
        } else {
          currentInterim += item[0].transcript;
        }
      }

      if (currentFinal) {
        hadResultRef.current = true;
        restartsRef.current = 0; // real speech resets the restart budget
        setTranscript((prev) => {
          const updated = prev ? `${prev} ${currentFinal}` : currentFinal;
          if (onResultRef.current) onResultRef.current(updated);
          return updated;
        });
        setInterimTranscript('');
      } else if (currentInterim) {
        setInterimTranscript(currentInterim);
      }
    };

    recognition.onerror = (event) => {
      // Fatal errors: stop the loop and surface the message. 'no-speech'
      // and aborted sessions are handled by onend's auto-restart instead.
      const fatal = ['not-allowed', 'service-not-allowed', 'network', 'language-not-supported'];
      if (fatal.includes(event.error)) {
        wantListeningRef.current = false;
        setError(event.error);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Chrome ends the session after a pause. If the user still wants to
      // listen, restart automatically (bounded, and only for silent ends).
      if (
        wantListeningRef.current &&
        restartsRef.current < 5 &&
        !['not-allowed', 'service-not-allowed', 'network'].includes(error)
      ) {
        restartsRef.current += 1;
        try {
          recognition.start();
          return; // onstart will keep isListening true
        } catch {
          /* fall through to stopped state */
        }
      }
      wantListeningRef.current = false;
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      try {
        recognition.abort();
      } catch {
        /* engine already stopped */
      }
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SpeechRecognition, language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    wantListeningRef.current = true;
    restartsRef.current = 0;
    hadResultRef.current = false;
    try {
      recognitionRef.current.start();
    } catch (err) {
      // Already active is fine; anything else is a real failure.
      console.warn('Could not start recognition:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false; // no auto-restart
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop(); // lets final results flush
    } catch (err) {
      console.warn('Could not stop recognition:', err);
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
