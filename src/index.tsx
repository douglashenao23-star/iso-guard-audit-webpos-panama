import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './' }))

// API Routes

// Get all audits
app.get('/api/audits', async (c) => {
  const { DB } = c.env
  const { results } = await DB.prepare(`
    SELECT a.*, u.name as auditor_name 
    FROM audits a 
    LEFT JOIN users u ON a.user_id = u.id 
    ORDER BY a.created_at DESC
  `).all()
  return c.json(results)
})

// Get audit by ID with details
app.get('/api/audits/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  
  const audit = await DB.prepare(`
    SELECT a.*, u.name as auditor_name 
    FROM audits a 
    LEFT JOIN users u ON a.user_id = u.id 
    WHERE a.id = ?
  `).bind(id).first()
  
  if (!audit) return c.json({ error: 'Audit not found' }, 404)
  
  const documents = await DB.prepare(`
    SELECT * FROM documents WHERE audit_id = ? ORDER BY upload_date DESC
  `).bind(id).all()
  
  const findings = await DB.prepare(`
    SELECT f.*, ic.control_id, ic.control_name 
    FROM findings f 
    LEFT JOIN iso_controls ic ON f.control_id = ic.id 
    WHERE f.audit_id = ? 
    ORDER BY f.severity DESC, f.created_at DESC
  `).bind(id).all()
  
  const assessments = await DB.prepare(`
    SELECT ca.*, ic.control_id, ic.control_name, ic.category 
    FROM compliance_assessments ca 
    LEFT JOIN iso_controls ic ON ca.control_id = ic.id 
    WHERE ca.audit_id = ? 
    ORDER BY ic.control_id
  `).bind(id).all()
  
  return c.json({
    audit,
    documents: documents.results,
    findings: findings.results,
    assessments: assessments.results
  })
})

// Get all ISO controls
app.get('/api/controls', async (c) => {
  const { DB } = c.env
  const { results } = await DB.prepare(`
    SELECT * FROM iso_controls ORDER BY control_id
  `).all()
  return c.json(results)
})

// Get dashboard statistics
app.get('/api/dashboard/stats', async (c) => {
  const { DB } = c.env
  
  const totalAudits = await DB.prepare('SELECT COUNT(*) as count FROM audits').first()
  const activeAudits = await DB.prepare("SELECT COUNT(*) as count FROM audits WHERE status = 'active'").first()
  const totalFindings = await DB.prepare('SELECT COUNT(*) as count FROM findings').first()
  const openFindings = await DB.prepare("SELECT COUNT(*) as count FROM findings WHERE status = 'open'").first()
  
  const findingsBySeverity = await DB.prepare(`
    SELECT severity, COUNT(*) as count 
    FROM findings 
    GROUP BY severity
  `).all()
  
  const complianceOverview = await DB.prepare(`
    SELECT compliance_level, COUNT(*) as count 
    FROM compliance_assessments 
    GROUP BY compliance_level
  `).all()
  
  return c.json({
    totalAudits: totalAudits?.count || 0,
    activeAudits: activeAudits?.count || 0,
    totalFindings: totalFindings?.count || 0,
    openFindings: openFindings?.count || 0,
    findingsBySeverity: findingsBySeverity.results,
    complianceOverview: complianceOverview.results
  })
})

// Create new audit
app.post('/api/audits', async (c) => {
  const { DB } = c.env
  const { title, description, scope, audit_date } = await c.req.json()
  
  const result = await DB.prepare(`
    INSERT INTO audits (title, description, scope, audit_date, status, user_id)
    VALUES (?, ?, ?, ?, 'draft', 1)
  `).bind(title, description, scope, audit_date).run()
  
  return c.json({ id: result.meta.last_row_id, message: 'Audit created successfully' })
})

