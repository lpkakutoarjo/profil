/* FILE: interaktif.js (UPDATED V3.0 - FULL DATA)
    DESKRIPSI: Menangani koneksi ke Spreadsheet, Routing Halaman, dan Render Data (Termasuk Kunjungan, Pengaduan)
*/
// Tambahkan disable: 'mobile' jika ingin mematikan di HP, 
// tapi jika tetap ingin aktif, gunakan pengaturan ini:
AOS.init({ 
    once: true, 
    duration: 800, 
    offset: 50, // Perkecil offset agar tidak 'terpotong' di layar kecil
    disableMutationObserver: false,
});

// --- PERBAIKAN OVERFLOW & LAYOUT ---
window.addEventListener('load', () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        setTimeout(() => {
            loader.style.display = 'none';
            AOS.refresh();
        }, 500);
    }
});
// --- KONFIGURASI API UTAMA ---
const API_URL = 'https://script.google.com/macros/s/AKfycbxyeYGEIJ3MHytVXioIdgYXBJOvsWhinjRsVR4nbnczX0NxveaADMI-DaXhg6sUjfyo/exec'; 

// Cache Key (Ubah versi ini jika struktur data berubah agar browser mereload data baru)
const CACHE_KEY = 'lpka_data_cache_v14_full_read'; 

const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
let globalData = {};

// --- SET TANGGAL DI HEADER ---
const dateEl = document.getElementById('current-date');
if(dateEl) dateEl.innerText = new Date().toLocaleDateString('id-ID', dateOptions);

// --- FITUR BACK TO TOP ---
window.onscroll = function() {
    const btnTop = document.getElementById("btnBackToTop");
    if(btnTop) {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) btnTop.classList.add("show");
        else btnTop.classList.remove("show");
    }
};

// --- HELPER LOADING SCREEN ---
function hideLoader() {
    const loader = document.getElementById('loader-wrapper');
    if(loader) {
        loader.classList.add('loader-hidden');
        loader.addEventListener('transitionend', function() { 
            loader.style.display = 'none'; 
            document.body.classList.remove('loading'); 

            // --- TAMBAHKAN KODE DI BAWAH INI ---
            // 1. Paksa browser menghitung ulang layout
            window.dispatchEvent(new Event('resize'));
            
            // 2. Refresh AOS agar animasi muncul tepat waktu
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }

            // 3. Trik Scroll Otomatis (Memaksa render ulang di mobile)
            setTimeout(() => {
                window.scrollTo(0, 1);
                window.scrollTo(0, 0);
            }, 100);
        });
    }
}

// ==========================================
// 1. FUNGSI UTAMA LOAD DATA (SMART LIVE UPDATE)
// ==========================================
async function loadData() {
    // Jangan tampilkan loader full screen jika sudah ada cache (agar terasa cepat)
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    const isCacheAvailable = !!cachedData;

    if (!isCacheAvailable) {
        document.body.classList.add('loading'); // Tampilkan loader hanya jika tidak ada cache sama sekali
    }

    // --- LANGKAH 1: RENDER DATA LAMA DULU (INSTANT LOAD) ---
    if (isCacheAvailable) {
        console.log("⚡ Menampilkan data dari Cache (Instan)...");
        globalData = JSON.parse(cachedData);
        renderByPage(globalData); // Render tampilan langsung
        if(typeof AOS !== 'undefined') setTimeout(() => AOS.refresh(), 100);
        hideLoader(); // Sembunyikan loader segera
    }

    // --- LANGKAH 2: CEK DATA BARU DI BACKGROUND (AJAX/FETCH) ---
    try {
        console.log("🔄 Mengecek pembaruan data dari Server...");
        
        // Tambahkan timestamp (?t=...) agar browser tidak menyimpan cache HTTP request
        const response = await fetch(API_URL + '?t=' + new Date().getTime());
        const newData = await response.json();

        if (newData.status === 'error') {
            console.warn("Peringatan API:", newData.message);
            return;
        }

        // --- LANGKAH 3: BANDINGKAN & UPDATE JIKA ADA PERUBAHAN ---
        const currentDataStr = JSON.stringify(globalData);
        const newDataStr = JSON.stringify(newData);

        if (currentDataStr !== newDataStr) {
            console.log("✨ Data baru ditemukan! Memperbarui tampilan...");
            globalData = newData;
            
            // Simpan data baru ke cache
            sessionStorage.setItem(CACHE_KEY, newDataStr);
            
            // Render ulang tampilan dengan data baru
            renderByPage(globalData);
            
            // Refresh animasi karena konten berubah
            if(typeof AOS !== 'undefined') setTimeout(() => AOS.refresh(), 500);
            
            // Opsional: Anda bisa menambahkan notifikasi toast disini
            // showToast("Data berhasil diperbarui!");
        } else {
            console.log("✅ Data sudah paling update.");
        }

    } catch (error) {
        console.error("Gagal mengambil data baru (menggunakan data offline):", error);
        // Jika fetch gagal tapi tidak ada cache, baru hapus session
        if (!isCacheAvailable) sessionStorage.removeItem(CACHE_KEY);
    } finally {
        hideLoader();
    }
}

// ==========================================
// HELPER: RENDER BERDASARKAN HALAMAN
// ==========================================
function renderByPage(data) {
    // Setup Data Global
    setupSearchListener();
    const infoPublikData = data.infoPublik || data.infopublik || [];
    if (infoPublikData.length > 0) setupInfoPublikMenu(infoPublikData);

    // Render Elemen Sidebar (Selalu muncul jika elemen ada)
    if (document.getElementById('pejabat-container')) renderPejabat(data.pejabat);
    if (document.getElementById('sidebar-video-container')) renderVideoSidebar(data.video);

    // Deteksi Halaman Aktif
    const mainEl = document.querySelector('main');
    const pageId = mainEl ? mainEl.getAttribute('data-page') : 'home';

    // Routing Render
    switch (pageId) {
        case 'home':
            renderBanner(data.banner);
            renderBerita(data.berita);
            break;
        case 'pencarian':
            performSearch(data);
            break;
        case 'sejarah':
            renderSejarah(data.sejarah);
            break;
        case 'pejabat':
            renderPejabatFull(data.pejabat);
            break;
        case 'visimisi':
            renderVisiMisi(data.visimisi);
            break;
        case 'tupoksi':
            renderTupoksi(data.tupoksi);
            break;
        case 'struktur':
            renderStruktur(data.struktur);
            break;
        case 'infopublik':
            renderInfoPublik(infoPublikData);
            break;
        case 'berita':
            renderBeritaFull(data.berita);
            break;
        case 'bacaselengkapnya':
            renderDetailBerita(data.berita);
            break;
        case 'reintegrasi':
            renderReintegrasi(data.reintegrasi);
            break;
        case 'pkbm':
            renderPKBM(data.pkbm || data.PKBM);
            break;
        case 'klinik':
            renderKlinik(data.klinik || data.Klinik);
            break;
        case 'kunjungan':
        case 'hukum':
        case 'pengaduan':
        case 'layanan':
            const specificData = data[pageId] || data[pageId.toLowerCase()];
            if (pageId !== 'layanan') renderLayananSpesifik(pageId, specificData);
            break;
    }
}

// ==========================================
// 2. RENDER LAYANAN SPESIFIK (KUNJUNGAN, PENGADUAN)
// ==========================================

function renderLayananSpesifik(type, data) {
    const container = document.getElementById('service-content-area');
    if (!container) return;
    
    let contentHtml = '';
    
    /**
     * Helper: Format List - Memastikan SEMUA baris terbaca
     * Menangani split multi-platform (\n, \r\n) dan membersihkan karakter sampah.
     */
    const formatToList = (text, bulletColorClass = 'text-primary') => {
        if (!text || text.toString().trim() === "") {
            return '<div class="text-center py-2 text-muted fst-italic">-</div>';
        }

        // Split berdasarkan baris baru dan bersihkan spasi kosong
        const lines = text.toString()
            .split(/\r?\n/) 
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) return '<div class="text-center py-2 text-muted fst-italic">-</div>';

        let listHtml = '<ul class="list-unstyled mb-0 w-100">';
        lines.forEach(line => {
            // Bersihkan simbol list seperti -, *, • atau angka (1., 2.) di awal teks
            let cleanLine = line.replace(/^[-*•\d\.]+\s*/, '').trim();
            
            listHtml += `
                <li class="d-flex align-items-start mb-3">
                    <i class="fas fa-check-circle ${bulletColorClass} mt-1 me-3 flex-shrink-0" style="font-size: 1.1rem;"></i>
                    <div class="text-dark" style="font-size: 1.1rem; line-height: 1.5; text-align: left;">
                        ${cleanLine}
                    </div>
                </li>`;
        });
        listHtml += '</ul>';
        return listHtml;
    };

    /**
     * Helper: Format Text untuk deskripsi biasa
     */
    const formatText = (text) => {
        if (!text) return '-';
        return text.toString().replace(/\r?\n/g, '<br>');
    };

    // --- LOGIC RENDER KUNJUNGAN ---
    if (type === 'kunjungan') {
        if (!data) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h5>Data kunjungan belum tersedia.</h5></div>';
            return;
        }

        // Header Judul
        contentHtml = `
        <div class="col-12 text-center mb-5" data-aos="fade-down">
        </div>`;

        // ROW 1: JADWAL + SOP (VERSI OPTIMAL & SIMETRIS)
contentHtml += `
<div class="row g-4 mb-5 justify-content-center">
    <div class="col-lg-11" data-aos="fade-up">
        <div class="card border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="card-body p-0">
                <div class="row g-0">
                    
                    <div class="col-lg-8 p-4 p-lg-5">
                        <div class="d-flex align-items-center mb-4">
                            <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-3 me-3">
                                <i class="fas fa-calendar-check fa-2x"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold text-dark mb-0">Jadwal Pelayanan Kunjungan</h4>
                                <small class="text-muted text-uppercase tracking-wider">Waktu Berkunjung</small>
                            </div>
                        </div>

                        <div class="p-4 rounded-4 bg-light border-start border-primary border-4">
                            ${formatToList(data.jadwal, 'text-primary fw-bold')}
                        </div>
                    </div>

                    <div class="col-lg-4 bg-light border-start d-flex align-items-center">
                        <div class="p-4 p-lg-5 w-100">
                            <div class="text-center text-lg-start mb-4">
                                <h5 class="fw-bold mb-1">Dokumen SOP</h5>
                                <p class="small text-muted">Pelajari tata cara dan regulasi kunjungan resmi kami.</p>
                            </div>

<a href="javascript:void(0);" 
onclick="openDocPreview('Standar Operasional Prosedur', '${(data.url_sop || '').replace(/'/g, "\\'")}')" 
   class="btn btn-white border shadow-sm w-100 p-3 rounded-4 hover-lift transition-all">
    <div class="d-flex align-items-center text-start">
        <div class="bg-warning text-dark rounded-3 p-3 me-3">
            <i class="fas fa-file-pdf fa-lg"></i>
        </div>
        <div class="overflow-hidden">
            <div class="fw-bold text-dark text-truncate">Lihat Prosedur</div>
            <small class="text-muted d-block">Klik untuk Pratinjau</small>
        </div>
    </div>
</a>

                            <div class="mt-4 pt-3 border-top d-none d-lg-block">
                                <div class="d-flex align-items-center text-muted">
                                    <i class="fas fa-info-circle me-2"></i>
                                    <small>Patuhi protokol kesehatan selama berkunjung.</small>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
</div>`;

        // ROW 2: TIGA KOLOM (HIMBAUAN, SYARAT, CATATAN)
        contentHtml += `
        <div class="row g-4">
            <div class="col-md-4" data-aos="fade-up" data-aos-delay="100">
                <div class="card h-100 border-0 shadow-sm rounded-4 bg-white">
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-exclamation-triangle text-danger me-2"></i>
                            <h6 class="fw-bold m-0 text-dark">HIMBAUAN</h6>
                        </div>
                        <div class="small text-secondary">
                            ${data.himbauan ? formatToList(data.himbauan, 'text-danger') : '-'}
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4" data-aos="fade-up" data-aos-delay="200">
                <div class="card h-100 border-0 shadow-sm rounded-4 bg-white">
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-id-card text-success me-2"></i>
                            <h6 class="fw-bold m-0 text-dark">SYARAT</h6>
                        </div>
                        <div class="small text-secondary">
                            ${data.syarat ? formatToList(data.syarat, 'text-success') : '-'}
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4" data-aos="fade-up" data-aos-delay="300">
                <div class="card h-100 border-0 shadow-sm rounded-4 bg-white">
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-info-circle text-warning me-2"></i>
                            <h6 class="fw-bold m-0 text-dark">CATATAN</h6>
                        </div>
                        <div class="small text-secondary">
                            ${data.catatan ? formatToList(data.catatan, 'text-warning') : '-'}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        container.innerHTML = contentHtml;

    // --- LOGIC RENDER PENGADUAN ---
    } else if (type === 'pengaduan') {
        let kontakWA = (data && (data.nomorWA || data.kontak)) || "6281575859295";
        let emailTujuan = "lpakutoarjo@gmail.com";
        let judul = (data && data.judul) || 'Layanan Pengaduan';
        let deskripsi = (data && data.deskripsi) || 'Sampaikan pengaduan atau aspirasi Anda melalui kanal resmi kami.';

        container.innerHTML = `
            <div class="col-lg-10 mx-auto">
                <div class="text-center mb-5">
                    <h2 class="fw-bold text-dark">${judul}</h2>
                    <p class="text-muted">${formatText(deskripsi)}</p>
                </div>
                <div class="row g-4 justify-content-center">
                    <div class="col-md-6">
                        <div class="card h-100 p-4 shadow-sm border-0 rounded-4 text-center hover-scale">
                            <div class="text-success mb-3">
                                <i class="fab fa-whatsapp fa-4x"></i>
                            </div>
                            <h4 class="fw-bold">WhatsApp Admin</h4>
                            <p class="small text-muted mb-4">Respon cepat melalui chat WhatsApp pada jam kerja.</p>
                            <div class="mt-auto">
                                <a href="https://wa.me/${kontakWA}" target="_blank" class="btn btn-success rounded-pill px-4 fw-bold w-100 py-2">
                                    <i class="fab fa-whatsapp me-2"></i> Chat Sekarang
                                </a>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card h-100 p-4 shadow-sm border-0 rounded-4 text-center hover-scale">
                            <div class="text-primary mb-3">
                                <i class="fas fa-envelope fa-4x"></i>
                            </div>
                            <h4 class="fw-bold">Email Resmi</h4>
                            <p class="small text-muted mb-4">Kirimkan pengaduan formal melalui surat elektronik.</p>
                            <div class="mt-auto">
                                <a href="mailto:${emailTujuan}" class="btn btn-primary rounded-pill px-4 fw-bold w-100 py-2">
                                    <i class="fas fa-paper-plane me-2"></i> Kirim Email
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
}


