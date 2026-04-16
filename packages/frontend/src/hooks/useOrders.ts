import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";
import type { Order } from "@transport-planner/shared";
import type { UpdateOrderInput } from "@transport-planner/shared";

export const ORDERS_KEY = ["orders"] as const;

export function useOrders() {
  return useQuery({
    queryKey: ORDERS_KEY,
    queryFn: () => api.get<Order[]>("/api/orders"),
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderInput }) =>
      api.patch<Order>(`/api/orders/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Order[]>(ORDERS_KEY, (prev) =>
        prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : [updated]
      );
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/api/orders/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Order[]>(ORDERS_KEY, (prev) =>
        prev ? prev.filter((o) => o.id !== id) : []
      );
    },
  });
}
