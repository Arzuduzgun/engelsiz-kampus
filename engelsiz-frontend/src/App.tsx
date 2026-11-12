import { useEffect, useMemo, useState } from 'react';

interface NodeItem {
  id: string;
  name: string;
}

interface RouteResult {
  path: NodeItem[];
  totalDistance: number;
  accessible: boolean;
}

const API_URL = 'http://localhost:3000';

const BUILDING_DETAILS: Record<
  string,
  { icon: string; color: string; features: string[]; info: string }
> = {
  A: {
    icon: 'bi-building-gear',
    color: '#2563eb',
    features: ['Rampa Mevcut', 'Geniş Asansör', 'Engelli WC'],
    info: 'Ana girişte standart eğimli tekerlekli sandalye rampası ve tüm katlara erişen sesli uyarılı asansör mevcuttur.',
  },
  B: {
    icon: 'bi-book',
    color: '#0891b2',
    features: ['Sensörlü Kapı', 'Kat Asansörü', 'Sesli Kaynak'],
    info: 'Otomatik sensörlü giriş kapısı, düz ayak okuma salonları ve tüm katlara asansör erişimi aktiftir.',
  },
  C: {
    icon: 'bi-cup-hot',
    color: '#ea580c',
    features: ['Düz Ayak Giriş', 'Geniş Koridor'],
    info: 'Zemin kat basamaksız düz ayak girişlidir; yemekhane ve kantin alanlarında geniş manevra koridorları bulunur.',
  },
  D: {
    icon: 'bi-bank',
    color: '#4f46e5',
    features: ['Ön Cephe Rampa', 'Asansör Erişimi'],
    info: 'Ön cephede korkuluklu erişim rampası ve idari birim katlarına doğrudan asansör erişimi vardır.',
  },
  E: {
    icon: 'bi-trophy',
    color: '#16a34a',
    features: ['Rampa Erişimi', 'Engelsiz Tribün'],
    info: 'Spor salonu tribün ve soyunma alanlarına rampa ile kesintisiz engelsiz ulaşım sağlanmaktadır.',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'rota' | 'binalar' | 'admin'>('rota');
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [fromNode, setFromNode] = useState('A');
  const [toNode, setToNode] = useState('C');
  const [accessible, setAccessible] = useState(true);

  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Binalar sekmesi filtreleme ve detay state'leri
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingFilter, setBuildingFilter] = useState<'all' | 'faculty' | 'stop'>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<NodeItem | null>(null);

  // Yönetici paneli state'leri
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [edgeStart, setEdgeStart] = useState('A');
  const [edgeEnd, setEdgeEnd] = useState('B');
  const [edgeDistance, setEdgeDistance] = useState(100);
  const [edgeAccessible, setEdgeAccessible] = useState(true);
  const [adminFeedback, setAdminFeedback] = useState<{
    type: 'success' | 'danger';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/route/nodes`)
      .then((res) => res.json())
      .then((data: NodeItem[]) => {
        setNodes(data);
        if (data.length >= 2) {
          setFromNode(data[0].id);
          setToNode(data[2]?.id ?? data[1].id);
          setEdgeStart(data[0].id);
          setEdgeEnd(data[1].id);
        }
      })
      .catch(() =>
        setErrorMsg('Sunucuya bağlanılamadı. Backend servisinin (port 3000) çalıştığından emin olun.'),
      );
  }, []);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isStop = node.name.toLowerCase().includes('otobüs');
      if (buildingFilter === 'stop') return matchesSearch && isStop;
      if (buildingFilter === 'faculty') return matchesSearch && !isStop;
      return matchesSearch;
    });
  }, [nodes, searchQuery, buildingFilter]);

  const handleSwapLocations = () => {
    setFromNode(toNode);
    setToNode(fromNode);
  };

  const handleFindRoute = async () => {
    setErrorMsg(null);
    if (fromNode === toNode) {
      setErrorMsg('Başlangıç ve bitiş noktası aynı olamaz.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/route?from=${encodeURIComponent(fromNode)}&to=${encodeURIComponent(toNode)}&accessible=${accessible}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setRouteResult(null);
        setErrorMsg(data.message ?? 'Belirtilen iki nokta arasında uygun bir rota bulunamadı.');
      } else {
        setRouteResult(data);
      }
    } catch {
      setErrorMsg('Rota hesaplanırken sunucu bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeakRoute = () => {
    if (!routeResult || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const stepsText = routeResult.path.map((p) => p.name).join(', ardından ');
    const modeText = routeResult.accessible ? 'Engelsiz rota hazır.' : 'En kısa rota hazır.';
    const utterance = new SpeechSynthesisUtterance(
      `${modeText} Toplam mesafe ${routeResult.totalDistance} metre. Güzergah: ${stepsText}.`,
    );
    utterance.lang = 'tr-TR';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
      setIsAdminAuth(true);
      setAdminPassword('');
      setAdminFeedback(null);
    } else {
      setAdminFeedback({ type: 'danger', text: 'Hatalı yönetici şifresi!' });
    }
  };

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFeedback(null);
    try {
      const res = await fetch(`${API_URL}/route/edge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_node_id: edgeStart,
          end_node_id: edgeEnd,
          distance: Number(edgeDistance),
          is_accessible: edgeAccessible,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminFeedback({ type: 'success', text: data.message ?? 'Yol Başarıyla Eklendi!' });
      } else {
        setAdminFeedback({ type: 'danger', text: data.message ?? 'Kayıt eklenemedi.' });
      }
    } catch {
      setAdminFeedback({ type: 'danger', text: 'Sunucu bağlantı hatası.' });
    }
  };

  const getBuildingMeta = (id: string, name: string) => {
    if (BUILDING_DETAILS[id]) return BUILDING_DETAILS[id];
    if (name.toLowerCase().includes('otobüs')) {
      return {
        icon: 'bi-bus-front',
        color: '#0284c7',
        features: ['Alçak Taban Uyumu', 'Düz Platform'],
        info: 'Alçak tabanlı engelli erişimine uygun kampüs ring otobüsleri durak platformuna sıfır yanaşmaktadır.',
      };
    }
    return {
      icon: 'bi-building',
      color: '#2563eb',
      features: ['Erişilebilir Giriş', 'Rampa Mevcut'],
      info: 'Bina ana girişinde erişilebilir rampa ve yüksek kontrastlı yönlendirme levhaları bulunmaktadır.',
    };
  };

  return (
    <div className="min-vh-100 pb-5">
      {/* Modern Hero Banner */}
      <header className="hero-banner">
        <div className="container" style={{ maxWidth: '880px' }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="brand-icon-box">
                <i className="bi bi-person-wheelchair"></i>
              </div>
              <div>
                <h1 className="h4 fw-bold mb-0 tracking-tight">Engelsiz Rota</h1>
                <p className="small mb-0 text-white-50">
                  Kastamonu Üniversitesi Erişilebilir Kampüs Navigasyonu
                </p>
              </div>
            </div>

            {activeTab === 'admin' && isAdminAuth && (
              <button
                className="btn btn-light btn-sm fw-semibold text-danger px-3 rounded-pill"
                onClick={() => {
                  setIsAdminAuth(false);
                  setActiveTab('rota');
                }}
              >
                <i className="bi bi-box-arrow-right me-1"></i> Çıkış
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Yüzen Ana Alan */}
      <main className="container floating-wrapper" style={{ maxWidth: '880px' }}>
        {/* Üst Hap Sekme Menüsü */}
        <div className="d-flex justify-content-center mb-4">
          <nav className="nav-pills-modern" aria-label="Ana Menü">
            <button
              className={`nav-btn ${activeTab === 'rota' ? 'active' : ''}`}
              onClick={() => setActiveTab('rota')}
            >
              <i className="bi bi-sign-turn-right-fill"></i>
              <span>Rota Bul</span>
            </button>

            <button
              className={`nav-btn ${activeTab === 'binalar' ? 'active' : ''}`}
              onClick={() => setActiveTab('binalar')}
            >
              <i className="bi bi-buildings-fill"></i>
              <span>Binalar ({nodes.length})</span>
            </button>

            <button
              className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <i className="bi bi-shield-lock-fill"></i>
              <span>Yönetici</span>
            </button>
          </nav>
        </div>

        {errorMsg && (
          <div className="alert alert-danger rounded-4 border-0 shadow-sm d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-circle-fill fs-5"></i>
              <span>{errorMsg}</span>
            </div>
            <button className="btn-close" onClick={() => setErrorMsg(null)}></button>
          </div>
        )}

        {/* 1. ROTA SORGULAMA EKRANI */}
        {activeTab === 'rota' && !routeResult && (
          <div className="glass-card">
            <div className="mb-4">
              <h2 className="h5 fw-bold mb-1">Nereye gitmek istiyorsunuz?</h2>
              <p className="text-muted small mb-0">
                Başlangıç ve varış noktanızı seçerek size en uygun kampüs güzergahını oluşturun.
              </p>
            </div>

            <div className="position-relative">
              {/* Başlangıç */}
              <div className="location-box mb-2">
                <label className="small fw-bold text-uppercase text-muted d-block mb-1">
                  <i className="bi bi-record-circle-fill text-success me-1"></i> Başlangıç Noktası
                </label>
                <select
                  className="form-select form-select-lg"
                  value={fromNode}
                  onChange={(e) => setFromNode(e.target.value)}
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Yer Değiştirme Butonu */}
              <div
                className="d-flex justify-content-end pe-3"
                style={{ marginTop: '-16px', marginBottom: '-16px', position: 'relative', zIndex: 5 }}
              >
                <button
                  type="button"
                  className="swap-btn"
                  onClick={handleSwapLocations}
                  title="Başlangıç ve Bitiş Noktalarını Değiştir"
                >
                  <i className="bi bi-arrow-down-up"></i>
                </button>
              </div>

              {/* Bitiş */}
              <div className="location-box mb-4">
                <label className="small fw-bold text-uppercase text-muted d-block mb-1">
                  <i className="bi bi-geo-alt-fill text-danger me-1"></i> Varış Noktası
                </label>
                <select
                  className="form-select form-select-lg"
                  value={toNode}
                  onChange={(e) => setToNode(e.target.value)}
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Erişilebilirlik Seçeneği */}
            <div
              className={`access-toggle-card mb-4 d-flex align-items-center justify-content-between ${
                accessible ? 'checked' : ''
              }`}
              onClick={() => setAccessible(!accessible)}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`rounded-3 d-flex align-items-center justify-content-center ${
                    accessible ? 'bg-primary text-white' : 'bg-light text-secondary'
                  }`}
                  style={{ width: '42px', height: '42px' }}
                >
                  <i className="bi bi-person-wheelchair fs-5"></i>
                </div>
                <div>
                  <div className="fw-bold">Engelsiz Rota Önceliği</div>
                  <div className="small text-muted">
                    Merdivenli yolları eler, yalnızca rampa ve asansörlü yolları kullanır
                  </div>
                </div>
              </div>
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input fs-4"
                  type="checkbox"
                  role="switch"
                  checked={accessible}
                  onChange={(e) => setAccessible(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <button
              className="btn btn-primary btn-cta w-100 text-white"
              onClick={handleFindRoute}
              disabled={loading || nodes.length === 0}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  ROTA HESAPLANIYOR...
                </>
              ) : (
                <>
                  <i className="bi bi-compass me-2"></i>
                  ROTAYI OLUŞTUR
                </>
              )}
            </button>
          </div>
        )}

        {/* ROTA SONUÇ EKRANI */}
        {activeTab === 'rota' && routeResult && (
          <div className="glass-card">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 mb-4 border-bottom">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1">
                    <i className="bi bi-check-circle-fill me-1"></i> Rota Hazır
                  </span>
                  <span
                    className={`badge rounded-pill px-3 py-1 ${
                      routeResult.accessible
                        ? 'bg-primary-subtle text-primary border border-primary-subtle'
                        : 'bg-secondary-subtle text-secondary'
                    }`}
                  >
                    {routeResult.accessible ? 'Engelsiz Güzergah' : 'Standart En Kısa Yol'}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-3 mt-2 text-muted small fw-semibold">
                  <span>
                    <i className="bi bi-rulers text-primary me-1"></i>
                    Mesafe: <strong className="text-dark">{routeResult.totalDistance} m</strong>
                  </span>
                  <span>•</span>
                  <span>
                    <i className="bi bi-clock text-primary me-1"></i>
                    Tahmini:{' '}
                    <strong className="text-dark">
                      ~{Math.max(1, Math.round(routeResult.totalDistance / 65))} dk
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    <i className="bi bi-geo text-primary me-1"></i>
                    {routeResult.path.length} Durak
                  </span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  className={`btn btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-2 ${
                    isSpeaking ? 'btn-primary speaking-pulse' : 'btn-outline-primary'
                  }`}
                  onClick={toggleSpeakRoute}
                >
                  <i className={`bi ${isSpeaking ? 'bi-stop-fill' : 'bi-volume-up-fill'} fs-6`}></i>
                  <span>{isSpeaking ? 'Durdur' : 'Sesli Dinle'}</span>
                </button>

                <button
                  className="btn btn-light btn-sm rounded-pill px-3 fw-semibold border"
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setIsSpeaking(false);
                    setRouteResult(null);
                  }}
                >
                  <i className="bi bi-arrow-left me-1"></i> Yeni Arama
                </button>
              </div>
            </div>

            {/* Modern Step Timeline */}
            <div className="timeline-modern py-2">
              {routeResult.path.map((step, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === routeResult.path.length - 1;
                return (
                  <div
                    key={`${step.id}-${idx}`}
                    className={`timeline-item ${isFirst ? 'start' : isLast ? 'end' : ''}`}
                  >
                    <span className="timeline-marker">
                      {isFirst ? (
                        <i className="bi bi-play-fill"></i>
                      ) : isLast ? (
                        <i className="bi bi-flag-fill"></i>
                      ) : (
                        idx
                      )}
                    </span>
                    <div className="p-3 rounded-3 bg-light border">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold text-dark">{step.name}</span>
                        <span className="badge bg-white text-secondary border">
                          {isFirst ? 'Başlangıç' : isLast ? 'Varış Noktası' : `${idx}. Ara Nokta`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. BİNALAR SEKMESİ */}
        {activeTab === 'binalar' && (
          <div>
            {/* Arama ve Kategori Filtreleri */}
            <div className="glass-card mb-4 p-3">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-6">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control bg-light border-start-0"
                      placeholder="Fakülte, birim veya durak ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12 col-md-6 d-flex justify-content-md-end gap-1 flex-wrap">
                  <button
                    className={`btn btn-sm rounded-pill px-3 ${
                      buildingFilter === 'all' ? 'btn-primary' : 'btn-light border'
                    }`}
                    onClick={() => setBuildingFilter('all')}
                  >
                    Tümü
                  </button>
                  <button
                    className={`btn btn-sm rounded-pill px-3 ${
                      buildingFilter === 'faculty' ? 'btn-primary' : 'btn-light border'
                    }`}
                    onClick={() => setBuildingFilter('faculty')}
                  >
                    Fakülte & Birimler
                  </button>
                  <button
                    className={`btn btn-sm rounded-pill px-3 ${
                      buildingFilter === 'stop' ? 'btn-primary' : 'btn-light border'
                    }`}
                    onClick={() => setBuildingFilter('stop')}
                  >
                    Otobüs Durakları
                  </button>
                </div>
              </div>
            </div>

            {/* Seçili Bina Detay Kartı */}
            {selectedBuilding && (
              <div className="glass-card mb-4 border-primary bg-white">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div className="d-flex gap-3">
                    <div
                      className="rounded-4 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: '56px',
                        height: '56px',
                        backgroundColor: `${getBuildingMeta(selectedBuilding.id, selectedBuilding.name).color}15`,
                        color: getBuildingMeta(selectedBuilding.id, selectedBuilding.name).color,
                      }}
                    >
                      <i
                        className={`bi ${getBuildingMeta(selectedBuilding.id, selectedBuilding.name).icon} fs-3`}
                      ></i>
                    </div>
                    <div>
                      <h3 className="h5 fw-bold mb-1">{selectedBuilding.name}</h3>
                      <p className="text-muted small mb-2">
                        {getBuildingMeta(selectedBuilding.id, selectedBuilding.name).info}
                      </p>
                      <div className="d-flex flex-wrap gap-1">
                        {getBuildingMeta(selectedBuilding.id, selectedBuilding.name).features.map(
                          (feat) => (
                            <span
                              key={feat}
                              className="badge bg-success-subtle text-success border border-success-subtle rounded-pill"
                            >
                              <i className="bi bi-check2 me-1"></i>
                              {feat}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex flex-column align-items-end gap-2">
                    <button
                      className="btn-close"
                      onClick={() => setSelectedBuilding(null)}
                    ></button>
                    <button
                      className="btn btn-primary btn-sm rounded-pill px-3 mt-2"
                      onClick={() => {
                        setToNode(selectedBuilding.id);
                        setRouteResult(null);
                        setActiveTab('rota');
                      }}
                    >
                      Buraya Rota Çiz
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bina Izgarası */}
            <div className="row g-3">
              {filteredNodes.map((node) => {
                const meta = getBuildingMeta(node.id, node.name);
                const isSelected = selectedBuilding?.id === node.id;
                return (
                  <div key={node.id} className="col-6 col-md-3">
                    <div
                      className={`campus-card text-center h-100 d-flex flex-column align-items-center justify-content-center ${
                        isSelected ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedBuilding(node)}
                    >
                      <div
                        className="rounded-4 d-flex align-items-center justify-content-center mb-2"
                        style={{
                          width: '54px',
                          height: '54px',
                          backgroundColor: `${meta.color}14`,
                          color: meta.color,
                        }}
                      >
                        <i className={`bi ${meta.icon} fs-3`}></i>
                      </div>
                      <div className="fw-semibold small text-dark">{node.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. YÖNETİCİ SEKMESİ */}
        {activeTab === 'admin' && !isAdminAuth && (
          <div className="glass-card mx-auto" style={{ maxWidth: '440px' }}>
            <div className="text-center mb-4">
              <div
                className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-2"
                style={{ width: '56px', height: '56px' }}
              >
                <i className="bi bi-shield-lock-fill fs-3"></i>
              </div>
              <h2 className="h5 fw-bold mb-1">Yönetici Erişimi</h2>
              <p className="text-muted small mb-0">
                Kampüs yol ve rampa verilerini güncellemek için doğrulama yapın.
              </p>
            </div>

            {adminFeedback && (
              <div className={`alert alert-${adminFeedback.type} rounded-3 py-2 small`}>
                {adminFeedback.text}
              </div>
            )}

            <form onSubmit={handleAdminLogin}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">Yönetici Şifresi</label>
                <input
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-cta w-100 text-white">
                OTURUM AÇ
              </button>
            </form>
          </div>
        )}

        {activeTab === 'admin' && isAdminAuth && (
          <div className="glass-card">
            <div className="mb-4">
              <h2 className="h5 fw-bold mb-1">
                <i className="bi bi-node-plus-fill text-primary me-2"></i>Yol Ekleme Sihirbazı
              </h2>
              <p className="text-muted small mb-0">
                İki kampüs noktası arasına yeni bir bağlantı yolu ve erişilebilirlik durumu tanımlayın.
              </p>
            </div>

            {adminFeedback && (
              <div className={`alert alert-${adminFeedback.type} rounded-3 py-2`}>
                {adminFeedback.text}
              </div>
            )}

            <form onSubmit={handleAddEdge}>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-secondary">Başlangıç Noktası</label>
                  <select
                    className="form-select form-select-lg"
                    value={edgeStart}
                    onChange={(e) => setEdgeStart(e.target.value)}
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold text-secondary">Bitiş Noktası</label>
                  <select
                    className="form-select form-select-lg"
                    value={edgeEnd}
                    onChange={(e) => setEdgeEnd(e.target.value)}
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">Mesafe (Metre)</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-lg"
                  value={edgeDistance}
                  onChange={(e) => setEdgeDistance(Number(e.target.value))}
                  required
                />
              </div>

              <div
                className={`access-toggle-card mb-4 d-flex align-items-center justify-content-between ${
                  edgeAccessible ? 'checked' : ''
                }`}
                onClick={() => setEdgeAccessible(!edgeAccessible)}
              >
                <div>
                  <div className="fw-bold">Engelsiz Kullanıma Uygun</div>
                  <div className="small text-muted">
                    Yol üzerinde rampa veya asansör varsa işaretli bırakın
                  </div>
                </div>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input fs-4"
                    type="checkbox"
                    role="switch"
                    checked={edgeAccessible}
                    onChange={(e) => setEdgeAccessible(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-cta w-100 text-white">
                <i className="bi bi-check2-circle me-2"></i>
                YOL VERİSİNİ KAYDET
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}