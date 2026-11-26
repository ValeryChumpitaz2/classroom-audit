/**
 * CLASSROOM AUDIT
 * Dashboard, navegación, filtros, hallazgos y reportes.
 */

// ======================================================
// CONFIGURACIÓN
// ======================================================

const STORAGE_KEY = "classroom-audit-v3";
const THEME_KEY = "classroom-audit-theme";

// SOLO SP1, SP2, SP3 Y SP4.
// SP5 queda fuera de toda evaluación.
const semesterMap = [
    { code: "ASE261_POO", semester: 2, sp: "SP1" },
    { code: "ASE252_PFE", semester: 3, sp: "SP2" },
    { code: "ASE251_DAM", semester: 4, sp: "SP3" },
    { code: "ASE242_SDE", semester: 5, sp: "SP4" }
];

const requirements = [
    { key: "description", label: "Descripción del curso", automatic: true },
    { key: "topics", label: "Topics organizados", automatic: true },
    { key: "materials", label: "Materiales publicados", automatic: true },
    { key: "activities", label: "Actividades publicadas", automatic: true },
    { key: "announcements", label: "Anuncios publicados", automatic: true },
    { key: "comments", label: "Comentarios revisados", automatic: false }
];

// ======================================================
// ESTADO
// ======================================================

let auditResults = [];
let auditedCourses = [];

let manualChecks = loadManualChecks();

let activeView = "overview";
let toastTimer;

// ======================================================
// ALMACENAMIENTO
// ======================================================

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

// ======================================================
// UTILIDADES
// ======================================================

function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function getSemester(courseName) {
    const match = semesterMap.find(item =>
        courseName.toUpperCase().includes(item.code)
    );

    return match ? match.semester : null;
}

function getSP(courseName) {
    const match = semesterMap.find(item =>
        courseName.toUpperCase().includes(item.code)
    );

    return match?.sp || null;
}

function getEligibleCourses(courses) {
    return courses.filter(course => getSemester(course.name) !== null);
}

function getCourseAudit(course) {
    return auditedCourses.find(item => item.id === course.id);
}

function getCourseChecks(course) {
    return {
        ...course.checks,
        comments: Boolean(manualChecks[course.id]?.comments)
    };
}

function isCourseComplete(course) {
    const checks = getCourseChecks(course);

    const checklistComplete = requirements.every(
        requirement => checks[require.key]
    );

    const detailedAudit = getCourseAudit(course);

    const contentComplete = detailedAudit
        ? detailedAudit.summary.unpublishedItems === 0 &&
        detailedAudit.summary.warningItems === 0 &&
        detailedAudit.summary.unorganizedItems === 0 &&
        detailedAudit.summary.emptyTopics === 0
        : false;

    return checklistComplete && contentComplete;
}

function getPendingRequirements(course) {
    const checks = getCourseChecks(course);

    return requirements.filter(
        requirement => !checks[require.key]
    );
}

// ======================================================
// TEMA
// ======================================================

function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    const theme = savedTheme === "dark"
        ? "dark"
        : "light";

    applyTheme(theme);
}

function applyTheme(theme) {
    document.body.dataset.theme = theme;

    localStorage.setItem(THEME_KEY, theme);

    const label = document.getElementById("themeLabel");
    const icon = document.getElementById("themeIcon");

    if (label) {
        label.textContent = theme === "dark"
            ? "Cambiar a tema claro"
            : "Cambiar a tema oscuro";
    }

    if (icon) {
        icon.textContent = theme === "dark" ? "☀" : "◐";
    }
}

function toggleTheme() {
    const current = document.body.dataset.theme;

    applyTheme(current === "dark" ? "light" : "dark");
}

// ======================================================
// NAVEGACIÓN
// ======================================================

