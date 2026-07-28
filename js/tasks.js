// js/tasks.js
// Módulo de Tarefas: cadastro, listagem (com colunas do dashboard), conclusão/exclusão,
// e o fluxo de "respostas" de tarefa (histórico de respostas com anexo em PDF e impressão).

import { appState, findClient } from "./state.js";
import { elements } from "./dom.js";
import { createId, todayISO, formatDate, escapeHTML, fileToDataURL, getInitials } from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { buildPrintDocument } from "./print.js";
import { renderDashboardTasks } from "./dashboard.js";
import { renderAll } from "./main.js";

export async function handleTaskSubmit(event) {
    event.preventDefault();

    appState.tasks.unshift({
        id: createId(),
        title: elements.taskTitle.value.trim(),
        from: elements.taskFrom.value.trim(),
        responsible: elements.taskResponsible.value.trim(),
        priority: elements.taskPriority.value,
        dueDate: elements.taskDueDate.value,
        clientId: elements.taskClient.value,
        alert: elements.taskAlert.value,
        description: elements.taskDescription.value.trim(),
        done: false,
        createdAt: new Date().toISOString(),
        replies: [],
        unreadCount: 0
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
                <button class="action-button reply" type="button" data-action="reply-task" data-id="${task.id}">💬 Conversa${task.replies && task.replies.length ? ` (${task.replies.length})` : ""}${task.unreadCount ? ` <span class="msg-item-unread-dot" style="display:inline-block;vertical-align:middle;margin-left:4px"></span>` : ""}</button>
                <button class="action-button ${task.done ? "" : "complete"}" type="button" data-action="toggle-task" data-id="${task.id}">${task.done ? "↺ Reabrir" : "✓ CONCLUÍDO"}</button>
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


// Abre a conversa (chat interno) de uma tarefa: mostra o histórico estilo mensageiro,
// zera o contador de mensagens não lidas dessa tarefa e prepara os "chips" de De/Para
// para facilitar o preenchimento de quem está enviando a mensagem.
export async function openTaskReply(taskId) {
    const task = appState.tasks.find((t) => t.id === taskId);
    if (!task) return;

    appState.activeReplyTaskId = taskId;
    appState.activeReplyRole = "to";

    elements.taskReplyTitle.textContent = task.title;
    const subtitleParts = [
        task.from ? `De: ${task.from}` : null,
        task.responsible ? `Para: ${task.responsible}` : null
    ].filter(Boolean);
    elements.taskReplySubtitle.textContent = subtitleParts.join(" · ") || "Sem participantes definidos";
    if (elements.taskReplyAvatar) {
        elements.taskReplyAvatar.textContent = getInitials(task.responsible || task.from || task.title);
    }

    setupChatRoleButtons(task);

    elements.replyText.value = "";
    elements.replyPdf.value = "";
    elements.replyPdfName.textContent = "Anexar PDF";
    if (elements.taskReplyCompleteButton) {
        elements.taskReplyCompleteButton.classList.toggle("hidden", task.done);
    }

    if (task.unreadCount) {
        appState.tasks = appState.tasks.map((t) => (t.id === taskId ? { ...t, unreadCount: 0 } : t));
        await saveStorage(STORAGE_KEYS.tasks, appState.tasks);
        renderTasks();
        renderMessagesCenter();
    }

    renderReplyHistory(appState.tasks.find((t) => t.id === taskId));
    elements.taskReplyOverlay.classList.remove("hidden");
    elements.replyText.focus();
}


// Monta os botões "De" / "Para" que preenchem rapidamente o campo de autor da mensagem
// com o nome de quem solicitou a tarefa ou de quem é o responsável por ela.
function setupChatRoleButtons(task) {
    if (!elements.chatRoleFromButton || !elements.chatRoleToButton) return;

    elements.chatRoleFromButton.textContent = `De${task.from ? `: ${task.from}` : ""}`;
    elements.chatRoleToButton.textContent = `Para${task.responsible ? `: ${task.responsible}` : ""}`;

    elements.chatRoleFromButton.onclick = () => selectChatRole("from", task);
    elements.chatRoleToButton.onclick = () => selectChatRole("to", task);

    selectChatRole("to", task);
}


function selectChatRole(role, task) {
    appState.activeReplyRole = role;
    elements.replyResponsible.value = role === "from" ? (task.from || "") : (task.responsible || "");
    if (elements.chatRoleFromButton && elements.chatRoleToButton) {
        elements.chatRoleFromButton.classList.toggle("active", role === "from");
        elements.chatRoleToButton.classList.toggle("active", role === "to");
    }
}


export function closeTaskReply() {
    appState.activeReplyTaskId = null;
    appState.activeReplyRole = null;
    elements.taskReplyOverlay.classList.add("hidden");
}


// Renderiza o histórico como balões de chat: mensagens de quem é o responsável pela
// tarefa ficam à direita (estilo "enviado"), mensagens de quem solicitou (De) ou de
// qualquer outra pessoa ficam à esquerda (estilo "recebido").
export function renderReplyHistory(task) {
    const replies = task.replies || [];
    if (!replies.length) {
        elements.taskReplyHistory.innerHTML = '<p class="chat-empty">Nenhuma mensagem ainda. Comece a conversa abaixo.</p>';
        return;
    }

    elements.taskReplyHistory.innerHTML = replies.map((r) => {
        const isMine = r.role
            ? r.role === "to"
            : (r.author || "").trim().toLowerCase() === (task.responsible || "").trim().toLowerCase() && !!task.responsible;
        const side = isMine ? "from-me" : "from-them";
        return `
            <div class="chat-bubble-row ${side}">
                <span class="chat-bubble-author">👤 ${escapeHTML(r.author || "Anônimo")}</span>
                <div class="chat-bubble">
                    ${escapeHTML(r.text)}
                    ${r.pdfName ? `<br><a class="chat-bubble-pdf" href="${r.pdfData}" download="${escapeHTML(r.pdfName)}">📎 ${escapeHTML(r.pdfName)}</a>` : ""}
                </div>
                <span class="chat-bubble-time">${new Date(r.createdAt).toLocaleString("pt-BR")}</span>
            </div>
        `;
    }).join("");

    elements.taskReplyHistory.scrollTop = elements.taskReplyHistory.scrollHeight;
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
        role: appState.activeReplyRole || "to",
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
    elements.replyPdf.value = "";
    elements.replyPdfName.textContent = "Anexar PDF";

    const updatedTask = appState.tasks.find((t) => t.id === taskId);
    renderReplyHistory(updatedTask);
    renderTasks();
    renderMessagesCenter();
}


// ===== Central de mensagens internas (topbar, no lugar do antigo botão de WhatsApp) =====
// Mostra a lista de conversas (tarefas com mensagens), a última mensagem de cada uma e
// um contador de não lidas no sininho de mensagens.

function timeAgoLabel(isoDate) {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} d`;
    return formatDate(isoDate.slice(0, 10));
}


export function renderMessagesCenter() {
    if (!elements.messagesList) return;

    const conversations = appState.tasks
        .filter((task) => (task.replies || []).length > 0)
        .map((task) => ({ task, lastReply: task.replies[task.replies.length - 1] }))
        .sort((a, b) => new Date(b.lastReply.createdAt) - new Date(a.lastReply.createdAt));

    const totalUnread = appState.tasks.reduce((sum, task) => sum + (task.unreadCount || 0), 0);

    if (elements.messagesBadge) {
        elements.messagesBadge.textContent = totalUnread > 9 ? "9+" : String(totalUnread);
        elements.messagesBadge.classList.toggle("hidden", totalUnread === 0);
    }

    if (!conversations.length) {
        elements.messagesList.innerHTML = '<p class="empty-state">Nenhuma mensagem por enquanto.</p>';
        return;
    }

    elements.messagesList.innerHTML = conversations.map(({ task, lastReply }) => `
        <button type="button" class="msg-item ${task.unreadCount ? "unread" : ""}" data-id="${task.id}">
            <span class="msg-item-avatar">${escapeHTML(getInitials(task.responsible || task.from || task.title))}</span>
            <span class="msg-item-body">
                <span class="msg-item-title">
                    <span>${escapeHTML(task.title)}</span>
                    <span class="msg-item-time">${timeAgoLabel(lastReply.createdAt)}</span>
                </span>
                <span class="msg-item-preview">${escapeHTML(lastReply.author || "Anônimo")}: ${escapeHTML(lastReply.text)}</span>
            </span>
            ${task.unreadCount ? '<span class="msg-item-unread-dot"></span>' : ""}
        </button>
    `).join("");
}


export function handleMessagesListClick(event) {
    const button = event.target.closest(".msg-item[data-id]");
    if (!button) return;
    openTaskReply(button.dataset.id);
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

    const subtitle = `De: ${escapeHTML(task.from || "—")} · Para: ${escapeHTML(task.responsible || "—")} · Prazo: ${task.dueDate ? formatDate(task.dueDate) : "—"}`;
    const body = `
        ${task.description ? `<p>${escapeHTML(task.description)}</p><hr style="border:none;border-top:1px solid #ddd;margin:20px 0">` : ""}
        <h2 style="color:#667085;font-size:1rem;font-weight:600;margin-bottom:14px">Mensagens (${(task.replies || []).length})</h2>
        ${replies || '<p style="color:#667085">Nenhuma resposta.</p>'}
    `;

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument(task.title, subtitle, body));
    win.document.close();
    win.focus();
    win.print();
}


export async function completeTaskFromReply() {
    const taskId = appState.activeReplyTaskId;
    if (!taskId) {
        closeTaskReply();
        return;
    }

    appState.tasks = appState.tasks.map((task) => (
        task.id === taskId ? { ...task, done: true } : task
    ));

    await saveStorage(STORAGE_KEYS.tasks, appState.tasks);
    closeTaskReply();
    renderAll();
}


export function printTasksReport() {
    const today = todayISO();
    const overdue = appState.tasks.filter((task) => !task.done && task.dueDate && task.dueDate < today);
    const onTime = appState.tasks.filter((task) => !task.done && (!task.dueDate || task.dueDate >= today));
    const done = appState.tasks.filter((task) => task.done);

    const priorityLabels = { low: "Baixa", medium: "Média", high: "Alta" };

    const buildTable = (list, emptyMessage) => {
        if (!list.length) {
            return `<p style="color:#667085;font-size:0.82rem">${emptyMessage}</p>`;
        }

        const rows = list.map((task) => {
            const client = findClient(task.clientId);
            const priorityLabel = priorityLabels[task.priority] || task.priority;
            return `
                <tr>
                    <td>${escapeHTML(task.title)}</td>
                    <td>${escapeHTML(task.responsible || "-")}</td>
                    <td>${client ? escapeHTML(client.name) : "-"}</td>
                    <td>${task.dueDate ? formatDate(task.dueDate) : "Sem prazo"}</td>
                    <td>${escapeHTML(priorityLabel)}</td>
                </tr>
            `;
        }).join("");

        return `
            <table>
                <thead>
                    <tr><th>Título</th><th>Responsável</th><th>Cliente</th><th>Prazo</th><th>Prioridade</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    };

    const body = `
        <h2 style="color:#b42318;font-size:1rem;margin:18px 0 8px">Atrasadas (${overdue.length})</h2>
        ${buildTable(overdue, "Nenhuma tarefa atrasada.")}

        <h2 style="color:#b54708;font-size:1rem;margin:18px 0 8px">No prazo (${onTime.length})</h2>
        ${buildTable(onTime, "Nenhuma tarefa em aberto.")}

        <h2 style="color:#027a48;font-size:1rem;margin:18px 0 8px">Concluídas (${done.length})</h2>
        ${buildTable(done, "Nenhuma tarefa concluída.")}
    `;

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument("Relatório de tarefas", "Separado por status: atrasadas, no prazo e concluídas", body));
    win.document.close();
    win.focus();
    win.print();
}
