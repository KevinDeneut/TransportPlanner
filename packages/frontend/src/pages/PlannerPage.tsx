import { useAuthStore } from "@/stores/authStore.ts";

/**
 * Hoofdpagina voor planners.
 * Fase 1: tijdelijke placeholder — wordt ingevuld in Fase 3 & 4
 * met de kaart, het voertuigpaneel en drag & drop.
 */
export function PlannerPage() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Topbalk */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">TransportPlanner</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            {user?.displayName}{" "}
            <span className="text-xs text-gray-400">({user?.role})</span>
          </span>
          <button
            onClick={clearAuth}
            className="text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Afmelden
          </button>
        </div>
      </header>

      {/* Tijdelijke placeholder content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Fase 1 voltooid
          </h2>
          <p className="text-sm max-w-sm">
            De kaart, het voertuigpaneel en drag &amp; drop worden toegevoegd in Fase 3 &amp; 4.
            De backend API en authenticatie zijn klaar.
          </p>
        </div>
      </main>
    </div>
  );
}
