CREATE TABLE parks (
  id serial PRIMARY KEY,
  title text NOT NULL,
  "location" text NOT NULL
);

CREATE TABLE users (
  username text PRIMARY KEY,
  password text NOT NULL 
);

CREATE TABLE lists (
  id serial PRIMARY KEY,
  title text NOT NULL,
  username text
    NOT NULL
    REFERENCES users (username)
    ON DELETE CASCADE
);
ALTER TABLE lists ADD CONSTRAINT unique_title_user UNIQUE(title, username);

CREATE TABLE users_lists(
  id serial PRIMARY KEY,
  username text
    NOT NULL
    REFERENCES users (username)
    ON DELETE CASCADE,
  list_id integer
    NOT NULL
    REFERENCES lists (id)
    ON DELETE CASCADE
);

CREATE TABLE lists_parks(
  id serial PRIMARY KEY,
  rating integer,
  list_id integer
    NOT NULL
    REFERENCES lists (id)
    ON DELETE CASCADE,
  park_id integer
    NOT NULL
    REFERENCES parks (id)
    ON DELETE CASCADE
);
ALTER TABLE lists_parks ADD CONSTRAINT unique_list_park UNIQUE(list_id, park_id);

CREATE TABLE users_parksettings(
  id serial PRIMARY KEY,
  rating integer,
  notes text,
  username text
    NOT NULL
    REFERENCES users (username)
    ON DELETE CASCADE,
  park_id integer
    NOT NULL
    REFERENCES parks (id)
    ON DELETE CASCADE
);
ALTER TABLE users_parksettings ADD CONSTRAINT unique_park_settings UNIQUE(username, park_id);