// Main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IsoGuard Audit WebPOS Panamá - Asistente Inteligente ISO 27001:2022</title>
        <meta name="description" content="IsoGuard Audit WebPOS Panamá - Asistente inteligente para auditorías internas ISO 27001:2022">
        <meta name="theme-color" content="#000000">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#2563eb',
                  secondary: '#1e40af',
                  success: '#10b981',
                  warning: '#f59e0b',
                  danger: '#ef4444'
                }
              }
            }
          }
        </script>
        <style>
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .card {
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }
          .stat-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
          .sidebar {
            width: 280px;
            background: #1f2937;
            color: white;
            min-height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
          }
          .main-content {
            margin-left: 280px;
            padding: 2rem;
            background: #f9fafb;
            min-height: 100vh;
          }
          .nav-item {
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            transition: background 0.2s;
          }
          .nav-item:hover {
            background: #374151;
          }
          .nav-item.active {
            background: #4f46e5;
            border-left: 4px solid #818cf8;
          }
          .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .badge-high { background: #fee2e2; color: #991b1b; }
          .badge-medium { background: #fef3c7; color: #92400e; }
          .badge-low { background: #dbeafe; color: #1e40af; }
          .badge-compliant { background: #d1fae5; color: #065f46; }
          .badge-partial { background: #fef3c7; color: #92400e; }
          .badge-non-compliant { background: #fee2e2; color: #991b1b; }
        </style>
    </head>
    <body class="bg-gray-100">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="p-6">
                <div class="flex items-center mb-8">
                    <i class="fas fa-shield-alt text-3xl text-blue-400 mr-3"></i>
                    <div>
                        <h1 class="text-xl font-bold">IsoGuard Audit WebPOS Panamá</h1>
                        <p class="text-xs text-gray-400">ISO 27001:2022</p>
                    </div>
                </div>
                
                <nav>
                    <div class="nav-item active" onclick="showView('dashboard')">
                        <i class="fas fa-chart-line mr-3"></i> Dashboard
                    </div>
                    <div class="nav-item" onclick="showView('audits')">
                        <i class="fas fa-clipboard-list mr-3"></i> Auditorías
                    </div>
                    <div class="nav-item" onclick="showView('documents')">
                        <i class="fas fa-file-alt mr-3"></i> Documentos
                    </div>
                    <div class="nav-item" onclick="showView('findings')">
                        <i class="fas fa-exclamation-triangle mr-3"></i> Hallazgos
                    </div>
                    <div class="nav-item" onclick="showView('controls')">
                        <i class="fas fa-tasks mr-3"></i> Controles ISO
                    </div>
                    <div class="nav-item" onclick="showView('reports')">
                        <i class="fas fa-file-pdf mr-3"></i> Informes
                    </div>
                </nav>
            </div>
            
            <div class="absolute bottom-0 w-full p-6 border-t border-gray-700">
                <div class="flex items-center">
                    <i class="fas fa-user-circle text-2xl mr-3"></i>
                    <div>
                        <p class="font-semibold text-sm">Douglas</p>
                        <p class="text-xs text-gray-400">Consultor ISO 27001</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="main-content">
            <!-- Dashboard View -->
            <div id="dashboard-view" class="view-content">
                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-gray-800">Dashboard de Auditorías</h2>
                    <p class="text-gray-600 mt-1">Visión general del estado de cumplimiento ISO 27001:2022</p>
                </div>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="stats-container">
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">Total Auditorías</p>
                                <p class="text-3xl font-bold text-gray-800" id="stat-total-audits">-</p>
                            </div>
                            <i class="fas fa-clipboard-list text-4xl text-blue-500"></i>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">Auditorías Activas</p>
                                <p class="text-3xl font-bold text-green-600" id="stat-active-audits">-</p>
                            </div>
                            <i class="fas fa-check-circle text-4xl text-green-500"></i>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">Total Hallazgos</p>
                                <p class="text-3xl font-bold text-orange-600" id="stat-total-findings">-</p>
                            </div>
                            <i class="fas fa-exclamation-triangle text-4xl text-orange-500"></i>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">Hallazgos Abiertos</p>
                                <p class="text-3xl font-bold text-red-600" id="stat-open-findings">-</p>
                            </div>
                            <i class="fas fa-folder-open text-4xl text-red-500"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Charts Row -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold mb-4">Hallazgos por Severidad</h3>
                        <div id="findings-severity-chart" class="space-y-3">
                            <!-- Will be populated by JS -->
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold mb-4">Estado de Cumplimiento</h3>
                        <div id="compliance-chart" class="space-y-3">
                            <!-- Will be populated by JS -->
                        </div>
                    </div>
                </div>
                
                <!-- Recent Audits -->
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Auditorías Recientes</h3>
                    <div id="recent-audits-list">
                        <!-- Will be populated by JS -->
                    </div>
                </div>
            </div>
            
            <!-- Audits View -->
            <div id="audits-view" class="view-content" style="display: none;">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800">Gestión de Auditorías</h2>
                        <p class="text-gray-600 mt-1">Administra tus auditorías ISO 27001:2022</p>
                    </div>
                    <button onclick="showNewAuditForm()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i> Nueva Auditoría
                    </button>
                </div>
                
                <div id="audits-list" class="space-y-4">
                    <!-- Will be populated by JS -->
                </div>
            </div>
            
            <!-- Documents View -->
            <div id="documents-view" class="view-content" style="display: none;">
                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-gray-800">Gestión de Documentos</h2>
                    <p class="text-gray-600 mt-1">Carga y analiza políticas, procedimientos y evidencias</p>
                </div>
                
                <div class="bg-white p-8 rounded-lg shadow mb-6">
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                        <i class="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
                        <p class="text-xl text-gray-600 mb-2">Arrastra documentos aquí o haz clic para seleccionar</p>
                        <p class="text-sm text-gray-500">Soporta PDF, DOCX, XLSX - Máximo 10MB</p>
                        <button class="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-folder-open mr-2"></i> Seleccionar Archivos
                        </button>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-4">Documentos Recientes</h3>
                    <div id="documents-list">
                        <p class="text-gray-500 text-center py-8">No hay documentos cargados aún</p>
                    </div>
                </div>
            </div>
            
            <!-- Findings View -->
            <div id="findings-view" class="view-content" style="display: none;">
                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-gray-800">Hallazgos de Auditoría</h2>
                    <p class="text-gray-600 mt-1">Revisa gaps, observaciones y fortalezas identificadas</p>
                </div>
                
                <div id="findings-list" class="space-y-4">
                    <!-- Will be populated by JS -->
                </div>
            </div>
            
            <!-- Controls View -->
            <div id="controls-view" class="view-content" style="display: none;">
                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-gray-800">Controles ISO 27001:2022</h2>
                    <p class="text-gray-600 mt-1">Anexo A - Controles de seguridad de la información</p>
                </div>
                
                <div id="controls-list" class="space-y-4">
                    <!-- Will be populated by JS -->
                </div>
            </div>
            
            <!-- Reports View -->
            <div id="reports-view" class="view-content" style="display: none;">
                <div class="mb-6">
                    <h2 class="text-3xl font-bold text-gray-800">Informes de Auditoría</h2>
                    <p class="text-gray-600 mt-1">Genera informes interactivos con insights de IA</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow card cursor-pointer">
                        <i class="fas fa-file-pdf text-5xl text-red-500 mb-4"></i>
                        <h3 class="text-lg font-semibold mb-2">Informe Ejecutivo</h3>
                        <p class="text-gray-600 text-sm">Resumen de alto nivel para la dirección</p>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow card cursor-pointer">
                        <i class="fas fa-chart-bar text-5xl text-blue-500 mb-4"></i>
                        <h3 class="text-lg font-semibold mb-2">Informe de Cumplimiento</h3>
                        <p class="text-gray-600 text-sm">Análisis detallado por control ISO</p>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow card cursor-pointer">
                        <i class="fas fa-lightbulb text-5xl text-yellow-500 mb-4"></i>
                        <h3 class="text-lg font-semibold mb-2">Insights de IA</h3>
                        <p class="text-gray-600 text-sm">Recomendaciones inteligentes de mejora</p>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // Navigation
            function showView(viewName) {
                document.querySelectorAll('.view-content').forEach(v => v.style.display = 'none');
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                document.getElementById(viewName + '-view').style.display = 'block';
                event.target.closest('.nav-item').classList.add('active');
                
                // Load data based on view
                if (viewName === 'dashboard') loadDashboard();
                else if (viewName === 'audits') loadAudits();
                else if (viewName === 'findings') loadFindings();
                else if (viewName === 'controls') loadControls();
            }
            
            // Load Dashboard
            async function loadDashboard() {
                try {
                    const response = await axios.get('/api/dashboard/stats');
                    const stats = response.data;
                    
                    document.getElementById('stat-total-audits').textContent = stats.totalAudits;
                    document.getElementById('stat-active-audits').textContent = stats.activeAudits;
                    document.getElementById('stat-total-findings').textContent = stats.totalFindings;
                    document.getElementById('stat-open-findings').textContent = stats.openFindings;
                    
                    // Findings by severity chart
                    const severityChart = document.getElementById('findings-severity-chart');
                    severityChart.innerHTML = stats.findingsBySeverity.map(item => {
                        const total = stats.totalFindings;
                        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        const colors = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-blue-500' };
                        return \`
                            <div>
                                <div class="flex justify-between mb-1">
                                    <span class="capitalize">\${item.severity}</span>
                                    <span>\${item.count} (\${percentage}%)</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-3">
                                    <div class="\${colors[item.severity]} h-3 rounded-full" style="width: \${percentage}%"></div>
                                </div>
                            </div>
                        \`;
                    }).join('');
                    
                    // Compliance chart
                    const complianceChart = document.getElementById('compliance-chart');
                    const totalAssessments = stats.complianceOverview.reduce((sum, item) => sum + item.count, 0);
                    complianceChart.innerHTML = stats.complianceOverview.map(item => {
                        const percentage = totalAssessments > 0 ? Math.round((item.count / totalAssessments) * 100) : 0;
                        const colors = { compliant: 'bg-green-500', partial: 'bg-yellow-500', 'non-compliant': 'bg-red-500' };
                        const labels = { compliant: 'Cumple', partial: 'Parcial', 'non-compliant': 'No Cumple' };
                        return \`
                            <div>
                                <div class="flex justify-between mb-1">
                                    <span>\${labels[item.compliance_level] || item.compliance_level}</span>
                                    <span>\${item.count} (\${percentage}%)</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-3">
                                    <div class="\${colors[item.compliance_level]} h-3 rounded-full" style="width: \${percentage}%"></div>
                                </div>
                            </div>
                        \`;
                    }).join('');
                    
                    // Load recent audits
                    const auditsResponse = await axios.get('/api/audits');
                    const audits = auditsResponse.data.slice(0, 5);
                    
                    const auditsList = document.getElementById('recent-audits-list');
                    auditsList.innerHTML = audits.map(audit => \`
                        <div class="border-b last:border-b-0 py-4 hover:bg-gray-50 cursor-pointer">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-semibold text-gray-800">\${audit.title}</h4>
                                    <p class="text-sm text-gray-600 mt-1">\${audit.description || 'Sin descripción'}</p>
                                    <p class="text-xs text-gray-500 mt-2">
                                        <i class="fas fa-user mr-1"></i>\${audit.auditor_name} | 
                                        <i class="fas fa-calendar ml-2 mr-1"></i>\${new Date(audit.audit_date).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                                <span class="badge badge-\${audit.status === 'active' ? 'compliant' : audit.status === 'draft' ? 'partial' : 'low'}">
                                    \${audit.status}
                                </span>
                            </div>
                        </div>
                    \`).join('');
                    
                } catch (error) {
                    console.error('Error loading dashboard:', error);
                }
            }
            
            // Load Audits
            async function loadAudits() {
                try {
                    const response = await axios.get('/api/audits');
                    const audits = response.data;
                    
                    const auditsList = document.getElementById('audits-list');
                    auditsList.innerHTML = audits.map(audit => \`
                        <div class="bg-white p-6 rounded-lg shadow card">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h3 class="text-xl font-semibold text-gray-800">\${audit.title}</h3>
                                    <p class="text-gray-600 mt-2">\${audit.description || 'Sin descripción'}</p>
                                    <div class="mt-4 flex items-center text-sm text-gray-500">
                                        <i class="fas fa-user mr-2"></i>\${audit.auditor_name}
                                        <i class="fas fa-calendar ml-4 mr-2"></i>\${new Date(audit.audit_date).toLocaleDateString('es-ES')}
                                        <i class="fas fa-clock ml-4 mr-2"></i>Creado: \${new Date(audit.created_at).toLocaleDateString('es-ES')}
                                    </div>
                                </div>
                                <div class="ml-4">
                                    <span class="badge badge-\${audit.status === 'active' ? 'compliant' : audit.status === 'draft' ? 'partial' : 'low'}">
                                        \${audit.status}
                                    </span>
                                </div>
                            </div>
                            <div class="mt-4 flex gap-2">
                                <button onclick="viewAuditDetails(\${audit.id})" class="text-blue-600 hover:text-blue-800 text-sm">
                                    <i class="fas fa-eye mr-1"></i> Ver Detalles
                                </button>
                                <button class="text-gray-600 hover:text-gray-800 text-sm ml-4">
                                    <i class="fas fa-edit mr-1"></i> Editar
                                </button>
                            </div>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading audits:', error);
                }
            }
            
            // Load Findings
            async function loadFindings() {
                try {
                    const response = await axios.get('/api/audits');
                    if (!response.data.length) return;
                    
                    const auditId = response.data[0].id;
                    const detailsResponse = await axios.get(\`/api/audits/\${auditId}\`);
                    const findings = detailsResponse.data.findings;
                    
                    const findingsList = document.getElementById('findings-list');
                    findingsList.innerHTML = findings.map(finding => \`
                        <div class="bg-white p-6 rounded-lg shadow">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    <span class="badge badge-\${finding.severity}">\${finding.severity}</span>
                                    <span class="badge badge-\${finding.finding_type === 'gap' ? 'non-compliant' : finding.finding_type === 'observation' ? 'partial' : 'compliant'} ml-2">
                                        \${finding.finding_type}
                                    </span>
                                </div>
                                <span class="text-sm text-gray-500">\${finding.control_id}</span>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">\${finding.title}</h3>
                            <p class="text-gray-600 mb-3">\${finding.description}</p>
                            <div class="bg-blue-50 p-3 rounded">
                                <p class="text-sm text-gray-700">
                                    <strong>Recomendación:</strong> \${finding.recommendation}
                                </p>
                            </div>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading findings:', error);
                }
            }
            
            // Load Controls
            async function loadControls() {
                try {
                    const response = await axios.get('/api/controls');
                    const controls = response.data;
                    
                    const controlsList = document.getElementById('controls-list');
                    const groupedControls = controls.reduce((acc, control) => {
                        if (!acc[control.category]) acc[control.category] = [];
                        acc[control.category].push(control);
                        return acc;
                    }, {});
                    
                    controlsList.innerHTML = Object.entries(groupedControls).map(([category, controls]) => \`
                        <div class="bg-white p-6 rounded-lg shadow">
                            <h3 class="text-xl font-semibold text-gray-800 mb-4">\${category}</h3>
                            <div class="space-y-3">
                                \${controls.map(control => \`
                                    <div class="border-l-4 border-blue-500 pl-4 py-2">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <span class="font-semibold text-gray-800">\${control.control_id}</span>
                                                <span class="text-gray-700 ml-2">\${control.control_name}</span>
                                            </div>
                                        </div>
                                        <p class="text-sm text-gray-600 mt-1">\${control.description}</p>
                                    </div>
                                \`).join('')}
                            </div>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading controls:', error);
                }
            }
            
            // Initialize
            loadDashboard();
        </script>
    </body>
    </html>
  `)
})

export default app
