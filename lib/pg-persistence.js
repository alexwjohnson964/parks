const { Client } = require("pg");
const bcrypt = require("bcrypt");
async function executeQuery(statement, ...parameters) {
  let client = new Client({ database: "parks" });
  await client.connect();
  let result = await client.query(statement, parameters);
  await client.end();
  return result;
}
function sort(data, sortBy, ascending = true) {
  return data.sort((a, b) => {
    if (a[sortBy] > b[sortBy]) {
      return ascending ? 1 : -1
    } else {
      return ascending ? -1 : 1
    }
  })
}

module.exports = class PgPersistence {

  constructor(session) {
    this.username = session.username;
  }
  async authenticate(username, password) {
    const AUTHENTICATE = 
    `SELECT password FROM users
      WHERE username = $1
    `;

    let result = await executeQuery(AUTHENTICATE, username);
    return result.rowCount > 0 ? bcrypt.compare(password, result.rows[0].password) : false;
  }
  async getPark(parkId){
    const QUERY = "SELECT * FROM parks WHERE id = $1"
    let result = await executeQuery(QUERY, parkId);
    return result.rows[0];
  }
  async getParkId(parkTitle){
    const QUERY = "SELECT * FROM parks WHERE title = $1"
    let result = await executeQuery(QUERY, parkTitle);
    return result.rows[0].id;
  }
  async getList(listId) {
    const QUERY = "SELECT * FROM lists WHERE id = $1"
    let result = await executeQuery(QUERY, listId);
    
    return result.rows[0];
  }
  async getCurrentUserLists() {
    const QUERY = `
    SELECT * FROM lists 
      WHERE username = $1
    `;
    let result = await executeQuery(QUERY, this.username);
    return sort(result.rows, 'id');
  }
  async listContainsPark(listId, parkId) {
    const QUERY = `
    SELECT * FROM lists_parks 
      WHERE list_id = $1 AND park_id = $2
    `;
    let result = await executeQuery(QUERY, listId, parkId);
    return result.rows[0]
  }


  async getParksFromList(listId, sortBy = 'id', ascending = true, limit = 5, offset = 0) {
    const QUERY = `
    SELECT * FROM lists 
    JOIN lists_parks ON lists.id = lists_parks.list_id 
    JOIN parks ON lists_parks.park_id = parks.id
    WHERE lists.id = $1
    `;
    let result = await executeQuery(QUERY, listId);
    return sort(result.rows, sortBy, ascending)

  }
  async renamePark(parkId, newTitle) {
    const QUERY = `
    UPDATE parks 
     SET title = $1 WHERE id = $2
    `;
    try {
      let result = await executeQuery(QUERY, newTitle, parkId);
      return result.rows;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error; 
    }
  }
  async setParkLocation(parkId, newLocation) {
    const QUERY = `
    UPDATE parks 
     SET location = $1 WHERE id = $2
    `;
    try {
      let result = await executeQuery(QUERY, newLocation, parkId);
      return result.rows;
    } catch (error) {
      throw error; 
    }
  }
  async renameList(listId, newTitle) {
    const QUERY = `
    UPDATE lists 
     SET title = $1 WHERE id = $2
    `;
    try {
      let result = await executeQuery(QUERY, newTitle, listId);
      return result.rows;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error; 
    }
  }
  async createNewList(title) {
    const QUERY = `
    INSERT INTO lists
      (title, username)
    VALUES
      ($1, $2)
    `;
    try {
      let result = await executeQuery(QUERY, title, this.username);
      return result.rowCount > 0;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error; 
    }
  }
  
  async deleteList(listId) {
    const QUERY = 
    `DELETE FROM lists
      WHERE id = $1
    `;
    try {
      let result = await executeQuery(QUERY, listId);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  async togglePark(listId, parkId) {
    let inList = await this.listContainsPark(listId, parkId);
    if (inList) {
      await this.removePark(listId, parkId);
    } else {
      await this.addPark(listId, parkId);
      return true;
    }
  }
  async addPark(listId, parkId) {
    const QUERY =`
    INSERT INTO lists_parks(list_id, park_id)
    VALUES ($1, $2)
    `;

    try {
      let result = await executeQuery(QUERY, listId, parkId);
      return result.rows[0];
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error; 
    }
  }

  async removePark(parkId, listId) {
    const QUERY = 
    `DELETE FROM lists_parks
      WHERE park_id = $1 AND list_id = $2
    `;
    try {
      let result = await executeQuery(QUERY, listId, parkId);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  async deletePark(parkId) {
    const QUERY = 
    `DELETE FROM parks
      WHERE id = $1
    `;
    try {
      let result = await executeQuery(QUERY, parkId);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async updateParkRating(parkId, rating) {
    const QUERY = `
    UPDATE users_parksettings
      SET rating = $1
      WHERE park_id = $2 AND username = $3
    `;

    let result = await executeQuery(QUERY, rating, parkId, this.username);
    return result;
  }
  async updateParkNotes(parkId, notes) {
    const QUERY = `
    UPDATE users_parksettings
      SET notes = $1 
      WHERE park_id = $2 AND username = $3
    `;
    let result = await executeQuery(QUERY, notes, parkId, this.username);
    return result;
  }

  async getParkRating(parkId) {
    const QUERY = `
    SELECT * FROM users_parksettings
    WHERE park_id = $1 AND username = $2
    `;

    let result = await executeQuery(QUERY, parkId, this.username);

    return result.rows[0].rating;
  }

  async getParkNotes(parkId) {
    const QUERY = `
    SELECT * FROM users_parksettings 
    WHERE park_id = $1 AND username = $2
    `;

    let result = await executeQuery(QUERY, parkId, this.username);

    return result.rows[0].notes;
  }

  async createNewPark(title, location) {
    const CREATE_PARK_QUERY = `
    INSERT INTO parks (title, location)
    VALUES ($1, $2)
    `;
    try {
      let lists = await this.getCurrentUserLists(this.username);
      if (!lists[0]) {
        return null;
      }
      let result = await executeQuery(CREATE_PARK_QUERY, title, location);
      let park = await this.getPark(await this.getParkId(title));
      let listId = lists[0].id
      result = await this.addPark(listId, park.id);
      const ADD_PARK_SETTINGS_QUERY = `
      INSERT INTO users_parksettings
        (username, park_id)
      VALUES
        ($1, $2)
      `;

      result = await executeQuery(ADD_PARK_SETTINGS_QUERY, this.username, park.id);

      return result;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error; 
    }
  }


  isUniqueConstraintViolation(error) {

    return /duplicate key value violates unique constraint/.test(String(error));
  }
}