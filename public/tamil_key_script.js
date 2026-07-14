//const editor = document.getElementById('editor');



//const editor =
//document.getElementById('txtNameTam') ||
//document.getElementById('editNameTam') ||
//document.getElementById('editor');
//const suggestionsBox = document.getElementById('suggestions');

let editor = null;
const suggestionsBox = document.getElementById('suggestions');

// Store current suggestions and active state
let currentSuggestions = [];
let activeIndex = -1;
let currentWord = '';
let currentWordStart = 0;

/* 
 * ----------------------------------------------------------------------------
 *  OFFLINE TAMIL TRANSLITERATION ENGINE
 * ----------------------------------------------------------------------------
 *  Data structures and logic to map English phonetics to Tamil characters.
 */

const vowels = {
    'a': 'அ', 'aa': 'ஆ', 'A': 'ஆ', 'i': 'இ', 'ii': 'ஈ', 'I': 'ஈ', 'ee': 'ஈ',
    'u': 'உ', 'uu': 'ஊ', 'U': 'ஊ', 'oo': 'ஊ', 'e': 'எ', 'E': 'ஏ', 'ae': 'ஏ',
    'ai': 'ஐ', 'o': 'ஒ', 'O': 'ஓ', 'oa': 'ஓ', 'au': 'ஔ', 'ou': 'ஔ'
};

const vowelSigns = {
    'a': '', 'aa': 'ா', 'A': 'ா', 'i': 'ி', 'ii': 'ீ', 'I': 'ீ', 'ee': 'ீ',
    'u': 'ு', 'uu': 'ூ', 'U': 'ூ', 'oo': 'ூ', 'e': 'ெ', 'E': 'ே', 'ae': 'ே',
    'ai': 'ை', 'o': 'ொ', 'O': 'ோ', 'oa': 'ோ', 'au': 'ௌ', 'ou': 'ௌ'
};

// Refined Consonants for Strict Mapping (the base map)
// We will have a separate "Alternates" map for suggestions.
const baseConsonants = {
    'k': 'க்', 'g': 'க்',
    'ng': 'ங்',
    'ch': 'ச்', 's': 'ச்', 'c': 'ச்',
    'j': 'ஜ்',
    'nj': 'ஞ்',
    't': 'ட்', 'T': 'ட்', 'd': 'ட்', 'D': 'ட்',
    'N': 'ண்',
    'th': 'த்', 'dh': 'த்',
    'n': 'ந்',
    'p': 'ப்', 'b': 'ப்', 'f': 'ப்',
    'm': 'ம்',
    'y': 'ய்',
    'r': 'ர்',
    'l': 'ல்',
    'v': 'வ்', 'w': 'வ்',
    'zh': 'ழ்', 'z': 'ழ்',
    'L': 'ள்',
    'R': 'ற்',
    'sh': 'ஷ்', 'S': 'ஸ்', 'h': 'ஹ்',
    'ksh': 'க்ஷ்'
};

// Alternates for ambiguous letters to generate multiple suggestions
const alternates = {
    'n': ['ந்', 'ன்', 'ண்'],
    'N': ['ண்', 'ன்', 'ந்'],
    'l': ['ல்', 'ள்', 'ழ்'],
    'L': ['ள்', 'ல்', 'ழ்'],
    'r': ['ர்', 'ற்'],
    'R': ['ற்', 'ர்'],
    'zh': ['ழ்', 'ள்'],
    's': ['ச்', 'ஸ்', 'ஷ்'],
    'ch': ['ச்', 'ஷ்']
};

/*
editor.addEventListener('input', handleInput);
editor.addEventListener('keydown', handleKeydown);
// selection change detection
editor.addEventListener('mouseup', checkSelection);
editor.addEventListener('keyup', (e) => {
    // If suggestions are visible, ignore Up/Down arrows to prevent resetting selection
    if (!suggestionsBox.classList.contains('hidden') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return;
    }

    // Check selection on shift+arrow keys or just arrow keys (navigating text)
    if (e.key.includes('Arrow') || e.key === 'Shift') {
        checkSelection();
    }
});
*/

document.addEventListener('click', (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== editor) {
        hideSuggestions();
    }
});

function handleInput(e) {
    // If there is a selection, we defer to checkSelection logic usually, 
    // but input event deletes selection. So this handles Typing.
    detectWordUnderCursor();
}

function checkSelection() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    if (start !== end) {
        // Text is selected!
        const selectedText = editor.value.substring(start, end);
        currentWordStart = start;
        currentWord = selectedText;

        // Relaxed validation: Allow mixed content if it has at least some processable chars
        if (currentWord.trim().length > 0) {
            generateSuggestions(currentWord);
        } else {
            hideSuggestions();
        }
    } else {
        // No selection (just cursor move/click)
        // User wants suggestions for partial words (e.g. kaN|nan)
        detectWordUnderCursor();
    }
}

