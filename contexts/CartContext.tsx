'use client'

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  orderType: 'delivery' | 'takeaway'
}

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; menuItemId: string; size: string | null }
  | { type: 'UPDATE_QTY'; menuItemId: string; size: string | null; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'SET_ORDER_TYPE'; orderType: 'delivery' | 'takeaway' }
  | { type: 'HYDRATE'; state: CartState }

function cartKey(item: Pick<CartItem, 'menuItemId' | 'size'>) {
  return `${item.menuItemId}__${item.size ?? 'none'}`
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = cartKey(action.item)
      const existing = state.items.find((i) => cartKey(i) === key)
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            cartKey(i) === key
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i
          ),
        }
      }
      return { ...state, items: [...state.items, action.item] }
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(
          (i) => cartKey(i) !== cartKey({ menuItemId: action.menuItemId, size: action.size })
        ),
      }
    case 'UPDATE_QTY': {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) => cartKey(i) !== cartKey({ menuItemId: action.menuItemId, size: action.size })
          ),
        }
      }
      return {
        ...state,
        items: state.items.map((i) =>
          cartKey(i) === cartKey({ menuItemId: action.menuItemId, size: action.size })
            ? { ...i, quantity: action.quantity }
            : i
        ),
      }
    }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'SET_ORDER_TYPE':
      return { ...state, orderType: action.orderType }
    case 'HYDRATE':
      return action.state
    default:
      return state
  }
}

interface CartContextType {
  state: CartState
  addItem: (item: CartItem) => void
  removeItem: (menuItemId: string, size: string | null) => void
  updateQty: (menuItemId: string, size: string | null, quantity: number) => void
  clear: () => void
  setOrderType: (type: 'delivery' | 'takeaway') => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'tableos_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], orderType: 'delivery' })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) dispatch({ type: 'HYDRATE', state: JSON.parse(saved) })
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  const total = state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        state,
        addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
        removeItem: (id, size) => dispatch({ type: 'REMOVE_ITEM', menuItemId: id, size }),
        updateQty: (id, size, qty) => dispatch({ type: 'UPDATE_QTY', menuItemId: id, size, quantity: qty }),
        clear: () => dispatch({ type: 'CLEAR' }),
        setOrderType: (type) => dispatch({ type: 'SET_ORDER_TYPE', orderType: type }),
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
