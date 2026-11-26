
const GOOGLE_CLIENT_ID =
  "967394450685-kvf2alj1guau6pfk520g7kchp0k9b2it.apps.googleusercontent.com";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.topics.readonly",
  "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly"
].join(" ");

let accessToken = null;
let tokenClient = null;

function initializeGoogleAuth() {
  if (!window.google?.accounts?.oauth2) {
    console.error("Google Identity Services no está disponible.");
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,

    callback: (response) => {
      if (response.error) {
        console.error("OAuth:", response.error);
        showToast("No se pudo conectar con Google.");
        return;
      }

      accessToken = response.access_token;

      window.dispatchEvent(
        new CustomEvent("google-auth-success")
      );
    },

    error_callback: (error) => {
      console.error("Error OAuth:", error);
      showToast("Error durante la autenticación.");
    }
  });

  document.getElementById("connectGoogleBtn").disabled = false;
}

function connectGoogle() {
  if (!tokenClient) {
    showToast("Google todavía se está inicializando.");
    initializeGoogleAuth();

    if (!tokenClient) return;
  }

  tokenClient.requestAccessToken({
    prompt: accessToken ? "" : "consent"
  });
}

function getAccessToken() {
  if (!accessToken) {
    throw new Error("Tu sesión no está conectada.");
  }

  return accessToken;
}

function isGoogleConnected() {
  return Boolean(accessToken);
}

function disconnectGoogle() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {
      console.log("Acceso revocado.");
    });
  }

  accessToken = null;

  window.dispatchEvent(
    new CustomEvent("google-auth-disconnected")
  );
}

window.addEventListener("load", initializeGoogleAuth);
