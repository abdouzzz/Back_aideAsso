const express = require("express");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const app = express();
const router  = express.Router();
const db = new sqlite3.Database("app.db");
const bcrypt = require('bcrypt');
const multer = require('multer');
const saltRounds = 10;   
app.use(express.json());
app.use(cors());

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");
});

const upload = multer({
  storage: multer.memoryStorage()
});

app.get('/', (req,res) => {
  res.send('App is running...')
})

const port = process.env.port || 3002;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.post("/user/register", (req, res) => {
    const { email, lastName, firstName, password, confirmPassword, photo } = req.body; // Récupérer les données du body

    if (!email || !lastName || !firstName || !password || !confirmPassword) {
        return res.status(400).json({
            error: "Toutes les informations nécessaires doivent être fournies",
        });
    }

    if(password !== confirmPassword){
      return res.status(400).json({
        error: "Les mots de passe ne correspondent pas.",
      });
    }

    const firstNameInitial = firstName.charAt(0).toLowerCase(); // Première lettre du prénom en minuscule
    const lastNameLower = lastName.toLowerCase(); // Nom en minuscule
  
    // Concaténer la première lettre du prénom et le nom
    const username = firstNameInitial + lastNameLower

    // Hashage du mot de passe avec bcrypt
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error("Erreur lors du hashage du mot de passe:", err.message);
            return res.status(500).json({ error: "Erreur lors du hashage du mot de passe" });
        }

        // Une fois le mot de passe hashé, on l'insère dans la base de données
        db.run(
            `
            INSERT INTO utilisateurs (username, email, nom, prenom, password_hash, photo)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, lastName, firstName, hash, photo],  // Le hash est stocké à la place du mot de passe en clair
            function (err) {
                if (err) {
                    console.error("Erreur lors de l'ajout de l'utilisateur:", err.message);
                    return res.status(500).json({ error: "Erreur interne du serveur" });
                }

                // Si tout est correct, on renvoie l'ID de l'utilisateur et son email
                console.log(this.lastID);
                console.log(this);
                res.json({ 
                  message: "Connexion réussie",
                  body: {
                     id:this.lastID,
                     username,
                     email,
                     lastName,
                     firstName
                  },
                });
            }
        );
    });
});


app.post("/user/login", (req, res) => {
    const { email, password } = req.body;
  
    // Vérification des champs obligatoires
    if (!email || !password) {
      return res.status(400).json({
        error: "Toutes les informations nécessaires doivent être fournies",
      });
    }
  
    // Rechercher l'utilisateur par email
    db.get("SELECT * FROM utilisateurs WHERE email = ?", [email], (err, row) => {
      if (err) {
        console.error(
          "Erreur lors de la vérification des informations d'identification :",
          err.message
        );
        return res.status(500).json({ error: "Erreur interne du serveur" });
      }
  
      // Si l'utilisateur n'existe pas
      if (!row) {
        return res.status(401).json({
          error: "Connexion échouée. Vérifiez vos informations d'identification.",
        });
      }
  
      // Comparer le mot de passe fourni avec le mot de passe hashé dans la base de données
      bcrypt.compare(password, row.password_hash, (err, result) => {
        if (err) {
          console.error("Erreur lors de la comparaison des mots de passe:", err.message);
          return res.status(500).json({ error: "Erreur interne du serveur" });
        }
  
        // Si la comparaison échoue
        if (!result) {
          return res.status(401).json({
            error: "Connexion échouée. Vérifiez vos informations d'identification",
          });
        }
        console.log(row);
        // Si la comparaison réussit
        return res.status(200).json({
            message: "Connexion réussie",
            body: row,
        });
      });
    });
  });

app.post("/association/add", (req, res) => {
    const {numero_rna, numero_siren, nom, description, page_web_url, email, telephone, user_id, date_pub_jo, logo, code_postal, ville, adresse } = req.body;
  console.log(req.body);
    if((!numero_rna && !numero_siren) || !nom || !description || !user_id || !date_pub_jo){
      return res.status(400).json({
        error: "Certaines informations sont manquantes",
    });
    }
  
    db.run(`INSERT INTO associations (numero_rna, numero_siren, nom, description, page_web_url, email, telephone, logo, code_postal, ville, adresse)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [numero_rna, numero_siren, nom, description, page_web_url, email, telephone, logo, code_postal, ville, adresse],
            function (err) {
              if (err) {
                  console.error("Erreur lors de l'ajout de l'association:", err.message);
                  return res.status(500).json({ error: "Erreur interne du serveur" });
              }
              const id = this.lastID
              db.run(`INSERT INTO membres (association_id, user_id, role, date_adhesion, est_actif)
                VALUES (?, ?, ?, ?, ?)`,
              [this.lastID, user_id, "président", date_pub_jo, true],
              function (err) {
                if (err) {
                    console.error("Erreur lors de l'ajout du membre à l'association:", err.message);
                    return res.status(500).json({ error: "Erreur interne du serveur" });
                }
                res.status(200).json({ 
                  message:"Utilisateur ajouté à l'association",
                  body:{
                    id,
                    numero_rna,
                    numero_siren,
                    nom,
                    description,
                    page_web_url,
                    email,
                    telephone,
                    date_pub_jo,
                    code_postal
                  }
                });
            })
          }
        )})

