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
