const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

const COUNTRIES = ['sa', 'bh', 'kw', 'om', 'ae', 'qa'];
const LOCALES = ['en-ae', 'ar-ae', 'en-sa', 'ar-sa', 'en-kw', 'ar-kw', 'en-om', 'ar-om', 'en-bh', 'ar-bh', 'en-qa', 'ar-qa'];
const DEVICE_TYPES = ['m', 'd'];
const CATEGORIES_4 = ['women', 'men', 'kids', 'home'];
const CATEGORIES_3 = ['men', 'women', 'kids'];
const CATEGORIES_5 = ['men', 'women', 'kids', "all"];
const CATEGORIES_6 = ['men', 'women', 'kids', "all", "home"];
const USER_SEGMENT_CATEGORIES = ["new_user","repeat_user"];

const PARAM_SETS = {
    locale: [...LOCALES, ...COUNTRIES, 'en', 'ar'],
    country_code: COUNTRIES,
    device_type: [...DEVICE_TYPES, 'ios', 'android'],
    category4: CATEGORIES_4,
    category3: CATEGORIES_3,
    gender: CATEGORIES_4
};

function logDebug(msg) {
    try {
        const time = new Date().toISOString();
        fs.appendFileSync(path.join(__dirname, 'server.log'), `[${time}] ${msg}\n`);
        console.log(`[DEBUG] ${msg}`);
    } catch (e) {
        console.error('Failed to write to server.log:', e);
    }
}

