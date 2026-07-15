/* Public Food2Suit database connection. RLS protects every table. */
(function () {
  const url = 'https://rvdtrrttggrzdafxytdm.supabase.co';
  const publishableKey = 'sb_publishable_bv4UvAUGQDTeBumNkUU3KA_3UzfgQUC';
  const client = window.supabase?.createClient(url, publishableKey);

  window.Food2SuitDB = {
    client,
    enabled: Boolean(client),
    async submitReview({ name, rating, message }) {
      if (!client) throw new Error('Review service unavailable');
      const { error } = await client.from('reviews').insert({ customer_name: name.trim(), rating: Number(rating), message: message.trim() });
      if (error) throw error;
    },
    async approvedReviews() {
      if (!client) return [];
      const { data, error } = await client.from('reviews').select('customer_name,rating,message,created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(3);
      if (error) throw error;
      return data || [];
    },
    async submitContact({ name, email, phone, message }) {
      if (!client) throw new Error('Message service unavailable');
      const { error } = await client.from('contact_messages').insert({ customer_name: name.trim(), email: email.trim(), phone: phone.trim(), message: message.trim() });
      if (error) throw error;
    }
  };
})();
