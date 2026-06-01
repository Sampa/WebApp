document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadNavigation();
});

// --- Theme Management ---
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    const htmlEl = document.documentElement;
    
    let currentTheme = localStorage.getItem('awh-theme') || 'dark';
    setTheme(currentTheme);
    
    toggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(currentTheme);
    });

    function setTheme(theme) {
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('awh-theme', theme);
        if (theme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
}

// --- Navigation & Routing using Bundled Data ---
const TOC_PATH = 'Folders/Program blocks.htm';
const navTreeEl = document.getElementById('nav-tree');
const docContainerEl = document.getElementById('doc-container');

// A dummy base URL to trick the browser's URL parser into resolving relative paths like `../` correctly
const DUMMY_BASE = 'http://localhost/docs/';

function resolveDocKey(baseKey, relativePath) {
    const url = new URL(relativePath, DUMMY_BASE + baseKey);
    // Remove the dummy base to get the dictionary key and decode %20 to spaces
    return decodeURIComponent(url.href.replace(DUMMY_BASE, ''));
}

async function loadNavigation() {
    try {
        if (!window.DOC_DATA) {
            throw new Error('Data bundle not found. Please ensure bundle.ps1 has been run.');
        }

        const html = window.DOC_DATA[TOC_PATH];
        if (!html) throw new Error('Failed to load navigation data from bundle.');
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const headings = Array.from(doc.querySelectorAll('h1')).slice(1);
        
        navTreeEl.innerHTML = '';
        const navContainer = document.createElement('div');
        navContainer.className = 'nav-tree';
        
        headings.forEach(h1 => {
            const groupTitle = document.createElement('div');
            groupTitle.className = 'folder-toggle';
            groupTitle.textContent = h1.textContent;
            
            let nextEl = h1.nextElementSibling;
            if (nextEl && nextEl.tagName === 'UL') {
                const ul = nextEl;
                processList(ul, TOC_PATH);
                
                const folderContent = document.createElement('div');
                folderContent.className = 'folder-content';
                folderContent.appendChild(ul);
                
                groupTitle.addEventListener('click', () => {
                    groupTitle.classList.toggle('collapsed');
                    folderContent.classList.toggle('collapsed');
                });
                
                navContainer.appendChild(groupTitle);
                navContainer.appendChild(folderContent);
            }
        });
        
        navTreeEl.appendChild(navContainer);
        
    } catch (error) {
        console.error(error);
        navTreeEl.innerHTML = `<div class="loader">${error.message}</div>`;
    }
}

function processList(ul, baseKey) {
    const listItems = Array.from(ul.children);
    listItems.forEach(li => {
        const a = li.querySelector(':scope > a');
        if (a) {
            a.className = 'nav-item';
            const relativePath = a.getAttribute('href');
            
            // Resolve the dictionary key
            const docKey = resolveDocKey(baseKey, relativePath);
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                a.classList.add('active');
                
                loadDocument(docKey);
            });
        }
        
        const nestedUl = li.querySelector(':scope > ul');
        if (nestedUl && !a) {
            const textNode = Array.from(li.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
            if (textNode) {
                const title = textNode.textContent.trim();
                const titleEl = document.createElement('div');
                titleEl.className = 'folder-toggle collapsed';
                titleEl.textContent = title;
                
                const contentEl = document.createElement('div');
                contentEl.className = 'folder-content collapsed';
                contentEl.appendChild(nestedUl);
                
                titleEl.addEventListener('click', () => {
                    titleEl.classList.toggle('collapsed');
                    contentEl.classList.toggle('collapsed');
                });
                
                li.insertBefore(contentEl, textNode);
                li.insertBefore(titleEl, contentEl);
                li.removeChild(textNode);
            }
            processList(nestedUl, baseKey);
        } else if (nestedUl && a) {
            const titleEl = document.createElement('div');
            titleEl.className = 'folder-toggle collapsed';
            titleEl.textContent = a.textContent;
            
            const contentEl = document.createElement('div');
            contentEl.className = 'folder-content collapsed';
            contentEl.appendChild(nestedUl);
            
            titleEl.addEventListener('click', (e) => {
                titleEl.classList.toggle('collapsed');
                contentEl.classList.toggle('collapsed');
            });
            
            li.appendChild(contentEl);
            processList(nestedUl, baseKey);
        }
    });
}

// --- Content Loading ---
function loadDocument(docKey) {
    try {
        docContainerEl.innerHTML = `<div class="loader">Loading document...</div>`;
        docContainerEl.className = 'content-wrapper';
        
        const html = window.DOC_DATA[docKey];
        if (!html) throw new Error('Document not found in bundle: ' + docKey);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        doc.querySelectorAll('script, link[rel="stylesheet"]').forEach(el => el.remove());
        
        const bodyContent = doc.body.innerHTML;
        
        docContainerEl.innerHTML = `<div class="doc-rendered">${bodyContent}</div>`;
        
        const internalLinks = docContainerEl.querySelectorAll('a');
        internalLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const newKey = resolveDocKey(docKey, href);
                    loadDocument(newKey);
                });
            }
        });

    } catch (error) {
        console.error(error);
        docContainerEl.innerHTML = `
            <div class="hero-welcome">
                <h1 style="color: var(--accent-color);">Error</h1>
                <p>Failed to load the requested document.</p>
                <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 1rem;">${error.message}</p>
            </div>
        `;
    }
}
