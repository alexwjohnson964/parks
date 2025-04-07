const express = require('express');
const flash = require('express-flash') 
const session = require('express-session') 
const {body, validationResult} = require('express-validator'); 
const store = require('connect-loki');
const catchError = require("./lib/catch-error");
const validateUserInput = require("./lib/validate-input");
const app = express();
const host = "localhost"; 
const port = 3000;
const LokiStore = store(session);
const PgPersistence = require("./lib/pg-persistence");
app.set("views", "./views");
app.set("view engine", "pug");
app.use(express.static("./public"));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, 
    path: "/",
    secure: false,
  },
  name: "parks-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not very secure",
  store: new LokiStore({}),
}));
app.use(flash());

app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.signedIn = req.session.signedIn;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use((req, res, next) => {
  res.locals.store = new PgPersistence(req.session);
  next();
});


const requiresAuthentication = (req, res, next) => {
  if (!req.session.signedIn) {
    res.redirect(302, "/signin");
    req.session.destination = req.originalUrl;
  } else {
    next();
  }
};

app.get("/", catchError(async (req, res) => {
    requiresAuthentication(req, res, async() => {
      lists = await res.locals.store.getCurrentUserLists();
      for (let list of lists) {
        list.parks = await res.locals.store.getParksFromList(list.id);
      }
      res.render("home", {lists});
    });
     
}));
app.get("/lists/all-lists/",
  requiresAuthentication,
  catchError(async (req, res) => {
    res.redirect(`/lists/all-lists/1`);
  })
);
app.get("/lists/all-lists/:pageNumber",
  requiresAuthentication,
  catchError(async (req, res) => {
    let pageNumber = req.params.pageNumber;
    allLists = await res.locals.store.getCurrentUserLists();
    for (let list of allLists) {
      list.parks = await res.locals.store.getParksFromList(list.id);
    }
    if (pageNumber > allLists.length / 5 + 1 || !(Number.isInteger(Number(pageNumber)))) {
      req.flash("error", `Invalid page number`);
      pageNumber = 1 
    }
    res.render("all-lists", {sortBy: 'title', allLists, pageNumber, flash: req.flash()});
  })
);

app.get("/lists/:listId/:pageNumber",
  requiresAuthentication,
  catchError(async (req, res) => {

    let listId = req.params.listId;
    let pageNumber = req.params.pageNumber;
    if (!req.session.sortBy) {
      req.session.sortBy = 'title';
    }
    let list = await res.locals.store.getList(listId);
    list.parks = await res.locals.store.getParksFromList(list.id, sortBy = req.session.sortBy);

    for (let park of list.parks) {
      park.rating = await res.locals.store.getParkRating(park.id);
    }
    pageNumber = Number(pageNumber);
    
    if (pageNumber > list.parks.length / 5 + 1 || !(Number.isInteger(pageNumber)) || pageNumber < 1) {
      req.flash("error", `Invalid page number`);
      pageNumber = 1;
      return res.redirect(`/lists/${listId}/1`);
    } 
    
    res.render("list", {sortBy: req.session.sortBy, list, pageNumber});
  })
);
app.get("/parks/create",
  requiresAuthentication,
  catchError(async (req, res) => {
    res.render("create", {type: 'park'});
  })
);
app.get("/lists/create",
  requiresAuthentication,
  catchError(async (req, res) => {
    res.render("create", {type: 'list'});
  })
);
app.get("/lists/:listId/",
  requiresAuthentication,
  catchError(async (req, res) => {
    let listId = req.params.listId;
      return res.redirect(`/lists/${listId}/1`);
    })
);
app.get("/parks/:parkId",
  requiresAuthentication,
  catchError(async (req, res) => {
    let parkId = req.params.parkId;
    let park = await res.locals.store.getPark(parkId);
    let rating = await res.locals.store.getParkRating(parkId);
    let notes = await res.locals.store.getParkNotes(parkId);
    let userLists = await res.locals.store.getCurrentUserLists();
    let parkTitle = req.session.parkTitle;
    let parkLocation = req.session.parkLocation;
    delete req.session.parkTitle;
    delete req.session.parkLocation;
    for (let list of userLists) {
      let result = await res.locals.store.listContainsPark(list.id, parkId);
      list.containsPark  =  result ? list.id : false;
    }
    res.render("park", { 
      park,rating, notes, 
      lists: userLists,
      parkTitle: parkTitle,
      parkLocation: parkLocation
    });
  })
);

