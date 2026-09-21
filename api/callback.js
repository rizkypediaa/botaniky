import crypto from 'crypto';
import { kv } from '@vercel/kv';

const ANIKY_USER_KEY = process.env.ANIKY_USER_KEY;

export default async function handler(req, res) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-NVDSTORE-TIMESTAMP, X-NVDSTORE-SIGNATURE');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const timestamp = req.headers['x-nvdstore-timestamp'];
        const signature = req.headers['x-nvdstore-signature'];
        const body = JSON.stringify(req.body);

        // Verify HMAC-SHA256 signature
        const expected = crypto
            .createHmac('sha256', ANIKY_USER_KEY)
            .update(`${timestamp}.${body}`)
            .digest('hex');

        if (!signature || signature !== expected) {
            console.error('[CALLBACK] Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { reference, status, message, serial_number } = req.body;

        if (!reference) {
            return res.status(400).json({ error: 'Missing reference' });
        }

        // Simpan ke Vercel KV
        const orderData = {
            reference,
            status: status.toLowerCase(),
            message: message || '',
            serialNumber: serial_number || '',
            updatedAt: Date.now(),
            notified: false,
        };

        await kv.set(`order:${reference}`, orderData, { ex: 86400 * 7 }); // 7 hari TTL

        // Simpan ke sorted set untuk polling
        await kv.zadd('orders:pending', {
            score: Date.now(),
            member: reference,
        });

        console.log(`[CALLBACK] ${reference}: ${status}`);

        return res.status(200).json({ received: true, reference });

    } catch (error) {
        console.error('[CALLBACK] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
