import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

const config = window.SUPABASE_CONFIG;
const supabase = createClient(config.url, config.publishableKey);
const loginPanel = document.querySelector('#login-panel');
const adminPanel = document.querySelector('#admin-panel');
const loginForm = document.querySelector('#login-form');
const statusMessage = document.querySelector('#status');
const createButton = document.querySelector('#create-button');
const generatedKey = document.querySelector('#generated-key');
const keyValue = document.querySelector('#key-value');

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.dataset.error = String(isError);
}

function renderSession(session) {
  const signedIn = Boolean(session);
  loginPanel.hidden = signedIn;
  adminPanel.hidden = !signedIn;
  if (!signedIn) {
    generatedKey.hidden = true;
    keyValue.textContent = '';
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showStatus('Iniciando sesión…');

  const formData = new FormData(loginForm);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  submitButton.disabled = false;
  if (error) {
    showStatus('No se pudo iniciar sesión. Revisa tus datos y que tu usuario esté autorizado.', true);
    return;
  }

  renderSession(data.session);
  loginForm.reset();
  showStatus('');
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    showStatus('No se pudo cerrar la sesión.', true);
    return;
  }
  renderSession(null);
  showStatus('Sesión cerrada.');
});

createButton.addEventListener('click', async () => {
  createButton.disabled = true;
  generatedKey.hidden = true;
  showStatus('Generando clave…');

  const { data, error } = await supabase.functions.invoke('create-license', {
    body: {},
  });

  createButton.disabled = false;
  if (error || !data?.code) {
    showStatus('No se pudo generar la clave. Comprueba tu autorización y la conexión con Supabase.', true);
    return;
  }

  keyValue.textContent = data.code;
  generatedKey.hidden = false;
  showStatus('Clave creada. Cópiala y guárdala; solo se mostrará esta vez.');
});

document.querySelector('#copy-button').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(keyValue.textContent);
    showStatus('Clave copiada al portapapeles.');
  } catch {
    showStatus('No se pudo copiar automáticamente. Selecciona y copia la clave.', true);
  }
});

const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
if (sessionError) {
  showStatus('No se pudo comprobar la sesión.', true);
} else {
  renderSession(sessionData.session);
}

supabase.auth.onAuthStateChange((_event, session) => renderSession(session));
