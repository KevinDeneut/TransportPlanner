import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";
import type { Vehicle } from "@transport-planner/shared";
import type { UpdateVehicleInput } from "@transport-planner/shared";

export const VEHICLES_KEY = ["vehicles"] as const;

export function useVehicles() {
  return useQuery({
    queryKey: VEHICLES_KEY,
    queryFn: () => api.get<Vehicle[]>("/api/vehicles"),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleInput }) =>
      api.patch<Vehicle>(`/api/vehicles/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Vehicle[]>(VEHICLES_KEY, (prev) =>
        prev ? prev.map((v) => (v.id === updated.id ? updated : v)) : [updated]
      );
    },
  });
}

export function useFinalizeVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Vehicle>(`/api/vehicles/${id}/finalize`, {}),
    onSuccess: (updated) => {
      queryClient.setQueryData<Vehicle[]>(VEHICLES_KEY, (prev) =>
        prev ? prev.map((v) => (v.id === updated.id ? updated : v)) : [updated]
      );
    },
  });
}