app.get("/user", (req, res) => {
  db.all(
    `SELECT * FROM utilisateurs`,
    (err, row) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ error: "Erreur lors de la récupération des utilisateur" });
      }
      if (!row) {
        return res.status(404).json({ error: "Aucun trouvé" });
      }
      console.log("Liste utilisateurs", row);
      res.status(200).json({
        message:"utilisateurs récupérés",
        body:
          row
      });
    }
  );
})

app.get("/user/:id", (req, res) => {
  const user_id = req.params.id;
  db.get(
    `SELECT * FROM utilisateurs WHERE id =?`,
    [user_id],
    (err, row) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ error: "Erreur lors de la récupération de l'utilisateur" });
      }
      if (!row) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      console.log(row);
      res.status(200).json({
        message:"utilisateur récupéré",
        body:
          row
      });
    }
  );
})

app.get("/association/id/:id", (req, res) => {
  const asso_id = req.params.id;
  db.get(
    `SELECT * FROM associations WHERE id =?`,
    [asso_id],
    (err, row) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ error: "Erreur lors de la récupération de l'association" });
      }
      if (!row) {
        return res.status(404).json({ error: "Association non trouvé" });
      }
      res.status(200).json({
        message:"association récupérée",
        body:
          row
      });
    }
  );
})

app.get("/association", (req, res) => {
  db.all(
    `SELECT * FROM associations`,
    (err, row) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ error: "Erreur lors de la récupération de l'association" });
      }
      if (!row) {
        return res.status(404).json({ error: "Association non trouvé" });
      }
      res.status(200).json({
        message:"association récupérée",
        body:
          row
      });
    }
  );
})

app.get("/association/cp/:cp", (req, res) => {
  const asso_cp = req.params.cp;
  const dep = asso_cp + "%";
  db.all(
    `SELECT * FROM associations WHERE code_postal LIKE ?`,
    [dep],
    (err, row) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ error: "Erreur lors de la récupération de l'association" });
      }
      if (!row) {
        return res.status(404).json({ error: "Association non trouvé" });
      }
      res.status(200).json({
        message:"association récupérée",
        body:
          row
      });
    }
  );
})

app.post("/association/:id/add/membres/", (req, res) => {
  const id_asso = req.params.id;
  const membres = req.body.newMembres;

  if (!Array.isArray(membres) || membres.length === 0) {
    return res.status(400).json({
      error: "Un tableau de membres est requis",
    });
  }

  const query = `INSERT INTO membres (association_id, user_id, role, date_adhesion, est_actif) VALUES (?, ?, ?, ?, ?)`;
  console.log(membres);
  for (const membre of membres) {
    const { id_user, role, date_adhesion, est_actif } = membre;
    console.log("id_user", id_user);
    console.log("role", role);
    console.log("date_adhesion", date_adhesion);
    console.log("est_actif", est_actif);
    if (!id_user || !role || !date_adhesion) {
      return res.status(400).json({
        error: "Certaines informations sont manquantes pour un ou plusieurs membres",
      });
    }
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    const insertPromises = membres.map((membre) => {
      return new Promise((resolve, reject) => {
        db.run(
          query,
          [id_asso, membre.id_user, membre.role, membre.date_adhesion, membre.est_actif],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.lastID);
            }
          }
        );
      });
    });

    Promise.all(insertPromises)
      .then((ids) => {
        db.run("COMMIT");
        res.status(200).json({
          message: "Tous les membres ont été ajoutés avec succès",
          body: {
            ids,
          },
        });
      })
      .catch((err) => {
        db.run("ROLLBACK");
        console.error("Erreur lors de l'ajout des membres:", err.message);
        res.status(500).json({
          error: "Erreur interne du serveur lors de l'ajout des membres",
        });
      });
  });
});


