# Real-time Updates Setup Guide

This application uses Pusher for real-time WebSocket updates when inventory changes occur.

## Setup Instructions

### 1. Create a Pusher Account

1. Go to [https://dashboard.pusher.com/](https://dashboard.pusher.com/)
2. Sign up for a free account
3. Create a new app (choose any cluster, e.g., `us2`)

### 2. Get Your Credentials

From your Pusher dashboard, you'll need:
- **App ID**: Found in the "Keys" tab
- **Key**: Found in the "Keys" tab (starts with a long string)
- **Secret**: Found in the "Keys" tab (click "Reveal secret")
- **Cluster**: The cluster you selected (e.g., `us2`)

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```env
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_SECRET="your-pusher-secret"
NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

**Important**: 
- `PUSHER_APP_ID` and `PUSHER_SECRET` are server-side only (not prefixed with `NEXT_PUBLIC_`)
- `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` are client-side (must be prefixed with `NEXT_PUBLIC_`)

### 4. How It Works

#### Server-side (API Routes)
When inventory is updated via:
- `/api/inventory` (POST) - Stock adjustments
- `/api/inventory/transfer` (POST) - Stock transfers
- `/api/purchase-orders/[id]` (PUT) - Receiving purchase orders

The system automatically:
1. Broadcasts the update via Pusher to the `inventory-updates` channel
2. Checks for low stock alerts
3. Creates alerts if stock falls below minimum levels

#### Client-side (React Components)
The inventory page (`/dashboard/inventory`) automatically:
1. Subscribes to the `inventory-updates` channel
2. Listens for `item-changed` events
3. Refreshes the inventory data when updates occur
4. Shows toast notifications for updates

### 5. Testing

1. Open the inventory page in two browser windows/tabs
2. Make an inventory change in one window
3. Watch the other window update automatically without a refresh

### 6. Features Enabled

- ✅ Live inventory updates across all connected clients
- ✅ Automatic low stock detection and alerts
- ✅ Toast notifications for inventory changes
- ✅ Real-time dashboard statistics updates
- ✅ Batch expiry tracking with visual indicators

## Troubleshooting

### Updates not appearing?
1. Check that all environment variables are set correctly
2. Verify Pusher credentials in the dashboard
3. Check browser console for Pusher connection errors
4. Ensure you're not blocking WebSocket connections

### Pusher connection errors?
- Make sure your cluster region matches (`us2`, `eu`, etc.)
- Check that `NEXT_PUBLIC_PUSHER_CLUSTER` matches your app's cluster
- Verify the key and secret are correct

## Free Tier Limits

Pusher's free tier includes:
- Up to 100 concurrent connections
- 200,000 messages per day
- Unlimited channels

For production, consider upgrading to a paid plan.

