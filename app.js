var currentUser = null;

window.addEventListener('load', function() {
    console.log('Page loaded!');
    
    if (window.firebaseModules) {
        window.firebaseModules.onAuthStateChanged(window.auth, function(user) {
            currentUser = user;
            updateUI();
        });
    }
    
    setupListeners();
});

function setupListeners() {
    document.getElementById('authBtn').addEventListener('click', function() {
        if (currentUser) {
            window.firebaseModules.signOut(window.auth);
            showToast('Logged out');
        } else {
            document.getElementById('authModal').style.display = 'block';
        }
    });
    
    document.getElementById('authForm').addEventListener('submit', handleAuth);
    document.getElementById('generateImage').addEventListener('click', generateImage);
    document.getElementById('generateAudio').addEventListener('click', generateAudio);
    document.getElementById('speedControl').addEventListener('input', function() {
        document.getElementById('speedValue').textContent = this.value + 'x';
    });
}

function handleAuth(e) {
    e.preventDefault();
    var email = document.getElementById('authEmail').value;
    var password = document.getElementById('authPassword').value;
    var name = document.getElementById('authName').value;
    
    window.firebaseModules.signInWithEmailAndPassword(window.auth, email, password)
        .then(function() {
            document.getElementById('authModal').style.display = 'none';
            showToast('Welcome back!');
        })
        .catch(function() {
            window.firebaseModules.createUserWithEmailAndPassword(window.auth, email, password)
                .then(function(userCredential) {
                    if (name) {
                        return window.firebaseModules.updateProfile(userCredential.user, { displayName: name });
                    }
                })
                .then(function() {
                    document.getElementById('authModal').style.display = 'none';
                    showToast('Account created!');
                })
                .catch(function(error) {
                    document.getElementById('authMessage').textContent = error.message;
                });
        });
}

function updateUI() {
    var authBtn = document.getElementById('authBtn');
    var historyBtn = document.getElementById('historyBtn');
    
    if (currentUser) {
        authBtn.textContent = 'Logout';
        historyBtn.style.display = 'inline-block';
    } else {
        authBtn.textContent = 'Login';
        historyBtn.style.display = 'none';
    }
}

function switchTool(tool) {
    var containers = document.querySelectorAll('.tool-container');
    var buttons = document.querySelectorAll('.tool-btn');
    
    containers.forEach(function(c) {
        c.classList.remove('active');
    });
    buttons.forEach(function(b) {
        b.classList.remove('active');
    });
    
    document.getElementById(tool).classList.add('active');
    event.target.classList.add('active');
}

function generateImage() {
    console.log('GENERATE IMAGE CLICKED!');
    
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
    
    console.log('Showing output section...');
    outputSection.style.display = 'block';
    loader.style.display = 'block';
    resultDiv.innerHTML = '';
    
    document.getElementById('generateImage').disabled = true;
    
    var fullPrompt = prompt + ', high quality, detailed';
    var width = 768;
    var height = 768;
    var seed = Date.now();
    
    var imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(fullPrompt) + '?width=' + width + '&height=' + height + '&seed=' + seed + '&nologo=true';
    
    console.log('IMAGE URL:', imageUrl);
    console.log('Creating HTML...');
    
    setTimeout(function() {
        loader.style.display = 'none';
        
        resultDiv.innerHTML = 
            '<div class="result-item">' +
            '<h3 style="color: green;">✅ Image Generated!</h3>' +
            '<p style="font-size: 12px; word-break: break-all; background: #f0f0f0; padding: 10px; margin: 10px 0;">URL: ' + imageUrl + '</p>' +
            '<img src="' + imageUrl + '" alt="Generated" style="max-width: 100%; border-radius: 12px; border: 3px solid green; display: block; margin: 10px 0;">' +
            '<p><strong>Prompt:</strong> ' + prompt + '</p>' +
            '<p><strong>Size:</strong> ' + width + 'x' + height + '</p>' +
            '<button class="download-btn" onclick="window.open(\'' + imageUrl + '\', \'_blank\')">Download Image</button>' +
            '<button class="download-btn" style="background: #6366f1;" onclick="generateImage()">Regenerate</button>' +
            '</div>';
        
        console.log('HTML INSERTED!');
        console.log('Result div content:', resultDiv.innerHTML);
        
        document.getElementById('generateImage').disabled = false;
        
        if (window.db && currentUser) {
            window.firebaseModules.addDoc(
                window.firebaseModules.collection(window.db, 'history'),
                {
                    userId: currentUser.uid,
                    type: 'image',
                    prompt: prompt,
                    fileUrl: imageUrl,
                    createdAt: window.firebaseModules.serverTimestamp()
                }
            ).catch(function(e) {
                console.log('History save failed:', e);
            });
        }
        
        showToast('Image generated!');
    }, 1000);
}

function generateAudio() {
    var text = document.getElementById('audioPrompt').value.trim();
    
    if (!text) {
        showToast('Please enter text!');
        return;
    }
    
    if (!currentUser) {
        showToast('Please login first!');
        document.getElementById('authModal').style.display = 'block';
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
    
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document.getElementById('voiceLanguage').value;
    utterance.rate = parseFloat(document.getElementById('speedControl').value);
    
    window.currentUtterance = utterance;
    window.currentText = text;
    
    setTimeout(function() {
        loader.style.display = 'none';
        
        resultDiv.innerHTML = 
            '<div class="result-item">' +
            '<p><strong>Text:</strong> ' + text + '</p>' +
            '<button class="voice-play-btn" onclick="playAudio()">▶ Play Audio</button>' +
            '<button class="voice-stop-btn" onclick="stopAudio()">⏹ Stop</button>' +
            '</div>';
        
        document.getElementById('generateAudio').disabled = false;
        showToast('Audio ready!');
        
        playAudio();
    }, 500);
}

function playAudio() {
    if (window.currentUtterance) {
        window.speechSynthesis.speak(window.currentUtterance);
        showToast('Playing audio...');
    }
}

function stopAudio() {
    window.speechSynthesis.cancel();
    showToast('Stopped');
}

function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(function() {
        toast.classList.remove('show');
    }, 3000);
}

console.log('App.js loaded!');
