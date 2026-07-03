# Firebase do Plugin Hub

O Plugin Hub usa Firebase Authentication e Cloud Firestore.

## Ativar no Firebase

1. Crie um projeto no Firebase.
2. Em Authentication, ative Email/senha.
3. Em Firestore Database, crie o banco em modo produção.
4. Publique as regras de `firebase.rules`.
5. Copie as credenciais Web do Firebase para `plugins/firebase-config.js`.

## Configuração

Use este formato:

```js
window.KAPITOMO_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  projectId: "...",
  storageBucket: "...appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

## Coleções

```text
users/{uid}
plugins/{pluginId}
```

Leitura de plugins é pública. Publicar, atualizar e excluir exigem usuário logado e só funcionam para o dono do plugin.
