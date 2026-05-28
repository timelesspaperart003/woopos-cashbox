
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, CartItem, WCSettings, Order, OrderSummary, Customer, OrderStatus, HeldOrder, ProductVariation, PaymentMethod, CashDrawerTransaction } from './types';
import { fetchProducts, fetchCategories, fetchCustomers, createOrder } from './services/wooService';
import { getSecretValue } from './services/secretManagerService';
import { auth, db, onAuthStateChanged, doc, setDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, collection, where, orderBy, updateDoc, increment, addDoc, limit, User, handleFirestoreError, OperationType, sanitizeData } from './src/firebase';
import Login from './src/components/Login';
import EmployeeManagementModal from './src/components/EmployeeManagementModal';
import EmployeeLoginModal from './src/components/EmployeeLoginModal';
import { Employee } from './types';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import CategoryFilter, { FAVORITES_ID } from './components/CategoryFilter';
import SettingsModal from './components/SettingsModal';
import CheckoutModal from './components/CheckoutModal';
import OrderHistory from './components/OrderHistory';
import CustomerSelectionModal from './components/CustomerSelectionModal';
import HeldOrdersModal from './components/HeldOrdersModal';
import ProductDetailModal from './components/ProductDetailModal';
import CashDrawerModal from './components/CashDrawerModal';
import ImageLightbox from './components/ImageLightbox';

