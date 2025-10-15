// ========================================
// PICTONE - Complete Application
// Only Image Generation Fixed
// Everything Else Same
// ========================================

let currentUser = null;
let currentTool = 'text-to-image';
let isAuthMode = 'login';
let generationCount = 0;
let currentHistoryFilter = 'all';
let historyCache = null;
let historyCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// ========================================
// Initialize Application
// ========================================

window.addEventListener('load', () => {
    initializeApp();
});

function initializeApp() {
    if (!window.firebaseModules) {
        console.error('Firebase not loaded!');
        showToast('⚠️ Firebase not configured. Please check your setup.');
        return;
    }

    window.firebaseModules.onAuthStateChanged(window.auth, (user) => {
        currentUser = user;
        updateUI();
        console.log('User state:', user ? user.email : 'Not logged in');
    });

    setupEventListeners();
    updateRangeValues();
    
    console.log('✅ PICTONE initialized successfully!');
}

// ========================================
// Event Listeners Setup
// ========================================

function setupEventListeners() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTool(btn.dataset.tool);
        });
    });

    const authModal = document.getElementById('authModal');
    const authBtn = document.getElementById('authBtn');
    const closeButtons = document.querySelectorAll('.close');

    authBtn.addEventListener('click', () => {
        if (currentUser) {
            handleLogout();
        } else {
            authModal.style.display = 'block';
        }
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            authModal.style.display = 'none';
            document.getElementById('historyModal').style.display = 'none';
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab) switchAuthMode(tab);
        });
    });

    document.getElementById('authForm').addEventListener('submit', handleAuth);
    document.getElementById('historyBtn').addEventListener('click', showHistory);
    document.getElementById('generateImage').addEventListener('click', generateImage);
    document.getElementById('generateAudio').addEventListener('click', generateAudio);
    
    document.getElementById('speedControl').addEventListener('input', updateRangeValues);
    const pitchControl = document.getElementById('pitchControl');
    if (pitchControl) {
        pitchControl.addEventListener('input', updateRangeValues);
    }

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function updateRangeValues() {
    const speedControl = document.getElementById('speedControl');
    const pitchControl = document.getElementById('pitchControl');
    
    if (speedControl) {
        document.getElementById('speedValue').textContent = speedControl.value + 'x';
    }
    if (pitchControl) {
        document.getElementById('pitchValue').textContent = pitchControl.value;
    }
}

// ========================================
// Tool Switching
// ========================================

function switchTool(tool) {
    currentTool = tool;
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    
    document.querySelectorAll('.tool-container').forEach(container => {
        container.classList.toggle('active', container.id === tool);
    });
}

// ========================================
// Authentication
// ========================================

function switchAuthMode(mode) {
    isAuthMode = mode;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === mode);
    });
    
    const nameGroup = document.getElementById('nameGroup');
    const title = mode === 'login' ? 'Login to PICTONE' : 'Create Your Account';
    const btnText = mode === 'login' ? 'Login' : 'Sign Up';
    
    document.getElementById('authTitle').textContent = title;
    document.getElementById('authSubmit').textContent = btnText;
    document.getElementById('authMessage').textContent = '';
    
    if (nameGroup) {
        nameGroup.style.display = mode === 'signup' ? 'block' : 'none';
    }
}

async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName') ? document.getElementById('authName').value.trim() : '';
    const messageEl = document.getElementById('authMessage');
    
    if (!email || !password) {
        messageEl.textContent = 'Please fill in all fields!';
        return;
    }
    
    if (isAuthMode === 'signup' && !name) {
        messageEl.textContent = 'Please enter your name!';
        return;
    }
    
    try {
        if (isAuthMode === 'login') {
            await window.firebaseModules.signInWithEmailAndPassword(window.auth, email, password);
            showToast('🎉 Welcome back!');
        } else {
            const userCredential = await window.firebaseModules.createUserWithEmailAndPassword(window.auth, email, password);
            
            await window.firebaseModules.updateProfile(userCredential.user, {
                displayName: name
            });
            
            showToast('🎉 Account created! Welcome to PICTONE!');
        }
        
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('authForm').reset();
    } catch (error) {
        console.error('Auth error:', error);
        messageEl.textContent = getErrorMessage(error.code);
    }
}

function getErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'Email already registered!',
        'auth/invalid-email': 'Invalid email address!',
        'auth/user-not-found': 'No account found with this email!',
        'auth/wrong-password': 'Incorrect password!',
        'auth/weak-password': 'Password should be at least 6 characters!',
        'auth/invalid-credential': 'Invalid email or password!',
    };
    return messages[code] || 'An error occurred. Please try again.';
}

function handleLogout() {
    window.firebaseModules.signOut(window.auth);
    showToast('👋 Logged out successfully');
    historyCache = null;
}

