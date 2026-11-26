
/**
 * CLASSROOM AUDIT
 * Vista detallada del contenido de cada curso.
 */

// ======================================================
// CREAR ELEMENTOS HTML DE FORMA SEGURA
// ======================================================

function createDetailElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = text;

  return element;
}

// ======================================================
// BADGE DE ESTADO
// ======================================================

function createAuditBadge(status) {
  const labels = {
    complete: "Completo",
    warning: "Revisar",
    missing: "Faltante",
    info: "Informativo"
  };

  const badge = createDetailElement(
    "span",
    `audit-badge ${status}`,
    labels[status] || "Sin evaluar"
  );

  return badge;
}

// ======================================================
// OBSERVACIONES
// ======================================================

function createObservations(observations) {
  const container = createDetailElement(
    "ul",
    "audit-observations"
  );

  observations.forEach(observation => {
    const item = createDetailElement(
      "li",
      "",
      observation
    );

    container.append(item);
  });

  return container;
}

// ======================================================
// MATERIAL
// ======================================================

function createMaterialDetail(material) {
  const article = createDetailElement(
    "article",
    "audit-content-item material-item"
  );

  const header = createDetailElement(
    "div",
    "audit-item-header"
  );

  const title = createDetailElement(
    "h4",
    "",
    material.title
  );

  header.append(title, createAuditBadge(material.status));

  const description = createDetailElement(
    "p",
    "audit-description",
    material.description || "Sin descripción registrada."
  );

  article.append(header, description);

  if (material.observations.length) {
    article.append(
      createObservations(material.observations)
    );
  }

  return article;
}

// ======================================================
// ACTIVIDAD
// ======================================================

function createActivityDetail(activity) {
  const article = createDetailElement(
    "article",
    "audit-content-item activity-item"
  );

  const header = createDetailElement(
    "div",
    "audit-item-header"
  );

  const title = createDetailElement(
    "h4",
    "",
    activity.title
  );

  header.append(title, createAuditBadge(activity.status));

  const description = createDetailElement(
    "p",
    "audit-description",
    activity.description || "Sin instrucciones registradas."
  );

  article.append(header, description);

  // Puntaje
  if (activity.points !== null) {
    const points = createDetailElement(
      "span",
      "audit-meta",
      `Puntaje: ${activity.points}`
    );

    article.append(points);
  }

  // Fecha de entrega
  if (activity.dueDate) {
    const date = new Date(activity.dueDate);

    const formattedDate = !Number.isNaN(date.getTime())
      ? date.toLocaleString("es-PE")
      : activity.dueDate;

    article.append(
      createDetailElement(
        "span",
        "audit-meta",
        `Fecha de entrega: ${formattedDate}`
      )
    );
  }

  if (activity.observations.length) {
    article.append(
      createObservations(activity.observations)
    );
  }

  return article;
}

// ======================================================
// TOPIC
// ======================================================

function createTopicDetail(topic) {
  const details = document.createElement("details");

  details.className = "audit-topic";

  const summary = document.createElement("summary");

  const header = createDetailElement(
    "div",
    "audit-topic-summary"
  );

  const info = createDetailElement(
    "div",
    "audit-topic-info"
  );

  const title = createDetailElement(
    "h3",
    "",
    topic.name
  );

  const counts = createDetailElement(
    "p",
    "",
    `${topic.materials.length} materiales · ${topic.activities.length} actividades`
  );

  info.append(title, counts);

  header.append(info, createAuditBadge(topic.status));

  summary.append(header);

  details.append(summary);

  const body = createDetailElement(
    "div",
    "audit-topic-body"
  );

  // Observaciones del Topic
  if (topic.observations.length) {
    body.append(
      createObservations(topic.observations)
    );
  }

  // Materiales
  if (topic.materials.length) {
    const materialsTitle = createDetailElement(
      "h4",
      "audit-section-label",
      "Materiales"
    );

    body.append(materialsTitle);

    topic.materials.forEach(material => {
      body.append(createMaterialDetail(material));
    });
  }

  // Actividades
  if (topic.activities.length) {
    const activitiesTitle = createDetailElement(
      "h4",
      "audit-section-label",
      "Actividades"
    );

    body.append(activitiesTitle);

    topic.activities.forEach(activity => {
      body.append(createActivityDetail(activity));
    });
  }

  if (!topic.materials.length && !topic.activities.length) {
    body.append(
      createDetailElement(
        "p",
        "audit-empty",
        "Este Topic no contiene materiales ni actividades."
      )
    );
  }

  details.append(body);

  return details;
}

