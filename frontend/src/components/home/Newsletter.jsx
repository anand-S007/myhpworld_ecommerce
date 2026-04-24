import { useState } from 'react';
import { useSubscribeNewsletter } from '../../hooks/queries.js';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // 'ok' | 'err' | null
  const subscribeMutation = useSubscribeNewsletter();
  const loading = subscribeMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus(null);
    try {
      await subscribeMutation.mutateAsync(email);
      setStatus('ok');
      setEmail('');
    } catch (err) {
      setStatus('err');
    }
  };

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-14 bg-hp-ink text-white text-center noise">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative z-10">
            <div className="text-xs uppercase tracking-[0.25em] text-hp-blue font-semibold">
              Join the club
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-3">
              Stay ahead on HP launches
            </h2>
            <p className="text-white/70 mt-3 max-w-md mx-auto">
              New product drops, in-store offers, and exclusive HP World deals — straight to your inbox.
            </p>
            <form onSubmit={handleSubmit} className="mt-7 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 h-12 px-5 rounded-full text-hp-ink outline-none focus:ring-4 focus:ring-hp-blue/40"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-6 h-12 rounded-full disabled:opacity-60"
              >
                {loading ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
            {status === 'ok' && (
              <div className="text-xs text-accent-mint mt-3">
                ✓ Subscribed — you'll hear from us on new launches and in-store offers.
              </div>
            )}
            {status === 'err' && (
              <div className="text-xs text-accent-red mt-3">
                Something went wrong. Please try again.
              </div>
            )}
            {!status && (
              <div className="text-xs text-white/50 mt-3">
                We respect your inbox. Unsubscribe anytime.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
