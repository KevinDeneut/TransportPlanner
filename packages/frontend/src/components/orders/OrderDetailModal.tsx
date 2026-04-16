import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateOrderSchema, type UpdateOrderInput, type Order, type OrderStatus } from "@transport-planner/shared";
import { useUpdateOrder, useDeleteOrder } from "@/hooks/useOrders.ts";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onOrderUpdated: (order: Order) => void;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:     "Wachtend",
  ASSIGNED:    "Toegewezen",
  LOCKED:      "Vergrendeld",
  SENT_TO_SAP: "Verstuurd naar SAP",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:     "bg-orange-100 text-orange-700",
  ASSIGNED:    "bg-blue-100 text-blue-700",
  LOCKED:      "bg-purple-100 text-purple-700",
  SENT_TO_SAP: "bg-green-100 text-green-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nl-BE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // datetime-local verwacht "YYYY-MM-DDTHH:mm"
  return iso.slice(0, 16);
}

export function OrderDetailModal({ order, onClose, onOrderUpdated }: OrderDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isLocked = order.status === "LOCKED" || order.status === "SENT_TO_SAP";

  const { mutateAsync: updateOrder, isPending: isSaving } = useUpdateOrder();
  const { mutateAsync: deleteOrder, isPending: isDeleting } = useDeleteOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateOrderInput>({
    resolver: zodResolver(UpdateOrderSchema),
    defaultValues: {
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      requestedDeliveryAt: toDatetimeLocal(order.requestedDeliveryAt) || undefined,
      volumeKarren: order.volumeKarren,
      notes: order.notes ?? undefined,
    },
  });

  const onSubmit = async (data: UpdateOrderInput) => {
    const updated = await updateOrder({ id: order.id, data });
    onOrderUpdated(updated);
    setIsEditing(false);
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteOrder(order.id);
    onClose();
  };

  return (
    // Overlay — z-index hoger dan Leaflet (Leaflet gebruikt ~400)
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900">{order.customerName}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            <p className="text-xs text-gray-400">SAP #{order.sapOrderId} · Klant {order.customerId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {isEditing ? (
            <form id="edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Klantnaam */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Klantnaam</label>
                <input
                  {...register("customerName")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName.message}</p>}
              </div>

              {/* Leveradres */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Leveradres
                  <span className="ml-1 text-gray-400 font-normal">(adres wordt opnieuw geocoded bij opslaan)</span>
                </label>
                <input
                  {...register("deliveryAddress")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.deliveryAddress && <p className="mt-1 text-xs text-red-600">{errors.deliveryAddress.message}</p>}
              </div>

              {/* Volume */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Aantal karren</label>
                <input
                  type="number"
                  min={1}
                  {...register("volumeKarren", { valueAsNumber: true })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.volumeKarren && <p className="mt-1 text-xs text-red-600">{errors.volumeKarren.message}</p>}
              </div>

              {/* Leverdatum */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gewenste leverdatum</label>
                <input
                  type="datetime-local"
                  {...register("requestedDeliveryAt")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Notities */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notities</label>
                <textarea
                  rows={3}
                  {...register("notes")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Optionele opmerkingen..."
                />
              </div>
            </form>
          ) : (
            <dl className="space-y-3">
              <DetailRow label="Leveradres" value={order.deliveryAddress} />
              <DetailRow label="Gewenste leverdatum" value={formatDate(order.requestedDeliveryAt)} />
              <DetailRow label="Aantal karren" value={`${order.volumeKarren} karren`} />
              {order.deliveryLat && order.deliveryLng && (
                <DetailRow
                  label="Coördinaten"
                  value={`${order.deliveryLat.toFixed(4)}, ${order.deliveryLng.toFixed(4)}`}
                />
              )}
              {!order.deliveryLat && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Geen locatie gevonden — order niet zichtbaar op kaart
                </div>
              )}
              {order.notes && <DetailRow label="Notities" value={order.notes} />}
              <DetailRow label="Aangemaakt" value={formatDate(order.createdAt)} />
              <DetailRow label="Laatste wijziging" value={formatDate(order.updatedAt)} />
            </dl>
          )}

          {/* Verwijder bevestiging */}
          {showDeleteConfirm && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700 font-medium mb-3">
                Order verwijderen? Dit kan niet ongedaan gemaakt worden.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? "Verwijderen..." : "Ja, verwijderen"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLocked && (
          <div className="p-6 border-t border-gray-100 flex items-center justify-between">
            {/* Links: verwijderen */}
            {!isEditing && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                Verwijderen
              </button>
            )}
            {isEditing && <div />}

            {/* Rechts: bewerken / opslaan */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    form="edit-form"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? "Opslaan..." : "Opslaan"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  Bewerken
                </button>
              )}
            </div>
          </div>
        )}

        {/* Locked melding */}
        {isLocked && (
          <div className="px-6 py-4 border-t border-gray-100 text-xs text-gray-500 text-center">
            Order is vergrendeld en kan niet meer gewijzigd worden.
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <dt className="text-xs font-medium text-gray-500 w-36 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}
