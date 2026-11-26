
/**
 * CLASSROOM AUDIT
 * Dashboard, navegación, filtros, hallazgos y reportes.
 */

// ======================================================
// 01. CONFIGURACIÓN
// ======================================================

const STORAGE_KEY = "classroom-audit-v3";
const THEME_KEY = "classroom-audit-theme";

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
// 02. ESTADO
// ======================================================

let auditResults = [];
let auditedCourses = [];
let manualChecks = loadManualChecks();

let activeView = "overview";
let toastTimer = null;

// ======================================================
// 03. UTILIDADES DOM
// ======================================================

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function setHTML(id, value) {
    const element = getElement(id);

    if (element) {
        element.innerHTML = value ?? "";
    }
}

function setHidden(id, hidden) {
    const element = getElement(id);

    if (element) {
        element.hidden = Boolean(hidden);
    }
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function safeObject(value) {
    return value && typeof value === "object" ? value : {};
}

// ======================================================
// 04. ALMACENAMIENTO
// ======================================================

function loadManualChecks() {
    try {
        const stored = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        return stored && typeof stored === "object" ? stored : {};

    } catch (error) {
        console.warn(
            "No se pudieron cargar las revisiones manuales:",
            error
        );

        return {};
    }
}

function saveManualChecks() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(manualChecks)
        );

    } catch (error) {
        console.error(
            "No se pudieron guardar las revisiones:",
            error
        );

        showToast("No se pudieron guardar los cambios.");
    }
}

// ======================================================
// 05. UTILIDADES GENERALES
// ======================================================

function showToast(message) {
    const toast = getElement("toast");
    const messageElement = toast?.querySelector(".toast-message");

    if (!toast || !messageElement) {
        console.info(message);
        return;
    }

    messageElement.textContent = String(message ?? "");
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

function getSemester(courseName = "") {
    const normalizedName = String(courseName).toUpperCase();

    const match = semesterMap.find(item =>
        normalizedName.includes(item.code)
    );

    return match ? match.semester : null;
}

function getSP(courseName = "") {
    const normalizedName = String(courseName).toUpperCase();

    // Detectar SP5 explícitamente aunque no tenga código en semesterMap.
    const explicitSP = normalizedName.match(/SP[\s_-]*([1-5])(?!\d)/);
    if (explicitSP) return `SP${explicitSP[1]}`;

    const match = semesterMap.find(item =>
        normalizedName.includes(item.code)
    );

    return match?.sp || null;
}

// SP5 puede mostrarse y auditarse, pero nunca forma parte del porcentaje.
function isExcludedFromPercentage(course) {
    return getSP(course?.name || "") === "SP5";
}

function getPercentageCourses() {
    return auditResults.filter(course => !isExcludedFromPercentage(course));
}

function getEligibleCourses(courses) {
    // Se incluyen todos los cursos activos.
    // SP1-SP4 se utilizan únicamente para clasificación.

    return safeArray(courses).filter(course =>
        course && course.courseState === "ACTIVE"
    );
}

function getCourseAudit(course) {
    return auditedCourses.find(item =>
        item.id === course?.id
    );
}

function getCourseChecks(course) {
    const checks = safeObject(course?.checks);

    return {
        ...checks,
        comments: Boolean(
            manualChecks[course?.id]?.comments
        )
    };
}

function isCourseComplete(course) {
    const checks = getCourseChecks(course);

    const checklistComplete = requirements.every(
        requirement => Boolean(checks[requirement.key])
    );

    const detailedAudit = getCourseAudit(course);
    const summary = detailedAudit?.summary;

    const contentComplete =
        Boolean(summary) &&
        Number(summary.unpublishedItems || 0) === 0 &&
        Number(summary.warningItems || 0) === 0 &&
        Number(summary.unorganizedItems || 0) === 0 &&
        Number(summary.emptyTopics || 0) === 0;

    return checklistComplete && contentComplete;
}

function getPendingRequirements(course) {
    const checks = getCourseChecks(course);

    return requirements.filter(
        requirement => !checks[requirement.key]
    );
}

// ======================================================
// 06. TEMA
// ======================================================

function initializeTheme() {
    let savedTheme = "light";

    try {
        savedTheme = localStorage.getItem(THEME_KEY) || "light";

    } catch (error) {
        console.warn("No se pudo recuperar el tema guardado.");
    }

    applyTheme(savedTheme === "dark" ? "dark" : "light");
}

function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";

    document.body.classList.toggle(
        "dark-mode",
        selectedTheme === "dark"
    );

    document.body.dataset.theme = selectedTheme;

    try {
        localStorage.setItem(THEME_KEY, selectedTheme);

    } catch (error) {
        console.warn("No se pudo guardar la preferencia del tema.");
    }

    setText(
        "themeLabel",
        selectedTheme === "dark"
            ? "Cambiar a tema claro"
            : "Cambiar a tema oscuro"
    );

    const themeIcon = getElement("themeToggle")?.querySelector("i");

    if (themeIcon) {
        themeIcon.className = selectedTheme === "dark"
            ? "fa-solid fa-sun"
            : "fa-solid fa-moon";
    }
}

