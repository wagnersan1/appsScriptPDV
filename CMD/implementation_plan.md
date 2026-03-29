# Plano de Implementação: Suíte de Testes Automatizados (QA)

Este plano detalha como construiremos uma suíte de automação usando `código.gs` para certificar todas as validações de backend.

## User Review Required

> [!WARNING]
> Testar a função `guardarVenta()` diretamente na sua base oficial de dados significa que as Vendas de teste irão cair na sua aba `VENDAS` e poluir o cálculo do `CAJA` se não lidarmos com isso. Preciso da sua decisão em **"Open Questions"** antes de eu começar a codificar a solução.

## Proposed Changes

### [NEW] `testes_automatizados.gs`
Criarei um arquivo paralelo ao `código.gs` chamado `testes_automatizados.gs` que vai abrigar apenas funções de desenvolvedor. Nele existirá a função principal solicitada:

1. `runAllTests()`: Controlará a orquestração dos cenários (Teste de Login -> Teste de Permissão -> Teste de Venda -> Relatório).
2. `testLoginFlow()`: Injetará objetos literais contendo senhas e usuários na função `login(user, pass)` e emitirá alertas caso ela libere um usuário inexistente ou inativo.
3. `testPermissions()`: Forçará a chamada do modulo `verificarPermissao()` com usuários "VENDEDOR" vs ações de "eliminar".
4. `testSalesCalculation()`: Construirá um carrinho (`carrinho[]`) fictício. Chamará internamente o sistema de preços e verificará se o `comissao_percent` e o `totalFinalPago` batem com as expectativas matemáticas. Ao invés da tela preta, ele imprimirá no console do Apps Script (`Logger.log`) de forma didática com:
   `[PASS]` para aprovado, ou `[FAIL]` para falha.

## Open Questions

Como lidaremos com a **"Sujeira" na Base de Dados** na simulação do Teste de Venda Integrada? Qual você prefere?
- **Opção A (Mais recomendada):** Adicionarei um parâmetro invisível em `guardarVenta(d, usuario, testMode = false)`. Se `testMode` for verdadeiro, o Apps Script roda toda a matemática, te entrega o resultado calculado para teste, mas IGNORA o comando `sheet.appendRow(...)`. (Mantém sua base 100% limpa).
- **Opção B:** Deixamos as vendas e o dinheiro de mentira entrarem nas abas `VENDAS` e `CAJA`, e a própria função de testes, assim que validar os cálculos, manda um comando para "Deletar a última linha". (Mais arriscado para o Google Sheets).

Responda com **"Opção A"** ou **"Opção B"** para que eu possa gerar e injetar código completo de automação!