function switchView(viewName) {
    activeView = viewName;

    document.querySelectorAll(".view").forEach(view => {
        view.classList.remove("active");
    });

    document.querySelectorAll(".nav-item[data-view]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    const view = document.getElementById(`${viewName}View`);

    if (view) {
        view.classList.add("active");
    }

    const breadcrumb = document.getElementById("breadcrumbCurrent");

    if (breadcrumb) {
        const labels = {
            overview: "Overview",
            courses: "Cursos",
            findings: "Hallazgos",
            reports: "Reportes"
        };

        breadcrumb.textContent = labels[viewName] || viewName;
    }

    closeSidebar();
}

function initializeNavigation() {
    document.querySelectorAll("[data-view]").forEach(button => {
        button.addEventListener("click", () => {
            switchView(button.dataset.view);
        });
    });

    document.querySelectorAll("[data-view-target]").forEach(button => {
        button.addEventListener("click", () => {
            switchView(button.dataset.viewTarget);
        });
    });
}

// ======================================================
// SIDEBAR MOBILE
// ======================================================

function initializeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    if (!sidebar || !menuToggle) return;

    const overlay = document.createElement("div");

    overlay.className = "sidebar-overlay";
    overlay.id = "sidebarOverlay";

    document.body.append(overlay);

    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
    });

    overlay.addEventListener("click", closeSidebar);
}

function closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarOverlay")?.classList.remove("show");
}

// ======================================================
// CHECKLIST MANUAL
// ======================================================

function createCheckItem(course, requirement) {
    const label = document.createElement("label");
    label.className = "check-item";

    const input = document.createElement("input");
    input.type = "checkbox";

    const checks = getCourseChecks(course);

    input.checked = Boolean(checks[requirement.key]);

    if (requirement.automatic) {
        input.disabled = true;
    }

    input.addEventListener("change", () => {
        if (requirement.automatic) return;

        manualChecks[course.id] = {
            ...manualChecks[course.id],
            [requirement.key]: input.checked
        };

        saveManualChecks();

        renderAll();
    });

    const text = document.createElement("span");
    text.textContent = requirement.label;

    label.append(input, text);

    return label;
}

// ======================================================
// DETALLES API
// ======================================================

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

// ======================================================
// TARJETA DE CURSO
// ======================================================

function createCourseCard(course) {
    const card = document.createElement("article");
    card.className = "course-card";

    const complete = isCourseComplete(course);
    const pendingCount = getPendingRequirements(course).length;
    const semesterNumber = getSemester(course.name);
    const sp = getSP(course.name);
    const detailedAudit = getCourseAudit(course);

    // HEADER
    const header = document.createElement("div");
    header.className = "course-header";

    const info = document.createElement("div");

    const code = document.createElement("div");
    code.className = "course-code";
    code.textContent = course.name;

    const semester = document.createElement("span");
    semester.className = "semester-tag";

    semester.textContent = semesterNumber
        ? `${sp} · ${semesterNumber}.º SEMESTRE`
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
        : `${pendingCount + (detailedAudit?.summary.warningItems || 0)} pendientes`;

    header.append(info, status);

    // CHECKLIST
    const checklist = document.createElement("div");
    checklist.className = "checklist";

    requirements.forEach(requirement => {
        checklist.append(createCheckItem(course, requirement));
    });

    // API DETAILS
    const details = document.createElement("details");
    details.className = "api-details";

    const summary = document.createElement("summary");
    summary.textContent = "Resumen de elementos encontrados";

    const grid = document.createElement("div");
    grid.className = "api-grid";

    grid.append(
        createApiDetail("Topics", course.topics.length),
        createApiDetail("Materiales", course.materials.length),
        createApiDetail("Actividades", course.activities.length),
        createApiDetail("Anuncios", course.announcements.length)
    );

    details.append(summary, grid);

    // DETAILED AUDIT
    const detailButton = document.createElement("button");
    detailButton.className = "btn-audit-detail";
    detailButton.type = "button";
    detailButton.textContent = "Ver auditoría detallada";

    const detailContainer = document.createElement("div");
    detailContainer.className = "course-detail-container";
    detailContainer.hidden = true;

    detailButton.addEventListener("click", () => {
        const isVisible = !detailContainer.hidden;

        detailContainer.hidden = isVisible;

        detailButton.textContent = isVisible
            ? "Ver auditoría detallada"
            : "Ocultar auditoría detallada";

        if (!detailContainer.dataset.loaded) {
            detailContainer.append(
                renderCourseAuditDetail(course)
            );

            detailContainer.dataset.loaded = "true";
        }
    });

    card.append(
        header,
        checklist,
        details,
        detailButton,
        detailContainer
    );

    return card;
}

// ======================================================
// FILTROS
// ======================================================

