import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ref } = req.query;

    if (!ref) {
        return res.status(400).json({ error: 'Missing reference' });
    }

    try {
        const data = await kv.get(`order:${ref}`);
        if (data) {
            data.notified = true;
            data.ackedAt = Date.now();
            await kv.set(`order:${ref}`, data);
            await kv.zrem('orders:pending', ref);
        }

        return res.status(200).json({ acked: true, reference: ref });

    } catch (error) {
        console.error('[ACK] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
