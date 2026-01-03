const mysql = require("mysql");

module.exports = function(app) {
    const connection = mysql.createConnection({
        host: "localhost",
        user: "serverUser",
        password: "user",
        database: "mydb"
    });

    connection.connect((error) => {
        if(error) {
            console.error("Error conectando a la BDD:", error);
            console.log("El servidor seguirá funcionando sin base de datos");
            return;
        }

        console.log("BDD Connected!");
        app.set("bdd", connection);
    });

    return connection;
};