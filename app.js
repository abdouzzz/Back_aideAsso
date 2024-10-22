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
    const { username, email, nom, prenom, password, confirmed_password } = req.body; // Récupérer les données du body

    if (!username || !email || !nom || !prenom || !password || !confirmed_password) {
        return res.status(400).json({
            error: "Toutes les informations nécessaires doivent être fournies",
        });
    }

    if(password !== confirmed_password){
      return res.status(400).json({
        error: "Les mots de passe ne correspondent pas.",
      });
    }

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
            [username, email, nom, prenom, hash],  // Le hash est stocké à la place du mot de passe en clair
            function (err) {
                if (err) {
                    console.error("Erreur lors de l'ajout de l'utilisateur:", err.message);
                    return res.status(500).json({ error: "Erreur interne du serveur" });
                }

                // Si tout est correct, on renvoie l'ID de l'utilisateur et son email
                res.json({ 
                  data: {
                  message: "Connexion réussie",
                  body: {
                      
                  },
                }, });
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
            body: {
                id: row.id,
                email: row.email,
                nom: row.nom,
          },
        });
      });
    });
  });

app.post("/association/add", (req, res) => {
  const {id_rna, id_siren, id_correspondance, nom, sigle, objet, site, email, telephone } = req.body;
  
  if((!id_rna && !id_siren) || !nom || !sigle || !objet){
    return res.status(400).json({
      error: "Certaines informations sont manquantes",
  });
  }

  db.run(`INSERT INTO associations (nom, numero_rna, numero_siren, page_web_url, description, email, telephone)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nom, id_rna, id_siren, site, objet, email, telephone],
          function (err) {
            if (err) {
                console.error("Erreur lors de l'ajout de l'association:", err.message);
                return res.status(500).json({ error: "Erreur interne du serveur" });
            }

            // Si tout est correct, on renvoie l'ID de l'association et son nom
            res.json({ id_association: this.lastID, nom });
        }
        )})

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
      const body = row;
      res.json({
        message: "Connexion réussie",
        body
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
      res.json(row);
    }
  );
})

app.post("/membres/add", (req, res) => {
  const {id_association, id_user, role, date_adhesion} = req.body;
  const est_actif = true;
  if(!id_association || !id_user || !date_adhesion || !role){
    return res.status(400).json({
      error: "Certaines informations sont manquantes",
  });
  }

db.run(`INSERT INTO membres (association_id, user_id, role, date_adhesion, est_actif)
        VALUES (?, ?, ?, ?, ?)`,
      [id_association, id_user, role, date_adhesion, est_actif],
      function (err) {
        if (err) {
            console.error("Erreur lors de l'ajout du membre à l'association:", err.message);
            return res.status(500).json({ error: "Erreur interne du serveur" });
        }

        // Si tout est correct, on renvoie l'ID de l'utilisateur et son email
        res.json({ id_membre: this.lastID });
    })

})

app.get("/association/:id/membres", (req, res) => {
  const asso_id = req.params.id;
  db.all(`SELECT m.*, u.username
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
            res.json(row);
          }
  ) 
})

app.get("/user/:id/associations", (req, res) => {
  const user_id = req.params.id;
  db.all(`SELECT m.*, u.username
    FROM membres m
    LEFT JOIN utilisateurs u ON m.user_id = u.id
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
            res.json(row);
          }
  ) 
})

app.put("/user/update/:id", (req, res) => {
  const user_id = req.params.id;
  const updatedUser = req.body;
  if (!updatedUser[0]) {
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
        console.log(updatedUser[attribute])
        console.log(attribute)
        updateQuery += `${attribute} = ?, `;
        updateParams.push(updatedUser[attribute]);
      }
    }
  }

  updateQuery = updateQuery.slice(0, -2);

  updateQuery += " WHERE id = ?";
  updateParams.push(user_id);
  console.log(updateQuery, updateParams)
  db.run(updateQuery, updateParams, function (err) {
    if (err) {
      console.error("Error updating user:", err.message);
      res.status(500).json({ error: "Internal server error." });
      return;
    }

    if (this.changes === 0) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json({ message: "User updated successfully" });
    }
  });
});