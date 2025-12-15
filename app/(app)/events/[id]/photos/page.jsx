import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type ModerationStatus = "pending" | "approved" | "rejected";

type PhotoItem = {
  photoId: string;
  url: string;
  byUsername?: string | null;
  uploadedAt?: string | null;
  status: ModerationStatus;
  reviewNote?: string;
};

const API_BASE = "https://api.nightvibe.life";

function getAuthHeader() {
  // Ajusta esto a tu panel: token en localStorage, cookie, etc.
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiJson<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...getAuthHeader(),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${txt}`);
  }
  return res.json();
}

export default function EventPhotosModerationPage() {
  const router = useRouter();
  const eventId = useMemo(() => String(router.query.id || ""), [router.query.id]);

  const [tab, setTab] = useState<ModerationStatus>("pending");
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PhotoItem | null>(null);
  const [note, setNote] = useState("");

  async function load(status: ModerationStatus) {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<{ photos: PhotoItem[] }>(
        `${API_BASE}/api/events/${eventId}/photos/moderation?status=${status}`
      );
      setItems(data.photos || []);
    } catch (e: any) {
      setError(e?.message || "Error cargando fotos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!eventId) return;
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, tab]);

  async function approve(photo: PhotoItem) {
    setLoading(true);
    setError(null);
    try {
      await apiJson(
        `${API_BASE}/api/events/${eventId}/photos/${photo.photoId}/approve`,
        {
          method: "POST",
          body: JSON.stringify({ reviewNote: note || "" }),
        }
      );
      setSelected(null);
      setNote("");
      await load(tab);
    } catch (e: any) {
      setError(e?.message || "Error aprobando");
    } finally {
      setLoading(false);
    }
  }

  async function reject(photo: PhotoItem) {
    setLoading(true);
    setError(null);
    try {
      await apiJson(
        `${API_BASE}/api/events/${eventId}/photos/${photo.photoId}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ reviewNote: note || "" }),
        }
      );
      setSelected(null);
      setNote("");
      await load(tab);
    } catch (e: any) {
      setError(e?.message || "Error rechazando");
    } finally {
      setLoading(false);
    }
  }

  async function remove(photo: PhotoItem) {
    if (!confirm("¿Eliminar esta foto definitivamente?")) return;
    setLoading(true);
    setError(null);
    try {
      await apiJson(
        `${API_BASE}/api/events/${eventId}/photos/${photo.photoId}`,
        { method: "DELETE" }
      );
      setSelected(null);
      await load(tab);
    } catch (e: any) {
      setError(e?.message || "Error eliminando");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Validación de fotos</h1>
        <span style={{ opacity: 0.6 }}>Evento: {eventId}</span>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {(["pending", "approved", "rejected"] as ModerationStatus[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: tab === t ? "#111827" : "white",
              color: tab === t ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            {t === "pending"
              ? "Pendientes"
              : t === "approved"
              ? "Aprobadas"
              : "Rechazadas"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 12, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 16, opacity: loading ? 0.6 : 1 }}>
        {loading && items.length === 0 ? (
          <div>Cargando...</div>
        ) : items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>
            No hay fotos en esta pestaña.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {items.map((p) => (
              <button
                key={p.photoId}
                onClick={() => {
                  setSelected(p);
                  setNote(p.reviewNote || "");
                }}
                style={{
                  textAlign: "left",
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ width: "100%", height: 220, background: "#f3f4f6" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt="photo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    loading="lazy"
                  />
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>
                    @{p.byUsername || "usuario"}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: 13 }}>
                    {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : ""}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                    Estado: {p.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(980px, 100%)",
              background: "white",
              borderRadius: 18,
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
            }}
          >
            <div style={{ background: "#0b0f19" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt="selected"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                @{selected.byUsername || "usuario"}
              </div>

              <label style={{ fontSize: 13, opacity: 0.7 }}>Nota (opcional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 10,
                  resize: "vertical",
                }}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {selected.status !== "approved" && (
                  <button
                    onClick={() => approve(selected)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #111827",
                      background: "#111827",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    ✅ Aprobar
                  </button>
                )}
                {selected.status !== "rejected" && (
                  <button
                    onClick={() => reject(selected)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    ❌ Rechazar
                  </button>
                )}
                <button
                  onClick={() => remove(selected)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #ef4444",
                    background: "white",
                    color: "#ef4444",
                    cursor: "pointer",
                    marginLeft: "auto",
                  }}
                >
                  🗑 Eliminar
                </button>
              </div>

              <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.6 }}>
                photoId: {selected.photoId}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
