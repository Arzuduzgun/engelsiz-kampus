import { useEffect, useState } from 'react';

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

const BUILDING_DETAILS: Record<string, { icon: string; color: string; info: string }> = {
  A: { icon: 'bi-building-gear', color: '#2563eb', info: 'Ana girişte tekerlekli sandalye rampası ve tüm katlara erişen geniş asansör mevcuttur.' },
  B: { icon: 'bi-book', color: '#0891b2', info: 'Otomatik sensörlü giriş kapısı, rampa ve kat asansörleri aktiftir.' },
  C: { icon: 'bi-cup-hot', color: '#ea580c', info: 'Zemin kat düz ayak girişlidir; engelli kullanımına uygun geniş geçiş koridorları bulunur.' },
  D: { icon: 'bi-bank', color: '#4f46e5', info: 'Ön cephede eğimi standartlara uygun rampa ve yönetici katlarına asansör erişimi vardır.' },
  E: { icon: 'bi-trophy', color: '#16a34a', info: 'Tribün ve soyunma odası katlarına rampa ile engelsiz ulaşım sağlanmaktadır.' },
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

  // Bina detay modalı
  const [selectedBuilding, setSelectedBuilding] = useState<NodeItem | null>(null);

  // Yönetici paneli state'leri
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [edgeStart, setEdgeStart] = useState('A');
  const [edgeEnd, setEdgeEnd] = useState('B');
  const [edgeDistance, setEdgeDistance] = useState(100);
  const [edgeAccessible, setEdgeAccessible] = useState(true);
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

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
      .catch(() => setErrorMsg('Sunucuya bağlanılamadı. Backend (port 3000) çalışıyor mu?'));
  }, []);

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
      setErrorMsg('Rota hesaplanırken bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // NFR-1: Web Speech API ile Türkçe sesli okuma
  const speakRoute = () => {
    if (!routeResult || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const stepsText = routeResult.path.map((p) => p.name).join(', ardından ');
    const modeText = routeResult.accessible ? 'Engelsiz rota hazır.' : 'En kısa rota hazır.';
    const utterance = new SpeechSynthesisUtterance(
      `${modeText} Toplam mesafe ${routeResult.totalDistance} metre. Güzergah: ${stepsText}.`,
    );
    utterance.lang = 'tr-TR';
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
        info: 'Alçak tabanlı engelli erişimine uygun kampüs ring otobüsleri durak platformuna sıfır yanaşmaktadır.',
      };
    }
    return {
      icon: 'bi-building',
      color: '#3b82f6',
      info: 'Bina girişinde erişilebilir rampa ve yönlendirme levhaları bulunmaktadır.',
    };
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Üst Başlık */}
      <header className="app-header text-center">
        <div className="container">
          <div className="d-inline-flex align-items-center gap-2 fs-4 fw-bold text-primary">
            <span className="badge bg-primary p-2">
              <i className="bi bi-person-wheelchair"></i>
            </span>
            <span>Engelsiz Rota</span>
          </div>
          <div className="mt-1">
            {activeTab === 'admin' && isAdminAuth ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setIsAdminAuth(false);
                  setActiveTab('rota');
                }}
              >
                Çıkış
              </button>
            ) : (
              <button
                className="btn btn-link btn-sm text-secondary text-decoration-underline p-0"
                onClick={() => setActiveTab('admin')}
              >
                Yönetici
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="container my-4 flex-grow-1" style={{ maxWidth: '880px' }}>
        {errorMsg && (
          <div className="alert alert-danger d-flex align-items-center justify-content-between">
            <span>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {errorMsg}
            </span>
            <button className="btn-close" onClick={() => setErrorMsg(null)}></button>
          </div>
        )}

        {/* 1. ROTA SEKMESİ */}
        {activeTab === 'rota' && !routeResult && (
          <div className="main-card">
            <div className="mb-3">
              <label className="form-label fw-semibold text-secondary">
                <i className="bi bi-geo-alt-fill text-danger me-1"></i> Neredesin?
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

            <div className="mb-3">
              <label className="form-label fw-semibold text-secondary">
                <i className="bi bi-flag-fill text-primary me-1"></i> Nereye?
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

            <div className="mb-4">
              <div
                className="border rounded p-3 d-inline-block bg-light"
                style={{ cursor: 'pointer' }}
                onClick={() => setAccessible(!accessible)}
              >
                <div className="form-check m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="accessibleCheck"
                    checked={accessible}
                    onChange={(e) => setAccessible(e.target.checked)}
                  />
                  <label className="form-check-label fw-bold ms-1" htmlFor="accessibleCheck">
                    Engelsiz Rota
                  </label>
                  <div className="small text-muted ms-1">Asansör / Rampa Kullan</div>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg w-100 fw-semibold"
              onClick={handleFindRoute}
              disabled={loading || nodes.length === 0}
            >
              {loading ? 'HESAPLANIYOR...' : 'ROTAYI GÖSTER'}
            </button>
          </div>
        )}

        {/* ROTA SONUÇ EKRANI */}
        {activeTab === 'rota' && routeResult && (
          <div className="main-card">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success fs-6">
                  <i className="bi bi-check-lg"></i>
                </span>
                <h4 className="m-0 fw-bold text-success">Rota Hazır!</h4>
                <span className="badge bg-light text-dark border ms-2">
                  Toplam: {routeResult.totalDistance} m
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={speakRoute}
                  title="Rotayı Sesli Dinle"
                >
                  <i className="bi bi-volume-up-fill fs-5"></i>
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setRouteResult(null);
                  }}
                  title="Kapat"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            <div className="py-2">
              {routeResult.path.map((step, idx) => (
                <div key={`${step.id}-${idx}`} className="timeline-step">
                  <span className="timeline-dot"></span>
                  <div className="fw-bold fs-6">{step.name}</div>
                  <div className="small text-muted">
                    {idx === 0
                      ? 'Başlangıç'
                      : idx === routeResult.path.length - 1
                        ? 'Varış'
                        : 'İlerle →'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. BİNALAR SEKMESİ */}
        {activeTab === 'binalar' && (
          <div>
            <div className="row g-3">
              {nodes.map((node) => {
                const meta = getBuildingMeta(node.id, node.name);
                return (
                  <div key={node.id} className="col-6 col-md-3">
                    <div
                      className="building-card p-3 text-center h-100 d-flex flex-column align-items-center justify-content-center"
                      onClick={() => setSelectedBuilding(node)}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                        style={{
                          width: '56px',
                          height: '56px',
                          backgroundColor: `${meta.color}15`,
                          color: meta.color,
                        }}
                      >
                        <i className={`bi ${meta.icon} fs-3`}></i>
                      </div>
                      <div className="fw-semibold small">{node.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedBuilding && (
              <div className="main-card mt-4 border-primary">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="fw-bold text-primary mb-1">{selectedBuilding.name}</h5>
                    <p className="mb-0 text-secondary">
                      {getBuildingMeta(selectedBuilding.id, selectedBuilding.name).info}
                    </p>
                  </div>
                  <button
                    className="btn-close"
                    onClick={() => setSelectedBuilding(null)}
                  ></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. YÖNETİCİ SEKMESİ */}
        {activeTab === 'admin' && !isAdminAuth && (
          <div className="main-card mx-auto" style={{ maxWidth: '420px' }}>
            <h5 className="fw-bold mb-3">
              <i className="bi bi-shield-lock text-primary me-2"></i>Yönetici Girişi
            </h5>
            {adminFeedback && (
              <div className={`alert alert-${adminFeedback.type} py-2`}>
                {adminFeedback.text}
              </div>
            )}
            <form onSubmit={handleAdminLogin}>
              <div className="mb-3">
                <label className="form-label">Yönetici Şifresi</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Şifre giriniz..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100 fw-semibold">
                GİRİŞ YAP
              </button>
            </form>
          </div>
        )}

        {activeTab === 'admin' && isAdminAuth && (
          <div className="main-card">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-tools text-primary me-2"></i>Yol Ekleme Sihirbazı
            </h5>
            {adminFeedback && (
              <div className={`alert alert-${adminFeedback.type} py-2`}>
                {adminFeedback.text}
              </div>
            )}
            <form onSubmit={handleAddEdge}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Başlangıç</label>
                <select
                  className="form-select"
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

              <div className="mb-3">
                <label className="form-label fw-semibold">Bitiş</label>
                <select
                  className="form-select"
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

              <div className="mb-3">
                <label className="form-label fw-semibold">Mesafe (m)</label>
                <input
                  type="number"
                  min={1}
                  className="form-control"
                  value={edgeDistance}
                  onChange={(e) => setEdgeDistance(Number(e.target.value))}
                  required
                />
              </div>

              <div className="mb-4">
                <div className="form-check border rounded p-2 px-3 d-inline-block bg-light">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="edgeAccCheck"
                    checked={edgeAccessible}
                    onChange={(e) => setEdgeAccessible(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold ms-1" htmlFor="edgeAccCheck">
                    Engelsiz Uygun
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-100 fw-semibold">
                KAYDET
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Alt Sekme Çubuğu */}
      <footer className="bottom-nav mt-auto">
        <div className="container d-flex justify-content-around" style={{ maxWidth: '600px' }}>
          <button
            className={`btn btn-link text-decoration-none d-flex flex-column align-items-center ${
              activeTab === 'rota' ? 'text-primary fw-bold' : 'text-secondary'
            }`}
            onClick={() => setActiveTab('rota')}
          >
            <i className="bi bi-map fs-5"></i>
            <span className="small">Rota</span>
          </button>

          <button
            className={`btn btn-link text-decoration-none d-flex flex-column align-items-center ${
              activeTab === 'binalar' ? 'text-primary fw-bold' : 'text-secondary'
            }`}
            onClick={() => setActiveTab('binalar')}
          >
            <i className="bi bi-buildings fs-5"></i>
            <span className="small">Binalar</span>
          </button>
        </div>
      </footer>
    </div>
  );
}