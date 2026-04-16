import { useAuthStore } from "@/stores/authStore.ts";
import { useSocket } from "@/hooks/useSocket.ts";
import { PlannerMap } from "@/components/map/PlannerMap.tsx";

export function PlannerPage() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Real-time synchronisatie via Socket.io (verbindt bij mount, verbreekt bij unmount)
  useSocket();

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Topbalk */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">TransportPlanner</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            {user?.displayName}
            <span className="ml-1 text-xs text-gray-400">({user?.role})</span>
          </span>
          <button
            onClick={clearAuth}
            className="text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Afmelden
          </button>
        </div>
      </header>

      {/* Hoofdcontent: kaart links, voertuigpaneel rechts */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kaart */}
        <div className="flex-1 relative">
          <PlannerMap />
        </div>

        {/* Voertuigpaneel — wordt ingevuld in Fase 4 */}
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Voertuigen</h2>
          </div>
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div className="text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1 1h1m8-10h5l3 5v5h-1m-4-6h4" />
              </svg>
              <p className="text-sm font-medium">Voertuigpaneel</p>
              <p className="text-xs mt-1">Beschikbaar in Fase 4</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
