// ========================================
// PICTONE - COMPLETE WORKING VERSION
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
// Initialize
// ========================================

window.addEventListener('load', function() {
    initializeApp();
});

function initializeApp() {
    if (!window.firebaseModules) {
        console.error('Firebase not loaded!');
        showToast('⚠️ Firebase not configured');
        return;
    }

    window.firebaseModules.onAuthStateChanged(window.auth, function(user) {
        currentUser = user;
        updateUI();
        console.log('User:', user ? user.email : 'Not logged in');
    });

    setupEventListeners();
    updateRangeValues();
    
    console.log('✅ PICTONE loaded!');
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Tool switching
    var toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            switchTool(btn.dataset.tool);
        });
    });

    // Auth
    var authModal = document.getElementById('authModal');
    var authBtn = document.getElementById('authBtn');
    
    authBtn.addEventListener('click', function() {
        if (currentUser) {
            handleLogout();
        } else {
            authModal.style.display = 'block';
        }
    });

    // Close buttons
    var closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            authModal.style.display = 'none';
            document.getElementById('historyModal').style.display = 'none';
        });
    });

    // Auth tabs
    var tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tab = btn.dataset.tab;
            if (tab) switchAuthMode(tab);
        });
    });

    // Forms
    document.getElementById('authForm').addEventListener('submit', handleAuth);
    document.getElementById('historyBtn').addEventListener('click', showHistory);
    document.getElementById('generateImage').addEventListener('click', generateImage);
    document.getElementById('generateAudio').addEventListener('click', generateAudio);
    
    // Range inputs
    document.getElementById('speedControl').addEventListener('input', updateRangeValues);
    var pitchControl = document.getElementById('pitchControl');
    if (pitchControl) {
        pitchControl.addEventListener('input', updateRangeValues);
    }

    // Close modal on outside click
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function updateRangeValues() {
    var speedControl = document.getElementById('speedControl');
    var pitchControl = document.getElementById('pitchControl');
    
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
    
    var toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(function(btn) {
        if (btn.dataset.tool === tool) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    var containers = document.querySelectorAll('.tool-container');
    containers.forEach(function(container) {
        if (container.id === tool) {
            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }
    });
}

// ========================================
// Authentication
// ========================================

function switchAuthMode(mode) {
    isAuthMode = mode;
    
    var tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(function(btn) {
        if (btn.dataset.tab === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    var nameGroup = document.getElementById('nameGroup');
    var title = mode === 'login' ? 'Login to PICTONE' : 'Create Your Account';
    var btnText = mode === 'login' ? 'Login' : 'Sign Up';
    
    document.getElementById('authTitle').textContent = title;
    document.getElementById('authSubmit').textContent = btnText;
    document.getElementById('authMessage').textContent = '';
    
    if (nameGroup) {
        nameGroup.style.display = mode === 'signup' ? 'block' : 'none';
    }
}

function handleAuth(e) {
    e.preventDefault();
    
    var email = document.getElementById('authEmail').value.trim();
    var password = document.getElementById('authPassword').value;
    var nameInput = document.getElementById('authName');
    var name = nameInput ? nameInput.value.trim() : '';
    var messageEl = document.getElementById('authMessage');
    
    if (!email || !password) {
        messageEl.textContent = 'Please fill in all fields!';
        return;
    }
    
    if (isAuthMode === 'signup' && !name) {
        messageEl.textContent = 'Please enter your name!';
        return;
    }
    
    if (isAuthMode === 'login') {
        window.firebaseModules.signInWithEmailAndPassword(window.auth, email, password)
            .then(function() {
                showToast('🎉 Welcome back!');
                document.getElementById('authModal').style.display = 'none';
                document.getElementById('authForm').reset();
            })
            .catch(function(error) {
                console.error('Login error:', error);
                messageEl.textContent = getErrorMessage(error.code);
            });
    } else {
        window.firebaseModules.createUserWithEmailAndPassword(window.auth, email, password)
            .then(function(userCredential) {
                return window.firebaseModules.updateProfile(userCredential.user, {
                    displayName: name
                });
            })
            .then(function() {
                showToast('🎉 Account created!');
                document.getElementById('authModal').style.display = 'none';
                document.getElementById('authForm').reset();
            })
            .catch(function(error) {
                console.error('Signup error:', error);
                messageEl.textContent = getErrorMessage(error.code);
            });
    }
}

function getErrorMessage(code) {
    var messages = {
        'auth/email-already-in-use': 'Email already registered!',
        'auth/invalid-email': 'Invalid email address!',
        'auth/user-not-found': 'No account found!',
        'auth/wrong-password': 'Incorrect password!',
        'auth/weak-password': 'Password should be at least 6 characters!',
        'auth/invalid-credential': 'Invalid email or password!'
    };
    return messages[code] || 'An error occurred. Please try again.';
}

function handleLogout() {
    window.firebaseModules.signOut(window.auth);
    showToast('👋 Logged out');
    historyCache = null;
}

function updateUI() {
    var authBtn = document.getElementById('authBtn');
    var historyBtn = document.getElementById('historyBtn');
    var userInfo = document.getElementById('userInfo');
    var userName = document.getElementById('userName');
    var userEmail = document.getElementById('userEmail');
    
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
// IMAGE GENERATION - GUARANTEED WORKING
// ========================================

function generateImage() {
    console.log('🎨 Generate Image clicked!');
    
    var prompt = document.getElementById('imagePrompt').value.trim();
    console.log('Prompt:', prompt);
    
    if (!prompt) {
        alert('Please enter a prompt!');
        return;
    }
    
    if (!currentUser) {
        alert('Please login first!');
        document.getElementById('authModal').style.display = 'block';
        return;
    }
    
    var outputSection = document.getElementById('imageOutput');
    var loader = document.getElementById('imageLoader');
    var resultDiv = document.getElementById('imageResult');
    
    console.log('Elements:', outputSection, loader, resultDiv);
    
    outputSection.style.display = 'block';
    loader.style.display = 'block';
    resultDiv.innerHTML = '';
    
    document.getElementById('generateImage').disabled = true;
    
    var style = document.getElementById('imageStyle').value;
    var quality = document.getElementById('imageQuality').value;
    var aspectRatio = document.getElementById('aspectRatio').value;
    
    var fullPrompt = prompt + ', high quality, detailed';
    
    var width = 768;
    var height = 768;
    
    if (aspectRatio === '16:9') {
        width = 1024;
        height = 576;
    } else if (aspectRatio === '9:16') {
        width = 576;
        height = 1024;
    } else if (aspectRatio === '4:3') {
        width = 896;
        height = 672;
    }
    
    if (quality === 'hd') {
        width = Math.floor(width * 1.3);
        height = Math.floor(height * 1.3);
    } else if (quality === '4k') {
        width = Math.floor(width * 1.6);
        height = Math.floor(height * 1.6);
    }
    
    var seed = Date.now();
    var imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(fullPrompt) + '?width=' + width + '&height=' + height + '&seed=' + seed + '&nologo=true';
    
    console.log('IMAGE URL:', imageUrl);
    
    var html = '';
    html += '<div class="result-item">';
    html += '<img src="' + imageUrl + '" alt="Generated Image" style="max-width:100%; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display:block;">';
    html += '<div style="margin-top:1rem;">';
    html += '<p><strong>Prompt:</strong> ' + prompt + '</p>';
    html += '<p><strong>Size:</strong> ' + width + 'x' + height + '</p>';
    html += '</div>';
    html += '<div style="display:flex; gap:1rem; margin-top:1rem; flex-wrap:wrap;">';
    html += '<button class="download-btn" onclick="window.open(\'' + imageUrl + '\', \'_blank\')"><i class="fas fa-download"></i> Download</button>';
    html += '<button class="download-btn" style="background:#6366f1;" onclick="generateImage()"><i class="fas fa-sync"></i> Regenerate</button>';
    html += '</div>';
    html += '</div>';
    
    resultDiv.innerHTML = html;
    
    console.log('HTML inserted!');
    
    loader.style.display = 'none';
    document.getElementById('generateImage').disabled = false;
    
    if (window.db && currentUser) {
        window.firebaseModules.addDoc(
            window.firebaseModules.collection(window.db, 'history'),
            {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                type: 'image',
                prompt: prompt,
                fileUrl: imageUrl,
                createdAt: window.firebaseModules.serverTimestamp()
            }
        ).then(function() {
            console.log('Saved to history');
        }).catch(function(e) {
            console.log('History save failed:', e);
        });
    }
    
    generationCount++;
    showToast('✅ Image generated!');
}

// ========================================
// AUDIO GENERATION - NOT CHANGED
// ========================================

function generateAudio() {
    var text = document.getElementById('audioPrompt').value.trim();
    var language = document.getElementById('voiceLanguage').value;
    var gender = document.getElementById('voiceGender').value;
    var speed = parseFloat(document.getElementById('speedControl').value);
    
    if (!text) {
        showToast('⚠️ Please enter text!');
        return;
    }
    
    if (!currentUser) {
        showToast('🔐 Please login first!');
        document.getElementById('authModal').style.display = 'block';
        return;
    }
    
    if (!('speechSynthesis' in window)) {
        showToast('❌ Browser does not support text-to-speech');
        return;
    }
    
    var outputSection = document.getElementById('audioOutput');
    var loader = document.getElementById('audioLoader');
    var resultDiv = document.getElementById('audioResult');
    
    outputSection.style.display = 'block';
    loader.style.display = 'block';
    resultDiv.innerHTML = '';
    
    document.getElementById('generateAudio').disabled = true;
    
    window.speechSynthesis.cancel();
    
    loadVoices().then(function(voices) {
        var selectedVoice = selectBestVoice(voices, language, gender);
        var voiceName = selectedVoice ? selectedVoice.name : 'Default';
        
        window.currentAudioText = text;
        window.currentAudioVoice = selectedVoice;
        window.currentAudioLang = language;
        window.currentAudioSpeed = speed;
        
        var audioId = 'audio_' + Date.now();
        
        var html = '';
        html += '<div class="result-item">';
        html += '<div class="audio-visualizer premium-visualizer">';
        html += '<div class="audio-info-badge premium-badge">';
        html += '<i class="fas fa-volume-up"></i>';
        html += '<span>Browser TTS - ' + voiceName + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<div class="audio-player-container premium-player">';
        html += '<div class="voice-player">';
        html += '<button class="voice-play-btn" onclick="playVoiceNow()"><i class="fas fa-play-circle"></i> <span>Play Audio</span></button>';
        html += '<button class="voice-stop-btn" onclick="stopVoice()" style="display:none;"><i class="fas fa-stop-circle"></i> <span>Stop</span></button>';
        html += '<div class="voice-status"></div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="result-info">';
        html += '<p><strong>📝 Text:</strong> ' + text.substring(0, 200) + '</p>';
        html += '<p><strong>🎤 Voice:</strong> ' + voiceName + '</p>';
        html += '</div>';
        html += '<div class="audio-actions">';
        html += '<button class="download-btn" style="background:#6366f1;" onclick="playVoiceNow()"><i class="fas fa-play"></i> Play Now</button>';
        html += '<button class="download-btn" style="background:#8b5cf6;" onclick="generateAudio()"><i class="fas fa-sync"></i> Regenerate</button>';
        html += '</div>';
        html += '</div>';
        
        resultDiv.innerHTML = html;
        
        loader.style.display = 'none';
        document.getElementById('generateAudio').disabled = false;
        
        setTimeout(function() {
            playVoiceNow();
        }, 500);
        
        showToast('✅ Audio ready!');
    });
}

function loadVoices() {
    return new Promise(function(resolve) {
        var voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
            return;
        }
        
        window.speechSynthesis.onvoiceschanged = function() {
            resolve(window.speechSynthesis.getVoices());
        };
        
        setTimeout(function() {
            resolve(window.speechSynthesis.getVoices());
        }, 2000);
    });
}

function selectBestVoice(voices, language, gender) {
    if (!voices || voices.length === 0) return null;
    
    var langCode = language.split('-')[0].toLowerCase();
    var femaleWords = ['female', 'woman', 'samantha', 'victoria', 'zira'];
    var maleWords = ['male', 'man', 'david', 'mark'];
    var genderWords = gender === 'female' ? femaleWords : maleWords;
    
    for (var i = 0; i < voices.length; i++) {
        var v = voices[i];
        var vLang = v.lang.toLowerCase();
        var vName = v.name.toLowerCase();
        
        if (vLang.includes(language.toLowerCase())) {
            for (var j = 0; j < genderWords.length; j++) {
                if (vName.includes(genderWords[j])) {
                    return v;
                }
            }
        }
    }
    
    for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang.toLowerCase().startsWith(langCode)) {
            return voices[i];
        }
    }
    
    return voices[0];
}

function playVoiceNow() {
    if (!window.currentAudioText) {
        showToast('❌ No text');
        return;
    }
    
    window.speechSynthesis.cancel();
    
    var utterance = new SpeechSynthesisUtterance(window.currentAudioText);
    utterance.lang = window.currentAudioLang || 'en-US';
    utterance.rate = window.currentAudioSpeed || 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    if (window.currentAudioVoice) {
        utterance.voice = window.currentAudioVoice;
    }
    
    var playBtns = document.querySelectorAll('.voice-play-btn');
    var stopBtns = document.querySelectorAll('.voice-stop-btn');
    var statuses = document.querySelectorAll('.voice-status');
    
    utterance.onstart = function() {
        showToast('🔊 Playing...');
        playBtns.forEach(function(btn) { btn.style.display = 'none'; });
        stopBtns.forEach(function(btn) { btn.style.display = 'flex'; });
        statuses.forEach(function(s) {
            s.innerHTML = '<i class="fas fa-volume-up"></i> Playing...';
            s.style.color = '#10b981';
        });
    };
    
    utterance.onend = function() {
        showToast('✅ Finished');
        playBtns.forEach(function(btn) { btn.style.display = 'flex'; });
        stopBtns.forEach(function(btn) { btn.style.display = 'none'; });
    };
    
    window.speechSynthesis.speak(utterance);
}

function stopVoice() {
    window.speechSynthesis.cancel();
    showToast('⏹️ Stopped');
    
    var playBtns = document.querySelectorAll('.voice-play-btn');
    var stopBtns = document.querySelectorAll('.voice-stop-btn');
    
    playBtns.forEach(function(btn) { btn.style.display = 'flex'; });
    stopBtns.forEach(function(btn) { btn.style.display = 'none'; });
}

function getLanguageName(code) {
    var names = {
        'en-US': 'English (US)',
        'en-GB': 'English (UK)',
        'en-AU': 'English (Australia)',
        'en-IN': 'English (India)',
        'es-ES': 'Spanish',
        'fr-FR': 'French',
        'de-DE': 'German',
        'it-IT': 'Italian',
        'pt-BR': 'Portuguese',
        'ja-JP': 'Japanese',
        'ko-KR': 'Korean',
        'zh-CN': 'Chinese'
    };
    return names[code] || code;
}

// ========================================
// History
// ========================================

function showHistory() {
    if (!currentUser) {
        showToast('🔐 Please login!');
        return;
    }
    
    var modal = document.getElementById('historyModal');
    var content = document.getElementById('historyContent');
    
    modal.style.display = 'block';
    content.innerHTML = '<div class="loader"><div class="loader-ring"></div></div>';
    
    var q = window.firebaseModules.query(
        window.firebaseModules.collection(window.db, 'history'),
        window.firebaseModules.where('userId', '==', currentUser.uid),
        window.firebaseModules.orderBy('createdAt', 'desc'),
        window.firebaseModules.limit(20)
    );
    
    window.firebaseModules.getDocs(q).then(function(querySnapshot) {
        if (querySnapshot.empty) {
            content.innerHTML = '<p style="text-align:center; padding:3rem;">No history yet</p>';
            return;
        }
        
        content.innerHTML = '';
        
        querySnapshot.forEach(function(doc) {
            var data = doc.data();
            var item = document.createElement('div');
            item.className = 'history-item';
            item.dataset.type = data.type;
            
            if (data.type === 'image') {
                item.innerHTML = '<img src="' + data.fileUrl + '" alt="Generated" loading="lazy">' +
                    '<div class="result-info"><p><strong>Prompt:</strong> ' + data.prompt.substring(0, 80) + '</p></div>' +
                    '<button class="download-btn" onclick="window.open(\'' + data.fileUrl + '\', \'_blank\')"><i class="fas fa-download"></i> Download</button>';
            } else {
                item.innerHTML = '<div style="padding:2rem; text-align:center;"><i class="fas fa-music" style="font-size:3rem; color:#6366f1;"></i></div>' +
                    '<div class="result-info"><p><strong>Text:</strong> ' + data.prompt.substring(0, 100) + '</p></div>';
            }
            
            content.appendChild(item);
        });
        
        showToast('✅ Loaded ' + querySnapshot.size + ' items');
    }).catch(function(error) {
        console.error('History error:', error);
        content.innerHTML = '<p style="text-align:center; color:#ef4444;">Error loading history</p>';
    });
}

function filterHistory(filter) {
    currentHistoryFilter = filter;
    
    var filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(function(btn) {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    var items = document.querySelectorAll('.history-item');
    items.forEach(function(item) {
        if (filter === 'all') {
            item.style.display = 'block';
        } else {
            item.style.display = item.dataset.type === filter ? 'block' : 'none';
        }
    });
}

function closeHistory() {
    document.getElementById('historyModal').style.display = 'none';
}

// ========================================
// Utilities
// ========================================

function setPrompt(prompt) {
    document.getElementById('imagePrompt').value = prompt;
    document.getElementById('imagePrompt').focus();
    showToast('✅ Prompt set!');
}

function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(function() {
        toast.classList.remove('show');
    }, 3000);
}

console.log('🚀 PICTONE ready!');
