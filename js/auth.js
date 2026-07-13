// js/auth.js
// Autenticação simples baseada em sessão: login, logout e restauração de sessão ao
// carregar a aplicação.

import { STORAGE_KEYS, readStorage, saveStorage, removeStorage } from "./storage.js";
import { elements } from "./dom.js";
import { showLogin, showSystem } from "./dom.js";

export async function hydrateSession() {
    const session = await readStorage(STORAGE_KEYS.session, null);
    if (session && session.user) {
        showSystem();
    } else {
        showLogin();
    }
}


export async function handleLogin(event) {
    event.preventDefault();

    const user = elements.loginUser.value.trim();
    const password = elements.loginPassword.value.trim();

    if (!user || password.length < 4) {
        elements.loginMessage.textContent = "Informe login de usuário e senha com pelo menos 4 caracteres.";
        return;
    }

    await saveStorage(STORAGE_KEYS.session, {
        user,
        loggedAt: new Date().toISOString()
    });

    elements.loginMessage.textContent = "";
    elements.loginForm.reset();
    showSystem();
}


export async function handleLogout() {
    await removeStorage(STORAGE_KEYS.session);
    showLogin();
}