app.get("/association/:id/membres", (req, res) => {
  const asso_id = req.params.id;
  db.all(`SELECT m.*, u.username, u.email, u.nom, u.prenom, u.photo
    FROM membres m
    LEFT JOIN utilisateurs u ON m.user_id = u.id
    WHERE association_id =?`,
    [asso_id],
    (err, row) => {
      if (err) {
        console.error(err.message);
        return res
          .status(500)
          .json({ error: "Erreur lors de la récupération des membres" });
      }
      if (!row) {
        return res.status(404).json({ error: "Aucun membre trouvé" });
      }
      console.log(row);
      res.status(200).json({
        message:`Membres de l'association ${asso_id}récupérés`,
        body:
          row
      });
    }
  ) 
})

app.get("/user/:id/associations", (req, res) => {
  const user_id = req.params.id;  
  db.all(`SELECT DISTINCT m.*, u.*, a.*
    FROM membres m  
    LEFT JOIN utilisateurs u ON m.user_id = u.id
    LEFT JOIN associations a ON m.association_id = a.id
    WHERE user_id =?`,
          [user_id],
          (err, row) => {
            if (err) {
              console.error(err.message);
              return res
                .status(500)
                .json({ error: "Erreur lors de la récupération des membres" });
            }
            if (!row) {
              return res.status(404).json({ error: "Aucun membre trouvé" });
            }
            console.log(row);
            res.status(200).json({
              message:`Associations de l'utilisateur ${user_id}récupérées`,
              body:
                row
            });
          }
  ) 
})

app.put("/user/update/:id", (req, res) => {
  const user_id = req.params.id;
  const updatedUser = req.body;
  if (!updatedUser) {
    res.status(400).json({ error: "Updated user data is required" });
    return;
  }
  let updateQuery = "UPDATE utilisateurs SET ";
  const updateParams = [];
  const validAttributes = ["username", "email", "nom", "prenom"];

  for (const attribute in updatedUser) {
    if (validAttributes.includes(attribute)) {
      if (
        updatedUser[attribute] !== undefined &&
        updatedUser[attribute] !== ""
      ) {
        updateQuery += `${attribute} = ?, `;
        updateParams.push(updatedUser[attribute]);
      }
    }
  }

  updateQuery = updateQuery.slice(0, -2);

  updateQuery += " WHERE id = ?";
  updateParams.push(user_id);
  db.run(updateQuery, updateParams, function (err) {
    if (err) {
      console.error("Error updating user:", err.message);
      res.status(500).json({ error: "Internal server error." });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(200).json({ message: "User updated successfully" });
    }
  });
});

app.put("/association/update/:id", (req, res) => {
  const asso_id = req.params.id;
  const updatedAsso = req.body;
  if (!updatedAsso) {
    res.status(400).json({ error: "Updated association data is required" });
    return;
  }
  let updateQuery = "UPDATE associations SET ";
  const updateParams = [];
  const validAttributes = ["nom", "description", "page_web_url", "email", "telephone", "adresse", "ville", "logo", "code_postal"];

  for (const attribute in updatedAsso) {
    if (validAttributes.includes(attribute)) {
      if (
        updatedAsso[attribute] !== undefined &&
        updatedAsso[attribute] !== ""
      ) {
        updateQuery += `${attribute} = ?, `;
        updateParams.push(updatedAsso[attribute]);
      }
    }
  }

  updateQuery = updateQuery.slice(0, -2);

  updateQuery += " WHERE id = ?";
  updateParams.push(asso_id);
  console.log("salut 1", updateQuery, updateParams)
  db.run(updateQuery, updateParams, function (err) {
    if (err) {
      console.error("Error updating association:", err.message);
      res.status(500).json({ error: "Internal server error." });
      return;
    }
    if (this.changes === 0) {
      console.log(updateQuery, updateParams)
      res.status(404).json({ error: "Association not found" });
    } else {
      console.log("salut", updateQuery, updateParams)
      res.status(200).json({ message: "Association updated successfully" });
    }
  });
});