function detectWordUnderCursor() {
    const text = editor.value;
    const cursorPosition = editor.selectionStart;

    const lastSpaceIndex = text.lastIndexOf(' ', cursorPosition - 1);
    const lastNewlineIndex = text.lastIndexOf('\n', cursorPosition - 1);
    const splitIndex = Math.max(lastSpaceIndex, lastNewlineIndex);

    currentWordStart = splitIndex + 1;
    currentWord = text.substring(currentWordStart, cursorPosition);

    // Relaxed validation matches checkSelection (allows mixed input / partials)
    if (currentWord.trim().length > 0) {
        generateSuggestions(currentWord);
    } else {
        hideSuggestions();
    }
}

function generateSuggestions(word) {
    const tokens = tokenize(word);

    const baseTransliteration = transliterateTokens(tokens, false);
    const variations = generateVariations(tokens);

    const allSuggestions = Array.from(new Set([baseTransliteration, ...variations]));

    currentSuggestions = allSuggestions.slice(0, 5);
    showSuggestions(currentSuggestions);
}

function tokenize(word) {
    const tokens = [];
    let i = 0;
    while (i < word.length) {
        let match = false;

        // 1. Try Consonants
        for (let len = 3; len >= 1; len--) {
            if (i + len > word.length) continue;
            const sub = word.substr(i, len);

            if (isValidConsonant(sub)) {
                let consonant = sub;
                i += len;

                let vowel = '';
                // Look for vowel
                for (let vLen = 2; vLen >= 1; vLen--) {
                    if (i + vLen > word.length) continue;
                    const vSub = word.substr(i, vLen);
                    if (vowels[vSub]) {
                        vowel = vSub;
                        i += vLen;
                        break;
                    }
                }

                tokens.push({ type: 'CV', c: consonant, v: vowel });
                match = true;
                break;
            }
        }

        if (match) continue;

        // 2. Try Standalone Vowels
        for (let len = 2; len >= 1; len--) {
            if (i + len > word.length) continue;
            const sub = word.substr(i, len);
            if (vowels[sub]) {
                tokens.push({ type: 'V', v: sub });
                i += len;
                match = true;
                break;
            }
        }

        if (match) continue;

        // 3. Fallback: LITERAL (Unknown char, e.g., Tamil char or Symbol)
        tokens.push({ type: 'LITERAL', val: word[i] });
        i++;
    }
    return tokens;
}

function isValidConsonant(str) {
    return baseConsonants.hasOwnProperty(str); // strict check
}

function transliterateTokens(tokens, useAlternates, altMap = {}) {
    let result = '';

    tokens.forEach(token => {
        if (token.type === 'LITERAL') {
            result += token.val;
        } else if (token.type === 'V') {
            result += vowels[token.v];
        } else if (token.type === 'CV') {
            let tamilC = baseConsonants[token.c];

            if (useAlternates && altMap[token.c]) {
                tamilC = altMap[token.c];
            }

            if (!token.v) {
                result += tamilC;
            } else {
                const baseC = tamilC.replace('\u0BCD', '');
                const sign = vowelSigns[token.v];
                result += baseC + sign;
            }
        }
    });
    return result;
}

function generateVariations(tokens) {
    const ambiguousIndices = [];
    tokens.forEach((t, idx) => {
        if (t.type === 'CV' && alternates[t.c]) {
            ambiguousIndices.push(idx);
        }
    });

    if (ambiguousIndices.length === 0) return [];

    let results = [];
    const activeIndices = ambiguousIndices.slice(0, 3);

    function recurse(currentResults, depth) {
        if (depth === activeIndices.length) {
            results.push(currentResults);
            return;
        }

        const tokenIdx = activeIndices[depth];
        const token = tokens[tokenIdx];
        const possibleChars = alternates[token.c];

        possibleChars.forEach(altChar => {
            const newMap = { ...currentResults, [tokenIdx]: altChar };
            recurse(newMap, depth + 1);
        });
    }

    recurse({}, 0);

    const stringVariations = results.map(map => {
        let str = '';
        tokens.forEach((token, idx) => {
            if (token.type === 'LITERAL') {
                str += token.val;
            } else if (token.type === 'V') {
                str += vowels[token.v];
            } else if (token.type === 'CV') {
                let tamilC = map[idx] || baseConsonants[token.c];
                if (!token.v) {
                    str += tamilC;
                } else {
                    const baseC = tamilC.replace('\u0BCD', '');
                    const sign = vowelSigns[token.v];
                    str += baseC + sign;
                }
            }
        });
        return str;
    });

    return stringVariations;
}


