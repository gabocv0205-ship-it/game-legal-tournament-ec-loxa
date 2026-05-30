import { supabase } from "./supabase";

// Nombre y versión de la base de datos local segura
const DB_NAME = "GameLegalOffline";
const DB_VERSION = 1;

/**
 * Inicializa de forma segura la base de datos IndexedDB en el navegador del cliente.
 * No expone la codificación del sistema ni debilita la seguridad.
 */
function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject("Entorno del servidor");

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      
      // Balsa 1: Almacén seguro para Goles y Tarjetas fuera de línea
      if (!db.objectStoreNames.contains("match_events")) {
        db.createObjectStore("match_events", { keyPath: "local_id" });
      }
      
      // Balsa 2: Almacén seguro para Pagos de Arbitraje fuera de línea
      if (!db.objectStoreNames.contains("payments")) {
        db.createObjectStore("payments", { keyPath: "local_id" });
      }
    };

    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

export const offlineStore = {
  /**
   * Guarda un gol, tarjeta o MVP localmente cuando falla la red.
   */
  guardarEventoOffline: async (evento: any) => {
    const db = await abrirDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("match_events", "readwrite");
      const store = transaction.objectStore("match_events");
      
      const nuevoRegistro = {
        ...evento,
        local_id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sincronizado: false,
        created_at: new Date().toISOString()
      };

      const request = store.put(nuevoRegistro);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Guarda un pago de arbitraje localmente en la cancha si no hay internet.
   */
  guardarPagoOffline: async (pago: any) => {
    const db = await abrirDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("payments", "readwrite");
      const store = transaction.objectStore("payments");

      const nuevoRegistro = {
        ...pago,
        local_id: `pag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sincronizado: false,
        created_at: new Date().toISOString()
      };

      const request = store.put(nuevoRegistro);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Sincronizador Maestro: Toma todo lo guardado en el teléfono/laptop
   * y lo empuja a Supabase aplicando las reglas de seguridad de la base de datos.
   */
  sincronizarDatosPendientes: async () => {
    if (typeof window !== "undefined" && !navigator.onLine) return; // Sin red, abortar
    
    const db = await abrirDB();
    
    // 1. Sincronizar Eventos (Goles/Tarjetas)
    const txEvents = db.transaction("match_events", "readwrite");
    const storeEvents = txEvents.objectStore("match_events");
    
    storeEvents.getAll().onsuccess = async (event: any) => {
      const todosLosEventos = event.target.result;
      const pendientes = todosLosEventos.filter((e: any) => !e.sincronizado);

      for (const ev of pendientes) {
        // Limpiamos los campos temporales antes de enviar a Supabase
        const { local_id, sincronizado, ...dataParaSupabase } = ev;
        
        const { error } = await supabase.from("match_events").insert([dataParaSupabase]);
        if (!error || error.message.includes("duplicate")) {
          // Si se subió con éxito, eliminamos el residuo local de IndexedDB
          db.transaction("match_events", "readwrite").objectStore("match_events").delete(local_id);
        }
      }
    };

    // 2. Sincronizar Pagos de Arbitraje
    const txPayments = db.transaction("payments", "readwrite");
    const storePayments = txPayments.objectStore("payments");

    storePayments.getAll().onsuccess = async (event: any) => {
      const todosLosPagos = event.target.result;
      const pendientes = todosLosPagos.filter((p: any) => !p.sincronizado);

      for (const pag of pendientes) {
        const { local_id, sincronizado, ...dataParaSupabase } = pag;

        const { error } = await supabase.from("payments").insert([dataParaSupabase]);
        if (!error || error.message.includes("duplicate")) {
          db.transaction("payments", "readwrite").objectStore("payments").delete(local_id);
        }
      }
    };
  }
};

// Escuchador automático: Apenas el dispositivo recupera señal, vacía la balsa local hacia internet.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineStore.sincronizarDatosPendientes();
  });
}