app.post("/tresorerie/add", (req, res) => {
  const {nom_transaction, association_id, operation, date_operation, tiers, categorie} = req.body;
  if(!nom_transaction || !association_id || !date_operation || !operation || !tiers || !categorie){
    return res.status(400).json({
      error: "Certaines informations sont manquantes",
  });
  }

db.run(`INSERT INTO tresorerie (nom_transaction, association_id, operation, date_operation, tiers, categorie)
        VALUES (?, ?, ?, ?, ?, ?)`,
      [nom_transaction, association_id, operation, date_operation, tiers, categorie],
      function (err) {
        if (err) {
            console.error("Erreur lors de l'ajout de la transaction :", err.message);
            return res.status(500).json({ error: "Erreur interne du serveur" });
        }

        // Si tout est correct, on renvoie l'ID de l'utilisateur et son email
        res.status(200).json({ id_membre: this.lastID });
    })

});

app.get("/association/:id/tresorerie",  (req, res) => {
  const asso_id = req.params.id;
  db.all(`SELECT * FROM tresorerie 
          WHERE association_id =?`,
          [asso_id],
          (err, row) => {
            if (err) {
              console.error(err.message);
              return res
                .status(500)
                .json({ error: "Erreur lors de la récupération des transactions" });
            }
            if (!row) {
              return res.status(404).json({ error: "Aucune transaction trouvé" });
            }
            res.status(200).json({
              message:`Transactions de l'association ${asso_id}récupérés`,
              body:
                row
            });
          }
  ) 
})

app.delete("/user/delete/:id", (req,res) => {
  const user_id = req.params.id;
  db.run(
    "DELETE FROM utilisateurs WHERE id = ?",
    [user_id],
    function (err) {
      if (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({ error: "Internal server error" });
        return;
      } else {
        res.status(200).json({
          message: "User and related information deleted successfully",
        });
      }
    }
  );
})

app.delete("/membre/delete/:id", (req,res) => {
  const membre_id = req.params.id;
  db.run(
    "DELETE FROM membres WHERE id = ?",
    [membre_id],
    function (err) {
      if (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({ error: "Internal server error" });
        return;
      } else {
        res.status(200).json({
          message: "Membres and related information deleted successfully",
        });
      }
    }
  );
})

app.delete("/association/delete/:id", (req,res) => {
  const membre_id = req.params.id;
  db.run(
    "DELETE FROM associations WHERE id = ?",
    [membre_id],
    function (err) {
      if (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({ error: "Internal server error" });
        return;
      } else {
        res.status(200).json({
          message: "Membres and related information deleted successfully",
        });
      }
    }
  );
})

app.put("/membre/update/:id", (req, res) => {
  const membre_id = req.params.id;
  const updatedMembre = req.body;
  if (!updatedMembre) {
    res.status(400).json({ error: "Updated member data is required" });
    return;
  }
  let updateQuery = "UPDATE membres SET ";
  const updateParams = [];
  const validAttributes = ["role", "date_adhesion", "est_actif"];

  for (const attribute in updatedMembre) {
    if (validAttributes.includes(attribute)) {
      if (
        updatedMembre[attribute] !== undefined &&
        updatedMembre[attribute] !== ""
      ) {
        updateQuery += `${attribute} = ?, `;
        updateParams.push(updatedMembre[attribute]);
      }
    }
  }

  updateQuery = updateQuery.slice(0, -2);

  updateQuery += " WHERE id = ?";
  updateParams.push(membre_id);
  console.log("salut 1", updateQuery, updateParams)
  db.run(updateQuery, updateParams, function (err) {
    if (err) {
      console.error("Error updating association:", err.message);
      res.status(500).json({ error: "Internal server error." });
      return;
    }
    if (this.changes === 0) {
      console.log(updateQuery, updateParams, this.changes)
      res.status(404).json({ error: "Member not found" });
    } else {
      console.log("salut", updateQuery, updateParams)
      res.status(200).json({ message: "Member updated successfully" });
    }
  });
});

app.post("/membre/delete/", (req, res) => {
  const membres = req.body.deletedMembers;
  console.log("req.body", req.body);
  if (!Array.isArray(membres) || membres.length === 0) {
    return res.status(400).json({
      error: "Un tableau de membres est requis",
    });
  }

  const query = `DELETE FROM membres WHERE id = ?`;
  for (const membre of membres) {
    const { id_user } = membre;
    console.log("id_user", id_user);
    if (!id_user) {
      return res.status(400).json({
        error: "Certaines informations sont manquantes pour un ou plusieurs membres",
      });
    }
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const insertPromises = membres.map((membre) => {
      return new Promise((resolve, reject) => {
        db.run(
          query,
          [membre.id_user],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve('supprimé');
            }
          }
        );
      });
    });

    Promise.all(insertPromises)
      .then(() => {
        db.run("COMMIT");
        res.status(200).json({
          message: "Tous les membres ont été supprimé avec succès",
        });
      })
      .catch((err) => {
        db.run("ROLLBACK");
        console.error("Erreur lors de la suppression des membres:", err.message);
        res.status(500).json({
          error: "Erreur interne du serveur lors de la suppression des membres",
        });
      });
  });
});


