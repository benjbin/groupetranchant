#!/bin/zsh
# vérifie la syntaxe, reconstruit, lance le contrôle des contacts (W H)
D=/private/tmp/claude-501/-Users-mac-jb-Desktop-CLIENTS-Groupe-Tranchant-groupe-tranchant/fce1a243-086c-4171-8997-6f178713ce0f/scratchpad/variantes
cp $D/croupier/scene.js $D/sc.mjs && node --check $D/sc.mjs || exit 1; rm $D/sc.mjs
(cd $D/croupier && node tools/build.mjs | tail -1)
node $D/../cap.mjs $D/x.png ${1:-1440} ${2:-900} "http://127.0.0.1:8781/?verif" "try { $(cat $D/check.js) } catch (e) { console.error('X ' + e.stack) }" 2>&1 | tail -3
