import { X, ShoppingCart, Sparkles, CreditCard } from 'lucide-react';
import './CartSidebar.css';

export default function CartSidebar({ isOpen, onClose, cart, onCheckoutManual, onCheckoutAI, onClearCart }) {
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <div className={`cart-sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className={`cart-sidebar ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h2><ShoppingCart size={24} /> Your Cart</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">Your cart is empty.</div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="cart-item">
                <div className="cart-item-info">
                  <h4>{item.product_name}</h4>
                  <p>₹{Number(item.price).toFixed(2)} x {item.qty}</p>
                </div>
                <div className="cart-item-total">
                  ₹{(item.price * item.qty).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="cart-actions">
              <button className="checkout-btn manual" onClick={onCheckoutManual}>
                <CreditCard size={18} /> Manual Checkout
              </button>
              <button className="checkout-btn ai" onClick={() => onCheckoutAI(cart, total)}>
                <Sparkles size={18} /> Buy with AI
              </button>
              <button className="checkout-btn" onClick={onClearCart} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)' }}>
                <X size={18} /> Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