// ======================================================
// CONTENIDO SIN TOPIC
// ======================================================

function createUnorganizedSection(title, items, type) {
  const section = document.createElement("details");

  section.className = "audit-topic unorganized-section";

  const summary = createDetailElement(
    "summary",
    "",
    `${title} (${items.length})`
  );

  section.append(summary);

  const body = createDetailElement(
    "div",
    "audit-topic-body"
  );

  items.forEach(item => {
    body.append(
      type === "material"
        ? createMaterialDetail(item)
        : createActivityDetail(item)
    );
  });

  section.append(body);

  return section;
}

// ======================================================
// VISTA DETALLADA DEL CURSO
// ======================================================

function renderCourseAuditDetail(course) {
  const audited = auditCourseContent(course);

  const container = createDetailElement(
    "section",
    "course-audit-detail"
  );

  // Resumen
  const summary = createDetailElement(
    "div",
    "audit-detail-summary"
  );

  const title = createDetailElement(
    "h3",
    "",
    "Auditoría detallada"
  );

  const stats = createDetailElement(
    "p",
    "",
    `${audited.summary.totalTopics} Topics · ` +
    `${audited.summary.totalMaterials} materiales · ` +
    `${audited.summary.totalActivities} actividades`
  );

  const progress = createDetailElement(
    "p",
    "audit-progress-text",
    `Contenido revisado: ${audited.summary.progress}%`
  );

  summary.append(title, stats, progress);

  container.append(summary);

  // Descripción del curso
  const descriptionSection = createDetailElement(
    "div",
    "audit-course-description"
  );

  descriptionSection.append(
    createDetailElement(
      "h4",
      "",
      "Descripción del curso"
    ),
    createDetailElement(
      "p",
      "",
      audited.description || "El curso no tiene descripción."
    ),
    createAuditBadge(
      audited.descriptionAudit.status
    )
  );

  if (audited.descriptionAudit.status !== "complete") {
    descriptionSection.append(
      createObservations([
        audited.descriptionAudit.message
      ])
    );
  }

  container.append(descriptionSection);

  // Topics
  const topicsSection = createDetailElement(
    "div",
    "audit-topics-section"
  );

  topicsSection.append(
    createDetailElement(
      "h3",
      "",
      "Contenido organizado por Topics"
    )
  );

  audited.topics.forEach(topic => {
    topicsSection.append(createTopicDetail(topic));
  });

  container.append(topicsSection);

  // Materiales sin Topic
  if (audited.unorganizedMaterials.length) {
    container.append(
      createUnorganizedSection(
        "Materiales sin Topic",
        audited.unorganizedMaterials,
        "material"
      )
    );
  }

  // Actividades sin Topic
  if (audited.unorganizedActivities.length) {
    container.append(
      createUnorganizedSection(
        "Actividades sin Topic",
        audited.unorganizedActivities,
      "activity"
      )
    );
  }

  // Anuncios
  if (audited.announcements.length) {
    const announcementsSection = createDetailElement(
      "details",
      "audit-topic"
    );

    const announcementsSummary = createDetailElement(
      "summary",
      "",
      `Anuncios (${audited.announcements.length})`
    );

    announcementsSection.append(announcementsSummary);

    audited.announcements.forEach(announcement => {
      const item = createDetailElement(
        "article",
        "audit-content-item"
      );

      item.append(
        createDetailElement(
          "p",
          "",
          announcement.title
        ),
        createAuditBadge(announcement.status)
      );

      if (announcement.observations.length) {
        item.append(
          createObservations(announcement.observations)
        );
      }

      announcementsSection.append(item);
    });

    container.append(announcementsSection);
  }

  return container;
}
