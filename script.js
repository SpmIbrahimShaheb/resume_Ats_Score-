const fileInput = document.getElementById("resumeFile");
const dropZone = document.getElementById("dropZone");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFile = document.getElementById("removeFile");
const analyzeBtn = document.getElementById("analyzeBtn");
const progressBox = document.getElementById("progressBox");
const errorBox = document.getElementById("errorBox");
const results = document.getElementById("results");

let selectedFile = null;

const actionVerbs = [
  "achieved","accelerated","automated","built","created","delivered","designed","developed",
  "drove","enhanced","executed","generated","implemented","improved","increased","launched",
  "led","managed","optimized","reduced","resolved","saved","streamlined","supported",
  "spearheaded","coordinated","analyzed","engineered","deployed","maintained","migrated"
];

const skillTerms = [
  "python","java","javascript","typescript","sql","excel","power bi","tableau","aws","azure",
  "gcp","docker","kubernetes","linux","git","github","jenkins","terraform","ansible","devops",
  "machine learning","data analysis","data analytics","pandas","numpy","spark","hadoop",
  "salesforce","sap","jira","agile","scrum","project management","customer service",
  "communication","leadership","problem solving","networking","windows","active directory",
  "veeam","netbackup","vmware","mongodb","postgresql","mysql","react","node.js","html","css"
];

const sectionPatterns = {
  "Contact details": /@|linkedin\.com|(\+?\d[\d\s-]{8,})/i,
  "Professional summary": /\b(summary|profile|objective|professional summary)\b/i,
  "Experience": /\b(experience|employment|work history|professional experience)\b/i,
  "Education": /\b(education|academic|qualification|university|college)\b/i,
  "Skills": /\b(skills|technical skills|core competencies|technologies)\b/i,
  "Projects": /\b(projects|project experience|academic projects)\b/i
};

function humanSize(bytes){
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(1) + " MB";
}

function showError(message){
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError(){
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function setFile(file){
  clearError();
  if(!file) return;
  const ext = file.name.split(".").pop().toLowerCase();
  if(!["pdf","docx","txt"].includes(ext)){
    showError("Please upload a PDF, DOCX or TXT resume.");
    return;
  }
  if(file.size > 5 * 1024 * 1024){
    showError("File is too large. Maximum supported size is 5 MB.");
    return;
  }
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = humanSize(file.size);
  fileInfo.classList.remove("hidden");
  analyzeBtn.disabled = false;
}

fileInput.addEventListener("change", e => setFile(e.target.files[0]));
removeFile.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  fileInfo.classList.add("hidden");
  analyzeBtn.disabled = true;
  clearError();
});

["dragenter","dragover"].forEach(type => {
  dropZone.addEventListener(type, e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});
["dragleave","drop"].forEach(type => {
  dropZone.addEventListener(type, e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});
dropZone.addEventListener("drop", e => setFile(e.dataTransfer.files[0]));

async function extractPdf(file){
  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data}).promise;
  let text = "";
  for(let i=1;i<=pdf.numPages;i++){
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return { text, pages: pdf.numPages };
}

async function extractDocx(file){
  if(!window.mammoth) throw new Error("DOCX parser did not load.");
  const buffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({arrayBuffer: buffer});
  return { text: result.value, pages: null };
}

async function extractText(file){
  const ext = file.name.split(".").pop().toLowerCase();
  if(ext === "pdf") return extractPdf(file);
  if(ext === "docx") return extractDocx(file);
  return { text: await file.text(), pages: null };
}

function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }

