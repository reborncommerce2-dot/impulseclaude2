// Autenticación real por email + contraseña contra Supabase Auth. Nada de
// Google/Apple/OAuth — pedido explícito: solo email y contraseña.
import { getSupabase } from "../core/supabaseClient.js";
function toAuthUser(u) {
    if (!u)
        return null;
    return { id: u.id, email: u.email ?? null, name: u.user_metadata?.name ?? null };
}
function redirectUrl() {
    return new URL("./", window.location.href).href;
}
export async function signUp(email, password, name) {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { name }, emailRedirectTo: redirectUrl() },
    });
    if (error)
        throw error;
    // Con "Confirm email" activado, Supabase crea el usuario pero no entrega
    // sesión hasta que siga el enlace del correo. No hay que entrar a la app
    // todavía: la pantalla debe pedirle que confirme el email.
    return data.session ? toAuthUser(data.user) : null;
}
export async function signIn(email, password) {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw error;
    return toAuthUser(data.user);
}
export async function signOut() {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
}
export async function sendPasswordReset(email) {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    if (error)
        throw error;
}
/** Para la pantalla "elegí tu nueva contraseña" a la que Supabase redirige
 * después de tocar el link del mail de recuperación. */
export async function updatePassword(newPassword) {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error)
        throw error;
}
export async function getCurrentUser() {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    return toAuthUser(data.session?.user ?? null);
}
/** Se dispara en login, logout, refresh de token, etc. Devuelve una función
 * para desuscribirse. */
export async function onAuthChange(cb) {
    const supabase = await getSupabase();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        cb(toAuthUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
}
/** Traduce los mensajes de error más comunes de GoTrue a español llano. */
export function friendlyAuthError(err) {
    const msg = String(err?.message ?? err ?? "");
    if (/already registered|already exists/i.test(msg))
        return "Ya existe una cuenta con ese email.";
    if (/invalid login credentials/i.test(msg))
        return "Email o contraseña incorrectos.";
    if (/email not confirmed/i.test(msg))
        return "Todavía no confirmaste tu email — revisá tu bandeja de entrada.";
    if (/password.*(least|short|6 characters)/i.test(msg))
        return "La contraseña necesita al menos 6 caracteres.";
    if (/rate limit/i.test(msg))
        return "Demasiados intentos — esperá un minuto y probá de nuevo.";
    if (/database error saving new user/i.test(msg))
        return "El registro del servidor necesita una reparación. Ejecutá repair-auth-trigger.sql en el SQL Editor de Supabase y volvé a intentar.";
    if (msg === "SUPABASE_NOT_CONFIGURED")
        return "Todavía no configuraste la conexión con Supabase (falta la anon key en config.json).";
    return msg || "Algo salió mal. Probá de nuevo.";
}
