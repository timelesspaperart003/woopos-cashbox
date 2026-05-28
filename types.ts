
export interface Category {
  id: number;
  name: string;
  slug: string;
  count?: number;
  parent: number; // 0 for root categories
}

export interface ProductImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface ProductAttribute {
  id: number;
  name: string;
  options: string[];
}

export interface ProductVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: string;
  attributes: {
    name: string;
    option: string;
  }[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: string;
  stock_status: string;
  type: 'simple' | 'variable'; // simple or variable
  categories: Category[];
  images: ProductImage[];
  description?: string;
  short_description?: string;
  attributes: ProductAttribute[];
  variations?: ProductVariation[]; // Mock data usually includes this, or we fetch separately
}

export interface CartItem extends Product {
  cartKey: string; // Unique identifier for this specific item in the cart
  quantity: number;
  note?: string;     
  discount?: number; 
  selectedVariation?: {
    id: number;
    price: string; // The specific price of this variation
    attributes: { name: string; option: string }[];
  };
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  avatar_url?: string;
}

export type PaymentMethod = 'cash' | 'cash_drawer' | 'transfer';

export interface WCSettings {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  useMockData: boolean;
  storeName?: string;
  uid?: string; // Firebase UID
  members?: string[]; // Authorized team emails
  cashDrawerBalance?: number; // Current cash drawer amount
  enableCustomerSync?: boolean; // Whether to sync/use WooCommerce customer data
  // Google Cloud Secret Manager Settings
  gcpProjectId?: string;
  gcpAccessToken?: string; // Access Token for authenticating with GCP REST API
  secretKeyName?: string;  // Name of the secret holding Consumer Key (e.g., woocommerce-pos-key)
  secretSecretName?: string; // Name of the secret holding Consumer Secret (e.g., woocommerce-pos-secret)
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface OrderSummary {
  subtotal: number;
  itemDiscountTotal: number;
  orderDiscount: number;
  total: number;
  orderNote?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';

export interface Order {
  id: string;
  date: string;
  customer?: Customer | null;
  items: CartItem[];
  summary: OrderSummary;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  uid?: string; // Firebase UID
  sessionId?: string; // Group ID for split orders
  syncError?: string; // error message from last sync attempt
  employeeId?: string;
  employeeName?: string;
}

export interface Employee {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'staff';
  uid: string;
}

export interface HeldOrder {
  id: string;
  timestamp: number;
  customer: Customer | null;
  items: CartItem[];
  orderDiscount: number;
  total: number; // Cached total for display
}

export interface CashDrawerTransaction {
  id: string;
  type: 'in' | 'out' | 'sale' | 'correction' | 'reset';
  amount: number;
  balanceAfter: number;
  note: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  affectsBalance: boolean;
  orderId?: string; // If linked to a sale
  uid: string; // Store UID
}
