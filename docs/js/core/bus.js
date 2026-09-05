const listeners = new Set();
/** Cualquier función de dominio llama a bus.emit() tras escribir datos.
 * La UI se suscribe una vez en app.ts y re-renderiza la pantalla activa. */
export const bus = {
    emit() {
        for (const l of listeners)
            l();
    },
    on(l) {
        listeners.add(l);
        return () => listeners.delete(l);
    },
};
