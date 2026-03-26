(function () {
  const STORAGE_KEY = "resume-tailor-profile-v1";
  const HISTORY_KEY = "resume-tailor-history-v1";
  const SAMPLE_JOB_URL = "https://www.linkedin.com/jobs/view/4384052376/";
  const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "build", "by", "for", "from", "in", "into",
    "is", "it", "of", "on", "or", "our", "that", "the", "their", "this", "to", "with", "you",
    "your", "will", "we", "who", "they", "have", "has", "had", "using", "use", "used", "across",
    "within", "through", "about", "over", "per", "plus", "all", "can", "not", "more", "than",
    "role", "team", "teams", "work", "working", "job", "candidate", "ideal", "required", "preferred"
  ]);

  const els = {
    jobUrl: document.querySelector("#jobUrl"),
    jobDescription: document.querySelector("#jobDescription"),
    scrapeButton: document.querySelector("#scrapeButton"),
    sampleButton: document.querySelector("#sampleButton"),
    scrapeStatus: document.querySelector("#scrapeStatus"),
    candidateName: document.querySelector("#candidateName"),
    candidateHeadline: document.querySelector("#candidateHeadline"),
    candidateContact: document.querySelector("#candidateContact"),
    skillsInput: document.querySelector("#skillsInput"),
    experienceEditor: document.querySelector("#experienceEditor"),
    addRoleButton: document.querySelector("#addRoleButton"),
    bulletLimit: document.querySelector("#bulletLimit"),
    generateButton: document.querySelector("#generateButton"),
    saveProfileButton: document.querySelector("#saveProfileButton"),
    downloadPdfButton: document.querySelector("#downloadPdfButton"),
    resetHistoryButton: document.querySelector("#resetHistoryButton"),
    historyList: document.querySelector("#historyList"),
    resumePreview: document.querySelector("#resumePreview"),
    matchSummary: document.querySelector("#matchSummary"),
    roleTemplate: document.querySelector("#roleTemplate"),
    bulletTemplate: document.querySelector("#bulletTemplate")
  };

  let state = {
    profile: deepClone(window.DEFAULT_RESUME_DATA.profile),
    roles: deepClone(window.DEFAULT_RESUME_DATA.roles),
    history: []
  };

  init();

  function init() {
    loadState();
    bindEvents();
    syncProfileFields();
    renderRoles();
    renderHistory();
  }

  function bindEvents() {
    els.addRoleButton.addEventListener("click", () => {
      state.roles.push({
        company: "",
        title: "",
        dates: "",
        location: "",
        bullets: [""]
      });
      renderRoles();
    });

    els.saveProfileButton.addEventListener("click", () => {
      syncStateFromForm();
      persistProfile();
      setStatus("Profile saved locally in this browser.");
    });

    els.generateButton.addEventListener("click", () => {
      syncStateFromForm();
      const generated = generateResume();
      renderResume(generated.resumeHtml);
      els.matchSummary.textContent = generated.summary;
      saveRevision(generated);
      renderHistory();
      persistProfile();
    });

    els.downloadPdfButton.addEventListener("click", () => {
      window.print();
    });

    els.sampleButton.addEventListener("click", () => {
      els.jobUrl.value = SAMPLE_JOB_URL;
      els.jobDescription.value = [
        "Senior Product Analytics Manager",
        "We are looking for a product analytics leader with strong experience in dashboard design, KPI definition, SQL, BI tools, data quality, experimentation, and cross-functional stakeholder management.",
        "The role requires building scalable analytics frameworks, partnering with product and engineering teams, improving self-service reporting, and driving data-informed decisions.",
        "Experience with AI products, Databricks, Power BI, and marketplace analytics is a plus."
      ].join("\n\n");
      setStatus("Loaded a sample job description for quick testing.");
    });

    els.scrapeButton.addEventListener("click", tryScrapeJobDescription);

    els.resetHistoryButton.addEventListener("click", () => {
      localStorage.removeItem(HISTORY_KEY);
      state.history = [];
      renderHistory();
      setStatus("Saved revisions cleared.");
    });
  }

  function loadState() {
    const profileRaw = localStorage.getItem(STORAGE_KEY);
    const historyRaw = localStorage.getItem(HISTORY_KEY);

    if (profileRaw) {
      try {
        const parsed = JSON.parse(profileRaw);
        state.profile = parsed.profile || state.profile;
        state.roles = parsed.roles || state.roles;
      } catch (error) {
        console.warn("Could not parse saved profile.", error);
      }
    }

    if (historyRaw) {
      try {
        state.history = JSON.parse(historyRaw);
      } catch (error) {
        console.warn("Could not parse history.", error);
      }
    }
  }

  function persistProfile() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      profile: state.profile,
      roles: state.roles
    }));
  }

  function persistHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, 12)));
  }

  function syncProfileFields() {
    els.candidateName.value = state.profile.name || "";
    els.candidateHeadline.value = state.profile.headline || "";
    els.candidateContact.value = state.profile.contact || "";
    els.skillsInput.value = (state.profile.skills || []).join(", ");
  }

  function syncStateFromForm() {
    state.profile.name = els.candidateName.value.trim();
    state.profile.headline = els.candidateHeadline.value.trim();
    state.profile.contact = els.candidateContact.value.trim();
    state.profile.skills = els.skillsInput.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function renderRoles() {
    els.experienceEditor.innerHTML = "";

    state.roles.forEach((role, roleIndex) => {
      const fragment = els.roleTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".experience-card");
      const companyInput = fragment.querySelector('[data-role-field="company"]');
      const titleInput = fragment.querySelector('[data-role-field="title"]');
      const datesInput = fragment.querySelector('[data-role-field="dates"]');
      const locationInput = fragment.querySelector('[data-role-field="location"]');
      const bulletsContainer = fragment.querySelector("[data-role-bullets]");
      const removeRoleButton = fragment.querySelector(".remove-role-button");
      const addBulletButton = fragment.querySelector(".add-bullet-button");

      companyInput.value = role.company || "";
      titleInput.value = role.title || "";
      datesInput.value = role.dates || "";
      locationInput.value = role.location || "";

      companyInput.addEventListener("input", (event) => {
        state.roles[roleIndex].company = event.target.value;
      });
      titleInput.addEventListener("input", (event) => {
        state.roles[roleIndex].title = event.target.value;
      });
      datesInput.addEventListener("input", (event) => {
        state.roles[roleIndex].dates = event.target.value;
      });
      locationInput.addEventListener("input", (event) => {
        state.roles[roleIndex].location = event.target.value;
      });

      removeRoleButton.addEventListener("click", () => {
        state.roles.splice(roleIndex, 1);
        renderRoles();
      });

      addBulletButton.addEventListener("click", () => {
        state.roles[roleIndex].bullets.push("");
        renderRoles();
      });

      (role.bullets || []).forEach((bullet, bulletIndex) => {
        const bulletFragment = els.bulletTemplate.content.cloneNode(true);
        const bulletInput = bulletFragment.querySelector("[data-bullet-input]");
        const removeBulletButton = bulletFragment.querySelector(".remove-bullet-button");

        bulletInput.value = bullet;
        bulletInput.addEventListener("input", (event) => {
          state.roles[roleIndex].bullets[bulletIndex] = event.target.value;
        });

        removeBulletButton.addEventListener("click", () => {
          state.roles[roleIndex].bullets.splice(bulletIndex, 1);
          if (!state.roles[roleIndex].bullets.length) {
            state.roles[roleIndex].bullets.push("");
          }
          renderRoles();
        });

        bulletsContainer.appendChild(bulletFragment);
      });

      els.experienceEditor.appendChild(card);
    });
  }

  async function tryScrapeJobDescription() {
    const jobUrl = els.jobUrl.value.trim();
    if (!jobUrl) {
      setStatus("Enter a job URL first.");
      return;
    }

    setStatus("Trying best-effort extraction. If LinkedIn blocks it, paste the JD manually.");

    const attempts = [
      `https://r.jina.ai/http://${normalizeUrl(jobUrl).replace(/^https?:\/\//, "")}`,
      `https://r.jina.ai/http://r.jina.ai/http://${normalizeUrl(jobUrl).replace(/^https?:\/\//, "")}`
    ];

    for (const target of attempts) {
      try {
        const response = await fetch(target);
        if (!response.ok) {
          continue;
        }

        const text = await response.text();
        const cleaned = cleanScrapedText(text);
        if (cleaned.length > 500) {
          els.jobDescription.value = cleaned;
          setStatus("Job description extracted. Review the text before generating the resume.");
          return;
        }
      } catch (error) {
        console.warn("Scrape attempt failed", error);
      }
    }

    setStatus("Could not scrape this job page automatically. Paste the description manually below.");
  }

  function generateResume() {
    const description = els.jobDescription.value.trim();
    const bulletLimit = clampNumber(Number(els.bulletLimit.value) || 2, 1, 5);
    const keywords = extractKeywords(description);
    const selectedRoles = selectBestBullets(state.roles, keywords, bulletLimit);
    const summary = buildSummary(selectedRoles, keywords);
    const resumeHtml = buildResumeHtml(selectedRoles, keywords);

    return {
      createdAt: new Date().toISOString(),
      jobUrl: els.jobUrl.value.trim(),
      description,
      keywords,
      selectedRoles,
      summary,
      resumeHtml
    };
  }

  function buildSummary(selectedRoles, keywords) {
    const bulletCount = selectedRoles.reduce((sum, role) => sum + role.selectedBullets.length, 0);
    const topKeywords = keywords.slice(0, 8).map((item) => item.term).join(", ");
    return `Selected ${bulletCount} bullets across ${selectedRoles.length} roles using keyword matching. Top matches: ${topKeywords || "manual review recommended"}.`;
  }

  function selectBestBullets(roles, keywords, bulletLimit) {
    return roles
      .map((role, index) => {
        const scoredBullets = (role.bullets || [])
          .map((bullet) => ({
            bullet,
            score: scoreBullet(bullet, keywords)
          }))
          .filter((item) => item.bullet && item.bullet.trim())
          .sort((left, right) => right.score - left.score);

        const selectedBullets = scoredBullets
          .slice(0, index < 3 ? bulletLimit : 1)
          .filter((item) => item.score > 0 || index < 2)
          .map((item) => item.bullet.trim());

        return {
          company: role.company,
          title: role.title,
          dates: role.dates,
          location: role.location,
          selectedBullets: selectedBullets.length ? selectedBullets : scoredBullets.slice(0, 1).map((item) => item.bullet.trim())
        };
      })
      .filter((role, index) => role.selectedBullets.length && index < 5);
  }

  function scoreBullet(bullet, keywords) {
    const bulletTerms = tokenize(bullet);
    const termSet = new Set(bulletTerms);
    let score = 0;

    keywords.forEach(({ term, weight }) => {
      if (termSet.has(term)) {
        score += weight;
      }
    });

    if (/\b(led|designed|implemented|developed|orchestrated|managed|optimized|migrated)\b/i.test(bullet)) {
      score += 1.5;
    }

    if (/\b\d+[%Kk+]|million|annual|accuracy|adoption|savings?|reduced|improved|increase\b/i.test(bullet)) {
      score += 1.25;
    }

    return Number(score.toFixed(2));
  }

  function extractKeywords(description) {
    const tokens = tokenize(description);
    const counts = new Map();

    tokens.forEach((token) => {
      if (STOP_WORDS.has(token) || token.length < 3) {
        return;
      }
      counts.set(token, (counts.get(token) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([term, count]) => ({
        term,
        weight: count + keywordBoost(term)
      }))
      .sort((left, right) => right.weight - left.weight)
      .slice(0, 24);
  }

  function keywordBoost(term) {
    const boosts = {
      analytics: 3,
      product: 2.5,
      dashboard: 2.5,
      sql: 2.5,
      data: 2.25,
      quality: 2.25,
      ai: 2,
      databricks: 2,
      power: 1.8,
      bi: 1.8,
      kpi: 1.8,
      experimentation: 1.8,
      reporting: 1.5,
      stakeholder: 1.5,
      self: 1.3,
      service: 1.3,
      marketplace: 1.3
    };

    return boosts[term] || 0;
  }

  function buildResumeHtml(selectedRoles, keywords) {
    const topSkills = state.profile.skills.slice(0, 12).join(", ");
    const summaryText = createSummarySentence(keywords);
    const roleMarkup = selectedRoles.map((role) => `
      <div class="resume-role">
        <div class="resume-role__heading">
          <span>${escapeHtml(role.company)} | ${escapeHtml(role.title)}</span>
          <span>${escapeHtml(role.dates)}</span>
        </div>
        <div class="resume-role__meta">${escapeHtml(role.location || "")}</div>
        <ul>
          ${role.selectedBullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
        </ul>
      </div>
    `).join("");

    return `
      <article class="resume-doc">
        <header>
          <h1>${escapeHtml(state.profile.name || "Candidate Name")}</h1>
          <p class="headline">${escapeHtml(state.profile.headline || "")}</p>
          <p class="contact">${escapeHtml(state.profile.contact || "")}</p>
        </header>

        <section class="resume-section">
          <span class="resume-section__title">Summary</span>
          <p class="resume-summary">${escapeHtml(summaryText)}</p>
        </section>

        <section class="resume-section">
          <span class="resume-section__title">Experience</span>
          ${roleMarkup}
        </section>

        <section class="resume-section">
          <span class="resume-section__title">Skills</span>
          <p class="resume-inline-list">${escapeHtml(topSkills)}</p>
        </section>

        <section class="resume-section">
          <span class="resume-section__title">Education</span>
          <p class="resume-inline-list">${escapeHtml((state.profile.education || []).join(" | "))}</p>
        </section>
      </article>
    `;
  }

  function createSummarySentence(keywords) {
    const focusTerms = keywords
      .slice(0, 6)
      .map((item) => item.term)
      .filter((term) => !["self", "service", "power", "bi"].includes(term));

    if (!focusTerms.length) {
      return "Product analytics leader with experience in AI, BI, data quality, and dashboard strategy across high-growth technology environments.";
    }

    return `Product analytics leader with experience aligned to ${focusTerms.join(", ")}, combining AI, BI, data quality, and stakeholder management to deliver measurable business impact.`;
  }

  function saveRevision(generated) {
    state.history.unshift({
      createdAt: generated.createdAt,
      jobUrl: generated.jobUrl,
      summary: generated.summary,
      descriptionPreview: generated.description.slice(0, 180),
      selectedRoles: generated.selectedRoles.map((role) => ({
        company: role.company,
        title: role.title,
        bullets: role.selectedBullets
      })),
      resumeHtml: generated.resumeHtml
    });

    state.history = state.history.slice(0, 12);
    persistHistory();
  }

  function renderHistory() {
    if (!state.history.length) {
      els.historyList.innerHTML = '<p class="helper">No revisions yet. Generate a resume to save one.</p>';
      return;
    }

    els.historyList.innerHTML = "";

    state.history.forEach((entry, index) => {
      const wrapper = document.createElement("article");
      wrapper.className = "history-item";
      wrapper.innerHTML = `
        <h3>Revision ${state.history.length - index}</h3>
        <p>${escapeHtml(formatDate(entry.createdAt))}</p>
        <p>${escapeHtml(entry.summary)}</p>
        <div class="button-row">
          <button type="button" data-history-load="${index}" class="secondary">Load Preview</button>
        </div>
      `;
      els.historyList.appendChild(wrapper);
    });

    els.historyList.querySelectorAll("[data-history-load]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const index = Number(event.currentTarget.getAttribute("data-history-load"));
        const revision = state.history[index];
        renderResume(revision.resumeHtml);
        els.matchSummary.textContent = revision.summary;
      });
    });
  }

  function renderResume(html) {
    els.resumePreview.innerHTML = html;

    const keywordContainer = document.createElement("div");
    keywordContainer.className = "keyword-chip-list";
    extractKeywords(els.jobDescription.value.trim()).slice(0, 10).forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "keyword-chip";
      chip.textContent = item.term;
      keywordContainer.appendChild(chip);
    });
    els.resumePreview.appendChild(keywordContainer);
  }

  function setStatus(message) {
    els.scrapeStatus.textContent = message;
  }

  function tokenize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9+#/ ]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  function cleanScrapedText(text) {
    return (text || "")
      .replace(/#+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/Apply on company site[\s\S]*/i, "")
      .replace(/LinkedIn and 3rd parties use essential and non-essential cookies[\s\S]*/i, "")
      .trim();
  }

  function normalizeUrl(value) {
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function formatDate(isoDate) {
    try {
      return new Date(isoDate).toLocaleString();
    } catch (error) {
      return isoDate;
    }
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
