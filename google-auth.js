/* =========================================================
   CLASSROOM AUDIT
   Google Identity Services — autenticación OAuth 2.0
========================================================= */

// =========================================================
// CONFIGURACIÓN
// =========================================================

const GOOGLE_CLIENT_ID =
  "967394450685-kvf2alj1guau6pfk520g7kchp0k9b2it.apps.googleusercontent.com";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.topics.readonly",
  "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly"
].join(" ");

const GOOGLE_AUTHORIZED_KEY = "classroom-google-authorized";

// Margen de seguridad para considerar vencido el token.
const TOKEN_EXPIRATION_MARGIN = 60 * 1000;

// =========================================================
// ESTADO
// =========================================================

let accessToken = null;
let tokenClient = null;
let tokenExpiration = 0;
let googleAuthInitialized = false;
let initializationAttempts = 0;

const MAX_INITIALIZATION_ATTEMPTS = 20;

// =========================================================
// UTILIDADES
// =========================================================

function googleAuthToast(message) {
  if (typeof showToast === "function") {
    showToast(message);
  } else {
    console.info("[Classroom Audit]", message);
  }
}

function setGoogleButtonState(enabled) {
  const button = document.getElementById("connectGoogleBtn");

  if (button) {
    button.disabled = !enabled;
  }
}

function setGoogleConnectionMessage(message) {
  const status = document.getElementById("connectionStatus");

  if (status) {
    status.textContent = message;
  }
}

function wasGoogleAuthorized() {
  return localStorage.getItem(GOOGLE_AUTHORIZED_KEY) === "true";
}

function rememberGoogleAuthorization() {
  // Solo se guarda un indicador de autorización.
  // Nunca se almacena el Access Token.
  localStorage.setItem(GOOGLE_AUTHORIZED_KEY, "true");
}

function clearGoogleAuthorization() {
  localStorage.removeItem(GOOGLE_AUTHORIZED_KEY);
}

function isTokenValid() {
  return Boolean(
    accessToken &&
    Date.now() < tokenExpiration - TOKEN_EXPIRATION_MARGIN
  );
}

// =========================================================
// INICIALIZACIÓN
// =========================================================

function initializeGoogleAuth() {
  if (googleAuthInitialized) {
    return true;
  }

  if (!window.google?.accounts?.oauth2) {
    initializationAttempts++;

    if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
      setTimeout(initializeGoogleAuth, 500);
    } else {
      console.error(
        "Google Identity Services no pudo inicializarse."
      );

      setGoogleConnectionMessage(
        "No se pudo cargar el servicio de Google."
      );

      googleAuthToast(
        "No se pudo cargar Google. Comprueba tu conexión."
      );
    }

    return false;
  }

  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,

      callback: handleGoogleTokenResponse,

      error_callback: handleGoogleAuthError
    });

    googleAuthInitialized = true;

    setGoogleButtonState(true);

    console.info(
      "Google Identity Services inicializado correctamente."
    );

    return true;

  } catch (error) {
    console.error(
      "Error inicializando Google Identity Services:",
      error
    );

    setGoogleConnectionMessage(
      "Error al inicializar Google."
    );

    return false;
  }
}

// =========================================================
// RESPUESTA DE GOOGLE
// =========================================================

function handleGoogleTokenResponse(response) {
  if (!response) {
    googleAuthToast(
      "Google no devolvió una respuesta válida."
    );
    return;
  }

  if (response.error) {
    console.error("Error OAuth:", response);

    accessToken = null;
    tokenExpiration = 0;

    setGoogleConnectionMessage(
      "Es necesario conectar Google."
    );

    googleAuthToast(
      "No se pudo obtener el acceso a Classroom."
    );

    return;
  }

  if (!response.access_token) {
    console.error(
      "Google no devolvió un Access Token."
    );

    googleAuthToast(
      "No se recibió el token de acceso."
    );

    return;
  }

  accessToken = response.access_token;

  const expiresIn = Number(response.expires_in) || 3600;

  tokenExpiration = Date.now() + expiresIn * 1000;

  rememberGoogleAuthorization();

  console.info(
    "Autorización de Google obtenida correctamente."
  );

  window.dispatchEvent(
    new CustomEvent("google-auth-success")
  );
}

// =========================================================
// ERRORES DE AUTENTICACIÓN
// =========================================================

function handleGoogleAuthError(error) {
  console.error(
    "Error durante la autenticación de Google:",
    error
  );

  googleAuthToast(
    "No se pudo completar la autenticación."
  );
}

// =========================================================
// CONECTAR GOOGLE
// =========================================================

function connectGoogle() {
  if (!googleAuthInitialized || !tokenClient) {
    const initialized = initializeGoogleAuth();

    if (!initialized) {
      googleAuthToast(
        "Google todavía se está inicializando. Inténtalo nuevamente."
      );

      return;
    }
  }

  if (isTokenValid()) {
    window.dispatchEvent(
      new CustomEvent("google-auth-success")
    );

    return;
  }

  /*
   * Si el usuario ya autorizó anteriormente la aplicación,
   * se evita solicitar nuevamente el consentimiento.
   *
   * Si es la primera conexión, se solicita consentimiento.
   */

  const prompt = wasGoogleAuthorized()
    ? ""
    : "consent";

  try {
    tokenClient.requestAccessToken({
      prompt
    });

  } catch (error) {
    console.error(
      "No se pudo solicitar el token:",
      error
    );

    googleAuthToast(
      "No se pudo iniciar la conexión con Google."
    );
  }
}

// =========================================================
// OBTENER ACCESS TOKEN
// =========================================================

function getAccessToken() {
  if (!accessToken) {
    throw new Error(
      "Google Classroom no está conectado. Conecta tu cuenta para continuar."
    );
  }

  if (!isTokenValid()) {
    accessToken = null;
    tokenExpiration = 0;

    throw new Error(
      "Tu token de Google ha vencido. Vuelve a conectar tu cuenta para continuar."
    );
  }

  return accessToken;
}

// =========================================================
// ESTADO DE CONEXIÓN
// =========================================================

function isGoogleConnected() {
  return isTokenValid();
}

// =========================================================
// DESCONEXIÓN
// =========================================================

function disconnectGoogle() {
  const tokenToRevoke = accessToken;

  accessToken = null;
  tokenExpiration = 0;

  clearGoogleAuthorization();

  if (tokenToRevoke && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(
      tokenToRevoke,
      response => {
        console.info(
          "Respuesta de revocación de Google:",
          response
        );
      }
    );
  }

  window.dispatchEvent(
    new CustomEvent("google-auth-disconnected")
  );

  googleAuthToast(
    "Se desconectó tu cuenta de Google."
  );
}

// =========================================================
// INICIO AUTOMÁTICO
// =========================================================

function startGoogleAuth() {
  initializeGoogleAuth();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startGoogleAuth,
    { once: true }
  );
} else {
  startGoogleAuth();
}