"use client";
import { supabase } from "@/lib/supabaseClient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import { Download, Save, User, FileText, BarChart2, History, Upload } from "lucide-react";

/**
 * SF-36/RAND‑36 (ES) – Plataforma de encuesta
 *
 * Notas:
 * - RAND‑36 en español (parafraseado). Si usas SF‑36 oficial, importa JSON con licencia.
 * - Puntuación 0–100 pre-mapeada; cada escala = media de ítems contestados.
 */

// ====== CUESTIONARIO ======
const QUESTIONNAIRE = {
  title: "SF-36/RAND-36 (ES) – Cuestionario de Salud",
  instructions: "Responde según tu situación en las últimas 4 semanas.",
  items: [
    { id: "S1", label: "En general, dirías que tu salud es:", options: [
      { label: "Excelente", value: 100 }, { label: "Muy buena", value: 75 }, { label: "Buena", value: 50 }, { label: "Regular", value: 25 }, { label: "Mala", value: 0 },
    ], scale: "GH" },
    { id: "S2", label: "Comparada con hace un año, ¿cómo dirías que es tu salud ahora?", options: [
      { label: "Mucho mejor", value: 100 }, { label: "Algo mejor", value: 75 }, { label: "Igual", value: 50 }, { label: "Algo peor", value: 25 }, { label: "Mucho peor", value: 0 },
    ], scale: null },
    ...[
      "actividades vigorosas (p. ej., correr, levantar objetos pesados)",
      "actividades moderadas (p. ej., mover una mesa, pasar la aspiradora)",
      "levantar o llevar bolsas de la compra",
      "subir varios tramos de escaleras",
      "subir un tramo de escaleras",
      "agacharte, arrodillarte o inclinarte",
      "caminar más de 1 kilómetro",
      "caminar varios cientos de metros",
      "caminar 100 metros",
      "bañarte o vestirte por ti mismo/a",
    ].map((txt, i) => ({ id: `S${3 + i}`, label: `¿Tu salud te limita en ${txt}?`, options: [
      { label: "Sí, mucho", value: 0 }, { label: "Sí, un poco", value: 50 }, { label: "No", value: 100 },
    ], scale: "PF" })),
    { id: "S13", label: "¿Reduciste tiempo en trabajo/actividades por problemas físicos?", options: [{ label: "Sí", value: 0 }, { label: "No", value: 100 }], scale: "RP" },
    { id: "S14", label: "¿Conseguiste menos de lo deseado por salud física?", options: [{ label: "Sí", value: 0 }, { label: "No", value: 100 }], scale: "RP" },
    { id: "S15", label: "¿Fue difícil realizar trabajo/actividades por salud física?", options: [{ label: "Sí", value: 0 }, { label: "No", value: 100 }], scale: "RP" },
    { id: "S16", label: "¿Limitado/a en el tipo de actividades por salud física?", options: [{ label: "Sí", value: 0 }, { label: "No", value: 100 }], scale: "RP" },
    { id: "S17", label: "¿Reduciste tiempo por problemas emocionales?", options: [{ label: "Sí", value: 0 }, { label: "No", value: 100 }], scale: "RE" },
    { id: "S18", label: "¿Lograste menos por problemas emocionales?", options: [{ label: "Sí", value: 0 }, { label: "No", value: 100 }], scale: "RE" },
    { id: "S19", label: "¿Trabajaste con menos cuidado por problemas emocionales?", options: [{ label: "Sí", value: 0 }, { label: "No", value: 100 }], scale: "RE" },
    { id: "S20", label: "Interferencia de salud física/emocional en actividades sociales", options: [
      { label: "Muchísimo", value: 0 }, { label: "Mucho", value: 25 }, { label: "Algo", value: 50 }, { label: "Un poco", value: 75 }, { label: "Nada", value: 100 },
    ], scale: "SF" },
    { id: "S21", label: "¿Cuánto dolor corporal has tenido?", options: [
      { label: "Ninguno", value: 100 }, { label: "Muy leve", value: 80 }, { label: "Leve", value: 60 }, { label: "Moderado", value: 40 }, { label: "Severo", value: 20 }, { label: "Muy severo", value: 0 },
    ], scale: "BP" },
    { id: "S22", label: "¿En qué medida el dolor dificultó tu trabajo habitual?", options: [
      { label: "Nada", value: 100 }, { label: "Muy poco", value: 80 }, { label: "Algo", value: 60 }, { label: "Bastante", value: 40 }, { label: "Mucho", value: 20 },
    ], scale: "BP" },
    { id: "S23", label: "¿Con qué frecuencia te sentiste lleno/a de vitalidad?", options: [
      { label: "Siempre", value: 100 }, { label: "Casi siempre", value: 80 }, { label: "A menudo", value: 60 }, { label: "Algunas veces", value: 40 }, { label: "Rara vez", value: 20 }, { label: "Nunca", value: 0 },
    ], scale: "VT" },
    ...[[24,"tranquilo/a y en paz"],[25,"desanimado/a y triste"],[26,"calmado/a y sosegado/a"],[28,"decaído/a"],[30,"feliz"]].map(([num, txt], i) => ({
      id: `S${num}`, label: `¿Con qué frecuencia te sentiste ${txt}?`, options: [
        { label: "Siempre", value: i===1||i===3?0:100 }, { label: "Casi siempre", value: i===1||i===3?20:80 }, { label: "A menudo", value: i===1||i===3?40:60 }, { label: "Algunas veces", value: i===1||i===3?60:40 }, { label: "Rara vez", value: i===1||i===3?80:20 }, { label: "Nunca", value: i===1||i===3?100:0 },
      ], scale: "MH" })),
    ...[[27,"con mucha energía"],[29,"cansado/a"],[31,"lleno/a de energía"]].map(([num, txt], i) => ({
      id: `S${num}`, label: `¿Con qué frecuencia te sentiste ${txt}?`, options: [
        { label: "Siempre", value: i===1?0:100 }, { label: "Casi siempre", value: i===1?20:80 }, { label: "A menudo", value: i===1?40:60 }, { label: "Algunas veces", value: i===1?60:40 }, { label: "Rara vez", value: i===1?80:20 }, { label: "Nunca", value: i===1?100:0 },
      ], scale: "VT" })),
    { id: "S32", label: "Interferencia en actividades sociales (visitar a amigos/familia)", options: [
      { label: "Siempre", value: 0 }, { label: "Casi siempre", value: 20 }, { label: "A menudo", value: 40 }, { label: "Algunas veces", value: 60 }, { label: "Rara vez", value: 80 }, { label: "Nunca", value: 100 },
    ], scale: "SF" },
    { id: "S33", label: "Me pongo enfermo/a más fácilmente que otras personas", options: [
      { label: "Totalmente de acuerdo", value: 0 }, { label: "De acuerdo", value: 25 }, { label: "Ni de acuerdo ni en desacuerdo", value: 50 }, { label: "En desacuerdo", value: 75 }, { label: "Totalmente en desacuerdo", value: 100 },
    ], scale: "GH" },
    { id: "S34", label: "Estoy tan sano/a como cualquiera que conozco", options: [
      { label: "Totalmente de acuerdo", value: 100 }, { label: "De acuerdo", value: 75 }, { label: "Ni de acuerdo ni en desacuerdo", value: 50 }, { label: "En desacuerdo", value: 25 }, { label: "Totalmente en desacuerdo", value: 0 },
    ], scale: "GH" },
    { id: "S35", label: "Espero que mi salud empeore", options: [
      { label: "Totalmente de acuerdo", value: 0 }, { label: "De acuerdo", value: 25 }, { label: "Ni de acuerdo ni en desacuerdo", value: 50 }, { label: "En desacuerdo", value: 75 }, { label: "Totalmente en desacuerdo", value: 100 },
    ], scale: "GH" },
    { id: "S36", label: "Mi salud es excelente", options: [
      { label: "Totalmente de acuerdo", value: 100 }, { label: "De acuerdo", value: 75 }, { label: "Ni de acuerdo ni en desacuerdo", value: 50 }, { label: "En desacuerdo", value: 25 }, { label: "Totalmente en desacuerdo", value: 0 },
    ], scale: "GH" },
  ].flat(),
  scales: {
    PF: { label: "Función física (PF)", itemIds: ["S3","S4","S5","S6","S7","S8","S9","S10","S11","S12"] },
    RP: { label: "Rol físico (RP)", itemIds: ["S13","S14","S15","S16"] },
    RE: { label: "Rol emocional (RE)", itemIds: ["S17","S18","S19"] },
    SF: { label: "Función social (SF)", itemIds: ["S20","S32"] },
    BP: { label: "Dolor corporal (BP)", itemIds: ["S21","S22"] },
    GH: { label: "Salud general (GH)", itemIds: ["S1","S33","S34","S35","S36"] },
    VT: { label: "Vitalidad (VT)", itemIds: ["S23","S27","S29","S31"] },
    MH: { label: "Salud mental (MH)", itemIds: ["S24","S25","S26","S28","S30"] },
  },
};