app.delete("/tresorerie/:id/delete/", (req,res) => {
  const tresorerie_id = req.params.id;
  db.run(
    "DELETE FROM tresorerie WHERE id = ?",
    [tresorerie_id],
    function (err) {
      if (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({ error: "Internal server error" });
        return;
      } else {
        res.status(200).json({
          message: "Membres and related information deleted successfully",
        });
      }
    }
  );
})

app.post("/events/add", (req, res) => {
    const {association_id, titre, description, date_debut, date_fin, heure_debut, heure_fin, responsable_id, lieu, type } = req.body;
    if(!association_id || !titre || !description || !date_debut || !lieu || !type){
      return res.status(400).json({
        error: "Certaines informations sont manquantes",
    });
    }
    db.run(`INSERT INTO events (association_id, titre, description, date_debut, date_fin, heure_debut, heure_fin, lieu, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [association_id, titre, description, date_debut, date_fin, heure_debut, heure_fin, lieu, type],
            function (err) {
        if (err) {
            console.error("Erreur lors de l'ajout de l'évènement :", err.message);
            return res.status(500).json({ error: "Erreur interne du serveur" });
        }
        // Si tout est correct, on renvoie l'ID de l'utilisateur et son email
        res.status(200).json(
          { body: 
            {id: this.lastID}
          }
        );
    }
  )
})

app.get("/association/:id/events",  (req, res) => {
  const asso_id = req.params.id;
  db.all(`WITH event_cte AS (
  SELECT 
    e.*,
    json_group_array(
          json_object(
            'user_id', u.id,
            'name', u.username,
            'email', u.email
          )
    ) AS participants
  FROM events e
  LEFT JOIN eventParticipants ep 
    ON ep.evenement_id = e.id
  LEFT JOIN utilisateurs u 
    ON u.id = ep.participant_id
  WHERE e.association_id = ?
  GROUP BY e.id
)

SELECT json_group_array(
         json_object(
           'id', id,
           'titre', titre,
           'date_debut', date_debut,
           'date_fin', date_fin,
           'description', description,
           'lieu', lieu,
           'type', type,
           'participants', participants
         )
       ) AS events
FROM event_cte`,
          [asso_id],
          (err, row) => {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .json({ error: "Erreur lors de la récupération des évèneents" });
            }
            if (!row) {
              return res.status(404).json({ error: "Aucun évènement trouvé" });
            }
            res.status(200).json({
              message:`Evènements de l'association ${asso_id}récupérés`,
              body:
                JSON.parse(row[0].events)
            });
          }
  ) 
})

app.get("/association/:id/events/:type",  (req, res) => {
  const asso_id = req.params.id;
  const type = req.params.type;
  db.all(`  WITH event_cte AS (
      SELECT 
        e.*,
        d.id AS document_id,
        d.titre AS document_titre,
        json_group_array(
          json_object(
            'user_id', u.id,
            'name', u.username,
            'email', u.email
          )
        ) AS participants
      FROM events e
      LEFT JOIN eventParticipants ep 
        ON ep.evenement_id = e.id
      LEFT JOIN utilisateurs u 
        ON u.id = ep.participant_id
      LEFT JOIN documents d
        ON d.id = e.document_id
      WHERE e.association_id = ?
        AND e.type = ?
      GROUP BY e.id
    )

    SELECT json_group_array(
      json_object(
        'id', id,
        'titre', titre,
        'date_debut', date_debut,
        'date_fin', date_fin,
        'description', description,
        'lieu', lieu,
        'type', type,
        'participants', participants,
        'document',
          CASE
            WHEN document_id IS NOT NULL THEN
              json_object(
                'id', document_id,
                'titre', document_titre
              )
            ELSE NULL
          END
      )
    ) AS events
    FROM event_cte
          `,
          [asso_id, type],
          (err, row) => {
            if (err) {
              console.error(err.message);
              return res
                .status(500)
                .json({ error: "Erreur lors de la récupération des évèneents" });
            }
            if (!row) {
              return res.status(404).json({ error: "Aucun évènement trouvé" });
            }
            const events = JSON.parse(row[0].events);

            // 2️⃣ Parse les participants pour chaque event
            const parsedEvents = events.map(event => ({
              ...event,
              participants: event.participants
                ? JSON.parse(event.participants)
                : []
            }));
            res.status(200).json({
              message:`${type} de l'association ${asso_id}récupérés`,
              body:
                parsedEvents
            });
          }
  ) 
})