function renderReintegrasi(list) {
    const serviceContainer = document.getElementById('service-content-area');
    const regContainer = document.getElementById('registration-container');
    
    if (!serviceContainer) return;
    serviceContainer.innerHTML = '';
    if(regContainer) regContainer.innerHTML = '';

    if (!list || list.length === 0) {
        serviceContainer.innerHTML = '<div class="col-12 text-center py-5"><h5 class="text-muted">Data layanan reintegrasi belum tersedia.</h5></div>';
        return;
    }

    // --- RENDER PENDAFTARAN ONLINE ---
    const firstItem = list[0];
    let rawLink = firstItem.link_form || firstItem.Link_Form || firstItem.link || "";
    let cleanLink = rawLink.toString().trim();
    const hasLink = (cleanLink.length > 0 && cleanLink !== "#");
    let btnHref = hasLink ? cleanLink : "javascript:void(0);";
    let btnTarget = hasLink ? 'target="_blank"' : '';
    let btnOnClick = hasLink ? '' : 'onclick="showDevPopup(); return false;"';

    if (regContainer) {
        regContainer.innerHTML = `
        <div class="col-lg-10 mx-auto mb-4">
            <div class="card bg-primary text-white border-0 shadow-lg rounded-4 overflow-hidden position-relative">
                <div class="card-body p-4 text-center position-relative" style="z-index:1;">
                    <h3 class="fw-bold mb-3"><i class="fas fa-laptop-file me-2"></i> Pendaftaran Online Terpadu</h3>
                    <a href="${btnHref}" ${btnTarget} ${btnOnClick} class="btn btn-warning btn-lg fw-bold rounded-pill px-5 shadow pulse-anim">
                        <i class="fas fa-paper-plane me-2"></i> ISI FORMULIR PENDAFTARAN
                    </a>
                </div>
            </div>
        </div>`;
    }

    // --- RENDER LAYANAN ---
    
    // 1. CARD ATAS (Ukuran Diperkecil & Tengah)
    const topItem = list[0];
    let topImg = topItem.link_gambar || topItem.Link_Gambar || topItem.gambar || "";
    let topImgUrl = topImg ? fixGoogleDriveImage(topImg) : "https://via.placeholder.com/800x400";
    let topJudul = topItem.judul || topItem.Judul || "Layanan Utama";

    let html = `
    <div class="col-lg-8 mx-auto mb-5" data-aos="fade-up">
        <div class="text-center mb-4">
            <h3 class="fw-bold text-dark">${topJudul}</h3>
            <div style="width: 50px; height: 3px; background: #0d6efd; margin: 8px auto;"></div>
        </div>
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
            <div style="width: 100%; height: 350px; overflow: hidden; background: #fff; padding: 15px;">
                <img src="${topImgUrl}" 
                     style="width: 100%; height: 100%; object-fit: contain; cursor: zoom-in;" 
                     onclick="showImagePreview('${topImgUrl}', '${topJudul.replace(/'/g, "\\'")}')"
                     alt="${topJudul}">
            </div>
        </div>
    </div>

    <div class="col-12 mb-4">
        <h5 class="fw-bold text-secondary"><i class="fas fa-th-large me-2"></i> Alur Layanan Lainnya</h5>
        <hr>
    </div>

    <div class="row w-100 m-0 p-0">`;

    // 2. CARD BAWAH (4 Baris Sisa)
    const remainingItems = list.slice(1, 5); 
    
    remainingItems.forEach((item, idx) => {
        let judul = item.judul || item.Judul || "Layanan";
        let deskripsi = item.deskripsi || item.Deskripsi || "";
        let rawImg = item.link_gambar || item.Link_Gambar || item.gambar || "";
        let imgUrl = rawImg ? fixGoogleDriveImage(rawImg) : "https://via.placeholder.com/400x300";
        let safeJudul = judul.replace(/'/g, "\\'"); 

        html += `
        <div class="col-md-6 col-lg-3 mb-4" data-aos="fade-up" data-aos-delay="${idx * 100}">
            <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                <div style="height: 160px; overflow: hidden; background: #fff; border-bottom: 1px solid #f0f0f0; padding: 10px;">
                    <img src="${imgUrl}" 
                         style="width: 100%; height: 100%; object-fit: contain; cursor: zoom-in;" 
                         onclick="showImagePreview('${imgUrl}', '${safeJudul}')"
                         alt="${judul}">
                </div>
                <div class="card-body p-3 text-center">
                    <h6 class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">${judul}</h6>
                    <p class="text-muted mb-0" style="font-size: 0.7rem;">${deskripsi}</p>
                </div>
            </div>
        </div>`;
    });

    html += `</div>`;
    serviceContainer.innerHTML = html;
}

// ==========================================
// 4. MODAL & PREVIEW FUNCTIONS
// ==========================================
function showDevPopup() {
    const modalEl = document.getElementById('devPopupModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        new bootstrap.Modal(modalEl).show();
    } else {
        alert("Mohon maaf, layanan sedang dalam tahap pengembangan.");
    }
}

function showImagePreview(url, title) {
    const modalEl = document.getElementById('imagePreviewModal');
    const imgEl = document.getElementById('previewImageTarget');
    const titleEl = document.getElementById('previewImageTitle');
    
    if (modalEl && imgEl) {
        imgEl.src = url;
        if(titleEl) titleEl.innerText = title;
        if (typeof bootstrap !== 'undefined') {
            new bootstrap.Modal(modalEl).show();
        } else {
            window.open(url, '_blank');
        }
    }
}

// ==========================================
// 5. RENDER FUNCTIONS INFO PUBLIK (MODEL ACCORDION CARD)
// ==========================================
function renderInfoPublik(list) {
    const container = document.getElementById('infopublik-container');
    if (!container) return;

    // 1. Cek parameter kategori di URL
    const urlParams = new URLSearchParams(window.location.search);
    const kategoriFilter = urlParams.get('kategori');

    // 2. Filter data jika ada parameter kategori
    let dataToRender = list;
    if (kategoriFilter) {
        dataToRender = list.filter(item => 
            (item.kategori || item.Kategori || "").toLowerCase() === kategoriFilter.toLowerCase()
        );
    }

    // 3. Validasi data kosong
    if (!dataToRender || dataToRender.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5">
            <h5 class="text-muted">Data dokumen ${kategoriFilter ? `kategori "${kategoriFilter}" ` : ''}belum tersedia.</h5>
            ${kategoriFilter ? '<a href="infopublik.html" class="btn btn-primary btn-sm mt-3">Lihat Semua Dokumen</a>' : ''}
        </div>`;
        return;
    }

    // 4. Grouping Data (Gunakan dataToRender)
    const groupedData = dataToRender.reduce((acc, item) => {
        const cat = item.kategori || item.Kategori || "Lainnya";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    // 5. Generate HTML Accordion
    let html = '<div class="col-12"><div class="accordion" id="accInfoPublik">';
    let index = 0;

    for (const [category, items] of Object.entries(groupedData)) {
        // Logika: Jika difilter, otomatis buka (show). Jika tidak, hanya buka yang pertama (index === 0).
        const isExpanded = kategoriFilter ? 'true' : (index === 0 ? 'true' : 'false');
        const showClass = kategoriFilter ? 'show' : (index === 0 ? 'show' : '');
        const btnCollapsed = kategoriFilter ? '' : (index === 0 ? '' : 'collapsed');

        html += `
        <div class="accordion-item border-0 shadow-sm mb-4 rounded overflow-hidden">
            <h2 class="accordion-header" id="heading${index}">
                <button class="accordion-button ${btnCollapsed} fw-bold text-primary bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="${isExpanded}">
                    <i class="fas fa-folder-open me-2"></i> ${category.toUpperCase()} 
                    <span class="badge bg-primary ms-2 rounded-pill">${items.length} Dokumen</span>
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse ${showClass}" data-bs-parent="#accInfoPublik">
                <div class="accordion-body bg-white pt-4">
                    <div class="row">`;

      // ...existing code...
items.forEach((item) => {
    const title = (item.namaDokumen || item.judul || "Dokumen").replace(/'/g, "\\'");
    const link = item.link || item.url || item.linkDokumenFull || "#";
    const rawDesc = item.deskripsiSingkat || item.deskripsi || "Klik untuk melihat detail dokumen.";
    // Tampilkan deskripsi penuh tanpa substring dan beri ruang lebih besar
    const desc = rawDesc;
    const img = fixGoogleDriveImage(item.imageUrl || item.gambar || "");

    html += `
    <div class="col-md-6 col-lg-3 mb-4">
        <div class="card h-100 border-0 shadow-sm card-doc" onclick="openDocPreview('${title}', '${link}')" style="cursor:pointer; transition: 0.3s;">
            <div class="doc-thumb position-relative overflow-hidden" style="height: 160px; background: #f8f9fa;">
                ${img ? `<img src="${img}" class="w-100 h-100 object-fit-cover">` : `<div class="d-flex align-items-center justify-content-center h-100 text-muted"><i class="fas fa-file-pdf fa-3x"></i></div>`}
                <div class="doc-overlay d-flex align-items-center justify-content-center">
                    <i class="fas fa-eye text-white fa-2x"></i>
                </div>
            </div>
            <div class="card-body">
                <h6 class="fw-bold text-dark mb-2 text-truncate-2">${title}</h6>
                <div class="small text-muted mb-0" style="min-height: 120px; max-height: 350px; overflow-y: auto; text-align: justify; white-space: pre-line;">${desc}</div>
            </div>
            <div class="card-footer bg-white border-0">
                <span class="btn btn-outline-primary btn-sm w-100 rounded-pill">Buka Dokumen</span>
            </div>
        </div>
    </div>`;
});
// ...existing code...
        html += `</div></div></div></div>`;
        index++;
    }

    html += '</div></div>';
    container.innerHTML = html;
}

function setupInfoPublikMenu(list) {
    const dropdown = document.getElementById('infoPublikDropdown');
    if (!dropdown || !list) return;
    const uniqueCategories = [...new Set(list.map(item => item.kategori || item.Kategori || ""))].filter(k => k && k.trim() !== "").sort();
    let html = '<li><a class="dropdown-item" href="infopublik.html">Semua Dokumen</a></li>';
    if (uniqueCategories.length > 0) {
        html += '<li><hr class="dropdown-divider"></li>';
        uniqueCategories.forEach(cat => { html += `<li><a class="dropdown-item" href="infopublik.html?kategori=${encodeURIComponent(cat)}">${cat}</a></li>`; });
    }
    dropdown.innerHTML = html;
}

// ==========================================
// MODUL INFO PUBLIK (FULL INTEGRATED)
// ==========================================

function openDocPreview(title, url) {
    if (!url || url.trim() === '' || url === 'undefined') {
        alert("Maaf, link dokumen tidak tersedia.");
        return;
    }

    const modalEl = document.getElementById('docPreviewModal') || document.getElementById('previewModal');
    const iframe = document.getElementById('docFrame') || document.getElementById('previewFrame');
    const modalTitle = document.getElementById('docModalTitle') || document.getElementById('previewTitle');

    if (modalEl && iframe) {
        if (modalTitle) modalTitle.innerText = title;

        let previewUrl = url.trim();

        if (previewUrl.includes('drive.google.com')) {
            // 1. Tangani format link 'uc?export=view&id=...' atau 'uc?id=...'
            if (previewUrl.includes('uc?')) {
                const urlParams = new URLSearchParams(previewUrl.split('?')[1]);
                const fileId = urlParams.get('id');
                if (fileId) {
                    previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                }
            } 
            // 2. Tangani format link standar /view atau /edit
            else {
                previewUrl = previewUrl.replace(/\/view.*$/, '/preview')
                                       .replace(/\/edit.*$/, '/preview')
                                       .replace(/\/sharing.*$/, '/preview');
            }

            // 3. Pastikan tidak ada parameter download yang tertinggal
            previewUrl = previewUrl.replace(/[\?&]export=download/, "");
        }

        // Set URL hasil konversi ke iframe
        iframe.src = previewUrl;

        const myModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        myModal.show();

        modalEl.addEventListener('hidden.bs.modal', () => {
            iframe.src = '';
        }, { once: true });
    } else {
        window.open(url, '_blank');
    }
}

// Render List Dokumen dari Spreadsheet ke Accordion

function renderInfoPublik(list) {
    const container = document.getElementById('infopublik-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const kategoriFilter = urlParams.get('kategori');

    // 1. Filter Data
    let dataToRender = list;
    if (kategoriFilter) {
        dataToRender = list.filter(item => 
            (item.kategori || item.Kategori || "").toLowerCase() === kategoriFilter.toLowerCase()
        );
    }

    // 2. Jika Data Kosong
    if (!dataToRender || dataToRender.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-file-circle-exclamation fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Data dokumen ${kategoriFilter ? `kategori "${kategoriFilter}" ` : ''}belum tersedia.</h5>
                <a href="infopublik.html" class="btn btn-primary btn-sm mt-3">Lihat Semua Dokumen</a>
            </div>`;
        return;
    }

    // 3. Grouping Berdasarkan Kategori
    const groupedData = dataToRender.reduce((acc, item) => {
        const cat = item.kategori || item.Kategori || "Lainnya";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    // 4. Generate Accordion HTML
    let html = '<div class="col-12"><div class="accordion shadow-sm" id="accInfoPublik">';
    let index = 0;

    for (const [category, items] of Object.entries(groupedData)) {
        const isExpanded = kategoriFilter ? 'true' : (index === 0 ? 'true' : 'false');
        const showClass = kategoriFilter ? 'show' : (index === 0 ? 'show' : '');
        const btnCollapsed = (kategoriFilter || index === 0) ? '' : 'collapsed';

        html += `
        <div class="accordion-item border-0 mb-3 rounded overflow-hidden shadow-sm">
            <h2 class="accordion-header">
                <button class="accordion-button ${btnCollapsed} fw-bold text-primary bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                    <i class="fas fa-folder-open me-2"></i> ${category.toUpperCase()} 
                    <span class="badge bg-primary ms-2 rounded-pill">${items.length}</span>
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse ${showClass}" data-bs-parent="#accInfoPublik">
                <div class="accordion-body bg-white pt-4">
                    <div class="row">`;

        items.forEach((item) => {
            const title = (item.namaDokumen || item.judul || "Dokumen").replace(/'/g, "\\'");
            const link = item.link || item.url || item.linkDokumenFull || "#";
            const rawDesc = item.deskripsiSingkat || item.deskripsi || "Klik untuk melihat detail dokumen.";
            const desc = rawDesc; 
                        const img = fixGoogleDriveImage(item.imageUrl || item.gambar || "");

            html += `
            <div class="col-md-6 col-lg-3 mb-4">
                <div class="card h-100 border-0 shadow-sm card-doc" onclick="openDocPreview('${title}', '${link}')" style="cursor:pointer; transition: 0.3s;">
                    <div class="doc-thumb position-relative overflow-hidden" style="height: 160px; background: #f8f9fa;">
                        ${img ? `<img src="${img}" class="w-100 h-100 object-fit-cover">` : `<div class="d-flex align-items-center justify-content-center h-100 text-muted"><i class="fas fa-file-pdf fa-3x"></i></div>`}
                        <div class="doc-overlay d-flex align-items-center justify-content-center">
                            <i class="fas fa-eye text-white fa-2x"></i>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="fw-bold text-dark mb-2 text-truncate-2">${title}</h6>
                        <p class="small text-muted mb-0" style="text-align: justify;">${desc}</p>
                    </div>
                    <div class="card-footer bg-white border-0">
                        <span class="btn btn-outline-primary btn-sm w-100 rounded-pill">Buka Dokumen</span>
                    </div>
                </div>
            </div>`;
        });

        html += `</div></div></div></div>`;
        index++;
    }

    container.innerHTML = html + '</div></div>';
}

/**
 * Setup Menu Navigasi Dropdown
 */
function setupInfoPublikMenu(list) {
    const dropdown = document.getElementById('infoPublikDropdown');
    if (!dropdown || !list) return;

    const uniqueCategories = [...new Set(list.map(item => item.kategori || item.Kategori || ""))].filter(Boolean).sort();
    
    let html = '<li><a class="dropdown-item" href="infopublik.html">Semua Dokumen</a></li>';
    if (uniqueCategories.length > 0) {
        html += '<li><hr class="dropdown-divider"></li>';
        uniqueCategories.forEach(cat => {
            html += `<li><a class="dropdown-item" href="infopublik.html?kategori=${encodeURIComponent(cat)}">${cat}</a></li>`;
        });
    }
    dropdown.innerHTML = html;
}
function setupSearchListener() {
    const forms = document.querySelectorAll('form[role="search"]');
    forms.forEach(form => {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            const input = this.querySelector('input');
            const keyword = input.value.trim();
            if(keyword) window.location.href = `pencarian.html?q=${encodeURIComponent(keyword)}`;
        });
    });
}

// Variable global untuk menampung data pencarian
let currentSearchResults = [];

function performSearch(data) {
    const keyword = getQueryParam('q');
    const container = document.getElementById('search-results-container');
    const titleEl = document.getElementById('search-title');
    
    if (!container) return;
    if (!keyword) {
        container.innerHTML = '<div class="alert alert-info text-center mt-5">Silakan masukkan kata kunci pencarian.</div>';
        return;
    }

    // Ganti judul dan pastikan teks instruksi lama hilang
    if(titleEl) titleEl.innerText = `Hasil Pencarian: "${keyword}"`;
    
    const lowerKeyword = keyword.toLowerCase();
    currentSearchResults = []; // Reset data
    const safeLower = (txt) => (txt || "").toString().toLowerCase();

    // --- PROSES DATA ---
    // 1. Berita
    if (data.berita) data.berita.forEach((item, index) => {
        if (safeLower(item.judul).includes(lowerKeyword)) {
            currentSearchResults.push({ 
                type: 'BERITA', title: item.judul, desc: item.ringkasan || item.isi, 
                link: `bacaselengkapnya.html?id=${index}`, 
                image: item.gambar || item.imageUrl || "" 
            });
        }
    });

    // 2. Dokumen
    const infoPublikData = data.infoPublik || data.infopublik || [];
    infoPublikData.forEach(item => {
        let nama = item.namaDokumen || item.judul || "";
        if (safeLower(nama).includes(lowerKeyword)) {
            currentSearchResults.push({ 
                type: 'DOKUMEN', title: nama, desc: item.deskripsi || item.kategori || "Dokumen Publik", 
                link: item.linkDokumenFull || item.link || item.url || '#',
                image: item.imageUrl || item.gambar || item.cover || item.sampul || "" 
            });
        }
    });

    // --- RENDER CARD ---
    if (currentSearchResults.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted">Tidak ditemukan hasil.</div>`;
    } else {
        let html = '<div class="col-12">';
        currentSearchResults.forEach((res, i) => {
            let finalImg = (typeof fixGoogleDriveImage === 'function') ? fixGoogleDriveImage(res.image) : res.image;
            
            // Thumbnail Portrait 3:4
            let imgDisplay = finalImg ? 
                `<img src="${finalImg}" class="rounded shadow-sm" style="width: 100%; aspect-ratio: 3/4; object-fit: cover; border: 1px solid #eee;">` : 
                `<div class="bg-light d-flex align-items-center justify-content-center rounded" style="width: 100%; aspect-ratio: 3/4; border: 1px solid #eee;">
                    <i class="fas fa-file-alt text-muted opacity-25 fa-lg"></i>
                 </div>`;

            html += `
            <div class="card mb-3 border-0 border-bottom rounded-0 shadow-none bg-transparent" onclick="showQuickPreview(${i})" style="cursor:pointer;">
                <div class="row g-3 align-items-center py-2">
                    <div class="col-3 col-md-2">
                        ${imgDisplay}
                    </div>
                    <div class="col-9 col-md-10">
                        <div class="card-body p-0">
                            <span class="text-muted fw-bold text-uppercase" style="font-size: 0.65rem;">${res.type}</span>
                            <h6 class="fw-bold text-dark mb-1 mt-1">${res.title}</h6>
                            <p class="small text-secondary mb-0 text-truncate-2">${res.desc}</p>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }
}

/**
 * FUNGSI PREVIEW (MODAL)
 */
function showQuickPreview(index) {
    const res = currentSearchResults[index];
    if (!res) return;

    const modalEl = document.getElementById('modalSearchPreview');
    const body = document.getElementById('modalSearchBody');
    
    if (!modalEl || !body) return;

    if (res.type === 'DOKUMEN') {
        let embedUrl = res.link.includes('drive.google.com') ? res.link.replace('/view', '/preview') : res.link;
        body.innerHTML = `
            <div style="height: 550px;">
                <iframe src="${embedUrl}" width="100%" height="100%" frameborder="0"></iframe>
            </div>`;
    } else {
        let finalImg = (typeof fixGoogleDriveImage === 'function') ? fixGoogleDriveImage(res.image) : res.image;
        body.innerHTML = `
            <div>
                ${finalImg ? `<img src="${finalImg}" class="img-fluid w-100" style="max-height: 300px; object-fit: cover;">` : ''}
                <div class="p-4">
                    <h5 class="fw-bold text-dark mb-2">${res.title}</h5>
                    <p class="text-secondary small lh-lg mb-4" style="text-align: justify;">${res.desc}</p>
                    <a href="${res.link}" class="btn btn-dark w-100 rounded-pill fw-bold btn-sm">Buka Selengkapnya</a>
                </div>
            </div>`;
    }

    // Jalankan Modal
    const myModal = new bootstrap.Modal(modalEl);
    myModal.show();
}


function renderBanner(list) {
    const container = document.getElementById('banner-container');
    if (!list || list.length === 0) { 
        container.innerHTML = `<div class="carousel-item active"><img src="https://via.placeholder.com/1200x600?text=Default" class="d-block w-100"></div>`; 
        return; 
    }
    let html = '';
    list.forEach((item, index) => {
        let activeClass = index === 0 ? 'active' : '';
        let imgUrl = fixGoogleDriveImage(item.gambar) || "https://via.placeholder.com/1200x600?text=No+Image";
        html += `<div class="carousel-item ${activeClass}"><img src="${imgUrl}" class="d-block w-100"><div class="carousel-caption"><h2 data-aos="fade-down">${item.judul}</h2><p class="lead mt-3" data-aos="fade-up">${item.deskripsi}</p><a href="#berita-section" class="btn btn-warning btn-banner shadow">Lihat Berita</a></div></div>`;
    });
    container.innerHTML = html;
}

/* --- FUNGSI RENDER SEJARAH (VERSI PERBAIKAN) --- */
function renderSejarah(list) {
    const container = document.getElementById('sejarah-container');
    const loadingElement = document.getElementById('loading-sejarah'); 
    
    // 1. Cek Validitas Data
    if (!list || list.length === 0) { 
        container.innerHTML = '<div class="text-center py-5">Data sejarah belum tersedia.</div>'; 
        if (loadingElement) loadingElement.style.display = 'none'; 
        return; 
    }
    
    const item = list[0]; 
    
    // 2. AMBIL & BERSIHKAN DATA GAMBAR
    // Menggunakan .trim() untuk memastikan tidak ada spasi liar dari Spreadsheet
    const cleanLink = (link) => link ? link.toString().trim() : "";
    
    let imgUtama = fixGoogleDriveImage(cleanLink(item.gambarutama || item.gambarUtama || item.image));
    let imgTengah1 = fixGoogleDriveImage(cleanLink(item.gambartengah1 || item.gambarTengah1));
    let imgTengah2 = fixGoogleDriveImage(cleanLink(item.gambartengah2 || item.gambarTengah2));
    
    // Debugging di Console
    console.log("Link Gambar 1:", imgTengah1);
    
    // 3. HEADER HALAMAN
    let htmlOutput = `
        <div class="row justify-content-center">
            <div class="col-lg-10">
                <h2 class="fw-bold text-primary mb-4 text-center">${item.judul || 'Sejarah LPKA'}</h2>
                
                ${imgUtama ? `
                <div class="mb-5 text-center">
                    <img src="${imgUtama}" class="img-fluid rounded-4 shadow-lg" 
                         style="max-height:500px; width:100%; object-fit:cover;" 
                         alt="Gambar Utama" 
                         onerror="this.parentElement.style.display='none'">
                </div>` : ''}
                
                <div class="text-secondary fs-5">
    `;

    // 4. PROSES PARAGRAF
    let rawContent = item.deskripsisejarah || item.deskripsi_sejarah || item.deskripsi || item.konten || "";
    let paragraphs = rawContent.toString().split(/\r?\n/).filter(p => p.trim() !== "");
    let totalPara = paragraphs.length;

    // Tentukan titik sisip (Contoh: Paragraf ke-2 dan Paragraf ke-5)
    // Atau gunakan logika dinamis:
    let idx1 = Math.floor(totalPara / 3); 
    let idx2 = Math.floor(2 * totalPara / 3);

    if (totalPara > 0) {
        paragraphs.forEach((p, i) => {
            // Tambahkan Teks Paragraf
            htmlOutput += `<p class="lh-lg mb-3" style="text-align:justify;">${p}</p>`;
            
            // Sisipkan Gambar Tengah 1 setelah paragraf idx1
            if (imgTengah1 && i === idx1) {
                htmlOutput += `
                <div class="row justify-content-center my-4">
                    <div class="col-md-11 text-center">
                        <img src="${imgTengah1}" class="img-fluid rounded-3 shadow-sm w-100" 
                             style="max-height: 450px; object-fit: contain; display: block !important;" 
                             alt="Dokumentasi Sejarah 1" 
                             onerror="console.error('Gagal load Gambar Tengah 1'); this.closest('.row').style.display='none'">
                    </div>
                </div>`;
            }
            
            // Sisipkan Gambar Tengah 2 setelah paragraf idx2
            if (imgTengah2 && i === idx2 && idx2 !== idx1) {
                htmlOutput += `
                <div class="row justify-content-center my-4">
                    <div class="col-md-11 text-center">
                        <img src="${imgTengah2}" class="img-fluid rounded-3 shadow-sm w-100" 
                             style="max-height: 450px; object-fit: contain; display: block !important;" 
                             alt="Dokumentasi Sejarah 2" 
                             onerror="this.closest('.row').style.display='none'">
                    </div>
                </div>`;
            }
        });
    } else {
        // Jika tidak ada teks sama sekali tapi ada gambar tengah
        if (imgTengah1) htmlOutput += `<img src="${imgTengah1}" class="img-fluid mb-3">`;
        if (imgTengah2) htmlOutput += `<img src="${imgTengah2}" class="img-fluid">`;
    }

    // Penutup Tag
    htmlOutput += `</div></div></div>`;
    
    // Render ke DOM
    container.innerHTML = htmlOutput;
    
    if (loadingElement) loadingElement.style.display = 'none';
}
function renderPejabat(list) {
    const container = document.getElementById('pejabat-container');
    if(!container || !list || list.length === 0) { if(container) container.innerHTML = '<div class="text-center text-muted">Data tidak tersedia</div>'; return; }
    const kepala = list[0]; 
    const imgUrl = fixGoogleDriveImage(kepala.foto) || "https://via.placeholder.com/150x150";
    container.innerHTML = `<div class="kepala-container text-center p-3" onclick="window.location.href='pejabat.html'"><div class="kepala-img-container"><img src="${imgUrl}" class="kepala-img"></div><h5 class="fw-bold text-primary mb-1">${kepala.nama}</h5></div>`;
}

function renderPejabatFull(list) {
    const container = document.getElementById('pejabat-full-container');
    if(!container) return;
    container.innerHTML = '';
    if(!list || list.length === 0) { 
        container.innerHTML = '<div class="col-12 text-center">Data pejabat belum tersedia.</div>'; 
        return; 
    }
    
    let html = '';
    
// --- CARD BESAR 1: Pejabat Tertinggi (Versi Lebih Compact) ---
if (list.length > 0) {
    const p1 = list[0];
    html += `
    <div class="col-12 mb-4" data-aos="fade-up">
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden mx-auto" style="max-width: 900px;"> 
            <div class="row g-0 align-items-center">
                <div class="col-md-4 bg-light text-center">
                    <img src="${fixGoogleDriveImage(p1.foto)}" 
                         class="img-fluid" 
                         style="height: 300px; width: 100%; object-fit: contain; padding: 15px;" 
                         alt="${p1.nama}">
                </div>
                <div class="col-md-8 p-4 text-center text-md-start">
                    <h3 class="fw-bold text-dark mb-2">${p1.nama}</h3>
                    <div class="bg-primary d-inline-block px-3 py-1 rounded-pill">
                        <span class="text-white mb-0 small" style="font-weight: 500;">${p1.jabatan}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}
    
// --- CARD BESAR 2: 5 Pejabat Utama (Eselon IVA) ---
const start2 = 1;
const end2 = Math.min(6, list.length);

if (end2 > start2) {
    html += `
    <div class="col-12 mb-5" data-aos="fade-up" data-aos-delay="100">
        <h5 class="fw-bold text-primary mb-4 text-center">Eselon IVA</h5>
        
        <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-3 justify-content-center">`;
    
    for (let i = start2; i < end2; i++) {
        const p = list[i];
        html += `
            <div class="col">
                <div class="card card-pejabat h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="ratio ratio-1x1 bg-light">
                        <img src="${fixGoogleDriveImage(p.foto)}" 
                             class="card-img-top" 
                             style="object-fit: contain; padding: 5px;" 
                             alt="${p.nama}">
                    </div>
                    <div class="card-body text-center p-2 p-md-3">
                        <h6 class="fw-bold text-primary mb-1" style="
                            font-size: 0.8rem; 
                            white-space: normal; 
                            min-height: 2.4em; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            line-height: 1.2;
                            word-break: break-word;
                        ">
                            ${p.nama}
                        </h6>
                        <small class="text-muted d-block text-uppercase" style="font-size: 0.65rem; line-height: 1.2;">${p.jabatan}</small>
                    </div>
                </div>
            </div>`;
    }
    html += `
        </div>
    </div>`;
}
    
// --- CARD BESAR 3: Eselon V ---
const start3 = 6;
if (list.length > start3) {
    html += `
    <div class="col-12 mb-4" data-aos="fade-up" data-aos-delay="200">
        <h5 class="fw-bold text-primary mb-4 text-center">Eselon V</h5>
        
        <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-3 justify-content-center">`;
    
    for (let i = start3; i < list.length; i++) {
        const p = list[i];
        html += `
            <div class="col">
                <div class="card card-pejabat h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="ratio ratio-1x1 bg-light">
                        <img src="${fixGoogleDriveImage(p.foto)}" 
                             class="card-img-top" 
                             style="object-fit: contain; padding: 5px;" 
                             alt="${p.nama}">
                    </div>
                    <div class="card-body text-center p-2 p-md-3">
                        <h6 class="fw-bold text-primary mb-1" style="
                            font-size: 0.8rem; 
                            white-space: normal; 
                            min-height: 2.4em; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            line-height: 1.2;
                            word-break: break-word;
                        ">
                            ${p.nama}
                        </h6>
                        <small class="text-muted d-block text-uppercase" style="font-size: 0.65rem; line-height: 1.2;">${p.jabatan}</small>
                    </div>
                </div>
            </div>`;
    }
    html += `
        </div>
    </div>`;
}
    container.innerHTML = html;
}


function renderVisiMisi(list) {
    const container = document.getElementById('visimisi-content-container');
    if(!container || !list || list.length === 0) { 
        if(container) container.innerHTML = '<div class="text-center">Data belum tersedia.</div>'; 
        return; 
    }
    
    let html = '<div class="row">';
    
    // --- FILTER DATA BERDASARKAN KATEGORI ---
    let visiList = list.filter(item => item.kategori.toLowerCase().includes('visi'));
    let misiList = list.filter(item => item.kategori.toLowerCase().includes('misi'));
    let tujuanList = list.filter(item => item.kategori.toLowerCase().includes('tujuan'));
    let mottoList = list.filter(item => item.kategori.toLowerCase().includes('motto'));
    
    // 1. BAGIAN VISI
if (visiList.length > 0) {
    html += '<div class="col-md-12 mb-4 text-center"><h4 class="fw-bold text-primary mb-3"><i class="fas fa-eye me-2"></i>VISI</h4>';
    visiList.forEach(v => { 
        html += `<p class="lead fst-italic">"${v.konten}"</p>`; 
    });
    html += '</div>';
}

// 2. BAGIAN MISI
if (misiList.length > 0) {
    html += '<div class="col-12"><hr class="my-4"></div><div class="col-md-12"><h4 class="fw-bold text-primary mb-4 text-center"><i class="fas fa-bullseye me-2"></i>MISI KAMI</h4><ul class="list-group list-group-flush">';
    
    let counter = 1; 
    
    misiList.forEach(m => { 
        let points = m.konten.split(/\r?\n/); 
        points.forEach(p => { 
            if(p.trim() !== "") {
                html += `
                <li class="list-group-item bg-transparent border-0 ps-0 fs-5 d-flex align-items-start mb-1 py-1">
                    <div class="me-3 d-flex align-items-center justify-content-center shadow-sm" 
                         style="min-width: 38px; height: 38px; background: linear-gradient(135deg, #ffca28, #f57c00); color: #fff; border-radius: 12px; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; border: 2px solid #fff;">
                        ${counter}
                    </div>
                    <div style="text-align: justify; line-height: 1.6; color: #333;">
                        ${p}
                    </div>
                </li>`;
                counter++; 
            }
        }); 
    });
    html += '</ul></div>';
}

// 3. BAGIAN TUJUAN (UKURAN SAMA DENGAN MISI)
if (tujuanList.length > 0) {
    // Mengurangi margin horizontal rule (my-2) dan margin judul (mb-2)
    html += '<div class="col-12"><hr class="my-2"></div><div class="col-md-12"><h4 class="fw-bold text-primary mb-2 text-center"><i class="fas fa-flag-checkered me-2"></i>TUJUAN</h4><ul class="list-group list-group-flush">';
    
    let counterTujuan = 1; 
    
    tujuanList.forEach(t => { 
        let points = t.konten.split(/\r?\n/); 
        points.forEach(p => { 
            if(p.trim() !== "") {
                // Mengubah mb-3 menjadi mb-1 agar jarak antar poin lebih rapat
                html += `
                <li class="list-group-item bg-transparent border-0 ps-0 fs-5 d-flex align-items-start mb-1 py-1">
                    <div class="me-3 d-flex align-items-center justify-content-center shadow-sm" 
                         style="min-width: 32px; height: 32px; background: linear-gradient(135deg, #ffca28, #f57c00); color: #fff; border-radius: 8px; font-weight: 800; font-size: 1rem; flex-shrink: 0; margin-top: 4px; border: 1px solid #fff;">
                        ${counterTujuan}
                    </div>
                    <div style="text-align: justify; line-height: 1.4; color: #333;">
                        ${p}
                    </div>
                </li>`;
                counterTujuan++; 
            }
        }); 
    });
    html += '</ul></div>';
}

// 4. BAGIAN MOTTO
if (mottoList.length > 0) {
    html += '<div class="col-12"><hr class="my-4"></div><div class="col-md-12 text-center"><h4 class="fw-bold text-primary mb-4"><i class="fas fa-star me-2"></i>MOTTO</h4>';
    mottoList.forEach(mt => { 
        html += `
        <div class="d-inline-block position-relative p-4 rounded-4 shadow-sm" style="background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); border: 1px solid #eee;">
            <i class="fas fa-quote-left text-warning position-absolute top-0 start-0 m-3 fs-4 opacity-50"></i>
            <h3 class="fw-bold text-dark m-0 fst-italic px-4 py-2">
                "${mt.konten}"
            </h3>
            <i class="fas fa-quote-right text-warning position-absolute bottom-0 end-0 m-3 fs-4 opacity-50"></i>
        </div>`; 
    });
    html += '</div>';
}

    html += '</div>';
    container.innerHTML = html;
}

function renderTupoksi(list) {
    const container = document.getElementById('tupoksi-container');
    const loadingElement = document.getElementById('loading-tupoksi');
    if (!container) return;
    if(!list || list.length === 0) { container.innerHTML = '<div class="text-center py-5">Data Tupoksi belum tersedia.</div>'; if(loadingElement) loadingElement.style.display = 'none'; return; }
    
    let html = '<div class="col-lg-10"><div class="accordion" id="accTupoksi">';
    list.forEach((item, idx) => {
        let kontenBersih = item.konten ? item.konten.replace(/\n/g, '<br>') : "Belum ada konten.";
        html += `<div class="accordion-item border-0 shadow-sm mb-3 rounded overflow-hidden"><h2 class="accordion-header"><button class="accordion-button ${idx !== 0 ? 'collapsed' : ''} fw-bold text-primary bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${idx}">${item.kategori}</button></h2><div id="collapse${idx}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}" data-bs-parent="#accTupoksi"><div class="accordion-body bg-white lh-lg text-secondary">${kontenBersih}</div></div></div>`;
    });
    html += '</div></div>';
    container.innerHTML = html;
    if (loadingElement) loadingElement.style.display = 'none';
}

function renderStruktur(list) {
    const container = document.getElementById('struktur-container');
    const loadingElement = document.getElementById('loading-struktur');
    if (!container) return;
    // Cek jika data kosong
    if (!list || list.length === 0) { 
        container.innerHTML = '<div class="text-center">Data struktur belum tersedia.</div>'; 
        if (loadingElement) loadingElement.style.display = 'none'; 
        return; 
    }
    let item = list[0];
    // 1. Ambil Gambar
    let imgUrl = item.image ? fixGoogleDriveImage(item.image) : "";
    // 2. Ambil Link Dokumen (Menggunakan kolom url_dokumen)
    let docLink = item.url_dokumen || item.urlDokumen || item.link || "";
    // 3. Render HTML Gabungan dengan Gaya Tombol Baru
    container.innerHTML = `
        <h4 class="mb-4 fw-bold text-dark">${item.judul || 'Struktur Organisasi'}</h4>
        
        ${imgUrl ? `
        <div class="mb-4">
            <img src="${imgUrl}" class="img-fluid border rounded shadow-sm" style="max-height:80vh;" alt="Bagan Struktur">
        </div>` : ''}
        
        <p class="text-muted w-75 mx-auto lh-lg">${item.deskripsi || ''}</p>
        
        <div class="row justify-content-center mt-5">
            <div class="col-md-6 col-lg-5">
                <div class="d-grid gap-3 position-relative px-2" style="z-index: 2;">
                    <a href="javascript:void(0);" 
                       onclick="openDocPreview('Dokumen Struktur Organisasi', '${docLink}')" 
                       class="btn btn-primary text-start py-3 hover-scale border-0 shadow-sm rounded-4"
                       style="background: linear-gradient(135deg, #003366 0%, #004080 100%);">
                        <div class="d-flex align-items-center">
                            <div class="bg-white bg-opacity-25 rounded-circle p-2 me-3" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-file-pdf fs-5 text-white"></i>
                            </div>
                            <div class="lh-sm overflow-hidden text-white">
                                <small class="d-block text-white-50" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">Dokumen Lengkap</small>
                                <span class="fw-bold small text-truncate d-block">Lihat Struktur Organisasi (PDF)</span>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </div>`;
    if (loadingElement) loadingElement.style.display = 'none';
}

/* --- HELPER: MENGUBAH JUDUL MENJADI SLUG URL --- */
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Ganti spasi dengan -
        .replace(/[^\w\-]+/g, '')       // Hapus karakter spesial
        .replace(/\-\-+/g, '-')         // Ganti double hyphen
        .replace(/^-+/, '')             // Hapus hyphen di awal
        .replace(/-+$/, '');            // Hapus hyphen di akhir
}

/* --- FUNGSI RENDER BERITA (BERANDA) --- */
function renderBerita(list) {
    const container = document.getElementById('news-container');
    const loadingEl = document.getElementById('loading-news');
    if (loadingEl) loadingEl.style.display = 'none';
    
    if (!container || !list || list.length === 0) return;
    
    // Ambil 6 berita terbaru
    const latest = list.slice().reverse().slice(0, 6);
    let html = '';
    
    latest.forEach((item, idx) => {
        // 1. Gambar
        let img = fixGoogleDriveImage(item.gambar1 || item.gambar_1 || item.Gambar1 || item.image || "") || "https://via.placeholder.com/400x250?text=No+Image";
        
        // 2. LOGIKA TANGGAL YANG AMAN
        let rawDate = item.tanggal || item.Tanggal || item.date || item.Date || "";
        let dateStr = rawDate; 

        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
            }
        }

        // 3. Judul & Ringkasan
        let judul = item.judul || item.Judul || "Tanpa Judul";
        let ringkasan = item.ringkasan || item.Ringkasan || item.deskripsi || "";
        
        // Buat slug untuk URL
        let judulUrl = encodeURIComponent(slugify(judul));

        html += `
        <div class="col-md-6 mb-4" data-aos="fade-up" data-aos-delay="${idx * 100}">
            <div class="card card-news h-100">
                <div class="news-img-wrapper">
                    <img src="${img}" alt="${judul}">
                    <div class="news-date-badge">${dateStr}</div>
                </div>
                <div class="card-body p-4">
                    <h5 class="news-title mb-3">
                        <a href="bacaselengkapnya.html?judul=${judulUrl}" class="text-decoration-none fw-bold lh-base">${judul}</a>
                    </h5>
                    <p class="small text-secondary">${ringkasan ? ringkasan.substring(0,90)+'...' : ''}</p>
                    <a href="bacaselengkapnya.html?judul=${judulUrl}" class="btn btn-outline-primary btn-readmore w-100 mt-3">Baca Selengkapnya</a>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

/* --- FUNGSI RENDER BERITA FULL (HALAMAN BERITA) --- */
function renderBeritaFull(list) {
    const container = document.getElementById('news-full-container');
    if (!container) return;
    
    container.innerHTML = '';
    if (!list || list.length === 0) { 
        container.innerHTML = '<div class="col-12 text-center">Belum ada berita.</div>'; 
        return; 
    }
    
    const reversedList = list.slice().reverse();
    let html = '';
    
    reversedList.forEach((item, idx) => {
        // 1. Gambar
        let img = fixGoogleDriveImage(item.gambar1 || item.gambar_1 || item.Gambar1 || item.image || "") || "https://via.placeholder.com/400x250?text=No+Image";
        
        // 2. LOGIKA TANGGAL YANG AMAN
        let rawDate = item.tanggal || item.Tanggal || item.date || item.Date || "";
        let dateStr = rawDate; 

        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
            }
        }
        
        // 3. Judul & Ringkasan
        let judul = item.judul || item.Judul || "Tanpa Judul";
        let ringkasan = item.ringkasan || item.Ringkasan || item.deskripsi || "";
        
        // Buat slug untuk URL
        let judulUrl = encodeURIComponent(slugify(judul));

        html += `
        <div class="col-md-6 col-lg-4 mb-4" data-aos="fade-up">
            <div class="card card-news h-100 shadow-sm">
                <div class="news-img-wrapper" style="height:200px;">
                    <img src="${img}" style="width:100%; height:100%; object-fit:cover;" alt="${judul}">
                    <div class="news-date-badge">${dateStr}</div>
                </div>
                <div class="card-body p-3">
                    <h5 class="news-title mb-2 fs-6">
                        <a href="bacaselengkapnya.html?judul=${judulUrl}" class="text-decoration-none fw-bold lh-base text-dark">${judul}</a>
                    </h5>
                    <p class="small text-muted mb-3" style="font-size:0.85rem;">${ringkasan ? ringkasan.substring(0,80)+'...' : ''}</p>
                    <a href="bacaselengkapnya.html?judul=${judulUrl}" class="btn btn-sm btn-outline-primary w-100 rounded-pill">Baca Selengkapnya</a>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

/* --- FUNGSI RENDER DETAIL (HALAMAN BACASELENGKAPNYA) --- */
function renderDetailBerita(list) {
    // Ambil parameter 'judul' dari URL (bukan 'id')
    const params = new URLSearchParams(window.location.search);
    const slugDicuri = params.get('judul'); 
    
    if(!slugDicuri || !list) { 
        document.getElementById('detail-title').innerText = "Berita Tidak Ditemukan"; 
        return; 
    }
    
    // CARI DATA: Bandingkan slug URL dengan slug dari setiap judul di list
    const item = list.find(berita => slugify(berita.judul || berita.Judul) === slugDicuri);

    if(!item) { 
        document.getElementById('detail-title').innerText = "Berita Tidak Ditemukan (404)"; 
        return; 
    }
    // 1. JUDUL
    document.getElementById('detail-title').innerText = item.judul || item.Judul || "";

    // 2. TANGGAL (Perbaikan Validasi)
    const dateEl = document.getElementById('detail-date');
    if(dateEl) { 
        // Ambil data tanggal dari berbagai kemungkinan nama kolom
        let rawDate = item.tanggal || item.Tanggal || item.date || item.Date || "";
        let dateStr = rawDate; // Default gunakan teks asli jika parsing gagal

        if (rawDate) {
            const d = new Date(rawDate);
            // Cek apakah tanggal valid secara sistem
            if (!isNaN(d.getTime())) {
                // Jika valid, format ke bahasa Indonesia
                dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
            // Jika tidak valid (isNaN), dateStr tetap menggunakan rawDate (teks asli dari Excel)
        }
        
        dateEl.innerHTML = `<i class="far fa-calendar-alt me-1"></i> ${dateStr} <span class="mx-2">|</span> Humas LPKA`; 
    }

    // 3. GAMBAR UTAMA (Gambar 1 sebagai Header/Sampul)
    const imgEl = document.getElementById('detail-img');
    let img1 = fixGoogleDriveImage(item.gambar1 || item.gambar_1 || item.Gambar1 || item.image || "");
    
    if(imgEl) { 
        imgEl.src = img1 || "https://via.placeholder.com/800x500?text=No+Image"; 
        imgEl.style.display = img1 ? 'inline-block' : 'none'; 
    }
    
    // 4. SIAPKAN GAMBAR TAMBAHAN (Gambar 2 & Gambar 3)
    let img2 = fixGoogleDriveImage(item.gambar2 || item.gambar_2 || item.Gambar2 || "");
    let img3 = fixGoogleDriveImage(item.gambar3 || item.gambar_3 || item.Gambar3 || "");

    // 5. ISI BERITA & SISIPKAN GAMBAR DI SELA PARAGRAF
    let paragraphs = (item.isi || item.Isi || item.konten || "").toString().split(/\r?\n/).filter(p => p.trim() !== "");
    let htmlContent = "";
    
    // Hitung posisi penyisipan gambar (1/3 dan 2/3 halaman)
    let idx2 = Math.floor(paragraphs.length / 3);
    let idx3 = Math.floor(2 * paragraphs.length / 3);

    paragraphs.forEach((p, i) => {
        // Tambahkan paragraf teks
        htmlContent += `<p class="lh-lg mb-3" style="text-align:justify;">${p}</p>`;
        
        // Sisipkan Gambar 2 di posisi 1/3 (jika ada)
        if (i === idx2 && img2) {
            htmlContent += `
            <div class="row justify-content-center my-4" data-aos="fade-up">
                <div class="col-md-10 text-center">
                    <img src="${img2}" class="img-fluid rounded-3 shadow-sm w-100" style="max-height: 450px; object-fit: contain;" alt="Dokumentasi 2">
                </div>
            </div>`;
        }

        // Sisipkan Gambar 3 di posisi 2/3 (jika ada)
        if (i === idx3 && img3) {
            htmlContent += `
            <div class="row justify-content-center my-4" data-aos="fade-up">
                <div class="col-md-10 text-center">
                    <img src="${img3}" class="img-fluid rounded-3 shadow-sm w-100" style="max-height: 450px; object-fit: contain;" alt="Dokumentasi 3">
                </div>
            </div>`;
        }
    });

    document.getElementById('detail-content').innerHTML = htmlContent;
}
function renderVideoSidebar(list) {
    const container = document.getElementById('sidebar-video-container');
    if(!container) return;
    
    const limited = list ? list.slice(0, 2) : [];
    let html = '';
    
    limited.forEach(item => {
        const vidId = getYoutubeId(item.link || item.url);
        const thumb = vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : '';
        
        // Mengambil teks dari kolom "Judul" di spreadsheet
        // Sesuaikan 'item.Judul' dengan nama key yang dihasilkan oleh parser spreadsheet Anda
        const judulVideo = item.Judul || item.judul || "Judul tidak tersedia";

        html += `
            <div class="mb-4">
                <a href="${item.link}" target="_blank" class="sidebar-video-card d-block position-relative mb-2">
                    <img src="${thumb}" class="w-100 rounded">
                    <div class="position-absolute top-50 start-50 translate-middle text-white">
                        <i class="fab fa-youtube fa-3x"></i>
                    </div>
                </a>
                <div class="video-sidebar-title" style="font-size: 14px; font-weight: 600; line-height: 1.4; color: #333;">
                    ${judulVideo}
                </div>
            </div>`;
    });
    
    container.innerHTML = html;
}

// ==========================================
// 6. UTILITY FUNCTIONS
// ==========================================
function fixGoogleDriveImage(url) { 
    if (!url) return ""; 
    const match = url.match(/(?:d\/|id=)([\w-]+)/); 
    return match && match[1] ? `https://lh3.googleusercontent.com/d/${match[1]}` : url; 
}

function getYoutubeId(url) { 
    if (!url) return null; 
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/); 
    return (match && match[2].length === 11) ? match[2] : null; 
}

function getPreviewLink(url) { 
    if (!url) return ""; 
    const match = url.match(/(?:d\/|id=)([\w-]+)/); 
    return match && match[1] ? `https://drive.google.com/file/d/${match[1]}/preview` : url; 
}

function getQueryParam(param) { 
    const urlParams = new URLSearchParams(window.location.search); 
    return urlParams.get(param); 
}
    
// ==========================================
// RENDER HALAMAN PKBM (REVISI: BAR CHART & FILTER KOMPLEKS)
// ==========================================
function renderPKBM(list) {
    const container = document.getElementById('pkbm-content-area');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-5">Data PKBM belum tersedia di Database.</div>';
        return;
    }

    // 1. Inisialisasi Modal Galeri (Jika ada)
    if (typeof initGalleryModal === 'function') {
        initGalleryModal();
    }

    // --- 2. PERSIAPAN DATA UMUM (HEADER) ---
    const data = list[0]; 

    // Data Statistik Header
    let gl = parseInt(data.guru_laki) || 0;
    let gp = parseInt(data.guru_perempuan) || 0;
    let totalGuru = gl + gp;

    let gd = parseInt(data.guru_diploma) || 0;
    let gs = parseInt(data.guru_strata) || 0;
    
    let totalSiswa = (parseInt(data.siswa_a)||0) + (parseInt(data.siswa_b)||0) + (parseInt(data.siswa_c)||0);
    
    let logoUrl = fixGoogleDriveImage(data.logo);
    let html = '';

    // --- 3. HTML STRUKTUR ---
    html += `
    <div class="row g-4 mb-5">
        <div class="col-lg-8" data-aos="fade-right">
            <div class="card h-100 border-0 shadow-sm rounded-4 p-4">
                <h4 class="fw-bold text-primary mb-3"><i class="fas fa-school me-2"></i>Tentang PKBM</h4>
                <p class="text-secondary lh-lg mb-4" style="text-align: justify;">
                    ${data.deskripsi ? data.deskripsi.replace(/\n/g, '<br>') : 'Deskripsi belum tersedia.'}
                </p>
              <div class="bg-light p-3 rounded-3 border-start border-4 border-warning shadow-sm">
    <h6 class="fw-bold text-dark mb-3">
        <i class="fas fa-calendar-alt me-2 text-warning"></i>Program Kegiatan:
    </h6>
    <div class="list-unstyled">
        ${data.program_kegiatan ? data.program_kegiatan.split(/\r?\n/).filter(k => k.trim() !== "").map((k, i) => `
            <div class="d-flex align-items-start mb-2">
                <div class="me-2 d-flex align-items-center justify-content-center shadow-sm" 
                     style="min-width: 24px; height: 24px; background: linear-gradient(135deg, #ffca28, #f57c00); color: white; border-radius: 6px; font-weight: bold; font-size: 0.75rem; flex-shrink: 0; margin-top: 2px;">
                    ${i + 1}
                </div>
                <div class="text-secondary" style="text-align: justify; font-size: 0.9rem; line-height: 1.4;">
                    ${k.trim()}
                </div>
            </div>
        `).join('') : '<div class="text-muted small ps-2">Belum ada data</div>'}
    </div>
</div>
            </div>
        </div>
        
        <div class="col-lg-4" data-aos="fade-left">
            <div class="card h-100 border-0 shadow-sm rounded-4 p-4 bg-primary text-white position-relative overflow-hidden d-flex flex-column justify-content-center">
                ${logoUrl ? `
                <div class="text-center mb-3 position-relative" style="z-index: 2;">
                    <div class="d-inline-block bg-white p-3 rounded-circle shadow-sm">
                        <img src="${logoUrl}" style="width: 160px; height: 160px; object-fit: contain;" alt="Logo PKBM">
                    </div>
                </div>` : ''}

                <div class="text-center position-relative mb-4" style="z-index: 2;">
                    <h5 class="fw-bold mb-1 ls-1">PKBM TUNAS MEKAR AMAN</h5>
                    <h6 class="fw-bold mb-2 ls-1 opacity-75">LPKA KLAS I KUTOARJO</h6>
                    <span class="badge bg-warning text-dark fw-bold mb-3 px-3 py-2 rounded-pill">
                        <i class="fas fa-star me-1"></i> ${data.akreditasi || 'Terakreditasi A'}
                    </span>
                    <div style="width: 60px; height: 3px; background: #fff; margin: 0 auto;"></div>
                </div>

                <div class="d-grid gap-3 position-relative px-2" style="z-index: 2;">
                    <a href="javascript:void(0);" onclick="openDocPreview('Badan Hukum', '${data.url_badan_hukum || ''}')" class="btn btn-outline-light text-start py-2 hover-scale border-opacity-50">
                        <div class="d-flex align-items-center">
                            <div class="bg-white bg-opacity-25 rounded-circle p-2 me-3" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-balance-scale fs-5"></i>
                            </div>
                            <div class="lh-sm overflow-hidden">
                                <small class="d-block text-white-50" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">Badan Hukum</small>
                                <span class="fw-bold small text-truncate d-block">${data.dasar_hukum || '-'}</span>
                            </div>
                        </div>
                    </a>
                    <a href="javascript:void(0);" onclick="openDocPreview('Surat Keputusan', '${data.url_sk || ''}')" class="btn btn-outline-light text-start py-2 hover-scale border-opacity-50">
                        <div class="d-flex align-items-center">
                            <div class="bg-white bg-opacity-25 rounded-circle p-2 me-3" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-file-contract fs-5"></i>
                            </div>
                            <div class="lh-sm overflow-hidden">
                                <small class="d-block text-white-50" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">Surat Keputusan</small>
                                <span class="fw-bold small text-truncate d-block">${data.sk || '-'}</span>
                            </div>
                        </div>
                    </a>
                    <a href="javascript:void(0);" onclick="openDocPreview('Standar Operasional Prosedur', '${data.url_sop || ''}')" class="btn btn-warning text-dark text-start py-2 hover-scale border-0 shadow-sm">
                        <div class="d-flex align-items-center">
                            <div class="bg-white bg-opacity-25 rounded-circle p-2 me-3" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-book-reader fs-5"></i>
                            </div>
                            <div class="lh-sm overflow-hidden">
                                <span class="fw-bold small text-truncate d-block">${data.sop || 'Dokumen SOP'}</span>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;

    // --- 4. GALERI ---
    const galeriData = (typeof globalData !== 'undefined' && globalData.galeri_pkbm) ? globalData.galeri_pkbm : [];
    if (typeof renderGalleryMarquee === 'function') {
        html += renderGalleryMarquee(galeriData, "Galeri Kegiatan PKBM", "pkbmGallery", "primary");
    }

    // --- 5. TABEL STATISTIK (Update: 2 Kolom Simetris) ---
    html += `
    <h4 class="fw-bold text-center text-dark mb-4 mt-5" data-aos="fade-up">Statistik Tenaga Kependidikan</h4>
    
    <div class="row g-4 mb-5 justify-content-center">
        <div class="col-md-6 col-lg-5" data-aos="zoom-in" data-aos-delay="100">
            <div class="card border-0 shadow-sm rounded-4 h-100">
                <div class="card-header bg-white fw-bold text-center py-3 border-bottom text-primary">
                    <i class="fas fa-venus-mars me-2"></i>Gender Pendidik <span class="badge bg-secondary rounded-pill ms-2">Total: ${totalGuru}</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover align-middle mb-0">
                            <thead class="table-light"><tr><th class="ps-4">Gender</th><th class="text-end pe-4">Jumlah</th></tr></thead>
                            <tbody>
                                <tr><td class="ps-4">Laki-Laki</td><td class="text-end pe-4 fw-bold">${gl}</td></tr>
                                <tr><td class="ps-4">Perempuan</td><td class="text-end pe-4 fw-bold">${gp}</td></tr>
                            </tbody>
                            <tfoot class="table-light"><tr><td class="ps-4 fw-bold">Total Pendidik</td><td class="text-end pe-4 fw-bold text-primary">${totalGuru}</td></tr></tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6 col-lg-5" data-aos="zoom-in" data-aos-delay="200">
            <div class="card border-0 shadow-sm rounded-4 h-100">
                <div class="card-header bg-white fw-bold text-center py-3 border-bottom text-success">
                    <i class="fas fa-graduation-cap me-2"></i>Pendidikan Guru
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover align-middle mb-0">
                            <thead class="table-light"><tr><th class="ps-4">Pendidikan</th><th class="text-end pe-4">Jumlah</th></tr></thead>
                            <tbody>
                                <tr><td class="ps-4">Diploma</td><td class="text-end pe-4 fw-bold">${gd}</td></tr>
                                <tr><td class="ps-4">Sarjana</td><td class="text-end pe-4 fw-bold">${gs}</td></tr>
                            </tbody>
                            <tfoot class="table-light"><tr><td class="ps-4 fw-bold">Total</td><td class="text-end pe-4 fw-bold text-success">${totalGuru}</td></tr></tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row mb-5" data-aos="fade-up">
        <div class="col-12">
            <div class="card border-0 shadow-sm rounded-4 p-4">
                <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <h5 class="fw-bold text-primary m-0"><i class="fas fa-chart-line me-2"></i>Grafik Data Warga Belajar</h5>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <div id="filterKategoriContainer" style="display: block;">
                            <select id="filterKategoriPKBM" class="form-select form-select-sm border-secondary fw-bold" style="width: auto; min-width: 120px;">
                                <option value="semua">Tampilkan Semua</option>
                                <option value="siswa">Hanya Siswa Aktif</option>
                                <option value="lulusan">Hanya Lulusan</option>
                            </select>
                        </div>
                        <select id="filterTahunPKBM" class="form-select form-select-sm border-primary text-primary fw-bold" style="width: auto; min-width: 140px;">
                            <option value="all">Semua Tahun</option>
                        </select>
                    </div>
                </div>
                <div style="height: 400px; width: 100%;">
                    <canvas id="chartSiswaLulus"></canvas>
                </div>
            </div>
        </div>
    </div>`;

    container.innerHTML = html;

    // --- 6. INISIALISASI PLUGIN ---
    const carouselEl = document.getElementById('pkbmGallery');
    if(carouselEl && typeof bootstrap !== 'undefined') {
        new bootstrap.Carousel(carouselEl, { interval: 5000, wrap: true, pause: 'hover' });
    }

    if (typeof Chart === 'undefined') return;

    // Plugin Data Labels
    const dataLabelsPlugin = {
        id: 'dataLabelsPlugin',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (meta.hidden) return;
                meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    if (value === 0 || value === null || value === undefined) return;
                    ctx.font = `bold 11px sans-serif`;
                    ctx.textAlign = 'center';
                    let position = element.tooltipPosition();
                    ctx.textBaseline = 'bottom';
                    ctx.fillStyle = '#444'; 
                    ctx.fillText(value, position.x, position.y - 5);
                });
            });
            ctx.restore();
        }
    };

// --- 7. LOGIKA DATA UNTUK GRAFIK (FILTERING) ---
    // Skip baris pertama (index 0) dan ambil 5 baris berikutnya
    const filteredListForChart = list.slice(1, 6);

    let mainChartInstance = null;
    const selectFilterTahun = document.getElementById('filterTahunPKBM');
    const selectFilterKat = document.getElementById('filterKategoriPKBM');
    const containerFilterKat = document.getElementById('filterKategoriContainer');

    const colors = {
        siswa: {
            A: { bg: 'rgba(99, 102, 241, 0.8)', border: '#6366f1' },
            B: { bg: 'rgba(79, 70, 229, 0.6)', border: '#4f46e5' },
            C: { bg: 'rgba(129, 140, 248, 0.5)', border: '#818cf8' }
        },
        lulusan: {
            A: { bg: 'rgba(245, 158, 11, 0.8)', border: '#f59e0b' },
            B: { bg: 'rgba(234, 88, 12, 0.7)', border: '#ea580c' },
            C: { bg: 'rgba(239, 68, 68, 0.6)', border: '#ef4444' }
        }
    };

    const renderMainChart = (tahunVal, kategoriVal) => {
        const ctx = document.getElementById('chartSiswaLulus').getContext('2d');
        if (mainChartInstance) mainChartInstance.destroy();

        let labels = [];
        let datasets = [];

        if (tahunVal === 'all') {
            // Gunakan data yang sudah difilter (index 1-5)
            labels = filteredListForChart.map(item => item.tahun);

            const createDataset = (label, data, colorInfo) => ({
                label: label, data: data, backgroundColor: colorInfo.bg,
                borderColor: colorInfo.border, borderWidth: 1, borderRadius: 4
            });

            if (kategoriVal === 'semua' || kategoriVal === 'siswa') {
                datasets.push(createDataset('Paket A', filteredListForChart.map(i => parseInt(i.siswa_a)||0), colors.siswa.A));
                datasets.push(createDataset('Paket B', filteredListForChart.map(i => parseInt(i.siswa_b)||0), colors.siswa.B));
                datasets.push(createDataset('Paket C', filteredListForChart.map(i => parseInt(i.siswa_c)||0), colors.siswa.C));
            }
            if (kategoriVal === 'semua' || kategoriVal === 'lulusan') {
                datasets.push(createDataset('Lulusan A', filteredListForChart.map(i => parseInt(i.lulus_a)||0), colors.lulusan.A));
                datasets.push(createDataset('Lulusan B', filteredListForChart.map(i => parseInt(i.lulus_b)||0), colors.lulusan.B));
                datasets.push(createDataset('Lulusan C', filteredListForChart.map(i => parseInt(i.lulus_c)||0), colors.lulusan.C));
            }
        } else {
            // Cari data hanya di dalam filteredListForChart
            const item = filteredListForChart.find(d => d.tahun == tahunVal);
            labels = ['Paket A (SD)', 'Paket B (SMP)', 'Paket C (SMA)'];
            if (item) {
                datasets.push({
                    label: 'Siswa Aktif',
                    data: [parseInt(item.siswa_a)||0, parseInt(item.siswa_b)||0, parseInt(item.siswa_c)||0],
                    backgroundColor: colors.siswa.A.bg, borderColor: colors.siswa.A.border, borderWidth: 1
                });
                datasets.push({
                    label: 'Lulusan',
                    data: [parseInt(item.lulus_a)||0, parseInt(item.lulus_b)||0, parseInt(item.lulus_c)||0],
                    backgroundColor: colors.lulusan.A.bg, borderColor: colors.lulusan.A.border, borderWidth: 1
                });
            }
        }
        mainChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { 
                    y: { beginAtZero: true, grid: { borderDash: [2, 2] } },
                    x: { grid: { display: false } }
                }
            },
            plugins: [dataLabelsPlugin]
        });
    };

    // --- 8. SETUP FILTER ---
    if (selectFilterTahun) {
        const uniqueYears = [...new Set(list.map(item => item.tahun).filter(t => t))].sort((a, b) => b - a);
        uniqueYears.forEach(year => {
            let option = document.createElement('option');
            option.value = year; option.text = year;
            selectFilterTahun.appendChild(option);
        });

        selectFilterTahun.addEventListener('change', function() {
            if (this.value === 'all') {
                containerFilterKat.style.display = 'block';
                renderMainChart('all', selectFilterKat.value);
            } else {
                containerFilterKat.style.display = 'none';
                renderMainChart(this.value, 'semua');
            }
        });

        selectFilterKat.addEventListener('change', function() {
            if (selectFilterTahun.value === 'all') renderMainChart('all', this.value);
        });

        renderMainChart('all', 'semua');
    }
}

// ==========================================
// RENDER HALAMAN KLINIK (FINAL: DENGAN RASIO & TABEL)
// ==========================================
function renderKlinik(list) {
    const container = document.getElementById('klinik-content-area');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-5">Data Klinik belum tersedia di Database.</div>';
        return;
    }

    // 1. Inisialisasi Modal Galeri
    if (typeof initGalleryModal === 'function') {
        initGalleryModal();
    }

    // --- 2. PERSIAPAN DATA ---
    const mainData = list[0]; 

    // A. Data Tenaga Medis (Gender)
    let ml = parseInt(mainData.medis_laki) || 0;
    let mp = parseInt(mainData.medis_perempuan) || 0;
    let totalMedis = ml + mp;

    // B. Data Profesi Medis
    let dok = parseInt(mainData.profesi_dokter) || 0;
    let per = parseInt(mainData.profesi_perawat) || 0;
    let ag = parseInt(mainData.ahli_gizi) || 0; 
    let totalProfesi = dok + per + ag;

    // C. Data ABH & Hitung Rasio
    // Membaca kolom 'jumlah_abh'. Jika kosong/tidak ada, default ke 0.
    let totalABH = parseInt(mainData.jumlah_abh) || 0; 
    
    // Hitung Rasio (1 Medis : X ABH)
    let ratioText = "Data Belum Lengkap";
    if (totalMedis > 0 && totalABH > 0) {
        let ratioVal = Math.round(totalABH / totalMedis);
        ratioText = `1 : ${ratioVal}`;
    } else if (totalMedis > 0 && totalABH === 0) {
        ratioText = "-"; // ABH belum diisi
    }

// --- 3. FILTER DATA UNTUK GRAFIK (Skip Baris 1, Ambil 5 Baris Berikutnya) ---
    const filteredListForStats = list.slice(1, 6); // Ambil index 1 sampai 5
    const hasMultiYear = filteredListForStats.length > 1;

    const monthKeys = [
        { key: 'stats_jan', label: 'Jan' }, { key: 'stats_feb', label: 'Feb' },
        { key: 'stats_mar', label: 'Mar' }, { key: 'stats_apr', label: 'Apr' },
        { key: 'stats_mei', label: 'Mei' }, { key: 'stats_jun', label: 'Jun' },
        { key: 'stats_juli', label: 'Jul' }, { key: 'stats_agust', label: 'Agu' },
        { key: 'stats_sep', label: 'Sep' }, { key: 'stats_okt', label: 'Okt' },
        { key: 'stats_nov', label: 'Nov' }, { key: 'stats_des', label: 'Des' }
    ];

    const yearColors = ['#dc3545', '#0d6efd', '#198754', '#ffc107', '#6610f2', '#fd7e14'];
    let monthlyDatasets = [];
    let yearlyLabels = [];
    let yearlyData = [];

    filteredListForStats.forEach((row, index) => {
        let yearLabel = row.tahun ? String(row.tahun) : `Tahun ${index + 1}`;
        let yearMonthlyData = [];
        let yearTotal = 0;

        monthKeys.forEach(m => {
            let val = parseInt(row[m.key]) || 0;
            yearMonthlyData.push(val);
            yearTotal += val;
        });

        monthlyDatasets.push({
            label: yearLabel,
            data: yearMonthlyData,
            borderColor: hasMultiYear ? yearColors[index % yearColors.length] : '#dc3545',
            backgroundColor: hasMultiYear ? yearColors[index % yearColors.length] : 'rgba(220, 53, 69, 0.7)',
            borderWidth: 2,
            tension: 0.3, 
            fill: !hasMultiYear 
        });

        yearlyLabels.push(yearLabel);
        yearlyData.push(yearTotal);
    });

    let logoUrl = fixGoogleDriveImage(mainData.logo);
    let html = '';

    // --- 3. LAYOUT: DESKRIPSI & SOP ---
    html += `
    <div class="row g-4 mb-5">
        <div class="col-lg-8" data-aos="fade-right">
            <div class="card h-100 border-0 shadow-sm rounded-4 p-4">
                <h4 class="fw-bold text-success mb-3"><i class="fas fa-stethoscope me-2"></i>Tentang Klinik</h4>
                <p class="text-secondary lh-lg mb-4" style="text-align: justify;">
                    ${mainData.deskripsi ? mainData.deskripsi.replace(/\n/g, '<br>') : 'Deskripsi belum tersedia.'}
                </p>
                <div class="d-flex flex-wrap gap-3">
                     <div class="bg-light px-3 py-2 rounded text-warning fw-bold">
                        <i class="fas fa-clock me-2"></i> Layanan 24 Jam
                     </div>
                     <div class="bg-light px-3 py-2 rounded text-warning fw-bold">
                        <i class="fas fa-user-md me-2"></i> Tenaga Profesional
                     </div>
                </div>
            </div>
        </div>
        
        <div class="col-lg-4" data-aos="fade-left">
            <div class="card h-100 border-0 shadow-sm rounded-4 p-4 bg-success text-white position-relative overflow-hidden d-flex flex-column justify-content-center">
                
                ${logoUrl ? `
                <div class="text-center mb-3 position-relative" style="z-index: 2;">
                    <div class="d-inline-block bg-white p-3 rounded-circle shadow-sm">
                        <img src="${logoUrl}" style="width: 160px; height: 160px; object-fit: contain;" alt="Logo Klinik">
                    </div>
                </div>` : ''}

                <div class="text-center position-relative mb-4" style="z-index: 2;">
                    <h5 class="fw-bold mb-1 ls-1">${mainData.nama_klinik || 'KLINIK PRATAMA'}</h5>
                    <h6 class="fw-bold mb-2 ls-1 opacity-75">LPKA KLAS I KUTOARJO</h6>
                    
                    <span class="badge bg-warning text-dark fw-bold mb-3 px-3 py-2 rounded-pill">
                        <i class="fas fa-star me-1"></i> ${mainData.akreditasi || 'Terakreditasi B'}
                    </span>
                    <div style="width: 60px; height: 3px; background: #fff; margin: 0 auto;"></div>
                </div>

                <div class="d-grid gap-3 position-relative px-2" style="z-index: 2;">
                    
                    <a href="javascript:void(0);" onclick="openDocPreview('Badan Hukum', '${mainData.url_badan_hukum || ''}')" class="btn btn-outline-light text-start py-2 hover-scale border-opacity-50">
                        <div class="d-flex align-items-center">
                            <div class="bg-white bg-opacity-25 rounded-circle p-2 me-3" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-balance-scale fs-5"></i>
                            </div>
                            <div class="lh-sm overflow-hidden">
                                <small class="d-block text-white-50" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">Badan Hukum</small>
                                <span class="fw-bold small text-truncate d-block">${mainData.dasar_hukum || '-'}</span>
                            </div>
                        </div>
                    </a>
                    <a href="javascript:void(0);" onclick="openDocPreview('Surat Keputusan', '${mainData.url_sk || ''}')" class="btn btn-outline-light text-start py-2 hover-scale border-opacity-50">
                        <div class="d-flex align-items-center">
                            <div class="bg-white bg-opacity-25 rounded-circle p-2 me-3" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-file-contract fs-5"></i>
                            </div>
                            <div class="lh-sm overflow-hidden">
                                <small class="d-block text-white-50" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">Surat Keputusan</small>
                                <span class="fw-bold small text-truncate d-block">${mainData.sk || '-'}</span>
                            </div>
                        </div>
                    </a>

                    <a href="javascript:void(0);" onclick="openDocPreview('Standar Operasional Prosedur', '${mainData.url_sop || ''}')" class="btn btn-warning text-dark text-start py-2 hover-scale border-0 shadow-sm">
                        <div class="d-flex align-items-center">
                            <div class="bg-white bg-opacity-25 rounded-circle p-2 me-3" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-book-reader fs-5"></i>
                            </div>
                            <div class="lh-sm overflow-hidden">
                                <span class="fw-bold small text-truncate d-block">${mainData.sop || 'Dokumen SOP'}</span>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;

    // --- 4. LAYOUT: GALERI ---
    const galeriData = (typeof globalData !== 'undefined' && globalData.galeri_klinik) ? globalData.galeri_klinik : [];
    if (typeof renderGalleryMarquee === 'function') {
        html += renderGalleryMarquee(galeriData, "Fasilitas & Kegiatan Klinik", "klinikGallery", "success");
    }

    // --- 5. LAYOUT: STATISTIK ---
    html += `
    <h4 class="fw-bold text-center text-dark mb-4 mt-5" data-aos="fade-up">Statistik & Kapasitas Medis</h4>
    
    <div class="row g-4 mb-5 justify-content-center">
        <div class="col-md-6 col-lg-4" data-aos="zoom-in" data-aos-delay="100">
            <div class="card border-0 shadow-sm rounded-4 h-100">
                <div class="card-header bg-white fw-bold text-center py-3 border-bottom text-primary">
                    <i class="fas fa-venus-mars me-2"></i>Komposisi Gender
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Gender</th>
                                    <th class="text-end pe-4">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="ps-4">Laki-Laki</td>
                                    <td class="text-end pe-4 fw-bold">${ml}</td>
                                </tr>
                                <tr>
                                    <td class="ps-4">Perempuan</td>
                                    <td class="text-end pe-4 fw-bold">${mp}</td>
                                </tr>
                            </tbody>
                            <tfoot class="table-light">
                                <tr>
                                    <td class="ps-4 fw-bold">Total Medis</td>
                                    <td class="text-end pe-4 fw-bold text-primary">${totalMedis}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-6 col-lg-4" data-aos="zoom-in" data-aos-delay="150">
            <div class="card border-0 shadow-sm rounded-4 h-100">
                <div class="card-header bg-white fw-bold text-center py-3 border-bottom text-success">
                    <i class="fas fa-user-nurse me-2"></i>Data Profesi
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Profesi</th>
                                    <th class="text-end pe-4">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="ps-4">Dokter</td>
                                    <td class="text-end pe-4 fw-bold">${dok}</td>
                                </tr>
                                <tr>
                                    <td class="ps-4">Perawat</td>
                                    <td class="text-end pe-4 fw-bold">${per}</td>
                                </tr>
                                <tr>
                                    <td class="ps-4">Ahli Gizi</td>
                                    <td class="text-end pe-4 fw-bold">${ag}</td>
                                </tr>
                            </tbody>
                            <tfoot class="table-light">
                                <tr>
                                    <td class="ps-4 fw-bold">Total</td>
                                    <td class="text-end pe-4 fw-bold text-success">${totalProfesi}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-6 col-lg-4" data-aos="zoom-in" data-aos-delay="200">
            <div class="card border-0 shadow-sm rounded-4 h-100">
                <div class="card-header bg-white fw-bold text-center py-3 border-bottom text-warning">
                    <i class="fas fa-users me-2"></i>Rasio Pelayanan
                </div>
                <div class="card-body p-3">
                    <div style="height: 220px; position: relative;">
                        <canvas id="chartRatioAbh"></canvas>
                    </div>
                    
                    <div class="text-center mt-3 pt-3 border-top">
                        <h4 class="fw-bold text-dark mb-0">${ratioText}</h4>
                        <small class="text-muted fw-bold">Rasio (Tenaga Medis : Warga Binaan)</small>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-12 col-lg-8" data-aos="zoom-in" data-aos-delay="250">
            <div class="card border-0 shadow-sm rounded-4 h-100">
                <div class="card-header bg-white fw-bold text-center py-3 border-bottom text-danger">
                    <h5 class="fw-bold text-danger m-0"><i class="fas fa-chart-line me-2"></i>Tren Kunjungan Pasien</h5>
                </div>
                <div class="card-body p-4">
                    <div style="height: 300px; width: 100%;">
                        <canvas id="chartKunjungan"></canvas>
                    </div>
                </div>
            </div>
        </div>

        ${hasMultiYear ? `
        <div class="col-md-12 col-lg-8" data-aos="fade-up" data-aos-delay="300">
            <div class="card border-0 shadow-sm rounded-4 h-100">
                <div class="card-header bg-white fw-bold text-center py-3 border-bottom text-dark">
                    <i class="fas fa-calendar-alt me-2"></i>Total Kunjungan Per Tahun
                </div>
                <div class="card-body p-4">
                    <div style="height: 300px; width: 100%;">
                        <canvas id="chartTahunan"></canvas>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
    </div>`;

    container.innerHTML = html;

    // --- 6. INISIALISASI ---
    const carouselEl = document.getElementById('klinikGallery');
    if(carouselEl && typeof bootstrap !== 'undefined') {
        new bootstrap.Carousel(carouselEl, { interval: 8000, wrap: true, pause: 'hover' });
    }

    if (typeof Chart === 'undefined') return;

    // Plugin Angka
    const dataLabelsPlugin = {
        id: 'dataLabelsPlugin',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (meta.hidden) return;
                meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    if (value === 0 || value == null) return;
                    
                    const fontSize = 12;
                    ctx.font = `bold ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
                    ctx.textAlign = 'center';
                    let position = element.tooltipPosition();

                    if (meta.type === 'doughnut' || meta.type === 'pie') {
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#fff';
                        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                        ctx.lineWidth = 2;
                        ctx.strokeText(value, position.x, position.y);
                        ctx.fillText(value, position.x, position.y);
                    } else if (meta.type === 'bar') {
                        ctx.textBaseline = 'bottom';
                        ctx.fillStyle = '#000';
                        ctx.fillText(value, position.x, position.y - 5);
                    } else if (meta.type === 'line') {
                        ctx.textBaseline = 'bottom';
                        ctx.fillStyle = dataset.borderColor;
                        ctx.fillText(value, position.x, position.y - 8);
                    }
                });
            });
            ctx.restore();
        }
    };

    // Chart: Rasio Medis vs ABH
    new Chart(document.getElementById('chartRatioAbh').getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Tenaga Medis', 'Warga Binaan (ABH)'],
            datasets: [{
                data: [totalMedis, totalABH],
                backgroundColor: ['#0d6efd', '#fd7e14'], 
                hoverOffset: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} Orang`;
                        }
                    }
                } 
            } 
        },
        plugins: [dataLabelsPlugin]
    });

    // Chart: Kunjungan
    new Chart(document.getElementById('chartKunjungan').getContext('2d'), {
        type: hasMultiYear ? 'line' : 'bar',
        data: {
            labels: monthKeys.map(m => m.label),
            datasets: monthlyDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 25 } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                x: { grid: { display: true } }
            },
            plugins: {
                legend: { display: hasMultiYear, position: 'top' }
            }
        },
        plugins: [dataLabelsPlugin]
    });

    // Chart: Tahunan
    const chartTahunanEl = document.getElementById('chartTahunan');
    if (chartTahunanEl) {
        new Chart(chartTahunanEl.getContext('2d'), {
            type: 'bar',
            data: {
                labels: yearlyLabels,
                datasets: [{
                    label: 'Total Kunjungan',
                    data: yearlyData,
                    backgroundColor: yearColors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 25 } },
                scales: {
                    y: { beginAtZero: true },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            },
            plugins: [dataLabelsPlugin]
        });
    }
}
function renderGalleryMarquee(list, title, sliderId, accentColor) {
    if (!list || list.length === 0) return '';
    
    // VALIDASI WARNA:
    // Jika accentColor adalah 'primary', kita ambil warna biru bootstrap.
    // Jika tidak, kita gunakan warna yang dilempar atau default ke biru.
    let finalColor = accentColor;
    if (accentColor === 'primary') finalColor = '#0d6efd'; 
    if (accentColor === 'success') finalColor = '#198754';
    if (accentColor === 'info') finalColor = '#0dcaf0';

    const marqueeList = [...list, ...list]; 
    let cardsHtml = '';

    marqueeList.forEach((item) => {
        const imgRaw = item.ImageURL || item.gambar || item.link;
        const img = typeof fixGoogleDriveImage === 'function' ? fixGoogleDriveImage(imgRaw) : imgRaw;
        const safeTitle = (item.Title || item.judul || "").replace(/"/g, '&quot;');
        
// Cuplikan perubahan di dalam loop forEach:
cardsHtml += `
<div class="marquee-card shadow-sm" 
     onclick="openModal('${img}', '${safeTitle}', '${(item.Description || item.deskripsi || "").replace(/'/g, "\\'")}', '${item.Link || ""}')">
    <div class="marquee-img-box">
        <img src="${img}" class="marquee-img" alt="${safeTitle}" loading="lazy">
        <div class="marquee-overlay">
            <span class="detail-btn"><i class="fas fa-search-plus"></i></span>
        </div>
    </div>
    <div class="marquee-body text-center">
        <h6 class="marquee-title m-0">${item.Title || item.judul}</h6>
    </div>
</div>`;
    });

    return `
    <div class="container-fluid py-4 marquee-section">
        <div class="d-flex align-items-center mb-4 px-3">
            <i class="fas fa-images me-3" style="color: ${finalColor} !important; font-size: 1.5rem;"></i>
            
            <h5 class="fw-bold m-0 marquee-main-title" style="color: ${finalColor} !important; text-transform: uppercase; letter-spacing: 1px;">
                ${title}
            </h5>
            
            <div class="ms-3 flex-grow-1" style="height: 2px; background: linear-gradient(to right, ${finalColor}60, transparent);"></div>
        </div>

        <div class="marquee-viewport">
            <div class="marquee-track" id="${sliderId}">
                ${cardsHtml}
            </div>
        </div>
    </div>`;
}

/**
 * Fungsi untuk membuka popup galeri
 */
function openModal(img, title, desc, link) {
    // 1. Ambil elemen modal
    const modalImg = document.getElementById('modalImg');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalFooter = document.getElementById('modalFooter');

    // 2. Isi konten modal
    modalImg.src = img;
    modalTitle.innerText = title;
    modalDesc.innerHTML = desc || "Tidak ada deskripsi tambahan untuk kegiatan ini.";
    
    // 3. Tambahkan tombol link jika ada
    if (link && link.trim() !== "") {
        modalFooter.innerHTML = `<a href="${link}" target="_blank" class="btn btn-primary rounded-pill px-4">Lihat Selengkapnya</a>`;
    } else {
        modalFooter.innerHTML = "";
    }

    // 4. Tampilkan modal menggunakan Bootstrap
    const myModal = new bootstrap.Modal(document.getElementById('galleryModal'));
    myModal.show();
}

// ==========================================
// 5. MODAL PREVIEW (WAJIB ADA)
// ==========================================
function initGalleryModal() {
    if (!document.getElementById('galleryPreviewModal')) {
        const modalHtml = `
        <div class="modal fade" id="galleryPreviewModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 rounded-4 overflow-hidden shadow-lg">
                    <div class="modal-header border-0 position-absolute top-0 end-0 p-3" style="z-index: 10;">
                        <button type="button" class="btn-close bg-white rounded-circle p-2 opacity-100 shadow-sm" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="row g-0">
                            <div class="col-md-7 bg-black d-flex align-items-center justify-content-center" style="min-height: 400px; background-color: #000;">
                                <img id="gp-image" src="" class="img-fluid" style="max-height: 80vh;" alt="Preview">
                            </div>
                            <div class="col-md-5 bg-white p-4 d-flex flex-column justify-content-center">
                                <h4 id="gp-title" class="fw-bold text-primary mb-3">Judul Foto</h4>
                                <div style="width: 50px; height: 3px; background: #FFD700; margin-bottom: 20px;"></div>
                                <div style="max-height: 300px; overflow-y: auto;">
                                    <p id="gp-desc" class="text-secondary lh-lg mb-0">Deskripsi...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

function showFullGalleryPreview(img, title, desc) {
    const modalEl = document.getElementById('galleryPreviewModal');
    if (!modalEl) {
        initGalleryModal();
        setTimeout(() => showFullGalleryPreview(img, title, desc), 100);
        return;
    }
    
    document.getElementById('gp-image').src = img;
    document.getElementById('gp-title').innerText = title;
    document.getElementById('gp-desc').innerHTML = desc;
    
    if (typeof bootstrap !== 'undefined') {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }
}

// --- FUNGSI HELPER PERBAIKAN LINK GAMBAR GOOGLE DRIVE (VERSI FIX) ---
function fixGoogleDriveImage(url) {
    if (!url || typeof url !== 'string') return "";
    
    // Regex untuk menangkap ID Google Drive (support berbagai format link)
    const match = url.match(/(?:d\/|id=|file\/d\/)([-\w]{25,})/);
    
    if (match && match[1]) {
        // PERBAIKAN: Menggunakan format lh3.googleusercontent.com yang lebih stabil
        // Pastikan tanda dollar ($) dan kurung kurawal ({}) tertulis benar
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    
    return url; 
}

// Jalankan saat dokumen siap
document.addEventListener('DOMContentLoaded', loadData);
