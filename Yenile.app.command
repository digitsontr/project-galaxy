#!/bin/bash
# Çift tıkla: arayüzü derle ve Project Galaxy.app’e kopyala (tam paketleme değil).
cd "$(dirname "$0")"
bash scripts/refresh-app.sh
read -r -p "Enter ile kapat…" _ || true
