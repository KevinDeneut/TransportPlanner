import { CircleMarker, Tooltip } from "react-leaflet";
import type { Order, OrderStatus } from "@transport-planner/shared";

interface OrderMarkerProps {
  order: Order;
  onClick: (order: Order) => void;
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING:     "#f97316", // oranje  — nog niet toegewezen
  ASSIGNED:    "#3b82f6", // blauw   — toegewezen aan voertuig
  LOCKED:      "#a855f7", // paars   — vergrendeld
  SENT_TO_SAP: "#22c55e", // groen   — verstuurd naar SAP
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:     "Wachtend",
  ASSIGNED:    "Toegewezen",
  LOCKED:      "Vergrendeld",
  SENT_TO_SAP: "Verstuurd naar SAP",
};

export function OrderMarker({ order, onClick }: OrderMarkerProps) {
  const color = STATUS_COLOR[order.status];

  return (
    <CircleMarker
      center={[order.deliveryLat!, order.deliveryLng!]}
      radius={10}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2,
      }}
      eventHandlers={{
        click: () => onClick(order),
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
        <div className="text-xs leading-snug">
          <div className="font-semibold">{order.customerName}</div>
          <div className="text-gray-600">{order.deliveryAddress}</div>
          <div className="mt-1 flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{STATUS_LABEL[order.status]}</span>
            <span className="ml-1 text-gray-500">· {order.volumeKarren} karren</span>
          </div>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
