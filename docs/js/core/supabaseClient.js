let cachedConfig;
export async function loadConfig() {
    if (cachedConfig !== undefined)
        return cachedConfig;
    try {
        const res = await fetch("./config.json", { cache: "no-store" });
        if (!res.ok) {
            cachedConfig = null;
            return null;
        }
        const json = await res.json();
        const looksReal = json.supabaseUrl && json.supabaseAnonKey && !String(json.supabaseAnonKey).startsWith("PEGA_");
        cachedConfig = looksReal ? json : null;
    }
    catch {
        cachedConfig = null;
    }
    return cachedConfig;
}
export async function isConfigured() {
    return (await loadConfig()) !== null;
}
// Se sobreescribe en los tests con un módulo falso (ver /tests/fixtures) para
// poder probar toda la integración sin depender de la red real.
const SUPABASE_JS_URL = "https://esm.sh/@supabase/supabase-js@2";
let clientPromise = null;
/** Devuelve el cliente de Supabase ya inicializado (lo crea una sola vez). */
export function getSupabase() {
    if (clientPromise)
        return clientPromise;
    clientPromise = (async () => {
        const cfg = await loadConfig();
        if (!cfg)
            throw new Error("SUPABASE_NOT_CONFIGURED");
        // @ts-ignore — módulo remoto, TypeScript no puede tipar esta URL.
        const mod = await import(/* @vite-ignore */ SUPABASE_JS_URL);
        return mod.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
    })();
    return clientPromise;
}
