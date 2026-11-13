export type Role = 'CUSTOMER' | 'ADMIN';
export type Status =
  'Pending' | 'Confirmed' | 'Preparing' | 'Ready for Pickup' | 'Completed' | 'Cancelled';
export type Profile = {
  id: string;
  full_name: string;
  student_id: string;
  email: string;
  is_suspended: boolean;
  created_at: string;
};
export type Category = { id: string; name: string; icon: string };
export type Meal = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  price: number;
  image_url: string;
  prep_minutes: number;
  is_active: boolean;
  featured: boolean;
};
export type DailyMenu = {
  id: string;
  meal_id: string;
  service_date: string;
  available_from: string;
  available_until: string;
  is_available: boolean;
  quantity: number;
  low_stock_threshold: number;
};
export type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  is_active: boolean;
  reserved: number;
};
export type OrderItem = {
  meal_id: string;
  daily_menu_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  category_id: string;
};
export type History = { status: Status; created_at: string; reason?: string };
export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  student_id: string;
  created_at: string;
  pickup_slot_id: string;
  pickup_at: string;
  pickup_code: string;
  status: Status;
  total: number;
  payment_collected: boolean;
  collected_at?: string;
  items: OrderItem[];
  history: History[];
  idempotency_key: string;
  cancellation_reason?: string;
};
export type Settings = {
  name: string;
  pickup_location: string;
  opens_at: string;
  closes_at: string;
  accepting_orders: boolean;
};
export type Snapshot = {
  categories: Category[];
  meals: Meal[];
  menus: DailyMenu[];
  slots: Slot[];
  orders: Order[];
  profiles: Profile[];
  settings: Settings;
  popularity: { meal_id: string; quantity: number }[];
};
export type CartLine = { daily_menu_id: string; quantity: number };
export type Checkout = { items: CartLine[]; slot_id: string; idempotency_key: string };
export type MealInput = Omit<Meal, 'id'> & { id?: string };
export type ScheduleInput = Omit<DailyMenu, 'id'> & { id?: string };
export type SessionUser = Profile & { role: Role };