app.get("/signin", (req, res) => {
  req.flash("info", "Please sign in.");
  res.render("signin", {
    flash: req.flash(),
  });
});


app.get("/*", catchError(async (req, res) => {
  requiresAuthentication(req, res, async() => {
    req.flash('error', 'Invalid URL.')
    res.redirect("/");
  });
}));
app.post("/parks/:parkId/edit-rating/:rating",
  requiresAuthentication,
  catchError(async (req, res) => {
    let rating = req.params.rating;
    let parkId = req.params.parkId;
    let updated = await res.locals.store.updateParkRating(parkId, rating);
    if (updated) {
        req.flash("success", `The rating is now ${rating}`);
        res.redirect(`/parks/${parkId}`);
    } else {
      req.flash("error", "Failed to update.");
      res.redirect(`/parks/${parkId}`)
    }
 })
);
app.post("/parks/:parkId/edit-notes",
  requiresAuthentication,
  body('parkNotes'),
  [
    validateUserInput(body('parkNotes'), 'park notes',30, 0),
  ],
  catchError(async (req, res) => {
    let parkId = req.params.parkId;
    let notes = req.body.parkNotes;
    let errors = validationResult(req);
    if (!errors.isEmpty() && notes !== '') {
      errors.array().forEach(message => req.flash("error", message.msg));
    } else {


    let updated = await res.locals.store.updateParkNotes(parkId, notes);
    if (updated) {
        req.flash("success", `The notes have been updated`);
    } else {
      req.flash("error", "Could not update.");
    }
   }
   res.redirect(`/parks/${parkId}`)
 })
);
app.post("/parks/:parkId/edit",
  requiresAuthentication,
  body('parkTitle', 'parkLocation'),
  [
    validateUserInput(body('parkTitle'), 'park title'),
    validateUserInput(body('parkLocation'), 'park location'),
  ],
  catchError(async (req, res) => {
    let parkId = req.params.parkId;
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
    }
    else {
    let updated = await res.locals.store.setParkLocation(parkId, req.body.parkLocation);
    if (updated) {
        req.flash("success", `The park location has been updated.`);
    } else {
      req.flash("error", "Could not update location.");
    }
    updated = await res.locals.store.renamePark(parkId, req.body.parkTitle);
    if (updated) {
      req.flash("success", `The park title has been updated.`);
  } else {
    req.flash("error", "Duplicate park title.");
  }
  }
  req.session.parkLocation = req.body.parkLocation;
  req.session.parkTitle = req.body.parkTitle;
  res.redirect(`/parks/${parkId}`);
 })
);
app.post("/parks/:parkId/delete",
  requiresAuthentication,
  catchError(async (req, res) => {
    let parkId = req.params.parkId;
    let rows = await res.locals.store.deletePark(parkId);
    if (!rows) {
      req.flash("success", `Park deleted.`);
    } else {
      req.flash("error", 'Could not delete park');
    }
    res.redirect(`/`);
 })
);
app.post("/lists/edit/:listId/:parkId",
  requiresAuthentication,
  catchError(async (req, res) => {

    let listId = req.params.listId;
    let parkId = req.params.parkId;
    let list = await res.locals.store.getList(listId)
    let temp;

    if (list.title === 'all') {
      temp = await res.locals.store.deletePark(parkId);
      req.flash("success", `Park deleted.`);
      res.redirect(`/`);
    } else {
      temp = await res.locals.store.togglePark(listId, parkId)
      if (temp) {
        req.flash("success", `The park has been added to ${list.title}.`);
      } else {
        req.flash("success", `Park removed from ${list.title}.`);
      }
      res.redirect(`/parks/${parkId}`)
    }
 })
);

