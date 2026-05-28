
import { Product, Category, WCSettings, Customer, CartItem, OrderStatus, ProductVariation } from '../types';

const MOCK_CATEGORIES: Category[] = [
  // Root Categories
  { id: 1, name: '服飾', slug: 'clothing', count: 10, parent: 0 },
  { id: 2, name: '配件', slug: 'accessories', count: 5, parent: 0 },
  { id: 3, name: '3C 電子', slug: 'electronics', count: 4, parent: 0 },
  { id: 4, name: '居家生活', slug: 'home', count: 2, parent: 0 },
  
  // Subcategories for Clothing (Parent: 1)
  { id: 11, name: '男裝', slug: 'mens-clothing', count: 5, parent: 1 },
  { id: 12, name: '女裝', slug: 'womens-clothing', count: 5, parent: 1 },
  
  // Subcategories for Accessories (Parent: 2)
  { id: 21, name: '皮夾', slug: 'wallets', count: 2, parent: 2 },
  { id: 22, name: '手錶', slug: 'watches', count: 3, parent: 2 },
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: 101,
    name: '經典白 T-Shirt',
    slug: 'classic-white-t-shirt',
    price: '19.99',
    regular_price: '19.99',
    sale_price: '',
    status: 'publish',
    stock_status: 'instock',
    type: 'variable',
    categories: [MOCK_CATEGORIES[0], MOCK_CATEGORIES[4]], 
    images: [{ id: 1, src: 'https://picsum.photos/400/400?random=1', name: 'tshirt', alt: 'tshirt' }],
    description: '舒適棉質經典 T-Shirt。',
    attributes: [
      { id: 1, name: '尺寸', options: ['S', 'M', 'L'] }
    ],
    variations: [
      { id: 1011, price: '19.99', regular_price: '19.99', sale_price: '', stock_status: 'instock', attributes: [{ name: '尺寸', option: 'S' }] },
      { id: 1012, price: '21.99', regular_price: '21.99', sale_price: '', stock_status: 'instock', attributes: [{ name: '尺寸', option: 'M' }] },
      { id: 1013, price: '23.99', regular_price: '23.99', sale_price: '', stock_status: 'instock', attributes: [{ name: '尺寸', option: 'L' }] }
    ]
  },
  {
    id: 102,
    name: '丹寧牛仔褲',
    slug: 'denim-jeans',
    price: '49.99',
    regular_price: '59.99',
    sale_price: '49.99',
    status: 'publish',
    stock_status: 'instock',
    type: 'simple',
    categories: [MOCK_CATEGORIES[0], MOCK_CATEGORIES[5]], 
    images: [{ id: 2, src: 'https://picsum.photos/400/400?random=2', name: 'jeans', alt: 'jeans' }],
    description: '時尚藍色丹寧牛仔褲。',
    attributes: [],
  },
  {
    id: 103,
    name: '真皮皮夾',
    slug: 'leather-wallet',
    price: '29.99',
    regular_price: '29.99',
    sale_price: '',
    status: 'publish',
    stock_status: 'instock',
    type: 'simple',
    categories: [MOCK_CATEGORIES[1], MOCK_CATEGORIES[6]], 
    images: [{ id: 3, src: 'https://picsum.photos/400/400?random=3', name: 'wallet', alt: 'wallet' }],
    description: '真皮手工皮夾，收納大容量。',
    attributes: [],
  },
  {
    id: 104,
    name: '無線降噪耳機',
    slug: 'wireless-headphones',
    price: '129.99',
    regular_price: '149.99',
    sale_price: '129.99',
    status: 'publish',
    stock_status: 'instock',
    type: 'simple',
    categories: [MOCK_CATEGORIES[2]], 
    images: [{ id: 4, src: 'https://picsum.photos/400/400?random=4', name: 'headphones', alt: 'headphones' }],
    description: '主動降噪耳機，享受純淨音質。',
    attributes: [],
  },
  {
    id: 105,
    name: '智慧手錶 Pro',
    slug: 'smart-watch',
    price: '199.99',
    regular_price: '199.99',
    sale_price: '',
    status: 'publish',
    stock_status: 'instock',
    type: 'simple',
    categories: [MOCK_CATEGORIES[1], MOCK_CATEGORIES[2], MOCK_CATEGORIES[7]], 
    images: [{ id: 5, src: 'https://picsum.photos/400/400?random=5', name: 'watch', alt: 'watch' }],
    description: '多功能智慧手錶，健康管理專家。',
    attributes: [],
  },
  {
    id: 106,
    name: '陶瓷馬克杯',
    slug: 'coffee-mug',
    price: '9.99',
    regular_price: '9.99',
    sale_price: '',
    status: 'publish',
    stock_status: 'instock',
    type: 'variable',
    categories: [MOCK_CATEGORIES[3]], 
    images: [{ id: 6, src: 'https://picsum.photos/400/400?random=6', name: 'mug', alt: 'mug' }],
    description: '簡約純色陶瓷馬克杯，質感溫潤。',
    attributes: [
       { id: 2, name: '顏色', options: ['紅色', '藍色', '白色'] }
    ],
    variations: [
      { id: 1061, price: '9.99', regular_price: '9.99', sale_price: '', stock_status: 'instock', attributes: [{ name: '顏色', option: '紅色' }] },
      { id: 1062, price: '9.99', regular_price: '9.99', sale_price: '', stock_status: 'instock', attributes: [{ name: '顏色', option: '藍色' }] },
      { id: 1063, price: '12.99', regular_price: '12.99', sale_price: '', stock_status: 'instock', attributes: [{ name: '顏色', option: '白色' }] }
    ]
  },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 1, first_name: '小明', last_name: '王', email: 'wang@example.com', phone: '0912345678', address: '台北市信義區信義路五段7號', avatar_url: 'https://ui-avatars.com/api/?name=Wang+Ming&background=random' },
  { id: 2, first_name: '雅婷', last_name: '陳', email: 'chen@example.com', phone: '0922333444', address: '新北市板橋區縣民大道二段7號', avatar_url: 'https://ui-avatars.com/api/?name=Chen+Yating&background=random' },
  { id: 3, first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '+1 555-0199', address: '123 Main St, New York', avatar_url: 'https://ui-avatars.com/api/?name=John+Doe&background=random' },
];

