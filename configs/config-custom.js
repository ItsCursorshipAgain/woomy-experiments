let ffa = (blackout = false) => {
    return {
        "BLACKOUT": blackout,
        "displayName": (blackout) ? "Fuzzy's Blackout FFA" : "Fuzzy's FFA",
        "displayDesc": "Self-explanatory.",
        "WIDTH": 8000,
        "HEIGHT": 8000,
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
    ffa_domination = {
    "SPAWN_DOMINATORS": true,
    "DOMINATOR_SHUFFLE_TIMER": 600,
    "displayName": "Fuzzy's FFA Domination",
    "displayDesc": "FFA, but there are two dominators on the arena for players to capture; doing so will put the dominator on their team.\n\nThe game does not end even if both dominators are captured by the same player.",
    "ROOM_SETUP": [       /*C*/
        ["R r N N N N N N N N N N N N N N N r R"],
        ["r r N N N N N N N N N N N N N N N r r"],
        ["N N N N N N N N N R N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N"],
        ["N N N N R N N N N N N N N N R N N N N"],
        ["N N N N N N N r P P P r N N N N N N N"],
        ["N N N N N N r P P P P P r N N N N N N"],
        ["N N N N N r P P P P P P P r N N N N N"],
        ["N r N r N P P P P P P P P P N r N r N"],
        ["N N D N N P P P P R P P P P N N D N N"], // C
        ["N r N r N P P P P P P P P P N r N r N"],
        ["N N N N N r P P P P P P P r N N N N N"],
        ["N N N N N N r P P P P P r N N N N N N"],
        ["N N N N N N N r P P P r N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N"],
        ["N N N N R N N N N N N N N N R N N N N"],
        ["N N N N N N N N N R N N N N N N N N N"],
        ["r r N N N N N N N N N N N N N N N r r"],
        ["R r N N N N N N N N N N N N N N N r R"]
    ].map(row => row[0].split(" ").map(cell => {
        switch (cell) {
            case "N": return "norm";
            case "P": return "nest";
            case "R": return "roid";
            case "r": return "rock";
            case "D": return "domi";
            default: throw new TypeError(cell + " is not a valid cell type!");
        }
    })),
    "X_GRID": 19,
    "Y_GRID": 19,
    "MAX_FOOD": 909,
    "MAX_COMBINED_NEST_FOOD": 168,
    "MAX_CRASHERS": 224
},
    ffa_world = (() => {
    let shuffledNests = ['#E7896D', '#EFC74B', 'nest', '#7ADBBC', '#FDA54D', '#A177FC', '#65F0EC', '#E8EBF7'].sort(function() {
        return .5 - Math.random();
    });
    return {
        "displayName": "Fuzzy's FFA World",
        "displayDesc": "FFA, but it takes places in a massive arena with extra nests to go around! To help you travel, portals are present as well.",
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
        "MAX_FOOD": 1331, // 1775
        "MAX_COMBINED_NEST_FOOD": 778, // 622
        "MAX_CRASHERS": 1089, // 622
        "MAX_SANCTUARIES": 3
    }
})(),
    maze = (blackout = false) => {
    return {
        "BLACKOUT": blackout,
        "MAZE": {
            "ENABLED": true,
            "cellSize": 300,
            "stepOneSpacing": 3,
            "fillChance": 0.35,
            "sparedChance": 0.65,
            "margin": .25
        },
        "displayName": (blackout) ? "Fuzzy's Blackout Maze" : "Fuzzy's Maze",
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
        "MAX_COMBINED_NEST_FOOD": 61, // 49
        "MAX_CRASHERS": 110, // 98
        "MAX_SANCS": 1,
        "EVOLVE_TIME_RAN_ADDER": 240000,
        "EVOLVE_HALT_CHANCE": .6,
        "BORDER_FORCE": 0.075
    }
},
    miniboss_rush = {
    "MODE": "tdm",
    "IS_BOSS_RUSH": true,
    "displayName": "Fuzzy's Miniboss Rush",
    "displayDesc": "Bite-sized Siege/Boss Rush.",
    "TEAM_AMOUNT": 1,
    "WIDTH": 5000,
    "HEIGHT": 5000,
    "X_GRID": 15,
    "Y_GRID": 15,
    "MAX_FOOD": 0,
    "MAX_NEST_FOOD": 0,
    "MAX_CRASHERS": 0,
    "MAX_SANCS": 0,
    "ROOM_SETUP": [   /*C*/
        ["B B B B B B B B B B B B B B B"],
        ["B B B B B B B B B B B B B B B"],
        ["R R R R R R R R R R R R R R R"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N S N N S N N N S N N S N N"], // C
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N"],
        ["R R R R R R R R R R R R R R R"],
        ["B B B B B B B B B B B B B B B"],
        ["B B B B B B B B B B B B B B B"]
    ].map(row => row[0].split(" ").map(cell => {
        switch (cell) {
            case "N": return "norm";
            case "S": return "bas1";
            case "B": return "bosp";
            case "R": return "bas2";
            default: throw new TypeError(cell + " is not a valid cell type!");
        }
    })),
    "PLAYER_SPAWN_TILES": ["norm"],
    "BORDER_FORCE": 0.025,
    "BOSS_SPAWN_INTERVAL": Infinity,
    "MAXBOSSES": 5,
    "MINBOSSES": 1,
    "MAX_BOSS_INCREMENT": 2,
    "MAX_BOSS_INCREMENT_INTERVAL": 5,
    "MIN_BOSS_INCREMENT": 2,
    "MIN_BOSS_INCREMENT_INTERVAL": 10,
    "CANNOT_SHOOT_IN_BASE": false
},
    openFiveTDM = {
    "MODE": "tdm",
    "TEAM_AMOUNT": 5,
    "displayName": "Fuzzy's Open 5TDM",
    "displayDesc": "Self-explanatory.",
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
    "WIDTH": 8000,
    "HEIGHT": 8000,
    "MAX_FOOD": 576, // 288
    "MAX_COMBINED_NEST_FOOD": 72, // 36
    "MAX_CRASHERS": 90 // 36
},
    random_colors = {
    "RANDOM_COLORS": true,
    "displayName": "Fuzzy's RC-FFA",
    "displayDesc": "RC stands for Random Colors!\n\nEach color is a completely random hex color.\nYours is refreshed every time you die.",
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
    "MAX_FOOD": 576, // 288
    "MAX_COMBINED_NEST_FOOD": 72, // 36
    "MAX_CRASHERS": 90 // 36
},
    random_colors_domination = {
    "RANDOM_COLORS": true,
    "SPAWN_DOMINATORS": true,
    "DOMINATOR_SHUFFLE_TIMER": 600,
    "displayName": "RC-FFA Domination",
    "displayDesc": "“RC” stands for “Random Colors”",
    "ROOM_SETUP": [       /*C*/
        ["R r N N N N N N N N N N N N N N N r R"],
        ["r r N N N N N N N N N N N N N N N r r"],
        ["N N N N N N N N N R N N N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N"],
        ["N N N N R N N N N N N N N N R N N N N"],
        ["N N N N N N N r P P P r N N N N N N N"],
        ["N N N N N N r P P P P P r N N N N N N"],
        ["N N N N N r P P P P P P P r N N N N N"],
        ["N r N r N P P P P P P P P P N r N r N"],
        ["N N D N N P P P P R P P P P N N D N N"], // C
        ["N r N r N P P P P P P P P P N r N r N"],
        ["N N N N N r P P P P P P P r N N N N N"],
        ["N N N N N N r P P P P P r N N N N N N"],
        ["N N N N N N N r P P P r N N N N N N N"],
        ["N N N N N N N N N N N N N N N N N N N"],
        ["N N N N R N N N N N N N N N R N N N N"],
        ["N N N N N N N N N R N N N N N N N N N"],
        ["r r N N N N N N N N N N N N N N N r r"],
        ["R r N N N N N N N N N N N N N N N r R"]
    ].map(row => row[0].split(" ").map(cell => {
        switch (cell) {
            case "N": return "norm";
            case "P": return "nest";
            case "R": return "roid";
            case "r": return "rock";
            case "D": return "domi";
            default: throw new TypeError(cell + " is not a valid cell type!");
        }
    })),
    "X_GRID": 19,
    "Y_GRID": 19,
    "MAX_FOOD": 909,
    "MAX_COMBINED_NEST_FOOD": 168,
    "MAX_CRASHERS": 224
},
    sixTDM = (() => {
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
        "displayName": "Fuzzy's 6TDM",
        "displayDesc": "Self-explanatory.",
        "TEAM_AMOUNT": 6,
        "ROOM_SETUP": [                   /*CE*/
            ["P1 B1 NM NM NM NM NM NM NM B5 P5 B5 NM NM NM NM NM NM NM B4 P4"],
            ["B1 B1 NM NM NM NM NM NM NM B5 B5 B5 NM NM NM NM NM NM NM B4 B4"],
            ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
            ["NM NM NM RO ro NM NM NM NM NM RO NM NM NM NM NM ro RO NM NM NM"],
            ["NM NM NM ro RO NM NM NM NM NM RO NM NM NM NM NM RO ro NM NM NM"],
            ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM NM PN PN ro PN PN NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM PN PN PN PN PN PN PN NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM PN PN PN PN PN PN PN PN PN NM NM NM NM NM NM"],
            ["NM NM ro NM NM NM PN PN PN PN ro PN PN PN PN NM NM NM ro NM NM"],
            ["NM ro RO ro NM NM ro PN PN ro RO ro PN PN ro NM NM ro RO ro NM"], // CE
            ["NM NM ro NM NM NM PN PN PN PN ro PN PN PN PN NM NM NM ro NM NM"],
            ["NM NM NM NM NM NM PN PN PN PN PN PN PN PN PN NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM PN PN PN PN PN PN PN NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM NM PN PN ro PN PN NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
            ["NM NM NM NM RO NM NM NM NM NM RO NM NM NM NM NM RO ro NM NM NM"],
            ["NM NM NM RO NM NM NM NM NM NM RO NM NM NM NM NM ro RO NM NM NM"],
            ["NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM NM"],
            ["B2 B2 NM NM NM NM NM NM NM B6 B6 B6 NM NM NM NM NM NM NM B3 B3"],
            ["P2 B2 NM NM NM NM NM NM NM B6 P6 B6 NM NM NM NM NM NM NM B3 P3"]
        ].map(row => row[0].split(" ").map(cell => {
            switch (cell) {
                case "NM": return "norm";
                case "PN": return "nest";
                case "RO": return "roid";
                case "ro": return "rock";
                
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
        "MAX_FOOD": 618, // 353
        "MAX_COMBINED_NEST_FOOD": 120, // 60
        "MAX_CRASHERS": 180 // 60
    };
})(),
    threeTDM = (() => {
    let shuffledBases = [
        ["n_b1", "por1"],
        ["n_b2", "por2"],
        ["n_b3", "por3"]
    ].sort(function() {
        return .5 - Math.random();
    });
    return {
        "MODE": "tdm",
        "displayName": "Fuzzy's 3TDM",
        "displayDesc": "Self-explanatory.",
        "TEAM_AMOUNT": 3,
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
            ["NM NM NM ro RO ro NM NM NM NM NM NM NM NM NM ro RO ro NM NM NM"],
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
            ["NM NM NM ro RO ro NM NM NM NM NM NM NM NM NM ro RO ro NM NM NM"],
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

                default: throw new TypeError(cell + " is not a valid cell type!");
            }
        })),
        "WIDTH": 10000,
        "HEIGHT": 10000,
        "X_GRID": 21,
        "Y_GRID": 21,
        "MAX_FOOD": 869, // 331
        "MAX_COMBINED_NEST_FOOD": 130, // 74
        "MAX_CRASHERS": 185 // 74
    };
})(),
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
        "DOMINATOR_SHUFFLE_TIMER": 300,
        "ARENA_CAN_CLOSE": false,
        "displayName": (isHell) ? "Fuzzy's 2TDM Hell" : "Fuzzy's 2TDM",
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
        "EVOLVE_HALT_CHANCE": (isHell) ? .8 : .4
    };
};
function select(mode, testing = false) {
    mode.selectable = true;
    mode.BOSS_SPAWN_TIMER ??= 240;
    mode.EVOLVE_TIME ??= 60000;
    mode.EVOLVE_TIME_RAN_ADDER ??= 120000;
    mode.EVOLVE_HALT_CHANCE ??= .4;
    mode.MAX_SANCS ??= 2;
    mode.SHINY_CHANCE ??= 1/1000;
    
    if (testing) {
        mode.MINIMUM_PERMISSIONS = 3;
        mode.MAX_FOOD = 0;
        mode.MAX_COMBINED_NEST_FOOD = 0;
        mode.MAX_CRASHERS = 0;
        mode.MAX_SANCS = 0;
        mode.BOSS_SPAWN_TIMER = Infinity;
    }
    return mode;
};
select(twoTDM(false, true));