app.post("/events/:id/add/:participants/", (req, res) => {
  const event_id = req.params.id;
  const participants = req.body;

  if (!Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({
      error: "Un tableau de participants est requis",
    });
  }

  const query = `INSERT INTO eventParticipants (evenement_id, participant_id) VALUES (?, ?)`;
  console.log(participants);
  for (const participant of participants) {
    const { user_id } = participant;
    if (!user_id) {
      return res.status(400).json({
        error: "Certaines informations sont manquantes pour un ou plusieurs participants",
      });
    }
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const insertPromises = participants.map((participant) => {
      return new Promise((resolve, reject) => {
        db.run(
          query,
          [event_id, participant.user_id],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.lastID);
            }
          }
        );
      });
    });

    Promise.all(insertPromises)
      .then((ids) => {
        db.run("COMMIT");
        res.status(200).json({
          message: "Tous les participants ont été ajoutés avec succès",
          body: {
            ids,
          },
        });
      })
      .catch((err) => {
        db.run("ROLLBACK");
        console.error("Erreur lors de l'ajout des participants:", err.message);
        res.status(500).json({
          error: "Erreur interne du serveur lors de l'ajout des participants",
        });
      });
  });
});

app.delete("/events/delete/:id", (req,res) => {
  const event_id = req.params.id;
  db.run(
    "DELETE FROM events WHERE id = ?",
    [event_id],
    function (err) {
      if (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({ error: "Internal server error" });
        return;
      } else {
        res.status(200).json({
          message: "Events and related information deleted successfully",
        });
      }
    }
  );
})

app.post("/association/:id/add/budget", (req, res) => {
  console.log(req.body)
  const association_id = req.params.id;
  const { titre, date_debut, date_fin, budgets } = req.body;
  if(!association_id || !titre || !date_debut || !date_fin || budgets.length < 1){
      return res.status(400).json({
        error: "Certaines informations sont manquantes",
    });
  }
  db.run(`INSERT INTO budget (association_id, titre, date_debut, date_fin)
          VALUES (?, ?, ?, ?)`,
          [association_id, titre, date_debut, date_fin, ],
          function (err) {
            if (err) {
              console.error("Erreur lors de l'ajout du budget :", err.message);
              return res.status(500).json({ error: "Erreur interne du serveur" });
            }
            const id = this.lastID
            const query = `INSERT INTO budget_lignes (budget_id, categorie, montant_prevu) VALUES (?, ?, ?)`;
            for (const ligne of budgets) {
              const { categorie, montant_prevu } = ligne;
              if (!categorie || !montant_prevu) {
                return res.status(400).json({
                  error: "Certaines informations sont manquantes pour un ou plusieurs budgets",
                });
              }
            }
          
            db.serialize(() => {
              db.run("BEGIN TRANSACTION");
              const insertPromises = budgets.map((budget) => {
                return new Promise((resolve, reject) => {
                  db.run(
                    query,
                    [id, budget.categorie, budget.montant_prevu],
                    function (err) {
                      if (err) {
                        reject(err);
                      } else {
                        resolve(this.lastID);
                      }
                    }
                  );
                });
              });
            
              Promise.all(insertPromises)
                .then((ids) => {
                  db.run("COMMIT");
                  res.status(200).json({
                    message: "Tous les budgets ont été ajoutés avec succès",
                    body: {
                      ids,
                    },
                  });
                })
                .catch((err) => {
                  db.run("ROLLBACK");
                  console.error("Erreur lors de l'ajout des budgets:", err.message);
                  res.status(500).json({
                    error: "Erreur interne du serveur lors de l'ajout des budgets",
                  });
                });
            });
            // Si tout est correct, on renvoie l'ID de l'utilisateur et son email
          }
        )
})

app.get("/association/:id/budgets", (req, res) => {
  const association_id = req.params.id;

  if (!association_id) {
    return res.status(400).json({
      error: "ID du budget manquant",
    });
  }

  const query = `
    SELECT b.*, COALESCE(SUM(bl.montant_prevu), 0) AS montant_total
    FROM budget_lignes bl
    LEFT JOIN budget b
      ON bl.budget_id = b.id
    WHERE b.association_id = ?
    GROUP BY b.id
  `;

  db.all(query, [association_id], (err, rows) => {
    if (err) {
      console.error("Erreur SQL suivi budget :", err.message);
      return res.status(500).json({
        error: "Erreur lors de la récupération du suivi budgétaire",
      });
    }

    res.status(200).json({
      message: "Suivi budgétaire récupéré avec succès",
      body: rows,
    });
  });
});

