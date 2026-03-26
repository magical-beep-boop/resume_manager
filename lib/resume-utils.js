const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "build", "by", "for", "from", "in", "into",
  "is", "it", "of", "on", "or", "our", "that", "the", "their", "this", "to", "with", "you",
  "your", "will", "we", "who", "they", "have", "has", "had", "using", "use", "used", "across",
  "within", "through", "about", "over", "per", "plus", "all", "can", "not", "more", "than",
  "role", "team", "teams", "work", "working", "job", "candidate", "ideal", "required", "preferred"
]);

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#/ ]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
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

export function extractKeywords(description) {
  const counts = new Map();

  tokenize(description).forEach((token) => {
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

export function scoreBullet(bullet, keywords) {
  const terms = new Set(tokenize(bullet));
  let score = 0;

  keywords.forEach(({ term, weight }) => {
    if (terms.has(term)) {
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

export function selectBestBullets(roles, keywords, bulletLimit) {
  return roles
    .map((role, index) => {
      const scored = (role.bullets || [])
        .map((bullet) => ({
          bullet,
          score: scoreBullet(bullet, keywords)
        }))
        .filter((item) => item.bullet && item.bullet.trim())
        .sort((left, right) => right.score - left.score);

      const selectedBullets = scored
        .slice(0, index < 3 ? bulletLimit : 1)
        .filter((item) => item.score > 0 || index < 2)
        .map((item) => item.bullet.trim());

      return {
        company: role.company,
        title: role.title,
        dates: role.dates,
        location: role.location,
        selectedBullets: selectedBullets.length
          ? selectedBullets
          : scored.slice(0, 1).map((item) => item.bullet.trim())
      };
    })
    .filter((role, index) => role.selectedBullets.length && index < 5);
}

export function createSummarySentence(keywords) {
  const focusTerms = keywords
    .slice(0, 6)
    .map((item) => item.term)
    .filter((term) => !["self", "service", "power", "bi"].includes(term));

  if (!focusTerms.length) {
    return "Product analytics leader with experience in AI, BI, data quality, and dashboard strategy across high-growth technology environments.";
  }

  return `Product analytics leader with experience aligned to ${focusTerms.join(", ")}, combining AI, BI, data quality, and stakeholder management to deliver measurable business impact.`;
}

export function buildMatchSummary(selectedRoles, keywords) {
  const bulletCount = selectedRoles.reduce((sum, role) => sum + role.selectedBullets.length, 0);
  const topKeywords = keywords.slice(0, 8).map((item) => item.term).join(", ");
  return `Selected ${bulletCount} bullets across ${selectedRoles.length} roles using keyword matching. Top matches: ${topKeywords || "manual review recommended"}.`;
}

export function buildGeneratedResume({ profile, roles, description, bulletLimit }) {
  const keywords = extractKeywords(description);
  const selectedRoles = selectBestBullets(roles, keywords, bulletLimit);

  return {
    createdAt: new Date().toISOString(),
    keywords,
    selectedRoles,
    summary: buildMatchSummary(selectedRoles, keywords),
    profileSnapshot: {
      ...profile
    },
    summaryText: createSummarySentence(keywords)
  };
}
