
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

// ======================================================
// ORGANIZAR CONTENIDO DEL CURSO POR TOPIC
// ======================================================

function organizeCourseContent(audit) {
  const topics = audit.topics.map(topic => {
    const topicId = topic.topicId;

    const materials = audit.materials.filter(
      material => material.topicId === topicId
    );

    const activities = audit.activities.filter(
      activity => activity.topicId === topicId
    );

    return {
      ...topic,
      materials,
      activities,

      checks: {
        hasMaterials: materials.length > 0,
        hasActivities: activities.length > 0,
        materialsWithDescription: materials.filter(
          material => material.description?.trim()
        ).length,
        activitiesWithDescription: activities.filter(
          activity => activity.description?.trim()
        ).length
      }
    };
  });

  // Materiales sin Topic asignado
  const unorganizedMaterials = audit.materials.filter(
    material => !material.topicId
  );

  // Actividades sin Topic asignado
  const unorganizedActivities = audit.activities.filter(
    activity => !activity.topicId
  );

  // Topics que no contienen materiales ni actividades
  const emptyTopics = topics.filter(
    topic =>
      topic.materials.length === 0 &&
      topic.activities.length === 0
  );

  return {
    topics,
    unorganizedMaterials,
    unorganizedActivities,
    emptyTopics,

    summary: {
      totalTopics: topics.length,
      totalMaterials: audit.materials.length,
      totalActivities: audit.activities.length,

      materialsWithoutDescription: audit.materials.filter(
        material => !material.description?.trim()
      ).length,

      activitiesWithoutDescription: audit.activities.filter(
        activity => !activity.description?.trim()
      ).length,

      unorganizedMaterials: unorganizedMaterials.length,
      unorganizedActivities: unorganizedActivities.length,
      emptyTopics: emptyTopics.length
    }
  };
}