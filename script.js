let pageFlipInstance = null;

function toggleSubMenu() {
    var submenu = document.getElementById("grammarSubMenu");
    var arrow = document.querySelector(".arrow");
    
    if (submenu.style.maxHeight) {
        submenu.style.maxHeight = null;
        submenu.style.marginTop = "0";
        arrow.style.transform = "rotate(0deg)";
    } else {
        submenu.style.maxHeight = submenu.scrollHeight + "px";
        submenu.style.marginTop = "12px"; 
        arrow.style.transform = "rotate(180deg)";
    }
}


function formatFileName(topic, type) {
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    return capitalizedTopic + '_' + type + '.json'; 
}

async function openBook(topic) {
    const overlay = document.getElementById("bookOverlay");
    const wrapper = document.querySelector(".book-wrapper");

    if (pageFlipInstance !== null) {
        pageFlipInstance.destroy();
        pageFlipInstance = null;
    }

    wrapper.innerHTML = '<div id="magicalBook"></div>';
    const bookEl = document.getElementById("magicalBook");

    try {
        
        const fileName = formatFileName(topic, 'data');
        const response = await fetch('data/' + fileName); 
        
        if (!response.ok) throw new Error("Book JSON file nahi mili!");

        const contentPages = await response.json();

        contentPages.forEach((text, index) => {
            const pageDiv = document.createElement("div");
            pageDiv.className = "page";
            const title = topic.toUpperCase();
            
            let extraHTML = "";
            
            if (index === contentPages.length - 1) {
                extraHTML = `
                <div style="text-align: center; margin-top: 40px;">
                    <button class="capsule-btn" style="width: 180px; box-shadow: 0 0 15px #a855f7;" onclick="openQuiz('${topic}')">
                        Start Quiz ✦
                    </button>
                </div>`;
            }
            
            pageDiv.innerHTML = `
                <div class="page-content">
                    <h2 class="page-title">${title} - Page ${index + 1}</h2>
                    <p class="page-text">${text}</p>
                    ${extraHTML}
                </div>
            `;
            bookEl.appendChild(pageDiv);
        });

        overlay.classList.add("active");

        pageFlipInstance = new St.PageFlip(bookEl, {
            width: 400, height: 500, size: "stretch", 
            minWidth: 300, maxWidth: 400, minHeight: 400, maxHeight: 500,
            showCover: false, mobileScrollSupport: true, usePortrait: true ,
            swipeDistance: 100
        });

        pageFlipInstance.loadFromHTML(document.querySelectorAll('.page'));

    } catch (error) {
        console.error("Error:", error);
        alert(`Error: ${formatFileName(topic, 'data')} file nahi mili. Live Server check karein.`);
    }
}

function closeBook() {
    document.getElementById("bookOverlay").classList.remove("active");
}



async function openQuiz(topic) {
    const quizOverlay = document.getElementById("quizOverlay");
    const quizContent = document.getElementById("quizContent");
    const quizTitle = document.getElementById("quizTitle");

    quizContent.innerHTML = "<p style='color: white; text-align: center;'>Loading Jaadui Quiz...</p>";
    quizOverlay.classList.add("active");

    try {
        
        const fileName = formatFileName(topic, 'quiz');
        const response = await fetch('data/' + fileName);
        
        if (!response.ok) throw new Error("Quiz JSON file nahi mili!");

        const quizData = await response.json();
        quizTitle.innerHTML = `${topic.toUpperCase()} QUIZ ✦`;
        
        let htmlBuilder = "";
        
        
        quizData.forEach((item, index) => {
            htmlBuilder += `
                <div class="quiz-question-box">
                    <p class="quiz-question">Q${index + 1}. ${item.question}</p>
                    <div class="quiz-options">
                        ${item.options.map(opt => `
                            <button class="quiz-option-btn" onclick="checkAnswer(this, '${opt}', '${item.answer}')">${opt}</button>
                        `).join("")}
                    </div>
                </div>
            `;
        });

        quizContent.innerHTML = htmlBuilder;

    } catch (error) {
        console.error("Error:", error);
        quizContent.innerHTML = `<p style="color: #ff6b6b; text-align: center;">Error: ${formatFileName(topic, 'quiz')} load nahi hui!</p>`;
    }
}

function closeQuiz() {
    document.getElementById("quizOverlay").classList.remove("active");
}

function checkAnswer(button, selectedText, correctText) {
    
    if (button.parentElement.classList.contains("answered")) return; 
    
    button.parentElement.classList.add("answered"); 

    if (selectedText === correctText) {
        button.style.background = "linear-gradient(90deg, #16a34a, #22c55e)"; 
        button.style.boxShadow = "0 0 15px #22c55e";
    } else {
        button.style.background = "linear-gradient(90deg, #dc2626, #ef4444)"; 
        button.style.boxShadow = "0 0 15px #ef4444";
        
        
        const allButtons = button.parentElement.querySelectorAll(".quiz-option-btn");
        allButtons.forEach(btn => {
            if (btn.innerText === correctText) {
                btn.style.border = "2px solid #22c55e";
                btn.style.color = "#22c55e";
            }
        });
    }
}




function toggleNotesMenu() {
    var submenu = document.getElementById("notesSubMenu");
    var arrow = document.querySelector(".notes-arrow");
    
    if (submenu.style.maxHeight) {
        submenu.style.maxHeight = null;
        submenu.style.marginTop = "0";
        arrow.style.transform = "rotate(0deg)";
    } else {
        submenu.style.maxHeight = submenu.scrollHeight + "px";
        submenu.style.marginTop = "12px"; 
        arrow.style.transform = "rotate(180deg)";
    }
}


function openPdfModal(pdfFileName, title) {
    const overlay = document.getElementById("pdfOverlay");
    const viewer = document.getElementById("pdfViewer");
    const downloadLink = document.getElementById("pdfDownloadLink");
    const titleEl = document.getElementById("pdfTitle");

    
    titleEl.innerHTML = title.toUpperCase() + " ✦";
    viewer.src = pdfFileName; 
    downloadLink.href = pdfFileName; 

    
    overlay.classList.add("active");
}


function closePdfModal() {
    const overlay = document.getElementById("pdfOverlay");
    overlay.classList.remove("active");
    document.getElementById("pdfViewer").src = ""; 
}