app.get("/budgets/:id/suivi", (req, res) => {
  const budget_id = req.params.id;

  if (!budget_id) {
    return res.status(400).json({
      error: "ID du budget manquant",
    });
  }

  const query = `
    SELECT 
      bl.categorie,
      bl.montant_prevu,
      COALESCE(SUM(t.operation), 0) AS montant_reel,
      ROUND(
        (COALESCE(SUM(t.operation) * -1, 0) / bl.montant_prevu) * 100,
        2
      ) AS taux_utilisation
    FROM budget_lignes bl
    JOIN budget b ON b.id = bl.budget_id
    LEFT JOIN tresorerie t
      ON t.categorie = bl.categorie
     AND t.date_operation BETWEEN b.date_debut AND b.date_fin
     AND t.operation < 0
    WHERE bl.budget_id = ?
    GROUP BY bl.categorie, bl.montant_prevu
  `;

  db.all(query, [budget_id], (err, rows) => {
    if (err) {
      console.error("Erreur SQL suivi budget :", err.message);
      return res.status(500).json({
        error: "Erreur lors de la récupération du suivi budgétaire",
      });
    }

    res.status(200).json({
      message: "Suivi budgétaire récupéré avec succès",
      body: rows,
    });
  });
});

app.get("/association/:id/actions", (req, res) => {
  const association_id = req.params.id;

  if (!association_id) {
    return res.status(400).json({
      error: "ID du budget manquant",
    });
  }

  const query = `
    SELECT
  json_group_object(
    etat,
    actions
  ) AS actions_par_etat
FROM (
  SELECT
    ac.etat AS etat,
    json_group_array(
      json_object(
        'titre', ac.titre,
        'id', ac.id,
        'description', ac.description,
        'deadline', ac.deadline,
        'priorite', ac.priorite,
        'responsable_id', ac.responsable_id,
        'responsable_name', u.username,
        'categorie', ac.categorie
      )
    ) AS actions
  FROM actions ac
  LEFT JOIN utilisateurs u
    ON u.id = ac.responsable_id
  WHERE ac.association_id = ?
  GROUP BY ac.etat
);
  `;

  db.all(query, [association_id], (err, rows) => {
    if (err) {
      console.error("Erreur SQL suivi budget :", err.message);
      return res.status(500).json({
        error: "Erreur lors de la récupération du suivi budgétaire",
      });
    }
    const result = {
    TODO: [],
    DOING: [],
    DONE: []
  };
    const actions = JSON.parse(rows[0].actions_par_etat);
    Object.keys(actions).forEach((etat) => {
    result[etat] = JSON.parse(actions[etat]);
  });
    res.status(200).json({
      message: "Suivi budgétaire récupéré avec succès",
      body: result,
    });
  });
});

app.post("/association/:id/add/actions", (req, res) => {
  const association_id = req.params.id;
  const actions = req.body;
  console.log(req.body)
  console.log(actions)
  if(actions.length < 1){
      return res.status(400).json({
        error: "Certaines informations sont manquantes",
    });
  }
  const query = `INSERT INTO actions (titre, description, deadline, categorie, priorite, etat, responsable_id, association_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`          
            db.serialize(() => {
              db.run("BEGIN TRANSACTION");
              const insertPromises = actions.map((action) => {
                return new Promise((resolve, reject) => {
                  db.run(
                    query,
                    [action.titre, action.description, action.deadline, action.categorie, action.priorite, action.etat, action.responsable_id, association_id],
                    function (err) {
                      if (err) {
                        reject(err);
                      } else {
                        resolve(this.lastID);
                      }
                    }
                  );
                });
              });
            
              Promise.all(insertPromises)
                .then((ids) => {
                  db.run("COMMIT");
                  res.status(200).json({
                    message: "Toutes les actions ont été ajoutés avec succès",
                    body: {
                      ids,
                    },
                  });
                })
                .catch((err) => {
                  db.run("ROLLBACK");
                  console.error("Erreur lors de l'ajout des actions:", err.message);
                  res.status(500).json({
                    error: "Erreur interne du serveur lors de l'ajout des budgets",
                  });
                });
            });
            // Si tout est correct, on renvoie l'ID de l'utilisateur et son email
})

