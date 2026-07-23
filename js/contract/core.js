// js/contract/core.js
// Helpers compartilhados pelos três módulos de documentos (contratoPrestacao,
// kitAdministrativo, kitJudicial): dados fixos do escritório, formatação dos dados do
// cliente e blocos de assinatura. Extraído de contract.js sem nenhuma alteração de texto.
import { formatCpf, formatCep, formatAddress, escapeHTML } from "../utils.js";

const OFFICE_ADDRESS = "Av. Marechal Deodoro, nº 474, loja B, Jd. 25 de Agosto, Duque de Caxias/RJ";

export const ESCRITORIO = {
    advogadoNome: "DÉBORA CRISTINA DOS SANTOS LOPES",
    advogadoOab: "OAB/RJ 162.559",
    escritorioEndereco: OFFICE_ADDRESS
};

export function clientFields(client) {
    return {
        nome: client.name || "_______________________________",
        nacionalidade: client.nationality || "_______________",
        estadoCivil: client.maritalStatus || "_______________",
        profissao: client.profession || "_______________",
        rg: client.rg || "_______________",
        cpf: client.document ? formatCpf(client.document) : "_______________",
        endereco: client.address && client.address.street
            ? `${formatAddress(client.address)}${client.address.cep ? ` · CEP ${formatCep(client.address.cep)}` : ""}`
            : "_______________________________________________"
    };
}

export const SIGNATURE_BLOCKS = {
    contratada: () => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">Drª DÉBORA CRISTINA DOS S. LOPES</div>
            <div class="signature-role">Contratada</div>
        </div>
    `,
    contratante: (client) => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHTML(client.name || "")}</div>
            <div class="signature-role">Contratante</div>
        </div>
    `,
    assinatura: (client) => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHTML(client.name || "")}</div>
            <div class="signature-role">Assinatura</div>
        </div>
    `,
    debora_oab: () => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">DÉBORA CRISTINA DOS SANTOS LOPES</div>
            <div class="signature-role">OAB/RJ 162.559</div>
        </div>
    `,
    ciente: (client) => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHTML(client.name || "")}</div>
            <div class="signature-role">Ciente</div>
        </div>
    `
};

export function buildSignatureBlocks(client, signatures) {
    return (signatures || []).map((key) => (SIGNATURE_BLOCKS[key] ? SIGNATURE_BLOCKS[key](client) : "")).join("");
}

export function pendingKit(label) {
    return [{
        title: label,
        signatures: ["assinatura"],
        buildBody: () => `
            <p style="text-align:center;border:1px dashed #c8ccd6;border-radius:6px;padding:18px;color:#667085">
                <strong>Modelo "${escapeHTML(label)}" ainda não cadastrado.</strong><br>
                Envie o Word/PDF completo (todas as páginas) deste kit de documentos para que
                seja cadastrado com fidelidade total ao original. Este rascunho não deve ser
                usado com clientes.
            </p>
        `
    }];
}

// Documento pendente "avulso" — mesmo aviso do pendingKit(), mas devolve um único item
// de documento (não um kit inteiro) para poder ser inserido dentro de um kit já existente
// (ex.: Termo de Representação dentro do Kit Administrativo, Ciência Contra Golpes dentro
// do Kit Judicial), até que o texto definitivo seja cadastrado.
export function pendingDocument(label) {
    return pendingKit(label)[0];
}
