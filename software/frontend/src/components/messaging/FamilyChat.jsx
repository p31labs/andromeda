
  const messagesEndRef = useRef(null);
  const clientRef = useRef(null);




        setMessages(prev => prev.map(m =>

    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === message.id)) return prev;

    setMessages(prev => prev.map(m =>
    setMessages(prev => prev.map(m =>




          <button

        <div className="conversations-list">
          {loading && <div className="loading">Loading...</div>}
          {error && <div className="error">{error}</div>}





                  <div className="message-meta">
                    <span className="message-time">{formatTime(msg.timestamp)}</span>




              <button
export default FamilyChat;
