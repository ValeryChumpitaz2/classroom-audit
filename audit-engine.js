
/**
 * CLASSROOM AUDIT ENGINE
 * Motor de análisis y evaluación del contenido de Google Classroom.
 */

// ======================================================
// UTILIDADES
// ======================================================

function auditHasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function auditHasAttachments(item) {
  return Array.isArray(item.materials) &&
    item.materials.length > 0;
}

function auditHasLinks(item) {
  return auditHasAttachments(item);
}

// ======================================================
// AUDITORÍA DE DESCRIPCIONES
// ======================================================

function auditDescription(description, minimumLength = 20) {
  if (!auditHasText(description)) {
    return {
      status: "warning",
      message: "No tiene descripción."
    };
  }

  if (description.trim().length < minimumLength) {
    return {
      status: "warning",
      message: "La descripción es demasiado breve."
    };
  }

  return {
    status: "complete",
    message: "Descripción registrada."
  };
}

// ======================================================
// AUDITORÍA DE TOPICS
// ======================================================

function auditTopic(topic) {
  const hasName = auditHasText(topic.name);

  const hasMaterials = topic.materials.length > 0;
  const hasActivities = topic.activities.length > 0;

  const observations = [];

  if (!hasName) {
    observations.push("El Topic no tiene nombre.");
  }

  if (!hasMaterials && !hasActivities) {
    observations.push(
      "El Topic no contiene materiales ni actividades."
    );
  }

  return {
    type: "topic",
    id: topic.topicId,
    name: topic.name || "Topic sin nombre",

    status: observations.length ? "warning" : "complete",

    summary: {
      materials: topic.materials.length,
      activities: topic.activities.length
    },

    observations
  };
}

// ======================================================
// AUDITORÍA DE MATERIALES
// ======================================================

function auditMaterial(material) {
  const observations = [];

  const titleExists = auditHasText(material.title);
  const description = auditDescription(material.description);

  const attachmentsExist = auditHasAttachments(material);

  if (!titleExists) {
    observations.push("El material no tiene título.");
  }

  if (description.status !== "complete") {
    observations.push(description.message);
  }

  if (!attachmentsExist) {
    observations.push(
      "No se identificaron archivos, enlaces u otros recursos adjuntos."
    );
  }

  return {
    type: "material",
    id: material.id,
    title: material.title || "Material sin título",

    description: material.description || "",

    status: observations.length ? "warning" : "complete",

    hasAttachments: attachmentsExist,

    observations
  };
}

// ======================================================
// AUDITORÍA DE ACTIVIDADES
// ======================================================

function auditActivity(activity) {
  const observations = [];

  const titleExists = auditHasText(activity.title);
  const description = auditDescription(activity.description);

  const attachmentsExist = auditHasAttachments(activity);

  if (!titleExists) {
    observations.push("La actividad no tiene título.");
  }

  if (description.status !== "complete") {
    observations.push(description.message);
  }

  if (!attachmentsExist) {
    observations.push(
      "La actividad no tiene recursos adjuntos."
    );
  }

  return {
    type: "activity",
    id: activity.id,
    title: activity.title || "Actividad sin título",

    description: activity.description || "",

    status: observations.length ? "warning" : "complete",

    points: activity.maxPoints ?? null,

    dueDate: activity.dueDate || null,

    hasAttachments: attachmentsExist,

    observations
  };
}

// ======================================================
// AUDITORÍA DE ANUNCIOS
// ======================================================

function auditAnnouncement(announcement) {
  const observations = [];

  if (!auditHasText(announcement.text)) {
    observations.push("El anuncio no tiene contenido.");
  }

  return {
    type: "announcement",
    id: announcement.id,
    title: announcement.text
      ? announcement.text.slice(0, 80)
      : "Anuncio sin contenido",

    status: observations.length ? "warning" : "complete",

    observations
  };
}

// ======================================================
// AUDITORÍA DETALLADA DEL CURSO
// ======================================================

function auditCourseContent(course) {
  const organized = organizeCourseContent(course);

  const auditedTopics = organized.topics.map(topic => {
    const topicAudit = auditTopic(topic);

    const auditedMaterials = topic.materials.map(
      auditMaterial
    );

    const auditedActivities = topic.activities.map(
      auditActivity
    );

    const observations = [
      ...topicAudit.observations,

      ...auditedMaterials.flatMap(
        material => material.observations
      ),

      ...auditedActivities.flatMap(
        activity => activity.observations
      )
    ];

    const totalItems =
      auditedMaterials.length + auditedActivities.length;

    const completedItems = [
      ...auditedMaterials,
      ...auditedActivities
    ].filter(item => item.status === "complete").length;

    const progress = totalItems
      ? Math.round(completedItems / totalItems * 100)
      : 0;

    return {
      ...topicAudit,

      materials: auditedMaterials,
      activities: auditedActivities,

      observations,

      progress
    };
  });

  const auditedUnorganizedMaterials =
    organized.unorganizedMaterials.map(auditMaterial);

  const auditedUnorganizedActivities =
    organized.unorganizedActivities.map(auditActivity);

  const auditedAnnouncements =
    course.announcements.map(auditAnnouncement);

  const courseDescription =
    auditDescription(course.description);

  const allItems = [
    ...auditedTopics.flatMap(topic => [
      ...topic.materials,
      ...topic.activities
    ]),
    ...auditedUnorganizedMaterials,
    ...auditedUnorganizedActivities,
    ...auditedAnnouncements
  ];

  const completedItems = allItems.filter(
    item => item.status === "complete"
  ).length;

  const warningItems = allItems.filter(
    item => item.status === "warning"
  ).length;

  const progress = allItems.length
    ? Math.round(completedItems / allItems.length * 100)
    : 0;

  return {
    id: course.id,
    name: course.name,
    section: course.section,
    description: course.description,

    descriptionAudit: courseDescription,

    topics: auditedTopics,

    unorganizedMaterials: auditedUnorganizedMaterials,
    unorganizedActivities: auditedUnorganizedActivities,

    announcements: auditedAnnouncements,

    summary: {
      totalTopics: auditedTopics.length,
      totalMaterials: course.materials.length,
      totalActivities: course.activities.length,
      totalAnnouncements: course.announcements.length,

      completedItems,
      warningItems,

      progress
    },

    status: warningItems > 0 ||
      courseDescription.status !== "complete"
        ? "warning"
        : "complete"
  };
}

// ======================================================
// AUDITORÍA GENERAL
// ======================================================

function auditAllCourses(courses) {
  return courses.map(auditCourseContent);
}
