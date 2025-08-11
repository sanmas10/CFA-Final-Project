const CONFIG = {
    // The base URL of the backend server we built
    API_BASE_URL: 'http://localhost:3000'
};

const Elements = {
    input: () => document.getElementById('inputText'),
    output: () => document.getElementById('outputText'),
    translateBtn: () => document.getElementById('translateBtn'),
    saveBtn: () => document.getElementById('saveBtn'), // new
    historyList: () => document.getElementById('history-list'), // new
    favoritesList: () => document.getElementById('favorites-list')
};

// Translator
async function translateToCorporate() {
    const inputText = Elements.input().value.trim();
    const outputElement = Elements.output();

    if (!inputText) {
        showError(outputElement, 'Please enter some text to translate');
        return;
    }

    setLoading(true);
    showStatus(outputElement, 'Translating...');

    try {
        // Calls backend
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: inputText })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        const corporateText = data.candidates[0].content.parts[0].text.trim();

        showResult(outputElement, corporateText);

    } catch (error) {
        console.error('Translation error:', error);
        showError(outputElement, `Translation failed: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

// Load and display history on the history page
async function loadHistory() {
    const historyList = Elements.historyList();
    if (!historyList) return; // Only run if the history list element exists

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/translations`);
        if (!response.ok) throw new Error('Could not fetch history.');
        
        const history = await response.json();
        historyList.innerHTML = ''; // Clear old history
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="text-muted">No history found.</p>';
            return;
        }

        // Render each history item in reverse order to see the most recent translations + delete button
        history.reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-content">
                    <p><strong>Original:</strong> ${item.original}</p>
                    <p><strong>Jargon:</strong> ${item.jargon}</p>
                </div>
                <div class="history-actions">
                    <button class="save-btn" data-original="${item.original}" data-jargon="${item.jargon}">Save</button>
                    <button class="delete-btn" data-id="${item._id}">Delete</button>
                </div>
            `;
            historyList.appendChild(div);
        });

    } catch (error) {
        console.error('History fetch error:', error);
        historyList.innerHTML = '<p class="text-danger">Failed to load history.</p>';
    }
}

// Deleting history
async function deleteHistoryItem(id) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/translations/${id}`, {
            method: 'DELETE' // Using the HTTP delete method
        });

        if (!response.ok) throw new Error('Failed to delete.');

        // Refresh the history list after a successful deletion
        loadHistory();

    } catch (error) {
        console.error('Delete error:', error);
    }
}

// Save/favorite phrases using localStorage
function savePhrase(originalText, jargonText) {
    if (!jargonText || jargonText.includes('failed')) {
        alert('No valid phrase to save.');
        return;
    }

    let favorites = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');

    // The duplicate check
    if (favorites.some(phrase => phrase.text === jargonText)) {
        alert('This phrase is already in your favorites!');
        return;
    }
    
    const newFavorite = {
        id: Date.now(),
        original: originalText,
        text: jargonText,
        timestamp: new Date().toLocaleString()
    };
    
    favorites.unshift(newFavorite);
    localStorage.setItem('corporatePhrases', JSON.stringify(favorites));
    alert('Phrase saved to your favorites!');
}

// Load and display saved/favorite phrases
function displaySavedPhrases() {
    const listElement = Elements.favoritesList();
    if (!listElement) return;

    let favorites = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
    listElement.innerHTML = '';

    if (favorites.length === 0) {
        listElement.innerHTML = '<p class="text-muted">No saved phrases yet.</p>';
        return;
    }
    
    favorites.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-content">
                <p><strong>Original:</strong> ${item.original}</p>
                <p><strong>Jargon:</strong> ${item.text}</p>
            </div>
            <div class="history-actions">
                <button class="delete-favorite-btn" data-id="${item.id}">Delete</button>
            </div>
        `;
        listElement.appendChild(div);
    });
}

async function deletePhrase(id) {
    let favorites = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
    favorites = favorites.filter(item => item.id != id);
    localStorage.setItem('corporatePhrases', JSON.stringify(favorites));
    displaySavedPhrases(); // Refresh the list
}

// Helper functions

function setLoading(isLoading) {
    const translateBtn = Elements.translateBtn();
    
    if (isLoading) {
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Translating...';
    } else {
        translateBtn.disabled = false;
        translateBtn.innerHTML = 'Translate';
    }
}

function showStatus(element, message) {
    element.innerHTML = `<div class="text-muted fst-italic">${message}</div>`;
}

function showResult(element, text) {
    element.innerHTML = `<div class="text-success">${text}</div>`;
    const saveBtn = Elements.saveBtn();
    if (saveBtn) {
        saveBtn.style.display = 'inline-block';
    }
}

function showError(element, message) {
    element.innerHTML = `<div class="text-danger">${message}</div>`;
}

function copyToClipboard() {
    const outputElement = Elements.output();
    const text = outputElement.innerText;
    
    if (text && text.trim()) {
        navigator.clipboard.writeText(text).then(() => {
            const originalContent = outputElement.innerHTML;
            outputElement.innerHTML = '<div class="text-success"><i class="bi bi-check-circle"></i> Copied to clipboard!</div>';
            setTimeout(() => {
                outputElement.innerHTML = originalContent;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }
}

// Initialize event listeners based on the current page
document.addEventListener('DOMContentLoaded', function() {
    
    // Main input page
    const translateBtn = Elements.translateBtn();
    if (translateBtn) {
        translateBtn.addEventListener('click', translateToCorporate);
        
        Elements.input()?.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                translateToCorporate();
            }
        });

        // Set up the save button that appears after translation
        Elements.saveBtn()?.addEventListener('click', () => {
            const originalText = Elements.input().value;
            const jargonText = Elements.output().innerText;
            savePhrase(originalText, jargonText);
        });
    }

    // History page
    const historyList = Elements.historyList();
    if (historyList) {
        loadHistory(); 

        historyList.addEventListener('click', function(event) {
            const target = event.target;
            if (target?.classList.contains('delete-btn')) {
                deleteHistoryItem(target.getAttribute('data-id'));
            }
            if (target?.classList.contains('save-btn')) {
                const original = target.getAttribute('data-original');
                const jargon = target.getAttribute('data-jargon');
                savePhrase(original, jargon);
                target.disabled = true;
                target.innerText = 'Saved';
            }
        });
    }

    // Favorites page
    const favoritesList = Elements.favoritesList();
    if (favoritesList) {
        displaySavedPhrases();

        favoritesList.addEventListener('click', function(event) {
            if (event.target?.classList.contains('delete-favorite-btn')) {
                deletePhrase(event.target.getAttribute('data-id'));
            }
        });
    }
});