# STATUS.md: RPG Idle de Masmorras

Atualizado em 2026-11-13 (fim do Dia 1). Cole este arquivo no início de cada sessão e peça para atualizá-lo no fim.

Roadmap completo: https://claude.ai/artifact/NHuKASdcxrWiNAQ4qfco4c

## Onde estamos

**Fase 1 (dias 1 a 4), Dia 1 concluído.** O esqueleto roda no navegador: o herói caça, ganha ouro/XP/itens com afixos sorteados, equipa, vende, compra e salva.

## Como rodar

```
python jogar.py                      # abre o jogo no navegador
node tests/validar-dados.mjs         # confere os JSON (contagens, compatibilidade item x habilidade, drops)
node tests/simular.mjs               # simula 300 lutas sem navegador
```

Precisa de Python 3 para `jogar.py` e Node 18+ para os testes. O jogo em si só precisa do navegador, mas deve ser aberto pelo servidor local (os JSON não carregam direto do arquivo).

## Estrutura

```
rpg-idle/
  index.html          tela
  jogar.py            servidor local + abre o navegador
  REGRAS.md           regras iniciais, tabelas e exemplo de começo de jogo
  STATUS.md           este arquivo
  data/               TUDO que se balanceia, sem mexer no código
    regras.json       raridades, fórmulas, economia, loja, morte
    atributos.json    4 atributos (FOR, DES, INT, VIT)
    habilidades.json  8 habilidades com compatibilidade de slot/família
    itens.json        20 modelos de item (cada um com 1 habilidade)
    afixos.json       10 bônus sorteáveis
    monstros.json     5 monstros + chefe do Vale do Musgo
  src/
    rng.js            aleatório com semente
    dados.js          carrega e indexa os JSON
    itens.js          gera item (raridade + afixos), descreve, preço
    heroi.js          herói, stats totais, XP e nível
    combate.js        luta só com ataque básico (Dia 1)
    jogo.js           ações: caçar, equipar, vender, comprar, poção, pontos
    estado.js         salvar/carregar (localStorage)
    ui.js, main.js    tela e ligação dos botões
  tests/              validação de dados e simulação
```

## Decisões fechadas (Dia 1)

- Sem classe; 4 atributos; slots: arma, capacete, armadura, botas, 2 acessórios.
- Item = modelo (habilidade fixa + base) + raridade + afixos sorteados. Habilidade só entra em item compatível (família e slot), validado por teste.
- Raridades: Comum 0 afixos, Incomum 1, Raro 2, Épico 3, Lendário 4.
- Loja vende itens Comuns de nível 1 e 2; itens melhores só dropam.
- Herói começa com 0 de ouro, sem equipamento, atributos 5/5/5/5; 3 pontos livres por nível.

## Números que o teste mostrou

- Herói novo sem itens: vence slime, rato e goblin 100%; lobo 100% (perde ~66% da vida); esqueleto 18%; chefe 0%.
- Simulação de 300 lutas com compras automáticas: chega ao nível 8, 0 mortes. A progressão fica fácil demais com o equipamento da loja; balancear no Dia 8.

## Pendências e decisões em aberto

- [ ] **Morte:** hoje volta à vila com vida cheia e sem perda (provisório). Definir penalidade.
- [ ] **Grupos:** só simulados (mercenários) na fase 3; jogadores reais ficam fora dos 14 dias.
- [ ] **Passivas repetidas:** dois itens com Faro de Tesouro equipados somam o bônus (a simulação equipou dois Anéis do Garimpeiro). Decidir se acumula ou se só vale uma vez.
- [ ] **Nome do jogo.**
- [ ] Visual: hoje só texto e emoji.

## Próximo: Dia 2 (motor de combate idle)

Meta: o herói luta usando as habilidades dos itens equipados.

1. Recargas das habilidades ativas e escolha automática de quando usar.
2. Efeitos: veneno e queimadura (dano contínuo), atordoamento, escudo, esquiva temporária, roubo de vida e cura.
3. Combate por tick com log legível ("Veneno aplicado", "Golpe Pesado: 24 de dano").
4. Teste de simulação: cada habilidade muda o resultado da luta de forma mensurável.
5. Atualizar este arquivo.

## Dias seguintes (resumo)

- Dia 3: gerador de itens completo e tela de equipar (parte já existe).
- Dia 4: loop de caça, salvamento e progresso offline (reserva).
- Dias 5 a 8: maestria, árvore de habilidades, refino com falha, balanceamento.
- Dias 9 a 12: masmorras, chefes, grupo com mercenários.
- Dias 13 e 14: tutorial, celular, publicação.
