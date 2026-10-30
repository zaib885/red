import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import { Shell } from '../components/Shell';
import { ChatBubble } from '../components/ChatBubble';
import { ErrorBanner } from '../components/ErrorBanner';
import { useRoutesContext } from '@/context/RoutesContext';
import { useDemoMode } from '@/context/DemoModeContext';
import { useSimulation } from '@/context/SimulationContext';
import { useAllBuses } from '@/hooks/useAllBuses';
import { BOARDING_STORAGE_KEY, DEMO_LIVE_ROUTE_IDS } from '@/data/settings';
import { getServerNow } from '@/firebase/serverClock';
import { answerQuestion } from '@/utils/assistantEngine';
import { listFreshActiveBuses } from '@/utils/busStatus';

const starter = { role: 'assistant', text: 'Hi, I can help with live buses, routes and approximate arrival times.' };
const suggestions = ['Where is my bus?', 'When will it arrive?', 'Which buses are active?', 'What is the next stop?', 'What is the R9 route?'];

export function Assistant() {
  const { routes } = useRoutesContext();
  const { demoMode } = useDemoMode();
  const { positions } = useSimulation();
  const { buses, error, now } = useAllBuses();
  const activeBuses = useMemo(
    () => (demoMode
      ? Object.values(positions).filter((position) => DEMO_LIVE_ROUTE_IDS.includes(position.routeId))
      : listFreshActiveBuses(buses, now)),
    [demoMode, positions, buses, now],
  );

  const [messages, setMessages] = useState([starter]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [lastBus, setLastBus] = useState(null);
  const [lastRoute, setLastRoute] = useState(null);
  const chatRef = useRef(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const ask = (question = input) => {
    const trimmed = question.trim();
    if (!trimmed || typing) return;
    setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    setInput('');
    setTyping(true);
    window.setTimeout(() => {
      const result = answerQuestion(trimmed, {
        routes,
        activeBuses,
        demoMode,
        now: getServerNow(),
        savedBoarding: localStorage.getItem(BOARDING_STORAGE_KEY),
        lastBus,
        lastRoute,
      });
      if (result.busId) setLastBus(result.busId);
      if (result.routeId) setLastRoute(result.routeId);
      setMessages((current) => [...current, { role: 'assistant', text: result.text }]);
      setTyping(false);
    }, 500);
  };

  const clear = () => {
    setMessages([starter]);
    setLastBus(null);
    setLastRoute(null);
  };

  return (
    <Shell title="RoutVia AI Assistant" subtitle="Your guide to Karachi Red Bus">
      <ErrorBanner type="listener" error={error} />
      <main className="assistant-page">
        <div className="assistant-hero">
          <div className="assistant-avatar"><Sparkles size={22} /></div>
          <div><p className="eyebrow">Always here to help</p><h1>RoutVia AI Assistant</h1><span>Answers from your live network</span></div>
          <button className="clear-chat" onClick={clear} aria-label="Clear chat"><Trash2 size={16} /></button>
          <span className="online-label"><span className="pulse-dot" /> Online</span>
        </div>
        <div className="suggestions">
          {suggestions.map((question) => <button key={question} onClick={() => ask(question)}>{question}</button>)}
        </div>
        <div className="chat-window" ref={chatRef}>
          {messages.map((message, index) => (
            <ChatBubble key={`${message.role}-${index}`} role={message.role} text={message.text} />
          ))}
          {typing && <div className="typing-indicator"><span /><span /><span /> RoutVia is thinking…</div>}
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a bus or route…" />
          <button aria-label="Send question" disabled={typing}><Send size={18} /></button>
        </form>
        <p className="assistant-disclaimer">RoutVia AI uses real network data when available. All arrival times are approximate.</p>
      </main>
    </Shell>
  );
}