type OptionT = { label: string; value: number };
type ItemT = { id: string; label: string; options: OptionT[]; scale: string | null };
type ScaleDef = { label: string; itemIds: string[] };
type QuestionnaireT = { title: string; instructions: string; items: ItemT[]; scales: Record<string, ScaleDef> };
type ScoreEntry = { label: string; score: number | null; n: number };
interface Profile { user: { id: string; name: string }; notes?: string; assessments: any[] }

// ====== CÁLCULO ======
function computeScaleScores(answers: Record<string, number | undefined>, scales: Record<string, ScaleDef>) {
  const results: Record<string, ScoreEntry> = {};
  for (const key of Object.keys(scales)) {
    const { label, itemIds } = (scales as any)[key];
    const vals = itemIds.map((id: string) => answers[id]).filter((v: any) => typeof v === "number") as number[];
    const n = vals.length;
    results[key] = { label, score: n ? vals.reduce((a, b) => a + b, 0) / n : null, n };
  }
  return results;
}

// ====== TESTS ======
function nowStamp() { const d = new Date(); const p=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; }
function runSelfTests() {
  const ids = new Set(QUESTIONNAIRE.items.map((it: any) => it.id));
  console.assert(QUESTIONNAIRE.items.length === 36, `Esperaba 36 ítems, hay ${QUESTIONNAIRE.items.length}`);
  Object.entries(QUESTIONNAIRE.scales).forEach(([k, s]: any) => s.itemIds.forEach((id: string)=> console.assert(ids.has(id), `Escala ${k} con ID inexistente: ${id}`)));
  console.assert(!Object.values(QUESTIONNAIRE.scales).some((s: any)=> s.itemIds.includes("S2")), "S2 no debe puntuar");
  QUESTIONNAIRE.items.forEach((it: any) => it.options.forEach((op: any)=> console.assert(typeof op.value === 'number', `Valor no numérico en ${it.id}`)));
  const res = computeScaleScores({ S21:100, S22:100 } as any, { BP: QUESTIONNAIRE.scales.BP } as any); console.assert(res.BP?.score===100, `BP debería ser 100, es ${res.BP?.score}`);
  QUESTIONNAIRE.items.forEach((it: any) => { const vals = it.options.map((o:any)=>o.value); console.assert(new Set(vals).size===vals.length, `Valores duplicados en ${it.id}`); });
  const s25 = QUESTIONNAIRE.items.find((q:any)=>q.id==="S25"); if (s25){ const a=s25.options.find((o:any)=>o.label==="A menudo")?.value; const b=s25.options.find((o:any)=>o.label==="Algunas veces")?.value; console.assert(a===40&&b===60, `S25 esperado 40/60 y obtuvo ${a}/${b}`); }
  QUESTIONNAIRE.items.forEach((it:any)=> it.options.forEach((op:any)=> console.assert(op.value>=0&&op.value<=100, `Fuera de rango ${it.id}`)));
  console.assert(new Set(QUESTIONNAIRE.items.map((q:any)=>q.id)).size===36, "IDs únicos (36)");
  { const r=computeScaleScores({ S21:100 } as any, { BP: QUESTIONNAIRE.scales.BP } as any); console.assert(r.BP?.score===100&&r.BP?.n===1, `Media parcial BP incorrecta`); }
  { const h=["userId","userName","timestamp",...Object.keys(QUESTIONNAIRE.scales)].join(","); console.assert(h.split(',').length===3+Object.keys(QUESTIONNAIRE.scales).length, 'Cabecera CSV global'); }
  { const s=nowStamp(); console.assert(/^\d{8}_\d{4}$/.test(s), `nowStamp inválido: ${s}`); }
  // Test extra: cuando no hay respuestas, las escalas deben ser null y n=0
  { const empty = computeScaleScores({}, { BP: QUESTIONNAIRE.scales.BP } as any); console.assert(empty.BP?.score===null && empty.BP?.n===0, 'Escala vacía debe ser null con n=0'); }
}
if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') { try { runSelfTests(); } catch {} }

