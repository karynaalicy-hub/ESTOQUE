// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// AÇÃO NECESSÁRIA: Cole a configuração do seu projeto Firebase aqui.
// 1. Vá para o console do seu projeto Firebase: https://console.firebase.google.com/project/estoque-d754a/overview
// 2. Clique no ícone de engrenagem (Configurações do projeto) no menu à esquerda.
// 3. Na aba "Geral", role para baixo até a seção "Seus apps".
// 4. Se você ainda não registrou um app da Web, clique no ícone (</>) para adicionar um.
// 5. Copie o objeto `firebaseConfig` que o Firebase fornece e cole-o abaixo, substituindo o objeto de exemplo.
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "estoque-d754a.firebaseapp.com",
  projectId: "estoque-d754a",
  storageBucket: "estoque-d754a.appspot.com",
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID_AQUI",
  appId: "COLE_SEU_APP_ID_AQUI"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
// Exporta a instância do Firestore para ser usada em outros lugares
export const db = getFirestore(app);
