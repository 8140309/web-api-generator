module.exports = {

    //config.appFolderName = "../rest-api-generator-files/files";
    appName: "nome-do-repoxxx11",
    homepage: "https://web-api-generator.herokuapp.com",

    clientId: process.env.CLIENT_ID || "b501db557e6dc37d83e9",
    clientSecret: process.env.CLIENT_PASSWORD || "440b8d91212a2d78ca43ca2862e30e5b8898a5cb",
    defaultConnectionString: process.env.DEFAULT_CONNECTION_STRING || "mongodb+srv://fernando:654321aA@cluster0-sejql.gcp.mongodb.net/testedb?retryWrites=true",
    port: process.env.PORT || 8080
};