import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from "@tanstack/react-query";
import { userFacingErrorMessage } from "@/lib/error-messages";

export interface AppMutationOptions<TInput, TResult> {
  mutationFn: (input: TInput) => Promise<TResult>;
  /** Cache entries the mutation invalidates once it succeeds. */
  invalidates?: QueryKey[];
  onSuccess?: (result: TResult, input: TInput) => void;
}

export type AppMutation<TInput, TResult> = UseMutationResult<TResult, unknown, TInput> & {
  /** French, user-facing, never a raw technical string. null while nothing has failed. */
  errorMessage: string | null;
};

/**
 * The single write path for the app. Every mutation goes through it so that a rejected write
 * (an RLS refusal above all) surfaces as a readable message instead of a screen that quietly
 * does not change, which is what fire-and-forget `await repo.update(...)` produced.
 */
export const useAppMutation = <TInput, TResult>({
  mutationFn,
  invalidates = [],
  onSuccess,
}: AppMutationOptions<TInput, TResult>): AppMutation<TInput, TResult> => {
  const queryClient = useQueryClient();

  const mutation = useMutation<TResult, unknown, TInput>({
    mutationFn,
    onSuccess: async (result, input) => {
      await Promise.all(invalidates.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onSuccess?.(result, input);
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error === null ? null : userFacingErrorMessage(mutation.error),
  };
};