function normalizeCellValue(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/^[\s"']+|[\s"']+$/g, '').replace(/[\r\n]+/g, '').trim();
}

function extractUrl(value) {
    const text = normalizeCellValue(value);
    const match = text.match(/https?:\/\/[^\s"')]+/i);
    return match ? match[0] : '';
}

function escapeRegex(value) {
    return value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function replaceUrlSegment(urlStr, sourceVal, targetVal) {
    const escaped = escapeRegex(sourceVal);
    const regex = new RegExp(`(?<=^|[/.\\-_?=&])(${escaped})(?=$|[/.\\-_?=&])`, 'gi');
    return urlStr.replace(regex, targetVal);
}

// Helper to generate combinations across a string
function generateCombinations(template) {
    template = normalizeCellValue(template);
    if (!template) return [];
    
    let results = [{ str: template, params: {} }];

    const applyReplacement = (pattern, values, paramName) => {
        let newResults = [];
        for (const res of results) {
            if (res.str.includes(pattern)) {
                for (const val of values) {
                    newResults.push({
                        str: res.str.replace(new RegExp(escapeRegex(pattern), 'g'), val),
                        params: { ...res.params, [paramName]: val }
                    });
                }
            } else {
                newResults.push(res);
            }
        }
        results = newResults;
    };

    applyReplacement('${locale}', LOCALES, 'locale');
    applyReplacement('${country_code}', COUNTRIES, 'country_code');
    applyReplacement('${country-code}', COUNTRIES, 'country_code');
    applyReplacement('${country code}', COUNTRIES, 'country_code');
    applyReplacement('${device-type}', DEVICE_TYPES, 'device_type');
    applyReplacement('${men,women,kids}', CATEGORIES_3, 'category3');
    applyReplacement('${men,women,kids,home}', CATEGORIES_4, 'category4');
    applyReplacement('${women,men,kids,home}', CATEGORIES_4, 'category4');
    applyReplacement('${men,women,kids,all}', CATEGORIES_5, 'category5');
    applyReplacement('${men,women,kids,all,home}', CATEGORIES_6, 'category5');
    applyReplacement('${gender}', CATEGORIES_4, 'gender');
    applyReplacement('${user_segment}', USER_SEGMENT_CATEGORIES, 'user_segment');

    return results;
}

// Function to construct a clean local file path from the strategy string
function getLocalPath(strategyStr) {
    let clean = normalizeCellValue(strategyStr);
    if (clean.startsWith('/')) clean = clean.substring(1);
    clean = clean.replace(/\?/g, '_').replace(/=/g, '_');
    if (clean.endsWith('/')) clean += 'index.json';
    if (!clean.endsWith('.json')) clean += '.json';
    return clean;
}

function getLocalPathFromUrl(fileUrl, isStage = false) {
    try {
        const parsed = new URL(fileUrl);
        let cleanPath = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
        
        let hasJson = cleanPath.endsWith('.json');
        if (hasJson) {
            cleanPath = cleanPath.substring(0, cleanPath.length - 5);
        }

        if (parsed.search) {
            const cleanSearch = decodeURIComponent(parsed.search)
                .replace(/\?/g, '_')
                .replace(/=/g, '_')
                .replace(/&/g, '_');
            cleanPath += cleanSearch;
        }

        if (cleanPath.endsWith('/')) {
            cleanPath += 'index';
        }

        let relativePath = cleanPath + '.json';

        const lowerUrl = fileUrl.toLowerCase();
        const hasStageKeyword = lowerUrl.includes('stage') || lowerUrl.includes('stg') || lowerUrl.includes('staging');

        if (isStage || hasStageKeyword) {
          
                relativePath = 'stage/' + relativePath;
        } else {
                relativePath = 'production/' + relativePath;
        }

        return relativePath;
    } catch (e) {
        return fileUrl;
    }
}

// Build a variant URL by replacing existing URL segments only. Never append the strategy after .json.
function constructSmartUrl(sampleUrl, targetStrategyObj) {
    let newUrl = extractUrl(sampleUrl);
    if (!newUrl) return null;

    for (const [paramName, targetValue] of Object.entries(targetStrategyObj.params || {})) {
        if (!targetValue) continue;

        const sourceValues = PARAM_SETS[paramName] || [];
        const sourceValue = [...sourceValues].sort((a, b) => b.length - a.length).find(val => {
            const regex = new RegExp(`(^|[/.\\-_?=&])(${escapeRegex(val)})([/.\\-_?=&]|$)`, 'i');
            return regex.test(newUrl);
        });

        if (sourceValue) {
            newUrl = replaceUrlSegment(newUrl, sourceValue, targetValue);
        }
    }

    return newUrl;
}

async function downloadFile(fileUrl, outputPath) {
    logDebug(`downloadFile starting for url: ${fileUrl}`);
    if (!fileUrl) return { ok: false, url: fileUrl, outputPath, error: 'Missing URL' };
    try {
        await fs.ensureDir(path.dirname(outputPath));
        logDebug(`downloadFile: directory ensured for ${outputPath}`);
        const response = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 JSON Fetcher',
                'Accept': 'application/json,text/plain,*/*'
            },
            timeout: 15000,
            validateStatus: status => status < 400
        });
        logDebug(`downloadFile: axios completed with status ${response.status} for ${fileUrl}`);
        await fs.writeFile(outputPath, response.data);
        logDebug(`downloadFile: file written for ${outputPath}`);
        return { ok: true, url: fileUrl, outputPath };
    } catch (error) {
        logDebug(`downloadFile error for url ${fileUrl}: ${error.message}`);
        return { ok: false, url: fileUrl, outputPath, error: error.message };
    }
}

function addDownloadJob(jobs, fileUrl, outputPath) {
    if (!fileUrl || !outputPath) return;

    jobs.push({ url: fileUrl, outputPath });
}

function relativeOutputPath(outputPath) {
    return path.relative(__dirname, outputPath).replace(/\\/g, '/');
}

async function processExcel(excelPath, onProgress = () => {}) {
    logDebug(`processExcel started with path: ${excelPath}`);
    const publicDir = path.join(__dirname, 'public');
    
    let workbook;
    try {
        logDebug(`processExcel: reading workbook`);
        workbook = xlsx.readFile(excelPath);
        logDebug(`processExcel: sheets found: ${workbook.SheetNames.join(', ')}`);
    } catch (e) {
        logDebug(`processExcel error reading workbook: ${e.message}`);
        throw new Error(`Error reading Excel file: ${e.message}`);
    }
    
    const targetSheets = workbook.SheetNames.filter(name => 
        name.includes('JSON Modification needed') || 
        name.includes('JSON No Modification needed') ||
        name.includes('Sheet1')
    );
    
    if (targetSheets.length === 0) {
        logDebug(`processExcel error: no target sheets found`);
        throw new Error(`Could not find required sheets. Available sheets: ${workbook.SheetNames.join(', ')}`);
    }
    
    let jobs = [];
    
    for (const sheetName of targetSheets) {
        logDebug(`processExcel: processing sheet ${sheetName}`);
        onProgress(`Scanning sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find column indices dynamically
        const headerRow = data[0] || [];
        let colStrategy = 1; // Default B
        let colStage = 2;    // Default C
        let colProd = 3;     // Default D
        
        headerRow.forEach((val, idx) => {
            if (typeof val === 'string') {
                const lower = val.toLowerCase();
                if (lower.includes('strategy') || lower.includes('variants')) colStrategy = idx;
                if (lower.includes('stage')) colStage = idx;
                if (lower.includes('production') || lower.includes('prod')) colProd = idx;
            }
        });
        logDebug(`processExcel: columns identified - strategy: ${colStrategy}, stage: ${colStage}, prod: ${colProd}`);
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const strategyStr = row[colStrategy];
            const stageUrlTemplate = row[colStage];
            const prodUrlTemplate = row[colProd];
            const stageUrlBase = extractUrl(stageUrlTemplate);
            const prodUrlBase = extractUrl(prodUrlTemplate);
            
            if (!strategyStr && !stageUrlBase && !prodUrlBase) continue;
            
            const generatedStrategies = generateCombinations(strategyStr);
            const hasVariantStrategy = generatedStrategies.some(item => Object.keys(item.params).length > 0);
            
            if (!strategyStr || !hasVariantStrategy) {
                if (stageUrlBase) {
                    const stageOutPath = path.join(publicDir, getLocalPathFromUrl(stageUrlBase, true));
                    addDownloadJob(jobs, stageUrlBase, stageOutPath);
                }
                
                if (prodUrlBase) {
                    const prodOutPath = path.join(publicDir, getLocalPathFromUrl(prodUrlBase, false));
                    addDownloadJob(jobs, prodUrlBase, prodOutPath);
                }

                continue;
            }

            for (let j = 0; j < generatedStrategies.length; j++) {
                const variantStrategy = generatedStrategies[j];
                
                const stageUrl = constructSmartUrl(stageUrlTemplate, variantStrategy);
                const prodUrl = constructSmartUrl(prodUrlTemplate, variantStrategy);
                
                if (stageUrl) {
                    const stageOutPath = path.join(publicDir, getLocalPathFromUrl(stageUrl, true));
                    addDownloadJob(jobs, stageUrl, stageOutPath);
                }
                
                if (prodUrl) {
                    const prodOutPath = path.join(publicDir, getLocalPathFromUrl(prodUrl, false));
                    addDownloadJob(jobs, prodUrl, prodOutPath);
                }
            }
        }
    }

    const uniqueJobs = [];
    const seen = new Set();
    for (const job of jobs) {
        const key = `${job.url} -> ${job.outputPath}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueJobs.push(job);
    }
    logDebug(`processExcel: total unique jobs to process: ${uniqueJobs.length}`);

    const summary = {
        total: uniqueJobs.length,
        downloaded: 0,
        failed: 0
    };

    if (uniqueJobs.length === 0) {
        onProgress('No JSON URLs found.');
        return summary;
    }

    onProgress(`Found ${uniqueJobs.length} file(s). Downloading one by one...`);

    for (let i = 0; i < uniqueJobs.length; i++) {
        const job = uniqueJobs[i];
        const count = `${i + 1}/${uniqueJobs.length}`;
        const targetPath = relativeOutputPath(job.outputPath);

        onProgress(`[${count}] Downloading ${targetPath}`);
        logDebug(`processExcel: [${count}] Downloading url: ${job.url} to ${job.outputPath}`);
        const result = await downloadFile(job.url, job.outputPath);

        if (result.ok) {
            summary.downloaded += 1;
            onProgress(`[${count}] Saved ${targetPath}`);
            logDebug(`processExcel: [${count}] Saved successfully`);
        } else {
            summary.failed += 1;
            onProgress(`[${count}] Failed ${targetPath}: ${result.error}`);
            logDebug(`processExcel: [${count}] Failed: ${result.error}`);
        }
    }

    onProgress(`Done. Saved ${summary.downloaded}/${summary.total}. Failed ${summary.failed}.`);
    logDebug(`processExcel completed. Summary: ${JSON.stringify(summary)}`);
    return summary;
}

// ================= UI SERVER ROUTES =================

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AIVI JSON Links Fetcher</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
            <style>
                :root {
                    --primary: #6366f1;
                    --primary-glow: rgba(99, 102, 241, 0.4);
                    --bg-start: #0b0f19;
                    --bg-end: #111827;
                    --card-bg: rgba(17, 24, 39, 0.75);
                    --border: rgba(255, 255, 255, 0.08);
                    --text-main: #f3f4f6;
                    --text-muted: #9ca3af;
                }

                body {
                    font-family: 'Outfit', sans-serif;
                    background: radial-gradient(circle at center, #1e1b4b 0%, var(--bg-start) 100%);
                    color: var(--text-main);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 1.5rem;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }

                .glow-blob {
                    position: absolute;
                    width: 450px;
                    height: 450px;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(0,0,0,0) 70%);
                    border-radius: 50%;
                    z-index: -1;
                    filter: blur(40px);
                    pointer-events: none;
                }
                .glow-blob-1 { top: 10%; left: 15%; animation: float 12s infinite alternate; }
                .glow-blob-2 { bottom: 10%; right: 15%; animation: float 16s infinite alternate-reverse; }

                @keyframes float {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(30px, 30px) scale(1.1); }
                }

                .card {
                    background: var(--card-bg);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border);
                    padding: 2.5rem;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.1);
                    text-align: center;
                    max-width: 580px;
                    width: 100%;
                    position: relative;
                    overflow: hidden;
                }

                .card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, #6366f1, #a855f7, #6366f1);
                }

                h1 {
                    margin-top: 0;
                    font-size: 2rem;
                    font-weight: 700;
                    letter-spacing: -0.025em;
                    background: linear-gradient(to right, #ffffff, #c7d2fe);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 0.5rem;
                }

                p {
                    color: var(--text-muted);
                    font-size: 1rem;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                    font-weight: 300;
                }

                .tabs {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    border-bottom: 1px solid var(--border);
                    padding-bottom: 1rem;
                }

                .tab-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 1rem;
                    font-weight: 500;
                    cursor: pointer;
                    padding: 0.5rem 1.2rem;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .tab-btn:hover {
                    color: var(--text-main);
                    background: rgba(255, 255, 255, 0.05);
                }

                .tab-btn.active {
                    color: #fff;
                    background: var(--primary);
                    box-shadow: 0 0 12px var(--primary-glow);
                }

                .form-section {
                    display: none;
                }

                .form-section.active {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .drop-zone {
                    border: 2px dashed rgba(99, 102, 241, 0.3);
                    border-radius: 12px;
                    padding: 2.5rem 1.5rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background: rgba(31, 41, 55, 0.3);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                }

                .drop-zone:hover, .drop-zone.drag-over {
                    border-color: var(--primary);
                    background: rgba(99, 102, 241, 0.05);
                    box-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
                }

                .upload-icon {
                    width: 48px;
                    height: 48px;
                    color: var(--primary);
                    stroke-width: 1.5;
                    transition: transform 0.3s ease;
                }

                .drop-zone:hover .upload-icon {
                    transform: translateY(-4px);
                }

                .drop-zone-text {
                    font-size: 1rem;
                    font-weight: 500;
                    color: #e5e7eb;
                }

                .drop-zone-sub {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }

                .file-badge {
                    background: rgba(99, 102, 241, 0.1);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 12px;
                    padding: 1rem 1.25rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .file-name {
                    font-size: 0.95rem;
                    font-weight: 500;
                    color: #e5e7eb;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 85%;
                }

                .file-remove {
                    background: none;
                    border: none;
                    color: #f87171;
                    cursor: pointer;
                    font-size: 1.1rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 6px;
                    transition: background 0.2s;
                }

                .file-remove:hover {
                    background: rgba(248, 113, 113, 0.1);
                }

                .input-group {
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .input-label {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .text-input {
                    width: 100%;
                    padding: 0.9rem 1.2rem;
                    border-radius: 10px;
                    background: rgba(31, 41, 55, 0.5);
                    border: 1px solid var(--border);
                    color: #fff;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.88rem;
                    box-sizing: border-box;
                    outline: none;
                    transition: all 0.3s;
                }

                .text-input:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 8px var(--primary-glow);
                }

                .progress-wrapper {
                    margin-top: 1.5rem;
                    text-align: left;
                    display: none;
                }

                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                }

                .progress-container {
                    width: 100%;
                    height: 8px;
                    background: rgba(31, 41, 55, 0.8);
                    border-radius: 999px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .progress-bar {
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #a855f7);
                    border-radius: 999px;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 0 8px var(--primary-glow);
                }

                button.btn-submit {
                    padding: 0.9rem;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 1.05rem;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                }

                button.btn-submit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
                }

                button.btn-submit:active:not(:disabled) {
                    transform: translateY(0);
                }

                button.btn-submit:disabled {
                    background: #4b5563;
                    color: #9ca3af;
                    cursor: not-allowed;
                    box-shadow: none;
                }

                .console {
                    margin-top: 1.5rem;
                    background: #090d16;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 1.25rem;
                    font-family: 'JetBrains Mono', SFMono-Regular, Consolas, monospace;
                    font-size: 0.82rem;
                    text-align: left;
                    max-height: 280px;
                    overflow-y: auto;
                    display: none;
                    box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
                }

                .console-line {
                    margin-bottom: 0.4rem;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    word-break: break-all;
                }

                .status-saved { color: #34d399; font-weight: 600; margin-right: 0.5rem; }
                .status-failed { color: #f87171; font-weight: 600; margin-right: 0.5rem; }
                .status-downloading { color: #60a5fa; font-weight: 600; margin-right: 0.5rem; }
                .status-scanning { color: #fbbf24; font-weight: 600; margin-right: 0.5rem; }
                .status-info { color: #9ca3af; font-weight: 600; margin-right: 0.5rem; }

                .console::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .console::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.3);
                    border-radius: 4px;
                }
                .console::-webkit-scrollbar-thumb {
                    background: rgba(99, 102, 241, 0.4);
                    border-radius: 4px;
                }
                .console::-webkit-scrollbar-thumb:hover {
                    background: rgba(99, 102, 241, 0.6);
                }
            </style>
        </head>
        <body>
            <div class="glow-blob glow-blob-1"></div>
            <div class="glow-blob glow-blob-2"></div>

            <div class="card">
                <h1>JSON Links Fetcher</h1>
                <p>Generate, download, and structure JSON files from an Excel sheet or a single URL template.</p>
                
                <div class="tabs">
                    <button type="button" class="tab-btn active" id="excelTabBtn">Excel File</button>
                    <button type="button" class="tab-btn" id="singleTabBtn">Single URL</button>
                </div>

                <form id="uploadForm" class="form-section active" enctype="multipart/form-data">
                    <label for="fileInput" class="drop-zone" id="dropZone">
                        <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <div class="drop-zone-text">Drag & drop your Excel file here or click to browse</div>
                        <div class="drop-zone-sub">Supports .xlsx and .xls formats</div>
                    </label>
                    <input type="file" id="fileInput" name="file" accept=".xlsx,.xls" style="display: none;" />
                    
                    <div id="fileBadge" class="file-badge" style="display: none;">
                        <span class="file-name" id="fileName">file.xlsx</span>
                        <button type="button" class="file-remove" id="fileRemoveBtn">✕</button>
                    </div>

                    <button type="submit" class="btn-submit" id="submitBtn" disabled>Start Processing</button>
                </form>

                <form id="singleForm" class="form-section">
                    <div class="input-group">
                        <label for="urlInput" class="input-label">URL Template (supports dynamic placeholders like \${locale}, \${country_code}, \${gender}, \${device-type})</label>
                        <input type="text" id="urlInput" name="url" placeholder="https://mobilecdn.6thstreet.com/config_staging/rebrand/pdp/stg/\${locale}.json" required class="text-input" />
                    </div>
                    <button type="submit" class="btn-submit" id="singleSubmitBtn">Download URL(s)</button>
                </form>

                <div class="progress-wrapper" id="progressWrapper">
                    <div class="progress-header">
                        <span id="progressLabel">Running processes...</span>
                        <span id="progressText">0%</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" id="progressBar"></div>
                    </div>
                </div>

                <div class="console" id="consoleLog"></div>
            </div>
            <script>
                const excelTabBtn = document.getElementById('excelTabBtn');
                const singleTabBtn = document.getElementById('singleTabBtn');
                const uploadForm = document.getElementById('uploadForm');
                const singleForm = document.getElementById('singleForm');
                const urlInput = document.getElementById('urlInput');
                const singleSubmitBtn = document.getElementById('singleSubmitBtn');

                const dropZone = document.getElementById('dropZone');
                const fileInput = document.getElementById('fileInput');
                const fileBadge = document.getElementById('fileBadge');
                const fileName = document.getElementById('fileName');
                const fileRemoveBtn = document.getElementById('fileRemoveBtn');
                const submitBtn = document.getElementById('submitBtn');
                const progressWrapper = document.getElementById('progressWrapper');
                const progressText = document.getElementById('progressText');
                const progressLabel = document.getElementById('progressLabel');
                const progressBar = document.getElementById('progressBar');
                const consoleLog = document.getElementById('consoleLog');

                // Tab Switchers
                excelTabBtn.addEventListener('click', () => {
                    excelTabBtn.classList.add('active');
                    singleTabBtn.classList.remove('active');
                    uploadForm.classList.add('active');
                    singleForm.classList.remove('active');
                    progressWrapper.style.display = 'none';
                    consoleLog.style.display = 'none';
                    consoleLog.innerHTML = '';
                });

                singleTabBtn.addEventListener('click', () => {
                    singleTabBtn.classList.add('active');
                    excelTabBtn.classList.remove('active');
                    singleForm.classList.add('active');
                    uploadForm.classList.remove('active');
                    progressWrapper.style.display = 'none';
                    consoleLog.style.display = 'none';
                    consoleLog.innerHTML = '';
                });

                // Excel File Drop/Select Handlers
                dropZone.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', handleFileSelect);

                dropZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropZone.classList.add('drag-over');
                });

                dropZone.addEventListener('dragleave', () => {
                    dropZone.classList.remove('drag-over');
                });

                dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropZone.classList.remove('drag-over');
                    if (e.dataTransfer.files.length) {
                        fileInput.files = e.dataTransfer.files;
                        handleFileSelect();
                    }
                });

                function handleFileSelect() {
                    if (fileInput.files.length) {
                        const file = fileInput.files[0];
                        fileName.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
                        fileBadge.style.display = 'flex';
                        dropZone.style.display = 'none';
                        submitBtn.disabled = false;
                    }
                }

                fileRemoveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    fileInput.value = '';
                    fileBadge.style.display = 'none';
                    dropZone.style.display = 'flex';
                    submitBtn.disabled = true;
                });

                function escapeHtml(str) {
                    return str
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                }

                function appendConsoleLine(line) {
                    const cleanLine = line.trim();
                    if (!cleanLine) return;

                    const div = document.createElement('div');
                    div.className = 'console-line';

                    if (cleanLine.includes('Saved')) {
                        div.innerHTML = '<span class="status-saved">✔</span> ' + escapeHtml(cleanLine);
                    } else if (cleanLine.includes('Failed') || cleanLine.startsWith('ERROR:')) {
                        div.innerHTML = '<span class="status-failed">✘</span> ' + escapeHtml(cleanLine);
                    } else if (cleanLine.includes('Downloading')) {
                        div.innerHTML = '<span class="status-downloading">⬇</span> ' + escapeHtml(cleanLine);
                    } else if (cleanLine.includes('Scanning') || cleanLine.includes('Reading') || cleanLine.includes('Found') || cleanLine.includes('Uploaded') || cleanLine.includes('Parsing')) {
                        div.innerHTML = '<span class="status-scanning">⚡</span> ' + escapeHtml(cleanLine);
                    } else {
                        div.innerHTML = '<span class="status-info">ℹ</span> ' + escapeHtml(cleanLine);
                    }

                    consoleLog.appendChild(div);
                    consoleLog.scrollTop = consoleLog.scrollHeight;

                    // Update Progress Bar
                    const progressMatch = cleanLine.match(/\\b(\\d+)\\/(\\d+)\\b/) || cleanLine.match(/\\[(\\d+)\\/(\\d+)\\]/);
                    if (progressMatch) {
                        const current = parseInt(progressMatch[1], 10);
                        const total = parseInt(progressMatch[2], 10);
                        const percent = Math.round((current / total) * 100);
                        progressBar.style.width = percent + '%';
                        progressText.textContent = percent + '%';
                        progressLabel.textContent = 'Processing job ' + current + ' of ' + total + '...';
                    } else if (cleanLine.includes('Done.') || cleanLine.includes('Finished.')) {
                        progressLabel.textContent = 'Processing completed!';
                        progressBar.style.width = '100%';
                        progressText.textContent = '100%';
                    }
                }

                // Excel Upload Submit Handler
                uploadForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    submitBtn.disabled = true;
                    fileRemoveBtn.style.display = 'none';
                    
                    progressWrapper.style.display = 'block';
                    consoleLog.style.display = 'block';
                    consoleLog.innerHTML = '';
                    
                    progressBar.style.width = '0%';
                    progressText.textContent = '0%';
                    progressLabel.textContent = 'Uploading and preparing...';

                    const formData = new FormData(e.target);
                    try {
                        const response = await fetch('/upload', { method: 'POST', body: formData });
                        const decoder = new TextDecoder();
                        
                        if (response.body) {
                            const reader = response.body.getReader();
                            let buffer = '';
                            
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                
                                buffer += decoder.decode(value, { stream: true });
                                const lines = buffer.split('\\n');
                                buffer = lines.pop(); // Keep partial line in buffer
                                
                                for (const line of lines) {
                                    appendConsoleLine(line);
                                }
                            }
                            
                            if (buffer.trim()) {
                                appendConsoleLine(buffer);
                            }
                        } else {
                            const text = await response.text();
                            text.split('\\n').forEach(appendConsoleLine);
                        }
                    } catch (err) {
                        appendConsoleLine('ERROR: ' + err.message);
                    } finally {
                        submitBtn.disabled = false;
                        fileRemoveBtn.style.display = 'inline-block';
                    }
                });

                // Single URL Submit Handler
                singleForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    singleSubmitBtn.disabled = true;
                    
                    progressWrapper.style.display = 'block';
                    consoleLog.style.display = 'block';
                    consoleLog.innerHTML = '';
                    
                    progressBar.style.width = '0%';
                    progressText.textContent = '0%';
                    progressLabel.textContent = 'Contacting server...';

                    const urlValue = urlInput.value.trim();
                    try {
                        const response = await fetch('/download-single', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: urlValue })
                        });
                        
                        const decoder = new TextDecoder();
                        
                        if (response.body) {
                            const reader = response.body.getReader();
                            let buffer = '';
                            
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                
                                buffer += decoder.decode(value, { stream: true });
                                const lines = buffer.split('\\n');
                                buffer = lines.pop(); // Keep partial line in buffer
                                
                                for (const line of lines) {
                                    appendConsoleLine(line);
                                }
                            }
                            
                            if (buffer.trim()) {
                                appendConsoleLine(buffer);
                            }
                        } else {
                            const text = await response.text();
                            text.split('\\n').forEach(appendConsoleLine);
                        }
                    } catch (err) {
                        appendConsoleLine('ERROR: ' + err.message);
                    } finally {
                        singleSubmitBtn.disabled = false;
                    }
                });
            </script>
        </body>
        </html>
    `);
});

app.post('/upload', upload.single('file'), async (req, res) => {
    logDebug('POST /upload received');
    if (!req.file) {
        logDebug('POST /upload error: No file uploaded');
        return res.status(400).send('No file uploaded.');
    }
    logDebug(`POST /upload file details: name=${req.file.originalname}, path=${req.file.path}`);
    
    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        logDebug('POST /upload: flushing headers');
        res.flushHeaders();

        // Write padding chunk to bypass browser/proxy buffer boundaries
        res.write(' '.repeat(1024) + '\n');
        logDebug('POST /upload: padding chunk written');

        const writeProgress = line => {
            logDebug(`Progress log sent to client: ${line}`);
            res.write(`${line}\n`);
            if (typeof res.flush === 'function') {
                res.flush();
            }
        };

        writeProgress('Uploaded file. Reading Excel...');
        await processExcel(req.file.path, writeProgress);
        logDebug('POST /upload: processExcel completed. Cleaning up temp file.');
        await fs.remove(req.file.path); // Clean up temp file
        logDebug('POST /upload: temp file removed. ending response.');
        res.end('Finished.\n');
    } catch (e) {
        logDebug(`POST /upload error: ${e.message}`);
        console.error(e);
        if (!res.headersSent) {
            res.status(500).send(e.message);
        } else {
            res.write(`ERROR: ${e.message}\n`);
            res.end();
        }
    }
});

app.post('/download-single', async (req, res) => {
    logDebug('POST /download-single received');
    const { url } = req.body;
    if (!url) {
        logDebug('POST /download-single error: No URL provided');
        return res.status(400).send('No URL provided.');
    }
    logDebug(`POST /download-single URL: ${url}`);

    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        logDebug('POST /download-single: flushing headers');
        res.flushHeaders();

        // Write padding chunk to bypass browser/proxy buffer boundaries
        res.write(' '.repeat(1024) + '\n');
        logDebug('POST /download-single: padding chunk written');

        const writeProgress = line => {
            logDebug(`Progress log sent to client: ${line}`);
            res.write(`${line}\n`);
            if (typeof res.flush === 'function') {
                res.flush();
            }
        };

        writeProgress(`Parsing URL template: ${url}`);
        const generatedUrls = generateCombinations(url);
        const publicDir = path.join(__dirname, 'public');
        let jobs = [];

        for (const gen of generatedUrls) {
            const fileUrl = gen.str;
            const lowerUrl = fileUrl.toLowerCase();
            const isStage = lowerUrl.includes('stage') || lowerUrl.includes('stg') || lowerUrl.includes('staging');
            const outputPath = path.join(publicDir, getLocalPathFromUrl(fileUrl, isStage));
            addDownloadJob(jobs, fileUrl, outputPath);
        }

        const uniqueJobs = [];
        const seen = new Set();
        for (const job of jobs) {
            const key = `${job.url} -> ${job.outputPath}`;
            if (seen.has(key)) continue;
            seen.add(key);
            uniqueJobs.push(job);
        }

        writeProgress(`Generated ${uniqueJobs.length} URL(s) to download.`);

        for (let i = 0; i < uniqueJobs.length; i++) {
            const job = uniqueJobs[i];
            const count = `${i + 1}/${uniqueJobs.length}`;
            const targetPath = relativeOutputPath(job.outputPath);

            writeProgress(`[${count}] Downloading ${targetPath}`);
            const result = await downloadFile(job.url, job.outputPath);

            if (result.ok) {
                writeProgress(`[${count}] Saved ${targetPath}`);
            } else {
                writeProgress(`[${count}] Failed ${targetPath}: ${result.error}`);
            }
        }

        writeProgress('Done.\n');
        res.end();
    } catch (e) {
        logDebug(`POST /download-single error: ${e.message}`);
        console.error(e);
        if (!res.headersSent) {
            res.status(500).send(e.message);
        } else {
            res.write(`ERROR: ${e.message}\n`);
            res.end();
        }
    }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`UI Server running at http://${HOST}:${PORT}`);
    });
}

module.exports = {
    generateCombinations,
    constructSmartUrl,
    getLocalPath,
    getLocalPathFromUrl,
    processExcel
};
