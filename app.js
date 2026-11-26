
const STORAGE_KEY = "classroom-audit-v2";

const semesterMap = [
  { code: "ASE261_POO", semester: 2 },
  { code: "ASE252_PFE", semester: 3 },
  { code: "ASE251_DAM", semester: 4 },
  { code: "ASE242_SDE", semester: 5 },
  { code: "AS241_PSW", semester: 6 }
];

const requirements = [
  { key: "description", label: "Descripción del curso", automatic: true },
  { key: "topics", label: "Topics organizados", automatic: true },
  { key: "materials", label: "Materiales publicados", automatic: true },
  { key: "activities", label: "Actividades publicadas", automatic: true },
  { key: "announcements", label: "Anuncios publicados", automatic: true },
  { key: "comments", label: "Comentarios revisados (manual)", automatic: false }
];

let auditResults = [];
let manualChecks = loadManualChecks();

function loadManualChecks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveManualChecks() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(manualChecks)
  );
}

function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function getSemester(courseName) {
  const match = semesterMap.find(item =>
    courseName.toUpperCase().includes(item.code)
  );

  return match ? match.semester : null;
}

function getCourseChecks(course) {
  return {
    ...course.checks,
    comments: Boolean(manualChecks[course.id]?.comments)
  };
}

function isCourseComplete(course) {
  const checks = getCourseChecks(course);

  return requirements.every(
    item => checks[item.key]
  );
}

function updateDashboard() {
  const total = auditResults.length;

  const completed = auditResults.filter(
    isCourseComplete
  ).length;

  const pending = total - completed;

  const percentage = total
    ? Math.round(completed / total * 100)
    : 0;

  document.getElementById("total").textContent = total;
  document.getElementById("completed").textContent = completed;
  document.getElementById("pending").textContent = pending;
  document.getElementById("progress").textContent =
    percentage + "%";

  document.getElementById("progressNumber").textContent =
    percentage + "%";

  document.getElementById("progressText").textContent =
    `${completed} de ${total} cursos completos`;

  document.getElementById("progressBar").style.width =
    percentage + "%";

  document.getElementById("exportBtn").disabled =
    total === 0;
}

function createCheckItem(course, requirement) {
  const label = document.createElement("label");
  label.className = "check-item";

  const input = document.createElement("input");
  input.type = "checkbox";

  const checks = getCourseChecks(course);
  input.checked = Boolean(checks[requirement.key]);

  if (requirement.automatic) {
    input.disabled = true;
    input.title = "Este requisito se obtiene de Google Classroom.";
  }

  input.addEventListener("change", () => {
    if (requirement.automatic) return;

    manualChecks[course.id] = {
      ...manualChecks[course.id],
      [requirement.key]: input.checked
    };

    saveManualChecks();
    renderCourses();
  });

  const text = document.createElement("span");
  text.textContent = requirement.label;

  label.append(input, text);

  return label;
}

function createApiDetail(label, amount) {
  const item = document.createElement("div");
  item.className = "api-item";

  const name = document.createElement("span");
  name.textContent = label;

  const value = document.createElement("span");
  value.textContent = `${amount} encontrados`;

  item.append(name, value);

  return item;
}

function createCourseCard(course) {
  const card = document.createElement("article");
  card.className = "course-card";

  const complete = isCourseComplete(course);

  const pendingCount = requirements.filter(
    requirement => !getCourseChecks(course)[requirement.key]
  ).length;

  const header = document.createElement("div");
  header.className = "course-header";

  const info = document.createElement("div");

  const code = document.createElement("div");
  code.className = "course-code";
  code.textContent = course.name;

  const semester = document.createElement("span");
  semester.className = "semester-tag";

  const semesterNumber = getSemester(course.name);

  semester.textContent = semesterNumber
    ? `${semesterNumber}° SEMESTRE`
    : "SEMESTRE NO IDENTIFICADO";

  const name = document.createElement("div");
  name.className = "course-name";
  name.textContent = course.section || course.description ||
    "Curso de Google Classroom";

  info.append(code, semester, name);

  const status = document.createElement("span");
  status.className = "status" + (complete ? " complete" : "");

  status.textContent = complete
    ? "Completo"
    : `${pendingCount} pendientes`;

  header.append(info, status);

  const checklist = document.createElement("div");
  checklist.className = "checklist";

  requirements.forEach(requirement => {
    checklist.append(
      createCheckItem(course, requirement)
    );
  });

  const details = document.createElement("details");
  details.className = "api-details";

  const summary = document.createElement("summary");
  summary.textContent = "Ver detalles encontrados en Google Classroom";

  const grid = document.createElement("div");
  grid.className = "api-grid";

  grid.append(
    createApiDetail("Topics", course.topics.length),
    createApiDetail("Materiales", course.materials.length),
    createApiDetail("Actividades", course.activities.length),
    createApiDetail("Anuncios", course.announcements.length)
  );

  details.append(summary, grid);

  card.append(header, checklist, details);

  return card;
}

