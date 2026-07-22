# Léxico de classes gramaticais — atribuição

O artefato `public/lexicon/pt-br.lex.gz` é derivado do **MorphoBr**
(https://github.com/LR-POR/MorphoBr), um léxico morfológico do português
brasileiro de Leonel F. de Alencar e Alexandre Rademaker, distribuído sob
licença **Apache-2.0**.

A poda por frequência usa a lista pt_br do projeto **FrequencyWords**
(https://github.com/hermitdave/FrequencyWords), derivada do corpus
OpenSubtitles 2018 (CC-BY-SA-4.0 — usada apenas como critério de corte no
build; nenhum conteúdo da lista é redistribuído no artefato).

Pipeline de geração: `scripts/build-pos-lexicon.mjs`.
