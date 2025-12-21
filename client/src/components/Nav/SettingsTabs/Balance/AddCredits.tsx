import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useLocalize } from '~/hooks';
import { useCreatePaymentIntentMutation } from '~/data-provider';
import { cn } from '~/utils';
import { useToastContext } from '@librechat/client';
import PaymentForm from './PaymentForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

type TAddCreditsProps = {
  onCancel: () => void;
};

const PACKAGES = [
  { amount: 5, credits: 5000 },
  { amount: 10, credits: 10000 },
  { amount: 25, credits: 25000 },
  { amount: 50, credits: 50000 },
];

export default function AddCredits({ onCancel }: TAddCreditsProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  const createPaymentIntent = useCreatePaymentIntentMutation({
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setIsLoading(false);
    },
    onError: (error: any) => {
      setIsLoading(false);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to initialize payment';
      showToast({ message: errorMessage, status: 'error' });
    }
  });

  const currentAmount = isCustom ? parseFloat(customAmount) || 0 : selectedAmount || 0;

  const handlePurchase = () => {
    setIsLoading(true);
    createPaymentIntent.mutate({ amount: currentAmount });
  };
  const currentCredits = currentAmount * 1000;

  if (clientSecret) {
    const options = {
      clientSecret,
      appearance: { theme: 'stripe' as const },
    };

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="mb-4">
          <button
            onClick={() => setClientSecret('')}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            &larr; Back
          </button>
        </div>
        <Elements options={options} stripe={stripePromise}>
          <PaymentForm onSuccess={onCancel} />
        </Elements>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col gap-4">
        <label className="text-sm font-medium text-text-primary">
          Select Amount
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.amount}
              type="button"
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border p-3 transition-all hover:bg-surface-hover",
                !isCustom && selectedAmount === pkg.amount
                  ? "border-primary bg-surface-secondary text-primary"
                  : "border-border-light dark:border-border-dark bg-transparent text-text-secondary"
              )}
              onClick={() => {
                setIsCustom(false);
                setSelectedAmount(pkg.amount);
              }}
            >
              <span className="text-lg font-bold">{pkg.amount}€</span>
              <span className="text-xs opacity-80">{(pkg.credits / 1000)}k credits</span>
            </button>
          ))}
        </div>
        
        {/* Custom Amount Toggle/Input */}
        <div className="mt-2">
           <button
             type="button"
             className={cn(
               "text-xs font-medium underline-offset-4 hover:underline",
               isCustom ? "text-primary" : "text-text-secondary"
             )}
             onClick={() => setIsCustom(!isCustom)}
           >
             {isCustom ? "Select a package" : "Enter custom amount"}
           </button>
           
           {isCustom && (
             <div className="mt-2 flex items-center gap-2">
               <span className="text-text-primary">€</span>
               <input
                 type="number"
                 min="1"
                 value={customAmount}
                 onChange={(e) => setCustomAmount(e.target.value)}
                 className="w-full rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none dark:border-border-dark"
                 placeholder="Enter amount"
               />
             </div>
           )}
        </div>
      </div>

      <div className="rounded-lg bg-surface-secondary p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-text-secondary">Cost</span>
          <span className="font-medium text-text-primary">€{currentAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-border-light dark:border-border-dark pt-2">
          <span className="text-sm text-text-secondary">Total Credits</span>
          <span className="font-bold text-primary">{currentCredits.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="btn btn-neutral"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handlePurchase}
          disabled={isLoading || currentAmount <= 0}
        >
          {isLoading ? (
             <span className="flex items-center gap-2">
               Processing...
             </span>
          ) : (
            "Purchase"
          )}
        </button>
      </div>
    </div>
  );
}
