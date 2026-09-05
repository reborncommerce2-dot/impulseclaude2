import { icon } from "../icons.js";
export function renderAuth(mode, errorMsg, notConfigured) {
    if (notConfigured) {
        return `
      <div class="screen" style="padding-top:20vh">
        <div class="empty">
          ${icon("brain")}
          <p><strong style="color:var(--text)">Backend no configurado todavía.</strong><br/>
          Esta copia de Impulse está corriendo en modo local (un solo usuario, sin nube) porque
          <code>config.json</code> no tiene una anon key real de Supabase cargada.</p>
        </div>
        <button class="btn btn-primary btn-block" data-action="continue_local" style="margin-top:8px">
          Usar en modo local por ahora
        </button>
      </div>`;
    }
    const errorHtml = errorMsg
        ? `<div class="card" style="border-color:var(--negative);background:rgba(255,107,107,0.08)"><span class="item-sub" style="color:var(--negative)">${errorMsg}</span></div>`
        : "";
    if (mode === "check_email") {
        return authShell(`
      <div class="empty">${icon("chat")}<p><strong style="color:var(--text)">Revisá tu email.</strong><br/>Te mandamos un link para confirmar tu cuenta.</p></div>
      <button class="btn btn-secondary btn-block" data-action="auth_goto" data-mode="login">Volver a iniciar sesión</button>
    `);
    }
    if (mode === "reset_sent") {
        return authShell(`
      <div class="empty">${icon("chat")}<p><strong style="color:var(--text)">Listo.</strong><br/>Si ese email existe, te llegó un link para elegir una contraseña nueva.</p></div>
      <button class="btn btn-secondary btn-block" data-action="auth_goto" data-mode="login">Volver a iniciar sesión</button>
    `);
    }
    if (mode === "forgot") {
        return authShell(`
      ${errorHtml}
      <form data-action="auth_forgot" class="stack">
        <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email" /></div>
        <button class="btn btn-primary btn-block" type="submit">Mandar link de recuperación</button>
      </form>
      <button class="link" data-action="auth_goto" data-mode="login" style="background:none;border:none;margin-top:14px">Volver a iniciar sesión</button>
    `, "Recuperar contraseña");
    }
    if (mode === "signup") {
        return authShell(`
      ${errorHtml}
      <form data-action="auth_signup" class="stack">
        <div class="field"><label>Nombre</label><input name="name" required autocomplete="name" /></div>
        <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email" /></div>
        <div class="field"><label>Contraseña</label><input name="password" type="password" required minlength="6" autocomplete="new-password" /></div>
        <button class="btn btn-primary btn-block" type="submit">Crear cuenta</button>
      </form>
      <button class="link" data-action="auth_goto" data-mode="login" style="background:none;border:none;margin-top:14px">Ya tengo cuenta — iniciar sesión</button>
    `, "Crear cuenta");
    }
    // login (default)
    return authShell(`
    ${errorHtml}
    <form data-action="auth_login" class="stack">
      <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="email" /></div>
      <div class="field"><label>Contraseña</label><input name="password" type="password" required autocomplete="current-password" /></div>
      <button class="btn btn-primary btn-block" type="submit">Iniciar sesión</button>
    </form>
    <div class="row" style="margin-top:14px">
      <button class="link" data-action="auth_goto" data-mode="signup" style="background:none;border:none">Crear cuenta</button>
      <button class="link" data-action="auth_goto" data-mode="forgot" style="background:none;border:none">Olvidé mi contraseña</button>
    </div>
  `, "Iniciar sesión");
}
function authShell(body, subtitle) {
    return `
    <div class="screen" style="padding-top:14vh">
      <div style="text-align:center;margin-bottom:26px">
        <div class="title" style="font-size:28px">Impulse</div>
        ${subtitle ? `<div class="item-sub" style="margin-top:4px">${subtitle}</div>` : ""}
      </div>
      <div class="card">${body}</div>
    </div>`;
}
