# Regras iniciais (Dia 1)

Valores de partida. Todos moram em `data/*.json` e serão balanceados nos dias 8 e 14.

## O ciclo do jogo

```
 ┌──────────────┐   ouro, XP, itens   ┌──────────────┐
 │ Caçar monstro │ ─────────────────▶ │   Mochila    │
 └──────▲───────┘                     └──────┬───────┘
        │ herói mais forte                   │ equipar ou vender
        │                                    ▼
 ┌──────┴───────┐   comprar com ouro  ┌──────────────┐
 │ Atributos +  │ ◀───────────────── │ Loja da vila │
 │ equipamento  │                     └──────────────┘
 └──────────────┘
```

1. **Matar** monstros do Vale do Musgo. Cada um dá ouro, XP e uma chance de largar um item.
2. **Coletar** itens. Todo item vem com uma habilidade (fixa) e bônus sorteados.
3. **Fazer ouro** vendendo o que sobra e **comprar** equipamento e poções na vila.
4. **Ficar mais forte** e enfrentar monstros mais difíceis, até chegar ao chefe.

## Herói

- **Sem classe.** Todos começam com FOR 5, DES 5, INT 5 e VIT 5, sem equipamento e com 0 de ouro.
- **Nível:** cada nível dá 3 pontos para distribuir como quiser. XP para o próximo nível = 20 × nível².
- **Slots:** arma, capacete, armadura, botas e dois acessórios.

## Os 4 atributos

| Atributo | O que faz |
| --- | --- |
| **FOR** Força | +1,5 de dano físico por ponto |
| **DES** Destreza | Ataca mais rápido (−0,04 s por ponto, mínimo 0,6 s) e +0,5% de esquiva por ponto (máx. 40%) |
| **INT** Inteligência | Escala as habilidades mágicas e de cura |
| **VIT** Vitalidade | +10 de vida por ponto, +0,1 de regeneração por segundo e escudos mais fortes |

Fórmulas: vida máx. = 50 + VIT×10 (+ itens) · dano = 2 + FOR×1,5 + dano da arma · dano recebido = dano do monstro − defesa (mínimo 1).

## Itens

- **Habilidade fixa:** definida pelo modelo do item. Uma habilidade só entra em itens compatíveis (ver tabela abaixo).
- **Bônus sorteados (afixos):** ao dropar, o item recebe afixos aleatórios conforme a raridade.
  Valor = sorteio da faixa + nível do item × fator, multiplicado pela raridade.
- **Raridade:** Comum (0 afixos) · Incomum (1) · Raro (2) · Épico (3) · Lendário (4).
  Chances de drop: 70% · 20% · 8% · 1,8% · 0,2%.
- **Compra na loja:** sempre vem Comum, sem afixos. Quem quer item com bônus precisa caçar.
- **Venda:** preço base × multiplicador da raridade (1 · 1,5 · 3 · 8 · 20).

## As 8 habilidades e onde cada uma pode entrar

| Habilidade | Efeito | Itens compatíveis (famílias) | Nos 20 itens |
| --- | --- | --- | --- |
| ☠️ **Veneno** | Dano por segundo durante 5 s | Adagas, arcos | Adaga Enferrujada, Punhal do Pântano, Arco de Caçador |
| 💥 **Golpe Pesado** | 250% do dano físico + atordoa 1 s | Espadas, machados, martelos | Espada Larga do Guarda, Machado de Lenhador, Martelo de Pedra |
| 🔥 **Bola de Fogo** | Dano mágico + queimadura de 3 s | Cajados | Cajado de Galho, Cajado do Aprendiz |
| 💚 **Cura** | Recupera vida (escala com INT) | Cajados, amuletos | Cajado do Curandeiro, Amuleto de Musgo |
| 🛡️ **Muralha** | Barreira que absorve dano por 6 s | Capacetes, armaduras | Elmo de Latão, Elmo do Guarda, Gibão de Couro, Cota de Malha |
| 👣 **Passo Sombrio** | +30% de esquiva por 4 s | Botas | Botas Remendadas, Botas do Gato Preto |
| 🩸 **Sede de Sangue** | 25% do dano vira vida por 5 s | Espadas, anéis | Espada de Ferro, Anel do Vampiro Fraco |
| 🪙 **Faro de Tesouro** | Passiva: +15% de ouro e +10% de drop | Anéis, amuletos | Anel do Garimpeiro, Amuleto do Coelho |

## Monstros do Vale do Musgo

| Monstro | Nível | Vida | Dano | Ouro | Drop de item |
| --- | --- | --- | --- | --- | --- |
| 🟢 Slime Gelatinoso | 1 | 20 | 3 | 2 a 5 | 10% |
| 🐀 Rato de Esgoto | 1 | 18 | 4 | 1 a 4 | 10% |
| 👺 Goblin Ladrão | 2 | 40 | 6 | 5 a 12 | 14% |
| 🐺 Lobo Cinzento | 3 | 70 | 9 | 8 a 16 | 14% |
| 💀 Esqueleto Pé-de-Cabra | 4 | 110 | 13 | 15 a 30 | 16% |
| 👑 Rei Slime (chefe, masmorra no Dia 10) | 5 | 400 | 20 | 100 a 180 | 100% |

Teste com herói novo e sem itens: vence slimes, ratos e goblins sempre; o lobo quase sempre, mas perde ~66% da vida; o esqueleto só em 18% das vezes. O herói precisa de equipamento para avançar.

## Economia

- Mochila: 20 espaços. Com a mochila cheia, o item novo é vendido automaticamente.
- Poção de vida: 15 de ouro, cura 40.
- Loja vende só itens de nível 1 e 2. Os de nível 3 ou mais só caem de monstros.

## Morte (regra provisória)

Se a vida chegar a zero, o herói volta à vila com a vida cheia e nenhuma perda. Falta decidir a penalidade real.

## Exemplo: um começo de jogo

Pip acorda na vila sem classe, sem arma e sem moeda.

1. Pip enfrenta slimes de punho limpo (dano 9,5). Cada vitória rende 2 a 5 de ouro e 5 de XP.
2. Na 4ª vitória, Pip sobe para o nível 2 e ganha 3 pontos. Ele coloca em VIT.
3. Um rato larga uma **Adaga Enferrujada**. Pip a equipa e agora tem **Veneno**.
4. Com 20 de ouro ele compra **Botas Remendadas** e ganha **Passo Sombrio**.
5. Um goblin larga um **Elmo de Latão Raro** com `+3 INT` e `+4% de vida`. Pip nem liga para INT, mas a **Muralha** e a vida extra o ajudam a encarar o lobo.
6. Com o ouro das vendas, Pip junta 85 e compra um **Amuleto do Coelho**: passa a ganhar mais ouro e mais drops, o que acelera todo o resto.

Todo item muda o que Pip faz, não só os números dele. É isso que substitui a classe.

## O que ainda NÃO funciona (de propósito)

- As habilidades ativas aparecem nos itens, mas só a passiva (Faro de Tesouro) tem efeito hoje. Os efeitos entram no **Dia 2** (motor de combate).
- Maestria, refino e masmorras entram nos dias 5 a 12.
