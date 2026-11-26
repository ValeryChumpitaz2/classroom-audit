/**
 * CLASSROOM AUDIT
 * Acceso de solo lectura a Google Classroom API v1.
 */

const CLASSROOM_API = "https://classroom.googleapis.com/v1";

const CLASSROOM_ELIGIBLE_CODES = [
  "ASE261_POO",
  "ASE252_PFE",
  "ASE251_DAM",
  "ASE242_SDE"
];

async function classroomRequest(endpoint) {
  const token = getAccessToken();
  const response = await fetch(`${CLASSROOM_API}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message || `Error de Classroom API: ${response.status}`;
    if (response.status === 401) {
      throw new Error("La autorización de Google venció. Vuelve a conectar tu cuenta.");
    }
    if (response.status === 403) {
      throw new Error(`Google no concedió permiso para esta consulta: ${message}`);
    }
    throw new Error(message);
  }

  if (response.status === 204) return {};
  return response.json();
}

async function getPaginatedCollection(endpoint, resultKey) {
  const results = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const separator = endpoint.includes("?") ? "&" : "?";
    const data = await classroomRequest(`${endpoint}${separator}${params.toString()}`);
    results.push(...(Array.isArray(data?.[resultKey]) ? data[resultKey] : []));
    pageToken = data?.nextPageToken || "";
  } while (pageToken);

  return results;
}

function isEligibleClassroomCourse(course) {
  // Todos los cursos activos se conservan; los códigos conocidos solo
  // permiten identificar el semestre, no excluir cursos.
  return course?.courseState === "ACTIVE";
}

async function getAllCourses() {
  const courses = await getPaginatedCollection("/courses", "courses");
  return courses.filter(course => course?.courseState === "ACTIVE");
}

async function getCourseCollection(courseId, collection) {
  const validCollections = {
    topics: "topic",
    courseWorkMaterials: "courseWorkMaterial",
    courseWork: "courseWork",
    announcements: "announcements"
  };

  const resultKey = validCollections[collection];
  if (!resultKey) throw new Error(`Colección no válida: ${collection}`);

  const endpoint = `/courses/${encodeURIComponent(courseId)}/${collection}`;
  return getPaginatedCollection(endpoint, resultKey);
}

async function auditGoogleCourse(course) {
  const [topics, materials, activities, announcements] = await Promise.all([
    getCourseCollection(course.id, "topics"),
    getCourseCollection(course.id, "courseWorkMaterials"),
    getCourseCollection(course.id, "courseWork"),
    getCourseCollection(course.id, "announcements")
  ]);

  return {
    id: course.id,
    name: course.name || "Curso sin nombre",
    section: course.section || "",
    description: course.description || "",
    courseState: course.courseState || "",
    topics,
    materials,
    activities,
    announcements,
    checks: {
      description: Boolean(String(course.description || "").trim()),
      topics: topics.length > 0,
      materials: materials.length > 0,
      activities: activities.length > 0,
      announcements: announcements.length > 0
    }
  };
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    () => runWorker()
  );

  await Promise.all(workers);
  return results;
}

async function runClassroomAudit() {
  const courses = await getAllCourses();
  return runWithConcurrency(courses, 3, auditGoogleCourse);
}