function updateUI() {
    const authBtn = document.getElementById('authBtn');
    const historyBtn = document.getElementById('historyBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    if (currentUser) {
        if (userInfo) userInfo.style.display = 'flex';
        if (userName) userName.textContent = currentUser.displayName || 'User';
        if (userEmail) userEmail.textContent = currentUser.email;
        
        authBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        historyBtn.style.display = 'block';
    } else {
        if (userInfo) userInfo.style.display = 'none';
        authBtn.innerHTML = '<i class="fas fa-user"></i> Login';
        historyBtn.style.display = 'none';
    }
}

// ========================================
// TEXT TO IMAGE GENERATION - FIXED VERSION
// ========================================

async function generateImage() {
    const prompt = document.getElementById('imagePrompt').value.trim();
    const style = document.getElementById('imageStyle').value;
    const quality = document.getElementById('imageQuality').value;
    const aspectRatio = document.getElementById('aspectRatio').value;
    const enhancement = document.getElementById('imageEnhancement') ? document.getElementById('imageEnhancement').value : '';
    
    if (!prompt) {
        showToast('⚠️ Please enter a prompt!');
        return;
    }
    
    if (!currentUser) {
        showToast('🔐 Please login to generate images!');
        document.getElementById('authModal').style.display = 'block';
        return;
    }
    
    const outputSection = document.getElementById('imageOutput');
    const loader = document.getElementById('imageLoader');
    const resultDiv = document.getElementById('imageResult');
    
    outputSection.style.display = 'block';
    loader.style.display = 'block';
    resultDiv.innerHTML = '';
    
    document.getElementById('generateImage').disabled = true;
    
    const startTime = Date.now();
    
    try {
        // Build enhanced prompt
        let enhancedPrompt = prompt;
        
        if (style) {
            const styles = {
                'anime': ', anime style, vibrant colors',
                'photographic': ', professional photography, 4K',
                'digital-art': ', digital art, detailed',
                'comic-book': ', comic book style',
                'fantasy-art': ', fantasy art, detailed',
                'analog-film': ', film photo, vintage',
                'neon-punk': ', cyberpunk, neon lights',
                'isometric': ', isometric view',
                'low-poly': ', low poly, 3D',
                'origami': ', paper art',
                'line-art': ', line art',
                'cinematic': ', cinematic lighting',
                '3d-model': ', 3D render',
                'pixel-art': ', pixel art'
            };
            enhancedPrompt += styles[style] || '';
        }
        
        if (enhancement) {
            const enhance = {
                'enhance': ', masterpiece, best quality',
                'sharp': ', ultra sharp, 8K',
                'vibrant': ', vibrant colors'
            };
            enhancedPrompt += enhance[enhancement] || '';
        }
        
        enhancedPrompt += ', high quality, detailed';
        
        // Get dimensions
        const qualityMult = { 'standard': 1, 'hd': 1.5, '4k': 2 };
        const mult = qualityMult[quality] || 1;
        
        const baseDims = {
            '1:1': [768, 768],
            '16:9': [896, 512],
            '9:16': [512, 896],
            '4:3': [768, 576],
            '21:9': [1024, 440]
        };
        
        const [baseW, baseH] = baseDims[aspectRatio] || baseDims['1:1'];
        const width = Math.floor(baseW * mult);
        const height = Math.floor(baseH * mult);
        
        // Generate image URL
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
        
        console.log('🎨 Image URL:', imageUrl);
        
        // Calculate time
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Display image
        resultDiv.innerHTML = `
            <div class="result-item">
                <img src="${imageUrl}" alt="Generated Image" crossorigin="anonymous" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div class="result-info">
                    <p><strong>Prompt:</strong> ${prompt}</p>
                    <p><strong>Style:</strong> ${style || 'Natural'} | <strong>Quality:</strong> ${quality.toUpperCase()} | <strong>Size:</strong> ${width}x${height}</p>
                    <p><strong>⏱️ Generated in:</strong> ${timeTaken}s</p>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem;">
                    <button class="download-btn" onclick="downloadImageFromUrl('${imageUrl}', '${prompt.replace(/'/g, "\\'")}')">
                        <i class="fas fa-download"></i> Download Image
                    </button>
                    <button class="download-btn" style="background: #6366f1;" onclick="generateImage()">
                        <i class="fas fa-sync"></i> Regenerate
                    </button>
                </div>
            </div>
        `;
        
        // Save to history
        await saveToHistory('image', prompt, imageUrl, {
            style: style || 'Natural',
            quality: quality,
            dimensions: `${width}x${height}`,
            timeTaken: timeTaken
        });
        
        generationCount++;
        showToast(`✨ Image generated in ${timeTaken}s!`);
        
        loader.style.display = 'none';
        document.getElementById('generateImage').disabled = false;
        
    } catch (error) {
        console.error('Generation error:', error);
        showToast('❌ Error generating image. Please try again.');
        
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: #ef4444; margin-bottom: 1rem;">Failed to generate image. Please try again.</p>
                <button class="btn-generate" onclick="generateImage()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        
        loader.style.display = 'none';
        document.getElementById('generateImage').disabled = false;
    }
}

