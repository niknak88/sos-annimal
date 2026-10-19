/* global SPECIES, LEVELS, RED_FLAGS, COMMON_RESULTS, SYMPTOMS, FICHES, TOXIQUES, CONTACTS */
(function () {
  "use strict";

  const app = document.getElementById("app");
  const VET_KEY = "sos-animal.vet";

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------
  function esc(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function telHref(phone) {
    return "tel:" + phone.replace(/[^\d+]/g, "");
  }

  function storageGet(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* stockage indisponible : on ignore */
    }
  }

  function list(items, tag) {
    if (!items || !items.length) return "";
    return "<" + tag + ">" + items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</" + tag + ">";
  }

  function findFiche(id) {
    return FICHES.find((f) => f.id === id);
  }

  function vetCallButton() {
    const vet = storageGet(VET_KEY);
    if (vet && vet.phone) {
      return (
        '<a class="btn btn-call" href="' + esc(telHref(vet.phone)) + '">📞 Appeler ' +
        esc(vet.name || "mon vétérinaire") + "</a>"
      );
    }
    return '<a class="btn btn-call" href="#/urgences">📞 Numéros d\'urgence</a>';
  }

  // ---------------------------------------------------------------------------
  // Parcours de diagnostic
  // ---------------------------------------------------------------------------
  const diag = {
    species: null,
    symptom: null,
    node: null, // null = choix de l'espèce / du symptôme ; "__flags" = signes de gravité
    path: [], // [{ q, a }] réponses données
    history: [], // états précédents pour le bouton Retour
  };

  function resetDiag() {
    diag.species = null;
    diag.symptom = null;
    diag.node = null;
    diag.path = [];
    diag.history = [];
  }

  function snapshot() {
    diag.history.push({
      species: diag.species,
      symptom: diag.symptom,
      node: diag.node,
      path: diag.path.slice(),
    });
  }

  function goBack() {
    const prev = diag.history.pop();
    if (!prev) return;
    diag.species = prev.species;
    diag.symptom = prev.symptom;
    diag.node = prev.node;
    diag.path = prev.path;
    renderDiag();
  }

  function currentSymptom() {
    return SYMPTOMS.find((s) => s.id === diag.symptom);
  }

  function resolveNode(symptom, id) {
    return (symptom && symptom.nodes[id]) || COMMON_RESULTS[id];
  }

  function speciesLabel(id) {
    const s = SPECIES.find((x) => x.id === id);
    return s ? s.label : id;
  }

  function backButton() {
    if (!diag.history.length) return "";
    return '<button class="btn btn-ghost" data-action="back">← Retour</button>';
  }

  function stepHeader(title, step) {
    const crumbs = [];
    if (diag.species) crumbs.push(esc(speciesLabel(diag.species)));
    const s = currentSymptom();
    if (s) crumbs.push(esc(s.label));
    return (
      '<div class="step-head">' +
      backButton() +
      (crumbs.length ? '<p class="crumbs">' + crumbs.join(" › ") + "</p>" : "") +
      "</div>" +
      (step ? '<p class="step-label">' + esc(step) + "</p>" : "") +
      "<h1>" + esc(title) + "</h1>"
    );
  }

  function renderSpecies() {
    app.innerHTML =
      stepHeader("Quel est votre animal ?", "Étape 1") +
      '<div class="grid choices">' +
      SPECIES.map(
        (s) =>
          '<button class="choice" data-species="' + s.id + '"><span class="choice-icon">' +
          s.emoji + "</span>" + esc(s.label) + "</button>"
      ).join("") +
      "</div>";
  }

  function renderSymptoms() {
    const items = SYMPTOMS.filter((s) => s.species.includes(diag.species));
    app.innerHTML =
      stepHeader("Que se passe-t-il ?", "Étape 2") +
      '<div class="grid symptoms">' +
      items
        .map(
          (s) =>
            '<button class="choice choice-row" data-symptom="' + s.id + '"><span class="choice-icon">' +
            s.icon + "</span>" + esc(s.label) + "</button>"
        )
        .join("") +
      "</div>" +
      '<p class="muted">Votre situation n\'apparaît pas ? En cas de doute, appelez votre vétérinaire : il vaut mieux appeler pour rien que trop tard.</p>';
  }

  function renderFlags() {
    app.innerHTML =
      stepHeader("Vérifions d'abord les signes de gravité", "Étape 3") +
      '<div class="card card-alert"><p><strong>Votre animal présente-t-il au moins un de ces signes ?</strong></p>' +
      list(RED_FLAGS, "ul") +
      "</div>" +
      '<div class="answers">' +
      '<button class="answer answer-danger" data-flags="yes">Oui, au moins un</button>' +
      '<button class="answer" data-flags="no">Non, aucun</button>' +
      "</div>";
  }

  function renderQuestion(node) {
    // La première réponse du parcours est celle des signes de gravité.
    app.innerHTML =
      stepHeader(node.q, "Question " + diag.path.length) +
      (node.help ? '<p class="help">' + esc(node.help) + "</p>" : "") +
      '<div class="answers">' +
      node.answers
        .map((a, i) => '<button class="answer" data-answer="' + i + '">' + esc(a.label) + "</button>")
        .join("") +
      "</div>";
  }

  function summaryText(result) {
    const s = currentSymptom();
    const lines = [
      "Résumé – " + new Date().toLocaleString("fr-FR"),
      "Animal : " + speciesLabel(diag.species),
      "Motif : " + (s ? s.label : ""),
      "",
    ];
    diag.path.forEach((p) => lines.push("• " + p.q + "\n  → " + p.a));
    lines.push("", "Orientation : " + LEVELS[result.level].label + " – " + result.title);
    return lines.join("\n");
  }

  function renderResult(result) {
    const level = LEVELS[result.level];
    const fiches = (result.fiches || []).map(findFiche).filter(Boolean);
    app.innerHTML =
      '<div class="step-head">' + backButton() + "</div>" +
      '<section class="result result-' + result.level + '">' +
      '<p class="badge">' + esc(level.label) + " · " + esc(level.hint) + "</p>" +
      "<h1>" + esc(result.title) + "</h1>" +
      "<p>" + esc(result.summary) + "</p>" +
      '<div class="result-cta">' + vetCallButton() + "</div>" +
      "</section>" +
      (result.actions && result.actions.length
        ? '<section class="card"><h2>✅ Que faire maintenant</h2>' + list(result.actions, "ol") + "</section>"
        : "") +
      (result.avoid && result.avoid.length
        ? '<section class="card card-avoid"><h2>⛔ À ne pas faire</h2>' + list(result.avoid, "ul") + "</section>"
        : "") +
      (result.watch && result.watch.length
        ? '<section class="card card-watch"><h2>👀 À surveiller</h2>' + list(result.watch, "ul") + "</section>"
        : "") +
      (fiches.length
        ? '<section class="card"><h2>📘 Gestes utiles</h2><div class="chips">' +
          fiches.map((f) => '<a class="chip" href="#/fiches/' + f.id + '">' + f.icon + " " + esc(f.title) + "</a>").join("") +
          "</div></section>"
        : "") +
      '<section class="card"><h2>📋 Résumé pour le vétérinaire</h2>' +
      '<pre class="summary" id="summary">' + esc(summaryText(result)) + "</pre>" +
      '<button class="btn" data-action="copy">Copier le résumé</button></section>' +
      '<p class="disclaimer">Cette orientation ne remplace pas un examen vétérinaire. En cas de doute, ou si l\'état de votre animal change, appelez votre vétérinaire.</p>' +
      '<div class="actions-row"><button class="btn btn-ghost" data-action="restart">Nouveau diagnostic</button></div>';
  }

  function renderDiag() {
    if (!diag.species) return renderSpecies();
    if (!diag.symptom) return renderSymptoms();
    if (diag.node === "__flags") return renderFlags();
    const node = resolveNode(currentSymptom(), diag.node);
    if (!node) {
      resetDiag();
      return renderSpecies();
    }
    if (node.level) return renderResult(node);
    return renderQuestion(node);
  }

  function onDiagClick(target) {
    const el = target.closest("[data-species],[data-symptom],[data-flags],[data-answer],[data-action]");
    if (!el) return false;
    const d = el.dataset;

    if (d.action === "back") {
      goBack();
    } else if (d.action === "restart") {
      resetDiag();
      renderDiag();
    } else if (d.action === "copy") {
      copySummary(el);
      return true;
    } else if (d.species) {
      snapshot();
      diag.species = d.species;
      renderDiag();
    } else if (d.symptom) {
      snapshot();
      diag.symptom = d.symptom;
      diag.node = "__flags";
      renderDiag();
    } else if (d.flags) {
      snapshot();
      diag.path.push({ q: "Signes de gravité immédiate", a: d.flags === "yes" ? "Oui" : "Non" });
      diag.node = d.flags === "yes" ? "vital" : currentSymptom().start;
      renderDiag();
    } else if (d.answer !== undefined) {
      const node = resolveNode(currentSymptom(), diag.node);
      const answer = node.answers[Number(d.answer)];
      snapshot();
      diag.path.push({ q: node.q, a: answer.label });
      diag.node = answer.next;
      renderDiag();
    }
    window.scrollTo(0, 0);
    return true;
  }

  function copySummary(button) {
    const text = document.getElementById("summary").textContent;
    const done = () => {
      button.textContent = "Résumé copié ✓";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (e) {
      /* copie impossible : l'utilisateur peut sélectionner le texte à la main */
    }
    area.remove();
  }

  // ---------------------------------------------------------------------------
  // Autres pages
  // ---------------------------------------------------------------------------
  function renderHome() {
    app.innerHTML =
      '<section class="hero">' +
      "<h1>Votre animal ne va pas bien&nbsp;?</h1>" +
      "<p>Répondez à quelques questions simples pour savoir s'il faut partir en urgence, consulter dans la journée ou surveiller à la maison — et quels gestes faire tout de suite.</p>" +
      '<a class="btn btn-primary btn-big" href="#/diagnostic">Commencer le diagnostic</a>' +
      "</section>" +
      '<section class="card card-alert">' +
      "<h2>🚨 Partez immédiatement si votre animal :</h2>" +
      list(RED_FLAGS, "ul") +
      '<div class="result-cta">' + vetCallButton() + "</div>" +
      "</section>" +
      '<div class="grid tiles">' +
      '<a class="tile" href="#/fiches"><span class="choice-icon">📘</span><strong>Gestes de premiers secours</strong><span>Réanimation, étouffement, saignement, transport…</span></a>' +
      '<a class="tile" href="#/toxiques"><span class="choice-icon">☠️</span><strong>Aliments et plantes toxiques</strong><span>Chocolat, raisin, lys, médicaments…</span></a>' +
      '<a class="tile" href="#/urgences"><span class="choice-icon">📞</span><strong>Numéros d\'urgence</strong><span>Centres antipoison, votre vétérinaire</span></a>' +
      "</div>" +
      '<p class="disclaimer">Cette application donne une orientation et des conseils de premiers secours. Elle ne pose pas de diagnostic médical et ne remplace jamais l\'avis d\'un vétérinaire.</p>';
  }

  function renderFiches() {
    app.innerHTML =
      "<h1>Gestes de premiers secours</h1>" +
      '<p class="muted">Lisez ces fiches à l\'avance : en situation d\'urgence, on a rarement le temps d\'apprendre.</p>' +
      '<div class="grid tiles">' +
      FICHES.map(
        (f) =>
          '<a class="tile" href="' + (f.link || "#/fiches/" + f.id) + '"><span class="choice-icon">' + f.icon +
          "</span><strong>" + esc(f.title) + "</strong><span>" + esc(f.intro) + "</span></a>"
      ).join("") +
      "</div>";
  }

  function renderFiche(id) {
    const f = findFiche(id);
    if (!f) return renderFiches();
    const table = f.table
      ? '<div class="table-wrap"><table>' +
        f.table
          .map(
            (row, i) =>
              "<tr>" + row.map((c) => (i === 0 ? "<th>" : "<td>") + esc(c) + (i === 0 ? "</th>" : "</td>")).join("") + "</tr>"
          )
          .join("") +
        "</table></div>"
      : "";
    app.innerHTML =
      '<div class="step-head"><a class="btn btn-ghost" href="#/fiches">← Toutes les fiches</a></div>' +
      "<h1>" + f.icon + " " + esc(f.title) + "</h1>" +
      '<p class="lead">' + esc(f.intro) + "</p>" +
      table +
      (f.steps.length ? '<section class="card">' + list(f.steps, "ol") + "</section>" : "") +
      (f.warning ? '<section class="card card-avoid"><p>⚠️ ' + esc(f.warning) + "</p></section>" : "") +
      '<div class="result-cta">' + vetCallButton() + "</div>";
  }

  function renderToxiques() {
    app.innerHTML =
      "<h1>Aliments, plantes et produits toxiques</h1>" +
      '<p class="muted">Liste non exhaustive. En cas d\'ingestion, appelez votre vétérinaire ou un centre antipoison vétérinaire, même sans signe.</p>' +
      '<input class="search" id="tox-search" type="search" placeholder="Rechercher : chocolat, lys, paracétamol…" aria-label="Rechercher un toxique">' +
      '<div id="tox-list"></div>' +
      '<a class="btn btn-primary" href="#/diagnostic">Mon animal en a avalé : que faire ?</a>';
    const input = document.getElementById("tox-search");
    input.addEventListener("input", () => renderToxList(input.value));
    renderToxList("");
  }

  function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function renderToxList(query) {
    const q = normalize(query.trim());
    const html = TOXIQUES.map((cat) => {
      const items = cat.items.filter((i) => !q || normalize(i.name + " " + i.who + " " + i.effect).includes(q));
      if (!items.length) return "";
      return (
        "<h2>" + esc(cat.category) + "</h2>" +
        '<div class="tox-grid">' +
        items
          .map(
            (i) =>
              '<article class="tox"><div class="tox-head"><strong>' + esc(i.name) + '</strong><span class="sev sev-' +
              normalize(i.severity) + '">Danger ' + esc(i.severity) + "</span></div>" +
              '<p class="tox-who">' + esc(i.who) + "</p><p>" + esc(i.effect) + "</p></article>"
          )
          .join("") +
        "</div>"
      );
    }).join("");
    document.getElementById("tox-list").innerHTML = html || '<p class="muted">Aucun résultat. En cas de doute, appelez un centre antipoison vétérinaire.</p>';
  }

  function renderUrgences() {
    const vet = storageGet(VET_KEY) || {};
    app.innerHTML =
      "<h1>Numéros d'urgence</h1>" +
      '<section class="card"><h2>🩺 Mon vétérinaire</h2>' +
      '<p class="muted">Enregistrez son numéro : il apparaîtra sur chaque résultat pour appeler en un geste. Il reste uniquement sur cet appareil.</p>' +
      '<form id="vet-form" class="vet-form">' +
      '<label>Nom<input name="name" value="' + esc(vet.name || "") + '" placeholder="Clinique des Lilas"></label>' +
      '<label>Téléphone<input name="phone" type="tel" value="' + esc(vet.phone || "") + '" placeholder="01 23 45 67 89" required></label>' +
      '<button class="btn btn-primary" type="submit">Enregistrer</button>' +
      '<span class="saved" id="vet-saved"></span>' +
      "</form>" +
      (vet.phone ? '<div class="result-cta">' + vetCallButton() + "</div>" : "") +
      "</section>" +
      CONTACTS.map(
        (c) =>
          '<section class="card contact"><h2>' + esc(c.name) + "</h2><p>" + esc(c.note) + "</p>" +
          (c.phone ? '<a class="btn btn-call" href="' + telHref(c.phone) + '">📞 ' + esc(c.phone) + "</a>" : "") +
          "</section>"
      ).join("") +
      '<p class="disclaimer">Numéros valables en France. Vérifiez-les et enregistrez dès aujourd\'hui ceux de votre vétérinaire et de la clinique d\'urgence la plus proche.</p>';

    document.getElementById("vet-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      storageSet(VET_KEY, { name: data.get("name").trim(), phone: data.get("phone").trim() });
      renderUrgences();
      document.getElementById("vet-saved").textContent = "Enregistré ✓";
    });
  }

  // ---------------------------------------------------------------------------
  // Routage
  // ---------------------------------------------------------------------------
  function route() {
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
    const page = parts[0] || "";
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === page);
    });
    if (page === "diagnostic") {
      renderDiag();
    } else if (page === "fiches") {
      parts[1] ? renderFiche(parts[1]) : renderFiches();
    } else if (page === "toxiques") {
      renderToxiques();
    } else if (page === "urgences") {
      renderUrgences();
    } else {
      renderHome();
    }
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  app.addEventListener("click", (e) => {
    if (location.hash.startsWith("#/diagnostic")) onDiagClick(e.target);
  });

  document.addEventListener("click", (e) => {
    // Tout lien vers le diagnostic repart du début.
    if (!e.target.closest('a[href="#/diagnostic"]')) return;
    resetDiag();
    if (location.hash === "#/diagnostic") renderDiag();
  });

  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
