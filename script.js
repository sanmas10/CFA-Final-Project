const CONFIG = {
    GEMINI_API_KEY: 'AIzaSyA1qc7U4UWPr0_vb8U5oNPMC2WLSG_jIrs',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    CORPORATE_BS_API_URL: 'https://corporatebs-generator.sameerkumar.website/'
};

const Elements = {
    input: () => document.getElementById('inputText'),
    output: () => document.getElementById('outputText'),
    translateBtn: () => document.getElementById('translateBtn')
};

async function translateToCorporate() {
    const inputText = Elements.input().value.trim();
    const outputElement = Elements.output();
    
    if (!inputText) {
        showError(outputElement, 'Please enter some text to translate');
        return;
    }
    
    setLoading(true);
    showStatus(outputElement, 'Generating corporate buzzwords...');
    
    try {
        const buzzwordPhrase = await fetchCorporateBuzzwords();
        
        if (!buzzwordPhrase) {
            throw new Error('Failed to generate corporate buzzwords');
        }
        
        showStatus(outputElement, 'Translating to corporate speak...');
        
        const corporateText = await transformWithGemini(inputText, buzzwordPhrase);
        
        showResult(outputElement, corporateText);
        
    } catch (error) {
        console.error('Translation error:', error);
        showError(outputElement, `Translation failed: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

async function fetchCorporateBuzzwords() {
    const response = await fetch(CONFIG.CORPORATE_BS_API_URL);
    
    if (!response.ok) {
        throw new Error(`Corporate BS API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.phrase || null;
}

async function transformWithGemini(inputText, buzzwordPhrase) {
    const prompt = createGeminiPrompt(inputText, buzzwordPhrase);
    
    const response = await fetch(CONFIG.GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': CONFIG.GEMINI_API_KEY
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
    }
    
    throw new Error('No response generated from Gemini');
}

function createGeminiPrompt(inputText, buzzwordPhrase) {
    return `Take this input phrase: "${inputText}"

Corporate buzzword phrase to integrate: "${buzzwordPhrase}"

Your task: Rewrite the input phrase by seamlessly incorporating the corporate buzzword phrase while preserving the original meaning. The result should sound professional and corporate but still convey the same core message.

Rules:
- Keep the original meaning intact
- Make it sound naturally corporate/business-like
- Integrate the buzzword phrase smoothly (don't just append it)
- Return ONLY the rewritten phrase, nothing else
- No explanations or additional text

Output:`;
}


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

document.addEventListener('DOMContentLoaded', function() {
    Elements.translateBtn()?.addEventListener('click', translateToCorporate);
    
    Elements.input()?.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            translateToCorporate();
        }
    });
});