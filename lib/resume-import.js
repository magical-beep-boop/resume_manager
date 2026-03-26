function normalizeText(text) {
  return (text || "")
    .replace(/\r/g, "")
    .replace(/\u2022/g, "•")
    .replace(/\t/g, " ")
    .replace(/(\d{4})([A-Z])/g, "$1\n$2")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLines(text) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isSectionHeader(line) {
  const normalized = line.toLowerCase().replace(/[^a-z ]/g, "").trim();
  return [
    "education",
    "professional experience",
    "experience",
    "work experience",
    "skills",
    "technical skills",
    "projects",
    "summary",
    "profile"
  ].includes(normalized);
}

function sectionKey(line) {
  const normalized = line.toLowerCase().replace(/[^a-z ]/g, "").trim();
  if (normalized === "professional experience" || normalized === "experience" || normalized === "work experience") {
    return "experience";
  }
  if (normalized === "technical skills") {
    return "skills";
  }
  if (normalized === "profile") {
    return "summary";
  }
  return normalized;
}

function splitSections(lines) {
  const sections = {};
  let current = "header";
  sections[current] = [];

  lines.forEach((line) => {
    if (isSectionHeader(line)) {
      current = sectionKey(line);
      if (!sections[current]) {
        sections[current] = [];
      }
      return;
    }

    if (!sections[current]) {
      sections[current] = [];
    }
    sections[current].push(line);
  });

  return sections;
}

function isContactLike(line) {
  return /@|\+?\d[\d\s()-]{6,}|linkedin|github|gurugram|india|remote/i.test(line);
}

function parseNameAndContact(headerLines) {
  if (!headerLines.length) {
    return { name: "", contact: "", headlineLines: [] };
  }

  const [firstLine, ...rest] = headerLines;
  const compactFirstLine = firstLine.replace(/\s{2,}/g, " | ");
  const parts = compactFirstLine.split("|").map((part) => part.trim()).filter(Boolean);

  if (parts.length > 1 && parts.slice(1).some(isContactLike)) {
    const firstPartWords = parts[0].split(/\s+/);
    if (firstPartWords.length >= 4 && /,|india|in$/i.test(parts[0])) {
      const name = firstPartWords.slice(0, 3).join(" ");
      const leadingContact = firstPartWords.slice(3).join(" ");
      return {
        name,
        contact: [leadingContact, ...parts.slice(1)].filter(Boolean).join(" | "),
        headlineLines: rest
      };
    }

    return {
      name: parts[0],
      contact: parts.slice(1).join(" | "),
      headlineLines: rest
    };
  }

  const nextContactIndex = rest.findIndex(isContactLike);
  if (nextContactIndex >= 0) {
    return {
      name: firstLine,
      contact: rest[nextContactIndex],
      headlineLines: rest.filter((_, index) => index !== nextContactIndex)
    };
  }

  return {
    name: firstLine,
    contact: "",
    headlineLines: rest
  };
}

function parseSkills(skillLines) {
  const text = skillLines.join(" | ");
  if (!text.trim()) {
    return [];
  }

  const values = text
    .split("|")
    .flatMap((segment) => {
      const cleaned = segment.includes(":") ? segment.split(":").slice(1).join(":") : segment;
      return cleaned.split(",").map((item) => item.trim());
    })
    .filter(Boolean);

  return [...new Set(values)];
}

function mergeEducationLines(lines) {
  const entries = [];
  let current = "";

  lines.forEach((line) => {
    if (/\b(19|20)\d{2}\b/.test(line) && current) {
      entries.push(current.trim());
      current = line;
      return;
    }

    current = current ? `${current} ${line}` : line;
  });

  if (current) {
    entries.push(current.trim());
  }

  return entries;
}

function normalizeBullet(line) {
  return line.replace(/^[-•*]\s*/, "").trim();
}

function isBulletLine(line) {
  return /^[-•*]\s+/.test(line);
}

function looksLikeDateRange(line) {
  return /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s.-]+\d{4}\b|\b(?:19|20)\d{2}\s*[-–]\s*(?:present|current|now|(19|20)\d{2})/i.test(line);
}

