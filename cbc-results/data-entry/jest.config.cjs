module.exports = {
    //  preset: "ts-jest",
    transform: {
        "^.+\\.ts$": "@swc/jest",
    },
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "js", "json"],
    testMatch: ["**/*.spec.ts"],
}