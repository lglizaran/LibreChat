import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useToastContext } from '@librechat/client';
import { useVerifyPaymentMutation } from '~/data-provider';

export default function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { showToast } = useToastContext();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const verifyPayment = useVerifyPaymentMutation({
    onSuccess: () => {
      setMessage('Payment verified and credits added!');
      showToast({ message: 'Payment successful! Credits added.', status: 'success' });
      setIsLoading(false);
      onSuccess();
    },
    onError: (error: any) => {
      setIsLoading(false);
      const msg = error.response?.data?.error || 'Payment verification failed';
      setMessage(msg);
      showToast({ message: msg, status: 'error' });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required'
    });

    if (error) {
      setMessage(error.message ?? 'An unexpected error occurred.');
      showToast({ message: error.message ?? 'Payment failed', status: 'error' });
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Verifying payment...');
      verifyPayment.mutate({ paymentIntentId: paymentIntent.id });
    } else {
      setIsLoading(false);
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="mt-4">
      <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
      {message && <div id="payment-message" className="text-red-500 text-sm mt-2">{message}</div>}
      <button 
        disabled={isLoading || !stripe || !elements} 
        id="submit"
        className="btn btn-primary mt-4 w-full"
      >
        <span id="button-text">
          {isLoading ? "Processing..." : "Pay now"}
        </span>
      </button>
    </form>
  );
}