// ====== STORAGE ======
const storageMode: "local" | "demo" = "local";
const loadAllProfiles = (): Profile[] => { if (storageMode!=="local") return []; try{ const raw = localStorage.getItem("sf36_profiles_v1"); return raw? JSON.parse(raw): [];}catch{ return [];} };
const saveProfile = (profile: Profile) => { if (storageMode!=="local") return; const all=loadAllProfiles(); const i=all.findIndex((p:any)=>p.user.id===profile.user.id); i>=0? all.splice(i,1,profile): all.push(profile); localStorage.setItem("sf36_profiles_v1", JSON.stringify(all)); };
const upsertAssessment = (userId: string, a: any) => { const all=loadAllProfiles(); const i=all.findIndex((p:any)=>p.user.id===userId); if(i===-1) return; const prof=all[i]; prof.assessments=[...(prof.assessments||[]), a]; all[i]=prof; localStorage.setItem("sf36_profiles_v1", JSON.stringify(all)); };
const findProfileById = (userId: string) => loadAllProfiles().find((p:any)=>p.user.id===userId);
const ensureProfile = (user:{id:string;name:string}, notes:string) => { let p=findProfileById(user.id); if(!p){ p={ user, notes, assessments: [] } as Profile; saveProfile(p);} return p; };

// ====== HELPERS (descargas y validaciones) ======
function triggerDownloadFromBlob(blob: Blob, filename: string, _fallbackText?: string, keepUrlForManual: boolean = false): string | null {
  // Forzar descarga directa con Blob + <a download>
  const transientURL = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = transientURL;
  a.download = filename || 'download';
  a.style.display = 'none';
  document.body.appendChild(a);
  if (typeof a.click === 'function') {
    a.click();
  } else {
    const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    a.dispatchEvent(clickEvt);
  }
  // Limpia el URL usado para el click programático
  setTimeout(() => { try { a.remove(); URL.revokeObjectURL(transientURL); } catch {} }, 0);

  // Si se solicita, devolvemos un segundo ObjectURL para permitir descarga manual por el usuario
  if (keepUrlForManual) {
    try { return URL.createObjectURL(blob); } catch { return null; }
  }
  return null;
}

