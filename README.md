# ResumeScore AI

A browser-based ATS resume score prototype.

## Features
- Upload PDF, DOCX or TXT resumes
- Extracts resume text directly in the browser
- Generates a score out of 100
- Checks:
  - ATS readability
  - Resume structure
  - Keyword strength
  - Impact and quantified achievements
  - Formatting hygiene
  - Completeness
- Shows detected resume sections and keywords
- Gives prioritized improvement recommendations
- Job Description Match:
  - Paste a job description after resume analysis
  - Calculates a Resume vs Job Match score
  - Shows matched and missing keywords
  - Gives targeted recommendations for the role

## Run locally

Because PDF.js uses ES modules, serve the folder using a small local web server rather than opening `index.html` directly.

### Python
```bash
python -m http.server 8000
```

Then open:
`http://localhost:8000`

## Important
This is a heuristic ATS-readiness score, not an exact score from a specific employer's Applicant Tracking System.

For a production version, add:
- User accounts
- Resume storage / privacy controls
- Job description upload
- Resume-vs-job keyword matching
- AI rewrite suggestions
- Backend malware scanning
- Analytics and rate limiting
