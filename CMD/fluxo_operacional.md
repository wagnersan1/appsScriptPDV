# Fluxo Operacional do Sistema (PDV Travel Santur)

Abaixo explicamos como o sistema do seu negócio funciona "por trás das telas", de forma simples e direta. 

O sistema une uma tela visual intuitiva (que você acessa pelo navegador) com uma Planilha do Google, que age como um "Banco de Dados" invisível, registrando e garantindo a segurança de toda a operação.

---

## 1. O Ponto de Partida: Navegação (O "Roteador")
Quando alguém tenta acessar um link do sistema, o **Router Principal** entra em ação. 
- Ele atua como o **recepcionista**, perguntando: *"Para qual página você quer ir?"* (por padrão, é a tela de `login`).
- Ele então junta os pedaços de tela (HTML) com o visual e as regras, e os entrega prontinhos para abrir no seu celular ou computador, sem travamentos.

## 2. Autenticação e Entrada (O Login e Permissões)
Quando o funcionário digita seu usuário e senha, ocorre o seguinte:
- O sistema corre silenciosamente até a aba **FUNCIONARIOS** da sua Planilha do Google.
- Confere o nome, verifica se a senha bate e se a pessoa está "Ativa".
- O mais importante: Ele descobre a **Função** da pessoa. Ele anota se é um *VENDEDOR, CAIXA, GERENTE* ou *ADMIN*. Dependendo desse crachá, algumas portas se abrem e outras ficam trancadas para frente.

## 3. Os Paineis de Controle (Dashboards)
Assim que entra no sistema, ele precisa puxar os números da agência em tempo real:
- **Painel da Empresa (Para Gerência):** O sistema vasculha a aba chamada **VENDAS**. Ele junta tudo que foi vendido nos últimos 7 dias (ou na data que for filtrada), separa por moeda, descobre qual serviço vende mais, quem vendeu mais e quanto tem em "Caixa". 
- **Painel do Vendedor:** Se for um vendedor logado, o sistema inteligentemente *filtra os resultados*, mostrando para ele apenas e estritamente o que ele mesmo vendeu, e calcula sua respectiva comissão.

## 4. Como Uma Nova Venda é Feita? (A Mágica da Compra)
A função de criar uma venda (`guardarVenta`) é a mais importante e segura de todo o sistema. Veja como ela protege você:
1. **Verificação Dupla de Preços:** Quando o carrinho de compras chega no sistema, o sistema **não confia** cegamente nos preços da tela (para evitar que fraudadores mudem o preço com "hacks"). Ele vai lá na aba **SERVICOS** e consulta qual é o preço *real* na planilha para aquele item.
2. **Hierarquia de Descontos:** Só deixa aplicar o desconto total ou usar "Câmbio Manual" se a pessoa logada for Admin, Gerente ou CO. 
3. **Distribuição em Planilha:** Ele pega a venda gigante com vários itens e a fatia, salvando linha por linha bonitinho na Aba **VENDAS**. Ao registrar, já calcula de cara: Total de Venda, Custos Ocultos, Lucro e o valor da Comissão do corretor.
4. **Caiu no Caixa:** Após salvar a venda, ele cria mais um único registro na aba **CAJA** apontando essa "Entrada Múltipla" em de dinheiro na moeda escolhida (Dólar, Real, Pesos etc).

## 5. Buscas Ágeis no Dia a Dia
Enquanto a agência gira, quando alguém digita o início de um nome na pesquisa, o sistema corre para as abas específicas da planilha Google:
- Onde moram as pessoas? Busca pelo nome ou documento.
- O que temos disponível hoje? Puxa todos atrativos garantindo que só mostre o que a agência trabalha.
- Quem apoia a Venda? Mostra a agenda de parceiros.

> [!NOTE] 
> **Resumindo:** Pense que os botões na tela são os garçons fazendo pedidos. O Google Apps Script é o *Cozinheiro* que avalia, prepara e envia os pratos. E a sua Planilha do Google é a *Despensa Central*, onde os dados ficam trancados em segurança. Nenhuma informação entra na despensa sem o cozinheiro conferir a qualidade antes!