function analyzeResume(rawText, pages){
  const text = rawText.replace(/\s+/g," ").trim();
  const lower = text.toLowerCase();
  const words = text.match(/\b[\w.+#-]+\b/g) || [];
  const wordCount = words.length;

  const foundSections = {};
  for(const [name, pattern] of Object.entries(sectionPatterns)){
    foundSections[name] = pattern.test(text);
  }

  const sectionsCount = Object.values(foundSections).filter(Boolean).length;
  const foundSkills = skillTerms.filter(skill => lower.includes(skill));
  const actionFound = actionVerbs.filter(v => new RegExp(`\\b${v}\\b`, "i").test(text));
  const numbers = text.match(/\b\d+(?:\.\d+)?%?|\$[\d,.]+|₹[\d,.]+/g) || [];
  const bullets = (rawText.match(/[•●▪◦‣]/g) || []).length;
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  const phone = /(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){9,12}/.test(text);
  const linkedin = /linkedin\.com/i.test(text);

  let readability = 0;
  readability += wordCount >= 250 ? 18 : wordCount >= 150 ? 12 : 6;
  readability += wordCount <= 1200 ? 10 : wordCount <= 1600 ? 6 : 2;
  readability += email ? 8 : 0;
  readability += phone ? 6 : 0;
  readability += linkedin ? 3 : 0;
  readability = clamp(Math.round(readability / 45 * 100),0,100);

  let structure = clamp(Math.round(sectionsCount / 6 * 100),0,100);

  let keywords = clamp(35 + foundSkills.length * 7 + actionFound.length * 2,0,100);
  if(foundSkills.length === 0) keywords = 25;

  let impact = clamp(numbers.length * 10 + actionFound.length * 3,0,100);

  let formatting = 70;
  if(pages){
    if(pages <= 2) formatting += 15;
    else if(pages >= 4) formatting -= 20;
  }
  if(wordCount > 1500) formatting -= 15;
  if(wordCount >= 250 && wordCount <= 1100) formatting += 8;
  if(bullets > 3) formatting += 7;
  formatting = clamp(formatting,0,100);

  let completeness = clamp(
    (foundSections["Experience"] ? 25 : 0) +
    (foundSections["Education"] ? 20 : 0) +
    (foundSections["Skills"] ? 20 : 0) +
    (foundSections["Professional summary"] ? 12 : 0) +
    (foundSections["Projects"] ? 10 : 0) +
    (email && phone ? 13 : 5), 0, 100
  );

  const score = Math.round(
    readability * .22 +
    structure * .18 +
    keywords * .19 +
    impact * .16 +
    formatting * .12 +
    completeness * .13
  );

  const recommendations = [];
  if(!foundSections["Professional summary"]) recommendations.push(["Add a professional summary","Use 2–4 lines at the top to summarize your role, experience and strongest skills."]);
  if(!foundSections["Skills"]) recommendations.push(["Add a dedicated skills section","List job-relevant tools, technologies and domain skills using clear keywords."]);
  if(!foundSections["Experience"]) recommendations.push(["Make work experience explicit","Use a clear Experience or Professional Experience heading so parsers can identify your employment history."]);
  if(impact < 65) recommendations.push(["Quantify your achievements","Add percentages, time saved, revenue, volumes, SLAs or other measurable outcomes to experience bullets."]);
  if(actionFound.length < 5) recommendations.push(["Use stronger action verbs","Start achievement bullets with verbs such as implemented, improved, automated, led, optimized or delivered."]);
  if(foundSkills.length < 5) recommendations.push(["Increase relevant keyword coverage","Include specific tools and skills you genuinely know. For best results, compare your resume with the target job description."]);
  if(!linkedin) recommendations.push(["Add your LinkedIn profile","A professional LinkedIn URL can make your contact section more complete."]);
  if(wordCount < 250) recommendations.push(["Add more useful detail","Your resume appears short. Add relevant responsibilities, accomplishments, skills and projects without adding filler."]);
  if(wordCount > 1200) recommendations.push(["Make the resume more concise","Remove repetition and low-value details. Keep the strongest, most recent and job-relevant information."]);
  if(recommendations.length < 3) recommendations.push(["Tailor for each job","Mirror the language of the job description where it accurately matches your experience and skills."]);

  return {
    score,
    breakdown: {
      "ATS readability": readability,
      "Resume structure": structure,
      "Keyword strength": keywords,
      "Impact & metrics": impact,
      "Formatting hygiene": formatting,
      "Completeness": completeness
    },
    foundSections,
    foundSkills,
    actionFound,
    wordCount,
    recommendations: recommendations.slice(0,6)
  };
}

function scoreCopy(score){
  if(score >= 85) return {
    label:"Excellent",
    title:"Excellent ATS readiness",
    text:"Your resume follows many ATS-friendly practices. Tailor keywords to each job description for an even stronger match."
  };
  if(score >= 70) return {
    label:"Strong",
    title:"Good ATS readiness",
    text:"Your resume is in good shape, but a few targeted improvements could strengthen parsing, relevance and impact."
  };
  if(score >= 55) return {
    label:"Needs work",
    title:"Moderate ATS readiness",
    text:"Your resume has a usable foundation, but several improvements could make it clearer and more competitive."
  };
  return {
    label:"Improve",
    title:"Low ATS readiness",
    text:"Your resume may struggle with common ATS checks. Focus first on clear sections, relevant skills, measurable impact and complete contact details."
  };
}

function renderReport(report){
  const copy = scoreCopy(report.score);
  document.getElementById("scoreNumber").textContent = report.score;
  document.getElementById("resultRing").style.setProperty("--score", report.score);
  document.getElementById("scoreBadge").textContent = copy.label;
  document.getElementById("scoreTitle").textContent = copy.title;
  document.getElementById("scoreSummary").textContent = copy.text;

  const breakdown = document.getElementById("breakdown");
  breakdown.innerHTML = Object.entries(report.breakdown).map(([name,val]) => `
    <div class="breakdown-item">
      <div class="breakdown-top"><span>${name}</span><strong>${val}%</strong></div>
      <div class="bar"><span style="width:${val}%"></span></div>
    </div>`).join("");

  const recommendationList = document.getElementById("recommendationList");
  recommendationList.innerHTML = report.recommendations.map((r,i) => `
    <div class="rec-item">
      <div class="rec-num">${String(i+1).padStart(2,"0")}</div>
      <div><h4>${r[0]}</h4><p>${r[1]}</p></div>
    </div>`).join("");

  const sectionChecks = document.getElementById("sectionChecks");
  sectionChecks.innerHTML = Object.entries(report.foundSections).map(([name,found]) => `
    <div class="check-pill">
      <span>${name}</span>
      <span class="${found ? "yes":"no"}">${found ? "✓ Found":"✕ Missing"}</span>
    </div>`).join("");

  const keywordCloud = document.getElementById("keywordCloud");
  const terms = [...new Set([...report.foundSkills, ...report.actionFound.slice(0,8)])].slice(0,24);
  keywordCloud.innerHTML = terms.length
    ? terms.map(k => `<span class="keyword">${k}</span>`).join("")
    : `<p style="color:#697386;font-size:13px;line-height:1.6">Few recognizable skill or action keywords were detected. Add a clear skills section and stronger accomplishment language.</p>`;

  results.classList.remove("hidden");
  results.scrollIntoView({behavior:"smooth",block:"start"});
}

analyzeBtn.addEventListener("click", async () => {
  if(!selectedFile) return;
  clearError();
  analyzeBtn.disabled = true;
  progressBox.classList.remove("hidden");

  try{
    const extracted = await extractText(selectedFile);
    if(!extracted.text || extracted.text.trim().length < 80){
      throw new Error("We could not extract enough text from this resume. If it is a scanned/image PDF, export it as a text-based PDF and try again.");
    }
    lastResumeText = extracted.text;
    const report = analyzeResume(extracted.text, extracted.pages);
    setTimeout(() => {
      progressBox.classList.add("hidden");
      analyzeBtn.disabled = false;
      renderReport(report);
    }, 650);
  }catch(err){
    progressBox.classList.add("hidden");
    analyzeBtn.disabled = false;
    showError(err.message || "Something went wrong while reading the resume.");
  }
});

document.getElementById("scanAnother").addEventListener("click", () => {
  results.classList.add("hidden");
  selectedFile = null;
  fileInput.value = "";
  fileInfo.classList.add("hidden");
  analyzeBtn.disabled = true;
  document.getElementById("checker").scrollIntoView({behavior:"smooth"});
});


// ---------------- Job Description Match ----------------

let lastResumeReport = null;
let lastResumeText = "";

function extractJobSkills(jobText){
  const lower = jobText.toLowerCase();
  return skillTerms.filter(skill => lower.includes(skill));
}

function extractJobKeywords(jobText){
  const lower = jobText.toLowerCase();
  const found = [];
  const common = [
    "requirements","responsibilities","experience","qualification","skills",
    "bachelor","master","degree","years","remote","hybrid","full time",
    "data","analytics","development","testing","support","cloud","security",
    "database","automation","reporting","dashboard","customer","project",
    "stakeholder","communication","leadership","problem solving"
  ];
  common.forEach(k => { if(lower.includes(k)) found.push(k); });
  return found;
}

function calculateJobMatch(resumeText, report, jobText){
  const resumeLower = resumeText.toLowerCase();
  const jobSkills = extractJobSkills(jobText);
  const jobKeywords = extractJobKeywords(jobText);

  const matchedSkills = jobSkills.filter(k => resumeLower.includes(k));
  const missingSkills = jobSkills.filter(k => !resumeLower.includes(k));

  const matchedGeneral = jobKeywords.filter(k => resumeLower.includes(k));
  const keywordPool = [...new Set([...jobSkills, ...jobKeywords])];
  const matchedAll = [...new Set([...matchedSkills, ...matchedGeneral])];

  const keywordCoverage = keywordPool.length
    ? (matchedAll.length / keywordPool.length) * 100 : 45;

  // Job match also considers the existing resume quality so a keyword-only
  // resume does not receive an artificially high match score.
  const score = Math.round(
    keywordCoverage * 0.60 +
    report.breakdown["ATS readability"] * 0.10 +
    report.breakdown["Resume structure"] * 0.10 +
    report.breakdown["Impact & metrics"] * 0.08 +
    report.breakdown["Completeness"] * 0.07 +
    report.breakdown["Formatting hygiene"] * 0.05
  );

  const advice = [];
  if(missingSkills.length){
    advice.push([
      "Review the missing skills",
      `The job description contains ${missingSkills.length} recognizable skill keywords not detected in your resume. Add them only when they accurately reflect your experience.`
    ]);
  }
  if(report.breakdown["Impact & metrics"] < 65){
    advice.push([
      "Strengthen achievement bullets",
      "Use measurable outcomes such as time saved, percentage improvement, ticket volume, revenue, uptime or SLA performance where applicable."
    ]);
  }
  if(report.breakdown["Resume structure"] < 75){
    advice.push([
      "Improve section clarity",
      "Use conventional headings such as Summary, Experience, Education, Skills and Projects so both recruiters and ATS parsers can identify content quickly."
    ]);
  }
  if(matchedSkills.length < 5){
    advice.push([
      "Use role-specific terminology",
      "Where truthful, use the same terminology as the job description for tools, platforms, methodologies and responsibilities you have actually worked with."
    ]);
  }
  if(!/experience|responsibilit|qualification|requirement/i.test(jobText)){
    advice.push([
      "Use the complete job description",
      "A fuller job description produces a more meaningful keyword comparison than a short job title or summary."
    ]);
  }
  if(!advice.length){
    advice.push([
      "Tailor your strongest experience",
      "Move the most relevant projects and accomplishments higher in the resume and make their outcomes easy to scan."
    ]);
  }

  return {
    score: clamp(score,0,100),
    matched: matchedAll,
    missing: missingSkills,
    resumeSkillCount: report.foundSkills.length,
    advice: advice.slice(0,5)
  };
}

function renderJobMatch(result){
  const badge = result.score >= 80 ? "Strong match" :
                result.score >= 65 ? "Good match" :
                result.score >= 50 ? "Partial match" : "Low match";

  const title = result.score >= 80 ? "Strong keyword alignment" :
                result.score >= 65 ? "Good job alignment" :
                result.score >= 50 ? "Some alignment, with gaps" :
                "Significant keyword gaps";

  const summary = result.score >= 80
    ? "Your resume contains many of the job's recognizable keywords and has a solid ATS foundation."
    : result.score >= 65
    ? "Your resume shares a useful set of keywords with this role, but tailoring can improve the match."
    : result.score >= 50
    ? "There is some overlap with the role, but several job-specific signals are not detected."
    : "The resume and job description have limited recognizable keyword overlap. Review the missing terms and tailor relevant experience.";

  document.getElementById("matchScore").textContent = result.score;
  document.getElementById("matchRing").style.setProperty("--score", result.score);
  document.getElementById("matchBadge").textContent = badge;
  document.getElementById("matchTitle").textContent = title;
  document.getElementById("matchSummary").textContent = summary;
  document.getElementById("matchedCount").textContent = result.matched.length;
  document.getElementById("missingCount").textContent = result.missing.length;
  document.getElementById("resumeSkillCount").textContent = result.resumeSkillCount;

  document.getElementById("matchedKeywords").innerHTML = result.matched.length
    ? result.matched.map(k => `<span class="keyword">${k}</span>`).join("")
    : `<p style="color:#697386;font-size:13px">No recognizable matching keywords were detected.</p>`;

  document.getElementById("missingKeywords").innerHTML = result.missing.length
    ? result.missing.map(k => `<span class="keyword">${k}</span>`).join("")
    : `<p style="color:#17a673;font-size:13px;font-weight:600">No recognizable missing skill keywords detected.</p>`;

  document.getElementById("matchAdvice").innerHTML = result.advice.map((r,i) => `
    <div class="rec-item">
      <div class="rec-num">${String(i+1).padStart(2,"0")}</div>
      <div><h4>${r[0]}</h4><p>${r[1]}</p></div>
    </div>`).join("");

  document.getElementById("matchResults").classList.remove("hidden");
}

document.getElementById("jobDescription").addEventListener("input", e => {
  document.getElementById("jobCharCount").textContent =
    `${e.target.value.length.toLocaleString()} characters`;
});

document.getElementById("clearJob").addEventListener("click", () => {
  document.getElementById("jobDescription").value = "";
  document.getElementById("jobCharCount").textContent = "0 characters";
});

document.getElementById("openJobMatch").addEventListener("click", () => {
  document.getElementById("jobmatch").classList.remove("hidden");
  document.getElementById("jobmatch").scrollIntoView({behavior:"smooth"});
});

document.getElementById("newJobMatch").addEventListener("click", () => {
  document.getElementById("jobDescription").value = "";
  document.getElementById("jobCharCount").textContent = "0 characters";
  document.getElementById("matchResults").classList.add("hidden");
  document.getElementById("jobDescription").focus();
});

document.getElementById("matchBtn").addEventListener("click", () => {
  const jobText = document.getElementById("jobDescription").value.trim();
  const err = document.getElementById("matchError");
  const progress = document.getElementById("matchProgress");

  err.classList.add("hidden");
  if(!lastResumeReport || !lastResumeText){
    err.textContent = "Please analyze a resume first.";
    err.classList.remove("hidden");
    return;
  }
  if(jobText.length < 100){
    err.textContent = "Please paste a fuller job description (at least 100 characters).";
    err.classList.remove("hidden");
    return;
  }

  progress.classList.remove("hidden");
  document.getElementById("matchBtn").disabled = true;

  setTimeout(() => {
    const result = calculateJobMatch(lastResumeText, lastResumeReport, jobText);
    progress.classList.add("hidden");
    document.getElementById("matchBtn").disabled = false;
    renderJobMatch(result);
    document.getElementById("matchResults").scrollIntoView({behavior:"smooth",block:"start"});
  }, 650);
});

// Wrap the existing report renderer so the extracted resume text/report
// are retained for the Job Match step.
const originalRenderReport = renderReport;
renderReport = function(report){
  lastResumeReport = report;
  originalRenderReport(report);
  document.getElementById("jobmatch").classList.remove("hidden");
};
