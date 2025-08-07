const CONFIG = {
    // The base URL of the backend server we built
    API_BASE_URL: 'http://localhost:3000'
};

const Elements = {
    input: () => document.getElementById('inputText'),
    output: () => document.getElementById('outputText'),
    translateBtn: () => document.getElementById('translateBtn'),
    historyList: () => document.getElementById('history-list') // new
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

        // Render each history item in reverse order with a delete button
        history.reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-content">
                    <p><strong>Original:</strong> ${item.original}</p>
                    <p><strong>Jargon:</strong> ${item.jargon}</p>
                </div>
                <button class="delete-btn" data-id="${item._id}">Delete</button>
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
    
    // If were on the main input page
    const translateBtn = Elements.translateBtn();
    if (translateBtn) {
        translateBtn.addEventListener('click', translateToCorporate);
        
        Elements.input()?.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                translateToCorporate();
            }
        });
    }

    // If were on the history page
    const historyList = Elements.historyList();
    if (historyList) {
        loadHistory(); // Load the history immediately

        // Add a single event listener to the list to handle all delete button clicks
        historyList.addEventListener('click', function(event) {
            if (event.target && event.target.classList.contains('delete-btn')) {
                const id = event.target.getAttribute('data-id');
                if (id) {
                    deleteHistoryItem(id);
                }
            }
        });
    }
});