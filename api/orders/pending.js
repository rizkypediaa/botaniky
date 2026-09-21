import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Ambil semua pending orders
        const refs = await kv.zrange('orders:pending', 0, -1);
        
        const orders = [];
        for (const ref of refs) {
            const data = await kv.get(`order:${ref}`);
            if (data && !data.notified) {
                orders.push(data);
            }
        }

        return res.status(200).json({ orders, count: orders.length });

    } catch (error) {
        console.error('[PENDING] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
