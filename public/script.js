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
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				prompt: inputText
			})
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
                    <button class="history-save-btn" data-original="${item.original}" data-jargon="${item.jargon}" title="Save">
                        <i class="bi bi-heart"></i><span>Save</span>
                    </button>
                    <button class="history-delete-btn" data-id="${item._id}" title="Delete">
                        <i class="bi bi-trash"></i><span>Delete</span>
                    </button>
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

	// Show alert message for 3 seconds
	function showFeedback(msg, color = 'red') {
		const el = document.getElementById('feedbackMessage');
		el.textContent = msg;
		el.style.color = color; // red for error, green for success
		setTimeout(() => {
			el.textContent = '';
		}, 3000);
	}

	// Stop if the input text is empty
	if (!originalText || !originalText.trim()) {
		showFeedback('Please enter text and translate before saving.', 'red');
		return;
	}

	// Stop if the translation is empty or contains an error message
	if (!jargonText || !jargonText.trim() || jargonText.includes('failed')) {
		showFeedback('No valid phrase to save.', 'red');
		return;
	}

	// Get existing favorites from localStorage
	let favorites = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');

	// Stop if this translation already exists in favorites
	if (favorites.some(phrase => phrase.text === jargonText)) {
		showFeedback('This phrase is already in your favorites!');
		return;
	}

	const newFavorite = {
		id: Date.now(),
		original: originalText,
		text: jargonText,
		timestamp: new Date().toLocaleString()
	};

	// Add new favorite to the beginning of the list
	favorites.unshift(newFavorite);
	localStorage.setItem('corporatePhrases', JSON.stringify(favorites));
	showFeedback('Phrase saved to your favorites!', 'green');
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

	// Delete
	favorites.forEach(item => {
		const div = document.createElement('div');
		div.className = 'history-item';
		div.innerHTML = `
            <div class="history-content">
                <p><strong>Original:</strong> ${item.original}</p>
                <p><strong>Jargon:</strong> ${item.text}</p>
            </div>
            <div class="history-actions">
                <button class="favorite-delete-btn" data-id="${item.id}" title="Delete">
                    <i class="bi bi-trash"></i> Delete
                </button>
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
	element.innerHTML = `<div class="text-muted">${message}</div>`;
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
	const text = outputElement?.innerText.trim();
	const feedbackEl = document.getElementById('feedbackMessage');

	function showFeedback(msg, color = 'red') {
		feedbackEl.textContent = msg;
		feedbackEl.style.color = color;
		setTimeout(() => {
			feedbackEl.textContent = '';
		}, 3000);
	}

	// No output element found
	if (!outputElement) {
		showFeedback('Error: output box not found.');
		return;
	}

	// Check if empty or placeholder
	if (!text || text === "Sophisticated dialogue will appear here...") {
		showFeedback('Nothing to copy, output is empty.');
		return;
	}

	// Try copying
	navigator.clipboard.writeText(text)
		.then(() => {
			showFeedback('Copied to clipboard!', 'green');
		})
		.catch(err => {
			console.error('Clipboard error:', err);
			showFeedback('Failed to copy. Please try again.', 'red');
		});
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
			// Find nearest matching button even if an <i> or <span> was clicked
			const deleteBtn = event.target.closest('button.history-delete-btn');
			if (deleteBtn && historyList.contains(deleteBtn)) {
				deleteHistoryItem(deleteBtn.dataset.id);
				return;
			}

			const saveBtn = event.target.closest('button.history-save-btn');
			if (saveBtn && historyList.contains(saveBtn)) {
				const {
					original,
					jargon
				} = saveBtn.dataset;
				savePhrase(original, jargon);
				saveBtn.disabled = true;
				// If we have a <span> inside, update just the label
				const label = saveBtn.querySelector('span');

				if (label) {
					label.textContent = 'Saved';
				} else {
					saveBtn.textContent = 'Saved';
				}
			}
		});
	}

	// Favorites page
	const favoritesList = Elements.favoritesList();
	if (favoritesList) {
		displaySavedPhrases();

		favoritesList.addEventListener('click', function(event) {
			const delFavBtn = event.target.closest('button.favorite-delete-btn');
			if (delFavBtn && favoritesList.contains(delFavBtn)) {
				deletePhrase(delFavBtn.dataset.id);
			}
		});
	}

});