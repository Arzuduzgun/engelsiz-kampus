# Engelsiz Rota — Erişilebilir Kampüs Navigasyon Sistemi

Kastamonu Üniversitesi kampüsü içerisindeki fakülte, idari birim ve ring durakları arasında fiziksel engeli bulunan bireyler için **rampa ve asansör erişimine uygun en kısa rotayı** hesaplayan tam yığın (Full-Stack) web uygulaması[cite: 2, 14].

## Temel Özellikler

* **Modifiye Dijkstra Rota Algoritması:** Standart en kısa yol hesabından farklı olarak, `Engelsiz Rota` modu aktif edildiğinde merdivenli veya erişilemez (`is_accessible = false`) kenarların maliyeti `Infinity` olarak atanır ve yalnızca erişilebilir güzergahlar seçilir[cite: 10].
* **Sesli Yönlendirme (Web Speech API):** Görme engelli kullanıcılar için hesaplanan güzergah adım adım Türkçe (`tr-TR`) olarak seslendirilir[cite: 3].
* **3 Tıklama Kuralı & Yüksek Kontrastlı Arayüz:** Başlangıç seçimi, varış seçimi ve rota oluşturma adımlarıyla karmaşıklıktan uzak kullanıcı deneyimi sunar[cite: 3].
* **Kampüs Rehberi:** 24 kampüs noktası arasında anlık arama, kategori filtreleme (Fakülte/Birim ve Otobüs Durakları) ve bina erişilebilirlik detayları[cite: 14].
* **Yönetici Paneli:** Şifre korumalı arayüz üzerinden iki nokta arasına yeni yol, mesafe ve erişilebilirlik bilgisi tanımlama[cite: 3, 14].
* **DoS Koruması (Rate Limiting):** STRIDE ve DREAD risk analizleri doğrultusunda `@nestjs/throttler` ile saniye bazlı istek sınırlaması uygulanmıştır[cite: 10].

## Teknoloji Yığını

| Katman | Teknoloji |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Bootstrap 5, Bootstrap Icons |
| **Backend** | NestJS, TypeScript, `@nestjs/throttler`[cite: 10, 11] |
| **Veritabanı** | PostgreSQL (Supabase)[cite: 11] |
| **Test & Kalite** | Jest (Birim Testleri)[cite: 11] |
| **DevOps** | Docker & Docker Compose[cite: 11] |

## Kurulum ve Çalıştırma

### 1. Ortam Değişkenleri
`engelsiz-backend/.env` dosyasını oluşturun:
```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_secret_key
