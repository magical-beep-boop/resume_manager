"use client";

import { useEffect, useState, useTransition } from "react";
import { DEFAULT_RESUME_DATA } from "@/lib/default-resume";
import { buildGeneratedResume, deepClone } from "@/lib/resume-utils";

const PROFILE_STORAGE_KEY = "resume-tailor-profile-v3";
const HISTORY_STORAGE_KEY = "resume-tailor-history-v3";
const SAMPLE_JOB_URL = "https://www.linkedin.com/jobs/view/4384052376/";
const SAMPLE_DESCRIPTION = [
  "Senior Product Analytics Manager",
  "We are looking for a product analytics leader with strong experience in dashboard design, KPI definition, SQL, BI tools, data quality, experimentation, and cross-functional stakeholder management.",
  "The role requires building scalable analytics frameworks, partnering with product and engineering teams, improving self-service reporting, and driving data-informed decisions.",
  "Experience with AI products, Databricks, Power BI, and marketplace analytics is a plus."
].join("\n\n");

const DEFAULT_SECTIONS = [
  { id: "name", label: "Name", enabled: true },
  { id: "headline", label: "Headline", enabled: true },
  { id: "contact", label: "Contact", enabled: true },
  { id: "summary", label: "Summary", enabled: true },
  { id: "experience", label: "Experience", enabled: true },
  { id: "skills", label: "Skills", enabled: true },
  { id: "education", label: "Education", enabled: true }
];

const DEFAULT_FORMATTING = {
  fontFamily: "Arial, sans-serif",
  baseFontSize: 10.5,
  lineHeight: 1.28,
  paragraphSpacing: 0.08,
  sectionSpacing: 0.32,
  pagePadding: 0.45,
  accentColor: "#222222",
  pageColor: "#ffffff"
};

