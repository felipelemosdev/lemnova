// js/contract/honorarios.js
// Formas de honorários que o usuário escolhe na tela de geração do contrato
// (Percentual / Salários / Salários + Percentual). O benefício apenas SUGERE uma opção
// padrão (BENEFICIOS.<id>.honorarioPadrao) — quem decide de fato é o usuário no popup,
// antes de gerar o contrato.
//
// IMPORTANTE: este objeto descreve as opções mostradas na tela. Ele NÃO reescreve as
// cláusulas de honorários dos contratos (Aposentadoria/Auxílio-Doença/LOAS), que
// continuam com o texto jurídico original e completo em contratoPrestacao.js — a
// cláusula de honorários de cada contrato já contempla, no seu próprio texto, a
// combinação de salários e/ou percentual aplicável a ele. Ver nota de fidelidade em
// contratoPrestacao.js.
export const HONORARIOS = {
    percentual: {
        id: "percentual",
        label: "Percentual",
        percentual: 30
    },
    salarios: {
        id: "salarios",
        label: "Salários",
        salariosAdministrativo: 5,
        salariosJudicial: 6
    },
    misto: {
        id: "misto",
        label: "Salários + Percentual",
        salariosAdministrativo: 5,
        salariosJudicial: 6,
        percentual: 30
    }
};

export function describeHonorarios(key) {
    const opcao = HONORARIOS[key];
    if (!opcao) return "";

    switch (opcao.id) {
        case "percentual":
            return `${opcao.percentual}% sobre o proveito econômico`;
        case "salarios":
            return `${opcao.salariosAdministrativo} salários (administrativo) / ${opcao.salariosJudicial} salários (judicial)`;
        case "misto":
            return `${opcao.salariosAdministrativo} salários (administrativo) / ${opcao.salariosJudicial} salários (judicial) + ${opcao.percentual}% sobre os atrasados`;
        default:
            return opcao.label;
    }
}
