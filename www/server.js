const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const port = 8080;
const host = 'localhost';
const { Client } = require('pg');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// Configuration d'EJS comme moteur de vue
app.set('view engine', 'ejs');

app.set('views', __dirname + '/views');

const secretKey = crypto.randomBytes(32).toString('hex');
// const secretKey = process.env.SESSION_SECRET;

app.use(cookieParser());
app.use(session({
    secret: secretKey,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: true } // Définissez 'secure: true' en production pour activer HTTPS
}));

// Middleware pour vérifier l'authentification
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
      return next();
  } else {
      res.redirect('/login'); // Redirigez vers la page de connexion si l'utilisateur n'est pas authentifié
  }
};

// Client pour la base de données
const client = new Client({
    user: 'yoyo',
    host: 'localhost',
    database: 'Library',
    password: '076758',
});

// Connecter le client à la base de données
client.connect()
  .then(() => {
    console.log('Connecté à la base de données');
    // Vous pouvez maintenant effectuer des opérations sur la base de données
  })
  .catch((erreur) => {
    console.error('Erreur de connexion à la base de données', erreur);
  });

app.use(express.static(__dirname));

app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

app.get('/', (req, res) => {
    res.sendFile('./index.html', {root: __dirname});
})

app.get('/panier', (req, res) => {
    res.sendFile('./panier.html', {root: __dirname});
})

app.get('/compte', (req, res) => {
    res.sendFile('./compte.html', {root: __dirname});
})

app.get('/create', (req, res) => {
  res.sendFile('./create.html', {root: __dirname});
})

app.post('/connect', async (req, res) => {
  var mail = req.body.mail;
  var passwd = req.body.passwd;

  try {
    // Exécutez votre requête SQL ici (par exemple, vérifier l'authentification)
    const result = await client.query(`SELECT passwd FROM account WHERE mail = $1`, [mail]);
    const id = await client.query(`SELECT id FROM account WHERE mail = $1`, [mail]);
    console.log(result);
    if (result.rows.length > 0) {
      const hashedPassword = result.rows[0].passwd;
      
      // Comparer le mot de passe fourni avec le mot de passe haché stocké
      const match = await bcrypt.compare(passwd, hashedPassword);
      
      if (match) {
        if(passwd == "admin"){
          
          // Enregistrez les informations de l'utilisateur dans la session
          req.session.user = {
              id: id,
              username: "admin"
          };
          const msg = 'Connecté en tant que admin';
          res.render('./account_admin.ejs', {msg});
          
          return;
        }else{
          req.session.user = {
            id: id,
            username: mail
          };
          const msg = 'Connecté en tant que user';
          res.render('./success.ejs', {msg});
          
          return;
        }
      } else {
        const msg = 'Email ou mot de passe incorrect.';
        res.render('./error.ejs', {msg});
        return;
      }
    } else {
      const msg = 'Email ou mot de passe incorrect.';
      res.render('./error.ejs', {msg});
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur interne du serveur');
    return; // Assurez-vous de sortir de la fonction après avoir envoyé la réponse
  }
});

// Route sécurisée
app.get('/page-secure', isAuthenticated, (req, res) => {
  if(res.username == "admin"){
    const msg = 'Connexion réussi en tant qu\'admin !';
    res.render('./account_admin.ejs', {msg});
  }else{
    const msg = 'Connexion réussie !';
    res.render('./connect.ejs', {msg});
  }
  return;
});

app.post('/create', async (req, res) => {
  var mail = req.body.mail;
  var passwd = req.body.passwd;

  try {
    // Vérifier s'il n'y a pas un compte existant
    const exist = await client.query(`SELECT * FROM account WHERE mail = $1 OR passwd = $2`, [mail, passwd]);
    if(exist.rowCount > 0){
      const msg = 'Email ou mot de passe déjà utilisé';
      res.render('./connect.ejs', {msg});
      return;
    }
    // Test si adresse valide

    // Hachage du mot de passe
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(passwd, salt);


    // Exécutez votre requête SQL pour insérer un nouvel utilisateur
    // hashedPassword quand le hashage sera installé
    const result = await client.query('INSERT INTO account (mail, passwd) VALUES ($1, $2)', [mail, hashedPassword]);

    // Vérifiez si au moins une ligne a été affectée (compte créé)
    if (result.rowCount > 0) {
      const msg = {
        msg : 'Compte créé avec succès !',
        panier : result.rows.panier,
        wishlist : result.rows.wishlist};
      res.render('./success.ejs', { msg });
    } else {
      /*const msg = ;
      res.render('./connect.ejs', { msg });*/
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur interne du serveur');
  }
});

app.post('/ajout', (req, res) => {
  var {title, author, isbn, type, year, editor, pages, description, price} = req.body;
  // Pour l'image du livre, enregister le nom et la séquence de bits
  // TODO
  const coverPath = req.file.path;
  console.log(coverPath);
})
  
app.get('/apropos', (req, res) => {
    res.sendFile('./propos.html', {root: __dirname});
})

app.get('/contact', (req, res) => {
    res.sendFile('./contact.html', {root: __dirname});
})

app.post('/contact', (req, res) => {
  var {mail, msg} = req.body;
  // TODO
})