function validatePerScaleCompleteness(
  answers: Record<string, number|undefined>,
  scales: Record<string, ScaleDef>,
  minRatio = 0.5
) {
  const incompletas: string[] = [];
  for (const [k, s] of Object.entries(scales)) {
    const n = s.itemIds.filter(id => typeof answers[id] === "number").length;
    if (n > 0 && n < Math.ceil(s.itemIds.length * minRatio)) incompletas.push(k);
  }
  return incompletas;
}

// ====== UI ======
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="shadow-lg rounded-2xl"><CardHeader><CardTitle className="text-xl">{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>
);

const ProfileHeader = ({ profile, onExport }: any) => (
  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-muted rounded-2xl">
    <div className="flex items-center gap-3"><User className="w-6 h-6" /><div><div className="font-semibold">{profile?.user?.name || "Sin nombre"}</div><div className="text-sm text-muted-foreground">{profile?.user?.id}</div></div></div>
    <div className="flex items-center gap-3"><div className="text-sm">Evaluaciones: {profile?.assessments?.length || 0}</div><Button variant="secondary" onClick={onExport}><Download className="w-4 h-4 mr-2" /> Exportar JSON</Button></div>
  </div>
);

const ResultsPanel = ({ scores }: any) => {
  const keys = Object.keys(scores || {}); const available = keys.filter(k=>scores[k].score!==null);
  if (!available.length) return <div className="text-sm text-muted-foreground">Responde al cuestionario para ver tus resultados.</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {available.map(k=>{ const { label, score, n } = scores[k]; return (
        <Card key={k} className="rounded-2xl"><CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader><CardContent>
          <div className="flex items-center gap-4"><div className="text-3xl font-semibold">{Math.round(score!)}</div><div className="flex-1"><Progress value={score!} /></div></div>
          <div className="text-xs text-muted-foreground mt-2">0 = peor, 100 = mejor · n={n}</div>
        </CardContent></Card>
      );})}
    </div>
  );
};

const AssessmentHistory = ({ assessments }: any) => {
  if (!assessments?.length) return null; const rows = assessments.slice().sort((a:any,b:any)=> a.timestamp<b.timestamp?1:-1);
  return (
    <Section title="Historial de evaluaciones">
      <div className="space-y-3">
        {rows.map((a:any,idx:number)=> (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div className="text-sm"><div className="font-medium">{new Date(a.timestamp).toLocaleString()}</div><div className="text-xs text-muted-foreground">Ítems: {Object.keys(a.answers).length}</div></div>
            <div className="flex gap-2 text-xs">{Object.entries(a.scores).filter(([_,v])=> (v as any).score!==null).map(([k,v])=> (<div key={k} className="px-2 py-1 rounded-lg bg-background border">{k}: {Math.round((v as any).score)} (n={(v as any).n})</div>))}</div>
          </div>
        ))}
      </div>
    </Section>
  );
};

