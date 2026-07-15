// js/print.js
// Geração do documento HTML impresso com o timbre do Jures One (letterhead, watermark,
// estilos de impressão) e a função genérica que imprime qualquer seção da tela por id.

import { escapeHTML } from "./utils.js";

export function buildPrintDocument(title, subtitle, bodyHtml) {
    const generatedAt = new Date().toLocaleString("pt-BR");

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <title>${escapeHTML(title)} — Lemnova</title>
        <style>
            @page { margin: 16mm 14mm 20mm; }

            * { box-sizing: border-box; }

            html {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
            }

            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            body {
                font-family: Georgia, "Times New Roman", serif;
                color: #1c2333;
                margin: 0;
                padding: 0 26px 60px;
                font-size: 0.86rem;
                line-height: 1.35;
                position: relative;
            }

            .watermark {
                position: fixed;
                top: 46%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-28deg);
                font-family: Georgia, serif;
                font-size: 4.4rem;
                font-weight: 700;
                color: rgba(16, 32, 58, 0.045);
                letter-spacing: 0.12em;
                white-space: nowrap;
                z-index: -1;
                pointer-events: none;
            }

            .print-header {
                background: #10203a;
                color: #ffffff;
                margin: 0 -26px 0;
                padding: 8px 26px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .letterhead-rule { margin: 0 -26px 16px; }
            .letterhead-rule .thick { height: 2px; background: #10203a; }
            .letterhead-rule .thin { height: 1px; background: #d4af37; margin-top: 2px; }

            .print-header .brand {
                display: flex;
                align-items: center;
                gap: 9px;
            }

            .print-header .brand-mark {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                background: #d4af37;
                color: #10203a;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 0.78rem;
                letter-spacing: 0.02em;
                flex-shrink: 0;
                font-family: Georgia, serif;
            }

            .print-header .brand-text strong {
                display: block;
                font-size: 0.82rem;
                letter-spacing: 0.06em;
            }

            .print-header .brand-text span {
                display: block;
                font-size: 0.56rem;
                color: #d4af37;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                margin-top: 1px;
            }

            .print-header .doc-meta {
                text-align: right;
                font-size: 0.62rem;
                color: #cbd5e1;
                line-height: 1.4;
            }

            .print-title { margin: 0 0 2px; font-size: 1.18rem; color: #10203a; letter-spacing: 0.01em; }
            .print-subtitle { margin: 0 0 16px; color: #667085; font-size: 0.76rem; font-style: italic; }

            .print-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #10203a;
                color: #ffffff;
                border-top: 1px solid #d4af37;
                padding: 7px 26px;
                font-size: 0.68rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                font-family: Arial, Helvetica, sans-serif;
            }

            .print-footer .footer-right { color: #cbd5e1; }

            table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
            th, td { border: 1px solid #d8dce6; padding: 4px 7px; text-align: left; }
            th { background: #f0f1f5; font-weight: 700; }

            .dash-topbar, .btn-print, .modal-overlay, .event-actions, .action-button, .btn, .list-controls, .search-field { display: none !important; }

            h1, h2, h3 { font-family: Georgia, serif; }

            .workspace-panel, .summary-card {
                border: 1px solid #dfe4ee !important;
                border-radius: 3px !important;
                box-shadow: none !important;
                padding: 8px 10px !important;
                margin-bottom: 8px !important;
                min-height: 0 !important;
            }

            .section-heading { margin-bottom: 6px !important; gap: 6px; }
            .section-heading h3 { font-size: 0.92rem !important; margin: 0; }
            .eyebrow { font-size: 0.6rem !important; font-weight: 700; letter-spacing: 0.07em; color: #ad8820 !important; margin: 0 0 1px !important; }

            .dashboard-summary-grid { display: flex !important; border: 1px solid #dfe4ee; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
            .dashboard-summary-grid .summary-card {
                flex: 1; text-align: center; border: none !important; border-right: 1px solid #eceff4 !important;
                border-radius: 0 !important; padding: 6px 4px !important;
            }
            .dashboard-summary-grid .summary-card:last-child { border-right: none !important; }

            .finance-overview { display: flex !important; border: 1px solid #dfe4ee; border-radius: 3px; overflow: hidden; margin-bottom: 8px; gap: 0 !important; }
            .finance-overview .summary-card {
                flex: 1; text-align: center; border: none !important; border-right: 1px solid #eceff4 !important;
                border-radius: 0 !important; padding: 6px 4px !important;
            }
            .finance-overview .summary-card:last-child { border-right: none !important; }

            .summary-card span { font-size: 0.6rem !important; letter-spacing: 0.03em; }
            .summary-card strong { font-size: 0.98rem !important; margin: 2px 0 1px !important; display: block; }
            .summary-card p { font-size: 0.58rem !important; margin: 0 !important; }

            .dashboard-2x2-grid, .dashboard-task-cards { gap: 8px !important; margin-top: 8px !important; }

            .task-col-mini { padding: 0 !important; }
            .task-column-header { padding: 3px 6px !important; border-radius: 3px !important; font-size: 0.68rem !important; font-weight: 700; margin-bottom: 3px !important; }
            .task-column-list { min-height: 0 !important; }
            .task-col-overdue { background: rgba(180,35,24,.1); color: #b42318; }
            .task-col-today { background: rgba(245,158,11,.13); color: #b54708; }
            .task-col-upcoming { background: rgba(2,122,72,.1); color: #027a48; }
            .task-col-done { background: rgba(71,84,103,.1); color: #475467; }
            .task-dash-card { padding: 4px 6px !important; border: 1px solid #dfe4ee; border-radius: 3px; margin-bottom: 3px !important; font-size: 0.72rem; }

            .compact-list { gap: 0 !important; }
            .compact-item { padding: 4px 0 !important; border-bottom: 1px solid #eee; font-size: 0.78rem; }
            .empty-state { padding: 4px 0 !important; font-size: 0.74rem !important; color: #8a93a6; margin: 0 !important; }

            .client-profile-card { padding: 6px 8px !important; margin-bottom: 5px !important; border: 1px solid #eceff4 !important; }
            .client-detail-grid { gap: 4px 10px !important; }
            .detail-item { padding: 2px 0 !important; font-size: 0.76rem !important; }

            .type-pill, .status-pill, .task-pill, .document-badge { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 0.66rem; }
        </style>
        </head><body>
        <div class="watermark">LEMNOVA</div>
        <div class="print-header">
            <div class="brand">
                <div class="brand-mark">LN</div>
                <div class="brand-text">
                    <strong>LEMNOVA</strong>
                    <span>CRM Jurídico</span>
                </div>
            </div>
            <div class="doc-meta">
                <div>${escapeHTML(title)}</div>
                <div>Gerado em ${generatedAt}</div>
            </div>
        </div>
        <div class="letterhead-rule"><div class="thick"></div><div class="thin"></div></div>

        <h1 class="print-title">${escapeHTML(title)}</h1>
        ${subtitle ? `<p class="print-subtitle">${subtitle}</p>` : ""}

        ${bodyHtml}

        <div class="print-footer">
            <span>Lemnova © 2026 • BETA</span>
            <span class="footer-right">Versão 0.1.50 • Sistema interno</span>
        </div>
        </body></html>`;
}


export function printSection(sectionId, title) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument(title, "", section.innerHTML));
    win.document.close();
    win.focus();
    win.print();
}
