var fs = require("fs");
var request = require("sync-request");
var sanitizeFilename = require("sanitize-filename");
const qs = require("querystring");
const debug = require("debug")("slash-command-template:index");
const axios = require("axios");
const cheerio = require("cheerio");
const async = require("async");

token = process.argv[3];
rootDir = "/tmp/beers";
searchDir = rootDir + "/search";
beerDir = rootDir + "/beer";
clientid = "926FAE0ED01289A59047DD2DCABAC8C01FC88175";
clientsecret = "6DC27EFAB293054B70A54A89BD7E6082A1FF9218";
function trimToLength(str, len) {
  if (!str || str.length < len) {
    return str;
  }
  return str.substring(0, len - 3) + "...";
}

function getBeerInfo(beerId) {
  var cacheFile = beerDir + "/" + beerId + ".beer";
  var json = "";
  if (fs.existsSync(cacheFile)) {
    json = JSON.parse(fs.readFileSync(cacheFile));
  } else {
    console.log("lookup request");
    var res = request("GET", "https://api.untappd.com/v4/beer/info/" + beerId, {
      qs: { client_id: clientid, client_secret: clientsecret, compact: true }
    });
    var json = JSON.parse(res.getBody("utf8"));
    fs.writeFileSync(cacheFile, res.getBody("utf8"));
  }
  //console.log(JSON.stringify(json, null, 2));
  return json;
}
function findBeer(beerName) {
  var sanitizedName = sanitizeFilename(beerName.replace(" ", ""));
  var cacheFile = searchDir + "/" + sanitizedName + ".search";
  var json = "";
  if (fs.existsSync(cacheFile)) {
    json = JSON.parse(fs.readFileSync(cacheFile));
  } else {
    console.log("search request");
    var res = request("GET", "https://api.untappd.com/v4/search/beer/", {
      qs: { client_id: clientid, client_secret: clientsecret, q: beerName }
    });
    json = JSON.parse(res.getBody("utf8"));
    fs.writeFileSync(cacheFile, res.getBody("utf8"));
  }
  //console.log(JSON.stringify(json, null, 2));
  return json;
}
function parseBeers(body, channel, callback) {
  const $ = cheerio.load(body);

  sixtels = $('h2 > strong:contains("1/6 KEGS")');
  h2 = sixtels[0].parent;
  keg = h2.next;
  kegs = [];
  while (keg.name === "p") {
    kegName = keg.children[0].data;
    if (kegName.trim() !== "") {
      kegs.push(kegName);
      //break;
    }
    keg = keg.next;
  }
  var slackMessage = {
    text:
      "<https://www.bvbeerphilly.com/wholesale-operations/|Beers Available at Bella Vista>",
    attachments: []
  };
  async.filter(kegs, function(kegName, callback) {
    // results is now an array of stats for each file
    //console.log("result: " + keg);
    price = 0;
    index = kegName.indexOf("$");
    if (index > -1) {
      price = kegName.substring(index + 1).trim();
    }
    if (parseFloat(price) < 140) {
      index = kegName.indexOf("1/6 KEG");
      if (index > -1) {
        kegName = kegName.substring(0, index);
      }
      keg = kegName;

      var beers = findBeer(keg);
      if (beers.response.beers.count === 0) {
        slackMessage.attachments.push({
          title: keg + " ( unable to find on Untappd ) $" + price
        });
      } else {
        var candidate = beers.response.beers.items[0];
        //console.log(JSON.stringify(candidate, null, 2));
        var bid = candidate.beer.bid;
        var beerDetails = getBeerInfo(bid);
        slackMessage.attachments.push({
          thumb_url: beerDetails.response.beer.beer_label,
          title:
            beerDetails.response.beer.beer_name +
            " $" +
            price +
            " (" +
            beerDetails.response.beer.brewery.brewery_name +
            " - " +
            beerDetails.response.beer.brewery.location.brewery_city +
            ", " +
            beerDetails.response.beer.brewery.location.brewery_state +
            ")",
          title_link:
            "https://untappd.com/b/" +
            beerDetails.response.beer.beer_slug +
            "/" +
            bid,
          text:
            beerDetails.response.beer.beer_abv +
            "% " +
            beerDetails.response.beer.beer_style +
            "\n" +
            trimToLength(beerDetails.response.beer.beer_description, 200),
          footer:
            "Untappd Rating: " +
            Math.round(beerDetails.response.beer.rating_score * 100) / 100
        });
      }
    }
  });
  slackMessage.attachments.sort(function(a, b) {
    if (!a.footer && !b.footer) {
      return 0;
    }
    if ((a.footer && !b.footer) || b.footer < a.footer) {
      return -1;
    } else if ((b.footer && !a.footer) || a.footer < b.footer) {
      return 1;
    }
    return 0;
  });
  slackMessage.channel = channel;
  slackMessage.icon_emoji = ":beer:";
  slackMessage.username = "BeerBot";
  // var res = request('POST',
  //   "https://slack.com/api/chat.postMessage",
  //   {json: slackMessage, headers: {'Authorization':'Bearer ' + token}});
  axios
    .post(
      "https://slack.com/api/chat.postMessage",
      qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN,
        channel: channel,
        text: slackMessage.text,
        attachments: JSON.stringify(slackMessage.attachments)
      })
    )
    .then(result => {
      debug("sendConfirmation: %o", result.data);
      callback();
    })
    .catch(err => {
      debug("sendConfirmation error: %o", err);
      console.error(err);
    });
}

if (!fs.existsSync(rootDir)) {
  fs.mkdirSync(rootDir, 0744);
}
if (!fs.existsSync(searchDir)) {
  fs.mkdirSync(searchDir, 0744);
}
if (!fs.existsSync(beerDir)) {
  fs.mkdirSync(beerDir, 0744);
}
module.exports = (channel, callback) => {
  console.log("running beer");
  var beerResponse = request(
    "GET",
    "https://www.bvbeerphilly.com/wholesale-operations/",
    {
      headers: {
        "user-agent": "example-user-agent"
      }
    }
  );
  parseBeers(beerResponse.getBody("utf8"), channel, callback);
};
