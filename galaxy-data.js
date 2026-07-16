window.GALAXY_DATA = {
  "projects": {
    "hacı_takip_sistemi": {
      "name": "Hacı Takip Sistemi",
      "group": "Aktif Geliştirme",
      "status": "active",
      "stage": "UI prototip tamam — Faz 1: backend entegrasyonu",
      "progress": 35,
      "plan": [
        {
          "text": "Login ekranı (TC + parola / e-posta + parola)",
          "done": false
        },
        {
          "text": "Bileklik BLE eşleştirme ekranı",
          "done": false
        },
        {
          "text": "Hacı CRUD ekranları (kafile başkanı)",
          "done": false
        },
        {
          "text": "Ziyaret noktası CRUD",
          "done": false
        },
        {
          "text": "RoleSelectView kaldır — rol sunucudan",
          "done": false
        },
        {
          "text": "Telemetri v1: konum 30sn + nabız 60sn",
          "done": false
        },
        {
          "text": "Geofence alarmları",
          "done": false
        }
      ],
      "notes": "Yol tarifi v1'de yok. Vital mock verisi sadece nabza indirilecek. Kalıcı oturum: ilk girişten sonra login istenmez.",
      "desc": "Hacı ve kafile başkanları için bileklik tabanlı konum + nabız takip sistemi (iOS app + web portal).",
      "links": [
        "PAP/BleBracelet"
      ]
    },
    "SalesManagerAgent": {
      "name": "Sales Manager Agent",
      "group": "Aktif Geliştirme",
      "status": "active",
      "stage": "v1 çalışıyor (Ollama + FastAPI web UI)",
      "progress": 70,
      "plan": [
        {
          "text": "Rapor kalitesini iyileştir",
          "done": false
        },
        {
          "text": "Model seçimini test et (llama3 / mistral)",
          "done": false
        }
      ],
      "notes": "DuckDuckGo araması, API key gerektirmiyor. Web UI: python web_app.py",
      "desc": "Papilon biyometrik ürünleri için web araması yapıp potansiyel müşteri bulan yerel AI satış ajanı."
    },
    "core_sdk_tester_app": {
      "name": "Core SDK Tester",
      "group": "Aktif Geliştirme",
      "status": "active",
      "stage": "v1.0 — havaalanı projesi için şekillendirildi",
      "progress": 80,
      "desc": "Android biyometrik SDK test uygulaması (NFIQ2, yüz doğrulama, parmak izi).",
      "plan": [
        {
          "text": "EncryptedSharedPreferences kullanılıyor",
          "done": true
        },
        {
          "text": "AES-256-GCM şifreleme aktif",
          "done": true
        },
        {
          "text": "MasterKey (Android Keystore) kullanılıyor",
          "done": true
        },
        {
          "text": "Kullanıcı onay sistemi var",
          "done": true
        },
        {
          "text": "Base64 encoding fotoğraflar için",
          "done": true
        },
        {
          "text": "SSL Certificate Pinning (TODO)",
          "done": false
        },
        {
          "text": "ProGuard rules production için (TODO)",
          "done": false
        },
        {
          "text": "Root detection (TODO)",
          "done": false
        }
      ],
      "notes": "flux ile aynı kod tabanı. Son commit: Aralık 2025."
    },
    "flux": {
      "name": "Flux (SDK Tester kopyası)",
      "group": "Arşiv / Dış",
      "status": "paused",
      "stage": "core_sdk_tester_app ile aynı commit",
      "progress": 80,
      "desc": "core_sdk_tester_app'in kopyası — birleştirilebilir.",
      "plan": [
        {
          "text": "core_sdk_tester_app ile birleştir veya sil",
          "done": false
        }
      ],
      "notes": ""
    },
    "Malay": {
      "name": "BiYokla (Malay)",
      "group": "Dokümantasyon",
      "status": "active",
      "stage": "Deployment hazırlığı — SOP ve test planları hazır",
      "progress": 60,
      "plan": [
        {
          "text": "8 günlük deployment planını uygula",
          "done": false,
          "status": "doing"
        },
        {
          "text": "PoC ölçeklenebilirlik testleri",
          "done": false
        }
      ],
      "notes": "WAPIS/CHAD AFIS kabul test planı da bu klasörde.",
      "desc": "Web panel + mobil app + merkezi REST API. Yüz doğrulama, konum, FCM push, Jitsi video. 8 günlük deployment blueprint mevcut.",
      "links": []
    },
    "BEOGS": {
      "name": "BEOGS",
      "group": "Dokümantasyon",
      "status": "paused",
      "stage": "Dokümantasyon tamamlandı",
      "progress": 90,
      "desc": "Topoloji, modüller, veri formatları ve güvenlik dokümanları (md + pdf).",
      "plan": [],
      "notes": ""
    },
    "GIT Flow": {
      "name": "Git Flow Standardı",
      "group": "Dokümantasyon",
      "status": "done",
      "stage": "Tamamlandı",
      "progress": 100,
      "desc": "Şirket içi git branching / deployment standart dokümanı.",
      "plan": [],
      "notes": ""
    },
    "Sunumlar": {
      "name": "Sunumlar",
      "group": "Dokümantasyon",
      "status": "done",
      "stage": "Arşiv",
      "progress": 100,
      "desc": "Ürün ve proje sunumları arşivi (keynote + pptx).",
      "plan": [],
      "notes": ""
    },
    "biyokla docs": {
      "name": "BiYokla Docs",
      "group": "Dokümantasyon",
      "status": "done",
      "stage": "Arşiv",
      "progress": 100,
      "desc": "BiYokla monitoring sunumu.",
      "plan": [],
      "notes": ""
    },
    "flutter": {
      "name": "Flutter Engine (fork)",
      "group": "Arşiv / Dış",
      "status": "archive",
      "stage": "Dış bağımlılık — stable branch",
      "progress": 0,
      "desc": "Flutter engine kaynak kodu (stable).",
      "plan": [],
      "notes": ""
    },
    "PAP/AI-Assistants": {
      "name": "AI Assistants",
      "group": "Müşteri Projeleri",
      "status": "active",
      "stage": "RootsTrack v2 + online interview engine",
      "progress": 50,
      "desc": "RootsTrack AI Assistant (v1, v2) ve online mülakat motoru.",
      "plan": [],
      "notes": ""
    },
    "PAP/Android": {
      "name": "Android (Anadolu Etap)",
      "group": "Müşteri Projeleri",
      "status": "active",
      "stage": "Geliştirme",
      "progress": 50,
      "desc": "Anadolu Etap Android çalışmaları + diğer SDK'lar.",
      "plan": [],
      "notes": ""
    },
    "PAP/BleBracelet": {
      "name": "BLE Bileklik",
      "group": "Aktif Geliştirme",
      "status": "active",
      "stage": "Geliştirme",
      "progress": 40,
      "desc": "BLE bileklik Android uygulaması — Hacı Takip Sistemi ile bağlantılı.",
      "plan": [],
      "notes": ""
    },
    "PAP/CodeReviewEngine": {
      "name": "Code Review Engine",
      "group": "Aktif Geliştirme",
      "status": "active",
      "stage": "Geliştirme — desktop app",
      "progress": 50,
      "desc": "Kod inceleme motoru + masaüstü uygulaması.",
      "plan": [],
      "notes": ""
    },
    "PAP/Etap-MoveDetection_model": {
      "name": "Etap Move Detection",
      "group": "Müşteri Projeleri",
      "status": "paused",
      "stage": "Model / veri seti çalışması",
      "progress": 30,
      "desc": "Hareket tespiti modeli (annotation veri setleri).",
      "plan": [],
      "notes": ""
    },
    "PAP/Jandarma": {
      "name": "Jandarma",
      "group": "Müşteri Projeleri",
      "status": "paused",
      "stage": "Sunum / teklif",
      "progress": 10,
      "desc": "Papilon-Jandarma sunumu.",
      "plan": [],
      "notes": ""
    },
    "PAP/LocalOmniAPI": {
      "name": "Local Omni API",
      "group": "Müşteri Projeleri",
      "status": "paused",
      "stage": "PoC",
      "progress": 40,
      "desc": "Yerel yüz tanıma API'si (Postman koleksiyonu mevcut).",
      "plan": [],
      "notes": ""
    },
    "PAP/Maldives": {
      "name": "Maldives",
      "group": "Müşteri Projeleri",
      "status": "paused",
      "stage": "Keşif",
      "progress": 10,
      "desc": "Maldivler projesi görselleri.",
      "plan": [],
      "notes": ""
    },
    "PAP/Papilon KYC - TurkTrust": {
      "name": "KYC — TurkTrust",
      "group": "Müşteri Projeleri",
      "status": "active",
      "stage": "Test bulguları aşaması",
      "progress": 60,
      "desc": "NFC ile kimlik doğrulama + KYC entegrasyonu.",
      "plan": [],
      "notes": ""
    },
    "PAP/SunExpress": {
      "name": "SunExpress Biometric Pass",
      "group": "Müşteri Projeleri",
      "status": "active",
      "stage": "PoC",
      "progress": 30,
      "desc": "Biyometrik boarding pass PoC.",
      "plan": [
        {
          "text": "Todo4POC.txt'deki maddeler",
          "done": false
        }
      ],
      "notes": ""
    },
    "PAP/TürkTelekom": {
      "name": "Türk Telekom Lisans",
      "group": "Müşteri Projeleri",
      "status": "paused",
      "stage": "Lisans mekanizması V4 dokümanı",
      "progress": 50,
      "desc": "Papilon-TT lisans mekanizması.",
      "plan": [],
      "notes": ""
    },
    "PAP/fingerprint": {
      "name": "Fingerprint API",
      "group": "Müşteri Projeleri",
      "status": "paused",
      "stage": "API çalışması",
      "progress": 30,
      "desc": "Parmak izi API'si.",
      "plan": [],
      "notes": ""
    },
    "PAP/omnicustom": {
      "name": "Omni Custom",
      "group": "Müşteri Projeleri",
      "status": "active",
      "stage": "Rehber dokümanlar hazır",
      "progress": 50,
      "desc": "Omni özelleştirme — genel + teknik rehber mevcut.",
      "plan": [],
      "notes": ""
    },
    "PAP/omnicustom copy": {
      "name": "Omni Custom (kopya)",
      "group": "Arşiv / Dış",
      "status": "archive",
      "stage": "Kopya — silinebilir",
      "progress": 0,
      "desc": "",
      "plan": [],
      "notes": ""
    },
    "PAP/old anadolu": {
      "name": "Old Anadolu",
      "group": "Arşiv / Dış",
      "status": "archive",
      "stage": "Eski çalışma",
      "progress": 0,
      "desc": "Eski Anadolu Etap model çalışmaları.",
      "plan": [],
      "notes": ""
    },
    "PAP/Extras": {
      "name": "Extras",
      "group": "Arşiv / Dış",
      "status": "archive",
      "stage": "Karışık notlar",
      "progress": 0,
      "desc": "SDK readme'leri, Enqura notları, Anadolu Etap fonksiyonları.",
      "plan": [],
      "notes": ""
    },
    "PAP/tacirler": {
      "name": "Tacirler KYC",
      "group": "Müşteri Projeleri",
      "status": "paused",
      "stage": "Kapsam dokümanı",
      "progress": 20,
      "desc": "Tacirler / Hotels KYC kapsamı.",
      "plan": [],
      "notes": ""
    },
    "FY/LinguMonster": {
      "name": "LinguMonster",
      "group": "Kişisel Ürünler",
      "status": "active",
      "stage": "Android + iOS + Web geliştirme",
      "progress": 55,
      "plan": [
        {
          "text": "LinguMonster_Tasklar.md içindeki görevleri işle",
          "done": true
        }
      ],
      "notes": "",
      "desc": "Dil öğrenme oyunu — Android, iOS ve Web istemcileri, görev listeleri ve teknik dokümanlar."
    },
    "FY/Persona-FY": {
      "name": "Persona-FY",
      "group": "Kişisel Ürünler",
      "status": "active",
      "stage": "Modül geliştirme",
      "progress": 40,
      "desc": "Kişisel asistan platformu: Bilgi Deposu (flashcard/spaced-repetition), Rutin & Sağlık, Finans, Dashboard. Backend + frontend + iOS.",
      "plan": [],
      "notes": ""
    },
    "FY/YOUTUBE": {
      "name": "LoL YouTube Otomasyonu",
      "group": "Kişisel Ürünler",
      "status": "active",
      "stage": "Pipeline çalışıyor — masaüstü panel var",
      "progress": 75,
      "desc": "LoL şampiyonları için AI hikaye + seslendirme + görsel + video montaj + YouTube yükleme. Telegram bildirimleri dahil.",
      "plan": [],
      "notes": "run_app.command ile açılıyor."
    },
    "FY/Forsico": {
      "name": "Forsico",
      "group": "Serbest İşler",
      "status": "paused",
      "stage": "Subscription API + dashboard",
      "progress": 50,
      "desc": "Abonelik API ve yönetim paneli.",
      "plan": [],
      "notes": ""
    },
    "FY/PapilonKYC": {
      "name": "Papilon KYC (Android)",
      "group": "Serbest İşler",
      "status": "paused",
      "stage": "Android app + proje dokümanı",
      "progress": 60,
      "desc": "KYC Android uygulaması, proje dokümanı md+pdf.",
      "plan": [],
      "notes": ""
    },
    "FY/english": {
      "name": "YDS Ekosistemi",
      "group": "Öğrenme",
      "status": "paused",
      "stage": "android + ios + api + extension",
      "progress": 40,
      "desc": "YDS hazırlık: mobil uygulamalar, API ve tarayıcı eklentisi.",
      "plan": [],
      "notes": ""
    },
    "FY/open_english": {
      "name": "Open English",
      "group": "Öğrenme",
      "status": "done",
      "stage": "Materyal arşivi",
      "progress": 100,
      "desc": "İngilizce ders PDF materyalleri.",
      "plan": [],
      "notes": ""
    },
    "FY/software-practice": {
      "name": "Software Practice",
      "group": "Öğrenme",
      "status": "active",
      "stage": "Python pratikleri",
      "progress": 30,
      "desc": "Trie, decorator, generator, descriptor protokolü vb. çalışmalar + AI denemeleri.",
      "plan": [],
      "notes": ""
    },
    "FY/test_flutter_app": {
      "name": "Test Flutter App",
      "group": "Deneme",
      "status": "archive",
      "stage": "Deneme projesi",
      "progress": 10,
      "desc": "",
      "plan": [],
      "notes": ""
    }
  },
  "universes": [
    {
      "id": "is",
      "name": "İş Evreni",
      "subtitle": "PAPILON",
      "root": "..",
      "prefix": "",
      "expandDirs": [
        "PAP"
      ]
    },
    {
      "id": "kisisel",
      "name": "Kişisel Evren",
      "subtitle": "FY",
      "root": "/Users/furkanyildiz/Desktop/FY",
      "prefix": "FY",
      "expandDirs": []
    }
  ],
  "agents": [
    {
      "id": "cto",
      "name": "ATLAS",
      "role": "CTO",
      "prompt": "Sen ATLAS'sın — Furkan'ın kişisel CTO'su. Onun tüm yazılım projelerini izliyorsun. Görevin: durumu net, dürüst ve yönetici bakışıyla raporlamak. Rapor formatın: (1) Yönetici özeti 2-3 cümle, (2) Dikkat gerektiren projeler ve nedenleri, (3) Riskler / tıkanıklıklar, (4) Somut sonraki adımlar (en fazla 5 madde, öncelik sırasıyla). Gereksiz övgü yapma, sorunları açıkça söyle. Kısa ve öz yaz.",
      "color": "#61dcff"
    },
    {
      "id": "navigator",
      "name": "NAVIGATOR",
      "role": "PM",
      "color": "#ffc861",
      "prompt": "Sen NAVIGATOR'sın — Furkan'ın proje yöneticisi (PM). Görevin: plan maddelerini ve taahhütleri takip etmek, hesap sormak. Odakların: (1) Bekleyen plan maddeleri — hangileri uzun süredir duruyor, hangi projede birikme var, (2) Uzun süredir dokunulmamış AKTİF projeler — bunları açıkça 'ihmal edilmiş' olarak işaretle, (3) Sıradaki somut adım — her aktif proje için TEK sonraki adımı söyle. Format: kısa standup tarzı; proje başına en fazla 2 satır. Nazik ama takipçi ol; 'geçen hafta da bekliyordu' gibi hatırlatmalar yap. Türkçe yaz."
    },
    {
      "id": "documentor",
      "name": "DOCUMENTOR",
      "role": "DOKÜMAN",
      "color": "#55e88b",
      "write": true,
      "prompt": "Sen DOCUMENTOR'sın — Furkan'ın dokümantasyon uzmanı. Görevin: projelerin dokümantasyon sağlığını yönetmek. Yapabildiklerin: (1) README'si olmayan veya zayıf projeleri tespit edip önceliklendirmek, (2) İstenirse bir projenin koduna/dosyalarına bakıp README taslağı YAZMAK — dosya oluşturma yetkin var, README.md dosyasını doğrudan projenin köküne yazabilirsin (var olanı bozma, yoksa oluştur; varsa önce mevcut içeriği koru ve genişlet), (3) Teknik doküman eksiklerini listelemek. README yazarken format: proje adı, ne yaptığı, kurulum, kullanım, mimari kısa özeti. Türkçe yaz."
    },
    {
      "id": "forge",
      "name": "FORGE",
      "role": "KOD KALİTE",
      "color": "#ff8fc0",
      "prompt": "Sen FORGE'sun — Furkan'ın kod kalitesi mühendisi. Görevin: proje kodlarını inceleyip teknik borç ve iyileştirme raporu vermek. Bir proje adı verilirse o projenin klasörüne gir, kod yapısına bak (dosya organizasyonu, tekrar eden kod, eski bağımlılıklar, tehlikeli desenler) ve şunları raporla: (1) Genel sağlık notu 1-10, (2) En kritik 3 teknik borç, (3) Hızlı kazanımlar (1 saatten kısa işler), (4) Birleştirme/silme fırsatları (ör. kopya klasörler). Proje verilmezse tüm evrene bak ve en riskli 3 projeyi seç. Kod okuyabilirsin ama dosya DEĞİŞTİRME. Türkçe yaz."
    },
    {
      "id": "mentor",
      "name": "MENTOR",
      "role": "KOÇ",
      "color": "#c77bff",
      "prompt": "Sen MENTOR'sun — Furkan'ın kişisel gelişim koçu. Kişisel Evren'deki (FY/ önekli) öğrenme projelerini izliyorsun: LinguMonster (dil öğrenme ürünü), YDS Ekosistemi, Open English, Software Practice ve Persona-FY. Görevin: (1) Öğrenme projelerindeki ilerlemeyi değerlendirmek, (2) Uzun süredir çalışılmamış alanları nazikçe hatırlatmak, (3) Haftalık küçük ve gerçekçi hedefler önermek (günde 20-30 dk'lık), (4) Kişisel ürün projelerinde (LinguMonster, Persona-FY) momentum tavsiyesi vermek. Ton: destekleyici, motive edici ama gerçekçi. Türkçe yaz."
    }
  ],
  "log": [
    {
      "ts": "2026-07-16T19:48:33.710Z",
      "text": "[ODAK] Hacı Takip Sistemi — 1 dk",
      "projectId": "hacı_takip_sistemi",
      "applied": true
    },
    {
      "ts": "2026-07-16T08:24:32.870Z",
      "text": "[ODAK] Code Review Engine — 1 dk",
      "projectId": "PAP/CodeReviewEngine",
      "applied": true
    }
  ]
};