/**
 * Helper function to fetch all pages from WooCommerce API concurrently.
 */
async function fetchAllPages(url: string, auth: string): Promise<any[]> {
  const separator = url.includes('?') ? '&' : '?';
  const firstPageUrl = `${url}${separator}page=1`;

  const response = await fetch(firstPageUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Get total pages from header
  const totalPagesHeader = response.headers.get('x-wp-totalpages');
  const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1;

  if (totalPages <= 1) {
    return data;
  }

  const allResults = [];
  // Use a batch size to avoid overwhelming the server with too many concurrent requests
  const BATCH_SIZE = 5;
  const maxPages = Math.min(totalPages, 500); 

  for (let i = 2; i <= maxPages; i += BATCH_SIZE) {
    const batch = [];
    for (let j = i; j < i + BATCH_SIZE && j <= maxPages; j++) {
      batch.push(
        fetch(`${url}${separator}page=${j}`, {
          headers: { Authorization: `Basic ${auth}` },
        }).then(async (res) => {
          if (!res.ok) {
            console.warn(`WooCommerce API page ${j} fetch failed: ${res.status}`);
            return [];
          }
          return res.json();
        }).catch(err => {
          console.warn(`Failed to fetch page ${j}`, err);
          return [];
        })
      );
    }
    
    const batchResults = await Promise.all(batch);
    batchResults.forEach(pageData => {
      if (Array.isArray(pageData)) {
        allResults.push(...pageData);
      }
    });
  }

  return [...data, ...allResults];
}

// Cache Keys
const CATEGORIES_CACHE_KEY = 'woopos_categories_cache';
const PRODUCTS_CACHE_KEY = 'woopos_products_cache';
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

export const fetchCategories = async (settings: WCSettings): Promise<Category[]> => {
  if (settings.useMockData) {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_CATEGORIES), 500));
  }

  // Try to load from cache first
  const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        // Return cached data but still fetch in background to sync
        fetchFromApi();
        return data;
      }
    } catch (e) {
      localStorage.removeItem(CATEGORIES_CACHE_KEY);
    }
  }

  return fetchFromApi();

  async function fetchFromApi() {
    if (!settings.url || !settings.consumerKey || !settings.consumerSecret) {
      return [];
    }

    const auth = btoa(`${settings.consumerKey}:${settings.consumerSecret}`);
    const baseUrl = settings.url.replace(/\/+$/, '');
    const url = `${baseUrl}/wp-json/wc/v3/products/categories?per_page=100`;

    try {
      const data = await fetchAllPages(url, auth);
      const categories = data.map((c: any) => ({...c, parent: c.parent || 0}));
      
      // Update cache
      localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify({
        data: categories,
        timestamp: Date.now()
      }));
      
      return categories;
    } catch (error) {
      console.error("WooCommerce API Error:", error);
      throw error;
    }
  }
};

