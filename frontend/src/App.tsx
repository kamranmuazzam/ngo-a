import { createSignal, createResource, For, Show, onMount } from 'solid-js';
import * as XLSX from 'xlsx';

const API_URL = `http://${window.location.hostname}:3000`;
const AGENT_URL = `http://${window.location.hostname}:8001`;

const fetchData = (type: string) => async () => {
  const res = await fetch(`${API_URL}/api/${type}`);
  return res.json();
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
  
  // File Upload State
  const [isUploading, setIsUploading] = createSignal(false);
  const [uploadStatus, setUploadStatus] = createSignal('');
  let fileInputRef: HTMLInputElement | undefined;

  // Report State
  const [reportTopic, setReportTopic] = createSignal('');
  const [reportType, setReportType] = createSignal('custom');
  const [selectedTrainingFilter, setSelectedTrainingFilter] = createSignal('all');
  const [additionalContext, setAdditionalContext] = createSignal('');
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [reportStatus, setReportStatus] = createSignal('');

  // Wizard State
  const [wizardMode, setWizardMode] = createSignal(false);
  const [wizardQuestions, setWizardQuestions] = createSignal<string[]>([]);
  const [wizardAnswers, setWizardAnswers] = createSignal<string[]>([]);
  const [wizardHistory, setWizardHistory] = createSignal<{question: string, answer: string}[]>([]);
  const [savedTemplates, setSavedTemplates] = createSignal<{name: string, questions: string[]}[]>([]);
  const [selectedTemplate, setSelectedTemplate] = createSignal('');


  // Chat State
  const [chatMessages, setChatMessages] = createSignal([{role: 'assistant', content: 'Hello! I am the EduBase AI assistant. How can I help you today?'}]);
  const [chatInput, setChatInput] = createSignal('');
  const [isChatting, setIsChatting] = createSignal(false);

  // DB Data State
  const [schools, { refetch: refetchSchools }] = createResource(fetchData('schools'));
  const [students, { refetch: refetchStudents }] = createResource(fetchData('students'));
  const [teachers, { refetch: refetchTeachers }] = createResource(fetchData('teachers'));
  const [trainings, { refetch: refetchTrainings }] = createResource(fetchData('trainings'));
  const [reports, { refetch: refetchReports }] = createResource(fetchData('reports'));

  // Modal State
  const [showModal, setShowModal] = createSignal(false);
  const [modalMode, setModalMode] = createSignal<'add' | 'edit'>('add');
  const [modalType, setModalType] = createSignal<'school' | 'student' | 'teacher' | 'training'>('student');
  const [editingId, setEditingId] = createSignal<string>('');
  
  const [mapSvgData, setMapSvgData] = createSignal('');

  onMount(() => {
    
    fetch('/nepal.svg').then(r => r.text()).then(t => setMapSvgData(t));
    fetch(`${AGENT_URL}/api/wizard/templates`).then(r => r.json()).then(t => setSavedTemplates(t)).catch(e => console.log(e));

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

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Sending to AI Agent for analysis...');
    
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(`${AGENT_URL}/api/extract-excel`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      
      if (res.ok) {
        setUploadStatus(`Success! AI successfully extracted records from ${file.name}.`);
      } else {
        setUploadStatus(`Error: ${data.detail || 'Failed to analyze'}`);
      }
    } catch (error) {
      setUploadStatus('Error uploading file.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  const [runtimeSeconds, setRuntimeSeconds] = createSignal(0);
  let runtimeInterval: any;

  const getStats = () => {
    const s = students() || [];
    const t = teachers() || [];
    const sch = schools() || [];
    const tr = trainings() || [];

    const activeS = s.filter((x:any) => x.category?.toLowerCase() === 'active');
    const activeBoys = activeS.filter((x:any) => x.gender?.toLowerCase() === 'boy' || x.gender?.toLowerCase() === 'male').length;
    const activeGirls = activeS.filter((x:any) => x.gender?.toLowerCase() === 'girl' || x.gender?.toLowerCase() === 'female').length;

    const alumniS = s.filter((x:any) => x.category?.toLowerCase() === 'graduated' || x.category?.toLowerCase() === 'alumni' || x.category?.toLowerCase() === 'completed');
    const alumniBoys = alumniS.filter((x:any) => x.gender?.toLowerCase() === 'boy' || x.gender?.toLowerCase() === 'male').length;
    const alumniGirls = alumniS.filter((x:any) => x.gender?.toLowerCase() === 'girl' || x.gender?.toLowerCase() === 'female').length;

    const activeT = t.filter((x:any) => x.status?.toLowerCase() === 'active');
    const activeTMale = activeT.filter((x:any) => x.gender?.toLowerCase() === 'male' || x.gender?.toLowerCase() === 'm').length;
    const activeTFemale = activeT.filter((x:any) => x.gender?.toLowerCase() === 'female' || x.gender?.toLowerCase() === 'f').length;

    const allSBoys = s.filter((x:any) => x.gender?.toLowerCase() === 'boy' || x.gender?.toLowerCase() === 'male').length;
    const allSGirls = s.filter((x:any) => x.gender?.toLowerCase() === 'girl' || x.gender?.toLowerCase() === 'female').length;

    const districtsSet = new Set(sch.map((x:any) => x.district?.toUpperCase()).filter(Boolean));
    const districts = districtsSet.size;
    const trainingEvents = new Set(tr.map((x:any) => (x.training_title || '') + (x.start_date || ''))).size;

    const calcPct = (part:number, total:number) => total > 0 ? Math.round((part / total) * 100) : 0;

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

  
  const startWizard = async () => {
    if (selectedTemplate()) {
      const template = savedTemplates().find(t => t.name === selectedTemplate());
      if (template) {
        setWizardHistory([]);
        setWizardQuestions(template.questions);
        setWizardAnswers(new Array(template.questions.length).fill(''));
        setWizardMode(true);
        return;
      }
    }
    
    setIsGenerating(true);
    setReportStatus('Analyzing requirements...');
    try {
      const res = await fetch(`${AGENT_URL}/api/wizard/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: reportTopic(),
          report_type: reportType(),
          training_filter: selectedTrainingFilter(),
          history: []
        })
      });
      const data = await res.json();
      if (data.status === 'asking') {
        setWizardQuestions(data.questions);
        setWizardAnswers(new Array(data.questions.length).fill(''));
        setWizardMode(true);
      } else {
        await generateReport();
      }
    } catch (e) {
      setReportStatus('Error starting wizard.');
    } finally {
      setIsGenerating(false);
    }
  };

  const nextWizardStep = async () => {
    const newHistory = [...wizardHistory()];
    wizardQuestions().forEach((q, i) => {
      newHistory.push({ question: q, answer: wizardAnswers()[i] });
    });
    setWizardHistory(newHistory);
    
    if (selectedTemplate()) {
      // If using template, just generate after answering
      await generateReport();
      return;
    }

    setIsGenerating(true);
    setReportStatus('Analyzing answers...');
    try {
      const res = await fetch(`${AGENT_URL}/api/wizard/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: reportTopic(),
          report_type: reportType(),
          training_filter: selectedTrainingFilter(),
          history: newHistory
        })
      });
      const data = await res.json();
      if (data.status === 'asking') {
        setWizardQuestions(data.questions);
        setWizardAnswers(new Array(data.questions.length).fill(''));
      } else {
        await generateReport();
      }
    } catch (e) {
      setReportStatus('Error in wizard.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const saveWorkflow = async () => {
    const name = prompt("Enter a name for this Workflow Template:");
    if (!name) return;
    const questions = wizardHistory().map(h => h.question);
    try {
      await fetch(`${AGENT_URL}/api/wizard/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, questions })
      });
      alert("Workflow saved!");
      const res = await fetch(`${AGENT_URL}/api/wizard/templates`);
      setSavedTemplates(await res.json());
    } catch (e) {
      alert("Error saving workflow");
    }
  };

  const generateReport = async () => {
    if (!reportTopic()) {
      alert("Please enter a topic for the report.");
      return;
    }
    setIsGenerating(true);
    setReportStatus('AI is analyzing the database and drafting Typst code...');
    setRuntimeSeconds(0);
    
    runtimeInterval = setInterval(() => {
      setRuntimeSeconds((s) => s + 1);
    }, 1000);
    
    try {
      const res = await fetch(`${AGENT_URL}/api/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: reportTopic(),
          report_type: reportType(),
          training_filter: selectedTrainingFilter(),
          additional_context: additionalContext(),
          qa_history: wizardHistory()
        })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Save to DB
        await fetch(`${API_URL}/api/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: reportTopic(),
            content: data.report_text,
            runtime_seconds: runtimeSeconds(),
            created_at: new Date().toISOString()
          })
        });
        
        setReportStatus('Report Generated & Saved Successfully!');
        refetchReports();
        setReportTopic('');
      } else {
        const data = await res.json();
        setReportStatus(`Error generating report: ${data.detail || 'Failed'}`);
      }
    } catch (error) {
      setReportStatus('Error generating report.');
    } finally {
      setIsGenerating(false);
      clearInterval(runtimeInterval);
      setTimeout(() => setReportStatus(''), 5000);
    }
  };

  const downloadReport = async (report: any) => {
    try {
      const res = await fetch(`${API_URL}${report.content}`);
      const blob = await res.blob();
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = `${report.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      alert("Error downloading PDF");
    }
  };
  
  const viewReportContent = (report: any) => {
    window.open(`${API_URL}${report.content}`, '_blank');
  };

  const sendChatMessage = async (e: Event) => {
    e.preventDefault();
    if (!chatInput().trim()) return;
    
    const userMsg = chatInput().trim();
    setChatMessages([...chatMessages(), { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsChatting(true);
    
    try {
      const res = await fetch(`${AGENT_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg }),
      });
      const data = await res.json();
      
      setChatMessages([...chatMessages(), { role: 'assistant', content: data.response || 'Error retrieving response.' }]);
    } catch (error) {
      setChatMessages([...chatMessages(), { role: 'assistant', content: 'Network Error connecting to AI Agent.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const submitRecord = async (e: Event) => {
    e.preventDefault();
    setIsSaving(true);
    
    const type = modalType();
    const mode = modalMode();
    const idString = editingId();
    
    const url = mode === 'add' 
      ? `${API_URL}/api/${type}s`
      : `${API_URL}/api/${type}s/${encodeURIComponent(idString)}`;

    try {
      const res = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData()),
      });
      if (res.ok) {
        setShowModal(false);
        if (type === 'school') refetchSchools();
        if (type === 'student') refetchStudents();
        if (type === 'teacher') refetchTeachers();
        if (type === 'training') refetchTrainings();
      } else {
        alert("Failed to save record.");
      }
    } catch (error) {
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
      const res = await fetch(`${API_URL}/api/${type}s/${encodeURIComponent(idString)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (type === 'school') refetchSchools();
        if (type === 'student') refetchStudents();
        if (type === 'teacher') refetchTeachers();
        if (type === 'training') refetchTrainings();
      } else {
        alert("Failed to delete.");
      }
    } catch (error) {
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
        <div class="sidebar-title">EduBase</div>
        <a href="#" class={`nav-link ${activeTab() === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>Dashboard</a>
        <a href="#" class={`nav-link ${activeTab() === 'upload' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('upload'); }}>Upload Data</a>
        <a href="#" class={`nav-link ${activeTab() === 'schools' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('schools'); }}>Schools</a>
        <a href="#" class={`nav-link ${activeTab() === 'students' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('students'); }}>Students</a>
        <a href="#" class={`nav-link ${activeTab() === 'teachers' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('teachers'); }}>Teachers</a>
        <a href="#" class={`nav-link ${activeTab() === 'trainings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('trainings'); }}>Trainings</a>
        <a href="#" class={`nav-link ${activeTab() === 'reports' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('reports'); }}>AI Reports</a>
        <a href="#" class={`nav-link ${activeTab() === 'chat' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('chat'); }}>AI Chat</a>
      </aside>

      <main class="main-content">
        <div class="header">
          <h1>
            {activeTab() === 'dashboard' && 'Overview Dashboard'}
            {activeTab() === 'upload' && 'Upload Data'}
            {activeTab() === 'schools' && 'Partner Schools Directory'}
            {activeTab() === 'students' && 'Student Beneficiaries'}
            {activeTab() === 'teachers' && 'Teacher Roster'}
            {activeTab() === 'trainings' && 'Training & Events'}
            {activeTab() === 'reports' && 'Generate Reports'}
            {activeTab() === 'chat' && 'AI Assistant'}
          </h1>
          <div style={{ display: 'flex', gap: '1rem', "align-items": "center" }}>
            <button class="btn" style={{ "background": "transparent", "color": "var(--primary-color)", "border": "2px solid var(--primary-color)" }} onClick={exportToExcel}>
              Export All Data (Excel)
            </button>
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
                <div class="stat-card" style={{"padding": "1.2rem"}}>
                  <h3 style={{"font-size": "1rem"}}>Total CLEC Schools</h3>
                  <div class="value" style={{"font-size": "2rem"}}>{getStats().schools}</div>
                  <div style={{"font-size": "0.85rem", "color": "var(--text-muted)"}}>{getStats().districts} Districts Covered</div>
                </div>

                <div class="stat-card" style={{"padding": "1.2rem", "border-left": "4px solid #3b82f6"}}>
                  <h3 style={{"font-size": "1rem"}}>Total Student Beneficiaries (Project Start to Date)</h3>
                  <div class="value" style={{"font-size": "1.5rem"}}>{getStats().totalS}</div>
                  <div style={{"font-size": "0.85rem", "color": "var(--text-muted)"}}>Boys: {getStats().totalSBoys} | Girls: {getStats().totalSGirls}</div>
                  <div style={{"font-size": "0.75rem", "color": "#10b981", "margin-top": "0.5rem"}}>✓ Duplicate participants removed</div>
                </div>

                <div class="stat-card" style={{"padding": "1.2rem", "border-left": "4px solid #3b82f6"}}>
                  <h3 style={{"font-size": "1rem"}}>Total Teacher Beneficiaries (Project Start to Date)</h3>
                  <div class="value" style={{"font-size": "1.5rem"}}>{getStats().totalT}</div>
                  <div style={{"font-size": "0.75rem", "color": "#10b981", "margin-top": "0.5rem"}}>✓ Duplicate participants removed</div>
                </div>
              </div>

              {/* Center Column: Map */}
              <div class="center-map-col">
                <div class="stat-card" style={{"padding": "1.2rem", "display": "flex", "flex-direction": "column", "align-items": "center", "background": "rgba(255,255,255,0.85)", "color": "#111", "height": "100%", "justify-content": "center"}}>
                  <h3 style={{"margin": 0, "align-self": "flex-start", "color": "#333", "font-size": "1rem"}}>Implementation Map of Nepal</h3>
                  <div style={{"font-size": "0.85rem", "color": "#555", "align-self": "flex-start", "margin-bottom": "1rem"}}>{getStats().districts} Total Districts Covered</div>
                  
                  <div class="svg-map-wrapper" innerHTML={mapSvgData()} style={{"width": "100%", "flex": 1, "min-height": "300px", "display": "flex", "justify-content": "center", "align-items": "center", "overflow": "hidden"}} />
                  <style>
                    {`
                      .svg-map-wrapper svg { width: 100%; height: 100%; max-height: 400px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
                      .svg-map-wrapper svg path {
                        stroke: #64748b !important;
                        stroke-width: 0.6px !important;
                        fill: #e2e8f0;
                      }
                      /* Highlight the covered districts */
                      ${getStats().districtsArray.map((d:string) => `.svg-map-wrapper svg path[id="${d}"]`).join(', ')} {
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
                <div class="stat-card" style={{"padding": "1.2rem"}}>
                  <h3 style={{"font-size": "1rem"}}>Active Student Users</h3>
                  <div class="value" style={{"font-size": "2rem"}}>{getStats().activeS}</div>
                  <div style={{"font-size": "0.85rem", "color": "var(--text-muted)"}}>Boys: {getStats().activeBoysPct}% | Girls: {getStats().activeGirlsPct}%</div>
                </div>
                
                <div class="stat-card" style={{"padding": "1.2rem"}}>
                  <h3 style={{"font-size": "1rem"}}>Alumni Students</h3>
                  <div class="value" style={{"font-size": "2rem"}}>{getStats().alumniS}</div>
                  <div style={{"font-size": "0.85rem", "color": "var(--text-muted)"}}>Boys: {getStats().alumniBoysPct}% | Girls: {getStats().alumniGirlsPct}%</div>
                </div>
                
                <div class="stat-card" style={{"padding": "1.2rem"}}>
                  <h3 style={{"font-size": "1rem"}}>Active Teachers</h3>
                  <div class="value" style={{"font-size": "2rem"}}>{getStats().activeT}</div>
                  <div style={{"font-size": "0.85rem", "color": "var(--text-muted)"}}>Male: {getStats().activeTMalePct}% | Female: {getStats().activeTFemalePct}%</div>
                </div>

                <div class="stat-card" style={{"padding": "1.2rem"}}>
                  <h3 style={{"font-size": "1rem"}}>CLEC Training Events</h3>
                  <div class="value" style={{"font-size": "1.5rem"}}>{getStats().trainingEvents}</div>
                  <div style={{"font-size": "0.85rem", "color": "var(--text-muted)", "margin-top": "0.2rem"}}>Participants: {getStats().totalParticipants}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab() === 'upload' && (
            <div class="stat-card" style={{"padding": "2rem", "max-width": "600px", "margin": "0 auto"}}>
              <h3 style={{"margin-top": 0, "font-size": "1.2rem"}}>Quick Upload Data</h3>
              <p style={{"color": "var(--text-muted)", "margin-bottom": "1.5rem"}}>Upload your Excel (.xlsx) file to sync the latest CLEC data.</p>
              <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
              <button class="btn" onClick={() => fileInputRef?.click()} style={{"width": "100%", "background": "var(--card-bg)", "border": "2px dashed var(--border-color)", "padding": "2rem", "color": "var(--text-muted)", "font-size": "1.1rem", "cursor": "pointer", "transition": "all 0.2s ease"}}>
                {isUploading() ? '⏳ Syncing via AI...' : '📂 Click to Select Excel File'}
              </button>
              {uploadStatus() && <div style={{"font-size": "1rem", "margin-top": "1rem", "text-align": "center", color: uploadStatus().includes('Error') ? '#ef4444' : '#10b981'}}>{uploadStatus()}</div>}
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
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "margin-right": "0.5rem", "background": "transparent", "border": "1px solid var(--primary)" }} onClick={() => openModal('edit', 'school', item)}>Edit</button>
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
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "margin-right": "0.5rem", "background": "transparent", "border": "1px solid var(--primary)" }} onClick={() => openModal('edit', 'student', item)}>Edit</button>
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
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "margin-right": "0.5rem", "background": "transparent", "border": "1px solid var(--primary)" }} onClick={() => openModal('edit', 'teacher', item)}>Edit</button>
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
                    <th style={{ padding: '1rem' }}>Training Title</th>
                    <th style={{ padding: '1rem' }}>Total Participants</th>
                    <th style={{ padding: '1rem' }}>Dates</th>
                    <th style={{ padding: '1rem', "text-align": 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={getGroupedTrainings()}>{(group: any) => (
                    <tr style={{ "border-bottom": '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', "font-weight": 500 }}>{group.title}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '0.3rem 0.8rem', 'border-radius': '99px', 'font-size': '0.85rem', "font-weight": 600 }}>
                          {group.participants} participants
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{group.start} - {group.end}</td>
                      <td style={{ padding: '1rem', "text-align": 'right' }}>
                        <button class="btn" style={{ "padding": "0.4rem 0.8rem", "background": "transparent", "border": "1px solid var(--border-color)", "color": "var(--text-color)" }} onClick={() => alert("Detailed view would show: " + group.items.map((i:any) => i.participant_name).join(", "))}>View Details</button>
                      </td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          )}

          {activeTab() === 'reports' && (
            <div>
              <h2 style={{ "margin-top": 0 }}>AI PDF Generation</h2>
              <p style={{ color: "var(--text-muted)" }}>
                Generate stunning insights and PDF reports natively compiled via Typst and analyzed by AI.
              </p>
              
              <div class="form-group" style={{ "margin-top": "2rem" }}>
                <label>Report Type</label>
                <select class="form-control" value={reportType()} onChange={(e) => setReportType((e.target as HTMLSelectElement).value)} disabled={isGenerating()}>
                  <option value="impact">Impact Assessment Report</option>
                  <option value="newsletter">DB4N Newsletter</option>
                  <option value="custom">Custom Data Report</option>
                </select>
              </div>
              
              <div class="form-group" style={{ "margin-top": "1rem" }}>
                <label>Focus Training Event (Optional)</label>
                <select class="form-control" value={selectedTrainingFilter()} onChange={(e) => setSelectedTrainingFilter((e.target as HTMLSelectElement).value)} disabled={isGenerating()}>
                  <option value="all">-- All Trainings --</option>
                  <For each={getGroupedTrainings()}>{(group: any) => (
                    <option value={group.title}>{group.title}</option>
                  )}</For>
                </select>
              </div>

              <div class="form-group" style={{ "margin-top": "1rem" }}>
                <label>Report Topic / Details</label>
                <input type="text" class="form-control" placeholder="E.g., Summarize student performance in the latest project..." value={reportTopic()} onInput={(e) => setReportTopic((e.target as HTMLInputElement).value)} disabled={isGenerating()} />
              </div>

              <div class="form-group" style={{ "margin-top": "1rem" }}>
                <label>Additional Qualitative Data (Optional)</label>
                <textarea class="form-control" rows={4} placeholder="Paste stakeholder feedback, specific goals, identified gaps, or notes not present in the database..." value={additionalContext()} onInput={(e) => setAdditionalContext((e.target as HTMLTextAreaElement).value)} disabled={isGenerating()}></textarea>
              </div>
              

              {!wizardMode() ? (
                <>
                  <div class="form-group" style={{ "margin-top": "1rem" }}>
                    <label>Use Saved Workflow Template (Optional)</label>
                    <select class="form-control" value={selectedTemplate()} onChange={(e) => setSelectedTemplate((e.target as HTMLSelectElement).value)} disabled={isGenerating()}>
                      <option value="">-- Create Custom Wizard --</option>
                      <For each={savedTemplates()}>{(t: any) => (
                        <option value={t.name}>{t.name}</option>
                      )}</For>
                    </select>
                  </div>
                  <div style={{ display: 'flex', "align-items": 'center', gap: '1rem', "margin-top": "1rem" }}>
                    <button class="btn" style={{ opacity: isGenerating() ? 0.7 : 1 }} onClick={startWizard} disabled={isGenerating()}>
                      {isGenerating() ? 'Analyzing requirements...' : 'Start Report Wizard'}
                    </button>
                    <button class="btn" style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', opacity: isGenerating() ? 0.7 : 1 }} onClick={generateReport} disabled={isGenerating()}>
                      Direct Generate (Skip Wizard)
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ background: 'var(--surface-color)', padding: '1.5rem', "border-radius": '8px', border: '1px solid var(--border-color)', "margin-top": '2rem' }}>
                  <h3 style={{ "margin-top": 0, color: 'var(--primary-color)' }}>AI Report Wizard</h3>
                  <For each={wizardQuestions()}>{(q, i) => (
                    <div class="form-group" style={{ "margin-top": "1rem" }}>
                      <label>{q}</label>
                      <textarea class="form-control" rows={3} value={wizardAnswers()[i()]} onInput={(e) => {
                        const newAnswers = [...wizardAnswers()];
                        newAnswers[i()] = (e.target as HTMLTextAreaElement).value;
                        setWizardAnswers(newAnswers);
                      }}></textarea>
                    </div>
                  )}</For>
                  <div style={{ display: 'flex', "align-items": 'center', gap: '1rem', "margin-top": "1.5rem" }}>
                    <button class="btn" onClick={nextWizardStep} disabled={isGenerating()}>
                      {isGenerating() ? 'Analyzing...' : 'Next Step / Generate'}
                    </button>
                    {!selectedTemplate() && wizardHistory().length > 0 && (
                       <button class="btn" style={{ background: '#10b981' }} onClick={saveWorkflow}>Save as Template</button>
                    )}
                    <button class="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={() => { setWizardMode(false); setWizardHistory([]); }}>Cancel</button>
                  </div>
                </div>
              )}
              {isGenerating() && (
                  <span style={{ color: 'var(--primary)', "font-family": 'monospace', "margin-top": "1rem", display: "block" }}>
                    Runtime: {Math.floor(runtimeSeconds() / 60).toString().padStart(2, '0')}:{(runtimeSeconds() % 60).toString().padStart(2, '0')}
                  </span>
              )}

              
              {reportStatus() && (
                <div style={{ "margin-top": "1rem", color: reportStatus().includes('Error') ? '#ef4444' : '#10b981' }}>{reportStatus()}</div>
              )}

              <h3 style={{ "margin-top": '3rem' }}>Past Reports</h3>
              <Show when={reports() && reports().length > 0} fallback={<p style={{ color: "var(--text-muted)" }}>No reports generated yet.</p>}>
                <table style={{ width: '100%', "border-collapse": 'collapse', "text-align": 'left', "white-space": "nowrap" }}>
                  <thead>
                    <tr style={{ "border-bottom": '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '1rem' }}>Topic</th>
                      <th style={{ padding: '1rem' }}>Created At</th>
                      <th style={{ padding: '1rem' }}>Runtime</th>
                      <th style={{ padding: '1rem', "text-align": 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={reports()}>{(item) => (
                      <tr style={{ "border-bottom": '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem', "max-width": '300px', overflow: 'hidden', "text-overflow": 'ellipsis' }}>{item.topic}</td>
                        <td style={{ padding: '1rem' }}>{new Date(item.created_at).toLocaleString()}</td>
                        <td style={{ padding: '1rem' }}>{item.runtime_seconds}s</td>
                        <td style={{ padding: '1rem', "text-align": 'right' }}>
                          <button class="btn" style={{ "padding": "0.4rem 0.8rem", "margin-right": "0.5rem", "background": "transparent", "color": "var(--primary-color)", "border": "1px solid var(--primary-color)" }} onClick={() => viewReportContent(item)}>View PDF</button>
                          <button class="btn" style={{ "padding": "0.4rem 0.8rem", "background": "var(--primary-color)" }} onClick={() => downloadReport(item)}>Download PDF</button>
                        </td>
                      </tr>
                    )}</For>
                  </tbody>
                </table>
              </Show>
            </div>
          )}

          {activeTab() === 'chat' && (
            <div style={{ display: 'flex', "flex-direction": 'column', height: '60vh' }}>
              <h2 style={{ "margin-top": 0 }}>AI Chat Assistant</h2>
              
              <div style={{ flex: 1, "overflow-y": 'auto', padding: '1rem', background: 'var(--surface-color)', "border-radius": '8px', "margin-bottom": '1rem', border: '1px solid var(--border-color)' }}>
                <For each={chatMessages()}>{(msg) => (
                  <div style={{ 
                    "margin-bottom": '1rem', 
                    "text-align": msg.role === 'user' ? 'right' : 'left' 
                  }}>
                    <div style={{
                      display: 'inline-block',
                      background: msg.role === 'user' ? 'var(--primary-color)' : '#f1f5f9',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-main)',
                      padding: '0.8rem 1.2rem',
                      "border-radius": '12px',
                      "max-width": '80%',
                      "white-space": 'pre-wrap'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )}</For>
                <Show when={isChatting()}>
                  <div style={{ "text-align": 'left', "margin-bottom": '1rem' }}>
                    <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '0.8rem 1.2rem', "border-radius": '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Thinking...</span>
                    </div>
                  </div>
                </Show>
              </div>

              <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  class="form-control" 
                  placeholder="Ask me anything about your school's data..." 
                  style={{ flex: 1, margin: 0 }} 
                  value={chatInput()} 
                  onInput={(e) => setChatInput((e.target as HTMLInputElement).value)} 
                  disabled={isChatting()}
                />
                <button type="submit" class="btn" disabled={isChatting() || !chatInput().trim()}>Send</button>
              </form>
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
                  <div class="form-group"><label>Province</label><input type="text" class="form-control" value={formData().province || ''} onInput={(e) => updateForm('province', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>District</label><input type="text" class="form-control" value={formData().district || ''} onInput={(e) => updateForm('district', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Local Level</label><input type="text" class="form-control" value={formData().local_level || ''} onInput={(e) => updateForm('local_level', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Principal Name</label><input type="text" class="form-control" value={formData().principal_name || ''} onInput={(e) => updateForm('principal_name', (e.target as HTMLInputElement).value)} /></div>
                </>
              )}

              {modalType() === 'student' && (
                <>
                  <div class="form-group"><label>Student ID</label><input required type="text" class="form-control" value={formData().student_id || ''} onInput={(e) => updateForm('student_id', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Gender</label><input type="text" class="form-control" value={formData().gender || ''} onInput={(e) => updateForm('gender', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>School Name</label><input type="text" class="form-control" value={formData().school_name || ''} onInput={(e) => updateForm('school_name', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Grade</label><input type="text" class="form-control" value={formData().grade || ''} onInput={(e) => updateForm('grade', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Academic Year</label><input type="text" class="form-control" value={formData().academic_year || ''} onInput={(e) => updateForm('academic_year', (e.target as HTMLInputElement).value)} /></div>
                </>
              )}

              {modalType() === 'teacher' && (
                <>
                  <div class="form-group"><label>Teacher ID</label><input required type="text" class="form-control" value={formData().teacher_id || ''} onInput={(e) => updateForm('teacher_id', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Gender</label><input type="text" class="form-control" value={formData().gender || ''} onInput={(e) => updateForm('gender', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>School Name</label><input type="text" class="form-control" value={formData().school_name || ''} onInput={(e) => updateForm('school_name', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Status</label><input type="text" class="form-control" value={formData().status || ''} onInput={(e) => updateForm('status', (e.target as HTMLInputElement).value)} /></div>
                </>
              )}

              {modalType() === 'training' && (
                <>
                  <div class="form-group"><label>Training Title</label><input required type="text" class="form-control" value={formData().training_title || ''} onInput={(e) => updateForm('training_title', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Participant Name</label><input type="text" class="form-control" value={formData().participant_name || ''} onInput={(e) => updateForm('participant_name', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>School Name</label><input type="text" class="form-control" value={formData().school_name || ''} onInput={(e) => updateForm('school_name', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>Start Date</label><input type="text" class="form-control" value={formData().start_date || ''} onInput={(e) => updateForm('start_date', (e.target as HTMLInputElement).value)} /></div>
                  <div class="form-group"><label>End Date</label><input type="text" class="form-control" value={formData().end_date || ''} onInput={(e) => updateForm('end_date', (e.target as HTMLInputElement).value)} /></div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', "margin-top": '2rem' }}>
                <button type="submit" class="btn" disabled={isSaving()}>{isSaving() ? 'Saving...' : 'Save Record'}</button>
                <button type="button" class="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)' }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </>
  );
}

export default App;