function getCourseFilters(prefix = "") {
    const searchInput = document.getElementById(
        prefix ? `${prefix}SearchInput` : "searchInput"
    );

    const statusFilter = document.getElementById(
        prefix ? `${prefix}StatusFilter` : "statusFilter"
    );

    const semesterFilter = document.getElementById(
        prefix ? `${prefix}SemesterFilter` : "semesterFilter"
    );

    return {
        search: searchInput?.value.toLowerCase().trim() || "",
        status: statusFilter?.value || "all",
        semester: semesterFilter?.value || "all"
    };
}

function filterCourses(prefix = "") {
    const filters = getCourseFilters(prefix);

    return auditResults.filter(course => {
        const complete = isCourseComplete(course);

        const matchesSearch =
            course.name.toLowerCase().includes(filters.search) ||
            (course.section || "").toLowerCase().includes(filters.search) ||
            (course.description || "").toLowerCase().includes(filters.search);

        const semester = getSemester(course.name);

        const matchesSemester =
            filters.semester === "all" ||
            String(semester) === filters.semester;

        const matchesStatus =
            filters.status === "all" ||
            (filters.status === "complete" && complete) ||
            (filters.status === "pending" && !complete);

        return matchesSearch && matchesSemester && matchesStatus;
    });
}

// ======================================================
// RENDER CURSOS
// ======================================================

function renderCourseList(listId, prefix = "") {
    const list = document.getElementById(listId);

    if (!list) return;

    const filtered = filterCourses(prefix);

    list.replaceChildren();

    if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "empty-inline";

        empty.textContent = auditResults.length
            ? "No se encontraron cursos con estos filtros."
            : "Conecta Google Classroom para comenzar.";

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

function renderCourses() {
    renderCourseList("courseList");
    renderCourseList("allCoursesList", "courses");
}

// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard() {
    const total = auditResults.length;

    const completed = auditResults.filter(
        isCourseComplete
    ).length;

    const pending = total - completed;

    const percentage = total
        ? Math.round(completed / total * 100)
        : 0;

    const values = {
        total,
        completed,
        pending,
        progress: `${percentage}%`,
        progressNumber: `${percentage}%`,
        progressText: `${completed} de ${total} cursos completos`
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);

        if (element) element.textContent = value;
    });

    const progressBar = document.getElementById("progressBar");

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    const exportBtn = document.getElementById("exportBtn");
    const exportDetailBtn = document.getElementById("exportDetailBtn");

    if (exportBtn) exportBtn.disabled = total === 0;
    if (exportDetailBtn) exportDetailBtn.disabled = total === 0;
}

// ======================================================
// HALLAZGOS
// ======================================================

function collectFindings() {
    const findings = [];

    auditedCourses.forEach(course => {
        const courseName = course.name;

        // ELEMENTOS SIN PUBLICAR
        course.findings.unpublished.forEach(item => {
            findings.push({
                type: "unpublished",
                course: courseName,
                title: item.title,
                message: "El elemento se encuentra en borrador.",
                severity: "danger",
                itemType: item.type
            });
        });

        // CONTENIDO INCOMPLETO
        // Evita duplicar los elementos que ya se reportan como "sin Topic".
        const unorganizedMaterialIds = new Set(
            course.findings.unorganizedMaterials.map(item => item.id)
        );

        const unorganizedActivityIds = new Set(
            course.findings.unorganizedActivities.map(item => item.id)
        );

        course.findings.warnings
            .filter(item =>
                !(item.type === "material" && unorganizedMaterialIds.has(item.id)) &&
                !(item.type === "activity" && unorganizedActivityIds.has(item.id))
            )
            .forEach(item => {
                item.observations.forEach(observation => {
                    findings.push({
                        type: "incomplete",
                        course: courseName,
                        title: item.title,
                        message: observation,
                        severity: "warning",
                        itemType: item.type
                    });
                });
            });

        // MATERIAL SIN TOPIC
        course.findings.unorganizedMaterials.forEach(item => {
            findings.push({
                type: "unorganized",
                course: courseName,
                title: item.title,
                message: "Material sin Topic asignado.",
                severity: "warning",
                itemType: "material"
            });
        });

        // ACTIVIDAD SIN TOPIC
        course.findings.unorganizedActivities.forEach(item => {
            findings.push({
                type: "unorganized",
                course: courseName,
                title: item.title,
                message: "Actividad sin Topic asignado.",
                severity: "warning",
                itemType: "activity"
            });
        });

        // TOPICS VACÍOS
        course.findings.emptyTopics.forEach(topic => {
            findings.push({
                type: "unorganized",
                course: courseName,
                title: topic.name || "Topic vacío",
                message: "El Topic no tiene materiales ni actividades.",
                severity: "warning",
                itemType: "topic"
            });
        });

        // OBSERVACIONES DEL CURSO
        course.findings.courseObservations.forEach(message => {
            findings.push({
                type: "incomplete",
                course: courseName,
                title: "Información del curso",
                message,
                severity: "warning",
                itemType: "course"
            });
        });
    });

    return findings;
}

