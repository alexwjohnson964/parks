## Preparations
This application was created using PostgreSQL (17.0) for its database and NPM (10.8.1) for package management. It is run from the command line using Node (20.16.0). Before using the application, a compatible version of each of these should be installed. You will also need a web browser. Chrome version 131.0.6778.140 was used to test the application. 

## Running the Application

To run the project, open a new terminal and navigate to the project folder. From there, use the command `npm run setupdb` to create the database, set up the schema, and initialize seed data. Later on, the database can also be reset back to this original state if needed using the command `npm run resetdb`.

After setting up the database, run the command `npm start` to launch the application. Once the server has started, navigate to `http://localhost:3000/` in your browser to open the application. 

When the app opens, the user will need to sign in to continue. This can be done with one of two accounts:

| Username | Password   | Notes                                                                 |
| -------- | ---------- | --------------------------------------------------------------------- |
| new_user | javaScript | Demonstrates the initial state of the app for a newly registered user |
| admin    | password   | Demonstrates the state of the app after several user interactions     |

## Using the Application
This application is designed to enable users to track parks  which they have visited or are interested in. Each user has access to a selection of default National Park data which they can browse and add to their selection of "visited" or "wishlist" parks. 

Users can also add new parks and custom lists to the application using the provided interfaces, in addition to editing the existing data. Users can update star ratings and write notes for each park, which are only displayed for the user making those changes. 

Parks and lists (even the default ones) can be deleted by users if desired. 

### Note: 

If default parks are deleted from the database while logged in as one user, those parks will also become unavailable for other user(s). This somewhat unintuitive behavior exists to fulfill the requirement that **all** rows in the primary tables can be deleted without adding excess complexity. Changes to the titles and locations of default parks also apply to all users. `npm run resetdb`  can be used to restore parks to their original state as needed. 

Likewise, deleting the "all" list, which contains every park in a user's data set is possible per the same requirement. This does not delete the parks in the list from the database, but does remove the convenient interface to view and modify parks that were not in any other list. It also results in the next list in the database for that user automatically becoming the default list that new parks are added to upon creation.

