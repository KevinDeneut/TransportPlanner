import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket.ts";
import { useAuthStore } from "@/stores/authStore.ts";
import type { Order, Vehicle, Driver } from "@transport-planner/shared";
import { ORDERS_KEY } from "./useOrders.ts";
import { VEHICLES_KEY } from "./useVehicles.ts";

/**
 * Verbindt de Socket.io client en synchroniseert real-time events
 * met de TanStack Query cache. Mount dit één keer in de PlannerPage.
 */
export function useSocket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    socket.connect();

    socket.on("order:created", (order: Order) => {
      queryClient.setQueryData<Order[]>(ORDERS_KEY, (prev) =>
        prev ? [order, ...prev.filter((o) => o.id !== order.id)] : [order]
      );
    });

    socket.on("order:updated", (order: Order) => {
      queryClient.setQueryData<Order[]>(ORDERS_KEY, (prev) =>
        prev ? prev.map((o) => (o.id === order.id ? order : o)) : [order]
      );
    });

    socket.on("order:deleted", (orderId: string) => {
      queryClient.setQueryData<Order[]>(ORDERS_KEY, (prev) =>
        prev ? prev.filter((o) => o.id !== orderId) : []
      );
    });

    socket.on("vehicle:updated", (vehicle: Vehicle) => {
      queryClient.setQueryData<Vehicle[]>(VEHICLES_KEY, (prev) =>
        prev ? prev.map((v) => (v.id === vehicle.id ? vehicle : v)) : [vehicle]
      );
    });

    socket.on("driver:updated", (driver: Driver) => {
      // Drivers zitten genest in vehicles — invalidate zodat ze opnieuw geladen worden
      void queryClient.invalidateQueries({ queryKey: VEHICLES_KEY });
      console.log("[Socket] Driver updated:", driver.name);
    });

    return () => {
      socket.off("order:created");
      socket.off("order:updated");
      socket.off("order:deleted");
      socket.off("vehicle:updated");
      socket.off("driver:updated");
      socket.disconnect();
    };
  }, [token, queryClient]);
}
