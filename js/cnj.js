// js/cnj.js
// Integração isolada com a API Pública do CNJ (DataJud): busca automática de Classe,
// Tribunal/Vara e Movimentação a partir do número CNJ digitado no formulário de processo.
// Módulo autocontido (IIFE) — não importa nem exporta nada, só liga seus próprios listeners.

// ============================================================================
// Integração com a API Pública do CNJ (DataJud) - busca de processos
// ============================================================================
/**
 * Integração com a API Pública do DataJud (CNJ)
 * -----------------------------------------------
 * Preenche automaticamente Classe processual, Tribunal/Vara e Movimentação
 * a partir do Número CNJ digitado no formulário "Novo processo".
 *
 * Documentação oficial: https://datajud-wiki.cnj.jus.br/api-publica/
 *
 * IMPORTANTE:
 * 1) A "Chave Pública" abaixo é divulgada oficialmente pelo CNJ na Wiki do
 *    DataJud e pode ser trocada por eles a qualquer momento. Se a busca
 *    parar de funcionar, confira a chave atual em:
 *    https://datajud-wiki.cnj.jus.br/api-publica/acesso/
 * 2) A API do DataJud foi feita para consumo servidor-a-servidor. Como o
 *    Jures One hoje é 100% front-end (sem backend), o navegador pode
 *    bloquear a chamada por CORS. Se isso acontecer, o usuário verá um
 *    aviso claro e poderá preencher os campos manualmente. O ideal, quando
 *    o backend Node/Express do roadmap existir, é mover esta chamada para
 *    lá e o front-end passa a chamar sua própria API.
 * 3) Só encontra processos que já estão indexados no DataJud (nem todos os
 *    tribunais/graus enviam 100% dos dados) e respeita o sigilo processual.
 */

