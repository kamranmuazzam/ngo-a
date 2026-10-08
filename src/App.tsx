import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check } from '@tauri-apps/plugin-updater';
import { createSignal, createResource, For, Show, onMount } from 'solid-js';
import * as XLSX from 'xlsx';

import { PROVINCES_AND_DISTRICTS, ALL_PROVINCES } from './nepal';
import logoUrl from './assets/logo.svg';

const fetchData = (type: string) => async () => {
  return await invoke(`get_${type}`);
};


const extractId = (thing: any) => {
  if (!thing) return '';
  if (typeof thing === 'string') return thing;
  if (thing.id) {
    if (thing.id.String) return thing.id.String;
    if (thing.id.Number) return thing.id.Number.toString();
    return thing.id;
  }
  return '';
};

function App() {
  const [activeTab, setActiveTab] = createSignal('dashboard');

  // DB Data State
  const [schools, { refetch: refetchSchools }] = createResource(fetchData('schools'));
  const [students, { refetch: refetchStudents }] = createResource(fetchData('students'));
  const [teachers, { refetch: refetchTeachers }] = createResource(fetchData('teachers'));
  const [trainings, { refetch: refetchTrainings }] = createResource(fetchData('trainings'));

  // Modal State
  const [showModal, setShowModal] = createSignal(false);
  const [showInfo, setShowInfo] = createSignal(false);
  const [appVersion, setAppVersion] = createSignal('');
  if (!localStorage.getItem('installDate')) {
    localStorage.setItem('installDate', new Date().toLocaleDateString());
  }
  const [modalMode, setModalMode] = createSignal<'add' | 'edit'>('add');
  const [modalType, setModalType] = createSignal<'school' | 'student' | 'teacher' | 'training'>('student');
  const [editingId, setEditingId] = createSignal<string>('');

  const [mapSvgData, setMapSvgData] = createSignal('');

  // Updater State
  const [updateStatus, setUpdateStatus] = createSignal<string>('');
  const [isUpdating, setIsUpdating] = createSignal<boolean>(false);

  onMount(async () => {
    fetch('/nepal.svg').then(r => r.text()).then(t => setMapSvgData(t));
    getVersion().then(v => setAppVersion(v));

    // Check for Native Auto-Updates
    try {
      const update = await check();

      if (update) {
        setUpdateStatus(`Downloading version ${update.version}... Please keep the app open.`);
        setIsUpdating(true);

        // Let it download and install in the background
        await update.downloadAndInstall();

        setUpdateStatus('Update installed successfully! Restarting...');
        // In Tauri v2, we usually need to call process.exit(0) or relaunch
        // Tauri handles restart if configured or user just restarts.
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch (e) {
      console.error("Failed to auto-update", e);
    }
  });

  const [formData, setFormData] = createSignal<any>({});
  const [isSaving, setIsSaving] = createSignal(false);

  const openModal = (mode: 'add' | 'edit', type: 'school' | 'student' | 'teacher' | 'training', data?: any) => {
    setModalMode(mode);
    setModalType(type);
    if (mode === 'edit' && data) {
      setEditingId(extractId(data.id));
      setFormData({ ...data });
    } else {
      setEditingId('');
      setFormData({});
    }
    setShowModal(true);
  };


  const [runtimeSeconds, setRuntimeSeconds] = createSignal(0);
  let runtimeInterval: any;

  const getStats = () => {
    const s = students() || [];
    const t = teachers() || [];
    const sch = schools() || [];
    const tr = trainings() || [];

    const activeS = s.filter((x: any) => x.category?.toLowerCase() === 'active');
    const activeBoys = activeS.filter((x: any) => x.gender?.toLowerCase() === 'boy' || x.gender?.toLowerCase() === 'male').length;
    const activeGirls = activeS.filter((x: any) => x.gender?.toLowerCase() === 'girl' || x.gender?.toLowerCase() === 'female').length;

    const alumniS = s.filter((x: any) => x.category?.toLowerCase() === 'graduated' || x.category?.toLowerCase() === 'alumni' || x.category?.toLowerCase() === 'completed');
    const alumniBoys = alumniS.filter((x: any) => x.gender?.toLowerCase() === 'boy' || x.gender?.toLowerCase() === 'male').length;
    const alumniGirls = alumniS.filter((x: any) => x.gender?.toLowerCase() === 'girl' || x.gender?.toLowerCase() === 'female').length;

    const activeT = t.filter((x: any) => x.status?.toLowerCase() === 'active');
    const activeTMale = activeT.filter((x: any) => x.gender?.toLowerCase() === 'male' || x.gender?.toLowerCase() === 'm').length;
    const activeTFemale = activeT.filter((x: any) => x.gender?.toLowerCase() === 'female' || x.gender?.toLowerCase() === 'f').length;

    const allSBoys = s.filter((x: any) => x.gender?.toLowerCase() === 'boy' || x.gender?.toLowerCase() === 'male').length;
    const allSGirls = s.filter((x: any) => x.gender?.toLowerCase() === 'girl' || x.gender?.toLowerCase() === 'female').length;

    const districtsSet = new Set(sch.map((x: any) => x.district?.toUpperCase()).filter(Boolean));
    const districts = districtsSet.size;
    const trainingEvents = new Set(tr.map((x: any) => (x.training_title || '') + (x.start_date || ''))).size;

    const calcPct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

    return {
      schools: sch.length,

      activeS: activeS.length,
      activeBoysPct: calcPct(activeBoys, activeS.length),
      activeGirlsPct: calcPct(activeGirls, activeS.length),

      alumniS: alumniS.length,
      alumniBoysPct: calcPct(alumniBoys, alumniS.length),
      alumniGirlsPct: calcPct(alumniGirls, alumniS.length),

      activeT: activeT.length,
      activeTMalePct: calcPct(activeTMale, activeT.length),
      activeTFemalePct: calcPct(activeTFemale, activeT.length),

      totalS: s.length,
      totalSBoys: allSBoys,
      totalSGirls: allSGirls,

      totalT: t.length,

      districts,
      districtsArray: Array.from(districtsSet),
      trainingEvents,
      totalParticipants: tr.length
    };
  };




  const submitRecord = async (e: Event) => {
    e.preventDefault();
    setIsSaving(true);

    const type = modalType();
    const mode = modalMode();
    const idString = editingId();

    try {
      if (mode === 'edit' && idString) {
        await invoke(`update_${type}`, { id: idString, payload: formData() });
      } else {
        await invoke(`create_${type}`, { payload: formData() });
      }

      setShowModal(false);
      if (type === 'school') refetchSchools();
      if (type === 'student') refetchStudents();
      if (type === 'teacher') refetchTeachers();
      if (type === 'training') refetchTrainings();
    } catch (error) {
      console.error(error);
      alert("Error saving to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = async (type: 'school' | 'student' | 'teacher' | 'training', rawId: any) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    const idString = extractId(rawId);
    if (!idString) {
      alert("Could not extract ID to delete.");
      return;
    }

    try {
      await invoke(`delete_${type}`, { id: idString });

      if (type === 'school') refetchSchools();
      if (type === 'student') refetchStudents();
      if (type === 'teacher') refetchTeachers();
      if (type === 'training') refetchTrainings();
    } catch (error) {
      console.error(error);
      alert("Error deleting record.");
    }
  };

  // Input helper
  const updateForm = (key: string, value: string) => {
    setFormData({ ...formData(), [key]: value });
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const s1 = XLSX.utils.json_to_sheet(schools() || []);
      XLSX.utils.book_append_sheet(wb, s1, "Schools");

      const s2 = XLSX.utils.json_to_sheet(students() || []);
      XLSX.utils.book_append_sheet(wb, s2, "Students");

      const s3 = XLSX.utils.json_to_sheet(teachers() || []);
      XLSX.utils.book_append_sheet(wb, s3, "Teachers");

      const s4 = XLSX.utils.json_to_sheet(trainings() || []);
      XLSX.utils.book_append_sheet(wb, s4, "Trainings");

      XLSX.writeFile(wb, "CLEC_Data_Export.xlsx");
    } catch (e) {
      console.error("Export error", e);
      alert("Failed to export Excel file.");
    }
  };

  const getGroupedTrainings = () => {
    const tr = trainings() || [];
    const grouped = new Map();
    tr.forEach((item: any) => {
      const key = `${item.training_title}_${item.start_date}_${item.end_date}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          title: item.training_title,
          start: item.start_date,
          end: item.end_date,
          participants: 1,
          items: [item]
        });
      } else {
        grouped.get(key).participants += 1;
        grouped.get(key).items.push(item);
      }
    });
    return Array.from(grouped.values());
  };

  return (
    <>
      <aside class="sidebar">
        <div class="sidebar-title" style={{ "text-align": "center", "padding-bottom": "1rem" }}>
          <img src={logoUrl} alt="Digital Bridges Logo" style={{ width: "80px", "margin-bottom": "0.5rem" }} />
          <div>Digital Bridges Dashboard</div>
        </div>
        <a href="#" class={`nav-link ${activeTab() === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>Dashboard</a>
        <a href="#" class={`nav-link ${activeTab() === 'schools' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('schools'); }}>Schools</a>
        <a href="#" class={`nav-link ${activeTab() === 'students' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('students'); }}>Students</a>
        <a href="#" class={`nav-link ${activeTab() === 'teachers' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('teachers'); }}>Teachers</a>
        <a href="#" class={`nav-link ${activeTab() === 'trainings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('trainings'); }}>Trainings</a>
        <div style={{ "flex-grow": 1 }}></div>
        <a href="#" class="nav-link" onClick={(e) => { e.preventDefault(); exportToExcel(); }}>
          <span style={{ "font-weight": "normal", "font-size": "0.9rem", "opacity": 0.8 }}>Export All Data</span>
        </a>
        <div style={{ "text-align": "center", "opacity": 0.3, "cursor": "pointer", "margin-bottom": "1rem" }} onClick={() => setShowInfo(true)}>
          <span style={{ "font-family": "monospace", "border": "1px solid", "border-radius": "50%", "padding": "0 5px", "font-size": "12px" }}>i</span>
        </div>
      </aside>

      <main class="main-content">
        <Show when={isUpdating()}>
          <div style={{ background: '#10b981', color: 'white', padding: '0.8rem 1rem', "border-radius": '8px', "margin-bottom": '1rem', display: 'flex', "justify-content": 'space-between', "align-items": 'center' }}>
            <div>
              <strong>Auto-Updater Active:</strong> {updateStatus()}
            </div>
          </div>
        </Show>

        <div class="header">
          <h1>
            {activeTab() === 'dashboard' && 'Overview Dashboard'}
            {activeTab() === 'schools' && 'Partner Schools Directory'}
            {activeTab() === 'students' && 'Student Beneficiaries'}
            {activeTab() === 'teachers' && 'Teacher Roster'}
            {activeTab() === 'trainings' && 'Training & Events'}
          </h1>
          <div style={{ display: 'flex', gap: '1rem', "align-items": "center" }}>
            <Show when={['schools', 'students', 'teachers', 'trainings'].includes(activeTab())}>
              <button class="btn" onClick={() => openModal('add', activeTab().slice(0, -1) as any)}>
                Add New Record
              </button>
            </Show>
          </div>
        </div>

        <div class="glass-card animate-fade-in">
          {activeTab() === 'dashboard' && (
            <div class="dashboard-2d-grid">
              {/* Left Column */}
              <div class="side-col">
                <div class="stat-card" style={{ "padding": "1.2rem" }}>
                  <h3 style={{ "font-size": "1rem" }}>Total CLEC Schools</h3>
                  <div class="value" style={{ "font-size": "2rem" }}>{getStats().schools}</div>
                  <div style={{ "font-size": "0.85rem", "color": "var(--text-muted)" }}>{getStats().districts} Districts Covered</div>
                </div>

                <div class="stat-card" style={{ "padding": "1.2rem", "border-left": "4px solid #3b82f6" }}>
                  <h3 style={{ "font-size": "1rem" }}>Total Student Beneficiaries (Project Start to Date)</h3>
                  <div class="value" style={{ "font-size": "1.5rem" }}>{getStats().totalS}</div>
                  <div style={{ "font-size": "0.85rem", "color": "var(--text-muted)" }}>Boys: {getStats().totalSBoys} | Girls: {getStats().totalSGirls}</div>
                  <div style={{ "font-size": "0.75rem", "color": "#10b981", "margin-top": "0.5rem" }}>✓ Duplicate participants removed</div>
                </div>

                <div class="stat-card" style={{ "padding": "1.2rem", "border-left": "4px solid #3b82f6" }}>
                  <h3 style={{ "font-size": "1rem" }}>Total Teacher Beneficiaries (Project Start to Date)</h3>
                  <div class="value" style={{ "font-size": "1.5rem" }}>{getStats().totalT}</div>
                  <div style={{ "font-size": "0.75rem", "color": "#10b981", "margin-top": "0.5rem" }}>✓ Duplicate participants removed</div>
                </div>
              </div>

              {/* Center Column: Map */}
              <div class="center-map-col">
                <div class="stat-card" style={{ "padding": "1.2rem", "display": "flex", "flex-direction": "column", "align-items": "center", "background": "rgba(255,255,255,0.85)", "color": "#111", "height": "100%", "justify-content": "center" }}>
                  <h3 style={{ "margin": 0, "align-self": "flex-start", "color": "#333", "font-size": "1rem" }}>Implementation Map of Nepal</h3>
                  <div style={{ "font-size": "0.85rem", "color": "#555", "align-self": "flex-start", "margin-bottom": "1rem" }}>{getStats().districts} Total Districts Covered</div>

                  <div class="svg-map-wrapper" innerHTML={mapSvgData()} style={{ "width": "100%", "flex": 1, "min-height": "300px", "display": "flex", "justify-content": "center", "align-items": "center", "overflow": "hidden" }} />
                  <style>
                    {`
                      .svg-map-wrapper svg { width: 100%; height: 100%; max-height: 400px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
                      .svg-map-wrapper svg path {
                        fill: #e2e8f0;
                        stroke: #e2e8f0 !important;
                        stroke-width: 0.5px !important;
                      }
                      /* Highlight the covered districts */
                      ${getStats().districtsArray.map((d: string) => `.svg-map-wrapper svg path[id="${d}"]`).join(', ')} {
                        fill: #3b82f6 !important;
                        stroke: #1d4ed8 !important;
                        stroke-width: 1px !important;
                      }
                      
                      .dashboard-2d-grid {
                        display: grid;
                        grid-template-columns: 1fr 2fr 1fr;
                        gap: 1.5rem;
                      }
                      .side-col {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                      }
                      .center-map-col {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                      }
                      
                      @media (max-width: 1024px) {
                        .dashboard-2d-grid {
                           grid-template-columns: 1fr 1fr;
                        }
                        .center-map-col {
                           grid-column: 1 / -1;
                           order: -1; /* Map on top */
                        }
                      }
                      @media (max-width: 768px) {
                        .dashboard-2d-grid {
                           grid-template-columns: 1fr;
                        }
                      }
                    `}
                  </style>
                </div>
              </div>

              {/* Right Column */}
              <div class="side-col">
                <div class="stat-card" style={{ "padding": "1.2rem" }}>
                  <h3 style={{ "font-size": "1rem" }}>Active Student Users</h3>
                  <div class="value" style={{ "font-size": "2rem" }}>{getStats().activeS}</div>
                  <div style={{ "font-size": "0.85rem", "color": "var(--text-muted)" }}>Boys: {getStats().activeBoysPct}% | Girls: {getStats().activeGirlsPct}%</div>
                </div>

                <div class="stat-card" style={{ "padding": "1.2rem" }}>
                  <h3 style={{ "font-size": "1rem" }}>Alumni Students</h3>
                  <div class="value" style={{ "font-size": "2rem" }}>{getStats().alumniS}</div>
                  <div style={{ "font-size": "0.85rem", "color": "var(--text-muted)" }}>Boys: {getStats().alumniBoysPct}% | Girls: {getStats().alumniGirlsPct}%</div>
                </div>

                <div class="stat-card" style={{ "padding": "1.2rem" }}>
                  <h3 style={{ "font-size": "1rem" }}>Active Teachers</h3>
                  <div class="value" style={{ "font-size": "2rem" }}>{getStats().activeT}</div>
                  <div style={{ "font-size": "0.85rem", "color": "var(--text-muted)" }}>Male: {getStats().activeTMalePct}% | Female: {getStats().activeTFemalePct}%</div>
                </div>

                <div class="stat-card" style={{ "padding": "1.2rem" }}>
                  <h3 style={{ "font-size": "1rem" }}>CLEC Training Events</h3>
                  <div class="value" style={{ "font-size": "1.5rem" }}>{getStats().trainingEvents}</div>
                  <div style={{ "font-size": "0.85rem", "color": "var(--text-muted)", "margin-top": "0.2rem" }}>Participants: {getStats().totalParticipants}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab() === 'schools' && (
            <div style={{ "overflow-x": "auto" }}>
              <table style={{ width: '100%', "border-collapse": 'collapse', "text-align": 'left', "white-space": "nowrap" }}>
                <thead>
                  <tr style={{ "border-bottom": '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem' }}>School Name</th>
                    <th style={{ padding: '1rem' }}>District</th>
                    <th style={{ padding: '1rem' }}>Local Level</th>
                    <th style={{ padding: '1rem' }}>Principal</th>
                    <th style={{ padding: '1rem', "text-align": 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={schools()}>{(item) => (
                    <tr style={{ "border-bottom": '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>{item.school_name}</td>
                      <td style={{ padding: '1rem' }}>{item.district}</td>
                      <td style={{ padding: '1rem' }}>{item.local_level}</td>
                      <td style={{ padding: '1rem' }}>{item.principal_name}</td>
                      <td style={{ padding: '1rem', "text-align": 'right' }}>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "margin-right": "0.5rem", "background": "transparent", "border": "1px solid var(--primary-color)", "color": "var(--primary-color)" }} onClick={() => openModal('edit', 'school', item)}>Edit</button>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "background": "#ef4444" }} onClick={() => deleteRecord('school', item.id)}>Delete</button>
                      </td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          )}

          {activeTab() === 'students' && (
            <div style={{ "overflow-x": "auto" }}>
              <table style={{ width: '100%', "border-collapse": 'collapse', "text-align": 'left', "white-space": "nowrap" }}>
                <thead>
                  <tr style={{ "border-bottom": '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem' }}>ID</th>
                    <th style={{ padding: '1rem' }}>Gender</th>
                    <th style={{ padding: '1rem' }}>School</th>
                    <th style={{ padding: '1rem' }}>Grade</th>
                    <th style={{ padding: '1rem' }}>Year</th>
                    <th style={{ padding: '1rem', "text-align": 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={students()}>{(item) => (
                    <tr style={{ "border-bottom": '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>{item.student_id}</td>
                      <td style={{ padding: '1rem' }}>{item.gender}</td>
                      <td style={{ padding: '1rem' }}>{item.school_name}</td>
                      <td style={{ padding: '1rem' }}>{item.grade}</td>
                      <td style={{ padding: '1rem' }}>{item.academic_year}</td>
                      <td style={{ padding: '1rem', "text-align": 'right' }}>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "margin-right": "0.5rem", "background": "transparent", "border": "1px solid var(--primary-color)", "color": "var(--primary-color)" }} onClick={() => openModal('edit', 'student', item)}>Edit</button>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "background": "#ef4444" }} onClick={() => deleteRecord('student', item.id)}>Delete</button>
                      </td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          )}

          {activeTab() === 'teachers' && (
            <div style={{ "overflow-x": "auto" }}>
              <table style={{ width: '100%', "border-collapse": 'collapse', "text-align": 'left', "white-space": "nowrap" }}>
                <thead>
                  <tr style={{ "border-bottom": '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem' }}>ID</th>
                    <th style={{ padding: '1rem' }}>Gender</th>
                    <th style={{ padding: '1rem' }}>School Name</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem', "text-align": 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={teachers()}>{(item) => (
                    <tr style={{ "border-bottom": '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>{item.teacher_id}</td>
                      <td style={{ padding: '1rem' }}>{item.gender}</td>
                      <td style={{ padding: '1rem' }}>{item.school_name}</td>
                      <td style={{ padding: '1rem' }}>{item.status}</td>
                      <td style={{ padding: '1rem', "text-align": 'right' }}>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "margin-right": "0.5rem", "background": "transparent", "border": "1px solid var(--primary-color)", "color": "var(--primary-color)" }} onClick={() => openModal('edit', 'teacher', item)}>Edit</button>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "background": "#ef4444" }} onClick={() => deleteRecord('teacher', item.id)}>Delete</button>
                      </td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          )}

          {activeTab() === 'trainings' && (
            <div style={{ "overflow-x": "auto" }}>
              <table style={{ width: '100%', "border-collapse": 'collapse', "text-align": 'left', "white-space": "nowrap" }}>
                <thead>
                  <tr style={{ "border-bottom": '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem' }}>Participant</th>
                    <th style={{ padding: '1rem' }}>Training Title</th>
                    <th style={{ padding: '1rem' }}>School</th>
                    <th style={{ padding: '1rem' }}>Dates</th>
                    <th style={{ padding: '1rem', "text-align": 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={trainings() || []}>{(item: any) => (
                    <tr style={{ "border-bottom": '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', "font-weight": 500 }}>
                        <div style={{ "display": "flex", "align-items": "center", "gap": "1rem" }}>
                          <div style={{ "width": "35px", "height": "35px", "border-radius": "50%", "background": "var(--primary)", "color": "white", "display": "flex", "align-items": "center", "justify-content": "center", "font-weight": "bold", "flex-shrink": 0 }}>
                            {item.participant_name ? item.participant_name.charAt(0) : 'T'}
                          </div>
                          <div>
                            <div>{item.participant_name}</div>
                            <div style={{ "font-size": "0.85rem", "color": "var(--text-muted)", "font-weight": "normal" }}>{item.email_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>{item.training_title}</td>
                      <td style={{ padding: '1rem' }}>{item.school_name}</td>
                      <td style={{ padding: '1rem' }}>{item.start_date} - {item.end_date}</td>
                      <td style={{ padding: '1rem', "text-align": 'right' }}>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "margin-right": "0.5rem", "background": "transparent", "border": "1px solid var(--primary-color)", "color": "var(--primary-color)" }} onClick={() => openModal('edit', 'training', item)}>Edit</button>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "background": "#ef4444" }} onClick={() => deleteRecord('training', item.id)}>Delete</button>
                      </td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          )}


        </div>
      </main>

      {/* Modal for Adding/Editing Records */}
      <Show when={showModal()}>
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', "backdrop-filter": 'blur(5px)',
          display: 'flex', "justify-content": 'center', "align-items": 'center',
          "z-index": 1000
        }}>
          <div class="glass-card" style={{ width: '500px', padding: '2rem', "max-height": "90vh", "overflow-y": "auto" }}>
            <h2 style={{ "margin-top": 0 }}>{modalMode() === 'add' ? 'Add New' : 'Edit'} {modalType().charAt(0).toUpperCase() + modalType().slice(1)}</h2>
            <form onSubmit={submitRecord}>

              {modalType() === 'school' && (
                <>
                  <div class="form-group"><label>School Name</label><input required type="text" class="form-control" value={formData().school_name || ''} onInput={(e) => updateForm('school_name', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group">
                    <label>Province</label>
                    <select class="form-control" value={formData().province || ''} onInput={(e) => {
                      updateForm('province', (e.target as HTMLSelectElement).value);
                      updateForm('district', '');
                    }}>
                      <option value="">-- Select Province --</option>
                      <For each={ALL_PROVINCES}>{(p) => <option value={p}>{p}</option>}</For>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>District</label>
                    <select class="form-control" value={formData().district || ''} onInput={(e) => updateForm('district', (e.target as HTMLSelectElement).value)} disabled={!formData().province}>
                      <option value="">-- Select District --</option>
                      <Show when={formData().province && PROVINCES_AND_DISTRICTS[formData().province]}>
                        <For each={PROVINCES_AND_DISTRICTS[formData().province] || []}>{(d) => <option value={d}>{d}</option>}</For>
                      </Show>
                    </select>
                  </div>
                  <div class="form-group"><label>Local Level</label><input type="text" class="form-control" value={formData().local_level || ''} onInput={(e) => updateForm('local_level', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Principal Name</label><input type="text" class="form-control" value={formData().principal_name || ''} onInput={(e) => updateForm('principal_name', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Email ID</label><input type="email" class="form-control" value={formData().email_id || ''} onInput={(e) => updateForm('email_id', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Established Year</label><input type="number" class="form-control" value={formData().clec_established_year || ''} onInput={(e) => updateForm('clec_established_year', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Category</label><input type="text" class="form-control" value={formData().clec_category || ''} onInput={(e) => updateForm('clec_category', (e.target as HTMLInputElement).value)} /></div>
                </>
              )}

              {modalType() === 'student' && (
                <>
                  <div class="form-group"><label>Student ID</label><input required type="text" class="form-control" value={formData().student_id || ''} onInput={(e) => updateForm('student_id', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group">
                    <label>Gender</label>
                    <select class="form-control" value={formData().gender || ''} onInput={(e) => updateForm('gender', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select Gender --</option>
                      <option value="Boy">Boy</option>
                      <option value="Girl">Girl</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>School Name</label>
                    <select class="form-control" value={formData().school_name || ''} onInput={(e) => updateForm('school_name', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select School --</option>
                      <For each={schools() || []}>{(s: any) => <option value={s.school_name}>{s.school_name}</option>}</For>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Grade</label>
                    <select class="form-control" value={formData().grade || ''} onInput={(e) => updateForm('grade', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select Grade --</option>
                      {['ECD', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => <option value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div class="form-group"><label>Academic Year</label><input type="number" class="form-control" value={formData().academic_year || ''} onInput={(e) => updateForm('academic_year', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>School District</label><input type="text" class="form-control" value={formData().school_district || ''} onInput={(e) => updateForm('school_district', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group">
                    <label>Category</label>
                    <select class="form-control" value={formData().category || ''} onInput={(e) => updateForm('category', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select Category --</option>
                      <option value="Active">Active</option>
                      <option value="Graduated">Graduated</option>
                      <option value="Alumni">Alumni</option>
                      <option value="Completed">Completed</option>
                      <option value="Drop-out">Drop-out</option>
                    </select>
                  </div>
                </>
              )}

              {modalType() === 'teacher' && (
                <>
                  <div class="form-group"><label>Teacher ID</label><input required type="text" class="form-control" value={formData().teacher_id || ''} onInput={(e) => updateForm('teacher_id', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group">
                    <label>Gender</label>
                    <select class="form-control" value={formData().gender || ''} onInput={(e) => updateForm('gender', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select Gender --</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>School Name</label>
                    <select class="form-control" value={formData().school_name || ''} onInput={(e) => updateForm('school_name', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select School --</option>
                      <For each={schools() || []}>{(s: any) => <option value={s.school_name}>{s.school_name}</option>}</For>
                    </select>
                  </div>
                  <div class="form-group"><label>School District</label><input type="text" class="form-control" value={formData().school_district || ''} onInput={(e) => updateForm('school_district', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group">
                    <label>Status</label>
                    <select class="form-control" value={formData().status || ''} onInput={(e) => updateForm('status', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select Status --</option>
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                  <div class="form-group"><label>Email</label><input type="email" class="form-control" value={formData().email || ''} onInput={(e) => updateForm('email', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Contact</label><input type="text" class="form-control" value={formData().contact || ''} onInput={(e) => updateForm('contact', (e.target as HTMLInputElement).value)} /></div>
                </>
              )}

              {modalType() === 'training' && (
                <>
                  <div class="form-group"><label>Training Title</label><input required type="text" class="form-control" value={formData().training_title || ''} onInput={(e) => updateForm('training_title', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Participant Name</label><input type="text" class="form-control" value={formData().participant_name || ''} onInput={(e) => updateForm('participant_name', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group">
                    <label>School Name</label>
                    <select class="form-control" value={formData().school_name || ''} onInput={(e) => updateForm('school_name', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select School --</option>
                      <For each={schools() || []}>{(s: any) => <option value={s.school_name}>{s.school_name}</option>}</For>
                    </select>
                  </div>
                  <div class="form-group"><label>Start Date</label><input type="date" class="form-control" value={formData().start_date || ''} onInput={(e) => updateForm('start_date', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>End Date</label><input type="date" class="form-control" value={formData().end_date || ''} onInput={(e) => updateForm('end_date', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group">
                    <label>Credit Course</label>
                    <select class="form-control" value={formData().credit_course || ''} onInput={(e) => updateForm('credit_course', (e.target as HTMLSelectElement).value)}>
                      <option value="">-- Select --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div class="form-group"><label>Email ID</label><input type="email" class="form-control" value={formData().email_id || ''} onInput={(e) => updateForm('email_id', (e.target as HTMLInputElement).value)} /></div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', "margin-top": '2rem' }}>
                <button type="submit" class="btn" disabled={isSaving()}>{isSaving() ? 'Saving...' : 'Save Record'}</button>
                <button type="button" class="btn" style={{ background: '#555', color: '#fff', border: 'none' }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      <Show when={showInfo()}>
        <div class="modal-overlay" onClick={() => setShowInfo(false)}>
          <div class="modal-content animate-fade-in" style={{ "max-width": "400px", "text-align": "center" }} onClick={e => e.stopPropagation()}>
            <h2>App Info</h2>
            <img src={logoUrl} alt="Logo" style={{ width: "60px", margin: "1rem 0" }} />
            <p style={{ "margin-bottom": "1rem", "line-height": "1.5" }}>
              This app is developed by <strong>Nepal AI and Artificial Digital Solutions</strong>.
            </p>
            <div style={{ "background": "var(--bg-color)", "padding": "1rem", "border-radius": "8px", "margin-bottom": "1.5rem" }}>
              <div style={{ "margin-bottom": "0.5rem" }}><strong>Version:</strong> {appVersion()}</div>
              <div><strong>Installed On:</strong> {localStorage.getItem('installDate')}</div>
            </div>
            <button class="btn" onClick={() => setShowInfo(false)}>Close</button>
          </div>
        </div>
      </Show>
    </>
  );
}

export default App;
