// js/tasks.js
// Módulo de Tarefas: cadastro, listagem (com colunas do dashboard), conclusão/exclusão,
// e o fluxo de "respostas" de tarefa (histórico de respostas com anexo em PDF e impressão).

import { appState, findClient } from "./state.js";
import { elements } from "./dom.js";
import { createId, formatDate, escapeHTML, fileToDataURL } from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { buildPrintDocument } from "./print.js";
import { renderDashboardTasks } from "./dashboard.js";
import { renderAll } from "./main.js";

export async function handleTaskSubmit(event) {
    event.preventDefault();

    appState.tasks.unshift({
        id: createId(),
        title: elements.taskTitle.value.trim(),
        responsible: elements.taskResponsible.value.trim(),
        priority: elements.taskPriority.value,
        dueDate: elements.taskDueDate.value,
        clientId: elements.taskClient.value,
        alert: elements.taskAlert.value,
        description: elements.taskDescription.value.trim(),
        done: false,
        createdAt: new Date().toISOString(),
        replies: []
    });

    await saveStorage(STORAGE_KEYS.tasks, appState.tasks);
    elements.taskForm.reset();
    elements.taskAlert.value = "no_dia";
    renderAll();
}


export function renderTasks() {
    const taskEmptyState = document.getElementById("taskEmptyState");
    elements.taskList.innerHTML = "";

    if (!appState.tasks.length) {
        taskEmptyState.classList.remove("hidden");
        return;
    }

    taskEmptyState.classList.add("hidden");

    appState.tasks.forEach((task) => {
        const priorityLabel = { low: "Baixa", medium: "Média", high: "Alta" }[task.priority] || task.priority;
        const client = findClient(task.clientId);
        const alertLabel = { no_dia: "Alerta: no dia", "1_dia": "Alerta: 1 dia antes", "3_dias": "Alerta: 3 dias antes", "7_dias": "Alerta: 7 dias antes", sem_alerta: "" }[task.alert] || "";
        const metaParts = [
            task.responsible ? task.responsible : null,
            client ? client.name : null,
            task.dueDate ? "Prazo: " + formatDate(task.dueDate) : "Sem prazo",
            alertLabel || null
        ].filter(Boolean);
        const item = document.createElement("article");
        item.className = "compact-item task-item";
        item.innerHTML = `
            <div>
                <strong style="${task.done ? "text-decoration:line-through;opacity:0.5" : ""}">${escapeHTML(task.title)}</strong>
                <span>${escapeHTML(metaParts.join(" · "))}</span>
                ${task.description ? `<small>${escapeHTML(task.description)}</small>` : ""}
            </div>
            <div class="event-actions">
                <span class="task-pill ${task.priority}">${escapeHTML(priorityLabel)}</span>
                <button class="action-button reply" type="button" data-action="reply-task" data-id="${task.id}">💬 Responder${task.replies && task.replies.length ? ` (${task.replies.length})` : ""}</button>
                <button class="action-button" type="button" data-action="toggle-task" data-id="${task.id}">${task.done ? "Reabrir" : "Concluir"}</button>
                <button class="action-button danger" type="button" data-action="delete-task" data-id="${task.id}">Excluir</button>
            </div>
        `;
        elements.taskList.appendChild(item);
    });
}


export function handleTaskListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const taskId = button.dataset.id;

    if (button.dataset.action === "toggle-task") {
        appState.tasks = appState.tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t);
        saveStorage(STORAGE_KEYS.tasks, appState.tasks);
        renderTasks();
        renderDashboardTasks();
    }

    if (button.dataset.action === "delete-task") {
        appState.tasks = appState.tasks.filter((t) => t.id !== taskId);
        saveStorage(STORAGE_KEYS.tasks, appState.tasks);
        renderTasks();
        renderDashboardTasks();
    }

    if (button.dataset.action === "reply-task") {
        openTaskReply(taskId);
    }
}


export function openTaskReply(taskId) {
    const task = appState.tasks.find((t) => t.id === taskId);
    if (!task) return;

    appState.activeReplyTaskId = taskId;
    elements.taskReplyTitle.textContent = escapeHTML(task.title);
    elements.taskReplySubtitle.textContent = task.responsible ? `Responsável original: ${task.responsible}` : "";
    elements.replyResponsible.value = "";
    elements.replyText.value = "";
    elements.replyPdf.value = "";
    elements.replyPdfName.textContent = "";

    renderReplyHistory(task);
    elements.taskReplyOverlay.classList.remove("hidden");
    elements.replyResponsible.focus();
}


