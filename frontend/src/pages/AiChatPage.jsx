import React from 'react';
import ChatInterface from '../components/chat/ChatInterface';

/** HerCare AI conversation screen (voice + text, history, speaking controls). */
export default function AiChatPage() {
  return (
    <div className="flex-1 w-full h-full overflow-hidden animate-fadeIn">
      <ChatInterface />
    </div>
  );
}