const App: React.FC = () => {
  // --- State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderDiscount, setOrderDiscount] = useState<number>(0); // Lifted from Cart
  const [orderNote, setOrderNote] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initMsg, setInitMsg] = useState<string | null>(null);
  
  // Checkout & History State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutSummary, setCheckoutSummary] = useState<OrderSummary | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Product Detail State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);
  const [activeStoreUid, setActiveStoreUid] = useState<string | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [isEmployeeManagementOpen, setIsEmployeeManagementOpen] = useState(false);
  const [isEmployeeLoginOpen, setIsEmployeeLoginOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID());

  // Held Orders State
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    const saved = localStorage.getItem('pos_held_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);

  // Favorites State
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('pos_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const [settings, setSettings] = useState<WCSettings>({
    url: '',
    consumerKey: '',
    consumerSecret: '',
    useMockData: true // Default to mock data for instant usability
  });

  const [debugError, setDebugError] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(50);

  // --- Effects ---

  // Load cache immediately for instant UI
  useEffect(() => {
    const cachedCats = localStorage.getItem('woopos_categories_cache');
    const cachedProds = localStorage.getItem('woopos_products_cache');
    
    if (cachedCats || cachedProds) {
      console.log("Loading initial data from cache...");
      if (cachedCats) {
        try {
          const { data } = JSON.parse(cachedCats);
          setCategories(data);
        } catch(e) {}
      }
      if (cachedProds) {
        try {
          const { data } = JSON.parse(cachedProds);
          setProducts(data);
          setIsLoading(false); // Can stop loading spinner early if we have products
        } catch(e) {}
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        setAuthTimeout(true);
      }
    }, 15000); // 15 seconds timeout
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log("Auth state changed:", u ? u.email : "no user");
      setUser(u);
      
      try {
        if (u) {
          console.log("User is logged in, determining store context...");
          // 1. Check if user has a manually saved store selection in localStorage
          const savedStoreId = localStorage.getItem(`store_selection_${u.uid}`);
          
          if (savedStoreId) {
            console.log("Using saved store ID from local storage:", savedStoreId);
            setActiveStoreUid(savedStoreId);
          } else {
            // 2. Otherwise, try automatic lookup
            try {
              const userEmail = u.email;
              if (userEmail) {
                console.log("Searching for store invitation for:", userEmail);
                const q = query(collection(db, 'settings'), where('members', 'array-contains', userEmail));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                  const storeId = snapshot.docs[0].id;
                  console.log("Found invited store via email:", storeId);
                  setActiveStoreUid(storeId);
                } else {
                  // Fallback for older data that might still be lowercase
                  const qLower = query(collection(db, 'settings'), where('members', 'array-contains', userEmail.toLowerCase()));
                  const snapshotLower = await getDocs(qLower);
                  if (!snapshotLower.empty) {
                    const storeIdLower = snapshotLower.docs[0].id;
                    console.log("Found invited store via lowercase email:", storeIdLower);
                    setActiveStoreUid(storeIdLower);
                  } else {
                    console.log("No invitation found, defaulting to personal store:", u.uid);
                    setActiveStoreUid(u.uid);
                  }
                }
              } else {
                console.log("No email found for user, using personal store UID");
                setActiveStoreUid(u.uid);
              }
            } catch (err: any) {
              console.error("Shared store lookup error:", err);
              setDebugError("商店配對錯誤: " + err.message);
              setActiveStoreUid(u.uid);
            }
          }
        } else {
          console.log("No user authenticated.");
          setActiveStoreUid(null);
        }
      } catch (globalErr: any) {
        console.error("Global auth processing error:", globalErr);
      } finally {
        setIsAuthReady(true);
        console.log("Auth ready state set to true");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleShowFullId = async () => {
    if (!user) return;
    try {
      const settingsRef = doc(db, 'settings', user.uid);
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        window.alert(`【重要提醒】\n您的商店 ID 目前尚未在雲端生效。\n\n請務必先點擊左下角的「設定」，進入後點擊「儲存設定」。\n儲存成功後，您的商店 ID 才會正式產生，受邀人員也才能找到您。`);
        return;
      }
      
      const inviteLink = `${window.location.origin}${window.location.pathname}?join=${user.uid}`;
      const choice = window.confirm(`您的商店 ID: ${user.uid}\n\n想要執行什麼動作？\n\n【確定】自動產生並複製「一鍵加入連結」(最方便)\n【取消】僅複製「純 ID」碼`);
      
      const textToCopy = choice ? inviteLink : user.uid;
      
      try {
        await navigator.clipboard.writeText(textToCopy);
        window.alert(`✅ 已複製${choice ? '一鍵加入連結' : '商店 ID'}！\n\n請傳送給受邀人員。他們點擊連結後登入 Google，系統就會自動幫他們加入商店。`);
      } catch (copyErr) {
        window.prompt(`請按 Ctrl+C 複製您的${choice ? '連結' : 'ID'}:`, textToCopy);
      }
    } catch (err: any) {
      window.alert(`您的商店 ID 為: ${user.uid}\n(注意：請確保您已在「設定」中儲存過設定)`);
    }
  };

  const handleManualJoin = async () => {
    const storeIdInput = window.prompt("請輸入店長的完整商店 ID:");
    if (!storeIdInput || !user) return;
    const storeId = storeIdInput.trim();

    try {
      const settingsRef = doc(db, 'settings', storeId);
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as WCSettings;
        const members = data.members || [];
        const userEmail = user.email;
        
        if (userEmail && (members.includes(userEmail) || members.includes(userEmail.toLowerCase()) || storeId === user.uid)) {
          localStorage.setItem(`store_selection_${user.uid}`, storeId);
          setActiveStoreUid(storeId);
          alert("成功加入商店！頁面即將重新整理。");
          window.location.reload();
        } else {
          alert(`驗證失敗。\n您的 Email (${userEmail}) 不在該商店的成員名單中。\n請連絡店長在「設定 > 員工管理」中加入您的 Email。`);
        }
      } else {
        alert(`找不到商店 ID: ${storeId}\n\n可能原因：\n1. ID 輸入錯誤\n2. 店長尚未在「設定」中點擊「儲存設定」以建立雲端文件。`);
      }
    } catch (err: any) {
      alert("嘗試加入時發生錯誤: " + err.message);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("確定要刪除這筆訂單紀錄嗎？\n(注意：這只會移除 POS 上的顯示，不會影響 WooCommerce 已成立的訂單)")) return;
    
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
      alert("刪除失敗: " + err.message);
    }
  };

  // Sync Settings from Firestore
  useEffect(() => {
    if (!user || !activeStoreUid) return;
    const settingsRef = doc(db, 'settings', activeStoreUid);
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as WCSettings);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `settings/${activeStoreUid}`));
    return () => unsubscribe();
  }, [user, activeStoreUid]);

  // Sync Orders from Firestore
  useEffect(() => {
    if (!user || !activeStoreUid) return;
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('uid', '==', activeStoreUid), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Order[];
      setOrders(fetchedOrders);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
    return () => unsubscribe();
  }, [user, activeStoreUid]);

  // Sync Employees from Firestore
  useEffect(() => {
    if (!user || !activeStoreUid) return;
    const q = query(collection(db, 'employees'), where('uid', '==', activeStoreUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Employee[]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'employees'));
    return () => unsubscribe();
  }, [user, activeStoreUid]);

  // Handle Invitation Link (Auto-Join)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId && user && isAuthReady) {
      // Clear the param from URL to prevent infinite reload loop/messy URL
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Perform join logic
      (async () => {
        try {
          const settingsRef = doc(db, 'settings', joinId);
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const data = settingsSnap.data() as WCSettings;
            const members = data.members || [];
            const userEmail = user.email;
            if (userEmail && (members.includes(userEmail) || members.includes(userEmail.toLowerCase()) || joinId === user.uid)) {
              localStorage.setItem(`store_selection_${user.uid}`, joinId);
              setActiveStoreUid(joinId);
              alert(`成功透過連結加入商店！\n商店 ID: ${joinId}`);
              window.location.reload(); // Refresh to apply full context
            } else {
              alert(`加入失敗。\n您的 Email (${userEmail}) 尚未被此商店授權存取。\n請連絡店長在「設定」中加入您的 Email。`);
            }
          }
        } catch (e) {
          console.error("Auto-join error:", e);
        }
      })();
    }
  }, [user, isAuthReady]);

  // Auto-login default employee
  useEffect(() => {
    if (!user || !activeStoreUid || currentEmployee) return;
    
    const fetchAndAutoLogin = async () => {
      try {
        const q = query(collection(db, 'employees'), where('uid', '==', activeStoreUid));
        const snapshot = await getDocs(q);
        const emps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        
        // Find first admin or first employee to auto-login
        const defaultAdmin = emps.find(e => e.role === 'admin') || emps[0];
        if (defaultAdmin) {
          setCurrentEmployee(defaultAdmin);
        } else {
          // If NO employees exist yet AND we are the owner, create a default admin
          if (activeStoreUid === user.uid) {
            const newEmpId = crypto.randomUUID();
            const autoAdmin: Employee = {
              id: newEmpId,
              name: user.displayName?.split(' ')[0] || '管理員',
              pin: '0000', // Default initial PIN
              role: 'admin',
              uid: user.uid
            };
            try {
              await setDoc(doc(db, 'employees', newEmpId), sanitizeData(autoAdmin));
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `employees/${newEmpId}`);
            }
            setCurrentEmployee(autoAdmin);
          }
        }
      } catch (err) {
        console.error("Auto-login employee failed:", err);
      }
    };
    
    fetchAndAutoLogin();
  }, [user, activeStoreUid, currentEmployee]);
  
  // Auto-fetch Secrets from GCP on startup if configured
  useEffect(() => {
    // Only fetch if settings have minimum requirements
    if (settings.useMockData) {
      loadData(settings);
      return;
    }

    if (!settings.url || (!settings.consumerKey && !settings.gcpAccessToken)) return;

    const initApp = async () => {
      setIsLoading(true);
      let effectiveSettings = settings;

      // Check if we have GCP credentials to fetch secrets
      if (settings.gcpAccessToken && settings.gcpProjectId) {
        setInitMsg("正在從 Google Secret Manager 讀取金鑰...");
        try {
          const keyName = settings.secretKeyName || 'woocommerce-pos-key';
          const secretName = settings.secretSecretName || 'woocommerce-pos-secret';
          
          const [fetchedKey, fetchedSecret] = await Promise.all([
             getSecretValue(settings.gcpProjectId, keyName, settings.gcpAccessToken),
             getSecretValue(settings.gcpProjectId, secretName, settings.gcpAccessToken)
          ]);

          effectiveSettings = {
            ...settings,
            consumerKey: fetchedKey,
            consumerSecret: fetchedSecret
          };
          setSettings(effectiveSettings); 
          setInitMsg("金鑰讀取成功，正在連線商店...");
        } catch (err) {
          console.error("Auto-fetch secrets failed:", err);
          setError("無法從 Secret Manager 讀取金鑰，請檢查 Access Token 是否過期。");
          setInitMsg(null);
          setIsSettingsOpen(true);
          setIsLoading(false);
          return;
        }
      }

      loadData(effectiveSettings);
    };

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.url, settings.consumerKey, settings.useMockData]); 

  // Persist Favorites
  useEffect(() => {
    localStorage.setItem('pos_favorites', JSON.stringify(Array.from(favoriteIds)));
  }, [favoriteIds]);

  // Persist Held Orders
  useEffect(() => {
    localStorage.setItem('pos_held_orders', JSON.stringify(heldOrders));
  }, [heldOrders]);

  const loadData = async (currentSettings: WCSettings) => {
    const hasCache = products.length > 0;
    if (!hasCache) setIsLoading(true);
    
    setError(null);
    setInitMsg(hasCache ? "背景同步中..." : "正在載入商品...");
    
    try {
      // 1. Fetch Categories first (usually fast)
      const cats = await fetchCategories(currentSettings);
      setCategories(cats);
      
      // 2. Fetch Products
      const prods = await fetchProducts(currentSettings);
      setProducts(prods);

      // 3. Fetch Customers in background
      if (currentSettings.enableCustomerSync !== false) {
        fetchCustomers(currentSettings).then(setCustomers).catch(() => {});
      }
      
      setInitMsg(null);
    } catch (err: any) {
      if (!hasCache) {
        setError('載入失敗，請檢查 WooCommerce 設定或連線。');
        if (!currentSettings.useMockData) {
          setIsSettingsOpen(true);
        }
      } else {
        console.warn("Background refresh failed, using cache.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---
  const saveSettings = async (newSettings: WCSettings) => {
    if (!user || !activeStoreUid) return;
    try {
      try {
        await setDoc(doc(db, 'settings', activeStoreUid), sanitizeData({ ...newSettings, uid: activeStoreUid }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `settings/${activeStoreUid}`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `settings/${activeStoreUid}`);
    }
    setIsSettingsOpen(false);
    setSelectedCategory(null);
    loadData(newSettings);
  };

  // Handle clicking on a product card
  const handleProductClick = (product: Product, quickAdd: boolean = false) => {
    // If quickAdd is true and it's a simple product, add directly to cart
    // This allows the "Add" button to be efficient while card clicks show details
    const isVariable = product.type === 'variable' || product.attributes.length > 0;
    
    if (quickAdd && !isVariable) {
      addToCart(product);
    } else {
      // Default: show details
      setSelectedProduct(product);
      setIsProductDetailOpen(true);
    }
  };

  const handleAddCustomItem = (name: string, price: number) => {
    const customId = -(Date.now() % 1000000); // Use negative IDs for custom items to avoid WC collisions
    const customProduct: Product = {
      id: customId,
      name: name,
      slug: `custom-${customId}`,
      price: price.toString(),
      regular_price: price.toString(),
      sale_price: price.toString(),
      status: 'publish',
      stock_status: 'instock',
      type: 'simple',
      categories: [],
      images: [{ id: 0, src: 'https://picsum.photos/seed/pos/200', name: 'Custom', alt: 'Custom' }],
      attributes: []
    };
    addToCart(customProduct);
  };

  const addToCart = (product: Product, variation?: ProductVariation) => {
    setCart(prev => {
      // Determine if item exists based on product ID AND variation ID (if applicable)
      const existing = prev.find(item => {
        if (variation) {
          return item.id === product.id && item.selectedVariation?.id === variation.id;
        }
        return item.id === product.id && !item.selectedVariation;
      });

      if (existing) {
        return prev.map(item => {
           // Match logic must be same as above
           const isMatch = variation 
             ? item.id === product.id && item.selectedVariation?.id === variation.id
             : item.id === product.id && !item.selectedVariation;

           return isMatch ? { ...item, quantity: item.quantity + 1 } : item;
        });
      }
      
      // Generate a unique key for the cart item
      const cartKey = variation 
        ? `v-${product.id}-${variation.id}` 
        : product.id < 0 
          ? `c-${product.id}-${Date.now()}` // Custom items get a truly unique key
          : `p-${product.id}`; // Simple products use product ID

      // New Item
      return [...prev, { 
        ...product, 
        cartKey,
        quantity: 1, 
        discount: 0, 
        note: '', 
        selectedVariation: variation ? {
          id: variation.id,
          price: variation.price,
          attributes: variation.attributes
        } : undefined
      }];
    });
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartKey === cartKey) { 
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };
  
  const updateItemDetails = (cartKey: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => 
      item.cartKey === cartKey ? { ...item, ...updates } : item
    ));
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setOrderDiscount(0);
    setOrderNote('');
    setIsMobileCartOpen(false);
  };

  const toggleFavorite = (id: number) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // --- Hold Order Logic ---
  const handleHoldOrder = () => {
    if (cart.length === 0) return;

    let sub = 0;
    let itemDisc = 0;
    cart.forEach(item => {
       const price = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
       sub += price * item.quantity;
       itemDisc += item.discount || 0;
    });
    const total = Math.max(0, sub - itemDisc - orderDiscount);

    const newHeldOrder: HeldOrder = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      customer: selectedCustomer,
      items: [...cart],
      orderDiscount: orderDiscount,
      total: total
    };

    setHeldOrders(prev => [...prev, newHeldOrder]);
    clearCart();
  };

  const handleRestoreHeldOrder = (order: HeldOrder) => {
    setCart(order.items);
    setSelectedCustomer(order.customer);
    setOrderDiscount(order.orderDiscount);
    
    setHeldOrders(prev => prev.filter(o => o.id !== order.id));
    setIsHeldOrdersOpen(false);
  };

  const handleDeleteHeldOrder = (id: string) => {
    setHeldOrders(prev => prev.filter(o => o.id !== id));
  };

  // --- Checkout Logic (Optimistic UI) ---
  const handleCheckoutRequest = (summary: OrderSummary) => {
    setCheckoutSummary(summary);
    setIsCheckoutOpen(true);
  };

  const handleConfirmOrder = async (status: OrderStatus, paymentMethod: PaymentMethod, employee: Employee) => {
    // 1. CLOSE UI IMMEDIATELY - Don't wait for anything
    setIsCheckoutOpen(false);
    
    try {
      if (!checkoutSummary || !user || !activeStoreUid) {
        throw new Error("遺失商店資訊或登入逾時，請重新整理頁面。");
      }

      // 2. Snapshot everything we need
      const currentSummary = { ...checkoutSummary };
      const isSplit = (currentSummary as any).isSplit;
      const itemsToCheckout = isSplit ? (currentSummary as any).itemsToCheckout : [...cart];
      const currentCustomer = selectedCustomer;
      const currentCart = [...itemsToCheckout];
      const currentStoreUid = activeStoreUid;
      const currentEmp = employee || currentEmployee; // Use the selected employee
      const currentSession = currentSessionId;
      const currentBalance = settings.cashDrawerBalance || 0;
      const currentOrderDiscount = orderDiscount;
      const currentSettings = { ...settings };
      const tempId = `local-${Date.now()}`;

      // 3. Clear summary and mobile cart
      setCheckoutSummary(null);
      setIsMobileCartOpen(false);

      // 3. OPTIMISTIC UPDATES
      const newOrder: Order = {
        id: tempId,
        date: new Date().toISOString(),
        customer: currentCustomer,
        items: currentCart,
        summary: currentSummary,
        status: status,
        paymentMethod: paymentMethod,
        uid: currentStoreUid,
        sessionId: currentSession,
        employeeId: currentEmp?.id,
        employeeName: currentEmp?.name
      };

      setOrders(prev => [newOrder, ...prev]);
      
      if (isSplit) {
        setCart(prev => {
          const remaining = [...prev];
          const toProcess = (currentSummary as any).itemsToCheckout || [];
          [...toProcess].sort((a: any, b: any) => b.originalIndex - a.originalIndex).forEach((splitItem: any) => {
            const idx = splitItem.originalIndex;
            if (idx >= 0 && idx < remaining.length) {
              if (splitItem.quantity >= remaining[idx].quantity) {
                remaining.splice(idx, 1);
              } else {
                remaining[idx] = { ...remaining[idx], quantity: remaining[idx].quantity - splitItem.quantity };
              }
            }
          });
          return remaining;
        });
      } else {
        clearCart();
        setOrderDiscount(0); // Explicitly reset again to be 100% sure
        const nextId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
          ? crypto.randomUUID() 
          : Date.now().toString() + Math.random().toString(36).substring(2);
        setCurrentSessionId(nextId);
      }

    // D. BACKGROUND PROCESSING
    (async () => {
      let currentOrderId = tempId;
      try {
        // A. Initial Save to Firestore
        try {
          await setDoc(doc(db, 'orders', tempId), sanitizeData({
            ...newOrder,
            employeeName: currentEmp?.name || '系統管理員',
            orderNote: currentSummary.orderNote || '',
            timestamp: new Date().toISOString(),
            uid: currentStoreUid
          }));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `orders/${tempId}`);
        }

        // B. Update Cash Drawer if needed
        if (paymentMethod === 'cash_drawer') {
          const amount = Math.round(currentSummary.total);
          const settingsRef = doc(db, 'settings', currentStoreUid);
          await setDoc(settingsRef, sanitizeData({
            cashDrawerBalance: increment(amount)
          }), { merge: true });
          
          await addDoc(collection(db, 'cash_transactions'), sanitizeData({
            type: 'sale', amount, balanceAfter: currentBalance + amount,
            note: `訂單結帳 #${tempId}`, timestamp: new Date().toISOString(),
            operatorId: currentEmp?.id || 'admin', operatorName: currentEmp?.name || '系統管理員',
            affectsBalance: true, orderId: tempId, uid: currentStoreUid
          }));
          setSettings(prev => ({ ...prev, cashDrawerBalance: (prev.cashDrawerBalance || 0) + amount }));
        }

        // C. Sync to WooCommerce
        const hasFullCreds = currentSettings.url && currentSettings.consumerKey && currentSettings.consumerSecret;
        const isNotMasked = currentSettings.consumerKey && !currentSettings.consumerKey.includes('*');
        
        if (hasFullCreds && isNotMasked && currentSettings.useMockData === false) {
           // ... (line items construction)
           const lineItems = currentCart.map(item => {
             const unitPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
             const lineTotalBeforeDiscount = unitPrice * item.quantity;
             const discountAmount = item.discount || 0;
             const finalLineTotal = Math.max(0, lineTotalBeforeDiscount - discountAmount);

             const li: any = {
               name: item.name,
               quantity: item.quantity,
               subtotal: lineTotalBeforeDiscount.toFixed(2),
               total: finalLineTotal.toFixed(2)
             };

             const cleanId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
             if (cleanId > 0) {
               li.product_id = cleanId;
               if (item.selectedVariation?.id) {
                 const varId = typeof item.selectedVariation.id === 'string' ? parseInt(item.selectedVariation.id, 10) : item.selectedVariation.id;
                 if (varId > 0) {
                   li.variation_id = varId;
                 }
               }
             } else {
               li.product_id = 0;
               li.sku = 'POS-CUSTOM';
             }
             
             if (item.note) li.meta_data = [{ key: 'note', value: item.note }];
             return li;
           });

           const feeLines = [];
           const od = isSplit ? 0 : currentOrderDiscount;
           if (od > 0) feeLines.push({ name: '整單折扣 (Order Discount)', total: (-od).toFixed(2) });

           const orderData = {
             payment_method: 'other', payment_method_title: 'POS Payment',
             set_paid: status === 'completed', status,
             customer_id: currentCustomer?.id || 0,
             billing: {
               first_name: currentCustomer?.first_name || 'Guest',
               last_name: currentCustomer?.last_name || 'User',
               address_1: currentCustomer?.address || 'Store Walk-in',
               email: currentCustomer?.email || 'pos-guest@example.com',
               phone: currentCustomer?.phone || '0900000000',
               city: 'Taipei', country: 'TW'
             },
             line_items: lineItems, fee_lines: feeLines,
           };

           try {
             const createdOrder = await createOrder(currentSettings, orderData);
             if (createdOrder?.id) {
               const syncedOrder = { ...newOrder, id: createdOrder.id.toString(), status: createdOrder.status || status };
               setOrders(prev => prev.map(o => o.id === currentOrderId ? syncedOrder : o));
               
               // Update Firestore: Shift from local temp to permanent
               await deleteDoc(doc(db, 'orders', currentOrderId));
               await setDoc(doc(db, 'orders', createdOrder.id.toString()), sanitizeData({
                 ...syncedOrder, 
                 timestamp: new Date().toISOString(), 
                 uid: currentStoreUid
               }));
               currentOrderId = createdOrder.id.toString();
             }
           } catch (err: any) {
             console.error("WooCommerce API Error during checkout:", err);
             const errorMsg = `WooCommerce 同步失敗: ${err.message || '未知錯誤'}`;
             setOrders(prev => prev.map(o => o.id === currentOrderId ? { ...o, status: 'failed', syncError: errorMsg } : o));
             // Re-throw to be caught by the outer catch
             throw err;
           }
        } else if (!currentSettings.useMockData) {
           const isKeyMissing = !currentSettings.consumerKey || !currentSettings.consumerSecret;
           const errorMsg = isKeyMissing ? "遺失 API 金鑰設定，請聯絡店長。" : "API 金鑰格式不正確 (可能是遮罩狀態)，請確保店長已正確授權。";
           
           console.warn("WooCommerce sync skipped:", errorMsg, { 
             hasUrl: !!currentSettings.url, 
             hasKey: !!currentSettings.consumerKey,
             isMasked: !isNotMasked
           });
           
           setOrders(prev => prev.map(o => o.id === currentOrderId ? { ...o, status: 'failed', syncError: errorMsg } : o));
        }
      } catch (bgErr: any) {
        console.error("Background Checkout Sync Error:", bgErr);
        const errMsg = bgErr.message || "同步失敗 (請檢查網路或 API 設定)";
        setOrders(prev => prev.map(o => o.id === currentOrderId ? { ...o, status: 'failed', syncError: errMsg } : o));
        
        // Also update the local doc in Firestore if possible
        try {
          await setDoc(doc(db, 'orders', currentOrderId), sanitizeData({
            status: 'failed',
            syncError: errMsg
          }), { merge: true });
        } catch (fsErr) {
          console.error("Could not update Firestore failure status:", fsErr);
          // Optional: handleFirestoreError(fsErr, OperationType.UPDATE, `orders/${currentOrderId}`);
        }
      }
    })();

      return Promise.resolve();
    } catch (err: any) {
      console.error("Checkout Error:", err);
      window.alert("結帳發生錯誤：" + (err.message || err));
      setIsCheckoutOpen(false);
      return Promise.resolve();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic Update
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));

    // If a failed local order is set back to pending/completed, we should retry the sync
    if (orderId.toString().startsWith('local-') && (newStatus === 'pending' || newStatus === 'completed' || newStatus === 'processing')) {
       const orderToRetry = orders.find(o => o.id === orderId);
       if (orderToRetry) {
          // Temporarily recreate its necessary context to call the confirm order logic or a subset of it
          // Actually, we can just re-run the sync logic if we have the order object
          try {
             // Basic construction for retry
             const lineItems = orderToRetry.items.map(item => {
               const unitPrice = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
               const lineTotalBeforeDiscount = unitPrice * item.quantity;
               const discountAmount = item.discount || 0;
               const finalLineTotal = Math.max(0, lineTotalBeforeDiscount - discountAmount);
               const li: any = { 
                 name: item.name,
                 quantity: item.quantity, 
                 subtotal: lineTotalBeforeDiscount.toFixed(2),
                 total: finalLineTotal.toFixed(2)
               };
               
               const cleanId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
               if (cleanId > 0) {
                 li.product_id = cleanId;
                 if (item.selectedVariation?.id) {
                   const varId = typeof item.selectedVariation.id === 'string' ? parseInt(item.selectedVariation.id, 10) : item.selectedVariation.id;
                   if (varId > 0) li.variation_id = varId;
                 }
               } else {
                 li.product_id = 0;
                 li.sku = 'POS-CUSTOM';
               }

               if (item.note) li.meta_data = [{ key: 'note', value: item.note }];
               return li;
             });

             const feeLines = [];
             if (orderToRetry.summary.orderDiscount > 0) {
               feeLines.push({ name: 'Order Discount', total: (-orderToRetry.summary.orderDiscount).toFixed(2) });
             }

             const orderData = {
               status: newStatus,
               payment_method: 'other',
               set_paid: newStatus === 'completed',
               line_items: lineItems,
               fee_lines: feeLines,
               billing: {
                 first_name: orderToRetry.customer?.first_name || 'Guest',
                 last_name: orderToRetry.customer?.last_name || 'User',
                 email: orderToRetry.customer?.email || 'pos@example.com'
               }
             };

             const created = await createOrder(settings, orderData);
             if (created?.id) {
               setOrders(prev => prev.map(o => 
                 o.id === orderId ? { ...o, id: created.id.toString(), status: created.status || newStatus } : o
               ));
             }
          } catch (err: any) {
             console.error("Retry failed:", err);
             const errorMessage = err.message || "未知錯誤";
             setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'failed', syncError: errorMessage } : o));
          }
       }
    }
    
    // In a real app with persistent Firestore, you would also update the doc
    if (!orderId.toString().startsWith('local-')) {
       try {
          try {
            await setDoc(doc(db, 'orders', orderId), sanitizeData({ status: newStatus }), { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
          }
       } catch (err) {
          console.error("Failed to update status in Firestore:", err);
       }
    }
  };

  // --- Filtering Logic ---
  const filteredProducts = useMemo(() => {
    let result = products;

    if (searchTerm) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== null) {
      if (selectedCategory === FAVORITES_ID) {
        result = result.filter(p => favoriteIds.has(p.id));
      } else {
        const getDescendantIds = (parentId: number): number[] => {
            const children = categories.filter(c => c.parent === parentId);
            let ids = children.map(c => c.id);
            children.forEach(c => {
                ids = [...ids, ...getDescendantIds(c.id)];
            });
            return ids;
        };

        const targetCategoryIds = [selectedCategory, ...getDescendantIds(selectedCategory)];

        result = result.filter(p => 
          p.categories.some(c => targetCategoryIds.includes(c.id))
        );
      }
    }

    return result;
  }, [products, searchTerm, selectedCategory, favoriteIds, categories]);

  const pagedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayedCount);
  }, [filteredProducts, displayedCount]);

  useEffect(() => {
    setDisplayedCount(50);
  }, [searchTerm, selectedCategory]);

  const handleRecordCashTransaction = async (txData: Omit<CashDrawerTransaction, 'id' | 'timestamp' | 'uid' | 'balanceAfter'>) => {
    if (!user || !activeStoreUid) return;
    try {
      const currentBalance = settings.cashDrawerBalance || 0;
      let newBalance = currentBalance;

      if (txData.type === 'reset') {
        newBalance = 0;
      } else if (txData.type === 'correction') {
        newBalance = txData.amount;
      } else if (txData.affectsBalance) {
        if (txData.type === 'in' || txData.type === 'sale') {
          newBalance = currentBalance + txData.amount;
        } else if (txData.type === 'out') {
          newBalance = currentBalance - txData.amount;
        }
      }

      const tx: any = {
        ...txData,
        timestamp: new Date().toISOString(),
        uid: activeStoreUid,
        balanceAfter: newBalance
      };

      try {
        await addDoc(collection(db, 'cash_transactions'), sanitizeData(tx));
        await updateDoc(doc(db, 'settings', activeStoreUid), sanitizeData({ cashDrawerBalance: newBalance }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'cash_transactions/settings');
      }
      setSettings(prev => ({ ...prev, cashDrawerBalance: newBalance }));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `cash_transactions`);
    }
  };

  // --- Render ---
  // Expose for Settings Modal
  useEffect(() => {
    (window as any).openEmployeeManagement = () => setIsEmployeeManagementOpen(true);
    (window as any).openEmployeeLogin = () => setIsEmployeeLoginOpen(true);
    (window as any).handleManualJoin = handleManualJoin;
    (window as any).handleShowFullId = handleShowFullId;
    return () => {
      delete (window as any).openEmployeeManagement;
      delete (window as any).openEmployeeLogin;
      delete (window as any).handleManualJoin;
      delete (window as any).handleShowFullId;
    };
  }, [user, activeStoreUid, handleManualJoin, handleShowFullId]);
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-gray-600 font-medium">正在載入系統...</p>
            {authTimeout && (
              <div className="animate-fade-in space-y-4">
                <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                  載入似乎遇到了困難。這通常是由於瀏覽器擋住了 Firebase 通訊或是網路不穩。
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                >
                  重新整理頁面
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900 relative">
      
      {/* Mobile Cart Backdrop */}
      {isMobileCartOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] animate-fade-in"
          onClick={() => setIsMobileCartOpen(false)}
        />
      )}

      {/* Left Side - Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-opacity duration-300 ${isMobileCartOpen ? 'opacity-0 lg:opacity-100' : 'opacity-100'}`}>
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="bg-indigo-600 text-white p-1.5 sm:p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight hidden xs:block">WooPOS</h1>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-sm md:max-w-md mx-2 sm:mx-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="搜尋商品..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 sm:py-2 rounded-full bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm"
            />
          </div>

          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* Store context info */}
            <div className="hidden lg:flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 max-w-xs overflow-hidden">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0"></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 leading-none">目前商店</span>
                  <span className="text-[11px] font-black text-gray-800 truncate">
                    {settings.storeName || (activeStoreUid === user?.uid ? '個人商店' : '受邀協作商店')}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    const newId = window.prompt("請輸入商店 ID (UID):", activeStoreUid || '');
                    if (newId && newId.trim()) {
                      localStorage.setItem(`store_selection_${user?.uid}`, newId.trim());
                      window.location.reload();
                    }
                  }}
                  className="ml-auto p-1 hover:bg-gray-100 rounded text-indigo-500 transition-colors"
                  title="切換/加入商店"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
                {activeStoreUid !== user?.uid && (
                  <span className="shrink-0 scale-90 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase tracking-wider">
                    Staff
                  </span>
                )}
            </div>
            
            {/* Action Buttons */}
            <div className="hidden sm:flex items-center space-x-1 border-r border-gray-100 pr-3">
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1.5"
                title="歷史訂單"
              >
                <div className="bg-gray-100 p-1.5 rounded-lg group-hover:bg-indigo-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="hidden xl:inline font-bold text-gray-700 text-sm">歷史訂單</span>
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="系統設定"
              >
                <div className="bg-gray-100 p-1.5 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Cash Drawer Button */}
              {activeStoreUid && (
                <button 
                  onClick={() => setIsCashDrawerOpen(true)}
                  className="flex items-center justify-center w-10 h-10 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-all shadow-sm group"
                  title="錢箱管理"
                >
                  <span className="text-xl group-hover:scale-125 transition-transform">💰</span>
                </button>
              )}

              {/* Employee / User Pill */}
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 pr-3 gap-3 shadow-sm hover:bg-white transition-all">
                <button 
                  onClick={() => setIsEmployeeLoginOpen(true)}
                  className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-100 hover:border-blue-400 transition-all shadow-sm group"
                >
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[11px] font-black group-hover:scale-110 transition-transform">
                    {currentEmployee ? currentEmployee.name.charAt(0) : '?'}
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter hidden sm:block">店員登入</span>
                    <span className="text-xs font-black text-gray-900 hidden xs:block">
                      {currentEmployee ? currentEmployee.name : '未選擇'}
                    </span>
                  </div>
                </button>

                {initMsg === "背景同步中..." && (
                  <div className="flex items-center gap-1.5 px-1">
                    <div className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-500 animate-pulse hidden md:block">同步中</span>
                  </div>
                )}

                <div className="flex flex-col items-end leading-none">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[8px] px-1 rounded font-bold ${activeStoreUid === user.uid ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                      {activeStoreUid === user.uid ? 'OWNER' : 'STAFF'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold">
                    <button 
                      onClick={() => auth.signOut()}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      登出系統
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Actions (Visible on small screens) */}
            <div className="sm:hidden flex items-center gap-1">
               <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-gray-400"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
               <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <CategoryFilter 
              categories={categories} 
              selectedId={selectedCategory} 
              onSelect={setSelectedCategory} 
              totalCount={products.length}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-sm underline hover:text-red-800"
              >
                開啟設定
              </button>
            </div>
          )}

          {initMsg && (
             <div className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg mb-6 border border-blue-100">
               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               {initMsg}
             </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {selectedCategory === FAVORITES_ID && (
                <div className="mb-4 text-xl font-bold text-gray-800 flex items-center">
                   <span className="mr-2 text-red-500">♥</span> 我的最愛 ({filteredProducts.length})
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {pagedProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    isFavorite={favoriteIds.has(product.id)}
                    onToggleFavorite={toggleFavorite}
                    onClick={handleProductClick}
                    onZoom={(img) => setLightboxImage(img)}
                  />
                ))}
              </div>

              {filteredProducts.length > displayedCount && (
                <div className="mt-12 mb-8 flex justify-center">
                  <button 
                    onClick={() => setDisplayedCount(prev => prev + 50)}
                    className="px-8 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    載入更多商品 ({filteredProducts.length - displayedCount} 剩餘)
                  </button>
                </div>
              )}
            </>
          )}
          
          {!isLoading && filteredProducts.length === 0 && (
             <div className="flex flex-col items-center justify-center h-64 text-gray-500">
               {selectedCategory === FAVORITES_ID ? (
                 <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <p className="text-lg">尚無最愛商品</p>
                    <p className="text-sm">點擊商品卡片右上角的愛心即可加入</p>
                 </>
               ) : (
                 <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-lg">沒有找到相關商品</p>
                    <p className="text-sm">請嘗試調整搜尋或篩選條件</p>
                 </>
               )}
             </div>
          )}
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl lg:shadow-xl border-l border-gray-200 z-[60] lg:z-20 transition-transform duration-300 transform lg:translate-x-0 lg:static flex-shrink-0 ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <Cart 
          items={cart} 
          customer={selectedCustomer}
          orderDiscount={orderDiscount}
          heldOrdersCount={heldOrders.length}
          onSelectCustomer={() => setIsCustomerModalOpen(true)}
          onUpdateQuantity={updateQuantity} 
          onRemove={removeFromCart}
          onUpdateItem={updateItemDetails}
          onClear={clearCart}
          onSetOrderDiscount={setOrderDiscount}
          onSetOrderNote={setOrderNote}
          onCheckout={handleCheckoutRequest} 
          onHoldOrder={handleHoldOrder}
          onOpenHeldOrders={() => setIsHeldOrdersOpen(true)}
          onAddCustomItem={handleAddCustomItem}
          orderNote={orderNote}
          enableCustomerSync={settings.enableCustomerSync !== false}
          isMobile={true}
          onCloseMobile={() => setIsMobileCartOpen(false)}
        />
      </div>

      {/* Mobile Bottom Bar */}
      {!isMobileCartOpen && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md">
           <button 
             onClick={() => setIsMobileCartOpen(true)}
             className="w-full bg-indigo-600 text-white rounded-full py-4 px-6 flex items-center justify-between shadow-2xl animate-bounce-subtle"
           >
              <div className="flex items-center">
                 <div className="relative mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-indigo-600">
                       {cart.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                 </div>
                 <span className="font-bold sm:text-lg">查看下單內容</span>
              </div>
              <div className="flex items-center">
                 <span className="mr-2 text-indigo-100 sm:text-sm">總計:</span>
                 <span className="font-black sm:text-xl">${Math.round(cart.reduce((acc, item) => {
                    const price = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
                    return acc + (price * item.quantity);
                 }, 0) - orderDiscount)}</span>
              </div>
           </button>
        </div>
      )}

      {/* Modals & Overlays */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={saveSettings}
        isOwner={user?.uid === activeStoreUid}
        user={user!}
        activeStoreUid={activeStoreUid!}
        onOpenEmployeeManagement={() => setIsEmployeeManagementOpen(true)}
        onOpenOrderHistory={() => setIsHistoryOpen(true)}
      />
      
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={(checkoutSummary as any)?.isSplit ? (checkoutSummary as any).itemsToCheckout : cart}
        customer={selectedCustomer}
        summary={checkoutSummary}
        employees={employees}
        currentEmployee={currentEmployee}
        storeName={settings.storeName}
        onConfirm={handleConfirmOrder}
      />

      <OrderHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        orders={orders}
        onUpdateStatus={handleUpdateOrderStatus}
        onDeleteOrder={handleDeleteOrder}
        storeName={settings.storeName}
      />

      <CashDrawerModal 
        isOpen={isCashDrawerOpen}
        onClose={() => setIsCashDrawerOpen(false)}
        settings={settings}
        onRecordTransaction={handleRecordCashTransaction}
        employees={employees}
        currentEmployee={currentEmployee}
        isOwner={user?.uid === activeStoreUid}
      />

      <CustomerSelectionModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={customers}
        onSelect={setSelectedCustomer}
        orderNote={orderNote}
        onSetOrderNote={setOrderNote}
        enableCustomerSync={settings.enableCustomerSync !== false}
      />

      <HeldOrdersModal
        isOpen={isHeldOrdersOpen}
        onClose={() => setIsHeldOrdersOpen(false)}
        heldOrders={heldOrders}
        onRestore={handleRestoreHeldOrder}
        onDelete={handleDeleteHeldOrder}
      />

      {user && activeStoreUid && (
        <>
          <EmployeeManagementModal
            isOpen={isEmployeeManagementOpen}
            onClose={() => setIsEmployeeManagementOpen(false)}
            uid={activeStoreUid}
            currentEmployeeRole={currentEmployee?.role}
          />
          <EmployeeLoginModal
            isOpen={isEmployeeLoginOpen}
            onClose={() => setIsEmployeeLoginOpen(false)}
            uid={activeStoreUid}
            onLogin={setCurrentEmployee}
          />
        </>
      )}

      <ProductDetailModal
        isOpen={isProductDetailOpen}
        onClose={() => setIsProductDetailOpen(false)}
        product={selectedProduct}
        settings={settings}
        onAddToCart={addToCart}
      />
      
      <ImageLightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageSrc={lightboxImage}
      />

      
    </div>
  );
};

const style = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes bounce-subtle {
    0%, 100% { transform: translate(-50%, 0); }
    50% { transform: translate(-50%, -5px); }
  }
  .animate-fade-in { animation: fade-in 0.2s ease-out; }
  .animate-bounce-subtle { animation: bounce-subtle 2s infinite ease-in-out; }
`;
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = style;
  document.head.appendChild(styleTag);
}

export default App;
