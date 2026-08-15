#!/usr/bin/env python3
# newui/component.js + preview-sample.html iskeleti → newui/index.html (gerçek app)
import re, os
d=os.path.dirname(os.path.abspath(__file__))
page=open(os.path.join(d,'preview-sample.html'),encoding='utf-8',errors='replace').read()
comp=open(os.path.join(d,'component.js'),encoding='utf-8',errors='replace').read()
m=re.search(r'(<script type="text/x-dc"[^>]*>)(.*?)(</script>)', page, re.S)
page=page[:m.start(2)]+"\n"+comp+"\n"+page[m.end(2):]
for f in ['three.js','react.js','react-dom.js','dc-runtime.js']:
    page=page.replace(f'src="{f}"', f'src="vendor/{f}"')
open(os.path.join(d,'index.html'),'w').write(page)
print("newui/index.html güncellendi:", len(page))