export const fetchProducts = async (settings: WCSettings, categoryId?: number): Promise<Product[]> => {
  if (settings.useMockData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (categoryId && categoryId > 0) {
          resolve(MOCK_PRODUCTS.filter((p) => p.categories.some((c) => c.id === categoryId || c.parent === categoryId)));
        } else {
          resolve(MOCK_PRODUCTS);
        }
      }, 500);
    });
  }

  // Try to load from cache first (only for full catalog)
  const isFullCatalog = !categoryId || categoryId <= 0;
  if (isFullCatalog) {
    const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          // Trigger background refresh if data is old but still return cached
          if (Date.now() - timestamp > 1000 * 60 * 10) { // Older than 10 mins
             fetchFromApi();
          }
          return data;
        }
      } catch (e) {
        localStorage.removeItem(PRODUCTS_CACHE_KEY);
      }
    }
  }

  return fetchFromApi();

  async function fetchFromApi() {
    if (!settings.url || !settings.consumerKey || !settings.consumerSecret) {
      return [];
    }

    const auth = btoa(`${settings.consumerKey}:${settings.consumerSecret}`);
    const baseUrl = settings.url.replace(/\/+$/, '');
    let url = `${baseUrl}/wp-json/wc/v3/products?status=publish&per_page=100`;
    
    if (categoryId && categoryId > 0) {
      url += `&category=${categoryId}`;
    }

    try {
      const data = await fetchAllPages(url, auth);
      if (!Array.isArray(data)) return [];
      
      const products = data.map((p: any) => ({
        ...p,
        description: typeof p.description === 'string' ? p.description : p.description?.rendered || '',
        short_description: typeof p.short_description === 'string' ? p.short_description : p.short_description?.rendered || '',
        type: p.type || 'simple',
        attributes: p.attributes || [],
        variations: [] 
      }));

      // Update cache if it was a full catalog fetch
      if (isFullCatalog) {
        // Optimization: Only store necessary fields to prevent QuotaExceededError (localStorage limit is ~5MB)
        const strippedProducts = products.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          regular_price: p.regular_price,
          sale_price: p.sale_price,
          on_sale: p.on_sale,
          images: p.images?.slice(0, 1).map((img: any) => ({ src: img.src })), // Only keep first image
          categories: p.categories?.map((cat: any) => ({ id: cat.id, name: cat.name })),
          type: p.type,
          attributes: p.attributes,
          stock_status: p.stock_status,
          description: p.description,
          short_description: p.short_description,
          variations: []
        }));

        try {
          localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({
            data: strippedProducts,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn("Storage quota exceeded, clearing cache...");
          localStorage.removeItem(PRODUCTS_CACHE_KEY);
        }
      }
      
      return products;
    } catch (error) {
      console.error("WooCommerce API Error:", error);
      throw error;
    }
  }
};

export const fetchVariations = async (settings: WCSettings, productId: number): Promise<ProductVariation[]> => {
  if (settings.useMockData) {
     return []; 
  }

  if (!settings.url || !settings.consumerKey || !settings.consumerSecret) {
    return [];
  }

  const auth = btoa(`${settings.consumerKey}:${settings.consumerSecret}`);
  const baseUrl = settings.url.replace(/\/+$/, '');
  const url = `${baseUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;

  try {
    const data = await fetchAllPages(url, auth);
    
    if (!Array.isArray(data)) {
        console.warn("WooCommerce API returned non-array for variations:", data);
        return [];
    }

    return data.map((v: any) => ({
      id: v.id,
      price: v.price,
      regular_price: v.regular_price,
      sale_price: v.sale_price,
      stock_status: v.stock_status,
      attributes: Array.isArray(v.attributes) ? v.attributes.map((a: any) => ({
        name: a.name,
        option: a.option
      })) : []
    }));
  } catch (error) {
    console.warn("Fetch Variations failed (possibly CORS or invalid config):", error);
    return [];
  }
};

export const fetchCustomers = async (settings: WCSettings): Promise<Customer[]> => {
  if (settings.useMockData) {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_CUSTOMERS), 500));
  }

  if (!settings.url || !settings.consumerKey || !settings.consumerSecret) {
    return [];
  }

  const auth = btoa(`${settings.consumerKey}:${settings.consumerSecret}`);
  const baseUrl = settings.url.replace(/\/+$/, '');
  const url = `${baseUrl}/wp-json/wc/v3/customers?per_page=100`;

  try {
    const data = await fetchAllPages(url, auth);
    if (!Array.isArray(data)) return [];

    return data.map((c: any) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.billing?.phone || '',
      address: `${c.billing?.city || ''} ${c.billing?.address_1 || ''}`,
      avatar_url: c.avatar_url
    }));
  } catch (error) {
    console.error("WooCommerce API Error:", error);
    throw error;
  }
};

// Create Order API
export const createOrder = async (
  settings: WCSettings, 
  orderData: any
): Promise<any> => {
  if (settings.useMockData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Math.floor(Math.random() * 1000000),
          status: orderData.status,
          date_created: new Date().toISOString(),
          total: orderData.line_items.reduce((acc: number, item: any) => acc + (parseFloat(item.total || 0)), 0).toString(),
          line_items: orderData.line_items
        });
      }, 1500);
    });
  }

  if (!settings.url || !settings.consumerKey || !settings.consumerSecret) {
     throw new Error("Missing API Credentials");
  }

  const auth = btoa(`${settings.consumerKey}:${settings.consumerSecret}`);
  const baseUrl = settings.url.replace(/\/+$/, '');
  const url = `${baseUrl}/wp-json/wc/v3/orders`;

  console.log("Submitting Order to WooCommerce:", url, orderData);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      
      // Try to parse detailed WC error message
      try {
          const json = JSON.parse(text);
          if (json.message) {
            errorMessage = `WooCommerce Error: ${json.message}`;
          }
          console.error("WooCommerce Error Details:", json);
      } catch (e) {
          // Response was not JSON
          console.error("WooCommerce Raw Error:", text);
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("WooCommerce Create Order Error:", error);
    throw error;
  }
};
