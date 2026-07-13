// js/agenda.js
// Módulo de Agenda/Eventos: cadastro e edição de compromissos, listagem com busca,
// exclusão e ordenação cronológica (getSortedEvents, também usada pelo dashboard).

import { appState, findClient } from "./state.js";
import { elements } from "./dom.js";
import { createId, todayISO, formatDate, escapeHTML } from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { renderAll } from "./main.js";

export async function handleEventSubmit(event) {
    event.preventDefault();

    const payload = {
        type: elements.eventType.value,
        date: elements.eventDate.value,
        time: elements.eventTime.value,
        clientId: elements.eventClient.value,
        alert: elements.eventAlert.value,
        notes: elements.eventNotes.value.trim(),
    };

    if (appState.editingEventId) {
        appState.events = appState.events.map((eventItem) => (
            eventItem.id === appState.editingEventId
                ? { ...eventItem, ...payload, updatedAt: new Date().toISOString() }
                : eventItem
        ));
    } else {
        appState.events.unshift({
            id: createId(),
            ...payload,
            createdAt: new Date().toISOString()
        });
    }

    await saveStorage(STORAGE_KEYS.events, appState.events);
    resetEventForm();
    renderAll();
}


export function resetEventForm() {
    appState.editingEventId = null;
    elements.eventForm.reset();
    elements.eventDate.value = todayISO();
    elements.eventTime.value = "09:00";
    elements.eventAlert.value = "No horário";
    elements.cancelEventEdit.classList.add("hidden");
    elements.saveEventButton.textContent = "Salvar evento";
    const titleEl = document.getElementById("agendaFormTitle");
    if (titleEl) titleEl.textContent = "Novo evento";
}


export function renderEvents() {
    const searchTerm = elements.eventSearch.value.trim().toLowerCase();
    const filteredEvents = getSortedEvents().filter((eventItem) => {
        const client = findClient(eventItem.clientId);
        const content = [
            eventItem.type,
            eventItem.date,
            eventItem.time,
            eventItem.alert,
            eventItem.notes,
            eventItem.createdAt ? formatDate(eventItem.createdAt.slice(0, 10)) : "",
            client ? client.name : ""
        ].join(" ").toLowerCase();

        return content.includes(searchTerm);
    });

    elements.eventList.innerHTML = "";

    if (!filteredEvents.length) {
        elements.eventList.textContent = "Nenhum evento cadastrado.";
        elements.eventList.classList.add("empty-state");
        return;
    }

    elements.eventList.classList.remove("empty-state");
    filteredEvents.forEach((eventItem) => {
        const client = findClient(eventItem.clientId);
        const item = document.createElement("article");
        item.className = "compact-item event-item";
        item.innerHTML = `
            <div>
                <strong>${escapeHTML(eventItem.type)}</strong>
                <span>${formatDate(eventItem.date)} às ${escapeHTML(eventItem.time)} · ${client ? escapeHTML(client.name) : "Sem cliente"}</span>
                ${eventItem.notes ? `<small>${escapeHTML(eventItem.notes)}</small>` : ""}
            </div>
            <div class="event-actions">
                <span class="status-pill">${escapeHTML(eventItem.alert)}</span>
                <button class="action-button" type="button" data-action="edit-event" data-id="${eventItem.id}">Editar</button>
                <button class="action-button danger" type="button" data-action="delete-event" data-id="${eventItem.id}">Excluir</button>
            </div>
        `;
        elements.eventList.appendChild(item);
    });
}


export function handleEventListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const eventId = button.dataset.id;

    if (button.dataset.action === "edit-event") {
        fillEventForm(eventId);
    }

    if (button.dataset.action === "delete-event") {
        deleteEvent(eventId);
    }
}


export function fillEventForm(eventId) {
    const eventItem = appState.events.find((item) => item.id === eventId);
    if (!eventItem) {
        return;
    }

    appState.editingEventId = eventId;
    elements.eventType.value = eventItem.type || "Avaliação social";
    elements.eventDate.value = eventItem.date || todayISO();
    elements.eventTime.value = eventItem.time || "09:00";
    elements.eventClient.value = eventItem.clientId || "";
    elements.eventAlert.value = eventItem.alert || "No horário";
    elements.eventNotes.value = eventItem.notes || "";
    elements.cancelEventEdit.classList.remove("hidden");
    elements.saveEventButton.textContent = "Alterar evento";
    const titleEl = document.getElementById("agendaFormTitle");
    if (titleEl) titleEl.textContent = "Editar evento";
    elements.eventType.focus();
}


export async function deleteEvent(eventId) {
    const eventItem = appState.events.find((item) => item.id === eventId);
    const description = eventItem ? `${eventItem.type} de ${formatDate(eventItem.date)}` : "este evento";

    if (!window.confirm(`Deseja excluir ${description}?`)) {
        return;
    }

    appState.events = appState.events.filter((item) => item.id !== eventId);
    if (appState.editingEventId === eventId) {
        resetEventForm();
    }
    await saveStorage(STORAGE_KEYS.events, appState.events);
    renderAll();
}


export function getSortedEvents() {
    return [...appState.events].sort((first, second) => (
        `${first.date || ""}T${first.time || "00:00"}`.localeCompare(`${second.date || ""}T${second.time || "00:00"}`)
    ));
}
