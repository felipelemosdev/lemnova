// js/utils.js
// Funções utilitárias puras (sem dependência de appState, elements ou storage),
// usadas por vários módulos: formatação, validação de CPF/CEP, ids, arquivos, HTML escaping etc.

export function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
}


export function formatCpf(value) {
    const digits = onlyDigits(value).slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}


export function isValidCpf(value) {
    const cpf = onlyDigits(value);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    const calculateDigit = (base) => {
        let sum = 0;
        for (let index = 0; index < base.length; index += 1) {
            sum += Number(base[index]) * (base.length + 1 - index);
        }

        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    const firstDigit = calculateDigit(cpf.slice(0, 9));
    const secondDigit = calculateDigit(cpf.slice(0, 10));

    return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}


export function formatCep(value) {
    const digits = onlyDigits(value).slice(0, 8);
    return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}


export function formatAddress(address = {}) {
    const streetLine = [address.street, address.number].filter(Boolean).join(", ");
    const cityLine = [address.district, address.city, address.state].filter(Boolean).join(" - ");
    return [streetLine, cityLine].filter(Boolean).join(" | ") || "Endereço não informado";
}


export function getInitials(name) {
    return String(name || "Cliente")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}


export function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}


export function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value || 0);
}


export function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC"
    }).format(new Date(`${value}T00:00:00Z`));
}


export function formatFileSize(bytes) {
    if (!bytes) {
        return "0 KB";
    }

    const kilobytes = bytes / 1024;
    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }

    return `${(kilobytes / 1024).toFixed(1)} MB`;
}


export function getDocumentLabel(fileType) {
    const normalizedType = String(fileType || "").toLowerCase();

    if (normalizedType.includes("pdf")) {
        return "PDF";
    }

    if (normalizedType.includes("png")) {
        return "PNG";
    }

    return "JPG";
}


export function createStatusPill(status) {
    const className = status === "Em análise" ? "review" : status === "Arquivado" ? "archived" : "";
    return `<span class="status-pill ${className}">${escapeHTML(status)}</span>`;
}


export function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


export function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsDataURL(file);
    });
}


export function getExtension(fileName) {
    const parts = fileName.toLowerCase().split(".");
    return parts.length > 1 ? `.${parts.pop()}` : "";
}


export function isAllowedDocument(file) {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    const extension = getExtension(file.name);
    return allowedTypes.includes(file.type) || allowedExtensions.includes(extension);
}


export function isAllowedImage(file) {
    const allowedTypes = ["image/jpeg", "image/png"];
    const allowedExtensions = [".jpg", ".jpeg", ".png"];
    const extension = getExtension(file.name);
    return allowedTypes.includes(file.type) || allowedExtensions.includes(extension);
}


export function isAllowedPdf(file) {
    return file.type === "application/pdf" || getExtension(file.name) === ".pdf";
}


// Usado pelos anexos livres do cadastro do cliente (módulo Kits Jurídicos): aceita
// PDF, DOCX e imagens (JPG/PNG).
export function isAllowedAttachment(file) {
    const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
    ];
    const allowedExtensions = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
    const extension = getExtension(file.name);
    return allowedTypes.includes(file.type) || allowedExtensions.includes(extension);
}


export function getAttachmentLabel(fileType, fileName = "") {
    const normalizedType = String(fileType || "").toLowerCase();
    const extension = getExtension(fileName).replace(".", "");

    if (normalizedType.includes("pdf") || extension === "pdf") {
        return "PDF";
    }

    if (normalizedType.includes("wordprocessingml") || extension === "docx") {
        return "DOCX";
    }

    if (normalizedType.includes("png") || extension === "png") {
        return "PNG";
    }

    return "JPG";
}


// Gera um nome de arquivo seguro (sem acentos/caracteres especiais) para downloads,
// usado ao exportar documentos gerados pelo módulo de Kits Jurídicos.
export function slugifyFileName(value) {
    return String(value || "documento")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "documento";
}


// Dispara o download de um Blob no navegador (sem depender de backend).
export function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
