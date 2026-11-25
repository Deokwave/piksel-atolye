# piksel-atolye

Deokwave'in GitHub sayfalarındaki piksel görselleri bu araçla çiziyoruz: banner'lar, butonlar, başlıklar, teknoloji panelleri, depo başlıkları ve organizasyon avatarı. Hepsi kodla, piksel piksel çiziliyor. Sitenin, oynatıcının ya da uygulamaların koduyla bir ilgisi yok.

`banner/build.mjs` içinde gece denizi, ay, Fuji, hareketli dalgalar, D logosunun piksel hali ve Türkçe karakterleri de olan 5x7 bir piksel yazı tipi var.

```
node banner/build.mjs cikti
```

## Çıktılar

Komutu çalıştırınca verdiğin klasörün içinde şunlar oluşuyor:

- `org/`: organizasyon sayfasının banner'ı, butonları, başlıkları, teknoloji kartları ve paneli, alt bilgisi
- `personal/`: profil sayfasının banner'ı, başlıkları, butonları ve teknoloji paneli
- `repos/`: her tanıtım deposunun başlık görseli
- `org-avatar.ppm`: organizasyon avatarının 64x64 hali; PNG'ye çevirmek için `magick cikti/org-avatar.ppm -filter point -resize 800% avatar.png`

## Diğer piksel araçlarımız

- [piksel-avatar](https://github.com/Deokwave/piksel-avatar): profil avatarını çizen Python betiği
- [piksel-yazi](https://github.com/Deokwave/piksel-yazi): piksel yazı tipinin TypeScript hali
- [piksel-rozet](https://github.com/Deokwave/piksel-rozet): PHP ile piksel rozet
- [piksel-sprite](https://github.com/Deokwave/piksel-sprite): metinden SVG'ye sprite çevirici (Dart)
- [piksel-terminal](https://github.com/Deokwave/piksel-terminal): piksel yazıyı terminale basan Rust aracı
- [piksel-tema](https://github.com/Deokwave/piksel-tema): piksel arayüzün CSS hali
- [piksel-onizleme](https://github.com/Deokwave/piksel-onizleme): bütün görselleri tek sayfada gösteren önizleme

© 2026 Deokwave. Tüm hakları saklıdır.
