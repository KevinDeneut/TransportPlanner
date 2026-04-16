import { MapContainer, TileLayer } from "react-leaflet";
import { useState } from "react";
import type { Order } from "@transport-planner/shared";
import { useOrders } from "@/hooks/useOrders.ts";
import { OrderMarker } from "./OrderMarker.tsx";
import { MapLegend } from "./MapLegend.tsx";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal.tsx";

// Centreren op België
const MAP_CENTER: [number, number] = [50.5, 4.5];
const MAP_ZOOM = 7;

// Grenzen zodat de kaart niet te ver kan scrollen
const MAP_BOUNDS: [[number, number], [number, number]] = [
  [42.0, -5.5],  // Zuid-west (Noord-Spanje / West-Frankrijk)
  [55.5, 16.0],  // Noord-oost (Denemarken / Polen)
];

export function PlannerMap() {
  const { data: orders = [], isLoading } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const ordersOnMap = orders.filter(
    (o) => o.deliveryLat !== null && o.deliveryLng !== null
  );
  const ordersOffMap = orders.filter(
    (o) => o.deliveryLat === null || o.deliveryLng === null
  );

  return (
    <div className="relative h-full w-full">
      {/* Laadstatus */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-white rounded-full px-4 py-1.5 shadow text-sm text-gray-600">
          Orders laden...
        </div>
      )}

      {/* Orders zonder coördinaten — kleine waarschuwingsbadge */}
      {ordersOffMap.length > 0 && (
        <div className="absolute top-4 right-4 z-[500] bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 shadow">
          <span className="font-semibold">{ordersOffMap.length}</span>{" "}
          {ordersOffMap.length === 1 ? "order" : "orders"} zonder locatie
        </div>
      )}

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={0.8}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {ordersOnMap.map((order) => (
          <OrderMarker
            key={order.id}
            order={order}
            onClick={setSelectedOrder}
          />
        ))}
      </MapContainer>

      <MapLegend />

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={(updated) => setSelectedOrder(updated)}
        />
      )}
    </div>
  );
}
