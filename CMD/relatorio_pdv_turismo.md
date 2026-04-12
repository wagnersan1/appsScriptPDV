# 📊 Relatório de Status: Sistema PDV Turismo Multimoeda

Este relatório apresenta o panorama técnico e gerencial do seu sistema de Ponto de Venda desenvolvido sobre a arquitetura do **Google Apps Script + Google Sheets**, destacando sua robustez, módulos disponíveis e os níveis de segurança estabelecidos.

---

## 🏗️ 1. Arquitetura e Engenharia do Sistema

O aplicativo opera uma infraestrutura "Serverless" focada em performance e viabilidade off-grid parcial para o front-end, mas dependendo de validações em tempo real do backend.

- **Stack Front-end**: Vanilla JavaScript + HTML5/CSS3 moderno.
- **Stack Back-end**: Google Apps Script (V8) atuando como API Restful interna.
- **Banco de Dados**: Planilhas Google estruturadas relacionalmente (`VENDAS`, `CAJA`, `FORNECEDORES`, `SERVICOS`, `CLIENTES`, `FUNCIONARIOS`, etc).
- **Controle de Concorrência**: `LockService` implementado para evitar conflitos/duplicações no motor de vendas caso múltiplos vendedores vendam o mesmo pacote ao mesmo tempo.

---

## 🔐 2. Hierarquia e Controle de Permissões (Segurança)

O sistema conta com um ecossistema rigoroso de Roles (Cargos) garantindo que nenhum operador comum quebre dados financeiros da agência.

| Função no Sistema | Permissões Mapeadas |
|-------------------|---------------------------------------------------------------------------------------------------------|
| **VENDEDOR** | Pode Vender, Criar Clientes, ver seus próprios totais no dashboard. Bloqueado nas edições críticas. |
| **CAJA** | Coba, Vende, e tem acesso de consulta ao fluxo de fechamento/Abertura do Caixa (Caja Chica). |
| **CO / GERENTE**| Edita Serviços, pode aplicar descontos/câmbios manuais. Autorizados a visualizar painel da empresa. |
| **ADMIN / CEO** | **Acesso Total:** Gerencia fornecedores, fluxos integrais, apaga/edita informações em qualquer painel.|

> [!CAUTION] 
> Todo o controle de visibilidade da interface (como o botão de Adicionar Fornecedores) é secundado por um bloqueio físico na nuvem Script. Assim, usuários maliciosos ou curiosos estão 100% isolados.

---

## 🚀 3. Módulos e Recursos Ativos

### 💼 Motor de Vendas Multimoeda (Ticket e Faturas)
* **Precificação Dinâmica**: Diferencia as vendas por faixa etária (Adultos, Crianças, Bebês).
* **Conversão Real-Time**: Funciona lendo uma tabela mestra de conversão (ARS, BRL, USD) na hora da venda e computa tanto o Valor Global quanto o Lucro Automático na moeda Base (ARS).
* **Detecção de Fraude de Câmbio**: Auditoria automática grava numa aba oculta quem concedeu desconto global ou alterou manualmente a taxa de câmbio durante o passe da venda.

### 👥 Gestão de Catalogos (CRM / Serviços / Fornecedores)
* **Fornecedores (Recente)**: Interface reformulada. Permite Criação, Atualização e Exclusão segura das parcerias (através de ID UUID). Escondimento inteligente de botões por cargo.
* **Serviços**: Os pacotes controlam os custos operacionais (`Custo Base / Custo Menor`) e permitem ocultação (`Ativo: SI/NO`).

### 📈 Inteligência Financeira e Dashboards
* O sistema segrega dados entre `DashboardVendedor` (metas, comissões individuais em %) e `DashboardEmpresa` (visão master de todos os fundos alocados na agência e margens de lucro agregadas).
* **Extrato de Movimentação**: Listagem imutável com rastreamento histórico para a aba "Lista de Ventas".

---

## 🛠️ 4. Conquistas Recentes e Últimos Commits
Recentemente o repositório consolidou várias correções que elevaram o aplicativo do status de "Protótipo MVP" para "Produto Profissional":
- 🪟 CSS global limpo e modularizado (`index.html` fixado, interfaces estabilizadas).
- 🧱 Conserto do "White Screen" e estabilização do roteamento nas pastas virtuais (Back to Dashboard buttons).
- 👔 Tabela de Fornecedores modernizada com um modal visual limpo para controle e segurança avançada.

## 📌 Próximos Passos Sugeridos
1. **Recibos em PDF**: Gerar o ticket de Fatura em formato PDF.
2. **Gráficos Complexos**: Gráficos com `Chart.js` detalhando lucratividade por operadora/fornecedor.
