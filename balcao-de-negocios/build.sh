#!/bin/sh
# Gera a build de arquivo único (a que vai para o Artifact) a partir dos arquivos separados.
# Uso: sh build.sh
set -e
cd "$(dirname "$0")"
OUT=../balcao-de-negocios.html

{
  echo '<title>Balcão de Negócios</title>'
  grep -E '^<link rel="(preconnect|stylesheet)" href="https://fonts' index.html
  echo '<style>'
  cat styles.css
  echo '</style>'
  # corpo da página, sem as tags de wrapper e sem os <script src>
  sed -n '/^<body>$/,/^<\/body>$/p' index.html | sed '1d;$d' | grep -v '^<script src='
  echo '<script>'
  for f in data/i18n.js data/names.js data/premier.js data/bundesliga.js data/laliga.js data/seriea.js \
           data/ligue1.js data/brasileirao.js data/belgica.js data/portugal.js game.js; do
    cat "$f"
    echo
  done
  echo '</script>'
} > "$OUT"

echo "build gerada: $OUT ($(wc -l < "$OUT") linhas)"