function createFindingCard(finding) {
    const card = document.createElement("article");
    card.className = "finding-item";

    const badge = document.createElement("span");
    badge.className = `finding-type ${finding.severity}`;
    badge.textContent = finding.type === "unpublished"
        ? "Sin publicar"
        : finding.type === "unorganized"
            ? "Sin organizar"
            : "Revisar";

    const content = document.createElement("div");
    content.className = "finding-item-content";

    const title = document.createElement("h4");
    title.textContent = finding.title;

    const message = document.createElement("p");
    message.textContent = finding.message;

    const meta = document.createElement("div");
    meta.className = "finding-item-meta";
    meta.textContent = `${finding.course} · ${finding.itemType}`;

    content.append(title, message, meta);

    card.append(badge, content);

    return card;
}

function renderFindings() {
    const findings = collectFindings();

    const total = findings.length;

    const unpublished = findings.filter(
        item => item.type === "unpublished"
    ).length;

    const incomplete = findings.filter(
        item => item.type === "incomplete"
    ).length;

    const unorganized = findings.filter(
        item => item.type === "unorganized"
    ).length;
    document.getElementById("totalFindings").textContent = total;
    document.getElementById("unpublishedCount").textContent = unpublished;
    document.getElementById("incompleteCount").textContent = incomplete;
    document.getElementById("unorganizedCount").textContent = unorganized;
    document.getElementById("findingsBadge").textContent = total;

    const recent = document.getElementById("recentFindings");
    const full = document.getElementById("findingsList");

    if (recent) recent.replaceChildren();
    if (full) full.replaceChildren();

    if (!findings.length) {
        const empty = document.createElement("div");
        empty.className = "empty-inline";
        empty.textContent = auditResults.length
            ? "No se encontraron hallazgos."
            : "Sincroniza tus cursos para revisar los hallazgos.";

        recent?.append(empty.cloneNode(true));
        full?.append(empty);
        return;
    }

    findings.slice(0, 5).forEach(finding => {
        recent?.append(createFindingCard(finding));
    });

    findings.forEach(finding => {
        full?.append(createFindingCard(finding));
    });
}

// ======================================================
// FILTROS DE HALLAZGOS
// ======================================================

function initializeFindingFilters() {
    const typeFilter = document.getElementById("findingTypeFilter");
    const courseFilter = document.getElementById("findingCourseFilter");

    if (!typeFilter || !courseFilter) return;

    typeFilter.addEventListener("change", filterFindings);
    courseFilter.addEventListener("change", filterFindings);
}

function populateFindingCourseFilter() {
    const select = document.getElementById("findingCourseFilter");

    if (!select) return;

    const selectedValue = select.value;

    select.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Todos los cursos";

    select.append(allOption);

    auditResults.forEach(course => {
        const option = document.createElement("option");
        option.value = course.id;
        option.textContent = course.name;

        select.append(option);
    });

    select.value = selectedValue || "all";
}

function filterFindings() {
    const type = document.getElementById("findingTypeFilter")?.value || "all";
    const courseId = document.getElementById("findingCourseFilter")?.value || "all";

    const findings = collectFindings();

    const filtered = findings.filter(finding => {
        const matchesType =
            type === "all" ||
            finding.type === type;

        const matchesCourse =
            courseId === "all" ||
            auditResults.some(course =>
                course.id === courseId &&
                course.name === finding.course
            );

        return matchesType && matchesCourse;
    });

    const list = document.getElementById("findingsList");

    if (!list) return;

    list.replaceChildren();

    if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "empty-inline";
        empty.textContent = "No hay hallazgos para estos filtros.";

        list.append(empty);
        return;
    }

    filtered.forEach(finding => {
        list.append(createFindingCard(finding));
    });
}

// ======================================================
// CSV
// ======================================================

