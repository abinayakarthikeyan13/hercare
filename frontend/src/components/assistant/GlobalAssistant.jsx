import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAssistant } from '../../context/AssistantContext';
import { useLanguage } from '../../context/LanguageContext';
import HerCareAvatar from '../common/HerCareAvatar';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  PhoneCall,
  X,
  MessageCircle,
} from 'lucide-react';

/**
 * App-wide floating HerCare assistant.
 *
 * - Renders a tappable avatar on every screen (except /ai, which already
 *   shows the full-screen conversation sharing the SAME conversation state).
 * - Expanding it opens a bottom-sheet chat panel with real text + optional
 *   voice, live page-context chip, suggested-action confirmations, and
 *   honest listening/thinking/speaking/error states.
 * - `embedded` renders inside the phone canvas (absolute); otherwise it is
 *   viewport-fixed for the public onboarding screens.
 * - The emergency alert modal is rendered here so red-flag guidance appears
 *   on every page, not only the full chat screen.
 */
export default function GlobalAssistant({ embedded = false }) {
  const a = useAssistant();
  const { t } = useLanguage();
  const location = useLocation();
  const isAiPage = location.pathname === '/ai';

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Keep the input in sync with recognised speech (typing stays available)
  useEffect(() => {
    if (a.transcript) setInputText(a.transcript);
  }, [a.transcript]);

  // Scroll to newest message inside the panel
  useEffect(() => {
    if (a.isPanelOpen && a.messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [a.messages.length, a.loading, a.isPanelOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    a.sendMessage(inputText);
    setInputText('');
  };

  // Short live caption for the floating bubble (what she is saying / said)
  const captionText = (() => {
    if (!a.lastAssistantText) return '';
    if (!a.isSpeaking && !a.hasUnread) return '';
    const text = a.lastAssistantText.replace(/\s+/g, ' ').trim();
    return text.length > 150 ? `${text.slice(0, 147)}…` : text;
  })();

  const positionClasses = embedded
    ? 'absolute right-2.5 z-40'
    : 'fixed right-3 z-40';
  const fabBottom = embedded ? 'bottom-[74px]' : 'bottom-5';
  const panelClasses = embedded
    ? 'absolute inset-x-0 bottom-0 z-50'
    : 'fixed inset-x-0 bottom-0 z-50';

  return (
    <>
      {/* Emergency Alert Modal — shown on every page when red flag detected */}
      {a.activeEmergency && (
        <div className="fixed inset-0 z-[60] bg-red-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 border-2 border-red-500 shadow-2xl text-xs space-y-3">
            <div className="flex items-center space-x-2 text-red-600 font-black text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{t('common.emergency_alert')}</span>
            </div>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
              {a.activeEmergency.message}
            </p>
            {a.activeEmergency.emergency_hotlines && (
              <div className="space-y-1.5 pt-1">
                {a.activeEmergency.emergency_hotlines.map((hotline, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-red-900 dark:text-red-200">{hotline.name}</div>
                      <div className="text-[10px] text-red-600">{hotline.description}</div>
                    </div>
                    <a
                      href={`tel:${hotline.number}`}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg font-black flex items-center space-x-1"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{hotline.number}</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={a.dismissEmergency}
              className="w-full py-2 bg-slate-200 dark:bg-slate-800 font-bold rounded-xl mt-2"
            >
              {t('common.i_understand')}
            </button>
          </div>
        </div>
      )}

      {/* The full /ai screen already shows the same assistant full-screen */}
      {isAiPage ? null : (
        <>
          {/* Floating Avatar Button (collapsed state) with live caption bubble */}
          {!a.isPanelOpen && (
            <div className={`${positionClasses} ${fabBottom} flex flex-col items-end space-y-1.5`}>
              {/* Caption for what she is saying / just said (spoken or unread) */}
              {captionText && (
                <div className="max-w-[220px] bg-white/95 dark:bg-slate-900/95 border border-purple-200 dark:border-slate-700 rounded-2xl rounded-br-xs px-3 py-2 shadow-lg text-[10px] leading-snug text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                  {captionText}
                  {a.isSpeaking && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse align-middle" />
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => a.setIsPanelOpen(true)}
                className="relative flex flex-col items-center space-y-0.5 group"
                aria-label={t('assistant.open_label')}
                title={t('assistant.open_label')}
              >
                <HerCareAvatar size={46} state={a.avatarState} expression="happy" />
                {/* Unread dot: she said something while the panel was closed */}
                {a.hasUnread && (
                  <span className="absolute top-0 right-1 w-3.5 h-3.5 rounded-full bg-[#FF668A] border-2 border-white dark:border-slate-950 animate-pulse" />
                )}
                <span className="px-1.5 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 border border-purple-200 dark:border-slate-700 text-[8px] font-black text-purple-700 dark:text-purple-300 shadow-sm">
                  {t('assistant.open_label')}
                </span>
              </button>
            </div>
          )}

          {/* Expandable Assistant Panel (bottom sheet) */}
          {a.isPanelOpen && (
            <div
              className={`${panelClasses} flex flex-col bg-[#FAF7FD] dark:bg-slate-950 border-t-2 border-purple-200/70 dark:border-slate-800 rounded-t-3xl shadow-[0_-8px_30px_rgba(100,60,180,0.18)] overflow-hidden`}
              style={{ maxHeight: '78%' }}
              role="dialog"
              aria-label={t('assistant.open_label')}
            >
              {/* Panel Header: identity, live status, page chip, controls */}
              <div className="px-3 py-2 bg-white/95 dark:bg-slate-900/95 border-b border-purple-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <HerCareAvatar size={34} state={a.avatarState} expression="happy" showWaves={false} />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                      {a.assistantName}
                    </div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          a.providerStatus === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500'
                        }`}
                      />
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                        {a.providerStatus === 'live' ? t('chat.live_status') : t('chat.demo_status')}
                      </span>
                      {/* Live page-context chip */}
                      <span className="text-[9px] font-black px-1.5 py-px rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900 truncate max-w-[110px]">
                        {a.pageContext.page_name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {a.ttsSupported && (
                    <button
                      type="button"
                      onClick={a.toggleMute}
                      className={`p-1.5 rounded-xl border transition ${
                        a.isMuted
                          ? 'bg-rose-50 border-rose-200 text-rose-600'
                          : 'bg-slate-100 dark:bg-slate-800 border-purple-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                      title={a.isMuted ? t('chat.unmute_voice') : t('chat.mute_voice')}
                      aria-label={a.isMuted ? t('chat.unmute_voice') : t('chat.mute_voice')}
                    >
                      {a.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => a.setIsPanelOpen(false)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-purple-100 dark:border-slate-700 text-slate-500 hover:text-rose-600 transition"
                    aria-label={t('assistant.close')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Error Banner (real API/voice failures) */}
              {a.actionError && (
                <div className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between space-x-2 shrink-0">
                  <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{a.actionError}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => a.setActionError('')}
                    className="p-0.5 rounded text-rose-500"
                    aria-label="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 min-h-[140px]">
                {a.messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end space-x-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="shrink-0 mb-0.5">
                          <HerCareAvatar size={22} state="idle" expression="happy" showWaves={false} />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] p-2.5 rounded-2xl text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
                          isUser
                            ? 'bg-gradient-to-r from-[#FF668A] to-pink-600 text-white rounded-br-xs shadow-sm font-medium'
                            : msg.is_emergency
                            ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-bl-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-purple-100 dark:border-slate-800 rounded-bl-xs shadow-xs'
                        }`}
                      >
                        {msg.text}
                        <div
                          className={`mt-1 text-[8px] text-right font-semibold ${
                            isUser ? 'text-rose-100' : 'text-slate-400'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {a.loading && (
                  <div className="flex items-center space-x-2 text-[11px] text-purple-600 dark:text-purple-400 font-bold animate-pulse">
                    <HerCareAvatar size={22} state="processing" expression="confused" showWaves={false} />
                    <span>{t('chat.processing')}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested app action — explicit user confirmation before anything runs */}
              {a.suggested && (
                <div className="px-3 py-2 border-t border-purple-100 dark:border-slate-800 bg-purple-50/70 dark:bg-purple-950/30 shrink-0 flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex-1">
                    🔗 {a.suggested.label}
                  </span>
                  <button
                    type="button"
                    onClick={a.cancelSuggestedAction}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {t('assistant.cancel_action')}
                  </button>
                  <button
                    type="button"
                    onClick={a.confirmSuggestedAction}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[#FF668A] text-white shadow-sm"
                  >
                    {t('assistant.confirm_action')}
                  </button>
                </div>
              )}

              {/* Quick contextual prompt + voice status pill */}
              <div className="px-3 py-1.5 border-t border-purple-50 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shrink-0 flex items-center justify-between space-x-2">
                <button
                  type="button"
                  onClick={() => a.sendMessage(t('assistant.what_can_i_do'))}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900/40 hover:bg-purple-100 active:scale-95 transition"
                >
                  <span className="flex items-center space-x-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{t('assistant.what_can_i_do')}</span>
                  </span>
                </button>

                {(a.isListening || a.isSpeaking) && (
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-rose-600 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{a.isListening ? t('chat.listening') : t('chat.speaking')}</span>
                    <button
                      type="button"
                      onClick={a.isListening ? a.stopListening : a.stopSpeaking}
                      className="px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-[9px] font-black text-rose-800 dark:text-rose-200"
                    >
                      {a.isListening ? t('chat.btn_stop_listen') : t('chat.btn_stop_speak')}
                    </button>
                  </div>
                )}
              </div>

              {/* Input: microphone + text + send (typing always works) */}
              <div className="p-2.5 border-t border-purple-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-1">
                <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                  {a.sttSupported && (
                    <button
                      type="button"
                      onClick={a.isListening ? a.stopListening : a.startListening}
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center transition shrink-0 ${
                        a.isListening
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                          : 'bg-purple-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
                      }`}
                      title={a.isListening ? t('chat.mic_stop') : t('chat.mic_start')}
                      aria-label={a.isListening ? t('chat.mic_stop') : t('chat.mic_start')}
                    >
                      {a.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t('chat.input_placeholder')}
                    className="flex-1 px-3 py-2 rounded-2xl border border-purple-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || a.loading}
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white transition shrink-0 ${
                      inputText.trim() && !a.loading
                        ? 'bg-[#FF668A] hover:bg-rose-600 shadow-md shadow-rose-500/25 active:scale-95'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                    aria-label="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <p className="text-[8px] text-slate-400 text-center leading-tight">
                  {t('medical_disclaimer')}
                </p>

                {(!a.sttSupported || !a.ttsSupported) && (
                  <p className="text-[8px] text-amber-600 dark:text-amber-400 text-center leading-tight">
                    {!a.sttSupported && t('chat.voice_unsupported_stt')}
                    {!a.sttSupported && !a.ttsSupported && ' '}
                    {!a.ttsSupported && t('chat.voice_unsupported_tts')}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
