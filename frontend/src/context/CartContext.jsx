import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [dineTable, setDineTable] = useState(() => localStorage.getItem('dineTable') || '');

  const changeDineTable = useCallback((n) => {
    const value = n ? String(n) : '';
    setDineTable(value);
    if (value) {
      localStorage.setItem('dineTable', value);
    } else {
      localStorage.removeItem('dineTable');
    }
  }, []);

  const saveCart = (newItems) => {
    setItems(newItems);
    localStorage.setItem('cart', JSON.stringify(newItems));
  };

  const addToCart = useCallback((menuItem, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item._id === menuItem._id);
      let newItems;
      if (existing) {
        newItems = prev.map((item) =>
          item._id === menuItem._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newItems = [...prev, { ...menuItem, quantity }];
      }
      localStorage.setItem('cart', JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const removeFromCart = useCallback((menuItemId) => {
    setItems((prev) => {
      const newItems = prev.filter((item) => item._id !== menuItemId);
      localStorage.setItem('cart', JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const updateQuantity = useCallback((menuItemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setItems((prev) => {
      const newItems = prev.map((item) =>
        item._id === menuItemId ? { ...item, quantity } : item
      );
      localStorage.setItem('cart', JSON.stringify(newItems));
      return newItems;
    });
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem('cart');
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    dineTable,
    changeDineTable,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