(function () {
    "use strict";

    const DATAJUD_BASE_URL = "https://api-publica.datajud.cnj.jus.br";
    const DATAJUD_API_KEY =
        "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

    // Ordem oficial dos códigos de UF usada pelo CNJ (Resolução CNJ 65/2008)
    // [código de 2 dígitos, alias usado nas URLs do DataJud, sigla da UF]
    const UF_ORDER = [
        ["01", "ac", "AC"], ["02", "al", "AL"], ["03", "ap", "AP"], ["04", "am", "AM"],
        ["05", "ba", "BA"], ["06", "ce", "CE"], ["07", "df", "DF"], ["08", "es", "ES"],
        ["09", "go", "GO"], ["10", "ma", "MA"], ["11", "mt", "MT"], ["12", "ms", "MS"],
        ["13", "mg", "MG"], ["14", "pa", "PA"], ["15", "pb", "PB"], ["16", "pr", "PR"],
        ["17", "pe", "PE"], ["18", "pi", "PI"], ["19", "rj", "RJ"], ["20", "rn", "RN"],
        ["21", "rs", "RS"], ["22", "ro", "RO"], ["23", "rr", "RR"], ["24", "sc", "SC"],
        ["25", "se", "SE"], ["26", "sp", "SP"], ["27", "to", "TO"]
    ];

    function buildTribunalOptions() {
        const options = [];

        options.push({ alias: "stj", label: "STJ - Superior Tribunal de Justiça" });

        for (let n = 1; n <= 6; n++) {
            options.push({ alias: "trf" + n, label: "TRF" + n + " - Tribunal Regional Federal" });
        }

        for (let n = 1; n <= 24; n++) {
            options.push({ alias: "trt" + n, label: "TRT" + n + " - Tribunal Regional do Trabalho" });
        }

        UF_ORDER.forEach(([, uf, sigla]) => {
            const alias = uf === "df" ? "tjdft" : "tj" + uf;
            options.push({ alias, label: "TJ" + sigla + " - Tribunal de Justiça" });
        });

        UF_ORDER.forEach(([, uf, sigla]) => {
            options.push({ alias: "tre-" + uf, label: "TRE" + sigla + " - Tribunal Regional Eleitoral" });
        });

        [["sp", "SP"], ["mg", "MG"], ["rs", "RS"]].forEach(([uf, sigla]) => {
            options.push({ alias: "tjm-" + uf, label: "TJM" + sigla + " - Tribunal de Justiça Militar" });
        });

        return options;
    }

    function populateTribunalSelect(select) {
        buildTribunalOptions().forEach(({ alias, label }) => {
            const opt = document.createElement("option");
            opt.value = alias;
            opt.textContent = label;
            select.appendChild(opt);
        });
    }

    function parseNumeroCnj(rawValue) {
        const digits = (rawValue || "").replace(/\D/g, "");
        if (digits.length !== 20) return null;

        return {
            digits,
            sequencial: digits.slice(0, 7),
            digitoVerificador: digits.slice(7, 9),
            ano: digits.slice(9, 13),
            segmento: digits.slice(13, 14),
            tribunal: digits.slice(14, 16),
            orgao: digits.slice(16, 20)
        };
    }

    function detectarAlias(parsed) {
        if (!parsed) return null;
        const { segmento, tribunal } = parsed;

        if (segmento === "3") return "stj";

        if (segmento === "4") {
            const n = parseInt(tribunal, 10);
            if (n >= 1 && n <= 6) return "trf" + n;
            return null;
        }

        if (segmento === "5") {
            const n = parseInt(tribunal, 10);
            if (n >= 1 && n <= 24) return "trt" + n;
            return null;
        }

        if (segmento === "6") {
            const match = UF_ORDER.find(([codigo]) => codigo === tribunal);
            return match ? "tre-" + match[1] : null;
        }

        if (segmento === "8") {
            const match = UF_ORDER.find(([codigo]) => codigo === tribunal);
            if (!match) return null;
            return match[1] === "df" ? "tjdft" : "tj" + match[1];
        }

        if (segmento === "9") {
            const mapa = { "13": "tjm-mg", "21": "tjm-rs", "26": "tjm-sp" };
            return mapa[tribunal] || null;
        }

        // Segmentos 1 (STF), 2 (CNJ) e 7 (STM) não têm índice na API pública.
        return null;
    }

    function listarMovimentacoes(source) {
        const lista = Array.isArray(source.movimentos) ? source.movimentos : [];
        if (!lista.length) return null;

        const ordenada = [...lista].sort((a, b) => {
            const da = new Date(a.dataHora || 0).getTime();
            const db = new Date(b.dataHora || 0).getTime();
            return db - da; // mais recente primeiro
        });

        return ordenada
            .map((mov) => {
                const nome = mov?.nome || "Movimentação sem descrição";
                const data = mov?.dataHora
                    ? new Date(mov.dataHora).toLocaleDateString("pt-BR")
                    : "data não informada";
                return `${data} - ${nome}`;
            })
            .join("\n");
    }

    function setStatus(el, message, kind) {
        el.textContent = message;
        el.classList.remove("is-loading", "is-error", "is-success");
        if (kind) el.classList.add(kind);
    }

    async function buscarProcesso() {
        const numeroInput = document.getElementById("documentTitle");
        const tribunalSelect = document.getElementById("cnjTribunal");
        const status = document.getElementById("cnjSearchStatus");
        const button = document.getElementById("cnjSearchBtn");

        const parsed = parseNumeroCnj(numeroInput.value);
        if (!parsed) {
            setStatus(
                status,
                "Número CNJ incompleto. Digite os 20 dígitos no formato 0000000-00.0000.0.00.0000.",
                "is-error"
            );
            return;
        }

        const alias = tribunalSelect.value || detectarAlias(parsed);
        if (!alias) {
            setStatus(
                status,
                "Não foi possível identificar o tribunal automaticamente. Selecione manualmente na lista ao lado.",
                "is-error"
            );
            return;
        }

        if (!tribunalSelect.value) {
            tribunalSelect.value = alias;
        }

        button.disabled = true;
        button.textContent = "Consultando...";
        setStatus(status, "Consultando a base pública do CNJ (DataJud)...", "is-loading");

        try {
            const response = await fetch(`${DATAJUD_BASE_URL}/api_publica_${alias}/_search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `APIKey ${DATAJUD_API_KEY}`
                },
                body: JSON.stringify({
                    query: { match: { numeroProcesso: parsed.digits } }
                })
            });

            if (!response.ok) {
                setStatus(
                    status,
                    `O CNJ recusou a consulta (HTTP ${response.status}). Verifique o tribunal selecionado ou tente novamente mais tarde.`,
                    "is-error"
                );
                return;
            }

            const data = await response.json();
            const hit = data?.hits?.hits?.[0];

            if (!hit) {
                setStatus(
                    status,
                    "Nenhum processo encontrado com este número neste tribunal. Confirme o número ou selecione outro tribunal.",
                    "is-error"
                );
                return;
            }

            const source = hit._source || {};
            const classeNome = source.classe?.nome;
            const orgaoNome = source.orgaoJulgador?.nome;
            const tribunalNome = source.tribunal || alias.toUpperCase();
            const movimentos = Array.isArray(source.movimentos) ? source.movimentos : [];
            const movimentacoes = listarMovimentacoes(source);

            const classInput = document.getElementById("processClass");
            const courtInput = document.getElementById("processCourt");
            const movementInput = document.getElementById("processMovement");

            if (classInput && classeNome) classInput.value = classeNome;
            if (courtInput) {
                courtInput.value = orgaoNome ? `${tribunalNome} - ${orgaoNome}` : tribunalNome;
            }
            if (movementInput && movimentacoes) movementInput.value = movimentacoes;

            if (!movimentos.length) {
                setStatus(
                    status,
                    "Processo encontrado, mas este tribunal não enviou o histórico de movimentações para o DataJud (apenas dados cadastrais). Classe e Tribunal/Vara foram preenchidos.",
                    "is-success"
                );
            } else {
                setStatus(
                    status,
                    `Processo encontrado! ${movimentos.length} movimentação(ões) trazida(s) do DataJud (pode não ser o andamento 100% completo — depende do que o tribunal enviou).`,
                    "is-success"
                );
            }
        } catch (error) {
            console.error("Erro ao consultar a API pública do CNJ (DataJud):", error);
            setStatus(
                status,
                "Não foi possível concluir a consulta pelo navegador (provável bloqueio de CORS, pois esta API foi feita para uso via backend). Preencha os campos manualmente por enquanto.",
                "is-error"
            );
        } finally {
            button.disabled = false;
            button.textContent = "🔎 Buscar processo";
        }
    }

    function init() {
        const tribunalSelect = document.getElementById("cnjTribunal");
        const button = document.getElementById("cnjSearchBtn");
        const numeroInput = document.getElementById("documentTitle");

        if (!tribunalSelect || !button || !numeroInput) return;

        populateTribunalSelect(tribunalSelect);
        button.addEventListener("click", buscarProcesso);

        numeroInput.addEventListener("input", () => {
            const parsed = parseNumeroCnj(numeroInput.value);
            const alias = detectarAlias(parsed);
            if (alias) tribunalSelect.value = alias;
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
