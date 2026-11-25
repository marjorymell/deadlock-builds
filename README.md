# Deadlock Build Lab

Ferramenta web que monta a build do seu herói no **Deadlock** adaptada ao time inimigo da partida, usando estatísticas sempre atualizadas da [deadlock-api.com](https://deadlock-api.com).

## O que ela faz

- **Build base:** os itens mais comprados com o seu herói, por tier.
- **Itens contra este time:** itens que rendem acima do normal contra os inimigos da partida, com o motivo ("bom contra Haze, Wraith").
- **Evite nesta partida:** itens comuns da build base que rendem pior contra esses inimigos.
- **Matchups:** sua taxa de vitória contra cada inimigo e junto com cada aliado.
- **Marcar forte:** durante a partida, olhe o placar (Tab) e marque os inimigos com mais souls. Eles passam a pesar 3× nas recomendações.
- **Filtro de rank:** use só partidas de jogadores do seu nível.

## Como usar

1. Abra o site (ou o `index.html` no navegador).
2. Escolha o seu herói (ele fica salvo para as próximas vezes).
3. No início da partida, digite as primeiras letras de cada inimigo e aperte **Enter**.
4. Durante a partida, use **Marcar forte** nos inimigos que estiverem à frente.

> A busca automática pela conta Steam só encontra partidas em destaque na aba "Assistir" do jogo, então na maioria das vezes a escolha dos heróis é manual.

## Como as recomendações são calculadas

Para cada item, a ferramenta compara a taxa de vitória do item **contra cada inimigo** com a taxa de vitória dele **em geral** para o seu herói:

```
lift = (vitória do item vs inimigo − vitória do item em geral)
     − (média vs inimigo − média geral)
```

O resultado é suavizado pelo tamanho da amostra (itens com poucas partidas pesam menos) e combinado entre os inimigos, com peso 3 para os marcados como fortes.

São dados de correlação das partidas dos últimos 30 dias: use como guia, não como regra.

## Estrutura

```
deadlock-builds/
├── index.html          # página
├── assets/
│   ├── css/style.css   # estilos
│   └── js/app.js       # lógica e chamadas à API
└── README.md
```

Sem dependências e sem build: é HTML, CSS e JavaScript puro.

## Publicar no GitHub Pages

1. Suba os arquivos para o repositório.
2. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`.
3. O site fica em `https://marjorymell.github.io/deadlock-builds/`.

## Créditos

- Dados: [deadlock-api.com](https://deadlock-api.com)
- Projeto não oficial, sem vínculo com a Valve. Deadlock é marca registrada da Valve Corporation.
