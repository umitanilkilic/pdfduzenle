export const tr = {
  meta: {
    homeTitle: "PDF Düzenle – Ücretsiz Online PDF Araçları",
    homeDescription:
      "PDF birleştirme, bölme, sıkıştırma, döndürme, Word'e ve JPG'ye çevirme, OCR ve daha fazlası. Ücretsiz, üyeliksiz ve güvenli; çoğu işlem dosyanız cihazınızdan çıkmadan tarayıcıda yapılır.",
    titleSuffix: "PDF Düzenle",
  },
  nav: {
    allTools: "Tüm araçlar",
    menu: "Menü",
    close: "Kapat",
    theme: "Temayı değiştir",
    language: "Dil",
    history: "Son işlemler",
    skipToContent: "İçeriğe geç",
  },
  home: {
    eyebrow: "Ücretsiz · Üyeliksiz · Güvenli",
    heroTitle: "PDF dosyalarınızla ihtiyacınız olan her şey",
    heroSubtitle:
      "Birleştirin, bölün, sıkıştırın, dönüştürün, imzalayın. Çoğu işlem dosyanız hiçbir sunucuya yüklenmeden doğrudan tarayıcınızda yapılır.",
    searchPlaceholder: "Araç ara… (ör. birleştir, sıkıştır, word)",
    searchEmpty: "Aramanızla eşleşen araç bulunamadı.",
    toolsTitle: "Tüm PDF araçları",
    trustTitle: "Neden PDF Düzenle?",
    trust: [
      {
        title: "Dosyalarınız cihazınızda kalır",
        text: "Birleştirme, bölme, döndürme gibi işlemler tarayıcınızda çalışır; dosyanız internete çıkmaz.",
      },
      {
        title: "Sunucuda işlenenler hemen silinir",
        text: "Sıkıştırma, dönüştürme ve OCR gibi işlemlerde dosyalar şifreli bağlantıyla gönderilir ve iş bitince silinir.",
      },
      {
        title: "Ücretsiz ve üyeliksiz",
        text: "Kayıt, e-posta veya kredi kartı istemeyiz. Filigran eklemeyiz.",
      },
      {
        title: "Araçları zincirleyin",
        text: "Bir aracın sonucunu tek tıkla bir sonraki araca aktarın: birleştir, sonra sıkıştır, sonra şifrele.",
      },
    ],
    faqTitle: "Sık sorulan sorular",
    faq: [
      {
        q: "PDF Düzenle gerçekten ücretsiz mi?",
        a: "Evet. Tüm araçlar ücretsizdir, üyelik gerektirmez ve çıktı dosyalarına filigran eklenmez.",
      },
      {
        q: "Dosyalarım güvende mi?",
        a: "Tarayıcıda çalışan araçlarda dosyanız cihazınızdan hiç çıkmaz. Sunucu gerektiren araçlarda dosyalar HTTPS ile iletilir, yalnızca işlem için kullanılır ve en geç bir saat içinde otomatik olarak silinir.",
      },
      {
        q: "Telefonda kullanabilir miyim?",
        a: "Evet. Site mobil cihazlara uyumludur; Android ve iPhone tarayıcılarında uygulama kurmadan kullanabilirsiniz.",
      },
      {
        q: "Dosya boyutu sınırı var mı?",
        a: "Sunucuda işlenen dosyalar için sınır 100 MB'tır. Tarayıcıda çalışan araçlarda sınır cihazınızın belleğine bağlıdır.",
      },
    ],
  },
  categories: {
    organize: { name: "Düzenle", description: "Sayfaları birleştirin, bölün, silin ve sıralayın." },
    optimize: { name: "İyileştir", description: "Boyutu küçültün, bozuk dosyaları onarın, metin tanıyın." },
    convertTo: { name: "PDF'e dönüştür", description: "Görsel ve Office belgelerini PDF yapın." },
    convertFrom: { name: "PDF'ten dönüştür", description: "PDF'i görsele, Word'e veya PDF/A'ya çevirin." },
    edit: { name: "Düzenleme", description: "Numara, filigran, imza ekleyin; kırpın." },
    security: { name: "Güvenlik", description: "PDF'e şifre koyun veya şifreyi kaldırın." },
  },
  tool: {
    home: "Ana sayfa",
    runsInBrowser: "Tarayıcıda çalışır – dosyanız yüklenmez",
    runsOnServer: "Güvenli sunucuda işlenir – iş bitince silinir",
    stepsTitle: "Nasıl yapılır?",
    faqTitle: "Sık sorulan sorular",
    relatedTitle: "Diğer araçlar",
    comingSoon: "Bu araç çok yakında burada olacak.",
  },
  dropzone: {
    choose: "Dosya seç",
    chooseMany: "Dosyaları seç",
    orDrop: "veya dosyaları buraya sürükleyip bırakın",
    addMore: "Dosya ekle",
    remove: "Kaldır",
    wrongType: "Bu dosya türü desteklenmiyor",
  },
  process: {
    start: "Başlat",
    working: "İşleniyor…",
    uploading: "Yükleniyor…",
    queued: "Sırada bekliyor…",
    done: "Hazır!",
    download: "İndir",
    downloadAll: "Tümünü indir (ZIP)",
    startOver: "Baştan başla",
    continueWith: "Başka bir araçla devam et",
    error: "Bir hata oluştu",
    retry: "Tekrar dene",
    pages: "sayfa",
    files: "dosya",
    savedPercent: "{percent} daha küçük",
  },
  history: {
    title: "Son işlemler",
    empty: "Henüz işlem yok. İşlediğiniz dosyalar 24 saat boyunca yalnızca bu cihazda saklanır.",
    clear: "Geçmişi temizle",
    use: "Başka araçta kullan",
  },
  footer: {
    tagline: "Türkçe, ücretsiz ve güvenli online PDF araçları.",
    tools: "Araçlar",
    about: "Proje",
    rights: "Tüm hakları saklıdır.",
  },
  notFound: {
    title: "Sayfa bulunamadı",
    text: "Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.",
    back: "Ana sayfaya dön",
  },
};

export type Dictionary = typeof tr;
