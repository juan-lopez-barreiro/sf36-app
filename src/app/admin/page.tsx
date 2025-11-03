"use client";

import React, { useEffect, useState } from "react";

type Row = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  timestamp: string;
  answers: any;
  scores: any;
  notes?: string | null;
};

export default function AdminPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/assessments?limit=200");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Error al cargar");
        setRows(json);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const exportCSV = () => {
    if (!rows?.length) return;

    const header = ["id","user_id","user_name","timestamp"];
    const esc = (v: any) => `"${String(v ?? "").replaceAll('"','""')}"`;
    const body = rows.map(r => [r.id, r.user_id, r.user_name, r.timestamp].map(esc).join(","));
    const csv = [header.join(","), ...body].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `assessments_${new Date().toISOString()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  };

  if (err) return <div style={{ padding: 16 }}>❌ Error: {err}</div>;
  if (!rows) return <div style={{ padding: 16 }}>Cargando…</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
        Evaluaciones ({rows.length})
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={exportCSV} style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 8 }}>
          Exportar CSV
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>Fecha</th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>Usuario</th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>Nombre</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>
                {new Date(r.timestamp).toLocaleString()}
              </td>
              <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>{r.user_id}</td>
              <td style={{ borderBottom: "1px solid #eee", padding: 6 }}>{r.user_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