function IconButton({ label, symbol, className = "ghost", onClick, type = "button" }) {
  return (
    <button type={type} className={`icon-button ${className}`} onClick={onClick} aria-label={label} title={label}>
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

function getInitialState() {
  return {
    profile: deepClone(DEFAULT_RESUME_DATA.profile),
    roles: deepClone(DEFAULT_RESUME_DATA.roles),
    jobUrl: "",
    jobDescription: "",
    sections: deepClone(DEFAULT_SECTIONS),
    formatting: { ...DEFAULT_FORMATTING },
    panelWidth: 430
  };
}

function moveArrayItem(items, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function CollapsibleCard({ title, defaultOpen = true, children }) {
  return (
    <details className="card collapsible-card" open={defaultOpen}>
      <summary>
        <h2>{title}</h2>
      </summary>
      <div className="collapsible-body">{children}</div>
    </details>
  );
}

export default function HomePage() {
  const [state, setState] = useState(getInitialState);
  const [history, setHistory] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [status, setStatus] = useState("Paste a job description or try scraping a LinkedIn job URL.");
  const [isGenerating, startGenerating] = useTransition();
  const [isScraping, startScraping] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [dragState, setDragState] = useState(null);
  const [isResizingPanels, setIsResizingPanels] = useState(false);

  useEffect(() => {
    try {
      const profileRaw = localStorage.getItem(PROFILE_STORAGE_KEY);
      const historyRaw = localStorage.getItem(HISTORY_STORAGE_KEY);

      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        setState((current) => ({
          ...current,
          ...parsed,
          sections: parsed.sections?.length ? parsed.sections : current.sections,
          formatting: parsed.formatting ? { ...DEFAULT_FORMATTING, ...parsed.formatting } : current.formatting,
          panelWidth: parsed.panelWidth || current.panelWidth
        }));
      }

      if (historyRaw) {
        setHistory(JSON.parse(historyRaw));
      }
    } catch (error) {
      console.warn("Could not restore saved data.", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 12)));
  }, [history]);

  useEffect(() => {
    if (!isResizingPanels) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      setState((current) => ({
        ...current,
        panelWidth: Math.max(340, Math.min(780, event.clientX - 24))
      }));
    };

    const handleMouseUp = () => {
      setIsResizingPanels(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingPanels]);

  const handleProfileChange = (field, value) => {
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value
      }
    }));
  };

  const handleFormattingChange = (field, value) => {
    setState((current) => ({
      ...current,
      formatting: {
        ...current.formatting,
        [field]: value
      }
    }));
  };

  const moveSection = (fromIndex, toIndex) => {
    setState((current) => ({
      ...current,
      sections: moveArrayItem(current.sections, fromIndex, toIndex)
    }));
  };

  const toggleSection = (sectionId) => {
    setState((current) => ({
      ...current,
      sections: current.sections.map((section) => (
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section
      ))
    }));
  };

  const handleRoleFieldChange = (roleIndex, field, value) => {
    setState((current) => ({
      ...current,
      roles: current.roles.map((role, index) => (
        index === roleIndex ? { ...role, [field]: value } : role
      ))
    }));
  };

  const handleBulletChange = (roleIndex, bulletIndex, value) => {
    setState((current) => ({
      ...current,
      roles: current.roles.map((role, index) => {
        if (index !== roleIndex) {
          return role;
        }

        return {
          ...role,
          bullets: role.bullets.map((bullet, idx) => (idx === bulletIndex ? value : bullet))
        };
      })
    }));
  };

  const addRole = () => {
    setState((current) => ({
      ...current,
      roles: [
        ...current.roles,
        {
          company: "",
          title: "",
          dates: "",
          location: "",
          bullets: [""]
        }
      ]
    }));
  };

  const moveRole = (fromIndex, toIndex) => {
    setState((current) => ({
      ...current,
      roles: moveArrayItem(current.roles, fromIndex, toIndex)
    }));
  };

  const removeRole = (roleIndex) => {
    setState((current) => ({
      ...current,
      roles: current.roles.filter((_, index) => index !== roleIndex)
    }));
  };

  const addBullet = (roleIndex) => {
    setState((current) => ({
      ...current,
      roles: current.roles.map((role, index) => (
        index === roleIndex ? { ...role, bullets: [...role.bullets, ""] } : role
      ))
    }));
  };

  const moveBullet = (roleIndex, fromIndex, toIndex) => {
    setState((current) => ({
      ...current,
      roles: current.roles.map((role, index) => {
        if (index !== roleIndex) {
          return role;
        }

        return {
          ...role,
          bullets: moveArrayItem(role.bullets, fromIndex, toIndex)
        };
      })
    }));
  };

  const removeBullet = (roleIndex, bulletIndex) => {
    setState((current) => ({
      ...current,
      roles: current.roles.map((role, index) => {
        if (index !== roleIndex) {
          return role;
        }

        const nextBullets = role.bullets.filter((_, idx) => idx !== bulletIndex);
        return {
          ...role,
          bullets: nextBullets.length ? nextBullets : [""]
        };
      })
    }));
  };

  const generateResume = () => {
    startGenerating(() => {
      const nextGenerated = buildGeneratedResume({
        profile: state.profile,
        roles: state.roles,
        description: state.jobDescription,
        bulletLimit: 2
      });

      const revision = {
        ...nextGenerated,
        jobUrl: state.jobUrl,
        descriptionPreview: state.jobDescription.slice(0, 220),
        sectionsSnapshot: deepClone(state.sections),
        formattingSnapshot: { ...state.formatting }
      };

      setGenerated(revision);
      setHistory((current) => [revision, ...current].slice(0, 12));
      setStatus(nextGenerated.summary);
    });
  };

  const tryScrape = () => {
    if (!state.jobUrl.trim()) {
      setStatus("Enter a job URL first.");
      return;
    }

    startScraping(async () => {
      setStatus("Trying to extract the job description from the provided URL.");

      try {
        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: state.jobUrl })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Could not scrape the job description.");
        }

        setState((current) => ({
          ...current,
          jobDescription: payload.text
        }));
        setStatus("Job description extracted. Review it and generate the resume.");
      } catch (error) {
        setStatus(error.message || "Could not scrape the job description. Paste it manually instead.");
      }
    });
  };

  const loadSample = () => {
    setState((current) => ({
      ...current,
      jobUrl: SAMPLE_JOB_URL,
      jobDescription: SAMPLE_DESCRIPTION
    }));
    setStatus("Loaded a sample product analytics job description.");
  };

  const importResume = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const isAllowed = /\.(pdf|doc|docx)$/i.test(file.name);
    if (!isAllowed) {
      setStatus("Only PDF and Word resume files are supported.");
      return;
    }

    startImporting(async () => {
      setStatus(`Importing ${file.name} and extracting resume sections.`);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/import-resume", {
          method: "POST",
          body: formData
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Resume import failed.");
        }

        setState((current) => ({
          ...current,
          profile: {
            ...current.profile,
            ...payload.profile,
            skills: payload.profile?.skills?.length ? payload.profile.skills : current.profile.skills,
            education: payload.profile?.education?.length ? payload.profile.education : current.profile.education
          },
          roles: payload.roles?.length ? payload.roles : current.roles
        }));
        setGenerated(null);
        setStatus("Resume imported. Review the auto-filled sections and adjust anything that needs cleanup.");
      } catch (error) {
        setStatus(error.message || "Resume import failed. Try a PDF or .docx version of the file.");
      }
    });
  };

  const resetHistory = () => {
    setHistory([]);
    setStatus("Saved revisions cleared.");
  };

  const loadRevision = (revision) => {
    setGenerated(revision);
    setStatus(revision.summary);
  };

  const exportPdf = () => {
    window.print();
  };

  const beginRoleDrag = (roleIndex) => {
    setDragState({ type: "role", roleIndex });
  };

  const beginBulletDrag = (roleIndex, bulletIndex) => {
    setDragState({ type: "bullet", roleIndex, bulletIndex });
  };

  const handleRoleDrop = (targetRoleIndex) => {
    if (dragState?.type !== "role") {
      return;
    }
    moveRole(dragState.roleIndex, targetRoleIndex);
    setDragState(null);
  };

  const handleBulletDrop = (targetRoleIndex, targetBulletIndex) => {
    if (dragState?.type !== "bullet" || dragState.roleIndex !== targetRoleIndex) {
      return;
    }
    moveBullet(targetRoleIndex, dragState.bulletIndex, targetBulletIndex);
    setDragState(null);
  };

  const previewSections = generated?.sectionsSnapshot || state.sections;
  const previewFormatting = generated?.formattingSnapshot || state.formatting;
  const previewDocumentStyle = {
    "--resume-font-family": previewFormatting.fontFamily,
    "--resume-font-size": `${previewFormatting.baseFontSize}pt`,
    "--resume-line-height": previewFormatting.lineHeight,
    "--resume-paragraph-spacing": `${previewFormatting.paragraphSpacing}rem`,
    "--resume-section-spacing": `${previewFormatting.sectionSpacing}rem`,
    "--resume-page-padding": `${previewFormatting.pagePadding}in`,
    "--resume-accent-color": previewFormatting.accentColor,
    "--resume-page-color": previewFormatting.pageColor
  };

  return (
    <div
      className={`workspace-shell ${isResizingPanels ? "is-resizing" : ""}`}
      style={{ gridTemplateColumns: `${state.panelWidth}px 12px minmax(0, 1fr)` }}
    >
      <aside className="panel controls">
        <div className="panel-header">
          <p className="eyebrow">Resume Tailor</p>
          <h1>Build a one-page ATS resume from a job URL.</h1>
          <p className="subtle">
            Rearrange sections, tune typography, collapse long editor blocks, and resize the builder against the preview.
          </p>
        </div>

        <CollapsibleCard title="1. Job Input">
          <label className="field">
            <span>Import Existing Resume</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={importResume}
              disabled={isImporting}
            />
            <small>Upload a PDF or Word resume to auto-fill the editor. Best results are with PDF or .docx files.</small>
          </label>

          <label className="field">
            <span>Job URL</span>
            <input
              type="url"
              value={state.jobUrl}
              onChange={(event) => setState((current) => ({ ...current, jobUrl: event.target.value }))}
              placeholder="https://www.linkedin.com/jobs/view/..."
            />
          </label>
          <div className="button-row">
            <button type="button" onClick={tryScrape} disabled={isScraping}>
              {isScraping ? "Scraping..." : "Try Scrape"}
            </button>
            <button type="button" className="secondary" onClick={loadSample}>Load Sample</button>
          </div>
          <p className="helper">{status}</p>
          <label className="field">
            <span>Job Description</span>
            <textarea
              rows={12}
              value={state.jobDescription}
              onChange={(event) => setState((current) => ({ ...current, jobDescription: event.target.value }))}
              placeholder="Paste the full job description here if scraping does not work."
            />
          </label>
        </CollapsibleCard>

        <CollapsibleCard title="2. Resume Sections">
          <p className="helper">Hide or reorder the parts of the resume, including the header pieces.</p>
          <div className="section-manager">
            {state.sections.map((section, index) => (
              <div className="section-row" key={section.id}>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => toggleSection(section.id)}
                  />
                  <span>{section.label}</span>
                </label>
                <div className="control-group">
                  <IconButton label="Move section up" symbol="↑" onClick={() => moveSection(index, index - 1)} />
                  <IconButton label="Move section down" symbol="↓" onClick={() => moveSection(index, index + 1)} />
                </div>
              </div>
            ))}
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="3. Formatting & Layout">
          <div className="option-grid">
            <label className="field">
              <span>Font</span>
              <select
                value={state.formatting.fontFamily}
                onChange={(event) => handleFormattingChange("fontFamily", event.target.value)}
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="Calibri, sans-serif">Calibri</option>
                <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</option>
                <option value="Cambria, Georgia, serif">Cambria</option>
                <option value="Georgia, serif">Georgia</option>
              </select>
            </label>

            <label className="field">
              <span>Accent</span>
              <select
                value={state.formatting.accentColor}
                onChange={(event) => handleFormattingChange("accentColor", event.target.value)}
              >
                <option value="#222222">Classic Black</option>
                <option value="#8a4b20">Warm Brown</option>
                <option value="#2f4858">Slate Blue</option>
                <option value="#365c4c">Muted Green</option>
              </select>
            </label>

            <label className="field">
              <span>Resume Page Color</span>
              <select
                value={state.formatting.pageColor}
                onChange={(event) => handleFormattingChange("pageColor", event.target.value)}
              >
                <option value="#ffffff">Pure White</option>
                <option value="#fffdf8">Warm Ivory</option>
                <option value="#f9fbff">Soft Blue</option>
                <option value="#f6fff9">Mint Wash</option>
                <option value="#fff8f3">Peach Tint</option>
                <option value="#f8f8f8">Light Gray</option>
                <option value="#f7f3ff">Lavender Mist</option>
                <option value="#fffbe6">Cream Paper</option>
                <option value="#f3fbf7">Cool Sage</option>
                <option value="#fef6f6">Rose Tint</option>
                <option value="#eef6ff">Ice Blue</option>
                <option value="#f4fff1">Pale Lime</option>
              </select>
            </label>

            <label className="field">
              <span>Custom Page Color</span>
              <input
                type="color"
                value={state.formatting.pageColor}
                onChange={(event) => handleFormattingChange("pageColor", event.target.value)}
              />
              <small>{state.formatting.pageColor}</small>
            </label>

            <label className="field">
              <span>Base Font Size</span>
              <input
                type="range"
                min="9.5"
                max="12"
                step="0.1"
                value={state.formatting.baseFontSize}
                onChange={(event) => handleFormattingChange("baseFontSize", Number(event.target.value))}
              />
              <small>{state.formatting.baseFontSize.toFixed(1)} pt</small>
            </label>

            <label className="field">
              <span>Line Height</span>
              <input
                type="range"
                min="1.1"
                max="1.6"
                step="0.01"
                value={state.formatting.lineHeight}
                onChange={(event) => handleFormattingChange("lineHeight", Number(event.target.value))}
              />
              <small>{state.formatting.lineHeight.toFixed(2)}</small>
            </label>

            <label className="field">
              <span>Paragraph Spacing</span>
              <input
                type="range"
                min="0.02"
                max="0.22"
                step="0.01"
                value={state.formatting.paragraphSpacing}
                onChange={(event) => handleFormattingChange("paragraphSpacing", Number(event.target.value))}
              />
              <small>{state.formatting.paragraphSpacing.toFixed(2)} rem</small>
            </label>

            <label className="field">
              <span>Section Spacing</span>
              <input
                type="range"
                min="0.16"
                max="0.6"
                step="0.01"
                value={state.formatting.sectionSpacing}
                onChange={(event) => handleFormattingChange("sectionSpacing", Number(event.target.value))}
              />
              <small>{state.formatting.sectionSpacing.toFixed(2)} rem</small>
            </label>

            <label className="field">
              <span>Page Padding</span>
              <input
                type="range"
                min="0.3"
                max="0.65"
                step="0.01"
                value={state.formatting.pagePadding}
                onChange={(event) => handleFormattingChange("pagePadding", Number(event.target.value))}
              />
              <small>{state.formatting.pagePadding.toFixed(2)} in</small>
            </label>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="4. Resume Content" defaultOpen={false}>
          <label className="field">
            <span>Candidate Name</span>
            <input
              type="text"
              value={state.profile.name}
              onChange={(event) => handleProfileChange("name", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Headline</span>
            <input
              type="text"
              value={state.profile.headline}
              onChange={(event) => handleProfileChange("headline", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Contact Line</span>
            <input
              type="text"
              value={state.profile.contact}
              onChange={(event) => handleProfileChange("contact", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Skills</span>
            <textarea
              rows={4}
              value={state.profile.skills.join(", ")}
              onChange={(event) => handleProfileChange("skills", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              placeholder="Comma separated skills"
            />
          </label>

          <div className="experience-editor">
            {state.roles.map((role, roleIndex) => (
              <details
                className={`experience-card collapsible-card ${dragState?.type === "role" && dragState.roleIndex === roleIndex ? "dragging" : ""}`}
                key={`${role.company}-${role.title}-${roleIndex}`}
                open={roleIndex < 2}
                draggable
                onDragStart={() => beginRoleDrag(roleIndex)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleRoleDrop(roleIndex)}
                onDragEnd={() => setDragState(null)}
              >
                <summary>
                  <h3>{role.title || "New Experience"}{role.company ? ` | ${role.company}` : ""}</h3>
                </summary>
                <div className="collapsible-body">
                  <div className="control-group space-bottom">
                    <IconButton label="Move experience up" symbol="↑" onClick={() => moveRole(roleIndex, roleIndex - 1)} />
                    <IconButton label="Move experience down" symbol="↓" onClick={() => moveRole(roleIndex, roleIndex + 1)} />
                    <IconButton label="Delete experience" symbol="✕" onClick={() => removeRole(roleIndex)} />
                  </div>

                  <div className="grid-two">
                    <label className="field">
                      <span>Company</span>
                      <input
                        type="text"
                        value={role.company}
                        onChange={(event) => handleRoleFieldChange(roleIndex, "company", event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Title</span>
                      <input
                        type="text"
                        value={role.title}
                        onChange={(event) => handleRoleFieldChange(roleIndex, "title", event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="grid-two">
                    <label className="field">
                      <span>Dates</span>
                      <input
                        type="text"
                        value={role.dates}
                        onChange={(event) => handleRoleFieldChange(roleIndex, "dates", event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Location</span>
                      <input
                        type="text"
                        value={role.location}
                        onChange={(event) => handleRoleFieldChange(roleIndex, "location", event.target.value)}
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Bullet bank</span>
                    <div className="bullet-list">
                      {role.bullets.map((bullet, bulletIndex) => (
                        <div
                          className={`bullet-row ${dragState?.type === "bullet" && dragState.roleIndex === roleIndex && dragState.bulletIndex === bulletIndex ? "dragging" : ""}`}
                          key={`${roleIndex}-${bulletIndex}`}
                          draggable
                          onDragStart={() => beginBulletDrag(roleIndex, bulletIndex)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleBulletDrop(roleIndex, bulletIndex)}
                          onDragEnd={() => setDragState(null)}
                        >
                          <textarea
                            rows={3}
                            value={bullet}
                            onChange={(event) => handleBulletChange(roleIndex, bulletIndex, event.target.value)}
                          />
                          <div className="bullet-controls">
                            <IconButton label="Move bullet up" symbol="↑" onClick={() => moveBullet(roleIndex, bulletIndex, bulletIndex - 1)} />
                            <IconButton label="Move bullet down" symbol="↓" onClick={() => moveBullet(roleIndex, bulletIndex, bulletIndex + 1)} />
                            <IconButton label="Delete bullet" symbol="✕" onClick={() => removeBullet(roleIndex, bulletIndex)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </label>

                  <button type="button" className="secondary" onClick={() => addBullet(roleIndex)}>Add Bullet</button>
                </div>
              </details>
            ))}
          </div>

          <button type="button" className="secondary full-width" onClick={addRole}>Add Experience</button>
        </CollapsibleCard>

        <CollapsibleCard title="5. Generate">
          <div className="button-row">
            <button type="button" onClick={generateResume} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Resume"}
            </button>
            <button type="button" className="secondary" onClick={exportPdf}>Export PDF</button>
          </div>
          <div className="button-row">
            <button type="button" className="ghost" onClick={resetHistory}>Clear History</button>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="6. Saved Revisions" defaultOpen={false}>
          <div className="history-list">
            {!history.length ? (
              <p className="helper">No revisions yet. Generate a resume to save one.</p>
            ) : (
              history.map((revision, index) => (
                <article className="history-item" key={`${revision.createdAt}-${index}`}>
                  <h3>Revision {history.length - index}</h3>
                  <p>{new Date(revision.createdAt).toLocaleString()}</p>
                  <p>{revision.summary}</p>
                  <button type="button" className="secondary" onClick={() => loadRevision(revision)}>
                    Load Preview
                  </button>
                </article>
              ))
            )}
          </div>
        </CollapsibleCard>
      </aside>

      <div
        className="panel-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize builder and preview panels"
        onMouseDown={() => setIsResizingPanels(true)}
      />

      <main className="panel preview-panel">
        <div className="preview-header">
          <div>
            <p className="eyebrow">ATS Preview</p>
            <h2>One-page resume</h2>
          </div>
          <p className="subtle">
            {generated ? generated.summary : "Generate a resume to see selected bullets and keyword matches."}
          </p>
        </div>

        <section className="resume-page">
          {!generated ? (
            <div className="resume-empty">
              <h3>Your tailored resume will appear here.</h3>
              <p>Paste a job description or try scraping a job URL, then generate the resume.</p>
            </div>
          ) : (
            <>
              <article className="resume-doc" style={previewDocumentStyle}>
                {previewSections.filter((section) => section.enabled).map((section) => {
                  if (section.id === "name") {
                    return <h1 key={section.id}>{generated.profileSnapshot.name || "Candidate Name"}</h1>;
                  }

                  if (section.id === "headline") {
                    return <p className="headline" key={section.id}>{generated.profileSnapshot.headline}</p>;
                  }

                  if (section.id === "contact") {
                    return <p className="contact" key={section.id}>{generated.profileSnapshot.contact}</p>;
                  }

                  if (section.id === "summary") {
                    return (
                      <section className="resume-section" key={section.id}>
                        <span className="resume-section__title">Summary</span>
                        <p className="resume-summary">{generated.summaryText}</p>
                      </section>
                    );
                  }

                  if (section.id === "experience") {
                    return (
                      <section className="resume-section" key={section.id}>
                        <span className="resume-section__title">Experience</span>
                        {generated.selectedRoles.map((role) => (
                          <div className="resume-role" key={`${role.company}-${role.title}`}>
                            <div className="resume-role__heading">
                              <span>{role.company} | {role.title}</span>
                              <span>{role.dates}</span>
                            </div>
                            <div className="resume-role__meta">{role.location}</div>
                            <ul>
                              {role.selectedBullets.map((bullet) => (
                                <li key={bullet}>{bullet}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </section>
                    );
                  }

                  if (section.id === "skills") {
                    return (
                      <section className="resume-section" key={section.id}>
                        <span className="resume-section__title">Skills</span>
                        <p className="resume-inline-list">{generated.profileSnapshot.skills.slice(0, 12).join(", ")}</p>
                      </section>
                    );
                  }

                  if (section.id === "education") {
                    return (
                      <section className="resume-section" key={section.id}>
                        <span className="resume-section__title">Education</span>
                        <p className="resume-inline-list">{generated.profileSnapshot.education.join(" | ")}</p>
                      </section>
                    );
                  }

                  return null;
                })}
              </article>

              <div className="keyword-chip-list">
                {generated.keywords.slice(0, 10).map((item) => (
                  <span className="keyword-chip" key={item.term}>{item.term}</span>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