export function closeTaskReply() {
    appState.activeReplyTaskId = null;
    elements.taskReplyOverlay.classList.add("hidden");
}


export function renderReplyHistory(task) {
    const replies = task.replies || [];
    if (!replies.length) {
        elements.taskReplyHistory.innerHTML = '<p style="color:var(--color-muted);font-size:0.85rem">Nenhuma resposta ainda.</p>';
        return;
    }

    elements.taskReplyHistory.innerHTML = replies.map((r) => `
        <div class="reply-entry">
            <div class="reply-entry-header">
                <span class="reply-entry-author">👤 ${escapeHTML(r.author || "Anônimo")}</span>
                <span class="reply-entry-date">${new Date(r.createdAt).toLocaleString("pt-BR")}</span>
            </div>
            <p class="reply-entry-text">${escapeHTML(r.text)}</p>
            ${r.pdfName ? `<a class="reply-entry-pdf" href="${r.pdfData}" download="${escapeHTML(r.pdfName)}">📎 ${escapeHTML(r.pdfName)}</a>` : ""}
        </div>
    `).join("");
}


export async function saveTaskReply() {
    const taskId = appState.activeReplyTaskId;
    if (!taskId) return;

    const text = elements.replyText.value.trim();
    if (!text) {
        elements.replyText.focus();
        return;
    }

    const pdfFile = elements.replyPdf.files[0];
    let pdfData = "";
    let pdfName = "";

    if (pdfFile) {
        if (!pdfFile.type.includes("pdf")) {
            alert("Por favor, anexe um arquivo PDF.");
            return;
        }
        try {
            pdfData = await fileToDataURL(pdfFile);
            pdfName = pdfFile.name;
        } catch {
            alert("Não foi possível ler o PDF.");
            return;
        }
    }

    const reply = {
        id: createId(),
        author: elements.replyResponsible.value.trim() || "Anônimo",
        text,
        pdfData,
        pdfName,
        createdAt: new Date().toISOString()
    };

    appState.tasks = appState.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, replies: [...(t.replies || []), reply] };
    });

    await saveStorage(STORAGE_KEYS.tasks, appState.tasks);

    elements.replyText.value = "";
    elements.replyResponsible.value = "";
    elements.replyPdf.value = "";
    elements.replyPdfName.textContent = "";

    const updatedTask = appState.tasks.find((t) => t.id === taskId);
    renderReplyHistory(updatedTask);
    renderTasks();
}


export function printTaskReply() {
    const taskId = appState.activeReplyTaskId;
    const task = appState.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const replies = (task.replies || []).map((r) => `
        <div style="border:1px solid #ddd;border-left:3px solid #d4af37;padding:12px;border-radius:6px;margin-bottom:12px;background:#fafafa">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <strong>${escapeHTML(r.author || "Anônimo")}</strong>
                <span style="color:#666;font-size:0.85rem">${new Date(r.createdAt).toLocaleString("pt-BR")}</span>
            </div>
            <p style="margin:0;white-space:pre-wrap">${escapeHTML(r.text)}</p>
            ${r.pdfName ? `<p style="margin:6px 0 0;font-size:0.82rem;color:#666">📎 Anexo: ${escapeHTML(r.pdfName)}</p>` : ""}
        </div>
    `).join("");

    const subtitle = `Responsável original: ${escapeHTML(task.responsible || "—")} · Prazo: ${task.dueDate ? formatDate(task.dueDate) : "—"}`;
    const body = `
        ${task.description ? `<p>${escapeHTML(task.description)}</p><hr style="border:none;border-top:1px solid #ddd;margin:20px 0">` : ""}
        <h2 style="color:#667085;font-size:1rem;font-weight:600;margin-bottom:14px">Respostas (${(task.replies || []).length})</h2>
        ${replies || '<p style="color:#667085">Nenhuma resposta.</p>'}
    `;

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument(task.title, subtitle, body));
    win.document.close();
    win.focus();
    win.print();
}
