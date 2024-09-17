document.addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Bloqueia o clique com o botão direito
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { GoogleGenerativeAI } from "@google/generative-ai"; // Importando o Gemini

const firebaseConfig = {
    apiKey: "AIzaSyDjU_clmc29YVGdZ48BUE6OSvKq7eieqCs",
    authDomain: "projeto-laura-1.firebaseapp.com",
    projectId: "projeto-laura-1",
    storageBucket: "projeto-laura-1.appspot.com",
    messagingSenderId: "156733486916",
    appId: "1:156733486916:web:9c86c2e1b3693f374f8911"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const learningCollection = collection(db, "perguntas_respostas");

const apiUrl = 'https://api.openweathermap.org/data/2.5/weather?q=Sao%20Luis,BR&units=metric&appid=36e9f671284b84c9ad03da6ea1665af9&lang=pt_br';

const API_KEY = "AIzaSyCqO3mUBLFH2RwkbfH27tDPccoVbeUp-c8";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

document.getElementById('sendButton').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const inputElement = document.getElementById('userInput');
    const userMessage = inputElement.value.trim();
    if (userMessage === '') return;

    displayMessage(userMessage, 'user');
    inputElement.value = '';

    const response = await getResponse(userMessage);
    displayMessage(response || "Desculpe, não entendi sua pergunta.", 'bot');
    scrollToBottom();
}

function displayMessage(message, sender) {
    const messagesElement = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;

    if (sender === 'bot') {
        messageElement.innerHTML = `
            <img src="https://img.icons8.com/ios-filled/50/333333/sparkling--v1.png" class="profile-icon">
            <p class="typing-effect">${formatMessage(message)}</p>
        `;
        messagesElement.appendChild(messageElement);
        scrollToBottom();
        applyTypingEffect(messageElement.querySelector('.typing-effect'));
    } else {
        messageElement.innerHTML = `<p>${formatMessage(message)}</p>`;
        messagesElement.appendChild(messageElement);
        scrollToBottom();
    }
}

function formatMessage(message) {
    let formattedMessage = message.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    formattedMessage = formattedMessage.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    formattedMessage = formattedMessage.replace(/##(.*?)/g, '<i>$1</i>');
    return formattedMessage;
}

function applyTypingEffect(element) {
    const text = element.innerHTML;
    element.innerHTML = '';
    let index = 0;

    const baseSpeed = 15;
    const speed = baseSpeed * (text.length / 600);

    function type() {
        if (index < text.length) {
            element.innerHTML += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }

    type();
}

function scrollToBottom() {
    const messagesElement = document.getElementById('messages');
    messagesElement.scrollTop = messagesElement.scrollHeight;
}

// Função para obter a data e hora atual
function getCurrentDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('pt-BR', options);
    const formattedTime = now.toLocaleTimeString('pt-BR');
    return `Hoje é ${formattedDate}, e agora são ${formattedTime}.`;
}

// Função para obter feriados nacionais usando a BrasilAPI
async function getFeriadoAtual() {
    const currentYear = new Date().getFullYear();
    const apiUrl = `https://brasilapi.com.br/api/feriados/v1/${currentYear}`;

    try {
        const response = await fetch(apiUrl);
        const feriados = await response.json();
        const today = new Date().toISOString().split('T')[0];
        const feriadoHoje = feriados.find(feriado => feriado.date === today);

        if (feriadoHoje) {
            return `Hoje é feriado: ${feriadoHoje.name}`;
        } else {
            return "Hoje não é feriado.";
        }
    } catch (error) {
        console.error("Erro ao obter feriados:", error);
        return "Não consegui verificar os feriados no momento.";
    }
}

async function getResponse(userMessage) {
    if (/que horas são|qual o horário|que dia é hoje|qual a data de hoje/i.test(userMessage)) {
        return getCurrentDateTime();
    }

    if (/é feriado|tem feriado hoje|qual o feriado/i.test(userMessage)) {
        return await getFeriadoAtual();
    }

    try {
        const querySnapshot = await getDocs(learningCollection);
        const questions = querySnapshot.docs.map(doc => doc.data());
        const fuse = new Fuse(questions, {
            keys: ['pergunta'],
            includeScore: true,
            threshold: 0.4
        });

        const result = fuse.search(userMessage);
        if (result.length > 0) {
            return result[0].item.resposta;
        }
    } catch (error) {
        console.error("Erro ao buscar resposta:", error);
    }

    return await getGeminiResponse(userMessage);
}

async function getGeminiResponse(userMessage) {
    try {
        const prompt = `Por favor, responda a seguinte pergunta em português, você é feminina então se refira a você sempre no feminino: ${userMessage}`;
        const result = await model.generateContent({ prompt });
        return result.candidates[0].output;
    } catch (error) {
        console.error("Erro ao obter resposta do Gemini:", error);
        return "Desculpe, não consegui obter uma resposta.";
    }
}
