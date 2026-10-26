import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import { useCycle } from './CycleContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import {
  getLocalPreference,
  saveLocalChatMessage,
  getLocalChatMessages,
  getLocalChatSessions,
  deleteLocalChatSession,
} from '../lib/db';
import { getDefaultPageMeta } from '../lib/pageMeta';
import api from '../lib/api';

/**
 * App-wide HerCare assistant state.
 *
 * - ONE conversation store shared by the full-screen /ai chat and the
 *   floating assistant panel, so navigating between pages never resets the
 *   conversation. Conversations are organised as ChatGPT-style sessions
 *   persisted in IndexedDB (chatHistory.sessionId).
 * - ONE speech-recognition / speech-synthesis pair with real listening,
 *   thinking, speaking and error states.
 * - Page context: static per-route metadata (lib/pageMeta.js) merged with
 *   live per-page overrides registered via usePageContext().
 * - Action registry: pages register real, validated app functions; only
 *   actions registered on the current page are advertised to the AI, and
 *   sensitive ones are confirmed before they ever run.
 */
const AssistantContext = createContext(null);

export function AssistantProvider({ children }) {
  const { language, setLanguage, t } = useLanguage();
  const { toggleTheme } = useTheme();
  const { getCurrentPhase } = useCycle();
  const location = useLocation();
  const navigate = useNavigate();

  // ---------------------------------------------------------------------
  // Conversation state (persisted in IndexedDB like the original chat)
  // ---------------------------------------------------------------------
  const [messages, setMessages] = useState([]);
  const [assistantName, setAssistantName] = useState('HerCare AI');
  const [loading, setLoading] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState('');
  const [providerStatus, setProviderStatus] = useState('demo'); // 'demo' | 'live'
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [actionError, setActionError] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [suggested, setSuggested] = useState(null); // {id, label} awaiting user confirmation
  const [hasUnread, setHasUnread] = useState(false); // panel closed + new spoken message
  // ChatGPT-style conversation sessions (persisted per chatHistory.sessionId)
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => `session_${Date.now()}`);
  const activeSessionIdRef = useRef(activeSessionId);
  const setActiveSession = (id) => {
    activeSessionIdRef.current = id;
    setActiveSessionId(id);
  };
  const historyLoaded = useRef(false);
  const greetedRoutesRef = useRef(new Set()); // greet each screen once per session
  const pageContextRef = useRef(null); // always-fresh page context for async flows

  // ---------------------------------------------------------------------
  // Speech: single app-wide Web Speech API instances
  // ---------------------------------------------------------------------
  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isMuted,
    toggleMute,
    isSupported: ttsSupported,
    hasVoiceFor,
    waitForVoice,
  } = useSpeechSynthesis();

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: sttSupported,
    error: speechError,
  } = useSpeechRecognition({
    language,
    // Kept in a ref inside the hook: this callback used to be a fresh arrow
    // every render, which re-created the recognition engine on each render
    // and aborted the mic after the first spoken word.
    onResult: () => {},
  });

  // Honest, human-readable voice error messages (real speech events only)
  useEffect(() => {
    if (!speechError) return;
    const map = {
      'not-allowed': t('chat.speech_not_allowed'),
      'service-not-allowed': t('chat.speech_not_allowed'),
      'no-speech': t('chat.speech_no_speech'),
      network: t('chat.speech_network'),
      'language-not-supported': t('chat.speech_language'),
    };
    setActionError(map[speechError] || t('chat.speech_generic'));
    const id = setTimeout(() => setActionError(''), 6000);
    return () => clearTimeout(id);
  }, [speechError, t]);

  // ---------------------------------------------------------------------
  // Load nickname + the most recent conversation once (survives route
  // changes and language switches — the conversation is NOT reset by
  // navigation)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (historyLoaded.current) return;
    historyLoaded.current = true;

    async function loadInitial() {
      try {
        const storedNick = await getLocalPreference('assistant_nickname', 'HerCare AI');
        if (storedNick) setAssistantName(storedNick);

        const sessionList = await getLocalChatSessions();
        setSessions(sessionList);
        const latest = sessionList[0];
        const history = latest ? await getLocalChatMessages(latest.sessionId, 200) : [];
        if (history.length > 0) {
          setActiveSession(latest.sessionId);
          const ordered = history; // already oldest → newest
          setMessages(ordered);
          const lastAsst = [...ordered].reverse().find((m) => m.role === 'assistant');
          if (lastAsst) setLastAssistantText(lastAsst.text);
        } else {
          const welcomeText = welcomeTextFor(language);
          setMessages([
            {
              id: 'msg_init',
              role: 'assistant',
              text: welcomeText,
              language,
              createdAt: new Date().toISOString(),
            },
          ]);
          setLastAssistantText(welcomeText);
        }
      } catch (err) {
        console.warn('Assistant history load failed:', err);
      }
    }
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Append an assistant message into the live conversation (and persist it
  // to IndexedDB like every user-triggered exchange).
  // ---------------------------------------------------------------------
  const appendAssistantText = (text, opts = {}) => {
    const { persist = true } = opts;
    const msg = {
      id: `asst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      text,
      language,
      sessionId: activeSessionIdRef.current,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    setLastAssistantText(text);
    if (persist) saveLocalChatMessage(msg).catch(() => {});
    return msg;
  };

  // ---------------------------------------------------------------------
  // Page context: static route meta + per-page live overrides
  // ---------------------------------------------------------------------
  const [overridesByRoute, setOverridesByRoute] = useState({});

  const setOverridesForRoute = useCallback((route, meta) => {
    setOverridesByRoute((prev) => ({
      ...prev,
      [route]: { ...(prev[route] || {}), ...meta },
    }));
  }, []);

  const baseMeta = useMemo(
    () => getDefaultPageMeta(location.pathname, language),
    [location.pathname, language]
  );
  const overrides = overridesByRoute[location.pathname] || {};

  const pageName = overrides.pageName || baseMeta.pageName;
  const purpose = overrides.purpose || baseMeta.purpose;
  const sections = useMemo(
    () => [...(baseMeta.sections || []), ...(overrides.sections || [])],
    [baseMeta, overrides]
  );

  // ---------------------------------------------------------------------
  // Action registry: id -> {id, label, needsConfirm, run}
  // ---------------------------------------------------------------------
  const [registered, setRegistered] = useState({});

  const registerAction = useCallback((action) => {
    setRegistered((prev) => ({ ...prev, [action.id]: action }));
    return () => {
      setRegistered((prev) => {
        const next = { ...prev };
        delete next[action.id];
        return next;
      });
    };
  }, []);

  // Built-in actions available wherever a page advertises them. Registered
  // here (not in pages) so language/theme/navigation work from any screen.
  useEffect(() => {
    const unsubs = [
      registerAction({
        id: 'go_home',
        label: t('assistant.go_home'),
        needsConfirm: false,
        run: () => {
          navigate('/home');
          return { ok: true, message: t('assistant.action_opened') };
        },
      }),
      registerAction({
        id: 'go_ai',
        label: t('assistant.go_ai'),
        needsConfirm: false,
        run: () => {
          navigate('/ai');
          return { ok: true, message: t('assistant.action_opened') };
        },
      }),
      registerAction({
        id: 'go_cycle',
        label: t('assistant.go_cycle'),
        needsConfirm: false,
        run: () => {
          navigate('/cycle');
          return { ok: true, message: t('assistant.action_opened') };
        },
      }),
      registerAction({
        id: 'go_settings',
        label: t('assistant.go_settings'),
        needsConfirm: false,
        run: () => {
          navigate('/settings');
          return { ok: true, message: t('assistant.action_opened') };
        },
      }),
      registerAction({
        id: 'go_login',
        label: t('assistant.go_login'),
        needsConfirm: false,
        run: () => {
          navigate('/login');
          return { ok: true, message: t('assistant.action_opened') };
        },
      }),
      registerAction({
        id: 'change_language',
        label: t('assistant.change_language'),
        needsConfirm: false,
        run: () => {
          const next = language === 'en' ? 'ta' : 'en';
          setLanguage(next);
          return {
            ok: true,
            message: next === 'ta' ? 'இனி தமிழில் பேசுவோம்.' : 'Now in English.',
          };
        },
      }),
      registerAction({
        id: 'toggle_theme',
        label: t('assistant.toggle_theme'),
        needsConfirm: false,
        run: () => {
          toggleTheme();
          return { ok: true, message: t('assistant.action_opened') };
        },
      }),
    ];
    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [registerAction, navigate, t, language, setLanguage, toggleTheme]);

  // Page context advertised to the AI: static meta + live overrides, plus
  // only the actions THIS page advertises (pageMeta.actionIds ∩ registry).
  const pageContext = useMemo(
    () => ({
      route: location.pathname,
      page_name: pageName,
      purpose,
      sections,
      actions: Object.values(registered)
        .filter((a) => (baseMeta.actionIds || []).includes(a.id))
        .map((a) => ({ id: a.id, label: a.label, needs_confirm: !!a.needsConfirm })),
    }),
    [location.pathname, pageName, purpose, sections, registered, baseMeta]
  );

  useEffect(() => {
    pageContextRef.current = pageContext;
  }, [pageContext]);

  // ---------------------------------------------------------------------

  const GUIDED_ROUTES = [
    '/welcome',
    '/login',
    '/verify-otp',
    '/privacy-agreement',
    '/language-select',
    '/onboarding',
  ];

  useEffect(() => {
    const route = location.pathname;
    if (!route || route === '/ai' || greetedRoutesRef.current.has(route)) return;

    const timer = setTimeout(async () => {
      // Mark greeted only when the timer actually fires: React StrictMode's
      // mount→cleanup→mount double-run cancels the first timer before this
      // point, so the greeting is never lost or duplicated.
      greetedRoutesRef.current.add(route);
      try {
        // Read the ref at fire time so live page overrides (e.g. the
        // onboarding nickname screen, today's check-in state) are included.
        const res = await api.post('/page-greeting', {
          language,
          page_context: pageContextRef.current,
        });
        const msg = res?.data?.message;
        if (!msg) return;
        appendAssistantText(msg, { persist: true });
        setHasUnread(true);
        // On the guided setup screens she opens the conversation herself
        if (GUIDED_ROUTES.includes(route)) setIsPanelOpen(true);
        // Speak only when this device really has a voice for the language —
        // waiting briefly for the async voice catalog. Otherwise the caption
        // bubble still shows every word (no fake speech). Deliberately NOT
        // gated on effect-cleanup: a background effect re-run (e.g. language
        // rehydration) must not swallow the spoken greeting.
        if (!isMuted) {
          const canSpeak = await waitForVoice(language, 2500);
          if (canSpeak) speak(msg, language);
        }
      } catch (err) {
        // Offline / rate-limited: skip silently; the assistant stays usable.
        console.warn('Page greeting skipped:', err?.message || err);
      }
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, language]);

  // ---------------------------------------------------------------------
  // Real conversation loop: page context + user message -> backend -> reply
  // ---------------------------------------------------------------------
  const sendMessage = async (rawText) => {
    const text = (rawText || '').trim();
    if (!text || loading) return;

    if (isListening) stopListening();
    stopSpeaking();
    resetTranscript();
    setActionError('');
    setAvatarError(false);
    setSuggested(null);

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      language,
      sessionId: activeSessionIdRef.current,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    saveLocalChatMessage(userMsg).catch(() => {});

    setLoading(true);
    try {
      const phaseInfo = getCurrentPhase();
      const res = await api.post('/chat', {
        message: text,
        language,
        context: {
          ...(phaseInfo?.hasRecords
            ? { cycle_phase: phaseInfo.phase, day: phaseInfo.dayOfCycle }
            : {}),
        },
        page_context: pageContext,
      });

      const data = res.data;
      setProviderStatus(data.is_live_ai ? 'live' : 'demo');

      const assistantMsg = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        text: data.message,
        language: data.language,
        sessionId: activeSessionIdRef.current,
        is_emergency: data.is_emergency,
        emergency_hotlines: data.emergency_hotlines,
        is_live_ai: data.is_live_ai,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLastAssistantText(data.message);
      saveLocalChatMessage(assistantMsg).catch(() => {});

      // First message of a conversation gives it its ChatGPT-style title.
      refreshSessions().catch(() => {});

      if (data.suggested_action && data.suggested_action.id) {
        setSuggested({ id: data.suggested_action.id, label: data.suggested_action.label });
      }

      if (data.is_emergency) {
        setActiveEmergency(data);
      } else if (!isMuted && hasVoiceFor(language)) {
        speak(data.message, language);
      }
    } catch (err) {
      console.warn('AI request failed, falling back to local guidance:', err);
      setAvatarError(true);
      setActionError(t('chat.conn_error'));
      setTimeout(() => setAvatarError(false), 5000);
      const fallbackText =
        language === 'ta'
          ? 'மன்னிக்கவும், தகவல் தொடர்பில் தாமதம் ஏற்பட்டுள்ளது. அடிவயிற்றில் வெந்நீர் ஒத்தடம் வைத்து ஓய்வெடுங்கள்.'
          : 'I am here for you. For mild cramping, applying warm heat to your lower abdomen and resting can bring gentle relief.';
      appendAssistantText(fallbackText, { persist: true });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Sensitive-action confirmation: only run registered page actions after
  // the user confirms, and never claim success the app did not confirm.
  // ---------------------------------------------------------------------
  const confirmSuggestedAction = async () => {
    const current = suggested;
    setSuggested(null);
    if (!current) return;

    const action = registered[current.id];
    if (!action || typeof action.run !== 'function') {
      appendAssistantText(t('assistant.action_unavailable'));
      return;
    }
    try {
      const result = await action.run();
      if (result && result.ok === false) {
        appendAssistantText(result.message || t('assistant.action_failed'));
      } else {
        appendAssistantText((result && result.message) || t('assistant.action_done'));
      }
    } catch (err) {
      console.warn('Assistant action failed:', err);
      appendAssistantText(t('assistant.action_failed'));
    }
  };

  const cancelSuggestedAction = () => setSuggested(null);

  // ---------------------------------------------------------------------
  // ChatGPT-style sessions: list, open, start new, delete
  // ---------------------------------------------------------------------
  const welcomeTextFor = (lang) =>
    lang === 'ta'
      ? 'வணக்கம்! நான் உங்கள் ஹெர்கேர் நல்வாழ்வுத் தோழி. 🌸 இன்று உங்களுக்கு எப்படி உதவட்டும்?'
      : 'Hello! I am HerCare, your personal menstrual health companion. 🌸 How are you feeling today?';

  const refreshSessions = async () => {
    try {
      const list = await getLocalChatSessions();
      setSessions(list);
    } catch (err) {
      console.warn('Session list refresh failed:', err);
    }
  };

  const newChat = () => {
    stopListening();
    const id = `session_${Date.now()}`;
    setActiveSession(id);
    const welcomeText = welcomeTextFor(language);
    setMessages([
      {
        id: `msg_init_${id}`,
        role: 'assistant',
        text: welcomeText,
        language,
        createdAt: new Date().toISOString(),
      },
    ]);
    setLastAssistantText(welcomeText);
    setSuggested(null);
  };

  const selectSession = async (id) => {
    if (!id || id === activeSessionIdRef.current) return;
    stopListening();
    try {
      const rows = await getLocalChatMessages(id, 200);
      setActiveSession(id);
      if (rows.length > 0) {
        setMessages(rows);
        const lastAsst = [...rows].reverse().find((m) => m.role === 'assistant');
        if (lastAsst) setLastAssistantText(lastAsst.text);
      } else {
        const welcomeText = welcomeTextFor(language);
        setMessages([
          {
            id: `msg_init_${id}`,
            role: 'assistant',
            text: welcomeText,
            language,
            createdAt: new Date().toISOString(),
          },
        ]);
        setLastAssistantText(welcomeText);
      }
      setSuggested(null);
    } catch (err) {
      console.warn('Session load failed:', err);
    }
  };

  const deleteSession = async (id) => {
    try {
      await deleteLocalChatSession(id);
      await refreshSessions();
      if (id === activeSessionIdRef.current) newChat();
      return true;
    } catch (err) {
      console.error('Failed to delete session:', err);
      return false;
    }
  };

  const clearHistory = async () => {
    try {
      // Clear only the CURRENT conversation (ChatGPT-style); other chats
      // stay available in the history list.
      await deleteLocalChatSession(activeSessionIdRef.current);
      setMessages([]);
      setSuggested(null);
      await refreshSessions();
      try {
        await api.delete('/privacy/chat-history');
      } catch (cloudErr) {
        console.warn('Cloud chat history purge skipped:', cloudErr);
      }
      return true;
    } catch (err) {
      console.error('Failed to clear chat history:', err);
      return false;
    }
  };

  const dismissEmergency = () => setActiveEmergency(null);

  const avatarState = avatarError
    ? 'error'
    : isListening
    ? 'listening'
    : loading
    ? 'processing'
    : isSpeaking
    ? 'speaking'
    : 'idle';

  const value = {
    // conversation
    messages,
    setMessages,
    loading,
    sendMessage,
    clearHistory,
    sessions,
    activeSessionId,
    newChat,
    selectSession,
    deleteSession,
    refreshSessions,
    lastAssistantText,
    providerStatus,
    assistantName,
    activeEmergency,
    dismissEmergency,
    actionError,
    setActionError,
    avatarError,
    avatarState,
    suggested,
    confirmSuggestedAction,
    cancelSuggestedAction,
    // panel
    isPanelOpen,
    setIsPanelOpen,
    hasUnread,
    // speech
    speak,
    stopSpeaking,
    isSpeaking,
    isMuted,
    toggleMute,
    ttsSupported,
    hasVoiceFor,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    sttSupported,
    // page context + actions
    pageContext,
    registerAction,
    setOverridesForRoute,
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within an AssistantProvider');
  return ctx;
}

/**
 * Register live page context for the current route from inside a page.
 * Merges into the static meta for that route (pageName, purpose, sections,
 * actionIds). Values are stored per-route, so leaving the page never leaks
 * its context into the next screen.
 */
export function usePageContext(meta) {
  const ctx = useContext(AssistantContext);
  const location = useLocation();
  const route = location.pathname;
  const serialized = JSON.stringify(meta);

  useEffect(() => {
    if (!ctx) return;
    try {
      ctx.setOverridesForRoute(route, JSON.parse(serialized));
    } catch {
      /* ignore malformed meta */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, serialized]);

  return null;
}