async function downloadImageFromUrl(url, prompt) {
    try {
        showToast('📥 Downloading image...');
        
        const response = await fetch(url);
        const blob = await response.blob();
        
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `pictone_${sanitizeFilename(prompt)}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        showToast('✅ Image downloaded successfully!');
    } catch (error) {
        console.error('Download error:', error);
        window.open(url, '_blank');
        showToast('✅ Image opened in new tab!');
    }
}

function sanitizeFilename(text) {
    return text.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// ========================================
// TEXT TO AUDIO GENERATION - NOT CHANGED
// ========================================

async function generateAudio() {
    const text = document.getElementById('audioPrompt').value.trim();
    const language = document.getElementById('voiceLanguage').value;
    const gender = document.getElementById('voiceGender').value;
    const speed = parseFloat(document.getElementById('speedControl').value);
    const emotion = document.getElementById('voiceEmotion') ? document.getElementById('voiceEmotion').value : 'general';
    
    if (!text) {
        showToast('⚠️ Please enter text!');
        return;
    }
    
    if (text.length > 500) {
        showToast('⚠️ Text too long! Max 500 characters for best quality.');
        return;
    }
    
    if (!currentUser) {
        showToast('🔐 Please login to generate audio!');
        document.getElementById('authModal').style.display = 'block';
        return;
    }
    
    if (!('speechSynthesis' in window)) {
        showToast('❌ Your browser does not support text-to-speech');
        return;
    }
    
    const outputSection = document.getElementById('audioOutput');
    const loader = document.getElementById('audioLoader');
    const resultDiv = document.getElementById('audioResult');
    
    outputSection.style.display = 'block';
    loader.style.display = 'block';
    resultDiv.innerHTML = '';
    
    document.getElementById('generateAudio').disabled = true;
    
    try {
        console.log('🎙️ Generating audio with Browser Speech API...');
        
        window.speechSynthesis.cancel();
        
        const voices = await loadVoices();
        console.log('Available voices:', voices.length);
        
        const selectedVoice = selectBestVoice(voices, language, gender);
        console.log('Selected voice:', selectedVoice ? selectedVoice.name : 'Default');
        
        const audioId = 'audio_' + Date.now();
        const voiceName = selectedVoice ? selectedVoice.name : 'Default Voice';
        
        window.currentAudioText = text;
        window.currentAudioVoice = selectedVoice;
        window.currentAudioLang = language;
        window.currentAudioSpeed = speed;
        
        resultDiv.innerHTML = `
            <div class="result-item">
                <div class="audio-visualizer premium-visualizer">
                    <div class="audio-info-badge premium-badge">
                        <i class="fas fa-volume-up"></i>
                        <span>Browser TTS - ${voiceName}</span>
                    </div>
                    <div class="voice-details">
                        <span class="detail-chip">${gender === 'female' ? '👩 Female' : '👨 Male'}</span>
                        <span class="detail-chip">🌍 ${getLanguageName(language)}</span>
                        <span class="detail-chip">⚡ ${Math.round(speed * 100)}%</span>
                    </div>
                </div>
                
                <div class="audio-player-container premium-player">
                    <div class="voice-player">
                        <button class="voice-play-btn" id="playBtn_${audioId}" onclick="playVoiceNow()">
                            <i class="fas fa-play-circle"></i>
                            <span>Play Audio</span>
                        </button>
                        <button class="voice-stop-btn" id="stopBtn_${audioId}" onclick="stopVoice()" style="display:none;">
                            <i class="fas fa-stop-circle"></i>
                            <span>Stop</span>
                        </button>
                        <div class="voice-status" id="status_${audioId}"></div>
                    </div>
                </div>
                
                <div class="result-info">
                    <p><strong>📝 Text:</strong> ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}</p>
                    <p><strong>🎤 Voice:</strong> ${voiceName}</p>
                    <p style="color: #10b981; font-weight: 600;"><i class="fas fa-check-circle"></i> Audio Ready - Click Play!</p>
                </div>
                
                <div class="audio-actions">
                    <button class="download-btn" style="background: #6366f1;" onclick="playVoiceNow()">
                        <i class="fas fa-play"></i> Play Now
                    </button>
                    <button class="download-btn" style="background: #8b5cf6;" onclick="generateAudio()">
                        <i class="fas fa-sync"></i> Regenerate
                    </button>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            playVoiceNow();
        }, 500);
        
        await saveToHistory('audio', text, 'browser_tts', {
            language: language,
            gender: gender,
            voice: voiceName,
            speed: speed
        });
        
        generationCount++;
        showToast(`✅ Audio ready! Click Play to hear it.`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('❌ ' + error.message);
        
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <p style="color: #ef4444; font-weight: 600;">Failed to generate audio</p>
                <p style="color: #666; margin: 1rem 0;">${error.message}</p>
                <button class="btn-generate" onclick="generateAudio()">
                