app.delete("/actions/delete/:id", (req,res) => {
  const action_id = req.params.id;
  db.run(
    "DELETE FROM actions WHERE id = ?",
    [action_id],
    function (err) {
      if (err) {
        console.error("Error deleting action:", err.message);
        res.status(500).json({ error: "Internal server error" });
        return;
      } else {
        res.status(200).json({
          message: "Actions deleted successfully",
        });
      }
    }
  );
})

app.put("/actions/update/:id", (req, res) => {
  const action_id = req.params.id;
  const updatedAction = req.body;
  if (!updatedAction) {
    res.status(400).json({ error: "Updated action data is required" });
    return;
  }
  let updateQuery = "UPDATE actions SET ";
  const updateParams = [];
  const validAttributes = ["etat"];
console.log(updatedAction)
  for (const attribute in updatedAction) {
          console.log(updatedAction[0])
          console.log(attribute)
    if (validAttributes.includes(attribute)) {
      if (
        updatedAction[attribute] !== undefined &&
        updatedAction[attribute] !== ""
      ) {
        updateQuery += `${attribute} = ?, `;
        updateParams.push(updatedAction[attribute]);
      }
    }
  }

  updateQuery = updateQuery.slice(0, -2);

  updateQuery += " WHERE id = ?";
  updateParams.push(action_id);
  db.run(updateQuery, updateParams, function (err) {
    if (err) {
      console.error("Error updating action:", err.message);
      res.status(500).json({ error: "Internal server error." });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: "Action not found" });
    } else {
      res.status(200).json({ message: "Action updated successfully" });
    }
  });
});

app.put("/events/update/:id", (req, res) => {
  const event_id = req.params.id;
  const updatedEvent = req.body;
  if (!updatedEvent) {
    res.status(400).json({ error: "Updated event data is required" });
    return;
  }
  let updateQuery = "UPDATE events SET ";
  const updateParams = [];
  const validAttributes = ["titre", "description", "date_debut", "date_fin", "type", "lieu", "document_id"];
console.log(updatedEvent)
  for (const attribute in updatedEvent) {
          console.log(updatedEvent[0])
          console.log(attribute)
    if (validAttributes.includes(attribute)) {
      if (
        updatedEvent[attribute] !== undefined &&
        updatedEvent[attribute] !== ""
      ) {
        updateQuery += `${attribute} = ?, `;
        updateParams.push(updatedEvent[attribute]);
      }
    }
  }

  updateQuery = updateQuery.slice(0, -2);

  updateQuery += " WHERE id = ?";
  updateParams.push(event_id);
  db.run(updateQuery, updateParams, function (err) {
    if (err) {
      console.error("Error updating event:", err.message);
      res.status(500).json({ error: "Internal server error." });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: "event not found" });
    } else {
      res.status(200).json({ message: "event updated successfully" });
    }
  });
});

app.post("/documents/add",  upload.single("contenu"), (req, res) => {
    const {association_id, titre } = req.body;
    const contenu = req.file?.buffer; // ✅ le Blob arrive ici
 console.log("BODY:", req.body);
    console.log("FILE:", req.file);
    if(!association_id || !titre || !contenu){
      return res.status(400).json({
        error: "Certaines informations sont manquantes",
    });
    }
    db.run(`INSERT INTO documents (association_id, titre, contenu)
            VALUES (?, ?, ?)`,
            [association_id, titre, contenu],
            function (err) {
        if (err) {
            console.error("Erreur lors de l'ajout du document :", err.message);
            return res.status(500).json({ error: "Erreur interne du serveur" });
        }
        // Si tout est correct, on renvoie l'ID de l'utilisateur et son email
        res.status(200).json(
          { body: 
            {id: this.lastID}
          }
        );
    }
  )
})

app.get("/documents/:id", (req, res) => {
  const document_id = req.params.id;

  if (!document_id) {
    return res.status(400).json({
      error: "ID du document manquant",
    });
  }

    db.get(`SELECT titre, contenu FROM documents WHERE id = ?`,
    [document_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row) {
        return res.status(404).json({ error: "Document introuvable" });
      }

      const pdfBuffer = row.contenu; // BLOB SQLite → Buffer Node

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${row.titre}.pdf"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
res.setHeader("Cache-Control", "no-store");

      res.send(pdfBuffer); // ✅ renvoi binaire
    }
  );
});