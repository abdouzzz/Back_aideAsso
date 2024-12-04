const express = require("express");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const app = express();
const router  = express.Router();
const db = new sqlite3.Database("app.db");
const bcrypt = require('bcrypt');
const saltRounds = 10; // Nombre de rounds pour générer le salt (plus élevé est le chiffre, plus c'est sécurisé, mais plus ça prend de temps)   
app.use(express.json());
app.use(cors());

app.get('/', (req,res) => {
  res.send('App is running...')
})

const port = process.env.port || 3002;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.post("/user/register", (req, res) => {
    const { email, lastName, firstName, password, confirmPassword } = req.body; // Récupérer les données du body

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
            INSERT INTO utilisateurs (username, email, nom, prenom, password_hash)
            VALUES (?, ?, ?, ?, ?)`,
            [username, email, lastName, firstName, hash],  // Le hash est stocké à la place du mot de passe en clair
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
          error: "Connexion échouée. Vérifiez vos informations d'identification",
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
        // Si la comparaison réussit
        return res.status(200).json({
            message: "Connexion réussie",
            body: row,
        });
      });
    });
  });

app.post("/association/add", (req, res) => {
    const {numero_rna, numero_siren, nom, description, page_web_url, email, telephone, user_id, date_pub_jo, logo } = req.body;
    
    if((!numero_rna && !numero_siren) || !nom || !description || !user_id || !date_pub_jo){
      return res.status(400).json({
        error: "Certaines informations sont manquantes",
    });
    }
  
    db.run(`INSERT INTO associations (numero_rna, numero_siren, nom, description, page_web_url, email, telephone, logo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [numero_rna, numero_siren, nom, description, page_web_url, email, telephone, logo],
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
                    date_pub_jo
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
      console.log(row);
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
  db.all(`SELECT m.*, u.*, a.*
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
  const validAttributes = ["nom", "description", "page_web_url", "email", "telphone", "adresse", "ville", "logo"];

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
  const {nom_transaction, association_id, operation, date_operation, tiers} = req.body;
  if(!nom_transaction || !association_id || !date_operation || !operation || !tiers){
    return res.status(400).json({
      error: "Certaines informations sont manquantes",
  });
  }

db.run(`INSERT INTO tresorerie (nom_transaction, association_id, operation, date_operation, tiers)
        VALUES (?, ?, ?, ?, ?)`,
      [nom_transaction, association_id, operation, date_operation, tiers],
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