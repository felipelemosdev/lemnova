# Mudanças Implementadas no installments.js

## 📋 Resumo
Foram implementadas 3 principais melhorias no módulo de contratos:

---

## 1️⃣ Filtro Padrão = Mês Vigente

### Antes:
```javascript
const filter = elements.contractsFilter ? elements.contractsFilter.value : "pending";
```

### Depois:
```javascript
const filter = elements.contractsFilter ? elements.contractsFilter.value : "current-month";
```

**Benefício:** Ao abrir a aba "Contratos", o usuário já visualiza automaticamente as parcelas do mês atual, não precisando alterar o filtro manualmente.

---

## 2️⃣ Opção de Lançamento Futuro (RPV)

### Nova Função: `getCurrentMonthISO()`
Retorna o mês vigente no formato `YYYY-MM`

### Nova Opção de Filtro:
```javascript
if (filter === "current-month") {
    return sorted.filter((installment) => installment.dueDate.startsWith(currentMonth) && !installment.paid);
}
if (filter === "future") {
    return sorted.filter((installment) => installment.dueDate > todayISO() && !installment.paid);
}
```

### Novo Status no RPV:
```javascript
const isFuture = client.rpvDate && client.rpvDate > today && !client.rpvReceived;
const statusLabel = client.rpvReceived 
    ? "Recebido" 
    : isToday 
        ? "Receber hoje" 
        : isFuture
            ? "Lançamento futuro"  // ← NOVO
            : "Aguardando";
```

**Benefício:** RPVs com data futura são claramente identificadas como "Lançamento futuro", facilitando o acompanhamento de entradas que ainda não venceram.

---

## 3️⃣ Separação e Agrupamento por Mês

### Tabela de Parcelas (Installments)

#### Antes:
- Lista simples linear de parcelas sem organização

#### Depois:
- **Agrupadas por mês** com cabeçalho destacado
- **Total do mês** exibido no cabeçalho
- **Visual em árvore**: mês → parcelas aninhadas

```
📅 01/2025 — Total: R$ 5.000,00
  João Silva        Aposentado  1/3  R$ 1.667,50  01/01/2025  Paga
  Maria Santos      Pensão      2/4  R$ 1.200,00  01/01/2025  Vencida
📅 02/2025 — Total: R$ 3.867,50
  João Silva        Aposentado  2/3  R$ 1.667,50  01/02/2025  A vencer
```

### Tabela de RPV (Recebimentos)

#### Antes:
- Lista simples de RPVs sem agrupação

#### Depois:
- **Agrupadas por mês** com cabeçalho destacado
- **Total do mês** exibido no cabeçalho
- **Incluem "Sem previsão"** como categoria adicional
- **Status "Lançamento futuro"** para datas futuras

```
📅 01/2025 — Total: R$ 8.500,00
  João Silva        R$ 5.000,00  15/01/2025  Receber hoje    ✓
  Maria Santos      R$ 3.500,00  20/01/2025  Lançamento futuro
📅 02/2025 — Total: R$ 4.200,00
  Carlos Oliveira   R$ 4.200,00  10/02/2025  Lançamento futuro
```

### Estilo dos Cabeçalhos
```javascript
style="font-weight: bold; background-color: #f5f5f5; padding: 12px;"
```
- Fundo cinza claro (#f5f5f5) para destaque
- Ícone 📅 para fácil identificação
- Formatação clara do mês e total

---

## 🎯 Filtros Disponíveis

| Filtro | Descrição |
|--------|-----------|
| `current-month` | **[PADRÃO]** Apenas parcelas do mês vigente não pagas |
| `pending` | Todas as parcelas não pagas (sem agrupação de mês) |
| `overdue` | Apenas parcelas vencidas |
| `all` | Todas as parcelas (pagas e não pagas) |
| `future` | Parcelas com vencimento no futuro |

---

## 📝 Alterações de Código

### Arquivo: `installments.js`

**Linhas alteradas:**
- **140-162**: Nova lógica de filtro com `getCurrentMonthISO()` e opções de `current-month` e `future`
- **172-234**: Refatoração de `renderInstallmentsTable()` com agrupamento por mês
- **237-312**: Refatoração de `renderRpvTable()` com agrupamento por mês e novo status

---

## ✅ Checklist de Implementação

- ✅ Filtro padrão = mês vigente (`current-month`)
- ✅ Opção "Lançamento futuro" para RPV
- ✅ Agrupamento de parcelas por mês
- ✅ Agrupamento de RPV por mês
- ✅ Totalizadores por mês em ambas as tabelas
- ✅ Manutenção da compatibilidade com código existente
- ✅ Sem novas dependências externas

---

## 🚀 Como Testar

1. Abra a aba "Contratos"
2. Observe que agora mostra apenas o mês vigente
3. Verifique o agrupamento por mês nas duas tabelas
4. Altere o filtro para "Todos" para ver o comportamento anterior
5. Procure por RPVs com data futura e veja o status "Lançamento futuro"

