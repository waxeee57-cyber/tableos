export interface BusinessConfig {
  id: string
  business_name: string
  tagline: string | null
  logo_url: string | null
  primary_color: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  country: string
  currency: string
  currency_symbol: string
  locale: string
  timezone: string
  delivery_enabled: boolean
  takeaway_enabled: boolean
  dine_in_enabled: boolean
  table_management_enabled: boolean
  delivery_fee: number
  delivery_fee_threshold: number
  min_order_amount: number
  delivery_radius_km: number
  estimated_delivery_minutes: number
  operating_hours: Record<string, { open: string; close: string } | null>
  meta_description: string | null
  og_image_url: string | null
}

export interface MenuCategory {
  id: string
  name: string
  name_en: string | null
  slug: string
  description: string | null
  sort_order: number
  is_visible: boolean
  image_url: string | null
}

export interface PriceOption {
  size: string | null
  price: number
}

export interface MenuItem {
  id: string
  category_id: string | null
  name: string
  name_en: string | null
  slug: string
  description: string | null
  description_en: string | null
  prices: PriceOption[]
  allergens: string[]
  is_vegetarian: boolean
  is_vegan: boolean
  is_spicy: boolean
  is_new: boolean
  is_popular: boolean
  is_available: boolean
  is_visible: boolean
  image_url: string | null
  sort_order: number
  prep_time_minutes: number
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string
  address: string | null
  city: string | null
  postal_code: string | null
  notes: string | null
  order_count: number
  total_spent: number
  is_vip: boolean
  last_order_at: string | null
  preferred_payment_method: string | null
  source: 'online' | 'imported' | 'manual' | 'phone'
  imported_at: string | null
  import_batch_id: string | null
  created_at: string
  updated_at: string
}

export interface CustomerImport {
  id: string
  filename: string | null
  total_rows: number
  imported_count: number
  duplicates_count: number
  errors_count: number
  status: 'pending' | 'preview' | 'completed' | 'failed' | 'rolled_back'
  duplicate_decisions: Record<string, string>
  error_log: Array<{ row_index: number; reason: string }>
  created_by: string | null
  created_at: string
  completed_at: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  item_name: string
  item_size: string | null
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
}

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export type OrderType = 'delivery' | 'takeaway' | 'dine_in'
export type PaymentMethod = 'cash' | 'card' | 'card_online' | 'szep_card'
export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export interface StatusHistoryEntry {
  status: string
  timestamp: string
  note?: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string | null
  order_type: OrderType
  table_id: string | null
  status: OrderStatus
  status_history: StatusHistoryEntry[]
  delivery_address: string | null
  delivery_city: string | null
  delivery_postal_code: string | null
  delivery_notes: string | null
  delivery_fee: number
  estimated_delivery_at: string | null
  subtotal: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  customer_name: string
  customer_phone: string
  customer_email: string | null
  customer_notes: string | null
  admin_notes: string | null
  source: 'online' | 'phone' | 'walk_in' | 'admin'
  placed_at: string
  accepted_at: string | null
  preparing_at: string | null
  ready_at: string | null
  delivering_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface CartItem {
  menuItemId: string
  menuItemName: string
  size: string | null
  quantity: number
  unitPrice: number
  notes?: string
}

export interface AdminUser {
  id: string
  user_id: string
  email: string
  role: 'admin' | 'staff' | 'kitchen'
}

export interface DeliveryZone {
  id: string
  name: string
  areas: string
  delivery_fee: number
  min_order_amount: number
  is_active: boolean
  sort_order: number
}

export interface Table {
  id: string
  name: string
  capacity: number
  position_x: number
  position_y: number
  status: 'available' | 'occupied' | 'reserved' | 'unavailable'
  is_visible: boolean
  sort_order: number
}
