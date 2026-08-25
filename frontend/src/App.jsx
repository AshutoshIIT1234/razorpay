import { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, MessageCircle, ShoppingCart, User } from 'lucide-react';
import axios from 'axios';
import './App.css';
import ChatWidget from './components/ChatWidget';
import AuditTrail from './components/AuditTrail';
import ApprovalQueue from './components/ApprovalQueue';
import CartSidebar from './components/CartSidebar';

// Map database product names to our generated images
const IMAGE_MAP = {
  'Neural Engine Optimizer': '/neural_engine_1787554582116.png',
  'Quantum Core Processor': '/quantum_core_1787554600090.png',
  'Holographic Display Unit': '/holographic_display_1787554619195.png',
  'Cyberdeck Portable Terminal': '/cyberdeck_1787554639958.png',
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

function App() {
  const [products, setProducts] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [askAiQuery, setAskAiQuery] = useState(null);
  
  // Cart State
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('nexus_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('nexus_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/catalog`);
        setProducts(response.data.data);
      } catch (error) {
        console.error('Failed to fetch catalog', error);
      }
    };
    fetchCatalog();
  }, []);

  const handleBuyWithAI = (productName) => {
    setAskAiQuery(`I want to buy the ${productName}. Should I add it to my cart or check out directly?`);
  };

  const handleAddToCart = (update) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_name === update.product_name);
      if (existing) {
        return prev.map(item => item.product_name === update.product_name ? { ...item, qty: item.qty + update.qty } : item);
      }
      return [...prev, update];
    });
  };

  const handleRemoveFromCart = (update) => {
    setCart(prev => prev.filter(item => item.product_name !== update.product_name));
  };

  const handleUpdateCartQty = (update) => {
    if (update.qty <= 0) {
      handleRemoveFromCart(update);
    } else {
      setCart(prev => prev.map(item => item.product_name === update.product_name ? { ...item, qty: update.qty } : item));
    }
  };

  const handleCartCheckoutAI = (cartItems, total) => {
    setIsCartOpen(false);
    const itemNames = cartItems.map(item => `${item.qty}x ${item.product_name}`).join(', ');
    setAskAiQuery(`I'm ready to check out my cart. It contains: ${itemNames}. Total is ₹${total}. Let's proceed to payment.`);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleClearCart = () => {
    setCart([]);
  };

  return (
    <div className="app-container">
      <header className="header">
        <a href="/" className="logo">
          <ShoppingBag className="logo-icon" />
          Nexus Store
        </a>
        <div className="header-actions">
          <div className="razorpay-badge">
            <span>Powered by</span>
            <img src="https://razorpay.com/assets/razorpay-logo.svg" alt="Razorpay" height="24" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          
          <button className="header-icon-btn" onClick={() => setIsCartOpen(true)}>
            <ShoppingCart size={24} />
            {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
          </button>
          
          <div className="profile-container">
            <button className="header-icon-btn" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <User size={24} />
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown">
                <h4>Demo User</h4>
                <p>demo@nexus.store</p>
                <hr />
                <p>Status: Premium Member</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-layout">
        <div className="storefront">
          <section className="hero-section">
            <h1 className="hero-title">Welcome to the Future of Commerce</h1>
            <p className="hero-subtitle">
              Experience our AI-powered shopping concierge. Discover cutting-edge tech with personalized recommendations.
            </p>
          </section>

          <section className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="glass-card product-card">
                <div className="product-image-container">
                  {IMAGE_MAP[product.name] ? (
                    <img src={IMAGE_MAP[product.name]} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-image-placeholder">
                      <Sparkles size={48} opacity={0.2} />
                    </div>
                  )}
                </div>
                <div className="product-info">
                  <h3 className="product-title">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-actions">
                    <div className="product-price">₹{Number(product.price).toFixed(2)}</div>
                    <button className="ask-ai-btn" onClick={() => handleBuyWithAI(product.name)}>
                      <MessageCircle size={16} /> Buy with AI
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="admin-sidebar">
          <ApprovalQueue />
          <AuditTrail sessionId={sessionId} />
        </div>
      </main>

      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        onCheckoutManual={() => alert('Manual checkout flow would open here.')}
        onCheckoutAI={handleCartCheckoutAI}
        onClearCart={handleClearCart}
      />

      <ChatWidget 
        onSessionChange={setSessionId} 
        initialQuery={askAiQuery} 
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        onUpdateCartQty={handleUpdateCartQty}
        onClearCart={handleClearCart}
        cart={cart}
      />
    </div>
  );
}

export default App;
