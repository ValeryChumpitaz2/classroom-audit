
/**
 * CLASSROOM AUDIT ENGINE
 * Evaluación de cursos, Topics, materiales, actividades y anuncios.
 * Alcance: análisis de contenido, publicación y organización.
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
// PUBLICACIÓN
// ======================================================

function auditPublication(item) {
  const state = String(item.state || "").toUpperCase();

  if (state === "DRAFT") {
    return {
      status: "unpublished",
      message: "El elemento se encuentra en borrador y no está publicado."
    };
  }

  if (state === "PUBLISHED") {
    return {
      status: "published",
      message: "El elemento está publicado."
    };
  }

  if (state === "DELETED") {
    return {
      status: "deleted",
      message: "El elemento está eliminado."
    };
  }

  if (state === "ARCHIVED") {
    return {
      status: "archived",
      message: "El elemento está archivado."
    };
  }

  return {
    status: "unknown",
    message: "No se pudo determinar su estado de publicación."
  };
}

// ======================================================
// TOPICS
// ======================================================

function auditTopic(topic) {
  const observations = [];

  if (!auditHasText(topic.name)) {
    observations.push("El Topic no tiene nombre.");
  }

  if (!topic.materials.length && !topic.activities.length) {
    observations.push("El Topic está vacío.");
  }

  return {
    type: "topic",
    id: topic.topicId,
    name: topic.name || "Topic sin nombre",
    status: observations.length ? "warning" : "complete",
    materialsCount: topic.materials.length,
    activitiesCount: topic.activities.length,
    observations
  };
}

// ======================================================
// MATERIALES
// ======================================================

function auditMaterial(material) {
  const observations = [];
  const information = [];

  const descriptionAudit = auditDescription(
    material.description
  );

  const publicationAudit = auditPublication(material);
  const attachmentsExist = auditHasAttachments(material);

  // Validaciones importantes
  if (!auditHasText(material.title)) {
    observations.push("El material no tiene título.");
  }

  if (descriptionAudit.status !== "complete") {
    observations.push(descriptionAudit.message);
  }

  if (publicationAudit.status === "unpublished") {
    observations.push(publicationAudit.message);
  }

  // Información que no necesariamente representa un error
  if (publicationAudit.status === "unknown") {
    information.push(
      "No se pudo verificar el estado de publicación."
    );
  }

  if (!attachmentsExist) {
    information.push(
      "No se identifican archivos o enlaces adjuntos."
    );
  }

  return {
    type: "material",
    id: material.id,
    title: material.title || "Material sin título",
    description: material.description || "",
    state: material.state || "UNKNOWN",
    publicationStatus: publicationAudit.status,
    hasAttachments: attachmentsExist,
    attachments: material.materials || [],
    status: observations.length ? "warning" : "complete",
    observations,
    information
  };
}

// ======================================================
// ACTIVIDADES
// ======================================================

function auditActivity(activity) {
  const observations = [];
  const information = [];

  const descriptionAudit = auditDescription(
    activity.description
  );

  const publicationAudit = auditPublication(activity);
  const attachmentsExist = auditHasAttachments(activity);

  // Validaciones importantes
  if (!auditHasText(activity.title)) {
    observations.push("La actividad no tiene título.");
  }

  if (descriptionAudit.status !== "complete") {
    observations.push(descriptionAudit.message);
  }

  if (publicationAudit.status === "unpublished") {
    observations.push(publicationAudit.message);
  }

  // Información complementaria
  if (publicationAudit.status === "unknown") {
    information.push(
      "No se pudo verificar el estado de publicación."
    );
  }

  if (!attachmentsExist) {
    information.push(
      "La actividad no tiene archivos o enlaces adjuntos."
    );
  }

  if (!activity.dueDate) {
    information.push(
      "La actividad no tiene fecha de entrega configurada."
    );
  }

  if (
    activity.maxPoints === undefined ||
    activity.maxPoints === null
  ) {
    information.push(
      "La actividad no tiene puntaje definido."
    );
  }

  return {
    type: "activity",
    id: activity.id,
    title: activity.title || "Actividad sin título",
    description: activity.description || "",
    state: activity.state || "UNKNOWN",
    publicationStatus: publicationAudit.status,
    points: activity.maxPoints ?? null,
    dueDate: activity.dueDate || null,
    attachments: activity.materials || [],
    hasAttachments: attachmentsExist,
    status: observations.length ? "warning" : "complete",
    observations,
    information
  };
}

// ======================================================
// ANUNCIOS
// ======================================================

function auditAnnouncement(announcement) {
  const observations = [];
  const information = [];

  if (!auditHasText(announcement.text)) {
    observations.push("El anuncio no tiene contenido.");
  }

  if (!announcement.materials?.length) {
    information.push(
      "El anuncio no contiene recursos adjuntos."
    );
  }

  return {
    type: "announcement",
    id: announcement.id,
    title: announcement.text
      ? announcement.text.slice(0, 100)
      : "Anuncio sin contenido",
    description: announcement.text || "",
    status: observations.length ? "warning" : "complete",
    observations,
    information
  };
}

// ======================================================
// ORGANIZACIÓN DEL CONTENIDO
// ======================================================

function organizeCourseContent(course) {
  const topics = course.topics.map(topic => ({
    ...topic,

    materials: course.materials.filter(
      material => material.topicId === topic.topicId
    ),

    activities: course.activities.filter(
      activity => activity.topicId === topic.topicId
    )
  }));

  const unorganizedMaterials = course.materials.filter(
    material => !material.topicId
  );

  const unorganizedActivities = course.activities.filter(
    activity => !activity.topicId
  );

  return {
    topics,
    unorganizedMaterials,
    unorganizedActivities,

    emptyTopics: topics.filter(
      topic => !topic.materials.length && !topic.activities.length
    )
  };
}

// ======================================================
// AUDITORÍA COMPLETA DEL CURSO
// ======================================================

function auditCourseContent(course) {
  const organized = organizeCourseContent(course);

  const descriptionAudit = auditDescription(course.description);

  // Auditoría de Topics y contenido asociado
  const auditedTopics = organized.topics.map(topic => {
    const topicAudit = auditTopic(topic);

    const materials = topic.materials.map(auditMaterial);
    const activities = topic.activities.map(auditActivity);

    const observations = [
      ...topicAudit.observations,
      ...materials.flatMap(item => item.observations),
      ...activities.flatMap(item => item.observations)
    ];

    const items = [...materials, ...activities];

    const completed = items.filter(
      item => item.status === "complete"
    ).length;

    return {
      ...topicAudit,
      materials,
      activities,
      observations,

      progress: items.length
        ? Math.round(completed / items.length * 100)
        : 0
    };
  });

  // Contenido que no pertenece a ningún Topic
  const unorganizedMaterials =
    organized.unorganizedMaterials.map(auditMaterial);

  const unorganizedActivities =
    organized.unorganizedActivities.map(auditActivity);

  // Auditoría de anuncios
  const announcements =
    course.announcements.map(auditAnnouncement);

  // Consolidación del contenido
  const allItems = [
    ...auditedTopics.flatMap(topic => [
      ...topic.materials,
      ...topic.activities
    ]),
    ...unorganizedMaterials,
    ...unorganizedActivities,
    ...announcements
  ];

  // Clasificación
  const warnings = allItems.filter(
    item => item.status === "warning"
  );

  const unpublished = allItems.filter(
    item => item.publicationStatus === "unpublished"
  );

  const completed = allItems.filter(
    item => item.status === "complete"
  );

  const informational = allItems.flatMap(
    item => item.information || []
  );

  // Conteo de contenido no organizado
  const unorganizedCount =
    unorganizedMaterials.length +
    unorganizedActivities.length;

  // Observaciones generales del curso
  const courseObservations = [];

  if (descriptionAudit.status !== "complete") {
    courseObservations.push(descriptionAudit.message);
  }

  if (!course.topics.length) {
    courseObservations.push(
      "El curso no tiene Topics registrados."
    );
  }

  // Progreso general
  const progress = allItems.length
    ? Math.round(completed.length / allItems.length * 100)
    : 0;

  return {
    id: course.id,
    name: course.name,
    section: course.section || "",
    description: course.description || "",
    descriptionAudit,

    topics: auditedTopics,
    unorganizedMaterials,
    unorganizedActivities,
    announcements,

    observations: courseObservations,
    information: informational,

    summary: {
      totalTopics: auditedTopics.length,
      totalMaterials: course.materials.length,
      totalActivities: course.activities.length,
      totalAnnouncements: announcements.length,
      totalItems: allItems.length,
      completedItems: completed.length,
      warningItems: warnings.length,
      unpublishedItems: unpublished.length,
      unorganizedItems: unorganizedCount,
      emptyTopics: organized.emptyTopics.length,
      progress
    },

    findings: {
      warnings,
      unpublished,
      unorganizedMaterials,
      unorganizedActivities,
      emptyTopics: organized.emptyTopics,
      courseObservations
    },

    status:
      warnings.length ||
      unpublished.length ||
      unorganizedCount ||
      organized.emptyTopics.length ||
      courseObservations.length
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
