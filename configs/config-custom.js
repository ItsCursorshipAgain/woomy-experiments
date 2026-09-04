let developer = (options = {}) => {
    let level = options.level ?? 3,
        randomColors = options.randomColors ?? false,
        teams = options.teams ?? false,
        teamAmount = options.teamAmount ?? 1,
        size = options.size ?? 2500;
    return {
        "IS_DEV_SERVER": true,
        "BETA": level,
        "MODE": (teams) ? "tdm" : "ffa",
        "displayName": "Comet's Developer Server",
        "displayDesc": (level) ? "Self-explanatory; no unauthorized players may join." : "Self-explanatory.",
        "RANDOM_COLORS": randomColors,
        "TEAM_AMOUNT": teamAmount,
        "WIDTH": size,
        "HEIGHT": size,
        "X_GRID": 1,
        "Y_GRID": 1,
        "ROOM_SETUP": [["norm"]],
        "MAX_FOOD": 0,
        "MAX_NEST_FOOD": 0,
        "MAX_CRASHERS": 0,
        "MAX_SANCS": 0,
        "BOSS_SPAWN_TIMER": 0
    }
},
    bossRushKillRace = (teams = 2) => {
    return {
        "MODE": "tdm",
        "TEAM_AMOUNT": teams,
        "IS_BOSS_RUSH": true,
        "KILL_RACE": true,
        "displayName": `${teams} Team Boss Rush`,
        "displayDesc": "Fight against your opponents to see who can kill the most amount of bosses in 75 waves; the team with the most amount of bosses defeated by the end of the final wave wins the game!",
        "WIDTH": 6500,
        "HEIGHT": 6500,
        "X_GRID": 19,
        "Y_GRID": 18,
        "MAX_FOOD": 0,
        "MAX_NEST_FOOD": 0,
        "MAX_CRASHERS": 0,
        "MAX_SANCS": 0,
        "BOSS_SPAWN_TIMER": 0,
        "ROOM_SETUP": [       /*C*/
            ["P P P P P P P P P P P P P P P P P P P"],
            ["P P P P P P P P P P P P P P P P P P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N P P P P P P P P P N N N P P"], // C
            ["P P N N N P P P P P P P P P N N N P P"], // C
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P N N N N N N N N N N N N N N N P P"],
            ["P P P P P P P P P P P P P P P P P P P"],
            ["P P P P P P P P P P P P P P P P P P P"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "N": return "norm";
                case "P": return "nest";
                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "MAXBOSSES": 6,
        "MINBOSSES": 3,
        "MAX_BOSS_INCREMENT": 2,
        "MAX_BOSS_INCREMENT_INTERVAL": 5,
        "MAX_BOSS_CAP": 30,
        "MIN_BOSS_INCREMENT": 3,
        "MIN_BOSS_INCREMENT_INTERVAL": 10,
        "MIN_BOSS_CAP": 20,
        "CANNOT_SHOOT_IN_BASE": false
    }
},
    ffa = (options = {}) => {
    let survival = options.survival ?? false,
        blackout = options.blackout ?? false,
        randomColors = options.randomColors ?? false,
        lottery = options.lottery ?? false;
    return {
        "SURVIVAL": survival,
        "BLACKOUT": blackout,
        "RANDOM_COLORS": randomColors,
        "TANK_LOTTERY": lottery,
        "displayName": (survival) ? "Comet's FFA Survival" :
                       (blackout) ? "Comet's Blackout FFA" :
                       (randomColors) ? "Random Color FFA" :
                       (lottery) ? "Lottery FFA" :
                       "Comet's FFA",
        "displayDesc": (survival) ? "Everyone for themselves, but the level-up is disabled and all level 60 tanks have been removed." :
                       (randomColors) ? "Everyone for themselves, now with unique colors for each player and bot! Die and respawn for your color to be refreshed." :
                       (lottery) ? "Everyone for themselves, but you start as a random tank and become another one whenever you respawn." :
                       "Self-explanatory.",
        "WIDTH": 8500,
        "HEIGHT": 8500,
        "ROOM_SETUP": [
            ["R N N N G N N N R R N N N G N N N R"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N G N N N N N N N N N N G N N N"],
            ["G N N N N N N N N N N N N N N N N G"],
            ["N N N N N N N N P P N N N N N N N N"],
            ["N N N N N N R P P P P R N N N N N N"],
            ["N N N N N N P P P P P P N N N N N N"],
            ["R N N N N P P P R R P P P N N N N R"],
            ["R N N N N P P P R R P P P N N N N R"],
            ["N N N N N N P P P P P P N N N N N N"],
            ["N N N N N N R P P P P R N N N N N N"],
            ["N N N N N N N N P P N N N N N N N N"],
            ["G N N N N N N N N N N N N N N N N G"],
            ["N N N G N N N N N N N N N N G N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["R N N N G N N N R R N N N G N N N R"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "N": return "norm";
                case "P": return "nest";
                case "R": return "roid";
                case "G": return "rock";
                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "MAX_FOOD": 504, // 288
        "MAX_COMBINED_NEST_FOOD": 63, // 36
        "MAX_CRASHERS": 72, // 36
        "EVOLVE_HALT_CHANCE": (survival) ? .4 : .2,
        "EVOLVE_TIME": (survival) ? 120_000 : 60_000,
        "EVOLVE_TIME_RAN_ADDER": (survival) ? 180_000 : 120_000,
    }
},
    ffaElimination = (options = {}) => {
    let blackout = options.blackout ?? false,
        randomColors = options.randomColors ?? false,
        lottery = options.lottery ?? false;
    return {
        "ELIMINATION_MODE": true,
        "BLACKOUT": blackout,
        "RANDOM_COLORS": randomColors,
        "TANK_LOTTERY": lottery,
        "displayName": (blackout) ? "Blackout FFA Elimination" :
                       (randomColors) ? "Random Color Elimination" :
                       (lottery) ? "Lottery FFA Elimination" :
                       "FFA Elimination",
        "displayDesc": (blackout) ? "Everyone for themselves in the darkness, but the player(s) with the lowest score count is eliminated after a certain time.\n\nThe game starts when at least 3 players join, and anyone who joins after the game starts can turn into a Sentry to try and mess with the scores of the people competing.\n\nBots are not present." :
                       (randomColors) ? "Everyone for themselves with unique colors, but the player(s) with the lowest score count is eliminated after a certain time.\n\nThe game starts when at least 3 players join, and anyone who joins after the game starts can turn into a Sentry to try and mess with the scores of the people competing.\n\nBots are not present." :
                       (lottery) ? "Everyone for themselves with randomized tanks, but the player(s) with the lowest score count is eliminated after a certain time.\n\nThe game starts when at least 3 players join, and anyone who joins after the game starts can turn into a Sentry to try and mess with the scores of the people competing.\n\nBots are not present." :
                       "Everyone for themselves, but the player(s) with the lowest score count is eliminated after a certain time.\n\nThe game starts when at least 3 players join, and anyone who joins after the game starts can turn into a Sentry to try and mess with the scores of the people competing.\n\nBots are not present.",
        "WIDTH": 5250,
        "HEIGHT": 5250,
        "ROOM_SETUP": [
            ["R N N N G N N N R R N N N G N N N R"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N G N N N N N N N N N N G N N N"],
            ["G N N N N N N N N N N N N N N N N G"],
            ["N N N N N N N N P P N N N N N N N N"],
            ["N N N N N N R P P P P R N N N N N N"],
            ["N N N N N N P P P P P P N N N N N N"],
            ["R N N N N P P P R R P P P N N N N R"],
            ["R N N N N P P P R R P P P N N N N R"],
            ["N N N N N N P P P P P P N N N N N N"],
            ["N N N N N N R P P P P R N N N N N N"],
            ["N N N N N N N N P P N N N N N N N N"],
            ["G N N N N N N N N N N N N N N N N G"],
            ["N N N G N N N N N N N N N N G N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["R N N N G N N N R R N N N G N N N R"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "N": return "norm";
                case "P": return "nest";
                case "R": return "roid";
                case "G": return "rock";
                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "MAX_FOOD": 350, // 288
        "MAX_COMBINED_NEST_FOOD": 57, // 36
        "MAX_CRASHERS": 65, // 36
        "MAX_SANCS": 1,
        "BOSS_SPAWN_TIMER": 0,
        "EVOLVE_TIME": 45_000,
        "EVOLVE_TIME_RAN_ADDER": 90_000,
        "EVOLVE_HALT_CHANCE": .35,
        "tabLimit": 1
    }
},
    ffaWorld = (() => {
    let shuffledNests = ['#E7896D', '#EFC74B', 'nest', '#7ADBBC', '#FDA54D', '#A177FC', '#65F0EC', '#E8EBF7'].sort(function() {
        return .5 - Math.random();
    });
    return {
        "displayName": "FFA World",
        "displayDesc": "Everyone for themselves in a massive arena, with extra nests to go around! To help you travel, portals are present as well.",
        "X_GRID": 49,
        "Y_GRID": 49,
        "WIDTH": 25000,
        "HEIGHT": 25000,
        "PORTALS": {
            "ENABLED": true,
            "THRESHOLD": 500,
            "GRAVITY": 20000,
            "DIVIDER_1": { "ENABLED": false },
            "DIVIDER_2": { "ENABLED": false }
        },
        "ROOM_SETUP": [                                     /*C*/
            ["R R R G N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N G R R R"],
            ["R R G N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N G R R"],
            ["R G N N N N N N N N N N N N N N N N N N N N N G R G N N N N N N N N N N N N N N N N N N N N N G R"],
            ["G N N N N N N N N N N G G G N N N N N N N N N N N N N N N N N N N N N G G G N N N N N N N N N N G"],
            ["N N N N N N N N N N N G P G N N N N N N N N N N N N N N N N N N N N N G P G N N N N N N N N N N N"],
            ["N N N N N N N N N N N G G G N N N N G G 1 1 1 G G G 1 1 1 G G N N N N G G G N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N G 1 1 1 1 1 1 G 1 1 1 1 1 1 G N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 N N N N N N N N N N N N N N N N N"],
            ["N N N N N N G 2 R 2 G N N N N N N 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 N N N N N N G 3 R 3 G N N N N N N"],
            ["N N N N N G 2 2 2 2 2 G N N N N N 1 1 R R 1 1 1 1 1 1 1 R R 1 1 N N N N N G 3 3 3 3 3 G N N N N N"],
            ["N N N N G 2 2 2 2 2 2 2 G N N N N 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 N N N N G 3 3 3 3 3 3 3 G N N N N"],
            ["N N N 2 2 2 2 2 2 2 2 2 2 2 N N N 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 N N N 3 3 3 3 3 3 3 3 3 3 3 N N N"],
            ["N N N R 2 2 2 2 2 2 2 2 2 R N N N G 1 1 1 1 1 1 G 1 1 1 1 1 1 G N N N R 3 3 3 3 3 3 3 3 3 R N N N"],
            ["N N N 2 2 2 2 2 2 2 2 2 2 2 N N N N G G 1 1 1 G G G 1 1 1 G G N N N N 3 3 3 3 3 3 3 3 3 3 3 N N N"],
            ["N N N N G 2 2 2 2 2 2 2 G N N N N N N N N N N N N N N N N N N N N N N N G 3 3 3 3 3 3 3 G N N N N"],
            ["N N N N N G 2 2 2 2 2 G N N N N N N N N N N N N N N N N N N N N N N N N N G 3 3 3 3 3 G N N N N N"],
            ["N N N N N N G 2 R 2 G N N N N N N N N N N N N N N N N N N N N N N N N N N N G 3 R 3 G N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N G N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N G R G N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N 4 4 4 N N N N N N N N N G N N N N N N N N N 5 5 5 N N N N N N N N N N N N"],
            ["N N N N N N N N N N N 4 4 4 4 4 N N N N N N N N N N N N N N N N N 5 5 5 5 5 N N N N N N N N N N N"],
            ["N N N N N N N N N 4 4 4 4 4 4 4 4 4 N N N N N N N N N N N N N 5 5 5 5 5 5 5 5 5 N N N N N N N N N"],
            ["N N N N N N N N 4 4 4 4 4 4 4 4 4 4 4 N N N N N N N N N N N 5 5 5 5 5 5 5 5 5 5 5 N N N N N N N N"],
            ["N N N G N N N 4 4 4 4 4 G G G 4 4 4 4 4 N N N G G G N N N 5 5 5 5 5 G G G 5 5 5 5 5 N N N G N N N"],
            ["N N G P G N N 4 4 4 4 4 G R G 4 4 4 4 4 N N N G P G N N N 5 5 5 5 5 G R G 5 5 5 5 5 N N G P G N N"], /*C*/
            ["N N N G N N N 4 4 4 4 4 G G G 4 4 4 4 4 N N N G G G N N N 5 5 5 5 5 G G G 5 5 5 5 5 N N N G N N N"],
            ["N N N N N N N N 4 4 4 4 4 4 4 4 4 4 4 N N N N N N N N N N N 5 5 5 5 5 5 5 5 5 5 5 N N N N N N N N"],
            ["N N N N N N N N N 4 4 4 4 4 4 4 4 4 N N N N N N N N N N N N N 5 5 5 5 5 5 5 5 5 N N N N N N N N N"],
            ["N N N N N N N N N N N 4 4 4 4 4 N N N N N N N N N N N N N N N N N 5 5 5 5 5 N N N N N N N N N N N"],
            ["N N N N N N N N N N N N 4 4 4 N N N N N N N N N G N N N N N N N N N 5 5 5 N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N G R G N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N G N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N G 6 R 6 G N N N N N N N N N N N N N N N N N N N N N N N N N N N G 7 R 7 G N N N N N N"],
            ["N N N N N G 6 6 6 6 6 G N N N N N N N N N N N N N N N N N N N N N N N N N G 7 7 7 7 7 G N N N N N"],
            ["N N N N G 6 6 6 6 6 6 6 G N N N N N N N N N N N N N N N N N N N N N N N G 7 7 7 7 7 7 7 G N N N N"],
            ["N N N 6 6 6 6 6 6 6 6 6 6 6 N N N N G G 8 8 8 G G G 8 8 8 G G N N N N 7 7 7 7 7 7 7 7 7 7 7 N N N"],
            ["N N N R 6 6 6 6 6 6 6 6 6 R N N N G 8 8 8 8 8 8 G 8 8 8 8 8 8 G N N N R 7 7 7 7 7 7 7 7 7 R N N N"],
            ["N N N 6 6 6 6 6 6 6 6 6 6 6 N N N 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 N N N 7 7 7 7 7 7 7 7 7 7 7 N N N"],
            ["N N N N G 6 6 6 6 6 6 6 G N N N N 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 N N N N G 7 7 7 7 7 7 7 G N N N N"],
            ["N N N N N G 6 6 6 6 6 G N N N N N 8 8 R R 8 8 8 8 8 8 8 R R 8 8 N N N N N G 7 7 7 7 7 G N N N N N"],
            ["N N N N N N G 6 R 6 G N N N N N N 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 N N N N N N G 7 R 7 G N N N N N N"],
            ["N N N N N N N N N N N N N N N N N 8 8 8 8 8 8 8 8 8 8 8 8 8 8 8 N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N G 8 8 8 8 8 8 G 8 8 8 8 8 8 G N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N G G G N N N N G G 8 8 8 G G G 8 8 8 G G N N N N G G G N N N N N N N N N N N"],
            ["N N N N N N N N N N N G P G N N N N N N N N N N N N N N N N N N N N N G P G N N N N N N N N N N N"],
            ["G N N N N N N N N N N G G G N N N N N N N N N N N N N N N N N N N N N G G G N N N N N N N N N N G"],
            ["R G N N N N N N N N N N N N N N N N N N N N N G R G N N N N N N N N N N N N N N N N N N N N N G R"],
            ["R R G N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N G R R"],
            ["R R R G N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N G R R R"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "N": return "norm";
                case "R": return "roid";
                case "G": return "rock";
                case "P": return "port";

                case "1": return shuffledNests[0];
                case "2": return shuffledNests[1];
                case "3": return shuffledNests[2];
                case "4": return shuffledNests[3];
                case "5": return shuffledNests[4];
                case "6": return shuffledNests[5];
                case "7": return shuffledNests[6];
                case "8": return shuffledNests[7];

                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "MAX_FOOD": 1242, // 1775
        "MAX_COMBINED_NEST_FOOD": 497, // 622
        "MAX_CRASHERS": 563, // 622
        "MAX_SANCS": 3
    }
})(),
    fourTDM = (() => {
    let shuffledBases = [
        ["bas1", "n_b1"],
        ["bas2", "n_b2"],
        ["bas3", "n_b3"],
        ["bas4", "n_b4"]
    ].sort(function() { return .5 - Math.random() });
    return {
        "MODE": "tdm",
        "TEAM_AMOUNT": 4,
        "displayName": "Comet's 4 TDM",
        "displayDesc": "Self-explanatory.",
        "ROOM_SETUP": [                /*CE CE*/
            ["B1 B1 B1 B1 NM NM NM NM NM RK RK NM NM NM NM NM B2 B2 B2 B2"],
            ["B1 P1 B1 B1 NM NM NM NM NM RK RK NM NM NM NM NM B2 B2 P2 B2"],
            ["B1 B1 RD RK NM NM NM NM NM NM NM NM NM NM NM NM RK RD B2 B2"],
            ["B1 B1 RK RK NM NM NM NM RK RK RK RK NM NM NM NM RK RK B2 B2"],
            ["NM NM NM NM NM RK RK RK RK PN PN RK RK RK RK NM NM NM NM NM"],
            ["NM NM NM NM RK PN PN RD RK PN PN RK RD PN PN RK NM NM NM NM"],
            ["NM NM NM NM RK PN PN PN RD PN PN RD PN PN PN RK NM NM NM NM"],
            ["NM NM NM NM RK RD PN PN PN PN PN PN PN PN RD RK NM NM NM NM"],
            ["NM NM NM RK RK RK RD PN PN PN PN PN PN RD RK RK RK NM NM NM"],
            ["RK RK NM RK PN PN PN PN PN RD RD PN PN PN PN PN RK NM RK RK"], // CE
            ["RK RK NM RK PN PN PN PN PN RD RD PN PN PN PN PN RK NM RK RK"], // CE
            ["NM NM NM RK RK RK RD PN PN PN PN PN PN RD RK RK RK NM NM NM"],
            ["NM NM NM NM RK RD PN PN PN PN PN PN PN PN RD RK NM NM NM NM"],
            ["NM NM NM NM RK PN PN PN RD PN PN RD PN PN PN RK NM NM NM NM"],
            ["NM NM NM NM RK PN PN RD RK PN PN RK RD PN PN RK NM NM NM NM"],
            ["NM NM NM NM NM RK RK RK RK PN PN RK RK RK RK NM NM NM NM NM"],
            ["B4 B4 RK RK NM NM NM NM RK RK RK RK NM NM NM NM RK RK B3 B3"],
            ["B4 B4 RD RK NM NM NM NM NM NM NM NM NM NM NM NM RK RD B3 B3"],
            ["B4 P4 B4 B4 NM NM NM NM NM RK RK NM NM NM NM NM B3 B3 P3 B3"],
            ["B4 B4 B4 B4 NM NM NM NM NM RK RK NM NM NM NM NM B3 B3 B3 B3"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "NM": return "norm";
                case "PN": return "nest";
                case "RD": return "roid";
                case "RK": return "rock";
                
                case "P1": return shuffledBases[0][0];
                case "P2": return shuffledBases[1][0];
                case "P3": return shuffledBases[2][0];
                case "P4": return shuffledBases[3][0];
                case "B1": return shuffledBases[0][1];
                case "B2": return shuffledBases[1][1];
                case "B3": return shuffledBases[2][1];
                case "B4": return shuffledBases[3][1];

                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "X_GRID": 20,
        "Y_GRID": 20,
        "WIDTH": 9000,
        "HEIGHT": 9000,
        "MAX_FOOD": 408, // 272 * 1.5
        "MAX_COMBINED_NEST_FOOD": 100, // 80 * 1.25
        "MAX_CRASHERS": 120 // 80 * 1.5
    }
})(),
    maze = (options = {}) => {
    let blackout = options.blackout ?? false;
    return {
        "BLACKOUT": blackout,
        "MAZE": {
            "ENABLED": true,
            "cellSize": 10000/31,
            "stepOneSpacing": 3,
            "fillChance": 0.35,
            "sparedChance": 0.65,
            "margin": .25
        },
        "displayName": (blackout) ? "Comet's Blackout Maze" :
                       "Comet's Maze",
        "displayDesc": "Self-explanatory.",
        "X_GRID": 31,
        "Y_GRID": 31,
        "WIDTH": 10000,
        "HEIGHT": 10000,
        "ROOM_SETUP": [                   /*C*/
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N R R R R R R R R R N N N N N N N N N N N"],
            ["N N N N N N N N N N N R P P P P P P P R N N N N N N N N N N N"],
            ["N N N N N N N N N N N R P P P P P P P R N N N N N N N N N N N"],
            ["N N N N N N N N N N N R P P P P P P P R N N N N N N N N N N N"],
            ["N N N N N N N N N N N R P P P P P P P R N N N N N N N N N N N"], /*C*/
            ["N N N N N N N N N N N R P P P P P P P R N N N N N N N N N N N"],
            ["N N N N N N N N N N N R P P P P P P P R N N N N N N N N N N N"],
            ["N N N N N N N N N N N R P P P P P P P R N N N N N N N N N N N"],
            ["N N N N N N N N N N N R R R R R R R R R N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "N": return "norm";
                case "P": return "nest";
                case "R": return "rock";
                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "MAX_FOOD": 625, // 961
        "MAX_COMBINED_NEST_FOOD": 49, // 49
        "MAX_CRASHERS": 58, // 98
        "MAX_SANCS": 1,
        "EVOLVE_TIME_RAN_ADDER": 240000,
        "EVOLVE_HALT_CHANCE": .4,
        "BORDER_FORCE": 0.075
    }
},
    mazeElimination = {
    "MAZE": {
        "ENABLED": true,
        "cellSize": 5250/31,
        "stepOneSpacing": 3,
        "fillChance": 0.35,
        "sparedChance": 0.65,
        "margin": .25
    },
    "ELIMINATION_MODE": true,
    "displayName": "Maze Elimination",
    "displayDesc": "Everyone for themselves in a maze, but the player(s) with the lowest score count is eliminated after a certain time.\n\nThe game starts when at least 3 players join, and anyone who joins after the game starts can turn into a Sentry to try and mess with the scores of the people competing.\n\nBots are not present.",
    "X_GRID": 31,
    "Y_GRID": 31,
    "WIDTH": 5250,
    "HEIGHT": 5250,
    "ROOM_SETUP": [                   /*C*/
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"],
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"],
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"],
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"],
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"], /*C*/
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"],
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"],
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"],
        ["N N N N N N N N N N N P P P P P P P P P N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N N"]
    ].map(row => row[0].split(" ").map(cell => {
        switch (cell) {
            case "N": return "norm";
            case "P": return "nest";
            case "R": return "rock";
            default: throw new TypeError(cell + " is not a valid cell type!");
        }
    })),
    "MAX_FOOD": 350, // 961
    "MAX_COMBINED_NEST_FOOD": 44, // 49
    "MAX_CRASHERS": 51, // 98
    "MAX_SANCS": 1,
    "BOSS_SPAWN_TIMER": 0,
    "EVOLVE_HALT_CHANCE": .3,
    "BORDER_FORCE": 0.075,
    "tabLimit": 1
},
    minibossRush = {
    "MODE": "tdm",
    "IS_BOSS_RUSH": true,
    "displayName": "Miniboss Rush",
    "displayDesc": "Boss Rush, but in a smallish area.",
    "TEAM_AMOUNT": 1,
    "WIDTH": 4800,
    "HEIGHT": 4800,
    "X_GRID": 15,
    "Y_GRID": 15,
    "MAX_FOOD": 0,
    "MAX_NEST_FOOD": 0,
    "MAX_CRASHERS": 0,
    "MAX_SANCS": 0,
    "BOSS_SPAWN_TIMER": 0,
    "ROOM_SETUP": [
        ["B B B B B B B B B B B B B B B"],
        ["B B B B B B B B B B B B B B B"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N S N N N S N N N S N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["B B B B B B B B B B B B B B B"],
        ["B B B B B B B B B B B B B B B"]
    ].map(row => row[0].split(" ").map(cell => {
        switch (cell) {
            case "N": return "norm";
            case "S": return "bas1";
            case "B": return "bas2";
            default: throw new TypeError(cell + " is not a valid cell type!");
        }
    })),
    "MAXBOSSES": 5,
    "MINBOSSES": 2,
    "MAX_BOSS_INCREMENT": 3,
    "MAX_BOSS_INCREMENT_INTERVAL": 5,
    "MIN_BOSS_INCREMENT": 2,
    "MIN_BOSS_INCREMENT_INTERVAL": 10,
    "MAX_BOSS_CAP": 20,
    "MIN_BOSS_CAP": 10,
    "CANNOT_SHOOT_IN_BASE": false
},
    openTDM = (options = {}) => {
    let teamAmount = options.teamAmount ?? 2;

    return {
        "MODE": "tdm",
        "TEAM_AMOUNT": teamAmount,
        "displayName": `Comet's Open ${teamAmount} TDM`,
        "displayDesc": "Self-explanatory.",
        "WIDTH": 9000,
        "HEIGHT": 9000,
        "ROOM_SETUP": [
            ["R N N N r N N N r r N N N r N N N R"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N r N N N N N N N N N N r N N N"],
            ["r N N N N N N N N N N N N N N N N r"],
            ["N N N N N N N N P P N N N N N N N N"],
            ["N N N N N N R P P P P R N N N N N N"],
            ["N N N N N N P P P P P P N N N N N N"],
            ["r N N N N P P P R R P P P N N N N r"],
            ["r N N N N P P P R R P P P N N N N r"],
            ["N N N N N N P P P P P P N N N N N N"],
            ["N N N N N N R P P P P R N N N N N N"],
            ["N N N N N N N N P P N N N N N N N N"],
            ["r N N N N N N N N N N N N N N N N r"],
            ["N N N r N N N N N N N N N N r N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N"],
            ["R N N N r N N N r r N N N r N N N R"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "N": return "norm";
                case "P": return "nest";
                case "R": return "roid";
                case "r": return "rock";
                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "MAX_FOOD": 504, // 288
        "MAX_COMBINED_NEST_FOOD": 63, // 36
        "MAX_CRASHERS": 72 // 36
    }
},
    portalFFA = (options = {}) => {
    let blackout = options.blackout ?? false,
        randomColors = options.randomColors ?? false,
        lottery = options.lottery ?? false;
    return {
        "BLACKOUT": blackout,
        "RANDOM_COLORS": randomColors,
        "TANK_LOTTERY": lottery,
        "displayName": "Comet's Portal FFA",
        "displayDesc": "Self-explanatory.",
        "X_GRID": 49,
        "Y_GRID": 49,
        "WIDTH": 13500,
        "HEIGHT": 13500,
        "PORTALS": {
            "ENABLED": true,
            "THRESHOLD": 500,
            "GRAVITY": 20000,
            "DIVIDER_1": {
                "ENABLED": true,
                "LEFT": 13500/49 * 21,
                "RIGHT": 13500/49 * 28,
                "SWAPPED": false
            },
            "DIVIDER_2": {
                "ENABLED": true,
                "TOP": 13500/49 * 14,
                "BOTTOM": 13500/49 * 35,
                "SWAPPED": true
            }
        },
        "MAZE": {
            "ENABLED": true,
            "cellSize": 13500/49,
            "stepOneSpacing": 2,
            "fillChance": .35,
            "sparedChance": .65,
            "margin": [14, 14, 0, 28],
            "posMulti": 1/21,
            "LOCS_TO_AVOID": ['nest', 'port', 'edge']
        },
        "ROOM_SETUP": [                                     /*C*/
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E R G N N N N N N N G R G N N N N N N N G R"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E G G N N N N N N N G G G N N N N N N N G G"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N G G N N N N N N N N N G G N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N G G N N N N N N N N N G G N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N N N N N N G G G N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N N N N N G P P P G N N N N N N N N"],
            ["N N N N N N N N P P P P P N N N N N N N N E E E E E E E N N N N N N N G P P P P P G N N N N N N N"],
            ["N N N N N N N N P P P P P N N N N N N N N E E E E E E E G G N N N N G P P P P P P P G N N N N G G"],
            ["N N N N N N N N P P O P P N N N N N N N N E E E E E E E R G N N N N G P P P O P P P G N N N N G R"], // C
            ["N N N N N N N N P P P P P N N N N N N N N E E E E E E E G G N N N N G P P P P P P P G N N N N G G"],
            ["N N N N N N N N P P P P P N N N N N N N N E E E E E E E N N N N N N N G P P P P P G N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N N N N N G P P P G N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N N N N N N G G G N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N G G N N N N N N N N N G G N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N G G N N N N N N N N N G G N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E N N N N N N N N N N N N N N N N N N N N N"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E G G N N N N N N N G G G N N N N N N N G G"],
            ["N N N N N N N N N N N N N N N N N N N N N E E E E E E E R G N N N N N N N G R G N N N N N N N G R"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "N": return "norm";
                case "P": return "nest";
                case "R": return "roid";
                case "G": return "rock";
                case "O": return "port";
                case "E": return "edge";
                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "OUTSIDE_ROOM_DAMAGE": .5,
        "MAX_FOOD": 403, // 288
        "MAX_COMBINED_NEST_FOOD": 57, // 36
        "MAX_CRASHERS": 65, // 36
        "PLAYER_SPAWN_TILES": ['norm', 'nest', 'roid', 'rock']
    }
},
    protectThePlexus = {
    "MODE": "tdm",
    "IS_BOSS_RUSH": true,
    "HAS_PLEXUS": true,
    "displayName": "Protect The Plexus",
    "displayDesc": "Similar to Siege, but instead of protecting multiple Sanctuaries, you protect one massive one called a “Plexus”\n\nEvery 10 waves, the Plexus will change classes.\nIf the Plexus is captured at any point, the game immediately results in a loss.\n\nThis mode is beta, so the gameplay is not final.\nRoom by Fuzz.",
    "TEAM_AMOUNT": 1,
    "WIDTH": 7500,
    "HEIGHT": 7500,
    "X_GRID": 9,
    "Y_GRID": 9,
    "MAXBOSSES": 10,
    "MINBOSSES": 5,
    "MAX_BOSS_INCREMENT": 5,
    "MAX_BOSS_INCREMENT_INTERVAL": 5,
    "MIN_BOSS_INCREMENT": 5,
    "MIN_BOSS_INCREMENT_INTERVAL": 10,
    "MAX_BOSS_CAP": 50,
    "MIN_BOSS_CAP": 25,
    "ROOM_SETUP": [
        ["B B B B B B B B B"],
        ["B N N N N N N N B"],
        ["B N N N N N N N B"],
        ["B N N N N N N N B"],
        ["B N N N P N N N B"],
        ["B N N N N N N N B"],
        ["B N N N N N N N B"],
        ["B N N N N N N N B"],
        ["B B B B B B B B B"]
    ].map(row => row[0].split(" ").map(cell => {
        switch (cell) {
            case "N": return "norm";
            case "P": return "bas1";
            case "B": return "bas2";
            default: throw new TypeError(cell + " is not a valid cell type!");
        }
    })),
    "MAX_FOOD": 0,
    "MAX_NEST_FOOD": 0,
    "MAX_CRASHERS": 0,
    "MAX_SANCS": 0,
    "BOSS_SPAWN_TIMER": 0,
    "CANNOT_SHOOT_IN_BASE": false
},
    sixTDM = (options = {}) => {
    let hasDominator = options.hasDominator ?? false;

    let shuffledBases = [
        ["bad1", "n_b1"],
        ["bad2", "n_b2"],
        ["bad3", "n_b3"],
        ["bad4", "n_b4"],
        ["bad5", "n_b5"],
        ["bad6", "n_b6"]
    ].sort(function() {
        return .5 - Math.random();
    });
    return {
        "MODE": "tdm",
        "TEAM_AMOUNT": 6,
        "displayName": "6 TDM",
        "displayDesc": "Self-explanatory.",
        "SPAWN_DOMINATORS": hasDominator,
        "DOMINATOR_SHUFFLE_TIMER": 600,
        "CAN_CLOSE": !hasDominator,
        "ROOM_SETUP": [                   /*CE*/
            ["P1 B1 NM NM NM NM NM NM NM B5 P5 B5 NM NM NM NM NM NM NM B4 P4"],
            ["B1 B1 NM NM NM NM NM NM NM B5 B5 B5 NM NM NM NM NM NM NM B4 B4"],
            ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
            ["NM NM NM RO GR NM NM NM NM GR RO GR NM NM NM NM GR RO NM NM NM"],
            ["NM NM NM GR RO NM NM NM NM GR RO GR NM NM NM NM RO GR NM NM NM"],
            ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM NM PN PN GR PN PN NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM PN PN PN PN PN PN PN NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM PN PN PN PN PN PN PN PN PN NM NM NM NM NM NM"],
            ["NM NM GR NM NM NM PN PN PN PN GR PN PN PN PN NM NM NM GR NM NM"],
            ["NM GR RO GR NM NM GR PN PN GR DR GR PN PN GR NM NM GR RO GR NM"], // CE
            ["NM NM GR NM NM NM PN PN PN PN GR PN PN PN PN NM NM NM GR NM NM"],
            ["NM NM NM NM NM NM PN PN PN PN PN PN PN PN PN NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM PN PN PN PN PN PN PN NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM NM PN PN GR PN PN NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
            ["NM NM NM GR RO NM NM NM NM GR RO GR NM NM NM NM RO GR NM NM NM"],
            ["NM NM NM RO GR NM NM NM NM GR RO GR NM NM NM NM GR RO NM NM NM"],
            ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
            ["B2 B2 NM NM NM NM NM NM NM B6 B6 B6 NM NM NM NM NM NM NM B3 B3"],
            ["P2 B2 NM NM NM NM NM NM NM B6 P6 B6 NM NM NM NM NM NM NM B3 P3"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "NM": return "norm";
                case "PN": return "nest";
                case "RO": return "roid";
                case "GR": return "rock";
                case "DR": return hasDominator ? "domi" : "roid";
                
                case "P1": return shuffledBases[0][0];
                case "P2": return shuffledBases[1][0];
                case "P3": return shuffledBases[2][0];
                case "P4": return shuffledBases[3][0];
                case "P5": return shuffledBases[4][0];
                case "P6": return shuffledBases[5][0];
                case "B1": return shuffledBases[0][1];
                case "B2": return shuffledBases[1][1];
                case "B3": return shuffledBases[2][1];
                case "B4": return shuffledBases[3][1];
                case "B5": return shuffledBases[4][1];
                case "B6": return shuffledBases[5][1];

                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "WIDTH": 9000,
        "HEIGHT": 9000,
        "X_GRID": 21,
        "Y_GRID": 21,
        "MAX_FOOD": 530, // 353 * 1.5
        "MAX_COMBINED_NEST_FOOD": 78, // 60 * 1.3
        "MAX_CRASHERS": 84 // 60 * 1.4
    };
},
    threeTDM = (options = {}) => {
    let hasDominators = options.hasDominators ?? false;

    let shuffledBases = [
        ["n_b1", "por1"],
        ["n_b2", "por2"],
        ["n_b3", "por3"]
    ].sort(function() {
        return .5 - Math.random();
    });
    return {
        "MODE": "tdm",
        "TEAM_AMOUNT": 3,
        "SPAWN_DOMINATORS": hasDominators,
        "displayName": "3 TDM",
        "displayDesc": "Self-explanatory." + (hasDominators ? "\nThere are dominators for either team to capture, but the arena will *not* close if all are captured by the same team." : ""),
        "CAN_CLOSE": !hasDominators,
        "DOMINATOR_SHUFFLE_TIMER": 600,
        "PORTALS": {
            "ENABLED": true,
            "THRESHOLD": 500,
            "GRAVITY": 20000,
            "DIVIDER_1": { "ENABLED": false },
            "DIVIDER_2": { "ENABLED": false }
        },
        "ROOM_SETUP": [                   /*CE*/
            ["P1 B1 B1 NM NM NM NM NM NM B3 P3 B3 NM NM NM NM NM NM B2 B2 P2"],
            ["B1 B1 NM NM NM NM NM NM NM B3 B3 B3 NM NM NM NM NM NM NM B2 B2"],
            ["B1 NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM B2"],
            ["NM NM NM NM ro NM NM NM NM ro RO ro NM NM NM NM ro NM NM NM NM"],
            ["NM NM NM ro DR ro NM NM NM NM NM NM NM NM NM ro DR ro NM NM NM"],
            ["NM NM NM NM ro NM NM NM NM NM PN NM NM NM NM NM ro NM NM NM NM"],
            ["NM NM NM NM NM NM NM NM PN PN PN PN PN NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM PN PN PN PN PN PN PN NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM PN PN PN PN PN PN PN PN PN NM NM NM NM NM NM"],
            ["ro ro NM NM NM PN PN PN PN PN ro PN PN PN PN PN NM NM NM ro ro"],
            ["RO ro NM NM PN PN PN PN PN ro RO ro PN PN PN PN PN NM NM ro RO"], // CE
            ["ro ro NM NM NM PN PN PN PN PN ro PN PN PN PN PN NM NM NM ro ro"],
            ["NM NM NM NM NM NM PN PN PN PN PN PN PN PN PN NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM PN PN PN PN PN PN PN NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM NM PN PN PN PN PN NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM ro NM NM NM NM NM PN NM NM NM NM NM ro NM NM NM NM"],
            ["NM NM NM ro DR ro NM NM NM NM NM NM NM NM NM ro DR ro NM NM NM"],
            ["NM NM NM NM ro NM NM NM NM ro RO ro NM NM NM NM ro NM NM NM NM"],
            ["B2 NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM B1"],
            ["B2 B2 NM NM NM NM NM NM NM B3 B3 B3 NM NM NM NM NM NM NM B1 B1"],
            ["P2 B2 B2 NM NM NM NM NM NM B3 P3 B3 NM NM NM NM NM NM B1 B1 P1"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "NM": return "norm";
                case "PN": return "nest";
                case "RO": return "roid";
                case "ro": return "rock";
                
                case "B1": return shuffledBases[0][0];
                case "B2": return shuffledBases[1][0];
                case "B3": return shuffledBases[2][0];
                case "P1": return shuffledBases[0][1];
                case "P2": return shuffledBases[1][1];
                case "P3": return shuffledBases[2][1];

                case "DN": return hasDominators ? "domi" : "norm";
                case "DP": return hasDominators ? "domi" : "nest";
                case "DR": return hasDominators ? "domi" : "roid";
                case "dr": return hasDominators ? "domi" : "rock";

                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "WIDTH": 10000,
        "HEIGHT": 10000,
        "X_GRID": 21,
        "Y_GRID": 21,
        "MAX_FOOD": 761, // 331
        "MAX_COMBINED_NEST_FOOD": 85, // 74
        "MAX_CRASHERS": 170 // 74
    };
},
    twoTDM = (isHell = false, hasDominators = false) => {
    let layout = [[
        ["P1 NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM P2"],
        ["B1 NM NM RO NM NM NM NM ro ro ro ro ro ro ro NM NM NM NM RO NM NM B2"],
        ["B1 NM NM NM NM NM NM NM NM NM NM DN NM NM NM NM NM NM NM NM NM NM B2"],
        ["B1 NM NM NM NM RO ro ro ro ro ro RO ro ro ro ro ro RO NM NM NM NM B2"],
        ["B1 NM ro ro NM ro PN PN PN PN PN PN PN PN PN PN PN ro NM ro ro NM B2"],
        ["P1 NM NM NM NM ro PN PN PN PN PN PN PN PN PN PN PN ro NM NM NM NM P2"],
        ["B1 NM NM NM NM ro PN PN PN PN PN PN PN PN PN PN PN ro NM NM NM NM B2"],
        ["B1 NM NM NM NM ro PN PN PN ro NM NM NM ro PN PN PN ro NM NM NM NM B2"],
        ["B1 NM ro NM NM ro PN PN PN NM NM ro NM NM PN PN PN ro NM NM ro NM B2"],
        ["B1 NM NM ro NM ro PN PN PN NM NM NM NM NM PN PN PN ro NM ro NM NM B2"],
        ["B1 NM ro NM NM ro PN PN PN NM ro ro ro NM PN PN PN ro NM NM ro NM B2"],
        ["P1 NM NM ro DN RO PN PN PN NM ro RO ro NM PN PN PN RO DN ro NM NM P2"],
        ["B1 NM ro NM NM ro PN PN PN NM ro ro ro NM PN PN PN ro NM NM ro NM B2"],
        ["B1 NM NM ro NM ro PN PN PN NM NM NM NM NM PN PN PN ro NM ro NM NM B2"],
        ["B1 NM ro NM NM ro PN PN PN NM NM ro NM NM PN PN PN ro NM NM ro NM B2"],
        ["B1 NM NM NM NM ro PN PN PN ro NM NM NM ro PN PN PN ro NM NM NM NM B2"],
        ["B1 NM NM NM NM ro PN PN PN PN PN PN PN PN PN PN PN ro NM NM NM NM B2"],
        ["P1 NM NM NM NM ro PN PN PN PN PN PN PN PN PN PN PN ro NM NM NM NM P2"],
        ["B1 NM ro ro NM ro PN PN PN PN PN PN PN PN PN PN PN ro NM ro ro NM B2"],
        ["B1 NM NM NM NM RO ro ro ro ro ro RO ro ro ro ro ro RO NM NM NM NM B2"],
        ["B1 NM NM NM NM NM NM NM NM NM NM DN NM NM NM NM NM NM NM NM NM NM B2"],
        ["B1 NM NM NM NM RO NM NM ro ro ro ro ro ro ro NM NM NM NM RO NM NM B2"],
        ["P1 NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM P2"]
    ], [
        ["P1 B1 B1 B1 B1 P1 B1 B1 B1 B1 B1 P1 B1 B1 B1 B1 B1 P1 B1 B1 B1 B1 P1"],
        ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
        ["NM NM NM NM ro NM NM NM ro NM ro NM ro NM ro NM NM NM ro NM NM NM NM"],
        ["NM RO NM NM ro NM NM NM NM ro NM ro NM ro NM NM NM NM ro NM NM RO NM"],
        ["NM NM NM NM NM NM NM NM NM NM NM DN NM NM NM NM NM NM NM NM NM NM NM"],
        ["NM NM NM RO ro ro ro ro ro ro ro RO ro ro ro ro ro ro ro RO NM NM NM"],
        ["NM NM NM ro PN PN PN PN PN PN PN PN PN PN PN PN PN PN PN ro NM NM NM"],
        ["NM NM NM ro PN PN PN PN PN PN PN PN PN PN PN PN PN PN PN ro NM NM NM"],
        ["NM ro NM ro PN PN PN PN PN PN PN PN PN PN PN PN PN PN PN ro NM ro NM"],
        ["NM ro NM ro PN PN PN ro NM NM NM NM NM NM NM ro PN PN PN ro NM ro NM"],
        ["NM ro NM ro PN PN PN NM NM NM ro ro ro NM NM NM PN PN PN ro NM ro NM"],
        ["NM ro DN RO PN PN PN NM ro NM ro RO ro NM ro NM PN PN PN RO DN ro NM"],
        ["NM ro NM ro PN PN PN NM NM NM ro ro ro NM NM NM PN PN PN ro NM ro NM"],
        ["NM ro NM ro PN PN PN ro NM NM NM NM NM NM NM ro PN PN PN ro NM ro NM"],
        ["NM ro NM ro PN PN PN PN PN PN PN PN PN PN PN PN PN PN PN ro NM ro NM"],
        ["NM NM NM ro PN PN PN PN PN PN PN PN PN PN PN PN PN PN PN ro NM NM NM"],
        ["NM NM NM ro PN PN PN PN PN PN PN PN PN PN PN PN PN PN PN ro NM NM NM"],
        ["NM NM NM RO ro ro ro ro ro ro ro RO ro ro ro ro ro ro ro RO NM NM NM"],
        ["NM NM NM NM NM NM NM NM NM NM NM DN NM NM NM NM NM NM NM NM NM NM NM"],
        ["NM RO NM NM ro NM NM NM NM ro NM ro NM ro NM NM NM NM ro NM NM RO NM"],
        ["NM NM NM NM ro NM NM NM ro NM ro NM ro NM ro NM NM NM ro NM NM NM NM"],
        ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
        ["P2 B2 B2 B2 B2 P2 B2 B2 B2 B2 B2 P2 B2 B2 B2 B2 B2 P2 B2 B2 B2 B2 P2"]
    ]][Math.floor(Math.random() * 2)],
        shuffledBases = [
        ["n_b1", "bas1"],
        ["n_b2", "bas2"]
    ].sort(function() {
        return .5 - Math.random();
    });
    return {
        "MODE": "tdm",
        "TEAM_AMOUNT": 2,
        "IS_HELL": isHell,
        "SPAWN_DOMINATORS": hasDominators,
        "DOMINATOR_SHUFFLE_TIMER": 600,
        "CAN_CLOSE": !hasDominators,
        "displayName": (isHell) ? "Comet's 2 TDM Hell" : "Comet's 2 TDM",
        "displayDesc": ((isHell) ? "Self-explanatory…\n\n…though only the mighty may last." : "Self-explanatory.") + ((hasDominators) ? "\nThere are dominators for either team to capture, but the arena will *not* close if all are captured by the same team." : ""),
        "ROOM_SETUP": layout.map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "NM": return (isHell) ? "nest" : "norm";
                case "RO": return (isHell) ? "nest" : "roid";
                case "ro": return (isHell) ? "nest" : "rock";
                case "DN": return (hasDominators) ? "domi" : (isHell) ? "nest" : "norm";
                case "DR": return (hasDominators) ? "domi" : (isHell) ? "nest" : "roid";
                case "dr": return (hasDominators) ? "domi" : (isHell) ? "nest" : "rock";
                case "PN": return (isHell) ? "rock" : "nest";
                
                case "B1": return shuffledBases[0][0];
                case "B2": return shuffledBases[1][0];
                case "P1": return shuffledBases[0][1];
                case "P2": return shuffledBases[1][1];

                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "X_GRID": 23,
        "Y_GRID": 23,
        "WIDTH": 12000,
        "HEIGHT": 12000,
        "MAX_FOOD": (isHell) ? 0 : 631, // 361
        "MAX_COMBINED_NEST_FOOD": (isHell) ? 474 : 160, // 120
        "MAX_CRASHERS": (isHell) ? 474 : 200, // 120
        "EVOLVE_HALT_CHANCE": (isHell) ? .6 : .2
    }
},
    warparound = (() => {
    let shuffledNests = [
        '#EFC74B',
        '#E7896D',
        'nest',
        '#7ADBBC',
        '#FDA54D',
        '#A177FC',
        '#65F0EC',
        '#E8EBF7'
    ].sort(function() {
        return .5 - Math.random();
    });
    return {
        "ARENA_TYPE": 2,
        "WIDTH": 8850,
        "HEIGHT": 8850,
        "X_GRID": 29,
        "Y_GRID": 29,
        "PORTALS": {
            "ENABLED": true,
            "THRESHOLD": 500,
            "GRAVITY": 20000,
            "DIVIDER_1": {
                "ENABLED": true,
                "LEFT": 8850/29 * 13,
                "RIGHT": 8850/29 * 16,
                "SWAPPED": false
            },
            "DIVIDER_2": {
                "ENABLED": true,
                "TOP": 8850/29 * 13,
                "BOTTOM": 8850/29 * 16,
                "SWAPPED": false
            }
        },
        "displayName": "FFA Warparound",
        "displayDesc": "Everyone for themselves, but the arena is divided into four sections and the borders teleport you to their opposing sides.",
        "ROOM_SETUP": [
            ["N N N N N N N N N N N N N E E E N N N N N N N N N N N N N"],
            ["N N N N N G R G N N N N N E E E N N N N N G R G N N N N N"],
            ["N N N N N G R G N N N N N E E E N N N N N G R G N N N N N"],
            ["N N N N N N N N N N N N N E E E N N N N N N N N N N N N N"],
            ["N N N N 1 1 1 1 1 N N N N E E E N N N N 2 2 2 2 2 N N N N"],
            ["N G G N 1 1 1 1 1 N G G N E E E N G G N 2 2 2 2 2 N G G N"],
            ["N R R N 1 1 1 1 1 N R R N E E E N R R N 2 2 2 2 2 N R R N"],
            ["N G G N 1 1 1 1 1 N G G N E E E N G G N 2 2 2 2 2 N G G N"],
            ["N N N N 1 1 1 1 1 N N N N E E E N N N N 2 2 2 2 2 N N N N"],
            ["N N N N N N N N N N N N N E E E N N N N N N N N N N N N N"],
            ["N N N N N G R G N N N N N E E E N N N N N G R G N N N N N"],
            ["N N N N N G R G N N N G G E E E G G N N N G R G N N N N N"],
            ["N N N N N N N N N N N G R E E E R G N N N N N N N N N N N"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["E E E E E E E E E E E E E E E E E E E E E E E E E E E E E"],
            ["N N N N N N N N N N N G R E E E R G N N N N N N N N N N N"],
            ["N N N N N G R G N N N G G E E E G G N N N G R G N N N N N"],
            ["N N N N N G R G N N N N N E E E N N N N N G R G N N N N N"],
            ["N N N N N N N N N N N N N E E E N N N N N N N N N N N N N"],
            ["N N N N 3 3 3 3 3 N N N N E E E N N N N 4 4 4 4 4 N N N N"],
            ["N G G N 3 3 3 3 3 N G G N E E E N G G N 4 4 4 4 4 N G G N"],
            ["N R R N 3 3 3 3 3 N R R N E E E N R R N 4 4 4 4 4 N R R N"],
            ["N G G N 3 3 3 3 3 N G G N E E E N G G N 4 4 4 4 4 N G G N"],
            ["N N N N 3 3 3 3 3 N N N N E E E N N N N 4 4 4 4 4 N N N N"],
            ["N N N N N N N N N N N N N E E E N N N N N N N N N N N N N"],
            ["N N N N N G R G N N N N N E E E N N N N N G R G N N N N N"],
            ["N N N N N G R G N N N N N E E E N N N N N G R G N N N N N"],
            ["N N N N N N N N N N N N N E E E N N N N N N N N N N N N N"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "N": return "norm";
                case "R": return "roid";
                case "G": return "rock";
                case "E": return "edge";

                case "1": return "nest";//shuffledNests[0];
                case "2": return "nest";//shuffledNests[1];
                case "3": return "nest";//shuffledNests[2];
                case "4": return "nest";//shuffledNests[3];
                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "MAX_FOOD": 460, // 576
        "MAX_COMBINED_NEST_FOOD": 72, // 100
        "MAX_CRASHERS": 116, // 100
        "EVOLVE_HALT_CHANCE": .3
    };
})();
function select(mode, options = {}) {
    let lifespan = options.lifespan ?? 0,
        testing = options.testing ?? false,
        beta = options.beta ?? 3
    
    mode.selectable = true;
    mode.BOSS_SPAWN_TIMER ??= 600;
    mode.EVOLVE_TIME ??= 60000;
    mode.EVOLVE_TIME_RAN_ADDER ??= 120000;
    mode.MAX_SANCS ??= 2;
    mode.SHINY_CHANCE ??= 1/1000;
    
    if (lifespan) mode.shutdowns = {
        enabled: true,
        interval: lifespan
    };

    if (testing) {
        mode.testingMode = true;
        mode.BETA = beta;
        mode.MAX_FOOD = 0;
        mode.MAX_COMBINED_NEST_FOOD = 0;
        mode.MAX_CRASHERS = 0;
        mode.MAX_SANCS = 0;
        mode.BOSS_SPAWN_TIMER = 0;
    }

    return mode;
};
select(ffa());
