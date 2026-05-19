import React from "react";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  // Cargamos la interfaz directamente de forma segura sin consultar la base de datos
  return (
    <DashboardClient 
      torneosIniciales={[]} 
      usuarioNombre="GABRIEL CALVA" 
      usuarioId="admin-gabo-123" 
    />
  );
}
