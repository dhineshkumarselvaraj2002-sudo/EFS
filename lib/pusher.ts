// Pusher server-side client (for API routes)
import PusherServer from 'pusher'

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  useTLS: true,
})

// Helper function to broadcast inventory updates
export async function broadcastInventoryUpdate(data: {
  type: 'update' | 'transfer' | 'adjustment'
  inventoryId?: string
  productId?: string
  warehouseId?: string
  quantity?: number
  message?: string
}) {
  try {
    await pusherServer.trigger('inventory-updates', 'item-changed', data)
  } catch (error) {
    console.error('Failed to broadcast inventory update:', error)
  }
}

