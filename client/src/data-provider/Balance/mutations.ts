import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService, QueryKeys } from 'librechat-data-provider';
import type { TBalanceResponse } from 'librechat-data-provider';

export const useAddCreditsMutation = (options?: {
  onSuccess?: (data: TBalanceResponse) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation(
    (payload: { amount: number }) => dataService.addCredits(payload),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries([QueryKeys.balance]);
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        options?.onError?.(error);
      },
    }
  );
};

export const useCreatePaymentIntentMutation = (options?: {
  onSuccess?: (data: { clientSecret: string }) => void;
  onError?: (error: unknown) => void;
}) => {
  return useMutation(
    (payload: { amount: number }) => dataService.createPaymentIntent(payload),
    {
      onSuccess: (data) => {
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        options?.onError?.(error);
      },
    }
  );
};

export const useVerifyPaymentMutation = (options?: {
  onSuccess?: (data: { success: boolean; balance: number }) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: { paymentIntentId: string }) => dataService.verifyPayment(payload),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries([QueryKeys.balance]);
        options?.onSuccess?.(data);
      },
      onError: (error) => {
        options?.onError?.(error);
      },
    }
  );
};
