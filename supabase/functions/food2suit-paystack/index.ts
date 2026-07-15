// Paystack secret stays in Supabase as PAYSTACK_SECRET_KEY. Never expose it to the storefront.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY') || '';
const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

function callbackUrl(value: unknown) {
  const url = new URL(String(value || ''));
  if (!['http:', 'https:'].includes(url.protocol) || !url.pathname.endsWith('/payment-callback.html')) throw new Error('Invalid payment callback URL.');
  return url.toString();
}

async function verify(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackKey}` },
  });
  const result = await response.json();
  if (!response.ok || !result.status) throw new Error(result.message || 'Paystack could not verify this payment.');
  return result.data;
}

async function markPaid(transaction: Record<string, unknown>) {
  const metadata = transaction.metadata as Record<string, unknown> | undefined;
  const orderId = String(metadata?.order_id || '');
  const reference = String(transaction.reference || '');
  if (!orderId || !reference || transaction.status !== 'success') throw new Error('Payment is not complete.');
  const { data: order, error } = await db.from('orders').select('id,total').eq('id', orderId).maybeSingle();
  if (error || !order) throw new Error('The linked order could not be found.');
  if (Math.round(Number(order.total) * 100) !== Number(transaction.amount)) throw new Error('Payment amount does not match the order.');
  const { error: updateError } = await db.from('orders').update({ payment_status: 'paid', payment_reference: reference }).eq('id', orderId);
  if (updateError) throw new Error('Payment was verified but the order could not be updated.');
  return orderId;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!paystackKey) return json({ error: 'Payment service is not configured.' }, 500);
  try {
    const body = await req.json();
    if (body.action === 'initialize') {
      const orderId = String(body.order_id || '');
      const { data: order, error } = await db.from('orders').select('id,total,email,payment_status').eq('id', orderId).maybeSingle();
      if (error || !order) throw new Error('Order not found.');
      if (order.payment_status === 'paid') throw new Error('This order has already been paid for.');
      if (!order.email) throw new Error('An email address is required for online payment.');
      const reference = `F2S-${order.id.slice(0, 8)}-${Date.now()}`;
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: order.email,
          amount: Math.round(Number(order.total) * 100),
          currency: 'GHS',
          reference,
          callback_url: callbackUrl(body.callback_url),
          metadata: { order_id: order.id, custom_fields: [{ display_name: 'Food2Suit order', variable_name: 'order_id', value: order.id }] },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.status) throw new Error(result.message || 'Could not start payment.');
      await db.from('orders').update({ payment_status: 'pending', payment_reference: reference }).eq('id', order.id);
      return json({ authorization_url: result.data.authorization_url, reference });
    }
    if (body.action === 'verify') {
      const transaction = await verify(String(body.reference || ''));
      if (transaction.status !== 'success') return json({ paid: false, message: 'Payment has not been completed yet.' });
      const orderId = await markPaid(transaction);
      return json({ paid: true, order_id: orderId });
    }
    return json({ error: 'Unknown payment action.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Payment service error.' }, 400);
  }
});