function escapeCSV(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCSV(filename, rows) {
    const csv = rows
        .map(row => row.map(escapeCSV).join(";"))
        .join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ======================================================
// REPORTE GENERAL
// ======================================================

function exportReport() {
    if (!auditResults.length) return;

    const headers = [
        "Curso",
        "SP",
        "Semestre",
        "Estado de auditoría",
        ...requirements.map(item => item.label),
        "Topics",
        "Materiales",
        "Actividades",
        "Anuncios",
        "Hallazgos",
        "Sin publicar",
        "Progreso"
    ];

    const rows = auditResults.map(course => {
        const checks = getCourseChecks(course);
        const detailed = getCourseAudit(course);

        return [
            course.name,
            getSP(course.name),
            getSemester(course.name) || "",
            isCourseComplete(course) ? "Completo" : "Pendiente",
            ...requirements.map(item =>
                checks[item.key] ? "Completo" : "Pendiente"
            ),
            course.topics.length,
            course.materials.length,
            course.activities.length,
            course.announcements.length,
            detailed?.summary.warningItems || 0,
            detailed?.summary.unpublishedItems || 0,
            `${detailed?.summary.progress || 0}%`
        ];
    });

    downloadCSV(
        "classroom-audit-general.csv",
        [headers, ...rows]
    );

    showToast("Reporte general descargado.");
}

// ======================================================
// REPORTE DETALLADO
// ======================================================

function exportDetailReport() {
    if (!auditedCourses.length) return;

    const headers = [
        "Curso",
        "SP",
        "Tipo de elemento",
        "Topic",
        "Título",
        "Descripción",
        "Estado de publicación",
        "Estado de auditoría",
        "Observaciones",
        "Información adicional"
    ];

    const rows = [];

    auditedCourses.forEach(course => {
        course.topics.forEach(topic => {
            topic.materials.forEach(material => {
                rows.push([
                    course.name,
                    getSP(course.name),
                    "Material",
                    topic.name,
                    material.title,
                    material.description,
                    material.state,
                    material.status,
                    material.observations.join(" | "),
                    (material.information || []).join(" | ")
                ]);
            });

            topic.activities.forEach(activity => {
                rows.push([
                    course.name,
                    getSP(course.name),
                    "Actividad",
                    topic.name,
                    activity.title,
                    activity.description,
                    activity.state,
                    activity.status,
                    activity.observations.join(" | "),
                    (activity.information || []).join(" | ")
                ]);
            });
        });

        course.unorganizedMaterials.forEach(material => {
            rows.push([
                course.name,
                getSP(course.name),
                "Material sin Topic",
                "",
                material.title,
                material.description,
                material.state,
                material.status,
                material.observations.join(" | "),
                (material.information || []).join(" | ")
            ]);
        });

        course.unorganizedActivities.forEach(activity => {
            rows.push([
                course.name,
                getSP(course.name),
                "Actividad sin Topic",
                "",
                activity.title,
                activity.description,
                activity.state,
                activity.status,
                activity.observations.join(" | "),
                (activity.information || []).join(" | ")
            ]);
        });

        course.announcements.forEach(announcement => {
            rows.push([
                course.name,
                getSP(course.name),
                "Anuncio",
                "",
                announcement.title,
                announcement.description,
                "",
                announcement.status,
                announcement.observations.join(" | "),
                (announcement.information || []).join(" | ")
            ]);
        });
    });

    downloadCSV(
        "classroom-audit-detallado.csv",
        [headers, ...rows]
    );

    showToast("Reporte detallado descargado.");
}

// ======================================================
// RENDER GENERAL
// ======================================================

function renderAll() {
    updateDashboard();
    renderCourses();
    renderFindings();
    populateFindingCourseFilter();
}

// ======================================================
// SINCRONIZACIÓN
// ======================================================

async function synchronizeClassroom() {
    if (!isGoogleConnected()) {
        showToast("Primero conecta tu cuenta de Google.");
        return;
    }

    const buttons = [
        document.getElementById("syncBtn"),
        document.getElementById("coursesSyncBtn")
    ].filter(Boolean);

    buttons.forEach(button => {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = "Sincronizando...";
    });

    const connectionStatus = document.getElementById("connectionStatus");

    if (connectionStatus) {
        connectionStatus.textContent = "Sincronizando cursos...";
    }

    try {
        const allCourses = await runClassroomAudit();

        // SOLO SP1-SP4.
        // Cursos SP5 y otros códigos quedan excluidos de la auditoría.
        auditResults = getEligibleCourses(allCourses);

        auditedCourses = auditResults.map(auditCourseContent);

        renderAll();

        const status = document.getElementById("connectionStatus");

        if (status) {
            status.textContent =
                `${auditResults.length} cursos SP1–SP4 auditados`;
        }

        const lastSync = document.getElementById("lastSync");

        if (lastSync) {
            lastSync.textContent =
                "Última sincronización: " +
                new Date().toLocaleString("es-PE");
        }

        showToast(
            `Auditoría finalizada. ${auditResults.length} cursos evaluados.`
        );

    } catch (error) {
        console.error("Error de auditoría:", error);

        const statusElement = document.getElementById("connectionStatus");

        if (statusElement) {
            statusElement.textContent = "Error de sincronización";
        }

        showToast(error.message || "No se pudo sincronizar Classroom.");

    } finally {
        buttons.forEach(button => {
            button.disabled = !isGoogleConnected();
            button.textContent = button.dataset.originalText || "Sincronizar";
        });
    }
}

// ======================================================
// CONEXIÓN GOOGLE
// ======================================================

window.addEventListener("google-auth-success", () => {
    document.getElementById("connectionStatus").textContent =
        "Google conectado correctamente";

    document.getElementById("googleConnectionLabel").innerHTML =
        '<span class="status-dot connected"></span> Conectado';

    document.getElementById("connectionIndicator").innerHTML =
        '<span class="status-dot connected"></span><span>Conectado</span>';

    document.getElementById("googleAccountInfo").textContent =
        "Cuenta conectada. Listo para sincronizar.";

    document.getElementById("connectGoogleBtn").hidden = true;
    document.getElementById("disconnectBtn").hidden = false;

    synchronizeClassroom();
});

window.addEventListener("google-auth-disconnected", () => {
    auditResults = [];
    auditedCourses = [];

    document.getElementById("connectionStatus").textContent =
        "Sin conexión";

    document.getElementById("googleConnectionLabel").innerHTML =
        '<span class="status-dot disconnected"></span> No conectado';

    document.getElementById("connectionIndicator").innerHTML =
        '<span class="status-dot disconnected"></span><span>Sin conexión</span>';

    document.getElementById("googleAccountInfo").textContent =
        "Conecta tu cuenta para analizar tus cursos.";

    document.getElementById("connectGoogleBtn").hidden = false;
    document.getElementById("disconnectBtn").hidden = true;

    document.getElementById("lastSync").textContent =
        "Sin sincronizar";

    renderAll();

    showToast("Cuenta desconectada.");
});

// ======================================================
// EVENTOS
// ======================================================

function initializeEvents() {
    document.getElementById("connectGoogleBtn")
        ?.addEventListener("click", connectGoogle);

    document.getElementById("emptyConnectBtn")
        ?.addEventListener("click", connectGoogle);

    document.getElementById("syncBtn")
        ?.addEventListener("click", synchronizeClassroom);

    document.getElementById("coursesSyncBtn")
        ?.addEventListener("click", synchronizeClassroom);

    document.getElementById("disconnectBtn")
        ?.addEventListener("click", disconnectGoogle);

    document.getElementById("themeToggle")
        ?.addEventListener("click", toggleTheme);

    document.getElementById("searchInput")
        ?.addEventListener("input", renderCourses);

    document.getElementById("statusFilter")
        ?.addEventListener("change", renderCourses);

    document.getElementById("semesterFilter")
        ?.addEventListener("change", renderCourses);

    document.getElementById("coursesSearchInput")
        ?.addEventListener("input", renderCourses);

    document.getElementById("coursesStatusFilter")
        ?.addEventListener("change", renderCourses);

    document.getElementById("coursesSemesterFilter")
        ?.addEventListener("change", renderCourses);
    document.getElementById("exportBtn")
        ?.addEventListener("click", exportReport);

    document.getElementById("exportDetailBtn")
        ?.addEventListener("click", exportDetailReport);

    initializeFindingFilters();
}

// ======================================================
// INICIALIZACIÓN
// ======================================================

function initializeApp() {
    initializeTheme();
    initializeNavigation();
    initializeSidebar();
    initializeEvents();
    renderAll();
}

initializeApp();