function renderCourses() {
  const list = document.getElementById("courseList");

  const search = document.getElementById("searchInput")
    .value.toLowerCase().trim();

  const filter = document.getElementById("statusFilter").value;
  const semesterFilter = document.getElementById("semesterFilter").value;

  const filtered = auditResults.filter(course => {
    const complete = isCourseComplete(course);

    const matchesSearch =
      course.name.toLowerCase().includes(search) ||
      (course.section || "").toLowerCase().includes(search);

    const semester = getSemester(course.name);

    const matchesSemester =
      semesterFilter === "all" ||
      String(semester) === semesterFilter;

    const matchesStatus =
      filter === "all" ||
      (filter === "complete" && complete) ||
      (filter === "pending" && !complete);

    return matchesSearch && matchesSemester && matchesStatus;
  });

  list.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const title = document.createElement("h3");
    title.textContent = auditResults.length
      ? "No se encontraron resultados"
      : "Conecta tu Google Classroom";

    const message = document.createElement("p");
    message.textContent = auditResults.length
      ? "Prueba con otros filtros o términos de búsqueda."
      : "Sincroniza tus cursos para comenzar la auditoría.";

    empty.append(title, message);
    list.append(empty);
    return;
  }

  filtered.sort((a, b) => {
    const sa = getSemester(a.name) ?? 99;
    const sb = getSemester(b.name) ?? 99;
    return sa - sb || a.name.localeCompare(b.name);
  });

  filtered.forEach(course => {
    list.append(createCourseCard(course));
  });
}

async function synchronizeClassroom() {
  if (!isGoogleConnected()) {
    showToast("Primero conecta tu cuenta de Google.");
    return;
  }

  const syncButton = document.getElementById("syncBtn");
  const status = document.getElementById("connectionStatus");

  syncButton.disabled = true;
  syncButton.textContent = "Sincronizando...";

  status.textContent = "Consultando tus cursos...";

  try {
    auditResults = await runClassroomAudit();

    status.textContent =
      `${auditResults.length} cursos sincronizados`;

    document.getElementById("lastSync").textContent =
      "Última sincronización: " +
      new Date().toLocaleString("es-PE");

    updateDashboard();
    renderCourses();

    showToast("Auditoría de Classroom finalizada.");

  } catch (error) {
    console.error(error);

    status.textContent = "Error de sincronización";

    showToast(error.message);
  } finally {
    syncButton.disabled = false;
    syncButton.textContent = "↻ Sincronizar";
  }
}

// Exportación CSV.
function exportReport() {
  if (!auditResults.length) return;

  const headers = [
    "Curso",
    "Semestre",
    ...requirements.map(item => item.label)
  ];

  const rows = auditResults.map(course => {
    const checks = getCourseChecks(course);

    return [
      course.name,
      getSemester(course.name) || "No identificado",
      ...requirements.map(item =>
        checks[item.key] ? "Completo" : "Pendiente"
      )
    ];
  });

  const escapeCSV = value =>
    `"${String(value).replaceAll('"', '""')}"`;

  const csv = [headers, ...rows]
    .map(row => row.map(escapeCSV).join(";"))
    .join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "classroom-audit.csv";
  link.click();

  URL.revokeObjectURL(url);

  showToast("Informe CSV descargado.");
}

// Conexión exitosa.
window.addEventListener("google-auth-success", () => {
  document.getElementById("connectionStatus").textContent =
    "Google conectado correctamente";

  document.getElementById("connectGoogleBtn").hidden = true;
  document.getElementById("syncBtn").disabled = false;
  document.getElementById("disconnectBtn").hidden = false;

  synchronizeClassroom();
});

// Desconexión.
window.addEventListener("google-auth-disconnected", () => {
  auditResults = [];

  document.getElementById("connectionStatus").textContent =
    "Cuenta no conectada";

  document.getElementById("connectGoogleBtn").hidden = false;
  document.getElementById("syncBtn").disabled = true;
  document.getElementById("disconnectBtn").hidden = true;

  document.getElementById("lastSync").textContent =
    "Sin sincronizar";

  updateDashboard();
  renderCourses();

  showToast("Cuenta desconectada.");
});

// Eventos de la interfaz.
document.getElementById("connectGoogleBtn")
  .addEventListener("click", connectGoogle);

document.getElementById("syncBtn")
  .addEventListener("click", synchronizeClassroom);

document.getElementById("disconnectBtn")
  .addEventListener("click", disconnectGoogle);

document.getElementById("searchInput")
  .addEventListener("input", renderCourses);

document.getElementById("statusFilter")
  .addEventListener("change", renderCourses);

document.getElementById("semesterFilter")
  .addEventListener("change", renderCourses);

document.getElementById("exportBtn")
  .addEventListener("click", exportReport);

// Inicialización.
updateDashboard();
renderCourses();