// UI Logic
function showSuggestions(suggestions) {
    if (suggestions.length === 0) {
        hideSuggestions();
        return;
    }
    
    // Show suggestions at the END of the selection or word
    // currentWordStart is start index. currentWord is the string.
    const coordinates = getCaretCoordinates(editor, currentWordStart + currentWord.length);
    
    suggestionsBox.style.left = `${coordinates.left}px`;
    suggestionsBox.style.top = `${coordinates.top + 24}px`;

    // Add custom dictionary word at the top
    if (typeof TamilDictionary !== "undefined") {

        const customWord = TamilDictionary.get(currentWord);

        if (customWord) {

            // Remove duplicate if already present
            suggestions = suggestions.filter(function(item){

                return item !== customWord;

            });

            // Put custom word first
            suggestions.unshift(customWord);

        }

    }
    currentSuggestions = suggestions;
    suggestionsBox.innerHTML = '';
    suggestions.forEach((suggestion, index) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `<span class="suggestion-number">${index + 1}.</span> <span>${suggestion}</span>`;
        div.addEventListener('click', () => {
            applySuggestion(suggestion);
            editor.focus();
        });
        suggestionsBox.appendChild(div);
    });

    suggestionsBox.classList.remove('hidden');
    activeIndex = 0;
    updateActiveSuggestion();
}

function hideSuggestions() {
    suggestionsBox.classList.add('hidden');
    activeIndex = -1;
}

function updateActiveSuggestion() {
    const items = suggestionsBox.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
        if (index === activeIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function handleKeydown(e) {
    if (suggestionsBox.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % currentSuggestions.length;
        updateActiveSuggestion();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
        updateActiveSuggestion();
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') {
        if (activeIndex >= 0) {
            e.preventDefault();
            applySuggestion(currentSuggestions[activeIndex]);
        }
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
}

function applySuggestion(suggestion) {
    const text = editor.value;
    const before = text.substring(0, currentWordStart);
    // Use selectionEnd if available, otherwise just word length
    // But currentWord logic sets currentWord from selection
    // So currentWordStart + currentWord.length should equal previous selectionEnd
    const after = text.substring(currentWordStart + currentWord.length);

    editor.value = before + suggestion + ' ' + after;

    const newCursorPos = currentWordStart + suggestion.length + 1;
    editor.setSelectionRange(newCursorPos, newCursorPos);

    hideSuggestions();
}

function getCaretCoordinates(element, position) {
    const div = document.createElement('div');
    const style = getComputedStyle(element);

    for (const prop of style) {
        div.style[prop] = style[prop];
    }

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.textContent = element.value.substring(0, position);

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    document.body.appendChild(div);

    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;

    document.body.removeChild(div);

    const rect = element.getBoundingClientRect();

    return {
        left: rect.left + window.scrollX + spanLeft,
        top: rect.top + window.scrollY + spanTop - element.scrollTop
    };
}


/* 
 * ----------------------------------------------------------------------------
 *  DOCUMENTATION LOGIC
 * ----------------------------------------------------------------------------
 */
const docTableBody = document.querySelector('#docTable tbody');
const docSearchInput = document.getElementById('docSearch');

function populateDocumentation() {
    const mappings = [];

    // Vowels
    for (const [key, val] of Object.entries(vowels)) {
        mappings.push({ type: 'Vowel', key, val });
    }

    // Consonants (using baseConsonants)
    for (const [key, val] of Object.entries(baseConsonants)) {
        mappings.push({ type: 'Consonant', key, val });
    }

    // Sort by key length descending (often more useful), or alphabetical
    // Alphabetical seems better for docs
    mappings.sort((a, b) => a.key.localeCompare(b.key));

    renderDocTable(mappings);

    // Search Listener
    docSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = mappings.filter(m =>
            m.key.toLowerCase().includes(term) || m.val.includes(term)
        );
        renderDocTable(filtered);
    });
}

function renderDocTable(items) {
    docTableBody.innerHTML = '';
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><code style="background:#eee; padding:2px 4px; border-radius:3px; color:#c7254e">${item.key}</code></td><td>${item.val}</td>`;
        docTableBody.appendChild(tr);
    });
}

// Initialize Docs
//populateDocumentation();

window.TamilTyping = {

    attach(id){

        const el = document.getElementById(id);

        if(!el)
            return;

        el.addEventListener("focus", function(){

            editor = this;

        });

        el.addEventListener("input", function(e){

            editor = this;
            handleInput(e);

        });

        el.addEventListener("keydown", function(e){

            editor = this;
            handleKeydown(e);

        });

        el.addEventListener("mouseup", function(){

            editor = this;
            checkSelection();

        });

        el.addEventListener("keyup", function(e){

            editor = this;

            if (!suggestionsBox.classList.contains('hidden') &&
                (e.key === 'ArrowUp' || e.key === 'ArrowDown'))
                return;

            if (typeof e.key === "string") {

                if (e.key.includes("Arrow") || e.key === "Shift") {
                    checkSelection();
                }

            }

        });

    }

};