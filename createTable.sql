-- Association 
CREATE TABLE associations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR(255) NOT NULL,
    numero_rna VARCHAR(20) UNIQUE,
    numero_siren VARCHAR(20) UNIQUE,
    page_web_url VARCHAR(255), -- Lien vers une page de l'association si elle a un site
    description TEXT,  -- Présentation de l'association
    email TEXT,
    telephone TEXT,
    adresse TEXT
    code postal TEXT,
    ville TEXT,
    logo BLOB
);

-- utilisateurs
CREATE TABLE utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,  -- Nom d'utilisateur unique pour la connexion
    email VARCHAR(255) NOT NULL UNIQUE,  -- Email unique
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    date_naissance DATE,
    photo BLOB,
    password_hash TEXT NOT NULL,  -- Mot de passe hashé
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Date de création du compte
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Dernière mise à jour
);

-- Membres
CREATE TABLE membres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    association_id INTEGER REFERENCES associations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Relie l'utilisateur au membre
    role VARCHAR(50), -- Rôle dans l'association (ex: membre, président, trésorier, etc.)
    date_adhesion DATE NOT NULL, -- Date d'adhésion à l'association
    est_actif BOOLEAN DEFAULT TRUE -- Statut du membre
);

-- Evènements
CREATE TABLE evenements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    association_id INTEGER REFERENCES associations(id) ON DELETE CASCADE,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    date_debut DATE NOT NULL,
    date_fin DATE,
    lieu VARCHAR(255),
    logo BLOB,
    responsable_id INTEGER REFERENCES membres(id) ON DELETE SET NULL -- Responsable de l'événement
);

-- Documents
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    association_id INTEGER REFERENCES associations(id) ON DELETE CASCADE,
    titre VARCHAR(255) NOT NULL,
    contenu BLOB,
);

-- Trésorerie 
CREATE TABLE tresorerie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_transaction VARCHAR(255) NOT NULL,
    association_id INTEGER REFERENCES associations(id) ON DELETE CASCADE,
    operation REAL NOT NULL,
    date_operation DATE NOT NULL,
    tiers VARCHAR(255) NOT NULL
);
