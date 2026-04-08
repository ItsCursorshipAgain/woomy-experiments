import { assets, ASSET_MAGIC } from "../shared/assets.js";
import { oneVsOne } from "./modes/oneVsOne.js";

const modeFuncs = { oneVsOne }

// COMPAT //
const worker = typeof parentPort === "undefined" ? self : parentPort
const global = globalThis
if (typeof global.fs === "undefined") global.fs = undefined;

global.utility = {
    log: (e) => { console.log("[LOG]", e) }
}
global.process = {
    env: {},
    argv: []
};

const SERVER_PROTOCOL_VERSION = 2;

// MULTIPLAYER //
const userSockets = new Map()
const bannedPlayers = [];

worker.onmessage = function(msg) {
    const data = msg.data
    switch (data.type) {
        case "startServer":
            worker.postMessage({ type: "serverStartText", text: "Loading definitions..." })
            import("./definitions.js").then((res) => {
                worker.postMessage({ type: "serverStartText", text: "Loading game..." })
                global.initExportCode = res.initExportCode
                console.log("SERVER START DATA:", data.server)
                startServer(data.server.suffix, res.defExports, data.server.displayName, data.server.displayDesc, data.server.maxPlayers, data.server.maxBots)
            }).catch((err) => {
                console.error(err)
                worker.postMessage({ type: "serverStartText", text: "Failed to load definitions", tip: "Please reload the page and try again" })
            })
            break;
        case "serverMessage":
            userSockets.get(data.data[0]).onmessage(data.data[1])
            break;
        case "playerJoin":
            global.sockets.connect(data.playerId)
            break;
        case "playerDc":
            userSockets.get(data.playerId).close()
            userSockets.delete(data.playerId)
            break;
        case "roomId":
            for (let [k, v] of userSockets) {
                v.talk("nrid", data.id)
            }
            if (global.updateRoomInfo) global.updateRoomInfo();
            break;
    }
}

function userSocket(playerId, encode) {
    return {
        on: (type, funct) => {
            if (type === "message") {
                userSockets.get(playerId).onmessage = funct
            }
        },
        send: (e) => {
            worker.postMessage({ type: "clientMessage", playerId: playerId, data: encode(e) })
        }
    }
};

// MORE COMPAT //
const nestList = [
    ['tri', 'square', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'],
    ['#E7896D', '#EFC74B', 'nest', '#7ADBBC', '#FDA54D', '#A177FC', '#65F0EC', '#E8EBF7']
];
// Ultra-fast atan2 implementation - replaces Math.atan2 prototype
const PI = 3.141592653589793;
const PI_2 = 1.5707963267948966;

function ultraFastAtan2(y, x) {
    // Fast NaN protection
    if (y !== y || x !== x) return null;
    if (x === 0) return y > 0 ? PI_2 : y < 0 ? -PI_2 : 0;

    const absY = y < 0 ? -y : y;
    const absX = x < 0 ? -x : x;

    let angle;
    if (absY <= absX) {
        const t = absY / absX;
        angle = t / (1 + 0.28125 * t * t);
    } else {
        const t = absX / absY;
        angle = PI_2 - t / (1 + 0.28125 * t * t);
    }

    if (x < 0) {
        angle = y >= 0 ? PI - angle : angle - PI;
    } else if (y < 0) {
        angle = -angle;
    }

    return angle;
}

// Override Math.atan2 prototype
Object.defineProperty(Math, 'atan2', {
    value: ultraFastAtan2,
    writable: true,
    enumerable: false,
    configurable: true
});

function oddify(number, multiplier = 1) {
    return number + ((number % 2) * multiplier);
}
global.mapConfig = {
    getBaseShuffling: function(teams, max = 5) {
        const output = [];
        for (let i = 1; i < max; i++) {
            output.push(i > teams ? 0 : i);
        }
        return output.sort(function() {
            return .5 - Math.random();
        });
    },

    id: function(i, level = true, norm = false) {
        if (i) {
            return !!level ? `n_b${i}` : `bas${i}`;
        } else if (norm) {
            return "norm";
        } else {
            const list = ["rock", "rock", "roid", "norm", "norm"];
            return list[Math.floor(Math.random() * list.length)];
        }
    },

    oddify: oddify,

    setup: function(options = {}) {
        if (options.width == null) options.width = 18;
        if (options.height == null) options.height = 18;
        nestList[0].forEach(n => {
            if (options[n + "NestWidth"] == null) options[n + "NestWidth"] = Math.floor(options.width / 4) + (options.width % 2 === 0) - (1 + (options.width % 2 === 0));
            if (options[n + "NestHeight"] == null) options[n + "NestHeight"] = Math.floor(options.height / 4) + (options.height % 2 === 0) - (1 + (options.width % 2 === 0));
        });
        if (options.rockScatter == null) options.rockScatter = .175;
        options.rockScatter = 1 - options.rockScatter;
        const output = [];
        let nests = {};
        nestList[0].forEach(n => {
            nests[n + "Nest"] = {
                sx: oddify(Math.floor(options.width / 2 - options[n + "nestWidth"] / 2), -1 * ((options.width % 2 === 0) && Math.floor(options.width / 2) % 2 === 1)),
                sy: oddify(Math.floor(options.height / 2 - options[n + "nestHeight"] / 2), -1 * ((options.height % 2 === 0) && Math.floor(options.height / 2) % 2 === 1)),
                ex: Math.floor(options.width / 2 - options[n + "nestWidth"] / 2) + options[n + "nestWidth"],
                ey: Math.floor(options.height / 2 - options[n + "nestHeight"] / 2) + options[n + "nestHeight"]
            }
        });

        function testIsNest(x, y) {
            for (let i = 0; i < nestList[0].length; i++) {
                if (options[nestList[0][i] + "nestWidth"] == 0 || options[nestList[0][i] + "nestHeight"] == 0) {
                    if (i < nestList[0].length - 1) continue;
                    else return 0;
                }
                if (x >= nests[nestList[0][i] + "Nest"].sx && x <= nests[nestList[0][i] + "Nest"].ex && y >= nests[nestList[0][i] + "Nest"].sy && y <= nests[nestList[0][i] + "Nest"].ey) return nestList[1][i];
                return 0;
            }
        }

        for (let i = 0; i < options.height; i++) {
            const row = [];
            for (let j = 0; j < options.width; j++) {
                row.push(testIsNest(j, i) || Math.random() > options.rockScatter ? Math.random() > .5 ? "roid" : "rock" : "norm");
            }
            output.push(row);
        }
        return output;
    }
}

global.require = function(thing) {
    switch (thing) {
        case "../../lib/util.js":
        case "./util.js":
        case "./lib/util":
            let angleDifference = (() => {
                let mod = function(a, n) {
                    return (a % n + n) % n;
                };
                return (sourceA, targetA) => {
                    let a = targetA - sourceA;
                    return mod(a + Math.PI, 2 * Math.PI) - Math.PI;
                };
            })()
            let deepClone = (obj, hash = new WeakMap()) => {
                let result;
                // Do not try to clone primitives or functions
                if (Object(obj) !== obj || obj instanceof Function) return obj;
                if (hash.has(obj)) return hash.get(obj); // Cyclic reference
                try { // Try to run constructor (without arguments, as we don't know them)
                    result = new obj.constructor();
                } catch (e) { // Constructor failed, create object without running the constructor
                    result = Object.create(Object.getPrototypeOf(obj));
                }
                // Optional: support for some standard constructors (extend as desired)
                if (obj instanceof Map) Array.from(obj, ([key, val]) => result.set(deepClone(key, hash), deepClone(val, hash)));
                else if (obj instanceof Set) Array.from(obj, (key) => result.add(deepClone(key, hash)));
                // Register in hash
                hash.set(obj, result);
                // Clone and assign enumerable own properties recursively
                return Object.assign(result, ...Object.keys(obj).map(key => ({
                    [key]: deepClone(obj[key], hash)
                })));
            }
            let time = () => {
                return Date.now() - serverStartTime;
            }
            let formatTime = x => Math.floor(x / (1000 * 60 * 60)) + " hours, " + Math.floor(x / (1000 * 60)) % 60 + " minutes and " + Math.floor(x / 1000) % 60 + " seconds"
            let getLogTime = () => (time() / 1000).toFixed(3)
            let serverStartTime = Date.now();
            let formatDate = function(date = new Date()) {
                function pad2(n) {
                    return (n < 10 ? '0' : '') + n;
                }
                var month = pad2(date.getMonth() + 1);
                var day = pad2(date.getDate());
                var year = date.getFullYear();
                return [month, day, year].join("/");
            }
            return {
                addArticle: function(string, cap = false) {
                    let output = (/[aeiouAEIOU]/.test(string[0])) ? 'an ' + string : 'a ' + string;
                    if (cap) {
                        output = output.split("");
                        output[0] = output[0].toUpperCase();
                        output = output.join("");
                    }
                    return output;
                },
                getLongestEdge: function getLongestEdge(x1, y1, x2, y2) {
                    let diffX = Math.abs(x2 - x1),
                        diffY = Math.abs(y2 - y1);
                    return diffX > diffY ? diffX : diffY;
                },
                getDistance: function(vec1, vec2) {
                    const x = vec2.x - vec1.x;
                    const y = vec2.y - vec1.y;
                    return Math.sqrt(x * x + y * y);
                },
                getDirection: function(p1, p2) {
                    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
                },
                clamp: function(value, min, max) {
                    return value > max ? max : value < min ? min : value;
                },
                lerp: (a, b, x) => a + x * (b - a),
                angleDifference: angleDifference,
                loopSmooth: (angle, desired, slowness) => {
                    return angleDifference(angle, desired) / slowness;
                },
                deepClone: deepClone,
                averageArray: arr => {
                    if (!arr.length) return 0;
                    var sum = arr.reduce((a, b) => {
                        return a + b;
                    });
                    return sum / arr.length;
                },
                sumArray: arr => {
                    if (!arr.length) return 0;
                    var sum = arr.reduce((a, b) => {
                        return a + b;
                    });
                    return sum;
                },
                signedSqrt: x => {
                    return Math.sign(x) * Math.sqrt(Math.abs(x));
                },
                getJackpot: x => {
                    return (x > 26300 * 1.5) ? Math.pow(x - 26300, 0.85) + 26300 : x / 1.5;
                },
                serverStartTime: serverStartTime,
                time: time,
                formatTime: formatTime,
                getLogTime: getLogTime,
                log: text => {
                    console.log('[' + getLogTime() + ']: ' + text);
                },
                info: text => {
                    console.log('[' + getLogTime() + ']: ' + text);
                },
                spawn: text => {
                    console.log('[' + getLogTime() + ']: ' + text);
                },
                warn: text => {
                    console.log('[' + getLogTime() + ']: ' + '[WARNING] ' + text);
                },
                error: text => {
                    console.log('[' + getLogTime() + ']: ' + '[ERROR] ' + text);
                },
                remove: (array, index) => {
                    // there is more than one object in the container
                    if (index === array.length - 1) {
                        // special case if the obj is the newest in the container
                        return array.pop();
                    } else {
                        let o = array[index];
                        array[index] = array.pop();
                        return o;
                    }
                },
                removeID: function remove(arr, i) {
                    const index = arr.findIndex(e => e.id === i);
                    if (index === -1) {
                        return arr;
                    }
                    if (index === 0) return arr.shift();
                    if (index === arr.length - 1) return arr.pop();
                    return arr.splice(index, 1);
                },
                formatLargeNumber: x => {
                    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                },
                timeForHumans: x => {
                    // ought to be in seconds
                    let seconds = x % 60;
                    x /= 60;
                    x = Math.floor(x);
                    let minutes = x % 60;
                    x /= 60;
                    x = Math.floor(x);
                    let hours = x % 24;
                    x /= 24;
                    x = Math.floor(x);
                    let days = x;
                    let y = '';
                    function weh(z, text) {
                        if (z) {
                            y = y + ((y === '') ? '' : ', ') + z + ' ' + text + ((z > 1) ? 's' : '');
                        }
                    }
                    weh(days, 'day');
                    weh(hours, 'hour');
                    weh(minutes, 'minute');
                    weh(seconds, 'second');
                    if (y === '') {
                        y = 'less than a second';
                    }
                    return y;
                },

                formatDate: formatDate,

                constructDateWithYear: function(month = (new Date()).getMonth() + 1, day = (new Date()).getDate(), year = (new Date()).getFullYear()) {
                    function pad2(n) {
                        return (n < 10 ? '0' : '') + n;
                    }
                    month = pad2(month);
                    day = pad2(day);
                    year = year;
                    return [month, day, year].join("/");
                },

                dateCheck: function(from, to, check = formatDate()) {
                    var fDate, lDate, cDate;
                    fDate = Date.parse(from);
                    lDate = Date.parse(to);
                    cDate = Date.parse(check);
                    return cDate <= lDate && cDate >= fDate;
                },

                cleanString: (string, length = -1) => {
                    if (typeof string !== "string") {
                        return "";
                    }
                    string = string.replace(/[\u0000\uFDFD\u202E\uD809\uDC2B\x00\x01\u200b\u200e\u200f\u202a-\u202e\ufdfd\ufffd-\uffff]/g, "").trim();
                    if (length > -1) {
                        string = string.slice(0, length);
                    }
                    return string;
                }
            }
            break;
        case "./lib/random":
            const names = [
                "!!!!!!really happy!!!!?",
                "!!!",
                "!!!",
                "!",
                "!ARNA LOSER !",
                "!emergencia!-!emergency!",
                "!foO",
                "!Hi!",
                "!^_^D0M1N4T1NG^_^!",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                " ",
                "",
                "#teamtrees",
                "$$$",
                "$$$$",
                "$$$%$la plaga$%$$$",
                "$1,000,000",
                "$:$gc",
                "$shark buger$",
                "%<AzEr<%",
                " %<AzEr<%",
                "%t",
                "%t is OP",
                "%t is the worst tank",
                "%t moment",
                "%t sucks",
                "%Weeping_God%",
                "&__.._._:-:-:-.&",
                "'/;",
                "'>'",
                "'CADO ON THE 'BOARD",
                "'~Darkfiren~'",
                "()UTi6",
                "(-)",
                "(:",
                "(:cai chua:)",
                "(<(:)>)",
                "(<(?)>)",
                "(Ai) bot",
                "(B) THE RISE OF THE FALL",
                "(B) Wehrmacht",
                "(GG)",
                "(Huggy wuggy) im nice",
                "(LM)The Unknow",
                "(O.<)b",
                "(Tank) snowy! (Tank)",
                "(UwU)",
                "(Very) Dangerous Pet",
                "(vn)",
                "(vn) :p",
                "(vn) go with me pls",
                "(vn)TTT",
                "(W!) Solo w!",
                "(ZV) foricor",
                "(・ω・＼)i am(/・ω・)/pinch!",
                "):)                  ???",
                "+",
                "++",
                "+S",
                ",,",
                ",l,l,l",
                ",mnji",
                "- - - - - - - - - - - -",
                "------------------------",
                "-.-Razoix+?>",
                "-.......",
                "-1",
                "-CN- ",
                "-CN-",
                "-Corrupt3d-",
                "-heix-",
                "-heix-",
                "-K-",
                "-KhangWasBroken-",
                "-  k    i    n    g  -",
                "-KONZ-",
                "-Monster-",
                "-vn-",
                " -_-",
                "-_-",
                "-_-Aigle Royal 72-_-",
                "-_____________-",
                ".",
                ".",
                ".-.",
                "...",
                "...",
                ".....",
                "..............",
                "........................",
                "........................",
                "...    ????",
                "...VN",
                ".chao",
                ".exe",
                ".ium expanDeR!",
                ".jpg",
                ".v",
                "._.",
                "/.//.[]",
                " //",
                "//",
                "// jAX",
                "/:",
                "/BIG BOYRockety",
                "/donotello/",
                "/donotello/raider/",
                "/SUP Maths",
                "0 helpful blues lol",
                "0",
                "0,01%",
                "0-=",
                "0=IQ",
                "0jgojettreedew089",
                "0____0",
                "00",
                "00123",
                "0800 fighter¯_(ツ)_/¯",
                "1 + 1 =1",
                "1 + 1 = 3",
                "1 + 1 = 3",
                "1 cannon only chall",
                "1 hand only",
                "1 min",
                "1",
                "1",
                "1",
                "1% Power",
                "1% Power...",
                "1+1+1+1=4 OK!!!!!",
                "1+1=3",
                "1+1=11",
                "1e+999",
                "1K Followers lol",
                "1M + StormMachinegunner",
                "1M=100M",
                "1M ????",
                "1MiL",
                "1m plez",
                "1nFerN0 - 1 mil?",
                "1st",
                "1v1",
                "1VS2?",
                "1{1}1",
                "2 0 2 2",
                "2 Booster = Fun :D",
                "2+2=4",
                "2+3=5",
                "2-3-40",
                "2...00++++",
                "3+3=6",
                "3+4=6",
                "3+4=7",
                "3-D Julie Cat",
                "3.14, 1.61, 1.41",
                "3k",
                "3vs2Ol",
                "3w3f9",
                "4/4/6/6/6/6/5/4/1/0",
                "4TDM",
                "4th Form",
                "4tomiX",
                "5C",
                "5min+5 overdrive",
                "5th base = best base",
                "6",
                "7/11",
                "7/11/22",
                "7U9ukhlehpwhowiwiijji29:",
                "8hu",
                "8man",
                "8w329h",
                "10xyz",
                "12iiw",
                "13isaluckynumber",
                "15 fps player",
                "15",
                "19$ fortnite card",
                "23",
                "25m",
                "26.26k",
                "42",
                "45a,i",
                "47/107 :(",
                "64M3R_999",
                "64t",
                "66",
                "71",
                "76...",
                "78d",
                "78d 714k bruh",
                "78d pounder op",
                "96",
                "100k speedrun",
                "117",
                "121",
                "124",
                "125   mn",
                "147 toxic",
                "148 toxic",
                "149 toxic",
                "150 toxic",
                "167",
                "213",
                "223",
                "289j",
                "321",
                "323f",
                "323f54",
                "323f54",
                "404 Not Found",
                "453 sfafd",
                "552",
                "555 }{",
                "567",
                "600k is how far ive got",
                "666",
                "666",
                "667ifjfjijfo",
                "754",
                "777 ////. ./. /./-.---77",
                "777",
                "781",
                "888",
                "998",
                "999",
                "1010",
                "1111WW",
                "1212",
                "1354",
                "1457",
                "1922",
                "1934",
                "2020 im new",
                "2022 SUPORT UKRANIE(2)",
                "3310",
                "5664",
                "6109",
                "7131",
                "7151",
                "7859",
                "7888",
                "8787",
                "9999",
                "45453",
                "55564",
                "105050",
                "123456",
                "178965",
                "232523",
                "531714",
                "1010971",
                "2345678",
                "2377285 auto triangle",
                "5252525",
                "5555555",
                "20240123",
                "26317125   gff",
                "99999999",
                "100000000",
                "1410065404",
                "12345678910",
                "24686872678",
                "75882310770",
                "9902774653772",
                "1235434638968792345",
                "111111111111111111111",
                "1223332111111111112321",
                "6666666666666666666666",
                "9999999999999999999999dx",
                "100000000000000000000000",
                "100000000000000000000000",
                "111111111111111111111111",
                "222222222222222222222222",
                "348562347862349254127651",
                ":",
                ":')",
                ":('",
                ":(((((((((((((((((((((((",
                ":(:(:(:(:(:(:(:(:((:(:(:",
                ":(=)",
                ":(eu tou triste",
                ": )",
                ":)           (:",
                ":) cavite",
                ": ) ha ha",
                ":3 hi",
                ":3 s",
                ":3",
                ":3",
                ":: Saved by Grace ::",
                ":> hi",
                ":>PTM...''",
                ":?",
                ":b",
                ":cai chua:)",
                ":D",
                ":D hi",
                ":O",
                ":P",
                ":p",
                ":P",
                ":P",
                ":v",
                ":_:mx",
                ";",
                ";)",
                ";D",
                ";jl",
                ";kooo",
                ";o",
                ";v",
                ";]",
                "<1.5 is not enough",
                "<3 Doreen~",
                "<<< Saved by Grace >>>",
                "<======Lasi======>",
                "<call me",
                "<op>1",
                "<[AXS]> RASHOT",
                "=",
                "=",
                "='))",
                "=))) (10%streng)",
                "=)))))",
                "=W=W==",
                "=ZZZ Bannanas Are Yuky =",
                "=Z~",
                ">",
                ">:))",
                ">:v",
                "><II  gg",
                ">=<",
                ">>>",
                ">_>O_O<_<3456",
                "???(vn)",
                "?????",
                "????????",
                "@- @",
                "@@@",
                "@@@@@@@@@@@@@@@@@@@@@@@@",
                "@ace",
                "@RAFAEI  PR0",
                "a",
                "A+",
                "A+",
                "A+ Yeah spin",
                "A - E - T - H - E - R",
                "A-K 8000",
                "A.L.",
                "A.T. Beerful",
                "A1D2J3",
                "A3145",
                "aa",
                "AA01blue",
                "Aaa",
                "A A A",
                "aaaaaaa1",
                "AAAAAAAA2A22222222222222",
                "aaaaaaaaaa",
                "aaaaaaaaaaaaaaaaaaaaaaaa",
                "AAAAAAAAAAAAAAAAAAAAAAAA",
                "Aaaaa revenge",
                "aaaaargh",
                "Aadhy",
                "aaeaeae",
                "aajlrtgtrtty",
                "aaron",
                "abbi_alin",
                "ABC",
                "ABC",
                "abd lhalim",
                "Abdule lah",
                "Abdurahman",
                "abominacja",
                "AborTurboMan",
                "Abrar",
                "AbrasiveBrivilly",
                "A br stranded",
                "abuk",
                "A Cat",
                "Ace",
                "ace",
                "Acheron",
                "Achi",
                "AcidRain",
                "acidre",
                "AC Perú",
                "Actual Pro",
                "Ac𐍉͢͢͢ᵐᵐSiรcuᵐMum🌼",
                "ad",
                "ad",
                "add me",
                "Add update for chat",
                "adefe",
                "adelson",
                "AditGA",
                "adljsaknckjas",
                "Adnan",
                "adreszek",
                "adrik",
                "a duck=",
                "Adventure",
                "Adyintred",
                "adymin",
                "Adymin",
                "aeaea",
                "aeaeae",
                "Aespa",
                "Aestudireastal",
                "ae vn",
                "aewrsd",
                "afafafafafaffalafel",
                "afes",
                "Affeuredi",
                "AFK",
                "afk leave me alone",
                "afk ~30mins - stalker",
                "A flower tank",
                "agabaga",
                "again and again",
                "agar.io",
                "agdgdgdr",
                "Agent Sauce",
                "A Goat",
                "agus",
                "AGUST-D",
                "Agͥreͣeͫⱥ多leCⱥ多liรรi☂",
                "ah, but u cant see me",
                "ah, but u dont see me",
                "Aha!",
                "AHHHHHH!",
                "Ahmad",
                "Ahmed",
                "Ahmet",
                "AHOI",
                "ah~",
                "AI",
                "AICIAGOGH",
                "aIIan",
                "aIIan y sonic",
                "Aik",
                "Ailoki",
                "Aim(^-^)Bot",
                "Ainnim Loof",
                "air",
                "Aith",
                "ajajajjaja",
                "Aj is dumb",
                "ak",
                "AK-47",
                "Akilina",
                "Akira bck!!!",
                "Alan",
                "ALAN PAP",
                "ALAN PAPI",
                "alcatras",
                "Alejandro 22",
                "alejo XD",
                "Aleph",
                "aleph",
                "Aleph Null",
                "alex",
                "ALEXANDER👑💎",
                "AlexDav",
                "Alexis",
                "Algi",
                "Algiz",
                "Ali",
                "Alice",
                "alien",
                "a littl' bad",
                "a little bit of fun :)",
                "AliveKelichap",
                "Alkaios",
                "Alkaios",
                "Alkali",
                "Allah Is King",
                "All Dead",
                "ALL GO BENT",
                "all i know 2x",
                "all monsters",
                "allmyfriend.aretoxic",
                "allmyfriend.aretoxic VN",
                "all my friends are cool",
                "ALO",
                "alone",
                "alp",
                "Alpha",
                "Alpha",
                "ALPHA CHAD OF CHADISTAN",
                "Alpha Fart",
                "alpharad",
                "alr-ight",
                "alright buddy",
                "alsterercrak",
                "Alt+f4",
                "AltruisticFaric",
                "Always not alway kid",
                "A  l X back!!!!!",
                "AL | 2 Week No Play",
                "AL|Air",
                "AL| JustICE- sry luna",
                "AL| JustICE-theresaclone",
                "AlสrᴍingSђerᴍ",
                "AmetionMinion",
                "AMIGOS",
                "Am I Sinbadx?",
                "am low, I Need Backup!",
                "AMOGUS??????????????",
                "a mongoose",
                "Among Us",
                "among us",
                "A M O U G U S",
                "Amyntas",
                "AnA",
                "Anak",
                "Anak why u solo",
                "A named player",
                "Ancient",
                "Anderson",
                "Andivedyngstims",
                "AndoKing",
                "andria",
                "Andy",
                "An Endless Rise",
                "Aneumenctr",
                "angel",
                "angel",
                "Angel",
                "Angel",
                "Angel",
                "Angela",
                "Angle",
                "AnglysSilly",
                "angry?",
                "anh tuấn anh nè tôm",
                "Aniketos",
                "Aniketos",
                "Aniketos",
                "animal",
                "anime",
                "anime",
                "Anime",
                "Anken",
                "annialator",
                "Annie",
                "Annihilhator bravo 1m po",
                "Annoying",
                "Annoying drones",
                "annoying tank",
                "Anonymous",
                "Anti-Hax",
                "Anti celestial tank",
                "AntilkMilkman",
                "ANTI OCTO TANK",
                "AntionFunTime",
                "antontrygubO_o",
                "antrax",
                "AntsAreCool",
                "a nuisance",
                "An unnamed player",
                "AnyMore",
                "AnythonJS",
                "Anytimple",
                "ANZAI",
                "Anͥkeͣnͫtscru",
                "APE",
                "a pet",
                "Apex",
                "Apfel Saft",
                "A player",
                "A Poisonous Egg",
                "Apollon",
                "Apollon",
                "Apollon",
                "a polygon",
                "A polygon",
                "APplayer113",
                "apple",
                "Aprendo.en casa",
                "AQEEL",
                "Aqua",
                "Aquiles TEAM LOVE",
                "Aquiner_ouo",
                "AR",
                "Ar-15",
                "Ar 15",
                "ara ara...",
                "Arahana",
                "Archimedes",
                "Archimedes",
                "Arcturus",
                "Arcturus mobile",
                "Ardenll54",
                "Area closer",
                "ArenaC",
                "Arena Close",
                "ARENA CLOSEA",
                "Arena Closer",
                "Arena   Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer ",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "arena closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena Closer",
                "Arena CloserSinx :)",
                "Arena Defender",
                "Arena Opener",
                "are the dominators blind",
                "Are you okay?",
                "arg",
                "ari",
                "arias",
                "arisen",
                "Arisu",
                "Ark",
                "Arkaic",
                "ARKE:D",
                "ARMADA",
                "ARMADA",
                "armtumroom",
                "Arninℓץie",
                "aronnax",
                "Around",
                "Around Calm",
                "arR",
                "arras.io",
                "Arras.io",
                "arras > diep",
                "ARRASMONSTER KILLYOUha5x",
                "Array.io",
                "arrowz",
                "Arsecritom",
                "arslan",
                "Artemis",
                "Artemis",
                "Artemis",
                "Arthur",
                "aru",
                "ArΐsVΐssψ✨",
                "Ar†h☢uldre🅽diส▤",
                "as",
                "a salty discord kid",
                "AscendedCataBath",
                "asd",
                "asd",
                "asdasd",
                "asdasdasd",
                "asddasda",
                "asdf",
                "asd fake",
                "asdfasdf",
                "asdfasdfasdf",
                "asdfasdfasdfasdfasdfasdf",
                "Asdfghjkjjhgfdsdfghjhgfd",
                "asdfghjkl;:]@ouytrewq",
                "asdfjkl",
                "ASDUA",
                "a sentilen",
                "Asesino",
                "Asesinooooooooooooooo",
                "A Settlement Needs Your Help",
                "Ashes",
                "a shield",
                "asia",
                "asian kid",
                "ASKED",
                "askib",
                "asky",
                "As lc",
                "a spinner",
                "Astagfirulla",
                "AstoundingEst",
                "Astrageldon",
                "Astral Java",
                "asw",
                "a sweaty no lifer",
                "aswon",
                "aswon(ur bad)",
                "A tank",
                "A TANK",
                "A team with 💚 is doomed",
                "Atereatha",
                "Athena",
                "ATK_X",
                "atleast spare me till 1m",
                "ATM",
                "atomic",
                "Attacker",
                "AttentiveFornate",
                "Atumkj.",
                "Austinz",
                "austinz",
                "austo asa",
                "auto",
                "Auto's power",
                "Auto 4",
                "AUTO 555",
                "Auto factory 19187944889",
                "Auto factory 37448936323",
                "auto gunner",
                "Autooligue",
                "AUUUUUUGH!",
                "Avarice",
                "Avenger!",
                "Average DPS enjoyer",
                "avex",
                "AVIRA",
                "avn",
                "awa",
                "AWESOMENATEXD",
                "awesome soccer(pog)",
                "AwesomeTomostur",
                "Awes๏meStanψt๏m",
                "awootube",
                "Awzcdr",
                "ax",
                "AxiomaticMantr",
                "Ayman",
                "ayo",
                "AYOOO",
                "Ayo peace",
                "Ayrton",
                "ayy",
                "ayyy",
                "az",
                "azen",
                "AZERBAYCAN  TURK",
                "AZERBAYCAN  TURKIYE",
                "Azra",
                "AZU",
                "azuris lol",
                "A_C_L",
                "AŇergeNeesคnค",
                "AƓ Aηgєℓ#Use AƓ  Tag",
                "AƤeͥndͣiͫMonLaƤຮin",
                "Aɴᴋᴜsʜ ᶠᶠ",
                "AήixecemØcultiή",
                "Aήสℓroseℓ♛",
                "Aгti𝒸ulateUภtalaภ",
                "Aຮiaτinga",
                "Aᖙeth☢☢LØυᖙmØυth💌",
                "A∂aptableやapti☢ng",
                "A𝖙hedi🆁on",
                "B",
                "B(sian)",
                "B1 battle droid",
                "B2 super battle droid",
                "ba",
                "BA.2.75 Omicron",
                "back pain",
                "backrooms",
                "Badaracco",
                "badda",
                "badog",
                "baited!?!",
                "baited??!",
                "Ball",
                "Baller",
                "ballistic 2.0 fnf",
                "Balloon",
                "BaLu",
                "BaLu...",
                "baLu is kinda cool",
                "Banana",
                "Banarama",
                "bandit",
                "Bandu",
                "bangladesh",
                "Banned from seige?",
                "Ban she",
                "BANZAI",
                "Bao",
                "baos",
                "Bar Milk",
                "Baroydroyd",
                "Barry",
                "Bartek",
                "Base",
                "BASE",
                "BASE MAKER",
                "Basic",
                "Basic",
                "basic",
                "Basic Enjoyers",
                "Battle Tank",
                "bay sorry.",
                "bayzid",
                "bazooka",
                "bb",
                "b b/",
                "bb8",
                "bbebebebe",
                "BBoRRaBBiDDo",
                "bcd",
                "bcj8721yt",
                "bcr",
                "BDO",
                "be",
                "Bean Man",
                "Beans",
                "Beast",
                "BeautifulFoutes",
                "BeautifulToldif",
                "BEDROCK",
                "be dum like me",
                "Bee",
                "Beedaltyo",
                "Beeg Yoshi Squad",
                "beep",
                "beep boop",
                "be free",
                "be freind",
                "Beganiateds",
                "Begone",
                "begone",
                "Begone (1v1",
                "Behemoth",
                "being afk",
                "BeirstHairBall",
                "belal abbasi",
                "bello",
                "Belowaver",
                "Ben",
                "BeneficentTocen",
                "benni",
                "BERD",
                "berd",
                "Berkanan",
                "BERSER",
                "bert",
                "Be Sidewinder press khh",
                "Best",
                "BEST",
                "best",
                "BEST",
                "best sentry",
                "Betelguese is Super",
                "Better Than U",
                "bewear GX",
                "BF An",
                "bgs",
                "bhosdike",
                "BH_FireFreezer",
                "Bi",
                "biba338",
                "bibi",
                "bibi a",
                "BigBadBoom",
                "Big Beep",
                "BigBrain Time",
                "BIG BRAIN TIME",
                "bigchad",
                "big chungus",
                "biggest noob",
                "bigmac",
                "big me!",
                "Big Papa",
                "Big Poppa",
                "BIG POPPA",
                "B I G V I E W",
                "BILL WIN",
                "BING CHILLING",
                "bin huhu",
                "b I protected u before",
                "bird said the n word",
                "Bisax",
                "Bitter Dill",
                "bixent boo",
                "BJ",
                "bla",
                "Blank",
                "Blarg",
                "BLAST",
                "blessing",
                "BLITZ",
                "blitzburger",
                "blitzburger is pro",
                "BLITZKRIEG STRAT",
                "Blob",
                "Block Craft 3D",
                "Blocker",
                "blon td siix",
                "Blood // Water",
                "blood for the blood god",
                "Bloop",
                "blue",
                "Blue are dumb players",
                "BlueJayJaimingi",
                "blue octos useless",
                "blue octos __",
                "blue suck so bad XD",
                "blue suck XD",
                "Blumin",
                "Blyat",
                "bman",
                "bo",
                "bo",
                "bob",
                "bob",
                "Bob",
                "bob",
                "bob",
                "BOB",
                "bob AT",
                "bobbb",
                "Bob le bricoleur",
                "Bobro",
                "bob the builder",
                "bob xllnnnnn",
                "bo ckick R",
                "Bocow",
                "Bodyguard",
                "boi",
                "boknoy",
                "BOMBS AWAY",
                "Bonaventure",
                "BonaventureVT",
                "Bong Bong won't help you",
                "Bonk?",
                "BooBooKittyRettlyst",
                "boojawzee",
                "boom",
                "Boomer Humor",
                "BOONE!!!",
                "boone",
                "booo",
                "BOOOOOOOOOOOOOOOOOMM",
                "boooster.io",
                "Boop",
                "boop",
                "Boop skdoo bep",
                "Boost",
                "BOOSTER AIRSTRIKE ORELSE",
                "Booster join",
                "Booster race :D",
                "bored rn",
                "boring survivor",
                "bosss?",
                "Bossy",
                "BOT-342465",
                "botanical torture",
                "Bots Drovtend",
                "BoW",
                "Bowler",
                "Bowler",
                "box",
                "BoyFriend [FnF]",
                "Bozo",
                "Bravo",
                "brayan el proxd",
                "brazen",
                "breaden",
                "Brian",
                "BrOBer The Prod",
                "Broccoli",
                "bro doesnt have a life",
                "bro follow me",
                "brogle",
                "bronzzy",
                "Brotherhood of Steel",
                "BR PARADO",
                "brrrrrrrrrrrrrrrrrrrrruh",
                "Bruh",
                "BRUH",
                "bruh",
                "BruhBruhBruh",
                "bruhhh",
                "bruhhh (vn)",
                "bruh moment",
                "Bruh Momentum",
                "Bruh Monument",
                "Bruh Monumentum",
                "Bruh player",
                "Brujh",
                "bruno",
                "bruuur",
                "bryan",
                "bryan  stichn",
                "Bryson",
                "BSK • ＫＩＬＬＥＲ亗",
                "BSK・L E G E N Dᵀᵒᴾ",
                "BSK・L i e e Eᵀᵒᴾ",
                "btw",
                "BT_O",
                "b T規RㄩIes矩W ˋ*ˊd",
                " BUB",
                "BUB",
                "Bubbles",
                "bubble shooter",
                "buff %t",
                "buff %t please",
                "buff arena closer",
                "buff basic",
                "BUGEN",
                "BUGEN+",
                "bugo",
                "builder",
                "BUILDERS!!",
                "build wall :)",
                "bukaka",
                "Bullet Bill",
                "BulutMobile",
                "Bunzo",
                "burh",
                "Burning eye ;(",
                "busco pareja7w7",
                "BUSTER WOLF",
                "But you keep on breaking",
                "Buyandeho",
                "Buzzy",
                "BV",
                "bvaietd?!?!",
                "bvnfgh",
                "Byakugan!",
                "bye",
                "Bye :)",
                "bye error i gtg",
                "bye jax",
                "Byribibeg",
                "BℝeͥncͣyͫtRสncoℝ",
                "C",
                "C - 4 Spank Spank",
                "C - 4 Spank Spank",
                "C-7",
                "c.ew.11.1.11.1.11.1.1.11",
                "c@rt3r",
                "C@t has C@p",
                "Caballo - horse",
                "cable!!!",
                "Caca",
                "CACA",
                "Caesar",
                "cai chua",
                "CAL",
                "Calob",
                "CAMALEON",
                "CambessCupcakes",
                "CAN",
                "can",
                "Canada > USA",
                "Cancel Those Directors",
                "Can I help you today?",
                "Can pls be your friend",
                "Can u see me? :D",
                "can you beat me smashey",
                "Captian",
                "Caracal",
                "Careenervirus",
                "CARELESS(I care less)",
                "car go tornado",
                "carlitos pro",
                "Carmen",
                "Carpyular",
                "Carry",
                "Carsonxet",
                "CarthaHatred",
                "casa",
                "casyle on the hill",
                "Cat",
                "cat",
                "Catalyst",
                "catch me",
                "cat o' nine tails",
                "CATS",
                "cats>dogs",
                "cats nya nya ;)",
                "CAVE- CE",
                "CaภdefJefe",
                "CC",
                "Cc",
                "CCC",
                "ccc",
                "ccf",
                "CDU No.30",
                "CELESTIAL",
                "Celestial",
                "Celestik",
                "CentoodDoobie",
                "Cgfsd",
                "ch.m",
                "CHAARGE",
                "Chaini",
                "Chalicocerate - hu",
                "Charge with me/defender",
                "Charlemagne",
                "Charles 18th",
                "Charlie",
                "Chase",
                "chase him",
                "cheap tank",
                "ChEeSe",
                "Cheese and Perfect RNG",
                "cheese the best",
                "Chekks",
                "chew 5 gum",
                "chicken",
                "Chicken KenChicken ken",
                "chicken wing",
                "ChickyNuggyCat",
                "chill",
                "CHN fed",
                "Chobblesome",
                "Chompy610",
                "Choose otto we stronger",
                "chop",
                "ChRiS",
                "Christofer",
                "christopher",
                "Chroma",
                "Chungus B.",
                "ciao",
                "ciganoit",
                "ciken",
                "circus of the dead",
                "Cirrus5707",
                "Cj",
                "CJ",
                "cjccsqb",
                "ck to la roseanne",
                "ck to la roseannenn.",
                "Claire",
                "CLEAN",
                "Clearing shapes...",
                "click 'F'",
                "Clink",
                "Clorat suotn",
                "ClosePro 2/2/4/7/8/7/6/6",
                "Closeyoureyes",
                "Cloudless",
                "CN Tower",
                "Coapc",
                "Cochon",
                "cocomelon- r u AA",
                "cocomelon :P",
                "cocorito XD",
                "code master",
                "Cody",
                "Coke cola espuma",
                "college sucks",
                "colombia",
                "color",
                "Colors all around me",
                "Come Back Here!",
                "COMEDORDEMAE",
                "Comeme Soy Dulceee aaaaa",
                "Comeme Soy Dulceeeee ;:(",
                "Comeme Soy Dulceeeee xd",
                "Comeme Soy Dulce wateer",
                "Comet",
                "COME TO PLAY FLORR",
                "come with me guys",
                "COMMAND.Z ANTI BOOSTER",
                "comm ander",
                "comma verga",
                "ComptsBaldyDom",
                "comrade",
                "ConsistentOffortsi",
                "constructor",
                "cookie",
                "cool",
                "cool dude",
                "CoolguySkinqu",
                "cool kid",
                "cooooooooool",
                "cooper",
                "cope",
                "COPPA Sucks",
                "copy my tank",
                "Copy my tank ok pls",
                "copy my tank pls",
                "copy The tank",
                "cor",
                "coriander",
                "corner base trust me",
                "Coronavirus",
                "Corrupt and dead.",
                "CorruptedPenguin",
                "CorruptedSpectro",
                "Corrupt Y",
                "Corrupt Z",
                "CosseaPoppyseed",
                "Covid 19",
                "Cozy.",
                "CoͥŇeͣrͫŇizαr⚔",
                "CoήMonƑrสise",
                "CoϻpePregy",
                "CoภsนdBeสภs",
                "cracked",
                "CrankyBanc",
                "CrAsH",
                "Crash And Burn-Dayseeker",
                "crasher",
                "crasher",
                "Crazy",
                "Crazyattacker9YT",
                "CraZy II",
                "CraZy III",
                "creeper",
                "Creeper, Aw Man",
                "crescent",
                "crgine",
                "Cristay",
                "crocty gets 1M first",
                "crocty poo",
                "Crong crong crong",
                "cronge",
                "crongemaster",
                "Crossboi",
                "CROSSIANT",
                "CrownPrincennnnn",
                "Crozo",
                "Crush Limit",
                "csabi",
                "CSDulce  .      _      .",
                "CSDulce im boring :=",
                "CS Dulce i some tired-_-",
                "CSDulce  Legend stop ._.",
                "CS Dulce oh ok -_-",
                "CS Dulce u no are friend",
                "CThanhYT",
                "CTRL+W=godmode",
                "CTRL+W=godmode(viet nam)",
                "CUCK",
                "Cursed",
                "cute pet",
                "cv v",
                "cx",
                "CX Fan",
                "Cxrrupted",
                "cyan",
                "CyͥniͣcͫalIntudynt",
                "Cz Player",
                "cz sk",
                "Công",
                "CђⱥrᴍingPⱥcerᴍⱥr♛",
                "Cสneͥຮeͣfͫight",
                "CℓeDⱥiryVⱥiͥήtͣeͫℓ✨",
                "CℝectͥℓiͣgͫŇe",
                "C𝓪ge¥W𝓪gencie︾",
                "d",
                "d",
                "d",
                "D0M1NAT1NG++",
                "D4C",
                "D19",
                "D:",
                "D=EMON$ do u know?",
                "da",
                "Da boss",
                "da duck",
                "Daffa",
                "Dagaz",
                "Dagaz 2.0",
                "dai",
                "Daisy",
                "Daizole",
                "DalikTikku",
                "Daluns the one?",
                "Damage",
                "dan",
                "Dance",
                "DANCE",
                "DanceTillYou'reDead",
                "Dangerous",
                "DANGG",
                "DAN GYUL",
                "daniel",
                "D A N I E L  bad...",
                "daniel zZ",
                "Dank",
                "dante",
                "DanZo",
                "Dapa",
                "Darius",
                "Darius_575Pro",
                "DaRk",
                "dark",
                "dark:)",
                "Dark Devil",
                "DarkHeart",
                "dark karma link:wc2100",
                "dark karma link:wc2118",
                "Dark Pheonix",
                "DarkStorm3",
                "DARRREN1407",
                "DarthBader",
                "Darth Vader's Slave",
                "darwin",
                "das",
                "Dasher8162",
                "Data Expunged",
                "DatBoi",
                "Dave",
                "David",
                "david",
                "David Sanchez",
                "DawbufBunrose",
                "Day, day, da-da-da-da-",
                "DayeSaySay",
                "db",
                "dc yok bend",
                "DD",
                "dddd",
                "Dddd",
                "Ddddd",
                "DDDDDD",
                "ddqdqwdqw",
                "ddt",
                "dead",
                "DEAD",
                "Deadlord",
                "Dead server",
                "Death",
                "Death Is inevitable",
                "DEATH TO TEAMERS",
                "Debreo",
                "debris",
                "Decagon?",
                "ded",
                "Dedeeeee",
                "Deed",
                "Deep",
                "Deepr",
                "deez",
                "deezs",
                "def",
                "DEFEND",
                "Defender",
                "DEFENDER AL FRIENDS",
                "defenders",
                "Defenders of The south.",
                "defender V2",
                "DEFENSE",
                "deffer in tanks",
                "definitely not mq",
                "Deino",
                "Delta",
                "delta",
                "DEMIAN932",
                "democrats SUCK",
                "Demon",
                "demon",
                "DEMON",
                "demon:solo protejomihijo",
                "demon xd",
                "demon xd:alone in life:(",
                "Denied",
                "Denied",
                "Denied",
                "Dernier Danse",
                "Derniere Danse",
                "Derp",
                "Despair",
                "DESTINY PRO",
                "destroyah",
                "Destroyer",
                "destroyer",
                "DESTROYER (VN)",
                "Destroyer only",
                "Destructor92A",
                "DESTRUYE SQUADS",
                "Detective Conan",
                "Deus ex Machina",
                "Deve",
                "developer",
                "developer",
                "devil",
                "devon",
                "Devourer Of Gods",
                "DevoutItlereve",
                "Dev_Bs",
                "dewfew",
                "Dex Arson",
                "Dexter playz",
                "dez noits",
                "DeͥℓiͣgͫhτfuℓAnᖙeg",
                "dfdfdf",
                "dfhdhgsdgf",
                "dgfdgr",
                "dh_hniV",
                "DI",
                "diana <pleayr>",
                "Die!!!",
                "die",
                "Diedinsto",
                "DIEGO",
                "diep.io",
                "Diep_daodan",
                "dinmor",
                "dino",
                "dinogis",
                "dino run",
                "DIONAX",
                "DiplomaticBerat",
                "Director",
                "Directors are Overused",
                "Directors Are Overused",
                "Disaew",
                "Discord",
                "Disposition",
                "DittØήSqͥuaͣtͫty",
                "Divine",
                "diện",
                "DJ-Nate",
                "djbd65",
                "DJT",
                "DJVI",
                "dk",
                "dkd",
                "dm",
                "dn",
                "Doanh: basic win vn :)??",
                "DOEBLE TOP!",
                "Doe£🆄lMψSo🆄l😬",
                "dog",
                "DOG",
                "Dogatorix",
                "doge",
                "DOGE",
                "Dogs On Mars",
                "Dogs On Mars | no N",
                "dohownik",
                "Domain YT mobile player",
                "Domb",
                "Dominador",
                "DOMINATOR",
                "DOMINON",
                "dom is easz",
                "Don't bother me",
                "Don't Let's Start",
                "Don't Make Me Mad",
                "Don't touch me",
                "Don't worry I'm harmless",
                " DONCRAK",
                "Do Not Disturb (oops)",
                "Do Not Touch Im AFK",
                "Dont away, noob",
                "dont feed me",
                "DontJudgeABookByItsCover",
                "Dont pee on the floor",
                "Dont TaLk 2 mE",
                "dont touch me",
                "dont trust anyone",
                "Doofus",
                "Doofus",
                "doomsday bunker",
                "Door",
                "DOOR nr.1",
                "Doraemon",
                "Dorcelessness",
                "Dorcelessness.",
                "doublade better",
                "Dousermⱥi∂ﾂ",
                "down",
                "downside 930",
                "DPS!!",
                "DR. BEEEEEEEESSSS!!!!!!!",
                "Dr. Eggman",
                "dr.ninja",
                "Dr.Tool",
                "Drabbleasur",
                "draco",
                "dragon",
                "Dragon ,You Dead",
                "dragonfruit",
                "dragonfruit icy 1212 X4",
                "DragonGOD64",
                "dragons go mlem",
                "dragon sleep no brakezzz",
                "drakeredwind01",
                "Drako Hyena",
                "DraXsaurus",
                "dread",
                "Dream",
                "Dream",
                "drift",
                "drifting",
                "Dr J.I.D eyer",
                "droldaed",
                "Drones are gae",
                "drone users are weird",
                "droplet",
                "Dr pizza eyes",
                "DRUNK DRIFTER",
                "ds",
                "dsa.",
                "dscem",
                "dssfb sk",
                "duck",
                "DuckBatman",
                "DuckBatmann",
                "ducko",
                "ducky",
                "ducky",
                "duda",
                "dude",
                "du hund",
                "duji",
                "Dulanka",
                "DullDozyLemodu",
                "Dumb",
                "DUMB",
                "dumb",
                "dumdum",
                "dumpdump",
                "dunt kell meh plas",
                "Duo",
                "DUO MONETER",
                "Duong 20712",
                "duo octo",
                "duos",
                "Dusk Defender",
                "dustnine22",
                "Duy Lee",
                "DVS|| BuiltKIDD",
                "dwada",
                "Dyaranhi",
                " dyllan",
                "dáwsda",
                "Dɪᴏ፝֟sᴀღ᭄",
                "e",
                "e04",
                "E1",
                "e5 y5gcv",
                "E?",
                "eaeaeaeaeaeaeaeaeaeaeaea",
                "eafscx",
                "eagle T",
                "earth",
                "earth = sphere",
                "Earth is Super Cool",
                "Eating Fighter ^Silvy^",
                "eat my bullet",
                "Eat my Doritos!",
                "Eauletemps",
                "Eauletemps 4V1=noobs",
                "Eauletemps spin=screen",
                "Eauletemps why?=(",
                "eben",
                "Echo",
                "Ecxel",
                "eda",
                "edan",
                "EDI",
                "Edith",
                "EDP445",
                "eee",
                "eeebot",
                "eeee",
                "eeeee",
                "eeeeeee",
                "eeeeeeeee",
                "EEEEEEEEE",
                "EEEEEEEEEEE",
                "EEEEEEEEEEEEEEEEEEEEEEEE",
                "eeeeeeeeeeeeeeeeeeeeeeee",
                "eeeeeeeeeeeeeeeeeeeeeehh",
                "Eeeeeeva",
                "eef freefzz",
                "Eesti",
                "Egg'in",
                "Egg Spawner",
                "Egg tart",
                "egvda",
                "eh",
                "ehehe",
                "EHSY BAAA",
                "Ehwaz",
                "ehwhylag",
                "EIDOLON",
                "Eiffel Tower",
                "either",
                "EJIT",
                "Eleanor",
                "elecgance",
                "elecgance4",
                "elecgance404",
                "Electrodynamix",
                "Elegirionvedr",
                "el epepep",
                "ElfuภΐBΐBαr͢͢͢rel",
                " ElguerreroHastaElfinal",
                "eli",
                "ELITE",
                "elite basic lvl. 45",
                "Elite Celestial",
                "Elite Crasher",
                "Elite Knigh*",
                "eliza2",
                "Elmo is gone",
                "el mujahideen",
                "eloxus",
                "el pendejo",
                "el pogero momento",
                "Elson",
                "EL TRUENO PRO",
                "Emi 10 ra ge hatag",
                "Emilnines",
                "Emily",
                "EminentKinteeni",
                "Eminx",
                "emir",
                "emir",
                "Emmett",
                "EMO",
                "emp",
                "empire",
                "Encipansoncla",
                "End",
                "Enderian Overlord",
                "ENDERMÉN",
                "Endoy",
                "EnemyTracker (LookAtMap)",
                "Enendscandspip",
                "Energized",
                "Engineer Army",
                "Engineering",
                "eng pa",
                "enr",
                "Enter Me",
                "Enter to the Dungeon",
                "epic nokia",
                "Eponesibadedge",
                "EpsiCron",
                "Er0  VN",
                "eRAnnnnnnnnnnnnnnnnnnnnn",
                "EreN0",
                "Eren noob you",
                "Eren slenderman",
                "erf",
                "Eric.  The. Unstoppable",
                "erro 1mil im so bad:(",
                "error",
                "Error 404",
                "Error 505",
                "errora",
                "error error error error",
                "ERROR windows xp",
                "eryweufhw8r46yq3782edtqf",
                "Es3et",
                "Escort Carrier",
                "EsionlyGillygum",
                "es ta la vida que toca",
                "ET",
                "Eternal(VN)",
                "eternal.exe",
                "Eternal Guardian",
                "EternalMakaush",
                "Ethad",
                "Ethan",
                "Ethan david fernandez",
                "EthicalPriametr",
                "EthΐcαlͥHoͣdͫyetre⚠",
                "EtionSeatides",
                "EtRNInja",
                "Etz",
                "eu tenho a melhor mae^-^",
                "eutimato your bad",
                "Evaden K",
                "Evades 2",
                "Evalingђteᖙseᖙi",
                "evan",
                "Evan",
                "everybodybecomespike",
                "EVERYONE BE DESTROYER",
                "Everyone Go MachGunner",
                "everyone sucks",
                "Everything RAM Mobile",
                "EvesevStSteve",
                "Evil AliExpress Box",
                "Evil }{eonyao",
                "ew",
                "EwE",
                "ewltjdwns3673",
                "ewqasd2021vinicius",
                "ewres",
                "exc",
                "exc",
                "exc (fake)",
                "exc (real)",
                "Exendern",
                "e xin thua",
                "Exotrezy",
                "Expand: 8(5y+88)",
                "ExpectMe2BeDeadCuzOfLag",
                "Exterminate",
                "extreme hapiness noise",
                "Extreme Speed",
                "extrextrehomiscopihobia",
                "exu boi",
                "Exͥamͣiͫckร☢ή",
                "Eydan ツ",
                "Eye",
                "EyeCⱥnᖙyᖘunᖙeseg",
                "Eye Of The Sahara = City",
                "eys",
                "EZ",
                "EZNT",
                "ezz",
                "EzzeKiel",
                "ezzzezezezezezeze",
                "EήthHⱥlfPint",
                "f(x)=k",
                "F-35",
                "F-777",
                "F-898",
                "F7",
                "Faaip de Oiad",
                "FabianTu",
                "factory not op :(",
                "Factory Takeover",
                "facts",
                "facu++",
                "Fade",
                "fahrradsattel",
                "FAIRY",
                "Fairy",
                "Fake.Fake.Fake",
                "falc",
                "Fallen",
                "Fallen",
                "fallen %t",
                "Fallen %t",
                "FALLEN. BOOSTER",
                "Fallen AI",
                "Fallen Auto-Tank",
                "fallen booster",
                "FALLEN BOOSTER",
                "Fallen Boss",
                "Fallen Bot",
                "Fallen E",
                "Fallen Factory",
                "Fallen Hybrid",
                "Fallen Nothing",
                "Fallen Overlord",
                "Fallen Overlord red",
                "Fallen Spiddy",
                "FALLEN SWORD",
                "FALLEN SWORD",
                "Fall Guys",
                "F  A  M  I",
                "far",
                "farmer's tan",
                "Fart",
                "Fartington",
                "FAST",
                "fast boi",
                "Faster",
                "father landmine",
                "Fatty",
                "Faͥveͣrͫnext",
                "FBI",
                "fdb",
                "fdf",
                "fdfdf",
                "fdgxcgvx",
                "fdsmn",
                "fed",
                "FedEx Box",
                "FEED ME",
                "Fei",
                "Felchas",
                "Felchas",
                "fellen 0",
                "fence",
                "fencer add me on disc",
                "Fenrir",
                "ferge",
                "Ferge",
                "ferrari",
                "FersoPowerpuff",
                "FessoPissant",
                "fev",
                "fewillos",
                "FEWWW....",
                "FEWWW....",
                "FeZTi Fan",
                "fezti fan",
                "FeZTiVAL",
                "FeZTivAL",
                "FeZtiVaL",
                "FeZTiVAl",
                "FEZTIVAL",
                "feztival",
                "FeZTivAL",
                "FeͥllͣsͫoϻƤlo",
                "Ff",
                "FF9JesT",
                "ffa till 1m!!!",
                "ffdf",
                "ffffffffffffffffffffffff",
                "fffffftt",
                "ffhfghu",
                "ffk the desrtroy",
                "F for Froot Loops",
                "FFOx",
                "fg",
                "FGDERTY",
                "fgg",
                "Fggf8ytr ftrfbtruf7rtfru",
                "fghjijb",
                "Ficli",
                "FicบℝneCบʝo",
                "FIFA",
                "FIGHT",
                "Fighter",
                "Fighter tank",
                "FIGHTONTHEHIGHTS",
                "final destination, fox only",
                "Finally, 3 m on siegers",
                "Find Me",
                "finland",
                "FINz'D",
                "Fire",
                "FireBerryBethindi",
                "fIrEbOt",
                "fire exe",
                "FireStorm",
                "firework",
                "Fireworks!?!?!?!?!?!?!?!",
                "Firnas",
                "First Time Play",
                "fisch",
                "Fistandantilus 39 AC",
                "fix performanz, devz plz",
                "FiήgtFiggץ⚔",
                "Fk",
                "fk demon",
                "fkdla",
                "Flace_25",
                "Flash",
                "Flashbacks",
                "Flawless_",
                "FleRex",
                "Flight",
                "floof",
                "Floofa",
                "floofa",
                "floppa",
                "Florentino",
                "Flowey723",
                "Fluffy",
                "Flying",
                "FnF",
                "fnf is a poop",
                "FNF Thorns",
                "FOLLOW ME OCTO TANKS",
                "FOLLOW ME TO VICTORY!",
                "food",
                "Fookeyedep",
                "foon",
                "footeloka",
                "force feild",
                "force field",
                "Force field",
                "ForessiKisses",
                "forest",
                "ForeverBound",
                "ForgivingForn",
                "Forgor",
                "Forightse",
                "fotosintesis",
                "Fotosintesis",
                "Founititag",
                "Fourty-Six & 2",
                "fov",
                "Foxtrot",
                "FoบຮervͥᎥdͣeͫ",
                "FPT",
                "fr0z3n",
                "freakshow :)",
                "Freddy",
                "freee",
                "free fire",
                "free fire  max",
                "Free Points? Nuh-Uh!",
                "Free to insult",
                "FREJEA CELESTIAL 1.48MXyn",
                "Friend",
                "friendly",
                "Friendly",
                "Friendly /j",
                "Friendly Elite Crasher",
                "friendn",
                "friend of mo",
                "Friend pls",
                "Friends?",
                "Friends ? ",
                "Friends?",
                "FRIENDS TO ENEMY",
                "friend to all",
                " Friend with me",
                "frjhjhvt",
                "FRNDL",
                "frost",
                "Frost? Mobile",
                "Frostbite#6915",
                "Frostbite#6915",
                "FrownyTownswe",
                "frrrrrr????",
                "frrrrrrr???",
                "Fruits",
                "FR|Fajro",
                "fshwel",
                "ft. Karmatoken",
                "fudgg",
                "Fugitivo BR",
                "fun.",
                "Fundy",
                "Funky Fresh",
                "funnylemon",
                "furan",
                "fux",
                "fvdr5",
                "fvha",
                "fwen -w-",
                "FwgKing",
                "FαcͥτoͣrͫyInτorτ",
                "F๏นghτsere",
                "Fℓน††eriή𝓰T๏ήce͢͢͢∂in",
                "g'day mate :)",
                "G,bdx m",
                "G.A.P(MG)",
                "G1019_t",
                "gab",
                "GABE",
                "Gabe Itches",
                "gabi",
                "Gabogc",
                "GABRIEL",
                "Gabriel8",
                "gal",
                "Galactic slush",
                "Galax",
                "GALAXY",
                "gamer.io",
                "Gamer🎮",
                "GANG",
                "gang gang",
                "Gangsters_Paradise",
                "gart",
                "gas",
                " Gaurdian",
                "Gavin",
                "Gawr Gura",
                "Gay Overlord",
                "Gay Overlord",
                "GB",
                "GBQQ",
                "gdfaaa",
                "Gee, thanks",
                "GEESER",
                "Gelsouldi",
                "Gem!?!?!?!?!?!?!?!?!?!?!",
                "gemgemgemgemgemgemgemgem",
                "Gemma",
                "General",
                "General",
                "genocide BBB",
                "Geo",
                "g  ergd",
                "German",
                "get better bozo",
                "get error to 1m",
                "get error to 1mil",
                "get in wall",
                "GET MORE PEOPLE",
                "Getnoobed",
                "GetRekt",
                "get rekt",
                "Geຮຮionͥຮtͣaͫ",
                "Gggg",
                "ggggg",
                "gg gmzin",
                "ggh",
                "ggking",
                "gg partially you loser!",
                "ggs",
                "ggs (1m!)",
                "ggs you are good drone",
                "GGui",
                "GGuisa",
                "ggwz",
                "GHASH",
                "ghg",
                "Ghgft",
                "ghgh",
                "GHHGR'986452|",
                "ghhhhhhhhhhhtoast",
                "Ghi",
                "ghost",
                "ghostly_zsh",
                "Gianan",
                "Giang~Mweo",
                "Giann",
                "GIANNIS ANTETOKUMPP",
                "Giant Justice",
                "GiantJustice-",
                "Giant Justice YT",
                "Giant Justice YT - GG",
                "GIGA CHAD",
                "Gigachad",
                "GiGa LEN",
                "GIGA SHRIMP",
                "Giggity",
                "Gingentray",
                "giraia",
                "giranha",
                "git gud",
                "give beta tester",
                "Give Me Underused Vibes",
                "Give Me Wings",
                "give me your butt dude",
                "glacieronfire",
                "glenn <3 rachel",
                "G l i t c h e d",
                "glitch tale",
                "glurip",
                "gmonster",
                "gnghfiukfhfj",
                "go",
                "go",
                "GOAT",
                "go away",
                "Go Away",
                "god fighter",
                "god is good",
                "Godzilla",
                "godzilla",
                "gofra",
                "GoGe",
                "go jax!",
                "goku",
                "GOKU",
                "Goku drill",
                "GOMU GOMU NOOOOOOOOOOO",
                "GONIALS",
                "Gonials > Bird",
                "gonzalo whathat",
                "Good!",
                "Good",
                "Good Job Chicken",
                " GoodLuck",
                "good luck",
                "good morning",
                "goofy ah single",
                "goofytank",
                "Gorilla gang",
                "Gortaitic",
                "go sleep",
                "Gosu General",
                "got 3m og save cant use",
                "go to 10 mil record",
                "Go to Church",
                "GO TO DA TARGET STOEEE",
                "GOTTA SWEEP SWEEP SWEEP",
                "Goubekson",
                "GPA",
                "Gr8",
                "Grabourch",
                "grace.",
                "grandmas ashes",
                "graumops",
                "gray",
                "GRAY STILL PLAYS",
                "Graziani",
                "GraվรⁱRนgraτ🌻",
                "Great Bydgoszcz Reich",
                "greedy",
                "green",
                "Green.grey.purple.blue.",
                "GREEN Barricade",
                "Green Defender",
                "green square",
                "green sunfish",
                "Green will win",
                "Gregoryelproo",
                "Greg the Hunter",
                "grendel",
                "Griffy",
                "Grill my flippen butt",
                "Ground",
                "GRRR",
                "gruby",
                "GrͥesͣsͫB𐍉sslคdψ",
                "Grαcΐ๏uຮCaͥ๏uͣnͫc",
                "gtegnugnbdbdtui",
                "gtrr56e4e5eerer",
                "Guard",
                "Guardian",
                "guardian",
                "Gudmman",
                "GUGUn",
                "Guilherme",
                "Guillotine",
                "GujiGuji",
                "gulbos gulbos gulbos",
                "Gun",
                "gun boll",
                "Gurmaan THE PRO",
                "Gusfin3  :)",
                "Gustav",
                "Gutey",
                "Guy",
                "guy",
                "Guͥΐlͣtͫless𐐚otlץsΐs",
                "G vytvyv",
                "GWiz",
                "GX",
                "GX .ver",
                "GxngW",
                "GymGuyMgbil",
                "GZGESETA",
                "GℝegⱥℝiouຮMeⱥℝee☂",
                "h",
                "h",
                "h..hi :S",
                "h1h4",
                "h8u",
                "Ha!Get Rekt",
                "Ha...Get Rekt",
                "HAAAAAAAAAAAAAAAAAAAAAAA",
                "hack",
                "hacker",
                "HACKER",
                "hackercool",
                "hacker lololololol",
                "Hagalaz",
                "haha",
                "hahaa u noob",
                "Ha Ha Boo",
                "haha bowler no 1M",
                "hahaha!!!",
                "Hahaha",
                "HAHAHAHAHAA",
                "HAHAHAHAHAHA",
                "Hahahahahahahahaha",
                "HAHA HEHE HUHU",
                "HAHA HEHE HUHU MOBILE",
                "HAH LOLX)",
                "hai",
                "haiw",
                "Halal Certified Tank",
                "Hallo",
                "halo",
                "Hammer",
                "Hank",
                "hansith",
                "Hanumanumani",
                "Happe",
                "happe",
                "happy!",
                "happy day",
                "happy mafer <3<3<3<3<3<3",
                "hara",
                "hara )))=",
                "hara- XDDDD",
                "hara ...",
                "hara dont trust me",
                "hara vi",
                "Harder Demon",
                "harmless shower",
                "harnesto",
                "Harry Styles",
                "Hatsune Miku",
                "Haunted",
                "have fun crying eren hah",
                "Have mercy...",
                "Have you seen me",
                "hawaii",
                "   HCM MUÔN NĂM",
                "Hdujdb",
                "he",
                "Healer",
                "healer",
                "Healer",
                "healersruseless",
                "Heandy",
                "HeaຮΉ𐍉ducҜᴸᴵᶠᴱ",
                "heck",
                "HECool",
                "heeeeeeelo",
                "Heeh",
                "HEEHEE",
                "heh",
                "hehe!",
                "hehe",
                "Hehe",
                "hehe boi vn",
                "hehe car go vroom vroom",
                "Hehehe",
                "hehehehaw",
                "heist3",
                "Helga",
                "hell",
                "HELO GUYS",
                "Help",
                "help",
                "HELPE ME FOR HELP YOU",
                "help me",
                "HenHen",
                "HenHennnn",
                "HeNrY",
                "HENRY      ANOS7",
                "Henrystickcmans",
                "here to make friends :D",
                "Here Were Dragons",
                " HEROBRINE",
                "Herobrine",
                "heroy_105",
                "Herrionati",
                "hetman666",
                "Hewwo :3",
                "hex",
                "HexaDecagon(I grind)",
                "hexagonal",
                "Hexagon Temple",
                "HEXDECA",
                "Hey!",
                "HEy Im frendly ;)",
                "hey moskau!! moskau !!",
                "hey sister",
                "Hey team",
                "hey vn;d",
                "Hey What Happened?",
                "heyy!!",
                "heyyyy",
                "HEYYYYYYYYYYYYYYYYYYYYYY",
                "Heɭɭ฿☢ᴿåbo",
                "HeͥᴍaͣdͫeDelᎥ𝖗Ꭵum😇",
                "He∂uαlrigive",
                "hfski",
                "hgdgt",
                "hghg",
                "hguyuthg",
                "hhfggddfdf",
                "HHH",
                "hhh",
                "hhhh53535",
                "hhhhh",
                "hhhhhhhhhhhhhhhhhhhhhhhh",
                "hi!",
                "HI!",
                "Hi",
                "HI",
                "hi",
                "hi",
                "hi (original)",
                "hi.",
                "Hi ._.",
                "hi8addas",
                "hi :)",
                "hi ;)",
                "Hiary",
                "Hiary4",
                "hiboiXD",
                "Hi bruh guy",
                "Hichicapho",
                "HI  Five",
                "HighFenrir",
                "highh",
                "HI GONIALS",
                "hihi",
                "hihihi",
                " hihihihuhihihihhiihhihi",
                "Hii",
                "hiiii",
                "hiiiiiii",
                "hiiiiiiiiiiiiii",
                "Hiiiiiiiiiiiiiiiiiiii",
                "hi im friendly :)",
                "hi im one",
                "hijo de su putisima madr",
                "Hi Levi!",
                "hi long tri",
                "Hinote",
                "Hint :D",
                "hiro",
                "hi saya",
                "Hissiodustomer",
                "Hi Travis!",
                "Hiu VN",
                "hi UwU",
                "hi vn 1",
                "HI Yoou",
                "HI  you mom is here",
                "HI Youvn",
                "Hiภⱥls†MiAlmⱥ",
                "hi ツ",
                "Hi 香港😘> pls don't kill�",
                "hj",
                "Hlp my ky r brokn",
                "Hm",
                "Hm",
                "Hmm",
                "HMMMMMMMMMMM you are L",
                "hmst",
                "HNY",
                "hoang",
                "hoang118",
                "Ho Ho Ho",
                "hohohoimsanta",
                "Hoi",
                "hola",
                "Holy",
                "Homeless man",
                "Homing_Pigeon",
                "honesty Spectator",
                "Honey Bee",
                "hooray",
                "hop",
                "hope i dont dc",
                "Hoping",
                "Horizon",
                "HORRIBLE LAG i'm pacific",
                "hose man",
                "hostile",
                "HostilityBustay",
                "Hotel",
                "Hourabony",
                "houses",
                "Houstsibl",
                "Houℝgͥΐcͣaͫr︾",
                "how? what? why?",
                "hows your day",
                "how to get testbed?",
                "How to get you",
                "how to stack fighter",
                "hsg is sb",
                "Ht",
                "hu",
                "hub",
                "huff",
                "huggi wagi",
                "Huggy wuggy",
                "huggy wuggy 2",
                "Hugh",
                "Hug Me",
                "Hugo",
                "huh",
                "HUH?",
                "HumptyImpelic",
                "HUNG",
                "Hung dayy",
                "HunggVn",
                "Hunker down",
                "Hurricane",
                "hus",
                "Hut",
                "huttutu",
                "huy",
                "Huy ;-;",
                "huy vn :D",
                "huy vn :D",
                "huy vn :D nhu loz",
                "hvdhh",
                "hWE",
                "HxD",
                "hy",
                "Hybalixa",
                "hybrid",
                "Hybrid",
                "Hydra",
                "hydro",
                "Hymness",
                "hyperbolica",
                "hypertone",
                "H̵͊̕ė̵̮l̷͎̈́l̵̅͛ơ̸͊",
                "H̵͊̕ė̵̮l̷͎̈́l̵̅͛ơ̸͊",
                "HⱥŇceIcepicҜ❥",
                "I",
                "I",
                "I",
                "i'm a sadboiz (joke)",
                "I'M CHILLIN",
                "I'm Friendly",
                "i'm friendly",
                "I'm harmless! -Press N",
                "I'm Innocent",
                "I'm in school",
                "I'm not bad",
                "I'm poor:(fortnine duo",
                "I'm protecting you! Sort",
                "I'm Q",
                "I'm Real",
                "I'm so lag(sinbadx)",
                "I'm your son",
                "I'm_Chris",
                "I also helping blue",
                "I am milk",
                "I am your shield :)",
                "Ian6000",
                "iar",
                "iar chary",
                "i asia so 300ms",
                "i believe in jesus",
                "I bet you never",
                "ICBM",
                "Ice Breaker",
                "ice tea for free",
                "ID",
                "i destroy destroyers",
                "IDK",
                "Idk...",
                "idk bro",
                "idol askib",
                "I don't even care",
                "I don't know",
                "I don't need a Partner.",
                "idonthavaccount",
                "i dont know",
                "idrk",
                "I eat dirt",
                "Ifarm",
                "igh",
                "Ight Bro",
                "i go high",
                "igoty",
                "i go UP and DOWN",
                "i hate %t",
                "Ihavelocty",
                "i have sponks :)",
                "Ihv2010",
                "III",
                "iiiiiiiiiiiiiiiiiiiiiiii",
                "ijklmnop",
                "I JUST SUCK",
                "i just want shiny shapes",
                "ikandoit",
                "IKEA Box",
                "i like cheese",
                "i like cheese too",
                "Ilikefarming",
                "ilikemen",
                "i like walls:3",
                "Ill Tear your eyes out..",
                "illuminati",
                " i look into ur soul",
                "i looove %t",
                "I love nahu",
                "I Love you",
                "I Love you",
                "im 100 years old",
                "im a cat",
                "Imaginary",
                "Imagine",
                "imagine being nub",
                "IMAGINE DRONE IN TDM",
                "imagine spinning",
                "im a joke",
                "im a joke",
                "Im a landmine pls nohurt",
                "i m a protector",
                "IM AWESOME",
                "IMAXI",
                "im a yoututoer",
                "imbad",
                "im bad",
                "im beef",
                "im bored",
                " im crying do to U!",
                "Im friendri your order",
                "Im gonna knock you out",
                "im new",
                "imnew",
                "ImNew",
                "Im New,dont kill me pls",
                "im noob",
                "Im not a tank",
                "Impact of TY-77",
                "Impeach Trump",
                "im poppin' off",
                "ImposingVelsical",
                "imscared",
                "Im scary",
                "im sorry",
                "IM SUPER RETARDED!!!!!!!",
                "im the best",
                "Im uwu",
                "im watching you",
                "Im weakest tank",
                "IM WITH STUPID =>",
                "im your pet",
                "Imק𝔯essi𝕧eや𝔯iτs",
                "InceirKissyFace",
                "Indeed",
                "India",
                "India",
                "INDIA",
                "INDIAN",
                "Indo",
                "Indo Kok gk pro",
                "I need 3 1m more",
                "i need a pee",
                "i need score",
                "i never bin 1 mill",
                "Inevitable X",
                "Info?",
                "Inf𝔞M𐍉nFr𝔞ΐรe",
                "Ingdpoici",
                "IngenScrooge",
                "IngheoAngon",
                "IngiShinyGaze",
                "Ingledible",
                "IngmerRhino",
                "IngshiDingo",
                "InguDerange",
                "IninFeint",
                "Injoro",
                "ink sans",
                "Innkeeper Worm",
                "Insanity",
                "InsibilWinkyDink",
                "Inside Out!",
                "insta 'brn.o.z'",
                "insta: 'brn.o.z'",
                "Internet Explorer",
                "into my head",
                "Into the Light",
                "Inverse",
                "inverse square law",
                "invincible man",
                "invisible drones",
                "Inͥ∂eͣlͫψຮtr",
                "i only farm",
                "i only spectate",
                "IRS",
                "i Saw LimeinSoccer penta",
                "I see",
                "i see fire",
                "i see who you are",
                "is op on siege mode",
                "I stand for Liberty",
                "i suck",
                "i suck at bosses",
                "Isͥheͣrͫΐτaℓes",
                "it's a lie",
                "It's a lie",
                "it's a lie it's a lie",
                "It's all okay.",
                "itachi",
                "Italok",
                "Itarᖙรcreϻa",
                "Itiattive",
                "ItisBityarani",
                "its me! the",
                "its me pekola",
                "Ittelitingly",
                "ItyansSugarBuns",
                "Itycomplandshor",
                "Ityretuddynt",
                "iuiui",
                "ium",
                "iurgitues",
                "i use hacks",
                "I use handphone",
                "I use underrated tanks",
                " Iv",
                "IvanGG",
                "ivoree",
                "i vow to protect",
                "I Voyage Around Map",
                "iv vs 3",
                "IW",
                "I WANT A HIGH SCORE",
                "IwantLegs",
                "i will download osu",
                "I Will Give U My Points",
                "i will troll :D",
                "i won't let it end",
                "IXGAMËSS",
                "iXPLODE",
                "Izumi-san (VN)",
                "IŇeττivie♛",
                "IήesนrͥŇeͣmͫ",
                "Iτedeຮeded",
                "Iภge†eͥℝeͣdͫu",
                "I๓թe𝒸cąbℓeMusper☘",
                "I†iͥonͣgͫingeℝna⚠",
                "I𝓃gMøn🅰nge",
                "j",
                "J.L",
                "ja",
                "jace",
                "Jachris",
                "jack.vn",
                "Jack Daniel",
                "JACKSON",
                "Jacob gomez_Jadenian",
                "Jacob gomez _ Jadenian",
                "jacquie",
                "jaffa calling",
                "Jagdpanzer IV",
                "Jagdtiger",
                "Jain",
                "jajajaj",
                "Jake",
                "Jambi",
                "Jame∂iͥPaͣtͫtψMeℓt",
                "Janet",
                "Jap",
                "jared2.0",
                "JaredUwU",
                "Jash",
                "jaxon",
                "jax sucks",
                "jbc",
                "j bert",
                "jeb",
                "Jeff",
                " jeje",
                " jeje.2",
                "Jekyllean",
                "Jekyll Why",
                "jelly",
                "jellybEab",
                "Jera",
                "jerry",
                "Jerry",
                "Jerry - LOL",
                "Jes;/;ter",
                "jesian",
                "Jess",
                "JESUS E AMOR",
                "jesus proooooooooooooooo",
                "Jet(pet)",
                "JeͥcrͣeͫสCleʝerrℽ",
                "jhh",
                "jhonny",
                "Jhon the nub",
                "Jikang",
                "jimmy",
                "jimmy",
                "jj",
                "jj",
                "jjj",
                "jjjj",
                "jjjjj",
                "jjuanto",
                "jk",
                "JK",
                "JK+",
                "jkhhgg",
                "jkl",
                "jmanplays",
                "JockyAckn",
                "joe",
                "Joe Biden",
                "Joe Mamma",
                "john",
                "johnrobin",
                "JohŇiteƤⱥ",
                "Joidaskin",
                "JOIN THE PENTA PARTY",
                "jojo",
                "JokaDa",
                "JokaDa: how incremente s",
                "JOKER",
                "joker",
                "Jolo",
                "Jon",
                "jonas",
                "jonh",
                "jonh real",
                "Jonk",
                "jony0814",
                "jonyy0814",
                "jor",
                "jordan(:",
                "Jorge",
                "jory",
                "jose digma",
                "JOSEF",
                "josh",
                "Josh",
                "josh how play?",
                "joshkidkid",
                "joshs",
                "JOSHUA",
                "Jotaro",
                "jotaro kujo",
                "Jr.Greeen",
                "JSABJSAB",
                "JSjs",
                "jsohi",
                "JTG",
                "juan",
                "Juan B)",
                "JudensPendulum",
                "Judith",
                "JUIDNDI",
                "JUIHAN",
                "Julia",
                "Juliet",
                "jumla",
                "jummer",
                "JUMP ROPE 10 TIME IN ROW",
                "Juna",
                "jungleman",
                "junhu",
                "just",
                "Just aj",
                "Just a Spectre",
                "Justa_Noob",
                "just boone",
                "just duo",
                "Just Existing",
                "Just Having Fun",
                "just joe",
                "Just Luke",
                "JustLurkin",
                "Just Spinning",
                "jUst TrolLinG aRouNd",
                "Just watching",
                "jygghhjj",
                "jz",
                "JzF",
                "JบicץJบnᖙen",
                "J๏ѵiaℓP𝓇iaℓ",
                "J𐍉viαℓC𐍉vi𐍉",
                "k",
                "k",
                "K.I.L.L",
                " KA2",
                "kaan",
                "ka boom",
                "Kaboom",
                "Kael",
                "Kaiju spacegodzilla",
                "Kaiju you",
                "kaio",
                "kakyus222",
                "kakyus222f",
                "Kalashnikov",
                "Kalijia",
                "Kalijia GG",
                "Kalijia Let's Peace",
                "KANG OF WAKANDA",
                "Karen-SpeakToYourManager",
                "KarMaN",
                "KarmaToken",
                "karol43",
                "Karthik",
                "Kartoffel",
                "kase",
                "kase is good",
                "Katya",
                "kavin",
                "ka yawa",
                "Kazakhstan",
                "Kazzbro",
                "kbshlong",
                "kdk",
                "Keestingko",
                "kek",
                "kelly",
                "KEMUEL667",
                "kendyl",
                "kendyl 1",
                "Kenobi!!!!",
                "KermitHasAGlock",
                "kermit the frog",
                "kevin",
                "Kevin Heckart",
                "kevynz",
                "kha",
                "khang",
                "khe",
                "KHOA",
                "khoa fake:)))",
                "Kid",
                "kiet",
                "KillerTMSJ",
                "KILL ME I DARE YOU",
                "Kilo",
                "Kim Jong-Un",
                "king4a",
                "king bob",
                "KING CRIMSON!",
                "Kingdom Hearts",
                "King Hans",
                "king of ...",
                "king of diep",
                "KING OF DRONES",
                "King of Pros",
                "King Pikachu",
                "king pug",
                "king slayer",
                "king vn",
                "King_plays",
                "Kino",
                "Kira",
                "Kirbo",
                "kirilloid",
                "kiriloid",
                "KissableDontrisd",
                "kitten",
                "Kitzuneko",
                "kiyo",
                "kjiegu835946793",
                "KK",
                "kk",
                "kkj",
                "kkk",
                "kkkkkk",
                "kkkkkkkkkkkkkkkkkkkk",
                "KL",
                "Klair",
                "KN-23",
                "knbg",
                "knjbfhiu",
                "Know",
                "Knoz",
                "KOA",
                "koala",
                "Koala",
                "koby",
                "Kofolka",
                "koishi",
                "kokak",
                "kokun",
                "Kol",
                "kolibri",
                "kom",
                "kool",
                "koral",
                "KOREA",
                "Korea :D",
                "korean",
                "korea no academy",
                "korne",
                "Korone Chan",
                "Koronoe Chan",
                "kostas friends ? greece",
                "koten-",
                "kotetsu",
                "Kozuki Momonosuke",
                "kr",
                "kr9ssy",
                "kracc bacc",
                "kraken",
                "kral kaan",
                "Kristoffer",
                "Kronos - Eternal",
                "Krystal110607",
                "KRYZ",
                "KSA",
                "ku",
                "kumar jeremy",
                "kuro",
                "ky",
                "Kylaura",
                "Kyrie o.O",
                "L4r9",
                "l7er max",
                "La-BareTTA",
                "LA2T",
                "La CFE me quito la luz",
                "laco",
                "la couronne",
                "La Espada",
                "laffy taffy",
                "lagg",
                "Lagmat YT = 🎷 channel",
                "LAINofLAIN",
                "lakalaka",
                "lakf",
                "La meilleure",
                "laranon br",
                "Last remote",
                "Lateralus",
                "Lateralus",
                "laugh_laff",
                "Launchers no buff no gg",
                "lautaro",
                "lautayo",
                "Lava Perros",
                "lawless",
                "LazerLOL",
                "LazuLight",
                "ldldl",
                "LEADER = BANNED PLAYER",
                "LeaderboardAllDirectors.",
                "leader Slayer",
                "Learn with pibby",
                "leave me alone!",
                "leave me alone pls",
                "lee77",
                "lEFF",
                "left for dead",
                "Legacy",
                "legend",
                "LEGEND",
                "Legend",
                "Legendary",
                "LEGENDARY (VN)",
                "LEGENDARY BEST",
                "LemonTea",
                "lena",
                "Lena",
                "lena<3",
                "lenin12",
                "lenin pro",
                "leo!",
                "leo! hel",
                "Leo",
                "Leo hacker",
                "Leon",
                "Leonard",
                "leonardo",
                "leonardo YT",
                "LEOPARD 1 WILD",
                "Lera",
                "let's begin....",
                "let's go!",
                "Let's work together!",
                "Let's work together!  N",
                "le tank",
                "let be friend",
                "let me farm alone",
                "Let me free",
                "let me protect u my lord",
                "lets 1 v 1 bra",
                "Lets be frands",
                "lets be freinds guys!!!!",
                "letsbuildawall",
                "LETS GOO",
                "let u know",
                "Lety <3 :)",
                "lev",
                "level",
                "Level  fun",
                "Leviathan",
                "LIBE",
                "Liberty Prime",
                "Life is good",
                "Lifeless..",
                "Lightning",
                "LIGHTNING DRAGON X 96",
                "lightz squad",
                "like",
                "Like crashers",
                "Like dat",
                "lily the pad",
                "Lima",
                "LincystColestah",
                "Linghtning McQueen",
                "link ...",
                "LintanG",
                "LintanGG",
                "LintanR",
                "lio",
                "list of noobs:",
                "literally the changelog",
                "LittleBana<3",
                "little bitch",
                "LITTLE GUY",
                "little one",
                "little one :D",
                "Little one <3",
                "Little Red Rocket",
                "Little Timmy",
                "Lixeiro do mal",
                "Lixツ",
                "Liͥveͣrͫiภgบi",
                "lk;k",
                "llego el pro!",
                "lll",
                "llllllm",
                "llol",
                "LMGshooter",
                "lnwZa007",
                "lobo",
                "LOCO",
                "Lofi",
                "lo hoc hanh",
                "Loki",
                "lol",
                "lol",
                "lol",
                "LOL",
                "lol1",
                "lol2",
                "lol:):):):)",
                "lol darth vader noob",
                "loler",
                "lolera",
                "lolnub",
                "LOL ONYXD",
                "lolstar",
                "Lonely :/",
                "longest run",
                "long nameeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                "longvn racing boiz",
                "look behind you",
                "look llllllll",
                "look llllllll kkkkkkkkkk",
                "Loop",
                "lopi",
                "lor",
                "Lorain",
                "lorain",
                "LorcaExE",
                "LORD X",
                "Lore",
                "Lore",
                "Lorenzo",
                "LoSTcar",
                "Lost MvP#7777",
                "Lostvayne",
                "Lotus",
                "LowKey",
                "loxc",
                "loz.",
                "lp lithium",
                "lqkf",
                "LSV-005",
                "ltbc",
                "ltester2000",
                "lth",
                " lu",
                " lucas",
                "Lucas",
                "lucas",
                "luchi",
                "lucho",
                "lucky",
                "Lucy",
                "Luffy",
                "luis",
                "luis daniel el pro",
                "luka modric",
                "LUKI",
                "LUMBRE",
                "lumity",
                "lumos - kms",
                "LumpyNemples",
                "Lunatic",
                "lurker",
                "lusy",
                "Lux",
                "Lx1000000000000000000000",
                "ly",
                "lyxn",
                "LΐvͥesͣeͫsChΐℓΐ",
                "L𐍉veCaภdψMaͥภdͣeͫra✨",
                "L𐍉𐍉ภψSi𐍉ภaͥlsͣeͫ❥",
                "m",
                "M.",
                "M.D",
                "M4a1",
                "M8",
                "M163 SPAA",
                "Ma$t3R",
                "Ma$t3R=No Ski||s",
                "Ma$t3R lucky",
                "Machine Gun",
                "Machine Gunner =best",
                "Machine Gunners, unite!",
                "Machine gunOP",
                "mada fking",
                "MadCroc",
                "MadCroc 1.21mToday",
                "Maddog",
                "mafer  <3<3<3<3<3<3<3<3",
                "mafer bad DX",
                "mafer im sad 3<",
                "mafia",
                "Maga",
                "Magaltyea",
                "magic_cheese",
                "Magikarp",
                "Mago",
                "mahiru",
                "mahiru shiina??",
                "Mahlo Cardinal?",
                "mahluktakkasatmata",
                "mai",
                "MAICK",
                "MAICROFT",
                "maida",
                "maikesito",
                "MaiLotVNN",
                "main menu",
                "Maize",
                "Major Meowzer YT",
                "Make circle with Tri twi",
                "maksim",
                "Maksim",
                "Manager",
                "manager is just better",
                "Mango",
                "ManiaC",
                "Manic|Eraser|Cat110",
                "manne",
                "Manoel Rafael",
                "manoso",
                "Manoso G",
                "Mantra",
                " manu",
                "Marchin Through Georgia",
                "Marco the great",
                "Mardi 1",
                "margaret thatcha",
                "MARK",
                "Marxtu",
                "MARY",
                "Mary",
                "Masher",
                "Master",
                "master",
                "MASTER",
                "Master Noob: Bruhhhhhhhh",
                "Master Noobpet",
                "Master of dying",
                "Mat (Bocow)",
                "ma ta",
                "matao",
                "matatoe",
                "mateo",
                "Maternize",
                "Mateus",
                "matew",
                "mathias",
                "MATHUEL",
                "Math you",
                "MATI",
                "Matias",
                "matias",
                "MATRIX",
                "Matt",
                "MAUS THE LEGEND",
                "Max",
                "max",
                "max",
                "max",
                "mAX",
                "maxi",
                "MAXICHIBROS",
                "Maximaths",
                "MAY BE HAPPEN",
                "May I Fuq You?",
                "maze",
                "Maze",
                "Maze Cops",
                "MazeDominator",
                "maze goblin",
                "maze runner",
                "mcbeef",
                "Mcmaster64",
                "mds",
                "me",
                "ME",
                "Me",
                "me(duh)",
                "Me-arac",
                "me?? 😢",
                "Meashichem",
                "meb",
                "me best",
                "Mebh",
                "mebic",
                "meckazAN",
                "Medeconlyme",
                "Medium tank",
                "Meepet",
                "MeepMweep",
                "Meeps",
                "me fan valt shu lui free",
                "mega",
                "Mega :)",
                "mega monster!",
                "mega monster",
                "MEGA MSC",
                "MEGAPIX",
                "meids",
                "melee is better",
                "Meletiscool/",
                "meliodas",
                "Mellow",
                "MelodicDell",
                "MelodicOloodpor",
                "meme",
                "meme",
                "Mem mem",
                "me noob",
                "me no u(u know me)",
                "MentMedusa",
                "men treibe",
                "Me n You",
                "Men†e∂eem",
                "meo & sup",
                "meow",
                "Mercy",
                "mercy pls",
                "Merdka!",
                "meris",
                "Message: Friendly uwu",
                "messi",
                "MetatronXY",
                "Meti",
                "Mew",
                "Meͥdeͣmͫeήdiήgeή",
                "Meͥภeͣqͫuสles♦️",
                "Meℝaͥ∂lͣyͫקen⚠",
                "mf=r",
                "mf yeezys",
                "MG Post",
                "Mh?",
                "mi(mobile)",
                "mi(moblie)",
                "MICAH",
                "Michael",
                "Michael Jordan",
                "Michel",
                "micsodaaaaaaaaaaa",
                "mie",
                "migel  papi",
                "Miggy?",
                "miguel",
                "miIk",
                "Mikasa Ackerman",
                "MIKE",
                "Mike",
                "MIKKEL ",
                "Milan",
                "milena",
                "Militant",
                "milky will eat your toes",
                "mil leches",
                "Milton Friedman",
                "MilwaspChiliPepper",
                "Min",
                "Mine craft",
                "Minecraft",
                "minecraft",
                "Minecrafter",
                "Mine is Mine",
                "Minerva",
                "Mine says hi fake anak",
                "minh7cvn",
                "Minhaaal",
                "minhhihi",
                "minh vn",
                "mini",
                "Mini",
                "mini boss",
                "mini boss spawner",
                "MINI defender",
                "Minimal",
                "Mini moving safe zone",
                "MiningMiner27",
                "MINI ON A LAPTOP",
                "minty fresh",
                "Minul",
                "Min ye",
                "MJK",
                "MK",
                "mkZZZ",
                "mlk",
                "mm",
                "mmm",
                "Mmmm",
                "mmmmmmmmmmmmmmm",
                "MOAR OCTO TANKS!",
                "Mobile",
                "Mobile Not As GOod",
                "Mobile no work",
                "Mobile player",
                "Mobile player",
                "Mobile sucks",
                "moblie 1.37m siege woo!",
                "ModestEctoormo",
                "mogerath",
                "moises",
                "molkin",
                "mom",
                "mommy long legsq",
                "momo",
                "Mon A",
                "MONDAY",
                "monica",
                "monke",
                "Monsia",
                "MONTER",
                "MookyPorPooh",
                "MOONLIGHT",
                "Moragull is JOHN CENA",
                "morbius",
                "Mort",
                "Mort (pc)",
                "MossfนlthapeᖙyŇ☘",
                "Motar2K",
                "motherhip",
                "Mothership Drone",
                "Mothership Drone",
                "mothership protrector 1",
                "motik_kotik",
                "Mr.Chaos",
                "mr.cola",
                "Mr. Lord",
                "Mr. Porridge",
                "Mr.sod",
                "Mr.Tank",
                "Mr.W",
                "MrBeast",
                "MrBeast Rules",
                "Mr D",
                "Mr KaRbS",
                "Mr King",
                "Mr lord have mercy on me",
                "Mr Shorts",
                "MrYoungSir",
                "ms. cold person",
                "msalqm",
                "MSI",
                "ms tang",
                "Mtp tv tiktoker",
                "Mud Muppet",
                "muhahaha",
                "Multibot",
                "multibxersin2tdm",
                "Mumo",
                "mundo x bomb",
                "Murdock",
                "MURIQI 03",
                "murt",
                "Musa♗ - The Shipwrecker",
                "Mushroom",
                "Music man",
                "Mustafa",
                "MUSTAFA/TR",
                "mustard the rohirrim!",
                "mustfarm",
                "mwmwmwmwmwmwmwmwmmwmwmwm",
                "Mwoon",
                "mwrtql",
                "mwr_csqb",
                "my",
                "My 10th life",
                "my fists...",
                "my guy",
                "MYJ",
                "MYLEFTBALLHURTS",
                "MyLittlePony",
                "My Music:)",
                "MyonlyDestrion",
                "MYRIGHTBALLHURTS",
                "mystery",
                "My struggle",
                "Mythical",
                "Mythical",
                "MØcipParรήip",
                "m̸̐̽ᵃ𝔭ʟₑ౪🌸🎀🌺🌷🩰🧁",
                "m̸̐̽ᵃ𝔭ʟₑ౪🌸🎀🌺🌷🩰🧁",
                "Mสmm☢τhT☢τh☢ldi",
                "mắm tôm",
                "M☢tivͥαtͣiͫngB☢nαtiff",
                "MⱥiήτFunͥτoͣnͫ",
                "Mⱥภumbℝip",
                "N",
                "N05O7G",
                "na",
                "Nafi",
                "naga",
                "Nageron",
                "Nagi",
                "nah i",
                "Nailguns HELP!!!!!!!!!!!",
                "nam",
                "name",
                "nani?",
                "Napoleon",
                "naruto",
                "Naruto",
                "naruto",
                "narutouzumaki",
                "nashe",
                "nat",
                "natasha",
                "nate",
                "Nate",
                "NATH",
                "NATHAN",
                "Nathan_1",
                "NAtZac1424",
                "nayc",
                "naydanang bale!!!!!!! 1m",
                "Naΐgͥΐcͣaͫℓℓef",
                "Na†eℝaŇiŇgs⚠",
                "NB",
                "ndn",
                "necro",
                "Necro",
                "Necromancer",
                "Necromancer Pet",
                "Necromonkey",
                "Necromuncher",
                "necro pet",
                "need protector",
                "neep",
                "nek minet",
                "Nelly",
                "NEMDT playing shmart",
                "NEMDT REEEEEEEEEEEEEEEEE",
                "Neo",
                "Neo",
                "Neonlights",
                "Neonneosh",
                "NEO ROY NEYEAH NAH",
                "neph",
                "Nerblet",
                "Nerd",
                "Nerdy Ball",
                "Nerdy Ball :)",
                "nerf",
                "nerf %t",
                "nerf %t please",
                "Nest Keeper",
                "netherlands",
                "never gonna give u up",
                "NEVER GONNA GIVE YOU UP",
                "never gonna let u down",
                "never gonna let you down",
                "never gonna turn around",
                "New",
                "newae mobile",
                "Newb",
                "new player",
                "Newsletter",
                "new up :D",
                "NEYONSTANK",
                "Neττeຮ℘andaττr",
                "NgocAnVNA",
                "NgontoL",
                "nhan",
                "nhat",
                "nhatbun",
                "nhi015042012",
                "nho",
                "Ni",
                "nice",
                "Nice:))",
                "nice one",
                "Nice~",
                "nicola",
                "nicolas123",
                "nieeieeeeecceeeeeeeeceee",
                "NightFire",
                "niitrooooooooooooooooooo",
                "Nina",
                "Nining",
                "ninja",
                "ninjin",
                "Nintendo Memes",
                "Nirviar",
                "NitroX",
                "Nividimmka",
                "niwa niwa",
                "Njayy",
                "njs",
                "n level up",
                "nm00{",
                "nmnmn",
                "nn",
                "nn0",
                "Nnmnnnmmmnmmmm",
                "nnn",
                "nnnnn",
                "nnnnncaptiann",
                "nnnnnn",
                "nnnnnnn",
                "nnnnnnnnnnn",
                "nnnnnnnnnnnnnnnnnnn nnnn",
                "NNNNNNNNNNNNNNNNNNNNNNNN",
                "nnnnns",
                "nnw'",
                "no",
                "no",
                "No",
                "no-one",
                "no. 9",
                "no ;)",
                "nob",
                "NO BAD WORDS",
                "nobby",
                "NOBDY w",
                "NobleCrafter3219",
                "NobleSkele",
                "Nobody",
                "nobody",
                "NobodyIsReaching500K>:(",
                "nobodynoticedyouweregone",
                "no c-",
                "NoCopyrightSounds",
                "No Disturbing",
                "No doors no fun",
                "NOE BODY",
                "noew",
                "n o i c e",
                "NO IDEA",
                "noir",
                "nokia",
                "nom",
                "no me mates amigos",
                "NO MERCY",
                "nom nomnomonm",
                "NO MORE OVERLORDS!!!!!!!",
                "no mouse",
                "non't",
                "None",
                "No no!",
                "nononononononononononono",
                "noob",
                "noob",
                "Noob",
                "Noob",
                "noob",
                "noob",
                "noob123",
                "Noob AC",
                "Nooblet",
                "noob vn",
                "NOOB VN",
                "Nooby",
                "NOOD --_--",
                "NO ONE",
                "No one",
                "NO ONE",
                "No One",
                "nope",
                "Nope :))",
                "NopeTurtle",
                "no pew and paw here",
                "No Player",
                "no plis",
                "no plz",
                "No pp for u",
                "no pressure",
                "Nora",
                "NORMAL DAY",
                "No Ski||s",
                "NoSpeak",
                "No Surviors",
                "not -_-",
                "notable",
                " not anak",
                "not an easy target",
                "not boster",
                "not Devin real bruh meme",
                "no team Kill",
                "no teem",
                "Nothin",
                "nothing",
                " nothing",
                "Nothing",
                "nothing's",
                "Nothing.",
                "Nothing here",
                "Nothing overlord",
                "Nothing to lose Tank",
                "NO TIMMING",
                "notlazar",
                "not onyxd",
                "not P",
                "notPickle",
                "not pro",
                "notsudon",
                "NotThebest",
                "not the guy you just saw",
                "not  tifo",
                "no u",
                "NoU",
                "NO U",
                "Nova",
                "nova",
                "November",
                "novice",
                "no vn",
                "Nowerstope",
                "NO WITCH-HUNTING",
                "NowSnookie",
                "NO your mom",
                "NoͥteͣwͫoℝthyCสtHeสt",
                "Noωαselli",
                "np",
                "nreferif",
                "ns",
                "n to level up",
                "nub7155 (Mobile)",
                "NucelAR",
                "nuiw",
                "NUKE H",
                "Numb The Pain",
                "Nv Proxy",
                "Nxoh",
                "nyac",
                "NYADRA'ZATHA",
                "Nya~",
                "nya~~",
                "Nyroca",
                "nzhtl1477777777",
                "N𐍉ᴍbec𐍉ήts✨",
                "o",
                "o.o",
                "oa",
                "OAO",
                "oath sign",
                "obed",
                "OBL",
                "oblitereight 1000 ms",
                "ObservantLarbsedi",
                "obyness",
                "Octavius",
                "octavo",
                "odin <:)20",
                "odo",
                "odszdc",
                "o farinha SUS",
                "Oferbelogr",
                "Ofewposicu",
                "Offeckert",
                "Offermang",
                "OffeรeรSugαrͥᖘuͣfͫf♛",
                "OfficeboyFillan",
                "OffingeCoffy",
                "Offᖙ🅰𝔶botᴳᵒ",
                "OFN tank",
                "OfteOfficeboy",
                "Ofteᖙucee︾",
                "Ofͥerͣsͫやr𐍉fess𐍉r",
                "OfͥfeͣcͫelŦec†𐍉",
                "OfͥfeͣcͫKΐck𐍉ff",
                "Ofͥfeͣdͫg๖ۣۜßαllØfFαt❥",
                "Ofͥteͣdͫΐe฿edbeⱥuty",
                "Ofͥ†eͣnͫcheye",
                "Ofτeᖙบree",
                "Oh",
                "oh, dear",
                "oh im noob",
                "Oh no Pathetic",
                "Oi",
                "ok",
                "Ok, Boomer",
                "O K A Y ( ^ 3 ^ )",
                "ok boomer",
                "okey",
                "ok fine",
                "ok i pull up",
                "ok la :)",
                "ok so...",
                "Ok Ur Done.",
                "Ok Ur Done. Again",
                "OL Impossible On Mobile",
                "Olivia",
                "OliwierQ Chojnacki",
                "omni",
                "om nom nom",
                "on de xd",
                "OndoingDomino",
                "One.",
                "one floofy boi",
                "One Floofy Boi",
                "one of the newbies",
                "one of the players",
                "One of your pets",
                "one piece",
                "ONE SHOT",
                "Oni-chan UwU",
                "oni-chan~?",
                "Only 1 Factory Can Stand",
                "On Mobile",
                "On mobile",
                "OnovonO",
                "Onquentabliate",
                "onsen",
                "On the day you left me",
                "Onyx",
                "Onyx, The Fall of Hero's",
                "oo",
                "oof",
                "oof",
                "Oof",
                "oofania",
                "Oofed",
                "oofoomode",
                "oo i m friend",
                "oompa loompa",
                "oooo",
                "ooooohhhhhhhhhhhhhhhhhhh",
                "o o o o o o o o",
                "OOOOOOOOFfffffffffffffff",
                "oooooooooo",
                "ooooooooooooiygf,fss';",
                "OOOOOOOOOOOOOOOOOOOOOOOF",
                "oooooooooooooooooooooooo",
                "oopsie",
                "oop zeros",
                "Op",
                "op",
                "OP",
                "Opan Come Go Note Yeah",
                "Opan Come Go Note Yeah",
                "opp",
                "Ops...",
                "OptimisticPtinknew",
                "Optimus Prime",
                "op xd",
                "OPㅤㅤVICENZO√",
                "orange",
                "OrangeCat",
                "ORA ORA ORA",
                "Orca",
                "oreo",
                "Orn20",
                "orphan destroyer",
                "OrryᎥeรᎥ๏",
                "Orxan487",
                "Orͥ∂sͣmͫนcessน⚔",
                "Oscar",
                "OSJJSJ",
                "osuer",
                "Oswald Veblen",
                "OTD",
                "OTTOMAN EMPİRE",
                "oty",
                "Ot☢☢sℓคwคℓtede",
                "Ouake",
                "oui oui",
                "Our World of Tanks",
                "OutitiTooti",
                "Out of the Dark",
                "outrun my gun",
                "Ovalsun",
                "over",
                "over 'GOD'",
                "OverBrain",
                "Overdrive",
                "OverGod",
                "Overload King",
                " OVERLORD HEROBRINE",
                "overlord is:):)",
                "overlord king x",
                "overlord takeover",
                "Override",
                "overused is overused",
                "Overused Vibes",
                "ovMasted",
                "OWO",
                "OwO",
                "OwO",
                "owo",
                "Oxylit",
                "OXZ",
                "Ozymandias",
                "O_O",
                "Oᶠectบสlsereedl",
                "Oⁿeรsitedit⚠",
                "P",
                "p",
                "P-Nice",
                "p1",
                "pablo",
                "Pablo",
                "pacific islander",
                "pacifist cant help sry",
                "packy",
                "Paideliti",
                "pain",
                "Paladin",
                "Paladin",
                "Paladin",
                "Paladin-Celestial",
                "pancake",
                "Panda <3 FFA",
                "PandaNa",
                "Pandrian.",
                "Pango",
                "Panther",
                "Panz3r of the Lake",
                "Panzer",
                "Panzerfaust",
                "Panzershreck",
                "panzershreck",
                "PANZER VIII MAUS",
                "Papa",
                "PARA",
                "Paradisal",
                "Paradox",
                "partially illiterate",
                "Partisan",
                "Party_CZE",
                "Partℽ𝓌𝔥ᎥꜱᎥภ∂บc",
                "Parzival",
                "PassionateLasiste",
                "pastry king",
                "Pat",
                "patata",
                "Pato Lime",
                "Patterns",
                "Paw Patrol",
                "PaX|A1ma|YT",
                "PB123",
                "pc",
                "pe11",
                "peace :D",
                "Peace and Unity",
                "Peace Dog",
                "Peaceful",
                "peaceful farmer",
                "PeaceKeeper",
                "Peacekeeper",
                "peace_farm",
                "peasant",
                "pedro :(",
                "Pega(SUS)",
                "PEGA(SUS)",
                "penguinz0",
                "pentagon clean-up",
                "Pentagon Nest Miner",
                "pentagon protector",
                "Pentagon protector",
                "PeNtaLOL",
                "Penta takeover",
                "pe players be like:",
                "Peraddiesphic",
                "percy",
                "PerfectWeregife",
                "perra el que me mate",
                "Person",
                "PERU",
                "pesca",
                "pescah",
                "PEST_YT",
                "Pet",
                "pet",
                "pet",
                "Pet",
                "pet",
                "pet %t",
                "pet(XD)",
                "pet :3",
                "Pet :3",
                "Pet :3",
                "Pet :D",
                "pet basic -(======>",
                "Pet bird (eat triangles)",
                "pet brick",
                "Peter",
                "peter",
                "pet lvl 30",
                "Petsalt VN :)",
                "Pet tank",
                "pet XD",
                "Pew!",
                "Pew",
                "PewPew",
                "Pewpew",
                "pew pew Gun",
                "Pew Pew Pew",
                "PeℝfectIteήeℝ⚔",
                "PFC|| KEVYNZ",
                "PH",
                "PH - r҉a҉i҉n҉",
                "phantanduy",
                "phantantri",
                "Phat",
                "pheo",
                "phi",
                "phil",
                "Phoenix_Gamer",
                "phong",
                "Phong",
                "phong fan vn!",
                "Phoodyeang",
                "PHRENTINO",
                "Phycron",
                "Phystudeat",
                "PH|Player!",
                "Pickerel Frog",
                "piece treaty with newbie",
                "Pieceℓᴮøøkie🌺",
                "pierre",
                "piffermon",
                "pighati",
                "pika :P",
                "pikachuboi124",
                "Pikachu ^~^",
                "Pilav",
                " pimp <3",
                "PineapplEJuice",
                "pin h 3",
                "pinkie pie",
                "Pixeljumper",
                "Pizza",
                "Pizza Bread",
                "PJfd13",
                "Pkao",
                "Planet",
                "Planetoid",
                "play",
                "PLAYER",
                "Player",
                "Player 1",
                "player 8483",
                "playeur",
                "playing from month",
                "Play wommy-arras.io",
                "PlaภtøƤee",
                "Please no more Y team",
                "PLL",
                "plplpl",
                "pls Im friendly :)",
                "PLSSSSS FA",
                "plungebob",
                "plus points",
                " pluss亗",
                "PM4037",
                "Pobbrose",
                "Pock",
                "Pog",
                "pokemon",
                "poker 567",
                "Pokey thingy",
                "Polandbanner oo",
                "police",
                "Police Divo <3 XD",
                "Pollo",
                "poly :/",
                "polyagon",
                "poly gone :D",
                "Polyhex",
                "poo",
                "poo face",
                "Pop",
                "popa peg",
                "poper",
                "Popo",
                "popoi",
                "poppy",
                "porfavor vengan",
                "porfavor venganxcadddddd",
                "Pork",
                "porscheHUB",
                "PORT",
                "Portaun",
                "Poseidon",
                "PositiveNovermal",
                "POU 2",
                "poui",
                "pounder",
                "POUNDER UPGRADER",
                "Pounder | aaaaaaaaaa",
                "Pounder | pain.",
                "pov:u need 5 prot for 1m",
                "power",
                "PowerPoint",
                "poyo",
                "poyo poyo",
                "pp",
                "PPANG",
                "PPguy",
                "ppoppoppo",
                "Ppp",
                "PPPIIIGGG",
                "PP Tank",
                "praca",
                "Pray for Ukrainian ppl",
                "Praying for Winter",
                "prb",
                "Predator Army",
                "Prees N",
                "Preku",
                "Press C+E: Octotank",
                "press F",
                "press N",
                "press n",
                "press n = score",
                "press n to level up",
                "press n to level up",
                "PressNToLevelUp",
                "press n to levle up",
                "press t",
                "press u",
                "PretendToBeANoob",
                "PrettyProessi",
                "Prime Chalicocerate - hu",
                "primos bros proo",
                "PrincenHitchen",
                "Prm",
                "Pro",
                " PRO",
                "PRO",
                "pro",
                "PRO123123123123123123123",
                "ProbseVinDiesel",
                "pro cart pusher",
                "PRODIGGY",
                "PROFIN 1000",
                "PROFIN try's 1m scores",
                "ProgetcBucket",
                "Prograde",
                "pro is nood",
                "pRo LiFe",
                "Promax",
                "proo..",
                "proo...",
                "Pro of ............",
                "PROOO",
                "pro player",
                "protec me pls",
                "Protect",
                "protected",
                "protecter crocty",
                "protecter_of_free",
                "Protect me",
                "protect me for 1m maby",
                "protectn",
                "Protector",
                "Protector Of Worlds",
                "protect perfert heha gon",
                "protectsage",
                "Providence",
                "pro vn",
                "pro_noob",
                "Psychic",
                "PSYCHO",
                "PT5 | 03-04",
                "PT5 | Tezerr",
                "pulp",
                "Pulter",
                "PUNSIHMENT",
                "pup",
                "PUPTO",
                "PuringiTinyBoo",
                "Purple",
                "Purple2",
                "PUSH ME",
                "Push me for barrier",
                "pushmetothe sancuary",
                "put Factory",
                "putre",
                "PvPok",
                "pvto si lo lees",
                "pwease?",
                "pwease lemme get 1m :D",
                "Pyrolysis",
                "PYTHON",
                "PђeαlαHitcђeภ",
                "PℝocͥRoͣbͫotobαmα",
                "PℝoͥfuͣsͫeOftsΐ",
                "q",
                "Q",
                "Q",
                "q00000",
                "Q8238q",
                "Q Checked These Names",
                "QER",
                "Qin",
                "Q is Awesome.",
                "qoh",
                "qp",
                "Qpling",
                "QQQ",
                "qqqqqqqqqqqqqqqqqqqqqqqq",
                "qqwqe",
                "Qscxz5",
                "quandle dingle",
                "quang",
                "quant2345677",
                "Quebec",
                "Queen",
                "QUESO Y TORTILLA",
                "Quest",
                "queue",
                "qusimocho",
                "qwe",
                "QWEr",
                "qwerty",
                "Qwerty",
                "QWERTY",
                "qwertyqwerty",
                "qwertyuiop",
                "Q_us",
                "q__o__h",
                "R",
                "R",
                "raaaaaaaaaaaaaaaaaaaaa",
                "race",
                "RACE",
                "race me!!!!!!!!!!!!!!!!!",
                "race me?=Support <3 Bop!",
                "race with me!",
                "Racing?",
                "Radiant",
                "rae",
                "Rafael",
                "Raganrok",
                "Ragnarok",
                "Ragnarok-eternal",
                "RAHAN",
                "Raid",
                "Railgun",
                "Railroad",
                "rain and fezti",
                "Rainbow",
                "rainbowmonochrome",
                "raindog",
                "Rainforest",
                "Rake",
                "Raknar",
                "raku",
                "ralsei with a BLUNT",
                "Ramen",
                "Random Guy",
                "Randomness",
                "Random Tank",
                "random tank",
                "raoof",
                "Raoof",
                "raoofOverlords for noobs",
                "RAPTURE",
                "Rare",
                "rat",
                "RATA INSANA :3",
                "RATATATATATATATATATATA",
                "Raul39",
                "Raul39",
                "Raul39",
                "RavenXL",
                "ravi",
                "Raymond bince",
                "Ray of doom!!!!!!!!!!!!!",
                "rays",
                "rayyan",
                "razenezyou",
                "rdagonfruit icy",
                "Rd h",
                "ReacPokerface",
                "read and u gay",
                "Ready For Another?",
                "Real AI",
                "Real CreepyDaPolyplanet",
                "Real CX",
                "Real Dark Knight",
                "Real Despacit.io",
                "Real Hellcat",
                "Real Kitty!",
                "Really:D",
                "Reaper",
                "reaper of souls",
                "Reb",
                "RectProject",
                "Rec†scess",
                "redhood",
                "Red Hot Chili Pepper",
                "Red is best",
                "Red Just Bled",
                "redrealm",
                "red sun in the sky",
                "REEEEEEE",
                "reeeeeeee",
                "reeeeeeee",
                "Re Fachero",
                "Reflection",
                "Reflex",
                "RegralPlegasus",
                "rei",
                "reicardo avocasde",
                "ReignOfTerror",
                "Relatively Harmless Tonk",
                "Relosa",
                "Remuru Tempest",
                "RENFORCEMENCE",
                "RENGAR!!!",
                "ResoluteAntardso",
                "Respect",
                "respect women",
                "Rest",
                "rest area",
                "retard",
                "retnuH",
                "Revenge",
                "REVENGE",
                "revenge:(",
                "REVEnGE__+=!!!!!!!!!!!!!",
                "REVENGE✨",
                "REVIVAL:",
                "Reͥivͣiͫ๖ۣۜᗯeiner",
                "ReήsecoEnglishRose",
                "rf",
                "Rice",
                "ricegrain",
                "Rick Astley",
                "rick astley",
                "Rico",
                "Ricsae",
                "rid",
                "ridah",
                "ridge",
                "rigeeS",
                "Rigged",
                "Rilαtoℝyᴍ⚔",
                "RISK RISK RISK RISK RISK",
                "rIsKy",
                "RJ",
                "Rk",
                "R M",
                "road to 1m",
                "Road To 10m",
                "Roaster and Toaster",
                "roberto",
                "Roberto",
                "Robleis",
                "robococ",
                "robo cop",
                "Rock",
                "rocket",
                "Rocket shooter",
                "Rockety",
                "rococdc",
                "Roger",
                "Roly poly player",
                "Romeo",
                "Rompleseral",
                "Rongomatane",
                "Ron_scratch",
                "Roomb 2.0",
                "Roomba 2.0",
                "Root",
                "ropell",
                "RopeSteel",
                "Roronoa Zoro +++",
                "Rose",
                "Rosenrotteneggs",
                "Rosetta Stoned",
                "Roskarya",
                "rotten punk",
                "rowan",
                "Roy",
                "royce",
                "RP",
                "rp - on mobile",
                "RPs",
                "Rrennitten",
                "RRO",
                "rrrrrrr",
                "rsg23",
                "RSN",
                "rsn.",
                "rt",
                "rtt",
                "Ruan=_= ",
                "Rubrub",
                "rubyslime",
                "r u dangewus",
                "rule.txt",
                "ruler of tanks",
                "run",
                "run.",
                "run  {ANGRY}",
                "rush",
                "Rusher",
                "russia",
                "Russo-Baltique Vodka",
                "Rust",
                "Rusty",
                "Ruthless",
                "Ruwen",
                "rwegwerg",
                " ryh'lrfh",
                "ryheghjt",
                "Rykav",
                "Ryland",
                "Ryuu",
                "ryuuddddddd",
                "ryuudddddddddwdw",
                "ryy",
                "RİKKET FAN",
                "Rᴇsp☢ήsΐvᴇC☢ήsi",
                "RⱥsƤberrψ๖ۣۜ山heriesi",
                "RⱥyRⱥyDisђirⱥƤ",
                "S",
                "S. Liza Yt",
                "s7ㅋㅋㅋ",
                "S8NF-EB3J-FHEI-N264BR3KJ",
                "S45vn steel op",
                "sa",
                "sacapak",
                "sad",
                "sadf",
                "sael savage",
                "SAENG",
                "saffy",
                "SAGAGH",
                "sage",
                "saibou",
                "Saika",
                "Saika/Na2/500ms+",
                "SairaciElais",
                "saitan",
                "Saking",
                "Salsa Verde",
                "Salt",
                "salty",
                "sandbox",
                "Sandwich",
                "sanesytp",
                "sang",
                "sanggggggg",
                "sanic",
                "Sans",
                "SANS",
                " sans",
                "sans pro",
                "sant the sant the sant t",
                "Sara",
                "SAS",
                "Sas",
                "sasukeuchiha",
                "satan",
                "Saturn",
                "Savage xD discord?",
                "Save The J'S",
                "say cheese",
                "Says Overlord in Green",
                "Scarlet Rage(mobile)",
                "schrodinger = loser",
                "Schwerer Gustav",
                "ScieήtificPสti",
                "Scoped",
                "scortt reach 1m friend",
                "ScoutTF2",
                "Scratch",
                "ScratchyScra",
                "screw",
                "Scrub Exterminator >:D",
                "scx",
                "sd",
                "SDASD",
                "sdasda",
                "sdasdsssssssssssssssssss",
                "sdddd",
                "sdsd",
                "Se",
                "Sean",
                "Sea urchin",
                "Seb",
                "seb",
                "SEBASTIAN",
                "SEBASTIAN.",
                "secks",
                "sedat emir",
                "SedoFirebred",
                "seensan",
                "Seer",
                "seesaw",
                "segurity 2",
                "Sei",
                "Seig",
                "Sei GF:3",
                "Senator Armstrong",
                "senbonzakura kageyoshi",
                "Senseless",
                "SensibleAlsem",
                "Sensor",
                "senti <3",
                "sentry",
                "Sentry :3",
                "sentry strats",
                "seperate",
                "SERIES 113 JAPAN",
                "ServentOfDeath",
                "server",
                "Sev",
                "seve",
                "Se∂iͥรhͣiͫmส∂",
                "Se∂iสCสucสsiสŇ",
                "sfdgfsgsfg",
                "sg",
                "sg ez",
                "sghhgsfhgsfghsffhshg",
                "Shadow",
                "shadow",
                "Shadow closer",
                "shame",
                "Shankerith",
                "SHARK",
                "shark",
                "shark bait",
                "SharkBuger$",
                "Shay",
                "sheeeesh",
                "Sheep",
                "Sheeps",
                "sheesh",
                "sheild",
                "shheshhh",
                "Shhh!",
                "shhhhhhhhhhhhhhheeeeeesh",
                "Shide",
                "shield",
                "Shields and Guns",
                "Shiny Beta Pentagon!?!?!",
                "ShinyG",
                "Shiny Triangle!?!?!?!?!?",
                "Shitislonesp",
                "Sh l",
                "Shoot double",
                "Shoot gun pls join",
                "shuna no 6m",
                "shuna wakuwaku",
                "shush cat",
                "shutgun",
                "Sh | cc_",
                "Sh |             _",
                "ShⱥŇdΐDΐŇyͥerͣoͫ❥",
                "Si",
                "Sidewinder-firebolt",
                "SIEGE  lhaahahahahahah",
                "Siege weapon",
                "Sierra",
                "silent",
                "SILIKA",
                "SillyPantalones",
                "silvally 1v1 me pls",
                "simba",
                "sin",
                "Sin (watch my videos).",
                " Sinbadx",
                "sinbadx",
                "SINBADX",
                "Sinbadx",
                "Sinbadx",
                "sinbadzx :)))))",
                "since 1986",
                "SincereAnce",
                "sindBax",
                "Sinx",
                "Sinx",
                "sinx",
                "sinx (fk demon)",
                "sinx7",
                "sir bobybop",
                "Siren",
                "SIREN HEAD",
                "SIRENHEADYTs lost pet",
                "sire soral",
                "Sir Theodore",
                "sit",
                "SIUUU",
                "SIUUUUUUUUUUUUUU",
                "SIUUUUUUUUUUUUUUUUUUUUUU",
                "sj",
                "sjw",
                "Skawich",
                "skitlies",
                "skrill",
                "Skull",
                "skull emoji",
                "SkuTsu\t",
                "Sky",
                "Sky_Good",
                "Slayer",
                "Sleak Override",
                "Sleeping Quadrilith",
                "slow but friendly",
                "SlowKnife",
                "slowpoke",
                "SmokeyMorsiall",
                "Snap ( Peace)",
                "snaper",
                "Snapwingfriendstriker007",
                "Snapwingfriendstriker007",
                "Sneaky annileatter",
                "snorp",
                "Snow",
                "soccer",
                "Soccer",
                "Social Experiment Part 1",
                "sodbazar",
                "SOFIA",
                "SoftOffel",
                "SoftyOffee",
                "Solar Fighter",
                "Solaris",
                "Sol Blaze",
                "Sollℽstriongst",
                "solo1 -1",
                "solo 1v1!!!!!",
                "Solo :>",
                "SOLO AGO MI TRABAJO",
                "Solomon",
                "solo vs 3",
                "somebody",
                "SomentsSoul",
                "SOMEONE",
                "Someone",
                "SOMEONE",
                "some random oreo",
                "sonic",
                "SONIC.EXE",
                "Sonic.EXE",
                "SONIC GO FAST!!!!!!!!!!!",
                "sonick12",
                "sonofgrits",
                "SOOOOKA",
                "sophia :)",
                "Sorry!",
                "Sorry",
                "SORRY..I'M..(vn)im so :(",
                "Sorry broh",
                "sorry Cheese",
                "sorry sorry",
                "Soulless",
                "Soundwave",
                "Souper?",
                "Soviet Union",
                "Soviet Union",
                "soy noob :,(",
                "soy sauce",
                "soy susanaoria",
                "space",
                "Space",
                "Spade",
                "spadzz",
                "spankthemonkey",
                "SPAS-12",
                "Spawner > Factory",
                "SPAXDE",
                "spayer time",
                "Spectactor",
                "Spectator",
                "Spectator (dont attack)",
                "Spectator:)",
                "Sped demon",
                "speed",
                "Speed",
                "Speed Build",
                "Speedrun",
                "speedrun",
                "Speeedrun 200k plss",
                "SPEEEEEEEED",
                "spencer",
                "SPICY RAMEN",
                "spider .,,.",
                "Spider cochon",
                "SPILKE",
                "SPILL THE BEANS BRO",
                "Spin = Free Protector",
                "spin=friend",
                "spin = friends",
                "Spin=peace",
                "spin= team",
                "Spin=Team",
                "Spin=Team",
                "Spin=Team",
                "spinnnn",
                "spirit of the forest",
                "spitandsteelfriend",
                "Sppooky",
                "Spree",
                "Spring Bonnie",
                "sprotto",
                "sqrt_-1",
                "Square generator",
                "squirt",
                "Sr. GT",
                "Sry had to go afk",
                "Sry m8",
                "ssad",
                "ssd",
                "ssdd",
                "sss",
                "SSS",
                "ssss",
                "sssss",
                "Sssssssssssss",
                "sssssssssssssssssssola",
                "sssssssssssssuuuuuussss",
                "ssssssssusssssssssssssss",
                "Ssunseer",
                "stacked",
                "stalker",
                "Stalker Army",
                "Stalk Is Actual Pain",
                "Stand For Ukraine",
                "Star",
                "Star Ender",
                "stares into ur soul",
                "star kirby",
                "starlight!thunder!",
                "Starlight",
                "STARLIGHT",
                "starmie",
                "starwarrior",
                "starwarrior",
                "stay all over me",
                "Stealth Jet Delta",
                "Stealth Tank Delta (STD)",
                "steeg",
                "stegosaurus",
                "Steve",
                "Steve",
                "Steven Universe",
                "StevenUniverseFan",
                "stfutduy",
                "stink",
                "stinky/ gg jax!",
                "Stocxk_",
                "stone",
                "STOP",
                "stop me turn to stone",
                "stop plz",
                "Storm",
                "Storm King",
                "StormX",
                "STPSPMMNGSNPR 64M3R_999",
                "STRIKER007",
                "strong tank",
                "Stuck",
                "study yo orgo (chem)",
                "stuff",
                "StUfFy_ChEeZe",
                "Stupid Overlord",
                "StͥedͣiͫรDilrubⱥ",
                "StͥunͣnͫingAndin",
                "Suallizatiᴍe",
                "Sub 2 Pewdiepie",
                "subin",
                "SublimeItsubi",
                " sub to",
                "Sucko mode",
                "Sudu",
                "sudu",
                "suffer",
                "summoner",
                "summoner2",
                "Summoner boss",
                "sumoga",
                "SUN",
                "sunkee",
                "Suomi",
                "Sup",
                "Sup :)",
                "super",
                "S u p e r",
                "super booster",
                "Superchad factory",
                "super idoi",
                "superium.",
                "superman",
                "supernintendo meme",
                "super perfect hexagon",
                "super pro prot 4 you",
                "super shock",
                "Super Sonic",
                "super stinker",
                "super tank",
                "supperlenny123",
                "Support",
                "support tank",
                "supraaaaaaaaaaaaaaaaaaaa",
                "supreme",
                "SUPRISE",
                "SUPSPRIES!!!",
                "Supsup",
                "sure sure sure",
                "surprise",
                "Surprise Surprise",
                "Survivalist",
                "sus",
                "SUS",
                "sus.",
                "Susana Oria",
                "sus destroyer",
                "susicoi",
                "Suzanne",
                "SuթerBoℽAvetℽթe",
                "sven",
                "Sven.",
                "sven drop",
                "SWAT",
                "swimsuit",
                "Swohmee",
                "Swohmee: HowDidIDoThat!?",
                "Swooper",
                "swrmur op",
                "swwsH",
                "Synth",
                "Syringe",
                "syron!!!",
                "SYSTEM",
                "Szymon",
                "Sµccessfµ͢͢͢𝖑Toccesse",
                "Sτiᵛeʀmin〽️",
                "Sקityℝicђe",
                "S๏ñcͥifͣeͫ͢͢͢Mนñchie🎤",
                "Sᴋ᭄Sᴀʙɪʀᴮᴼˢˢ",
                "Sᴋ᭄Sᴀʙɪʀᴮᴼˢˢ",
                "Sᴋ᭄Sᴀʙɪʀᴮᴼˢˢ",
                "S℘iяiᵗe∂Pie🅽t💦",
                "SⱥτBigPØτⱥτØ✪",
                "S𝒽ⁱlⁱŇgบre",
                "T",
                "t",
                "T-Chan 13",
                "T-Gay",
                "T-REX",
                "t-rex vs raptor",
                "t-series succs",
                "T-T",
                "t. food bc why",
                "t. green is glitch",
                "T.Khang",
                "t. this green is glitch",
                "t143",
                "taal volcano",
                "Taboo",
                "taco",
                "taem?",
                "Taha and Sardar",
                "TailQZ",
                "Tailred",
                "TAIWAN protector",
                "TaKE LOl :D",
                "TaKE LOl EPIC auto 4",
                "TaKE LOl EPIC factory",
                "TaKE LOl EPIC machinegun",
                "TaKE LOl god shoot",
                "Takeover",
                "take this L",
                "take your time",
                "Taklao",
                "Tal",
                "tale",
                "Tale",
                "TaleήtedEήtiรa⚔",
                "TallStop",
                "Tango",
                "Tango",
                "TANK",
                "TankTankTankTankTank",
                "Tanky",
                "Tanky's 30th 1mil?",
                "tanvik",
                "TargetLocked",
                "tar tar teha tar sal-t",
                "TaserBlazer",
                "TATICAL NUKE INCOMING!!!",
                "Tattletale",
                "tatut h",
                "TBB",
                "TCO (The Chosen One)",
                "td",
                "Te",
                "teach me",
                "Team",
                "team ?",
                "team??!",
                "Team Boom",
                "teamplz",
                "team plz:(",
                "TEAM POLICE",
                "team protect",
                "technically octo tank",
                "TechnoBlade",
                "Tedd",
                "Teddybear",
                "Tembito",
                "Tengen Uzui",
                "tenk",
                "tennis",
                "Tenth Circle",
                "Tenzo",
                "TEQUILA!",
                "TERA BAAP✿AYA★💓Bhagwanmr noob",
                "Tesea",
                "TEST",
                "Test",
                "TeSt",
                "testbed B",
                "teste",
                "Tester",
                "Tester BT",
                "test septa",
                "Teuge",
                "Tezer",
                "TF2 Heavy",
                "Tgvy",
                "Thai dark",
                "Thalasin OH GOD HELP NO",
                "Thanks M8",
                "Thank you",
                "That Guy",
                "That Guyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
                "That_Thing",
                "ThaͥŇkͣfͫulChaℝᴍis",
                "THE",
                "the 501st",
                "the all seeing eye",
                "thearch.hmmmm it lurks",
                "thearchy",
                "The Audacity of this tank",
                "TheBasil",
                "The Beast",
                "the beep !!!",
                "The Beep 3",
                "The beep  duo",
                "The Beep MAD>:(",
                "thebestofthebest",
                "the  best PEOPLE IN THE",
                "THEBESTPLAYER",
                "The Best Player",
                "The Big One",
                "THE BIG ONE",
                "The Boop",
                "The Bron Jame",
                "theCityCR",
                "The cLe@nER",
                "The Comeback of 0800",
                "The Common Cold",
                "The Covenant",
                "The death",
                "the deep",
                "The Destroyer",
                "the drones do not hurt",
                "THe Emperor",
                "The End!",
                "THE FAT RAT",
                "TheFatRat",
                "The Fire Club",
                "The Flu",
                "the general lee",
                "The General Lee 01",
                "The Ghost",
                "THE GOD!++",
                "tHE great king",
                "The Grudge",
                "The gun on the wall!!!",
                "the guy",
                "TheHero383",
                "The Hybrid",
                "THEIA CELESTIAL RULE 34",
                "The Immune System",
                "The Influence",
                "the j",
                "THE King",
                "The King",
                "The leader",
                "THE LEADER GOES OUTSIDE?",
                "the legend hero",
                "The Light",
                "THE LOADROJOZ",
                "TheMadLad",
                "TheMadLad dylan strats",
                "The Mandalorian",
                "The Mind Flayer",
                "The N2R",
                "The Nameless",
                "THE NEW BOSS",
                "the new era",
                "Theo",
                "The One",
                "the only one",
                "Theory of Everything",
                "The Palidin Tank",
                "The Patient",
                "THE PHONG",
                "The Pot",
                "the protector",
                "the quiet kid",
                "The Ranger",
                "there",
                "theres so much sercets",
                "the return of chewy pie",
                "The Robot Kid",
                "the ruler of eveything",
                "The shadow of none",
                "the sky",
                "The Sliding Door Com",
                "THE SUN IS BURSTING",
                "The Tale Of Tanks",
                "The Tanky",
                "THE TERMINATOR",
                "the things we do to surv",
                "The Truth Untold",
                "the ultimate multitool",
                "The Underspeeder",
                "The Unknown",
                "the UNTIMATE DESTROYERb",
                "The Void",
                "THE WORLD!",
                "The _________",
                "TheͥℝvͣeͫᖙS†aℝveᖙ",
                "thiago",
                "thicc",
                "thick",
                "thien5011",
                "thingy",
                "thinh",
                "Thinh",
                "This",
                "This is a Laser tank",
                "This is far",
                "THIS IS INSANE!",
                "Thisislie",
                "This Is Nobody",
                "this is the tale of",
                "This is the tale of:",
                "This is the tale of a",
                "This is the tale off",
                "This is the tale of FFA",
                "This is the tale of Me",
                "This is the tale ofn",
                "This is the tale of you",
                "THOMAS crowded saturado",
                "thomas tank engine meme",
                "Thor 4/10 :(((((",
                "threuagnduirx 1234567890",
                "Thriller",
                "Through the Rain",
                "THUGGER",
                "Thunder",
                "Thunder(Tapenty)",
                "thx ",
                "Tia",
                "Tickflung",
                "TIE/IN",
                "TienBach",
                "tiky",
                "tiler bolck man 456",
                "tilvlad",
                "Tim",
                "tim",
                "time too tryhard",
                "timi po",
                "TImmy",
                "Timmy, do your homework!",
                "Tin",
                "tinh vn",
                "Tiny",
                "Tiny Celestel",
                "tiny ones my friends",
                "tjplayz",
                "tkdarkdomain",
                "Tki",
                "tmi 88>:?",
                "tntman",
                "Toast",
                "ToastyImpaspen",
                "To Bee Keep",
                "TOBI MARCH",
                "today is christmas",
                "toeless_monkey",
                "TOGESH",
                "TOGESH TOGESH",
                "toilet destroyer jordan",
                "tokar6",
                "tomas",
                "TomaToh",
                "Tomi",
                "Tommy",
                "Tommy Gun",
                "tomnguha123",
                "TON | 618",
                "too fast dident even get",
                "toon",
                "Toopy&Binoo",
                "toothpaste",
                "top",
                "top 1",
                "top 1000s",
                "top mozis xd",
                "TOP X",
                "TorClaymore",
                "Tormaภτmerΐcaภg",
                "torry",
                "Totally Not A Bot",
                "totie",
                "TOUCAN",
                "Touriat",
                "TOXIC",
                "Toxic",
                "Toxic sugar",
                "TR",
                "train",
                "tran duc hieu",
                "TR Angela",
                "Trans Rights",
                "TRASH",
                "Trash Anni",
                "trashmxnn",
                "trboo",
                "trbo trbo trbo",
                "tre",
                "tree",
                "tree'lean",
                "trees",
                "TreαNeαt𐍉",
                "trfhgyjhuiju8765t",
                "tri-angle is paccific",
                "Triad",
                "Tri Angel-Booster",
                "triangle drones = nolife",
                "Triangle Gang",
                "tribe",
                "Tricky",
                "Trinity",
                "Tristan",
                "tr ndxd",
                "troll",
                "Troll",
                "Troller",
                "Trolling Me :(",
                "Truchenco",
                "trump",
                "truper",
                "trust me",
                "trust me do this",
                "Trutch",
                "try harder",
                "tryhard mode on !!!!!!!",
                "trying for world record",
                "trying out factory",
                "Trying to be peaceful",
                "try me",
                "TryMe:360NoScope",
                "TryMe: DodgeBot2.0",
                "Try Thalasin Today!",
                "Trͥitͣeͫ丹ภtຮeภtr",
                "TS/RRRR",
                "Tt",
                "TTCBernard",
                "ttjjl",
                "TTroll",
                "TTroll_NEW MOUSE",
                "ttttaaa",
                "tttttttttttttttttttttttt",
                "tuan",
                "Tubby",
                "Tundra cat",
                "Tunnel Wanderer",
                "turaco",
                "turbo",
                "turbo bro",
                "turbo bros",
                "Turbo Bros",
                "Turbo Valtryek",
                "TURK",
                "Turkey",
                "T U R R E T",
                "Turret",
                "Turret LV 1",
                "turtle",
                "Turt Talks to Much.",
                "turu",
                "TU VIEJA",
                "TV",
                "TvT{ Thanh }TvT",
                "twan",
                "twilight",
                "T   W   I   N",
                "Twin-Twin",
                "Twin Pro 3/3/4/7/7/7/7/4",
                "twotales",
                "TYRONE GONZALEZ",
                "Tyson",
                "tyty",
                "T^2",
                "Türk'ün Gücü Adına🌸 OwO",
                "Türk  polisi",
                "TΐrelessToήdessΐ",
                "TωorᴍaͥHoͣrͫnet",
                "TสiͥsiͣgͫerƤsץmend☘",
                "T๏iͥndͣeͫLⱥcewing",
                "u",
                "U.A",
                "U2882JHS",
                "ubad",
                "UBER_TANK",
                "udhe7f",
                "Ugly Beautifulness",
                "ugok",
                "uh",
                "UHF",
                "UHS23",
                "Uh what",
                "uhyi",
                "uirouri",
                "ulan",
                "UldfuBaldman",
                "Ultimate Dominator",
                "Ultra",
                "UltraOmega",
                "um",
                "uma delicia",
                "umm,dab?",
                "ummm..... ok",
                "unavaliable",
                "Unbalanced Build",
                "Uncle Iroh",
                "undecidable",
                "underated tank?",
                "underverse delta sans",
                "under_gamer092",
                "UNGA BUNGA",
                "Uniform",
                "unikit",
                "UnizPizzawife",
                "UNKNOW",
                "UnKnOwN",
                "U  N  K  N  O  W  N",
                "UNKNOWN LEGEND(UL)",
                "UNKNOWN LEGEND (UL)",
                "Unlucky",
                "UnpunUnoShoten",
                "Unravel",
                "unscientific",
                "Until next time",
                "UnusuⱥʟFrøungdø",
                "Unwelcome School",
                "uoivhhfgrryttyhj",
                "U Only Run To Ur Base?",
                "Uouuuuaju",
                "UPdAE",
                "UPdArE",
                "Update",
                "Update me",
                "UpdDAR3",
                "Updog. Dying Breath. 2",
                "u POO",
                "Ur4ny4n",
                "ura bot",
                "ur all bAAAAAAAAD",
                "UrBadLOL",
                "ur Being Fed",
                "UrBoringTbhLikeWhatsUrPt",
                "u really like to hide",
                "urfwend",
                "urgh",
                "ur mom",
                "ur mom",
                "Ur momma's",
                "ur nub",
                "Ursula",
                "USA",
                "use adblock please",
                "use fighter plsss :)",
                "Use machinegunner to win",
                "Use me as a shield",
                "use this tank with me",
                "USS Enterprise",
                "USSR(Russian)",
                "USS Vella Gulf",
                "u stupid",
                "utifi",
                "Utilisateur",
                "uudsibfhb",
                "uuuu",
                "uwj",
                "UwU",
                "Uwu",
                "uwu",
                "uYu",
                "uyuy",
                "uywu",
                "U S A",
                "V",
                "V&N",
                "V:",
                "vaboski",
                "Vakst",
                "Vakvak",
                "val",
                "valer",
                "Valley",
                "value1",
                "Vanze",
                "Vaskrano",
                "vcl",
                "vc landmine",
                "VEISEL",
                "ven",
                "VengefulPentse",
                "Venom",
                "VENOM",
                "venom",
                "VenomoบຮNorτnear",
                "Very dangerous",
                "vex",
                "Veℝ∂สntͥSiͣmͫสntสc",
                "via",
                "Vicarious",
                "vicrouss",
                "victor",
                "Victor",
                "VictoriousWousi",
                " vikas",
                "vikitor",
                "vilad",
                "vilad pro!!!!!! :)",
                "Vinaphone",
                "Vincent",
                "Vincent Ling",
                "vinh",
                "Vinh HD",
                "vinud",
                "Violin is Interesting.",
                "virtual machine",
                "Visitor",
                "Viva",
                "vIVIVgREYdOVE",
                "viwpo",
                "Việt Cường 2A5",
                "Việt Cường 2A5",
                "Vladmir Poutine",
                "vlasta",
                "vn",
                "vn",
                "VN",
                "VN",
                "VN.HM",
                "VN 3",
                "VN:P",
                "vn <>????",
                "VN chose machine gunner",
                "vn exe",
                "Vn hi",
                "vn luffy",
                "vn nha",
                "vnnnnnn",
                "VN TOXIC",
                "vn{CHP}",
                "VN~I LoVe You Chu Ca Mo",
                "Vogelaj",
                "Void",
                "Void Fighter",
                "vokki8skand",
                "Volderet",
                "voltic",
                "VoluntaryRary",
                "vordt",
                "vortex",
                "VoteOutRacists",
                "VousyX",
                "vovotthh",
                "VT",
                "Vunda = Mythical",
                "Vuͥldͣrͫatediesio",
                "V VAG",
                "vvn",
                "vvv",
                "vvva",
                "vvvvvvvvvvvvvvvvvvvvvvvv",
                "vyde",
                "vyey",
                "vyn",
                "vz",
                "Vỹ đẹp zai",
                "W",
                "W.A.R",
                "W1lleZz",
                "W = Team",
                "WAAAAAAAAAAAAAAAAAAAAAA!",
                "Waffles",
                "wait",
                "wait in doing some work",
                "Waiting",
                "Waiting on a Miracle",
                "Wait What?",
                "wake up",
                "wall",
                "WalleeE",
                "wall hallo",
                "Wall Protecter",
                "Waloh",
                "Walorried-TR",
                "WarleffBuffalo",
                "warrion",
                "Wa Sans ashinenguna!",
                "Wasap Papa",
                "wasd",
                "WasedlaTiddles",
                "waste of time",
                "wat?",
                "WatchMeDestroyYou",
                "WatchMeDestroyYou ol 1v1",
                "W a t e r",
                "water",
                "Waterflame",
                "Watertitur",
                "WateᖙeToℝ℘eᖙo",
                "WatsonKong",
                "WaysidKidSister",
                "WBL",
                "Weakest woomy player:",
                "weak tank",
                "We Do A Little Trolling",
                "we do i little trolling",
                "WEEEEEEEEEEEEEE",
                "wee woo",
                "weird",
                " weirdo",
                "Well",
                "wellerman",
                "wendy imposter is sus",
                "were",
                "Werediand",
                "WereituAtum",
                "WerestLuck",
                "WervidVivitar",
                "WEST SLAVA UKRAINIA",
                "Wew",
                "wewewe",
                "We_peace_farm",
                "Weяw𝕖𝐑ώ€я𝓺q2️⃣prankeo",
                "WHAT!",
                "what's reload???",
                "What?",
                "What?",
                "what does reload do",
                "what is this?",
                "WHATS UP BOI",
                "what tis going on here??",
                "Whaviatte",
                "Wheaple the great",
                "when the",
                "WHERE ARE THE DOORS",
                "where are you fern",
                "WHERED MY RELOAD GO",
                "Wherly",
                "WherviKicker",
                "Whiskey",
                "WhiteyWhati",
                "who want race",
                "Whowediff",
                "WhowerHotsnap",
                "why",
                "WHy",
                "why am i here",
                "WHYANDWHY     Y_N_Y",
                "WHYANDWHY     Y_N_Y",
                "WHY ARE YOU RUNNING",
                "Why Buff Factory?It's OP",
                "why is anni overrated",
                "why maze",
                "why me???",
                "why yall so bad",
                "wibu",
                "wibu king",
                "WiFi-Kun",
                "Wilhelm",
                "willim",
                "Will join me?",
                "willlddd",
                "Windows8.1 Pro Build9600",
                "Windows 8.1",
                "Windows 98",
                "wingarr",
                "Winner",
                "WINNER",
                "winnner",
                "Winter",
                "Winterblade",
                "wispy",
                "Withering",
                "witherrrr",
                "Witionsips",
                "Witψภclคi",
                "wltjdwns234",
                "wltjdwns836",
                "woi",
                "Wojak R FuNNy",
                "Wolf272",
                "Wolfgang",
                "Wolfy_11_BR",
                "Womp Womp",
                "Wooksommen",
                "Woomy",
                "woomy arras.io",
                "WOOT",
                "World",
                "world's best anni",
                "Wormserld",
                "worst impact",
                "WoW",
                "wow",
                "Wow",
                "Wowkoks",
                "Wow that is not sure",
                "wreck",
                "w r e c k",
                "wren",
                "Wsai12",
                "wuzz buzz chuzz",
                "ww3",
                "WWZZX",
                "Wyd_Josh",
                "Wynder",
                "wypk",
                "WZ_120",
                "Wสs†eGℽmⲘสs†eℝ",
                "W๏rͥteͣsͫSᴍartie",
                "Wⱥsͥ†iͣoͫnfℝou",
                "X-BOX",
                "X-Ray",
                "X.ALEXANDER.X",
                "X.Clamator .YT",
                "X11 | Nebuqa",
                "xAd_rian",
                "xan",
                "Xander",
                "Xant",
                "XboxUser",
                "XD",
                "xDD",
                "xddd",
                "XDDDDDDDDDdDDDDDDDDDDDDD",
                "xDer",
                "xDer MY FiRST 1M",
                "xdnha",
                "xeno",
                "Xenon",
                "Xentnya~",
                "Xerxes",
                "Xh",
                "xia",
                "Xiao-Ling",
                "Xiggy",
                "xijinping",
                "Xjso",
                "XL",
                "Xlemargg",
                "XLF",
                "Xlo-250",
                "XP_Toxic_CJS",
                "XP_Toxic_CST",
                "Xqaris",
                "xQD",
                "XRECS",
                "xs",
                "XSET",
                "xtrem",
                "Xtrem",
                "XtremeJoan",
                "xtrw",
                "XxNicolas GamerxX",
                "XxshadowxX Ilove u",
                "Xyx Wdtcfgzezgk",
                "xyz",
                "XYZ",
                "XYZ",
                "xz",
                "xzxz",
                "X_DROP",
                "X℘ExͥplͣoͫຮᎥveﾂ✔",
                "Y",
                "Y.S",
                "y=ax+b",
                "ya",
                "yaaaaaaaaaaaaaaaaaaaaaa",
                "Yael",
                "yahhhh",
                "yahya",
                "ya mom",
                "yang",
                "Yang",
                "Yankee",
                "YANLUI",
                "ya nos cargo la chingada",
                "yayayayayan",
                "ya YYYYYYEEEEEEEETTTTT",
                "ye",
                "yeahs",
                "yeah yeah yeah yeah yeah",
                "Yeat",
                "Ye boi",
                "yee",
                "Yeeeyee",
                "Yeet",
                "Yeeter",
                "yeey",
                "yeffri1",
                "Yelloboi",
                "Yep.",
                "yes",
                "yesbody believs a lair",
                "yess",
                "Yevery1BetrayME:(",
                "YieldingForier",
                "Yimo",
                "Yimo (Friendly forces)",
                "YinYang",
                "yoavmal",
                "Yocto To Yotta",
                "Yodin",
                "yolo",
                "yo racingboi",
                "Yoriichi Tsugikuni",
                "YOTTA CHAD",
                "You",
                "You",
                "you(VN)",
                "you are my father",
                "you can't see me",
                "you deserve this",
                "you dumb",
                "youencounterHIM!yourDEAD",
                "yOU HAD YOUR CHANCE",
                "YoulloDulhaniya",
                "You Made Me Mad!",
                "YOU NAAASTY",
                "Your Bad :(",
                "YOUR BAD = YOUR DEAD!!!",
                "Your Drones Will Lose",
                "YouRIP",
                "YOUR JORDANS ARE FAAAAKE",
                "Your Mom",
                "Your mom",
                "Your Mom is overused",
                "your mom is watching you",
                "your mum",
                "Your mum",
                "Your Pet",
                "yourself",
                "your son",
                "your tail",
                "Your Triggering Me 🤬",
                "your worst lightmare",
                "You saw nothin",
                "you shall not pass!!",
                "You show the lights",
                "You show the lights that",
                "youssef",
                "you were so mad",
                "You were so mine",
                "YO what? bro im out...",
                "YoXieO",
                "YoXieO_YX",
                "yoyo",
                "Yrneh!",
                "YT=GLITCHER TM",
                "Ytt",
                "ytwjeit6tty",
                "yu",
                "yuan(A PENTAGON DDDDD:<)",
                "yuan(hi)",
                "Yuck",
                "yuco",
                "Yujin_05",
                "yulzzang",
                "yuma che3",
                "Y U NO?",
                "yup",
                "yups",
                "Yurin",
                "YUU",
                "Yuvyyuy vyu",
                "Yvonne",
                "yvyg",
                "yx",
                "Yyfk",
                "yyyyyyyyyyyy",
                "yyyyyyyyyyyyn",
                "YYYYYYYYYYYYYOOOOOOOOOO",
                "Y𐍉utђr𐍉uภ",
                "Z",
                "z54",
                "Zachary",
                "ZACHARY",
                "Zac is best",
                "zad5",
                "zae",
                "zaid x",
                "zander",
                "Zaphkiel",
                "Zaphkiel",
                "zaphkiel celestial",
                "zaq",
                "zarity",
                "Zarma",
                "Zasriel",
                "ZasrielDreemurr",
                "ZA WARUDO!",
                "zay",
                "ze",
                "ZealousMovereat",
                "ZEB",
                "Zeezees",
                "zeke",
                "ZEN",
                "zen keon",
                "Zephr is Mod???",
                "Zer0",
                "zeraora",
                "ZERO",
                "zero to hero",
                "Zhynt",
                "Zod",
                "zombie",
                "Zombie",
                "Zoro",
                "Zorroooo",
                "Zort",
                "Zplit",
                "Zp r oZ",
                "zuesa",
                "Zulu",
                "Zver",
                "Zweilous",
                "zX-TwinChilla-Xz",
                "zx 33q",
                "Zyiad",
                "zz",
                "zzx",
                "Zzz",
                "ZZZ",
                "ZZZ ZZZ ZZZ!",
                "Zzz Zzz Zzz:-)",
                "[/G]/O1D SL/Y3R",
                "[AC] VGamerZ",
                "[AI]",
                "[AI] Kidell",
                "[BK] [XC] PAKISTAN",
                "[FBI]Σvi₺ℭℏἏ❀₴#1628",
                "[GZ]GESETA",
                "[GZ] team",
                "[insert creative name]",
                "[IX] clan",
                "[lag]Armando",
                "[MG] GLITCH TR",
                "[MG] PRO TEAM",
                "[MG] Team",
                "[MM]  Ⓕ𝓸𝓻𝓫𝓲𝓭𝓭𝓮𝓷",
                "[M๏ℝec𝔥Muy𝔊๏rᖙØ]",
                "[PFF][|| ı'ɱ ცąცყ||]",
                "[PFF][|| ı'ɱ ცąცყ||]",
                "[Repsaj]ĎąŗĸMãştɛɾ",
                "[VN] MeltedGirl",
                "[VN]Ảo Vãi Lồn🤔",
                "[VN]Ảo Vãi Lồn🤔",
                "[ɨƙ]ɳøʘɗɫɚ",
                "[Σϰ][Ωϰ] ...",
                "[⚔️wiki]₵₳V₳ⱠłɆⱤ",
                "[🇻🇳] Hùng",
                "[🌀]Brain𝐼nHalf",
                "^---------^",
                "^^",
                "_",
                "_-zErO_-",
                "_blank_",
                "_hewo",
                "_____P___E___N___E______",
                "{ 0 _ 0 } IM Agry!!!!!!",
                "{<:Void",
                "{AI} Bot",
                "{CHICK}",
                "{ HEALER } +",
                "{o} Liza <3",
                "{RUNER}",
                "{WOF} Nightwing",
                " {}?{}{}{}{}{}{}{}{}{}{}",
                "{}{}ALEX{}{}",
                "|A",
                "|AL|ChillOut|",
                "| AL | ChillOut |",
                "| AL | ChillOut | WWS++",
                "|^Robo-Birb^|^Silvy^|",
                "||H|E|L|L|O||",
                "||P|L|A|S|M|A||",
                "||||||||||||||||||||||||",
                "}{ello",
                "}{eonyao",
                "}{ex",
                "~",
                "~A~",
                "~Real_K~",
                "~|{boss fight}|~",
                "~~ima try to protect U~~",
                "¡AY PAPI!",
                "¡Vamos!",
                "°”φմէէҽԱէʂվβìէʂվ”°",
                "°”Ṩi𝓭ityethicl”°",
                "¿Equipo?",
                "Öµł†µÐï†ê§",
                "×͜×",
                "×͜×ㅤ𝙰𝙻𝙾𝙽𝙴ㅤ𝙱𝙾𝚈",
                "×͜×ㅤ𝙰𝙻𝙾𝙽𝙴ㅤ𝙱𝙾𝚈",
                "íɑʍIsτʀᴇթ๏sᴇτ",
                "íɑʍOภຮgrⱥigน",
                "íɑʍ≋AℓtŁiℓŦ𝓇Øℓl≋",
                "ñê§łê§þê🐨",
                "Ŧollicuรectior",
                "Ŧฬeͥirͣoͫ͢͢͢Tฬin🅺les😎",
                "Ɓṏṙḕd Ṗläÿệŕ {✨}",
                "Ƒrͥedͣeͫτw☢u",
                "Ƒuͥℓdͣsͫhinec",
                "ƤlคץรChⱥή∂☢ese",
                "Ƥ𝕣αlØ𝔫scallᴳᵒᵈ",
                "Ǥrel𐍉resit",
                "ˢᵐᵒᵘᵗᵉᵐᵃᶜᴳᵒᵈ",
                "ͲąղէìçմҍӀ",
                "ΘffireKhⱥήzir",
                "αиgєℓ _ℓιfє ❤️🥀",
                "Ϛageร𐍉HϚ𐍉ℓ☢😇",
                "ϟ",
                "Дракон",
                "ОХОТНИК",
                "занято42/Busybody42",
                "прівіт",
                "҉s҉h҉u҉n҉a҉",
                "թг๏Ɔoupsoɹʇɥ",
                "୨Fei𝓈tyLexte∂i𝓈⪑",
                "୨丹𝓃d𝓼e๖ۣۜƤⱥ𝓃cⱥce𝓼⪑",
                "୨𝔄𝔟𝔫𝔬𝔯𝔪𝔞𝔩𝔄𝔫𝔫𝔞𝔩𝔤𝔞𝔱⪑",
                "ร๏ɭɭร๏ภɭץ",
                "฿eenGoatees⚔",
                "฿eͥirͣoͫᴍeŇclo",
                "๔เгєςՇгє๔เς🐵",
                "๖ۣۜBloαtyAnat͢͢͢e",
                "๖ۣۜOffeℝtBαffy",
                "๖ۣۜ฿uͥ†sͣiͫ多Mu††er",
                "๖ۣۜᖘⱥuͥncͣhͫyCⱥustiᴍ",
                "๖ۣۜℜaͥnsͣtͫredu",
                "๖ۣۜℜevⱥsนpSⱥssⱥfrⱥs",
                "๖ۣۜ山iͥggͣlͫץ๖ۣۜ山ing⇜",
                "๖ۣۜ山Øozץ๖ۣۜ山ome♛",
                "๖ۣۜ山☢uͥsiͣaͫℓℓeﾂ",
                "༄ᶦᶰᵈ᭄✿Gᴀᴍᴇʀ࿐",
                "༄ᶦᶰᵈ᭄✿Gᴀᴍᴇʀ࿐",
                "༄ᶦᶰᵈ᭄✿Gᴀᴍᴇʀ࿐",
                "༺Hⱥrm๏ni๏us๖ۣۜ山ermisty༻",
                "༺Leͥgeͣnͫd༻ᴳᵒᵈ",
                "༺Thøuɾnᵃnꜱt༻",
                "ཌInͥgeͣdͫighØ𝓊ndད",
                "Ꭵ°᭄ᶫᵒᵛᵉᵧₒᵤ࿐♥",
                "Ꭺɴᴋᴜꜱʜㅤᶠᶠ",
                "ᖘiͥŇgͣeͫsτri",
                "᚛BℝαzenBℝeα᚜",
                "᚛UήisliήBigHuήk᚜",
                "᚛VerรeᖙTurรeᖙΐe᚜",
                "᚛Θficຮoภeຮ᚜",
                "ᴛᴜʀᴜ ᴅᴇκ友",
                "ᴛᴜʀᴜ ᴅᴇκ友",
                "ᴴᵃⁿʸᵐᵖᶜᵘᵗᵉᴾᵃⁿᵗˢ",
                "ᴴᵃⁿᶜᵉˢʰᵃⁿᵍᵒ▒",
                "ᴵᴬᴹDaͥzzͣlͫᎥŇgWᎥlieรτi",
                "ᴶᴬᴳᴼᴬᴺ・Bocil 友",
                "ᴶᴬᴳᴼᴬᴺ・𝙀𝙢𝙖𝙠友",
                "ᴶᴬᴳᴼᴬᴺ 𝚃𝚞𝚛𝚞友",
                "ᴹᴿメY a h M a t i ☂️",
                "ᶠ͢͢͢ᵉⁱᵍⁿᵉᵈᴸᵉˢˢᵃᵐᵉᵈ",
                "ṨuήnyAuserสny",
                "•`🍓Valerie xavier axelelyn🍥",
                "•长ąϮëąℓ⁀ᶜᵘᵗᵉ╰ ‿ ╯ ☂",
                "⁄•⁄ω⁄•⁄卡比獸🖤",
                "⁅๖ۣۜƤoeτicViτhic⁆",
                "⁅🆂🅴🅽🆂🅸🅱🅻🅴🅰🅽🆃🅴🅽🆂🅸🅾⁆",
                "⁣𓆩NօthΣurΣeŇtment",
                "⁣𓆩ⱮմʂʂҽąⱮմʂէąçհҽ",
                "⁣𓆩🅰🅳🅼͢͢͢🅸🅽🅴🆆🅴🆁🅴🅽🆃",
                "₧Anสτ͢͢͢Rสτit☢",
                "ℓเττℓєA𝕤𝒾𝕤͢͢͢ul🅰natedes",
                "ℭ𝔬𝔣𝔣𝔢𝔢",
                "∂яα¢σηιαη卄αη∂яє∂υ",
                "∉Eᴍiภeภ†Miภa多iho∌",
                "∉Gℽmͥnaͣsͫт🅸𝖈丹terΐamn∌",
                "∉𝕾nappʸ𝓝alꜱ๏∌",
                "≋Beήτic͢͢͢ediή≋",
                "≪Nummiຮ๖ۣۜ山his𝔱l͢͢͢er≫",
                "⋉Direllooductຮe⋊",
                "⌁NaτemacτᎥ⌁",
                "⌿⏃⋏⎅⏃",
                "⑉Elͥegͣeͫήτreα⑉",
                "⑉Officђ𐍉uττi⑉",
                "⑉S☢mp☢รpͥGuͣmͫp⑉",
                "Ⓥ",
                "━━╬٨ـﮩﮩ❤٨ـﮩﮩـ╬━❤️❥❥═══👑ľøvē👑 ═",
                "█▬█ █ ▀█▀Asser†iveSegingin",
                "░B░O░S░S░",
                "▓TreήdץTrคm",
                "▥Jeสncies†i?",
                "▥ƆouƆouʌıɔʇıou¿",
                "◤AŇdสtMสŇŇeͥℚuͣiͫŇ◢",
                "◤NorNoRegαrᖙ◢",
                "◤𝓟𝓲𝓰𝓰𝔂𝓒𝓸𝓾𝓰𝓰𝓵𝓲𝓼୧",
                "◯ . ◯⃨̅",
                "☁Ofเrethe☢",
                "★AbͥreͣcͫuℓCuթieDoℓℓ★",
                "★I†uℝFuͥℝmͣuͫzzℓe★",
                "★Shͥouͣlͫ∂en∂ieve★",
                "★Θfferencesթece★",
                "★彡[๖ۣۜƊreคᖙ͢͢͢๖ۣۜƊeωᖙrop]彡★",
                "★彡[ᴅᴇᴀᴅ ᴋɪʟʟᴇʀ]彡★",
                "☯︎Ꭱ Ｏ Ƴ Ꭺ Ꮮ 亗 ×͜×",
                "☽乃ץՇ๏קץՇђ๏ภ☾",
                "♐OfficebᵒℽOffee",
                "♐P͢͢͢herstst☢",
                "♔〘Ł€Ꮆ€ŇĐ〙♔",
                "♕ ❤VIỆT NAM ❤♕",
                "♣☆  ⓂⒶ𝓻s𝐇Ⓜ𝔼𝕝ᒪσω  ☯♚",
                "♪KING♫♕-dev#3917",
                "⚡Abͥ☢nͣdͫynᎠynสm☢⚡",
                "⚡H☢sH☢neͥℽbͣuͫn⚡",
                "⚡O多ʝecτiveDeco⚡",
                "⚡Uppontork⚡",
                "⚡U†eͥreͣvͫe∂a⚡",
                "⚰️🔥👻WITNESS ME👻🔥⚰️",
                "⚾ꜱcrค℘℘yIsτraℓΐf",
                "✈",
                "✐ЯΣΛ爪ΛПΣЦЯΣ",
                "✫Itͥคlͣlͫsømme",
                "✰Aאָiͥcaͣpͫђeℓ✰",
                "✰Habi†ualΘn∂ingua✰",
                "✰QนestaΐŇgl✰",
                "✰Tђℝ☢titsc✰",
                "✰VΐcͥtoͣrͫΐousStor∂eส✰",
                "✰W☢☢ℓutte∂espect✰",
                "✹Shΐll๖ۣۜᗯildfire",
                "✿ • Q U E E N✿ᴳᴵᴿᴸ࿐",
                "❅Camedΐℝ๖ۣۜƊℝedd❅",
                "❅Ju͢͢͢diciøusᖘheสdjur❅",
                "❅WђizคJคckWђi†e❅",
                "❅ᴛᴏᴀꜱᴛʏᴀꜱɪᴏɴᴅꜱᴛ❅",
                "❬☬❭  ⚜️Ð𝐙𝕐 ッ 〜 🌷",
                "❰𝞑𝞡𝞣❱ 𝝙𝝼𝝴𝝶𝘂𝝴",
                "⦃ExtegสExtℝ𝒶H☢t⦄",
                "⦃φօʂìէìѵҽԱʂէìէմąɾ⦄",
                "⦇¢aphօℓօSnappy⦈",
                "⦇ƑⱥℓiKi𝖒多๏Ṩℓice⦈",
                "⧼Deͥpsͣeͫᄂfarg⧽",
                "⧼ᴀภqͥ𝕦eͣsͫτeds⧽",
                "⨝∑₮ξ₹ͶΛL⨝",
                "⩻๖ۣۜᗯorl𝒹ly๖ۣۜᗯonsi𝕥u⩼",
                "⪓Offigeร℘er⪔",
                "⪨Äภioภ§Jสภeman⪩",
                "⫷EᴍiήentOffec☢ne⫸",
                "⫷FⱥrϻbØyFⱥϻb⫸",
                "⫷M🆄ɔtsΐ𝕓lest⫸",
                "⫷Ofteภ𐍉Gift⫸",
                "⫷PนℝeMiͥℝeͣyͫ⫸",
                "Ⱬł₭Ɽł₮₳Ӿ",
                "ⱮօղѵҠօմҟӀąʍօմ",
                "ⲘสysτᎥnⲘᎥnou😌",
                "⸔Ṩaΐηg↻haΐ͢͢͢nຮ⸕",
                "⸙",
                "「Abi∂iŇgDicaŇℽ」",
                "「Ate∂iͥDiͣlͫly๖ۣۜßØo」",
                "「Ciaℓiͥᖘhͣoͫbia」",
                "「FℓuͥttͣeͫriήgItingenv」",
                "「Grǝacklψeτ」",
                "「ƤสrigͥCoͣrͫriᖙor」",
                "『sʜʀᴋ』•ᴮᴬᴰʙᴏʏツ",
                "『sʜʀᴋ』•ᴮᴬᴰʙᴏʏツ",
                "『sᴛʀᴋ』ᴷᴺᴵᴳᴴᵀ༒࿐",
                "『WสψstℝWสt🅲hfส🅲e』",
                "『YT』Just𝕸𝖟𝖆𝖍ヅ",
                "『ƬƘ』 ƬƦΘレ乇メ",
                "『Ѕʜʀ』• ℑℴƙℯℛᴾᴿᴼシ",
                "【Cบrruτiv𝖊͢͢͢ภ】",
                "【EaℝŇestͥIsͣtͫaŇdne】",
                "【The L1litle One】",
                "【Çðñêð₥͢͢͢å¢ïł】",
                "〖-9999〗-҉R҉e҉X҉x҉X҉x҉X҉",
                "〖Aήthent฿ⱥdbreⱥth〗",
                "〖CoℝdsђWaℝdoŇ〗",
                "〖Grͥetͣyͫdrest〗",
                "〖Is†rͥสlͣlͫץpe〗",
                "〖IŇviŇci多leAdeŇƤual〗",
                "〖Oภvest𐍉pΐ〗",
                "〖Tiͥสnͣyͫouℓthom〗",
                "〖WⱥsτrSτⱥbͥbeͣrͫ〗",
                "〖ṨoftOftwTนft〗",
                "やlachaҜ𝔢d๖ۣ•҉",
                "ツ",
                "ツSpazeツ",
                "メ",
                "ㅋㅋㄹㅃㅃ",
                "ㅤㅤㅤㅤㅤ",
                "㍶𝕎𝕠𝕟𝕕𝕖𝕣𝕗𝕦𝕝𝕍𝕖𝕣𝕗𝕠𝕣",
                "丹pสτheτᎥcṨømpⱥthⱥ",
                "丹ภefFคภgs",
                "丹†eÐiuϻbee††ℓy†",
                "亗",
                "亗",
                "千lu🆃🆃er𝕚𝓃gṨαu🆃e🏂",
                "彡Ri๏ภt͢͢͢αhαbigiv彡",
                "彡ΛЯᄂƧΣᄃΛ彡",
                "残念な人",
                "ꔪ",
                "꧁H҉A҉C҉K҉E҉R҉꧂",
                "꧁҈$ꫀꪖ  ,҉ℭն𝚌մꪑ𝜷ꫀ᥅ ༻",
                "꧁ঔৣ☬✞𝓓𝖔𝖓✞☬ঔৣ꧂",
                "꧁ঔৣ☬✞𝓓𝖔𝖓✞☬ঔৣ꧂",
                "꧁༒Ǥ₳₦ǤֆƬᏋЯ༒꧂",
                "꧁༒☬sunny☬༒꧂",
                "꧁༒☬ᤂℌ໔ℜ؏ৡ☬༒꧂",
                "꧁༒☬ᤂℌ໔ℜ؏ৡ☬༒꧂",
                "꧁༒☬✞😈VîLLãñ😈✞☬༒ ꧂",
                "꧁༺J꙰O꙰K꙰E꙰R꙰༻꧂",
                "꧁༺nickname༻꧂",
                "꧁༺༒〖°ⓅⓇⓄ°〗༒༻꧂",
                "꧁༺ ₦Ї₦ℑ₳ ƤℜɆĐ₳₮Øℜ ༻꧂",
                "꧁༺₦Ї₦ℑ₳༻꧂",
                "꧁༺₦Ї₦ℑ₳༻꧂",
                "꧁༺𝓘𝓷𝓼𝓪𝓷𝓲𝓽𝔂༻꧂",
                "꧁⁣༒𓆩₦ł₦ℑ₳𓆪༒꧂",
                " ꧁ℤ𝕖𝔱𝔥𝔢𝔯𝔫𝕚𝕒꧂",
                "꧁▪ ＲคᎥនтαʀ ࿐",
                "꧁☆☬κɪɴɢ☬☆꧂",
                "꧁☬⋆ТᎻᎬ༒ᏦᎥᏁᏳ⋆☬꧂",
                "꧁☬☬😈꧁꧂ ☠HARSH ☠꧁꧂😈 ☬☬꧂",
                "꧁☯ℙ么ℕⅅ么☯꧂\ufeff",
                "꧁✯[🕋]MÂRSHMÆLLØW 𖣘✯꧂",
                "ꨄ",
                "하이루",
                "한국 Lime Lemon",
                "Heͥstͣsͫookerinec",
                "IfΐeรeŇUŇΐverรe",
                "IssℓαtSℓoͥppͣyͫ",
                "Θffi多ℓoTrou多ℓe",
                "๖ۣۜ山angຮᎥRagຮ",
                "︽CӨ🅽𝔞ℓsoᴍe𝔱tee",
                "﹄𝔇𝔬𝔫𝔨𝔢𝔶𝔒𝔠𝔨𝔢𝔡𝔲﹃",
                "ＦＺㅤＯＦＩＣＩＡＬ亗",
                "Ｗｅｄｉｓｐｉｃｈａｖｉｔ▒",
                "｟VoℓคtᎥℓeAtentᎥⱥt｠",
                "𐄡ɢlaήsaรailØrM͢͢͢aή𐄪",
                "𐄡𝒫𝑜𝓉𝑒𝓃𝓉𝒯𝒾𝑒𝓃𐄪",
                "𐐚eeͥᖙgͣeͫήve",
                "𐐚ewil∂ere∂Ne∂iภ",
                "𐐚ץƬuƬtepØω",
                "𓊈卄ανσ͢͢͢ℓ丂αναє𓊉",
                "𖣘ᴰᵃʳᴋ᭄ꮯꮎᏼꭱꭺ🐲࿐",
                "𝒞𐍉nl𝖞r𐍉𝖇s",
                "𝒮𝔭00𝔡𝔢𝔯𝔪𝔞𝔫",
                "𝒰𝒞ℋİℋ𝒜",
                "𝓑𝓻𝓸𝓴𝓮𝓷 𝓗𝓮𝓪𝓻𝓽♡",
                "𝓕𝓸𝓵𝓿𝓮𝓞𝓵𝓭𝓳𝓸𝓴𝓮⚔",
                "𝓗𝓪𝓭𝓭𝓚𝓱𝓪𝓷𝔃𝓲𝓻",
                "𝓗𝓮𝔂𝓸𝓗𝓸𝓷𝓮𝔂𝓬𝓪𝓴𝓮🎨",
                "𝓟𝓸𝓻𝓮𝓽𝔂𝓷𝓽𝓼𝔰𝔲𝔭𝔢𝔯",
                "𝓟𝓻𝓸𝓰𝓷𝓲𝔁𝓽𝓾𝓻",
                "𝓼𝓮𝓻𝓲𝓸𝓾𝓼𝓵𝔂",
                "𝔗ec†iga†eechersҜ♐",
                "𝔚hΐ†eℽWhΐm",
                "𝔚𝔥𝔞𝔫𝔡𝔢𝔱𝔉𝔞𝔫𝔞𝔱𝔦𝔠⇜",
                "𝕁𝕖𝕤𝕥𝕖𝕣",
                "𝕃𝕠𝕘͢͢͢𝕖𝕕𝕦𝕒𝕝𝕚𝕒",
                "𝕆𝕗𝕗𝕠𝕦𝕝𝕕𝕠𝕨𝕚𝕥𝕚𝕝⚡",
                "𝕯𝖆𝖗𝖐 𝕬𝖓𝖌𝖊𝖑",
                "𝕯𝖆𝖙 𝕺𝖓𝖊 𝕭𝖔𝖎",
                "𝕰𝖓𝖊𝖒𝖞_𝕯𝖔𝖌",
                "𝕴ñⱥτ🅸vScrⱥtchy🐆",
                "𝕴ภc☢meMสch☢mคn🏀",
                "𝕹͢͢͢𐍉τempℓeᴀɾ😠",
                "𝕻𝖑𝖆𝖙𝖎𝖘𝖊𝖓𝖙𝖙єค๓",
                "🅑🅛🅐🅒🅚🅟🅐🅝🅣🅗🅔🅡",
                "🅸 🅰🅼 🅶🅾🅳",
                "🆆🅷🅴🆂🅿🅸🆂🅷🅰🅳🅾🌗",
                "🇧🇷HUE🇧🇷",
                "🇧🇷HUE🇧🇷",
                "🇸🇦",
                "🌀DESTROYER🌀",
                "🌊🦈🌊",
                "🌌Miñe🌌",
                "🌌Miñe🌌",
                "🌌Miñe🌌",
                "🌰🆂🅴🅽🅸🅽🅶🅻🆂🅸🆁🅴🅽🅸🆃🅰",
                "🌳H𐍉Ňe͢͢͢st𝓘Ňew",
                "🌻ｓｕｎｆｌｏｗｅｒ🌻",
                "🍃𝕲rคᎥŇคÈlคᎥs",
                "🍎",
                "🎈IT🎈 APOCOLYPSE",
                "🎮丹թթєɐli𝓃gQuɐli𝓃gє",
                "🎮𝕊ecτolαrץຮτ",
                "🎲๖ۣۜƤⱥranAsian𐌁øyz",
                "🎹ͲօցìօղժƓմղժ",
                "🎻Hiקle𝔶lutקuᖙiѕh",
                "🏄",
                "🐅Exקreαrfer",
                "🐥IภêℝtAshtaℝt",
                "🐫PønΛctiαrsenaℓ",
                "🐯Hคndy͢͢͢Hคtiɭity",
                "🐯ᎠⱥrlΐภgArҜs🅱ⱥt",
                "🐰chiro🐰",
                "🐶(X)~pit¥🐺te matare jajaja",
                "🐸🐌【HapPy】",
                "💞",
                "💤Fสή†สຮ†icͥAfͣfͫic",
                "🔱LordΛภ𝓰𝖑Ɇ🚫",
                "🔱Saint LilY⚜🚫",
                "🔱Ƒιяєωσяк🚫",
                "🔱⨊ $؋₲₥₳🚫",
                "🔱 𝓽𝓲𝓶𝓮𝓽𝓸𝓭𝓲𝓮 🚫",
                "🖤ISAAC🖤",
                "😈",
                "😈Stormys Domain😈",
                "😋𐌁𝔯αήgsτ𐌁ruddah",
                "😌CømiภgPoթcorn",
                "😎",
                "😎👿david988😎👿",
                "😐🅲🆄🆁🅽🅰🅽🅱🅾🅽🅰🅵🅸🅳🅴",
                "😦UnwielᖙℽNexק",
                "😶ＧｕｔｔｕｒａｌＰｕｔｈｅｒｉｐ",
                "😻SƤ𝔯iήgy🅼orkingɭ",
                "🚊Ӌeสτenͥτrͣiͫ͢͢͢n",
                "🚣AՇitℽสrDสrͥinͣgͫ",
                "🚣ᴅʀɪᴠᴇɴᴇᴠᴇʀʀ",
                " 🥧π🥧"
            ];
            const randomAngle = () => {
                return Math.PI * 2 * Math.random();
            }
            const randomRange = (min, max) => {
                return Math.random() * (max - min) + min;
            }
            const gauss = (mean, deviation) => {
                let x1, x2, w;
                do {
                    x1 = 2 * Math.random() - 1;
                    x2 = 2 * Math.random() - 1;
                    w = x1 * x1 + x2 * x2;
                } while ((0 == w || w >= 1));

                w = Math.sqrt(-2 * Math.log(w) / w);
                return mean + deviation * x1 * w;
            }
            const random = x => {
                return x * Math.random();
            }
            const irandom = i => {
                let max = Math.floor(i);
                return Math.floor(Math.random() * (max + 1)); //Inclusive
            }
            const fy = (a, b, c, d) => {
                c = a.length;
                while (c) {
                    b = Math.random() * (--c + 1) | 0;
                    d = a[c];
                    a[c] = a[b];
                    a[b] = d;
                }
            }
            const chooseN = (arr, n) => {
                let o = [];
                for (let i = 0; i < n; i++) {
                    o.push(arr.splice(irandom(arr.length - 1), 1)[0]);
                }
                return o;
            }
            const choose = arr => {
                return arr[irandom(arr.length - 1)];
            }
            return {
                random: random,

                randomAngle: randomAngle,

                randomRange: randomRange,
                biasedRandomRange: (min, max, bias) => {
                    let mix = Math.random() * bias;
                    return randomRange(min, max) * (1 - mix) + max * mix;
                },

                irandom: irandom,

                irandomRange: (min, max) => {
                    min = Math.ceil(min);
                    max = Math.floor(max);
                    return Math.floor(Math.random() * (max - min + 1)) + min; //Inclusive
                },

                gauss: gauss,

                gaussInverse: (min, max, clustering) => {
                    let range = max - min;
                    let output = gauss(0, range / clustering);
                    let i = 3;
                    while (output < 0 && i > 0) {
                        output += range;
                        i--;
                    }
                    i = 3;
                    while (output > range && i > 0) {
                        output -= range;
                        i--;
                    }

                    return output + min;
                },

                gaussRing: (radius, clustering) => {
                    let r = random(Math.PI * 2);
                    let d = gauss(radius, radius * clustering);
                    return {
                        x: d * Math.cos(r),
                        y: d * Math.sin(r),
                    };
                },

                chance: prob => {
                    return random(1) < prob;
                },

                dice: sides => {
                    return random(sides) < 1;
                },

                choose: choose,

                chooseN: chooseN,

                chooseChance: (...arg) => {
                    let totalProb = 0;
                    arg.forEach(function(value) { totalProb += value; });
                    let answer = random(totalProb);
                    for (let i = 0; i < arg.length; i++) {
                        if (answer < arg[i]) return i;
                        answer -= arg[i];
                    }
                },

                fy: fy,

                chooseBotName: (function() {
                    let q = [];
                    return () => {
                        if (!q.length) {
                            fy(names);
                            q = [...names];
                        };
                        return q.shift();
                    };
                })(),

                chooseBossName: (code, n) => {
                    switch (code) {
                        case 'a':
                            return chooseN([
                                "Abundantia",
                                "Abzu",
                                "Acat",
                                "Achelois",
                                "Achelous",
                                "Aditi",
                                "Adonis",
                                "Aegir",
                                "Aengus",
                                "Aeolus",
                                "Aequitas",
                                "Aesir",
                                "Aether",
                                "Agni",
                                "Ahti",
                                "Aion",
                                "Akilina",
                                "Al-uzza",
                                "Alastor",
                                "Alcmene",
                                "Alkaios",
                                "Allat",
                                "Amaterasu",
                                "Ame-no-Uzume",
                                "Ammit",
                                "Amphitrite",
                                "Amun",
                                "Amyntas",
                                "Ananke",
                                "Anastasios",
                                "Anaxagoras",
                                "Andraste",
                                "Angus",
                                "Aniketos",
                                "Annapurna",
                                "Anshar",
                                "Anubis",
                                "Anuket",
                                "Aphrodite",
                                "Apollo",
                                "Apophis",
                                "Apsu",
                                "Aranyani",
                                "Arawn",
                                "Archimedes",
                                "Arduinna",
                                "Artemis",
                                "Artio",
                                "Aruna",
                                "Aryaman",
                                "Asclepius",
                                "Asherah",
                                "Ashur",
                                "Astarte",
                                "Astraeus",
                                "Asura",
                                "Aten",
                                "Atlaua",
                                "Atum",
                                "Aurora"
                            ], n);
                        case 'b':
                            return chooseN([
                                "Baal",
                                "Babi",
                                "Bacabs",
                                "Bacchus",
                                "Badb",
                                "Balarama",
                                "Baldur",
                                "Baraka",
                                "Baron Samedi",
                                "Barra",
                                "Bastarnae",
                                "Bastet",
                                "Bat",
                                "Batara",
                                "Bathala",
                                "Bau",
                                "Bel",
                                "Belenus",
                                "Belet-seri",
                                "Bellerophon",
                                "Bellona",
                                "Belobog",
                                "Bendis",
                                "Bennu",
                                "Benzaiten",
                                "Beowulf",
                                "Berehynia",
                                "Bes",
                                "Bestla",
                                "Beyla",
                                "Bhairava",
                                "Bhavani",
                                "Bhumi",
                                "Bia",
                                "Biafra",
                                "Binbōgami",
                                "Bishamon",
                                "Bishamonten",
                                "Bixia",
                                "Boann",
                                "Bona Dea",
                                "Bonus Eventus",
                                "Bor",
                                "Borr",
                                "Bragi",
                                "Brahma",
                                "Brahmani",
                                "Bran",
                                "Branwen",
                                "Bresal",
                                "Brigid",
                                "Brigit",
                                "Brihaspati",
                                "Britomartis",
                                "Brizo",
                                "Bubona",
                                "Buchis",
                                "Buddha",
                                "Bumba",
                                "Byggvir"
                            ], n);
                        case 'c':
                            return chooseN([
                                "Cailleach",
                                "Caishen",
                                "Calliope",
                                "Calypso",
                                "Camael",
                                "Camazotz",
                                "Camulus",
                                "Candi",
                                "Cangjie",
                                "Canope",
                                "Cardea",
                                "Carmenta",
                                "Castor",
                                "Centeotl",
                                "Cernunnos",
                                "Cerridwen",
                                "Ceto",
                                "Chac",
                                "Chamunda",
                                "Chandra",
                                "Chang'e",
                                "Changxi",
                                "Charites",
                                "Charon",
                                "Chemosh",
                                "Chepi",
                                "Chernobog",
                                "Cherubim",
                                "Chhaya",
                                "Chinnamasta",
                                "Chione",
                                "Chirakan",
                                "Chiron",
                                "Chloe",
                                "Chukwu",
                                "Chulainn",
                                "Cian",
                                "Circe",
                                "Cizin",
                                "Clementia",
                                "Cleon",
                                "Clio",
                                "Cloacina",
                                "Clíona",
                                "Coatlicue",
                                "Coeus",
                                "Concordia",
                                "Consus",
                                "Copia",
                                "Cotys",
                                "Coventina",
                                "Coyote",
                                "Crius",
                                "Crom Cruach",
                                "Cronus",
                                "Culsans",
                                "Cunomaglus",
                                "Cupid",
                                "Cybele",
                                "Cymede"
                            ], n);
                        case 'castle':
                            return chooseN([
                                "Akkerman",
                                "Alhambra",
                                "Alnwick",
                                "Babylon",
                                "Bamburgh",
                                "Belvoir",
                                "Berezhany",
                                "Bilhorod",
                                "Blarney",
                                "Bodiam",
                                "Bran",
                                "Brody",
                                "Carcassonne",
                                "Chambord",
                                "Chevaliers",
                                "Chillon",
                                "Conwy",
                                "Dobromyl",
                                "Dover",
                                "Dubrovnik",
                                "Edinburgh",
                                "Eilean Donan",
                                "Heidelberg",
                                "Himeji",
                                "Isiaslav",
                                "Kaffa",
                                "Kilkenny",
                                "Leeds",
                                "London",
                                "Lutsk",
                                "Mangup",
                                "Matsumoto",
                                "Mont",
                                "Olseko",
                                "Osaka",
                                "Palanok",
                                "Pena",
                                "Persepolis",
                                "Petra",
                                "Pissa",
                                "Prague",
                                "Rosenborg",
                                "Stirling",
                                "Tikal",
                                "Toledo",
                                "Warwick",
                                "Windsor",
                                "York",
                                "Zolochiv"
                            ], n);
                        case 'meme':
                            return chooseN([
                                // Characters & People
                                "Bender",
                                "Bowser",
                                "Cirno",
                                "Cookie Monster",
                                "Diddy",
                                "Donkey Kong",
                                "Eggman",
                                "Einstein",
                                "Fawful",
                                "Ganondorf",
                                "Grand Dad",
                                "Homer",
                                "Hussein",
                                "Jeffrey",
                                "Kanye",
                                "Lebron",
                                "Leshawna",
                                "Mason",
                                "Mewton",
                                "Parappa",
                                "Nyan",
                                "Pewdiepie",
                                "Shrek",
                                "Trump",
                                "Wart",
                                // Memes
                                "Alpha",
                                "Baddie",
                                "Bofa",
                                "Bruh Moment",
                                "Cheese Block",
                                "Cryptobro",
                                "eeffoC",
                                "Hydrogen Bomb",
                                "Iron Block",
                                "IRS",
                                "Mafia Boss",
                                "Nothing",
                                "Sigma",
                                "Tuff",
                                "Weezer",
                                "Zip Bomb",
                                // Special Cases
                                " Fumo",
                                "GIGA ",
                                "John ",
                                "King ",
                                "My Chud ",
                                " NEO",
                                "Queen ",
                                "Skibidi ",
                                "The Original ",
                                " The Undying",
                                "Uncanny ",
                                ".EXE"
                            ], n);
                        case 'legacy':
                            return chooseN([
                                "Alastor",
                                //"Ares",
                                "Astradhur",
                                "Callum",
                                "Christaire",
                                "Droukar",
                                "Eratosthenes",
                                "Galileo",
                                "Geofridus",
                                "Gervaise",
                                "Guillermo",
                                "Hades",
                                "Hasselhoff",
                                "Helios",
                                "Herschel",
                                "Kohntarkosz",
                                "Konstanze",
                                "Lavoisier",
                                "Maleficum",
                                "Maxwell",
                                "Maynard",
                                "Newton",
                                "Reimund",
                                "Saulazar",
                                "Spiegel",
                                "Tephania",
                                "Weiss"
                            ], n);
                        case 'a-z':
                            return chooseN([
                                "Abundantia",
                                "Abzu",
                                "Acat",
                                "Achelois",
                                "Achelous",
                                "Aditi",
                                "Adonis",
                                "Aegir",
                                "Aengus",
                                "Aeolus",
                                "Aequitas",
                                "Aesir",
                                "Aether",
                                "Agni",
                                "Ahti",
                                "Aion",
                                "Akilina",
                                "Al-uzza",
                                "Alastor",
                                "Alcmene",
                                "Alkaios",
                                "Allat",
                                "Amaterasu",
                                "Ame-no-Uzume",
                                "Ammit",
                                "Amphitrite",
                                "Amun",
                                "Amyntas",
                                "Ananke",
                                "Anastasios",
                                "Anaxagoras",
                                "Andraste",
                                "Angus",
                                "Aniketos",
                                "Annapurna",
                                "Anshar",
                                "Anubis",
                                "Anuket",
                                "Aphrodite",
                                "Apollo",
                                "Apophis",
                                "Apsu",
                                "Aranyani",
                                "Arawn",
                                "Archimedes",
                                "Arduinna",
                                "Artemis",
                                "Artio",
                                "Aruna",
                                "Aryaman",
                                "Asclepius",
                                "Asherah",
                                "Ashur",
                                "Astarte",
                                "Astraeus",
                                "Asura",
                                "Aten",
                                "Atlaua",
                                "Atum",
                                "Aurora",
                                "Baal",
                                "Babi",
                                "Bacabs",
                                "Bacchus",
                                "Badb",
                                "Balarama",
                                "Baldur",
                                "Baraka",
                                "Baron Samedi",
                                "Barra",
                                "Bastarnae",
                                "Bastet",
                                "Bat",
                                "Batara",
                                "Bathala",
                                "Bau",
                                "Bel",
                                "Belenus",
                                "Belet-seri",
                                "Bellerophon",
                                "Bellona",
                                "Belobog",
                                "Bendis",
                                "Bennu",
                                "Benzaiten",
                                "Beowulf",
                                "Berehynia",
                                "Bes",
                                "Bestla",
                                "Beyla",
                                "Bhairava",
                                "Bhavani",
                                "Bhumi",
                                "Bia",
                                "Biafra",
                                "Binbōgami",
                                "Bishamon",
                                "Bishamonten",
                                "Bixia",
                                "Boann",
                                "Bona Dea",
                                "Bonus Eventus",
                                "Bor",
                                "Borr",
                                "Bragi",
                                "Brahma",
                                "Brahmani",
                                "Bran",
                                "Branwen",
                                "Bresal",
                                "Brigid",
                                "Brigit",
                                "Brihaspati",
                                "Britomartis",
                                "Brizo",
                                "Bubona",
                                "Buchis",
                                "Buddha",
                                "Bumba",
                                "Byggvir",
                                "Cailleach",
                                "Caishen",
                                "Calliope",
                                "Calypso",
                                "Camael",
                                "Camazotz",
                                "Camulus",
                                "Candi",
                                "Cangjie",
                                "Canope",
                                "Cardea",
                                "Carmenta",
                                "Castor",
                                "Centeotl",
                                "Cernunnos",
                                "Cerridwen",
                                "Ceto",
                                "Chac",
                                "Chamunda",
                                "Chandra",
                                "Chang'e",
                                "Changxi",
                                "Charites",
                                "Charon",
                                "Chemosh",
                                "Chepi",
                                "Chernobog",
                                "Cherubim",
                                "Chhaya",
                                "Chinnamasta",
                                "Chione",
                                "Chirakan",
                                "Chiron",
                                "Chloe",
                                "Chukwu",
                                "Chulainn",
                                "Cian",
                                "Circe",
                                "Cizin",
                                "Clementia",
                                "Cleon",
                                "Clio",
                                "Cloacina",
                                "Clíona",
                                "Coatlicue",
                                "Coeus",
                                "Concordia",
                                "Consus",
                                "Copia",
                                "Cotys",
                                "Coventina",
                                "Coyote",
                                "Crius",
                                "Crom Cruach",
                                "Cronus",
                                "Culsans",
                                "Cunomaglus",
                                "Cupid",
                                "Cybele",
                                "Cymede"
                            ], n);
                        case 'all':
                            return chooseN([
                                "Abundantia",
                                "Abzu",
                                "Acat",
                                "Achelois",
                                "Achelous",
                                "Aditi",
                                "Adonis",
                                "Aegir",
                                "Aengus",
                                "Aeolus",
                                "Aequitas",
                                "Aesir",
                                "Aether",
                                "Agni",
                                "Ahti",
                                "Aion",
                                "Akilina",
                                "Al-uzza",
                                "Alastor",
                                "Alcmene",
                                "Alkaios",
                                "Allat",
                                "Amaterasu",
                                "Ame-no-Uzume",
                                "Ammit",
                                "Amphitrite",
                                "Amun",
                                "Amyntas",
                                "Ananke",
                                "Anastasios",
                                "Anaxagoras",
                                "Andraste",
                                "Angus",
                                "Aniketos",
                                "Annapurna",
                                "Anshar",
                                "Anubis",
                                "Anuket",
                                "Aphrodite",
                                "Apollo",
                                "Apophis",
                                "Apsu",
                                "Aranyani",
                                "Arawn",
                                "Archimedes",
                                "Arduinna",
                                "Artemis",
                                "Artio",
                                "Aruna",
                                "Aryaman",
                                "Asclepius",
                                "Asherah",
                                "Ashur",
                                "Astarte",
                                "Astraeus",
                                "Asura",
                                "Aten",
                                "Atlaua",
                                "Atum",
                                "Aurora",
                                "Baal",
                                "Babi",
                                "Bacabs",
                                "Bacchus",
                                "Badb",
                                "Balarama",
                                "Baldur",
                                "Baraka",
                                "Baron Samedi",
                                "Barra",
                                "Bastarnae",
                                "Bastet",
                                "Bat",
                                "Batara",
                                "Bathala",
                                "Bau",
                                "Bel",
                                "Belenus",
                                "Belet-seri",
                                "Bellerophon",
                                "Bellona",
                                "Belobog",
                                "Bendis",
                                "Bennu",
                                "Benzaiten",
                                "Beowulf",
                                "Berehynia",
                                "Bes",
                                "Bestla",
                                "Beyla",
                                "Bhairava",
                                "Bhavani",
                                "Bhumi",
                                "Bia",
                                "Biafra",
                                "Binbōgami",
                                "Bishamon",
                                "Bishamonten",
                                "Bixia",
                                "Boann",
                                "Bona Dea",
                                "Bonus Eventus",
                                "Bor",
                                "Borr",
                                "Bragi",
                                "Brahma",
                                "Brahmani",
                                "Bran",
                                "Branwen",
                                "Bresal",
                                "Brigid",
                                "Brigit",
                                "Brihaspati",
                                "Britomartis",
                                "Brizo",
                                "Bubona",
                                "Buchis",
                                "Buddha",
                                "Bumba",
                                "Byggvir",
                                "Cailleach",
                                "Caishen",
                                "Calliope",
                                "Calypso",
                                "Camael",
                                "Camazotz",
                                "Camulus",
                                "Candi",
                                "Cangjie",
                                "Canope",
                                "Cardea",
                                "Carmenta",
                                "Castor",
                                "Centeotl",
                                "Cernunnos",
                                "Cerridwen",
                                "Ceto",
                                "Chac",
                                "Chamunda",
                                "Chandra",
                                "Chang'e",
                                "Changxi",
                                "Charites",
                                "Charon",
                                "Chemosh",
                                "Chepi",
                                "Chernobog",
                                "Cherubim",
                                "Chhaya",
                                "Chinnamasta",
                                "Chione",
                                "Chirakan",
                                "Chiron",
                                "Chloe",
                                "Chukwu",
                                "Chulainn",
                                "Cian",
                                "Circe",
                                "Cizin",
                                "Clementia",
                                "Cleon",
                                "Clio",
                                "Cloacina",
                                "Clíona",
                                "Coatlicue",
                                "Coeus",
                                "Concordia",
                                "Consus",
                                "Copia",
                                "Cotys",
                                "Coventina",
                                "Coyote",
                                "Crius",
                                "Crom Cruach",
                                "Cronus",
                                "Culsans",
                                "Cunomaglus",
                                "Cupid",
                                "Cybele",
                                "Cymede",
                                "Akkerman",
                                "Alhambra",
                                "Alnwick",
                                "Babylon",
                                "Bamburgh",
                                "Belvoir",
                                "Berezhany",
                                "Bilhorod",
                                "Blarney",
                                "Bodiam",
                                "Bran",
                                "Brody",
                                "Carcassonne",
                                "Chambord",
                                "Chevaliers",
                                "Chillon",
                                "Conwy",
                                "Dobromyl",
                                "Dover",
                                "Dubrovnik",
                                "Edinburgh",
                                "Eilean Donan",
                                "Heidelberg",
                                "Himeji",
                                "Isiaslav",
                                "Kaffa",
                                "Kilkenny",
                                "Leeds",
                                "London",
                                "Lutsk",
                                "Mangup",
                                "Matsumoto",
                                "Mont",
                                "Olseko",
                                "Osaka",
                                "Palanok",
                                "Pena",
                                "Persepolis",
                                "Petra",
                                "Pissa",
                                "Prague",
                                "Rosenborg",
                                "Stirling",
                                "Tikal",
                                "Toledo",
                                "Warwick",
                                "Windsor",
                                "York",
                                "Zolochiv",
                                "Bender",
                                "Bowser",
                                "Cirno",
                                "Cookie Monster",
                                "Diddy",
                                "Donkey Kong",
                                "Eggman",
                                "Einstein",
                                "Fawful",
                                "Ganondorf",
                                "Grand Dad",
                                "Homer",
                                "Hussein",
                                "Jeffrey",
                                "Kanye",
                                "Lebron",
                                "Leshawna",
                                "Mason",
                                "Mewton",
                                "Parappa",
                                "Nyan",
                                "Pewdiepie",
                                "Shrek",
                                "Trump",
                                "Wart",
                                "Alpha",
                                "Baddie",
                                "Bofa",
                                "Bruh Moment",
                                "Cheese Block",
                                "Cryptobro",
                                "eeffoC",
                                "Hydrogen Bomb",
                                "Iron Block",
                                "IRS",
                                "Mafia Boss",
                                "Nothing",
                                "Sigma",
                                "Tuff",
                                "Weezer",
                                "Zip Bomb",
                                " Fumo",
                                "GIGA ",
                                "John ",
                                "King ",
                                "My Chud ",
                                " NEO",
                                "Queen ",
                                "Skibidi ",
                                "The Original ",
                                " The Undying",
                                "Uncanny ",
                                ".EXE",
                                "Alastor",
                                //"Ares",
                                "Astradhur",
                                "Callum",
                                "Christaire",
                                "Droukar",
                                "Eratosthenes",
                                "Galileo",
                                "Geofridus",
                                "Gervaise",
                                "Guillermo",
                                "Hades",
                                "Hasselhoff",
                                "Helios",
                                "Herschel",
                                "Kohntarkosz",
                                "Konstanze",
                                "Lavoisier",
                                "Maleficum",
                                "Maxwell",
                                "Maynard",
                                "Newton",
                                "Reimund",
                                "Saulazar",
                                "Spiegel",
                                "Tephania",
                                "Weiss"
                            ], n);
                        default: return ['God'];
                    }
                },

                randomLore: function() {
                    return choose([
                        //"3 + 9 = 4 * 3 = 12",
                        //"You are inside of a time loop.",
                        //"There are six major wars.",
                        //"You are inside of the 6th major war.",
                        //"AWP-39 was re-assembled into the Redistributor.",
                        //"The world quakes when the Destroyers assemble.",
                        //"Certain polygons can pull you away from the world you know.",
                        "There are seven mass extinctions.",
                        "You are experiencing the 5th mass extinction.",
                        "The Moon's children are typically docile, but it's best not to mess around with them.",
                        "A rogue Moon Rabbit lurks in the shadows…",
                        "Don't stare directly at the Sun. He will not take it kindly.",
                        "The universe is nestled in the antlers of the Kugelblitz."
                    ]);
                },

                randomHexColor: function () {
                    return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
                }
            }
            break;
        case "./lib/fasttalk":
            const u32 = new Uint32Array(1),
                c32 = new Uint8Array(u32.buffer),
                f32 = new Float32Array(u32.buffer),
                u16 = new Uint16Array(1),
                c16 = new Uint8Array(u16.buffer);
            let encode = function(message) {
                let headers = [],
                    headerCodes = [],
                    contentSize = 0,
                    lastTypeCode = 0b1111,
                    repeatTypeCount = 0;
                for (let block of message) {
                    let typeCode = 0;
                    if (block === 0 || block === false) typeCode = 0b0000;
                    else if (block === 1 || block === true) typeCode = 0b0001;
                    else if (typeof block === "number") {
                        if (!Number.isInteger(block) || block < -0x100000000 || block >= 0x100000000) {
                            typeCode = 0b1000;
                            contentSize += 4;
                        } else if (block >= 0) {
                            if (block < 0x100) {
                                typeCode = 0b0010;
                                contentSize++;
                            } else if (block < 0x10000) {
                                typeCode = 0b0100;
                                contentSize += 2;
                            } else if (block < 0x100000000) {
                                typeCode = 0b0110;
                                contentSize += 4;
                            }
                        } else {
                            if (block >= -0x100) {
                                typeCode = 0b0011;
                                contentSize++;
                            } else if (block >= -0x10000) {
                                typeCode = 0b0101;
                                contentSize += 2;
                            } else if (block >= -0x100000000) {
                                typeCode = 0b0111;
                                contentSize += 4;
                            }
                        }
                    } else if (typeof block === "string") {
                        let hasUnicode = false;
                        for (let i = 0; i < block.length; i++) {
                            if (block.charAt(i) > "\xff") hasUnicode = true;
                            else if (block.charAt(i) === "\x00") {
                                console.error("Null containing string!", block);
                                throw new Error("Null containing string!");
                            }
                        }
                        if (!hasUnicode && block.length <= 1) {
                            typeCode = 0b1001;
                            contentSize++;
                        } else if (hasUnicode) {
                            typeCode = 0b1011;
                            contentSize += block.length * 2 + 2;
                        } else {
                            typeCode = 0b1010;
                            contentSize += block.length + 1;
                        }
                    } else {
                        console.error("Unencodable data type!", block);
                        console.log(JSON.stringify(message), message.indexOf(block))
                        throw new Error("Unencodable data type!");
                    }
                    headers.push(typeCode);
                    if (typeCode === lastTypeCode) repeatTypeCount++;
                    else {
                        headerCodes.push(lastTypeCode);
                        if (repeatTypeCount >= 1) {
                            while (repeatTypeCount > 19) {
                                headerCodes.push(0b1110);
                                headerCodes.push(15);
                                repeatTypeCount -= 19;
                            }
                            if (repeatTypeCount === 1) headerCodes.push(lastTypeCode);
                            else if (repeatTypeCount === 2) headerCodes.push(0b1100);
                            else if (repeatTypeCount === 3) headerCodes.push(0b1101);
                            else if (repeatTypeCount < 20) {
                                headerCodes.push(0b1110);
                                headerCodes.push(repeatTypeCount - 4);
                            }
                        }
                        repeatTypeCount = 0;
                        lastTypeCode = typeCode;
                    }
                }
                headerCodes.push(lastTypeCode);
                if (repeatTypeCount >= 1) {
                    while (repeatTypeCount > 19) {
                        headerCodes.push(0b1110);
                        headerCodes.push(15);
                        repeatTypeCount -= 19;
                    }
                    if (repeatTypeCount === 1) headerCodes.push(lastTypeCode);
                    else if (repeatTypeCount === 2) headerCodes.push(0b1100);
                    else if (repeatTypeCount === 3) headerCodes.push(0b1101);
                    else if (repeatTypeCount < 20) {
                        headerCodes.push(0b1110);
                        headerCodes.push(repeatTypeCount - 4);
                    }
                }
                headerCodes.push(0b1111);
                if (headerCodes.length % 2 === 1) headerCodes.push(0b1111);
                let output = new Uint8Array((headerCodes.length >> 1) + contentSize);
                for (let i = 0; i < headerCodes.length; i += 2) {
                    let upper = headerCodes[i],
                        lower = headerCodes[i + 1];
                    output[i >> 1] = (upper << 4) | lower;
                }
                let index = headerCodes.length >> 1;
                for (let i = 0; i < headers.length; i++) {
                    let block = message[i];
                    switch (headers[i]) {
                        case 0b0000:
                        case 0b0001:
                            break;
                        case 0b0010:
                        case 0b0011:
                            output[index++] = block;
                            break;
                        case 0b0100:
                        case 0b0101:
                            u16[0] = block;
                            output.set(c16, index);
                            index += 2;
                            break;
                        case 0b0110:
                        case 0b0111:
                            u32[0] = block;
                            output.set(c32, index);
                            index += 4;
                            break;
                        case 0b1000:
                            f32[0] = block;
                            output.set(c32, index);
                            index += 4;
                            break;
                        case 0b1001: {
                            let byte = block.length === 0 ? 0 : block.charCodeAt(0);
                            output[index++] = byte;
                        }
                            break;
                        case 0b1010:
                            for (let i = 0; i < block.length; i++) output[index++] = block.charCodeAt(i);
                            output[index++] = 0;
                            break;
                        case 0b1011:
                            for (let i = 0; i < block.length; i++) {
                                let charCode = block.charCodeAt(i);
                                output[index++] = charCode & 0xff;
                                output[index++] = charCode >> 8;
                            }
                            output[index++] = 0;
                            output[index++] = 0;
                            break;
                    }
                }
                return output;
            };
            let decode = function(packet) {
                let data = new Uint8Array(packet);
                if (data[0] >> 4 !== 0b1111) return null;
                let headers = [],
                    lastTypeCode = 0b1111,
                    index = 0,
                    consumedHalf = true;
                while (true) {
                    if (index >= data.length) return null;
                    let typeCode = data[index];
                    if (consumedHalf) {
                        typeCode &= 0b1111;
                        index++;
                    } else typeCode >>= 4;
                    consumedHalf = !consumedHalf;
                    if ((typeCode & 0b1100) === 0b1100) {
                        if (typeCode === 0b1111) {
                            if (consumedHalf) index++;
                            break;
                        }
                        let repeat = typeCode - 10;
                        if (typeCode === 0b1110) {
                            if (index >= data.length) return null;
                            let repeatCode = data[index];
                            if (consumedHalf) {
                                repeatCode &= 0b1111;
                                index++;
                            } else repeatCode >>= 4;
                            consumedHalf = !consumedHalf;
                            repeat += repeatCode;
                        }
                        for (let i = 0; i < repeat; i++) headers.push(lastTypeCode);
                    } else {
                        headers.push(typeCode);
                        lastTypeCode = typeCode;
                    }
                }
                let output = [];
                for (let header of headers) {
                    switch (header) {
                        case 0b0000:
                            output.push(0);
                            break;
                        case 0b0001:
                            output.push(1);
                            break;
                        case 0b0010:
                            output.push(data[index++]);
                            break;
                        case 0b0011:
                            output.push(data[index++] - 0x100);
                            break;
                        case 0b0100:
                            c16[0] = data[index++];
                            c16[1] = data[index++];
                            output.push(u16[0]);
                            break;
                        case 0b0101:
                            c16[0] = data[index++];
                            c16[1] = data[index++];
                            output.push(u16[0] - 0x10000);
                            break;
                        case 0b0110:
                            c32[0] = data[index++];
                            c32[1] = data[index++];
                            c32[2] = data[index++];
                            c32[3] = data[index++];
                            output.push(u32[0]);
                            break;
                        case 0b0111:
                            c32[0] = data[index++];
                            c32[1] = data[index++];
                            c32[2] = data[index++];
                            c32[3] = data[index++];
                            output.push(u32[0] - 0x100000000);
                            break;
                        case 0b1000:
                            c32[0] = data[index++];
                            c32[1] = data[index++];
                            c32[2] = data[index++];
                            c32[3] = data[index++];
                            output.push(f32[0]);
                            break;
                        case 0b1001: {
                            let byte = data[index++];
                            output.push(byte === 0 ? "" : String.fromCharCode(byte));
                        }
                            break;
                        case 0b1010: {
                            let string = "",
                                byte = 0;
                            while ((byte = data[index++])) string += String.fromCharCode(byte);
                            output.push(string);
                        }
                            break;
                        case 0b1011: {
                            let string = "",
                                byte = 0;
                            while ((byte = data[index++] | (data[index++] << 8))) string += String.fromCharCode(byte);
                            output.push(string);
                        }
                            break;
                    }
                }
                return output;
            };
            return {
                encode,
                decode
            }
            break;
    }
}




// THE SERVER //

async function startServer(configSuffix, defExports, displyNameOverride, displayDescOverride, maxPlayersOverride, botAmountOverride) {
    configSuffix = configSuffix || "4tdm.json"
    //configSuffix = "blackout4tdm.json" 
    /*jslint node: true */
    /*jshint -W061 */
    /*global Map*/
    // TO CONSIDER: Tweak how entity physics work (IE: When two entities collide, they push out from the center. This would allow stuff like "bullet ghosting" to happen, making certain UP tanks viable.)
    // TO DO: Give bosses name colors via a NAME_COLOR attribute and/or colored broadcasts, fix this.usesAltFire, fix bugs with zoom cooldown, fix FFA_RED overriding custom bullet colors
    // Basic defaults in case of error
    var performance = performance || Date;
    let entries = []

    // Rivet
    let rivetToken = process.env.RIVET_TOKEN ? process.env.RIVET_TOKEN : process.env.RIVET_DEV_TOKEN

    /*const Rivet = require("@rivet-gg/api")
    let rivet = new Rivet.RivetClient({
        token: rivetToken
    })*/
    if (process.env.RIVET_TOKEN) {
        global.isVPS = true
    }

    if (global.isVPS) rivet.matchmaker.lobbies.ready().catch((e) => { console.log(e); console.log("Rivet matchmaker not ready, exiting.."); process.exit(1) });


    // Maintain Global.ServerStats
    global.serverStats = {
        cpu: 0,
        mem: 0
    }

    // Modify "Map" to improve it for our needs.
    Map.prototype.filter = function(callback) {
        let output = [];
        this.forEach((object, index) => {
            if (callback(object, index)) {
                output.push(object);
            }
        });
        return output;
    }

    Map.prototype.find = function(callback) {
        let output;
        for (let [key, value] of this) {
            if (callback(value, key)) {
                output = value;
                break;
            }
        }
        return output;
    }
    let i = 0;
    class HashGrid {
        constructor(cellShift = 6) {
            this.grid = new Map();
            this.currentQuery = 0;
            this.cellShift = cellShift;
            this._resultPool = [];
        }

        clear() {
            this.grid.clear();
            this.currentQuery = 0;
        }

        insert(object) {
            const startX = object._AABB.x1 >> this.cellShift;
            const startY = object._AABB.y1 >> this.cellShift;
            const endX = object._AABB.x2 >> this.cellShift;
            const endY = object._AABB.y2 >> this.cellShift;

            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const key = (x << 16) | (y & 0xFFFF); // inlined for speed
                    const cell = this.grid.get(key);
                    if (cell) {
                        cell.push(object);
                    } else {
                        this.grid.set(key, [object]);
                    }
                }
            }
        }

        getCell(x, y) {
            const key = ((x >> this.cellShift) << 16) | ((y >> this.cellShift) & 0xFFFF);
            return this.grid.get(key);
        }

        getCollisions(object, optFunct) {
            const result = this._resultPool;
            result.length = 0;

            const startX = object._AABB.x1 >> this.cellShift;
            const startY = object._AABB.y1 >> this.cellShift;
            const endX = object._AABB.x2 >> this.cellShift;
            const endY = object._AABB.y2 >> this.cellShift;

            const objectId = object.id;

            // Fast path for 1x1, 2x1, or 1x2 spans
            if (startX === endX && startY === endY) {
                const key = (startX << 16) | (startY & 0xFFFF);
                const cell = this.grid.get(key);
                if (cell) this._processCell(cell, object, objectId, result, optFunct);
            } else {
                for (let y = startY; y <= endY; y++) {
                    for (let x = startX; x <= endX; x++) {
                        const key = (x << 16) | (y & 0xFFFF);
                        const cell = this.grid.get(key);
                        if (cell) {
                            this._processCell(cell, object, objectId, result, optFunct);
                        }
                    }
                }
            }

            this.currentQuery = (this.currentQuery + 1) >>> 0;
            return result;
        }

        _processCell(cell, object, objectId, result, optFunct) {
            // Unroll the loop here for small cell sizes
            const currentQuery = this.currentQuery;
            const cellLength = cell.length;

            // Unroll for small numbers of objects in the cell
            if (cellLength === 1) {
                this._checkCollision(cell[0], object, objectId, result, optFunct, currentQuery);
            } else if (cellLength === 2) {
                this._checkCollision(cell[0], object, objectId, result, optFunct, currentQuery);
                this._checkCollision(cell[1], object, objectId, result, optFunct, currentQuery);
            } else if (cellLength === 3) {
                this._checkCollision(cell[0], object, objectId, result, optFunct, currentQuery);
                this._checkCollision(cell[1], object, objectId, result, optFunct, currentQuery);
                this._checkCollision(cell[2], object, objectId, result, optFunct, currentQuery);
            } else {
                // Fallback to a general loop for larger cell sizes
                for (let i = 0; i < cellLength; i++) {
                    this._checkCollision(cell[i], object, objectId, result, optFunct, currentQuery);
                }
            }
        }

        // Collision check helper (to avoid redundant code)
        _checkCollision(other, object, objectId, result, optFunct, currentQuery) {
            if (other._AABB.currentQuery === currentQuery) return;
            const a = object._AABB, b = other._AABB;
            b.currentQuery = currentQuery;

            // Hit detection logic
            if (other.id !== objectId && !(a.x1 > b.x2 || a.x2 < b.x1 || a.y1 > b.y2 || a.y2 < b.y1)) {
                if (optFunct) {
                    optFunct(other);
                } else {
                    result.push(other);
                }
            }
        }

        getAABB(object) {
            const size = object.realSize || object.size || object.radius || 1;
            const width = (object.width || 1) * size;
            const height = (object.height || 1) * size;
            return {
                x1: object.x - width,
                y1: object.y - height,
                x2: object.x + width,
                y2: object.y + height,
                currentQuery: -1
            };
        }
    }



    let tokendata = {};

    const webhooks = (function() {
        const https = require("https");
        let private_ = {
            keys: {
                // USA
                "a": "/api/webhooks/1018582651147403284/pPuQBkSl7hSF5M3L9mBefvQf7ahDyi85kz2KGIuQm8FhS3FrjxYk9kuqLrCuheDL7Elk",
                "b": "/api/webhooks/1018583149820793012/2TnWYuqkDY6A7BuwNyjSK0em3TKeAh66lqkvDASjv1gyCv5dX11WkpPMP8gL0zSVjIAD",
                "c": "/api/webhooks/1018583275696042104/5I9n1nMk4eX5s0em4_agAIAC6LvDTX48SEzdHr2pzgtuanEbIhLaF0ZnGKWrV8RBcvON",
                "d": "/api/webhooks/1018583494131204117/j_I04EKhk9GcsBOEzYAXa9wQpgi9wQYCaXLLKMpnzD5VdynBPu9GJ9Pu_RXwEPt055QW",
                // Europe
                "e": "/api/webhooks/1018584313496862812/S8n17RJAa0NCgCTT-8IznuxRLtBbHthi3nAwEk1Kuo3JLrCzIsTBGIlD1IrBP55toX2u",
                "f": "/api/webhooks/1018584491591225355/hBvJrFWvKzMIAMUznSbL2DL4HtYD_1aEokJQW_PUfgpES8q0gUlpOvfgabacfP1h26KU",
                "g": "/api/webhooks/1018584955988742144/sfS1STjH5u5kIdwfVpdrVAk8tEXTKMuBjOS6fDNaZ4JfaqJDAzN3wWDRtOMuen5Wdreg",
                "h": "/api/webhooks/1018585088872693820/17Ns87ftXylRrL9GinGWxp-1Ka-0WhmZaFvePq3GQQdccjvz2E6-KxyQoK8Lnhb5Lryv",
                // ASIA
                "j": "/api/webhooks/1018588607017123950/xoF2920rrUXlcIJawiLETDwCrM6WZPs0EZxfTVvbu0fXsJ_7N_vQ5Gpjsqnm7PiMKX1y",
                "v": "/api/webhooks/1018588802668838963/lpjrCg7P2M9HvCuH0LfExb0qPe7f9K1G7QdXUugZDhp8dsGtZwuY0-xew9_dFZIaJ_uw",
                "w": "/api/webhooks/1018585281869393992/0aNkN6KQZUGZud31Wq50NeXRbkUeRAcMDx6qX-bxpV7yZa8DDOcE1wi1ZLbRC_P5pKHR",
                "x": "/api/webhooks/1018585430146433095/6xZNBJOPnQmf1vDXsaP292JAMya6Qa2H08sSss2fh4DTX9y1lK3iAIgBfJ_4lgUsERJJ",
                // Alternate
                "y": "/api/webhooks/1018585598749065286/WmKkHdcFxD4QYjNxAV43khqk71ld4jtuKShaOjcF6AUj8X00WjSUaEp5yEjga8K646QO",

                // Localhost
                "z": "/api/webhooks/1018585818631250111/1gxDTNmkivDgA-oeK4K31PlYtNvuV4aKM1ahT82hZob4PXQfqQ8TllwkSluouldPROvD",
                // Fallback
                "default": "/api/webhooks/1018587345747984424/5289v5gyzDtRrYCZzP7XYNsOiTyxovIdvFwCFqf7ZsR0Hz8A9L9XDoFjkyywDKwX2yRB"
            },
            buffer: '',
            queue: [],
            lastSend: 0,
            send(data) {
                let path = private_.keys[process.env.HASH || "z"] || private_.keys.default;
                let req = https.request({
                    hostname: 'discordapp.com',
                    path,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }, () => { });
                req.write(JSON.stringify({
                    content: data.trim()
                }));
                req.end();
            },
            publish(force) {
                let output = "";
                if (private_.queue.length < 3 && Date.now() - private_.lastSend < 10000 && !force) {
                    return;
                }
                private_.lastSend = Date.now();
                while (private_.queue.length > 0) {
                    if (output + "\n" + private_.queue[0] > 2000) {
                        private_.send(output);
                        return;
                    }
                    output += "\n" + private_.queue.shift();
                }
                private_.send(output);
            },
            log(data, force) {
                data = data + "";
                data = data.replace("@", "🤓");
                data = data.trim();
                if (data.length > 2000) {
                    while (data.length) {
                        private_.send(data.slice(0, 2000).trim());
                        data = data.slice(2000).trim();
                    }
                    return;
                }
                private_.queue.push(data);
                if (force) {
                    private_.publish(true);
                }
            }
        };
        //setInterval(private_.publish, 5000);
        return {
            log: (data, force) => {
                //private_.log('[' + util.getLogTime() + ']: ' + data, force);
            }
        }
    })();
    const util = require("./lib/util");
    /**
 * Expert-level, high-performance collection optimized for ultra-hot paths.
 *
 * It achieves O(1) for get, set, and delete operations by making a critical trade-off:
 * IT DOES NOT PRESERVE INSERTION ORDER.
 *
 * - Uses a dense array for data storage, enabling the fastest possible iteration.
 * - Uses an index map for O(1) key-to-position lookups.
 * - Uses the "swap and pop" pattern for O(1) deletion.
 *
 * This is for workloads where performance is the only priority and order is irrelevant.
 */
    function Chainf() {
        this._entries = []; // Dense array of [key, value] pairs for fast iteration
        this._keyToIndex = new Map(); // The index: key -> array index
    }

    Object.defineProperty(Chainf.prototype, 'length', {
        get: function() { return this._entries.length; },
        enumerable: true,
        configurable: true
    });

    Chainf.prototype.set = function(key, value) {
        const index = this._keyToIndex.get(key);
        if (index !== undefined) {
            // Key already exists, just update the value. O(1)
            this._entries[index][1] = value;
        } else {
            // New key. Add to the end. O(1)
            const newIndex = this._entries.length;
            this._entries.push([key, value]);
            this._keyToIndex.set(key, newIndex);
        }
        return this;
    }

    Chainf.prototype.get = function(key) {
        const index = this._keyToIndex.get(key);
        if (index !== undefined) {
            return this._entries[index][1];
        }
        return undefined;
    }

    Chainf.prototype.has = function(key) {
        return this._keyToIndex.has(key);
    }

    // THE CROWN JEWEL: O(1) DELETION
    Chainf.prototype.delete = function(key) {
        const indexToDelete = this._keyToIndex.get(key);

        // Key not found, nothing to do.
        if (indexToDelete === undefined) {
            return false;
        }

        // 1. Get the last entry in the array.
        const lastEntry = this._entries[this._entries.length - 1];
        const lastKey = lastEntry[0];

        // 2. Move the last entry into the place of the one being deleted.
        this._entries[indexToDelete] = lastEntry;

        // 3. Update the index map for the moved entry.
        this._keyToIndex.set(lastKey, indexToDelete);

        // 4. Remove the key being deleted from the index.
        this._keyToIndex.delete(key);

        // 5. Pop the last entry (which is now a duplicate). This is O(1).
        this._entries.pop();

        return true;
    }

    Chainf.prototype.clear = function() {
        this._entries = [];
        this._keyToIndex.clear();
        return this;
    }

    // Iteration methods now benefit from the dense array structure.
    // They are as fast as they can possibly be.

    Chainf.prototype.forEach = function(callback) {
        const entries = this._entries;
        for (let i = 0, len = entries.length; i < len; i++) {
            const entry = entries[i];
            callback(entry[1], entry[0], i); // callback(value, key, i)
        }
        return this;
    }

    Chainf.prototype.map = function(callback) {
        const results = [];
        const entries = this._entries;
        for (let i = 0, len = entries.length; i < len; i++) {
            const entry = entries[i];
            results.push(callback(entry[1], entry[0], i));
        }
        return results;
    }

    Chainf.prototype.filterToChain = function(callback) {
        const entries = this._entries;
        const keyToIndex = this._keyToIndex;
        // Iterate backwards when deleting to avoid index-shifting issues
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            if (!callback(entry[1], entry[0], i)) {
                // Since we're iterating backwards, the last element is at `entries.length - 1`.
                // The "swap and pop" logic simplifies.
                const lastEntry = entries.pop(); // O(1)
                const lastKey = lastEntry[0];
                const currentKey = entry[0];

                // If the element to delete wasn't the last one...
                if (i < entries.length) {
                    entries[i] = lastEntry; // Move last into current spot
                    keyToIndex.set(lastKey, i); // Update index for moved entry
                }
                keyToIndex.delete(currentKey); // Delete the original key
            }
        }
        return this;
    }

    Chainf.prototype[Symbol.iterator] = function() {
        let index = 0;
        const entries = this._entries;
        return {
            next: function() {
                if (index < entries.length) {
                    // Return just the value, as is standard for collection iterators
                    return { value: entries[index++][1], done: false };
                }
                return { value: undefined, done: true };
            }
        };
    }

    const Chain = Chainf;
    for (let key of ["log", "warn", "info", "spawn", "error"]) {
        const _oldUtilLog = util[key];
        util[key] = function(text, force) {
            webhooks.log(text, force);
            return _oldUtilLog(text);
        }
    }
    /*function loadWASM() {
        const Module = require("./wasm.js");
        return new Promise((resolve) => {
            let e = setInterval(function () {
                if (Module.ready) {
                    clearInterval(e);
                    resolve(Module);
                }
            }, 5);
        });
    }*/
    global.utility = util;
    global.minifyModules = true;
    function getApiJazz() {
        let apiEvent = { on: () => { } }
        let apiConnection;
        async function connectToApi(c) {
            apiConnection = { talk: () => { } }//new WebSocket(`${c.api_ws_url}/${process.env.API_CONNECTION_KEY}`)
            return {
                apiConnection, apiEvent
            }
        }
        function getApiStuff() {
            return {
                apiConnection,
                apiEvent
            }
        }
        return {
            connectToApi,
            getApiStuff
        }
    }

    let apiJs = getApiJazz();
    let api = apiJs.getApiStuff()
    let forcedProfile = false;
    api.apiEvent.on("forcedProfile", (data) => {
        forcedProfile = data.data
    })
    async function getForcedProfile() {
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (forcedProfile !== false) {
                    clearInterval(interval);
                    resolve();
                }
            });
        });
    }

    api.apiEvent.on("tokenData", (data) => {
        tokendata = data.data
    });

    (async () => {
        //const WASMModule = await loadWASM();

        let serverPrefix;
        //global.c = require("./configs/sterilize.js")(`config`),
        api = await apiJs.connectToApi(/*c*/)
        if (process.argv[2]) {
            serverPrefix = configSuffix
            console.log(`Forcing server prefix to ${configSuffix}`)
        } else {
            try {
                console.log("Server is supposed to be online. Loading profile", configSuffix);
                serverPrefix = `-${configSuffix}`;

            } catch (e) {
                console.error(e)
                console.log("Couldn't load from API. Terminating.");
                if (global.isVPS) process.exit();
            }
        }

        let baseConfig = {
            "host": "0.0.0.0",
            "api_url": "https://woomy-api.glitch.me",
            "api_ws_url": "wss://woomy-api.glitch.me",
            "servesStatic": true,
            "mockupChunkLength": 200,
            "port": 3001,
            "restarts": {
                "enabled": false,
                "interval": 14401
            },
            "networkUpdateFactor": 24,
            "socketWarningLimit": 5,
            "tabLimit": 1,
            "strictSingleTab": true,
            "maxPlayers": 999,
            "MINIMUM_PERMISSIONS": 0,
            "networkFrontlog": 1,
            "networkFallbackTime": 150,
            "visibleListInterval": 38,
            "gameSpeed": 1,
            "runSpeed": 1.75,
            "maxHeartbeatInterval": 1000,
            "verbose": true,
            "WIDTH": 6500,
            "HEIGHT": 6500,
            "connectionLimit": 999,
            "MODE": "ffa",
            "modes": [],
            "serverName": "Free For All",
            "TEAM_AMOUNT": 2,
            "RANDOM_COLORS": false,
            "RANDOM_TEAMS": false,
            "BOSS_SPAWN_TIMER": 2000,
            "IS_HELL": false,
            "PORTALS": {
                "ENABLED": false,
                "TANK_FORCE": 3000,
                "TANK_DAMP": 4000,
                "BOSS_FORCE": 12500,
                "DIVIDER_1": {
                    "ENABLED": true,
                    "LEFT": 2979,
                    "RIGHT": 3521
                },
                "DIVIDER_2": {
                    "ENABLED": true,
                    "TOP": 2979,
                    "BOTTOM": 3521
                }
            },
            "MAZE": {
                "ENABLED": false,
                "cellSize": 150,
                "stepOneSpacing": 3,
                "fillChance": 0.33,
                "sparedChance": 0.65,
                "cavey": false,
                "lineAmount": false,
                "margin": 0,
                "posMulti": 0.25
            },
            "BANNED_CHARACTER_REGEX": "/[\uFDFD\u200E\u0000]/gi",
            "ROOM_SETUP": [
                ["roid", "norm", "norm", "norm", "rock", "norm", "norm", "norm", "rock", "rock", "norm", "norm", "norm", "rock", "norm", "norm", "norm", "roid"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["norm", "norm", "norm", "rock", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "rock", "norm", "norm", "norm"],
                ["rock", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "rock"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "roid", "nest", "nest", "nest", "nest", "roid", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "nest", "nest", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["rock", "norm", "norm", "norm", "norm", "nest", "nest", "nest", "roid", "roid", "nest", "nest", "nest", "norm", "norm", "norm", "norm", "rock"],
                ["rock", "norm", "norm", "norm", "norm", "nest", "nest", "nest", "roid", "roid", "nest", "nest", "nest", "norm", "norm", "norm", "norm", "rock"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "nest", "nest", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "roid", "nest", "nest", "nest", "nest", "roid", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["rock", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "rock"],
                ["norm", "norm", "norm", "rock", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "rock", "norm", "norm", "norm"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
                ["roid", "norm", "norm", "norm", "rock", "norm", "norm", "norm", "rock", "rock", "norm", "norm", "norm", "rock", "norm", "norm", "norm", "roid"]
            ],
            "X_GRID": 18,
            "Y_GRID": 18,
            "DAMAGE_CONSTANT": 1,
            "KNOCKBACK_CONSTANT": 1.8,
            "BORDER_FORCE": 0.025,
            "OUTSIDE_ROOM_DAMAGE": 0,
            "MAX_SKILL": 9,
            "SOFT_MAX_SKILL": 0.59,
            "REGEN_MULTIPLIER": 0.65,
            "TIER_1": 15,
            "TIER_2": 30,
            "TIER_3": 45,
            "TIER_4": 60,
            "LEVEL_ZERO_UPGRADES": false,
            "SKILL_CAP": 60,
            "SKILL_SOFT_CAP": 0,
            "SKILL_CHEAT_CAP": 60,
            "SKILL_LEAK": 0,
            "STEALTH": 4,
            "MIN_SPEED": Number.MIN_VALUE,
            "MIN_DAMAGE": 0,
            "MAX_FOOD": 400,
            "MAX_COMBINED_NEST_FOOD": 30,
            "MAX_SQUARE_NEST_FOOD": 0,
            "MAX_TRI_NEST_FOOD": 0,
            "MAX_PENTA_NEST_FOOD": 0,
            "MAX_HEXA_NEST_FOOD": 0,
            "MAX_HEPTA_NEST_FOOD": 0,
            "MAX_OCTA_NEST_FOOD": 0,
            "MAX_NONA_NEST_FOOD": 0,
            "MAX_DECA_NEST_FOOD": 0,
            "MAX_CRASHERS": 18,
            "MAX_SANCS": 1,
            "TIME_BETWEEN_SANCS": 900000,
            "EVOLVE_TIME": 90000,
            "EVOLVE_TIME_RAN_ADDER": 210000,
            "EVOLVE_HALT_CHANCE": 0.2,
            "SHINY_CHANCE": 0.00001,
            "SKILL_BOOST": 5,
            "BOTS": 10,
            "GLASS_HEALTH_FACTOR": 1.8,
            "DO_BASE_DAMAGE": true,
            "IS_BOSS_RUSH": false,
            "DISABLE_LEADERBOARD": false,
            "BLACKOUT": false,
            "CANNOT_SHOOT_IN_BASE": true,
            "GAMEMODE_JS": "",
            "DOMINATOR_SHUFFLE_TIMER": 0
        }

        let sterilize = file => {
            try {
                let data = file;
                for (let key in data) {
                    baseConfig[key] = data[key];
                }
            } catch (e) {
                console.log("Failed to load the config using defaults instead...");
            }
            return baseConfig;
        }

        let gamemodeConfig = {};
        let res = undefined;
        if (!fs) {
            res = await fetch("../configs/config-" + configSuffix)
            if (configSuffix.includes(".json")) {
                gamemodeConfig = await res.json()
            } else if (configSuffix.includes(".js")) {
                gamemodeConfig = eval(await res.text())
            } else {
                console.error("Invalid gamemode file type " + configSuffix)
            }
        } else {
            res = fs.readFileSync("./configs/config-" + configSuffix, "utf8")
            if (configSuffix.includes(".json")) {
                gamemodeConfig = JSON.parse(res)
            } else if (configSuffix.includes(".js")) {
                gamemodeConfig = eval(res)
            } else {
                console.error("Invalid gamemode file type " + configSuffix)
            }
        }
        if (gamemodeConfig.selectable === false) {
            worker.postMessage({ type: "serverStartText", text: "This gamemode is not selectable", tip: "Only modded versions of the game can start a Modded server. Please select a different mode." })
            return;
        }
        global.c = sterilize(gamemodeConfig);
        if (c.GAMEMODE_JS) {
            function getCrptFunction() {
                const CONFIG = {
                    usedTanks: 5, // Number of tanks used per generated tank
                    maxChildren: 30, // The overall max children a singluar tank can have
                    labelLength: 16, // The random amount of label per tank to use
                    gunsPerTank: 7, // The max amount of guns to use from each tank
                    turretsPerTank: 2, // The max amount of turrets to use from each tank
                    propsPerTank: 2, // The max amount of props to use from each tank
                }

                let defs = defExports
                defs = Object.entries(defs)

                let maxDefLength = defs.length
                for (let arr of defs) {
                    arr[1].MAX_CHILDREN = CONFIG.maxChildren
                    arr[1].ON_TICK = function(me) {
                        let children = 0;
                        if (me.childrenMap.size) {
                            let entries = [...me.childrenMap.entries()].reverse()
                            for (let v of entries) {
                                children++
                                if (children > CONFIG.maxChildren) {
                                    v[1].kill()
                                    me.childrenMap.delete(v[0])
                                }
                            }
                        }
                    }
                    if (arr[1].GUNS != null) {
                        for (let gun of arr[1].GUNS) {
                            if (gun.PROPERTIES != null) {
                                gun.PROPERTIES.MAX_CHILDREN = CONFIG.maxChildren
                                gun.PROPERTIES.DESTROY_OLDEST_CHILD = true
                            }
                        }
                    }
                }

                return function() {
                    let label = ""
                    let finalTank = defs[Math.random() * defs.length | 0][1]
                    finalTank.GUNS = []
                    finalTank.TURRETS = []
                    finalTank.PROPS = []

                    for (let i = 0; i < CONFIG.usedTanks; i++) {
                        let entity = defs[(Math.random() * maxDefLength | 0)][1]

                        if (entity.LABEL) {
                            let end = Math.random() * entity.LABEL.length | 0
                            if (label.length + end < CONFIG.labelLength) {
                                label += entity.LABEL.substring(0, end)
                            }
                        }

                        if (entity.GUNS) {
                            for (let a = 0; a < CONFIG.gunsPerTank; a++) {
                                let gun = entity.GUNS[(Math.random() * entity.GUNS.length | 0)]
                                if (!gun) continue;
                                if (gun.PROPERTIES) {

                                }
                                finalTank.GUNS.push(gun)
                            }
                        }

                        if (entity.TURRETS) {
                            for (let a = 0; a < CONFIG.turretsPerTank; a++) {
                                let turret = entity.TURRETS[(Math.random() * entity.TURRETS.length | 0)]
                                if (!turret) continue;
                                turret.MAX_CHILDREN = CONFIG.maxChildren
                                if (turret.GUNS != null) {
                                    for (let gun of turret.GUNS) {
                                        if (gun.PROPERTIES != null) {
                                            gun.PROPERTIES.MAX_CHILDREN = CONFIG.maxChildren
                                            gun.PROPERTIES.DESTROY_OLDEST_CHILD = true
                                        }
                                    }
                                }
                                finalTank.TURRETS.push(turret)
                            }
                        }

                        if (entity.PROPS) {
                            for (let a = 0; a < CONFIG.propsPerTank; a++) {
                                let prop = entity.PROPS[(Math.random() * entity.PROPS.length | 0)]
                                if (!prop) continue;
                                finalTank.PROPS.push(prop)
                            }
                        }
                    }

                    finalTank.LABEL = label
                    if (finalTank?.PARENT?.length) finalTank.PARENT[0].CONTROLLERS = []
                    finalTank.CONTROLLERS = []
                    finalTank.TYPE = "tank"
                    finalTank.DIE_AT_LOW_SPEED = false
                    finalTank.DIE_AT_RANGE = false
                    finalTank.INDEPENDANT = true
                    finalTank.HAS_NO_MASTER = true
                    finalTank.ACCEPTS_SCORE = true
                    finalTank.CAN_BE_ON_LEADERBOARD = true
                    finalTank.GOD_MODE = false
                    finalTank.IS_ARENA_CLOSER = false
                    finalTank.PASSIVE = false
                    finalTank.STAT_NAMES = 6 // generic
                    finalTank.SKILL_CAP = [9, 9, 9, 9, 9, 9, 9, 9, 9, 9]
                    finalTank.AI = {}
                    //finalTank.MOTION_TYPE = 'motor'
                    //finalTank.FACING_TYPE = 'toTarget'
                    finalTank.RANDOM_TYPE = 'None'
                    finalTank.MISC_IDENTIFIER = "None"
                    finalTank.MAX_CHILDREN = (CONFIG.usedTanks * CONFIG.gunsPerTank * CONFIG.maxChildren) * 0.5

                    let exportName = `${Date.now()}-${Math.random()}`
                    global.addNewClass(exportName, finalTank)
                    return exportName
                }
            }
            global.gamemodeCode = { generateNewTank: getCrptFunction() }
        }
        webhooks.log("Server initializing!");
        const ran = require("./lib/random");
        global.sandboxRooms = [];
        Array.prototype.remove = index => {
            if (index === this.length - 1) return this.pop();
            else {
                let r = this[index];
                this[index] = this.pop();
                return r;
            }
        };

        function* chunkar(array, int) {
            for (let i = 0; i < array.length; i += int) {
                yield array.slice(i, i + int);
            }
        };

        class Room {
            constructor(config) {

                if (!global.isVPS) {
                    c.tabLimit = 1e5;
                }

                this.config = config;
                this.width = config.WIDTH;
                this.height = config.HEIGHT;
                this.setup = config.ROOM_SETUP;
                this.xgrid = this.setup[0].length;
                this.ygrid = this.setup.length;
                this.xgridWidth = this.width / this.xgrid;
                this.ygridHeight = this.height / this.ygrid;
                this.lastCycle = undefined;
                this.cycleSpeed = 1000 / c.gameSpeed / 30;
                this.lagComp = 1;
                this.gameMode = config.MODE;
                this.testingMode = c.testingMode;
                this.randomColors = config.RANDOM_COLORS;
                this.speed = c.gameSpeed;
                this.timeUntilRestart = c.restarts.interval;
                this.maxBots = botAmountOverride ?? c.BOTS;
                this.maxFood = config.MAX_FOOD;
                this.maxAllNestFood = config.MAX_NEST_FOOD ?? config.MAX_COMBINED_NEST_FOOD;
                this.maxTriNestFood = config.MAX_TRI_NEST_FOOD;
                this.maxSquareNestFood = config.MAX_SQUARE_NEST_FOOD;
                this.maxPentaNestFood = config.MAX_PENTA_NEST_FOOD;
                this.maxHexaNestFood = config.MAX_HEXA_NEST_FOOD;
                this.maxHeptaNestFood = config.MAX_HEPTA_NEST_FOOD;
                this.maxOctaNestFood = config.MAX_OCTA_NEST_FOOD;
                this.maxNonaNestFood = config.MAX_NONA_NEST_FOOD;
                this.maxDecaNestFood = config.MAX_DECA_NEST_FOOD;
                this.maxCrashers = config.MAX_CRASHERS;
                this.maxSancs = config.MAX_SANCS;
                this.skillBoost = config.SKILL_BOOST;
                this.topPlayerID = -1;
                this.displayName = displyNameOverride || config.displayName || "";
                this.displayDesc = displayDescOverride || config.displayDesc || "";
                this.arenaClosed = false;
                this.teamAmount = c.TEAM_AMOUNT;
                this.modelMode = c.modelMode;
                this.census = {
                    crasher: 0,
                    miniboss: 0,
                    naturalMiniboss: 0,
                    tank: 0,
                    sancs: 0
                };
                this.bossTimer = 0;
                this.bossRush = c.serverName === "Boss Rush" || config.ISSIEGE || config.IS_BOSS_RUSH;
                this.bossRushOver = false;
                this.bossRushWave = 0;
                this.bossRushMaxIncrement = 0;
                this.bossRushMinIncrement = 0;
                this.bossString = "";
                this.motherships = [];
                this.nextTagBotTeam = [];
                this.defeatedTeams = [];
                this.wallCollisions = [];
                this.cardinals = [
                    ["NW", "Northern", "NE"],
                    ["Western", "Center", "Eastern"],
                    ["SW", "Southern", "SE"]
                ];
                this.cellTypes = (() => {
                    const output = ["norm", "rock", "roid", "port", "wall", "door", "edge", "domi", "outb", "door", "bosp"];
                    nestList[1].forEach(n => output.push(n));
                    for (let i = 1; i <= 8; i++) {
                        output.push("bas" + i);
                        output.push("bad" + i);
                        output.push("n_b" + i);
                        output.push("dom" + i);
                        output.push("mot" + i);
                        output.push("spn" + i);
                    }
                    for (let i = 0; i < this.ygrid; i++) {
                        for (let j = 0; j < this.xgrid; j++) {
                            if (!output.includes(this.setup[i][j])) {
                                output.push(this.setup[i][j]);
                            }
                        }
                    }
                    return output;
                })();
                for (let type of this.cellTypes) {
                    this.findType(type);
                }
                this.partyHash = Array(config.TEAM_AMOUNT || 0).fill().map((_, i) => 1000 * (i + 1) + Math.floor(1000 * Math.random()));
                this.blackHoles = [];
                this.scale = {
                    square: this.width * this.height / 100000000,
                    linear: Math.sqrt(c.WIDTH * c.HEIGHT / 100000000)
                };
                this.rankedRoomTicker = 0;
                this.rankedRooms = [];
                this.tagMode = c.serverName.includes("Tag");
                this.mapPoints = [];
                if (c.ARENA_TYPE === 3) {
                    let dist = this.width / 4;
                    for (let i = 0; i < 3; i++) {
                        let angle = (Math.PI * 2 / 3 * i) + Math.PI / 2,
                            x = dist * Math.cos(angle) + this.width / 2,
                            y = dist * Math.sin(angle) + this.width / 2;
                        this.mapPoints.push({ x, y, angle });
                    }
                }
                this.minBetaPerms = config.MINIMUM_PERMISSIONS;
                this.isHell = config.IS_HELL;
            }
            isInRoom(location) {
                return location.x >= 0 && location.x <= this.width && location.y >= 0 && location.y <= this.height;
            }
            findType(type) {
                const output = [];
                for (let i = 0, l = this.setup.length; i < l; i++) {
                    for (let j = 0, k = this.setup[i].length; j < k; j++) {
                        if (this.setup[i][j] === type) {
                            output.push({
                                x: (j + 0.5) * this.width / this.xgrid,
                                y: (i + 0.5) * this.height / this.ygrid,
                                id: j * this.xgrid + i
                            });
                        }
                    }
                }
                this[type] = output;
            }
            setType(type, location) {
                if (!this.isInRoom(location)) {
                    return false;
                }
                const a = ((location.y * this.ygrid) / this.height) | 0;
                const b = ((location.x * this.xgrid) / this.width) | 0;
                const oldType = this.setup[a][b];
                this.setup[a][b] = type;
                this.findType(type);
                this.findType(oldType);
                sockets.broadcastRoom();
            }
            random() {
                return {
                    x: ran.irandom(this.width),
                    y: ran.irandom(this.height)
                }
            }
            near(position, radius) {
                return {
                    x: position.x + ((Math.random() * (radius * 2) | 0) - radius),
                    y: position.y + ((Math.random() * (radius * 2) | 0) - radius)
                }
            }
            randomType(type) {
                if (!this[type] || !this[type].length) {
                    return this.random();
                }
                const selection = this[type][Math.random() * this[type].length | 0];
                return {
                    x: ran.irandom(this.width / this.xgrid) + selection.x - (.5 * this.width / this.xgrid),
                    y: ran.irandom(this.height / this.ygrid) + selection.y - (.5 * this.width / this.xgrid),
                }
            }
            isIn(type, location) {
                if (!this.isInRoom(location)) {
                    return false;
                }
                const a = (location.y * this.ygrid / this.height) | 0;
                const b = (location.x * this.xgrid / this.width) | 0;
                if (!this.setup[a] || !this.setup[a][b]) {
                    return false;
                }
                return type === this.setup[a][b];
            }
            at(location) {
                if (!this.isInRoom(location)) {
                    return "fuck";
                }
                const a = (location.y * this.ygrid / this.height) | 0;
                const b = (location.x * this.xgrid / this.width) | 0;
                if (!this.setup[a] || !this.setup[a][b]) {
                    return "fuck";
                }
                return this.setup[a][b];
            }
            isAt(location) {
                if (!this.isInRoom(location)) {
                    return false;
                }
                const x = (location.x * this.xgrid / this.width) | 0;
                const y = (location.y * this.ygrid / this.height) | 0;
                return {
                    x: (x + .5) / this.xgrid * this.width,
                    y: (y + .5) / this.ygrid * this.height,
                    id: x * this.xgrid + y
                }
            }
            isInNorm(location) {
                if (!this.isInRoom(location)) {
                    return false;
                }
                const a = (location.y * this.ygrid / this.height) | 0;
                const b = (location.x * this.xgrid / this.width) | 0;
                if (!this.setup[a] || !this.setup[a][b]) {
                    return false;
                }
                const v = this.setup[a][b];
                return ("norm" === v) || ("rock" === v) || ("roid" === v) || ("wall" === v) || ("edge" === v);
            }
            gauss(clustering) {
                let output,
                    i = 5;
                do {
                    output = {
                        x: ran.gauss(this.width / 2, this.height / clustering),
                        y: ran.gauss(this.width / 2, this.height / clustering),
                    };
                    i--;
                } while (!this.isInRoom(output) && i > 0);
                return output;
            }
            gaussInverse(clustering) {
                let output,
                    i = 5;
                do {
                    output = {
                        x: ran.gaussInverse(0, this.width, clustering),
                        y: ran.gaussInverse(0, this.height, clustering),
                    };
                    i--;
                } while (!this.isInRoom(output), i > 0);
                return output;
            }
            gaussRing(radius, clustering) {
                let output,
                    i = 5;
                do {
                    output = ran.gaussRing(this.width * radius, clustering);
                    output = {
                        x: output.x + this.width / 2,
                        y: output.y + this.height / 2,
                    };
                    i--;
                } while (!this.isInRoom(output) && i > 0);
                return output;
            }
            gaussType(type, clustering) {
                if (!this[type] || !this[type].length) {
                    return this.random();
                }
                const selection = this[type][Math.random() * this[type].length | 0];
                let location = {},
                    i = 5;
                do {
                    location = {
                        x: ran.gauss(selection.x, this.width / this.xgrid / clustering),
                        y: ran.gauss(selection.y, this.height / this.ygrid / clustering),
                    };
                    i--;
                } while (!this.isIn(type, location) && i > 0);
                return location;
            }
            regenerateObstacles() {
                entities.forEach(entity => (entity.type === "wall" || entity.type === "mazeWall") && entity.kill());
                if (c.MAZE.ENABLED) {
                    global.generateMaze(c.MAZE);
                } else {
                    global.placeObstacles();
                }
            }
            init() {
                if (c.ROOM_SETUP.length !== c.Y_GRID) {
                    util.warn("c.Y_GRID (" + c.ROOM_SETUP.length + ") has conflicts with the current room setup. Please check these configs and relaunch.");
                    process.exit();
                }
                let fail = false;
                for (let i = 0; i < c.ROOM_SETUP.length; i++)
                    if (c.ROOM_SETUP[i].length !== c.X_GRID) fail = true;
                if (fail) {
                    util.warn("c.X_GRID has conflicts with the current room setup. Please check these configs and relaunch.");
                    process.exit();
                }
                util.log(this.width + " x " + this.height + " room initalized. Max food: " + this.maxFood + ". Max crashers: " + this.maxCrashers + ".");
                if (c.restarts.enabled) {
                    let totalTime = c.restarts.interval;
                    setTimeout(() => util.log("Automatic server restarting is enabled. Time until restart: " + this.timeUntilRestart / 7200 + " hours."), 340);
                    setInterval(() => {
                        this.timeUntilRestart--;
                        if (this.timeUntilRestart === 1800 || this.timeUntilRestart === 900 || this.timeUntilRestart === 600 || this.timeUntilRestart === 300) {
                            if (room.bossRush) sockets.broadcast(`WARNING: Tanks have ${this.timeUntilRestart / 60} minutes to defeat the boss rush!`, "#FFE46B");
                            else sockets.broadcast(`WARNING: The server will automatically restart in ${this.timeUntilRestart / 60} minutes!`, "#FFE46B");
                            util.warn(`Automatic restart will occur in ${this.timeUntilRestart / 60} minutes.`);
                        }
                        if (!this.timeUntilRestart) {
                            let reason = room.bossRush ? "Reason: The tanks could only defeat " + this.bossRushWave + "/75 waves" : "Reason: Uptime has reached " + totalTime / 60 / 60 + " hours";
                            util.warn("Automatic server restart initialized! Closing arena...");
                            let toAdd = room.bossRush ? "Tanks have run out of time to kill the bosses!" : c.SPAWN_DOMINATORS ? "No team has managed to capture all of the Dominators! " : c.serverName.includes("Mothership") ? "No team's Mothership has managed to become the last Mothership standing! " : "";
                            sockets.broadcast(toAdd + "Automatic server restart initializing...", "#FFE46B");
                            setTimeout(() => closeArena(), 2500);
                            if (room.bossRush) this.bossRushOver = true;
                        }
                    }, 1000);
                }
                if (c.PORTALS.ENABLED) util.log("Portal mode is enabled.");
                if (this.modelMode) util.warn("Model mode is enabled. This will only allow for you to make and see tank models. No shapes or bosses will spawn, and Basic is the only tank.");
            }
            resize(width, height) {
                this.width = width;
                this.height = height;
                for (let type of this.cellTypes) {
                    this.findType(type);
                }
                this.regenerateObstacles();
                sockets.broadcastRoom();
            }
        }

        if (typeof c["KILL_SCORE_FORMULA"] === "string") {
            util.getJackpot = eval(`x => ${c["KILL_SCORE_FORMULA"]}`);
        }
        const room = new Room(c);
        room.presentNests = nestList[1].filter(t => room[t]?.length);

        // This class is horrible
        // Theres been a long standing NaN bug
        // It naturally spreads
        // Gameplay would be much worse without these safeguards
        // The problem runs deeper than the time I have available
        class Vector {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
            get x() {
                return this.X;
            }
            get y() {
                return this.Y
            }
            set x(value) {
                if (isNaN(value) || value === Infinity || value === -Infinity) {
                    return;
                }
                this.X = value || c.MIN_SPEED;;
            }
            set y(value) {
                if (isNaN(value) || value === Infinity || value === -Infinity) {
                    return;
                }
                this.Y = value || c.MIN_SPEED;;
            }
            null() {
                this.X = c.MIN_SPEED;
                this.Y = c.MIN_SPEED;
            }
            update() {
                this.len = this.length;
                this.dir = this.direction;
            }
            isShorterThan(d) {
                return this.x * this.x + this.y * this.y <= d * d;
            }
            unit() {
                return new Vector(this.x / this.length, this.y / this.length);
            }
            get length() {
                return Math.sqrt(this.x * this.x + this.y * this.y);
            }
            get direction() {
                return Math.atan2(this.y, this.x);
            }
        }

        function newMockups() {
            // Pre-calculate constants
            const PI = Math.PI;
            const PI2 = PI * 2;

            // Defaults applied to every mockup
            const defaults = {
                x: 0,
                y: 0,
                color: 16,
                shape: 0,
                size: 1,
                realSize: 1,
                facing: 0,
                layer: 0,
                statnames: 0,
                defaultArrayLength: 0,
                aspect: 1,
                skin: 0,
                colorUnmix: 0,
                angle: 0
            };

            // Pre-calculate real sizes for polygons
            const lazyRealSizes = (() => {
                const sizes = [1, 1, 1];
                for (let i = 3; i < 17; i++) {
                    sizes.push(Math.sqrt((PI2 / i) * (1 / Math.sin(PI2 / i))));
                }
                return sizes;
            })();

            // Priority Queue implementation for efficient sorting
            class PriorityQueue {
                constructor() {
                    this.array = [];
                    this.sorted = true;
                }

                enqueue(priority, item) {
                    this.array.push([priority, item]);
                    this.sorted = false;
                }

                dequeue() {
                    if (!this.sorted) {
                        this.array.sort((a, b) => b[0] - a[0]);
                        this.sorted = true;
                    }
                    if (this.array.length === 0) return null;
                    return this.array.pop()[1];
                }

                get length() {
                    return this.array.length;
                }
            }

            // Helper function to round values and remove near-zero values
            function rounder(val) {
                if ((typeof val) == "string") { return val }
                return Math.abs(val) < 0.001 ? 0 : +val.toPrecision(12);
            }

            // Apply defaults to mockup objects by removing default values
            function applyDefaults(mockup) {
                // Process main mockup properties
                for (const key in mockup) {
                    if (defaults[key] != null) {
                        if (mockup[key] === defaults[key] || mockup[key] == null) {
                            delete mockup[key];
                        }
                    } else if (Array.isArray(mockup[key]) && mockup[key].length === defaults.defaultArrayLength) {
                        delete mockup[key];
                    }
                }

                // Process gun properties
                const guns = mockup.guns;
                if (guns) {
                    for (let i = 0; i < guns.length; i++) {
                        const gun = guns[i];
                        for (const key in gun) {
                            if (defaults[key] != null) {
                                if (gun[key] === defaults[key] || gun[key] == null) {
                                    delete gun[key];
                                }
                            } else if (Array.isArray(gun[key]) && gun[key].length === defaults.defaultArrayLength) {
                                delete gun[key];
                            }
                        }
                    }
                }

                return mockup;
            }

            // Parse entity to mockup object
            function parseMockup(e, p) {
                const mockup = {
                    index: e.index,
                    name: e.label,
                    x: rounder(e.x),
                    y: rounder(e.y),
                    color: e.color,
                    shape: e.shapeData || 0,
                    size: rounder(e.size),
                    realSize: rounder(e.realSize),
                    facing: rounder(e.facing),
                    layer: e.layer,
                    statnames: e.settings.skillNames,
                    position: p,
                    upgrades: e.upgrades.map(r => ({
                        tier: r.tier,
                        index: r.index
                    })),
                    guns: e.guns.map(g => ({
                        offset: rounder(g.offset),
                        direction: rounder(g.direction),
                        length: rounder(g.length),
                        width: rounder(g.width),
                        aspect: rounder(g.aspect),
                        angle: rounder(g.angle),
                        color: g.color,
                        skin: rounder(g.skin),
                        color_unmix: rounder(g.color_unmix),
                        alpha: g.alpha
                    })),
                    turrets: e.turrets.map(t => {
                        const out = parseMockup(t, {});
                        out.sizeFactor = rounder(t.bound.size);
                        out.offset = rounder(t.bound.offset);
                        out.direction = rounder(t.bound.direction);
                        out.layer = rounder(t.bound.layer);
                        out.angle = rounder(t.bound.angle);
                        return applyDefaults(out);
                    }),
                    props: e.props.map(p => ({
                        size: rounder(p.size),
                        x: rounder(p.x),
                        y: rounder(p.y),
                        angle: rounder(p.angle),
                        layer: rounder(p.layer),
                        color: p.color,
                        shape: p.shape,
                        fill: p.fill,
                        stroke: p.stroke,
                        loop: p.loop,
                        isAura: p.isAura,
                        rpm: p.rpm,
                        dip: p.dip,
                        ring: p.ring,
                        arclen: p.arclen,
                        lockRot: p.lockRot,
                        scaleSize: p.scaleSize,
                        tankOrigin: p.tankOrigin
                    }))
                };

                return mockup;
            }

            // Calculate geometric dimensions of an entity
            function getDimensions(entity) {
                const endpoints = [];
                let pointDisplay = [];

                // Push endpoints for model parts
                function pushEndpoints(model, scale, focus = { x: 0, y: 0 }, rot = 0) {
                    const s = Math.abs(model.shape);
                    const z = (s >= lazyRealSizes.length) ? 1 : lazyRealSizes[s];

                    // Body shape endpoints
                    if (z === 1) { // Circle/octagon
                        for (let i = 0; i < 2; i += 0.5) {
                            endpoints.push({
                                x: focus.x + scale * Math.cos(i * PI),
                                y: focus.y + scale * Math.sin(i * PI)
                            });
                        }
                    } else { // Polygon vertices
                        const startAngle = (s % 2) ? 0 : PI / s;
                        for (let i = 0; i < s; i++) {
                            const theta = startAngle + (i / s) * PI2;
                            endpoints.push({
                                x: focus.x + scale * z * Math.cos(theta),
                                y: focus.y + scale * z * Math.sin(theta)
                            });
                        }
                    }

                    // Gun endpoints
                    const guns = model.guns || [];
                    for (let i = 0; i < guns.length; i++) {
                        const gun = guns[i];
                        const h = gun.aspect > 0 ? ((scale * gun.width) / 2) * gun.aspect : (scale * gun.width) / 2;
                        const r = Math.atan2(h, scale * gun.length) + rot;
                        const l = Math.sqrt(scale * scale * gun.length * gun.length + h * h);
                        const x = focus.x + scale * gun.offset * Math.cos(gun.direction + gun.angle + rot);
                        const y = focus.y + scale * gun.offset * Math.sin(gun.direction + gun.angle + rot);
                        const angleR = gun.angle + r;
                        const angleNegR = gun.angle - r;

                        const point1 = {
                            x: x + l * Math.cos(angleR),
                            y: y + l * Math.sin(angleR)
                        };

                        const point2 = {
                            x: x + l * Math.cos(angleNegR),
                            y: y + l * Math.sin(angleNegR)
                        };

                        endpoints.push(point1, point2);
                        pointDisplay.push({
                            x: rounder(point1.x),
                            y: rounder(point1.y)
                        }, {
                            x: rounder(point2.x),
                            y: rounder(point2.y)
                        });
                    }

                    // Turret endpoints
                    const turrets = model.turrets || [];
                    for (let i = 0; i < turrets.length; i++) {
                        const turret = turrets[i];
                        const bound = turret.bound;
                        const offset = bound.offset * scale * .35
                        pushEndpoints(turret, bound.size, {
                            x: focus.x + offset * Math.cos(bound.angle + rot),
                            y: focus.y + offset * Math.sin(bound.angle + rot)
                        }, bound.angle + rot);
                    }
                }

                // Push all endpoints for the entity
                pushEndpoints(entity, 1);

                // Check if we have too few points to form a proper shape
                if (endpoints.length < 3) {
                    // Return default dimensions for simple entities
                    return {
                        middle: { x: 0, y: 0 },
                        axis: 1,
                        points: []
                    };
                }

                // Find extremes to help with finding initial points
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;

                for (const point of endpoints) {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                }

                // Initial extremal points for building a circle
                let point1, point2, point3;

                // Find point with maximum x (rightmost)
                let maxIndex = 0;
                for (let i = 0; i < endpoints.length; i++) {
                    if (endpoints[i].x > endpoints[maxIndex].x) {
                        maxIndex = i;
                    }
                }
                point1 = endpoints[maxIndex];

                // Find point with minimum x (leftmost)
                maxIndex = 0;
                for (let i = 0; i < endpoints.length; i++) {
                    if (endpoints[i].x < endpoints[maxIndex].x) {
                        maxIndex = i;
                    }
                }
                point2 = endpoints[maxIndex];

                // Find point with maximum absolute y (furthest from x-axis)
                maxIndex = 0;
                for (let i = 0; i < endpoints.length; i++) {
                    if (Math.abs(endpoints[i].y) > Math.abs(endpoints[maxIndex].y)) {
                        maxIndex = i;
                    }
                }
                point3 = endpoints[maxIndex];

                // Define circle from three points
                function circleFromThreePoints(p1, p2, p3) {
                    const x1 = p1.x;
                    const y1 = p1.y;
                    const x2 = p2.x;
                    const y2 = p2.y;
                    const x3 = p3.x;
                    const y3 = p3.y;

                    const denom = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2;
                    if (Math.abs(denom) < 1e-10) {
                        // Points are collinear or too close - fallback to bounding circle
                        const centerX = (Math.min(x1, x2, x3) + Math.max(x1, x2, x3)) / 2;
                        const centerY = (Math.min(y1, y2, y3) + Math.max(y1, y2, y3)) / 2;
                        const radius = Math.max(
                            Math.sqrt((centerX - x1) * (centerX - x1) + (centerY - y1) * (centerY - y1)),
                            Math.sqrt((centerX - x2) * (centerX - x2) + (centerY - y2) * (centerY - y2)),
                            Math.sqrt((centerX - x3) * (centerX - x3) + (centerY - y3) * (centerY - y3))
                        );
                        return { x: centerX, y: centerY, radius };
                    }

                    const xy1 = x1 * x1 + y1 * y1;
                    const xy2 = x2 * x2 + y2 * y2;
                    const xy3 = x3 * x3 + y3 * y3;

                    const x = (xy1 * (y2 - y3) + xy2 * (y3 - y1) + xy3 * (y1 - y2)) / (2 * denom);
                    const y = (xy1 * (x3 - x2) + xy2 * (x1 - x3) + xy3 * (x2 - x1)) / (2 * denom);

                    const r = Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));

                    return {
                        x: isNaN(x) ? 0 : x,
                        y: isNaN(y) ? 0 : y,
                        radius: isNaN(r) ? 1 : r
                    };
                }

                // Calculate initial circle
                let circle = circleFromThreePoints(point1, point2, point3);

                // Create display points for debug/visualization
                pointDisplay = [
                    { x: rounder(point1.x), y: rounder(point1.y) },
                    { x: rounder(point2.x), y: rounder(point2.y) },
                    { x: rounder(point3.x), y: rounder(point3.y) }
                ];

                // Welzl's algorithm adapted - more efficient way to find minimum enclosing circle
                // Iteratively expand the circle to include all points
                for (const point of endpoints) {
                    // Skip the three points we used to create the initial circle
                    if (point === point1 || point === point2 || point === point3) {
                        continue;
                    }

                    // Check if the point is outside the current circle
                    const dx = point.x - circle.x;
                    const dy = point.y - circle.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq > circle.radius * circle.radius) {
                        // Point is outside, add it to display points
                        pointDisplay.push({ x: rounder(point.x), y: rounder(point.y) });

                        // Find new circle through this point and the farthest point on current circle
                        const dir = Math.atan2(dy, dx);
                        const opposite = {
                            x: circle.x - circle.radius * Math.cos(dir),
                            y: circle.y - circle.radius * Math.sin(dir)
                        };

                        // Create a new circle with diameter from point to opposite
                        const newCenterX = (point.x + opposite.x) / 2;
                        const newCenterY = (point.y + opposite.y) / 2;
                        const newRadius = Math.sqrt(
                            Math.pow(point.x - opposite.x, 2) +
                            Math.pow(point.y - opposite.y, 2)
                        ) / 2;

                        // Update circle
                        circle = {
                            x: newCenterX,
                            y: newCenterY,
                            radius: newRadius
                        };

                        // Verify all previously checked points are still inside
                        // If not, we need to adjust the circle further
                        let i = 0;
                        while (i < endpoints.indexOf(point)) {
                            const prevPoint = endpoints[i];
                            const pDx = prevPoint.x - circle.x;
                            const pDy = prevPoint.y - circle.y;
                            const pDistSq = pDx * pDx + pDy * pDy;

                            if (pDistSq > circle.radius * circle.radius * 1.01) { // Small epsilon for floating point errors
                                // This previously checked point is now outside
                                // Create a new circle that includes both points
                                const midX = (point.x + prevPoint.x) / 2;
                                const midY = (point.y + prevPoint.y) / 2;
                                const dist = Math.sqrt(
                                    Math.pow(point.x - prevPoint.x, 2) +
                                    Math.pow(point.y - prevPoint.y, 2)
                                );

                                circle = {
                                    x: midX,
                                    y: midY,
                                    radius: dist / 2 * 1.01 // Slight expansion for stability
                                };

                                // Restart the check
                                i = 0;
                            } else {
                                i++;
                            }
                        }
                    }
                }

                // Return dimensions with centered x-coordinate (fixing bug)
                return {
                    middle: {
                        x: rounder(circle.x),
                        y: 0 // Always keep y at 0 for bilaterally symmetrical shapes
                    },
                    axis: rounder(circle.radius * 2),
                    points: pointDisplay
                };
            }

            // Cache for generated mockups
            const cachedMockups = new Map();

            // Return the API
            return {
                getMockup: function(entityIndex, skipCacheCheck) {
                    // Check cache first unless explicitly skipping
                    if (!skipCacheCheck) {
                        const cachedValue = cachedMockups.get(entityIndex);
                        if (cachedValue) {
                            return cachedValue;
                        }
                    }

                    // Generate new mockup
                    const classString = exportNames[entityIndex];
                    if (!classString) {
                        return "";
                    }

                    try {
                        // Create entity instance
                        const entity = new Entity({ x: 0, y: 0 });
                        const entityClass = Class[classString];

                        entity.upgrades = [];
                        entity.settings.skillNames = null;
                        entity.minimalReset();
                        entity.minimalDefine(entityClass);
                        entity.name = entityClass.LABEL;

                        // Get dimensions and camera view
                        const position = getDimensions(entity);
                        const body = entity.camera(true);

                        // Create mockup data
                        entityClass.mockup = {
                            body: body,
                            position: position
                        };

                        entityClass.mockup.body.position = position;
                        const mockup = applyDefaults(parseMockup(entity, position));

                        // Cache and return
                        cachedMockups.set(entityIndex, mockup);
                        entity.destroy(true);

                        return mockup;
                    } catch (err) {
                        console.error("ERROR WHILE GENERATING MOCKUP: " + (classString || entityIndex));
                        console.error(err);
                        return "";
                    }
                }
            };
        }
        global.mockups = newMockups()

        global.exportNames = []
        global.Class = (() => {
            let def = defExports
            for (let k in def) {
                // Checks
                if (!def.hasOwnProperty(k)) {
                    continue;
                };

                // Add it
                def[k].index = global.exportNames.length;
                global.exportNames[def[k].index] = k
            }
            return def;
        })();

        function updateClassDatas(exportName, data, index/*replaces class rather than make new*/) {
            Class[exportName] = data
            Class[exportName].index = index || global.exportNames.length
            if (!index) global.exportNames.push(exportName)
            return Class[exportName]
        }

        // These two are seperate for error catching reasons, you might not mean to overwrite mockups if you do the first but you mean to if you do the second
        global.addNewClass = (exportName, data) => {
            if (Class[exportName]) {
                throw new Error(`Trying to add existing mockup "${exportName}"`);
            }
            updateClassDatas(exportName, data)
            sockets.talkToAll("mu", Class[exportName].index, JSON.stringify(mockups.getMockup(Class[exportName].index, true/*skip cache chcek*/)))
        }
        global.updateClass = (exportName, data) => {
            if (!Class[exportName]) {
                throw new Error(`Trying to update nonexistent mockup "${exportName}"`);
            }
            updateClassDatas(exportName, data, Class[exportName].index)
            sockets.talkToAll("mu", Class[exportName].index, JSON.stringify(mockups.getMockup(Class[exportName].index, true/*skip cache chcek*/)))
        }

        global.editorChangeEntity = (code) => {
            let affectedExports = []
            code.split("defExports.").forEach((v) => {
                v = v.split("=")
                v = v[0].trim()
                if (v.includes("\n") || v === "" || v.match(/^[a-z0-9_-]+$/i) === null) return;
                affectedExports.push(v)
            })
            console.log("Updating exports for the following entities:", affectedExports)

            // keep indexs
            let indexs = [];
            let indexI = 0;
            for (let exportName of affectedExports) {
                if (!Class[exportName]) {
                    global.addNewClass(exportName, {})
                } else {
                    indexs.push(Class[exportName].index)
                }
            }


            global.initExportCode(code) // run through defs (replaces their defExport)

            for (let exportName of affectedExports) {
                if (!Class[exportName]) {
                    global.addNewClass(exportName, defExports[exportName])
                } else {
                    Class[exportName].index = indexs[indexI++]
                    global.updateClass(exportName, defExports[exportName])
                }
            }
        }


        function timeOfImpact(p, v, s) {
            // Requires relative position and velocity to aiming point
            let a = s * s - (v.x * v.x + v.y * v.y),
                b = p.x * v.x + p.y * v.y,
                c = p.x * p.x + p.y * p.y,
                d = b * b + a * c,
                t = 0;
            if (d >= 0) {
                t = Math.max(0, (b + Math.sqrt(d)) / a);
            }
            return t * 0.9;
        }

        const sendRecordValid = (data) => {
            api.apiConnection.talk({
                type: "record",
                data: {
                    gamemode: c.serverName,
                    tank: data.tank,
                    score: data.score,
                    timeAlive: data.timeAlive,
                    totalKills: data.totalKills,
                    discord: typeof data.discord === "string" ? `<@${data.discord}>` : data.name
                }
            })
        };

        const teamNames = ["BLUE", "RED", "GREEN", "PURPLE", "YELLOW", "ORANGE", "PINK", "TEAL"];
        const teamColors = [10, 12, 11, 15, 3, 35, 36, 0];
        const teamHexCodes = ["#3CA4CB", "#E03E41", "#8ABC3F", "#CC669C", "#FDF380", "#F37C20", "#E85DDF", "#7ADBBC"];

        function getTeamColor(team) {
            if (Math.abs(team) - 1 >= teamNames.length) {
                return 13;
            }
            return teamColors[Math.abs(team) - 1];
        }

        function getTeam(type = 0) { // 0 - Bots only, 1 - Players only, 2 - all
            const teamData = {};
            for (let i = 0; i < room.teamAmount; i++) teamData[i + 1] = 0;
            if (type !== 1) {
                /*entities.forEach(o => {
                    if ((o.isBot) && (-o.team > 0 && -o.team <= room.teamAmount)) {
                        teamData[-o.team]++;
                    }
                });*/

                for (let o of entities) {
                    if (o.isBot && -o.team > 0 && -o.team <= room.teamAmount) {
                        teamData[-o.team]++;
                    }
                }
            }
            if (type !== 0) {
                for (let socket of clients) {
                    if (socket.rememberedTeam > 0 && socket.rememberedTeam <= room.teamAmount) {
                        teamData[socket.rememberedTeam]++;
                    }
                }
            }
            const toSort = Object.keys(teamData).map(key => [key, teamData[key]]).filter(entry => !room.defeatedTeams.includes(-entry[0])).sort((a, b) => a[1] - b[1]);
            return toSort.length === 0 ? ((Math.random() * room.teamAmount | 0) + 1) : toSort[0][0];
        }

        let botTanks = (function() {
            let output = [];
            function add(my, skipAdding = false) {
                if (output.includes(my)) {
                    return;
                }
                if (!skipAdding) {
                    output.push(my);
                }
                for (let key in my) {
                    if (key.startsWith("UPGRADES_TIER")) {
                        my[key].forEach(add);
                    }
                }
            }
            if (c.serverName === "Squidward's Tiki Land") add(Class.playableAC);
            else add(Class.basic);
            return output;
        })();

        const spawnBot = (loc = null) => {
            let position = loc,
                max = 100,
                team = c.serverName === "Infiltration" ? 20 : room.nextTagBotTeam.shift() || getTeam(0);
            if (!loc) {
                let spawnSectors = ["spn", "bas", "n_b", "bad"].map(r => r + team).filter(sector => room[sector] && room[sector].length);
                do position = room.randomType(
                    (c.serverName === "Infiltration") ? "edge" :
                    (room.gameMode === "tdm" && spawnSectors.length) ? ran.choose(spawnSectors) :
                    "norm"
                );
                while (dirtyCheck(position, 400) && max-- > 0);
            }
            let o = new Entity(position);
            o.color = (room.randomColors) ? ran.randomHexColor() : 12;
            if (room.gameMode === "tdm") {
                o.team = -team;
                o.color = team === 20 ? 17 : [10, 12, 11, 15, 3, 35, 36, 0][team - 1];
            }
            // Reload, Pen, Bullet Health, Bullet Damage, Bullet Speed, Capacity, Body Damage, Max Health, Regen, Speed
            let tank = c.serverName === "Infiltration" ? Class[ran.choose(["infiltrator", "infiltratorFortress", "infiltratorTurrates"])] : ran.choose(botTanks),
                botType = (tank.IS_SMASHER || tank.IS_LANCER) ? "bot2" : "bot",
                skillSet = tank.IS_LANCER ? ran.choose([
                    [0, 0, 3, 8, 8, 8, 6, 8, 0, 0],
                    [1, 5, 1, 7, 7, 9, 2, 7, 0, 3],
                    [0, 0, 0, 6, 9, 9, 9, 9, 0, 0],
                ]) : tank.IS_SMASHER ? ran.choose([
                    [12, 12, 11, 11, 11, 11, 0, 12, 0, 6],
                    [10, 12, 11, 11, 11, 11, 0, 10, 3, 7],
                    [9, 11, 11, 11, 11, 11, 4, 8, 1, 5],
                ]) : ran.choose([ // Dupes act as a weight system lo
                    [0, 0, 4, 8, 8, 9, 8, 5, 0, 0],
                    [0, 0, 5, 9, 9, 9, 9, 1, 0, 0],
                    [0, 0, 8, 7, 7, 8, 5, 7, 0, 0],
                    [2, 4, 2, 7, 6, 9, 6, 5, 0, 1],
                    [0, 0, 8, 9, 9, 9, 0, 7, 0, 0],
                    [0, 0, 4, 8, 8, 9, 8, 5, 0, 0],
                    [0, 0, 5, 9, 9, 9, 9, 1, 0, 0],
                    [0, 0, 8, 7, 7, 8, 5, 7, 0, 0],
                    [0, 0, 5, 9, 9, 9, 9, 1, 0, 0],
                    [0, 0, 8, 7, 7, 8, 5, 7, 0, 0],
                    [2, 4, 2, 7, 6, 9, 6, 5, 0, 1],
                    [0, 0, 8, 9, 9, 9, 0, 7, 0, 0],
                    [0, 0, 8, 9, 9, 9, 0, 7, 0, 0],
                    [4, 4, 2, 7, 7, 7, 3, 8, 0, 0],
                ]);
            o.isBot = true;
            o.define(Class[botType]);
            o.tank = tank;
            o.define(tank);
            o.name = "[AI] " + ran.chooseBotName().replaceAll("%t", o.label);
            o.nameColor = o.name.includes("Bee") ? "#FFF782" : o.name.includes("Honey Bee") ? "#FCCF3B" : o.name.includes("Fallen") ? "#CCCCCC" : "#C1CAFF";
            o.autoOverride = true;
            o.invuln = true;
            o.skill.score = 26302 + Math.floor(10000 * Math.random());
            o.fov *= 0.85
            setTimeout(() => {
                o.invuln = false;
                o.autoOverride = false;
                o.skill.maintain();
                o.refreshBodyAttributes();
                o.skill.set([skillSet[6], skillSet[4], skillSet[3], skillSet[5], skillSet[2], skillSet[9], skillSet[0], skillSet[1], skillSet[8], skillSet[7]].map(value => {
                    if (value < 9 && Math.random() > 0.85) value += 1;
                    return value
                }));
                o.controllers.push(new ioTypes.roamWhenIdle(o));
            }, 5000);
            if (room.maxBots > 0) bots.push(o);
            return o;
        };

        const closeArena = () => {
            if (room.bossRush) room.bossRushOver = true;
            room.arenaClosed = true;
            //if (c.enableBot) editStatusMessage("Offline");
            sockets.broadcast("Arena Closed: No players can join.", "#FF0000");
            util.log("The arena has closed!", true);
            if (room.modelMode || c.SANDBOX) {
                util.warn("Closing server...");
                return setTimeout(() => process.exit(), 750);
            }
            let closers = [
                Class.arenaCloserAI,
                Class.arenaCloser5AI,
                Class.machCloserAI,
                Class.boostCloserAI,
                Class.rediShotgunAI,
                Class.bigChungusAI,
                Class.sniperCloserAI,
                Class.hotwheelsAI,
                Class.absoluteCyanideAI,
                Class.arenaSummonerAI,
                Class.trapperCloserAI,
                Class.borerCloserAI,
                Class.hybridCloserAI,
                Class.acCeptionAI,
                Class.minishotCloserAI,
                Class.octoArenaCloserAI,
                Class.spreadCloserAI,
                Class.ac3ai
            ],
                positions = [{
                    x: room.width * .25,
                    y: room.height * -.25
                }, {
                    x: room.width * .25,
                    y: room.height * 1.25
                }, {
                    x: room.width * -.25,
                    y: room.height * .25
                }, {
                    x: room.width * 1.25,
                    y: room.height * .25
                }, {
                    x: room.width * .75,
                    y: room.height * -.25
                }, {
                    x: room.width * 1.25,
                    y: room.height * 1.25
                }, {
                    x: room.width * -.25,
                    y: room.height * .75
                }, {
                    x: room.width * 1.25,
                    y: room.height * .75
                }];
            for (let i = 0; i < 8; i++) {
                let o = new Entity(positions[i]);
                o.define(ran.choose(closers));
                o.roomLayerless = true;
                o.team = -100;
                o.alwaysActive = true;
                //o.facing += ran.randomRange(.5 * Math.PI, Math.PI); // Does nothing
            }
            for (let body of bots) body.kill();
            let completed = false;
            let interval = setInterval(() => {
                let alivePlayers = players.filter(player => player.body != null && player.body.isAlive() && player.body.type === "tank");
                for (let player of alivePlayers) {
                    let body = player.body;
                    body.passive = body.invuln = body.godmode = false;
                    entities.forEach(o => {
                        if (o.master.id === body.id && o.id !== body.id) o.passive = false;
                    });
                    body.dangerValue = 7;
                }
                if (!alivePlayers.length && !completed) {
                    completed = true;
                    clearInterval(interval);
                    setTimeout(() => {
                        util.log("All players are dead! Ending process...", true);
                        setTimeout(() => {
                            process.exit;
                            for (let socket of clients) socket.talk("P", "The arena has closed. Please try again later once the server restarts.", ran.randomLore());
                        }, 500);
                    }, 1000);
                }
            }, 100);
            setTimeout(() => {
                completed = true;
                util.log("Arena Closers took too long! Ending process...", true);
                setTimeout(() => {
                    process.exit;
                    for (let socket of clients) socket.talk("P", "The arena has closed. Please try again later once the server restarts.", ran.randomLore());
                }, 500);
            }, 6e4);
        };

        function countPlayers() {
            let teams = [];
            for (let i = 1; i < c.TEAM_AMOUNT + 1; i++) teams.push([-i, 0]);
            let all = 0;
            /*entities.forEach(o => {
                if (o.isPlayer || o.isBot) {
                    if ([-1, -2, -3, -4, -5, -6, -7, -8].includes(o.team)) {
                        teams.find(entry => entry[0] === o.team)[1]++;
                        all++;
                    };
                }
            });*/
            for (let o of entities) {
                if (o.isPlayer || o.isBot) {
                    if ([-1, -2, -3, -4, -5, -6, -7, -8].includes(o.team)) {
                        teams.find(entry => entry[0] === o.team)[1]++;
                        all++;
                    };
                }
            }
            let team = teams.find(entry => entry[1] === all);
            if (team) winner(-team[0] - 1);
        };

        let won = false;

        function winner(teamId) {
            if (won) return;
            won = true;
            let team = ["BLUE", "RED", "GREEN", "PURPLE"][teamId];
            sockets.broadcast(team + " has won the game!", ["#00B0E1", "#F04F54", "#00E06C", "#BE7FF5", "#FFEB8E", "#F37C20", "#E85DDF", "#8EFFFB"][teamId]);
            setTimeout(closeArena, 3e3);
        };

        function tagDeathEvent(instance) {
            let killers = [];
            for (let entry of instance.collisionArray)
                if (entry.team > -9 && entry.team < 0 && instance.team !== entry.team) killers.push(entry);
            if (!killers.length) return;
            let killer = ran.choose(killers);
            if (instance.socket) instance.socket.rememberedTeam = -killer.team;
            if (instance.isBot) room.nextTagBotTeam.push(-killer.team);
            setTimeout(countPlayers, 1000);
        }

        const smoke = (timeout, x, y) => {
            let smokeSpawner = new Entity({
                x: x,
                y: y
            });
            smokeSpawner.define(Class.smokeSpawner);
            smokeSpawner.passive = true;
            setTimeout(() => smokeSpawner.kill(), timeout);
        };

        class Domination {
            constructor() {
                this.takenDominators = room.gameMode === "tdm" ? (new Array(room.teamAmount)).fill(0) : [];
                this.amountOfDominators = room.domi.length;
            }

            init() {
                for (let location of room.domi) {
                    let dominator = new Entity(location);
                    dominator.define(ran.choose([
                        Class.destroyerDominatorAI,
                        Class.gunnerDominatorAI,
                        Class.trapperDominatorAI,
                        Class.droneDominatorAI,
                        Class.autoDominatorAI,
                        Class.steamrollDominatorAI,
                        Class.crockettDominatorAI,
                        Class.swarmerDominatorAI,
                        //Class.pliniDominatorAI, (Needs balancing.)
                        //Class.fortifiedDominatorAI, (Needs balancing.)
                        Class.vulcDominatorAI,
                        Class.hurriDominatorAI
                    ]));

                    dominator.alwaysActive = true;
                    dominator.color = 13;
                    dominator.isDominator = true;
                    if (room.gameMode === "tdm") dominator.miscIdentifier = "appearOnMinimap"; // Buggy behavior with FFA Domination.
                    dominator.settings.hitsOwnType = "pushOnlyTeam";
                    dominator.SIZE = 70;
                    dominator.team = -100;
                    dominator.name = "Dominator";
                    dominator.refreshBodyAttributes();

                    dominator.onDead = () => {
                        if (room.gameMode === "tdm") {
                            // Cheeky lil workabout so we don't have to redefine a dominator
                            dominator.childrenMap.forEach(c => c.kill());
                            dominator.health.amount = dominator.health.max;
                            dominator.shield.amount = dominator.shield.max;
                            dominator.isGhost = false;
                            dominator.hasDoneOnDead = false;

                            // Get the people who murdered the dominator
                            let killers = [];
                            for (let instance of dominator.collisionArray) {
                                if (instance.team >= -room.teamAmount && instance.team <= -1) {
                                    killers.push(instance.team);
                                }
                            }

                            let killTeam = killers.length ? ran.choose(killers) : 0,
                                team = ["INVALID", "BLUE", "RED", "GREEN", "PURPLE", "YELLOW", "ORANGE", "PINK", "TEAL"][-killTeam],
                                teamColor = ["#000000", "#00B0E1", "#F04F54", "#00E06C", "#BE7FF5", "#FFEB8E", "#F37C20", "#E85DDF", "#8EFFFB"][-killTeam];

                            // If the dominator is taken, make it contested
                            if (dominator.team !== -100) {
                                this.takenDominators[-dominator.team] -= 1;
                                killTeam = 0;
                                sockets.broadcast(`The ${room.cardinals[Math.floor(3 * location.y / room.height)][Math.floor(3 * location.x / room.height)]} Dominator is being contested!`, "#FFE46B");
                            } else { // If a contested dominator is taken...
                                this.takenDominators[-killTeam] += 1;
                                sockets.broadcast(`The ${room.cardinals[Math.floor(3 * location.y / room.height)][Math.floor(3 * location.x / room.height)]} Dominator is now captured by ${team}!`, teamColor);

                                /*entities.forEach(body => {
                                    if (body.team === killTeam && body.type === "tank" && !body.underControl) {
                                        body.sendMessage("Press H to control the Dominator!");
                                    }
                                });*/
                            }

                            // Set area type based off of team
                            room.setType(`dom${-killTeam || "i"}`, location);

                            // Set dominator team
                            dominator.team = killTeam || -100;
                            dominator.color = [13, 10, 12, 11, 15, 3, 35, 36, 0][-killTeam];

                            // If all dominators are taken by the same team, close the arena
                            if (this.takenDominators.includes(this.amountOfDominators) && killTeam && !room.arenaClosed) {
                                util.warn(`${team} has won the game! Closing arena...`);
                                setTimeout(() => sockets.broadcast(`${team} has won the game!`, teamColor), 2e3);
                                setTimeout(() => closeArena(), 5e3);
                            }
                        } else {
                            // Cheeky lil workabout so we don't have to redefine a dominator
                            dominator.childrenMap.forEach(c => c.kill());
                            dominator.health.amount = dominator.health.max;
                            dominator.shield.amount = dominator.shield.max;
                            dominator.isGhost = false;
                            dominator.hasDoneOnDead = false;

                            // Get the people who murdered the dominator
                            let killers = [];
                            for (let instance of dominator.collisionArray) {
                                if (instance.team > 0) {
                                    killers.push(instance.master.master.source);
                                }
                            }

                            let killPlayer = killers.length ? ran.choose(killers) : null,
                                name = (killPlayer != null) ? (!killPlayer.name.length) ? "An unnamed player" : killPlayer.name : null;

                            // If the dominator is taken, make it contested
                            if (dominator.team !== -100) {
                                killPlayer = null,
                                name = null;
                                sockets.broadcast(`The ${room.cardinals[Math.floor(3 * location.y / room.height)][Math.floor(3 * location.x / room.height)]} Dominator is being contested!`, "#FFE46B");
                            } else { // If a contested dominator is taken...
                                entities.forEach(body => {
                                    if (body.isPlayer) body.sendMessage(`The ${room.cardinals[Math.floor(3 * location.y / room.height)][Math.floor(3 * location.x / room.height)]} Dominator is now captured by ${name}!`, body.team === killPlayer.team ? "#00B0E1" : "#F04F54");
                                })
                            }

                            // Set area type based off of team
                            if (room.randomColors) room.setType(`${killPlayer != null ? killPlayer.color : 'domi'}`, location);
                            else room.setType(`dom${killPlayer != null ? 'P'+killPlayer.team : 'i'}`, location);

                            // Set dominator team
                            dominator.team = killPlayer != null ? killPlayer.team : -100;
                            dominator.color = killPlayer != null ? killPlayer.color : 13;
                            dominator.name = name != null ? `${name}` + `${(/[sS]/.test(name.slice(-1))) ? "' " : "'s "} Dominator` : "Dominator";
                            dominator.nameColor = killPlayer != null ? killPlayer.nameColor : "#FFFFFF";
                        };
                    };
                }
            }

            shuffle(time) {
                function tick(t) { // Copied from Boss Rush.
                    if (
                        t === 300 ||
                        t === 120 ||
                        t === 60
                    ) sockets.broadcast(`Every dominator will be shuffled in ${t/60} minute${t/60 > 1 ? 's' : ''}.`, "#FFE46B");
                    if (t < 60) {
                        if (
                            t === 30 ||
                            t === 15 ||
                            t === 10 ||
                            (t <= 5 && t > 0)
                        ) sockets.broadcast(`Every dominator will be shuffled in ${t} second${t > 1 ? 's' : ''}.`, "#FFE46B");
                    }
                    if (t <= 0) {
                        sockets.broadcast("Every dominator has been shuffled!");
                        entities.forEach(dom => {
                            if (dom.isDominator) {
                                const domOnDead = dom.onDead;
                                dom.childrenMap.forEach(c => c.kill());
                                dom.controllers = [];
                                dom.define(ran.choose([
                                    Class.destroyerDominatorAI,
                                    Class.gunnerDominatorAI,
                                    Class.trapperDominatorAI,
                                    Class.droneDominatorAI,
                                    Class.autoDominatorAI,
                                    Class.steamrollDominatorAI,
                                    Class.crockettDominatorAI,
                                    Class.swarmerDominatorAI,
                                    //Class.pliniDominatorAI, (Needs balancing.)
                                    //Class.fortifiedDominatorAI, (Needs balancing.)
                                    Class.vulcDominatorAI,
                                    Class.hurriDominatorAI
                                ]));
                                dom.settings.hitsOwnType = "pushOnlyTeam";
                                dom.SIZE = 70;
                                dom.refreshBodyAttributes();
                                dom.onDead = domOnDead;
                            }
                        });
                        sockets.broadcast("Every dominator will be shuffled again in 10 minutes.");
                        return;
                    }

                    setTimeout(function retick() {
                        tick(t - 1);
                    }, 1000);
                }
                tick(time + 1);
                setInterval(() => tick(time + 1), time * 1000);
            }
        }

        const mothershipLoop = (loc, team) => {
            let o = new Entity(loc),
                teams = ["BLUE", "RED", "GREEN", "PURPLE", "YELLOW", "ORANGE", "PINK", "TEAL"],
                teamColors = ["#00B0E1", "#F04F54", "#00E06C", "#BE7FF5", "#FFEB8E", "#F37C20", "#E85DDF", "#8EFFFB"];
            o.define(Class.mothership);
            o.isMothership = true;
            o.miscIdentifier = "appearOnMinimap";
            o.alwaysActive = true;
            o.team = -team;
            o.controllers.push(new ioTypes.nearestDifferentMaster(o), new ioTypes.mapTargetToGoal(o), new ioTypes.roamWhenIdle(o));
            o.color = [10, 12, 11, 15, 3, 35, 36, 0][team - 1];
            o.nameColor = teamColors[team - 1];
            o.settings.hitsOwnType = "pushOnlyTeam";
            o.name = "Mothership";
            o.onDead = () => {
                room.defeatedTeams.push(o.team);
                sockets.broadcast(teams[team - 1] + "'s Mothership has been killed!", teamColors[team - 1]);
                if (room.motherships.length !== 1) util.remove(room.motherships, room.motherships.indexOf(o));
                entities.forEach(n => {
                    if (n.team === o.team && (n.isBot || n.isPlayer)) {
                        n.sendMessage("Your team has been defeated!");
                        n.kill();
                    }
                });
                if (room.arenaClosed || room.motherships.length !== 1) return;
                util.warn(teams[-room.motherships[0].team - 1] + " has won the game! Closing arena...");
                setTimeout(() => sockets.broadcast(teams[-room.motherships[0].team - 1] + " has won the game!", teamColors[-room.motherships[0].team - 1]), 2e3);
                setTimeout(() => closeArena(), 5e3);
            };
            room.motherships.push(o);
        };

        let soccer = {
            scoreboard: [0, 0],
            timer: 60,
            spawnBall: function() {
                let o = new Entity({
                    x: room.width / 2,
                    y: room.height / 2
                });
                o.define(Class.soccerBall);
                o.miscIdentifier = "appearOnMinimap";
                o.settings.noNameplate = true;
                o.settings.acceptsScore = false;
                o.team = -100;
                o.alwaysActive = true;
                o.modeDead = () => {
                    let cell = o.myCell.slice(3);
                    if (cell == 1) {
                        soccer.scoreboard[1]++;
                        sockets.broadcast("RED Scored!");
                    }
                    if (cell == 2) {
                        soccer.scoreboard[0]++;
                        sockets.broadcast("BLUE Scored!");
                    }
                    setTimeout(soccer.spawnBall, 1500);
                }
            },
            update: function() {
                soccer.timer--;
                if (soccer.timer <= 0) {
                    if (soccer.scoreboard[0] > soccer.scoreboard[1]) {
                        sockets.broadcast("BLUE has won!");
                        setTimeout(closeArena, 2500);
                        return;
                    } else if (soccer.scoreboard[0] < soccer.scoreboard[1]) {
                        sockets.broadcast("RED has won!");
                        setTimeout(closeArena, 2500);
                        return;
                    } else {
                        sockets.broadcast("It was a tie!");
                        soccer.timer += 3;
                        setTimeout(() => sockets.broadcast("3 Minutes have been added to the clock!"), 1500);
                    }
                }
                if (soccer.timer % 2 === 0) sockets.broadcast(soccer.timer + " minutes until the match is over!");
                setTimeout(soccer.update, 60000);
            },
            init: function() {
                soccer.spawnBall();
                setTimeout(soccer.update, 60000);
            }
        };
        const bossRushLoop = (function() {
            const bosses = [
                Class.alphaSentryAI,
                Class.anniversaryDefenderAI,
                Class.anniversaryGuardianAI,
                Class.anniversarySummonerAI,
                Class.applicusAI,
                Class.aquamarineAI,
                Class.armySentryGunAI,
                Class.armySentryRangerAI,
                Class.armySentrySwarmAI,
                Class.armySentryTrapAI,
                Class.arcanistAI,
                Class.article13AI,
                Class.ascendedCareener,
                Class.ascendedPentagonAI,
                Class.ascendedSquare,
                Class.ascendedTriangle,
                Class.asteroidAI,
                Class.astraAI,
                Class.at4_bwAI,
                Class.atriumAI,
                Class.AWPOrchestra1AI,
                Class.AWPOrchestra2AI,
                Class.awpOrchestratan33AI,
                Class.AWPOrchestra3AI,
                Class.awpPoundAI,
                Class.AWP_1AI,
                Class.AWP_8AI,
                Class.AWP_11AI,
                Class.AWP_14AI,
                Class.AWP_21AI,
                Class.AWP_24AI,
                Class.AWP_28AI,
                Class.AWP_cos5AI,
                Class.awp_machineAI,
                Class.awp_nephAI,
                Class.AWP_psAI,
                Class.awp_snipeAI,
                Class.battlegonAI,
                Class.beggarsBaneAI,
                Class.blitzkriegAI,
                Class.bluestarAI,
                Class.bowAI,
                Class.brownCometAI,
                Class.carryingGunshipAI,
                Class.chandelierAI,
                Class.chk1AI,
                Class.chk2AI,
                Class.chk3AI,
                Class.colliderAI,
                Class.cometAI,
                Class.confidentialAI,
                Class.conquistadorAI,
                Class.constAI,
                Class.constructionistAI,
                Class.curveplexAI,
                Class.cutterAI,
                Class.defenderAI,
                Class.deltrabladeAI,
                Class.demolisherAI,
                Class.derogatorAI,
                Class.dropshipAI,
                Class.eggBossTier1AI,
                Class.eggBossTier1FaceAI,
                Class.eggBossTier2AI,
                Class.eggQueenTier1AI,
                Class.eggQueenTier2AI,
                Class.eggQueenTier3AI,
                Class.eggSpiritTier1AI,
                Class.eggSpiritTier2AI,
                Class.eggSpiritTier3AI,
                Class.ek1WithAShotgunAI,
                Class.EK_3AI,
                Class.eliteBasicAI,
                Class.eliteBattleshipAI,
                Class.eliteBorerAI,
                Class.eliteCarpenterAI,
                Class.eliteDefenderAI,
                Class.eliteDestroyerAI,
                Class.eliteDirectorAI,
                Class.eliteEngieAI,
                Class.eliteGunnerAI,
                Class.eliteInfernoAI,
                Class.eliteMachineAI,
                Class.eliteMinesweeperAI,
                Class.elitePelleterAI,
                Class.eliteRifleAI,
                Class.eliteShrapnelAI,
                Class.eliteSidewindAI,
                Class.eliteSniperAI,
                Class.eliteSprayerAI,
                Class.eliteTrapAI,
                Class.eliteTwinAI,
                Class.enchantressAI,
                Class.exorcistorAI,
                Class.fallenAutoTankAI,
                Class.fallenBoosterAI,
                Class.fallenCavalcadeAI,
                Class.fallenDesperadoAI,
                Class.fallenDrifterAI,
                Class.fallenFighterAI,
                Class.fallenFlamethrowerAI,
                Class.fallenHybridAI,
                Class.fallenOctoAI,
                Class.fallenOverlordAI,
                Class.fallenPentaAI,
                Class.fallenPistonAI,
                Class.fallenUziAI,
                Class.fueronAI,
                Class.gegenscheinAI,
                Class.goldenStreakAI,
                Class.gravibusAI,
                Class.greenBossTier1AI,
                Class.greenBossTier2AI,
                Class.greendeltrabladeAI,
                Class.greenGearBossAI,
                Class.greenGuardianAI,
                Class.guardianAI,
                Class.gunshipAI,
                Class.hb3_37AI,
                Class.heptagonBossAI,
                Class.heptagonBossTier1AI,
                Class.heptagonBossTier2AI,
                Class.heptagonBossTier3AI,
                Class.heptagonNestKeeperAI,
                Class.hexachoronAI,
                Class.hexadecagorAI,
                Class.hexagonBossAI,
                Class.hexagonBossTier1AI,
                Class.hexagonBossTier2AI,
                Class.hexagonBossTier3AI,
                Class.hexagonNestKeeperAI,
                Class.hexahedronAI,
                Class.hollowCenterAI,
                Class.hyperionAI,
                Class.hypervesselAI,
                Class.icecolliderAI,
                Class.icemessengerAI,
                Class.icePalisadeAI,
                Class.iconsagonaAI,
                Class.industrianAI,
                Class.invokeAI,
                Class.jetBossAI,
                Class.kingAI,
                Class.kioskAI,
                Class.lamperAI,
                Class.lavenderGuardianAI,
                Class.lavendicusAI,
                Class.leaferBossAI,
                Class.legendaryCrasherAI,
                Class.lemonicusAI,
                Class.leshyAI,
                Class.leshyAIred,
                Class.leviathanAI,
                Class.magnetarAI,
                Class.messengerAI,
                Class.metalCrasherBossAI,
                Class.mk1AI,
                Class.mk2AI,
                Class.mk3AI,
                Class.moonRabbitAIFrame0,
                Class.moonShardAAI,
                Class.moonShardBAI,
                Class.nailerAI,
                Class.nestKeeperAI,
                Class.nk1AI,
                Class.nk2AI,
                Class.nk3AI,
                Class.obp1AI,
                Class.obp2AI,
                Class.obp3AI,
                Class.obt1AI,
                Class.occultAI,
                Class.octagonNestKeeperAI,
                Class.octagronAI,
                Class.octogeddonAI,
                Class.orangicusAI,
                Class.orbitalspaceAI,
                Class.orthoAI,
                Class.palisadeAI,
                Class.pentafrasAI,
                Class.pentagonBossTier1AI,
                Class.pentagonBossTier2AI,
                Class.pentagonBossTier3AI,
                Class.protNestKeeperAI,
                Class.pulsarAI,
                Class.puzzlePieceBossAI,
                Class.quasarAI,
                Class.reanimBiohazardAI,
                Class.reanimCacheAI,
                Class.reanimCorpsAI,
                Class.reanimFarmerAI,
                Class.reanimGasserAI,
                Class.reanimHeptaTrapAI,
                Class.reanimKnightAI,
                Class.reanimOverfireAI,
                Class.reanimPentaBlasterAI,
                Class.redBurstAI,
                Class.RK_1AI,
                Class.RK_2AI,
                Class.RK_3AI,
                Class.rogueMothershipAI,
                Class.rs1AI,
                Class.rs2AI,
                Class.rs3AI,
                Class.runecastAI,
                Class.tealGuardianAI,
                Class.sacredCrasherAI,
                Class.sarfassasAI,
                Class.sassafrasAI,
                Class.sassasadeAI,
                Class.shamanAI,
                Class.skimBossAI,
                Class.sliderAI,
                Class.snowflakeAI,
                Class.sorcererAI,
                Class.soulless1AI,
                Class.specAstraAI,
                Class.specAuto8AI,
                Class.specDodecaAI,
                Class.specFlankLinerAI,
                Class.specInviso4AI,
                Class.specLibAI,
                Class.specQuadraletAI,
                Class.specRitoparnAI,
                Class.specSolidagoAI,
                Class.specThrusterAI,
                Class.specWatchtrapAI,
                Class.specYottamindAI,
                Class.spellbindAI,
                Class.splitterSummoner,
                Class.squareNestKeeperAI,
                Class.streakAI,
                Class.summonerAI,
                Class.superbirdAI,
                Class.swarmCannonBossAI,
                Class.swarmSquareAI,
                Class.terminatorBossAI,
                Class.terrorhedronAI,
                Class.testboss2AI,
                Class.testingthingAI,
                Class.tetrafrasAI,
                Class.thunderstormAI,
                Class.tk1AI,
                Class.tk2AI,
                Class.tk3AI,
                Class.trapDwellerAI,
                Class.trapeFighterAI,
                Class.trapperzoidAI,
                Class.triangleNestKeeperAI,
                Class.triguardAI,
                Class.triSeekerAI,
                Class.ultimateAI,
                Class.ultMultitoolAI,
                Class.ultraPuntAI,
                Class.ultSwissToolsetAI,
                Class.vacuoleAI,
                Class.vanguardAI,
                Class.visUltimaAI,
                Class.vivisectionAI,
                Class.xyvAI,
                Class.youkaiBossAIFrame31
            ].filter(o => o != null);
            const waveAss = {
                10: [
                    Class.gaisenblasterAI,
                    Class.hexashipAI,
                    Class.vulcanShipAI
                ],
                25: [
                    Class.athenaAI,
                    Class.awp_33AI,
                    Class.AWPOrchestra4AI,
                    Class.caelusAI,
                    Class.demeterAI,
                    Class.destroyerShipAI,
                    Class.eggBossTier4AI,
                    Class.eggQueenTier4AI,
                    Class.eggSpiritTier4AI,
                    Class.ESHG_85_MainAI,
                    Class.frigateShipAI,
                    Class.greenBossTier3AI,
                    Class.heptahedronAI,
                    Class.hermesAI,
                    Class.hexagonBossTier4AI,
                    Class.LQMAI,
                    Class.lucrehulkAI,
                    Class.lucrehulkBattleshipAI,
                    Class.lucrehulkCarrierAI,
                    Class.mk4AI,
                    Class.nk4AI,
                    Class.nk5AI,
                    Class.neutronStarAI,
                    Class.odinAI,
                    Class.PCUAI,
                    Class.pentagonBossTier4AI,
                    Class.purifierBossAI,
                    Class.RK_4AI,
                    Class.rod1AI,
                    Class.superSplitterSummoner,
                    Class.tk4AI,
                    Class.XZ_4_MainAI
                ],
                30: [
                    Class.bidenAI,
                    Class.cometbetterAI,
                    Class.eliteXyvAI,
                    Class.grudgeAIWeaker,
                    Class.minosAI,
                    Class.redistributionAI,
                    Class.sisyphusAI,
                    Class.ultimatebetterAI
                ],
                50: [
                    Class.boreasAI,
                    Class.carbonfrasAI,
                    Class.clockAIWeaker,
                    Class.colossusBossAI,
                    Class.missilusAI,
                    Class.mythicalCrasherAIWeaker,
                    Class.RK_5AI,
                    Class.rs4AIWeaker,
                    Class.rSassSupremeAIWeaker,
                    Class.sassafrasSupremeAIWeaker,
                    Class.squarefortAI,
                    Class.tetraplexAIWeaker,
                    Class.voidPentagonAIWeaker,
                    Class.worldDestroyerAIWeaker
                ]
            };
            for (const key in waveAss) {
                waveAss[key] = waveAss[key].filter(o => o != null);
            }
            const waveOverrides = {
                10: [[
                    Class.treasuryAI,
                    Class.purifierBossAI,
                    Class.morningstarAI,
                    Class.neutronStarAI
                ]],
                20: [[
                    Class.clockAI,
                    Class.voidPentagonAI,
                    Class.rs4AI,
                    Class.grudgeAI,
                    Class.XZ_4_MainAI
                ]],
                30: [[
                    Class.mythicalCrasherAI,
                    Class.sassafrasSupremeAI,
                    Class.rSassSupremeAI,
                    Class.hf61AI,
                    Class.carbonfrasAI,
                    Class.colossusBossAI
                ]],
                40: [[
                    Class.tetraplexAI,
                    Class.worldDestroyer,
                    Class.eggBossTier5AI,
                    Class.cometbetterAI,
                    Class.ultimatebetterAI,
                    Class.missilusAI,
                    Class.mariahCareyAI
                ]],
                50: [[
                    Class.es5AI,
                    Class.fuckahedronAI
                ]],
                60: [[
                    Class.awp39AI,
                    Class.legacyACAI,
                    Class.PDKAI,
                    Class.ship23AI
                ]],
                /// THE GAUNTLET ///
                70: [
                    [Class.sunkingAI, Class.awp30AI]
                ],
                71: [
                    [Class.eggBossTier5AI, Class.boreasAI],
                    [Class.eggBossTier5AI, Class.boreasAI],
                    Class.cometAI,
                    Class.cometAI,
                    [Class.splitterSummoner, Class.fueronAI, Class.treasuryAI],
                    [7, [Class.armySentryGunAI, Class.armySentryRangerAI, Class.armySentrySwarmAI, Class.armySentryTrapAI]]
                ],
                72: [
                    [Class.RK_5AI, Class.awp30AI, Class.sunkingAI],
                    [Class.worldDestroyer, Class.tetraplexAI],
                    [Class.legendaryCrasherAI, Class.clockAI],
                    [Class.sacredCrasherAI, Class.confidentialAI],
                    Class.neutronStarAI,
                    [Class.eggQueenTier4AI, Class.eggBossTier4AI, Class.eggSpiritTier4AI],
                    [7, [Class.armySentryGunAI, Class.armySentryRangerAI, Class.armySentrySwarmAI, Class.armySentryTrapAI]]
                ],
                73: [
                    [Class.triguardAI, Class.triguardAI, Class.quintetAI],
                    [Class.lucrehulkCarrierAI, Class.lucrehulkBattleshipAI, Class.lucrehulkAI],
                    Class.triguardAI,
                    [Class.cranberryGuardianAI, Class.greenGuardianAI, Class.lavenderGuardianAI, Class.s2_22AI, Class.at4_bwAI],
                    [5, Class.polyamorousAI],
                    [4, [Class.armySentryGunAI, Class.armySentryRangerAI, Class.armySentrySwarmAI, Class.armySentryTrapAI]]
                ],
                74: [
                    [Class.torchmorningstarAI, Class.PDKAI],
                    [Class.quintetAI, Class.triguardAI, Class.pentaguardianAI],
                    [2, [Class.minosAI, Class.sisyphusAI, Class.bidenAI]],
                    [Class.AWP_28AI, Class.AWP_1AI, Class.AWP_psAI],
                    [Class.mk5AI, Class.tk5AI, Class.eggBossTier5AI],
                    [Class.frigateShipAI, Class.destroyerShipAI],
                    [Class.mythicalCrasherAI, Class.sassafrasSupremeAI, Class.voidPentagonAI],
                    [Class.RK_4AI, Class.tk4AI, Class.mk4AI],
                    [Class.polyamorousAI, Class.quintetAI],
                    [Class.squarefortAI, Class.heptahedronAI, Class.RK_3AI]
                ],
                75: [[
                    Class.eggBossTier6AI,
                    Class.overTitanAI,
                    Class.moonAI
                ]]
            }
            for (let i = 0; i < bosses.length; i++) {
                if (bosses[i] != null) continue;
                console.warn(`[WARN] Boss at index "${i}" was null.`);
                bosses.splice(i, 1);
            }
            let bossesAlive;
            function entityModeDead() {
                bossesAlive--;
                if (bossesAlive <= 0) {
                    if (room.bossRushWave === 75) {
                        sockets.broadcast("The tanks have beaten the boss rush!", "#00B0E1");
                        players.forEach(player => player.body != null && player.body.rewardManager(-1, "victory_of_the_4th_war"));
                        setTimeout(closeArena, 2500);
                    } else if (waveOverrides[room.bossRushWave + 1] != null) {
                        sockets.broadcast("The next wave will arrive in 30 seconds!", '#FDF380');
                        setTimeout(bossRushLoop, 30000);
                    } else {
                        sockets.broadcast("The next wave will arrive in 10 seconds!", '#FDF380');
                        setTimeout(bossRushLoop, 10000);
                    }
                } else {
                    sockets.broadcast(`${bossesAlive} Boss${bossesAlive > 1 ? "es" : ""} left!`);
                }
            };
            function spawnBoss(class_) {
                const o = new Entity(room.randomType("bosp"));
                o.team = -100;
                o.define(class_);
                if (!o.name) o.name = ran.chooseBossName("all", 1)[0];
                // For special boss names:
                switch (o.name) {
                    case "GIGA ":
                    case "John ":
                    case "King ":
                    case "My Chud ":
                    case "Queen ":
                    case "Skibidi ":
                    case "The Original ":
                    case "Uncanny ":
                        o.name += o.label;
                        break;
                    case " Fumo":
                    case " NEO":
                    case " The Undying":
                    case ".EXE":
                        o.name = o.label + o.name;
                        break;
                }
                if (room.bas2 && room.bas2.length) {
                    o.addController(new ioTypes.bossRushAI(o));
                    o.controllers = o.controllers.filter(entry => !(entry instanceof ioTypes['fleeAtLowHealth']));
                }
                o.modeDead = entityModeDead;
                bossesAlive++;
            }
            return function() {
                room.bossRushWave++;
                if (room.bossRushWave % (c.MAX_BOSS_INCREMENT_INTERVAL || 5) === 0 && room.bossRushWave > 0) room.bossRushMaxIncrement += (c.MAX_BOSS_INCREMENT || 0);
                if (room.bossRushWave % (c.MIN_BOSS_INCREMENT_INTERVAL || 5) === 0 && room.bossRushWave > 0) room.bossRushMinIncrement += (c.MIN_BOSS_INCREMENT || 0);
                let minBosses = c.MINBOSSES + room.bossRushMaxIncrement,
                    maxBosses = c.MAXBOSSES + room.bossRushMinIncrement,
                    amount = maxBosses ? (Math.round(Math.random() * (maxBosses - minBosses) + minBosses)) : Math.round(Math.random() * 8 + 4 /*20 + 20*/);
                switch (room.bossRushWave) {
                    case 10:
                    case 20:
                    case 30:
                    case 40:
                    case 50:
                    case 60:
                    case 70:
                    case 75:
                        amount = 1;
                        break;
                    case 71:
                    case 72:
                    case 73:
                    case 74:
                        amount = 12;
                        break;
                }
                bossesAlive = 0;
                sockets.broadcast(`Wave ${room.bossRushWave} has arrived!`);
                if (waveAss[room.bossRushWave] != null) {
                    const assertion = waveAss[room.bossRushWave];
                    for (let i = 0; i < assertion.length; i++) {
                        bosses.push(assertion[i]);
                    }
                }
                bosses.sort(() => 0.5 - Math.random());
                if (waveOverrides[room.bossRushWave] == null) {
                    for (let i = 0; i < amount; i++) {
                        spawnBoss(bosses[i % bosses.length]);
                    }
                } else {
                    const override = waveOverrides[room.bossRushWave];
                    for (let i = 0; i < override.length; i++) {
                        const entry = override[i];
                        if (Array.isArray(entry)) {
                            if (typeof entry[0] === "number") {
                                for (let j = 0; j < entry[0]; j++) {
                                    if (Array.isArray(entry[1])) {
                                        spawnBoss(ran.choose(entry[1]));
                                    } else {
                                        spawnBoss(entry[1]);
                                    }
                                }
                            } else {
                                spawnBoss(ran.choose(entry));
                            }
                        } else {
                            spawnBoss(entry);
                        }
                    }
                }
                sockets.broadcast(`${bossesAlive} boss${bossesAlive > 1 ? "es" : ""} to kill!`, '#E03E41');
            }
        })();

        const voidwalkers = (function() {
            // MAP SET UP //
            const doors = [];
            let buttons = [];
            function makeDoor(loc, team = -101) {
                const door = new Entity(loc);
                door.define(Class.mazeObstacle);
                door.team = team;
                door.SIZE = (room.width / room.xgrid) / 2;
                door.protect();
                door.life();
                door.color = 45;
                doors.push(door);
                const doorID = doors.indexOf(door);
                door.onDead = function() {
                    for (const button of buttons) {
                        if (button.doorID === doorID) {
                            button.ignoreButtonKill = 2;
                            button.kill();
                        }
                    }
                }
            }
            function makeButton(loc, open, doorID) {
                const button = new Entity(loc);
                button.define(Class.button);
                button.pushability = button.PUSHABILITY = 0;
                button.team = -101;
                button.doorID = doorID;
                button.color = (open ? 12 : 11);
                button.onDead = function() {
                    buttons = buttons.filter(instance => instance.id !== button.id);
                    if (!button.ignoreButtonKill) {
                        const door = doors[button.doorID];
                        if (open) {
                            door.alpha = 0.2;
                            door.passive = true;
                            if (door.isAlive() && door.alpha === .2 && door.passive) {
                                let toKill = buttons.find(newButton => newButton.doorID === button.doorID);
                                if (toKill) {
                                    toKill.kill();
                                }
                            }
                        } else {
                            door.alpha = 1;
                            door.passive = false;
                        }
                        for (const other of buttons) {
                            if (button !== other && button.doorID === other.doorID) {
                                other.ignoreButtonKill = true;
                                other.kill();
                            }
                        }
                    }
                    if (button.ignoreButtonKill !== 2) {
                        setTimeout(() => {
                            makeButton(loc, !open, doorID);
                        }, 2500)
                    }
                }
                buttons.push(button);
            }
            function makeButtons() {
                let buttonLocs = [
                ]
                let i = 0;
                for (const loc of room.door) {
                    makeDoor(loc);
                    switch (i++) {
                        case 0:
                            buttonLocs.push({
                                x: loc.x,
                                y: loc.y + (room.height / room.ygrid) / 1.5
                            })
                            break;
                        case 1:
                            buttonLocs.push({
                                x: loc.x + (room.width / room.xgrid) / 1.5,
                                y: loc.y
                            })
                            break;
                        case 2:
                            buttonLocs.push({
                                x: loc.x - (room.width / room.xgrid) / 1.5,
                                y: loc.y
                            })
                            break;
                        case 3:
                            buttonLocs.push({
                                x: loc.x,
                                y: loc.y - (room.height / room.ygrid) / 1.5
                            })
                            break;
                    }
                }
                i = 0
                for (const loc of buttonLocs) {
                    makeButton(loc, 1, i++);
                }
            }
            makeButtons();
            function spawnDominator(location, team, type) {
                const o = new Entity(location);
                o.define(Class[type]);
                o.team = team;
                o.color = getTeamColor(team);
                o.name = "Outpost Guardian";
                o.isDominator = true;
                o.alwaysActive = true;
                o.settings.hitsOwnType = "pushOnlyTeam";
                o.FOV = .5;
            }
            spawnDominator(room["domm"][0], -1, "outpostGuardian");

            // DIFFICULTY INCREASING LOOP //
            setInterval(() => {
                for (let player of players) {
                    // Setup any new players
                    if (!player.body || (player.body && !player.body.isAlive())) {
                        if (player.vw.crasherArray) {
                            while (player.vw.crasherArray.length) {
                                player.vw.crasherArray.shift().destroy()
                            }
                        }
                        if (player.vw.sentryArray) {
                            while (player.vw.sentryArray.length) {
                                player.vw.sentryArray.shift().destroy()
                            }
                        }
                        if (player.vw.bossArray) {
                            while (player.vw.bossArray.length) {
                                player.vw.bossArray.shift().destroy()
                            }
                        }
                        continue
                    }
                    if (!player.vw) {
                        player.vw = {
                            crasherArray: [],
                            sentryArray: [],
                            bossArray: [],
                        }
                        player.body.skill.level = 60
                        player.body.skill.points = 42
                        player.body.refreshBodyAttributes()
                    }
                    player.body.scoped = false
                    player.body.settings.leaderboardable = true

                    // Adjust caps based on difficulty
                    player.body.skill.score = player.vw.distanceFromOutpost = util.getDistance(player.body, room["domm"][0])
                    player.vw.difficulty = Math.min(1, player.vw.distanceFromOutpost / 75_000) // 100000 being the farthest till difficulty stays the same
                    player.vw.crasherAmount = Math.round(185 * player.vw.difficulty)
                    player.vw.sentryAmount = Math.round(26 * player.vw.difficulty)
                    player.vw.bossAmount = Math.round(5 * player.vw.difficulty)

                    // Adjust enemies based on the caps
                    // CRASHERS //
                    for (let i = 0; i < player.vw.crasherArray.length; i++) {
                        let crasher = player.vw.crasherArray[i]
                        if (util.getDistance(player.body, crasher) > 2000) {
                            player.vw.crasherArray.splice(i, 1)
                            crasher.destroy()
                        }
                    }
                    while (player.vw.crasherArray.length > player.vw.crasherAmount) {
                        let crasher = player.vw.crasherArray.shift()
                        crasher.destroy()
                    }
                    let crasherList = getCrasherList(player.vw.difficulty)
                    while (player.vw.crasherArray.length < player.vw.crasherAmount) {
                        if (!crasherList.length) {
                            break;
                        }
                        let crasher = summonCrasher(player, crasherList)
                        player.vw.crasherArray.push(crasher)
                    }

                    // SENTERIES //
                    for (let i = 0; i < player.vw.sentryArray.length; i++) {
                        let sentry = player.vw.sentryArray[i]
                        if (util.getDistance(player.body, sentry) > 2000) {
                            player.vw.sentryArray.splice(i, 1)
                            sentry.destroy()
                        }
                    }
                    while (player.vw.sentryArray.length > player.vw.sentryAmount) {
                        let sentry = player.vw.sentryArray.shift()
                        sentry.destroy()
                    }
                    let sentryList = getSentryList(player.vw.difficulty)
                    while (player.vw.sentryArray.length < player.vw.sentryAmount) {
                        if (!sentryList.length) {
                            break;
                        }
                        let sentry = summonSentry(player, sentryList)
                        player.vw.sentryArray.push(sentry)
                    }

                    // BOSSES // 
                    for (let i = 0; i < player.vw.bossArray.length; i++) {
                        let boss = player.vw.bossArray[i]
                        if (util.getDistance(player.body, boss) > 2000) {
                            player.vw.bossArray.splice(i, 1)
                            boss.destroy()
                        }
                    }
                    while (player.vw.bossArray.length > player.vw.bossAmount) {
                        let boss = player.vw.bossArray.shift()
                        boss.destroy()
                    }
                    let bossList = getBossList(player.vw.difficulty)
                    while (player.vw.bossArray.length < player.vw.bossAmount) {
                        if (!bossList.length) {
                            break;
                        }
                        let boss = summonBoss(player, bossList)
                        player.vw.bossArray.push(boss)
                    }
                }
            }, 1000)

            // DIFFICULTY INCREASING LOOP FUNCTIONS //
            const buffer = 1000 + ran.randomRange(-100, 100)
            let crasherDifficultyList = {
                "0.01": [
                    "crasher",
                    "longCrasher",
                    "invisoCrasher",
                    "minesweepCrasher",
                    "walletCrasher"
                ],
                "0.05": [
                    "bladeCrasher",
                    "semiCrushCrasher",
                    "semiCrushCrasher0",
                    "semiCrushCrasher14",
                    "fastCrasher"
                ],
                "0.15": [
                    "redRunner1",
                    "curvyBoy",
                    "poisonBlades"
                ],
                "0.20": [
                    "visDestructia",
                    "destroyCrasher",
                    "kamikazeCrasher",
                    "orbitcrasher",
                    "busterCrasher",
                    "crushCrasher"
                ],
                "0.25": [
                    "iceCrusher",
                    "torchKamikaze",
                    "redRunner2"
                ],
                "0.3": [
                    "megaCrushCrasher",
                    "prismarineCrash"
                ],
                "0.4": [
                    "boomCrasher",
                    "asteroidCrasher"
                ],
                "0.45": [
                    "blueRunner"
                ],
                "0.5": [
                    "redRunner3",
                    "redRunner4",
                    "wallerCrasher"
                ]
            }
            function getCrasherList(diff) {
                let list = []
                for (let val in crasherDifficultyList) {
                    if (Number(val) > diff) {
                        return list
                    }
                    list = list.concat(crasherDifficultyList[val])
                }
                return list
            }
            function summonCrasher(player, crasherList) {
                const angle = Math.PI * 2 * Math.random();
                let spawnPos = {
                    x: player.body.x + Math.cos(angle) * buffer,
                    y: player.body.y + Math.sin(angle) * buffer
                }
                let crasher = new Entity(spawnPos)
                let type = ran.choose(crasherList)
                crasher.define(Class[type])
                crasher.team = -2
                if (ran.chance(0.5)) {
                    crasher.seeInvisible = true
                }
                crasher.settings.leaderboardable = false
                return crasher
            }

            let sentryDifficultyList = {
                "0.05": [
                    "sentrySwarmAI",
                    "sentryTrapAI",
                ],
                "0.15": [
                    "sentryGunAI",
                    "sentryRangerAI",
                ],
                "0.20": [
                    "flashSentryAI",
                    "semiCrushSentryAI",
                    "scorcherSentryAI"
                ],
                "0.25": [
                    "crushSentryAI",
                    "bladeSentryAI",
                    "skimSentryAI",
                ],
                "0.40": [
                    "squareSwarmerAI",
                ],
                "0.45": [
                    "summonerLiteAI",
                ],
                "0.50": [
                    "squareGunSentry",
                    "crusaderCrash",
                    "kamikazeCrasherLite",
                ],
                "0.55": [
                    "greenSentrySwarmAI",
                ],
                "0.65": [
                    "awp39SentryAI",
                    "varpAI"
                ],
                "0.7": [
                    "flashGunnerAI"
                ]
            }
            function getSentryList(diff) {
                let list = []
                for (let val in sentryDifficultyList) {
                    if (Number(val) > diff) {
                        return list
                    }
                    list = list.concat(sentryDifficultyList[val])
                }
                return list
            }
            function summonSentry(player, sentryList) {
                const angle = Math.PI * 2 * Math.random();
                let spawnPos = {
                    x: player.body.x + Math.cos(angle) * buffer,
                    y: player.body.y + Math.sin(angle) * buffer
                }
                let sentry = new Entity(spawnPos)
                let type = ran.choose(sentryList)
                sentry.define(Class[type])
                sentry.team = -2
                if (ran.chance(0.75)) {
                    sentry.seeInvisible = true
                }
                sentry.settings.leaderboardable = false
                return sentry
            }

            let bossDifficultyList = {
                "0.3": [
                    "trapperzoidAI",
                    "sliderAI",
                    "deltrabladeAI"
                ],
                "0.4": [
                    "trapeFighterAI",
                    "messengerAI"
                ],
                "0.5": [
                    "pulsarAI",
                    "gunshipAI"
                ],
                "0.6": [
                    "visUltimaAI",
                    "colliderAI",
                    "carryingGunshipAI"
                ],
                "0.7": [
                    "alphaSentryAI",
                    "constructionistAI"
                ],
                "0.8": [
                    "vanguardAI",
                    "magnetarAI"
                ],
                "0.9": [
                    "kioskAI",
                    "aquamarineAI"
                ],
                "0.99": [
                    "blitzkriegAI"
                ],
            }
            function getBossList(diff) {
                let list = []
                for (let val in bossDifficultyList) {
                    if (Number(val) > diff) {
                        return list
                    }
                    list = list.concat(bossDifficultyList[val])
                }
                return list
            }
            function summonBoss(player, bossList) {
                const angle = Math.PI * 2 * Math.random();
                let spawnPos = {
                    x: player.body.x + Math.cos(angle) * buffer,
                    y: player.body.y + Math.sin(angle) * buffer
                }
                let boss = new Entity(spawnPos)
                let type = ran.choose(bossList)
                boss.define(Class[type])
                boss.team = -2
                boss.seeInvisible = true
                boss.settings.leaderboardable = false
                return boss
            }
        });

        const getEntity = id => entities.get(id);

        const trimName = name => (name || "").replace("‮", "").trim() || "An unnamed player";
        const quickCombine = stats => {
            if (stats == null) return "Please input a valid array of gun settings.";
            if (stats.length === 13) return "Please make sure to place the gun settings in an array.";
            let data = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
            for (let value of stats)
                for (let i = 0; i < data.length; ++i) data[i] *= value[i];
            return data;
        };

        room.init();
        class IO {
            constructor(b) {
                this.body = b;
                this.acceptsFromTop = true;
            }
            think() {
                return {
                    target: null,
                    goal: null,
                    fire: null,
                    main: null,
                    alt: null,
                    power: null
                };
            }
        }
        const ioTypes = {};
        ioTypes.bossRushAI = class extends IO {
            constructor(body) {
                super(body);
                this.enabled = true;
                this.goal = (room["bas1"]?.length) ? room.randomType("bas1") : room.randomType("norm");
            }
            think(input) {
                if (room.isIn("bas2", this.body)) this.enabled = false;
                if (room.isIn("bosp", this.body)) this.enabled = true;
                this.body.autoOverride = this.enabled;
                if (this.enabled) {
                    return {
                        main: false,
                        fire: false,
                        alt: false,
                        goal: this.goal,
                        target: {
                            x: -(this.body.x - this.goal.x),
                            y: -(this.body.y - this.goal.y)
                        }
                    }
                } else if (!input.main && !input.alt) {
                    if (room["bas1"]?.length) {
                        this.goal = (room.at(this.goal) !== "bas1") ? room.randomType("bas1") : this.goal;
                        return {
                            main: false,
                            fire: false,
                            alt: false,
                            goal: this.goal,
                            target: {
                                x: -(this.body.x - this.goal.x),
                                y: -(this.body.y - this.goal.y)
                            }
                        }
                    }
                }
            }
        }
        ioTypes.doNothing = class extends IO {
            constructor(b) {
                super(b);
                this.acceptsFromTop = false;
            }
            think() {
                return {
                    goal: {
                        x: this.body.x,
                        y: this.body.y
                    },
                    main: false,
                    alt: false,
                    fire: false
                };
            }
        }
        ioTypes.droneTrap = class extends IO {
            constructor(b) {
                super(b);
                this.done = false;
            }
            think(input) {
                if (input.alt && !this.done) {
                    this.done = true;
                    this.body.define(Class.droneTrapTrap);
                }
            }
        }
        const quartPI = Math.PI / 4;
        ioTypes.moveInCircles = class extends IO {
            constructor(b) {
                super(b);
                this.acceptsFromTop = false;
                this.timer = ran.irandom(10) + 3;
                this.goal = {
                    x: this.body.x + 7.5 * Math.cos(-this.body.facing),
                    y: this.body.y + 7.5 * Math.sin(-this.body.facing)
                };
            }
            think() {
                if (!(this.timer--)) {
                    this.timer = 10;
                    this.goal = {
                        x: this.body.x + 7.5 * Math.cos(-this.body.facing),
                        y: this.body.y + 7.5 * Math.sin(-this.body.facing)
                    };
                }
                return {
                    goal: this.goal
                };
            }
        }
        ioTypes.listenToPlayer = class extends IO {
            constructor(b, p) {
                super(b);
                this.player = p;
                this.acceptsFromTop = false;
            }
            think() {
                let targ = {
                    x: this.player.target.x,
                    y: this.player.target.y
                };
                if (this.body.invuln && !this.body.grantedInvuln && (this.player.command.right || this.player.command.left || this.player.command.up || this.player.command.down || this.player.command.lmb)) this.body.invuln = false;
                this.body.autoOverride = this.body.passive || this.player.command.override;
                if (this.body.aiSettings.isDigger) {
                    let av = Math.sqrt(targ.x * targ.x, targ.y * targ.y);
                    let x = targ.x /= av - 1;
                    let y = targ.y /= av - 1;
                    let p;
                    if (!this.body.invuln) {
                        if (this.player.command.lmb) {
                            if (this.body.health.display() > 0.1) {
                                this.body.health.amount -= 1.5;
                                p = 1.75;
                            }
                        } else if (this.player.command.rmb) {
                            this.body.health.amount += 0.75;
                            p = 0.5;
                        } else p = 1;
                    }
                    if (p === 1) this.body.width = 1;
                    else if (p > 1) this.body.width = 2;
                    else this.body.width = 3;
                    return {
                        target: {
                            x: x, y: y
                        },
                        goal: {
                            x: this.body.x + x * !this.body.invuln,
                            y: this.body.y + y * !this.body.invuln
                        },
                        fire: this.player.command.lmb || this.player.command.autofire,
                        main: this.player.command.lmb || this.player.command.autospin || this.player.command.autofire,
                        alt: this.player.command.rmb,
                        power: p,
                    }
                }
                if (this.player.command.autospin) {
                    let kk = Math.atan2(this.body.control.target.y, this.body.control.target.x) + this.body.spinSpeed;
                    targ = {
                        x: 275 * Math.cos(kk),
                        y: 275 * Math.sin(kk)
                    };
                }
                return {
                    target: targ,
                    goal: {
                        x: this.body.x + (this.player.command.right - this.player.command.left),
                        y: this.body.y + (this.player.command.down - this.player.command.up)
                    },
                    fire: this.player.command.lmb || this.player.command.autofire,
                    main: this.player.command.lmb || this.player.command.autospin || this.player.command.autofire,
                    alt: this.player.command.rmb
                };
            }
        }
        ioTypes.listenToPlayerStatic = class extends IO {
            constructor(b, p) {
                super(b);
                this.player = p;
                this.acceptsFromTop = false;
            }
            think() {
                let targ = {
                    x: this.player.target.x,
                    y: this.player.target.y
                };
                if (this.player.command.autospin) {
                    let kk = Math.atan2(this.body.control.target.y, this.body.control.target.x) + .02;
                    targ = {
                        x: 275 * Math.cos(kk),
                        y: 275 * Math.sin(kk)
                    };
                }
                if (this.body.invuln && !this.body.grantedInvuln && (this.player.command.right || this.player.command.left || this.player.command.up || this.player.command.down || this.player.command.lmb)) this.body.invuln = false;
                this.body.autoOverride = this.body.passive || this.player.command.override;
                return {
                    target: targ,
                    fire: this.player.command.lmb || this.player.command.autofire,
                    main: this.player.command.lmb || this.player.command.autospin || this.player.command.autofire,
                    alt: this.player.command.rmb
                };
            }
        }
        ioTypes.mapTargetToGoal = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                if (input.main || input.alt) return {
                    goal: {
                        x: input.target.x + this.body.x,
                        y: input.target.y + this.body.y
                    },
                    power: 1
                };
            }
        }
        ioTypes.guidedAlwaysTarget = class extends IO {
            constructor(b) {
                super(b);
                this.master = b.master
            }
            think(input) {
                return {
                    target: {
                        x: this.master.control.target.x + this.master.x - this.body.x,
                        y: this.master.control.target.y + this.master.y - this.body.y
                    },
                    power: 1
                };
            }
        }
        ioTypes.guided = class extends IO {
            constructor(b) {
                super(b);
                this.master = b.master
            }
            think(input) {
                this.body.isGuided = true
                this.body.aiSettings.SKYNET = true;
                let main = undefined;
                for (let [key, child] of this.master.childrenMap) {
                    if (!child.isGuided) continue;
                    main = child;
                    break;
                }
                if (!main || !this.master.socket) {
                    return
                }
                if (!this.master.altCameraSource) {
                    this.master.altCameraSource = [main.x, main.y]
                } else {
                    this.master.altCameraSource[0] = main.x;
                    this.master.altCameraSource[1] = main.y;
                }
            }
        }
        ioTypes.boomerang = class extends IO {
            constructor(b) {
                super(b);
                this.r = 0;
                this.b = b;
                this.m = b.master;
                this.turnover = false;
                this.myGoal = {
                    x: 3 * b.master.control.target.x + b.master.x,
                    y: 3 * b.master.control.target.y + b.master.y
                };
            }
            think(input) {
                if (this.b.range > this.r) this.r = this.b.range;
                let t = 1;
                if (!this.turnover) {
                    if (this.r && this.b.range < this.r * .5) this.turnover = true;
                    return {
                        goal: this.myGoal,
                        power: t
                    };
                } else return {
                    goal: {
                        x: this.m.x,
                        y: this.m.y
                    },
                    power: t
                };
            }
        }
        ioTypes.goToMasterTarget = class extends IO {
            constructor(body) {
                super(body);
                this.myGoal = {
                    x: body.master.control.target.x + body.master.x,
                    y: body.master.control.target.y + body.master.y
                };
                this.countdown = 5;
            }
            think() {
                if (this.countdown) {
                    if (util.getDistance(this.body, this.myGoal) < 1) {
                        this.countdown--;
                    }
                    return {
                        goal: {
                            x: this.myGoal.x,
                            y: this.myGoal.y
                        }
                    };
                }
            }
        }
        ioTypes.goAwayFromMasterTarget = class extends IO {
            constructor(body) {
                super(body);
                this.myGoal = {
                    x: -body.master.control.target.x + body.master.x,
                    y: -body.master.control.target.y + body.master.y
                };
                this.countdown = 5;
            }
            think() {
                if (this.countdown) {
                    if (util.getDistance(this.body, this.myGoal) < 1) {
                        this.countdown--;
                    }
                    return {
                        goal: {
                            x: this.myGoal.x,
                            y: this.myGoal.y
                        }
                    };
                }
            }
        }
        ioTypes.block = class extends IO {
            constructor(body) {
                super(body);
                this.blockAngle = Math.atan2(body.y - body.master.y, body.x - body.master.x) - Math.atan2(body.master.control.target.y, body.master.control.target.x);
                if (Math.abs(this.blockAngle) === Infinity) this.blockAngle = 0;
                this.myGoal = {
                    x: body.master.control.target.x * Math.cos(this.blockAngle) - body.master.control.target.y * Math.sin(this.blockAngle) + body.master.x,
                    y: body.master.control.target.x * Math.sin(this.blockAngle) + body.master.control.target.y * Math.cos(this.blockAngle) + body.master.y
                };
                this.countdown = 5;
            }
            think() {
                if (this.countdown) {
                    if (util.getDistance(this.body, this.myGoal) < 1) {
                        this.countdown--;
                    }
                    return {
                        goal: {
                            x: this.myGoal.x,
                            y: this.myGoal.y
                        }
                    };
                }
            }
        }
        ioTypes.portal2 = class extends IO {
            constructor(body) {
                super(body); this.portalAngle = Math.atan2(body.y - body.master.y, body.x - body.master.x) - Math.atan2(body.master.control.target.y, body.master.control.target.x);
                if (Math.abs(this.portalAngle) === Infinity) this.portalAngle = 0;
                this.myGoal = {
                    x: body.master.control.target.x * Math.cos(this.portalAngle) - body.master.control.target.y * Math.sin(this.portalAngle) + body.master.x,
                    y: body.master.control.target.x * Math.sin(this.portalAngle) + body.master.control.target.y * Math.cos(this.portalAngle) + body.master.y
                }
            };
            think() {
                this.body.x = this.myGoal.x;
                this.body.y = this.myGoal.y;
                return {
                    goal: {
                        x: this.myGoal.x,
                        y: this.myGoal.y
                    }
                };
            }
        }
        ioTypes.triBoomerang = class extends IO {
            constructor(b) {
                super(b);
                this.r = 0;
                this.b = b;
                this.m = b.master;
                this.turnover = false;
                this.boomAngle = Math.atan2(b.y - b.master.y, b.x - b.master.x) - Math.atan2(b.master.control.target.y, b.master.control.target.x);
                if (Math.abs(this.boomAngle) === Infinity) this.boomAngle = 0;
                this.myGoal = {
                    x: 3 * b.master.control.target.x * Math.cos(this.boomAngle) - 3 * b.master.control.target.y * Math.sin(this.boomAngle) + b.master.x,
                    y: 3 * b.master.control.target.x * Math.sin(this.boomAngle) + 3 * b.master.control.target.y * Math.cos(this.boomAngle) + b.master.y,
                };
            }
            think(input) {
                if (this.b.range > this.r) this.r = this.b.range;
                let t = 1;
                if (!this.turnover) {
                    if (this.r && this.b.range < this.r * .5) this.turnover = true;
                    return {
                        goal: this.myGoal,
                        power: t
                    };
                } else return {
                    goal: {
                        x: this.m.x,
                        y: this.m.y
                    },
                    power: t
                };
            }
        }
        ioTypes.canRepel = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                if (input.alt && input.target && (util.getDistance(this.body, this.body.master) < this.body.master.fov / 1.5)) return {
                    target: {
                        x: -input.target.x,
                        y: -input.target.y
                    },
                    main: true
                };
            }
        }
        ioTypes.mixedNumber = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                if (input.alt) {
                    this.body.define(Class.mixedNumberTrap);
                }
            }
        }
        ioTypes.fireGunsOnAlt = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                if (input.alt) {
                    for (let i = 0; i < this.body.guns.length; i++) {
                        let gun = this.body.guns[i];
                        gun.fire(this.body.skill);
                    }
                    this.body.kill();
                    let gun = this.body.master.guns[this.body.gunIndex];
                    if (gun.countsOwnKids) {
                        for (let [k, v] of gun.childrenMap) {
                            if (v === this) gun.childrenMap.delete(k)
                        }
                    }
                }
            }
        }
        ioTypes.killOnAlt = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                if (input.alt) {
                    this.body.kill();
                }
            }
        }
        ioTypes.leashed = class extends IO {
            constructor(body, range) {
                super(body);
                this.range = range;
            }
            think() {
                if (!this.body.leash) this.body.leash = { x: 0, y: 0, range: this.range, leasher: this.body.source };
                if (!this.body.leash.leasher || !this.body.leash.leasher.isAlive()) {
                    this.body.leash.leasher = this.body;
                }
                this.body.leash.x = this.body.leash.leasher.x;
                this.body.leash.y = this.body.leash.leasher.y;
                if (((this.body.source.x - this.body.x) ** 2 + (this.body.source.y - this.body.y) ** 2) ** .5 > this.body.leash.range) {
                    this.body.velocity.x += (this.body.leash.leasher.x - this.body.x) / (this.body.leash.range)
                    this.body.velocity.y += (this.body.leash.leasher.y - this.body.y) / (this.body.leash.range)
                }
            }
        }
        ioTypes.alwaysFire = class extends IO {
            constructor(body) {
                super(body);
            }
            think() {
                return {
                    fire: true
                };
            }
        }
        ioTypes.targetSelf = class extends IO {
            constructor(body) {
                super(body);
            }
            think() {
                return {
                    main: true,
                    target: {
                        x: 0,
                        y: 0
                    }
                };
            }
        }
        ioTypes.mapAltToFire = class extends IO {
            constructor(body) {
                super(body);
            }
            think(input) {
                if (input.alt) return {
                    fire: true
                };
            }
        }
        ioTypes.onlyAcceptInArc = class extends IO {
            constructor(body) {
                super(body);
            }
            think(input) {
                if (input.target && this.body.firingArc != null && (Math.abs(util.angleDifference(Math.atan2(input.target.y, input.target.x), this.body.firingArc[0])) >= this.body.firingArc[1])) return {
                    fire: false,
                    alt: false,
                    main: false
                };
            }
        }
        ioTypes.onlyFireWhenInRange = class extends IO {
            constructor(body) {
                super(body);
            }
            think(input) {
                if (input.target && this.body.firingArc != null) {
                    if (Math.abs(util.angleDifference(Math.atan2(input.target.y, input.target.x), this.body.facing)) >= .0334) {
                        return {
                            fire: false,
                            altOverride: true
                        };
                    }
                }
            }
        }
        ioTypes.battleshipTurret = class extends IO {
            constructor(body) {
                super(body);
            }
            think(input) {
                if (input.target) {
                    if (Math.abs(util.angleDifference(Math.atan2(input.target.y, input.target.x), this.body.facing)) >= .015) {
                        return {
                            fire: false,
                            altOverride: true
                        };
                    }
                }
            }
        }
        ioTypes.nearestDifferentMaster = class extends IO {
            constructor(body) {
                super(body);
                this.tick = room.cycleSpeed;       // Frame counter for throttling expensive operations.
                this.lead = 0;       // Calculated lead time for predictive aiming.
                this.oldHealth = body.health.display();
                this.targetLock = null;

                // Reusable output to avoid GC pressure in `think()`.
                this.output = {
                    target: { x: 0, y: 0 },
                    fire: false,
                    main: false,
                };
            }

			findTarget(range) {
				// Hoist properties to local variables for faster access in the hot loop.
				const body = this.body;
				const master = body.master.master;
				const pos = body.aiSettings.SKYNET ? body : master;
				const myTeam = master.team;
				const { FARMER, IGNORE_SHAPES, FULL_VIEW, TARGET_EVERYTHING } = body.aiSettings;
				const { seeInvisible, isArenaCloser, firingArc } = body;
				const canSeeInvis = seeInvisible || isArenaCloser;

                // Bounding box for the spatial hashgrid query.
                const searchAABB = {
                    _AABB: {
                        x1: pos.x - range, y1: pos.y - range,
                        x2: pos.x + range, y2: pos.y + range,
                        currentQuery: -1
                    }
                };

                let bestTarget = null;
                let maxValue = -Infinity;
                let foundLockedTarget = false;

                // HOT PATH: This callback runs for every potential target.
                grid.getCollisions(searchAABB, (entity) => {
                    if (foundLockedTarget) return;

					// Filter chain ordered from cheapest to most expensive checks to fail fast.
					if (entity.master.master.team === myTeam || entity.team === -101) return;
					if (entity.isDead() || entity.passive || (entity.invuln && !entity.grantedInvuln)) return;
					if (!FARMER && entity.dangerValue < 1) return;
					if (entity.alpha < 0.5 && !canSeeInvis) return;
					if (c.SANDBOX && entity.sandboxId !== body.sandboxId) return;

					switch (entity.type) {
						case "drone":
                        case "minion":
                        case 'tank':
                        case 'miniboss':
                        case 'crasher':
                            break;
						case 'food':
                            if (IGNORE_SHAPES) return;
                            break;
						default: 
                            if (!TARGET_EVERYTHING) return;
					}


                    if (firingArc && !FULL_VIEW) {
                        const angleToTarget = { x: entity.x - body.x, y: entity.y - body.y };
                        const dot = angleToTarget.x * Math.cos(firingArc[0]) + angleToTarget.y * Math.sin(firingArc[0]);
                        const angleToTargetMag = Math.hypot(angleToTarget.x, angleToTarget.y);
                        if (angleToTargetMag === 0) return;
                        const normalized = dot / angleToTargetMag;
                        if (normalized < Math.cos(this.body.firingArc[1])) return;
                    }

                    // Our current target is still valid at this point
                    if (this.targetLock === entity) {
                        foundLockedTarget = true;
                        return;
                    }

                    // Calculate distance between the current body and the potential target entity.
                    const dx = entity.x - body.x;
                    const dy = entity.y - body.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const effectiveValue = (entity.dangerValue || 1) / distance;
                    if (maxValue <= effectiveValue) {
                        bestTarget = entity;
                        maxValue = effectiveValue;
                    }
                });

                if (foundLockedTarget) {
                    this.targetLock = this.targetLock;
                } else {
                    this.targetLock = bestTarget;
                    this.tick = room.cycleSpeed + 1;
                }
            }

			think(input) {
				// Cede control to the player by returning an empty object.
				if (input.main || input.alt ||
					this.body.master.autoOverride ||
					this.body.master.master.passive ||
					(this.body.master.master.invuln && !this.body.master.master.grantedInvuln)) {
					return {};
				}

                // Bot-specific logic to retaliate on damage.
                const damageRef = this.body.bond || this.body;
                const currentHealth = damageRef.health.display();
                if (damageRef.collisionArray.length && currentHealth < this.oldHealth) {
                    this.oldHealth = currentHealth;
                    const collider = damageRef.collisionArray[0];
                    this.targetLock = (collider.master.id === -1) ? collider.source : collider.master;
                }

                // Throttle expensive target acquisition.
                if (++this.tick > room.cycleSpeed) {
                    this.tick = 0;
                    let range = this.body.aiSettings.SKYNET ? this.body.fov : this.body.master.fov;
                    range *= this.body.aiSettings.BLIND ? 2 / 3 : 1
                    // The old calculation used a circle range so we approximate a square with similar coverage
                    // We nerf range slightly because players complain
                    this.findTarget(
                        (range - (range / Math.sqrt(2)) / 2) * .7
                    );
                }

                // Idle if no valid target.
                if (!this.targetLock || this.targetLock.isDead()) {
                    this.targetLock = null;
                    this.output.main = false;
                    this.output.fire = false;
                    return {};
                }

                const target = this.targetLock;
                const diffX = target.x - this.body.x;
                const diffY = target.y - this.body.y;

				const tracking = this.body.topSpeed;
				this.lead = timeOfImpact({ x: diffX, y: diffY }, target.velocity, tracking);
				if (this.lead === Infinity || this.body.aiSettings.NO_LEAD) this.lead = 0;

                // Mutate and return the pre-allocated output object.
                this.output.target.x = diffX + this.lead * target.velocity.x;
                this.output.target.y = diffY + this.lead * target.velocity.y;
                this.output.fire = true;
                this.output.main = true;

                return this.output;
            }
        };
        ioTypes.roamWhenIdle = class extends IO {
            constructor(body) {
                super(body);
                this.goal = room.randomType("norm");
                this.tick = 0;
            }
            think(input) {
                if (input.main || input.alt || this.body.master.autoOverride) {
                    this.tick = 0;
                    return {};
                }
				if(++this.tick > room.cycleSpeed){
		            while (util.getDistance(this.goal, this.body) < this.body.SIZE * ((room.bossRush) ? 3 : 2)) {
                    	this.goal = room.randomType(
                            (room.bossRush && room['bas1']?.length && ran.chance(.4)) ? "bas1" :
                            (room.isHell) ? ((ran.chance(.2)) ? "norm" : ran.choose(room.presentNests)) :
                            (room.presentNests.length && ran.chance(.2)) ? ran.choose(room.presentNests) :
                            "norm"
                        );
                	}
				}
               	return {
                    goal: this.goal,
                    target: {
                        x: -(this.body.x - this.goal.x),
                        y: -(this.body.y - this.goal.y)
                    }
                };
            }
        }
        ioTypes.minion = class extends IO {
            constructor(body) {
                super(body);
                this.turnwise = 1;
            }
            think(input) {
                if (input.target != null && (input.alt || input.main)) {
                    let sizeFactor = Math.sqrt(this.body.master.size / this.body.master.SIZE),
                        leash = 80 * sizeFactor,
                        orbit = 120 * sizeFactor,
                        repel = 135 * sizeFactor,
                        goal,
                        power = 1,
                        target = new Vector(input.target.x, input.target.y);
                    if (input.alt) {
                        if (target.length < leash) goal = {
                            x: this.body.x + target.x,
                            y: this.body.y + target.y
                        };
                        else if (target.length < repel) {
                            let dir = -this.turnwise * target.direction + Math.PI / 5;
                            goal = {
                                x: this.body.x + Math.cos(dir),
                                y: this.body.y + Math.sin(dir)
                            };
                        } else goal = {
                            x: this.body.x - target.x,
                            y: this.body.y - target.y
                        };
                    } else if (input.main) {
                        let dir = this.turnwise * target.direction + .01;
                        goal = {
                            x: this.body.x + target.x - orbit * Math.cos(dir),
                            y: this.body.y + target.y - orbit * Math.sin(dir)
                        };
                        if (Math.abs(target.length - orbit) < this.body.size * 2) power = .7;
                    }
                    return {
                        goal: goal,
                        power: power
                    };
                }
            }
        }
        ioTypes.minionNoRepel = class extends IO {
            constructor(body) {
                super(body);
                this.turnwise = 1;
            }
            think(input) {
                if (input.target != null && input.main) {
                    let sizeFactor = Math.sqrt(this.body.master.size / this.body.master.SIZE),
                        orbit = 120 * sizeFactor,
                        goal,
                        power = 1,
                        target = new Vector(input.target.x, input.target.y);
                    if (input.main) {
                        let dir = this.turnwise * target.direction + .01;
                        goal = {
                            x: this.body.x + target.x - orbit * Math.cos(dir),
                            y: this.body.y + target.y - orbit * Math.sin(dir)
                        };
                        if (Math.abs(target.length - orbit) < this.body.size * 2) power = .7;
                    }
                    return {
                        goal: goal,
                        power: power
                    };
                }
            }
        }
        ioTypes.hangOutNearMaster = class extends IO {
            constructor(body) {
                super(body);
                this.acceptsFromTop = false;
                this.orbit = 30;
                this.currentGoal = {
                    x: this.body.source.x,
                    y: this.body.source.y
                };
                this.timer = 0;
            }
            think(input) {
                if (this.body.variables.idleOrbit != null) this.orbit = this.body.variables.idleOrbit;
                if (this.body.source !== this.body) {
                    let bound1 = this.orbit * .8 + this.body.source.size + this.body.size,
                        bound2 = this.orbit * 1.5 + this.body.source.size + this.body.size,
                        dist = util.getDistance(this.body, this.body.source) + Math.PI / 8,
                        output = {
                            target: {
                                x: this.body.velocity.x,
                                y: this.body.velocity.y
                            },
                            goal: this.currentGoal,
                            power: undefined
                        };
                    if (dist > bound2 || this.timer > 30) {
                        this.timer = 0;
                        let dir = util.getDirection(this.body, this.body.source) + Math.PI * ran.random(.5),
                            len = ran.randomRange(bound1, bound2),
                            x = this.body.source.x - len * Math.cos(dir),
                            y = this.body.source.y - len * Math.sin(dir);
                        this.currentGoal = {
                            x: x,
                            y: y
                        };
                    }
                    if (dist < bound2) {
                        output.power = .15;
                        if (ran.chance(.3)) this.timer++;
                    }
                    return output;
                }
            }
        }
        ioTypes.wayPoint = class extends IO {
            constructor(body, wayPoints) {
                super(body);
                this.wayPointIndex = 0
                this.wayPoints = wayPoints
            }
            think(input) {
                let x = this.wayPoints[this.wayPointIndex]
                let y = this.wayPoints[this.wayPointIndex + 1]
                let output = {
                    target: {
                        x: x,
                        y: y
                    },
                    goal: { x, y },
                    power: 1
                };

                if (util.getDistance(this, { x, y }) < 3) {
                    if (this.wayPointIndex + 2 >= this.wayPoints.length) {
                        this.wayPointIndex = 0
                    } else {
                        this.wayPointIndex += 2
                    }
                }
                return output
            }
        }
        ioTypes.orbitAroundPlayer = class extends IO {
            constructor(body) {
                super(body);
                this.direction = this.body.velocity.direction;
            }
            think(input) {
                let rad = 4;
                if (this.body.source.control.main) rad += 2;
                else if (this.body.source.control.alt) rad -= 2;
                this.orbit = this.body.source.size * (rad);
                let target = new Vector(this.body.source.x, this.body.source.y);
                let dir = (this.direction += 0.15);
                return {
                    goal: {
                        x: target.x - this.orbit * Math.cos(dir),
                        y: target.y - this.orbit * Math.sin(dir),
                    },
                    power: 15,
                };
            }
        }
        ioTypes.circleTarget = class extends IO {
            constructor(body) {
                super(body);
            }

            think(input) {
                if (input.target != null && (input.alt || input.main)) {
                    let orbit = 280;
                    let goal;
                    let power = 5;
                    let target = new Vector(input.target.x, input.target.y);
                    let dir = target.direction + power;
                    if (input.alt) {
                        orbit /= 2
                        this.body.range -= 0.5
                    }
                    // Orbit point
                    goal = {
                        x: this.body.x + target.x - orbit * Math.cos(dir),
                        y: this.body.y + target.y - orbit * Math.sin(dir),
                    };
                    return {
                        goal: goal,
                        power: power,
                    };
                }
            }
        }
        ioTypes.spin = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a += .05;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.slowSpin = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a += .025;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.slowSpineeeee = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a += .0025;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.slowSpinReverse = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a -= .025;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.slowSpinReverse2 = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a -= .01;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.slowSpin2 = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                this.body.facing += .00375;
                return {
                    target: {
                        x: Math.cos(this.body.facing),
                        y: Math.sin(this.body.facing)
                    },
                    main: true
                };
            }
        }
        ioTypes.fastSpin = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a += .072;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.heliSpin = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a += Math.PI / 10;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.reverseSpin = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a -= .05;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.reverseFastSpin = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a -= .072;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.reverseHeliSpin = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                this.a -= Math.PI / 10;
                let offset = 0;
                if (this.body.bond != null) offset = this.body.bound.angle;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset)
                    },
                    main: true
                };
            }
        }
        ioTypes.dontTurn = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                return {
                    target: {
                        x: 1,
                        y: 0
                    },
                    main: true
                };
            }
        }
        ioTypes.dontTurn2 = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                return {
                    target: {
                        x: 0,
                        y: 1
                    },
                    main: true
                };
            }
        }
        ioTypes.spinWhileIdle = class extends IO {
            constructor(b) {
                super(b);
                this.a = 0;
            }
            think(input) {
                if (input.target) {
                    this.a = Math.atan2(input.target.y, input.target.x);
                    return input;
                }
                this.a += .015;
                return {
                    target: {
                        x: Math.cos(this.a),
                        y: Math.sin(this.a)
                    },
                    main: true
                };
            }
        }
        ioTypes.fleeAtLowHealth = class extends IO {
            constructor(b) {
                super(b);
                this.fear = util.clamp(ran.gauss(.7, .15), .1, .9) * .75;
            }
            think(input) {
                if (input.fire && input.target != null && this.body.health.amount < this.body.health.max * this.fear) return {
                    goal: {
                        x: this.body.x - input.target.x,
                        y: this.body.y - input.target.y
                    }
                };
            }
        }
        ioTypes.fleeAtLowHealth2 = class extends IO {
            constructor(b) {
                super(b);
                this.fear = util.clamp(ran.gauss(.7, .15), .1, .9) * .45;
            }
            think(input) {
                if (input.fire && input.target != null && this.body.health.amount < this.body.health.max * this.fear) return {
                    goal: {
                        x: this.body.x - input.target.x,
                        y: this.body.y - input.target.y
                    },
                    target: {
                        x: this.body.velocity.x,
                        y: this.body.velocity.y
                    }
                };
            }
        }
        ioTypes.orion = class extends IO {
            constructor(b) {
                super(b);
                this.turnwise = 1;
                this.r = 0;
                this.turnover = false;
            }
            think(input) {
                let sizeFactor = Math.sqrt(this.body.master.size / this.body.master.SIZE),
                    orbit = 45 * sizeFactor,
                    power = 1;
                this.body.x += this.body.source.velocity.x;
                this.body.y += this.body.source.velocity.y;
                let dir = this.turnwise * util.getDirection(this.body, this.body.source) + .01,
                    goal = {
                        x: this.body.source.x - orbit * Math.cos(dir),
                        y: this.body.source.y - orbit * Math.sin(dir)
                    };
                return {
                    goal: goal,
                    power: power
                };
            }
        }
        ioTypes.orion2 = class extends IO {
            constructor(b) {
                super(b);
                this.turnwise = 1;
                this.r = 0;
                this.turnover = false;
            }
            think(input) {
                let sizeFactor = Math.sqrt(this.body.master.size / this.body.master.SIZE),
                    orbit = 15 * sizeFactor,
                    power = 1;
                this.body.x += this.body.source.velocity.x;
                this.body.y += this.body.source.velocity.y;
                let dir = this.turnwise * util.getDirection(this.body, this.body.source),
                    goal = {
                        x: this.body.source.x - orbit * Math.cos(dir) + 50,
                        y: this.body.source.y - orbit * Math.sin(dir) + 50
                    };
                return {
                    goal: goal,
                    power: power
                };
            }
        }
        ioTypes.sizething = class extends IO {
            constructor(b) {
                super(b);
                this.div = 20;
                this.origS = 230;
                this.time = this.div;
            }
            think(input) {
                this.body.SIZE = this.time * this.origS * (1 / this.div);
                if (this.body.SIZE <= 0) this.body.kill();
                this.time--;
            }
        }
        ioTypes.rlyfastspin2 = class extends IO {
            constructor(b) {
                super(b);
                this.a = 360 * Math.random();
                this.b = 31 * (Math.sin(Math.PI * Math.round(-1 + Math.random()) + Math.PI / 2));
            }
            think(input) {
                this.a += this.b * Math.PI / 180;
                let offset = 0;
                if (this.body.bond != null) offset = 0;
                return {
                    target: {
                        x: Math.cos(this.a + offset),
                        y: Math.sin(this.a + offset),
                    },
                    main: true,
                };
            }
        }
        ioTypes.mRot = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                return {
                    target: {
                        x: this.body.master.control.target.x,
                        y: this.body.master.control.target.y,
                    },
                    main: true,
                };
            }
        }
        ioTypes.sineA = class extends IO {
            constructor(b) {
                super(b);
                this.phase = 5;
                this.wo = this.body.master.facing;
            }
            think(input) {
                this.phase += .5;
                this.body.x += this.phase * Math.cos(this.wo) - 10 * Math.cos(this.phase) * Math.sin(this.wo);
                this.body.y += this.phase * Math.sin(this.wo) + 10 * Math.cos(this.phase) * Math.cos(this.wo);
                return {
                    power: 1
                };
            }
        }
        ioTypes.sineB = class extends IO {
            constructor(b) {
                super(b);
                this.phase = 5;
                this.wo = this.body.master.facing;
            }
            think(input) {
                this.phase += .5;
                this.body.x += this.phase * Math.cos(this.wo) + 10 * Math.cos(this.phase) * Math.sin(this.wo);
                this.body.y += this.phase * Math.sin(this.wo) - 10 * Math.cos(this.phase) * Math.cos(this.wo);
            }
        }
        ioTypes.sineC = class extends IO {
            constructor(b) {
                super(b);
                this.phase = -5;
                this.wo = this.body.master.facing;
            }
            think(input) {
                this.phase -= .5;
                this.body.x += this.phase * Math.cos(this.wo) + 10 * Math.cos(this.phase) * Math.sin(this.wo);
                this.body.y += this.phase * Math.sin(this.wo) - 10 * Math.cos(this.phase) * Math.cos(this.wo);
                return {
                    power: 1
                };
            }
        }
        ioTypes.sineD = class extends IO {
            constructor(b) {
                super(b);
                this.phase = -5;
                this.wo = this.body.master.facing;
            }
            think(input) {
                this.phase -= .5;
                this.body.x += this.phase * Math.cos(this.wo) - 10 * Math.cos(this.phase) * Math.sin(this.wo);
                this.body.y += this.phase * Math.sin(this.wo) + 10 * Math.cos(this.phase) * Math.cos(this.wo);
            }
        }
        ioTypes.portal = class extends IO {
            constructor(body) {
                super(body);
                this.myGoal = {
                    x: body.master.control.target.x + body.master.x,
                    y: body.master.control.target.y + body.master.y
                };
            }
            think() {
                this.body.x = this.myGoal.x;
                this.body.y = this.myGoal.y;
                return {
                    goal: {
                        x: this.myGoal.x,
                        y: this.myGoal.y
                    }
                };
            }
        }
        ioTypes.animateOnDistance = class extends IO {
            constructor(b) {
                super(b);
            }
            think(input) {
                let animationCase = this.body.variables.animationCase ?? 0,
                    animationDistance = Array.isArray(this.body.variables.animationDistance) ?
                        [this.body.variables.animationDistance[0] * 10, this.body.variables.animationDistance[1] * 10] :
                        this.body.variables.animationDistance * 10
                if (animationCase && input.target) {
                    let targetDistance = {
                        x: input.target.x + this.body.x,
                        y: input.target.y + this.body.y
                    };
                    switch (animationCase) {
                        case 1:
                            if (util.getDistance(this.body, targetDistance) > animationDistance) return { alt: true };
                            else return { alt: false };
                        case 2:
                            if (util.getDistance(this.body, targetDistance) < animationDistance) return { alt: true };
                            else return { alt: false };
                        case 3:
                            if (util.getDistance(this.body, targetDistance) > animationDistance[1]) return { alt: true };
                            if (util.getDistance(this.body, targetDistance) < animationDistance[0]) return this.body.onQ(this.body);
                            else return { alt: false };
                        default:
                            return { alt: false };
                    }
                }
            }
        }
        const skcnv = {
            rld: 0,
            pen: 1,
            str: 2,
            dam: 3,
            spd: 4,
            shi: 5,
            atk: 6,
            hlt: 7,
            rgn: 8,
            mob: 9
        };
        const levelers = [
            1,  2,  3,  4,  5,  6,  7,  8,  9,  10,
            11, 12, 13, 14,     16, 17, 18, 19, 20,
            21, 22, 23, 24, 25, 26, 27, 28, 29,
            31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
                42,     44,     46,     48,     50,
                            55,                 60
        ];
        const curve = (() => {
            const make = x => Math.log(4 * x + 1) / Math.log(5);
            let a = [];
            for (let i = 0; i < c.MAX_SKILL * 2; i++) a.push(make(i / c.MAX_SKILL));
            return x => a[x * c.MAX_SKILL];
        })();
        const apply = (f, x) => x < 0 ? 1 / (1 - x * f) : f * x + 1;
        class Skill {
            constructor(inital = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) {
                this.raw = inital;
                this.caps = [];
                this.setCaps([c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL]);
                this.name = ["Reload", "Bullet Penetration", "Bullet Health", "Bullet Damage", "Bullet Speed", "Shield Capacity", "Body Damage", "Max Health", "Shield Regeneration", "Movement Speed"];
                this.atk = 0;
                this.hlt = 0;
                this.spd = 0;
                this.str = 0;
                this.pen = 0;
                this.dam = 0;
                this.rld = 0;
                this.mob = 0;
                this.rgn = 0;
                this.shi = 0;
                this.rst = 0;
                this.brst = 0;
                this.ghost = 0;
                this.acl = 0;
                this.reset();
            }
            reset() {
                this.points = 0;
                this.score = 0;
                this.deduction = 0;
                this.level = 0;
                this.update();
                this.maintain();
            }
            update() {
                for (let i = 0; i < 10; i++)
                    if (this.raw[i] > this.caps[i]) {
                        this.points += this.raw[i] - this.caps[i];
                        this.raw[i] = this.caps[i];
                    }
                let attrib = [];
                for (let i = 0; i < 10; i++) {
                    attrib[i] = curve(this.raw[i] / c.MAX_SKILL);
                }
                this.rld = Math.pow(0.5, attrib[skcnv.rld]);
                this.pen = apply(2.5, attrib[skcnv.pen]);
                this.str = apply(3, attrib[skcnv.str]);
                this.dam = apply(3.4, attrib[skcnv.dam]);
                this.spd = 0.5 + apply(1.5, attrib[skcnv.spd]);
                this.acl = apply(0.5, attrib[skcnv.rld]);
                this.rst = 0.5 * attrib[skcnv.str] + 2.5 * attrib[skcnv.pen];
                this.ghost = attrib[skcnv.pen];
                this.shi = c.GLASS_HEALTH_FACTOR * apply(3 / c.GLASS_HEALTH_FACTOR - 1, attrib[skcnv.shi]);
                this.atk = apply(0.027, attrib[skcnv.atk]);
                this.hlt = c.GLASS_HEALTH_FACTOR * apply(2 / c.GLASS_HEALTH_FACTOR - 1, attrib[skcnv.hlt]);
                this.mob = apply(0.8, attrib[skcnv.mob]);
                this.rgn = apply(25, attrib[skcnv.rgn]);
                this.brst = 0.3 * (0.5 * attrib[skcnv.atk] + 0.5 * attrib[skcnv.hlt] + attrib[skcnv.rgn]);
            }
            set(thing) {
                this.raw[0] = thing[0];
                this.raw[1] = thing[1];
                this.raw[2] = thing[2];
                this.raw[3] = thing[3];
                this.raw[4] = thing[4];
                this.raw[5] = thing[5];
                this.raw[6] = thing[6];
                this.raw[7] = thing[7];
                this.raw[8] = thing[8];
                this.raw[9] = thing[9];
                this.update();
            }
            setCaps(thing) {
                this.caps[0] = thing[0];
                this.caps[1] = thing[1];
                this.caps[2] = thing[2];
                this.caps[3] = thing[3];
                this.caps[4] = thing[4];
                this.caps[5] = thing[5];
                this.caps[6] = thing[6];
                this.caps[7] = thing[7];
                this.caps[8] = thing[8];
                this.caps[9] = thing[9];
                this.update();
            }
            maintain(aboveCap = false) {
                if ((this.level < c.SKILL_CAP || aboveCap) && this.score - this.deduction >= this.levelScore) {
                    this.deduction += this.levelScore;
                    this.level += 1;
                    this.points += this.levelPoints;
                    return true;
                }
                return false;
            }
            get levelScore() {
                return Math.ceil(1.8 * Math.pow(this.level + 1, 1.8) - 2 * this.level + 1);
            }
            get progress() {
                return this.levelScore ? (this.score - this.deduction) / this.levelScore : 0;
            }
            get levelPoints() {
                if ((c.serverName === "Squidward's Tiki Land" && this.level <= 90) || levelers.indexOf(this.level) !== -1) return 1;
                return 0;
            }
            cap(skill, real = false) {
                if (!real && this.level < c.SKILL_SOFT_CAP) return Math.round(this.caps[skcnv[skill]] * c.SOFT_MAX_SKILL);
                return this.caps[skcnv[skill]];
            }
            bleed(i, j) {
                let a = (i + 2) % 5 + 5 * j,
                    b = (i + (j === 1 ? 1 : 4)) % 5 + 5 * j,
                    value = 0,
                    denom = Math.max(c.MAX_SKILL, this.caps[i + 5 * j]);
                value += (1 - Math.pow(this.raw[a] / denom - 1, 2)) * this.raw[a] * c.SKILL_LEAK;
                value -= Math.pow(this.raw[b] / denom, 2) * this.raw[b] * c.SKILL_LEAK;
                return value;
            }
            upgrade(stat) {
                if (this.points && this.amount(stat) < this.cap(stat)) {
                    this.change(stat, 1);
                    this.points -= 1;
                    return true;
                }
                return false;
            }
            title(stat) {
                return this.name[skcnv[stat]];
            }
            amount(skill) {
                return this.raw[skcnv[skill]];
            }
            change(skill, levels) {
                this.raw[skcnv[skill]] += levels;
                this.update();
            }
        }
        const realSizes = (() => {
            let o = [1, 1, 1];
            for (let i = 3; i < 17; i++) o.push(Math.sqrt((2 * Math.PI / i) * (1 / Math.sin(2 * Math.PI / i))));
            return o;
        })();
        class Gun {
            constructor(body, info, gunIndex) {
                this.lastShot = {
                    time: 0,
                    power: 0
                };
                this.body = body;
                this.master = body.source;
                this.gunIndex = gunIndex;
                this.label = "";
                this.labelOverride = "";
                this.controllers = [];
                this.childrenMap = new Map();
                this.laserMap = new Map();
                this.control = {
                    target: new Vector(0, 0),
                    goal: new Vector(0, 0),
                    main: false,
                    alt: false,
                    fire: false
                };
                this.canShoot = false;
                this.skin = 0;
                this.color_unmix = 0;
                this.color = 16;
                this.colorOverride = null;
                this.shootOnDeath = false;
				this.weaponSize = 0;
                let PROPERTIES = info.PROPERTIES;
                if (PROPERTIES != null && PROPERTIES.TYPE != null) {
                    this.canShoot = true;
                    this.shootOnce = PROPERTIES.SHOOT_ONCE;
                    this.label = PROPERTIES.LABEL || "";
                    if (Array.isArray(PROPERTIES.TYPE)) {
                        this.bulletTypes = PROPERTIES.TYPE;
                        this.natural = PROPERTIES.TYPE.BODY;
                    } else this.bulletTypes = [PROPERTIES.TYPE];
                    let natural = {};
                    const setNatural = type => {
                        if (type.PARENT != null)
                            for (let i = 0; i < type.PARENT.length; i++) setNatural(type.PARENT[i]);
                        if (type.BODY != null)
                            for (let index in type.BODY) natural[index] = type.BODY[index];
                    };
                    for (let type of this.bulletTypes) setNatural(type);
                    this.natural = natural;
                    this.autofire = PROPERTIES.AUTOFIRE == null ? false : PROPERTIES.AUTOFIRE;
                    this.altFire = PROPERTIES.ALT_FIRE == null ? false : PROPERTIES.ALT_FIRE;
                    this.duoFire = PROPERTIES.DUO_FIRE == null ? false : PROPERTIES.DUO_FIRE;
                    this.settings = PROPERTIES.SHOOT_SETTINGS || [];
                    this.settings2 = (info.PROPERTIES.SHOOT_SETTINGS2 == null) ? [] : info.PROPERTIES.SHOOT_SETTINGS2;
                    this.settings3 = (info.PROPERTIES.SHOOT_SETTINGS3 == null) ? [] : info.PROPERTIES.SHOOT_SETTINGS3;
                    this.onShoot = PROPERTIES.ON_SHOOT;
                    this.onFire = PROPERTIES.ON_FIRE;
                    this.timesToFire = PROPERTIES.TIMES_TO_FIRE || 1;
                    this.calculator = PROPERTIES.STAT_CALCULATOR || "default";
                    this.waitToCycle = PROPERTIES.WAIT_TO_CYCLE == null ? false : PROPERTIES.WAIT_TO_CYCLE;
                    this.countsOwnKids = PROPERTIES.COUNTS_OWN_KIDS != null ? PROPERTIES.COUNTS_OWN_KIDS : PROPERTIES.MAX_CHILDREN == null ? false : PROPERTIES.MAX_CHILDREN;
                    this.syncsSkills = PROPERTIES.SYNCS_SKILLS == null ? false : PROPERTIES.SYNCS_SKILLS;
                    this.useHealthStats = PROPERTIES.USE_HEALTH_STATS == null ? false : PROPERTIES.USE_HEALTH_STATS;
                    this.negRecoil = PROPERTIES.NEGATIVE_RECOIL == null ? false : PROPERTIES.NEGATIVE_RECOIL;
                    this.ammoPerShot = (info.PROPERTIES.AMMO_PER_SHOT == null) ? 0 : info.PROPERTIES.AMMO_PER_SHOT;
                    this.destroyOldestChild = PROPERTIES.DESTROY_OLDEST_CHILD == null ? false : PROPERTIES.DESTROY_OLDEST_CHILD;
                    this.shootOnDeath = PROPERTIES.SHOOT_ON_DEATH == null ? false : PROPERTIES.SHOOT_ON_DEATH;
                    this.onDealtDamage = PROPERTIES.ON_DEALT_DAMAGE == null ? null : PROPERTIES.ON_DEALT_DAMAGE;
                    if (PROPERTIES.COLOR_OVERRIDE != null) this.colorOverride = PROPERTIES.COLOR_OVERRIDE;
                    if (PROPERTIES.CAN_SHOOT != null) this.canShoot = PROPERTIES.CAN_SHOOT;
                    this.alpha = PROPERTIES.ALPHA;
					this.skipLabelChange = PROPERTIES.SKIP_LABEL_CHANGE == null ? false : PROPERTIES.SKIP_LABEL_CHANGE;
                }
                if (PROPERTIES != null && PROPERTIES.COLOR != null) this.color = PROPERTIES.COLOR;
                if (PROPERTIES != null && PROPERTIES.COLOR_UNMIX != null) this.color_unmix = PROPERTIES.COLOR_UNMIX;
                if (PROPERTIES != null && PROPERTIES.SKIN != null) this.skin = PROPERTIES.SKIN;
                if (PROPERTIES != null && PROPERTIES.FAKE != null) this.isFake = PROPERTIES.FAKE;
                let position = info.POSITION;
                this.length = position[0] / 10;
                this.width = position[1] / 10;
                this.aspect = position[2];
                let offset = new Vector(position[3], position[4]);
                this.angle = position[5] * Math.PI / 180;
                this.direction = offset.direction;
                this.offset = offset.length / 10;
                this.delay = position[6];
                this.position = 0;
                this.motion = 0;
                if (this.canShoot) {
                    this.cycle = !this.waitToCycle - this.delay;
                    this.destroyOldestChild = !!this.destroyOldestChild;
                }
                if (body.mockupGuns) {
                    this.shootOnDeath = false
                    this.canShoot = false
                }
            }
            getEnd(speedVec = { x: 0, y: 0 }, lerpComp = 0, length) {
                length = length ?? this.length
                const gx = this.offset * Math.cos(this.direction + this.angle + this.body.facing) + (length - this.width * this.settings.size / 2) * Math.cos(this.angle + this.body.facing)
                const gy = this.offset * Math.sin(this.direction + this.angle + this.body.facing) + (length - this.width * this.settings.size / 2) * Math.sin(this.angle + this.body.facing)
                return {
                    x: this.body.x + this.body.size * gx - (length * speedVec.x) * lerpComp,
                    y: this.body.y + this.body.size * gy - (length * speedVec.y) * lerpComp
                }
            }
            newRecoil() {
                if (this.body.settings.hasNoRecoil || this.isFake) return;
                let recoilForce = this.settings.recoil * 2 / room.speed;
                this.body.accel.x -= recoilForce * Math.cos(this.recoilDir || 0);
                this.body.accel.y -= recoilForce * Math.sin(this.recoilDir || 0);
            }
            getSkillRaw() {
                return [ // Not this one
                    this.body.skill.raw[0],
                    this.body.skill.raw[1],
                    this.body.skill.raw[2],
                    this.body.skill.raw[3],
                    this.body.skill.raw[4],
                    0,
                    0,
                    0,
                    0,
                    0
                ];
            }
            liveButBetter() {
                if (this.canShoot) {
                    if (this.countsOwnKids + this.destroyOldestChild - 1 <= this.childrenMap.size) {
                        for (let [k, v] of this.childrenMap) {
                            if (v == null || v.isGhost || v.isDead()) {
                                this.childrenMap.delete(k)
                            }
                        }
                    }
                    if (this.destroyOldestChild) {
                        if (this.childrenMap.size > (this.countsOwnKids || this.body.maxChildren)) {
                            this.destroyOldest();
                        }
                    }
                    let sk = this.body.skill,
                        shootPermission = this.countsOwnKids ? (this.countsOwnKids + this.destroyOldestChild) > this.childrenMap.size * (this.calculator === 7 ? sk.rld : 1) : this.body.maxChildren ? this.body.maxChildren > this.body.childrenMap.size * (this.calculator === 7 ? sk.rld : 1) : true;
                    if (this.body.master.invuln && !this.body.master.grantedInvuln) {
                        shootPermission = false;
                    }
                    if ((shootPermission || !this.waitToCycle) && this.cycle < 1) {
                        this.cycle += 1 / this.settings.reload / room.speed / (this.calculator === 7 || this.calculator === 4 ? 1 : sk.rld);
                    }
                    if (shootPermission && (this.autofire || (this.duoFire ? this.body.control.alt || this.body.control.fire : this.altFire ? (this.body.control.alt && !this.body.control.altOverride) : this.body.control.fire))) {
                        if (this.cycle >= 1) {
                            if (this.ammoPerShot) {
                                if (this.body.master.ammo - this.ammoPerShot >= 0) {
                                    this.body.master.ammo -= this.ammoPerShot;
                                    if (this.body.master.displayAmmoText) {
                                        this.body.master.displayText = this.body.master.ammo + " Ammo left";
                                    }
                                } else {
                                    shootPermission = false;
                                }
                            }
                            if (shootPermission && this.cycle >= 1) {
                                /*
                                    * This exists, and should not be removed!!
                                    * When I got around the eval packet defense, I unfortunately was able to bot woomy.
                                    * In team modes, I could sit in base and spam laggy tanks without punishment!
                                    * If this feature stays implemented, then I will be unable to do so.
                                    * Also fuck "puppeteer"
                                    
                                    * Players are now able to shoot in base as the server is running locally
                                    */
                                if (c.DO_BASE_DAMAGE && this.body.type !== "wall" && this.body.isInMyBase() && c.CANNOT_SHOOT_IN_BASE && !this.body.shootsInBaseAnyway) {
                                    if (this.body.childrenMap && this.body.childrenMap.size) this.body.childrenMap.forEach((k) => k.destroy())
                                } else {
                                    if (!this.body.variables.emp || this.body.variables.emp == undefined || !this.body.master.variables.emp || this.body.master.variables.emp == undefined) {
                                        for (let i = 0; i < this.timesToFire; i++) {
                                            if (this.onFire) {
                                                this.onFire(this, sk);
                                            } else {
                                                this.fire(sk);
                                            }
                                        }
                                    }
                                }
                                shootPermission = this.countsOwnKids ? (this.countsOwnKids + this.destroyOldestChild) > this.childrenMap.size : this.body.maxChildren ? this.body.maxChildren >= this.body.childrenMap.size : true;
                                this.cycle -= 1;
                                if (this.onShoot != null && this.body.master.isAlive()) {
                                    this.body.master.runAnimations(this);
                                }
                            }
                        }
                    } else if (this.cycle > !this.waitToCycle - this.delay) this.cycle = !this.waitToCycle - this.delay;
                }
            }
            destroyOldest() {
                this.childrenMap.values().next().value?.kill?.();
            }
            syncChildren() {
                if (this.syncsSkills) {
                    let self = this;
                    this.childrenMap.forEach((child) => {
                        child.define({
                            BODY: self.interpret(),
                            SKILL: self.getSkillRaw()
                        });
                        child.refreshBodyAttributes();
                    })
                    this.laserMap.forEach((laser) => {
                        laser.refreshStats()
                    })
                }
            }
            fire(sk) {
                if (this.shootOnce) this.canShoot = false;
                this.lastShot.time = util.time();
                this.lastShot.power = 3 * Math.log(Math.sqrt(sk.spd) + ((this.body.settings.hasNoRecoil || this.isFake) ? 0 : this.settings.recoil) + 1) + 1;
                this.motion += this.lastShot.power;
                this.recoilDir = this.body.facing + this.angle;
                this.newRecoil();
                let ss = util.clamp(ran.gauss(0, Math.sqrt(this.settings.shudder, 1)), -1.5 * this.settings.shudder, 1.5 * this.settings.shudder),
                    sd = util.clamp(ran.gauss(0, this.settings.spray * this.settings.shudder, 1), -.5 * this.settings.spray, .5 * this.settings.spray);
                sd *= Math.PI / 180;
                let speed = (this.negRecoil ? -1 : 1) * this.settings.speed * c.runSpeed * sk.spd * (1 + ss);
                let s = new Vector(speed * Math.cos(this.angle + this.body.facing + sd), speed * Math.sin(this.angle + this.body.facing + sd));
                const vel = this.body.velocity;
                if (vel.length) {
                    let extraBoost = Math.max(0, s.x * vel.x + s.y * vel.y) / vel.length / s.length;
                    if (extraBoost) {
                        let len = s.length;
                        s.x += vel.length * extraBoost * s.x / len;
                        s.y += vel.length * extraBoost * s.y / len;
                    }
                }

                if (this.bulletTypes[0].TYPE === "laser") {
                    new Laser(this, this.getEnd(), sd, typeof this.bulletTypes[1] === "object" ? Object.assign({}, this.bulletTypes[0], this.bulletTypes[1]) : this.bulletTypes[0])
                    return;
                } else {
                    let o = new Entity(this.getEnd(s, .6), this.master.master);
                    // Set velocity first so bulletInit can use it to set proper facing/firing
                    o.velocity = s;
                    this.bulletInit(o);
                    return o;
                }
            }
            bulletInit(o) {
                o.source = this.body;
                o.diesToTeamBase = !this.body.master.godmode;
                o.passive = this.body.master.passive;
                if (this.colorOverride === "rainbow") o.toggleRainbow();
                else if (this.body.mainWeaponColor === "rainbow") o.toggleRainbow();
                for (let type of this.bulletTypes) o.define(type);
                /*
                    o.define({ // Define is slow as heck
                        BODY: this.interpret(),
                        SKILL: this.getSkillRaw(),
                        SIZE: this.body.size * this.width * this.settings.size / 2,
                        LABEL: this.master.label + (this.label ? " " + this.label : "") + " " + o.label
                    });*/

                // Define body
                let settings = this.interpret()
                for (let set in settings) {
                    if (set === "HETERO") {
                        o.heteroMultiplier = settings[set]
                        continue;
                    }
                    o[set] = settings[set]
                }
                o.refreshBodyAttributes()
                // Define skills
                o.skill.set(this.getSkillRaw());
                // Define size
				this.weaponSize = (this.body.size * this.width * this.settings.size * 0.5) * o.squiggle;
                o.SIZE = this.weaponSize;
                // Define label
                if (!this.skipLabelChange) o.label = this.master.label + (this.master.label && (o.label || this.label) ? " " : "") + this.label + (this.label && o.label ? " " : "") + o.label;

                if (o.type === "food") {
                    o.ACCELERATION = .015 / (o.size * 0.2);
                };
                if (this.onDealtDamage != null) o.onDealtDamage = this.onDealtDamage;
                if (this.colorOverride != null) o.color = this.colorOverride;
                else if (this.colorOverride === "random") o.color = Math.floor(42 * Math.random());
                else if (this.body.mainWeaponColor != null) o.color = this.body.mainWeaponColor;
                else if (this.body.mainWeaponColor === "random") o.color = Math.floor(42 * Math.random());
                else o.color = this.body.master.color;
                if (this.countsOwnKids) {
                    o.parent = this;
                    this.childrenMap.set(o.id, o)
                } else if (this.body.maxChildren) {
                    o.parent = this.body;
                    this.childrenMap.set(o.id, o)
                }
                this.body.childrenMap.set(o.id, o);
                o.facing = o.velocity.direction;
                o.gunIndex = this.gunIndex;
                o.refreshBodyAttributes();
                o.life();
            }
            getTracking() {
                return {
                    speed: c.runSpeed * this.body.skill.spd * this.settings.maxSpeed * this.natural.SPEED,
                    range: Math.sqrt(this.body.skill.spd) * this.settings.range * this.natural.RANGE
                };
            }
            interpret(alt = false) {
                let sizeFactor = this.master.size / this.master.SIZE,
                    shoot = alt ? alt : this.settings,
                    sk = this.body.skill,
                    out = {
                        SPEED: shoot.maxSpeed * sk.spd,
                        HEALTH: .625 * shoot.health * sk.str,
                        RESIST: shoot.resist + sk.rst,
                        DAMAGE: 1.65 * shoot.damage * sk.dam,
                        PENETRATION: Math.max(1, shoot.pen * sk.pen),
                        RANGE: shoot.range / Math.sqrt(sk.spd),
                        DENSITY: shoot.density * sk.pen * sk.pen / sizeFactor,
                        PUSHABILITY: 1 / sk.pen,
                        HETERO: Math.max(0, 3 - 1.2 * sk.ghost),
                    };
                switch (this.calculator) {
                    case 2:
                    case "drone":
                        out.DAMAGE = shoot.damage * sk.dam;
                        out.HEALTH = 0.475 * shoot.health * sk.str;
                        break;
                    case 6:
                    case "sustained":
                        out.RANGE = shoot.range;
                        break;
                    case 8:
                    case "trap":
                        out.PUSHABILITY = 1 / Math.pow(sk.pen, .5);
                        out.RANGE = shoot.range;
                        break;
                }
                for (let property in out) {
                    if (this.natural[property] == null || !out.hasOwnProperty(property)) continue;
                    out[property] *= this.natural[property];
                }
                return out;
            }
        }
        class Prop {
            constructor(info) {
                let pos = info.POSITION;
                this.size = pos[0];
                this.x = pos[1];
                this.y = pos[2];
                this.angle = pos[3] * Math.PI / 180;
                this.layer = pos[4];
                this.shape = info.SHAPE;
                this.color = info.COLOR || -1;
                this.fill = info.FILL != undefined ? info.FILL : true;
                this.stroke = info.STROKE != undefined ? info.STROKE : true;
                this.loop = info.LOOP != undefined ? info.LOOP : true;
                this.isAura = info.IS_AURA != undefined ? info.IS_AURA : false;
                this.ring = info.RING;
                this.arclen = info.ARCLEN != undefined ? info.ARCLEN : 1;
                this.rpm = info.RPM != undefined ? info.RPM : false;
                this.dip = info.DIP != undefined ? info.DIP : 1;
                this.lockRot = info.LOCK_ROT != undefined ? info.LOCK_ROT : true;
                this.scaleSize = info.SCALE_SIZE != undefined ? info.SCALE_SIZE : true;
                this.tankOrigin = info.TANK_ORIGIN != undefined ? info.TANK_ORIGIN : true;
                if (this.isAura === true) this.stroke = false;
            }
        }
        let bots = [];
        let entitiesToAvoid = [];
        let entities = new Chain();
        let bot = null;
        let players = [];
        let clients = [];
        global.updateRoomInfo = () => {
            const obj = { type: "updatePlayers", players: clients.length, maxPlayers: maxPlayersOverride, name: room.displayName, desc: room.displayDesc };
            console.log("Updating room info in WRM", obj)
            worker.postMessage(obj)
        }
        let multitabIDs = [];
        let connectedIPs = [];
        let entitiesIdLog = 1;
        let startingTank = c.serverName.includes("Testbed Event") ? "event_bed" : ran.chance(1 / 25000) ? "tonk" : "basic";
        let blockedNames = [ // I have a much longer list, across alot of languages. Might add it
            "fuck",
            "bitch",
            "cunt",
            "shit",
            "pussy",
            "penis",
            "nigg",
            "penis",
            "dick",
            "whore",
            "dumbass",
            "fag"
        ];
        let bannedPhrases = [
            "fag",
            "nigg",
            "trann",
            "troon"
        ];
        let grid = new HashGrid();/*new QuadTree({
        x: 0,
        y: 0,
        width: room.width,
        height: room.height
    }, 16, 16, 0),
        targetingGrid = new QuadTree({
            x: 0,
            y: 0,
            width: room.width,
            height: room.height
        }, 16, 16, 0);//new hshg.HSHG();*/

        const dirtyCheck = (p, r, layer = 0) => entitiesToAvoid.some(e => (e.roomLayerless || e.roomLayer === layer) && Math.abs(p.x - e.x) < r + e.size && Math.abs(p.y - e.y) < r + e.size);

        /*const purgeEntities = () => entities = entities.filter(e => {
            if (e.isGhost) {
                e.removeFromGrid();
                return false;
            }
            return true;
        });*/

        // e.removeFromGrid is useless thereby making this useless
        const purgeEntities = () => {
            let ghosts = 0;
            entities.filterToChain(e => {
                if (e.isGhost) {
                    ghosts++
                    e.removeFromGrid();
                    return false;
                }
                return true;
            });
        }

        class HealthType {
            constructor(health, type, resist = 0) {
                this.max = health || .01;
                this.amount = health || .01;
                this.type = type;
                this.resist = resist;
                this.regen = 0;
                this.lastDamage = 0;
                this.rMax = health || .01;
                this.rAmount = health || .01;
            }
            get max() {
                return this.rMax;
            }
            get amount() {
                return this.rAmount;
            }
            set max(value) {
                if (Number.isFinite(value)) {
                    this.rMax = value;
                }
            }
            set amount(value) {
                if (Number.isFinite(value)) {
                    this.rAmount = value;
                }
            }
            set(health, regen = 0) {
                if (health <= 0) {
                    health = .01;
                }
                this.amount = (this.max) ? this.amount / this.max * health : health;
                this.max = health;
                this.regen = regen;
            }
            display() {
                return this.amount / this.max;
            }
            getDamage(amount, capped = true) {
                switch (this.type) {
                    case "dynamic":
                        return capped ? Math.min(amount * this.permeability, this.amount) : amount * this.permeability;
                    case "static":
                        return capped ? Math.min(amount, this.amount) : amount;
                }
            }
            regenerate(boost = false) {
                boost /= 2;
                let mult = c.REGEN_MULTIPLIER;
                switch (this.type) {
                    case "static":
                        if (this.amount >= this.max || !this.amount) break;
                        this.amount += mult * (this.max / 10 / 60 / 2.5 + boost);
                        break;
                    case "dynamic":
                        let r = util.clamp(this.amount / this.max, 0, 1);
                        if (!r) this.amount = .0001;
                        if (r === 1) this.amount = this.max;
                        else this.amount += mult * (this.regen * Math.exp(-50 * Math.pow(Math.sqrt(.5 * r) - .4, 2)) / 3 + r * this.max / 10 / 15 + boost);
                        break;
                }
                this.amount = util.clamp(this.amount, 0, this.max);
            }
            get permeability() {
                switch (this.type) {
                    case "static":
                        return 1;
                    case "dynamic":
                        return this.max ? util.clamp(this.amount / this.max, 0, 1) : 0;
                }
            }
            get ratio() {
                return this.max ? util.clamp(1 - Math.pow(this.amount / this.max - 1, 4), 0, 1) : 0;
            }
        }


        const lasers = new Set();
        let laserId = 0;

        class Laser {
            constructor(gun, startPos, angle, settings = {}) {
                this.id = laserId++;
                this.settings = settings;
                this.setGun(gun);
                this.skills = {
                    dmg: this.master?.skill?.dam ?? 0,
                    len: this.master?.skill?.spd ?? 0,
                    dur: this.master?.skill?.str ?? 0,
                    prc: this.master?.skill?.pen ?? 0,
                }
                this.scaleWidth = settings.SCALE_WIDTH ?? true;
                this.refreshStats()
                this.label = settings.LABEL ?? "Laser";
                this.persistsAfterDeath = settings.PERSISTS_AFTER_DEATH ?? false;
                this.clearOnMasterUpgrade = settings.CLEAR_ON_MASTER_UPGRADE ?? true;

                this.color = this.master?.master?.color ?? this.master?.color ?? 16;
                this.team = this.master?.master?.team ?? this.master?.team ?? -101;
                this.hitEntities = new Set();

                this.followGun = this.settings.FOLLOW_GUN ?? true;
                this.layer = this.settings.LAYER ?? this.master?.LAYER ?? 0;

                // Angle passed in should be in the same trig convention as getEnd (cos -> x, sin -> y).
                // Use the exact angle supplied — do not add a hard-coded 90° offset here.
                this.angle = (angle ?? 0);
                if (this.followGun === false && this.gun.master) this.angle += this.gun.master.facing + this.gun.angle;
                this.startPoint = this.gun ? this.gun.getEnd() : { x: startPos.x, y: startPos.y };

                this.onDealtDamage = this.settings.ON_DEALT_DAMAGE;
                this.onDealtDamageUniv = this.settings.ON_DEALT_DAMAGE_UNIVERSAL;

                this.endPoint = { x: 0, y: 0 };
                this.calcEndPoint();
                this.visualEndPoint = { x: this.endPoint.x, y: this.endPoint.y };

                lasers.add(this);
            }

            refreshStats() {
                this.width = (this.scaleWidth ? (this.settings.WIDTH ?? 0) + (this.master?.size * this.gun?.width) : this.settings.WIDTH) ?? 5;
                this.range = (this.settings.RANGE ?? 300) * (this.skills.len * 5);
                this.duration = (this.settings.DURATION ?? 300) * (this.skills.dur * 20);
                this.maxDuration = this.duration;
                this.pierce = Math.round((this.settings.PIERCE ?? 1) * this.skills.prc);
                this.damage = (this.settings.DAMAGE ?? .1) * (this.skills.dmg / 2);
            }

            calcEndPoint() {
                let angle = this.angle;
                if (this.followGun === true && this.gun) {
                    this.startPoint = this.gun.getEnd({ x: 0, y: 0 }, 0, this.gun.length * 1.5);
                    if (this.gun.master) angle += this.gun.master.facing + this.gun.angle;
                    else angle += this.gun.angle;
                }
                // use same trig convention as getEnd (cos -> x, sin -> y)
                this.endPoint.x = this.startPoint.x + this.range * Math.cos(angle);
                this.endPoint.y = this.startPoint.y + this.range * Math.sin(angle);
            }

            setGun(gun) {
                if (this.gun?.laserMap) {
                    this.gun.laserMap.delete(this.id);
                }
                if (this.master?.laserMap) {
                    this.master.laserMap.delete(this.id);
                }
                this.gun = gun;
                this.master = gun?.master;
                if (this.gun?.laserMap) this.gun.laserMap.set(this.id, this)
                if (this.master?.laserMap) this.master.laserMap.set(this.id, this)
            }

            destroy() {
                this.setGun(undefined);
                lasers.delete(this);
            }

            tick() {
                if (this.maxDuration < this.duration) {
                    this.maxDuration = this.duration;
                }
                if (this.duration-- <= 0) {
                    this.destroy()
                    return;
                }
                this.calcEndPoint(); // Recalculate in case range/angle changed
                this.hitEntities.clear();
                this.visualEndPoint = { x: this.endPoint.x, y: this.endPoint.y };

                const collectedHits = [];

                // 1. Traverse grid to gather all potential targets along the laser's path
                if (this.endPoint.x === this.startPoint.x) this.endPoint.x += 1;
                if (this.endPoint.y === this.startPoint.y) this.endPoint.y += 1;
                const dx = this.endPoint.x - this.startPoint.x;
                const dy = this.endPoint.y - this.startPoint.y;
                let cellX = Math.floor(this.startPoint.x / (1 << grid.cellShift));
                let cellY = Math.floor(this.startPoint.y / (1 << grid.cellShift));
                const endCellX = Math.floor(this.endPoint.x / (1 << grid.cellShift));
                const endCellY = Math.floor(this.endPoint.y / (1 << grid.cellShift));
                const stepX = (dx > 0 ? 1 : -1);
                const stepY = (dy > 0 ? 1 : -1);
                const cellSize = 1 << grid.cellShift;
                const tDeltaX = Math.abs(cellSize / dx);
                const tDeltaY = Math.abs(cellSize / dy);
                const nextBoundaryX = (cellX + (stepX > 0 ? 1 : 0)) * cellSize;
                const nextBoundaryY = (cellY + (stepY > 0 ? 1 : 0)) * cellSize;
                let tMaxX = Math.abs((nextBoundaryX - this.startPoint.x) / dx);
                let tMaxY = Math.abs((nextBoundaryY - this.startPoint.y) / dy);

                const processCell = (cx, cy) => {
                    const cellContent = grid.getCell(cx * cellSize, cy * cellSize);
                    if (cellContent) {
                        for (const entity of cellContent) {
                            if (entity.team === this.team || this.hitEntities.has(entity) || entity.passive || this.master.passive) continue;
                            this.hitEntities.add(entity);
                            const collisionDetails = this.getCollisionDetails(entity);
                            if (collisionDetails) {
                                collectedHits.push(collisionDetails);
                            }
                        }
                    }
                };

                processCell(cellX, cellY);
                while (collectedHits.length < this.pierce && (cellX !== endCellX || cellY !== endCellY)) {
                    if (tMaxX < tMaxY) {
                        tMaxX += tDeltaX;
                        cellX += stepX;
                    } else {
                        tMaxY += tDeltaY;
                        cellY += stepY;
                    }
                    processCell(cellX, cellY);
                }

                // 3. Sort hits by distance to handle piercing correctly
                //collectedHits.sort((a, b) => a.distanceSq - b.distanceSq);
                // Might not be needed by nature of how arrays works

                // 4. Apply damage to pierced targets and update visual end point
                const piercedCount = Math.min(collectedHits.length, this.pierce);
                if (this.pierce > 0) {
                    for (let i = 0; i < piercedCount; i++) {
                        this.collide(collectedHits[i].entity);
                    }
                }
                if (piercedCount === this.pierce) {
                    this.visualEndPoint = collectedHits[this.pierce - 1].closestPoint;
                }
            }

            getCollisionDetails(entity) {
                const laserDX = this.endPoint.x - this.startPoint.x;
                const laserDY = this.endPoint.y - this.startPoint.y;
                const lenSq = laserDX * laserDX + laserDY * laserDY;
                if (lenSq === 0) return null;

                const dot = ((entity.x - this.startPoint.x) * laserDX + (entity.y - this.startPoint.y) * laserDY);
                const t = Math.max(0, Math.min(1, dot / lenSq));

                const closestX = this.startPoint.x + t * laserDX;
                const closestY = this.startPoint.y + t * laserDY;
                const distanceX = entity.x - closestX;
                const distanceY = entity.y - closestY;
                const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

                const totalRadius = entity.size + this.width;
                if (distanceSquared < (totalRadius * totalRadius)) {
                    const distFromStartSq = (closestX - this.startPoint.x) ** 2 + (closestY - this.startPoint.y) ** 2;
                    return {
                        entity: entity,
                        closestPoint: { x: closestX, y: closestY },
                        distanceSq: distFromStartSq
                    };
                }
                return null;
            }

            collide(entity) {
                entity.damageReceived += this.damage;
                entity.collisionArray.push(this)
                if (this.master) {
                    if (this.onDealtDamage) {
                        this.onDealtDamage(this, entity, this.damage);
                    }
                    if (this.onDealtDamageUniv) {
                        this.onDealtDamageUniv(this, entity, this.damage);
                    }
                    if (this.master && this.master.onDealtDamageUniv) {
                        this.master.onDealtDamageUniv(this.master, entity, this.damage);
                    }
                }
                if (entity.onDamaged) entity.onDamaged(entity, null, this.damage)
            }

            addToPacket(packetArr, playerContext) {
                packetArr.push(
                    this.id,
                    this.startPoint.x,
                    this.startPoint.y,
                    this.visualEndPoint.x,
                    this.visualEndPoint.y,
					(this.master && playerContext.gameMode === "ffa" && !room.randomColors && this.color === "FFA_RED" && playerContext.body.color === "FFA_RED" && (this.master.id === playerContext.body.team || this.master.master.team === playerContext.body.team)) === true ? playerContext.teamColor ?? 0 : this.color,
                    this.width,
                    this.maxDuration,
                    this.duration
                );
            }
        }

        class Entity {
            constructor(position, master = this) {
                this.isGhost = false;
                this.spectating = null;
                this.killCount = {
                    solo: 0,
                    assists: 0,
                    bosses: 0,
                    killers: []
                };
                this.creationTime = (new Date()).getTime();
                this.turretTraverseSpeed = 1;
                this.master = master;
                this.source = this;
                this.parent = this;
                this.roomLayer = master.roomLayer || 0;
                this.roomLayerless = master.roomLayerless || false;
                this.control = {
                    target: new Vector(position.x + (1000 * Math.random() - 500), position.y + (1000 * Math.random() - 500)),
                    goal: new Vector(0, 0),
                    main: false,
                    alt: false,
                    fire: false,
                    power: 0
                };
                let objectOutput = null;
                this.__defineSetter__("sandboxId", function set(value) {
                    objectOutput = value;
                    if (!c.SANDBOX) {
                        return;
                    }
                    if (!global.sandboxRooms.find(entry => entry.id === objectOutput)) {
                        if (clients.find(e => e.sandboxId === objectOutput)) {
                            global.sandboxRooms.push({
                                id: objectOutput,
                                botCap: 0,
                                bots: [],
                                census: {
                                    crasher: 0,
                                    tank: 0,
                                    utility: 0
                                }
                            });
                        }
                    }
                });
                this.__defineGetter__("sandboxId", function get() {
                    return objectOutput;
                });
                if (this.master) {
                    if (this.master.sandboxId != null) {
                        this.sandboxId = this.master.sandboxId;
                    }
                }
                /*this.activation = (() => {
                    let active = true,
                        timer = ran.irandom(15);
                    return {
                        update: () => {
                            if (this.isDead()) {
                                this.removeFromGrid();
                                return 0;
                            }
                            if (!active) {
                                this.removeFromGrid();
                                if (this.settings.diesAtRange || this.type === "bullet" || this.type === "swarm" || this.type === "trap") {
                                    this.kill();
                                }
                                if (!(timer--)) {
                                    active = true;
                                }
                            } else {
                                this.addToGrid();
                                timer = 15;
                                active = this.alwaysActive || ((this.source && this.source.isPlayer) || this.isPlayer || views.some(a => a.check(this, .6)));
                            }
                        },
                        check: () => this.alwaysActive || active
                    };
                })();*/
                this.invulnTime = [-1, -1];
                this.autoOverride = false;
                this.controllers = [];
                this.blend = {
                    color: "#FFFFFF",
                    amount: 0
                };
                this.skill = new Skill();
                this.health = new HealthType(1, "static", 0);
                this.shield = new HealthType(0, "dynamic");
                this.lastSavedHealth = {
                    health: this.health.amount,
                    shield: this.shield.amount
                };
                this.guns = [];
                this.turrets = [];
                this.props = [];
                this.upgrades = [];
                this.previousUpgrades = [];
                this.settings = {
                    leaderboardable: true
                };
                this.aiSettings = {};
                this.childrenMap = new Map();
                this.laserMap = new Map();
                this.SIZE = 1;
                this.define(Class.genericEntity);
                this.maxSpeed = 0;
                this.facing = 0;
                this.vfacing = 0;
                this.range = 0;
                this.damageReceived = 0;
                this.stepRemaining = 1;
                this.x = position.x;
                this.y = position.y;
                this.cx = position.x;
                this.cy = position.y;
                this.velocity = new Vector(0, 0);
                this.accel = new Vector(0, 0);
                this.damp = .05;
                this.collisionArray = [];
                this.collisionArray.lastUpdate = -1;
                this.invuln = false;
                this.grantedInvuln = false;
                this.godmode = false;
                this.passive = false;
                this.bail = false;
                this.alpha = 1;
                this.spinSpeed = .038;
                this.tierCounter = 0;
                this.killedByK = false;
                this.id = entitiesIdLog++;
                this.team = this === master ? this.id : master.team;
                this.rainbow = false;
                this.intervalID = null;
                this.rainbowLoop = this.rainbowLoop.bind(this);
                this.keyFEntity = ['square', -100, false, 5];
                this.isActive = true
                this.deactivationTimer = -1;
                this.deactivation = function() {
                    this.deactivationTimer -= 1;
                    if (this.deactivationTimer < 0) {
                        this.deactivationTimer = 30;
                        this.isActive = this.alwaysActive || this.isPlayer || (this.source && this.source.isActive) || (this.bond && this.bond.isActive) || (this.master && this.master.isActive) || false
                    }
                };
                /*this.activation = (() => {
                    let active = true,//((this.master == this) ? false : this.master.source.isActive) || this.alwaysActive || this.isPlayer || (this.source && this.source.isPlayer) || views.some(a => a.check(this, .6)),
                        tick = 25;
                    return {
                        update: () => {
                            if (this.isDead()) {
                                this.removeFromGrid();
                                return;
                            }
                            if (!active) {
                                this.removeFromGrid();
                                if (!this.isTurret && (this.settings.diesAtRange || this.type === "bullet" || this.type === "swarm" || this.type === "trap")) {
                                    this.kill();
                                    return;
                                }
                                tick --;
                                if (tick <= 0) {
                                    active = this.alwaysActive || this.isPlayer || (this.source && this.source.isPlayer) || views.some(a => a.check(this, .6));
                                }
                            } else {
                                this.addToGrid();
                                if (!this.alwaysActive && !this.isPlayer && !(this.source && this.source.isPlayer) && !views.some(a => a.check(this, .6))) {
                                    active = false;
                                    tick = 25;
                                }
                            }
                        },
                        check: () => true
                    }
                })();*/
                this.tank = "basic";
                this.nameColor = "#FFFFFF";
                this.rainbowSpeed = 30;
                this.canUseQ = true;
                this.multibox = {
                    enabled: false,
                    intervalID: null,
                    controlledTanks: []
                };
                this.multiboxLoop = this.multiboxLoop.bind(this);
                /*this.getAABB = (() => {
                    let data = {},
                        save = {
                            x: 0,
                            y: 0,
                            size: 0,
                            width: 1,
                            height: 1
                        },
                        savedSize = 0,
                        lastCheck = this.isActive;
                    this.updateAABB = active => {
                        if (
                            (this.settings.hitsOwnType !== "shield" && this.bond != null) ||
                            (!active && !(data.active = false))
                        ) {
                            lastCheck = false;
                            return;
                        }
                        if (active === lastCheck &&
                            (
                                this.x === save.x && 
                                this.y === save.y &&
                                this.realSize === save.size &&
                                this.width === save.width &&
                                this.height === save.height
                            )
                        ) {
                            return;
                        }
                        lastCheck = true;
                        save.x = this.x;
                        save.y = this.y;
                        save.size = this.realSize;
                        save.width = this.width;
                        save.height = this.height;
                        let width = this.realSize * (this.width || 1),// + 5,
                            height = this.realSize * (this.height || 1),// + 5,
                            x = this.x + this.velocity.x + this.accel.x,
                            y = this.y + this.velocity.y + this.accel.y,
                            x1 = (this.x < x ? this.x : x) - width,
                            x2 = (this.x > x ? this.x : x) + width,
                            y1 = (this.y < y ? this.y : y) - height,
                            y2 = (this.y > y ? this.y : y) + height,
                            size = util.getLongestEdge(x1, y1, x2, y1),
                            sizeDiff = savedSize / this.size;
                        data = {
                            min: [x1, y1],
                            max: [x2, y2],
                            active: true,
                            size: size
                        };
                        if (sizeDiff > Math.SQRT2 || sizeDiff < Math.SQRT1_2) {
                            this.removeFromGrid();
                            this.addToGrid();
                            savedSize = data.size;
                        }
                    };
                    return () => data;
                })();
                this.updateAABB(true);*/
                this.immuneToAbilities = false;
                this.isMothership = false;
                this.isDominator = false;
                this.isBot = false;
                this.underControl = false;
                this.stealthMode = false;
                this.miscIdentifier = "None";
                this.switcherooID = -1;
				this.necromizable = true;
                this.gunIndex = undefined;
                this.motionTypeSettings = {};
                this.facingTypeSettings = {};
                //entities.push(this);
                entities.set(this.id, this);
                //this.activation.update();
                this.ableToBeInGrid = true;
            }
            get myCell() {
                return room.at({ x: this.x, y: this.y });
            }
            removeFromGrid() {
                this.ableToBeInGrid = false;
                /*if (this.isInGrid) {
                    grid.removeObject(this);
                    this.isInGrid = false;
                }*/
            }
            addToGrid() {
                this.ableToBeInGrid = true;
                /*if (!this.isInGrid && (this.settings.hitsOwnType === "shield" || this.bond == null)) {
                    grid.addObject(this);
                    this.isInGrid = true;
                }*/
            }
            life() {
                // New version of life, let's hope this fucking works
                this.refreshFOV();
                let control = {
                    altOverride: false
                }, faucet = {};
                if (!this.settings.independent && this.source != null && this.source !== this) {
                    faucet = this.source.control;
                    if (faucet.main || faucet.alt) {
                        control.target = {
                            x: faucet.target.x + this.source.x - this.x,
                            y: faucet.target.y + this.source.y - this.y
                        };
                        control.fire = faucet.fire;
                        control.main = faucet.main;
                        control.alt = faucet.alt;
                    }
                }
                if (this.settings.attentionCraver && !faucet.main && this.range > 1) {
                    this.range--;
                }
                for (let i = 0, l = this.controllers.length; i < l; i++) {
                    let output = this.controllers[i].think(control);
                    if (!output) {
                        continue;
                    }
                    if (this.controllers[i].acceptsFromTop) {
                        if (output.target != null) {
                            control.target = output.target;
                        }
                        if (output.goal != null) {
                            control.goal = output.goal;
                        }
                        if (output.fire != null) {
                            control.fire = output.fire;
                        }
                        if (output.main != null) {
                            control.main = output.main;
                        }
                        if (output.alt != null) {
                            control.alt = output.alt;
                        }
                        if (output.altOverride != null) {
                            control.altOverride = output.altOverride;
                        }
                        if (output.power != null) {
                            control.power = output.power;
                        }
                    } else {
                        if (output.target != null && !control.target) {
                            control.target = output.target;
                        }
                        if (output.goal != null && !control.goal) {
                            control.goal = output.goal;
                        }
                        if (output.fire != null && !control.fire) {
                            control.fire = output.fire;
                        }
                        if (output.main != null && !control.main) {
                            control.main = output.main;
                        }
                        if (output.alt != null && !control.alt) {
                            control.alt = output.alt;
                        }
                        if (output.altOverride != null) {
                            control.altOverride = output.altOverride;
                        }
                        if (output.power != null && !control.power) {
                            control.power = output.power;
                        }
                    }
                }
                this.control.target = control.target == null ? this.control.target : control.target;
                this.control.goal = control.goal;
                this.control.fire = control.fire;
                this.control.main = control.main;
                this.control.alt = control.alt;
                this.control.altOverride = control.altOverride;
                this.control.power = control.power == null ? 1 : control.power;
                this.move();
                this.face();
                if (this.invuln && this.invulnTime[1] > -1) {
                    if (Date.now() - this.invulnTime[0] > this.invulnTime[1]) {
                        this.invuln = false;
                        this.grantedInvuln = false;
                        this.sendMessage("Your invulnerability has expired.");
                    }
                }
                for (let i = 0, l = this.guns.length; i < l; i++) {
                    if (this.guns[i]) { // This if statement shouldn't be here. This is purely here because Meijijingu would be broken without it.
                        this.guns[i].liveButBetter();
                    }
                }
                if (this.skill.maintain()) this.refreshBodyAttributes();
                if (this.invisible[1]) {
                    this.alpha = Math.max(this.invisible[2] || 0, this.alpha - this.invisible[1]);
                    if (this.damageReceived || !this.velocity.isShorterThan(0.15)) {
                        this.alpha = Math.min(1, this.alpha + this.invisible[0]);
                    }
                }
                if (this.control.main && this.onMain) {
                    this.onMain(this, entities);
                }
                if (!this.control.main && this.onNotMain) {
                    this.onNotMain(this, entities);
                }
                if (this.control.alt && this.onAlt) {
                    this.onAlt(this, entities);
                }
                if (!this.control.alt && this.onNotAlt) {
                    this.onNotAlt(this, entities);
                }
                if (this.onTick) this.onTick(this);
            }
            addController(newIO) {
                if (Array.isArray(newIO)) this.controllers = newIO.concat(this.controllers);
                else this.controllers.unshift(newIO);
            }
            isInMyBase(cell = this.myCell) {
                return cell === `bas${-this.team}` || cell === `n_b${-this.team}` || cell === `bad${-this.team}`;
                /*return (room[`bas${-this.team}`] && room.isIn(`bas${-this.team}`, {
                    x: this.x,
                    y: this.y
                })) || (room[`n_b${-this.team}`] && room.isIn(`n_b${-this.team}`, {
                    x: this.x,
                    y: this.y
                })) || (room[`bad${-this.team}`] && room.isIn(`bad${-this.team}`, {
                    x: this.x,
                    y: this.y
                }));*/
            }
            minimalReset() {
                this.shape = 0;
                this.shapeData = 0;
                this.color = 16;
                this.guns = [];
                for (let o of this.turrets) o.destroy();
                this.turrets = [];
                this.props = [];
            }
            minimalDefine(set) {
                if (set.PARENT != null) {
                    for (let i = 0; i < set.PARENT.length; i++) {
                        if (this.index === set.PARENT[i].index) {
                            continue;
                        }
                        this.minimalDefine(set.PARENT[i]);
                    }
                }
                this.mockupGuns = true
                if (set.TRAVERSE_SPEED != null) this.turretTraverseSpeed = set.TRAVERSE_SPEED;
                if (set.index != null) this.index = set.index;
                if (set.NAME != null) this.name = set.NAME;
                if (set.LABEL != null) this.label = set.LABEL;
                if (set.COLOR != null) this.color = set.COLOR;
                if (set.PASSIVE != null) this.passive = set.PASSIVE;
                if (set.SHAPE != null) {
                    this.shape = typeof set.SHAPE === 'number' ? set.SHAPE : 0
                    this.shapeData = set.SHAPE;
                }
                if (set.VARIES_IN_SIZE != null) this.squiggle = (set.VARIES_IN_SIZE) ? (Number.isInteger(this.squiggle)) ? ran.randomRange(.75, 1.25) : this.squiggle : 1;
                if (set.SIZE != null) {
                    this.SIZE = set.SIZE * this.squiggle;
                }
                if (set.LAYER != null) this.LAYER = set.LAYER;
                this.settings.skillNames = set.STAT_NAMES || 6;
                if (set.INDEPENDENT != null) this.settings.independent = set.INDEPENDENT;
                if (set.UPGRADES_TIER_1 != null)
                    for (let e of set.UPGRADES_TIER_1) this.upgrades.push({
                        class: exportNames[e.index],
                        level: c.LEVEL_ZERO_UPGRADES ? 0 : 15,
                        index: e.index,
                        tier: 1
                    });
                if (set.UPGRADES_TIER_2 != null)
                    for (let e of set.UPGRADES_TIER_2) this.upgrades.push({
                        class: exportNames[e.index],
                        level: c.LEVEL_ZERO_UPGRADES ? 0 : 30,
                        index: e.index,
                        tier: 2
                    });
                if (set.UPGRADES_TIER_3 != null)
                    for (let e of set.UPGRADES_TIER_3) this.upgrades.push({
                        class: exportNames[e.index],
                        level: c.LEVEL_ZERO_UPGRADES ? 0 : 45,
                        index: e.index,
                        tier: 3
                    });
                if (set.UPGRADES_TIER_4 != null)
                    for (let e of set.UPGRADES_TIER_4) this.upgrades.push({
                        class: exportNames[e.index],
                        level: c.LEVEL_ZERO_UPGRADES ? 0 : 60,
                        index: e.index,
                        tier: 4
                    });
                if (set.GUNS != null) {
                    let newGuns = [];
                    let i = 0;
                    for (let def of set.GUNS) {
                        newGuns.push(new Gun(this, def, i));
                        i++;
                    }
                    this.guns = newGuns;
                };
                if (set.TURRETS != null) {
                    for (let o of this.turrets) o.destroy();
                    this.turrets = [];
                    for (let def of set.TURRETS) {
                        let o = new Entity(this, this.master);
                        if (Array.isArray(def.TYPE)) {
                            for (let type of def.TYPE) o.minimalDefine(type);
                        } else o.minimalDefine(def.TYPE);
                        o.bindToMaster(def.POSITION, this);
                        // o.alwaysActive = this.alwaysActive;
                        if (!def.TARGETABLE_TURRET) {
                            o.dangerValue = 0;
                        }
                    };
                };
                if (set.PROPS != null) {
                    let newProps = [];
                    for (let def of set.PROPS) newProps.push(new Prop(def));
                    this.props = newProps;
                }
            }
            define(set, extra, addExtraToParents = false) {
                try {
                    if (set.PARENT != null) for (let i = 0; i < set.PARENT.length; i++) this.define(set.PARENT[i], ((addExtraToParents) ? extra : {}), addExtraToParents);
                    for (let thing in extra) this[thing] = extra[thing];
                    if (!this.onlyDoEvo) {
                        if (set.TRAVERSE_SPEED != null) this.turretTraverseSpeed = set.TRAVERSE_SPEED;
                        if (set.RIGHT_CLICK_TURRET != null) this.turretRightClick = set.RIGHT_CLICK_TURRET;
                        if (set.index != null) this.index = set.index;
                        if (set.NAME != null) this.name = set.NAME;
                            else if (this.socket) this.name = this.socket.name;
                        if (set.HITS_ONLY_TEAM != null) this.hitsOnlyTeam = set.HITS_ONLY_TEAM;
                        if (set.LABEL != null) this.label = set.LABEL;
                        this.labelOverride = "";
                        if (set.TOOLTIP != null) this.socket?.talk("m", `${set.TOOLTIP}`, "#8cff9f");
                        this.upgradeTooltip = set.UPGRADE_TOOLTIP || null;
                        if (set.CREDIT != null) this.socket?.talk("m", `${set.CREDIT}`, "#B58EFD");
                        this.upgradeCredit = set.UPGRADE_CREDIT || null;
                        if (set.TYPE != null) this.type = set.TYPE;
                        if (set.SHAPE != null) {
                            this.shape = typeof set.SHAPE === 'number' ? set.SHAPE : 0
                            this.shapeData = set.SHAPE;
                        }
                        if (set.COLOR != null && !this.skipColor) this.color = set.COLOR;
                        if (set.REMOVE_PREVIOUS_CONTROLLERS) this.controllers = [];
                        if (set.CONTROLLERS != null) {
                            let toAdd = [];
                            for (let ioName of set.CONTROLLERS) toAdd.push(new ioTypes[ioName](this));
                            this.addController(toAdd);
                        }
                        if (set.REMOVE_CONTROLLERS) for (let ioName of set.REMOVE_CONTROLLERS) this.controllers = this.controllers.filter(entry => !(entry instanceof ioTypes[ioName]));
                        /* FYI reason i dont just have it not added in the defs is because mockups would need to be generated to change upgrades
                        if (set.IS_TESTBED_REMOVED && this.socket) {
                            if (!c.IS_DEV_SERVER && !c.serverName.includes("Sandbox") && this.socket.betaData.permissions !== 3) {
                                this.sendMessage("You cannot used removed tanks outside of a testing server.");
                                this.kill();
                                }
                                }*/
                        if (set.NO_SPEED_CALCULATION != null) this.settings.speedNoEffect = set.NO_SPEED_CALCULATION;
                        if (set.MOTION_TYPE != null) {
                            if (Array.isArray(set.MOTION_TYPE)) {
                                this.motionType = set.MOTION_TYPE[0];
                                this.motionTypeSettings = set.MOTION_TYPE[1];
                            } else this.motionType = set.MOTION_TYPE;
                        }
                        if (set.FACING_TYPE != null) {
                            if (Array.isArray(set.FACING_TYPE)) {
                                this.facingType = set.FACING_TYPE[0];
                                this.facingTypeSettings = set.FACING_TYPE[1];
                            } else this.facingType = set.FACING_TYPE;
                        }
                        if (set.DRAW_HEALTH != null) this.settings.drawHealth = set.DRAW_HEALTH;
                        if (set.DRAW_SELF != null) this.settings.drawShape = set.DRAW_SELF;
                        if (set.GIVE_KILL_MESSAGE != null) this.settings.givesKillMessage = set.GIVE_KILL_MESSAGE;
                        if (set.CAN_GO_OUTSIDE_ROOM != null) this.settings.canGoOutsideRoom = set.CAN_GO_OUTSIDE_ROOM;
                        if (set.HITS_OWN_TYPE != null) this.settings.hitsOwnType = set.HITS_OWN_TYPE;
                        if (set.DIE_AT_LOW_SPEED != null) this.settings.diesAtLowSpeed = set.DIE_AT_LOW_SPEED;
                        if (set.DIE_AT_RANGE != null) this.settings.diesAtRange = set.DIE_AT_RANGE;
                        if (set.INDEPENDENT != null) this.settings.independent = set.INDEPENDENT;
                        if (set.PERSISTS_AFTER_DEATH != null) this.settings.persistsAfterDeath = set.PERSISTS_AFTER_DEATH;
                        if (set.CLEAR_ON_MASTER_UPGRADE != null) this.settings.clearOnMasterUpgrade = set.CLEAR_ON_MASTER_UPGRADE;
                        if (set.HEALTH_WITH_LEVEL != null) this.settings.healthWithLevel = set.HEALTH_WITH_LEVEL;
                        if (set.ACCEPTS_SCORE != null) this.settings.acceptsScore = set.ACCEPTS_SCORE;
                        if (set.GETS_NEGATIVE_SCORE != null) this.settings.getsNegativeScore = set.GETS_NEGATIVE_SCORE;
                        if (set.HAS_NO_RECOIL != null) this.settings.hasNoRecoil = set.HAS_NO_RECOIL;
                        if (set.CRAVES_ATTENTION != null) this.settings.attentionCraver = set.CRAVES_ATTENTION;
                        if (set.BROADCAST_MESSAGE != null) this.settings.broadcastMessage = set.BROADCAST_MESSAGE || undefined;
                        if (set.DAMAGE_CLASS != null) this.settings.damageClass = set.DAMAGE_CLASS;
                        if (set.BUFF_VS_FOOD != null) this.settings.buffVsFood = set.BUFF_VS_FOOD;
                        if (set.CAN_BE_ON_LEADERBOARD != null) this.settings.leaderboardable = set.CAN_BE_ON_LEADERBOARD;
                        if (set.IS_SMASHER != null) this.settings.reloadToAcceleration = set.IS_SMASHER;
                        if (set.IS_DIGGER != null) this.aiSettings.isDigger = set.IS_DIGGER;
                        if (set.DIES_BY_OBSTACLES != null) this.settings.diesByObstacles = set.DIES_BY_OBSTACLES;
                        this.settings.isHelicopter = set.IS_HELICOPTER || null;
                        if (set.GO_THRU_OBSTACLES != null) this.settings.goThruObstacle = set.GO_THRU_OBSTACLES;
                        if (set.BOUNCE_ON_OBSTACLES != null) this.settings.bounceOnObstacles = set.BOUNCE_ON_OBSTACLES;
                        if (set.STAT_NAMES != null) this.settings.skillNames = set.STAT_NAMES;
                        if (set.HAS_ANIMATION != null) this.settings.hasAnimation = set.HAS_ANIMATION;
                        if (set.INTANGIBLE != null) this.intangibility = set.INTANGIBLE;
                        if (set.AI != null) this.aiSettings = set.AI;
                        if (set.DANGER != null) this.dangerValue = set.DANGER;
                        if (set.VARIES_IN_SIZE != null) this.squiggle = (set.VARIES_IN_SIZE) ? (Number.isInteger(this.squiggle)) ? ran.randomRange(.75, 1.25) : this.squiggle : 1;
                        if (set.RESET_UPGRADES) this.upgrades = [];
                        if (set.DIES_TO_TEAM_BASE != null) this.diesToTeamBase = set.DIES_TO_TEAM_BASE;
                        if (set.GOD_MODE != null) this.godmode = set.GOD_MODE;
                        if (set.PASSIVE != null) this.passive = set.PASSIVE;
                        if (set.HAS_NO_SKILL_POINTS != null && set.HAS_NO_SKILL_POINTS) this.skill.points = 0;
                        if (set.HAS_ALL_SKILL_POINTS != null && set.HAS_ALL_SKILL_POINTS) this.skill.points = 42;
                        if (set.LAYER != null) this.LAYER = set.LAYER;
                        if (set.ALPHA != null && !this.skipAlpha) this.alpha = set.ALPHA;
                        if (set.TEAM != null) this.team = set.TEAM;
                        if (set.BOSS_TIER_TYPE != null) this.bossTierType = set.BOSS_TIER_TYPE;
                        if (set.SYNC_TURRET_SKILLS != null) this.syncTurretSkills = set.SYNC_TURRET_SKILLS;
                        if (set.INVISIBLE != null && set.INVISIBLE.length > 0) {
                            if (set.INVISIBLE.length !== 3) throw ("Invalid invisibility values!");
                            this.invisible = set.INVISIBLE;
                        } else this.invisible = [0, 0, 0];
                        if (set.SEE_INVISIBLE != null) this.seeInvisible = set.SEE_INVISIBLE;
                        this.displayText = set.DISPLAY_TEXT || "";
                        this.displayTextColor = set.DISPLAY_TEXT_COLOR || "#FFFFFF"
                        if (set.AMMO != null) {
                            this.displayAmmoText = set.DISPLAY_AMMO_TEXT !== undefined ? set.DISPLAY_TEXT : true
                            if (this.displayAmmoText) {
                                this.displayText = `${set.AMMO} Ammo left`;
                            }
                            this.ammo = set.AMMO;
                        }
                        this.onCollide = set.ON_COLLIDE || null;
                        this.onTick = set.ON_TICK || null;
                        this.onDamaged = set.ON_DAMAGED || null;
                        this.onDealtDamage = set.ON_DEALT_DAMAGE || null;
                        this.onTorched = set.ON_TORCHED || null;
                        this.doesTorch = set.DOES_TORCH || null;
                        this.onDealtDamageUniv = set.ON_DEALT_DAMAGE_UNIVERSAL || null;
                        this.onKill = set.ON_KILL || null;
                        this.onMain = set.ON_MAIN || null;
                        this.onNotMain = set.ON_NOT_MAIN ?? null;
                        this.onAlt = set.ON_ALT || null;
                        this.onQ = set.ON_Q || null
                        this.onNotAlt = set.ON_NOT_ALT || null;
                        this.onDead = set.ON_DEAD || null
                        this.isObserver = set.IS_OBSERVER;
                        this.onOverride = set.ON_OVERRIDE;
                        this.isSentry = set.IS_SENTRY || null;
                        this.canNecro = set.CAN_NECROMIZE || null;
                        if(set.LEASHED){
                            if(typeof set.LEASHED === "number"){
                                this.controllers.push(new ioTypes.leashed(this, set.LEASHED));
                            }else{
                                console.error(`LEASHED must be a number`, this)
                            }
                        }else{
                            this.leash = null;
                        }
                        if (set.UPGRADES_TIER_1 != null)
                            for (let e of set.UPGRADES_TIER_1) this.upgrades.push({
                                class: exportNames[e.index],
                                level: c.LEVEL_ZERO_UPGRADES ? 0 : 15,
                                index: e.index,
                                tier: 1
                            });
                        if (set.UPGRADES_TIER_2 != null)
                            for (let e of set.UPGRADES_TIER_2) this.upgrades.push({
                                class: exportNames[e.index],
                                level: c.LEVEL_ZERO_UPGRADES ? 0 : 30,
                                index: e.index,
                                tier: 2
                            });
                        if (set.UPGRADES_TIER_3 != null)
                            for (let e of set.UPGRADES_TIER_3) this.upgrades.push({
                                class: exportNames[e.index],
                                level: c.LEVEL_ZERO_UPGRADES ? 0 : 45,
                                index: e.index,
                                tier: 3
                            });
                        if (set.UPGRADES_TIER_4 != null)
                            for (let e of set.UPGRADES_TIER_4) this.upgrades.push({
                                class: exportNames[e.index],
                                level: c.LEVEL_ZERO_UPGRADES ? 0 : 60,
                                index: e.index,
                                tier: 4
                            });
                        if (set.SIZE != null) {
                            this.SIZE = set.SIZE * this.squiggle;
                        }
                        if (set.SKILL != null && set.SKILL.length > 0) {
                            if (set.SKILL.length !== 10) throw ("Invalid skill raws!");
                            this.skill.set(set.SKILL);
                        }
                        if (set.LEVEL != null) {
                            if (set.LEVEL === -1) this.skill.reset();
                            while (this.skill.level < set.LEVEL) {
                                this.skill.score += this.skill.levelScore;
                                this.skill.maintain(true);
                            }
                            this.refreshBodyAttributes();
                        }
                        if (set.SKILL_CAP != null && set.SKILL_CAP.length > 0) {
                            if (set.SKILL_CAP.length !== 10) throw ("Invalid skill caps!");
                            this.skill.setCaps(set.SKILL_CAP);
                        }
                        if (set.VALUE != null) {
                            this.skill.score = (set.FORCE_VALUE) ? set.VALUE * this.squiggle : Math.max(this.skill.score, set.VALUE * this.squiggle);
                        }
                        if (set.LABEL_OVERRIDE != null) this.labelOverride = set.LABEL_OVERRIDE
                        if (set.SCOPED != null) {
                            this.scoped = set.SCOPED;
                            this.scopedMult = 1;
                        }
                        if (set.CAMERA_TO_MOUSE != null) {
                            this.scoped = set.CAMERA_TO_MOUSE[0];
                            this.scopedMult = set.CAMERA_TO_MOUSE[1] - 1;
                        }
                        this.altCameraSource = null
                        if (set.GUNS != null) {
                            let newGuns = [];
                            let i = 0;
                            for (let def of set.GUNS) {
                                newGuns.push(new Gun(this, def, i));
                                i++;
                            }
                            this.guns = newGuns;
                        }
                        if (set.PROPS != null) {
                            let newProps = [];
                            for (let def of set.PROPS) newProps.push(new Prop(def));
                            this.props = newProps;
                        }
                        if (set.MAX_CHILDREN != null) this.maxChildren = set.MAX_CHILDREN;
                        if (set.COUNTS_OWN_KIDS != null) this.countsOwnKids = set.COUNTS_OWN_KIDS;
                        if (set.BODY != null) {
                            if (set.BODY.ACCELERATION != null) this.ACCELERATION = set.BODY.ACCELERATION;
                                else if (this.type === 'food') this.ACCELERATION = .015 / (this.SIZE * .2);
                            if (set.BODY.SPEED != null) this.SPEED = set.BODY.SPEED;
                            if (set.BODY.HEALTH != null) this.HEALTH = set.BODY.HEALTH;
                            if (set.BODY.RESIST != null) this.RESIST = set.BODY.RESIST;
                            if (set.BODY.SHIELD != null) this.SHIELD = set.BODY.SHIELD;
                            if (set.BODY.REGEN != null) this.REGEN = set.BODY.REGEN;
                            if (set.BODY.DAMAGE != null) this.DAMAGE = set.BODY.DAMAGE;
                            if (set.BODY.PENETRATION != null) this.PENETRATION = set.BODY.PENETRATION;
                            if (set.BODY.FOV != null) this.FOV = set.BODY.FOV;
                            if (set.BODY.RANGE != null) this.RANGE = set.BODY.RANGE;
                            if (set.BODY.SHOCK_ABSORB != null) this.SHOCK_ABSORB = set.BODY.SHOCK_ABSORB;
                            if (set.BODY.DENSITY != null) this.DENSITY = set.BODY.DENSITY;
                            if (set.BODY.STEALTH != null) this.STEALTH = set.BODY.STEALTH;
                            if (set.BODY.PUSHABILITY != null) this.PUSHABILITY = set.BODY.PUSHABILITY;
                            if (set.BODY.HETERO != null) this.heteroMultiplier = set.BODY.HETERO;
                            this.refreshBodyAttributes();
                        }
                        if (set.TURRETS != null) {
                            for (let o of this.turrets) o.destroy();
                            this.turrets = [];
                            for (let def of set.TURRETS) {
                                let o = new Entity(this, this.master);
                                if (Array.isArray(def.TYPE)) {
                                    for (let type of def.TYPE) o.define(type);
                                } else o.define(def.TYPE);
                                o.bindToMaster(def.POSITION, this);
                                if (!def.TARGETABLE_TURRET) {
                                    o.dangerValue = 0;
                                } else if (def.TARGETABLE_TURRET > 0) {
                                    o.dangerValue = def.TARGETABLE_TURRET;
                                }
                            }
                        }
                        if (set.DIES_INSTANTLY != null) this.kill();
                        if (set.RANDOM_TYPE != null && set.RANDOM_TYPE !== "None") {
                            let choices = [];
                            switch (set.RANDOM_TYPE) {
                                case "Cultist":
                                    choices = [Class.trapmind.hivemindID, Class.poundHivemind.hivemindID, Class.psychosisProbe, Class.machHivemind.hivemindID, Class.auto2Probe, Class.propellerHivemind.hivemindID, Class.pelletHivemind.hivemindID, Class.lancemind.hivemindID, Class.flankmind.hivemindID, Class.minishotmind.hivemindID, Class.basebridMind.hivemindID, Class.twinmind.hivemindID, Class.submind.hivemindID].filter(i => !!i);;
                                    break;
                                default:
                                    util.warn("Invalid RANDOM_TYPE value: " + set.RANDOM_TYPE + "!");
                            }
                            choices = choices.filter(r => !!r);
                            this.define(choices[Math.floor(Math.random() * choices.length)]);
                        }
                        if (set.ICE_IMMUNE != null) this.immuneToIce = set.ICE_IMMUNE;
                        if (set.ABILITY_IMMUNE != null) this.immuneToAbilities = set.ABILITY_IMMUNE;
                        if (set.SPAWNS_DECA != null) this.define(Class.decagon);
                        if (set.ALWAYS_ACTIVE != null) this.alwaysActive = set.ALWAYS_ACTIVE;
                        if (set.MISC_IDENTIFIER != null) this.miscIdentifier = set.MISC_IDENTIFIER;
                        if (set.SWITCHEROO_ID != null) this.switcherooID = set.SWITCHEROO_ID;
                        if (set.IS_ARENA_CLOSER != null) {
                            this.isArenaCloser = set.IS_ARENA_CLOSER;
                            if (this.isArenaCloser) this.immuneToAbilities = true;
                        }
                        this.variables = set.VARIABLES ? JSON.parse(JSON.stringify(set.VARIABLES)) : {};
                        this.animations = [];
                    }
                    if (this.evolutionTimeout) clearTimeout(this.evolutionTimeout);
                    if (this.greaterEvolutionTimeout) clearTimeout(this.greaterEvolutionTimeout);
                    if (set.EVOLUTIONS?.length) {
                        this.evolutionTimeout = setTimeout(() => {
                            try {
                                if (!this.isAlive()) return;
                                let options = [],
                                    chances = [];
                                for (let arr of set.EVOLUTIONS) {
                                    options.push(arr[0]);
                                    chances.push(arr[1]);
                                }
                                if (Math.random() < c.EVOLVE_HALT_CHANCE && this.miscIdentifier !== 'Rogue Egg') return;
                                let choice = options[ran.chooseChance(...chances)];
                                if (Array.isArray(choice)) choice = ran.choose([choice]);
                                if (choice === '' || (choice === 'rogueEgg' && room.gameMode !== "tdm")) this.define({ EVOLUTIONS: set.EVOLUTIONS }, { onlyDoEvo: true });
                                else if (this.miscIdentifier === 'Rogue Egg') {
                                    this.name = ran.chooseBossName('castle', 1)[0];
                                    this.nameColor = (this.team !== -20) ? teamHexCodes[-this.team - 1] : "#726F6F";
                                    this.define(Class[(this.team !== -20) ? `${choice}Team${-this.team}` : choice]);
                                    sockets.broadcast(`${util.addArticle(this.label, true)} has hatched out of a Rogue Egg!`);
                                } else {
                                    this.define(Class[choice]);
                                    if (this.type === "miniboss") {
                                        this.controllers = this.controllers.filter(entry => !(entry instanceof ioTypes['moveInCircles']));
                                        switch (choice) {
                                            case "triangleNestKeeperAI":
                                                this.isTriNestFood = false;
                                                this.miscIdentifier = "Natural Miniboss";
                                                this.name = ran.chooseBossName('b', 1)[0];
                                                sockets.broadcast("A Nest Keeper has hatched out of an Alpha Triangle!");
                                                break;
                                            case "squareNestKeeperAI":
                                                this.isSquareNestFood = false;
                                                this.miscIdentifier = "Natural Miniboss";
                                                this.name = ran.chooseBossName('b', 1)[0];
                                                sockets.broadcast("A Nest Keeper has hatched out of an Alpha Square!");
                                                break;
                                            case "nestKeeperAI":
                                                this.isPentaNestFood = false;
                                                this.miscIdentifier = "Natural Miniboss";
                                                this.name = ran.chooseBossName('b', 1)[0];
                                                sockets.broadcast("A Nest Keeper has hatched out of an Alpha Pentagon!");
                                                break;
                                            case "hexagonNestKeeperAI":
                                                this.isHexaNestFood = false;
                                                this.miscIdentifier = "Natural Miniboss";
                                                this.name = ran.chooseBossName('b', 1)[0];
                                                sockets.broadcast("A Nest Keeper has hatched out of an Alpha Hexagon!");
                                                break;
                                            case "heptagonNestKeeperAI":
                                                this.isHeptaNestFood = false;
                                                this.miscIdentifier = "Natural Miniboss";
                                                this.name = ran.chooseBossName('b', 1)[0];
                                                sockets.broadcast("A Nest Keeper has hatched out of an Alpha Heptagon!");
                                                break;
                                            case "octagonNestKeeperAI":
                                                this.isOctaNestFood = false;
                                                this.miscIdentifier = "Natural Miniboss";
                                                this.name = ran.chooseBossName('b', 1)[0];
                                                sockets.broadcast("A Nest Keeper has hatched out of an Alpha Octagon!");
                                                break;
                                        }
                                    }
                                }
                            } catch (err) { util.error("Error while trying to evolve " + global.exportNames[this.index]) }
                        }, (c.EVOLVE_TIME + ran.irandom(c.EVOLVE_TIME_RAN_ADDER)) * ((this.type === "crasher" || this.isSentry) ? 0.5 : (this.miscIdentifier === 'Rogue Egg') ? 2 : 1)) // Crashers evolve 2x as fast
                    };
                    if (!this.onlyDoEvo) {
                        if (set.WEAPON_COLOR != null) this.mainWeaponColor = set.WEAPON_COLOR;
                        if (set.BYPASS_BASE_RESTRICTIONS != null) this.shootsInBaseAnyway = set.BYPASS_BASE_RESTRICTIONS;
                        if (this.isShiny) {
                            this.color = -1;
                            this.skill.score *= 3;
                            this.SIZE += 2;
                            this.label = "Shiny " + this.label;
                            this.settings.givesKillMessage = true;
                        }
                        if (set.ON_DEFINED) set.ON_DEFINED(this, entities, sockets, Entity, ran);
                    }
                } catch (e) {
                    if (this.isBot) console.error(this.tank);
                    console.error("An error occured while trying to set " + trimName(this.name) + "'s parent entity, aborting! Index: " + this.index + "." + " Export: " + global.exportNames[this.index]);
                    this.sendMessage("An error occured while trying to set your parent entity!");
                    console.error(e.stack);
                }
            }
            refreshBodyAttributes() {
                let speedReduce = Math.pow(this.size / this.SIZE, 1);
                this.acceleration = c.runSpeed * this.ACCELERATION / speedReduce;
                if (this.settings.reloadToAcceleration) this.acceleration *= this.skill.acl;
                this.topSpeed = c.runSpeed * this.SPEED * this.skill.mob / speedReduce;
                if (this.settings.reloadToAcceleration) this.topSpeed /= Math.sqrt(this.skill.acl) || c.MIN_SPEED;
                this.health.set(((this.settings.healthWithLevel ? 1.5 /* 1.8 */ * this.skill.level : 0) + this.HEALTH) * (this.settings.reloadToAcceleration ? this.skill.hlt * 0.95 /*1.025*/ : this.skill.hlt));
                this.health.resist = 1 - 1 / (Math.max(1, this.RESIST + this.skill.brst) / 1.15);
                this.shield.set(((this.settings.healthWithLevel ? .6 * this.skill.level : 0) + this.SHIELD) * this.skill.shi * (this.settings.reloadToAcceleration ? .85 : 1), Math.max(0, (((this.settings.healthWithLevel ? .006 * this.skill.level : 0) + 1) * this.REGEN) * this.skill.rgn) * (this.settings.reloadToAcceleration ? 0.9 : 1));
                this.damage = this.DAMAGE * (this.settings.reloadToAcceleration ? this.skill.atk * 1.1 /*1.1*/ /*1.25*/ : this.skill.atk);
                this.penetration = this.PENETRATION + 1.5 * (this.skill.brst /*+ 0.8 * (this.skill.atk - 1)*/); this.range = this.RANGE;
                this.fov = 250 * this.FOV * Math.sqrt(this.size) * (1 + .003 * this.skill.level);
                this.density = (1 + 0.08 * this.skill.level) * this.DENSITY;//(1 + .08 * this.skill.level) * this.DENSITY * 2.334;//(this.settings.reloadToAcceleration ? 5 : 1);
                this.stealth = this.STEALTH;
                this.pushability = this.PUSHABILITY;
            }
            refreshFOV() {
                this.fov = 250 * this.FOV * (this.size ** .5) * (1 + .003 * this.skill.level);
            }
            bindToMaster(position, bond) {// size, x, y, angle (deg), turn range, layer
                this.bond = bond;
                this.source = bond;
                this.bond.turrets.push(this);
                this.skill = this.bond.skill;
                this.label = this.bond.label + (this.bond.label && this.label ? " " : "") + this.label;
                this.neverInGrid = this.settings.hitsOwnType !== "shield";
                //if (this.settings.hitsOwnType !== "shield") this.removeFromGrid();
                this.settings.drawShape = false;
                this.bound = {};
                this.bound.size = .05 * position[0];
                let offset = new Vector(position[1], position[2]);
                this.bound.angle = position[3] * Math.PI / 180;
                this.bound.direction = offset.direction;
                this.bound.offset = offset.length / 10;
                this.bound.arc = position[4] * Math.PI / 180;
                this.bound.layer = position[5];
                if (this.facingType === "toTarget") {
                    this.facing = this.bond.facing + this.bound.angle;
                    this.facingType = "bound";
                    this.facingTypeSettings = {};
                }
                this.motionType = "bound";
                this.motionTypeSettings = {};
                this.move();
                this.isTurret = true;
            }
            get size() {
                //if (this.bond == null) return (this.coreSize || this.SIZE) * (1 + this.skill.level / 60);
                if (this.bond == null) return this.SIZE * (1 + (this.skill.level > c.SKILL_CAP ? c.SKILL_CAP : this.skill.level) / 60);
                return this.bond.size * this.bound.size;
            }
            get mass() {
                return this.density * (this.size * this.size + 1);
            }
            get realSize() {
                return this.size * (Math.abs(this.shape) >= realSizes.length ? 1 : realSizes[Math.abs(this.shape)]);
            }
            get m_x() {
                return (this.velocity.x + this.accel.x) / room.speed;
            }
            get m_y() {
                return (this.velocity.y + this.accel.y) / room.speed;
            }
            camera(tur = false) {
                let out = {
                    type: tur * 0x01 + this.settings.drawHealth * 0x02 + ((this.miscIdentifier === "Sanctuary" || this.type === "tank" || this.type === "miniboss" || this.type === "utility") && !this.settings.noNameplate) * 0x04 + (this.invuln || (this.type === "food" || this.type === "crasher") && !this.necromizable) * 0x08,
                    id: this.id,
                    masterId: this.master.id,
                    index: this.index,
                    x: this.x,
                    y: this.y,
                    cx: this.altCameraSource ? this.altCameraSource[0] : this.x,
                    cy: this.altCameraSource ? this.altCameraSource[1] : this.y,
                    size: this.size,
                    rsize: this.realSize,
                    status: 1,
                    health: this.health.display(),
                    shield: this.shield.display(),
                    facing: this.facing,
                    vfacing: this.vfacing,
                    leash: this.leash,
                    twiggle: this.facingType !== "toTarget" || (this.facingType === "lmg" && this.control.fire), //this.facingType === "looseWithMotion" || this.facingType === "smoothWithMotion" || this.facingType === "spinSlowly" || this.facingType === "spinSlowly2" || this.facingType === "spinSlowly3" || this.facingType === "spinSlowly4" || this.facingType === "altSpin" || this.facingType === "fastSpin" || this.facingType === "autospin" || this.facingType === "autospin2" || this.facingType === "reverseAutospin" || this.facingType === "bitFastSpin" || this.facingType === "hadron" || this.facingType === "locksFacing" && this.control.alt || this.facingType === "hatchet" || this.facingType === "altLocksFacing" || this.facingType === "lmg" && this.control.fire,
                    layer: this.type === "mazeWall" ? 7 : this.passive && this.LAYER !== -1 ? 1 : this.LAYER === -1 ? this.bond == null ? this.type === "wall" ? 11 : this.type === "food" ? 10 : this.type === "tank" ? 5 : this.type === "crasher" ? 8 : 0 : this.bound.layer : this.LAYER,
                    color: this.color,
                    team: this.team,
                    name: this.name,
                    score: this.skill.score,
                    sizeRatio: [this.width || 1, this.height || 1],
                    guns: this.guns.map(gun => gun.lastShot),
                    turrets: this.turrets.map(turret => turret.camera(true)),
                    alpha: this.alpha,
                    seeInvisible: this.seeInvisible,
                    nameColor: this.nameColor,
                    label: this.labelOverride ? this.labelOverride : 0
                };
                if (this.scoped) {
                    if (!this.control.alt) {
                        if (this.hasScoped) {
                            this.fov = this.currentScopedFOV / this.scopedMult
                            this.hasScoped = false
                        }
                        this.cameraShiftFacing = null;
                        this.altCameraSource = null;
                    } else {
                        this.cameraShiftFacing = true
                        if (!this.hasScoped) {
                            this.currentScopedFOV = this.fov * this.scopedMult
                            this.fov = this.currentScopedFOV
                            this.hasScoped = true
                        }
                        if (!this.altCameraSource) this.altCameraSource = []
                        this.altCameraSource[0] = this.x + this.fov * Math.cos(this.facing) / 3;
                        this.altCameraSource[1] = this.y + this.fov * Math.sin(this.facing) / 3;
                    }
                }
                return out;
            }
            skillUp(stat) {
                let upgrade = this.skill.upgrade(stat);
                if (upgrade) {
                    this.refreshBodyAttributes();
                    for (let gun of this.guns) gun.syncChildren();
                }
                return upgrade;
            }
            upgrade(number) {
                if (c.serverName.includes("Corrupted Tanks")) {
                    if (number == null) {
                        this.define(Class[global.gamemodeCode.generateNewTank()])
                        this.skill.score = 59212
                    } else {
                        this.childrenMap.forEach(c => c.kill())
                        this.define(Class[this.upgrades[number].class])
                    }
                    this.upgrades = []
                    for (let i = 0; i < 3; i++) {
                        let newTank = Class[global.gamemodeCode.generateNewTank()]
                        this.upgrades.push({
                            class: exportNames[newTank.index],
                            level: 0,
                            index: newTank.index,
                            tier: 4
                        })
                    }
                    return
                }
                if (number < this.upgrades.length && this.skill.level >= this.upgrades[number].level) {
                    let tank = Class[this.upgrades[number].class];
                    this.upgrades = [];
                    this.define(tank);
                    this.tank = tank;
                    if (this.switcherooID === 0 || (this.bossTierType !== -1 && this.bossTierType !== 16)) this.sendMessage("Press Q to switch tiers. There is a 1 second cooldown.");
                    if (this.scoped) this.socket?.talk("m", "Right click or press shift to move the camera to your mouse.", "#8cff9f");
                    if (this.invisible[1] && this.invisible[0]) this.socket?.talk("m", "Stand still to turn invisible.", "#8cff9f");
                    if (this.facingType === "hatchet") this.sendMessage("Left click to make the tank spin quickly.");
                    if (this.settings.hasAnimation === "rmb") this.sendMessage("Right click or press shift to use a special ability.");
                    if (this.settings.hasAnimation === "lmb") this.sendMessage("Left click or press space to use a special ability.");
                    //if (this.usesAltFire) this.sendMessage("Right click or press shift to fire other weapons.");
                    if (this.upgradeCredit) this.sendMessage(this.upgradeCredit, "#B58EFD");
                    if (this.upgradeTooltip) this.sendMessage(this.upgradeTooltip, "#8cff9f");
                    this.sendMessage("You have upgraded to " + this.label + ".");
                    this.childrenMap.forEach(o => {
                        if (o.settings.clearOnMasterUpgrade && o.master.id === this.id && o.id !== this.id && o !== this) {
                            o.kill();
                        }
                    });
                    this.laserMap.forEach(laser => {
                        if (laser.clearOnMasterUpgrade) {
                            laser.destroy();
                        }
                    })
                    //for (let o of entities)
                    //    if (o.settings.clearOnMasterUpgrade && o.master.id === this.id && o.id !== this.id && o !== this) o.kill();
                    this.skill.update();
                    this.refreshBodyAttributes();
                    if (this.stealthMode) {
                        this.settings.leaderboardable = this.settings.givesKillMessage = false;
                        this.alpha = this.ALPHA = 0;
                    }
                    if (!this.isPlayer) return 0;
                    switch (this.label) {
                        case "Smasher": return void this.rewardManager(-1, "where_did_my_cannon_go");
                        case "Mini-Mothership": return void this.rewardManager(-1, "miniship");
                        case "Twin": return void this.rewardManager(-1, "fire_power");
                        case "Sniper": return void this.rewardManager(-1, "snipin");
                        case "Machine Gun": return void this.rewardManager(-1, "eat_those_bullets");
                        case "Flank Guard": return void this.rewardManager(-1, "aint_no_one_sneaking_up_on_me");
                        case "Director":
                            this.rewardManager(-1, "mmm_drones_drones_drones");
                            this.rewardManager(10, 1);
                            break;
                        case "Pounder": return void this.rewardManager(-1, "one_shot_bby");
                        case "Single": return void this.rewardManager(-1, "better_basic");
                        case "Pelleter": return void this.rewardManager(-1, "bullet_hell");
                        case "Trapper": return void this.rewardManager(-1, "build_a_wall");
                        case "Propeller": return void this.rewardManager(-1, "zoom");
                        case "Auto-2": return void this.rewardManager(-1, "cant_bother_using_both_hands_to_play");
                        case "Minishot": return void this.rewardManager(-1, "small_barrel_big_dreams");
                        case "Lancer": return void this.rewardManager(-1, "pointy");
                        case "Auto-Basic": return void this.rewardManager(-1, "automation");
                        case "Basebrid": return void this.rewardManager(-1, "wannabe_hybrid");
                        case "Subduer": return void this.rewardManager(-1, "wannabe_hunter");
                        case "Mini Grower": return void this.rewardManager(-1, "they_get_big_i_swear");
                        case "Inceptioner": return void this.rewardManager(-1, "commencement_of_the_inception");
                        case "Hivemind": return void this.rewardManager(-1, "which_one_is_me");
                        case "Switcheroo (Ba)": return void this.rewardManager(-1, "it_wasnt_worth_it");
                    }
                }
            }
            upgradeTank(tank) {
                this.upgrades = [];
                this.define(tank);
                this.tank = tank;
                if (this.switcherooID === 0 || (this.bossTierType !== -1 && this.bossTierType !== 16)) this.sendMessage("Press Q to switch tiers. There is a 1 second cooldown.");
                if (this.scoped) this.socket?.talk("m", "Right click or press shift to move the camera to your mouse.", "#8cff9f");
                if (this.invisible[1]) this.socket?.talk("m", "Stand still to turn invisible.", "#8cff9f");
                if (this.facingType === "hatchet") this.sendMessage("Left click to make the tank spin quickly.");
                if (this.settings.hasAnimation === "rmb") this.sendMessage("Right click or press shift to use an animation ability.");
                if (this.settings.hasAnimation === "lmb") this.sendMessage("Left click or press space to use an animation ability.");
                //if (this.usesAltFire) this.sendMessage("Right click or press shift to fire other weapons.");
                if (this.upgradeCredit) this.sendMessage(this.upgradeCredit, "#B58EFD");
                if (this.upgradeTooltip) this.sendMessage(this.upgradeTooltip, "#8cff9f");
                this.sendMessage("You have changed your tank to " + this.label + ".");
                this.skill.update();
                this.refreshBodyAttributes();
                this.childrenMap.forEach(o => {
                    if (o.settings.clearOnMasterUpgrade && o.master.id === this.id && o.id !== this.id && o !== this) {
                        o.kill();
                    }
                });
                this.laserMap.forEach(laser => {
                    if (laser.clearOnMasterUpgrade) {
                        laser.destroy();
                    }
                })
                if (this.stealthMode) {
                    this.settings.leaderboardable = this.settings.givesKillMessage = false;
                    this.alpha = this.ALPHA = 0;
                }
            }
            damageMultiplier() {
                switch (this.type) {
                    case "swarm":
                        return .25 + 1.5 * util.clamp(this.range / (this.RANGE + 1), 0, 1);
                    default:
                        return 1;
                }
            }
            move() {
                let g = this.control.goal ? {
                    x: this.control.goal.x - this.x,
                    y: this.control.goal.y - this.y
                } : {
                    x: 0,
                    y: 0
                },
                    gactive = g.x !== 0 || g.y !== 0,
                    engine = {
                        x: 0,
                        y: 0
                    },
                    a = this.acceleration / room.speed;
                switch (this.motionType) {
                    case "glide":
                        let damp = this.motionTypeSettings.DAMP ?? .05;
                        this.maxSpeed = this.topSpeed;
                        this.damp = damp;
                        break;
                    case "motor":
                        this.maxSpeed = 0;
                        if (this.topSpeed) this.damp = a / this.topSpeed;
                        if (gactive) {
                            let len = Math.sqrt(g.x * g.x + g.y * g.y);
                            engine = {
                                x: a * g.x / len,
                                y: a * g.y / len
                            };
                        }
                        break;
                    case "swarm":
                        this.maxSpeed = this.topSpeed;
                        let l = util.getDistance({
                            x: 0,
                            y: 0
                        }, g) + 1;
                        if (gactive && l > this.size) {
                            let desiredXSpeed = this.topSpeed * g.x / l,
                                desiredYSpeed = this.topSpeed * g.y / l,
                                turning = Math.sqrt((this.topSpeed * Math.max(1, this.range) + 1) / a);
                            engine = {
                                x: (desiredXSpeed - this.velocity.x) / Math.max(5, turning),
                                y: (desiredYSpeed - this.velocity.y) / Math.max(5, turning)
                            };
                        } else {
                            if (this.velocity.length < this.topSpeed) engine = {
                                x: this.velocity.x * a / 20,
                                y: this.velocity.y * a / 20
                            };
                        }
                        break;
                    case "chase":
                        if (gactive) {
                            let l = util.getDistance({
                                x: 0,
                                y: 0
                            }, g);
                            if (true || l > this.size * 2) {
                                this.maxSpeed = this.topSpeed;
                                let desiredxspeed = this.topSpeed * g.x / l,
                                    desiredyspeed = this.topSpeed * g.y / l;
                                engine = {
                                    x: (desiredxspeed - this.velocity.x) * a,
                                    y: (desiredyspeed - this.velocity.y) * a
                                };
                            } else this.maxSpeed = 0;
                        } else this.maxSpeed = 0;
                        break;
                    case "drift":
                        this.maxSpeed = 0;
                        engine = {
                            x: g.x * a,
                            y: g.y * a
                        };
                        break;
                    case "tokyoDrift":
                        this.maxSpeed = this.topSpeed;
                        if (this.topSpeed) this.damp = a / this.topSpeed;
                        if (gactive) {
                            this.refreshBodyAttributes()
                            let len = Math.sqrt(g.x * g.x + g.y * g.y);
                            engine = {
                                x: a * g.x / len,
                                y: a * g.y / len
                            };
                        } else {
                            this.topSpeed *= 0.9
                            this.damp = 1;
                        }
                        break;
                    case "bound":
                        if (!this.bond) { return }
                        let bound = this.bound,
                            ref = this.bond;
                        this.x = ref.x + ref.size * bound.offset * Math.cos(bound.direction + bound.angle + ref.facing);
                        this.y = ref.y + ref.size * bound.offset * Math.sin(bound.direction + bound.angle + ref.facing);
                        this.bond.velocity.x += bound.size * this.accel.x;
                        this.bond.velocity.y += bound.size * this.accel.y;
                        this.firingArc = [ref.facing + bound.angle, bound.arc / 2];
                        this.accel.null();
                        this.blend = ref.blend;
                        break;
                    case "accelerate":
                        this.maxSpeed = this.topSpeed;
                        this.damp = -.0125;
                        this.DAMAGE -= 10; // .05, 1, 2
                        break;
					case "sonicAccel":
                        this.damp = -.021;
                        break;
                    case "glideBall":
                        this.maxSpeed = this.topSpeed;
                        if (this.topSpeed) this.damp = a / this.topSpeed;
                        if (gactive) {
                            let len = Math.sqrt(g.x * g.x + g.y * g.y);
                            engine = {
                                x: a * g.x / len,
                                y: a * g.y / len
                            };
                        } else this.damp = .005;
                        break;
                    case "grow":
                        this.SIZE += .175;
                        break;
                    case "flamethrower":
                        this.maxSpeed = this.topSpeed;
                        this.damp = -.02;
                        this.SIZE += .175;
                        this.DAMAGE -= 2.25;
                        break;
                    case "flare":
                        this.maxSpeed = this.topSpeed;
                        this.damp = -.025;
                        this.SIZE += .25;
                        this.DAMAGE -= .175;
                        break;
                    case "explode":
                        this.SIZE += 10;
                        this.DAMAGE += 3;
                        break;
                    case "flakGun":
                        this.SIZE += 5;
                        break;
                    case "kamikaze":
                        this.SIZE += 7;
                        this.DAMAGE += 1;
                        break;
                    case "fastcrockett":
                        this.SIZE += 2;//+6
                        this.DAMAGE += 2;//+6
                        break;
                    case "crockett":
                        this.SIZE += 2;
                        this.DAMAGE += 2;
                        break;
                    case "crockettDominator":
                        this.SIZE += 3;
                        this.DAMAGE += 4;
                        break;
                    case "snowball":
                        this.SIZE += .15;
                        this.DAMAGE += 2;
                        break;
                    case "fatNuke":
                        this.SIZE += 7;
                        this.DAMAGE += 20;
                        break;
                    case "miniGrower":
                        this.SIZE += .1; // + .02 * Math.random();
                        this.DAMAGE += .15;
                        this.penetration += .01;
                        if (this.velocity.x > 0) this.velocity.x -= .0035;
                        if (this.velocity.y > 0) this.velocity.y -= .0035;
                        break;
                    case "grower":
                        this.SIZE += .14; // + .022 * Math.random();
                        this.DAMAGE += .175;
                        this.penetration += .02;
                        if (this.velocity.x > 0) this.velocity.x -= .004;
                        if (this.velocity.y > 0) this.velocity.y -= .004;
                        break;
                    case "megaGrower":
                        this.SIZE += .17; // + .024 * Math.random();
                        this.DAMAGE += .2;
                        this.penetration += .03;
                        if (this.velocity.x > 0) this.velocity.x -= .0045;
                        if (this.velocity.y > 0) this.velocity.y -= .0045;
                        break;
                    case "gigaGrower":
                        this.SIZE += .21; // + .026 * Math.random();
                        this.DAMAGE += .225;
                        this.penetration += .04;
                        if (this.velocity.x > 0) this.velocity.x -= .005;
                        if (this.velocity.y > 0) this.velocity.y -= .005;
                        break;
                    case "thunder":
                        this.SIZE += 4.5;
                        break;
                    /*case "gravity":
                        //this.a += 1; // Does nothing
                        this.velocity.y += a;
                        this.damp = -.005;
                        this.topSpeed = 90;
                        break;*/
                    case "gravityA":
                        //this.a += 1;
                        this.velocity.y += a / 1.45;
                        this.damp = -.00125;
                        this.topSpeed = 70;
                        break;
                    case "gravityB":
                        //this.a += 1;
                        this.velocity.y -= a / 1.45;
                        this.damp = -.00125;
                        this.topSpeed = 70;
                        break;
                    case "gravityC":
                        this.velocity.y += a / 1.45;
                        this.damp = -.00125;
                        this.topSpeed = 70;
                        break;
                    case "gravityD":
                        this.velocity.x -= a / 1.45 * Math.sin(2 * Math.PI / 3);
                        this.velocity.y += a / 1.45 * Math.cos(2 * Math.PI / 3);
                        this.damp = -.00125;
                        this.topSpeed = 70;
                        break;
                    case "gravityE":
                        this.velocity.x -= a / 1.45 * Math.sin(4 * Math.PI / 3);
                        this.velocity.y += a / 1.45 * Math.cos(4 * Math.PI / 3);
                        this.damp = -.00125;
                        this.topSpeed = 70;
                        break;
                    case "limitShrink":
                        this.SIZE -= .175;
                        if (this.SIZE < 2) this.SIZE = 2;
                        this.DAMAGE += 2.25;
                        break;
                    case "decentralize":
                        this.damp = .05;
                        let shotSize = this.source.guns[this.gunIndex].weaponSize;
                        if (this.master.control.alt) {
                            this.maxSpeed = 0;
                            this.SIZE++;
                        } else {
                            this.maxSpeed = this.topSpeed;
                            if (this.SIZE > shotSize) this.SIZE--;
                            else this.SIZE = shotSize;
                        }
                        break;
                    case "plasma":
                        this.x = this.source.x;
                        this.y = this.source.y;
                        this.SIZE += 4;
                        break;
                    case "colorthingy":
                        this.color = 0;
                        this.SIZE -= 1;
                        if (this.SIZE <= 1) this.kill();
                        this.maxSpeed = this.topSpeed;
                        break;
                    case "colorthingynocolor":
                        this.SIZE -= 1;
                        if (this.SIZE <= 1) this.kill();
                        this.maxSpeed = this.topSpeed;
                        break;
                    case "decelfast":
                        this.maxSpeed = this.topSpeed;
                        this.damp = .2;
                        break;
                    case "decel":
                        this.maxSpeed = this.topSpeed;
                        this.damp = .05;
                        break;
                    case "colorthingy4":
                        this.color = 23;
                        this.SIZE += 5;
                        if (this.SIZE >= 40) this.SIZE = 40;
                        this.guns.color = 4;
                        this.maxSpeed = this.topSpeed;
                        break;
                    case "welder":
                        this.color = 276;
                        this.SIZE += 5;
                        if (this.SIZE >= 40) this.SIZE = 40;
                        this.guns.color = 4;
                        this.maxSpeed = this.topSpeed;
                        break;
                    case "ebin":
                        this.color = 22;
                        this.diesAtRange = true;
                        let mod = 120 * Math.PI / 180 * Math.sin(900 * Math.random()),
                            theta = this.facing + mod;
                        if (this.range <= 40 && this.range >= 39) {
                            this.velocity.x = 10 * Math.cos(theta);
                            this.velocity.y = 10 * Math.sin(theta);
                            mod *= -1;
                        }
                        this.maxSpeed = this.topSpeed;
                        break;
                    case "bong":
                        this.SIZE += 4;
                        this.maxSpeed = this.topSpeed;
                        this.damp = .05;
                        break;
                    case "oxy":
                        this.maxSpeed = this.topSpeed;
                        let oxy = util.getDistance({
                            x: 0,
                            y: 0
                        }, g) + 1;
                        if (gactive && oxy > this.size) {
                            let desiredXSpeed = this.topSpeed * g.x / oxy,
                                desiredYSpeed = this.topSpeed * g.y / oxy,
                                turning = Math.sqrt((this.topSpeed * Math.max(1, this.range) + 1) / a);
                            engine = {
                                x: (desiredXSpeed - this.velocity.x) / Math.max(5, turning),
                                y: (desiredYSpeed - this.velocity.y) / Math.max(5, turning)
                            };
                        } else {
                            if (this.velocity.length < this.topSpeed) engine = {
                                x: this.velocity.x * a / 20,
                                y: this.velocity.y * a / 20
                            };
                        }
                        this.color = 31;
                        break;
                    case "swarm2":
                        this.maxSpeed = 0;
                        let l2 = util.getDistance({
                            x: 0,
                            y: 0
                        }, g) + 1;
                        if (gactive && l2 > this.size) {
                            let desiredXSpeed = this.topSpeed * g.x / l2,
                                desiredYSpeed = this.topSpeed * g.y / l2,
                                turning = Math.sqrt((this.topSpeed * Math.max(1, this.range) + 1) / a);
                            engine = {
                                x: (desiredXSpeed - this.velocity.x) / Math.max(5, turning),
                                y: (desiredYSpeed - this.velocity.y) / Math.max(5, turning)
                            };
                        } else {
                            if (this.velocity.length < this.topSpeed) engine = {
                                x: this.velocity.x * a / 20,
                                y: this.velocity.y * a / 20
                            };
                        }
                        break;
                }
                global.gaysex = [engine.x, this.control.power]
                this.accel.x += engine.x * this.control.power;
                this.accel.y += engine.y * this.control.power;
            }
            face() {
                let t = this.control.target,
                    oldFacing = this.facing;
                let spinSpeed = this.facingTypeSettings.SPEED ?? .02,
                    reverseOnAlt = this.facingTypeSettings.CAN_REVERSE ?? false;
                switch (this.facingType) {
                    case "autospin":
                        if (reverseOnAlt) this.facing += (this.master.control.alt ? -spinSpeed : spinSpeed) / room.speed;
                        else this.facing += spinSpeed / room.speed;
                        break;
                    case "lmg":
                        if (this.master.control.fire) this.facing += .0375 / room.speed;
                        break;
                    case "turnWithSpeed":
                        this.facing += this.velocity.length / 90 * Math.PI / room.speed;
                        break;
                    case "turnWithSpeedFood":
                        if (!(this.id % 2)) this.facing -= this.velocity.length / 90 * Math.PI / room.speed;
                        else this.facing += this.velocity.length / 90 * Math.PI / room.speed;
                        break;
                    case "withMotion":
                        if (this.velocity.length > 0) this.facing = this.velocity.direction;
                        break;
                    case "smoothTargetOrSmoothhMotion":
                        if (this.source.control.target.length === 0) {
                            this.facing += util.loopSmooth(this.facing, Math.atan2(this.velocity.y, this.velocity.x), 4 / room.speed);
                        } else {
                            this.facing += util.loopSmooth(this.facing, Math.atan2(t.y, t.x), 4 / room.speed);
                        }
                        break;
                    case "looseWithMotion":
                        if (!this.velocity.length) break;
                    case "smoothWithMotion":
                        this.facing += util.loopSmooth(this.facing, Math.atan2(this.velocity.y, this.velocity.x), 4 / room.speed);
                        break;
                    case "sans":
                        this.facing = Math.atan2(t.y, t.x);
                        entities.forEach((instance) => {
                            if (Math.abs(this.x - instance.x) < 70 && Math.abs(this.y - instance.y) < 70 && "bullet trap swarm drone minion tank miniboss crasher food".includes(instance.type) && instance.team != this.team) {
                                this.velocity.x += 20 * Math.sin(instance.velocity.direction + (Math.PI / 2));
                                this.velocity.y += 50 * Math.cos(instance.velocity.direction + (Math.PI / 2));
                                this.facingType = "smoothWithMotion";
                                setTimeout(() => {
                                    this.facingType = "sans";
                                }, 1);
                            }
                        });
                        break;
                    case "dodge":
                        this.facing = Math.atan2(t.y, t.x);
                        entities.forEach((instance) => {
                            if (Math.abs(this.x - instance.x) < 70 && Math.abs(this.y - instance.y) < 70 && "bullet trap swarm drone minion".includes(instance.type) && instance.team != this.team) {
                                this.velocity.x += 50 * Math.sin(instance.velocity.direction + (Math.PI / 2));
                                this.velocity.y += 50 * Math.cos(instance.velocity.direction + (Math.PI / 2));
                                this.facingType = "smoothWithMotion";
                                setTimeout(() => {
                                    this.facingType = "dodge";
                                }, 1500);
                            }
                        });
                        break;
                    case "bossdodge":
                        this.facing = Math.atan2(t.y, t.x);
                        entities.forEach((instance) => {
                            if (Math.abs(this.x - instance.x) < 70 && Math.abs(this.y - instance.y) < 70 && "bullet trap swarm drone minion".includes(instance.type) && instance.team != this.team) {
                                this.velocity.x += 150 * Math.sin(instance.velocity.direction + (Math.PI / 2));
                                this.velocity.y += 150 * Math.cos(instance.velocity.direction + (Math.PI / 2));
                                this.facingType = "smoothWithMotion";
                                setTimeout(() => {
                                    this.facingType = "bossdodge";
                                }, 10000);
                            }
                        });
                        break;
                    case "dronedodge":
                        this.facing = Math.atan2(t.y, t.x);
                        entities.forEach((instance) => {
                            if (Math.abs(this.x - instance.x) < 70 && Math.abs(this.y - instance.y) < 70 && "bullet trap swarm drone minion".includes(instance.type) && instance.team != this.team) {
                                this.velocity.x += 50 * Math.sin(instance.velocity.direction + (Math.PI / 2));
                                this.velocity.y += 50 * Math.cos(instance.velocity.direction + (Math.PI / 2));
                                this.facingType = "smoothWithMotion";
                                setTimeout(() => {
                                    this.facingType = "dronedodge";
                                }, 2500);
                            }
                        });
                        break;
                    case "toTarget":
                        this.facing = Math.atan2(t.y, t.x);
                        break;
                    case "locksFacing":
                        if (!this.control.alt) this.facing = Math.atan2(t.y, t.x);
                        break;
                    case "altLocksFacing":
                        if (!this.control.fire) this.facing = Math.atan2(t.y, t.x);
                        break;
                    case "smoothToTarget":
                        this.facing += util.loopSmooth(this.facing, Math.atan2(t.y, t.x), 4 / room.speed);
                        break;
                    case "slowToTarget":
                        this.facing += util.loopSmooth(this.facing, Math.atan2(t.y, t.x), 8 / room.speed);
                        break;
                    case "bound":
                        let givenAngle;
                        if (this.turretRightClick ? this.control.alt : this.control.main) {
                            givenAngle = Math.atan2(t.y, t.x);
                            let diff = util.angleDifference(givenAngle, this.firingArc[0]);
                            if (Math.abs(diff) >= this.firingArc[1]) givenAngle = this.firingArc[0];
                        } else givenAngle = this.firingArc[0];
                        this.facing += util.loopSmooth(this.facing, givenAngle, (2 / room.speed) * this.turretTraverseSpeed);
                        if (this.bond.syncTurretSkills) this.skill.set(this.bond.skill.raw);
                        break;
                    case "toBound":
                        this.facing = this.bound.angle + this.bond.master.facing;
                        break;
                    case "hatchet":
                        this.facing += .2 + this.skill.spd / 7;
                        break;
                    case "masterOnSpawn":
                        if (!this.variables.masterOnSpawnFacing) {
                            this.facing = this.master.facing
                            this.variables.masterOnSpawnFacing = 1
                        }
                        break;
                }
                let TAU = 2 * Math.PI;
                this.facing = (this.facing % TAU + TAU) % TAU;
                this.vfacing = util.angleDifference(oldFacing, this.facing) * room.speed;
            }
            physics() {
                this.velocity.x += this.accel.x * room.lagComp;
                this.velocity.y += this.accel.y * room.lagComp;
                this.accel.null();
                this.stepRemaining = c.ARENA_TYPE === 1 ? 1.5 : 1;
                this.x += (this.stepRemaining * this.velocity.x / room.speed);
                this.y += (this.stepRemaining * this.velocity.y / room.speed);
            }
            friction() {
                let motion = this.velocity.length * room.lagComp,
                    excess = (motion - (this.maxSpeed)) * (c.ARENA_TYPE === 1 ? 1.05 : 1);
                if (excess > 0 && this.damp) {
                    let drag = excess / ((this.damp) / room.speed + 1),
                        finalvelocity = (this.maxSpeed) + drag;
                    this.velocity.x = finalvelocity * this.velocity.x / motion;
                    this.velocity.y = finalvelocity * this.velocity.y / motion;
                }
            }
            location() {
                if (this.isDead()) {
                    return;
                }/*
            if (isNaN(this.x) || isNaN(this.y)) {
                util.error("Detected an NaN position!");
                util.error("Label: " + this.label);
                util.error("Index: " + this.index);
                util.error(`Position: (${this.x}, ${this.y})`);
                util.error(`Velocity: (${this.velocity.x}, ${this.velocity.y})`);
                util.error(`Acceleration: (${this.accel.x}, ${this.accel.y})`);
                return this.kill();
            }*/
                let loc = {
                    x: this.x,
                    y: this.y
                },
                    myCell = this.myCell;
                if (room.outb && room.outb.length && this.diesToTeamBase && !this.godmode && !this.passive && myCell === "outb") {
                    if (this.type === "miniboss" || this.type === "crasher") {
                        let pos = room.randomType(room.bossRush ? "bosp" : ran.choose(room.presentNests));
                        this.x = pos.x;
                        this.y = pos.y;
                    } else if (this.type === "tank" || this.type === "food") {
                        return this.kill();
                    }
                }
                if (c.DO_BASE_DAMAGE && room.gameMode === "tdm" && this.diesToTeamBase && !this.godmode && !this.passive && !this.isTurret) {
                    let bas = myCell.slice(0, -1);
                    if (bas === "bas" || bas === "n_b" || bas === "bad" || bas === "por") {
                        if (bas + -this.team !== myCell) {
                            if (room.bossRush && this.team == -100) return
                            this.velocity.null();
                            this.accel.null();
                            this.kill();
                            return;

                        }
                    }
                    /*let isInTeamBase = false;
                    for (let i = 1; i < room.teamAmount + 1; i++)
                        if (this.master.team !== -i && (room.isIn(`bas${i}`, loc) || room.isIn(`n_b${i}`, loc) || room.isIn(`bad${i}`, loc))) {
                            isInTeamBase = true;
                            break;
                        }
                    if (isInTeamBase) {
                        this.velocity.null();
                        this.accel.null();
                        this.isDead = () => true;
                        return setTimeout(() => {
                            if (this.isAlive) this.kill();
                        }, 75);
                    }*/
                }
                if (c.PORTALS.ENABLED) {
                    if (myCell === "port" && !this.passive && !this.settings.goThruObstacle && !this.isTurret) {
                        if (this.motionType === "crockett") return this.kill();
                        if (this.settings.isHelicopter) {
                            if (!this.godmode && !this.invuln) this.health.amount -= 1;
                            return;
                        }
                        let myRoom = room.isAt(loc),
                            dx = loc.x - myRoom.x,
                            dy = loc.y - myRoom.y,
                            dist2 = dx * dx + dy * dy,
                            force = c.BORDER_FORCE;
                        if (this.type === "miniboss" || this.isMothership) {
                            this.accel.x += 1e4 * dx / dist2 * force / room.speed;
                            this.accel.y += 1e4 * dy / dist2 * force / room.speed;
                        } else if (this.type === "tank") {
                            if (dist2 <= c.PORTALS.THRESHOLD) {
                                let angle = Math.random() * Math.PI * 2,
                                    ax = Math.cos(angle),
                                    ay = Math.sin(angle);
                                //this.velocity.x = c.PORTALS.LAUNCH_FORCE * ax * force / room.speed;
                                //this.velocity.y = c.PORTALS.LAUNCH_FORCE * ay * force / room.speed;
                                let portTo;
                                do portTo = room["port"][Math.floor(Math.random() * room["port"].length)];
                                while (portTo.id === myRoom.id && room["port"].length > 1);
                                let rx = ax < 0 ? -room.xgridWidth / 1.8 : room.xgridWidth / 1.8,
                                    ry = ay < 0 ? -room.ygridHeight / 1.8 : room.ygridHeight / 1.8;
                                this.x = portTo.x + rx;
                                this.y = portTo.y + ry;
                                if (this.isPlayer) {
                                    this.invuln = true;
                                    this.invulnTime = [Date.now(), 15000];
                                    this.sendMessage("You will be invulnerable until you move, shoot or wait 15 seconds.");
                                }
                                //for (let o of entities)
                                entities.forEach(o => {
                                    if (o.id !== this.id && o.master.id === this.id && (o.type === "drone" || o.type === "minion")) {
                                        o.x = portTo.x + 320 * ax + 30 * (Math.random() - .5);
                                        o.y = portTo.y + 320 * ay + 30 * (Math.random() - .5);
                                    }
                                });
                            } else {
                                this.velocity.x -= c.PORTALS.GRAVITY * dx / dist2 * force / room.speed;
                                this.velocity.y -= c.PORTALS.GRAVITY * dy / dist2 * force / room.speed;
                            }
                        } else this.kill();
                    } else if (myCell === "port" && !this.passive && this.motionType === "crockett") {
                        return this.kill();
                    } else if (room[`por${-this.team}`] && myCell === `por${-this.team}` && !this.passive && !this.settings.goThruObstacle && !this.isTurret) {
                        if (this.motionType === "crockett") return this.kill();
                        if (this.settings.isHelicopter) {
                            if (!this.godmode && !this.invuln && !this.grantedInvuln) this.health.amount -= 1;
                            return;
                        }
                        let myRoom = room.isAt(loc),
                            dx = loc.x - myRoom.x,
                            dy = loc.y - myRoom.y,
                            dist2 = dx * dx + dy * dy,
                            force = c.BORDER_FORCE;
                        if (this.type === "miniboss" || this.isMothership) {
                            this.accel.x += 1e4 * dx / dist2 * force / room.speed;
                            this.accel.y += 1e4 * dy / dist2 * force / room.speed;
                        } else if (this.type === "tank") {
                            if (dist2 <= c.PORTALS.THRESHOLD) {
                                let angle = Math.random() * Math.PI * 2,
                                    ax = Math.cos(angle),
                                    ay = Math.sin(angle);
                                //this.velocity.x = c.PORTALS.LAUNCH_FORCE * ax * force / room.speed;
                                //this.velocity.y = c.PORTALS.LAUNCH_FORCE * ay * force / room.speed;
                                let portTo;
                                do portTo = room[`por${-this.team}`][Math.floor(Math.random() * room[`por${-this.team}`].length)];
                                while (portTo.id === myRoom.id && room[`por${-this.team}`].length > 1);
                                let rx = ax < 0 ? -room.xgridWidth / 1.8 : room.xgridWidth / 1.8,
                                    ry = ay < 0 ? -room.ygridHeight / 1.8 : room.ygridHeight / 1.8;
                                this.x = portTo.x + rx;
                                this.y = portTo.y + ry;
                                if (this.isPlayer) {
                                    this.invuln = true;
                                    this.invulnTime = [Date.now(), 15000];
                                    this.sendMessage("You will be invulnerable until you move, shoot or wait 15 seconds.");
                                }
                                entities.forEach(o => {
                                    if (o.id !== this.id && o.master.id === this.id && (o.type === "drone" || o.type === "minion")) {
                                        o.x = portTo.x + 320 * ax + 30 * (Math.random() - .5);
                                        o.y = portTo.y + 320 * ay + 30 * (Math.random() - .5);
                                    }
                                });
                            } else {
                                this.velocity.x -= c.PORTALS.GRAVITY * dx / dist2 * force / room.speed;
                                this.velocity.y -= c.PORTALS.GRAVITY * dy / dist2 * force / room.speed;
                            }
                        } else this.kill();
                    } else if (room[`por${-this.team}`] && myCell === `por${-this.team}` && !this.passive && this.motionType === "crockett") {
                        return this.kill();
                    }
                }
                if (!this.settings.canGoOutsideRoom && !this.passive && this.motionType !== "bound") {
                    /*let xx = this.x;
                    let yy = this.y;
                    let bounces = this.type !== "tank" && this.type !== "miniboss" && this.type !== "drone";
    
                    this.x = Math.max(0 + this.realSize, Math.min(this.x, room.width - this.realSize));
                    this.y = Math.max(0 + this.realSize, Math.min(this.y, room.height - this.realSize));
    
                    if (this.x != xx) {
                        this.accel.x = this.x > room.width / 2 ? Math.min(this.accel.x, 0) : Math.max(this.accel.x, 0);
                        this.velocity.x = bounces ? this.velocity.x *= -0.5 : 0;
                    }
                    if (this.y != yy) {
                        this.accel.y = this.y > room.width / 2 ? Math.min(this.accel.x, 0) : Math.max(this.accel.x, 0);
                        this.velocity.y = bounces ? this.velocity.y *= -0.5 : 0;
                    }*/
                    let force = c.BORDER_FORCE;
                    this.isOutsideRoom = false
                    switch (c.ARENA_TYPE) {
                        case 1: // Round
                            if (this.isActive && ((this.type === "tank" && this.bound == null) || this.type === "food")) {
                                const dist = util.getDistance(this, {
                                    x: room.width / 2,
                                    y: room.height / 2
                                });
                                if (dist > room.width / 2) {
                                    this.isOutsideRoom = true
                                    let strength = Math.abs((dist - room.width / 2) * (force / room.speed)) / 1000;
                                    this.x = util.lerp(this.x, room.width / 2, strength);
                                    this.y = util.lerp(this.y, room.height / 2, strength);
                                }
                            }
                            break;
                        case 2: // Warping
                            if (this.x < 0) {
                                this.x = room.width - this.realSize;
                            }
                            if (this.x > room.width) {
                                this.x = this.realSize;
                            }
                            if (this.y < 0) {
                                this.y = room.height - this.realSize;
                            }
                            if (this.y > room.width) {
                                this.y = this.realSize;
                            }
                            break;
                        case 3: // Triangle
                            if (this.isActive && ((this.type === "tank" && this.bound == null) || this.type === "food")) {
                                let isOutside = false;
                                for (let point of room.mapPoints) {
                                    let angle = Math.atan2(this.y - point.y, this.x - point.x),
                                        diff = Math.abs(util.angleDifference(angle, point.angle));
                                    if (diff < Math.PI / 2) {
                                        isOutside = true;
                                        break;
                                    }
                                }
                                if (isOutside) {
                                    this.isOutsideRoom = true
                                    let strength = Math.abs((util.getDistance(this, {
                                        x: room.width / 2,
                                        y: room.height / 2
                                    }) - room.width / 2) * (force / room.speed)) / 1000;
                                    this.x = util.lerp(this.x, room.width / 2, strength);
                                    this.y = util.lerp(this.y, room.height / 2, strength);
                                }
                            }
                            break;
                        default: // Default rectangular
                            if (this.x < 0) {
                                this.isOutsideRoom = true
                                this.accel.x -= Math.min(this.x - this.realSize + 50, 0) * force / room.speed;
                            }
                            if (this.x > room.width) {
                                this.isOutsideRoom = true
                                this.accel.x -= Math.max(this.x + this.realSize - room.width - 50, 0) * force / room.speed;
                            }
                            if (this.y < 0) {
                                this.isOutsideRoom = true
                                this.accel.y -= Math.min(this.y - this.realSize + 50, 0) * force / room.speed;
                            }
                            if (this.y > room.height) {
                                this.isOutsideRoom = true
                                this.accel.y -= Math.max(this.y + this.realSize - room.height - 50, 0) * force / room.speed;
                            }
                            break;
                    }

                    // Do outside of room damage
                    function outsideRoomDamage(entity) {
                        if (entity.shield.amount > 1) {
                            entity.shield.amount = entity.shield.amount - c.OUTSIDE_ROOM_DAMAGE
                        } else {
                            entity.health.amount = entity.health.amount - c.OUTSIDE_ROOM_DAMAGE
                        }
                        if (entity.onDamaged) entity.onDamaged(entity, null, c.OUTSIDE_ROOM_DAMAGE)
                    }
                    if (this.OUTSIDE_ROOM_DAMAGE && this.isOutsideRoom) {
                        outsideRoomDamage(this)
                    }


                    if (c.PORTALS.ENABLED && !this.settings.isHelicopter) {
                        let force = c.BORDER_FORCE;
                        if (c.PORTALS.DIVIDER_1.ENABLED) {
                            let l = c.PORTALS.DIVIDER_1.LEFT,
                                r = c.PORTALS.DIVIDER_1.RIGHT,
                                m = (l + r) * .5;
                            if (this.x > m && this.x < r) this.accel.x -= Math.min(this.x - this.realSize + 50 - r, 0) * force / room.speed;
                            if (this.x > l && this.x < m) this.accel.x -= Math.max(this.x + this.realSize - 50 - l, 0) * force / room.speed;
                        }
                        if (c.PORTALS.DIVIDER_2.ENABLED) {
                            let l = c.PORTALS.DIVIDER_2.TOP,
                                r = c.PORTALS.DIVIDER_2.BOTTOM,
                                m = (l + r) * .5;
                            if (this.y > m && this.y < r) this.accel.y -= Math.min(this.y - this.realSize + 50 - r, 0) * force / room.speed;
                            if (this.y > l && this.y < m) this.accel.y -= Math.max(this.y + this.realSize - 50 - l, 0) * force / room.speed;
                        }
                    }
                }
            }
            regenerate() {
                if (this.shield.max) {
                    if (this.REGEN !== -1) this.shield.regenerate();
                }
                if (this.health.amount) {
                    if (this.REGEN !== -1) this.health.regenerate(this.shield.max && this.shield.max === this.shield.amount);
                }
            }
            death() {
                //this.checkIfIShouldDie() && this.kill();
                // Turrets must not be calculated as a normal entity
                if (this.bond != null && this.bond.isGhost) {
                    return true;
                }
                // Invulnerable and godmode players should not take damage or be killed. (Set the godmode and invuln properties to false beforehand)
                if (this.invuln || this.godmode) {
                    this.damageReceived = 0;
                    this.regenerate();
                    return 0;
                }
                // If we die at range, attempt to die for some dumb reason
                if (this.settings.diesAtRange) {
                    this.range -= 1 / room.speed;
                    if (this.range <= 0) {
                        this.kill();
                    }
                }
                // If we die at low speeds, do that because we are a failure
                if (this.settings.diesAtLowSpeed && !this.collisionArray.length && this.velocity.length < this.topSpeed / 2) {
                    this.health.amount -= this.health.getDamage(1 / room.speed);
                }
                // Do damage to us
                if (this.damageReceived !== 0) {
                    if (this.shield.max) {
                        let shieldDamage = this.shield.getDamage(this.damageReceived);
                        this.damageReceived -= shieldDamage;
                        this.shield.amount -= shieldDamage;
                    }
                    if (this.damageReceived !== 0) {
                        let healthDamage = this.health.getDamage(this.damageReceived);
                        this.blend.amount = 1;
                        this.health.amount -= healthDamage;
                    }
                }
                this.regenerate();
                this.damageReceived = 0;
                if (this.isDead()) {
                    if (this.variables.onfire && this.miscIdentifier !== 'Rogue Egg') this.collisionArray.push(this.variables.onfireBy);
                    for (let i = 0; i < this.guns.length; i++) {
                        let gun = this.guns[i];
                        if (gun.shootOnDeath) {
                            gun.fire(gun.body.skill);
                        }
                    }
                    // Explosions, phases and whatnot
                    if (this.onDead != null && !this.hasDoneOnDead) {
                        this.hasDoneOnDead = true;
                        this.onDead({ sockets, ran, Entity, me: this, them: this.collisionArray[0] });
                    }
                    // Second function so onDead isn't overwritten by specific gamemode features
                    if (this.modeDead != null && !this.hasDoneModeDead) {
                        this.hasDoneModeDead = true;
                        this.modeDead();
                    }
                    // Process tag events if we should
                    if (c.serverName.includes("Tag") && (this.isPlayer || this.isBot)) {
                        tagDeathEvent(this);
                    }
                    // Just in case one of the onDead events revives the tank from death (like dominators), don't run it
                    if (this.isDead()) {
                    if (this.variables.onfire && this.miscIdentifier === 'Rogue Egg') this.collisionArray.push(this.variables.onfireBy);
                        let killers = [],
                            killTools = [],
                            notJustFood = false,
                            name = this.master.name === "" ? this.master.type === "tank" ? "An unnamed player's " + this.label : this.master.type === "miniboss" ? "a visiting " + this.label : util.addArticle(this.label) : this.master.name + "'s " + this.label,
                            jackpot = Math.round(util.getJackpot(this.skill.score) / this.collisionArray.length);
                        // Find out who killed us, and if it was "notJustFood" or not
                        for (let i = 0, l = this.collisionArray.length; i < l; i++) {
                            let o = this.collisionArray[i];
                            if (o.type === "wall" || o.type === "mazeWall") {
                                continue;
                            }
							let master = o.master?.master ?? o.master;
							if (!master) continue;
                            if (master.isDominator || master.isArenaCloser || master.label === "Base Protector") {
                                if (!killers.includes(master)) {
                                    killers.push(master);
                                }
                            }
                            if (master.settings.acceptsScore) {
                                if (master.type === "tank" || master.type === "miniboss") {
                                    notJustFood = true;
                                }
                                if (master.settings.getsNegativeScore) jackpot *= -1;
                                master.skill.score += jackpot;
                                if (!killers.includes(master)) {
                                    killers.push(master);
                                }
                            } else if (o.settings.acceptsScore) {
                                if (o.settings.getsNegativeScore) jackpot *= -1;
                                o.skill.score += jackpot;
                            }
                            killTools.push(o);
                        }
                        /* if (this.variables.onfire) {
                            let master = this.variables.onfireBy;
                            if (master && master.settings.acceptsScore) {
                                if (master.type === "tank" || master.type === "miniboss") notJustFood = true;
                                if (master.settings.getsNegativeScore) jackpot *= -1;
                                master.skill.score += jackpot;
                                if (!killers.includes(master)) killers.push(master);
                            }
                            killTools.push(master);
                        } */
                        // Now process that information
                        let killText = notJustFood ? "" : "You have been killed by ",
                            giveKillMessage = this.settings.givesKillMessage;
                        for (let i = 0, l = killers.length; i < l; i++) {
                            let o = killers[i];
                            if (o.onKill) {
                                o.onKill(o, this);
                            }
                            this.killCount.killers.push(o);
                            if (this.type === "tank") {
                                if (killers.length > 1) {
                                    o.killCount.assists++;
                                    if (!o.teamwork) o.rewardManager(-1, "teamwork");
                                } else {
                                    o.killCount.solo++;
                                }
                                o.rewardManager(0, 1);
                            } else if (this.type === "miniboss") {
                                o.killCount.bosses++;
                                o.rewardManager(2, 1);
                            } else if (this.type === "food") {
                                o.rewardManager(3, 1);
                            } else if (this.type === "crasher") {
                                o.rewardManager(8, 1);
                            }
                        }
                        // Understand who killed us, but only if it wasn't a minor NPC
                        if (notJustFood) {
                            for (let i = 0, l = killers.length; i < l; i++) {
                                let o = killers[i];
                                if (o.master.type !== "food" && o.master.type !== "crasher") {
                                    killText += o.name === "" ? killText === "" ? "An unnamed player" : "An unnamed player" : o.name;
                                    killText += " and ";
                                }
                                if (giveKillMessage) {
                                    o.sendMessage("You" + (killers.length > 1 ? " assist-" : " ") + ((this.variables.dogonekBossType === 'youkai') ? "scared off " : (this.variables.onfire) ? "scorched " : "killed ") + name + ".");
                                }
                            }
                            killText = killText.slice(0, -4);
                            killText += "killed you with ";
                        }
                        // If we generally broadcast something when we die, do so
                        if (this.settings.broadcastMessage) {
                            sockets.broadcast(this.settings.broadcastMessage);
                        }
                        /*
                        for (let i = 0, l = killTools.length; i < l; i++) {
                            let o = killTools[i];
                            if (
                                o.label.includes("Collision") ||
                                o.label.includes("Lance") ||
                                o.label.includes("Blade")
                            ) {
                                toAdd = util.addArticle(o.label) + " and ";
                            } else {
                                toAdd += util.addArticle(o.label) + " and ";
                            }
                        }
                        */
                        // (Ported from OSA)
                        let toAdd = "",
                            killCounts = {};
                        for (let { label } of killTools) {
                            if (!killCounts[label]) killCounts[label] = 0;
                            killCounts[label]++;
                        }
                        let killCountEntries = Object.entries(killCounts).map(([name, count], i) => name);
                        for (let i = 0; i < killCountEntries.length; i++) {
                            toAdd += (killCounts[killCountEntries[i]] == 1) ? util.addArticle(killTools[i].label) : killCounts[killCountEntries[i]] + ' ' + killCountEntries[i] + 's';
                            toAdd += i < killCountEntries.length - 2 ? ', ' : ' and ';
                        }
                        killText += toAdd;
                        killText = killText.slice(0, -5);
                        if (this.killedByK) {
                            killText = "You killed yourself";
                        } else if (this.killedByWalls) {
                            killText = "You got stuck in the walls";
                        } else if (killText === "You have been kille") {
                            killText = "You have died a stupid death";
                        }
                        // If we're really us, just send the message
                        if (!this.underControl) {
                            this.sendMessage(killText + ".");
                        }
                        // Usurp message (Doesn't happen in ranked battle)
                        if (this.id === room.topPlayerID && !c.RANKED_BATTLE) {
                            let usurptText = this.name || "The leader";
                            if (notJustFood) {
                                usurptText += " has been usurped by";
                                for (let i = 0, l = killers.length; i < l; i++) {
                                    let o = killers[i];
                                    o.rewardManager(-1, "usurper");
                                    if (o.type !== "food") {
                                        usurptText += " ";
                                        usurptText += o.name || "An unnamed player";
                                        usurptText += " and";
                                    }
                                }
                                usurptText = usurptText.slice(0, -4);
                                usurptText += "!";
                            } else {
                                if (this.killedByWalls) {
                                    usurptText += " went to the backrooms.";
                                } else if (killers[0] != null) {
                                    if (killers[0].isArenaCloser) {
                                        usurptText += ` suffered by the hands of ${util.addArticle(killers[0].label)}.`;
                                    } else if (killers[0].label.includes("Base Protector")) {
                                        usurptText += " strayed too close to a Base Protector.";
                                    } else {
                                        usurptText += ` fought ${util.addArticle(killers[0].label)}, and the ${killers[0].label} won.`;
                                    }
                                } else if (this.killedByK) {
                                    usurptText += " took the easy way out.";
                                } else if (this.isBot) {
                                    usurptText += " was slaughtered by server code.";
                                } else {
                                    usurptText += " suffered an unknown fate.";
                                }
                            }
                            sockets.broadcast(usurptText);
                        }
                        return true;
                    }
                }
                return false;
            }
            protect() {
                entitiesToAvoid.push(this);
                this.isProtected = true;
            }
            sendMessage(message, color = 0) { }
            rewardManager(id, amount) { }
            kill() {
                this.godmode = false;
                this.invuln = false;
                this.damageReceived = this.health.max * 2;
                this.health.amount = -1;
                this.destroy()
            }
            destroy(skipEvents = false) {
                if (this.hasDestroyed) {
                    return;
                }
                this.hasDestroyed = true;
                // Remove us from protected entities
                if (this.isProtected) {
                    //entitiesToAvoid = entitiesToAvoid.filter(child => child.id !== this.id);
                    //util.remove(entitiesToAvoid, entitiesToAvoid.indexOf(this));
                    util.removeID(entitiesToAvoid, this.id);
                }
                // Remove us from our children
                if (this.parent != null) {
                    //util.remove(this.parent.children, this.parent.children.indexOf(this));
                    //this.parent.children = this.parent.children.filter(child => child.id !== this.id);
                    if (this.parent.childrenMap) this.parent.childrenMap.delete(this.id)
                }
                if (this.master != null) {
                    if (this.master.childrenMap) this.master.childrenMap.delete(this.id)
                }
                // NEDS WORK: remove our children
                /*for (let i = 0, l = entities.length; i < l; i ++) {
                    let instance = entities[i];
                    if (instance.source.id === this.id) {
                        if (instance.settings.persistsAfterDeath) {
                            instance.source = instance;
                            if (instance.settings.persistsAfterDeath === 'always') {
                                continue;
                            }
                        } else {
                            instance.kill();
                        }
                    }
                    if (instance.parent && instance.parent.id === this.id) {
                        instance.parent = null;
                    }
                    if (instance.master.id === this.id) {
                        instance.kill();
                        instance.master = instance;
                    }
                }*/
                for (let [key, child] of this.childrenMap) {
                    this.childrenMap.delete(key)
                    child.parent = null
                    child.source = child
                    if (!child.settings.persistsAfterDeath) {
                        child.destroy()
                    }
                };
                for (let [key, laser] of this.laserMap) {
                    if (!laser.persistsAfterDeath) {
                        laser.destroy()
                    }
                };
                /*this.childrenMap.forEach(instance => {
                    if (instance.source.id === this.id) {
                        if (instance.settings.persistsAfterDeath) {
                            instance.source = instance;
                            if (instance.settings.persistsAfterDeath === 'always') {
                                return;
                            }
                            if (this.source == this) {
                                instance.kill();
                                this.childrenMap.delete(instance.id);
                            }
                        } else {
                            this.childrenMap.delete(instance.id);
                            instance.kill();
                        }
                    }
                    if (instance.parent && instance.parent.id === this.id) {
                        instance.parent = null;
                    }
                    if (instance.master.id === this.id) {
                        this.childrenMap.delete(instance.id);
                        instance.kill();
                        instance.master = instance;
                    }
                });*/

                if (this.isGuided && this.master.altCameraSource) {
                    this.master.altCameraSource = null
                }

                this.removeFromGrid();
                this.isGhost = true;
                for (let turret of this.turrets) {
                    turret.destroy();
                }
                // Evolve stuff
                if (this.evolutionTimeout) {
                    clearTimeout(this.evolutionTimeout)
                }
                if (this.greaterEvolutionTimeout) {
                    clearTimeout(this.greaterEvolutionTimeout)
                }
                // Explosions, phases and whatnot
                if (skipEvents === false) {
                    if (this.onDead != null && !this.hasDoneOnDead) {
                        this.hasDoneOnDead = true;
                        this.onDead({ sockets, ran, Entity, me: this, them: this.collisionArray[0] });
                    }
                    // Second function so onDead isn't overwritten by specific gamemode features
                    if (this.modeDead != null && !this.hasDoneModeDead) {
                        this.hasDoneModeDead = true;
                        this.modeDead();
                    }
                }
                //entities.delete(this.id);
                this.isGhost = true;
            }
            isDead() {
                return this.health.amount <= 0 || this.isGhost;
            }
            isAlive() {
                return /*this != null && */ this.health.amount > 0 && !this.isGhost;
            }
            toggleRainbow() {
                this.rainbow = !this.rainbow;
                if (this.rainbow) this.intervalID = setInterval(this.rainbowLoop, this.rainbowSpeed);
                else clearInterval(this.intervalID);
            }
            rainbowLoop() {
                if (this.color < 100 || isNaN(this.color)) this.color = 100;
                this.color = (this.color - 100 + 1) % 86 + 100;
                if (this.multibox.enabled)
                    for (let o of this.multibox.controlledTanks)
                        if (o.isAlive()) o.color = this.color;
            }
            toggleMultibox() {
                this.multibox.intervalID = setInterval(this.multiboxLoop, 500);
            }
            multiboxLoop() {
                this.settings.hitsOwnType = "never";
                for (let controlledBody of this.multibox.controlledTanks)
                    if (controlledBody.isAlive()) {
                        controlledBody.autoOverride = this.autoOverride;
                        controlledBody.passive = this.passive;
                        controlledBody.godmode = this.godmode;
                        entities.forEach(o => {
                            if (o.master.id === controlledBody.id && o.id !== controlledBody.id) {
                                o.passive = controlledBody.passive;
                                o.diesToTeamBase = !controlledBody.godmode;
                            }
                        });
                        controlledBody.skill.set(this.skill.raw);
                        controlledBody.refreshBodyAttributes();
                        if (controlledBody.skill.score < 59214) {
                            controlledBody.skill.score = this.skill.score;
                            controlledBody.skill.level = this.skill.level;
                        }
                        if (controlledBody.tank !== this.tank) controlledBody.upgradeTank(this.tank);
                        controlledBody.tank = this.tank;
                        controlledBody.FOV = .1;
                        controlledBody.refreshFOV();
                        if (room.gameMode === "tdm") controlledBody.team = this.team;
                        else controlledBody.team = this.team = -9;
                        controlledBody.color = this.color;
                        controlledBody.settings.leaderboardable = false;
                        controlledBody.layer = this.layer - .5;
                        controlledBody.SIZE = this.SIZE;
                        controlledBody.nameColor = this.nameColor;
                        controlledBody.alpha = this.alpha;
                        controlledBody.ALPHA = this.ALPHA;
                    }

            }
            relinquish(player) {
                if (player.body.isMothership) {
                    player.body.nameColor = ["#00B0E1", "#F04F54", "#00E06C", "#BE7FF5", "#FFEB8E", "#F37C20", "#E85DDF", "#8EFFFB"][player.team - 1];
                    player.body.controllers = [new ioTypes.nearestDifferentMaster(player.body), new ioTypes.mapTargetToGoal(player.body), new ioTypes.roamWhenIdle(player.body)];
                    player.body.name = "Mothership";
                } else {
                    player.body.controllers = [new ioTypes.nearestDifferentMaster(player.body), new ioTypes.spinWhileIdle(player.body)];
                    player.body.nameColor = "#FFFFFF";
                    if (player.body.label === "Trapper Dominator") {
                        player.body.addController(new ioTypes.alwaysFire(player.body));
                        player.body.facingType = "autospin";
                    }
                    player.body.name = "";
                }
                player.body.underControl = false;
                player.body.autoOverride = false;
                player.body.sendMessage = (content, color = 0) => {};
                player.body.rewardManager = (id, amount) => {};
                let fakeBody = new Entity({
                    x: player.body.x,
                    y: player.body.y
                });
                fakeBody.passive = true;
                fakeBody.underControl = true;
                player.body = fakeBody;
                player.body.kill();
            }
            runAnimations(gun) {
                switch (gun.onShoot) {
                    case "log":
                        console.log("LOG");
                        break;
                    case "hitScan":
                    case "hitScan1":
                    case "hitScan2":
                    case "hitScan3": {
                        if (this.master.health.amount < 0) break;
                        let save = {
                            x: this.master.x,
                            y: this.master.y,
                            angle: this.master.facing + gun.angle
                        };
                        let s = this.size * gun.width * gun.settings2.size;
                        let target = {
                            x: save.x + this.control.target.x,
                            y: save.y + this.control.target.y
                        };
                        let amount = util.getDistance(target, save) / s | 0;
                        let explode = e => {
                            e.onDead = () => {
                                let o = new Entity(e, this);
                                o.accel.x = 3 * Math.cos(save.angle);
                                o.accel.y = 3 * Math.sin(save.angle);
                                o.color = this.master.color;
                                o.define(Class.hitScanExplosion);
                                // Pass the gun attributes
                                o.define({
                                    BODY: gun.interpret(gun.settings3),
                                    SKILL: gun.getSkillRaw(),
                                    SIZE: (this.size * gun.width * gun.settings3.size) / 2,
                                    LABEL: this.label + (gun.label ? " " + gun.label : "") + " " + o.label
                                });
                                o.refreshBodyAttributes();
                                o.life();
                                o.source = this;
                            }
                        };
                        let branchAlt = 0;
                        let branchLength = 0;
                        let branch = (e, a, b = false, g = 0, z = amount) => {
                            if (!b) branchAlt++;
                            let total = (z / 5 | 0) || 2;
                            let dir = (a ? Math.PI / 2 : -Math.PI / 2) + g;
                            for (let i = 0; i < total; i++) setTimeout(() => {
                                let ss = s * 1.5;
                                let x = e.x + (ss * Math.cos(save.angle + dir)) * i;
                                let y = e.y + (ss * Math.sin(save.angle + dir)) * i;
                                let o = new Entity({
                                    x,
                                    y
                                }, this);
                                o.facing = Math.atan2(target.y - y, target.x - x) + dir;
                                o.color = this.master.color;
                                o.define(Class.hitScanBullet);
                                // Pass the gun attributes
                                o.define({
                                    BODY: gun.interpret(gun.settings3),
                                    SKILL: gun.getSkillRaw(),
                                    SIZE: (this.size * gun.width * gun.settings2.size) / 2,
                                    LABEL: this.label + (gun.label ? " " + gun.label : "") + " " + o.label
                                });
                                o.refreshBodyAttributes();
                                o.life();
                                o.source = this;
                                if (i === total - 1) {
                                    if (branchLength < 3) {
                                        branchLength++;
                                        branch(o, a, true, dir + g, total);
                                    } else branchLength = 0;
                                }
                            }, (500 / amount) * i);
                        };
                        const hitScanLevel = +onShoot.split("hitScan").pop();
                        for (let i = 0; i < amount; i++) {
                            setTimeout(() => {
                                if (this.master.health.amount < 0) return;
                                let x = save.x + (s * Math.cos(save.angle)) * i;
                                let y = save.y + (s * Math.sin(save.angle)) * i;
                                let e = new Entity({
                                    x: x,
                                    y: y
                                }, this);
                                e.facing = Math.atan2(target.y - y, target.x - x);
                                e.color = this.master.color;
                                e.define(Class.hitScanBullet);
                                // Pass the gun attributes
                                e.define({
                                    BODY: gun.interpret(gun.settings2),
                                    SKILL: gun.getSkillRaw(),
                                    SIZE: (this.size * gun.width * gun.settings2.size) / 2,
                                    LABEL: this.label + (gun.label ? " " + gun.label : "") + " " + e.label
                                });
                                e.refreshBodyAttributes();
                                e.life();
                                e.source = this;
                                switch (hitScanLevel) {
                                    case 1: {
                                        if (i % 5 === 0) branch(e, branchAlt % 2 === 0);
                                    }
                                        break;
                                    case 2: { // Superlaser
                                        if (i === amount - 1) explode(e);
                                    }
                                        break;
                                    case 3: { // Death Star
                                        if (i % 3 === 0) explode(e);
                                    }
                                        break;
                                }
                            }, 10 * i);
                        }
                    }
                        break;
                    case "revo":
                        if (this.isAlive()) this.define(Class.baseThrowerFire);
                        break;
                    case "mei":
                        if (this.isAlive()) this.define(Class.meiFire);
                        break;
                    case "hand":
                    case "hand2":
                    case "hand3":
                    case "hand4": {
                        let increment = onShoot === "hand2" ? 20 : onShoot === "hand3" ? 40 : onShoot === "hand4" ? 60 : 0,
                            tank = this.label === "Auto-Glove" ? "autoHandBasic" : "handBasic";
                        for (let i = 1; i < 21; i++) setTimeout(() => {
                            if (this.isAlive()) this.define(Class[`${tank}${i + increment}`]);
                        }, this.skill.rld * 20 * i); // 9.5
                    }
                        break;
                    case "hand5":
                        this.upgrades = [];
                        if (this.isAlive()) this.define(this.label === "Auto-Glove" ? Class.autoHandBasic0 : Class.handBasic0);
                        break;
                    case "oxy":
                        if (this.isAlive()) this.define(Class.greenGuardianLauncher);
                        break;
                    case "oxy2":
                        if (this.isAlive()) this.define(Class.greenMiniGuardianLauncher);
                        break;
                    case "hybranger":
                    case "hybranger2":
                        entities.forEach(o => {
                            if (o.master.id === this.id && o.type === "drone") o.kill();
                        });
                        for (let i = 1; i < 32; i++) setTimeout(() => {
                            if (this.isAlive()) this.define(Class[`hybranger${onShoot === "hybranger" ? i : (i === 31 ? 0 : i + 31)}`]);
                        }, 14 * i);
                        break;
                    case "shape":
                    case "shape2":
                        entities.forEach(o => {
                            if (o.master.id === this.id && o.type === "drone") o.kill();
                        });
                        for (let i = 1; i < 32; i++) setTimeout(() => {
                            if (this.isAlive()) this.define(Class[`shapeChange${onShoot === "shape" ? i : 31 - i}`]);
                        }, 14 * i);
                        break;
                    case "surge":
                    case "surge2":
                        for (let i = 1; i < 21; i++) setTimeout(() => {
                            if (this.isAlive()) this.define(Class[`sniperEMP${onShoot === "surge" ? i : 20 + i}`]);
                        }, this.skill.rld * (onShoot === "surge" ? 180 : 60) * i);
                        break;
                    case "surge3":
                        if (this.isAlive()) this.define(Class.sniperEMP0);
                        break;
                    default:
                        util.warn("Unknown ON_SHOOT value: " + onShoot + "!");
                        onShoot = null;
                };
            }
        }

        class Spawner {
            constructor(entities) {
                this.entities = [];
                for (let entity of entities) {
                    if (typeof entity === "string") {
                        this.entities.push(entity)
                        continue;
                    }
                    while (entity[1]--) {
                        this.entities.push(entity[0])
                    }
                }
                this.bias = 0
                this.biasInfluence = 1
            }
            getEntity() { // Chance to get that entity gets lower the further down it is
                return this.entities[Math.min(Math.random() * this.entities.length * (1 - Math.random() * this.biasInfluence) | 0, this.entities.length - 1)]
            }
        }

        const logs = (() => {
            const logger = (() => {
                const set = obj => {
                    obj.time = util.time();
                };
                const mark = obj => {
                    obj.data.push(util.time() - obj.time);
                };
                const record = obj => {
                    let o = util.averageArray(obj.data);
                    obj.data = [];
                    return o;
                };
                const sum = obj => {
                    let o = util.sumArray(obj.data);
                    obj.data = [];
                    return o;
                };
                const tally = obj => {
                    obj.count++;
                };
                const count = obj => {
                    let o = obj.count;
                    obj.count = 0;
                    return o;
                };
                return () => {
                    let internal = {
                        data: [],
                        time: util.time(),
                        count: 0
                    };
                    return {
                        set: () => set(internal),
                        mark: () => mark(internal),
                        record: () => record(internal),
                        sum: () => sum(internal),
                        count: () => count(internal),
                        tally: () => tally(internal)
                    };
                };
            })();
            return {
                entities: logger(),
                collide: logger(),
                network: logger(),
                minimap: logger(),
                //misc2: logger(),
                //misc3: logger(),
                physics: logger(),
                life: logger(),
                selfie: logger(),
                master: logger(),
                activation: logger(),
                loops: logger()
            };
        })();

        function flatten(data, out, playerContext = null) {
            out.push(data.type);

            if (data.type & 0x01) { // Turret specific data
                out.push(+(data.facing).toFixed(2), data.layer);
            } else { // Full entity data
                // Pre-calculate values
                const x = (data.x + .5) | 0;
                const y = (data.y + .5) | 0;
                const size = (data.size + .5) | 0;
                const facing = +(data.facing).toFixed(2);

                // --- Perspective Logic ---
                let finalTwiggle = data.twiggle;
                let finalColor = data.color ?? 0;

                if (playerContext && playerContext.body) {
                    // Perspective #1: Autospin
                    // If the viewing player has autospin on, the twiggle flag is forced true.
                    if (playerContext.command.autospin) {
                        finalTwiggle = true;
                    }

                    // Perspective #2: FFA Color Override
                    // In FFA, if a player's body color is 'FFA_RED', they see their own bullets as their team color.
                    if (playerContext.gameMode === "ffa" && !room.randomColors  && data.color === "FFA_RED" && playerContext.body.color === "FFA_RED" && data.masterId === playerContext.body.id) {
                        finalColor = playerContext.teamColor ?? 0;
                    }
                }
                // --- End of Perspective Logic ---

                // Create flags bitmask
                let flags = 0;
                flags |= finalTwiggle ? 1 : 0;
                flags |= data.layer !== 0 ? 2 : 0;
                flags |= data.health < .975 ? 4 : 0;
                flags |= data.shield < .975 ? 8 : 0;
                flags |= data.alpha < .975 ? 16 : 0;
                flags |= data.seeInvisible ? 32 : 0;
                flags |= data.nameColor !== "#FFFFFF" ? 64 : 0;
                flags |= data.label ? 128 : 0;
                flags |= data.sizeRatio[0] !== 1 ? 256 : 0;
                flags |= data.sizeRatio[1] !== 1 ? 512 : 0;
                flags |= data.leash ? 1024 : 0;

                // Push core data
                out.push(data.id, flags, data.index, x, y, size, facing);

                // Push conditional data based on flags
                if (flags & 2) out.push(data.layer);

                // Push the finalColor, which may have been modified by perspective logic
                out.push(finalColor, data.team);

                if (flags & 4) out.push(Math.ceil(255 * data.health));
                if (flags & 8) out.push(Math.ceil(255 * data.shield));
                if (flags & 16) out.push(Math.ceil(255 * data.alpha));
                if (flags & 64) out.push(data.nameColor);
                if (flags & 128) out.push(data.label);
                if (flags & 256) out.push(data.sizeRatio[0]);
                if (flags & 512) out.push(data.sizeRatio[1]);
                if (flags & 1024) out.push(data.leash.x, data.leash.y)

                // Push player-specific data
                if (data.type & 0x04) {
                    out.push(data.name || "", data.score || 0);
                }
            }

            // Push gun data
            const gunCount = data.guns.length;
            out.push(gunCount);
            for (let i = 0; i < gunCount; i++) {
                const gun = data.guns[i];
                out.push((gun.time + .5) | 0, (gun.power + .5) | 0);
            }

            // Push turret data (recursively, passing context)
            const turretCount = data.turrets.length;
            out.push(turretCount);
            for (let i = 0; i < turretCount; i++) {
                // The recursive call now passes the playerContext through
                flatten(data.turrets[i], out, playerContext);
            }
        }

        const sockets = (() => {
            const protocol = require("./lib/fasttalk");
            const bans = [];
            const backlog = [];
            let lastConnection = Date.now() - 501;
            class BacklogData {
                constructor(id, ip) {
                    this.id = id;
                    this.ip = ip;
                    backlog.push(this);
                }
            }
            let id = 0;

            const checkInView = (camera, obj) => {
                return (Math.abs(obj.x - camera.x) < camera.fov + (obj.size * (obj.width || 1))) && (Math.abs(obj.y - camera.y) < camera.fov + (obj.size * (obj.height || 1)));
            }
            const traffic = socket => {
                let strikes = 0;
                return () => {
                    if (util.time() - socket.status.lastHeartbeat > c.maxHeartbeatInterval) {
                        socket.error("traffic evaluation", "Heartbeat lost", true);
                        return 0;
                    }
                    if (socket.status.requests > 50) strikes++;
                    else strikes = 0;
                    if (strikes > 3) {
                        socket.error("traffic evaluation", "Socket traffic volume violation", true);
                        return 0;
                    }
                    socket.status.requests = 0;
                };
            };
            function validateHeaders(request) {
                let valid = ["localhost", "woomy-site.glitch.me", "woomy-api.glitch.me", "woomy-api-dev.glitch.me", "woomy.app", ".rivet.game"];
                let has = [0, 0];
                if (request.headers.origin) {
                    for (let ip of valid) {
                        if (request.headers.origin.includes(ip)) {
                            has[0]++;
                        }
                    }
                }
                if (request.headers["user-agent"]) {
                    for (let agent of ["Mozilla", "AppleWebKit", "Chrome", "Safari"]) {
                        if (request.headers["user-agent"].includes(agent)) {
                            has[1]++;
                        }
                    }
                }
                return !(has[0] !== 1 || has[1] === 0);
            }
            api.apiEvent.on("badIp", (data) => {
                let socket = clients.find(client => client.ip === data.data.ip)

                if (socket.betaData.permissions > 1) {
                    return;
                }

                if (!socket) {
                    util.warn(`Tried to kick ${socket?.ip} for bad ip but the socket could not be found`)
                    return
                }
                util.warn("Bad IP connection attempt terminated")
                socket.lastWords("P", `Your ip has been banned. Reason: "${data.data.reason}". `);
            })

            class SocketUser {
                constructor(playerId) {
                    util.log("New socket initiated!");
                    userSockets.set(playerId, this)
                    this.id = id++;
                    this._socket = userSocket(playerId, protocol.encode);
                    this.sentPackets = 0
                    this.receivedPackets = 0
                    this.camera = {
                        x: undefined,
                        y: undefined,
                        vx: 0,
                        vy: 0,
                        lastUpdate: util.time(),
                        lastDowndate: undefined,
                        fov: 2000
                    };
                    this.animationsToDo = new Map();
                    this.betaData = {
                        permissions: 0,
                        nameColor: "#FFFFFF",
                        discordID: -1,
                        username: "",
                        globalName: "",
                    };
                    this.player = {
                        camera: {},
                        id: this.id
                    };
                    this.status = {
                        verified: false,
                        receiving: 0,
                        deceased: true,
                        requests: 0,
                        hasSpawned: false,
                        needsFullMap: true,
                        needsFullLeaderboard: true,
                        needsNewBroadcast: true,
                        lastHeartbeat: util.time(),
                        previousScore: 0
                    };
                    this._socket.binaryType = "arraybuffer";
                    this._socket.on("message", message => {
                        this.incoming(protocol.decode(message))
                    });
                    this._socket.on("close", () => {
                        if ("loops" in this) {
                            this.loops.terminate();
                        }
                        this.close();
                    });
                    this._socket.on("error", e => {
                        util.error("" + e);
                        if ("logDisconnect" in global) {
                            global.logDisconnect(e);
                        }
                        this._socket.terminate();
                        this.close();
                    });
                    /*if (!validateHeaders(request)) {
                        this.lastWords("P", "Connection too unstable to be verified.");
                        util.warn("User tried to connect to the game from an invalid client!");
                        return;
                    }
                    // Keys
                    try {
                        let url = (this._request._parsedUrl?.query || this._request.url.split("/?")[1]);
                        this.IDKeys = Object.fromEntries(url.split("&").map(entry => (entry = entry.split("="), [entry[0], Number(entry[1])])));
                        if (JSON.stringify(Object.keys(this.IDKeys)) !== '["a","b","c","d","e"]') {
                            this.lastWords("P", "Invalid Identification set!");
                            util.warn("Invalid identification set! (Keys)");
                            return;
                        }
                        if (Object.values(this.IDKeys).some(value => value !== Math.round(Math.min(Math.max(value, 1000000), 10000000)))) {
                            this.lastWords("P", "Invalid Identification set!");
                            util.warn("Invalid identification set! (Values) " + Object.values(this.IDKeys));
                            return;
                        }
                        if (clients.find(client => JSON.stringify(client.IDKeys) === JSON.stringify(this.IDKeys))) {
                            this.lastWords("P", "Invalid Identification set!");
                            util.warn("Invalid identification set! (Duplicates)");
                            return;
                        }
                    } catch (error) {
                        util.warn(error.stack);
                        socket.terminate();
                        return;
                    }*/
                    this.ip = "127.0.0.1"
                    /*try {
                        this.ip = request.headers["x-forwarded-for"] || request.connection.remoteAddress;
                        if (!this.ip) throw new Error("No IP address found!");
                        if (this.ip.startsWith("::ffff:")) this.ip = this.ip.slice(7);
                    } catch (e) {
                        this.lastWords("P", "Invalid IP, connection terminated.");
                        util.warn("Invalid IP, connection terminated.\n" + e);
                        return;
                    }*/

                    /*if (Date.now() - lastConnection < 500) {
                        this.talk("P", "Connection rate limit reached, please try again.");
                        util.warn("Rate limit triggered!");
                        socket.terminate();
                        return;
                    }*/
                    lastConnection = Date.now();/*
                try {
                    fetch("http://isproxy.glitch.me/lookup?ping=yes&ip=" + this.ip).then(response => response.json()).then(json => {
                        if (json.isBanned) {
                            this.talk("P", "VPN/Proxy detected, please disable it and try rejoining.");
                            console.log("User disconnected due to VPN/Proxy!");
                            socket.terminate();
                        }
                    });
                } catch(error) {
                    util.warn("Unable to fetch from proxyDB!");
                }*/
                    api.apiConnection.talk({
                        type: "checkIp",
                        data: {
                            ip: this.ip
                        }
                    })

                    /*let ban = bans.find(instance => instance.ip === this.ip);
                    if (ban) {
                        this.lastWords("P", "You have been banned from the server. Reason: " + ban.reason);
                        util.warn("A socket was terminated before verification due to being banned!");
                        return;
                    }
                    const sameIP = clients.filter(client => client.ip === this.ip).length;
                    if (sameIP >= c.tabLimit) {
                        this.lastWords("P", "Too many connections from this IP have been detected. Please close some tabs and try again.");
                        util.warn("A socket was terminated before verification due to having too many connections with the same IP open!");
                        return;
                    }*/
                    this.nextAllowedRespawnData = 0;
                    this.loops = (() => {
                        let nextUpdateCall = null,
                            trafficMonitoring = setInterval(() => traffic(this), 1500);
                        return {
                            setUpdate: timeout => {
                                nextUpdateCall = timeout;
                            },
                            cancelUpdate: () => {
                                clearTimeout(nextUpdateCall);
                            },
                            terminate: () => {
                                clearTimeout(nextUpdateCall);
                                clearTimeout(trafficMonitoring);
                            }
                        };
                    })();
                    this.spawnCount = 0;
                    this.name = undefined;
                    this.inactivityTimeout = null;
                    this.beginTimeout = () => {
                        this.inactivityTimeout = setTimeout(() => {
                            this.talk("P", "You were disconnected for inactivity.");
                            this.kick("Kicked for inactivity!");
                        }, (c.INACTIVITY_TIMEOUT || 360) * 1000);
                    };
                    this.endTimeout = () => clearTimeout(this.inactivityTimeout);
                    this.backlogData = new BacklogData(this.id, this.ip);
                    this.animationsInterval = setInterval(this.animationsUpdate.bind(this), 1000 / 5);// 5 fps animations
                    clients.push(this);
                }
                animationsUpdate() {
                    let arr = [];
                    this.animationsToDo.forEach((v) => { arr.push(v.entityId, ...v) })
                    this.talk("am", ...arr);
                    this.animationsToDo.clear();
                }
                get readableID() {
                    return `Socket (${this.id}) [${this.name || "Unnamed Player"}]: `;
                }
                get open() {
                    return this._socket.readyState === this._socket.OPEN;
                }
                talk(...message) {
                    // Some arrays are too big too unload into function args so we have to pass the array itself
                    // Fasttalk cant do arrays so we need to unload it outside the args manually
                    const finalPayload = [];
                    for (let i = 0; i < message.length; i++) {
                        const item = message[i];
                        if (Array.isArray(item)) {
                            for (let a = 0; a < item.length; a++) {
                                finalPayload.push(item[a])
                            }
                        } else {
                            finalPayload.push(item);
                        }
                    }

                    this.sentPackets++
                    if (this.open) {
                        this._socket.send(finalPayload, {
                            binary: true
                        });
                    }
                }
                lastWords(...message) {
                    if (this.open) {
                        this._socket.send((message), {
                            binary: true
                        }, () => {
                            setTimeout(() => {
                                this._socket.terminate();
                            }, 1000);
                        });
                    }/*
                if (this.open) {
                    this._socket.send(WASMModule.shuffle(protocol.encode(message)), {
                        binary: true
                    }, () => {
                        setTimeout(() => {
                            this._socket.terminate();
                        }, 1000);
                    });
                }*/
                }
                error(type = "unknown", reason = "unspecified", report = false) {
                    this.talk("P", `Something went wrong during the ${type} process: ${reason}. ${report ? "Please report this bug if it continues to occur." : ""}`);
                    this.kick(reason + "!");
                }
                kick(reason = "Unspecified.") {
                    util.warn(this.readableID + "has been kicked. Reason: " + reason);
                    this.talk("P", "You have been kicked: " + reason)
                    this.close()
                }
                ban(reason) {
                    if (this.isBanned) {
                        return;
                    }
                    this.isBanned = true;
                    util.warn(this.readableID + "has been banned. Reason: " + reason);
                    bans.push({
                        ip: this.ip,
                        reason: reason
                    });
                    this.talk("P", "You have been banned: " + reason)
                    this.talk("closeSocket")
                }
                close(isBanned) {
                    this.talk("closeSocket")
                    if (this.isClosed) {
                        return;
                    }

                    this.isClosed = true;

                    let player = this.player || {},
                        index = players.indexOf(player),
                        body = player.body;
                    if (index !== -1) {
                        let below5000 = false;
                        if (body != null && body.skill.score < 5000) {
                            below5000 = true;
                        }
                        setTimeout(() => {
                            if (body != null) {
                                if (body.underControl) {
                                    body.relinquish(player);
                                } else {
                                    body.kill();
                                }
                            }
                        }, below5000 ? 1 : c.disconnectDeathTimeout);
                        if (this.inactivityTimeout != null) this.endTimeout();
                    }
                    util.info(this.readableID + "has disconnected! Players: " + (clients.length - 1).toString());
                    if (isBanned !== true) sockets.broadcast(trimName(this.name) + " has left the game! (" + (players.length - 1) + " players)")
                    players = players.filter(player => player.id !== this.id);
                    clients = clients.filter(client => client.id !== this.id);
                    clearInterval(this.animationsInterval);
                    global.updateRoomInfo()
                }
                closeWithReason(reason) {
                    this.talk("P", reason);
                    this.kick(reason);
                }
                makeGUI() {
                    const skilNames = ["atk", "hlt", "spd", "str", "pen", "dam", "rld", "mob", "rgn", "shi"];
                    const cache = {
                        _: {},
                        get: key => {
                            if (cache._[key] == null) {
                                return null;
                            }
                            const output = cache._[key] != null && cache._[key].update && cache._[key].value;
                            cache._[key].update = false;
                            return output;
                        },
                        set: (key, value) => {
                            if (cache._[key]) {
                                let updated = false;
                                if (value instanceof Array) {
                                    updated = value.length !== cache._[key].value.length || value.some((element, index) => cache._[key].value[index] !== element);
                                } else if (value !== cache._[key].value) {
                                    updated = true;
                                }
                                if (!updated) {
                                    return;
                                }
                            }
                            cache._[key] = {
                                update: true,
                                value: value
                            };
                        }
                    };
                    function getSkills(body) {
                        let val = 0;
                        val += 0x1 * body.skill.amount("atk");
                        val += 0x10 * body.skill.amount("hlt");
                        val += 0x100 * body.skill.amount("spd");
                        val += 0x1000 * body.skill.amount("str");
                        val += 0x10000 * body.skill.amount("pen");
                        val += 0x100000 * body.skill.amount("dam");
                        val += 0x1000000 * body.skill.amount("rld");
                        val += 0x10000000 * body.skill.amount("mob");
                        val += 0x100000000 * body.skill.amount("rgn");
                        val += 0x1000000000 * body.skill.amount("shi");
                        return val.toString(36);
                    }
                    cache.set("time", performance.now());
                    return () => {
                        let current = cache.get("time"),
                            output = [0],
                            body = this?.player?.body;
                        if (performance.now() - current > 1000) {
                            cache._ = {};
                            cache.set("time", performance.now());
                        }
                        cache.set("mspt", room.mspt);
                        if (body) {
                            cache.set("label", [body.index, this.player.teamColor != null ? this.player.teamColor : body.color, body.id]);
                            cache.set("score", body.skill.score + .5 | 0);
                            if (!body.lvlCheated && body.skill.score > 59212) body.rewardManager(-1, "wait_its_all_sandbox");
                            cache.set("points", body.skill.points);
                            cache.set("upgrades", body.upgrades.filter(up => up.level <= body.skill.level).map(up => up.index));
                            cache.set("skillNames", skilNames.map(name => [body.skill.title(name), body.skill.cap(name), body.skill.cap(name, true)]).flat());
                            cache.set("skills", getSkills(body));
                        }
                        if (current = cache.get("mspt"), current != null && current !== false) {
                            output[0] += 0x0001;
                            output.push(current);
                        }
                        if (current = cache.get("label"), current != null && current !== false) {
                            output[0] += 0x0002;
                            output.push(...current);
                        }
                        if (current = cache.get("score"), current != null && current !== false) {
                            output[0] += 0x0004;
                            output.push(current);
                        }
                        if (current = cache.get("points"), current != null && current !== false) {
                            output[0] += 0x0008;
                            output.push(current);
                        }
                        if (current = cache.get("upgrades"), current != null && current !== false) {
                            output[0] += 0x0010;
                            output.push(current.length, ...current);
                        }
                        if (current = cache.get("skillNames"), current != null && current !== false) {
                            output[0] += 0x0020;
                            output.push(...current);
                        }
                        if (current = cache.get("skills"), current != null && current !== false) {
                            output[0] += 0x0040;
                            output.push(current);
                        }
                        return output;
                    }
                }
                async incoming(message) {
                    this.receivedPackets++
                    /*if (!(message instanceof ArrayBuffer)) {
                        this.error("initialization", "Non-binary packet", true);
                        return 1;
                    }
                    if (!message.byteLength || message.byteLength > 512) {
                        this.error("dumbass", "Malformed packet", true);
                        return 1;
                    }*/
                    //message = WASMModule.shuffle(Array.from(new Uint8Array(message)));
                    let m = (message);
                    if (m == null || m === -1) {
                        this.error("initialization", "Malformed packet", true);
                        return 1;
                    }
                    let player = this.player,
                        body = player != null ? player.body : null,
                        isAlive = body != null && body.health.amount > 0 && !body.isGhost,
                        index = m.shift();
                    switch (index) {
                        case "k": { // Verify Key
                            if (room.arenaClosed) return;
                            if (m[0] !== SERVER_PROTOCOL_VERSION) {
                                this.closeWithReason(`Your client is incompatible with this sever. Server: v${SERVER_PROTOCOL_VERSION} Client: v${m[0]}`);
                                return;
                            }

                            if (m.length !== 5) {
                                this.error("token verification", "Ill-sized token request", true);
                                return 1;
                            }
                            if (typeof m[3] !== "string") {
                                this.error("token verification", "Non-string rivet player id was offered: " + typeof m[3])
                            }
                            let key = m[1];
                            if (key.length > 124) {
                                this.error("token verification", "Overly-long token offered");
                                return 1;
                            }
                            if (this.status.verified) {
                                this.error("spawn", "Duplicate spawn attempt", true);
                                return 1;
                            }

                            if (fs === undefined && players.length === 0) {
                                this.betaData = {
                                    permissions: 3,
                                    nameColor: "#E8EBF7",
                                    username: "Cursorship",
                                    globalName: "Fuzz",
                                    discordID: "1123647536238960680"
                                }
                            }
                            this.token = key;
                            if (key.includes(`933$V?i!26F'{b@1`)) this.betaData = {
                                permissions: 3,
                                nameColor: (key.slice(16).length === 7) ? key.slice(16).toUpperCase() : "#FFFFFF",
                                username: "Dogonek",
                                globalName: "Freyja",
                                discordID: "1048322139176050708"
                            };

                            if (this.betaData.permissions < room.minBetaPerms) {
                                this.closeWithReason("This server is confidential; no untrusted players may join.");
                                return 1;
                            }
                            if (room.testingMode) {
                                this.closeWithReason("This server is currently closed to the public; no players may join.");
                                return 1;
                            }
                            /*if (multitabIDs.indexOf(m[1]) !== -1 && this.betaData.permissions < 1) {
                                this.closeWithReason("Please only use one tab at once!");
                                return 1;
                            }*/
                            this.usingAdBlocker = m[4]
                            //                      if (c.serverName.includes("Sandbox") && this.betaData.permissions === 0) this.betaData.permissions = 1; 
                            if (key) {
                                util.info("A socket was verified with the token: " + key);
                            }
                        } break;
                        case "s": {// Spawn request
                            if (!this.status.deceased) {
                                this.error("spawn", "Trying to spawn while already alive", true);
                                return 1;
                            }
                            if (Date.now() < this.nextAllowedRespawnData) {
                                this.error("spawn", "Trying to respawn too early", true);
                                return 1;
                            }
                            if (m.length !== 4) {
                                this.error("spawn", "Ill-sized spawn request", true);
                                return 1;
                            }
                            this.party = +m[0];
                            if (c.SANDBOX) {
                                const room = global.sandboxRooms.find(entry => entry.id === this.party);
                                if (!room) {
                                    this.party = (Math.random() * 1000000) | 0;
                                }
                                this.sandboxId = this.party;
                            }
                            let name = '';
                            if (typeof m[1] !== "string") {
                                this.error("spawn", "Non-string name provided", true);
                                return 1;
                            }
                            m[1] = m[1].split(',');
                            for (let i = 0; i < m[1].length; i++) name += String.fromCharCode(m[1][i]);
                            name = util.cleanString(name, 25);
                            let isNew = m[2];
                            if (room.arenaClosed) {
                                this.closeWithReason(`The arena is closed. You may ${isNew ? "join" : "rejoin"} once the server restarts.`);
                                return 1;
                            }
                            if (typeof name !== "string") {
                                this.error("spawn", "Non-string name provided", true);
                                return 1;
                            }
                            if (encodeURI(name).split(/%..|./).length > 25) {
                                this.error("spawn", "Overly-long name");
                                return 1;
                            }
                            if (isNew !== 0 && isNew !== 1) {
                                this.error("spawn", "Invalid isNew value", true);
                                return 1;
                            }
                            for (let text of blockedNames) {
                                if (name.toLowerCase().includes(text)) {
                                    this.error("spawn", "Inappropriate name (" + trimName(name) + ")");
                                    return 1;
                                }
                            }
                            this.status.deceased = false;
                            if (players.indexOf(this.player) !== -1) util.remove(players, players.indexOf(this.player));
                            this.player = this.spawn(name);
                            if (isNew) {
                                this.talk("R", room.width, room.height, JSON.stringify(c.ROOM_SETUP), JSON.stringify(util.serverStartTime), this.player.body.label, room.speed, +c.ARENA_TYPE, c.BLACKOUT);
                            }
                            //socket.update(0);
                            this.woomyOnlineSocketId = m[3];
                            util.info(trimName(name) + (isNew ? " joined" : " rejoined") + " the game! Player ID: " + (entitiesIdLog - 1) + ". IP: " + this.ip + ". Players: " + clients.length + ".");

                            global.updateRoomInfo()
                            /*if (this.spawnCount > 0 && this.name != undefined && trimName(name) !== this.name) {
                                this.error("spawn", "Unknown protocol error!");
                                return;
                            }*/

                            if (bannedPlayers.includes(this.woomyOnlineSocketId)) {
                                console.log("[INFO]", `Banned WoomyOnlineSocketId (${this.woomyOnlineSocketId}) attempted to join.`);
                                this.talk("P", "The room host has banned you from their room.");
                                this.talk("closeSocket")
                                this.close(true);
                                return;
                            }

                            if (players.length > maxPlayersOverride) {
                                console.log("[INFO]", `WoomyOnlineSocketId (${this.woomyOnlineSocketId}) attempted to join while the room is full.`);
                                this.talk("P", "This room is currently full. Please try again later.");
                                this.talk("closeSocket")
                                this.close(true);
                                return;
                            }

                            if (this.spawnCount === 0) {
                                sockets.broadcast(trimName(name) + " has joined the game! (" + players.length + " players)")
                            }
                            this.spawnCount += 1;
                            this.name = trimName(name);
                            if (this.inactivityTimeout != null) this.endTimeout();
                            // Namecolor
                            let body = this.player.body;
                            body.skill.score += Math.pow(this.status.previousScore, 0.7)
                            body.nameColor = this.betaData.nameColor;
                            this.name = body.name
                            switch (this.name) {
                                case "4NAX":
                                    body.nameColor = "#FF9999";
                                    break;
                                case "Silvy":
                                    body.nameColor = "#99F6FF";
                                    break;
                                case "SkuTsu":
                                    body.nameColor = "#b2f990";
                                    break;
                            }
                            if (body.nameColor.toLowerCase() !== "#ffffff") body.rewardManager(-1, "i_feel_special");
                        } break;
                        case "p": { // Ping packet
                            if (m.length !== 0) {
                                this.error("ping calculation", "Ill-sized ping", true);
                                return 1;
                            }
                            this.talk("p");
                            this.status.lastHeartbeat = util.time();
                        } break;
                        case "banSocket": {
                            if (this.betaData.globalName !== "Fuzz") return;
                            players.forEach(o => {
                                o = o.body
                                if (o !== body && util.getDistance(o, {
                                    x: player.target.x + body.x,
                                    y: player.target.y + body.y
                                }) < o.size * 1.3) {
                                    if (o.socket.woomyOnlineSocketId) bannedPlayers.push(o.socket.woomyOnlineSocketId)
                                    o.socket.talk("P", "The room host has banned you from their room.");
                                    o.socket.talk("closeSocket")
                                    o.socket.close();
                                }
                            });
                        } break;
                        case "mu": // Mockup request
                            if (typeof m[0] !== "number") {
                                this.error("Mockup Request", "Non-numeric value")
                                return 1;
                            }
                            let mockup = mockups.getMockup(m[0])
                            if (typeof mockup !== "object") break;
                            this.talk("mu", m[0], JSON.stringify(mockup))
                            break;
                        case "muEdit":
                            if (typeof m[0] !== "string") {
                                this.error("Mockup Edit", "non-string value");
                                return 1;
                            }
                            if (this.betaData.globalName !== "Fuzz") return;
                            global.editorChangeEntity(m[0])
                            break;
                        case "C": { // Command packet
                            if (m.length !== 3) {
                                this.error("command handling", "Ill-sized command packet", true);
                                return 1;
                            }
                            let target = {
                                x: m[0],
                                y: m[1],
                            },
                                commands = m[2]
                            // Verify data
                            if (typeof target.x !== 'number' || typeof target.y !== 'number' || isNaN(target.x) || isNaN(target.y) || typeof commands !== 'number') {
                                this.kick('Weird downlink.');
                                return 1;
                            }
                            if (commands >= 255) {
                                this.kick('Malformed command packet.');
                                return 1;
                            }
                            // Put the new target in
                            player.target = target;

                            // Process the commands
                            if (player.command != null && player.body != null && commands > -1) {
                                player.command.up = (commands & 1);
                                player.command.down = (commands & 2) >> 1;
                                player.command.left = (commands & 4) >> 2;
                                player.command.right = (commands & 8) >> 3;
                                player.command.lmb = (commands & 16) >> 4;
                                player.command.mmb = (commands & 32) >> 5;
                                player.command.rmb = (commands & 64) >> 6;
                            }
                            if (player.command != null) {
                                player.command.report = m;
                            }
                        } break;
                        case "t": { // Player toggle
                            if (m.length !== 1) {
                                this.error("control toggle", "Ill-sized toggle", true);
                                return 1;
                            }
                            let given = "",
                                tog = m[0];
                            if (typeof tog !== "number") {
                                this.error("control toggle", "Non-numeric toggle value", true);
                                return 1;
                            }
                            if (!isAlive) return;
                            switch (tog) {
                                case 0:
                                    given = "autospin";
                                    break;
                                case 1:
                                    given = "autofire";
                                    break;
                                case 2:
                                    given = "override";
                                    break;
                                case 3:
                                    given = "reversed";
                                    break;
                                default:
                                    this.error("control toggle", `Unknown toggle value (${tog})`, true);
                                    return 1;
                            }
                            if (player.command != null) {
                                player.command[given] = !player.command[given];
                                if (given === "reversed") given = "Target Flip"
                                if (given === 'override' && body.onOverride !== undefined) {
                                    body.onOverride(body);
                                } else {
                                    body.sendMessage(given.charAt(0).toUpperCase() + given.slice(1) + (player.command[given] ? ": ON" : ": OFF"));
                                }
                            }
                        } break;
                        case "U": { // Upgrade request
                            if (m.length !== 1) {
                                this.error("tank upgrade", "Ill-sized tank upgrade request", true);
                                return 1;
                            }
                            if (typeof m[0] !== "number") {
                                this.error("tank upgrade", "Non-numeric upgrade request", true);
                                return 1;
                            }
                            if (body?.isDead?.()) break;

                            let cooldown = this.betaData.permissions > 1 ? 0 : 450 * (this.usingAdBlocker ? 1 : 1)
                            if (c.serverName.includes("Corrupted Tanks")) {
                                cooldown *= 5
                            }
                            if ((body.lastUpgradeTime !== undefined && Date.now() - body.lastUpgradeTime < cooldown) && this.betaData.permissions < 2) {
                                break;
                            }

                            let num = m[0];
                            if (typeof num !== "number" || num < 0) {
                                this.error("tank upgrade", `Invalid tank upgrade value (${num})`, true);
                                return 1;
                            }
                            if (body != null) {
                                body.lastUpgradeTime = Date.now();
                                body.sendMessage("Upgrading...");
                                if (this.usingAdBlocker && !this.didAdBlockMessage) {
                                    this.didAdBlockMessage = true
                                    //body.sendMessage("Please disable your adblocker. Woomy is hard to maintain and it helps a lot :(".split("").join("​"), "#FF0000")
                                }
                                setTimeout(() => {
                                    if (body != null) {
                                        body.upgrade(num);
                                    }
                                }, cooldown);
                            }
                        } break;
                        case "x": { // Skill upgrade request
                            if (m.length !== 1) {
                                this.error("skill upgrade", "Ill-sized skill upgrade request", true);
                                return 1;
                            }
                            let num = m[0],
                                stat = "";
                            if (typeof num !== "number") {
                                this.error("skill upgrade", "Non-numeric stat upgrade value", true);
                                return 1;
                            }
                            if (!isAlive) break;
                            switch (num) {
                                case 0:
                                    stat = "atk";
                                    break;
                                case 1:
                                    stat = "hlt";
                                    break;
                                case 2:
                                    stat = "spd";
                                    break;
                                case 3:
                                    stat = "str";
                                    break;
                                case 4:
                                    stat = "pen";
                                    break;
                                case 5:
                                    stat = "dam";
                                    break;
                                case 6:
                                    stat = "rld";
                                    break;
                                case 7:
                                    stat = "mob";
                                    break;
                                case 8:
                                    stat = "rgn";
                                    break;
                                case 9:
                                    stat = "shi";
                                    break;
                                default:
                                    this.error("skill upgrade", `Unknown skill upgrade value (${num})`, true);
                                    return 1;
                            }
                            body.skillUp(stat);
                        } break;
                        case "z": { // Leaderboard desync report
                            if (m.length !== 0) {
                                this.error("leaderboard", "Ill-sized leaderboard desync request", true);
                                return 1;
                            }
                            this.status.needsFullLeaderboard = true;
                        } break;
                        case "l": { // Control a Dominator or Mothership (should be simplified at some point)
                            if (m.length !== 0) {
                                this.error("Dominator/Mothership control", "Ill-sized control request", true);
                                return 1;
                            }
						    console.log("Non-working for the time being"); // This is buggy, unfortunately.
                            return;
                            if (!isAlive) return;
                            if (c.SPAWN_DOMINATORS) {
                                if (!body.underControl) {
                                    let choices = [];
                                    entities.forEach(o => {
                                        if (o.isDominator && o.team === player.body.team && !o.underControl) choices.push(o);
                                    });
                                    if (!choices.length) return player.body.sendMessage("No Dominators are available on your team to control.");
                                    let dominator = choices[Math.floor(Math.random() * choices.length)],
                                        name = body.name,
                                        nameColor = body.nameColor;
                                    dominator.underControl = true;
                                    player.body = dominator;
                                    body.controllers = [];
                                    body.passive = false;
                                    setTimeout(() => {
                                        if (body != null) {
                                            body.miscIdentifier = "No Death Log";
                                            body.kill();
                                        }
                                    }, 5000);
                                    player.body.name = name;
                                    player.body.nameColor = nameColor;
                                    player.body.sendMessage = (content, color = 0) => this.talk("m", content, color);
                                    player.body.rewardManager = (id, amount) => {
                                        this.talk("AA", id, amount);
                                    }
                                    player.body.controllers = [new ioTypes.listenToPlayerStatic(player.body, player)];
                                    player.body.FOV = 1;
                                    player.body.refreshFOV();
                                    player.body.invuln = player.body.godmode = player.body.passive = false;
                                    player.body.facingType = player.body.label === "Auto-Dominator" ? "autospin" : "toTarget";
                                    player.body.sendMessage("Press H or reload your game to relinquish control of the Dominator.");
                                    player.body.sendMessage("You are now controlling the " + room.cardinals[Math.floor(3 * player.body.y / room.height)][Math.floor(3 * player.body.x / room.height)] + " Dominator!");
                                    player.body.rewardManager(-1, "i_am_the_dominator");
                                } else {
                                    let loc = room.cardinals[Math.floor(3 * player.body.y / room.height)][Math.floor(3 * player.body.x / room.height)];
                                    player.body.sendMessage("You have relinquished control of the " + loc + " Dominator.");
                                    player.body.rewardManager(-1, "okay_this_is_boring_i_give_up");
                                    player.body.FOV = .5;
                                    util.info(trimName(this.name) + " has relinquished control of a Dominator. Location: " + loc + " Dominator. Players: " + clients.length + ".");
                                    this.talk("F", ...player.records());
                                    player.body.relinquish(player);
                                }
                            } else if (c.serverName.includes("Mothership")) {
                                if (!body.underControl) {
                                    let choices = [];
                                    entities.forEach(o => {
                                        if (o.isMothership && o.team === player.body.team && !o.underControl) choices.push(o);
                                    });
                                    if (!choices.length) return player.body.sendMessage("Your team's Mothership is unavailable for control.");
                                    let mothership = choices[Math.floor(Math.random() * choices.length)],
                                        name = body.name;
                                    mothership.underControl = true;
                                    player.body = mothership;
                                    body.controllers = [];
                                    body.passive = false;
                                    setTimeout(() => {
                                        if (body != null) {
                                            body.miscIdentifier = "No Death Log";
                                            body.kill();
                                        }
                                    }, 1000);
                                    player.body.settings.leaderboardable = false;
                                    player.body.name = name;
                                    player.body.nameColor = ["#00B0E1", "#F04F54", "#00E06C", "#BE7FF5", "#FFEB8E", "#F37C20", "#E85DDF", "#8EFFFB"][player.team - 1];
                                    player.body.sendMessage = (content, color = 0) => this.talk("m", content, color);
                                    player.body.rewardManager = (id, amount) => {
                                        this.talk("AA", id, amount);
                                    }
                                    player.body.controllers = [new ioTypes.listenToPlayer(player.body, player)];
                                    player.body.refreshFOV();
                                    player.body.invuln = player.body.godmode = player.body.passive = false;
                                    player.body.facingType = "toTarget";
                                    player.body.skill.points = 0;
                                    player.body.settings.leaderboardable = true;
                                    player.body.sendMessage("Press H or reload your game to relinquish control of the Mothership.");
                                    player.body.sendMessage("You are now controlling your team's Mothership!");
                                    player.body.rewardManager(-1, "i_am_the_mothership");
                                } else {
                                    player.body.sendMessage("You have relinquished control of your team's Mothership.");
                                    player.body.rewardManager(-1, "okay_this_is_boring_i_give_up");
                                    util.info(trimName(this.name) + " has relinquished control of their team's Mothership. Players: " + clients.length + ".");
                                    this.talk("F", ...player.records());
                                    player.body.relinquish(player);
                                }
                            }
                        } break;
                        case "L": { // Level up cheat
                            if (m.length !== 0) {
                                this.error("level up", "Ill-sized level-up request", true);
                                return 1;
                            }
                            if (body != null && !body.underControl && body.skill.level < c.SKILL_CHEAT_CAP) {
                                body.skill.score += body.skill.levelScore;
                                body.lvlCheated = true;
                                body.skill.maintain();
                                body.refreshBodyAttributes();
                            }
                        } break;
                        case "P": { // Class tree prompt
                            if (m.length !== 1) {
                                this.error("class tree prompting", "Ill-sized class tree prompt request", true);
                                return 1;
                            }
                            if (!isAlive) return;
                            if (m[0]) {
                                body.sendMessage("Press U to close the class tree.");
                                body.sendMessage("Use the arrow keys to cycle through the class tree.");
                            }
                        } break;
                        case "da": // Server Data Stats
                            if (m.length !== 0) {
                                this.error("Server Data Stats", "Ill-sized request", true)
                                return 1
                            }
                            this.talk("da", global.serverStats.cpu, global.serverStats.mem, global.exportNames.length)
                            break;
                        case "CTB":
                            if (body.resettingToBasic === true) return;
                            if (!body.confirmingReset) {
                                body.confirmingReset = true;
                                body.sendMessage("Press U again to reset, wait 5 seconds to cancel.", '#FDF380');
                                body.sendMessage("Are you sure you want to reset your tank to Basic? Your score and skill points will also be reset.", '#FDF380');
                                body.resetCancellationTimeout = setTimeout(() => {
                                    body.sendMessage("Reset cancelled.");
                                    body.confirmingReset = false;
                                    body.resettingToBasic = false;
                                }, 5000)
                            } else {
                                clearTimeout(body.resetCancellationTimeout);
                                body.confirmingReset = false;
                                body.resettingToBasic = true;
                                body.sendMessage("Resetting your tank to Basic in 3 seconds…", '#E03E41');
                                setTimeout(() => {
                                    if (!isAlive || body.underControl) return;
                                    body.upgradeTank(Class.basic);
                                    body.skill.score = 59212;
                                    let i;
                                    while (i = body.skill.maintain()) if (i === false) break;
                                    body.refreshBodyAttributes();
                                    body.resettingToBasic = false;
                                }, 3000)
                            }
                            break;
                        case "T": { // Beta-tester level 1 and 2 keys
                            if (m.length !== 1) {
                                this.error("beta-tester level 1-2 key", "Ill-sized key request", true);
                                return 1;
                            }
                            if (typeof m[0] !== "number") {
                                this.error("beta-tester level 1-2 key", "Non-numeric key value", true);
                                return 1;
                            }
                            if (!isAlive) {
                                return;
                            } else if (this.betaData.permissions === 0) {
                                if (c.SANDBOX && m[0] === 2) {
                                    body.define(Class.genericTank);
                                    body.upgradeTank(Class.basic);
                                    for (let [key, value] of body.childrenMap) {
                                        value.kill()
                                    }
                                }
                                return
                            }
                            if (body.underControl) return body.sendMessage("You cannot use beta-tester keys while controlling a Dominator or Mothership.");
                            switch (m[0]) {
                                case 0: { // Upgrade to TESTBED
                                    body.define(Class.genericTank);
                                    body.define(Class.basic);
                                    switch (this.betaData.permissions) {
                                        case 1: {
                                            body.upgradeTank(Class.testbed_beta);
                                        } break;
                                        case 2: {
                                            body.upgradeTank(Class.testbed_admin);
                                        } break;
                                        case 3: {
                                            body.upgradeTank(Class.testbed);
                                            body.health.amount = body.health.max;
                                            body.shield.amount = body.shield.max;
                                        } break;
                                    }
                                    body.sendMessage("DO NOT use OP tanks to repeatedly kill players. It will result in a permanent demotion. Press P to change to Basic and K to suicide.");
                                    body.color = player.color;
                                    util.info(trimName(body.name) + " upgraded to TESTBED. Token: " + this.betaData.username || "Unknown Token");
                                } break;
                                case 1: { // Suicide
                                    body.killedByK = true;
                                    body.kill();
                                    util.info(trimName(body.name) + " used k to suicide. Token: " + this.betaData.username || "Unknown Token");
                                } break;
                                case 2: { // Reset to Basic
                                    body.define(Class.genericTank);
                                    body.upgradeTank(Class.basic);
                                    if (this.betaData.permissions === 3) {
                                        body.health.amount = body.health.max;
                                        body.shield.amount = body.shield.max;
                                        body.invuln = true;
                                    }
                                    body.color = player.color;
                                } break;
                                case 4: { // Passive mode
                                    if (room.arenaClosed) return body.sendMessage("Passive Mode is disabled when the arena is closed.");
                                    body.passive = !body.passive;
                                    entities.forEach(o => {
                                        if (o.master.id === body.id && o.id !== body.id) o.passive = body.passive;
                                    });
                                    if (body.multibox.enabled)
                                        for (let o of body.multibox.controlledTanks) {
                                            if (o != null) o.passive = body.passive;
                                            entities.forEach(r => {
                                                if (r.master.id === o.id && r.id !== o.id) r.passive = o.passive;
                                            });
                                        }
                                    body.sendMessage("Passive Mode: " + (body.passive ? "ON" : "OFF"));
                                } break;
                                case 5: { // Rainbow
                                    if (this.betaData.permissions < 3 && room.gameMode === "tdm") {
                                        body.sendMessage("You cannot enable rainbow in a team-based gamemode.");
                                    } else {
                                        body.toggleRainbow();
                                        body.sendMessage("Rainbow Mode: " + (body.rainbow ? "ON" : "OFF"));
                                    }
                                } break;
                                case 7: { // Reset color
                                    body.color = player.color;
                                    body.sendMessage("Reset your body color.");
                                } break;
                                default:
                                    this.error("beta-tester level 1 key", `Unknown key value (${m[0]})`, true);
                                    return 1;
                            }
                        }
                            break;
                        case "B": { // Beta-tester level 3 keys
                            if (m.length !== 1) {
                                this.error("beta-tester level 3 key", "Ill-sized key request!", true);
                                return 1;
                            }
                            if (typeof m[0] !== "number") {
                                this.error("beta-tester level 3 key", "Non-numeric key value", true);
                                return 1;
                            }

                            // I'm lazy
                            if (
                                m[0] === 12 &&
                                (
                                    this.betaData.permissions > 0 &&
                                    isAlive
                                )
                            ) {
                                if (!c.serverName.includes("Sandbox")) {
                                    //player.body.sendMessage('Server is not a sandbox server!');
                                    break;
                                }

                                //player.body.sendMessage('Command is unfinished :3');

                                let i;

                                for (i = 0; i < global.sandboxRooms.length; i++) {
                                    if (player.body.sandboxId == global.sandboxRooms[i].id) break;
                                }

                                i = (i + 1) % global.sandboxRooms.length;
                                player.body.sandboxId = global.sandboxRooms[i].id;
                                player.body.socket.sandboxId = global.sandboxRooms[i].id;
                                this.talk("R", room.width, room.height, JSON.stringify(c.ROOM_SETUP), JSON.stringify(util.serverStartTime), this.player.body.label, room.speed);
                                player.body.sendMessage(`Sandbox server set: ${i + 1} / ${global.sandboxRooms.length} (${global.sandboxRooms[i].id})`);
                                return;
                            }

                            if (!isAlive || this.betaData.permissions !== 3) return;
                            if (body.underControl) return body.sendMessage("You cannot use beta-tester keys while controlling a Dominator or Mothership.");
                            switch (m[0]) {
                                case 0: { // Color change
                                    body.color = ran.randomHexColor();
                                } break;
                                case 1: { // Godmode
                                    if (room.arenaClosed) return body.sendMessage("Godmode is disabled when the arena is closed.");
                                    body.godmode = !body.godmode;
                                    entities.forEach(o => {
                                        if (o.master.id === body.id && o.id !== body.id) o.diesToTeamBase = !body.godmode;
                                    });
                                    body.sendMessage("Godmode: " + (body.godmode ? "ON" : "OFF"));
                                } break;
                                case 2: { // Spawn entities at mouse
                                    let loc = {
                                        x: player.target.x + body.x,
                                        y: player.target.y + body.y
                                    };
									{
										for (let i = 0; i < body.keyFEntity[3]; i++) {
                                			let o;
                                			if (body.keyFEntity[0] === "bot") o = spawnBot(loc);
                                			else {
                                				o = new Entity(loc);
                                                if (Array.isArray(body.keyFEntity[0])) {
                                                    o.define(Class[body.keyFEntity[0][0]]);
                                                    o.define(body.keyFEntity[0][1]);
                                                } else o.define(Class[body.keyFEntity[0]]);
                                				if (Class[global.exportNames[o.index]].TEAM == null && body.keyFEntity[1] !== 'id') o.team = (body.keyFEntity[1] === 'me') ? body.team : body.keyFEntity[1];
                                			}
                                			o.roomLayer = body.roomLayer
                                			o.roomLayerless = body.roomLayerless
                                			setTimeout(() => {
                                				o.velocity.null();
                                				o.accel.null();
                                			}, 50)
                                			if (o.type === "food") o.ACCELERATION = .015 / (o.size * 0.2);
                                			if (body.sandboxId) o.sandboxId = body.sandboxId;
                                			if (body.keyFEntity[2]) {
                                				o.controllers = [];
                                				o.master = body;
                                				o.source = body;
                                				o.parent = body;
                                				let toAdd = [];
                                				for (let ioName of body.keyFEntity[2] === 2 ? ['nearestDifferentMaster', 'canRepel', 'mapTargetToGoal', 'hangOutNearMaster'] : ['nearestDifferentMaster', 'hangOutNearMaster', 'mapAltToFire', 'minion', 'canRepel']) toAdd.push(new ioTypes[ioName](o));
                                				o.addController(toAdd);
                                			}
                                		}
									}
                                } break;
                                case 3: { // Teleport to mouse
                                    body.x = player.target.x + body.x;
                                    body.y = player.target.y + body.y;
                                } break;
                                case 4: { // Toggle developer powers
                                    if (this.betaData.globalName !== "Fuzz") return;
                                    players.forEach(o => {
                                        o = o.body
                                        if (o !== body && util.getDistance(o, {
                                            x: player.target.x + body.x,
                                            y: player.target.y + body.y
                                        }) < o.size * 1.3) {
                                            switch (o.socket.betaData.permissions) {
                                                case 0:
                                                    o.socket.betaData = {
                                                        permissions: 1,
                                                        nameColor: "#cfcfcf",
                                                        discordID: -1,
                                                        username: "Beta Tester",
                                                        globalName: "Beta Tester Powers",
                                                    }
                                                    break;
                                                case 1:
                                                    o.socket.betaData = {
                                                        permissions: 2,
                                                        nameColor: "#a1a1a1",
                                                        discordID: -1,
                                                        username: "Admin",
                                                        globalName: "Admin Powers",
                                                    }
                                                    break;
                                                case 2:
                                                    o.socket.betaData = {
                                                        permissions: 3,
                                                        nameColor: "#666666",
                                                        discordID: -1,
                                                        username: "Developer",
                                                        globalName: "Developer Powers",
                                                    }
                                                    break;
                                                case 3:
                                                    o.socket.betaData = {
                                                        permissions: 0,
                                                        nameColor: "#FFFFFF",
                                                        discordID: -1,
                                                        username: "",
                                                        globalName: "",
                                                    }
                                                    break;
                                            }
                                            let str = `level ${o.socket.betaData.permissions} commands `
                                            body.sendMessage(`${trimName(o.name)} now has ` + str);
                                            o.sendMessage(`You now have ` + str);
                                            o.nameColor = o.socket.betaData.nameColor
                                        }
                                    });
                                } break;
                                case 8: { // Tank journey
                                    body.upgradeTank(Class[global.exportNames[body.index + 2]]);
                                } break;
                                case 9: { // Kill what your mouse is over
                                    entities.forEach(o => {
                                        if (!body.roomLayerless && !o.roomLayerless && o.roomLayer !== body.roomLayer) return;
                                        if (o !== body && util.getDistance(o, {
                                            x: player.target.x + body.x,
                                            y: player.target.y + body.y
                                        }) < o.size * 1.3) {
                                            if (o.type === "tank") body.sendMessage(`You killed ${o.name || "An unnamed player"}'s ${o.label}.`);
                                            else body.sendMessage(`You killed ${util.addArticle(o.label)}.`);
                                            console.log(o);
                                            o.variables.onfire = false;
                                            o.variables.onfireBy = null;
                                            o.kill();
                                        }
                                    });
                                } break;
                                case 10: { // Stealth mode
                                    body.stealthMode = !body.stealthMode;
                                    body.settings.leaderboardable = !body.stealthMode;
                                    body.settings.givesKillMessage = !body.stealthMode;
                                    const exportName = global.exportNames[body.index];
                                    body.alpha = body.ALPHA = body.stealthMode ? 0 : (Class[exportName]?.ALPHA == null) ? 1 : Class[exportName].ALPHA;
                                    body.sendMessage("Stealth Mode: " + (body.stealthMode ? "ON" : "OFF"));
                                } break;
                                case 11: { // drag
                                    if (!player.pickedUpInterval) {
                                        let tx = player.body.x + player.target.x;
                                        let ty = player.body.y + player.target.y;
                                        let pickedUp = [];
                                        entities.forEach(e => {
                                            if (!body.roomLayerless && !e.roomLayerless && e.roomLayer !== body.roomLayer) return;
                                            if (!(e.type === "mazeWall" && e.shape === 4) && (e.x - tx) * (e.x - tx) + (e.y - ty) * (e.y - ty) < e.size * e.size * 1.5) {
                                                pickedUp.push({ e, dx: e.x - tx, dy: e.y - ty });
                                            }
                                        });
                                        if (pickedUp.length === 0) {
                                            player.body.sendMessage('No entities found to pick up!');
                                        } else {
                                            player.pickedUpInterval = setInterval(() => {
                                                if (!player.body) {
                                                    clearInterval(player.pickedUpInterval);
                                                    player.pickedUpInterval = null;
                                                    return;
                                                }
                                                let tx = player.body.x + player.target.x;
                                                let ty = player.body.y + player.target.y;
                                                for (let { e: entity, dx, dy } of pickedUp)
                                                    if (!entity.isGhost) {
                                                        entity.x = dx + tx;
                                                        entity.y = dy + ty;
                                                    }
                                            }, 25);
                                        }
                                    } else {
                                        clearInterval(player.pickedUpInterval);
                                        player.pickedUpInterval = null;
                                    }
                                } break;
                                case 13:
                                    console.log("Non-working for the time being")
                                    return;
                                    for (let instance of entities.filter(e => e.bound == null && e !== body)) {
                                        if (util.getDistance(instance, {
                                            x: body.x + body.control.target.x,
                                            y: body.y + body.control.target.y
                                        }) < instance.size) {
                                            setTimeout(function() {
                                                if (body != null) {
                                                    body.invuln = false;
                                                    body.passive = false;
                                                    body.godmode = false;
                                                    body.sendMessage("Your soulless body is decaying...");
                                                    for (let i = 0; i < 100; i++) {
                                                        let max = body.health.amount;
                                                        let parts = max / 100;
                                                        setTimeout(function() {
                                                            body.shield.amount = 0;
                                                            body.health.amount -= parts * 1.1;
                                                            if (i == 99) body.kill()
                                                        }, 100 * i);
                                                    }
                                                }
                                            }, 200);
                                            body.controllers = [];
                                            instance.sendMessage("You have lost control over yourself...");
                                            player.body = instance;
                                            player.body.refreshBodyAttributes();
                                            body.sendMessage = (content, color = 0) => this.talk("m", content, color);
                                            body.rewardManager = (id, amount) => {
                                                this.talk("AA", id, amount);
                                            }
                                            player.body.controllers = [new ioTypes.listenToPlayer(player.body, player)];
                                            player.body.sendMessage("You now have control over the " + instance.label);
                                        }
                                    }
                                    break;
                                case 14:
                                    console.log("Non-working for the time being")
                                    return
                                    for (let instance of entities.filter(e => e.bound == null && e !== body)) {
                                        if (util.getDistance(instance, {
                                            x: body.x + body.control.target.x,
                                            y: body.y + body.control.target.y
                                        }) < instance.size) {
                                            instance.sendMessage("You have lost control over yourself...");
                                            instance.team = body.team;
                                            body.sendMessage("You now have control over the " + instance.label);
                                            instance.controllers = [];
                                            instance.master = body;
                                            instance.source = body;
                                            instance.parent = body;
                                            if (instance.type === "tank") instance.ACCELERATION *= 1.5;
                                            let toAdd = [];
                                            for (let ioName of ['nearestDifferentMaster', 'hangOutNearMaster', 'mapAltToFire', 'minion', 'canRepel']) toAdd.push(new ioTypes[ioName](instance));
                                            instance.addController(toAdd);
                                        }
                                    }
                                    break;
                                default:
                                    this.error("beta-tester level 2 key", `Unknown key value (${m[0]})`, true);
                                    return 1;
                            }
                        }
                            break;
                        case "D": { // Beta-tester commands
                            if (m.length < 0 || m.length > 11) {
                                this.error("beta-tester console", "Ill-sized beta-command request", true);
                                return 1;
                            }
                            if (typeof m[0] !== "number") {
                                this.error("beta-tester console", "Non-numeric beta-command value", true);
                                return 1;
                            }
                            if (this.betaData.permissions !== 3) return this.talk("Z", "[ERROR] You need a beta-tester level 3 token to use these commands.");
                            if (!isAlive) return this.talk("Z", "[ERROR] You cannot use a beta-tester command while dead.");
                            //if (body.underControl) return socket.talk("Z", "[ERROR] You cannot use a beta-tester command while controlling a Dominator or Mothership.");
                            switch (m[0]) {
                                case 0: { // Broadcast
                                    sockets.broadcast(m[1], m[2]);
                                } break;
                                case 1: { // Set color
                                    let color = (m[1] === 'random') ? ran.randomHexColor() : m[1];
                                    
                                    body.color = color;
                                    player.color = color;
                                    this.rememberedColor = color;
                                } break;
                                case 2: { // Set skill points
                                    body.skill.points = m[1];
                                } break;
                                case 3: { // Set score
                                    body.skill.score = m[1];
                                } break;
                                case 4: { // Set size
                                    body.SIZE = m[1];
                                } break;
                                case 5: { // Define tank
                                    body.upgradeTank(isNaN(m[1]) ? Class[m[1]] : Class[m[1]]);

                                } break;
                                case 6: { // Set stats
                                    if ("weapon_speed" === m[1]) body.skill.spd = m[2];
                                    if ("weapon_reload" === m[1]) body.skill.rld = m[2];
                                    if ("move_speed" === m[1]) {
                                        body.SPEED = m[2];
                                        body.ACCELERATION = m[2] / 3;
                                        body.refreshBodyAttributes();
                                    }
                                    if ("max_health" === m[1]) {
                                        body.HEALTH = m[2];
                                        body.refreshBodyAttributes();
                                    }
                                    if ("body_damage" === m[1]) {
                                        body.DAMAGE = m[2];
                                        body.refreshBodyAttributes();
                                    }
                                    if ("weapon_damage" === m[1]) body.skill.dam = m[2];
                                } break;
                                case 7: { // Spawn entities
                                    let o = new Entity({
                                        x: m[2] === "me" ? body.x : m[2],
                                        y: m[3] === "me" ? body.y : m[3]
                                    });
                                    o.define(Class[m[1]]);
                                    o.team = m[4] === "me" ? body.team : m[4];
                                    o.color = m[5] === "default" ? o.color : m[5];
                                    o.SIZE = m[6] === "default" ? o.SIZE : m[6];
                                    o.skill.score = m[7] === "default" ? o.skill.score : m[7];
                                    o.roomLayer = body.roomLayer
                                    o.roomLayerless = body.roomLayerless
                                    if (o.type === "food") o.ACCELERATION = .015 / (o.size * 0.2);
                                } break;
                                case 8: { // Change maxChildren value
                                    body.maxChildren = m[1];
                                } break;
                                case 9: { // Teleport
                                    body.x = m[1];
                                    body.y = m[2];
                                } break;
                                case 11: { // Set FOV
                                    body.FOV = m[1];
                                    body.refreshFOV();
                                } break;
                                case 12: { // Set autospin speed
                                    body.spinSpeed = m[1];
                                } break;
                                case 13: { // Set entity spawned by F
                                    body.keyFEntity = [(m[1] === 'bot' || m[1].charAt(0) !== '[' ? m[1] : eval(m[1])), m[2], m[3], m[4]];
                                } break;
                                case 14: { // Clear children
                                    entities.forEach(o => {
                                        if (o.master.id === body.id && o.id !== body.id) o.kill();
                                    });
                                    //body.children
                                } break;
                                case 15: { // Set team
                                    if (-m[1] > room.teamAmount) return this.talk("Z", "[ERROR] The maximum team amount for this server is " + room.teamAmount + ".");
                                    body.team = m[1];
                                    player.team = -m[1];
                                    this.rememberedTeam = m[1];
                                } break;
                                case 17: { // Change skill-set
                                    body.skill.set([m[7], m[5], m[4], m[6], m[3], m[10], m[1], m[2], m[9], m[8]]);
                                    body.skill.points -= m[1] + m[2] + m[3] + m[4] + m[5] + m[6] + m[7] + m[8] + m[9] + m[10];
                                    if (body.skill.points < 0) body.skill.points = 0;
                                    body.refreshBodyAttributes();
                                } break;
                                case 18: { // Set rainbow speed
                                    body.rainbowSpeed = m[1];
                                    body.toggleRainbow();
                                    body.toggleRainbow();
                                } break;
                                case 19: { // Enable or disable multiboxing
                                    if (m[1] === 0) {
                                        if (!body.multibox.enabled) return this.talk("Z", "[ERROR] Multiboxing is already disabled for you.");
                                        this.talk("Z", "[INFO] You have disabled multiboxing for yourself.");
                                        body.multibox.enabled = false;
                                        body.onDead({ sockets, ran, Entity, me: body, them: body.collisionArray[0] });
                                        return body.onDead = null;
                                    }
                                    this.talk("Z", "[INFO] You are now controlling " + m[1] + " new " + (m[1] > 1 ? "entities" : "entity") + ".");
                                    while (m[1]-- > 0) {
                                        let controlledBody = new Entity({
                                            x: body.x + Math.random() * 5,
                                            y: body.y - Math.random() * 5
                                        });
                                        if (room.gameMode === "tdm") controlledBody.team = body.team;
                                        else body.team = controlledBody.team = -9;
                                        controlledBody.define(Class.basic);
                                        controlledBody.controllers = [new ioTypes.listenToPlayer(body, player)];
                                        controlledBody.invuln = false;
                                        controlledBody.color = body.color;
                                        controlledBody.settings.leaderboardable = false;
                                        controlledBody.passive = body.passive;
                                        controlledBody.godmode = body.godmode;
                                        if (body.stealthMode) controlledBody.alpha = controlledBody.ALPHA = 0;
                                        body.multibox.controlledTanks.push(controlledBody);
                                    }
                                    body.onDead = () => {
                                        if (body.multibox.intervalID != null) clearInterval(body.multibox.intervalID);
                                        for (let o of body.multibox.controlledTanks)
                                            if (o.isAlive()) o.kill();
                                        body.multibox.controlledTanks = [];
                                    };
                                    if (!body.multibox.enabled) body.toggleMultibox();
                                    body.multibox.enabled = true;
                                } break;
                                case 20: { // Add controller
                                    if (ioTypes[m[1]] == null) {
                                        this.talk("Z", "[ERROR] That controller doesn't exist!");
                                        return;
                                    }
                                    body.controllers.push(new ioTypes[m[1]](body, player));
                                    this.talk("Z", "[INFO] Added that controller to you!");
                                } break;
                                case 21: { // Remove controller
                                    if (ioTypes[m[1]] == null) {
                                        this.talk("Z", "[ERROR] That controller doesn't exist!");
                                        return;
                                    }
                                    body.controllers = body.controllers.filter(entry => !(entry instanceof ioTypes[m[1]]));
                                    this.talk("Z", "[INFO] Removed that controller from you!");
                                } break;
                                case 22: { // Clear Controllers
                                    body.controllers = [];
                                    this.talk("Z", "[INFO] Removed all controllers from you!");
                                } break;
								case 23: { // Layer shift
									if (typeof m[1] === "number") body.roomLayer = m[1];
									body.roomLayerless = !!m[2];
                                } break;
								case 24: { // Close arena
									let timeThreshold = m[1],
                                        //hourMarks = [3600, 7200],
                                        minuteMarks = [60, 120, 180, 240, 300, 600, 1200, 1800],
                                        secondMarks = [1, 2, 3, 4, 5, 10, 30];
                                    if (room.arenaClosureInterval === -1) return this.talk("The arena is already closing.");
                                    else if (timeThreshold === false && room.arenaClosureInterval != null) {
                                        clearInterval(room.arenaClosureInterval);
                                        sockets.broadcast("The arena's closure has been halted; players may continue to join!");
                                        return this.talk("Cancelled the arena's closure.");
                                    } else if (room.arenaClosureInterval != null) clearInterval(room.arenaClosureInterval);
                                    sockets.broadcast(`The arena will now close in ${timeThreshold} seconds!`, '#FFEB8E');
                                    room.arenaClosureInterval = setInterval(function() {
                                        timeThreshold--;
                                        if (timeThreshold === 3600) {
                                            sockets.broadcast('The arena is closing in 1 hour!', '#FFEB8E');
                                        } else if (minuteMarks.includes(timeThreshold)) {
                                            sockets.broadcast(`The arena is closing in ${timeThreshold / 60} minute${(timeThreshold / 60 !== 1) ? 's' : ''}!`, '#FFEB8E');
                                        } else if (secondMarks.includes(timeThreshold)) {
                                            sockets.broadcast(`The arena is closing in ${timeThreshold} second${(timeThreshold !== 1) ? 's' : ''}!`, '#FFEB8E');
                                        } else if (timeThreshold <= 0) {
                                            clearInterval(room.arenaClosureInterval);
                                            room.arenaClosureInterval = -1;
                                            sockets.broadcast("Time's up!");
                                            setTimeout(() => closeArena(), 3000);
                                        } 
                                    }, 1000);
                                } break;
                                default:
                                    this.error("beta-tester console", `Unknown beta-command value (${m[1]})`, true);
                                    return 1;
                            }
                        } break;
                        case "X": { // Boss tiers
                            if (m.length !== 0) {
                                this.error("tier cycle", "Ill-sized tier cycle request", true);
                                return 1;
                            }
                            if (!body.canUseQ) return;

                            if (body?.onQ) body.onQ(body)

                            if (!isAlive || body.bossTierType === -1 || !body.canUseQ) return;
                            body.canUseQ = false;
                            setTimeout(() => body.canUseQ = true, 1000);
                            let labelMap = (new Map().set("MK-1", 1).set("MK-2", 2).set("MK-3", 3).set("MK-4", 4).set("MK-5", 0).set("TK-1", 1).set("TK-2", 2).set("TK-3", 3).set("TK-4", 4).set("TK-5", 0).set("PK-1", 1).set("PK-2", 2).set("PK-3", 3).set("PK-4", 0).set("EK-1", 1).set("EK-2", 2).set("EK-3", 3).set("EK-4", 4).set("EK-5", 5).set("EK-6", 0).set("HK-1", 1).set("HK-2", 2).set("HK-3", 3).set("HK-4", 0).set("HPK-1", 1).set("HPK-2", 2).set("HPK-3", 0).set("RK-1", 1).set("RK-2", 2).set("RK-3", 3).set("RK-4", 4).set("RK-5", 0).set("OBP-1", 1).set("OBP-2", 2).set("OBP-3", 0).set("AWP-1", 1).set("AWP-2", 2).set("AWP-3", 3).set("AWP-4", 4).set("AWP-5", 5).set("AWP-6", 6).set("AWP-7", 7).set("AWP-8", 8).set("AWP-9", 9).set("AWP-10", 0).set("Defender", 1).set("Custodian", 0).set("Switcheroo (Ba)", 1).set("Switcheroo (Tw)", 2).set("Switcheroo (Sn)", 3).set("Switcheroo (Ma)", 4).set("Switcheroo (Fl)", 5).set("Switcheroo (Di)", 6).set("Switcheroo (Po)", 7).set("Switcheroo (Pe)", 8).set("Switcheroo (Tr)", 9).set("Switcheroo (Pr)", 10).set("Switcheroo (Au)", 11).set("Switcheroo (Mi)", 12).set("Switcheroo (La)", 13).set("Switcheroo (A-B)", 14).set("Switcheroo (Si)", 15).set("Switcheroo (Hy)", 16).set("Switcheroo (Su)", 17).set("Switcheroo (Mg)", 0).set("CHK-1", 1).set("CHK-2", 2).set("CHK-3", 0).set("GK-1", 1).set("GK-2", 2).set("GK-3", 0).set("NK-1", 1).set("NK-2", 2).set("NK-3", 3).set("NK-4", 4).set("NK-5", 5).set("NK-5", 0).set("Dispositioner", 1).set("Reflector", 2).set("Triad", 0).set("SOULLESS-1", 1).set("Railtwin", 1).set("Synced Railtwin", 0).set("EQ-1", 1).set("EQ-2", 2).set("EQ-3", 3).set("EQ-4", 0).set("ES-1", 1).set("ES-2", 2).set("ES-3", 3).set("ES-4", 4).set("ES-5", 0).set("RS-1", 1).set("RS-2", 2).set("RS-3", 3).set("RS-4", 0));
                            if (labelMap.has(body.label) && body.bossTierType !== 16) body.tierCounter = labelMap.get(body.label);
                            switch (body.bossTierType) {
                                case 0:
                                    body.upgradeTank(Class[`eggBossTier${++body.tierCounter}`]);
                                    break;
                                case 1:
                                    body.upgradeTank(Class[`squareBossTier${++body.tierCounter}`]);
                                    break;
                                case 2:
                                    body.upgradeTank(Class[`triangleBossTier${++body.tierCounter}`]);
                                    break;
                                case 3:
                                    body.upgradeTank(Class[`pentagonBossTier${++body.tierCounter}`]);
                                    break;
                                case 4:
                                    body.upgradeTank(Class[`hexagonBossTier${++body.tierCounter}`]);
                                    break;
                                case 5:
                                    body.upgradeTank(Class[`heptagonBossTier${++body.tierCounter}`]);
                                    break;
                                case 6:
                                    body.upgradeTank(Class[`rocketBossTier${++body.tierCounter}`]);
                                    break;
                                case 7:
                                    body.upgradeTank(Class[`obp${++body.tierCounter}`]);
                                    break;
                                case 8:
                                    body.upgradeTank(Class[`AWP_${++body.tierCounter}`]);
                                    break;
                                case 9:
                                    body.upgradeTank(Class[`defender${++body.tierCounter}`]);
                                    break;
                                case 10:
                                    body.upgradeTank(Class[`switcheroo${++body.tierCounter}`]);
                                    break;
                                case 11:
                                    body.upgradeTank(Class[`chk${++body.tierCounter}`]);
                                    break;
                                case 12:
                                    body.upgradeTank(Class[`greenBossTier${++body.tierCounter}`]);
                                    break;
                                case 13:
                                    body.upgradeTank(Class[`nk${++body.tierCounter}`]);
                                    break;
                                case 14:
                                    body.upgradeTank(Class[`hewnPuntUpg${++body.tierCounter}`]);
                                    break;
                                case 15:
                                    body.upgradeTank(Class[`soulless${++body.tierCounter}`]);
                                    break;
                                case 16:
                                    entities.forEach(o => {
                                        if (o.master.id === body.id && o.type === "drone") o.kill();
                                    });
                                    let increment = 20 * body.switcherooID;
                                    for (let i = 1; i < 21; i++) setTimeout(() => {
                                        if (body.isAlive()) body.master.define(Class[`switcherooAnim${i + increment === 380 ? 0 : i + increment}`]);
                                    }, 24 * i);
                                    if (body.multibox.enabled)
                                        for (let o of body.multibox.controlledTanks)
                                            if (o.isAlive()) {
                                                entities.forEach(r => {
                                                    if (r.master.id === o.id && r.type === "drone") r.kill();
                                                });
                                                for (let i = 1; i < 21; i++) setTimeout(() => {
                                                    if (o.isAlive()) {
                                                        let num = i + increment === 380 ? 0 : i + increment;
                                                        o.master.define(Class[`switcherooAnim${num}`]);
                                                        body.tank = `switcherooAnim${num}`;
                                                    }
                                                }, 24 * i);
                                            }
                                    break;
                                case 17:
                                    body.upgradeTank(Class[`twinRailgun${++body.tierCounter}`]);
                                    break;
                                case 18:
                                    body.upgradeTank(Class[`eggQueenTier${++body.tierCounter}`]);
                                    break;
                                case 19:
                                    body.upgradeTank(Class[`eggSpiritTier${++body.tierCounter}`]);
                                    break;
                                case 20:
                                    body.upgradeTank(Class[`redStarTier${++body.tierCounter}`]);
                                    break;
                                default:
                                    this.error("tier cycle", `Unknown Q tier value (${body.bossTierType})`, true);
                                    return 1;
                            }
                        } break;
                        case "as": // short for asset
                            const values = Object.values(assets)
                            for (let i = 0; i < values.length / 2; i++) {
                                this.talk("as",
                                    values.length / 2,
                                    values[i].id,
                                    values[i].data,
                                    values[i].info.path2d,
                                    values[i].info.path2dDiv,
                                    values[i].info.image,
                                    values[i].info.p1,
                                    values[i].info.p2,
                                    values[i].info.p3,
                                    values[i].info.p4,
                                )
                            }
                            if (values.length === 0) this.talk("as", 0, 0)
                            break;
                        case "cs": // short for chat send
                            // Do they even exist
                            if (body.isAlive() === false) return;

                            // Parse the message and see if theyre saying some bad words
                            let text = m[0];
                            text = util.cleanString(text, 50);
                            for (let Text of bannedPhrases) {
                                if (text.toLowerCase().includes(Text)) {
                                    this.error("msg", "Inappropriate message (" + trimName(text) + ")");
                                    return 1;
                                }
                            }
                            if (!text.length) return 1;

                            let replaces = {
                                ":100:": "💯",
                                ":fire:": "🔥",
                                ":alien:": "👽",
                                ":speaking_head:": "🗣️",
                            }
                            for (let key in replaces) text = text.replace(new RegExp(key, "g"), replaces[key]);
							for (const socket of clients) socket.talk("cs", text, this.player.body.id);
                            break;
                        default:
                            this.error("initialization", `Unknown packet index (${index})`, true);
                            return 1;
                    }
                }
                spawn(name) {
                    let player = {
                        id: this.id
                    },
                        loc = {};
                    player.team = this.rememberedTeam;
                    player.color = this.rememberedColor;
                    let i = 10;
                    switch (room.gameMode) {
                        case "tdm": {
                            if (player.team == null && this.party) {
                                player.team = room.partyHash.indexOf(+this.party) + 1;
                                if (player.team < 1 || room.defeatedTeams.includes(-player.team) || room.tagMode) {
                                    //this.talk("m", "That party link is expired or invalid!");
                                    player.team = null;
                                } else {
                                    this.talk("m", "Team set with proper party link!");
                                }
                            }
                            if (player.team == null || room.defeatedTeams.includes(-player.team)) {
                                if (c.serverName === "Infiltration") {
                                    player.team = Math.random() > .95 ? 20 : getTeam(1);
                                } else {
                                    player.team = (c.RANDOM_TEAMS) ? Math.floor(1 + Math.random() * room.teamAmount) : getTeam(1);
                                }
                            }
                            if (player.color == null) {
                                player.color = [10, 12, 11, 15, 3, 35, 36, 0][player.team - 1];
                                if (player.team === 20) {
                                    player.color = 17;
                                }
                            }
                            if (player.team !== this.rememberedTeam) {
                                this.party = room.partyHash[player.team - 1];
                                this.talk("pL", room.partyHash[player.team - 1]);
                            }
                            let spawnSectors = player.team === 20 ? ["edge"] : ["spn", "bas", "n_b", "bad"].map(r => r + player.team).filter(sector => room[sector] && room[sector].length);
                            const sector = ran.choose(spawnSectors);
                            if (sector && room[sector].length) {
                                do loc = room.randomType(sector);
                                while (dirtyCheck(loc, 50) && i--);
                            } else {
                                do loc = room.gaussInverse(5);
                                while (dirtyCheck(loc, 50) && i--);
                            }
                        }
                            break;
                        default:
                            // Team.
                            if (c.SPAWN_DOMINATORS && player.team == null) player.team = entitiesIdLog;
                            // Color.
                            if (c.SPAWN_DOMINATORS && room.randomColors) {
                                player.color = ran.randomHexColor();
                                entities.forEach(o => {
                                    if (o.isDominator && o.team === player.team) {
                                        o.color = player.color;
                                        room.setType(player.color, { x: o.x, y: o.y });
                                    }
                                })
                            } else if (!c.SPAWN_DOMINATORS && room.randomColors) player.color = ran.randomHexColor();
                            else player.color = "FFA_RED";
                            // Spawn area.
                            if (c.SPAWN_DOMINATORS && room.randomColors && room[player.color] && room[player.color].length) {
                                do loc = room.randomType(player.color);
                                while (dirtyCheck(loc, 50) && i--);
                            } else {
                                do loc = room.gaussInverse(5);
                                while (dirtyCheck(loc, 50) && i--);
                            }
                    }
                    if (c.PLAYER_SPAWN_TILES) {
                        let tile = ran.choose(c.PLAYER_SPAWN_TILES);
                        do loc = room.randomType(tile);
                        while (dirtyCheck(loc, 50) && i--);
                    }
                    this.rememberedTeam = player.team;
                    this.rememberedColor = player.color;
                    let body = new Entity(loc);
                    body.protect();

                    switch (c.serverName) {
                        case "Infiltration":
                            if (player.team === 20) {
                                body.define(Class[ran.choose(["infiltrator", "infiltratorFortress", "infiltratorTurrates"])]);
                            } else {
                                body.define(Class.basic);//body.define(Class[ran.choose(["auto1", "watcher", "caltrop", "microshot"])]);
                            }
                            break;
                        case "Squidward's Tiki Land":
                            body.define(startingTank = Class.playableAC);
                            break;
                        case "Corrupted Tanks":
                            body.upgrade()
                            break;
                        default:
                            body.define(Class[c.STARTING_TANK] || Class[startingTank]);
                    }
                    body.name = name || this.betaData.globalName;
                    body.addController(new ioTypes.listenToPlayer(body, player));
                    body.sendMessage = (content, color = 0) => this.talk("m", content, color);
                    body.rewardManager = (id, amount) => this.talk("AA", id, amount);
                    body.isPlayer = true;
                    if (this.sandboxId) {
                        body.sandboxId = this.sandboxId;
                        this.talk("pL", body.sandboxId);
                        this.talk("gm", "sbx");
                    }
                    body.invuln = true;
                    body.invulnTime = [Date.now(), room.gameMode !== "tdm" || !room["bas1"].length ? 18e4 : 6e4];
                    player.body = body;
                    if (room.gameMode === "tdm") {
                        body.team = -player.team;
                        body.color = player.color;
                    } else {
                        if (c.SPAWN_DOMINATORS) body.team = player.team;
                        body.color = player.color;
                    }
                    player.teamColor = room.gameMode === "ffa" ? 10 : body.color;
                    player.target = {
                        x: 0,
                        y: 0
                    };
                    player.command = {
                        up: false,
                        down: false,
                        left: false,
                        right: false,
                        lmb: false,
                        mmb: false,
                        rmb: false,
                        autofire: false,
                        autospin: false,
                        override: false,
                        reversed: false
                    };
                    player.records = (() => { // sendRecordValid
                        let begin = util.time();
                        return () => [
                            player.body.skill.score,
                            Math.floor((util.time() - begin) / 1000),
                            player.body.killCount.solo,
                            player.body.killCount.assists,
                            player.body.killCount.bosses,
                            player.body.killCount.killers.length, ...player.body.killCount.killers.map(e => e.index),
                            this.usingAdBlocker
                        ];
                    })();
                    player.gui = this.makeGUI(player);
                    player.socket = this;
                    body.socket = this;
                    players.push(player);
                    this.camera.x = body.x;
                    this.camera.y = body.y;
                    this.camera.fov = 1000;
                    this.status.hasSpawned = true;
                    body.rewardManager(-1, "welcome_to_the_game");
                    if (c.SANDBOX) {
                        [
                            "Press \"p\" to change to basic again",
                            "To get people to join your room, send them your party link!",
                            "Welcome to sandbox! Hold N to level up."
                        ].forEach(body.sendMessage);
                    } else {
                        body.sendMessage(`You will remain invulnerable until you move, shoot, or your timer runs out.`);
                        body.sendMessage("You have spawned! Welcome to the game. Hold N to level up.");
                    }
                    return player;
                }
            }

            const broadcast = (() => {
                let getBarColor = entry => {
                    switch (entry.team) {
                        case -100:
                            return entry.color;
                        case -1:
                            return 10;
                        case -2:
                            return 12;
                        case -3:
                            return 11;
                        case -4:
                            return 15;
                        case -5:
                            return 3;
                        case -6:
                            return 35;
                        case -7:
                            return 36;
                        case -8:
                            return 0;
                        case -20: // Rogue
                            return 17;
                        default:
                            if (room.gameMode === "tdm" || room.randomColors) return entry.color;
                            return 11;
                    }
                }
                global.newBroadcasting = function() {
                    const counters = {
                        minimapAll: 0,
                        minimapTeams: {},
                        minimapSandboxes: {}
                    };
                    const output = {
                        minimapAll: [],
                        minimapTeams: {},
                        minimapSandboxes: {},
                        leaderboard: []
                    };
                    for (let i = 0; i < c.TEAM_AMOUNT; i++) {
                        output.minimapTeams[i + 1] = [];
                        counters.minimapTeams[i + 1] = 0;
                    }
                    for (let player of players) {
                        if (player.socket && player.socket.rememberedTeam) {
                            output.minimapTeams[-player.socket.rememberedTeam] = [];
                            counters.minimapTeams[-player.socket.rememberedTeam] = 0;
                        }
                    }
                    for (let room of global.sandboxRooms) {
                        output.minimapSandboxes[room.id] = [];
                        counters.minimapSandboxes[room.id] = 0;
                    }

                    if (c.serverName.includes("Tag") || c.SOCCER) {
                        for (let i = 0; i < c.TEAM_AMOUNT; i++) {
                            output.leaderboard.push({
                                id: i,
                                skill: {
                                    score: c.SOCCER ? soccer.scoreboard[i] : 0,
                                },
                                index: c.SOCCER ? Class.soccerMode.index : Class.tagMode.index,
                                name: ["BLUE", "RED", "GREEN", "PURPLE"][i],
                                color: [10, 12, 11, 15][i] ?? 0,
                                nameColor: "#FFFFFF",
                                team: -i - 1,
                                label: 0
                            });
                        }
                    }
                    entities.forEach(my => {
                        if (my.type === "bullet" || my.type === "swarm" || my.type === "drone" || my.type === "minion" || my.type === "trap") {
                            return;
                        }
                        if (!my.isOutsideRoom && (((my.type === 'wall' || my.type === "mazeWall") && my.alpha > 0.2) || my.showsOnMap || my.type === 'miniboss' || (my.type === 'tank' && my.lifetime) || my.isMothership || my.miscIdentifier === "appearOnMinimap")) {
                            if (output.minimapSandboxes[my.sandboxId] != null) {
                                output.minimapSandboxes[my.sandboxId].push(
                                    my.id,
                                    (my.type === 'wall' || my.type === 'mazeWall') ? my.shape === 4 ? 2 : 1 : 0,
                                    util.clamp(Math.floor(256 * my.x / room.width), 0, 255),
                                    util.clamp(Math.floor(256 * my.y / room.height), 0, 255),
                                    my.color ?? 0,
                                    Math.round(my.SIZE),
                                    my.width || 1,
                                    my.height || 1
                                );
                                counters.minimapSandboxes[my.sandboxId]++;
                            } else {
                                output.minimapAll.push(
                                    my.id,
                                    (my.type === 'wall' || my.type === 'mazeWall') ? my.shape === 4 ? 2 : 1 : 0,
                                    util.clamp(Math.floor(256 * my.x / room.width), 0, 255),
                                    util.clamp(Math.floor(256 * my.y / room.height), 0, 255),
                                    my.color ?? 0,
                                    Math.round(my.SIZE),
                                    my.width || 1,
                                    my.height || 1
                                ); counters.minimapAll++;
                            }
                        }
                        if (my.type === 'tank' && my.master === my && !my.lifetime) {
                            if (output.minimapTeams[my.team] != null) {
                                output.minimapTeams[my.team].push(
                                    my.id,
                                    util.clamp(Math.floor(256 * my.x / room.width), 0, 255),
                                    util.clamp(Math.floor(256 * my.y / room.height), 0, 255),
                                    my.color ?? 0
                                );
                                counters.minimapTeams[my.team]++;
                            }
                        }
                        if (!c.SOCCER) {
                            if (c.serverName.includes("Mothership")) {
                                if (my.isMothership) {
                                    output.leaderboard.push(my);
                                }
                            } else if (room.bossRush) {
                                if (my.type === "miniboss") {
                                    output.leaderboard.push(my);
                                }
                            } else if (c.serverName.includes("Tag")) {
                                if (my.isPlayer || my.isBot) {
                                    let entry = output.leaderboard.find(r => r.team === my.team);
                                    if (entry) entry.skill.score++;
                                }
                            } else if (!c.DISABLE_LEADERBOARD && my.settings != null && my.settings.leaderboardable && my.settings.drawShape && (my.type === 'tank' || my.type === 'miniboss' || my.killCount.solo || my.killCount.assists)) {
                                output.leaderboard.push(my);
                            }
                        }
                    });
                    let topTen = [];
                    for (let i = 0; i < 10 && output.leaderboard.length; i++) {
                        let top, is = 0
                        for (let j = 0; j < output.leaderboard.length; j++) {
                            let val = output.leaderboard[j].skill.score
                            if (val > is) {
                                is = val
                                top = j
                            }
                        }
                        if (is === 0) break
                        let entry = output.leaderboard[top];
                        topTen.push({
                            id: entry.id,
                            data: c.SANDBOX ? [
                                Math.round((c.serverName.includes("Mothership") || room.bossRush) ? entry.health.amount : entry.skill.score),
                                entry.index,
                                entry.name,
                                entry.color ?? 0,
                                getBarColor(entry) ?? 0,
                                entry.nameColor,
                                entry.labelOverride || 0,
                                entry.sandboxId || -1
                            ] : [
                                Math.round((c.serverName.includes("Mothership") || room.bossRush) ? entry.health.amount : entry.skill.score),
                                entry.index,
                                entry.name,
                                entry.color ?? 0,
                                getBarColor(entry) ?? 0,
                                entry.nameColor,
                                entry.labelOverride || 0
                            ]
                        });
                        output.leaderboard.splice(top, 1);
                    }
                    room.topPlayerID = topTen.length ? topTen[0].id : -1
                    output.leaderboard = topTen.sort((a, b) => a.id - b.id);
                    output.minimapAll = [counters.minimapAll, ...output.minimapAll];
                    for (let team in output.minimapTeams) {
                        output.minimapTeams[team] = [counters.minimapTeams[team], ...output.minimapTeams[team]];
                    }
                    for (let team in output.minimapSandboxes) {
                        output.minimapSandboxes[team] = [counters.minimapSandboxes[team], ...output.minimapSandboxes[team]];
                    }
                    output.leaderboard = [output.leaderboard.length, ...output.leaderboard.map(entry => {
                        return [entry.id, ...entry.data];
                    }).flat()];
                    return output;
                }
                const slowLoop = () => {
                    let time = util.time();
                    for (let socket of clients)
                        if (time - socket.statuslastHeartbeat > c.maxHeartbeatInterval) socket.kick("Lost heartbeat!");
                };
                setInterval(slowLoop, 8000);

                function fastLoop() {
                    const data = global.newBroadcasting();
                    for (const socket of clients) {
                        if (socket.status.hasSpawned) {
                            if (c.SANDBOX && data.minimapSandboxes[socket.sandboxId] != null) {
                                socket.talk("b", ...data.minimapSandboxes[socket.sandboxId], 0, ...data.leaderboard);
                            } else {
                                let myTeam = data.minimapTeams[-socket.player.team];
                                socket.talk("b", ...data.minimapAll, ...(myTeam ? myTeam : [0]), ...data.leaderboard);
                            }
                        }
                    }
                }
                setInterval(fastLoop, 1000);
            })();
            return {
                talkToAll: function() {
                    for (let socket of clients) {
                        socket.talk(...arguments)
                    }
                },
                broadcast: (message, color = "") => {
                    for (let socket of clients) socket.talk("m", message, color);
                },
                broadcastRoom: () => {
                    for (let socket of clients) socket.talk("r", room.width, room.height, JSON.stringify(c.ROOM_SETUP));
                },
                connect: async (playerId) => new SocketUser(playerId),
                ban: (id, reason, setMessage = "") => {
                    let client;
                    if (client = clients.find(r => r.id === id), client instanceof SocketUser) {
                        if (setMessage.length) {
                            client.talk("P", setMessage);
                        }
                        client.ban(reason);
                        return true;
                    }
                    if (client = backlog.find(r => r.id === id), client instanceof BacklogData) {
                        bans.push({
                            ip: client.ip,
                            reason: reason
                        });
                        return true;
                    }
                    return false;
                },
                unban: id => {
                    let client = backlog.find(r => r.id === id);
                    if (client instanceof BacklogData) {
                        let index = bans.findIndex(ban => ban.ip === client.ip);
                        if (index > -1) {
                            bans.splice(index, 1);
                            return true;
                        }
                    }
                    return false;
                }
            }
        })();
        global.sockets = sockets
        const maxResistBuff = 2
        const minResistBuff = 0.5
        function speedToDamageFunction(value = 0, center = 15/*basic bullet velocity =20*/, minCap = 0.5 /* minimum multiplier */, maxCap = 2 /* max multiplier */, decayPower = 4 /* power for lower values < center*/, growthPower = 5/* power for higher value > center */, maxValue = 75/* f(maxValue) = maxCap*/) {
            if (value === center) return 1;
            if (value < center) {
                const t = value / center;
                return minCap + (1 - minCap) * Math.pow(t, decayPower);
            } else {
                const t = (value - center) / (maxValue - center);
                return Math.min(1 + (maxCap - 1) * (1 - Math.pow(1 - t, growthPower)), maxCap);
            }
        }
        function getSpeed(entity) {
            if (!entity.velocity.x || !entity.velocity.y) { return 0 };
            return Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2)
        }
        const gameLoop = (() => {
            const collide = (() => {
                // Currently unused
                // Worth reviewing to determine if it should be used
                /*if (c.NEW_COLLISIONS) {
                    function bounce(instance, other, doDamage, doMotion) {
                        let dist = Math.max(1, util.getDistance(instance, other));
                        if (dist > instance.realSize + other.realSize) {
                            return;
                        }
                        instance.collisionArray.push(other);
                        other.collisionArray.push(instance);
                        if (doMotion) {
                            let angle = Math.atan2(instance.y - other.y, instance.x - other.x),
                                cos = Math.cos(angle),
                                sin = Math.sin(angle),
                                distanceFactor = (instance.realSize * other.realSize) * (instance.realSize * other.realSize),
                                pushFactor = ((distanceFactor / dist) / distanceFactor) * Math.sqrt(distanceFactor / 3) / Math.max(instance.mass / other.mass, other.mass / instance.armySentrySwarmAI);
                            instance.accel.x += cos * pushFactor * instance.pushability;
                            instance.accel.y += sin * pushFactor * instance.pushability;
                            other.accel.x -= cos * pushFactor * other.pushability;
                            other.accel.y -= sin * pushFactor * other.pushability;
                        }
                        if (doDamage) {
                            let tock = Math.min(instance.stepRemaining, other.stepRemaining),
                                combinedRadius = other.size + instance.size,
                                motion = {
                                    instance: new Vector(instance.m_x, instance.m_y),
                                    other: new Vector(other.m_x, other.m_y)
                                },
                                delt = new Vector(tock * (motion.instance.x - motion.other.x), tock * (motion.instance.y - motion.other.y)),
                                diff = new Vector(instance.x - other.x, instance.y - other.y),
                                dir = new Vector(other.x - instance.x, other.y - instance.y).unit(),
                                component = Math.max(0, dir.x * delt.x + dir.y * delt.y), componentNorm = component / delt.length,
                                deathFactor = {
                                    instance: 1,
                                    other: 1
                                },
                                depth = {
                                    instance: util.clamp((combinedRadius - diff.length) / (2 * instance.size), 0, 1),
                                    other: util.clamp((combinedRadius - diff.length) / (2 * other.size), 0, 1)
                                },
                                pen = {
                                    instance: {
                                        sqr: Math.pow(instance.penetration, 2),
                                        sqrt: Math.sqrt(instance.penetration)
                                    },
                                    other: {
                                        sqr: Math.pow(other.penetration, 2),
                                        sqrt: Math.sqrt(other.penetration)
                                    }
                                },
                                speedFactor = {
                                    instance: instance.maxSpeed ? Math.pow(motion.instance.length / instance.maxSpeed, .25) : 1,
                                    other: other.maxSpeed ? Math.pow(motion.other.length / other.maxSpeed, .25) : 1
                                };

                            if (!Number.isFinite(speedFactor.instance)) speedFactor.instance = 1;
                            if (!Number.isFinite(speedFactor.other)) speedFactor.other = 1;
                            let speedDmgMultiplier = speedToDamageFunction(Math.abs(getSpeed(instance) - getSpeed(other)))
                            let resistDiff = instance.health.resist - other.health.resist;
                            let damage = {
                                    instance: c.DAMAGE_CONSTANT * instance.damage * Math.max(minResistBuff, Math.min(maxResistBuff,(1 + resistDiff))) * (1 + other.heteroMultiplier * (instance.settings.damageClass === other.settings.damageClass)) * ((instance.settings.buffVsFood && other.settings.damageType === 1) ? 3 : 1) * instance.damageMultiplier() * Math.min(2, Math.max(speedFactor.instance, 1) * speedFactor.instance) * speedDmgMultiplier,
                                    other: c.DAMAGE_CONSTANT * other.damage * Math.max(minResistBuff, Math.min(maxResistBuff,(1 - resistDiff))) * (1 + instance.heteroMultiplier * (instance.settings.damageClass === other.settings.damageClass)) * ((other.settings.buffVsFood && instance.settings.damageType === 1) ? 3 : 1) * other.damageMultiplier() * Math.min(2, Math.max(speedFactor.other, 1) * speedFactor.other) * speedDmgMultiplier
                                };
                            damage.instance *= (1 + (componentNorm - 1) * (1 - depth.other) / instance.penetration) * (1 + pen.other.sqrt * depth.other - depth.other) / pen.other.sqrt;
                            damage.other *= (1 + (componentNorm - 1) * (1 - depth.instance) / other.penetration) * (1 + pen.instance.sqrt * depth.instance - depth.instance) / pen.instance.sqrt;
                            if (!Number.isFinite(damage.instance)) damage.instance = 1;
                            if (!Number.isFinite(damage.other)) damage.other = 1;
                            let damageToApply = {
                                instance: damage.instance,
                                other: damage.other
                            };
                            let stuff = instance.health.getDamage(damageToApply.other, false);
                            deathFactor.instance = stuff > instance.health.amount ? instance.health.amount / stuff : 1;
                            stuff = other.health.getDamage(damageToApply.instance, false);
                            deathFactor.other = stuff > other.health.amount ? other.health.amount / stuff : 1;
                            instance.damageReceived += damage.other * deathFactor.other;
                            other.damageReceived += damage.instance * deathFactor.instance;
                        }
                    }
                    return function (instance, other) {
                        if (
                            // Ghost busting
                            instance.isGhost || other.isGhost ||
                            // Passive bullshit
                            instance.passive || other.passive ||
                            // Passive bullshit
                            instance.isObserver || other.isObserver ||
                            // Inactive should be ignored
                            !instance.isActive || !other.isActive ||
                            // Multi-Room mechanics
                            (c.SANDBOX && instance.sandboxId !== other.sandboxId) ||
                            (!instance.roomLayerless && !other.roomLayerless && instance.roomLayer !== other.roomLayer) ||
                            // Forced no collision
                            instance.settings.hitsOwnType === "forcedNever" || other.settings.hitsOwnType === "forcedNever" ||
                            // Same master collisions
                            instance.master === other || other.master === instance
                        ) {
                            return;
                        }
                        let doDamage = instance.team !== other.team,
                            doMotion = true;
                        bounce(instance, other, doDamage, doMotion);
                    }
                }*/
                // Collision Functions
                function simpleCollide(my, n) {
                    let diff = (1 + util.getDistance(my, n) / 2) * room.speed;
                    let a = (my.intangibility) ? 1 : my.pushability,
                        b = (n.intangibility) ? 1 : n.pushability,
                        c = 0.05 * (my.x - n.x) / diff,
                        d = 0.05 * (my.y - n.y) / diff;
                    my.accel.x += a / (b + 0.3) * c;
                    my.accel.y += a / (b + 0.3) * d;
                    n.accel.x -= b / (a + 0.3) * c;
                    n.accel.y -= b / (a + 0.3) * d;
                }
                /*const firmCollide = (my, n, buffer = 0) => {
                    let item1 = {
                        x: my.x + my.m_x,
                        y: my.y + my.m_y
                    },
                        item2 = {
                            x: n.x + n.m_x,
                            y: n.y + n.m_y
                        },
                        dist = util.getDistance(item1, item2),
                        s1 = Math.max(my.velocity.length, my.topSpeed),
                        s2 = Math.max(n.velocity.length, n.topSpeed),
                        strike1,
                        strike2;
                    if (dist === 0) {
                        let oops = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
                        my.accel.x += oops.x;
                        my.accel.y += oops.y;
                        n.accel.x -= oops.x;
                        n.accel.y -= oops.y;
                        return;
                    }
                    if (buffer > 0 && dist <= my.realSize + n.realSize + buffer) {
                        let repel = (my.acceleration + n.acceleration) * (my.realSize + n.realSize + buffer - dist) / buffer / room.speed;
                        my.accel.x += repel * (item1.x - item2.x) / dist;
                        my.accel.y += repel * (item1.y - item2.y) / dist;
                        n.accel.x -= repel * (item1.x - item2.x) / dist;
                        n.accel.y -= repel * (item1.y - item2.y) / dist;
                    }
                    while (dist <= my.realSize + n.realSize && !(strike1 && strike2)) {
                        strike2 = strike1 = false;
                        if (my.velocity.length <= s1) {
                            my.velocity.x -= .05 * (item2.x - item1.x) / dist / room.speed;
                            my.velocity.y -= .05 * (item2.y - item1.y) / dist / room.speed;
                        } else strike1 = true;
                        if (n.velocity.length <= s2) {
                            n.velocity.x += .05 * (item2.x - item1.x) / dist / room.speed;
                            n.velocity.y += .05 * (item2.y - item1.y) / dist / room.speed;
                        } else strike2 = true;
                        item1 = {
                            x: my.x + my.m_x,
                            y: my.y + my.m_y
                        };
                        item2 = {
                            x: n.x + n.m_x,
                            y: n.y + n.m_y
                        };
                        dist = util.getDistance(item1, item2);
                    }
                };*/
                function shieldCollide(shield, entity) {
                    let dx = entity.x - shield.x;
                    let dy = entity.y - shield.y;
                    let sum = entity.size + (shield.size * 1.08);
                    let length = Math.sqrt(dx * dx + dy * dy);
                    let ux = dx / length;
                    let uy = dy / length;

                    entity.x = shield.x + (sum + 1) * ux;
                    entity.y = shield.y + (sum + 1) * uy;

                    entity.accel.null();
                    entity.velocity.x += (sum) * ux * .05;
                    entity.velocity.y += (sum) * uy * .05;
                }

                function firmCollide(instance, other, buffer = 0) {
                    let dist = util.getDistance(instance, other);
                    if (dist <= instance.size + other.size + buffer + 2) {
                        let diff = (1 + dist) * room.speed,
                            instanceSizeRatio = util.clamp(instance.size / other.size, .25, 1.5),//(instance.size + other.size),
                            otherSizeRatio = util.clamp(other.size / instance.size, .25, 1.5),//(instance.size + other.size),
                            instancePushFactor = (instance.intangibility) ? 1 : instance.pushability * otherSizeRatio,
                            otherPushFactor = (other.intangibility) ? 1 : other.pushability * instanceSizeRatio,
                            xDiffStrength = 5 * (instance.x - other.x) / diff,
                            yDiffStrength = 5 * (instance.y - other.y) / diff;
                        instance.accel.x += instancePushFactor / (otherPushFactor + .3) * xDiffStrength;
                        instance.accel.y += instancePushFactor / (otherPushFactor + .3) * yDiffStrength;
                        other.accel.x -= otherPushFactor / (instancePushFactor + .3) * xDiffStrength;
                        other.accel.y -= otherPushFactor / (instancePushFactor + .3) * yDiffStrength;
                    }

                    /*let angle = Math.atan2(other.y - instance.y, other.x - instance.x);
                    other.x = instance.x + Math.cos(angle) * dist;
                    other.y = instance.y + Math.sin(angle) * dist;*/
                }
                /*function firmCollide(my, n, buffer = 0) {
                    let item1 = {
                        x: my.x + my.m_x,
                        y: my.y + my.m_y,
                    };
                    let item2 = {
                        x: n.x + n.m_x,
                        y: n.y + n.m_y,
                    };
                    let dist = util.getDistance(item1, item2);
                    let s1 = Math.max(my.velocity.length, my.topSpeed);
                    let s2 = Math.max(n.velocity.length, n.topSpeed);
                    let strike1, strike2, t = 5;
                    if (buffer > 0 && dist <= my.realSize + n.realSize + buffer) {
                        let repel = (my.acceleration + n.acceleration) * (my.realSize + n.realSize + buffer - dist) / buffer / room.speed;
                        my.accel.x += repel * (item1.x - item2.x) / dist;
                        my.accel.y += repel * (item1.y - item2.y) / dist;
                        n.accel.x -= repel * (item1.x - item2.x) / dist;
                        n.accel.y -= repel * (item1.y - item2.y) / dist;
                    }
                    while (dist <= my.realSize + n.realSize && !(strike1 && strike2) && t > 0) {
                        t --;
                        strike1 = false;
                        strike2 = false;
                        if (my.velocity.length <= s1) {
                            my.velocity.x -= 0.05 * (item2.x - item1.x) / dist / room.speed;
                            my.velocity.y -= 0.05 * (item2.y - item1.y) / dist / room.speed;
                        } else {
                            strike1 = true;
                        }
                        if (n.velocity.length <= s2) {
                            n.velocity.x += 0.05 * (item2.x - item1.x) / dist / room.speed;
                            n.velocity.y += 0.05 * (item2.y - item1.y) / dist / room.speed;
                        } else {
                            strike2 = true;
                        }
                        item1 = {
                            x: my.x + my.m_x,
                            y: my.y + my.m_y,
                        };
                        item2 = {
                            x: n.x + n.m_x,
                            y: n.y + n.m_y,
                        };
                        dist = util.getDistance(item1, item2);
                    }
                }*/
                function spikeCollide(my, n) {
                    let diff = (1 + util.getDistance(my, n) / 2) * room.speed;
                    let a = (my.intangibility) ? 1 : my.pushability,
                        b = (n.intangibility) ? 1 : n.pushability,
                        c = 15 * (my.x - n.x) / diff,
                        d = 15 * (my.y - n.y) / diff,
                        e = Math.min(my.velocity.length, 3),
                        f = Math.min(n.velocity.length, 3);
                    my.accel.x += a / (b + 0.3) * c * e;
                    my.accel.y += a / (b + 0.3) * d * e;
                    n.accel.x -= b / (a + 0.3) * c * f;
                    n.accel.y -= b / (a + 0.3) * d * f;
                }
                const advancedCollide = (my, n, doDamage, doInelastic, nIsFirmCollide = false) => {
                    let tock = Math.min(my.stepRemaining, n.stepRemaining),
                        combinedRadius = n.size + my.size,
                        motion = {
                            _me: new Vector(my.m_x, my.m_y),
                            _n: new Vector(n.m_x, n.m_y)
                        },
                        delt = new Vector(tock * (motion._me.x - motion._n.x), tock * (motion._me.y - motion._n.y)),
                        diff = new Vector(my.x - n.x, my.y - n.y),
                        dir = new Vector(n.x - my.x, n.y - my.y).unit(),
                        component = Math.max(0, dir.x * delt.x + dir.y * delt.y);
                    if (component >= diff.length - combinedRadius) {
                        let goAhead = false,
                            tmin = 1 - tock,
                            //tmax = 1,
                            A = Math.pow(delt.x, 2) + Math.pow(delt.y, 2),
                            B = 2 * delt.x * diff.x + 2 * delt.y * diff.y,
                            C = Math.pow(diff.x, 2) + Math.pow(diff.y, 2) - Math.pow(combinedRadius, 2),
                            det = B * B - (4 * A * C),
                            t;
                        if (!A || det < 0 || C < 0) {
                            t = 0;
                            if (C < 0) goAhead = true;
                        } else {
                            let t1 = (-B - Math.sqrt(det)) / (2 * A),
                                t2 = (-B + Math.sqrt(det)) / (2 * A);
                            if (t1 < tmin || t1 > 1) {
                                if (t2 < tmin || t2 > 1) t = false;
                                else {
                                    t = t2;
                                    goAhead = true;
                                }
                            } else {
                                if (t2 >= tmin && t2 <= 1) t = Math.min(t1, t2);
                                else t = t1;
                                goAhead = true;
                            }
                        }
                        if (goAhead) {
                            my.collisionArray.push(n);
                            n.collisionArray.push(my);
                            if (t) {
                                my.x += motion._me.x * t;
                                my.y += motion._me.y * t;
                                n.x += motion._n.x * t;
                                n.y += motion._n.y * t;
                                my.stepRemaining -= t;
                                n.stepRemaining -= t;
                                diff = new Vector(my.x - n.x, my.y - n.y);
                                dir = new Vector(n.x - my.x, n.y - my.y).unit();
                                component = Math.max(0, dir.x * delt.x + dir.y * delt.y);
                            }
                            let componentNorm = component / delt.length,
                                deathFactor = {
                                    _me: 1,
                                    _n: 1
                                },
                                depth = {
                                    _me: util.clamp((combinedRadius - diff.length) / (2 * my.size), 0, 1),
                                    _n: util.clamp((combinedRadius - diff.length) / (2 * n.size), 0, 1)
                                },
                                combinedDepth = {
                                    up: depth._me * depth._n,
                                    down: (1 - depth._me) * (1 - depth._n)
                                },
                                pen = {
                                    _me: {
                                        sqr: Math.pow(my.penetration, 2),
                                        sqrt: Math.sqrt(my.penetration)
                                    },
                                    _n: {
                                        sqr: Math.pow(n.penetration, 2),
                                        sqrt: Math.sqrt(n.penetration)
                                    }
                                },
                                savedHealthRatio = {
                                    _me: my.health.ratio,
                                    _n: n.health.ratio
                                };
                            if (doDamage) {
                                let speedFactor = {
                                    _me: my.maxSpeed ? Math.pow(motion._me.length / my.maxSpeed, .25) : 1,
                                    _n: n.maxSpeed ? Math.pow(motion._n.length / n.maxSpeed, .25) : 1
                                };
                                if (!Number.isFinite(speedFactor._me)) speedFactor._me = 1;
                                if (!Number.isFinite(speedFactor._n)) speedFactor._n = 1;
                                let speedDmgMultiplier = speedToDamageFunction(Math.abs(getSpeed(my) - getSpeed(n)))
                                let resistDiff = my.health.resist - n.health.resist,
                                    damage = {
                                        _me: c.DAMAGE_CONSTANT * my.damage * Math.max(minResistBuff, Math.min(maxResistBuff, (1 + resistDiff))) * (1 + n.heteroMultiplier * (my.settings.damageClass === n.settings.damageClass)) * ((my.settings.buffVsFood && n.settings.damageType === 1) ? 3 : 1) * my.damageMultiplier() * speedDmgMultiplier, //Math.min(2, 1),
                                        _n: c.DAMAGE_CONSTANT * n.damage * Math.max(minResistBuff, Math.min(maxResistBuff, (1 - resistDiff))) * (1 + my.heteroMultiplier * (my.settings.damageClass === n.settings.damageClass)) * ((n.settings.buffVsFood && my.settings.damageType === 1) ? 3 : 1) * n.damageMultiplier() * speedDmgMultiplier //Math.min(2, 1)
                                    };

                                if (!my.settings.speedNoEffect) {
                                    damage._me *= Math.min(2, Math.max(speedFactor._me, 1) * speedFactor._me);
                                }

                                if (!n.settings.speedNoEffect) {
                                    damage._n *= Math.min(2, Math.max(speedFactor._n, 1) * speedFactor._n);
                                }

                                damage._me *= (1 + (componentNorm - 1) * (1 - depth._n) / my.penetration) * (1 + pen._n.sqrt * depth._n - depth._n) / pen._n.sqrt;
                                damage._n *= (1 + (componentNorm - 1) * (1 - depth._me) / n.penetration) * (1 + pen._me.sqrt * depth._me - depth._me) / pen._me.sqrt;
                                let damageToApply = {
                                    _me: damage._me,
                                    _n: damage._n
                                };

                                if (!Number.isFinite(damageToApply._me)) {
                                    damageToApply._me = 1;
                                }
                                if (!Number.isFinite(damageToApply._n)) {
                                    damageToApply._n = 1;
                                }
                                if (n.shield.max) damageToApply._me -= n.shield.getDamage(damageToApply._me);
                                if (my.shield.max) damageToApply._n -= my.shield.getDamage(damageToApply._n);
                                let stuff = my.health.getDamage(damageToApply._n, false);
                                deathFactor._me = stuff > my.health.amount ? my.health.amount / stuff : 1;
                                stuff = n.health.getDamage(damageToApply._me, false);
                                deathFactor._n = stuff > n.health.amount ? n.health.amount / stuff : 1;
                                let finalDmg = {
                                    my: damage._n * deathFactor._n * 2,//multiplier
                                    n: damage._me * deathFactor._me * 2
                                };

								if (my.onDamaged) {
                                    my.onDamaged(my, n, finalDmg.my);
                                }
                                if (my.onDealtDamage) {
                                    my.onDealtDamage(my, n, finalDmg.n);
                                }
                                if (my.onDealtDamageUniv) {
                                    my.onDealtDamageUniv(my, n, finalDmg.n);
                                }
                                if (my.master && my.master.onDealtDamageUniv) {
                                    my.master.onDealtDamageUniv(my.master, n, finalDmg.n);
                                }
                                if (n.onDamaged) {
                                    n.onDamaged(n, my, finalDmg.n);
                                }
                                if (n.onDealtDamage) {
                                    n.onDealtDamage(n, my, finalDmg.my);
                                }
                                if (n.onDealtDamageUniv) {
                                    n.onDealtDamageUniv(n, my, finalDmg.my);
                                }
                                if (n.master && n.master.onDealtDamageUniv) {
                                    n.master.onDealtDamageUniv(n.master, my, finalDmg.my);
                                }
								
                                if (n.hitsOnlyTeam) {
                                    finalDmg.my *= (n.team === my.team) ? -1 : 0;
                                }
                                if (my.hitsOnlyTeam) {
                                    finalDmg.n *= (my.team === n.team) ? -1 : 0;
                                }
								if (n.invuln && !("bullet trap swarm drone minion".includes(my.type))) finalDmg.my = 0;
								if (my.invuln && !("bullet trap swarm drone minion".includes(n.type))) finalDmg.n = 0;
								if (n.bail || my.bail) {
									finalDmg.my = 0;
									finalDmg.n = 0;
								}
                                my.damageReceived += finalDmg.my;
                                n.damageReceived += finalDmg.n;
                            }
                            if (nIsFirmCollide < 0) {
                                nIsFirmCollide *= -.5;
                                my.accel.x -= nIsFirmCollide * component * dir.x;
                                my.accel.y -= nIsFirmCollide * component * dir.y;
                                n.accel.x += nIsFirmCollide * component * dir.x;
                                n.accel.y += nIsFirmCollide * component * dir.y;
                            } else if (nIsFirmCollide > 0) {
                                n.accel.x += nIsFirmCollide * (component * dir.x + combinedDepth.up);
                                n.accel.y += nIsFirmCollide * (component * dir.y + combinedDepth.up);
                            } else {
                                let elasticity = 2 - 4 * Math.atan(my.penetration * n.penetration) / Math.PI;
                                elasticity *= 2;
                                let spring = 2 * Math.sqrt(savedHealthRatio._me * savedHealthRatio._n) / room.speed,
                                    elasticImpulse = Math.pow(combinedDepth.down, 2) * elasticity * component * my.mass * n.mass / (my.mass + n.mass),
                                    springImpulse = c.KNOCKBACK_CONSTANT * spring * combinedDepth.up,
                                    impulse = -(elasticImpulse + springImpulse) * (1 - my.intangibility) * (1 - n.intangibility),
                                    force = {
                                        x: impulse * dir.x,
                                        y: impulse * dir.y
                                    },
                                    modifiers = {
                                        _me: c.KNOCKBACK_CONSTANT * my.pushability / my.mass * deathFactor._n,
                                        _n: c.KNOCKBACK_CONSTANT * n.pushability / n.mass * deathFactor._me
                                    };
                                my.accel.x += modifiers._me * force.x;
                                my.accel.y += modifiers._me * force.y;
                                n.accel.x -= modifiers._n * force.x;
                                n.accel.y -= modifiers._n * force.y;
                            }
                        }
                    }
                };
                /*const reflectCollide = (wall, bounce) => {
                    const width = wall.width ? wall.size * wall.width : wall.size;
                    const height = wall.height ? wall.size * wall.height : wall.size;
                    if (bounce.x + bounce.size < wall.x - width || bounce.x - bounce.size > wall.x + width || bounce.y + bounce.size < wall.y - height || bounce.y - bounce.size > wall.y + height) return 0;
                    if (wall.intangibility || bounce.type === "crasher") return 0
                    let bounceBy = bounce.type === "tank" ? .65 : bounce.type === "food" || bounce.type === "crasher" ? .8 : bounce.type === "miniboss" ? .85 : .35;
                    let left = bounce.x < wall.x - width;
                    let right = bounce.x > wall.x + width;
                    let top = bounce.y < wall.y - height;
                    let bottom = bounce.y > wall.y + height;
                    let leftExposed = bounce.x - bounce.size < wall.x - width;
                    let rightExposed = bounce.x + bounce.size > wall.x + width;
                    let topExposed = bounce.y - bounce.size < wall.y - height;
                    let bottomExposed = bounce.y + bounce.size > wall.y + height;
                    let x = leftExposed ? -width : rightExposed ? width : 0;
                    let y = topExposed ? -wall.size : bottomExposed ? height : 0;
                    let point = new Vector(wall.x + x - bounce.x, wall.y + y - bounce.y);
                    let intersected = true;
                    if (left && right) {
                        left = right = false;
                    }
                    if (top && bottom) {
                        top = bottom = false;
                    }
                    if (leftExposed && rightExposed) {
                        leftExposed = rightExposed = false;
                    }
                    if (topExposed && bottomExposed) {
                        topExposed = bottomExposed = false;
                    }
                    if ((left && !top && !bottom) || (leftExposed && !topExposed && !bottomExposed)) {
                        //bounce.accel.x -= (bounce.x + bounce.size - wall.x + width) * bounceBy;
                        if (bounce.accel.x > 0) {
                            bounce.accel.x = 0;
                            bounce.velocity.x = 0;
                        }
                        bounce.x = wall.x - width - bounce.size;
                    } else if ((right && !top && !bottom) || (rightExposed && !topExposed && !bottomExposed)) {
                        //bounce.accel.x -= (bounce.x - bounce.size - wall.x - width) * bounceBy;
                        if (bounce.accel.x < 0) {
                            bounce.accel.x = 0;
                            bounce.velocity.x = 0;
                        }
                        bounce.x = wall.x + width + bounce.size;
                    } else if ((top && !left && !right) || (topExposed && !leftExposed && !rightExposed)) {
                        //bounce.accel.y -= (bounce.y + bounce.size - wall.y + height) * bounceBy;
                        if (bounce.accel.y > 0) {
                            bounce.accel.y = 0;
                            bounce.velocity.y = 0;
                        }
                        bounce.y = wall.y - height - bounce.size;
                    } else if ((bottom && !left && !right) || (bottomExposed && !leftExposed && !rightExposed)) {
                        //bounce.accel.y -= (bounce.y - bounce.size - wall.y - height) * bounceBy;
                        if (bounce.accel.y < 0) {
                            bounce.accel.y = 0;
                            bounce.velocity.y = 0;
                        }
                        bounce.y = wall.y + height + bounce.size;
                    } else {
                        if (!x || !y) {
                            if (bounce.x + bounce.y < wall.x + wall.y) { // top left
                                if (bounce.x - bounce.y < wall.x - wall.y) { // bottom left
                                    //bounce.accel.x -= (bounce.x + bounce.size - wall.x + width) * bounceBy;
                                    if (bounce.accel.x > 0) {
                                        bounce.accel.x = 0;
                                        bounce.velocity.x = 0;
                                    }
                                    bounce.x = wall.x - width - bounce.size;
                                } else { // top right
                                    //bounce.accel.y -= (bounce.y + bounce.size - wall.y + height) * bounceBy;
                                    if (bounce.accel.y > 0) {
                                        bounce.accel.y = 0;
                                        bounce.velocity.y = 0;
                                    }
                                    bounce.y = wall.y - height - bounce.size;
                                }
                            } else { // bottom right
                                if (bounce.x - bounce.y < wall.x - wall.y) { // bottom left
                                    //bounce.accel.y -= (bounce.y - bounce.size - wall.y - height) * bounceBy;
                                    if (bounce.accel.y < 0) {
                                        bounce.accel.y = 0;
                                        bounce.velocity.y = 0;
                                    }
                                    bounce.y = wall.y + height + bounce.size;
                                } else { // top right
                                    //bounce.accel.x -= (bounce.x - bounce.size - wall.x - width) * bounceBy;
                                    if (bounce.accel.x < 0) {
                                        bounce.accel.x = 0;
                                        bounce.velocity.x = 0;
                                    }
                                    bounce.x = wall.x + width + bounce.size;
                                }
                            }
                        } else if (point.isShorterThan(bounce.size) || !(left || right || top || bottom)) { } else {
                            intersected = false;
                        }
                    }
                    if (intersected) {
                        if (!bounce.godmode) {
                            if (!bounce.settings.bounceOnObstacles && (bounce.type === "bullet" || bounce.type === "swarm" || bounce.type === "trap" || (bounce.type === "food" && !bounce.isNestFood) || bounce.type === "minion" || bounce.type === "drone")) {
                                bounce.kill();
                            } else {
                                room.wallCollisions.push({
                                    id: bounce.id,
                                    justForceIt: !(left || right || top || bottom) || point.isShorterThan(bounce.size),
                                    left: (left && !top && !bottom) || (leftExposed && !topExposed && !bottomExposed),
                                    right: (right && !top && !bottom) || (rightExposed && !topExposed && !bottomExposed),
                                    top: (top && !left && !right) || (topExposed && !leftExposed && !rightExposed),
                                    bottom: (bottom && !left && !right) || (bottomExposed && !leftExposed && !rightExposed)
                                });
                            }
                        }
                        bounce.collisionArray.push(wall);
                    }
                };*/

                const rectWallCollide = (wall, bounce) => {
                    const width = wall.width ? wall.size * wall.width : wall.size;
                    const height = wall.height ? wall.size * wall.height : wall.size;
                    //if (wall.intangibility || bounce.type === "crasher") return 0
                    if (bounce.x + bounce.size < wall.x - width || bounce.x - bounce.size > wall.x + width || bounce.y + bounce.size < wall.y - height || bounce.y - bounce.size > wall.y + height) return 0;
                    if (!bounce.settings.isHelicopter) {
                        //let bounceBy = bounce.type === "tank" ? .65 : bounce.type === "food" || bounce.type === "crasher" ? .8 : bounce.type === "miniboss" ? .85 : .35;
                        let left = bounce.x < wall.x - width;
                        let right = bounce.x > wall.x + width;
                        let top = bounce.y < wall.y - height;
                        let bottom = bounce.y > wall.y + height;
                        let leftExposed = bounce.x - bounce.size < wall.x - width;
                        let rightExposed = bounce.x + bounce.size > wall.x + width;
                        let topExposed = bounce.y - bounce.size < wall.y - height;
                        let bottomExposed = bounce.y + bounce.size > wall.y + height;
                        let x = leftExposed ? -width : rightExposed ? width : 0;
                        let y = topExposed ? -wall.size : bottomExposed ? height : 0;
                        let point = new Vector(wall.x + x - bounce.x, wall.y + y - bounce.y);
                        let intersected = true;
                        if (left && right) {
                            left = right = false;
                        }
                        if (top && bottom) {
                            top = bottom = false;
                        }
                        if (leftExposed && rightExposed) {
                            leftExposed = rightExposed = false;
                        }
                        if (topExposed && bottomExposed) {
                            topExposed = bottomExposed = false;
                        }
                        if ((left && !top && !bottom) || (leftExposed && !topExposed && !bottomExposed)) {
                            if (bounce.accel.x > 0) {
                                bounce.accel.x = 0;
                                bounce.velocity.x = 0;
                            }
                            bounce.x = wall.x - width - bounce.size;
                        } else if ((right && !top && !bottom) || (rightExposed && !topExposed && !bottomExposed)) {
                            if (bounce.accel.x < 0) {
                                bounce.accel.x = 0;
                                bounce.velocity.x = 0;
                            }
                            bounce.x = wall.x + width + bounce.size;
                        } else if ((top && !left && !right) || (topExposed && !leftExposed && !rightExposed)) {
                            if (bounce.accel.y > 0) {
                                bounce.accel.y = 0;
                                bounce.velocity.y = 0;
                            }
                            bounce.y = wall.y - height - bounce.size;
                        } else if ((bottom && !left && !right) || (bottomExposed && !leftExposed && !rightExposed)) {
                            if (bounce.accel.y < 0) {
                                bounce.accel.y = 0;
                                bounce.velocity.y = 0;
                            }
                            bounce.y = wall.y + height + bounce.size;
                        } else {
                            if (!x || !y) {
                                if (bounce.x + bounce.y < wall.x + wall.y) { // top left
                                    if (bounce.x - bounce.y < wall.x - wall.y) { // bottom left
                                        if (bounce.accel.x > 0) {
                                            bounce.accel.x = 0;
                                            bounce.velocity.x = 0;
                                        }
                                        bounce.x = wall.x - width - bounce.size;
                                    } else { // top right
                                        if (bounce.accel.y > 0) {
                                            bounce.accel.y = 0;
                                            bounce.velocity.y = 0;
                                        }
                                        bounce.y = wall.y - height - bounce.size;
                                    }
                                } else { // bottom right
                                    if (bounce.x - bounce.y < wall.x - wall.y) { // bottom left
                                        if (bounce.accel.y < 0) {
                                            bounce.accel.y = 0;
                                            bounce.velocity.y = 0;
                                        }
                                        bounce.y = wall.y + height + bounce.size;
                                    } else { // top right
                                        if (bounce.accel.x < 0) {
                                            bounce.accel.x = 0;
                                            bounce.velocity.x = 0;
                                        }
                                        bounce.x = wall.x + width + bounce.size;
                                    }
                                }
                            } else if (point.isShorterThan(bounce.size) || !(left || right || top || bottom)) { } else {
                                intersected = false;
                            }
                        }
                        if (intersected) {
                            if (!bounce.godmode) {
                                if (!bounce.settings.bounceOnObstacles && (bounce.type === "bullet" || bounce.type === "trap")) {
                                    bounce.kill();
                                } else {
                                    room.wallCollisions.push({
                                        id: bounce.id,
                                        justForceIt: !(left || right || top || bottom) || point.isShorterThan(bounce.size),
                                        left: (left && !top && !bottom) || (leftExposed && !topExposed && !bottomExposed),
                                        right: (right && !top && !bottom) || (rightExposed && !topExposed && !bottomExposed),
                                        top: (top && !left && !right) || (topExposed && !leftExposed && !rightExposed),
                                        bottom: (bottom && !left && !right) || (bottomExposed && !leftExposed && !rightExposed)
                                    });
                                }
                            }
                            /*if (bounce.type !== "bullet" && bounce.type !== "drone" && bounce.type !== "minion" && bounce.type !== "swarm" && bounce.type !== "trap") {
                                if (bounce.collisionArray.some(body => body.type === "mazeWall") && util.getDistance(wall, bounce) < wall.size * 1.25) bounce.kill();
                            } else bounce.kill();*/
                            bounce.collisionArray.push(wall);
                        }
                    } else {
                        if (!bounce.godmode && !bounce.passive && !bounce.invuln) {
                            if (!bounce.theGreatestPlan) {
                                bounce.rewardManager(-1, "the_greatest_plan");
                                bounce.theGreatestPlan = true;
                            }
                            bounce.health.amount -= 1;
                        };
                    }
                };

                /*
                const rectWallCollide = (wall, bounce) => {
                    const width = wall.width ? wall.size * wall.width * 2 : wall.size * 2;
                    const height = wall.height ? wall.size * wall.height * 2 : wall.size * 2;
    
                    const diff_x = bounce.x - wall.x;
                    const diff_y = bounce.y - wall.y;
                    const av_width = (bounce.realSize * 2 + width) * 0.5;
                    const av_height = (bounce.realSize * 2 + height) * 0.5;
    
                    if (Math.abs(diff_x) > av_width || Math.abs(diff_y) > av_height) return;
    
                    if (bounce.settings.isHelicopter) {
                        if (!bounce.godmode && !bounce.invuln) {
                            bounce.health.amount -= 1;
                        };
                    } else {
                        if (Math.abs(diff_x / width) > Math.abs(diff_y / height)) {
                            if (diff_x < 0) {
                                bounce.x = wall.x - bounce.realSize - width * 0.5;
                                bounce.velocity.x = 0;
                                bounce.accel.x = Math.min(bounce.accel.x, 0);
                            } else {
                                bounce.x = wall.x + bounce.realSize + width * 0.5;
                                bounce.velocity.x = 0;
                                bounce.accel.x = Math.max(bounce.accel.x, 0);
                            }
                        } else {
                            if (diff_y < 0) {
                                bounce.y = wall.y - bounce.realSize - height * 0.5;
                                bounce.velocity.y = 0;
                                bounce.accel.y = Math.min(bounce.accel.y, 0);
                            } else {
                                bounce.y = wall.y + bounce.realSize + height * 0.5;
                                bounce.velocity.y = 0;
                                bounce.accel.y = Math.max(bounce.accel.y, 0);
                            }
                        }
        
                        if (!bounce.godmode && !bounce.settings.bounceOnObstacles && (bounce.type === "bullet" || bounce.type === "swarm" || bounce.type === "trap" || (bounce.type === "food" && !bounce.isNestFood) || bounce.type === "minion" || bounce.type === "drone")) {
                            bounce.kill();
                        } else room.wallCollisions.push({
                            id: bounce.id
                        });
                        bounce.collisionArray.push(wall);
                    }
                }*/

                function moonCollide(moon, n) {
                    let dx = moon.x - n.x,
                        dy = moon.y - n.y,
                        d2 = dx * dx + dy * dy,
                        totalRadius = moon.realSize + n.realSize;
                    if (d2 > totalRadius * totalRadius) {
                        return;
                    }
                    let dist = Math.sqrt(d2),
                        sink = totalRadius - dist;
                    dx /= dist;
                    dy /= dist;
                    n.accel.x -= dx * n.pushability * 0.05 * sink * room.speed;
                    n.accel.y -= dy * n.pushability * 0.05 * sink * room.speed;
                }

                const growOnCollision = (instance, other) => {
                    if (instance.SIZE >= other.SIZE) {
                        instance.SIZE += 7;
                        other.kill();
                    } else {
                        other.SIZE += 7;
                        instance.kill();
                    }
                };

                return (instance, other) => {
                    if (
                        // Ghost busting
                        instance.isGhost || other.isGhost ||
                        // Passive bullshit
                        instance.passive || other.passive ||
                        // Passive bullshit
                        instance.isObserver || other.isObserver ||
                        // Inactive should be ignored
                        !instance.isActive || !other.isActive ||
                        // Multi-Room mechanics
                        (c.SANDBOX && instance.sandboxId !== other.sandboxId) ||
                        (!instance.roomLayerless && !other.roomLayerless && instance.roomLayer !== other.roomLayer) ||
                        // Forced no collision
                        instance.settings.hitsOwnType === "forcedNever" || other.settings.hitsOwnType === "forcedNever" ||
                        // Same master collisions
                        instance.master === other || other.master === instance
                    ) {
                        return;
                    }

                    if (instance.x === other.x && instance.y === other.y) {
                        instance.x += other.size;
                        instance.y += other.size;
                        other.x -= other.size;
                        other.y -= other.size;
                        return;
                    }

                    let isSameTeam = (instance.team === other.team);

                    switch (true) {
                        // Passive mode collisions
                        case (instance.passive || other.passive): {
                            if (instance.passive && other.passive && instance.settings.hitsOwnType === other.settings.hitsOwnType) {
                                switch (instance.settings.hitsOwnType) {
                                    case "mountain":
                                        if (instance.master.id === other.master.id) growOnCollision(instance, other);
                                    case "push":
                                        if (instance.master.id === other.master.id) advancedCollide(instance, other, false, false);
                                        break;
                                    case "hard":
                                        firmCollide(instance, other);
                                        break;
                                    case "hardWithBuffer":
                                        if (instance.master.id === other.master.id) firmCollide(instance, other, 30);
                                        break;
                                    case "hardOnlyDrones":
                                        if (instance.master.id === other.master.id) firmCollide(instance, other);
                                        break;
                                }
                            }
                        } break;
                        // Dominator/Mothership collisions
                        case (isSameTeam && (instance.settings.hitsOwnType === "pushOnlyTeam" || other.settings.hitsOwnType === "pushOnlyTeam")): {
                            if (instance.settings.hitsOwnType === other.settings.hitsOwnType) return;
                            let pusher = instance.settings.hitsOwnType === "pushOnlyTeam" ? instance : other,
                                entity = instance.settings.hitsOwnType === "pushOnlyTeam" ? other : instance;
                            if (entity.settings.goThruObstacle || entity.type !== "tank" || entity.settings.hitsOwnType === "never") return;
                            if (entity.settings.isHelicopter) {
                                if (!entity.godmode && !entity.invuln) {
                                    if (!entity.theGreatestPlan) {
                                        entity.rewardManager(-1, "the_greatest_plan");
                                        entity.theGreatestPlan = true;
                                    }
                                    entity.health.amount -= 1;
                                }
                                return;
                            }
                            let a = 1 + 10 / (Math.max(entity.velocity.length, pusher.velocity.length) + 10);
                            advancedCollide(pusher, entity, false, false, a);
                        } break;
                        // Normal Obstacle collisions
                        case (instance.type === "wall" || other.type === "wall"): {
                            let wall = instance.type === "wall" ? instance : other,
                                entity = instance.type === "wall" ? other : instance;
                            if (entity.settings.diesByObstacles) return entity.kill();
                            if (entity.settings.goThruObstacle || entity.type === "mazeWall" || entity.isDominator) return;
                            if (entity.settings.isHelicopter && !entity.godmode && !entity.invuln) {
                                if (!entity.theGreatestPlan) {
                                    entity.rewardManager(-1, "the_greatest_plan");
                                    entity.theGreatestPlan = true;
                                }
                                entity.health.amount -= 1;
                                return;
                            }
                            let a = entity.type === "bullet" || entity.type === "trap" ? 1 + 10 / (Math.max(entity.velocity.length, wall.velocity.length) + 10) : 1;
                            wall.shape === 0 ? moonCollide(wall, entity) : advancedCollide(wall, entity, false, false, a);
                        } break;
                        // Shield collisions
                        case (instance.settings.hitsOwnType === "shield" || other.settings.hitsOwnType === "shield"): {
                            if (isSameTeam || instance.master.id === other.master.id) return;
                            let shield = instance.settings.hitsOwnType === "shield" ? instance : other,
                                entity = instance.settings.hitsOwnType === "shield" ? other : instance;
                            if (entity.settings.goThruObstacle || entity.type === "wall" || entity.type === "food" || entity.type === "mazeWall" || entity.type === "miniboss" || entity.isDominator || entity.master.isDominator || shield.master.id === entity.id) return;
                            shieldCollide(shield, entity);
                            //advancedCollide(shield, entity, false, false, -1 - 10 / (Math.max(entity.velocity.length, shield.master.velocity.length) - 10));
                        } break;
                        // Maze Wall collisions
                        case (instance.type === "mazeWall" || other.type === "mazeWall"): {
                            if (instance.type === other.type) return;
                            let wall = instance.type === "mazeWall" ? instance : other,
                                entity = instance.type === "mazeWall" ? other : instance;
                            if (entity.settings.goThruObstacle || entity.type === "wall" || entity.isDominator /* || entity.type === "crasher"*/) return;
                            rectWallCollide(wall, entity);
                        } break;
                        // Crasher and Polygon collisions
                        case (instance.type === "crasher" && other.type === "food" || other.type === "crasher" && instance.type === "food"): {
                            firmCollide(instance, other);
                        } break;
                        // Player collision
                        case (!isSameTeam && !instance.hitsOnlyTeam && !other.hitsOnlyTeam):
                        case (isSameTeam && (instance.hitsOnlyTeam || other.hitsOnlyTeam) && instance.master.source.id !== other.master.source.id): {
                            advancedCollide(instance, other, true, false);
                        } break;
                        // Never collide
                        case (instance.settings.hitsOwnType === "never" || other.settings.hitsOwnType === "never"): { } break;
                        // Standard collision
                        case (instance.settings.hitsOwnType === other.settings.hitsOwnType && !instance.multibox.enabled && !other.multibox.enabled): {
                            switch (instance.settings.hitsOwnType) {
                                case "mountain":
                                    if (instance.master.id === other.master.id) growOnCollision(instance, other);
                                case "push":
                                    advancedCollide(instance, other, false, false);
                                    break;
                                case "hard":
                                    firmCollide(instance, other);
                                    break;
                                case "hardWithBuffer":
                                    if (instance.master.id === other.master.id) firmCollide(instance, other, 30);
                                    break;
                                case 'spike':
                                    spikeCollide(instance, other)
                                    break
                                case "hardOnlyDrones":
                                    if (instance.master.id === other.master.id) firmCollide(instance, other);
                                    break;
                                case "hardOnlyTanks":
                                    if (
                                        (
                                            (instance.type === "tank" && other.type === "tank") ||
                                            instance.miscIdentifier === 'Rogue Egg' ||
                                            other.miscIdentifier === 'Rogue Egg'
                                        ) &&
                                        !instance.isDominator &&
                                        !other.isDominator &&
                                        !instance.isInMyBase() &&
                                        !other.isInMyBase()
                                    ) firmCollide(instance, other);
                                    break;
                                case "repel":
                                    simpleCollide(instance, other);
                                    break;
                            }
                        }
                    }
                    if (instance.onCollide) {
                        instance.onCollide(instance, other)
                    }
                    if (other.onCollide) {
                        other.onCollide(other, instance)
                    }
                };
            })();
            const entitiesLiveLoop = my => {
                if (room.wallCollisions.length) {
                    let walls = room.wallCollisions.filter(collision => collision.id === my.id);
                    if (walls.length > 1) {
                        let collides = walls.some(wall => wall.justForceIt);
                        if (!collides) {
                            for (let i = 1; i < walls.length; i++) {
                                if ((walls[0].left && walls[i].right) || (walls[0].right && walls[i].left) || (walls[0].top && walls[i].bottom) || (walls[0].bottom && walls[i].top)) {
                                    collides = true;
                                    break;
                                }
                            }
                        }
                        if (collides) {
                            if (my.type !== "tank" && my.type !== "miniboss") {
                                my.killedByWalls = true;
                                my.kill();
                            }
                            my.health.amount -= 1;
                            if (my.health.amount <= 0) {
                                my.invuln = my.passive = my.godmode = false;
                                my.killedByWalls = true;
                            }
                        }
                    }
                }
                if (my.death()) {
                    my.destroy();
                    return false;
                } else {
                    if (my.bond == null) {
                        my.physics();
                    }
                    my.life();
                    my.location();
                    my.friction();
                    my.lastSavedHealth = {
                        health: my.health.amount,
                        shield: my.shield.amount
                    };
                    return true;
                }
            };
            return () => {
                let start = performance.now();
                // Update sandbox rooms if we have to
                if (c.SANDBOX) {
                    global.sandboxRooms.forEach(({ id }) => {
                        if (!clients.find(entry => entry.sandboxId === id)) {
                            global.sandboxRooms = global.sandboxRooms.filter(entry => entry.id !== id);
                            entities.forEach(o => {
                                if (o.sandboxId === id) {
                                    o.kill();
                                }
                            });
                        }
                    });
                }

                for (let entity of entities) {
                    if (!entity.isActive) return true;
                    entitiesLiveLoop(entity)
                    entity.collisionArray.length = 0;
                }

                grid.clear();
                entities.filterToChain(entity => {
                    entity.deactivation();
                    if (!entity.isActive) return true;

                    if (entity.isGhost === true) return false;
                    if (entity.neverInGrid === true) return true;
                    entity._AABB = grid.getAABB(entity);
                    grid.insert(entity);
                    grid.getCollisions(entity, (other) => {
                        collide(entity, other);
                    });
                    return true;
                });

                lasers.forEach((laser) => {
                    laser.tick();
                })

                room.wallCollisions = []


                // End smortness
                /*// Do collision
                if (entities.length > 1) {
                    room.wallCollisions = [];
                    grid.update();
                    grid.queryForCollisionPairs(collide);
                };
                // Update entities
                targetableEntities = targetableEntities.filter(my => my.isAlive() && !my.isDead() && !my.passive && !my.invuln && my.health.amount > 0 && Number.isFinite(my.dangerValue) && my.team !== -101);
                for (let i = 0, l = entities.length; i < l; i++) {
                    entitiesLiveLoop(entities[i]);
                }*/

                for (let mode of c.modes) {
                    modeFuncs[mode].runTick({ entities: entities, sockets: sockets })
                }

                room.lastCycle = util.time();
                room.mspt = (performance.now() - start);
                room.lagComp = Math.min(5, Math.max(1, room.mspt / room.cycleSpeed))
                const border = 2150
                if (c.serverName.includes("Boss Rush") && c.ISSIEGE) {
                    entities.forEach(entity => {
                        if (entity.x < border && entity.team != -100 && !entity.passive && !entity.godmode) { entity.kill()/*entity.x += 15*/ }
                        if (entity.type == 'miniboss' && entity.x < 5500) { entity.x += Math.random() * 1.5 }
                        if (entity.x < border) { entity.x = (c.WIDTH - border) * Math.random() + border }
                        if (entity.label.includes("Ascended") && entity.x < border) { entity.x = (c.WIDTH - border) * Math.random() + border }//fix ascended stuff not moving
                    })
                }
            };
        })();

        const maintainLoop = (() => {
            global.placeObstacles = () => {
                if (room.modelMode) return;
                if (c.ARENA_TYPE === 1) {
                    let o = new Entity({
                        x: room.width / 2,
                        y: room.height / 2
                    });
                    o.define(Class.moon);
                    o.roomLayerless = true;
                    o.settings.hitsOwnType = "never";
                    o.team = -101;
                    o.protect();
                    o.life();
                }
                const place = (loc, type) => {
                    if (!type) return;
                    let x = 0,
                        position;
                    do {
                        position = room.randomType(loc);
                        x++;
                        if (x > 200) {
                            util.warn("Failed to place obstacles!");
                            return 0;
                        }
                    } while (dirtyCheck(position, 10 + type.SIZE));
                    let o = new Entity(position);
                    o.define(type);
                    o.roomLayerless = true
                    o.team = -101;
                    o.facing = ran.randomAngle();
                    o.protect();
                    o.life();
                }
                let roidCount = room.roid.length * room.width * room.height / room.xgrid / room.ygrid / 5e4 / 1.5,
                    rockCount = room.rock.length * room.width * room.height / room.xgrid / room.ygrid / 25e4 / 1.5,
                    count = 0;
                for (let i = Math.ceil(roidCount * .2); i; i--) {
                    count++;
                    place("roid", Class.megaObstacle);
                }
                for (let i = Math.ceil(roidCount); i; i--) {
                    count++;
                    place("roid", Class.obstacle);
                }
                for (let i = Math.ceil(roidCount * .4); i; i--) {
                    count++;
                    place("roid", Class.babyObstacle);
                }
                for (let i = Math.ceil(rockCount * .1); i; i--) {
                    count++;
                    place("rock", Class.megaObstacle);
                }
                for (let i = Math.ceil(rockCount * .2); i; i--) {
                    count++;
                    place("rock", Class.obstacle);
                }
                for (let i = Math.ceil(rockCount * .4); i; i--) {
                    count++;
                    place("rock", Class.babyObstacle);
                }
                //util.log("Placed " + count + " obstacles.");
            }
            global.generateMaze = roomId => {
                let locsToAvoid = c.MAZE.LOCS_TO_AVOID != null ? c.MAZE.LOCS_TO_AVOID : ["roid", "rock", "port", "domi", "edge"].concat(nestList[1]);
                for (let i = 1; i < 5; i++) locsToAvoid.push("bas" + i), locsToAvoid.push("n_b" + i), locsToAvoid.push("bad" + i), locsToAvoid.push("dom" + i);
                function makeMaze(config = {}) {
                    ////// Config
                    const cellSize = config.cellSize || 500
                    const stepOneSpacing = config.stepOneSpacing || 2
                    const stepTwoFillChance = config.fillChance || 0
                    const stepThreeSparedChance = config.sparedChance || 0
                    const stepFourCavey = config.cavey || false
                    const stepFiveLineAmount = config.lineAmount || false
                    const posMulti = config.posMulti || 0.25
                    const margin = config.margin || 0

                    const widthCellAmount = Math.floor(room.width / cellSize)
                    const heightCellAmount = Math.floor(room.height / cellSize)
                    let maze = [];
                    for (let i = 0; i < heightCellAmount; i++) {
                        maze.push((new Array(widthCellAmount)).fill(0))
                    }
                    ////// Creation
                    //// Place the cells
                    for (let y = 0; y < maze.length; y++) {
                        for (let x = 0; x < maze[0].length; x++) {
                            if (x % (1 + stepOneSpacing) === 0) {
                                if (maze[y * (stepOneSpacing + 1)]) maze[y * (stepOneSpacing + 1)][x] = 1
                            } else {
                                if (Math.random() < stepTwoFillChance) {
                                    maze[y][x] = 1
                                }
                            }
                        }
                    }
                    //// Cull and fill the cells
                    for (let y = 0; y < maze.length; y++) {
                        for (let x = 0; x < maze[0].length; x++) {
                            if (maze[y][x] === 1) {
                                let hasNeighbors = false
                                if (
                                    (maze[y - 1] !== undefined && maze[y - 1][x]) ||
                                    (maze[y + 1] !== undefined && maze[y + 1][x]) ||
                                    (maze[y][x - 1] !== undefined && maze[y][x - 1]) ||
                                    (maze[y][x + 1] !== undefined && maze[y][x + 1])
                                ) {
                                    hasNeighbors = true
                                }
                                if (!hasNeighbors && Math.random() > stepThreeSparedChance) {
                                    maze[y][x] = 0
                                }
                            } else { // maze[y][x] === 0
                                let missingNeighbors = 0
                                let missedNeighbor = [0, 0] // y, x
                                if (maze[y - 1] !== undefined && stepFourCavey != maze[y - 1][x]) {
                                    missingNeighbors++
                                    missedNeighbor = [-1, 0]
                                }
                                if (maze[y + 1] !== undefined && stepFourCavey != maze[y + 1][x]) {
                                    missingNeighbors++
                                    missedNeighbor = [1, 0]
                                }
                                if (maze[y][x - 1] !== undefined && stepFourCavey != maze[y][x - 1]) {
                                    missingNeighbors++
                                    missedNeighbor = [0, -1]
                                }
                                if (maze[y][x + 1] !== undefined && stepFourCavey != maze[y][x + 1]) {
                                    missingNeighbors++
                                    missedNeighbor = [0, 1]
                                }
                                if (stepFourCavey ? missingNeighbors <= 1 : missingNeighbors >= 3) {
                                    maze[y][x] = 1
                                    maze[y + missedNeighbor[0]][x + missedNeighbor[1]] = 1
                                    y = 0
                                    x = 0
                                }
                            }
                        }
                    }

                    //// Empty out specified areas
                    for (let y = 0; y < maze.length; y++) {
                        for (let x = 0; x < maze[0].length; x++) {
                            if (margin) {
                                // Margins
                                if (y <= margin) { // top
                                    maze[y][x] = 0
                                }
                                if (y >= maze.length - 1 - margin) { // bottom
                                    maze[y][x] = 0
                                }
                                if (x <= margin) { // left
                                    maze[y][x] = 0
                                }
                                if (x >= maze[0].length - 1 - margin) { // right
                                    maze[y][x] = 0
                                }
                            }
                            // Locs to avoid
                            let realSize = cellSize / 2
                            for (let loc of locsToAvoid) {
                                if (room.isIn(loc, {
                                    x: (x * cellSize + realSize) + cellSize * posMulti,
                                    y: (y * cellSize + realSize) + cellSize * posMulti
                                })) {
                                    maze[y][x] = 0
                                }
                            }
                        }
                    }

                    //// Connect all the empty cells
                    // Setup
                    let tangents = {
                        ID_PICKER: 20
                    }
                    function getConnectedEmpties(y, x, tangentid) {
                        maze[y][x] = tangentid
                        tangents[tangentid].amount++
                        if (maze[y + 1] !== undefined && maze[y + 1][x] === 0) {
                            getConnectedEmpties(y + 1, x, tangentid)
                        }
                        if (maze[y - 1] !== undefined && maze[y - 1][x] === 0) {
                            getConnectedEmpties(y - 1, x, tangentid)
                        }
                        if (maze[y]?.[x + 1] !== undefined && maze[y][x + 1] === 0) {
                            getConnectedEmpties(y, x + 1, tangentid)
                        }
                        if (maze[y]?.[x - 1] !== undefined && maze[y][x - 1] === 0) {
                            getConnectedEmpties(y, x - 1, tangentid)
                        }
                    }
                    // Identify and record each tangent
                    for (let y = 0; y < maze.length; y++) {
                        for (let x = 0; x < maze[0].length; x++) {
                            if (maze[y][x] === 0) {
                                let tangentid = tangents.ID_PICKER
                                tangents.ID_PICKER += 20
                                tangents[tangentid] = {
                                    amount: 0,
                                    point: [y, x] // [y, x]
                                }
                                getConnectedEmpties(y, x, tangentid)
                            }
                        }
                    }
                    delete tangents.ID_PICKER
                    // Connect or fill the empty cells
                    if (stepFiveLineAmount === false) { // Fill
                        let largestTangent = {
                            id: undefined,
                            amount: 0
                        };
                        for (let key in tangents) {
                            let data = tangents[key]
                            if (data.amount > largestTangent.amount) {
                                largestTangent.id = key
                                largestTangent.amount = data.amount
                            }
                        }
                        for (let y = 0; y < maze.length; y++) {
                            for (let x = 0; x < maze[0].length; x++) {
                                if (maze[y][x] > 1 && maze[y][x] != largestTangent.id) {
                                    maze[y][x] = 1
                                }
                            }
                        }
                    } else { // Connect
                        function bresenham(startX, startY, endX, endY) {
                            const deltaCol = Math.abs(endX - startX)
                            const deltaRow = Math.abs(endY - startY)
                            let pointX = startX
                            let pointY = startY
                            const horizontalStep = (startX < endX) ? 1 : -1
                            const verticalStep = (startY < endY) ? 1 : -1
                            const points = []
                            let difference = deltaCol - deltaRow
                            while (true) {
                                const doubleDifference = 2 * difference
                                if (doubleDifference > -deltaRow) {
                                    difference -= deltaRow;
                                    pointX += horizontalStep
                                } else if (doubleDifference < deltaCol) {
                                    difference += deltaCol;
                                    pointY += verticalStep
                                }
                                if ((pointX == endX) && (pointY == endY)) {
                                    break
                                }
                                points.push([pointY, pointX])
                            }
                            return points
                        }
                        for (let key in tangents) {
                            let data = tangents[key]
                            let usedkeys = new Set()
                            usedkeys.add(key)
                            for (let i = 0; i < stepFiveLineAmount; i++) {
                                let shortestTangent = {
                                    id: undefined,
                                    dist: Infinity,
                                    point: undefined
                                };
                                for (let key2 in tangents) {
                                    if (usedkeys.has(key2)) continue;
                                    let data2 = tangents[key2]
                                    let dist = Math.sqrt((Math.pow(data.point[1] - data2.point[1], 2)) + (Math.pow(data.point[0] - data2.point[0], 2)))
                                    if (dist < shortestTangent.dist) {
                                        shortestTangent.id = key2
                                        shortestTangent.dist = dist
                                        shortestTangent.point = data2.point
                                    }
                                }
                                if (!shortestTangent.id) { // We are out of tangents
                                    break;
                                }
                                usedkeys.add(shortestTangent.id)
                                let points = bresenham(data.point[1], data.point[0], shortestTangent.point[1], shortestTangent.point[0])
                                for (let point of points) {
                                    maze[point[0]][point[1]] = 0
                                }
                            }
                        }
                    }// Normalize the tangents
                    for (let y = 0; y < maze.length; y++) {
                        for (let x = 0; x < maze[0].length; x++) {
                            if (maze[y][x] > 1) maze[y][x] = 0
                        }
                    }

                    //// Merge the maze walls
                    let proxyGrid = []
                    for (let part of maze) {
                        proxyGrid.push(new Array(part.length).fill(0))
                    }
                    let rects = {
                        ID: 1
                    }
                    function fillRect(y, x, id) {
                        if (
                            x < 0 || y < 0 ||
                            x >= proxyGrid[0].length || y >= proxyGrid.length ||
                            maze[y][x] !== 1 || proxyGrid[y][x] !== 0 ||
                            x > rects[id].maxX || y > rects[id].maxY
                        ) return;

                        proxyGrid[y][x] = id;

                        if (maze[y + 1]?.[x] === 0 || (proxyGrid[y + 1]?.[x] !== 0 && proxyGrid[y][x + 1] !== id)) {
                            rects[id].maxY = y
                        }
                        if (maze[y][x + 1] === 0 || (proxyGrid[y][x + 1] !== 0 && proxyGrid[y][x + 1] !== id)) {
                            rects[id].maxX = x
                        }

                        fillRect(y, x + 1, id); // Right
                        fillRect(y + 1, x, id); // Down
                    }

                    for (let y = 0; y < maze.length; y++) {
                        for (let x = 0; x < maze[0].length; x++) {
                            if (maze[y][x] !== 1 || proxyGrid[y][x] !== 0) continue;

                            let id = rects.ID++
                            rects[id] = {
                                maxX: proxyGrid[0].length - 1,
                                maxY: proxyGrid.length - 1
                            }
                            fillRect(y, x, id);
                            // clean up spillage
                            for (let y2 = 0; y2 < proxyGrid.length; y2++) {
                                for (let x2 = 0; x2 < proxyGrid[0].length; x2++) {
                                    if (proxyGrid[y2][x2] !== id) continue;
                                    if (y2 > rects[id].maxY) {
                                        proxyGrid[y2][x2] = 0;
                                        continue;
                                    }
                                    if (x2 > rects[id].maxX) {
                                        proxyGrid[y2][x2] = 0;
                                        continue;
                                    }
                                }
                            }

                        }
                    }

                    // gather the wall data
                    let handledIds = new Set()
                    handledIds.add(0)
                    for (let y = 0; y < proxyGrid.length; y++) {
                        for (let x = 0; x < proxyGrid[0].length; x++) {
                            if (handledIds.has(proxyGrid[y][x])) continue;
                            handledIds.add(proxyGrid[y][x])
                            rects[proxyGrid[y][x]].firstOccurrence = [y, x]
                        }
                    }
                    delete rects.ID

                    //// Place the walls
                    for (let key in rects) {
                        let wallData = rects[key]

                        let width = 1 + wallData.maxX - wallData.firstOccurrence[1]
                        let height = 1 + wallData.maxY - wallData.firstOccurrence[0]
                        let x = wallData.firstOccurrence[1] * cellSize
                        let y = wallData.firstOccurrence[0] * cellSize
                        let realSize = cellSize / 2

                        let o = new Entity({
                            x: (x + realSize * width) + cellSize * posMulti,
                            y: (y + realSize * height) + cellSize * posMulti
                        });
                        o.define(Class.mazeObstacle);
                        o.roomLayerless = true;
                        o.SIZE = realSize
                        o.width = width + 0.05
                        o.height = height + 0.05
                        o.team = -101;
                        o.alwaysActive = true;
                        o.isActive = true;
                        o.settings.canGoOutsideRoom = true;
                        o.godmode = true
                        o.protect();
                        o.life();
                    }
                }
                makeMaze(c.MAZE)
            }
            if (!room.modelMode) placeObstacles();
            if (c.MAZE.ENABLED) {
                global.generateMaze();
            }

            function newSpawnBosses(census) {
                const bossClasses = [
                    // 0: Elites
                    [{
                        bosses: [
                            Class.alphaSentryAI,
                            Class.atriumAI,
                            Class.cutterAI,
                            Class.eliteBasicAI,
                            Class.eliteBattleshipAI,
                            Class.eliteBorerAI,
                            Class.eliteDestroyerAI,
                            Class.eliteDirectorAI,
                            Class.eliteEngieAI,
                            Class.eliteGunnerAI,
                            Class.eliteInfernoAI,
                            Class.eliteMachineAI,
                            Class.elitePelleterAI,
                            Class.eliteRailgunAI,
                            Class.eliteShrapnelAI,
                            Class.eliteSidewindAI,
                            Class.eliteSniperAI,
                            Class.eliteSprayerAI,
                            Class.eliteTrapAI,
                            Class.eliteTwinAI,
                            (ran.dice(150)) ? Class.goldenMladicAI : Class.mladicAI,
                            Class.terrorhedronAI
                        ],
                        amount: ran.irandomRange(1, 3),
                        name_pool: 'a',
                        spawns_at: room.presentNests,
                        broadcast: `By the orders of Lady Artemis…`,
                        chance: 70,
                    }, {
                        bosses: [
                            Class.eliteCarpenterAI,
                            Class.eliteRifleAI2,
                            Class.ultimateAI
                        ],
                        amount: 1,
                        name_pool: 'a',
                        spawns_at: room.presentNests,
                        broadcast: `The elites have something prepared…`,
                        chance: 30
                    }],
                    // 1: Crashers
                    [{
                        bosses: [
                            Class.eliteMinesweeperAI,
                            Class.guardianAI,
                            Class.leviathanAI,
                            Class.magnetarAI,
                            Class.metalCrasherBossAI,
                            Class.pulsarAI,
                            Class.quasarAI,
                            (ran.dice(150)) ? Class.goldStreakAI : Class.streakAI,
                            Class.trapeFighterAI,
                            Class.trapperzoidAI
                        ],
                        amount: ran.irandomRange(2, 4),
                        name_pool: 'c',
                        spawns_at: room.presentNests,
                        chance: 26
                    }, {
                        bosses: [
                            Class.at4_bwAI,
                            Class.cranberryGuardianAI,
                            Class.colliderAI,
                            Class.curveplexAI,
                            Class.greenGuardianAI,
                            Class.hb3_37AI,
                            Class.lavenderGuardianAI,
                            Class.orbitalspaceAI,
                            Class.purifierBossAI,
                            Class.rs1AI,
                            Class.tealGuardianAI,
                            Class.sliderAI,
                            Class.terminatorBossAI,
                            Class.vanguardAI
                        ],
                        amount: ran.irandomRange(2, 3),
                        name_pool: 'c',
                        spawns_at: room.presentNests,
                        chance: 23
                    }, {
                        bosses: [
                            Class.bluestarAI,
                            Class.deltrabladeAI,
                            Class.fueronAI,
                            Class.gunshipAI,
                            Class.icecolliderAI,
                            Class.kioskAI,
                            Class.morningstarAI,
                            Class.neutronStarAIWeak,
                            Class.visUltimaAI
                        ],
                        amount: ran.irandomRange(1, 3),
                        name_pool: 'c',
                        spawns_at: room.presentNests,
                        chance: 20
                    }, {
                        bosses: [
                            Class.carryingGunshipAI,
                            Class.greendeltrabladeAI,
                            Class.torchMorningstarAIWeak
                        ],
                        amount: ran.irandomRange(1, 2),
                        name_pool: 'c',
                        spawns_at: room.presentNests,
                        chance: 17
                    }, {
                        bosses: [
                            Class.aquamarineAI,
                            Class.industrianAIWeak
                        ],
                        amount: 1,
                        name_pool: 'c',
                        spawns_at: room.presentNests,
                        chance: 14
                    }],
                    // 2: Polygons
                    [{
                        bosses: [
                            Class.eggBossTier1AI,
                            Class.eggQueenTier1AI,
                            Class.eggSpiritTier1AI,
                            Class.ultraCannonAI
                        ],
                        amount: ran.irandomRange(1, 4),
                        name_pool: 'b',
                        spawns_at: 'norm',
                        broadcast: `A strange trembling…`,
                        chance: 24
                    }, {
                        bosses: [
                            Class.bowAI,
                            Class.eliteDustbowlAI,
                            Class.mk1AI,
                            Class.splitterSummoner,
                            Class.squareNestKeeperAI
                        ],
                        amount: ran.irandomRange(1, 3),
                        name_pool: 'b',
                        spawns_at: ['norm', '#EFC74B'],
                        broadcast: `A strange trembling…`,
                        chance: 21
                    }, {
                        bosses: [
                            Class.defenderAI,
                            Class.redBurstAI,
                            Class.skimbossAI,
                            Class.tk1AI,
                            Class.triangleNestKeeperAI,
                            Class.triSeekerAI
                        ],
                        amount: ran.irandomRange(1, 3),
                        name_pool: 'b',
                        spawns_at: ['norm', '#E7896D'],
                        broadcast: `A strange trembling…`,
                        chance: 18
                    }, {
                        bosses: [
                            Class.nestKeeperAI,
                            Class.pentagonBossTier1AI
                        ],
                        amount: ran.irandomRange(1, 2),
                        name_pool: 'b',
                        spawns_at: ['norm', 'nest'],
                        broadcast: `A strange trembling…`,
                        chance: 15
                    }, {
                        bosses: [
                            Class.demolisherAI,
                            Class.hexagonBossTier1AI,
                            Class.hexagonNestKeeperAI
                        ],
                        amount: ran.irandomRange(1, 2),
                        name_pool: 'b',
                        spawns_at: ['norm', '#7ADBBC'],
                        broadcast: `A strange trembling…`,
                        chance: 12
                    }, {
                        bosses: [
                            Class.heptagonNestKeeperAI,
                            Class.octagonNestKeeperAI,
                            Class.xyvAI
                        ],
                        amount: 1,
                        name_pool: 'b',
                        spawns_at: 'norm',
                        broadcast: `A strange trembling…`,
                        chance: 10
                    }],
                    // 3: Undeads
                    [{
                        bosses: [
                            Class.fallenAutoTankAI,
                            Class.fallenBoosterAI,
                            Class.fallenCavalcadeAI,
                            Class.fallenDesperadoAI,
                            Class.fallenDirigibleAI,
                            Class.fallenDrifterAI,
                            Class.fallenFighterAI,
                            Class.fallenFlamethrowerAI,
                            Class.fallenHybridAI,
                            Class.fallenOctoAI,
                            Class.fallenOverlordAI,
                            Class.fallenPentaAI,
                            Class.fallenPistonAI,
                            Class.fallenRangerAI,
                            Class.fallenUziAI
                        ],
                        amount: ran.irandomRange(2, 4),
                        name_pool: 'legacy',
                        spawns_at: 'norm',
                        broadcast: `The dead are rising…`,
                        chance: 65
                    }, {
                        bosses: [
                            Class.reanimBiohazardAI,
                            Class.reanimCacheAI,
                            Class.reanimCorpsAI,
                            Class.reanimFarmerAI,
                            Class.reanimGasserAI,
                            Class.reanimHeptaTrapAI,
                            Class.reanimKnightAI,
                            Class.reanimOverfireAI,
                            Class.reanimPentaBlasterAI
                        ],
                        amount: ran.irandomRange(1, 3),
                        name_pool: 'legacy',
                        spawns_at: 'norm',
                        broadcast: `Many had sought for the day that they would return… Just not in this way…`,
                        chance: 35
                    }],
                    // 4: Splitters
                    [{
                        bosses: [
                            Class.bowAI,
                            Class.constAI,
                            Class.snowflakeAI,
                            Class.splitterSummoner,
                            Class.vivisectionAI,
                            Class.xyvAI
                        ],
                        amount: ran.irandomRange(1, 2),
                        name_pool: 'castle',
                        spawns_at: 'norm',
                        chance: 50
                    }, {
                        bosses: [
                            Class.colliderAI,
                            Class.icecolliderAI,
                            Class.neutronStarAIWeaker,
                            Class.redBurstAI
                        ],
                        amount: ran.irandomRange(1, 2),
                        name_pool: 'castle',
                        spawns_at: 'nest',
                        chance: 50
                    }],
                    // 5: Artificials
                    [{
                        bosses: [
                            Class.bitskriegAI,
                            Class.jetBossAI,
                            Class.pentafrasAI,
                            Class.sarfassasAI,
                            Class.sassafrasAI,
                            Class.superbirdAI,
                            Class.tetrafrasAI,
                            Class.ultMultitoolAI
                        ],
                        amount: ran.irandomRange(1, 3),
                        name_pool: 'castle',
                        spawns_at: ["roid", "rock"],
                        chance: 100
                    }],
                    // 6: Mysticals
                    [{
                        bosses: [
                            Class.arcanistAI,
                            Class.enchantressAI,
                            Class.exorcistorAI,
                            Class.invokeAI,
                            Class.occultAI,
                            Class.runecastAI,
                            Class.shamanAI,
                            Class.sorcererAI,
                            Class.summonerAI
                        ],
                        amount: 2,
                        name_pool: 'a-z',
                        spawns_at: 'norm',
                        chance: 100
                    }],
                    // 7: Army
                    [{
                        bosses: [
                            Class.armySentryGunAI,
                            Class.armySentryRangerAI,
                            Class.armySentrySwarmAI,
                            Class.armySentryTrapAI
                        ],
                        amount: ran.irandomRange(20, 50),
                        name_pool: 'c',
                        spawns_at: room.presentNests,
                        broadcast: `Sentries unite…`,
                        arrival: `The Sentry Army has arrived!`,
                        chance: 100
                    }],
                    // 8: Generics
                    [{
                        bosses: [
                            Class.applicusAI,
                            Class.article13AI,
                            Class.asteroidAI,
                            Class.astraAI,
                            Class.battlegonAI,
                            Class.beggarsBaneAI,
                            Class.bitskriegAI,
                            Class.blitzkriegAI,
                            Class.cometAI,
                            Class.confidentialAI,
                            Class.conquistadorAI,
                            Class.constructionistAI,
                            Class.derogatorAI,
                            Class.dropshipBossAI,
                            Class.gegenscheinAI,
                            Class.greenGearBossAI,
                            Class.hexadecagorAI,
                            Class.hyperionAI,
                            Class.icePalisadeAI,
                            Class.kingAI,
                            Class.lavendicusAI,
                            Class.leaferBossAI,
                            Class.lemonicusAI,
                            Class.moonRabbitAIFrame0,
                            Class.nailerAI,
                            Class.octagronAI,
                            Class.octogeddonAI,
                            Class.orangicusAI,
                            Class.palisadeAI,
                            Class.puzzlePieceBossAI,
                            Class.redistributionAI,
                            Class.roguemothershipAI,
                            Class.spreaderBossAI,
                            Class.thunderstormAI,
                            Class.trapDwellerAI,
                            Class.ultMultitoolAI,
                            Class.ultraPuntAI,
                            Class.vacuoleAI,
                            Class.youkaiBossAIFrame31
                        ],
                        amount: ran.irandomRange(1, 3),
                        name_pool: 'all',
                        spawns_at: 'random',
                        chance: 100
                    }]
                ];

                function chooseBossClass(classes) {
                    let choice = classes[Math.floor(Math.random() * classes.length)];
                    let random = Math.random() * 100 + 1;
                    let chanceAmount = choice[0].chance;
                    let i;

                    for (i = 0; i < choice.length; i++) {
                        if (chanceAmount > random) break;
                        chanceAmount += choice[i + 1].chance;
                    }

                    return choice[i];
                };
                function buildArrival(names, amount, override) {
                    let message = "";
                    
                    if (override.length) {
                        message = override;
                    } else {
                        if (amount === 1) {
                            message = names[0] + " has arrived!";
                        } else {
                            for (let i = 0; i < amount - 2; i++) message += names[i] + ", ";
                            message += names[amount - 2] + " and " + names[amount - 1] + " have arrived!";
                        }
                    }

                    return message;
                };

                if (room.bossTimer > c.BOSS_SPAWN_TIMER && ran.dice(3 * c.BOSS_SPAWN_TIMER - room.bossTimer)) {
                    room.bossTimer = 0;
                    
                    let chosen = chooseBossClass(bossClasses);
                    let bosses = chosen.bosses ?? [Class.genericTank],
                        amount = chosen.amount ?? 1,
                        name_pool = chosen.name_pool ?? '',
                        location = chosen.spawns_at ?? 'norm',
                        broadcast = chosen.broadcast ?? '',
                        arrival = chosen.arrival ?? '';
                    let bossNames = ran.chooseBossName(name_pool, amount),
                        arrivalNames = [];
                    
                    if (broadcast.length) sockets.broadcast(broadcast, '#FFEB8E');
                    setTimeout(() => {
                        sockets.broadcast((amount < 2) ? 'A boss is coming…' : 'Bosses are coming…', '#F04F54');
                        setTimeout(() => {
                            for (let n = 0; n < amount; n++) {
                                let spot, max = 150;
                                do spot = (Array.isArray(location)) ? room.randomType(ran.choose(location)) : (location === 'random') ? room.random() : room.randomType(location);
                                while (dirtyCheck(spot, 500) && max-- > 0);

                                let boss = new Entity(spot);
                                boss.team = -100;
                                boss.define(ran.choose(bosses));
                                if (!boss.name) boss.name = bossNames[n];
                                boss.miscIdentifier = "Natural Miniboss";
                                arrivalNames.push(boss.name);
                            }
                            sockets.broadcast(buildArrival(arrivalNames, amount, arrival), '#F04F54');
                        }, ran.randomRange(3500, 5000));
                    }, 3000);
                } else if (!census.naturalMiniboss) room.bossTimer++;
            };

            const SancSpawner = new Spawner([
                ["eggSanctuary", 3],
                ["squareSanctuary", 3],
                ["triSanctuary", 2],
                "pentaSanctuary",
                "hexaSanctuary",
                "crasherSanctuary",
                "snowballSanctuary",
                "bowedSanc",
                "sunKing"
            ]);
            let sancCooldown = 0
            const spawnSancs = (census, id) => {
                if (room.modelMode || (Date.now() - sancCooldown < c.TIME_BETWEEN_SANCS)) return;
                if (census.sancs < room.maxSancs) {
                    let spot,
                        max = 10;
                    do spot = room.randomType(ran.choose(["norm", "rock", "roid"].filter(t => room[t]?.length)));
                    while (dirtyCheck(spot, 120) && max-- > 0);

                    let sanc = SancSpawner.getEntity();

                    let o = new Entity(spot);
                    o.define(Class[sanc]);
                    o.team = -100;
                    o.name = "Sanctuary";
                    o.facing = ran.randomAngle();
                    let ogOnDead = o.onDead;
                    o.onDead = function(arg) {
                        sancCooldown = Date.now();
                        ogOnDead.apply(this, [arg]);
                    };
                    o.roomLayerless = true;
                    o.sandboxId = id;
					o.miscIdentifier = "Sanctuary";
					sockets.broadcast(`A ${o.label} has spawned!`);
                }
            }

            const makeNPCs = (() => {
                if (room.modelMode) return;
                if (room.bossRush) {
                    let sanctuaries = 0;
                    let spawn = (loc, team, sanc) => {
                        let o = new Entity(loc);
                        o.define(Class[team === -1 ? sanc : "dominatorNerf"]);
                        o.team = team;
                        o.color = getTeamColor(team);
                        o.skill.score = 111069;
                        o.settings.leaderboardable = false
                        o.name = "Sanctuary";
                        //o.SIZE = c.WIDTH / c.X_GRID / 10;
                        o.isDominator = true;
                        o.onDead = function () {
                            if (o.team === -100) {
                                spawn(loc, -1, sanc);
                                room.setType("bas1", loc);
                                sockets.broadcast("A sanctuary has been recaptured!");
                                if (sanctuaries < 1) {
                                    sockets.broadcast("The game is saved!");
                                }
                                sanctuaries++;
                            } else {
                                sanctuaries--;
                                if (sanctuaries < 1) {
                                    sockets.broadcast("Your team will lose in 90 seconds");
                                    function tick(i) {
                                        if (sanctuaries > 0) {
                                            return;
                                        }
                                        if (i <= 0) {
                                            sockets.broadcast("Your team has lost!");
                                            setTimeout(closeArena, 2500);
                                            return;
                                        }
                                        if (i % 15 === 0 || i <= 10) {
                                            sockets.broadcast(`${i} seconds until your team loses!`);
                                        }
                                        setTimeout(function retick() {
                                            tick(i - 1);
                                        }, 1000);
                                    }
                                    tick(91);
                                }
                                spawn(loc, -100, sanc);
                                room.setType("domi", loc);
                                sockets.broadcast("A sanctuary has been captured by the bosses!");
                            }
                        }
                    }
                    for (let loc of room["bas1"]) {
                        let sancType = ran.choose([
                            "destroyerDominatorAISanctuary",
                            "gunnerDominatorAISanctuary",
                            "trapperDominatorAISanctuary",
                            "droneDominatorAISanctuary",
                            "steamrollDominatorAISanctuary",
                            "autoDominatorAISanctuary",
                            "crockettDominatorAISanctuary",
                            "swarmerDominatorAISanctuary",
                            //"pliniDominatorAISanctuary", (Needs balancing.)
                            //"fortifiedDominatorAISanctuary", (Needs balancing.)
                            "vulcDominatorAISanctuary",
                            "hurriDominatorAISanctuary"
                        ]);
                        sanctuaries++;
                        spawn(loc, -1, sancType);
                    }
                    bossRushLoop();
                }
                if (room.gameMode === "tdm" && c.DO_BASE_DAMAGE && !room.bossRush) {//preventing base protectors spawning on domis in siege
                    let spawnBase = (loc, team, type) => {
                        let o = new Entity(loc);
                        o.define(type);
                        o.team = -team;
                        o.color = [10, 12, 11, 15, 3, 35, 36, 0][team - 1];
                        o.onDead = () => spawnBase(loc, team, type);
                    }
                    for (let i = 1; i < room.teamAmount + 1; i++) {
                        for (let loc of room["bas" + i]) {
                            spawnBase(loc, i, Class.baseProtector);
                        }
                        for (let loc of room["bad" + i]) {
                            spawnBase(loc, i, ran.choose([ // Dupes act as a weight system lo
                                Class.newBaseDroneSpawner,
                                Class.newBaseDroneSpawner,
                                Class.newBaseDroneSpawner,
                                Class.newBaseDroneSpawner,

                                Class.baseAutoDroneSpawner,
                                Class.baseAutoDroneSpawner,
                                Class.baseAutoDroneSpawner,

                                Class.baseFastDroneSpawner,
                                Class.baseFastDroneSpawner,
                                Class.baseFastDroneSpawner,

                                Class.baseMinionSpawner,
                                Class.baseMinionSpawner,

                                Class.baseSunchipSpawner,
                                Class.baseSunchipSpawner,

                                Class.baseDetDroneSpawner
                            ]));
                        }
                    }
                    if (c.SOCCER) soccer.init();
                    if (c.serverName.includes("Mothership"))
                        for (let i = 1; i < room.teamAmount + 1; i++)
                            for (let loc of room["mot" + i]) mothershipLoop(loc, i);
                }
                if ((c.serverName.includes("Domination") || c.SPAWN_DOMINATORS) && room.domi.length > 0) {
                    let domination = new Domination();
                    domination.init();
                    if (c.DOMINATOR_SHUFFLE_TIMER > 0) domination.shuffle(c.DOMINATOR_SHUFFLE_TIMER);
                }
                if (c.serverName.includes("Void Walkers")) {
                    util.log("Initializing Void Walkers")
                    voidwalkers()
                }

                for (let mode of c.modes) {
                    modeFuncs[mode].initNpcs({ Entity: Entity })
                }

                return () => {
                    if (!room.arenaClosed && !room.modelMode && !c.RANKED_BATTLE) {
                        for (let mode of c.modes) {
                            modeFuncs[mode].runNpcs()
                        }
                        if (c.SANDBOX) {
                            for (let i = 0; i < global.sandboxRooms.length; i++) {
                                let room = global.sandboxRooms[i];

                                // Do bots, remove dead ones first
                                room.bots = room.bots.filter(e => {
                                    return !e.isDead();
                                });
                                if (room.bots.length < room.botCap && !global.arenaClosed) {
                                    for (let j = room.bots.length; j < room.botCap; j++) {
                                        if (Math.random() > .5) {
                                            const bot = spawnBot(null);
                                            bot.sandboxId = room.id;
                                            room.bots.push(bot);
                                        }
                                    }
                                }
                                let botIndex = 0
                                for (let o of room.bots) {
                                    if (room.bots.length > room.botCap) {
                                        o.kill()
                                        room.bots.splice(botIndex, 1)
                                    }
                                    if (o.skill.level < 60) {
                                        o.skill.score += 35;
                                        o.skill.maintain();
                                    }
                                    if (o.upgrades.length && Math.random() > 0.5 && !o.botDoneUpgrading) {
                                        o.upgrade(Math.floor(Math.random() * o.upgrades.length));
                                        if (Math.random() > .9) {
                                            o.botDoneUpgrading = true;
                                        }
                                    }
                                    botIndex++
                                }
                            }
                        } else {

                            newSpawnBosses(room.census);
                            spawnSancs(room.census);

                            if (room.maxBots > 0) {
                                bots = bots.filter(body => !body.isGhost && body.isAlive());
                                while (bots.length < room.maxBots) spawnBot();
                                for (let o of bots) {
                                    if (o.skill.level < 60) {
                                        o.skill.score += 35;
                                        o.skill.maintain();
                                    }
                                    /*if (o.upgrades.length && Math.random() > .15 && !o.botDoneUpgrading) {
                                        o.upgrade(Math.floor(Math.random() * o.upgrades.length));
                                        if (Math.random() > .999) {
                                            o.botDoneUpgrading = true;
                                        }
                                    }*/
                                }
                            }
                        }
                    }
                };
            })();
            return () => {
                if (!room.modelMode) makeNPCs();
            };
        })();


        const minorMaintainLoop = (() => {

            const createFood = (() => {
                function spawnSingle(location, type, id) {
                    if (c.SANDBOX && global.sandboxRooms.length < 1) return {};
                    let o = new Entity(location);
                    o.define(Class[type], ran.chance(c.SHINY_CHANCE) ? { isShiny: true } : {});
                    o.roomLayerless = true;
                    // o.ACCELERATION = .015 / (o.size * 0.2);
                    o.facing = ran.randomAngle(); 
                    o.team = -100;
                    o.PUSHABILITY *= .5;
                    if (c.SANDBOX) o.sandboxId = id || ran.choose(global.sandboxRooms).id;
                    o.refreshBodyAttributes();
                    return o;
                };

                const FoodSpawner = new Spawner([
                    // Normal
                    "egg",
                    "square",
                    "triangle",
                    "pentagon"
                ])
                function spawnFood(id) {
                    let location,
                        i = 12,
                        angle = Math.random() * Math.PI * 2;
                    do {
                        if (!i--) return;
                        location = room.random();
                    } while (dirtyCheck(location, 100) && !room.isInNorm(location));
                    let x = location.x + Math.cos(angle) * (Math.random() * 50),
                        y = location.y + Math.sin(angle) * (Math.random() * 50);

                    if (!ran.chance(.05)) {
                        // Spawn groups of food
                        for (let i = 0, amount = (Math.random() * 30) | 0; i < amount; i++) {
                            spawnSingle({ x: x, y: y }, FoodSpawner.getEntity(), id);
                        }
                    } else {
                        // Spawn a special group of food
                        spawnSingle({ x: x, y: y }, "lmfaoloser", id);
                    }
                }

                const triNestSpawner = new Spawner(["nestTriangle"]);
                const squareNestSpawner = new Spawner(["nestSquare"]);
                const pentaNestSpawner = new Spawner((room.isHell) ? [
                    ["nestPentagon", 8],
                    ["nestBetaPentagon", 6],
                    ["splitterPentagon", 5],
                    ["protpentagon", 4],
                    //["loveFlower", 3],
                    //["alphaPentagon", 3],
                    ["star", 2],
                    "superstar"
                ] : [
                    ["nestPentagon", 7],
                    ["nestBetaPentagon", 5],
                    ["splitterPentagon", 4],
                    ["protpentagon", 3],
                    //["loveFlower", 2],
                    //"alphaPentagon",
                    "star"
                ]);
                const hexaNestSpawner = new Spawner([
                    ["nestHexagon", 3],
                    "nestBetaHexagon"
                ]);
                const heptaNestSpawner = new Spawner([
                    ["nestHeptagon", 3],
                    "nestBetaHeptagon"
                ]);
                const octaNestSpawner = new Spawner([
                    ["nestOctagon", 4],
                    "nestBetaOctagon"
                ]);
                const nonaNestSpawner = new Spawner([
                    ["nestNonagon", 4],
                    "nestBetaNonagon"
                ]);
                const decaNestSpawner = new Spawner([
                    ["nestDecagon", 5],
                    "nestBetaDecagon"
                ]);
                function spawnNestFood(n, id) {
                    let location, i = 8;
                    do {
                        if (!i--) return;
                        location = room.randomType(nestList[1][n]);
                    } while (dirtyCheck(location, 100))
                    let shape = spawnSingle(location, eval(nestList[0][n] + 'NestSpawner.getEntity()'), id);
                    shape[`is${nestList[0][n].charAt(0).toUpperCase() + nestList[0][n].slice(1)}NestFood`] = true;
                }

                return () => {
                    // SANDBOX CENSUS
                    if (c.SANDBOX) {
                        for (let sbxroom of global.sandboxRooms) {
                            if (!sbxroom.spawnFood) continue;
                            const foodCensus = (() => {
                                let food = 0,
                                    triNestFood = 0,
                                    squareNestFood = 0,
                                    pentaNestFood = 0,
                                    hexaNestFood = 0,
                                    heptaNestFood = 0,
                                    octaNestFood = 0,
                                    nonaNestFood = 0,
                                    decaNestFood = 0;
                                entities.forEach(instance => {
                                    if (instance.type === "food" && instance.sandboxId === sbxroom.id) {
                                        if (instance.isTriNestFood) triNestFood++;
                                        else if (instance.isSquareNestFood) squareNestFood++;
                                        else if (instance.isPentaNestFood) pentaNestFood++;
                                        else if (instance.isHexaNestFood) hexaNestFood++;
                                        else if (instance.isHeptaNestFood) heptaNestFood++;
                                        else if (instance.isOctaNestFood) octaNestFood++;
                                        else if (instance.isNonaNestFood) nonaNestFood++;
                                        else if (instance.isDecaNestFood) decaNestFood++;
                                        else food++;
                                    }
                                });
                                return {
                                    food,
                                    triNestFood,
                                    squareNestFood,
                                    pentaNestFood,
                                    hexaNestFood,
                                    heptaNestFood,
                                    octaNestFood,
                                    nonaNestFood,
                                    decaNestFood
                                };
                            })();
                            if (foodCensus.food < room.maxFood) spawnFood(sbxroom.id);
                            for (let i = 0; i < nestList[0].length; i++) {
                                if (room.maxAllNestFood) {
                                    if (room[nestList[1][i]] && room[nestList[1][i]].length && foodCensus[nestList[0][i] + "NestFood"] < Math.ceil(room.maxAllNestFood / room.presentNests.length)) spawnNestFood(i, sbxroom.id);
                                } else {
                                    if (foodCensus[nestList[0][i] + "NestFood"] < room[`max${nestList[0][i].charAt(0).toUpperCase() + nestList[0][i].slice(1)}NestFood`]) spawnNestFood(i, sbxroom.id);
                                }
                            };
                        }
                        return
                    }

                    // NORMAL GAMEMODE CENSUS
                    const foodCensus = (() => {
                        let food = 0,
                            triNestFood = 0,
                            squareNestFood = 0,
                            pentaNestFood = 0,
                            hexaNestFood = 0,
                            heptaNestFood = 0,
                            octaNestFood = 0,
                            nonaNestFood = 0,
                            decaNestFood = 0;
                        entities.forEach(instance => {
                            if (instance.type === "food") {
                                if (instance.isTriNestFood) triNestFood++;
                                else if (instance.isSquareNestFood) squareNestFood++;
                                else if (instance.isPentaNestFood) pentaNestFood++;
                                else if (instance.isHexaNestFood) hexaNestFood++;
                                else if (instance.isHeptaNestFood) heptaNestFood++;
                                else if (instance.isOctaNestFood) octaNestFood++;
                                else if (instance.isNonaNestFood) nonaNestFood++;
                                else if (instance.isDecaNestFood) decaNestFood++;
                                else food++;
                            }
                        });
                        return {
                            food,
                            triNestFood,
                            squareNestFood,
                            pentaNestFood,
                            hexaNestFood,
                            heptaNestFood,
                            octaNestFood,
                            nonaNestFood,
                            decaNestFood
                        };
                    })();
                    if (foodCensus.food < room.maxFood) spawnFood();
                    for (let i = 0; i < nestList[0].length; i++) {
                        if (room.maxAllNestFood) {
                            if (room[nestList[1][i]] && room[nestList[1][i]].length && foodCensus[nestList[0][i] + "NestFood"] < Math.ceil(room.maxAllNestFood / room.presentNests.length)) spawnNestFood(i);
                        } else {
                            if (foodCensus[nestList[0][i] + "NestFood"] < room[`max${nestList[0][i].charAt(0).toUpperCase() + nestList[0][i].slice(1)}NestFood`]) spawnNestFood(i);
                        }
                    };
                };
            })();


            const CrasherSpawner = new Spawner([
                ["crasher", 2],
                "sentryAI"
            ]);
            const HellCrashers = [
                // CRASHERS
                "crasher",
                "eggCrasher",
                "triangleCrasher",
                "pentagonCrasher",
                "seerCrasher",
                "fastCrasher",
                "orbitcrasher",
                "semiCrushCrasher",
                "prismarineCrash",
                "semiCrushCrasher0",
                "semiCrushCrasher14",
                "crushCrasher",
                "bladeCrasher",
                "torchKamikaze",
                "kamikazeCrasher",
                "destroyCrasher",
                "wallerCrasher",
                "visDestructia",
                "grouperSpawn",
                "megaCrushCrasher",
                "iceCrusher",
                "poisonBlades",
                "longCrasher",
                "asteroidCrasher",
                "walletCrasher",
                "boomCrasher",
                "zoomCrasher",
                "redRunner1",
                "redRunner2",
                "redRunner3",
                "redRunner4",
                "summonerSquare",
                "greensummonerSquare",
                "obsidianSquare",
                "ivorySquare",
                "cashCrash",
                "minesweepCrasher",
                "invisoCrasher",
                "tridentCrasher",
                "trapezoidCrasher",
                "greenRunner",
                "destroyCrasherSquare",
                "blueRunner",
                "busterCrasher",
                "curvyBoy",
                "colliderCrasher",
                "hivemindCrasher",
                "minesweepCrush",
                "metalCrasher",
            
                // SENTRIES
                "sentryAI",
                "varpAI",
                "sentrySwarmAI",
                "scorcherSentryAI",
                "sentryGunAI",
                "sentryTrapAI",
                "sentryRangerAI",
                "kamikazeCrasherLite",
                "flashSentryAI",
                "flashGunnerAI",
                "semiCrushSentryAI",
                "crushSentryAI",
                "bladeSentryAI",
                "squareGunSentry",
                "awp39SentryAI",
                "skimSentryAI",
                "greenSentrySwarmAI",
                "squareSwarmerAI",
                "summonerLiteAI",
                "crusaderCrash",

                // ALPHAS
                "alphaCrasher",
                //"alphaSentryAI"
            ].filter(o => Class[o] != null);

            const spawnCrasher = (census, id) => {
                if (room.modelMode) return;
                if (census.crasher < room.maxCrashers) {
                    let spot,
                        max = 10;
                    do spot = room.randomType(ran.choose(room.presentNests));
                    while (dirtyCheck(spot, 30) && max-- > 0);

                    let crasher = (room.isHell) ? ran.choose(HellCrashers) : CrasherSpawner.getEntity();
                    let times = (room.isHell || Math.random() > 0.25) ? 1 : (Math.random() * 4 | 0) + 1;

                    for (let i = 0; i < times; i++) {
                        let o = new Entity(spot);
                        o.define(Class[crasher], (!room.isHell && ran.chance(c.SHINY_CHANCE)) ? { isShiny: true } : {});
                        o.team = -100;
						o.roomLayerless = true;
                        //if (!o.dangerValue) o.dangerValue = 3 + Math.random() * 3 | 0;
                        o.sandboxId = id;
						o.facing = ran.randomAngle();
                    }
                }
            };


            return () => {
                if (c.SANDBOX) {
                    for (let i = 0; i < global.sandboxRooms.length; i++) {
                        let room = global.sandboxRooms[i];
                        for (let type in room.census) room.census[type] = entities.map(e => e.type).filter(o => o === type).length;

                        if (room.spawnFood) createFood();
                        if (room.spawnCrashers) spawnCrasher(room.census, room.id);
                        
                        if (!room.didSetUp) {
                            room.didSetUp = true

                            function spawnDpsButton() {
                                const button = new Entity({
                                    x: 500,
                                    y: 500
                                });
                                button.define(Class.button);
                                button.pushability = button.PUSHABILITY = 0;
                                button.godmode = true;
                                button.team = -101;
                                button.totalDamage = 0;
                                button.averageDps = [];
                                button.lastHitTime = Date.now();
                                button.sandboxId = room.id;
                                button.settings.noNameplate = false;
                                button.type = "utility";
                                button.hitsOwnType = "never";
                                button.settings.leaderboardable = false;
                                button.SIZE = 50;
                                button.DAMAGE = 15;
                                button.onDamaged = function(me, them, amount) {
                                    if (!amount) return;
                                    button.totalDamage += amount
                                }
                                button.onTick = function () {
                                    if (Date.now() - button.lastHitTime > 50) {
                                        button.lastHitTime = Date.now();
                                        if (button.averageDps.length > 30) button.averageDps.shift();
                                        button.averageDps.push(button.totalDamage);
                                        button.name = `${(button.averageDps.reduce((total, value) => total + value, 0) / button.averageDps.length).toFixed(2)} Average DPS`;
                                        button.totalDamage = 0;
                                    }
                                };
                                button.onDead = spawnDpsButton;
                                button.refreshBodyAttributes();
                            }
                            spawnDpsButton();

                            let explainText = new Entity({
                                x: -45,
                                y: -75
                            });
                            explainText.define(Class.text);
                            explainText.name = "Ram into the buttons to press them";
                            explainText.SIZE = 20;
                            explainText.sandboxId = room.id;

                            function spawnBotButton(status) {
                                const button = new Entity({
                                    x: -45,
                                    y: -30
                                });
                                button.define(Class.button);
                                button.pushability = button.PUSHABILITY = 0;
                                button.godmode = true;
                                button.REGEN = 1000000;
                                button.team = -101;
                                button.totalDamage = 0;
                                button.averageDps = [];
                                button.lastHitTime = Date.now();
                                button.sandboxId = room.id;
                                button.settings.noNameplate = false;
                                button.type = "utility";
                                button.hitsOwnType = "never";
                                button.settings.leaderboardable = false;
                                button.color = status ? 11 : 12;
                                button.name = status ? "Bots enabled" : "Bots disabled";
                                if (status) room.botCap = 1;
                                else room.botCap = 0;
                                button.onDamaged = function(me, them) {
                                    if (!them.isPlayer) return;
                                    me.kill();
                                };
                                button.onDead = () => setTimeout(() => spawnBotButton(!status), 1000);
                                button.refreshBodyAttributes();
                            };
                            spawnBotButton(false);

                            function crasherSpawningButton(status) {
                                const button = new Entity({
                                    x: -45,
                                    y: 60
                                });
                                button.define(Class.button);
                                button.pushability = button.PUSHABILITY = 0;
                                button.godmode = true;
                                button.team = -101;
                                button.totalDamage = 0;
                                button.averageDps = [];
                                button.lastHitTime = Date.now();
                                button.sandboxId = room.id;
                                button.settings.noNameplate = false;
                                button.type = "utility";
                                button.hitsOwnType = "never";
                                button.settings.leaderboardable = false;
                                button.color = status ? 11 : 12;
                                button.name = status ? "Crashers enabled" : "Crashers disabled";
                                if (status) room.spawnCrashers = true;
                                else room.spawnCrashers = false;
                                button.onDamaged = function(me, them) {
                                    if (!them.isPlayer) return;
                                    me.kill();
                                }
                                button.onDead = () => setTimeout(() => crasherSpawningButton(!status), 1000);
                                button.refreshBodyAttributes();
                            }
                            crasherSpawningButton(false);

                            function foodSpawningButton(status) {
                                const button = new Entity({
                                    x: -45,
                                    y: 150
                                });
                                button.define(Class.button);
                                button.pushability = button.PUSHABILITY = 0;
                                button.godmode = true;
                                button.team = -101;
                                button.totalDamage = 0;
                                button.averageDps = [];
                                button.lastHitTime = Date.now();
                                button.sandboxId = room.id;
                                button.settings.noNameplate = false;
                                button.type = "utility";
                                button.hitsOwnType = "never";
                                button.settings.leaderboardable = false;
                                button.color = status ? 11 : 12;
                                button.name = status ? "Food enabled" : "Food disabled";
                                if (status) room.spawnFood = true;
                                else room.spawnFood = false;
                                button.onDamaged = function(me, them) {
                                    if (!them.isPlayer) return;
                                    me.kill();
                                }
                                button.onDead = () => setTimeout(() => foodSpawningButton(!status), 1000);
                                button.refreshBodyAttributes();
                            }
                            foodSpawningButton(false);
                        }
                    }
                } else {
                    room.census.sancs = entities.map(e => e.miscIdentifier).filter(o => o === "Sanctuary").length;
                    room.census.naturalMiniboss = entities.map(e => e.miscIdentifier).filter(o => o === "Natural Miniboss").length;
                    for (let type in room.census) {
                        if (type === "sancs" || type === "naturalMiniboss") continue;
                        room.census[type] = entities.map(e => e.type).filter(o => o === type).length;
                    }
                }
                if (!room.modelMode) {
                    createFood();
                    spawnCrasher(room.census);
                }
            };

        })();

        setInterval(gameLoop, room.cycleSpeed)
        gameLoop()

        setInterval(minorMaintainLoop, 200);
        minorMaintainLoop()

        setInterval(maintainLoop, 1000/*200*/);
        maintainLoop()


        setInterval(function() {
            for (let instance of clients) {
                // Only process players who have successfully spawned and have a view
                if (!instance.status.hasSpawned || !instance.open) continue;

                let player = instance.player;
                let socket = instance;
                let camera = socket.camera; // The camera state
                let body = player.body; // The player's body, might be null if dead
                let photo = body ? body.camera() : {}
                const playerContext = body ? {
                    command: player.command,
                    body: body,
                    teamColor: player.teamColor,
                    gameMode: room.gameMode
                } : null;


                let fov = 1000; // Default FOV
                if (body != null && body.isAlive()) { // We are alive
                    camera.x = body.altCameraSource ? body.altCameraSource[0] : photo.cx;
                    camera.y = body.altCameraSource ? body.altCameraSource[1] : photo.cy;
                    fov = body.fov;
                } else { // We are dead/spectating
                    if (body.spectating) {
                        if (!body.spectating.isAlive()) {
                            if (body.spectating.killCount.killers[0] !== undefined) {
                                body.spectating = body.spectating.killCount.killers[0]
                            } else {
                                body.spectating = null;
                            }
                        } else {
                            const spectatePhoto = body.spectating.camera()
                            camera.x = spectatePhoto.x;
                            camera.y = spectatePhoto.y;
                            fov = body.spectating.fov;
                        }
                    }
                }
                // Define a search area (AABB) based on the camera's position and FOV.
                // We create a temporary object with the structure the grid's getAABB expects.
                const width = fov * .6; // .6-.5=.1 padding
                const height = fov * .6 * .5625 // .5625 = 9/19 = aspect ratio
                const searchArea = {
                    _AABB: {
                        x1: camera.x - width,
                        y1: camera.y - height,
                        x2: camera.x + width,
                        y2: camera.y + height,
                        currentQuery: -1
                    }
                };

                let visible = [];
                let numberInView = 0;

                // Manually include player
                // Fixes guided tank targetting bug
                if (body != null && body.isAlive()) {
                    flatten(photo, visible, playerContext)
                    numberInView++
                }
                // Query the grid for entities whose AABBs overlap with the search area.
                // This gives us a list of entities that are *potentially* visible.
                grid.getCollisions(searchArea, (entity) => {
                    entity.deactivationTimer = 30;
                    entity.isActive = true;

                    for (let animation of entity.animations) {
                        if (animation.active && socket.animationsToDo.has(`${entity.id}-${animation.index}`) === false) {
                            const arr = animation.toArray();
                            arr.entityId = entity.id
                            socket.animationsToDo.set(`${entity.id}-${animation.index}`, arr)
                        }
                    }

                    // Apply necessary checks from the original logic:
                    if (
                        entity.isGhost ||
                        !entity.isAlive() ||
                        !entity.settings.drawShape ||
                        (c.SANDBOX && entity.sandboxId !== socket.sandboxId) ||
                        (!body.roomLayerless && !entity.roomLayerless && body.roomLayer !== entity.roomLayer) ||
                        (body && !body.seeInvisible && entity.alpha < 0.1) ||
                        (body && entity.id === body.id) // exclude player, see above
                        // Note: The grid query already handled the main distance check.
                        // If more precise frustum culling is needed, add a check here, but AABB is usually sufficient for performance gain.
                    ) {
                        return; // Skip entities that don't meet visibility criteria
                    }

                    numberInView++
                    flatten(entity.camera(entity.isTurret), visible, playerContext);
                })

                if (body != null && body.displayText !== socket.oldDisplayText) {
                    socket.oldDisplayText = body.displayText;
                    socket.talk("displayText", true, body.displayText, body.displayTextColor);
                } else if (body != null && !body.displayText && socket.oldDisplayText) {
                    socket.oldDisplayText = null;
                    socket.talk("displayText", false);
                }

                if (c.serverName.includes("Growth") && player.body != null && !player.body.hasDreadnoughted && player.body.skill.score >= 2_000_000) {
                    player.body.hasDreadnoughted = true;
                    player.body.upgrades.push({
                        class: "dreadnoughts",// class: "dreadnoughts",
                        level: 60,
                        index: Class.dreadnoughts.index,//index: Class.dreadnoughts.index,
                        tier: 4
                    });
                }

                // Existing dead player message logic (keep this as is)
                if (body != null && body.isDead() && !socket.status.deceased) {
                    body.spectating = body.killCount.killers[0];
                    socket.status.deceased = true;
                    const records = player.records();
                    socket.status.previousScore = records[0];
                    socket.talk("F", ...records); // Send death record to client
                    if (records[0] > 300000) { // Check for high scores for logging/rewards
                        const totalKills = Math.round(records[2] + (records[3] / 2) + (records[4] * 2));
                        if (totalKills >= Math.floor(records[0] / 100000)) {
                            sendRecordValid({ // Assuming sendRecordValid is defined elsewhere
                                name: socket.name || "Unnamed",
                                discord: socket.betaData.discordID,
                                tank: body.labelOverride || body.label,
                                score: records[0],
                                totalKills: totalKills,
                                timeAlive: util.formatTime(records[1] * 1000),
                            });
                        }
                        if (body.miscIdentifier !== "No Death Log") {
                            util.info(trimName(body.name) + " has died. Final Score: " + body.skill.score + ". Tank Used: " + body.label + ". Players: " + clients.length + "."); // Assuming util.info and trimName are defined elsewhere
                        }
                        socket.beginTimeout();
                    }
                    //player.body = null; // Dereference the dead body
                }

                const laserPacket = [];
                lasers.forEach((l) => l.addToPacket(laserPacket, playerContext))


                // Send the update packet to the client
                socket.talk(
                    "u",
                    (body != null ? (body.cameraShiftFacing != null) : false), // Flag for camera shift
                    room.lastCycle, // Timestamp (assuming room.lastCycle is updated in gameLoop)
                    camera.x + .5 | 0, // Camera X (rounded)
                    camera.y + .5 | 0, // Camera Y (rounded)
                    fov + .5 | 0, // FOV (rounded)
                    // camera.vx, camera.vy, // Omitted velocity as per original packet format change
                    (player.gui ? player.gui() : []), // Player GUI data (assuming player.gui() is defined elsewhere and returns an array)
                    lasers.size,
                    laserPacket,
                    numberInView, // Count of visible entities
                    visible.flat() // Flattened data for visible entities
                );
            }
        }, c.visibleListInterval)



        let sussyBakas = {};

        // This will ban random ass people
        /*setInterval(function () {
            let badUsers = multiboxStore.test();
            for (let badUser in sussyBakas) {
                if (!badUsers[+badUser]) {
                    sussyBakas[badUser]--;
                    if (sussyBakas[badUser] < 0) {
                        delete sussyBakas[badUser];
                    }
                }
            }
            for (let userID in badUsers) {
                sussyBakas[userID] = (sussyBakas[userID] || 0) + badUsers[userID];
                if (sussyBakas[userID] > 30) {
                    delete sussyBakas[userID];
                    let entity = getEntity(+userID);
                    if (entity && entity.socket && entity.socket._socket.readyState === 1) {
                        entity.socket.ban(sha256("Multiboxing " + entity.name));
                    }
                }
            }
        }, 1000);*/

        if (room.maxBots > 0) setTimeout(() => util.log(`Spawned ${room.maxBots} AI bot${room.maxBots > 1 ? "s." : "."}`), 350);
        global.updateRoomInfo()
        worker.postMessage({ type: "serverStarted" })
    })();
}

export { global }
