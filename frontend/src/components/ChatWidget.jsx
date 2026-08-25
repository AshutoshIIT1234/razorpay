import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import axios from 'axios';
import './ChatWidget.css';

const API_URL = 'http://localhost:3000/api/agent'; // Assuming backend is on port 3000

export default function ChatWidget({ onSessionChange, initialQuery, onAddToCart, onRemoveFromCart, onUpdateCartQty, onClearCart, cart }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your AI concierge. How can I help you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (initialQuery) {
      setIsOpen(true);
      setInputValue(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = { role: 'user', content: inputValue.trim() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        sessionId,
        messages: newMessages,
        cart: cart || []
      });

      if (response.data.sessionId && !sessionId) {
        setSessionId(response.data.sessionId);
        if (onSessionChange) {
          onSessionChange(response.data.sessionId);
        }
      }

      // The backend returns the full array of messages including the agent's new message(s)
      if (response.data.messages) {
         setMessages(response.data.messages);
         
         // Check for tool results only in the newly generated messages
         const latestMsgs = response.data.messages.slice(newMessages.length);
         for (let i = 0; i < latestMsgs.length; i++) {
           const msg = latestMsgs[i];
           if (msg.role === 'tool') {
             try {
               const content = JSON.parse(msg.content);
               if (content.order_id) {
                 handlePayment(content);
                 break;
               }
               if (content.cart_update && onAddToCart) {
                 onAddToCart(content.cart_update);
               }
               if (content.cart_remove && onRemoveFromCart) {
                 onRemoveFromCart(content.cart_remove);
               }
               if (content.cart_update_qty && onUpdateCartQty) {
                 onUpdateCartQty(content.cart_update_qty);
               }
               if (content.cart_clear && onClearCart) {
                 onClearCart();
               }
             } catch(e) {}
           }
         }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error communicating with the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async (orderData) => {
    try {
      const keyRes = await axios.get('http://localhost:3000/api/orders/key');
      const keyId = keyRes.data.key_id;

      const options = {
        key: keyId,
        amount: Math.round(orderData.total * 100),
        currency: orderData.currency || 'INR',
        name: 'Nexus Store',
        description: 'AI Concierge Order',
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await axios.post('http://localhost:3000/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            if (verifyRes.data.status === 'success') {
              if (onClearCart) onClearCart();
              setMessages(prev => [...prev, { role: 'assistant', content: `Payment successful! Your order has been placed. Payment ID: ${response.razorpay_payment_id}` }]);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', content: 'Payment verification failed.' }]);
            }
          } catch (err) {
            console.error('Payment verification error', err);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error verifying payment with the server.' }]);
          }
        },
        theme: {
          color: '#4299e1'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        setMessages(prev => [...prev, { role: 'assistant', content: `Payment failed. Reason: ${response.error.description}` }]);
      });
      rzp.open();
    } catch (error) {
      console.error('Failed to initialize Razorpay', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to initialize payment gateway.' }]);
    }
  };

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-window glass-card">
          <div className="chat-header">
            <h3><Bot size={20} className="logo-icon" /> AI Concierge</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="chat-messages">
            {messages.map((msg, idx) => {
              if (msg.role !== 'user' && msg.role !== 'assistant') return null;
              if (!msg.content || msg.content.trim() === '') return null;
              
              let cleanText = msg.content;
              if (msg.role === 'assistant') {
                cleanText = cleanText
                  .replace(/\*+/g, '') // Remove markdown bold/italics
                  .replace(/<[^>]+>/g, '') // Remove leaked XML tags (e.g. </tool_call>)
                  .replace(/\{.*?\}/g, '') // Remove leaked JSON objects
                  .replace(/\]\}/g, '') // Remove trailing JSON braces
                  .replace(/price₹[\d,]+\s*/gi, '') // Remove the specific 'price₹24,999' artifact
                  .trim();
              }
              
              if (!cleanText) return null;

              return (
                <div key={idx} className={`message ${msg.role === 'user' ? 'user' : 'agent'}`}>
                  {cleanText}
                </div>
              );
            })}
            {isLoading && (
              <div className="message agent">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Type your message..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="send-btn" disabled={isLoading || !inputValue.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button className="chat-fab" onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
        </button>
      )}
    </div>
  );
}