function isLikelyCompanyLine(line) {
  if (!line || isBulletLine(line) || looksLikeDateRange(line) || line.includes("|")) {
    return false;
  }

  const words = line.split(/\s+/);
  if (words.length > 7) {
    return false;
  }

  return /^[A-Z0-9&().,\-/' ]+$/.test(line) || words.every((word) => /^[A-Z][A-Za-z&().,'/-]*$/.test(word));
}

function isLikelyTitleDateLine(line) {
  return looksLikeDateRange(line) || /\|/.test(line);
}

function splitTitleDateLocation(line) {
  const segments = line.split("|").map((part) => part.trim()).filter(Boolean);
  if (!segments.length) {
    return { title: "", dates: "", location: "" };
  }

  if (segments.length === 1) {
    if (looksLikeDateRange(line)) {
      const match = line.match(/(.+?)(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s.-]+\d{4}[\s\S]*|\b(?:19|20)\d{2}\s*[-–]\s*(?:present|current|now|(19|20)\d{2})[\s\S]*)/i);
      if (match) {
        return {
          title: match[1].trim().replace(/[-|–]+$/, "").trim(),
          dates: match[2].trim(),
          location: ""
        };
      }
    }

    return { title: line, dates: "", location: "" };
  }

  const dates = segments.find(looksLikeDateRange) || "";
  const title = segments.find((segment) => segment !== dates) || "";
  const location = segments.find((segment) => segment !== dates && segment !== title) || "";
  return { title, dates, location };
}

function parseExperience(lines) {
  const roles = [];
  let company = "";
  let currentRole = null;

  const pushRole = () => {
    if (!currentRole || (!currentRole.title && !currentRole.bullets.length)) {
      return;
    }

    roles.push({
      company: currentRole.company || company || "",
      title: currentRole.title || "",
      dates: currentRole.dates || "",
      location: currentRole.location || "",
      bullets: currentRole.bullets.length ? currentRole.bullets : [""]
    });
    currentRole = null;
  };

  lines.forEach((line) => {
    if (isLikelyCompanyLine(line)) {
      pushRole();
      company = line;
      return;
    }

    if (isLikelyTitleDateLine(line)) {
      pushRole();
      const parsed = splitTitleDateLocation(line);
      currentRole = {
        company,
        title: parsed.title || line,
        dates: parsed.dates || "",
        location: parsed.location || "",
        bullets: []
      };
      return;
    }

    if (!currentRole) {
      currentRole = {
        company,
        title: "",
        dates: "",
        location: "",
        bullets: []
      };
    }

    if (!currentRole.title && line.length < 90) {
      currentRole.title = line;
      return;
    }

    if (!currentRole.location && !currentRole.bullets.length && line.length < 60 && !/[.;]$/.test(line)) {
      currentRole.location = line;
      return;
    }

    if (!currentRole.bullets.length || /[.;)]$/.test(line) || line.length > 40) {
      currentRole.bullets.push(normalizeBullet(line));
      return;
    }

    currentRole.bullets[currentRole.bullets.length - 1] = `${currentRole.bullets[currentRole.bullets.length - 1]} ${line}`.trim();
  });

  pushRole();
  return roles.slice(0, 12);
}

export function parseResumeText(rawText) {
  const lines = cleanLines(rawText);
  const sections = splitSections(lines);
  const { name, contact, headlineLines } = parseNameAndContact(sections.header || []);
  const summaryText = (sections.summary || headlineLines || [])
    .filter((line) => !isContactLike(line))
    .join(" ")
    .trim();

  return {
    profile: {
      name,
      headline: headlineLines.find((line) => !isContactLike(line)) || "",
      contact,
      skills: parseSkills(sections.skills || []),
      education: mergeEducationLines(sections.education || [])
    },
    roles: parseExperience(sections.experience || []),
    extractedText: normalizeText(rawText),
    summaryHint: summaryText
  };
}
