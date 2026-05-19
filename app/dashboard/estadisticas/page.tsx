"use client";
import React, { useState, useEffect } from "react";

export default function EstadisticasPage() {
  const [tabla, setTabla] = useState<any[]>([]);

  useEffect(() => {
    // Motor Matemático para calcular la tabla en vivo
    const calcularTabla = () => {
      const guardados = localStorage.getItem('gl_partidos');
      if (guardados) {
        const partidos = JSON.parse(guardados);
        const tempTabla: any = {};
        
        partidos.forEach((p: any) => {
          if (!p.jugado) return;
          if (!tempTabla[p.local]) tempTabla[p.local] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
          if (!tempTabla[p.visitante]) tempTabla[p.visitante] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
          
          tempTabla[p.local].pj += 1; 
          tempTabla[p.visitante].pj += 1;
          tempTabla[p.local].gf += p.gl; 
          tempTabla[p.visitante].gf += p.gv;
          tempTabla[p.local].gc += p.gv; 
          tempTabla[p.visitante].gc += p.gl;

          if (p.gl > p.gv) { 
            tempTabla[p.local].pts += 3; tempTabla[p.local].pg += 1; tempTabla[p.visitante].pp += 1;
          } else if (p.gv > p.gl) { 
            tempTabla[p.visitante].pts += 3; tempTabla[p.visitante].pg += 1; tempTabla[p.local].pp += 1;
          } else { 
            tempTabla[p.local].pts += 1; tempTabla[p.visitante].pts += 1; tempTabla[p.local].pe += 1; tempTabla[p.visitante].pe += 1; 
          }
        });
        
        // Ordenar por Puntos, luego por Gol Diferencia
        const ordenada = Object.entries(tempTabla).sort((a: any, b: any) => 
          b[1].pts - a[1].pts || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc)
        );
        setTabla(ordenada);
      }
    };
    calcularTabla();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-gray-900">Estadísticas Oficiales</h2>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <span className="text-[#D4A017] text-xl">🏆</span>
          <h3 className="font-bold text-gray-800 uppercase tracking-wide">Tabla de Posiciones</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead className="bg-white text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 w-16">Pos</th>
                <th className="p-4 text-left">Equipo</th>
                <th className="p-4">PJ</th>
                <th className="p-4">PG</th>
                <th className="p-4">PE</th>
                <th className="p-4">PP</th>
                <th className="p-4">GF</th>
                <th className="p-4">GC</th>
                <th className="p-4">GD</th>
                <th className="p-4 text-blue-600 font-black">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tabla.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-gray-400">Aún no hay resultados procesados.</td></tr>
              ) : (
                tabla.map((fila, index) => {
                  const gd = fila[1].gf - fila[1].gc;
                  // Colores para los 3 primeros lugares
                  const posClass = index === 0 ? 'bg-[#D4A017] text-white font-bold' : 
                                   index === 1 ? 'bg-gray-300 text-gray-800 font-bold' : 
                                   index === 2 ? 'bg-[#CD7F32] text-white font-bold' : 'bg-gray-100 text-gray-600';
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${posClass}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="p-4 text-left font-bold text-gray-800 text-base">{fila[0]}</td>
                      <td className="p-4 text-gray-500">{fila[1].pj}</td>
                      <td className="p-4 text-gray-600">{fila[1].pg}</td>
                      <td className="p-4 text-gray-600">{fila[1].pe}</td>
                      <td className="p-4 text-gray-600">{fila[1].pp}</td>
                      <td className="p-4 text-green-600 font-medium">{fila[1].gf}</td>
                      <td className="p-4 text-red-500 font-medium">{fila[1].gc}</td>
                      <td className="p-4 font-mono text-gray-500">{gd > 0 ? `+${gd}` : gd}</td>
                      <td className="p-4 text-blue-600 font-black text-lg">{fila[1].pts}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
