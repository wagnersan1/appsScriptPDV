# Guia Rápido: Testes Automatizados no Apps Script

Tudo pronto! Seu sistema PDV agora possui uma infraestrutura de **Testamento Contínuo** embutida, baseada no rigoroso "Plano A" de *Dry-Run* escolhido por você. Essa arquitetura permite que você simule e homologue cálculos financeiros e permissões sem criar nenhum lixo na sua planinha de produção.

## O Que Foi Entregue

1. **A Função `isTest` (O Desvio Oculto)**
   Fizemos uma leve cirurgia no seu `código.gs` na função `guardarVenta`. Injetamos o parâmetro `isTest`. Sempre que esse parâmetro for `true`, o PDV executará:
   - Validações de Permissão
   - Consulta de Câmbio ao Vivo
   - Projeção de Margens, Custos e Totais por Idade
   - **Porém, paralisará silenciosamente no exato segundo antes de injetar as linhas nas abas  `VENDAS` e `CAJA`.** Isso protege seu banco de dados enquanto devolve o relatório financeiro formatado para a Máquina de Testes verificar.

2. **O Novo Arquivo `testes_automatizados.gs`**
   Criei este script inteiramente isolado, contendo a função orquestradora mestre: `=runAllTests()`. Ao rodar esta função no painel do Google Apps Script, ela vai disparar uma série de testes analíticos listando os Passes e Falhas com Emojis e mensagens descritivas direto no seu Console de Logs. Cenários abordados:
   - Se VENDEDOR pode deletar dados
   - Se ADMIN pode deletar dados
   - Se Carrinho vazio retorna a falha apropriada
   - **Full Dry-Run**: Envio de um pacote gigante multi-idade forçando desconto inválido, extraindo e logando todas as projeções do backend.

## Como Executar na Prática

> [!TIP]
> **Siga este caminho para rodar a sua bateria agora mesmo:**
> 1. Abra o Editor do seu Projeto no [Google Apps Script](https://script.google.com/).
> 2. Você verá o recém-criado `testes_automatizados.gs` na barra à esquerda (se não aparecer de imediato, espere a sincronização ou recarregue).
> 3. Altere dentro do arquivo `testes_automatizados.gs` a variável fictícia *`nomeDoServicoExistente`* para um nome de serviço exato que conste na sua aba `SERVICOS`.
> 4. Na barra superior "Executar // Depurar", selecione a nova função `runAllTests`.
> 5. Clique em **Executar** e acompanhe o brilhante *Log de Execução* pipocando os status de aprovação ou falha do seu código!