function toggleTheme() {
    const current = document.body.dataset.theme;

    applyTheme(current === "dark" ? "light" : "dark");
}

// ======================================================
// 07. NAVEGACIÓN
// ======================================================

function switchView(viewName) {
    activeView = viewName;

    document.querySelectorAll(".view-section").forEach(view => {
        view.classList.remove("active");
        view.hidden = true;
    });

    document.querySelectorAll(".nav-item[data-view]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    const view = getElement(`view-${viewName}`);

    if (view) {
        view.hidden = false;
        view.classList.add("active");
    }

    const labels = {
        overview: "Overview",
        courses: "Cursos",
        findings: "Hallazgos",
        reports: "Reportes"
    };

    setText(
        "breadcrumbCurrent",
        labels[viewName] || viewName
    );

    closeSidebar();
}

function initializeNavigation() {
    document.addEventListener("click", event => {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const trigger = target.closest(
            "[data-view], [data-view-target]"
        );

        if (!trigger) {
            return;
        }

        const viewName =
            trigger.dataset.view ||
            trigger.dataset.viewTarget;

        if (!viewName) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        switchView(viewName);

    }, true);
}

// ======================================================
// 08. SIDEBAR MOBILE
// ======================================================

// Registro explícito en window para evitar problemas
// de resolución de la función en el ámbito global.

window.initializeSidebar = function initializeSidebar() {
    const sidebar = getElement("sidebar");
    const menuToggle = getElement("menuToggle");

    if (!sidebar || !menuToggle) {
        console.warn(
            "Sidebar: no se encontraron los elementos necesarios."
        );
        return;
    }

    let overlay = getElement("sidebarOverlay");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        overlay.id = "sidebarOverlay";

        document.body.append(overlay);
    }

    // Evitar registrar eventos duplicados.
    if (menuToggle.dataset.sidebarInitialized === "true") {
        return;
    }

    menuToggle.dataset.sidebarInitialized = "true";

    menuToggle.addEventListener("click", () => {
        const isOpen = sidebar.classList.toggle("open");

        overlay.classList.toggle("show", isOpen);
        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    getElement("sidebarClose")?.addEventListener(
        "click",
        closeSidebar
    );

    overlay.addEventListener("click", closeSidebar);
};

function closeSidebar() {
    getElement("sidebar")?.classList.remove("open");
    getElement("sidebarOverlay")?.classList.remove("show");

    getElement("menuToggle")?.setAttribute(
        "aria-expanded",
        "false"
    );
}

// ======================================================
// 09. CHECKLIST MANUAL
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
        if (requirement.automatic) {
            return;
        }

        manualChecks[course.id] = {
            ...safeObject(manualChecks[course.id]),
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
// 10. DETALLES API
// ======================================================

function createApiDetail(label, amount) {
    const item = document.createElement("div");
    item.className = "api-item";

    const name = document.createElement("span");
    name.textContent = label;

    const value = document.createElement("span");
    value.textContent = `${Number(amount) || 0} encontrados`;

    item.append(name, value);

    return item;
}

// ======================================================
// 11. DETALLE DE AUDITORÍA
// ======================================================

function renderCourseAuditDetail(course) {
    if (typeof buildCourseAuditDetail !== "function") {
        const message = document.createElement("div");

        message.className = "empty-inline";
        message.textContent =
            "No se pudo cargar el detalle de auditoría. Verifica course-detail.js.";

        return message;
    }

    return buildCourseAuditDetail(course);
}

// ======================================================
// 12. TARJETA DE CURSO
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
    code.textContent = course.name || "Curso sin nombre";

    const semester = document.createElement("span");
    semester.className = "semester-tag";

    semester.textContent = sp === "SP5"
        ? "SP5 · FUERA DEL PORCENTAJE"
        : semesterNumber
            ? `${sp} · ${semesterNumber}.º SEMESTRE`
            : "SEMESTRE NO IDENTIFICADO";
    if (sp === "SP5") semester.classList.add("semester-tag-excluded");

    const name = document.createElement("div");
    name.className = "course-name";

    name.textContent =
        course.section ||
        course.description ||
        "Curso de Google Classroom";

    info.append(code, semester, name);

    const status = document.createElement("span");

    status.className = "status" +
        (complete ? " complete" : "");

    const warningCount = Number(
        detailedAudit?.summary?.warningItems || 0
    );

    status.textContent = complete
        ? "Completo"
        : `${pendingCount + warningCount} pendientes`;

    header.append(info, status);

    // CHECKLIST

    const checklist = document.createElement("div");
    checklist.className = "checklist";

    requirements.forEach(requirement => {
        checklist.append(
            createCheckItem(course, requirement)
        );
    });

    // API DETAILS

    const details = document.createElement("details");
    details.className = "api-details";

    const summary = document.createElement("summary");
    summary.textContent = "Resumen de elementos encontrados";

    const grid = document.createElement("div");
    grid.className = "api-grid";

    grid.append(
        createApiDetail("Topics", safeArray(course.topics).length),
        createApiDetail("Materiales", safeArray(course.materials).length),
        createApiDetail("Actividades", safeArray(course.activities).length),
        createApiDetail("Anuncios", safeArray(course.announcements).length)
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
// 13. FILTROS DE CURSOS
// ======================================================

function getCourseFilters(prefix = "") {
    const searchInput = getElement(
        prefix ? `${prefix}SearchInput` : "searchInput"
    );

    const statusFilter = getElement(
        prefix ? `${prefix}StatusFilter` : "statusFilter"
    );

    const semesterFilter = getElement(
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
            String(course.name || "")
                .toLowerCase()
                .includes(filters.search) ||

            String(course.section || "")
                .toLowerCase()
                .includes(filters.search) ||

            String(course.description || "")
                .toLowerCase()
                .includes(filters.search);

        const semester = getSemester(course.name);
        const sp = getSP(course.name);

        const matchesSemester =
            filters.semester === "all" ||
            String(semester) === filters.semester ||
            sp === filters.semester;

        const matchesStatus =
            filters.status === "all" ||
            (filters.status === "complete" && complete) ||
            (filters.status === "pending" && !complete);

        return (
            matchesSearch &&
            matchesSemester &&
            matchesStatus
        );
    });
}

// ======================================================
// 14. RENDER CURSOS
// ======================================================

function renderCourseList(listId, prefix = "") {
    const list = getElement(listId);

    if (!list) {
        return;
    }

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

        return sa - sb ||
            String(a.name).localeCompare(String(b.name));
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
// 15. DASHBOARD
// ======================================================

function updateDashboard() {
    const total = auditResults.length;
    const evaluatedCourses = getPercentageCourses();
    const evaluatedTotal = evaluatedCourses.length;
    const excludedSP5 = auditResults.filter(isExcludedFromPercentage).length;
    const completed = evaluatedCourses.filter(isCourseComplete).length;
    const pending = evaluatedTotal - completed;
    const percentage = evaluatedTotal
        ? Math.round((completed / evaluatedTotal) * 100)
        : 0;

    const values = {
        total,
        completed,
        pending,
        progress: `${percentage}%`,
        progressNumber: `${percentage}%`,
        progressText: evaluatedTotal
            ? `${completed} de ${evaluatedTotal} cursos evaluables completos · SP5 excluido`
            : "Aún no hay cursos evaluables. SP5 no se considera en el porcentaje."
    };

    Object.entries(values).forEach(([id, value]) => setText(id, value));
    setText("excludedSP5", excludedSP5);
    setText("evaluatedTotal", evaluatedTotal);
    setText("evaluatedLabel", `${evaluatedTotal} cursos considerados en el porcentaje`);

    const progressBar = getElement("progressBar");
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute("aria-valuenow", String(percentage));
        progressBar.setAttribute("aria-valuetext", `${percentage}% de cumplimiento; SP5 excluido`);
    }

    renderDashboardCharts(evaluatedCourses, completed, pending, excludedSP5);

    const exportBtn = getElement("exportBtn");
    const exportDetailBtn = getElement("exportDetailBtn");
    if (exportBtn) exportBtn.disabled = total === 0;
    if (exportDetailBtn) exportDetailBtn.disabled = total === 0;
}

function renderDashboardCharts(evaluatedCourses, completed, pending, excludedSP5) {
    const donut = getElement("complianceDonut");
    const legend = getElement("complianceLegend");
    const semesterChart = getElement("semesterChart");
    const percentage = evaluatedCourses.length
        ? Math.round((completed / evaluatedCourses.length) * 100)
        : 0;

    if (donut) {
        donut.style.setProperty("--completion", `${percentage}%`);
        donut.innerHTML = `<div class="donut-center"><strong>${percentage}%</strong><span>Cumplimiento</span></div>`;
    }

    if (legend) {
        legend.innerHTML = `
          <div class="chart-legend-item"><span class="legend-dot legend-complete"></span><span>Completados</span><strong>${completed}</strong></div>
          <div class="chart-legend-item"><span class="legend-dot legend-pending"></span><span>Pendientes</span><strong>${pending}</strong></div>
          <div class="chart-legend-item"><span class="legend-dot legend-excluded"></span><span>SP5 fuera del cálculo</span><strong>${excludedSP5}</strong></div>`;
    }

    if (semesterChart) {
        const groups = ["SP1", "SP2", "SP3", "SP4"].map(sp => {
            const courses = evaluatedCourses.filter(course => getSP(course.name) === sp);
            const done = courses.filter(isCourseComplete).length;
            const rate = courses.length ? Math.round(done / courses.length * 100) : 0;
            return { sp, count: courses.length, done, rate };
        });
        semesterChart.innerHTML = groups.map(group => `
          <div class="semester-chart-row">
            <div class="semester-chart-label"><strong>${group.sp}</strong><span>${group.done}/${group.count} completos</span></div>
            <div class="semester-chart-track"><span style="width:${group.rate}%"></span></div>
            <strong class="semester-chart-rate">${group.rate}%</strong>
          </div>`).join("");
    }
}


// ======================================================
// 16. HALLAZGOS
// ======================================================

function collectFindings() {
    const findings = [];

    auditedCourses.forEach(course => {
        const courseName = course.name;
        const courseFindings = safeObject(course.findings);

        // ELEMENTOS SIN PUBLICAR

        safeArray(courseFindings.unpublished).forEach(item => {
            findings.push({
                type: "unpublished",
                course: courseName,
                title: item.title || "Elemento sin título",
                message: "El elemento se encuentra en borrador.",
                severity: "danger",
                itemType: item.type || "elemento"
            });
        });

        // CONTENIDO INCOMPLETO

        const unorganizedMaterialIds = new Set(
            safeArray(courseFindings.unorganizedMaterials)
                .map(item => item.id)
        );

        const unorganizedActivityIds = new Set(
            safeArray(courseFindings.unorganizedActivities)
                .map(item => item.id)
        );

        safeArray(courseFindings.warnings)
            .filter(item =>
                item.publicationStatus !== "unpublished" &&
                !(
                    item.type === "material" &&
                    unorganizedMaterialIds.has(item.id)
                ) &&
                !(
                    item.type === "activity" &&
                    unorganizedActivityIds.has(item.id)
                )
            )
            .forEach(item => {
                safeArray(item.observations).forEach(observation => {
                    findings.push({
                        type: "incomplete",
                        course: courseName,
                        title: item.title || "Elemento sin título",
                        message: observation,
                        severity: "warning",
                        itemType: item.type || "elemento"
                    });
                });
            });

        // MATERIAL SIN TOPIC

        safeArray(courseFindings.unorganizedMaterials)
            .forEach(item => {
                findings.push({
                    type: "unorganized",
                    course: courseName,
                    title: item.title || "Material sin título",
                    message: "Material sin Topic asignado.",
                    severity: "warning",
                    itemType: "material"
                });
            });

        // ACTIVIDAD SIN TOPIC

        safeArray(courseFindings.unorganizedActivities)
            .forEach(item => {
                findings.push({
                    type: "unorganized",
                    course: courseName,
                    title: item.title || "Actividad sin título",
                    message: "Actividad sin Topic asignado.",
                    severity: "warning",
                    itemType: "activity"
                });
            });

        // TOPICS VACÍOS

        safeArray(courseFindings.emptyTopics)
            .forEach(topic => {
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

        safeArray(courseFindings.courseObservations)
            .forEach(message => {
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

    badge.textContent =
        finding.type === "unpublished"
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

    meta.textContent =
        `${finding.course} · ${finding.itemType}`;

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

    const counters = {
        totalFindings: total,
        unpublishedCount: unpublished,
        incompleteCount: incomplete,
        unorganizedCount: unorganized,
        findingsBadge: total
    };

    Object.entries(counters).forEach(([id, value]) => {
        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }
    });

    const recent = getElement("recentFindings");
    const full = getElement("findingsList");

    recent?.replaceChildren();
    full?.replaceChildren();

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
// 17. FILTROS DE HALLAZGOS
// ======================================================

function initializeFindingFilters() {
    const typeFilter = getElement("findingTypeFilter");
    const courseFilter = getElement("findingCourseFilter");

    typeFilter?.addEventListener("change", filterFindings);
    courseFilter?.addEventListener("change", filterFindings);
}

function populateFindingCourseFilter() {
    const select = getElement("findingCourseFilter");

    if (!select) {
        return;
    }

    const selectedValue = select.value || "all";

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

    select.value = auditResults.some(
        course => course.id === selectedValue
    )
        ? selectedValue
        : "all";
}

function filterFindings() {
    const type =
        getElement("findingTypeFilter")?.value || "all";

    const courseId =
        getElement("findingCourseFilter")?.value || "all";

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

    const list = getElement("findingsList");

    if (!list) {
        return;
    }

    list.replaceChildren();

    if (!filtered.length) {
        const empty = document.createElement("div");

        empty.className = "empty-inline";
        empty.textContent =
            "No hay hallazgos para estos filtros.";

        list.append(empty);
        return;
    }

    filtered.forEach(finding => {
        list.append(createFindingCard(finding));
    });
}

// ======================================================
// 18. EXPORTACIÓN CSV
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

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}

// ======================================================
// 19. REPORTE GENERAL
// ======================================================

function exportReport() {
    if (!auditResults.length) {
        showToast("Primero sincroniza tus cursos.");
        return;
    }

    const headers = [
        "Curso",
        "SP",
        "Semestre",
        "Estado de auditoría",
        "Cuenta para porcentaje",
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
        const summary = safeObject(detailed?.summary);

        return [
            course.name,
            getSP(course.name),
            getSemester(course.name) || "",
            isCourseComplete(course) ? "Completo" : "Pendiente",
            isExcludedFromPercentage(course) ? "No · SP5 excluido" : "Sí",

            ...requirements.map(item =>
                checks[item.key] ? "Completo" : "Pendiente"
            ),

            safeArray(course.topics).length,
            safeArray(course.materials).length,
            safeArray(course.activities).length,
            safeArray(course.announcements).length,

            Number(summary.warningItems || 0),
            Number(summary.unpublishedItems || 0),
            `${Number(summary.progress || 0)}%`
        ];
    });

    downloadCSV(
        "classroom-audit-general.csv",
        [headers, ...rows]
    );

    showToast("Reporte general descargado.");
}

// ======================================================
// 20. REPORTE DETALLADO
// ======================================================

function exportDetailReport() {
    if (!auditedCourses.length) {
        showToast("Primero sincroniza tus cursos.");
        return;
    }

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
        safeArray(course.topics).forEach(topic => {
            safeArray(topic.materials).forEach(material => {
                rows.push([
                    course.name,
                    getSP(course.name),
                    "Material",
                    topic.name,
                    material.title,
                    material.description,
                    material.state,
                    material.status,
                    safeArray(material.observations).join(" | "),
                    safeArray(material.information).join(" | ")
                ]);
            });

            safeArray(topic.activities).forEach(activity => {
                rows.push([
                    course.name,
                    getSP(course.name),
                    "Actividad",
                    topic.name,
                    activity.title,
                    activity.description,
                    activity.state,
                    activity.status,
                    safeArray(activity.observations).join(" | "),
                    safeArray(activity.information).join(" | ")
                ]);
            });
        });

        safeArray(course.unorganizedMaterials).forEach(material => {
            rows.push([
                course.name,
                getSP(course.name),
                "Material sin Topic",
                "",
                material.title,
                material.description,
                material.state,
                material.status,
                safeArray(material.observations).join(" | "),
                safeArray(material.information).join(" | ")
            ]);
        });

        safeArray(course.unorganizedActivities).forEach(activity => {
            rows.push([
                course.name,
                getSP(course.name),
                "Actividad sin Topic",
                "",
                activity.title,
                activity.description,
                activity.state,
                activity.status,
                safeArray(activity.observations).join(" | "),
                safeArray(activity.information).join(" | ")
            ]);
        });

        safeArray(course.announcements).forEach(announcement => {
            rows.push([
                course.name,
                getSP(course.name),
                "Anuncio",
                "",
                announcement.title,
                announcement.description,
                announcement.state,
                announcement.status,
                safeArray(announcement.observations).join(" | "),
                safeArray(announcement.information).join(" | ")
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
// 21. RENDER GENERAL
// ======================================================

function populateSemesterFilters() {
    ["semesterFilter", "coursesSemesterFilter"].forEach(id => {
        const select = getElement(id);
        if (!select) return;
        const previous = select.value || "all";
        const available = [...new Set(auditResults.map(course => getSP(course.name)).filter(Boolean))]
            .sort((a, b) => Number(a.replace("SP", "")) - Number(b.replace("SP", "")));
        select.replaceChildren();
        const all = document.createElement("option");
        all.value = "all";
        all.textContent = "Todos los periodos";
        select.append(all);
        available.forEach(sp => {
            const option = document.createElement("option");
            option.value = String(getSemesterForSP(sp) ?? sp);
            option.textContent = sp === "SP5" ? "SP5 · Fuera del porcentaje" : sp;
            select.append(option);
        });
        select.value = [...select.options].some(option => option.value === previous) ? previous : "all";
    });
}

function getSemesterForSP(sp) {
    return semesterMap.find(item => item.sp === sp)?.semester ?? sp;
}

function renderAll() {
    updateDashboard();
    populateSemesterFilters();
    renderCourses();
    populateFindingCourseFilter();
    renderFindings();
}

// ======================================================
// 22. SINCRONIZACIÓN GOOGLE CLASSROOM
// ======================================================

async function synchronizeClassroom() {
    if (typeof isGoogleConnected !== "function" ||
        !isGoogleConnected()) {

        showToast("Primero conecta tu cuenta de Google.");
        return;
    }

    const buttons = [
        getElement("syncBtn"),
        getElement("coursesSyncBtn")
    ].filter(Boolean);

    buttons.forEach(button => {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = "Sincronizando...";
    });

    setText("connectionStatus", "Sincronizando cursos...");

    try {
        if (typeof runClassroomAudit !== "function") {
            throw new Error(
                "No se encontró runClassroomAudit(). Revisa classroom-api.js."
            );
        }

        if (typeof auditCourseContent !== "function") {
            throw new Error(
                "No se encontró auditCourseContent(). Revisa audit-engine.js."
            );
        }

        const allCourses = await runClassroomAudit();

        // Incluir todos los cursos activos.
        auditResults = getEligibleCourses(allCourses);

        // Auditar el contenido de todos los cursos activos.
        auditedCourses = auditResults.map(course =>
            auditCourseContent(course)
        );

        renderAll();

        setText(
            "connectionStatus",
            `${auditResults.length} cursos activos auditados`
        );

        const syncLabel = "Última sincronización: " + new Date().toLocaleString("es-PE");
        setText("lastSync", syncLabel);
        try { localStorage.setItem("classroom-audit-last-sync", syncLabel); } catch (_) {}

        showToast(
            `Auditoría finalizada. ${auditResults.length} cursos evaluados.`
        );

    } catch (error) {
        console.error("Error de auditoría:", error);

        setText(
            "connectionStatus",
            "Error de sincronización"
        );

        showToast(
            error?.message ||
            "No se pudo sincronizar Classroom."
        );

    } finally {
        buttons.forEach(button => {
            button.disabled = !isGoogleConnected();

            button.textContent =
                button.dataset.originalText || "Sincronizar";
        });
    }
}

// ======================================================
// 23. CONEXIÓN GOOGLE
// ======================================================

function updateGoogleConnectionUI(connected, message) {
    const indicator = getElement("connectionIndicator");
    const status = getElement("connectionStatus");
    const label = getElement("googleConnectionLabel");

    indicator?.classList.toggle("connected", connected);

    if (status) {
        status.textContent = message;
    }

    if (label) {
        label.textContent = connected
            ? "Cuenta conectada. Lista para sincronizar."
            : "Esperando conexión con Google Classroom";
    }

    const dot = getElement("googleAccountInfo")
        ?.querySelector(".account-status .status-dot");

    dot?.classList.toggle("connected", connected);
    dot?.classList.toggle("disconnected", !connected);

    setHidden("connectGoogleBtn", connected);
    setHidden("disconnectBtn", !connected);
    setHidden("emptyConnectBtn", connected);

    const syncBtn = getElement("syncBtn");
    const coursesSyncBtn = getElement("coursesSyncBtn");

    if (syncBtn) {
        syncBtn.disabled = !connected;
    }

    if (coursesSyncBtn) {
        coursesSyncBtn.disabled = !connected;
    }
}

// Eventos de autenticación.

window.addEventListener("google-auth-success", () => {
    updateGoogleConnectionUI(
        true,
        "Google conectado correctamente"
    );

    synchronizeClassroom();
});

window.addEventListener("google-auth-disconnected", () => {
    auditResults = [];
    auditedCourses = [];

    updateGoogleConnectionUI(false, "Sin conectar");

    setText("lastSync", "Sin sincronizar");

    renderAll();

    showToast("Cuenta desconectada.");
});

// ======================================================
// 24. EVENTOS
// ======================================================

function initializeEvents() {
    getElement("connectGoogleBtn")
        ?.addEventListener("click", connectGoogle);

    getElement("emptyConnectBtn")
        ?.addEventListener("click", connectGoogle);

    getElement("syncBtn")
        ?.addEventListener("click", synchronizeClassroom);

    getElement("coursesSyncBtn")
        ?.addEventListener("click", synchronizeClassroom);

    getElement("disconnectBtn")
        ?.addEventListener("click", disconnectGoogle);

    getElement("themeToggle")
        ?.addEventListener("click", toggleTheme);

    getElement("toast")
        ?.querySelector(".toast-close")
        ?.addEventListener("click", () => {
            getElement("toast")?.classList.remove("show");
        });

    getElement("searchInput")
        ?.addEventListener("input", renderCourses);

    getElement("statusFilter")
        ?.addEventListener("change", renderCourses);

    getElement("semesterFilter")
        ?.addEventListener("change", renderCourses);

    getElement("coursesSearchInput")
        ?.addEventListener("input", renderCourses);

    getElement("coursesStatusFilter")
        ?.addEventListener("change", renderCourses);

    getElement("coursesSemesterFilter")
        ?.addEventListener("change", renderCourses);

    getElement("exportBtn")
        ?.addEventListener("click", exportReport);

    getElement("exportDetailBtn")
        ?.addEventListener("click", exportDetailReport);

    initializeFindingFilters();
}

// ======================================================
// 25. INICIALIZACIÓN
// ======================================================

function initializeApp() {
    console.info("Classroom Audit: iniciando aplicación.");

    initializeTheme();
    initializeNavigation();

    // Invocación explícita desde window.
    if (typeof window.initializeSidebar === "function") {
        window.initializeSidebar();
    } else {
        console.error(
            "No se pudo inicializar el sidebar."
        );
    }

    initializeEvents();

    const connected =
        typeof isGoogleConnected === "function" &&
        isGoogleConnected();

    updateGoogleConnectionUI(
        connected,
        connected
            ? "Google conectado"
            : "Sin conectar"
    );

    try {
        const previousSync = localStorage.getItem("classroom-audit-last-sync");
        if (previousSync) setText("lastSync", previousSync);
    } catch (_) {}

    renderAll();

    console.info("Classroom Audit: aplicación inicializada.");
}

// ======================================================
// 26. ARRANQUE SEGURO
// ======================================================

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApp,
        { once: true }
    );
} else {
    initializeApp();
}
