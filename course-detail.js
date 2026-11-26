/**
 * Renderizado del detalle de auditoría de un curso.
 * Devuelve un nodo DOM y no modifica el documento directamente.
 */

function buildCourseAuditDetail(course) {
  const audit = auditCourseContent(course || {});
  const container = document.createElement("div");
  container.className = "audit-detail";

  const summary = document.createElement("div");
  summary.className = "audit-detail-summary";

  const metrics = [
    ["Topics", audit.summary.totalTopics],
    ["Materiales", audit.summary.totalMaterials],
    ["Actividades", audit.summary.totalActivities],
    ["Anuncios", audit.summary.totalAnnouncements],
    ["Progreso", `${audit.summary.progress}%`]
  ];

  metrics.forEach(([label, value]) => {
    const metric = document.createElement("div");
    metric.className = "audit-detail-metric";
    const strong = document.createElement("strong");
    strong.textContent = String(value);
    const caption = document.createElement("span");
    caption.textContent = label;
    metric.append(strong, caption);
    summary.append(metric);
  });
  container.append(summary);

  function makeSection(title, description, entries) {
    const section = document.createElement("section");
    section.className = "audit-detail-section";

    const heading = document.createElement("h4");
    heading.textContent = `${title} (${entries.length})`;
    section.append(heading);

    if (description) {
      const intro = document.createElement("p");
      intro.className = "audit-detail-description";
      intro.textContent = description;
      section.append(intro);
    }

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "audit-detail-empty";
      empty.textContent = "No se encontraron observaciones.";
      section.append(empty);
      return section;
    }

    const list = document.createElement("ul");
    entries.forEach(entry => {
      const item = document.createElement("li");
      const titleText = entry.title || entry.name || "Elemento sin título";
      const notes = [
        ...auditSafeArray(entry.observations),
        ...auditSafeArray(entry.information)
      ];
      item.textContent = notes.length ? `${titleText}: ${notes.join(" · ")}` : titleText;
      list.append(item);
    });
    section.append(list);
    return section;
  }

  const topicsSection = document.createElement("section");
  topicsSection.className = "audit-detail-section";
  const topicsHeading = document.createElement("h4");
  topicsHeading.textContent = `Organización por Topics (${audit.topics.length})`;
  topicsSection.append(topicsHeading);

  if (!audit.topics.length) {
    const empty = document.createElement("p");
    empty.className = "audit-detail-empty";
    empty.textContent = "Este curso no tiene Topics registrados.";
    topicsSection.append(empty);
  } else {
    audit.topics.forEach(topic => {
      const topicCard = document.createElement("article");
      topicCard.className = "audit-topic-card";
      const title = document.createElement("h5");
      title.textContent = topic.name;
      const state = document.createElement("span");
      state.className = `audit-detail-state ${topic.status}`;
      state.textContent = topic.status === "complete" ? "Correcto" : "Revisar";
      const meta = document.createElement("p");
      meta.textContent = `${topic.materials.length} materiales · ${topic.activities.length} actividades · ${topic.progress}% de elementos completos`;
      topicCard.append(title, state, meta);

      [...topic.materials, ...topic.activities].forEach(entry => {
        const row = document.createElement("div");
        row.className = "audit-topic-entry";
        const name = document.createElement("strong");
        name.textContent = entry.title;
        const status = document.createElement("span");
        status.textContent = entry.status === "complete" ? "Correcto" : "Revisar";
        row.append(name, status);

        const messages = [...entry.observations, ...entry.information];
        if (messages.length) {
          const notes = document.createElement("p");
          notes.textContent = messages.join(" · ");
          row.append(notes);
        }
        topicCard.append(row);
      });
      topicsSection.append(topicCard);
    });
  }
  container.append(topicsSection);

  container.append(
    makeSection("Materiales sin Topic", "Materiales que no están asociados a un Topic existente.", audit.unorganizedMaterials),
    makeSection("Actividades sin Topic", "Actividades que no están asociadas a un Topic existente.", audit.unorganizedActivities),
    makeSection("Anuncios", "Revisión de contenido y estado de publicación.", audit.announcements)
  );

  const observations = audit.findings.courseObservations.map(message => ({
    title: "Información del curso",
    observations: [message]
  }));
  container.append(
    makeSection("Observaciones generales", "Aspectos generales que requieren revisión.", observations)
  );

  return container;
}
