// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// This has been updated with the new project credentials.
const firebaseConfig = {
    apiKey: "AIzaSyCHOyJ0Gxd6hLInCNNM_IMy5E9VZOmFxyU",
    authDomain: "novo-estoque-cc3ad.firebaseapp.com",
    projectId: "novo-estoque-cc3ad",
    storageBucket: "novo-estoque-cc3ad.firebasestorage.app",
    messagingSenderId: "160995105313",
    appId: "1:160995105313:web:a6c6f63b59ffc83bce6160"
};


// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
// Exporta a instância do Firestore para ser usada em outros lugares
export const db = getFirestore(app);
// Exporta a instância do Auth
export const auth = getAuth(app);