app.post("/lists/:listId/edit",
  requiresAuthentication,
  body('listTitle'),
  [
    validateUserInput(body('listTitle'), 'list title'),
  ],
  catchError(async (req, res) => {
    let listId = req.params.listId;
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
    } else {
    let updated = await res.locals.store.renameList(listId, req.body.listTitle);
    if (updated) {
        req.flash("success", `The list has been updated.`);
    } else {
      req.flash("error", "Duplicate list title");
    }
  }
  res.redirect(`/lists/${listId}/1`);
 })
);
app.post("/lists/:listId/sort",
  requiresAuthentication,
  body('sortBy'),
  catchError(async (req, res) => {
    let list = await res.locals.store.getList(req.params.listId);
    list.parks = await res.locals.store.getParksFromList(req.params.listId);
    req.session.sortBy = req.body.sortBy;
    if (list) {
        req.flash("success", `The list has been updated.`);
        res.redirect(`/lists/${req.params.listId}/1`);
    } else {
      req.flash("error", "The list could not be updated.");
      res.redirect(`/`);
    }
 })
);
app.post("/lists/:listId/delete",
  requiresAuthentication,
  catchError(async (req, res) => {
    let inList = await res.locals.store.deleteList(req.params.listId);
    if (!inList) {
        req.flash("success", "The list has been removed.");
        res.redirect('/');
    } else {
      req.flash("error", "oops.");
      res.redirect(`/`);
    }
 })
);

app.post("/lists/create",
  requiresAuthentication,
  body('listTitle'),
  [
    validateUserInput(body('listTitle'), 'list title'),
  ],
  catchError(async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render(`create`, {
        flash: req.flash(),
        listTitle: req.body.listTitle,
        type: 'list'
      })
    } else {
      let created = await res.locals.store.createNewList(req.body.listTitle);
      if (created) {
          req.flash("success", "The list has been added.");
          res.redirect("/");
      } else {
        req.flash('error',`Duplicate list title`);
        res.render(`create`, {
          flash: req.flash(),
          listTitle: req.body.listTitle,
          type: 'list'
        })
      }
    }

 })
);
app.post("/parks/create",
  requiresAuthentication,
  body(['parkTitle', 'parkLocation']),
  [
    validateUserInput(body('parkTitle'), 'park title'),
    validateUserInput(body('parkLocation'), 'park location')
  ],
  catchError(async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render(`create`, {
        flash: req.flash(),
        type: 'park',
        parkTitle: req.body.parkTitle,
        parkLocation: req.body.parkLocation
      })
    } else {
      let created = await res.locals.store.createNewPark(req.body.parkTitle, req.body.parkLocation);
      if (created) {
        let parkId = await res.locals.store.getParkId(req.body.parkTitle);
        req.flash("success", "The park has been added.");
        res.redirect(`/parks/${parkId}`);
      } else {
        if (created === null) {
          req.flash("error", "Must have at least one list to create parks.");
        } else {
        req.flash('error',`Duplicate park title`);
        }
        res.render(`create`, {
          flash: req.flash(),
          type: 'park',
          parkTitle: req.body.parkTitle,
          parkLocation: req.body.parkLocation
        })
      }
      }
 })
);

app.post("/signout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error signing out.");
    }
    res.clearCookie('connect.sid'); 
    res.redirect("/signin");
  });
});


app.post("/signin", async (req, res)  => {
  let username = req.body.username.trim();
  let password = req.body.password;
  let validCredentials = await res.locals.store.authenticate(username, password)
  if (!validCredentials) {
    req.flash("error", "Invalid credentials.");
    res.render("signin", {
      flash: req.flash(),
      username: '',
    });
  } else {
    req.session.username = username;
    req.session.signedIn = true;
    let destination = req.session.destination || "/";
    delete req.session.destination
    req.flash("info", `Welcome, ${username}!`);
    res.redirect(destination);
  }
});

app.listen(port, host, () => {
  console.log(`Parks is listening on port ${port} of ${host}!`);
});
