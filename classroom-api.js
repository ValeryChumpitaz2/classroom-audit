
const CLASSROOM_API =
  "https://classroom.googleapis.com/v1";

async function classroomRequest(endpoint) {
  const response = await fetch(
    `${CLASSROOM_API}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      error.error?.message ||
      `Error de Classroom API: ${response.status}`
    );
  }

  return response.json();
}

// Consulta todos los cursos.
async function getAllCourses() {
  const courses = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      pageSize: "100"
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const data = await classroomRequest(
      `/courses?${params}`
    );

    courses.push(...(data.courses || []));
    pageToken = data.nextPageToken || "";

  } while (pageToken);

  return courses.filter(
    course => course.courseState === "ACTIVE"
  );
}

// Consulta Topics, materiales, actividades o anuncios.
async function getCourseCollection(courseId, collection) {
  const validCollections = {
    topics: "topic",
    courseWorkMaterials: "courseWorkMaterial",
    courseWork: "courseWork",
    announcements: "announcements"
  };

  const resultKey = validCollections[collection];

  if (!resultKey) {
    throw new Error("Colección no válida.");
  }

  const results = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      pageSize: "100"
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const endpoint =
      `/courses/${encodeURIComponent(courseId)}` +
      `/${collection}?${params}`;

    const data = await classroomRequest(endpoint);

    results.push(...(data[resultKey] || []));
    pageToken = data.nextPageToken || "";

  } while (pageToken);

  return results;
}

// Auditoría individual de un curso.
async function auditGoogleCourse(course) {
  const [
    topics,
    materials,
    activities,
    announcements
  ] = await Promise.all([
    getCourseCollection(course.id, "topics"),
    getCourseCollection(course.id, "courseWorkMaterials"),
    getCourseCollection(course.id, "courseWork"),
    getCourseCollection(course.id, "announcements")
  ]);

  return {
    id: course.id,
    name: course.name,
    section: course.section || "",
    description: course.description || "",

    topics,
    materials,
    activities,
    announcements,

    checks: {
      description: Boolean(course.description?.trim()),
      topics: topics.length > 0,
      materials: materials.length > 0,
      activities: activities.length > 0,
      announcements: announcements.length > 0
    }
  };
}

// Auditoría general.
async function runClassroomAudit() {
  const courses = await getAllCourses();

  const results = [];

  for (const course of courses) {
    results.push(await auditGoogleCourse(course));
  }

  return results;
}
