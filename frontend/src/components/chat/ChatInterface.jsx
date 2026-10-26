import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAssistant } from '../../context/AssistantContext';
import HerCareAvatar from '../common/HerCareAvatar';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Trash2,
  AlertTriangle,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Menu,
  Plus,
  MessageSquare
} from 'lucide-react';

export default function ChatInterface() {
  const { language, setLanguage, t } = useLanguage();

  // Shared app-wide assistant state: ONE conversation across all pages,
  // one speech pipeline, one page-context source (AssistantContext).
  const {
    messages,
    loading,
    lastAssistantText,
    providerStatus,
    assistantName,
    avatarState,
    actionError,
    setActionError,
    isMuted,
    toggleMute,
    ttsSupported,
    speak,
    stopSpeaking,
    isSpeaking,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    sttSupported,
    sessions,
    activeSessionId,
    newChat,
    selectSession,
    deleteSession,
    refreshSessions,
    suggested,
    confirmSuggestedAction,
    cancelSuggestedAction,
    sendMessage,
    clearHistory,
    hasVoiceFor,
  } = useAssistant();

  const [inputText, setInputText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // ChatGPT-style drawer
  const [deleteTarget, setDeleteTarget] = useState(null); // session pending deletion

  const messagesEndRef = useRef(null);
  const location = useLocation();

  // Sync speech transcript with input field
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Send message through the shared conversation loop
  const handleSendMessage = (msgToSend = inputText) => {
    const text = msgToSend.trim();
    if (!text || loading) return;
    if (isListening) stopListening();
    setInputText('');
    sendMessage(text);
  };

  // Send a message pre-filled from the Home screen's quick-ask box
  useEffect(() => {
    const preset = location.state?.presetMessage;
    if (preset) {
      // Remove the router state so a refresh does not re-send it
      window.history.replaceState({}, document.title);
      handleSendMessage(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearHistory = async () => {
    const ok = await clearHistory();
    if (!ok) {
      setActionError(
        language === 'ta'
          ? 'உரையாடல் வரலாற்றை அழிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
          : 'Could not clear the conversation history. Please try again.'
      );
    }
    setShowClearConfirm(false);
  };

  const quickPrompts = [
    t('chat.sample_1'),
    t('chat.sample_2'),
    t('chat.sample_3'),
    t('chat.sample_4'),
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden select-none bg-[#FAF7FD] dark:bg-slate-950">
      
      {/* Top Companion Header Bar */}
      <div className="px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-purple-100 dark:border-slate-800 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-2.5">
          {/* ChatGPT-style conversation history drawer */}
          <button
            type="button"
            onClick={() => {
              // Re-read sessions at open time so greetings/messages persisted
              // since the last refresh appear in the list.
              refreshSessions().catch(() => {});
              setShowHistory(true);
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-600 transition shrink-0"
            title={t('chat.btn_history')}
            aria-label={t('chat.btn_history')}
          >
            <Menu className="w-4 h-4" />
          </button>
          <HerCareAvatar size={42} state={avatarState} expression="happy" />
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
              {assistantName}
            </h2>
            <div className="flex items-center space-x-1 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  providerStatus === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500'
                }`}
              />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {providerStatus === 'live' ? t('chat.live_status') : t('chat.demo_status')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Audio Mute, Replay, Clear */}
        <div className="flex items-center space-x-1">
          {ttsSupported && (
            <button
              type="button"
              onClick={toggleMute}
              className={`p-1.5 rounded-xl border transition ${
                isMuted
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-slate-100 dark:bg-slate-800 border-purple-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title={isMuted ? t('chat.unmute_voice') : t('chat.mute_voice')}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {lastAssistantText && (
            <button
              type="button"
              onClick={() => {
                if (hasVoiceFor(language)) {
                  speak(lastAssistantText, language);
                } else {
                  // Honest: this device has no voice for the current language
                  setActionError(t('chat.voice_unsupported_tts'));
                }
              }}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-purple-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-purple-600 transition"
              title={t('chat.btn_replay')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-purple-100 dark:border-slate-700 text-slate-500 hover:text-rose-600 transition"
            title={t('chat.btn_clear')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Local Action Error Banner (e.g. failed history clear) */}
      {actionError && (
        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between space-x-2 shrink-0">
          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{actionError}</span>
          </p>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Internal Scrollable Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-end space-x-2 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="shrink-0 mb-1">
                  <HerCareAvatar size={28} state="idle" expression="happy" showWaves={false} />
                </div>
              )}

              <div
                className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-gradient-to-r from-[#FF668A] to-pink-600 text-white rounded-br-xs shadow-sm font-medium'
                    : msg.is_emergency
                    ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-bl-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-purple-100 dark:border-slate-800 rounded-bl-xs shadow-xs'
                }`}
              >
                {msg.text}

                {/* Subtitle / Timestamp */}
                <div
                  className={`mt-1 text-[9px] text-right font-semibold ${
                    isUser ? 'text-rose-100' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-purple-600 dark:text-purple-400 font-bold animate-pulse">
            <HerCareAvatar size={28} state="processing" expression="confused" showWaves={false} />
            <span>{t('chat.processing')}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested app action — explicit user confirmation before anything runs */}
      {suggested && (
        <div className="px-4 py-2 border-t border-purple-100 dark:border-slate-800 bg-purple-50/70 dark:bg-purple-950/30 shrink-0 flex items-center justify-between space-x-2">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex-1">
            🔗 {suggested.label}
          </span>
          <button
            type="button"
            onClick={cancelSuggestedAction}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            {t('assistant.cancel_action')}
          </button>
          <button
            type="button"
            onClick={confirmSuggestedAction}
            className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-[#FF668A] text-white shadow-sm"
          >
            {t('assistant.confirm_action')}
          </button>
        </div>
      )}

      {/* Quick Prompts Carousel Bar */}
      <div className="px-3 py-1.5 border-t border-purple-50 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur shrink-0 overflow-x-auto flex space-x-2 scrollbar-none">
        {quickPrompts.map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(promptText)}
            className="shrink-0 px-3 py-1 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40 hover:bg-purple-100 active:scale-95 transition"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* Voice Status Pill if Listening or Speaking */}
      {(isListening || isSpeaking) && (
        <div className="px-4 py-1.5 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-100 dark:border-rose-900 flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300 shrink-0">
          <div className="flex items-center space-x-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{isListening ? t('chat.listening') : t('chat.speaking')}</span>
          </div>
          <button
            type="button"
            onClick={isListening ? stopListening : stopSpeaking}
            className="px-2 py-0.5 rounded-lg bg-rose-200 dark:bg-rose-900 text-[10px] font-black uppercase text-rose-800 dark:text-rose-200"
          >
            {isListening ? t('chat.btn_stop_listen') : t('chat.btn_stop_speak')}
          </button>
        </div>
      )}

      {/* Bottom Input Surface (Microphone + Text Input + Send) */}
      <div className="p-3 border-t border-purple-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-1.5">
        {/* Live words as you speak (interim recognition text) */}
        {isListening && (interimTranscript || transcript) && (
          <p className="text-[10px] italic text-purple-500 dark:text-purple-400 px-1 truncate">
            🎙 {interimTranscript || transcript}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          {/* Voice Microphone Control */}
          {sttSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-purple-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
              }`}
              title={isListening ? t('chat.mic_stop') : t('chat.mic_start')}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('chat.input_placeholder')}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-purple-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white transition shrink-0 ${
              inputText.trim() && !loading
                ? 'bg-[#FF668A] hover:bg-rose-600 shadow-md shadow-rose-500/25 active:scale-95'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Mandatory Medical Disclaimer Label */}
        <p className="text-[9px] text-slate-400 text-center leading-tight">
          {t('medical_disclaimer')}
        </p>

        {/* Voice capability honesty: say what this browser cannot do */}
        {(!sttSupported || !ttsSupported) && (
          <p className="text-[9px] text-amber-600 dark:text-amber-400 text-center leading-tight">
            {!sttSupported && t('chat.voice_unsupported_stt')}
            {!sttSupported && !ttsSupported && ' '}
            {!ttsSupported && t('chat.voice_unsupported_tts')}
          </p>
        )}
      </div>

      {/* Clear Conversation Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-purple-100 dark:border-slate-800 text-center space-y-3 text-xs">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {t('chat.btn_clear')}
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              {t('chat.clear_confirm')}
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold"
              >
                {t('chat.btn_cancel')}
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold"
              >
                {t('chat.btn_confirm_clear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ChatGPT-style conversation history drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex animate-fadeIn">
          <div className="w-72 max-w-[82%] h-full bg-white dark:bg-slate-900 shadow-2xl border-r border-purple-100 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-purple-50 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span>{t('chat.history_title')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
                aria-label="Close history"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  newChat();
                  setShowHistory(false);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF668A] to-pink-600 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-md shadow-rose-500/25 active:scale-98 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t('chat.new_chat')}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {sessions.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-6">
                  {t('chat.no_history')}
                </p>
              )}
              {sessions.map((session) => {
                const isActive = session.sessionId === activeSessionId;
                return (
                  <div
                    key={session.sessionId}
                    className={`group flex items-center space-x-1 rounded-xl border transition ${
                      isActive
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/60 hover:border-purple-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        selectSession(session.sessionId);
                        setShowHistory(false);
                      }}
                      className="flex-1 text-left px-3 py-2.5 min-w-0"
                    >
                      <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                        {session.title || t('chat.session_new')}
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">
                        {new Date(session.lastMessageAt).toLocaleDateString()} · {session.messageCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(session)}
                      className="p-2 mr-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                      title={t('chat.delete_chat_confirm')}
                      aria-label={t('chat.delete_chat_confirm')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className="flex-1 bg-black/50 backdrop-blur-xs"
            onClick={() => setShowHistory(false)}
          />
        </div>
      )}

      {/* Delete-one-conversation confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-3 text-xs">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {t('chat.history_title')}
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              {t('chat.delete_chat_confirm')}
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold"
              >
                {t('chat.btn_cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteSession(deleteTarget.sessionId);
                  setDeleteTarget(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold"
              >
                {t('chat.btn_confirm_clear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Alert Modal is rendered app-wide by GlobalAssistant */}

    </div>
  );
}
