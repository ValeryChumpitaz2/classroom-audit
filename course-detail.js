
/**
 * CLASSROOM AUDIT
 * Renderizado de auditorías detalladas.
 */

// ======================================================
// UTILIDADES DOM
// ======================================================

function detailElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text) element.textContent = text;

  return element;
}

// ======================================================
// ESTADOS
// ======================================================

function detailBadge(status) {
  const labels = {
    complete: "Correcto",
    warning: "Revisar",
    unpublished: "Sin publicar",
    published: "Publicado",
    deleted: "Eliminado",
    archived: "Archivado",
    unknown: "Desconocido",
    info: "Informativo"
  };

  const visualStatus = status === "unpublished"
    ? "warning"
    : status === "published"
      ? "complete"
      : status === "deleted"
        ? "missing"
        : status === "archived"
          ? "info"
          : status;

  return detailElement(
    "span",
    `audit-badge ${visualStatus || "info"}`,
    labels[status] || "Sin evaluar"
  );
}

// ======================================================
// OBSERVACIONES
// ======================================================

function detailObservations(observations, type = "warning") {
  if (!observations?.length) return null;

  const list = detailElement(
    "ul",
    `audit-observations ${type}`
  );

  observations.forEach(message => {
    list.append(
      detailElement("li", "", message)
    );
  });

  return list;
}

// ======================================================
// INFORMACIÓN ADICIONAL
// ======================================================

function detailInformation(information) {
  if (!information?.length) return null;

  const list = detailElement(
    "ul",
    "audit-information"
  );

  information.forEach(message => {
    list.append(detailElement("li", "", message));
  });

  return list;
}

// ======================================================
// ADJUNTOS
// ======================================================

function renderAttachments(materials = []) {
  const container = detailElement(
    "div",
    "audit-attachments"
  );

  materials.forEach(material => {
    const type = material.driveFile
      ? "Archivo"
      : material.youtubeVideo
        ? "Video"
        : material.link
          ? "Enlace"
          : material.form
            ? "Formulario"
            : "Recurso";

    const label = material.driveFile?.title ||
      material.youtubeVideo?.title ||
      material.link?.title ||
      material.form?.title ||
      type;

    const item = detailElement(
      "div",
      "audit-attachment"
    );

    item.append(
      detailElement("span", "attachment-type", type),
      detailElement("span", "attachment-name", label)
    );

    const url =
      material.driveFile?.alternateLink ||
      material.youtubeVideo?.alternateLink ||
      material.link?.url ||
      material.form?.url;

    if (url) {
      const link = document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Abrir ↗";

      item.append(link);
    }

    container.append(item);
  });

  return container;
}

// ======================================================
// MATERIALES
// ======================================================

function renderMaterial(material) {
  const card = detailElement(
    "article",
    "audit-content-item"
  );

  const header = detailElement(
    "div",
    "audit-item-header"
  );

  const title = detailElement(
    "h4",
    "",
    material.title
  );

  header.append(title, detailBadge(material.status));

  card.append(header);

  card.append(
    detailElement(
      "p",
      "audit-description",
      material.description || "Este material no tiene descripción."
    )
  );

  card.append(
    detailElement(
      "div",
      "audit-publication-info",
      `Estado de publicación: ${material.state}`
    )
  );

  if (material.attachments?.length) {
    card.append(renderAttachments(material.attachments));
  }

  const observations = detailObservations(
    material.observations
  );

  if (observations) card.append(observations);

  return card;
}

// ======================================================
// ACTIVIDADES
// ======================================================

function renderActivity(activity) {
  const card = detailElement(
    "article",
    "audit-content-item"
  );

  const header = detailElement(
    "div",
    "audit-item-header"
  );

  header.append(
    detailElement("h4", "", activity.title),
    detailBadge(activity.status)
  );

  card.append(header);

  card.append(
    detailElement(
      "p",
      "audit-description",
      activity.description ||
      "Esta actividad no tiene instrucciones registradas."
    )
  );

  const metadata = detailElement(
    "div",
    "audit-metadata"
  );

  metadata.append(
    detailElement(
      "span",
      "audit-publication-info",
      `Publicación: ${activity.state}`
    )
  );

  if (activity.points !== null) {
    metadata.append(
      detailElement(
        "span",
        "audit-meta",
        `Puntaje: ${activity.points}`
      )
    );
  }

  if (activity.dueDate) {
    const date = new Date(activity.dueDate);

    const formattedDate = !Number.isNaN(date.getTime())
      ? date.toLocaleString("es-PE")
      : activity.dueDate;

    metadata.append(
      detailElement(
        "span",
        "audit-meta",
        `Entrega: ${formattedDate}`
      )
    );
  }

  card.append(metadata);

  if (activity.attachments?.length) {
    card.append(renderAttachments(activity.attachments));
  }

  const observations = detailObservations(
    activity.observations
  );

  const information = detailInformation(
    activity.information
  );

  if (observations) card.append(observations);
  if (information) card.append(information);

  return card;
}

// ======================================================
// TOPIC
// ======================================================

