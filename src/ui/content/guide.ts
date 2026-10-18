/**
 * Guia inicial — nota virtual aberta na primeira execução do app.
 * Não é um arquivo em disco: editável como playground, nunca salva,
 * não conta nas estatísticas.
 */
export const GUIDE_PATH = "tinta://guia";

export const GUIDE_TITLE = "guia do tinta";

export const GUIDE_TEXT = `# bem-vindo ao tinta

Este é o seu editor. Ele existe por uma razão simples: escrever pede
silêncio, e a maioria dos programas de texto faz barulho — barras,
botões, notificações, formatos fechados. O tinta faz o contrário.
Uma coluna de texto, os seus arquivos, e nada entre você e a frase.

Pode digitar aqui à vontade: **este guia é um playground**. Nada do que
você escrever nele será salvo. Quando fechar, ele volta ao original.

## como o tinta pensa

- **Seus textos são arquivos .md e .txt comuns**, numa pasta sua.
  Nada de banco de dados, nada de formato proprietário, nada de nuvem
  obrigatória. Se um dia você abandonar o tinta, seus textos continuam
  legíveis em qualquer editor do mundo.
- **A sintaxe markdown fica sempre visível, mas estilizada.** Um
  \`# título\` vira um título de verdade, o **negrito** é negrito, o
  *itálico* é itálico — e os marcadores ficam esmaecidos, presentes
  mas discretos. O que você vê é exatamente o que está no arquivo.
- **Uma pasta é a sua biblioteca.** Subpastas são projetos — um livro
  é uma pasta com capítulos. Notas diárias vivem em \`daily/\`.

## primeiros passos

1. Escolha a pasta onde seus textos vão viver (ex.: Documentos/Escrita)
   — clique em **"trocar pasta"**, no rodapé da sidebar à esquerda.
2. Crie uma nota com o botão **+n** da sidebar, ou uma pasta com **+p**.
3. Para anotações do dia, use **⌘J**: cria (ou reabre) a nota de hoje
   em \`daily/2026-07-10.md\`, já com a data por extenso.

Tudo o que você digita é salvo sozinho, um segundo depois da última
tecla. **⌘S** existe para o hábito, não por necessidade.

## o markdown que o tinta entende

# título de capítulo
## seção
### subseção

**negrito** para ênfase forte, *itálico* para a sutil.

- listas com hífen
- para anotações rápidas

> Citações ficam assim — boas para guardar frases que você
> quer reler depois.

\`código ou termos técnicos\` entre crases, e [links](https://exemplo.com)
quando precisar de referências.

## modos de escrita

- **⌘D — modo foco.** Esmaece tudo, menos a sentença (ou o parágrafo)
  em que você está. Aperte de novo para alternar: sentença, parágrafo,
  desligado.
- **⌘T — typewriter.** A linha em que você digita fica fixa no centro
  da tela, como numa máquina de escrever. Seus olhos não descem; o
  texto sobe.
- **⌘\\ — sidebar.** Some com a biblioteca quando ela não é necessária.
- **⌘⇧F — modo zen.** Esconde tudo: sobra a coluna de texto. \`Esc\` sai.
- **⌘E — estilos.** Alterna a aparência do workspace: padrão, máquina de
  escrever (a tela vira folha, com carro, tinta e sons), transparência e
  papel (folhas A4). Na transparência e no papel, todos os atalhos acima
  continuam valendo.
- **⌘⇧I — tinta.** Na máquina de escrever, troca entre preto, azul e
  vermelho. Com um trecho selecionado, recolore só ele. A cor nunca entra
  no arquivo: suas notas seguem sendo texto puro.
- Os quatro se combinam. Zen + foco em sentença + typewriter é o modo
  mais profundo de imersão que o tinta oferece.

## a sua aparência

Abra os ajustes com **⌘,** (ou pelo rodapé da sidebar). Lá você escolhe:

- claro, escuro ou seguir o sistema
- a fonte do editor — *Calling Code* e *iA Writer Duo* (monoespaçadas),
  *EB Garamond* (serifada de livro) ou *Neue Haas* (sem serifa)
- corpo do texto, entrelinha e largura da coluna
- alinhamento à esquerda ou justificado (com hifenização em português)
- a cor de acento — do cursor, das marcações, da barra de meta

## revisar e polir

Escrever é uma coisa; revisar é outra. Para a segunda, o tinta tem:

- **⌘⇧S — realce de sintaxe.** Colore as classes gramaticais:
  substantivos, verbos, adjetivos, advérbios e conjunções, cada uma na
  sua cor. Excesso de advérbios e adjetivos salta aos olhos. Nos
  ajustes dá para filtrar — ligar só advérbios é o modo clássico de
  caçar exageros. Tudo local: o léxico (228 mil formas do português)
  vive dentro do app.
- **Riscar vícios.** Liga nos ajustes: muletas ("basicamente", "na
  verdade"), redundâncias ("subir para cima") e clichês ("a cereja do
  bolo") aparecem riscados — só no editor, o arquivo não muda.
- **Ortografia e autocorreção** são as nativas do macOS, em português,
  e podem ser desligadas nos ajustes.
- **Gramática (opcional).** O LanguageTool sublinha concordância, crase
  e regência, com sugestões clicáveis. Desligado por padrão: quando
  ligado, o texto é enviado ao serviço online — o aviso fica visível
  nos ajustes, e um servidor local é usado se existir.

## metas e estatísticas

Na barra inferior, o tinta conta palavras e caracteres da nota aberta.
Defina uma **meta diária de palavras** nos ajustes e uma barra de
progresso aparece — o saldo do dia soma tudo o que você escreveu, em
qualquer nota, e sobrevive ao fechar do app.

## seus dados estão protegidos

Isto importa mais do que qualquer recurso, então está no fundamento:

- **Gravação atômica.** O arquivo nunca fica pela metade, nem se o
  app travar no meio do salvamento.
- **Snapshots.** Antes da primeira alteração de cada sessão, a versão
  anterior é copiada para \`.snapshots/\` dentro da biblioteca. Fica
  tudo de 24 horas, e uma versão por dia durante 30 dias.
- **Conflitos sem perda.** Se outro programa (iCloud, outro editor)
  mudar o arquivo por fora, o tinta não sobrescreve: sua versão segue
  num arquivo \`.conflict\` ao lado, e nenhuma das duas se perde.
- **Excluir** manda a nota para a Lixeira do macOS — nunca apaga.
- Quer histórico completo? Rode \`git init\` na pasta da biblioteca.
  São arquivos de texto: versionam de graça.

## dicas para escrever um livro

- Uma pasta por livro; um arquivo por capítulo.
- Prefixos numéricos ordenam: \`01-a-chegada.md\`, \`02-o-farol.md\`.
- Capítulos separados mantêm tudo leve — mas se quiser um arquivo só,
  o tinta aguenta um livro inteiro de 200 mil palavras sem engasgar.
- A nota de hoje (**⌘J**) é um bom lugar para aquecer antes do
  capítulo: despejo de ideias, diário de bordo, o que vier.
- O passar do mouse sobre o **⌘** no canto inferior direito mostra
  todos os atalhos, sempre que você esquecer.

---

É isso. Escolha a pasta, abra a nota de hoje, e boa escrita.

*Para reler este guia, clique em "guia" no rodapé da sidebar.*
`;
