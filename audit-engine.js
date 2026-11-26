/**
 * CLASSROOM AUDIT ENGINE
 * Auditoría local de cursos, temas, materiales, actividades y anuncios.
 */

function auditSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function auditHasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function auditHasAttachments(item) {
  return auditSafeArray(item?.materials).length > 0;
}

function auditDescription(description, minimumLength = 20) {
  if (!auditHasText(description)) {
    return { status: "warning", message: "No tiene descripción." };
  }
  if (description.trim().length < minimumLength) {
    return { status: "warning", message: "La descripción es demasiado breve." };
  }
  return { status: "complete", message: "Descripción registrada." };
}

function auditPublication(item) {
  const state = String(item?.state || "").toUpperCase();
  if (state === "DRAFT") return { status: "unpublished", message: "El elemento se encuentra en borrador y no está publicado." };
  if (state === "PUBLISHED") return { status: "published", message: "El elemento está publicado." };
  if (state === "DELETED") return { status: "deleted", message: "El elemento está eliminado." };
  if (state === "ARCHIVED") return { status: "archived", message: "El elemento está archivado." };
  return { status: "unknown", message: "No se pudo determinar su estado de publicación." };
}

function auditTopic(topic) {
  const materials = auditSafeArray(topic?.materials);
  const activities = auditSafeArray(topic?.activities);
  const observations = [];
  if (!auditHasText(topic?.name)) observations.push("El Topic no tiene nombre.");
  if (!materials.length && !activities.length) observations.push("El Topic está vacío.");
  return {
    type: "topic",
    id: topic?.topicId || "",
    name: topic?.name || "Topic sin nombre",
    status: observations.length ? "warning" : "complete",
    materialsCount: materials.length,
    activitiesCount: activities.length,
    observations
  };
}

function auditMaterial(material) {
  const observations = [];
  const information = [];
  const descriptionAudit = auditDescription(material?.description);
  const publicationAudit = auditPublication(material);
  const attachments = auditSafeArray(material?.materials);

  if (!auditHasText(material?.title)) observations.push("El material no tiene título.");
  if (descriptionAudit.status !== "complete") observations.push(descriptionAudit.message);
  if (publicationAudit.status === "unpublished") observations.push(publicationAudit.message);
  if (publicationAudit.status === "unknown") information.push(publicationAudit.message);
  if (!attachments.length) information.push("No se identifican archivos o enlaces adjuntos.");

  return {
    type: "material",
    id: material?.id || "",
    title: material?.title || "Material sin título",
    description: material?.description || "",
    state: material?.state || "UNKNOWN",
    publicationStatus: publicationAudit.status,
    hasAttachments: attachments.length > 0,
    attachments,
    status: observations.length ? "warning" : "complete",
    observations,
    information
  };
}

function auditActivity(activity) {
  const observations = [];
  const information = [];
  const descriptionAudit = auditDescription(activity?.description);
  const publicationAudit = auditPublication(activity);
  const attachments = auditSafeArray(activity?.materials);

  if (!auditHasText(activity?.title)) observations.push("La actividad no tiene título.");
  if (descriptionAudit.status !== "complete") observations.push(descriptionAudit.message);
  if (publicationAudit.status === "unpublished") observations.push(publicationAudit.message);
  if (publicationAudit.status === "unknown") information.push(publicationAudit.message);
  if (!attachments.length) information.push("La actividad no tiene archivos o enlaces adjuntos.");
  if (!activity?.dueDate) information.push("La actividad no tiene fecha de entrega configurada.");
  if (activity?.maxPoints === undefined || activity?.maxPoints === null) information.push("La actividad no tiene puntaje definido.");

  return {
    type: "activity",
    id: activity?.id || "",
    title: activity?.title || "Actividad sin título",
    description: activity?.description || "",
    state: activity?.state || "UNKNOWN",
    publicationStatus: publicationAudit.status,
    points: activity?.maxPoints ?? null,
    dueDate: activity?.dueDate || null,
    attachments,
    hasAttachments: attachments.length > 0,
    status: observations.length ? "warning" : "complete",
    observations,
    information
  };
}

