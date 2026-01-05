const mysql = require("mysql2");

module.exports = function(app) {
    // Configuración de la conexión
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",           //  Cambia esto si usas otro usuario
        password: "user",           //  Pon tu contraseña de MySQL aquí
        database: "mydb",
        port: 3306              // Puerto por defecto de MySQL
    });

    // Intentar conectar
    connection.connect((error) => {
        if(error) {
            console.error(" Error conectando a la BDD:", error.message);
            console.log("  El servidor seguirá funcionando sin base de datos");
            console.log("\n Verifica:");
            console.log("   - MySQL está corriendo");
            console.log("   - Usuario y contraseña son correctos");
            console.log("   - La base de datos 'mydb' existe\n");
            return;
        }

        console.log("BDD Connected!");
        app.set("bdd", connection);
        
        // Probar una consulta simple
        connection.query("SELECT DATABASE() as db", (err, result) => {
            if (!err) {
                console.log(`Base de datos activa: ${result[0].db}`);
            }
        });
    });

    // Manejar desconexiones
    connection.on('error', (err) => {
        console.error('Error de base de datos:', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('Conexión a la base de datos perdida');
        }
    });

    return connection;
};