import type { ToolContentMap } from "./types";

const PRIVATE_FAQ = {
  q: "Dosyam bir sunucuya yükleniyor mu?",
  a: "Hayır. Bu araç tamamen tarayıcınızda çalışır; dosyanız cihazınızdan çıkmaz. İnternet bağlantınız kopsa bile sayfa açıkken işlem tamamlanır.",
};

const SERVER_FAQ = {
  q: "Dosyam güvende mi?",
  a: "Dosyanız şifreli bağlantıyla (HTTPS) sunucumuza gönderilir, yalnızca bu işlem için kullanılır ve iş bittikten sonra, en geç bir saat içinde otomatik olarak silinir.",
};

export const trTools: ToolContentMap = {
  merge: {
    name: "PDF Birleştir",
    short: "Birden fazla PDF'i istediğiniz sırayla tek dosyada birleştirin.",
    metaTitle: "PDF Birleştir – Ücretsiz Online PDF Birleştirme",
    metaDescription:
      "PDF dosyalarını saniyeler içinde ücretsiz birleştirin. Sürükleyerek sıralayın, tek tıkla tek PDF yapın. Dosyalarınız yüklenmez, işlem tarayıcınızda yapılır.",
    h1: "PDF Birleştir",
    lead: "Birden fazla PDF dosyasını istediğiniz sırayla tek bir PDF'te birleştirin. Üyelik yok, filigran yok, dosyanız cihazınızdan çıkmaz.",
    steps: [
      "Birleştirmek istediğiniz PDF dosyalarını seçin veya sürükleyip bırakın.",
      "Dosyaları sürükleyerek istediğiniz sıraya getirin.",
      "“Başlat”a tıklayın ve birleştirilmiş PDF'i indirin.",
    ],
    faq: [
      {
        q: "Kaç PDF dosyasını birleştirebilirim?",
        a: "Belirli bir sınır yoktur. Sınırı yalnızca cihazınızın belleği belirler; yüzlerce sayfalık dosyaları rahatlıkla birleştirebilirsiniz.",
      },
      {
        q: "Birleştirme sırasında kalite düşer mi?",
        a: "Hayır. Sayfalar olduğu gibi kopyalanır; metin, görsel ve bağlantılar korunur.",
      },
      PRIVATE_FAQ,
    ],
    keywords: ["birleştir", "birleştirme", "pdf birleştirme", "merge", "tek pdf", "pdfleri birleştir"],
  },
  split: {
    name: "PDF Böl",
    short: "PDF'i sayfa aralıklarına veya tek tek sayfalara ayırın.",
    metaTitle: "PDF Böl – PDF Sayfalarını Ayırma Aracı",
    metaDescription:
      "PDF dosyasını sayfa aralıklarına veya her sayfayı ayrı dosya olacak şekilde ücretsiz bölün. Hızlı, güvenli ve üyeliksiz; dosyanız tarayıcınızda işlenir.",
    h1: "PDF Böl",
    lead: "Bir PDF'i belirlediğiniz sayfa aralıklarına göre birden fazla dosyaya ayırın ya da her sayfayı ayrı bir PDF olarak kaydedin.",
    steps: [
      "Bölmek istediğiniz PDF dosyasını seçin.",
      "Sayfa aralıklarını yazın (ör. 1-3, 4-8) veya “her sayfayı ayır” seçeneğini işaretleyin.",
      "“Başlat”a tıklayın ve parçaları tek tek ya da ZIP olarak indirin.",
    ],
    faq: [
      {
        q: "Sayfa aralığını nasıl yazmalıyım?",
        a: "Aralıkları virgülle ayırın. Örneğin “1-3, 5, 7-10” yazarsanız üç ayrı PDF oluşturulur.",
      },
      PRIVATE_FAQ,
    ],
    keywords: ["böl", "ayır", "bölme", "split", "sayfaları ayır", "parçala"],
  },
  "remove-pages": {
    name: "Sayfa Sil",
    short: "PDF'ten istemediğiniz sayfaları kaldırın.",
    metaTitle: "PDF Sayfa Silme – PDF'ten Sayfa Kaldır",
    metaDescription:
      "PDF'ten istemediğiniz sayfaları önizleyerek seçin ve silin. Ücretsiz, üyeliksiz; dosyanız yüklenmeden tarayıcınızda işlenir.",
    h1: "PDF'ten Sayfa Sil",
    lead: "Sayfa önizlemelerine tıklayarak silmek istediğiniz sayfaları seçin ve temiz bir PDF indirin.",
    steps: [
      "PDF dosyanızı seçin; sayfalar küçük resim olarak görüntülenir.",
      "Silmek istediğiniz sayfalara tıklayın ya da sayfa numaralarını yazın.",
      "“Başlat”a tıklayın ve yeni PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["sayfa sil", "sayfa kaldır", "delete pages", "remove pages", "sil"],
  },
  "extract-pages": {
    name: "Sayfa Çıkar",
    short: "Seçtiğiniz sayfalarla yeni bir PDF oluşturun.",
    metaTitle: "PDF Sayfa Çıkarma – Seçili Sayfaları Yeni PDF Yap",
    metaDescription:
      "PDF'ten istediğiniz sayfaları seçip ayrı bir PDF olarak kaydedin. Ücretsiz ve güvenli; işlem tarayıcınızda yapılır.",
    h1: "PDF'ten Sayfa Çıkar",
    lead: "Yalnızca ihtiyacınız olan sayfaları seçin ve bunlardan yeni bir PDF oluşturun.",
    steps: [
      "PDF dosyanızı seçin.",
      "Almak istediğiniz sayfalara tıklayın veya sayfa numaralarını yazın.",
      "“Başlat”a tıklayın ve yeni PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["sayfa çıkar", "sayfa al", "extract", "seçili sayfalar"],
  },
  organize: {
    name: "Sayfaları Düzenle",
    short: "Sayfaları sürükleyerek sıralayın, döndürün veya silin.",
    metaTitle: "PDF Sayfa Düzenleme – Sırala, Döndür, Sil",
    metaDescription:
      "PDF sayfalarını küçük resimler üzerinde sürükleyerek yeniden sıralayın, döndürün veya silin. Ücretsiz, üyeliksiz ve tamamen tarayıcıda.",
    h1: "PDF Sayfalarını Düzenle",
    lead: "Tüm sayfaları tek ekranda görün; sürükleyip bırakarak sıralayın, tek tıkla döndürün veya silin.",
    steps: [
      "PDF dosyanızı seçin; tüm sayfalar küçük resim olarak açılır.",
      "Sayfaları sürükleyerek sıralayın, döndürme ve silme düğmelerini kullanın.",
      "“Başlat”a tıklayın ve düzenlenmiş PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["sırala", "sayfa sırası", "organize", "düzenle", "sayfa taşı", "reorder"],
  },
  rotate: {
    name: "PDF Döndür",
    short: "Sayfaları 90°, 180° veya 270° döndürün.",
    metaTitle: "PDF Döndür – PDF Sayfalarını Döndürme",
    metaDescription:
      "Yan veya ters duran PDF sayfalarını tek tıkla döndürün ve kalıcı olarak kaydedin. Ücretsiz; dosyanız tarayıcınızda işlenir.",
    h1: "PDF Döndür",
    lead: "Tüm sayfaları ya da yalnızca seçtiğiniz sayfaları döndürün ve kalıcı olarak kaydedin.",
    steps: [
      "Döndürmek istediğiniz PDF dosyalarını seçin.",
      "Döndürme yönünü ve açısını seçin.",
      "“Başlat”a tıklayın ve döndürülmüş PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["döndür", "çevir", "yan sayfa", "rotate", "ters"],
  },
  compress: {
    name: "PDF Sıkıştır",
    short: "Görünür kaliteyi koruyarak dosya boyutunu küçültün.",
    metaTitle: "PDF Sıkıştır – PDF Boyutu Küçültme",
    metaDescription:
      "PDF dosya boyutunu kaliteden ödün vermeden küçültün. E-posta ve e-Devlet yüklemeleri için ideal. Ücretsiz, üyeliksiz, dosyalar işlemden sonra silinir.",
    h1: "PDF Sıkıştır",
    lead: "PDF dosyanızın boyutunu küçültün; e-posta, e-Devlet ve başvuru sistemlerinin boyut sınırlarına kolayca uyun.",
    steps: [
      "Sıkıştırmak istediğiniz PDF dosyalarını seçin.",
      "Sıkıştırma seviyesini seçin: önerilen, güçlü veya düşük.",
      "“Başlat”a tıklayın ve küçültülmüş PDF'i indirin.",
    ],
    faq: [
      {
        q: "Ne kadar küçülür?",
        a: "Dosyanın içeriğine bağlıdır. Taranmış belgeler ve fotoğraflı PDF'ler genellikle %50–90 oranında küçülür; yalnızca metin içeren dosyalarda kazanç daha azdır.",
      },
      {
        q: "Hangi seviyeyi seçmeliyim?",
        a: "Çoğu durumda “önerilen” seviye kalite ile boyut arasında en iyi dengeyi sağlar. Çok katı bir boyut sınırınız varsa “güçlü” seviyeyi deneyin.",
      },
      SERVER_FAQ,
    ],
    keywords: ["sıkıştır", "küçült", "boyut", "compress", "mb düşür", "pdf küçültme"],
  },
  repair: {
    name: "PDF Onar",
    short: "Açılmayan veya bozuk PDF dosyalarını kurtarın.",
    metaTitle: "PDF Onar – Bozuk PDF Dosyası Kurtarma",
    metaDescription:
      "Açılmayan, hata veren veya bozulmuş PDF dosyalarını ücretsiz onarmayı deneyin. Dosyanız işlemden sonra otomatik silinir.",
    h1: "PDF Onar",
    lead: "Bozuk yapıyı yeniden oluşturarak açılmayan veya hata veren PDF dosyalarını kurtarmayı deneyin.",
    steps: [
      "Onarmak istediğiniz PDF dosyasını seçin.",
      "“Başlat”a tıklayın; dosyanın yapısı yeniden oluşturulur.",
      "Onarılmış PDF'i indirin.",
    ],
    faq: [
      {
        q: "Her dosya onarılabilir mi?",
        a: "Hayır. Dosyanın içeriği tamamen kaybolmuşsa kurtarılamaz; ancak bozuk tablo ve yapı hatalarının büyük bölümü düzeltilebilir.",
      },
      SERVER_FAQ,
    ],
    keywords: ["onar", "bozuk", "açılmıyor", "repair", "kurtar", "hatalı pdf"],
  },
  ocr: {
    name: "OCR – Metin Tanıma",
    short: "Taranmış PDF ve görsellerdeki yazıları seçilebilir metne çevirin.",
    metaTitle: "PDF OCR – Taranmış PDF'i Metne Çevirme (Türkçe)",
    metaDescription:
      "Taranmış PDF ve fotoğraflardaki yazıları Türkçe karakter desteğiyle aranabilir, kopyalanabilir metne çevirin. Ultra OCR ile tablo ve düzen korunur.",
    h1: "PDF OCR – Metin Tanıma",
    lead: "Taranmış belgeleri aranabilir PDF'e, düz metne veya Word'e dönüştürün. Türkçe karakterler (ç, ğ, ı, ö, ş, ü) tam desteklenir.",
    steps: [
      "Taranmış PDF'i veya görseli seçin.",
      "Belgenin dilini ve OCR modunu seçin: Hızlı veya Ultra.",
      "“Başlat”a tıklayın; işlem bitince aranabilir PDF'i veya metni indirin.",
    ],
    faq: [
      {
        q: "Hızlı ve Ultra OCR arasındaki fark nedir?",
        a: "Hızlı OCR klasik metin tanıma ile aranabilir PDF üretir. Ultra OCR yapay zekâ tabanlı bir görsel dil modeli kullanır; tabloları, başlıkları ve sayfa düzenini daha iyi korur ve Word çıktısı verir.",
      },
      {
        q: "El yazısını tanır mı?",
        a: "Hızlı OCR basılı metin için tasarlanmıştır. Okunaklı el yazısında Ultra OCR daha iyi sonuç verir ancak hatasız sonuç garanti edilemez.",
      },
      SERVER_FAQ,
    ],
    keywords: ["ocr", "metin tanıma", "taranmış", "tarama", "yazıya çevir", "resimden yazı", "aranabilir"],
  },
  "jpg-to-pdf": {
    name: "JPG'den PDF'e",
    short: "JPG, PNG ve WebP görsellerini PDF'e dönüştürün.",
    metaTitle: "JPG'yi PDF'e Çevir – Resimden PDF Oluşturma",
    metaDescription:
      "JPG, PNG ve WebP görsellerini tek bir PDF'te birleştirin. Sayfa boyutu ve kenar boşluğunu seçin. Ücretsiz; görselleriniz yüklenmez.",
    h1: "JPG'yi PDF'e Çevir",
    lead: "Fotoğraflarınızı ve görsellerinizi istediğiniz sırayla tek bir PDF dosyasına dönüştürün.",
    steps: [
      "JPG, PNG veya WebP görsellerinizi seçin.",
      "Sırayı, sayfa boyutunu ve kenar boşluğunu ayarlayın.",
      "“Başlat”a tıklayın ve PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["jpg", "png", "resim", "fotoğraf", "görsel", "image to pdf", "resmi pdf yap"],
  },
  "word-to-pdf": {
    name: "Word'den PDF'e",
    short: "DOC ve DOCX belgelerini PDF'e dönüştürün.",
    metaTitle: "Word'ü PDF'e Çevir – DOCX'ten PDF'e Dönüştürme",
    metaDescription:
      "Word (DOC, DOCX, ODT) belgelerinizi biçimlendirmesini koruyarak ücretsiz PDF'e dönüştürün. Üyeliksiz; dosyalar işlemden sonra silinir.",
    h1: "Word'ü PDF'e Çevir",
    lead: "Word belgelerinizi yazı tipi, tablo ve görselleriyle birlikte PDF'e dönüştürün.",
    steps: [
      "Word dosyalarınızı (DOC, DOCX, ODT, RTF) seçin.",
      "“Başlat”a tıklayın.",
      "Dönüştürülen PDF dosyasını indirin.",
    ],
    faq: [SERVER_FAQ],
    keywords: ["word", "docx", "doc", "office", "belge"],
  },
  "excel-to-pdf": {
    name: "Excel'den PDF'e",
    short: "XLS ve XLSX tablolarını PDF'e dönüştürün.",
    metaTitle: "Excel'i PDF'e Çevir – XLSX'ten PDF'e Dönüştürme",
    metaDescription:
      "Excel (XLS, XLSX, ODS, CSV) tablolarınızı ücretsiz PDF'e dönüştürün. Üyeliksiz; dosyalar işlemden sonra silinir.",
    h1: "Excel'i PDF'e Çevir",
    lead: "Excel tablolarınızı paylaşması ve yazdırması kolay PDF dosyalarına dönüştürün.",
    steps: ["Excel dosyalarınızı seçin.", "“Başlat”a tıklayın.", "Dönüştürülen PDF dosyasını indirin."],
    faq: [SERVER_FAQ],
    keywords: ["excel", "xlsx", "xls", "tablo", "csv"],
  },
  "powerpoint-to-pdf": {
    name: "PowerPoint'ten PDF'e",
    short: "PPT ve PPTX sunumlarını PDF'e dönüştürün.",
    metaTitle: "PowerPoint'i PDF'e Çevir – PPTX'ten PDF'e Dönüştürme",
    metaDescription:
      "PowerPoint (PPT, PPTX, ODP) sunumlarınızı ücretsiz PDF'e dönüştürün. Üyeliksiz; dosyalar işlemden sonra silinir.",
    h1: "PowerPoint'i PDF'e Çevir",
    lead: "Sunumlarınızı her cihazda aynı görünen PDF dosyalarına dönüştürün.",
    steps: ["PowerPoint dosyalarınızı seçin.", "“Başlat”a tıklayın.", "Dönüştürülen PDF dosyasını indirin."],
    faq: [SERVER_FAQ],
    keywords: ["powerpoint", "pptx", "ppt", "sunum", "slayt"],
  },
  "pdf-to-jpg": {
    name: "PDF'ten JPG'ye",
    short: "PDF sayfalarını yüksek kaliteli JPG veya PNG görsellere çevirin.",
    metaTitle: "PDF'i JPG'ye Çevir – PDF'ten Resim Oluşturma",
    metaDescription:
      "PDF sayfalarını yüksek çözünürlüklü JPG veya PNG görsellere dönüştürün. Ücretsiz; dosyanız yüklenmeden tarayıcınızda işlenir.",
    h1: "PDF'i JPG'ye Çevir",
    lead: "Her PDF sayfasını seçtiğiniz çözünürlükte ayrı bir görsel olarak kaydedin.",
    steps: [
      "PDF dosyanızı seçin.",
      "Görsel biçimini (JPG/PNG) ve kaliteyi seçin.",
      "“Başlat”a tıklayın ve görselleri tek tek ya da ZIP olarak indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["jpg", "png", "resim", "görsel", "pdf to image", "resme çevir"],
  },
  "pdf-to-word": {
    name: "PDF'ten Word'e",
    short: "PDF'i düzenlenebilir Word (DOCX) belgesine dönüştürün.",
    metaTitle: "PDF'i Word'e Çevir – PDF'ten DOCX'e Dönüştürme",
    metaDescription:
      "PDF dosyalarınızı düzenlenebilir Word (DOCX) belgesine ücretsiz dönüştürün. Taranmış belgeler için OCR aracını kullanın.",
    h1: "PDF'i Word'e Çevir",
    lead: "PDF'inizi Microsoft Word'de düzenleyebileceğiniz bir DOCX belgesine dönüştürün.",
    steps: ["PDF dosyanızı seçin.", "“Başlat”a tıklayın.", "Oluşturulan DOCX dosyasını indirin."],
    faq: [
      {
        q: "Taranmış PDF'i Word'e çevirebilir miyim?",
        a: "Taranmış belgelerde metin görsel olarak durduğu için önce OCR gerekir. Bunun için OCR aracındaki Ultra modu Word çıktısı verir.",
      },
      SERVER_FAQ,
    ],
    keywords: ["word", "docx", "düzenlenebilir", "pdf to word", "doc"],
  },
  "pdf-to-pdfa": {
    name: "PDF'ten PDF/A'ya",
    short: "Uzun süreli arşivleme için PDF/A standardına dönüştürün.",
    metaTitle: "PDF'i PDF/A'ya Çevir – Arşiv Formatına Dönüştürme",
    metaDescription:
      "PDF dosyalarınızı UYAP, KEP ve e-arşiv sistemlerinin istediği PDF/A standardına ücretsiz dönüştürün.",
    h1: "PDF'i PDF/A'ya Çevir",
    lead: "Belgelerinizi uzun süreli arşivleme standardı olan PDF/A'ya dönüştürün; resmi kurumların istediği biçimde saklayın.",
    steps: [
      "PDF dosyanızı seçin.",
      "PDF/A sürümünü seçin (önerilen: PDF/A-2b).",
      "“Başlat”a tıklayın ve dosyayı indirin.",
    ],
    faq: [
      {
        q: "PDF/A nedir?",
        a: "PDF/A, belgenin yıllar sonra da aynı görünmesini sağlamak için yazı tiplerini ve renk bilgilerini dosyanın içine gömen ISO standardıdır.",
      },
      SERVER_FAQ,
    ],
    keywords: ["pdf/a", "pdfa", "arşiv", "uyap", "kep", "e-arşiv"],
  },
  "page-numbers": {
    name: "Sayfa Numarası Ekle",
    short: "PDF sayfalarına konumunu seçerek numara ekleyin.",
    metaTitle: "PDF'e Sayfa Numarası Ekle – Ücretsiz",
    metaDescription:
      "PDF'inize istediğiniz konumda, yazı tipinde ve biçimde (1, 1/10, Sayfa 1) sayfa numarası ekleyin. Ücretsiz; dosyanız tarayıcınızda işlenir.",
    h1: "PDF'e Sayfa Numarası Ekle",
    lead: "Sayfa numaralarının konumunu, biçimini ve başlangıç sayısını seçin.",
    steps: [
      "PDF dosyanızı seçin.",
      "Konum, biçim ve başlangıç numarasını belirleyin.",
      "“Başlat”a tıklayın ve numaralanmış PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["sayfa numarası", "numaralandır", "page numbers", "numara ekle"],
  },
  watermark: {
    name: "Filigran Ekle",
    short: "PDF'e metin veya görsel filigran ekleyin.",
    metaTitle: "PDF'e Filigran Ekle – Metin ve Logo Filigranı",
    metaDescription:
      "PDF sayfalarına metin veya logo filigranı ekleyin; saydamlığı, açıyı ve konumu ayarlayın. Ücretsiz; dosyanız tarayıcınızda işlenir.",
    h1: "PDF'e Filigran Ekle",
    lead: "Belgelerinizi “GİZLİDİR”, “TASLAK” gibi metinlerle veya logonuzla işaretleyin.",
    steps: [
      "PDF dosyanızı seçin.",
      "Filigran metnini yazın veya görsel yükleyin; saydamlık, boyut ve açıyı ayarlayın.",
      "“Başlat”a tıklayın ve filigranlı PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["filigran", "watermark", "logo", "damga", "gizli", "taslak"],
  },
  crop: {
    name: "PDF Kırp",
    short: "Sayfa kenar boşluklarını kırpın.",
    metaTitle: "PDF Kırp – PDF Kenar Boşluklarını Kesme",
    metaDescription:
      "PDF sayfalarının kenarlarını milimetre hassasiyetinde kırpın. Ücretsiz; dosyanız tarayıcınızda işlenir.",
    h1: "PDF Kırp",
    lead: "Gereksiz kenar boşluklarını kaldırın veya sayfanın yalnızca bir bölümünü bırakın.",
    steps: [
      "PDF dosyanızı seçin.",
      "Üst, alt, sol ve sağdan kırpılacak miktarı belirleyin.",
      "“Başlat”a tıklayın ve kırpılmış PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["kırp", "kes", "kenar", "crop", "boşluk"],
  },
  sign: {
    name: "PDF İmzala",
    short: "İmzanızı çizin, yazın veya yükleyip PDF'e yerleştirin.",
    metaTitle: "PDF İmzala – Online PDF'e İmza Ekleme",
    metaDescription:
      "İmzanızı fare veya parmağınızla çizin, yazın ya da görsel olarak yükleyin ve PDF'e yerleştirin. Ücretsiz; dosyanız yüklenmez.",
    h1: "PDF İmzala",
    lead: "İmzanızı oluşturun ve belgenin istediğiniz yerine sürükleyerek yerleştirin.",
    steps: [
      "PDF dosyanızı seçin.",
      "İmzanızı çizin, yazın veya görsel olarak yükleyin.",
      "İmzayı sayfada konumlandırın, “Başlat”a tıklayın ve imzalı PDF'i indirin.",
    ],
    faq: [
      {
        q: "Bu imza e-imza yerine geçer mi?",
        a: "Hayır. Bu araç imzanızın görüntüsünü belgeye ekler. 5070 sayılı Kanun kapsamındaki güvenli elektronik imza için nitelikli bir e-imza sertifikası gerekir.",
      },
      PRIVATE_FAQ,
    ],
    keywords: ["imza", "imzala", "sign", "paraf"],
  },
  metadata: {
    name: "PDF Bilgilerini Düzenle",
    short: "Başlık, yazar, konu ve anahtar kelimeleri değiştirin.",
    metaTitle: "PDF Meta Veri Düzenleme – Başlık ve Yazar Değiştir",
    metaDescription:
      "PDF dosyasının başlık, yazar, konu, anahtar kelime ve oluşturucu bilgilerini görüntüleyin ve düzenleyin. Ücretsiz; tarayıcınızda.",
    h1: "PDF Bilgilerini Düzenle",
    lead: "PDF'in belge özelliklerini (başlık, yazar, konu, anahtar kelimeler) görüntüleyin ve değiştirin.",
    steps: [
      "PDF dosyanızı seçin.",
      "Mevcut bilgileri görün ve düzenleyin.",
      "“Başlat”a tıklayın ve güncellenmiş PDF'i indirin.",
    ],
    faq: [PRIVATE_FAQ],
    keywords: ["meta", "metadata", "yazar", "başlık", "özellikler"],
  },
  protect: {
    name: "PDF Şifrele",
    short: "PDF'e açma şifresi koyun.",
    metaTitle: "PDF Şifreleme – PDF'e Şifre Koyma",
    metaDescription:
      "PDF dosyanıza AES-256 ile güçlü bir açma şifresi ekleyin; yazdırma ve kopyalamayı kısıtlayın. Ücretsiz; dosyalar işlemden sonra silinir.",
    h1: "PDF'e Şifre Koy",
    lead: "PDF'inizi AES-256 şifreleme ile koruyun; yalnızca şifreyi bilenler açabilsin.",
    steps: [
      "PDF dosyanızı seçin.",
      "Şifreyi iki kez yazın; isterseniz yazdırma ve kopyalama izinlerini kısıtlayın.",
      "“Başlat”a tıklayın ve şifreli PDF'i indirin.",
    ],
    faq: [
      {
        q: "Şifremi unutursam ne olur?",
        a: "Şifreyi saklamıyoruz ve kurtaramayız. Şifrenizi güvenli bir yerde not etmenizi öneririz.",
      },
      SERVER_FAQ,
    ],
    keywords: ["şifre", "şifrele", "parola", "koru", "protect", "kilitle"],
  },
  unlock: {
    name: "PDF Şifre Kaldır",
    short: "Şifresini bildiğiniz PDF'ten korumayı kaldırın.",
    metaTitle: "PDF Şifre Kaldırma – PDF Kilidini Açma",
    metaDescription:
      "Şifresini bildiğiniz PDF dosyasından açma şifresini ve kısıtlamaları kaldırın. Ücretsiz; dosyalar işlemden sonra silinir.",
    h1: "PDF Şifresini Kaldır",
    lead: "Şifresini bildiğiniz bir PDF'ten korumayı kaldırarak her seferinde şifre girme zahmetinden kurtulun.",
    steps: ["PDF dosyanızı seçin.", "Mevcut şifreyi girin.", "“Başlat”a tıklayın ve şifresiz PDF'i indirin."],
    faq: [
      {
        q: "Şifresini bilmediğim bir PDF'i açabilir miyim?",
        a: "Hayır. Bu araç yalnızca şifresini bildiğiniz dosyalar içindir; şifre kırma işlemi yapmaz.",
      },
      SERVER_FAQ,
    ],
    keywords: ["şifre kaldır", "kilit aç", "unlock", "parola kaldır", "şifresiz"],
  },
};
