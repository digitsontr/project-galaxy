#!/usr/bin/env python3
# newui/parts/*.js (sırayla) + preview-sample.html iskeleti → newui/index.html (gerçek app)
# Faz 5: eski tek-dosya component.js, class Component'in metinsel dilimleri olan
# parts/00..80 dosyalarına bölündü. Birleşim eski dosyayla bayt-bayt aynıdır;
# düzenleme artık ilgili dilimde yapılır, component.js diye bir dosya yok.
import re, os
d=os.path.dirname(os.path.abspath(__file__))
page=open(os.path.join(d,'preview-sample.html'),encoding='utf-8',errors='replace').read()
pdir=os.path.join(d,'parts')
comp=''.join(open(os.path.join(pdir,f),encoding='utf-8',errors='replace').read()
             for f in sorted(os.listdir(pdir)) if f.endswith('.js'))
m=re.search(r'(<script type="text/x-dc"[^>]*>)(.*?)(</script>)', page, re.S)
page=page[:m.start(2)]+"\n"+comp+"\n"+page[m.end(2):]
for f in ['three.js','react.js','react-dom.js','dc-runtime.js']:
    page=page.replace(f'src="{f}"', f'src="vendor/{f}"')
open(os.path.join(d,'index.html'),'w',encoding='utf-8').write(page)
print("newui/index.html güncellendi:", len(page))