function renderTopic(topic) {
  const details = detailElement(
    "details",
    "audit-topic"
  );

  const summary = detailElement(
    "summary",
    "audit-topic-summary"
  );

  const info = detailElement(
    "div",
    "audit-topic-info"
  );

  info.append(
    detailElement("h3", "", topic.name),
    detailElement(
      "p",
      "",
      `${topic.materials.length} materiales · ` +
      `${topic.activities.length} actividades`
    )
  );

  summary.append(
    info,
    detailBadge(topic.status)
  );

  details.append(summary);

  const body = detailElement(
    "div",
    "audit-topic-body"
  );

  const observations = detailObservations(
    topic.observations
  );

  if (observations) body.append(observations);

  // Materiales
  if (topic.materials.length) {
    body.append(
      detailElement(
        "h4",
        "audit-section-label",
        "Materiales"
      )
    );

    topic.materials.forEach(material => {
      body.append(renderMaterial(material));
    });
  }

  // Actividades
  if (topic.activities.length) {
    body.append(
      detailElement(
        "h4",
        "audit-section-label",
        "Actividades"
      )
    );

    topic.activities.forEach(activity => {
      body.append(renderActivity(activity));
    });
  }

  if (!topic.materials.length && !topic.activities.length) {
    body.append(
      detailElement(
        "p",
        "audit-empty",
        "Topic vacío. No contiene materiales ni actividades."
      )
    );
  }

  details.append(body);

  return details;
}

// ======================================================
// ELEMENTOS SIN TOPIC
// ======================================================

function renderUnorganized(title, items, type) {
  if (!items.length) return null;

  const details = detailElement(
    "details",
    "audit-topic unorganized-section"
  );

  details.append(
    detailElement(
      "summary",
      "",
      `${title} · ${items.length}`
    )
  );

  const body = detailElement(
    "div",
    "audit-topic-body"
  );

  items.forEach(item => {
    body.append(
      type === "material"
        ? renderMaterial(item)
        : renderActivity(item)
    );
  });

  details.append(body);

  return details;
}

// ======================================================
// ANUNCIOS
// ======================================================

function renderAnnouncement(announcement) {
  const card = detailElement(
    "article",
    "audit-content-item"
  );

  card.append(
    detailElement(
      "h4",
      "",
      announcement.title
    ),
    detailElement(
      "p",
      "audit-description",
      announcement.description
    )
  );

  const observations = detailObservations(
    announcement.observations
  );

  const information = detailInformation(
    announcement.information
  );

  if (observations) card.append(observations);
  if (information) card.append(information);

  return card;
}

// ======================================================
// VISTA DETALLADA
// ======================================================

function renderCourseAuditDetail(course) {
  const audited = auditCourseContent(course);

  const container = detailElement(
    "section",
    "course-audit-detail"
  );

  // RESUM
  const summary = detailElement(
    "div",
    "audit-detail-summary"
  );

  summary.append(
    detailElement(
      "h3",
      "",
      "Resumen de contenidos"
    ),
    detailElement(
      "p",
      "",
      `${audited.summary.totalTopics} Topics · ` +
      `${audited.summary.totalMaterials} materiales · ` +
      `${audited.summary.totalActivities} actividades · ` +
      `${audited.summary.totalAnnouncements} anuncios`
    ),
    detailElement(
      "p",
      "audit-progress-text",
      `Cumplimiento de contenidos: ${audited.summary.progress}%`
    )
  );

  container.append(summary);

  // DESCRIPCIÓN
  const description = detailElement(
    "div",
    "audit-course-description"
  );

  description.append(
    detailElement(
      "h4",
      "",
      "Descripción del curso"
    ),
    detailBadge(audited.descriptionAudit.status),
    detailElement(
      "p",
      "",
      audited.description || "Sin descripción registrada."
    )
  );

  if (audited.descriptionAudit.status !== "complete") {
    const observations = detailObservations([
      audited.descriptionAudit.message
    ]);

    if (observations) description.append(observations);
  }

  container.append(description);

  // TOPICS
  const topicsSection = detailElement(
    "section",
    "audit-topics-section"
  );

  topicsSection.append(
    detailElement(
      "h3",
      "audit-section-label",
      "Topics del curso"
    )
  );

  if (!audited.topics.length) {
    topicsSection.append(
      detailElement(
        "p",
        "audit-empty",
        "Este curso no tiene Topics."
      )
    );
  }

  audited.topics.forEach(topic => {
    topicsSection.append(renderTopic(topic));
  });

  container.append(topicsSection);

  // MATERIAL SIN TOPIC
  const unorganizedMaterials = renderUnorganized(
    "Materiales sin Topic",
    audited.unorganizedMaterials,
    "material"
  );

  if (unorganizedMaterials) {
    container.append(unorganizedMaterials);
  }

  // ACTIVIDADES SIN TOPIC
  const unorganizedActivities = renderUnorganized(
    "Actividades sin Topic",
    audited.unorganizedActivities,
    "activity"
  );

  if (unorganizedActivities) {
    container.append(unorganizedActivities);
  }

  // ANUNCIOS
  if (audited.announcements.length) {
    const announcementsSection = detailElement(
      "details",
      "audit-topic"
    );

    announcementsSection.append(
      detailElement(
        "summary",
        "",
        `Anuncios · ${audited.announcements.length}`
      )
    );

    const body = detailElement(
      "div",
      "audit-topic-body"
    );

    audited.announcements.forEach(announcement => {
      body.append(renderAnnouncement(announcement));
    });

    announcementsSection.append(body);
    container.append(announcementsSection);
  }

  // INFORMACIÓN GENERAL
  if (audited.information.length) {
    const informationSection = detailElement(
      "details",
      "audit-topic"
    );

    informationSection.append(
      detailElement(
        "summary",
        "",
        `Información adicional · ${audited.information.length}`
      )
    );

    informationSection.append(
      detailInformation(audited.information)
    );

    container.append(informationSection);
  }

  return container;
}