function auditAnnouncement(announcement) {
  const observations = [];
  const information = [];
  const publicationAudit = auditPublication(announcement);
  if (!auditHasText(announcement?.text)) observations.push("El anuncio no tiene contenido.");
  if (publicationAudit.status === "unpublished") observations.push(publicationAudit.message);
  if (publicationAudit.status === "unknown") information.push(publicationAudit.message);
  if (!auditSafeArray(announcement?.materials).length) information.push("El anuncio no contiene recursos adjuntos.");

  return {
    type: "announcement",
    id: announcement?.id || "",
    title: announcement?.text ? announcement.text.slice(0, 100) : "Anuncio sin contenido",
    description: announcement?.text || "",
    state: announcement?.state || "UNKNOWN",
    publicationStatus: publicationAudit.status,
    status: observations.length ? "warning" : "complete",
    observations,
    information
  };
}

function organizeCourseContent(course) {
  const topicsSource = auditSafeArray(course?.topics);
  const materials = auditSafeArray(course?.materials);
  const activities = auditSafeArray(course?.activities);

  const topics = topicsSource.map(topic => ({
    ...topic,
    materials: materials.filter(item => item?.topicId === topic?.topicId),
    activities: activities.filter(item => item?.topicId === topic?.topicId)
  }));

  const unorganizedMaterials = materials.filter(item => !item?.topicId || !topicsSource.some(topic => topic?.topicId === item.topicId));
  const unorganizedActivities = activities.filter(item => !item?.topicId || !topicsSource.some(topic => topic?.topicId === item.topicId));

  return {
    topics,
    unorganizedMaterials,
    unorganizedActivities,
    emptyTopics: topics.filter(topic => !topic.materials.length && !topic.activities.length)
  };
}

function auditCourseContent(course = {}) {
  const normalized = {
    ...course,
    topics: auditSafeArray(course.topics),
    materials: auditSafeArray(course.materials),
    activities: auditSafeArray(course.activities),
    announcements: auditSafeArray(course.announcements)
  };

  const organized = organizeCourseContent(normalized);
  const descriptionAudit = auditDescription(normalized.description);

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
    const completed = items.filter(item => item.status === "complete").length;
    return {
      ...topicAudit,
      materials,
      activities,
      observations,
      progress: items.length ? Math.round(completed / items.length * 100) : 0
    };
  });

  const unorganizedMaterials = organized.unorganizedMaterials.map(auditMaterial);
  const unorganizedActivities = organized.unorganizedActivities.map(auditActivity);
  const announcements = normalized.announcements.map(auditAnnouncement);

  const allItems = [
    ...auditedTopics.flatMap(topic => [...topic.materials, ...topic.activities]),
    ...unorganizedMaterials,
    ...unorganizedActivities,
    ...announcements
  ];

  const warnings = allItems.filter(item => item.status === "warning");
  const unpublished = allItems.filter(item => item.publicationStatus === "unpublished");
  const completed = allItems.filter(item => item.status === "complete");
  const informational = allItems.flatMap(item => item.information || []);
  const unorganizedCount = unorganizedMaterials.length + unorganizedActivities.length;

  const courseObservations = [];
  if (descriptionAudit.status !== "complete") courseObservations.push(descriptionAudit.message);
  if (!normalized.topics.length) courseObservations.push("El curso no tiene Topics registrados.");

  const progress = allItems.length ? Math.round(completed.length / allItems.length * 100) : 0;

  return {
    id: normalized.id,
    name: normalized.name || "Curso sin nombre",
    section: normalized.section || "",
    description: normalized.description || "",
    descriptionAudit,
    topics: auditedTopics,
    unorganizedMaterials,
    unorganizedActivities,
    announcements,
    observations: courseObservations,
    information: informational,
    summary: {
      totalTopics: auditedTopics.length,
      totalMaterials: normalized.materials.length,
      totalActivities: normalized.activities.length,
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
      emptyTopics: organized.emptyTopics.map(topic => ({
        id: topic.topicId,
        name: topic.name || "Topic sin nombre",
        observations: ["El Topic no tiene materiales ni actividades."]
      })),
      courseObservations
    },
    status: warnings.length || unpublished.length || unorganizedCount || organized.emptyTopics.length || courseObservations.length
      ? "warning"
      : "complete"
  };
}

function auditAllCourses(courses) {
  return auditSafeArray(courses).map(auditCourseContent);
}