export default function App() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireT>(QUESTIONNAIRE as QuestionnaireT);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [latestScores, setLatestScores] = useState<any>({});
  const [enforceComplete, setEnforceComplete] = useState<boolean>(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(true);
  const [lastExport, setLastExport] = useState<{ filename: string; mime: string; text?: string; href?: string } | null>(null);
  const lastManualUrlRef = useRef<string | null>(null);
  const prevUserRef = useRef<{ id: string; name: string } | null>(null);

  useEffect(() => { const stored = loadAllProfiles(); setProfiles(stored); if (stored.length) setUser(stored[stored.length-1].user); }, []);
  useEffect(() => { if (user?.id){ const p=findProfileById(user.id); const last=p?.assessments?.slice()?.sort((a:any,b:any)=> a.timestamp<b.timestamp?1:-1)?.[0]; if (last?.scores) setLatestScores(last.scores); const k=`sf36_draft_${user.id}`; const raw=localStorage.getItem(k); setAnswers(raw? JSON.parse(raw): {});} }, [user?.id]);
  useEffect(() => { if (!user?.id) return; localStorage.setItem(`sf36_draft_${user.id}`, JSON.stringify(answers)); }, [answers, user?.id]);

  const scores = useMemo(() => computeScaleScores(answers, questionnaire.scales), [answers, questionnaire.scales]);
  const handleSelect = (id: string, value: number) => setAnswers(prev=> ({ ...prev, [id]: value }));
  const answeredCount = Object.values(answers).filter(v=> v!==undefined).length;
  const progress = Math.round((answeredCount / questionnaire.items.length) * 100);

  const handleSave = () => { if(!user?.id?.trim()) return alert("Primero identifica a la persona (ID o email)."); const profile=(findProfileById(user.id)||{ user, notes, assessments: [] }) as Profile; profile.user=user; (profile as any).notes=notes; saveProfile(profile); setProfiles(loadAllProfiles()); alert("Perfil guardado."); };

  const handleSubmit = async () => {
  if (!user?.id?.trim()) return alert("Primero identifica a la persona (ID o email).");
  if (enforceComplete && answeredCount < questionnaire.items.length)
    return alert(`Faltan ${questionnaire.items.length - answeredCount} ítem(s) por responder o desactiva "Exigir completitud".`);

  const assessment = {
    timestamp: new Date().toISOString(),
    answers,
    scores,
    user_id: user.id,
    user_name: user.name || "",
  };

  try {
    const { error } = await supabase.from("assessments").insert([{
  user_id: user.id,
  user_name: user.name,
  timestamp: new Date().toISOString(),
  answers,
  scores,
  notes,
}]);
  if (error) throw error;
    alert("✅ Respuestas guardadas correctamente en Supabase.");
    setAnswers({});
    setLatestScores(scores);
    localStorage.removeItem(`sf36_draft_${user.id}`);
  } catch (err: any) {
    console.error(err);
    alert("❌ Error al guardar en Supabase: " + err.message);
  }
};

  const currentProfile = user?.id ? findProfileById(user.id) : null;

  // ——— Exportaciones (descarga directa) ———
  const handleExport = () => { 
    if(!currentProfile) return alert('No hay perfil cargado.'); 
    const json = JSON.stringify(currentProfile, null, 2);
    const filename = `sf36_perfil_${currentProfile.user.id}.json`;
    const blob = new Blob([json], { type:'application/json' });
    // Revoca URL manual previa
    if (lastManualUrlRef.current) { try { URL.revokeObjectURL(lastManualUrlRef.current); } catch {} }
    const manualUrl = triggerDownloadFromBlob(blob, filename, json, true) || undefined;
    lastManualUrlRef.current = manualUrl || null;
    setLastExport({ filename, mime:'application/json', text: json, href: manualUrl });
  };
  const ensurePageSpace = (doc:any, y:number, need=24)=> y+need>285? (doc.addPage(),10): y;
  const handleExportCSV = () => { 
    if(!currentProfile) return alert('No hay perfil cargado.'); 
    const scales=Object.keys(questionnaire.scales);
    const header=["timestamp", ...scales].join(',');
    const rows=(currentProfile.assessments||[]).map((a:any)=>{ const cols=scales.map(k=>{const s=a.scores?.[k]; return typeof s?.score==='number'? Math.round(s.score):""; }); return [a.timestamp, ...cols].join(',');});
    const csv = [header, ...rows].join('\n');
    const filename=`sf36_historial_${currentProfile.user.id}.csv`;
    const blob=new Blob(['\uFEFF' + csv],{type:'text/csv;charset=utf-8;'});
    if (lastManualUrlRef.current) { try { URL.revokeObjectURL(lastManualUrlRef.current); } catch {} }
    const manualUrl = triggerDownloadFromBlob(blob, filename, csv, true) || undefined;
    lastManualUrlRef.current = manualUrl || null;
    setLastExport({ filename, mime:'text/csv', text: csv, href: manualUrl });
  };
  const handleExportPDF = () => { 
    if(!currentProfile) return alert('No hay perfil cargado.'); 
    const doc=new jsPDF(); const lh=8; let y=10; 
    doc.setFontSize(12); 
    doc.text(`Perfil: ${currentProfile.user.name||"(sin nombre)"} (${currentProfile.user.id})`,10,y); y+=lh; 
    doc.text(`Evaluaciones: ${(currentProfile.assessments||[]).length}`,10,y); y+=lh*1.5; 
    const scales=Object.keys(questionnaire.scales); 
    const ensurePageSpace = (doc:any, y:number, need=24)=> y+need>285? (doc.addPage(),10): y;
    (currentProfile.assessments||[]).forEach((a:any,idx:number)=>{ 
      y=ensurePageSpace(doc,y,20); 
      doc.setFontSize(11); doc.text(`${idx+1}. ${new Date(a.timestamp).toLocaleString()}`,10,y); y+=lh; 
      doc.setFontSize(10); 
      scales.forEach(k=>{ 
        const s=a.scores?.[k]; const v=typeof s?.score==='number'? Math.round(s.score):'-'; const n=typeof s?.n==='number'? s.n:'-'; 
        y=ensurePageSpace(doc,y,8); doc.text(`${k}: ${v} (n=${n})`,14,y); y+=lh; 
      }); 
      y+=lh*0.5; y=ensurePageSpace(doc,y,8); 
    }); 
    const filename = `sf36_historial_${currentProfile.user.id}.pdf`;
    const blob = doc.output('blob');
    if (lastManualUrlRef.current) { try { URL.revokeObjectURL(lastManualUrlRef.current); } catch {} }
    const manualUrl = triggerDownloadFromBlob(blob, filename, undefined, true) || undefined;
    lastManualUrlRef.current = manualUrl || null;
    setLastExport({ filename, mime:'application/pdf', href: manualUrl });
  };
  const handleExportAllJSON = () => { 
    const all=loadAllProfiles(); const json=JSON.stringify(all, null, 2); 
    const filename=`sf36_todos_perfiles_${nowStamp()}.json`; 
    const blob=new Blob([json],{type:'application/json'}); 
    if (lastManualUrlRef.current) { try { URL.revokeObjectURL(lastManualUrlRef.current); } catch {} }
    const manualUrl = triggerDownloadFromBlob(blob, filename, json, true) || undefined;
    lastManualUrlRef.current = manualUrl || null;
    setLastExport({ filename, mime:'application/json', text: json, href: manualUrl });
  };
  const handleExportAllCSV = () => { 
    const all=loadAllProfiles(); const scales=Object.keys(questionnaire.scales); 
    const header=["userId","userName","timestamp", ...scales].join(','); 
    const rows:string[]=[]; 
    all.forEach((p:any)=> (p.assessments||[]).forEach((a:any)=>{ 
      const cols=scales.map(k=>{ const s=a.scores?.[k]; return typeof s?.score==='number'? Math.round(s.score):"";
      });

      rows.push([p.user?.id||"", p.user?.name||"", a.timestamp, ...cols].join(',')); 
    })); 
    const csv=[header, ...rows].join('\n'); 
    const filename=`sf36_todos_perfiles_${nowStamp()}.csv`; 
    const blob=new Blob(['\uFEFF' + csv],{type:'text/csv;charset=utf-8;'}); 
    if (lastManualUrlRef.current) { try { URL.revokeObjectURL(lastManualUrlRef.current); } catch {} }
    const manualUrl = triggerDownloadFromBlob(blob, filename, csv, true) || undefined; 
    lastManualUrlRef.current = manualUrl || null;
    setLastExport({ filename, mime:'text/csv', text: csv, href: manualUrl }); 
  };

  const exampleJSON = `{"title":"SF-36 (ES)","instructions":"Responde según tu situación actual.","items":[{"id":"PF1","label":"TEXTO OFICIAL DEL ÍTEM","options":[{"label":"Opción A","value":0},{"label":"Opción B","value":50},{"label":"Opción C","value":100}],"scale":"PF"}],"scales":{"PF":{"label":"Función física (PF)","itemIds":["PF1"]},"RP":{"label":"Rol físico (RP)","itemIds":["RP1"]},"BP":{"label":"Dolor corporal (BP)","itemIds":["BP1"]},"GH":{"label":"Salud general (GH)","itemIds":["GH1"]},"VT":{"label":"Vitalidad (VT)","itemIds":["VT1"]},"SF":{"label":"Función social (SF)","itemIds":["SF1"]},"RE":{"label":"Rol emocional (RE)","itemIds":["RE1"]},"MH":{"label":"Salud mental (MH)","itemIds":["MH1"]}}`;

  const handleImportJSON = (file: File) => { const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(String(reader.result)); if (!data?.items || !Array.isArray(data.items)) throw new Error("Falta 'items' (array)"); if (!data?.scales || typeof data.scales !== "object") throw new Error("Falta 'scales' (objeto)"); const ids = new Set<string>(); data.items.forEach((it: any) => { if (!it?.id) throw new Error("Ítem sin 'id'"); if (ids.has(it.id)) throw new Error(`ID duplicado: ${it.id}`); ids.add(it.id); const vals=(it.options||[]).map((o:any)=>o.value); if (new Set(vals).size!==vals.length) throw new Error(`Valores duplicados en ${it.id}`); }); setQuestionnaire({ title: data.title || "SF-36 (ES)", instructions: data.instructions || QUESTIONNAIRE.instructions, items: data.items, scales: data.scales }); setAnswers({}); alert("Ítems importados correctamente."); } catch (e:any) { alert("Error al importar JSON: "+ e.message); } }; reader.readAsText(file); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-6 md:px-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-bold">SF‑36/RAND‑36 (ES) – Plataforma</motion.h1>

        <Tabs defaultValue="evaluacion" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="evaluacion" className="flex gap-2"><FileText className="w-4 h-4" /> Encuesta</TabsTrigger>
            <TabsTrigger value="resultados" className="flex gap-2"><BarChart2 className="w-4 h-4" /> Resultados</TabsTrigger>
            <TabsTrigger value="historial" className="flex gap-2"><History className="w-4 h-4" /> Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="evaluacion" className="space-y-6">
            <Section title="Identificación de la persona evaluada">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><label className="text-sm">ID o email *</label><Input placeholder="ej. persona@dominio.com" value={user?.id || ""} onChange={(e)=> setUser({ id: e.target.value.trim(), name: user?.name || "" })} /></div>
                  <div>
                    <label className="text-sm">Seleccionar perfil existente</label>
                    <select className="w-full border rounded-md h-10 px-2 bg-background" value={user?.id && profiles.find(p=>p.user.id===user.id) ? user.id : ""} onChange={(e)=>{ const p=profiles.find((pp)=>pp.user.id===e.target.value); if (p){ setUser(p.user); const last=p.assessments?.slice()?.sort((a:any,b:any)=> a.timestamp<b.timestamp?1:-1)?.[0]; if (last?.scores) setLatestScores(last.scores);} }}>
                      <option value="">— Selecciona —</option>
                      {profiles.map((p:any)=> (<option key={p.user.id} value={p.user.id}>{p.user.name || p.user.id} ({(p.assessments||[]).length})</option>))}
                    </select>
                  </div>
                  <div><label className="text-sm">Nombre</label><Input placeholder="Nombre y apellidos" value={user?.name || ""} onChange={(e)=> setUser({ id: user?.id || "", name: e.target.value })} /></div>
                </div>
                <div className="flex items-end"><Button onClick={handleSave} className="w-full"><Save className="w-4 h-4 mr-2" /> Guardar perfil</Button></div>
                {prevUserRef.current && (<div className="flex items-end"><Button variant="ghost" onClick={()=>{ if (prevUserRef.current) setUser(prevUserRef.current); }} className="w-full">Volver al usuario anterior</Button></div>)}
                <div className="flex items-end"><Button variant="outline" onClick={()=>{ prevUserRef.current=user; setUser({ id: "", name: "" }); setNotes(""); setAnswers({}); setLatestScores({}); }} className="w-full">Nuevo usuario</Button></div>
              </div>
              <div className="mt-4"><label className="text-sm">Notas del perfil (opcional)</label><Textarea placeholder="Antecedentes, observaciones, etc." value={notes} onChange={(e)=> setNotes(e.target.value)} /></div>
              <div className="mt-4 flex items-center gap-3">
                {/* <input type="file" accept="application/json" className="hidden" ref={fileInputRef} onChange={(e)=>{ const f=e.target.files?.[0]; if (f) handleImportJSON(f); if (fileInputRef.current) fileInputRef.current.value=""; }} />
                <Button variant="outline" onClick={()=> fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Importar ítems oficiales (JSON)</Button>
                <div className="text-xs text-muted-foreground">Usa tu archivo con los 36 ítems y el mapeo de escalas.</div> */}
              </div>
            </Section>

            <Section title={questionnaire.title}>
              <p className="text-sm text-muted-foreground mb-4">{questionnaire.instructions}</p>
              <div className="mb-4"><label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={enforceComplete} onChange={(e)=> setEnforceComplete(e.target.checked)} /> Exigir completitud antes de guardar</label>
                <div className="text-sm mb-1">Progreso</div><Progress value={progress} />
                <div className="text-xs text-muted-foreground mt-1">{answeredCount}/{questionnaire.items.length} respondidas</div>
              </div>
              <div className="space-y-4">
                {questionnaire.items.map((it: any, idx: number) => (
                  <div key={it.id} className="p-4 border rounded-2xl bg-background">
                    <div className="font-medium mb-2">{idx + 1}. {it.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {it.options.map((op: any, i: number) => {
                        const selected = answers[it.id] === op.value;
                        return (
                          <Button key={i} className={selected?"ring-2 ring-primary":""} variant={selected?"default":"outline"} onClick={()=> handleSelect(it.id, op.value)}>{op.label}</Button>
                        );
                      })}
                    </div>
                    {typeof answers[it.id] === 'number' && (<div className="mt-2 text-xs text-muted-foreground">Valor: {answers[it.id]}</div>)}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-6"><Button variant="outline" onClick={()=> setAnswers({})}>Limpiar respuestas</Button><Button size="lg" onClick={handleSubmit}>Guardar respuestas y calcular</Button></div>
            </Section>
          </TabsContent>

          <TabsContent value="resultados"><Section title="Resultados por dimensión (0–100)"><ResultsPanel scores={Object.keys(latestScores||{}).length ? latestScores : scores} /></Section></TabsContent>

          <TabsContent value="historial">
            <ProfileHeader profile={currentProfile} onExport={handleExport} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleExportCSV}>Exportar CSV</Button>
              <Button variant="outline" onClick={handleExportPDF}>Exportar PDF</Button>
              <div className="ml-2 h-6 w-px bg-border" />
              <Button variant="secondary" onClick={handleExportAllJSON}>Exportar TODOS (JSON)</Button>
              <Button variant="secondary" onClick={handleExportAllCSV}>Exportar TODOS (CSV)</Button>
              <div className="ml-auto flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={showAllHistory} onChange={(e)=> setShowAllHistory(e.target.checked)} /> Mostrar historial de todos los perfiles
                </label>
              </div>
            </div>
            <div className="mt-4" />
            {showAllHistory ? (
              <Section title="Historial (todos los perfiles)"><div className="space-y-3">
                {profiles.flatMap((p:any)=> (p.assessments||[]).map((a:any, idx:number)=> ({a, p}))).sort((x:any,y:any)=> x.a.timestamp<y.a.timestamp?1:-1).map(({a,p}:any, i:number)=> (
                  <div key={p.user.id + i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="text-sm"><div className="font-medium">{new Date(a.timestamp).toLocaleString()} — {p.user.name || p.user.id}</div><div className="text-xs text-muted-foreground">Ítems: {Object.keys(a.answers).length}</div></div>
                    <div className="flex gap-2 text-xs">{Object.entries(a.scores).filter(([_, v]) => (v as any).score !== null).map(([k, v]) => (<div key={k} className="px-2 py-1 rounded-lg bg-background border">{k}: {Math.round((v as any).score)} (n={(v as any).n})</div>))}</div>
                  </div>
                ))}
              </div></Section>
            ) : (
              <AssessmentHistory assessments={currentProfile?.assessments} />
            )}
          </TabsContent>
        </Tabs>

        {/* {lastExport && (
          <Section title="Última exportación (copiar si la descarga está bloqueada)">
            <div className="flex items-center justify-between mb-2 text-sm"><div><strong>Archivo:</strong> {lastExport.filename} · <strong>MIME:</strong> {lastExport.mime}</div>
              <div className="flex gap-2">{lastExport.text && (<Button variant="outline" onClick={async()=>{ try{ await navigator.clipboard?.writeText(lastExport.text!); alert('Contenido copiado'); } catch{ alert('No se pudo copiar automáticamente.'); } }}>Copiar contenido</Button>)}</div>
            </div>
            {lastExport.text ? (
            <pre className="p-3 rounded-xl bg-muted overflow-auto text-xs max-h-64"><code>{lastExport.text}</code></pre>
            ) : (
            <div className="text-xs text-muted-foreground">El tipo de archivo no es texto legible (p. ej., PDF). Si la descarga no se inició, utiliza el enlace manual.</div>
            )}
            {lastExport?.href && (
              <div className="mt-3">
                <a className="underline text-sm" href={lastExport.href} download={lastExport.filename}>Descargar manualmente: {lastExport.filename}</a>
              </div>
            )}
          </Section>
        )} */}
      </div>
    </div>
  );
}
