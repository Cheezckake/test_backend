// ==================== КОНФИГУРАЦИЯ SUPABASE ====================
const SUPABASE_URL = 'https://odahvmaqnqmyrhmeazgg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ftztjo13zRtU1RZbaanAcg_ZnnnMlxl';


const TABLES = {
  users: 'users',
  products: 'products',
  orders: 'orders',
  orderItems: 'order_items'
};

// ==================== КОРЗИНА ====================
class Cart {
  constructor() {
    this.items = [];
    this.init();
  }

  init() {
    this.cartBtn = document.querySelector('.cart__btn');
    this.cartCount = document.querySelector('.cart__count');
    this.cartPopup = document.querySelector('.cart-popup');
    this.cartOverlay = document.querySelector('.cart-popup__overlay');
    this.cartClose = document.querySelector('.cart-popup__close');
    this.cartItems = document.querySelector('.cart-popup__items');
    this.cartTotal = document.querySelector('.cart-popup__total-sum');
    this.checkoutBtn = document.querySelector('.cart-popup__checkout');

    this.cartBtn.addEventListener('click', () => this.openPopup());
    this.cartOverlay.addEventListener('click', () => this.closePopup());
    this.cartClose.addEventListener('click', () => this.closePopup());
    this.checkoutBtn.addEventListener('click', () => this.openOrderModal());

    document.querySelectorAll('.catalog__card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.catalog__card');
        if (card) {
          this.addItem({
            id: card.dataset.id,
            name: card.dataset.name,
            price: parseInt(card.dataset.price)
          });
        }
      });
    });
  }

  addItem(item) {
    const existing = this.items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.items.push({ ...item, quantity: 1 });
    }
    this.updateCart();
    // this.showNotification('Товар добавлен в корзину!');
  }

  removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.updateCart();
  }

  updateQuantity(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeItem(id);
      }
    }
    this.updateCart();
  }

  updateCart() {
    const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalSum = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    this.cartCount.textContent = totalItems;
    this.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';

    if (this.items.length === 0) {
      this.cartItems.innerHTML = '<p class="cart-popup__empty">Корзина пуста</p>';
    } else {
      this.cartItems.innerHTML = this.items.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item__image"></div>
          <div class="cart-item__info">
            <div class="cart-item__title">${item.name}</div>
            <div class="cart-item__price">${item.price} ₽ × ${item.quantity}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="cart-item__remove" onclick="cart.updateQuantity('${item.id}', -1)">−</button>
            <span>${item.quantity}</span>
            <button class="cart-item__remove" onclick="cart.updateQuantity('${item.id}', 1)">+</button>
            <button class="cart-item__remove" onclick="cart.removeItem('${item.id}')">×</button>
          </div>
        </div>
      `).join('');
    }
    
    this.cartTotal.textContent = `${totalSum} ₽`;
  }

  openPopup() {
    this.cartPopup.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closePopup() {
    this.cartPopup.classList.remove('active');
    document.body.style.overflow = '';
  }

  openOrderModal() {
    if (this.items.length === 0) {
      // this.showNotification('Корзина пуста!', 'error');
      return;
    }
    this.closePopup();
    document.querySelector('.order-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeOrderModal() {
    document.querySelector('.order-modal').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('orderForm').reset();
  }

  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }
}

// ==================== РАБОТА С SUPABASE ====================
async function createUser(userData) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLES.users}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        address: userData.address
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при создании пользователя');
    }
    
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function createOrder(userId, totalAmount) {
  try {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLES.orders}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        total_amount: totalAmount,
        order_date: formattedDate
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при создании заказа');
    }
    
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

async function createOrderItems(orderId, items) {
  try {
    for (const item of items) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLES.orderItems}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          order_id: orderId,
          product_id: parseInt(item.id),
          quantity: item.quantity
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка при добавлении товаров в заказ');
      }
    }
  } catch (error) {
    console.error('Error creating order items:', error);
    throw error;
  }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
const cart = new Cart();
window.cart = cart;

// Обработка формы заказа
document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Оформление...';
  
  try {
    const userData = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      address: document.getElementById('address').value.trim()
    };
    
    if (!userData.name || !userData.email || !userData.address) {
      throw new Error('Заполните все поля');
    }
    
    const totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const user = await createUser(userData);
    const order = await createOrder(user.id, totalAmount);
    await createOrderItems(order.id, cart.items);
    
    // Очищаем корзину
    cart.items = [];
    cart.updateCart();
    cart.closeOrderModal();
    // cart.showNotification(`Заказ #${order.id} успешно оформлен! Спасибо за покупку!`);
    
  } catch (error) {
    cart.showNotification(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Заказать';
  }
});

// Закрытие модального окна
document.getElementById('cancelOrderBtn').addEventListener('click', () => {
  cart.closeOrderModal();
});

document.querySelector('.order-modal__overlay').addEventListener('click', () => {
  cart.closeOrderModal();
});