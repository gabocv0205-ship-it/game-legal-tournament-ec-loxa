"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Payment {
amount: number;
}

interface Team {
id: string;
name: string;
logo_url?: string;
payments?: Payment[];
pagado: number;
deuda: number;
}

export default function FinanzasPage() {
const [equipos, setEquipos] = useState<Team[]>([]);
const [loading, setLoading] = useState(false);
const [registrationFee, setRegistrationFee] = useState<number>(150);

// =========================================
// CARGAR DATOS DESDE SUPABASE
// =========================================
const loadData = async () => {
try {
setLoading(true);

```
  // Obtener torneo activo o último torneo
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, registration_fee")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (tournamentError) {
    console.error("Error cargando torneo:", tournamentError);
    return;
  }

  if (!tournament) return;

  setRegistrationFee(Number(tournament.registration_fee || 150));

  // Obtener equipos + pagos
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      logo_url,
      payments (
        amount
      )
    `)
    .eq("tournament_id", tournament.id);

  if (teamsError) {
    console.error("Error cargando equipos:", teamsError);
    return;
  }

  // Calcular pagos y deuda
  const equiposCalculados: Team[] =
    teams?.map((team: any) => {
      const totalPagado = (team.payments || []).reduce(
        (sum: number, payment: Payment) =>
          sum + Number(payment.amount),
        0
      );

      return {
        ...team,
        pagado: totalPagado,
        deuda: Math.max(
          Number(tournament.registration_fee) - totalPagado,
          0
        ),
      };
    }) || [];

  setEquipos(equiposCalculados);
} catch (error) {
  console.error("Error general:", error);
} finally {
  setLoading(false);
}
```

};

// =========================================
// REGISTRAR ABONO
// =========================================
const registrarPago = async (teamId: string) => {
const amount = prompt("Ingrese el valor del abono:");

```
if (!amount) return;

try {
  setLoading(true);

  const { error } = await supabase
    .from("payments")
    .insert([
      {
        team_id: teamId,
        amount: Number(amount),
        payment_type: "abono",
      },
    ]);

  if (error) {
    console.error("Error registrando pago:", error);
    alert("No se pudo registrar el pago.");
    return;
  }

  await loadData();

  alert("Pago registrado correctamente.");
} catch (error) {
  console.error("Error:", error);
} finally {
  setLoading(false);
}
```

};

// =========================================
// EFECTO INICIAL
// =========================================
useEffect(() => {
loadData();
}, []);

// =========================================
// CÁLCULOS GENERALES
// =========================================
const totalEsperado = equipos.length * registrationFee;

const totalRecaudado = equipos.reduce(
(sum, equipo) => sum + equipo.pagado,
0
);

const totalPorCobrar = totalEsperado - totalRecaudado;

// =========================================
// RENDER
// =========================================
return ( <div className="space-y-6">
{/* TÍTULO */} <div> <h1 className="text-3xl font-black text-gray-900">
Control Financiero </h1> <p className="text-gray-500 mt-1">
Gestión de pagos y estado financiero de equipos </p> </div>

```
  {/* TARJETAS */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* TOTAL ESPERADO */}
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-sm text-gray-500 font-semibold uppercase">
        Total Esperado
      </p>

      <h2 className="text-3xl font-black text-gray-900 mt-2">
        ${totalEsperado}
      </h2>
    </div>

    {/* TOTAL RECAUDADO */}
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-sm text-gray-500 font-semibold uppercase">
        Total Recaudado
      </p>

      <h2 className="text-3xl font-black text-green-600 mt-2">
        ${totalRecaudado}
      </h2>
    </div>

    {/* TOTAL PENDIENTE */}
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-sm text-gray-500 font-semibold uppercase">
        Total por Cobrar
      </p>

      <h2 className="text-3xl font-black text-red-600 mt-2">
        ${totalPorCobrar}
      </h2>
    </div>
  </div>

  {/* TABLA */}
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    {/* HEADER */}
    <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
      <div>
        <h3 className="font-bold text-gray-900">
          Estado Financiero de Equipos
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          Valor inscripción: ${registrationFee}
        </p>
      </div>
    </div>

    {/* TABLA */}
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="p-4 text-left font-bold text-gray-600">
              Equipo
            </th>

            <th className="p-4 text-center font-bold text-gray-600">
              Pagado
            </th>

            <th className="p-4 text-center font-bold text-gray-600">
              Deuda
            </th>

            <th className="p-4 text-center font-bold text-gray-600">
              Estado
            </th>

            <th className="p-4 text-center font-bold text-gray-600">
              Acción
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {equipos.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="p-10 text-center text-gray-400"
              >
                {loading
                  ? "Cargando equipos..."
                  : "No existen equipos registrados"}
              </td>
            </tr>
          ) : (
            equipos.map((equipo) => (
              <tr
                key={equipo.id}
                className={
                  equipo.deuda > 0
                    ? "bg-red-50/20"
                    : "bg-green-50/20"
                }
              >
                {/* EQUIPO */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {equipo.logo_url ? (
                      <img
                        src={equipo.logo_url}
                        alt={equipo.name}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                        SIN
                      </div>
                    )}

                    <div>
                      <p className="font-bold text-gray-900">
                        {equipo.name}
                      </p>
                    </div>
                  </div>
                </td>

                {/* PAGADO */}
                <td className="p-4 text-center">
                  <span className="font-black text-green-600">
                    ${equipo.pagado}
                  </span>
                </td>

                {/* DEUDA */}
                <td className="p-4 text-center">
                  <span className="font-black text-red-600">
                    ${equipo.deuda}
                  </span>
                </td>

                {/* ESTADO */}
                <td className="p-4 text-center">
                  {equipo.deuda <= 0 ? (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      AL DÍA
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      PENDIENTE
                    </span>
                  )}
                </td>

                {/* ACCIÓN */}
                <td className="p-4 text-center">
                  <button
                    onClick={() => registrarPago(equipo.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    Registrar Abono
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
</div>
```

);
}
